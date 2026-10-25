'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

test('API provides health, validation, and consistent not-found responses', async (context) => {
  const meterService = {
    async listMeters() {
      return { data: [{ meterId: 'J100001' }], total: 1, page: 1, pageSize: 20 };
    },
    async getMeter(id) {
      return { meterId: id, location: { latitude: 1, longitude: 2 } };
    }
  };
  const networkService = {
    async listTransformers() {
      return { data: [], total: 0, page: 1, pageSize: 20 };
    },
    async getTransformerMeters() {
      return { transformer: { code: 'DT-001' }, meters: [], total: 0 };
    }
  };
  const app = createApp({ services: { meterService, networkService } });
  const server = app.listen(0);
  context.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const healthResponse = await fetch(`${baseUrl}/api/health`);
  assert.equal(healthResponse.status, 200);
  assert.equal((await healthResponse.json()).data.status, 'ok');

  const meterResponse = await fetch(`${baseUrl}/api/meters?page=1`);
  assert.equal(meterResponse.status, 200);
  assert.equal((await meterResponse.json()).data[0].meterId, 'J100001');

  const invalidResponse = await fetch(`${baseUrl}/api/meters?page=0`);
  assert.equal(invalidResponse.status, 400);
  assert.equal((await invalidResponse.json()).error.code, 'INVALID_QUERY');

  const repeatedQueryResponse = await fetch(`${baseUrl}/api/meters?q=one&q=two`);
  assert.equal(repeatedQueryResponse.status, 400);
  assert.equal((await repeatedQueryResponse.json()).error.code, 'INVALID_QUERY');

  const openApiResponse = await fetch(`${baseUrl}/openapi.json`);
  assert.equal(openApiResponse.status, 200);
  assert.equal((await openApiResponse.json()).openapi, '3.0.3');

  const missingResponse = await fetch(`${baseUrl}/missing`);
  assert.equal(missingResponse.status, 404);
  assert.equal((await missingResponse.json()).error.code, 'NOT_FOUND');
});
