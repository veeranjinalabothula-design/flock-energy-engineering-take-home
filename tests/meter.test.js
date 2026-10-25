'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { MeterService } = require('../src/services/meter.service');
const { AppError } = require('../src/middleware/errorHandler');

test('meter details combine nameplate, coordinates, transformer and newest readings', async () => {
  const portalService = {
    async searchMeters(id) {
      return {
        data: [{ meterId: id, serialNo: 'S-1', phaseType: 'single', dtCode: 'DT-001' }],
        total: 1,
        pageSize: 20
      };
    },
    async getMeterGeo() {
      return { latitude: '26.8', longitude: '75.9' };
    },
    async getMeterEnergy() {
      return [
        { timestamp: '01/01/2026 00:00', kwh: '1.2', kvah: '1.4', voltR: '230' },
        { timestamp: '01/01/2026 00:30', kwh: '1.3', kvah: '1.5', voltR: '231' }
      ];
    }
  };
  const networkService = {
    async findTransformer() {
      return { code: 'DT-001', feederCode: 'F-001', capacityKva: 100 };
    }
  };
  const service = new MeterService({ portalService, networkService });
  const result = await service.getMeter('J100001', 1);

  assert.equal(result.meterId, 'J100001');
  assert.deepEqual(result.location, { latitude: 26.8, longitude: 75.9 });
  assert.equal(result.network.transformer.code, 'DT-001');
  assert.equal(result.consumption.sourceReadingCount, 2);
  assert.deepEqual(result.consumption.readings, [{
    timestamp: '01/01/2026 00:30',
    kwh: 1.3,
    kvah: 1.5,
    voltageR: 231
  }]);
});

test('meter lookup requires an exact meter ID', async () => {
  const service = new MeterService({
    portalService: {
      async searchMeters() {
        return { data: [{ meterId: 'J1000010' }], total: 1, pageSize: 20 };
      }
    },
    networkService: {}
  });
  await assert.rejects(service.getMeter('J100001'), (error) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.statusCode, 404);
    return true;
  });
});
