'use strict';

const { AppError } = require('../middleware/errorHandler');

class UpstreamError extends AppError {
  constructor(statusCode, message) {
    super(statusCode, 'UPSTREAM_ERROR', message);
    this.name = 'UpstreamError';
  }
}

class UrjaClient {
  constructor({ baseUrl, auth, timeoutMs, fetchImpl = fetch }) {
    this.baseUrl = baseUrl;
    this.auth = auth;
    this.timeoutMs = timeoutMs;
    this.fetch = fetchImpl;
  }

  async requestJson(path, retry = true) {
    await this.auth.ensureAuthenticated();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let response;
    try {
      response = await this.fetch(new URL(path, this.baseUrl), {
        headers: {
          accept: 'application/json',
          cookie: this.auth.cookieHeader
        },
        signal: controller.signal
      });
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new UpstreamError(504, 'The portal request timed out.');
      }
      throw new UpstreamError(502, `Could not reach the portal: ${error.message}`);
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 401 && retry) {
      this.auth.invalidate();
      return this.requestJson(path, false);
    }
    if (!response.ok) {
      if (response.status === 404) throw new UpstreamError(404, 'The requested record was not found in the portal.');
      if (response.status === 401 || response.status === 403) {
        throw new UpstreamError(502, 'The portal session is no longer authorized.');
      }
      throw new UpstreamError(502, `Portal request failed with HTTP ${response.status}.`);
    }

    try {
      return await response.json();
    } catch {
      throw new UpstreamError(502, 'The portal returned invalid JSON.');
    }
  }
}

module.exports = { UrjaClient, UpstreamError };
