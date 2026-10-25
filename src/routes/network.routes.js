'use strict';

const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');

function createNetworkRouter(controller) {
  const router = express.Router();
  router.get('/transformers', asyncHandler(controller.list));
  router.get('/transformers/:code/meters', asyncHandler(controller.getMeters));
  return router;
}

module.exports = { createNetworkRouter };
