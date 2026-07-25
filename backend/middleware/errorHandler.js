const logger = require('../utils/logger');
const { failure } = require('../utils/apiResponse');

function notFound(req, res) {
  return failure(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
}

/**
 * Centralized error handler. Every controller forwards errors here via
 * next(err) instead of formatting responses inline, so the API's error
 * shape stays consistent everywhere.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  logger.error(err.message, { stack: err.stack, path: req.originalUrl });

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return failure(res, 400, 'Validation failed', errors);
  }

  if (err.name === 'CastError') {
    return failure(res, 400, `Invalid value for ${err.path}: ${err.value}`);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return failure(res, 409, `${field} already in use`);
  }

  if (err.name === 'MulterError') {
    return failure(res, 400, `Upload error: ${err.message}`);
  }

  const statusCode = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
  return failure(res, statusCode, err.message || 'Internal server error');
}

module.exports = { notFound, errorHandler };
