'use strict';

const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');

function createMeterRouter(controller) {
  const router = express.Router();
  router.get('/', asyncHandler(controller.list));
  router.get('/:meterId', asyncHandler(controller.get));
  return router;
}

module.exports = { createMeterRouter };
