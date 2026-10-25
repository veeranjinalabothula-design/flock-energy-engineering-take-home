'use strict';

const { AppError } = require('../middleware/errorHandler');
const { success } = require('../utils/responseFormatter');
const { DEFAULT_CONSUMPTION_LIMIT, UPSTREAM_PAGE_SIZE } = require('../utils/constants');

function parsePositiveInteger(value, name, fallback, maximum = Number.MAX_SAFE_INTEGER) {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(String(value))) {
    throw new AppError(400, 'INVALID_QUERY', `${name} must be a positive integer.`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new AppError(400, 'INVALID_QUERY', `${name} must be between 1 and ${maximum}.`);
  }
  return parsed;
}

function createMeterController(meterService) {
  return {
    list: async (req, res) => {
      const page = parsePositiveInteger(req.query.page, 'page', 1);
      if (req.query.q !== undefined && typeof req.query.q !== 'string') {
        throw new AppError(400, 'INVALID_QUERY', 'q must be a single string.');
      }
      const result = await meterService.listMeters({
        query: req.query.q ? req.query.q.trim() : '',
        page
      });
      res.json(success(result.data, {
        page: result.page,
        pageSize: result.pageSize || UPSTREAM_PAGE_SIZE,
        total: result.total,
        totalPages: Math.ceil(result.total / result.pageSize)
      }));
    },
    get: async (req, res) => {
      const limit = parsePositiveInteger(
        req.query.limit,
        'limit',
        DEFAULT_CONSUMPTION_LIMIT,
        336
      );
      res.json(success(await meterService.getMeter(req.params.meterId, limit)));
    }
  };
}

module.exports = { createMeterController, parsePositiveInteger };
