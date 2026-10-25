'use strict';

function success(data, meta) {
  return meta ? { data, meta } : { data };
}

function failure(code, message, requestId) {
  return {
    error: {
      code,
      message,
      ...(requestId ? { requestId } : {})
    }
  };
}

module.exports = { success, failure };
