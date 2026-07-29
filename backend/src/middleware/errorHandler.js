'use strict';

/**
 * Global error handler middleware.
 * Must be the last app.use() in index.js.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.status || err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Something went wrong on our end. Please try again later.';

  // Log full error in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('[ErrorHandler]', status, code, message);
    if (err.stack) console.error(err.stack);
  } else {
    // In production only log 5xx errors
    if (status >= 500) {
      console.error('[ErrorHandler] 5xx:', code, message);
    }
  }

  res.status(status).json({ error: message, code });
}

/**
 * Helper to create structured API errors.
 */
function createError(status, message, code) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

module.exports = { errorHandler, createError };
