// Structured logging utility for debugging
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
}

const getTimestamp = () => new Date().toISOString()

// Log levels
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
}

const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO

const formatMessage = (level, message, context = {}) => {
  const timestamp = getTimestamp()
  const requestId = context.requestId ? `[${context.requestId}] ` : ''
  return { timestamp, level, requestId, message, context }
}

export const logger = {
  debug: (message, context = {}) => {
    if (currentLogLevel <= LOG_LEVELS.DEBUG) {
      const formatted = formatMessage('DEBUG', message, context)
      console.log(`${colors.gray}[${formatted.timestamp}] DEBUG ${formatted.requestId}${message}${colors.reset}`, context)
    }
  },

  info: (message, context = {}) => {
    if (currentLogLevel <= LOG_LEVELS.INFO) {
      const formatted = formatMessage('INFO', message, context)
      console.log(`${colors.cyan}[${formatted.timestamp}] INFO ${formatted.requestId}${message}${colors.reset}`, context)
    }
  },

  success: (message, context = {}) => {
    if (currentLogLevel <= LOG_LEVELS.INFO) {
      const formatted = formatMessage('INFO', message, context)
      console.log(`${colors.green}[${formatted.timestamp}] ✓ ${formatted.requestId}${message}${colors.reset}`, context)
    }
  },

  warn: (message, context = {}) => {
    if (currentLogLevel <= LOG_LEVELS.WARN) {
      const formatted = formatMessage('WARN', message, context)
      console.warn(`${colors.yellow}[${formatted.timestamp}] WARN ${formatted.requestId}${message}${colors.reset}`, context)
    }
  },

  error: (message, error = null, context = {}) => {
    if (currentLogLevel <= LOG_LEVELS.ERROR) {
      const formatted = formatMessage('ERROR', message, context)
      console.error(`${colors.red}[${formatted.timestamp}] ERROR ${formatted.requestId}${message}${colors.reset}`, {
        ...context,
        error: error?.message,
        stack: error?.stack
      })
    }
  },

  // Request-specific logging helpers
  request: (req, message) => {
    const requestId = req.requestId || 'unknown'
    logger.info(message, { requestId, method: req.method, url: req.url })
  },

  requestError: (req, message, error) => {
    const requestId = req.requestId || 'unknown'
    logger.error(message, error, { requestId, method: req.method, url: req.url })
  }
}

export default logger
