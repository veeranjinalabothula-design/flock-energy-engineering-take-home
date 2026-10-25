'use strict';

const { failure } = require('../utils/responseFormatter');

class AppError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

function notFoundHandler(req, res) {
  res.status(404).json(failure('NOT_FOUND', 'The requested endpoint does not exist.', req.id));
}

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  const code = error.code || 'INTERNAL_ERROR';
  const message = statusCode >= 500 && !(error instanceof AppError)
    ? 'An unexpected error occurred.'
    : error.message;

  if (statusCode >= 500) {
    console.error(JSON.stringify({
      requestId: req.id,
      message: error.message,
      name: error.name
    }));
  }

  res.status(statusCode).json(failure(code, message, req.id));
}

module.exports = { AppError, asyncHandler, errorHandler, notFoundHandler };
