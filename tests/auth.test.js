'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { UrjaAuthService } = require('../src/services/urjaAuth.service');

test('portal authentication submits the form once and reuses its session', async () => {
  const calls = [];
  const auth = new UrjaAuthService({
    baseUrl: 'https://portal.example',
    username: 'operator@example.test',
    password: 'not-a-real-password',
    timeoutMs: 1000,
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      if (options.method === 'POST') {
        assert.match(options.headers.cookie, /portal_session=anonymous/);
        return new Response(JSON.stringify({ type: 'success' }), {
          status: 200,
          headers: { 'set-cookie': 'portal_session=authenticated; Path=/; HttpOnly' }
        });
      }
      return new Response('login page', {
        status: 200,
        headers: { 'set-cookie': 'portal_session=anonymous; Path=/' }
      });
    }
  });

  await auth.ensureAuthenticated();
  await auth.ensureAuthenticated();
  assert.equal(calls.length, 2);
  assert.equal(auth.cookieHeader, 'portal_session=authenticated');
});

test('portal authentication reports missing credentials', async () => {
  const auth = new UrjaAuthService({
    baseUrl: 'https://portal.example',
    username: '',
    password: '',
    timeoutMs: 1000,
    fetchImpl: async () => {
      throw new Error('fetch should not be called');
    }
  });

  await assert.rejects(auth.ensureAuthenticated(), (error) => {
    assert.equal(error.statusCode, 503);
    assert.equal(error.code, 'UPSTREAM_NOT_CONFIGURED');
    return true;
  });
});
