'use strict';

const { success } = require('../utils/responseFormatter');
const { UPSTREAM_PAGE_SIZE } = require('../utils/constants');
const { parsePositiveInteger } = require('./meter.controller');

function createNetworkController(networkService) {
  return {
    list: async (req, res) => {
      const page = parsePositiveInteger(req.query.page, 'page', 1);
      const result = await networkService.listTransformers(page);
      res.json(success(result.data, {
        page: result.page,
        pageSize: result.pageSize || UPSTREAM_PAGE_SIZE,
        total: result.total,
        totalPages: Math.ceil(result.total / result.pageSize)
      }));
    },
    getMeters: async (req, res) => {
      const result = await networkService.getTransformerMeters(req.params.code);
      res.json(success(result.meters, {
        transformer: result.transformer,
        total: result.total
      }));
    }
  };
}

module.exports = { createNetworkController };
