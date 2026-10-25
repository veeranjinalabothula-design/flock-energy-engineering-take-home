'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { NetworkService } = require('../src/services/network.service');

test('transformer lookup handles paginated portal records', async () => {
  const portalService = {
    async listTransformers(page) {
      return page === 1
        ? { data: [{ code: 'DT-001' }], total: 2, pageSize: 1 }
        : { data: [{ code: 'DT-002' }], total: 2, pageSize: 1 };
    }
  };
  const service = new NetworkService({ portalService });
  assert.deepEqual(await service.findTransformer('DT-002'), { code: 'DT-002' });
});

test('transformer meter lookup filters the full meter list by DT code', async () => {
  const portalService = {
    async listTransformers() {
      return { data: [{ code: 'DT-001' }], total: 1, pageSize: 20 };
    },
    async searchMeters(_query, page) {
      return page === 1
        ? {
          data: [{ meterId: 'J1', dtCode: 'DT-001' }, { meterId: 'J2', dtCode: 'DT-002' }],
          total: 3,
          pageSize: 2
        }
        : { data: [{ meterId: 'J3', dtCode: 'DT-001' }], total: 3, pageSize: 2 };
    }
  };
  const service = new NetworkService({ portalService });
  const result = await service.getTransformerMeters('DT-001');
  assert.equal(result.total, 2);
  assert.deepEqual(result.meters.map((meter) => meter.meterId), ['J1', 'J3']);
});
