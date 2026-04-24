import crypto from 'crypto'
import logger from '../utils/logger.mjs'

// Generate unique request ID for tracking
export const requestIdMiddleware = (req, res, next) => {
  req.requestId = crypto.randomBytes(8).toString('hex')
  res.setHeader('X-Request-ID', req.requestId)
  next()
}

// Log incoming requests and responses
export const requestLogger = (req, res, next) => {
  const startTime = Date.now()

  // Redact sensitive data from body
  const bodyPreview = req.body ? JSON.stringify(redactSensitiveData(req.body)).slice(0, 200) : 'none'

  logger.info(`→ ${req.method} ${req.url}`, {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    bodyPreview,
    ip: req.ip,
    userAgent: req.get('user-agent')
  })

  // Capture original functions
  const originalSend = res.send
  const originalJson = res.json

  // Override send to log response
  res.send = function (data) {
    if (!req._logged) {
      logResponse(req, res, startTime, data)
      req._logged = true
    }
    return originalSend.call(this, data)
  }

  // Override json to log response
  res.json = function (data) {
    if (!req._logged) {
      logResponse(req, res, startTime, data)
      req._logged = true
    }
    return originalJson.call(this, data)
  }

  next()
}

// Helper to log response
const logResponse = (req, res, startTime, data) => {
  const duration = Date.now() - startTime
  const dataPreview = typeof data === 'string'
    ? data.slice(0, 200)
    : JSON.stringify(data).slice(0, 200)

  const logLevel = res.statusCode >= 400 ? 'error' : 'info'
  const symbol = res.statusCode >= 400 ? '✗' : '✓'

  logger[logLevel](`${symbol} ${req.method} ${req.url} ${res.statusCode} (${duration}ms)`, {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    duration,
    dataPreview
  })
}

// Redact sensitive fields from logging
const redactSensitiveData = (obj) => {
  if (!obj || typeof obj !== 'object') return obj

  const redacted = { ...obj }
  const sensitiveFields = ['password', 'passwordHash', 'token', 'resetToken', 'resetCode']

  for (const field of sensitiveFields) {
    if (redacted[field]) {
      redacted[field] = '[REDACTED]'
    }
  }

  return redacted
}
