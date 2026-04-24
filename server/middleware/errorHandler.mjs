import logger from '../utils/logger.mjs'

// Centralized error handling middleware
export const errorHandler = (err, req, res, next) => {
  const requestId = req.requestId || 'unknown'
  
  // Default error response
  const errorResponse = {
    error: err.message || 'Internal server error',
    requestId,
    timestamp: new Date().toISOString()
  }

  // Determine status code
  let statusCode = err.statusCode || err.status || 500

  // Log error with full context
  logger.error(`Error handling ${req.method} ${req.url}`, err, {
    requestId,
    method: req.method,
    url: req.url,
    statusCode,
    body: req.body,
    params: req.params,
    query: req.query
  })

  // Add stack trace in development
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack
    errorResponse.details = {
      name: err.name,
      code: err.code
    }
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400
    errorResponse.error = 'Validation failed'
    errorResponse.validationErrors = err.errors
  }

  if (err.code === 11000) {
    statusCode = 409
    errorResponse.error = 'Duplicate entry'
    errorResponse.field = Object.keys(err.keyPattern || {})[0]
  }

  if (err.name === 'CastError') {
    statusCode = 400
    errorResponse.error = 'Invalid ID format'
  }

  res.status(statusCode).json(errorResponse)
}

// 404 handler
export const notFoundHandler = (req, res) => {
  const requestId = req.requestId || 'unknown'
  logger.warn(`Route not found: ${req.method} ${req.url}`, { requestId })
  
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    url: req.url,
    requestId,
    timestamp: new Date().toISOString()
  })
}

// Async error wrapper - wraps async route handlers to catch errors
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
