'use strict';

const { AppError } = require('../middleware/errorHandler');
const { TtlCache } = require('../utils/cache');
const { UPSTREAM_PAGE_SIZE } = require('../utils/constants');

class UrjaPortalService {
  constructor({ client, cacheTtlMs }) {
    this.client = client;
    this.cache = new TtlCache(cacheTtlMs);
  }

  async get(path) {
    return this.cache.getOrLoad(path, async () => {
      const result = await this.client.requestJson(path);
      if (!result || typeof result !== 'object' || !Array.isArray(result.data)) {
        throw new AppError(502, 'UPSTREAM_INVALID_RESPONSE', 'The portal response did not contain a data array.');
      }
      return result;
    });
  }

  async searchMeters(query = '', page = 1) {
    const params = new URLSearchParams({ q: query, page: String(page) });
    const result = await this.get(`/portal/meters/search?${params}`);
    return {
      data: result.data,
      total: result.total,
      page: result.page || page,
      pageSize: result.pageSize || UPSTREAM_PAGE_SIZE
    };
  }

  async getMeterGeo(meterId) {
    const result = await this.client.requestJson(`/portal/meters/${encodeURIComponent(meterId)}/geo`);
    if (!result || !result.data || typeof result.data !== 'object') {
      throw new AppError(502, 'UPSTREAM_INVALID_RESPONSE', 'The portal returned invalid meter coordinates.');
    }
    return result.data;
  }

  async getMeterEnergy(meterId) {
    const result = await this.client.requestJson(`/portal/meters/${encodeURIComponent(meterId)}/energy`);
    if (!result || !Array.isArray(result.data)) {
      throw new AppError(502, 'UPSTREAM_INVALID_RESPONSE', 'The portal returned invalid consumption data.');
    }
    return result.data;
  }

  async listTransformers(page = 1) {
    const result = await this.get(`/portal/dts?page=${page}`);
    return {
      data: result.data,
      total: result.total,
      page: result.page || page,
      pageSize: result.pageSize || UPSTREAM_PAGE_SIZE
    };
  }
}

module.exports = { UrjaPortalService };
