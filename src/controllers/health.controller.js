'use strict';

const { success } = require('../utils/responseFormatter');

function health(_req, res) {
  res.json(success({
    status: 'ok',
    timestamp: new Date().toISOString()
  }));
}

module.exports = { health };
