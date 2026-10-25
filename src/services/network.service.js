'use strict';

const { AppError } = require('../middleware/errorHandler');

class NetworkService {
  constructor({ portalService }) {
    this.portal = portalService;
  }

  listTransformers(page = 1) {
    return this.portal.listTransformers(page);
  }

  async listAllTransformers() {
    const firstPage = await this.portal.listTransformers(1);
    const pageCount = Math.ceil(firstPage.total / firstPage.pageSize);
    const pages = await Promise.all(
      Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) =>
        this.portal.listTransformers(index + 2))
    );
    return [...firstPage.data, ...pages.flatMap((page) => page.data)];
  }

  async findTransformer(code) {
    const transformers = await this.listAllTransformers();
    return transformers.find((transformer) => transformer.code === code) || null;
  }

  async getTransformerMeters(code) {
    const transformer = await this.findTransformer(code);
    if (!transformer) throw new AppError(404, 'TRANSFORMER_NOT_FOUND', `Transformer "${code}" was not found.`);

    const firstPage = await this.portal.searchMeters('', 1);
    const pageCount = Math.ceil(firstPage.total / firstPage.pageSize);
    const pages = await Promise.all(
      Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) =>
        this.portal.searchMeters('', index + 2))
    );
    const meters = [...firstPage.data, ...pages.flatMap((page) => page.data)]
      .filter((meter) => meter.dtCode === code);
    return { transformer, meters, total: meters.length };
  }
}

module.exports = { NetworkService };
