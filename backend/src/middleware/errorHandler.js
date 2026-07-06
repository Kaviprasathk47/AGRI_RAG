import { logger } from '../utils/logger.js';

/**
 * Global Express error handling middleware.
 * Captures all standard and operational errors and formats clean HTTP responses.
 */
export function errorHandler(err, req, res, next) {
  // Log the complete error stack trace securely
  logger.error(`Unhandled error occurred on route [${req.method}] ${req.path}:`, err);

  const statusCode = err.status || err.statusCode || 500;
  const tag = err.tag || 'INTERNAL_SERVER_ERROR';
  
  // Provide helpful user messages based on error categories
  let message = err.message || 'An unexpected internal server error occurred.';

  // If in production, mask detailed 500 error messages to prevent leakage
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'A server error occurred. Please contact the administrator.';
  }

  // Include detailed diagnostics only in development/debug modes
  const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG_MODE === 'true';
  const details = isDev ? err.details : null;

  res.status(statusCode).json({
    status: 'error',
    code: statusCode,
    tag,
    message,
    ...(details && { details }),
    timestamp: new Date().toISOString(),
  });
}
