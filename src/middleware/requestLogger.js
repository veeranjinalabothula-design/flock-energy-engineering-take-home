'use strict';

function requestLogger(req, res, next) {
  const startedAt = Date.now();
  const path = req.path;
  res.on('finish', () => {
    const line = JSON.stringify({
      method: req.method,
      path,
      status: res.statusCode,
      durationMs: Date.now() - startedAt
    });
    (res.statusCode >= 500 ? console.error : console.info)(line);
  });
  next();
}

module.exports = { requestLogger };
