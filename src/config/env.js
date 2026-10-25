'use strict';

function positiveInteger(value, fallback, name) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function loadConfig(env = process.env) {
  let baseUrl;
  try {
    baseUrl = new URL(env.URJA_BASE_URL || 'https://urja-ops.flockenergy.tech');
  } catch {
    throw new Error('URJA_BASE_URL must be a valid URL');
  }
  if (!['http:', 'https:'].includes(baseUrl.protocol)) {
    throw new Error('URJA_BASE_URL must use HTTP or HTTPS');
  }

  return Object.freeze({
    port: positiveInteger(env.PORT, 3000, 'PORT'),
    nodeEnv: env.NODE_ENV || 'development',
    urjaBaseUrl: baseUrl.toString().replace(/\/$/, ''),
    urjaUsername: env.URJA_USERNAME || '',
    urjaPassword: env.URJA_PASSWORD || '',
    requestTimeoutMs: positiveInteger(env.URJA_REQUEST_TIMEOUT_MS, 10000, 'URJA_REQUEST_TIMEOUT_MS'),
    cacheTtlMs: positiveInteger(env.URJA_CACHE_TTL_MS, 30000, 'URJA_CACHE_TTL_MS')
  });
}

module.exports = { loadConfig };
