'use strict';

const { AppError } = require('../middleware/errorHandler');

class UrjaAuthService {
  constructor({ baseUrl, username, password, timeoutMs, fetchImpl = fetch }) {
    this.baseUrl = baseUrl;
    this.username = username;
    this.password = password;
    this.timeoutMs = timeoutMs;
    this.fetch = fetchImpl;
    this.cookies = new Map();
    this.loginPromise = null;
    this.authenticated = false;
  }

  get cookieHeader() {
    return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
  }

  updateCookies(response) {
    const headers = response.headers;
    const setCookies = typeof headers.getSetCookie === 'function'
      ? headers.getSetCookie()
      : [headers.get('set-cookie')].filter(Boolean);

    for (const cookie of setCookies) {
      const [pair, ...attributes] = cookie.split(';');
      const separator = pair.indexOf('=');
      if (separator < 1) continue;
      const name = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1).trim();
      const expired = attributes.some((attribute) => {
        const [key, attributeValue] = attribute.trim().split('=');
        return key.toLowerCase() === 'max-age' && Number(attributeValue) <= 0;
      });
      if (expired || !value) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }

  async fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await this.fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error.name === 'AbortError') {
        throw new AppError(504, 'UPSTREAM_TIMEOUT', 'Portal authentication timed out.');
      }
      throw new AppError(502, 'UPSTREAM_AUTH_FAILED', `Could not reach the portal to sign in: ${error.message}`);
    } finally {
      clearTimeout(timer);
    }
  }

  async ensureAuthenticated() {
    if (this.authenticated) return;
    if (!this.loginPromise) {
      this.loginPromise = this.login().finally(() => {
        this.loginPromise = null;
      });
    }
    await this.loginPromise;
  }

  invalidate() {
    this.cookies.clear();
    this.authenticated = false;
  }

  async login() {
    if (!this.username || !this.password) {
      throw new AppError(503, 'UPSTREAM_NOT_CONFIGURED', 'Set URJA_USERNAME and URJA_PASSWORD to enable portal access.');
    }

    const loginUrl = `${this.baseUrl}/login`;
    const page = await this.fetchWithTimeout(loginUrl, {
      headers: { accept: 'text/html' },
      redirect: 'manual'
    });
    this.updateCookies(page);
    if (!page.ok) {
      throw new AppError(502, 'UPSTREAM_AUTH_FAILED', `Portal login page returned HTTP ${page.status}.`);
    }

    const origin = new URL(this.baseUrl).origin;
    const response = await this.fetchWithTimeout(loginUrl, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        accept: 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
        'x-sveltekit-action': 'true',
        origin,
        referer: loginUrl,
        ...(this.cookieHeader ? { cookie: this.cookieHeader } : {})
      },
      body: new URLSearchParams({
        email: this.username,
        password: this.password
      }).toString()
    });
    this.updateCookies(response);

    const responseBody = await response.text();
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location) {
        const redirected = await this.fetchWithTimeout(new URL(location, loginUrl), {
          headers: this.cookieHeader ? { cookie: this.cookieHeader } : {},
          redirect: 'manual'
        });
        this.updateCookies(redirected);
        if (!redirected.ok) {
          throw new AppError(502, 'UPSTREAM_AUTH_FAILED', `Portal sign-in redirect returned HTTP ${redirected.status}.`);
        }
      }
    } else if (!response.ok) {
      throw new AppError(502, 'UPSTREAM_AUTH_FAILED', `Portal sign-in returned HTTP ${response.status}.`);
    } else {
      let result;
      try {
        result = JSON.parse(responseBody);
      } catch {
        throw new AppError(502, 'UPSTREAM_AUTH_FAILED', 'Portal sign-in returned an unreadable response.');
      }
      if (result.type === 'failure' || result.type === 'error') {
        throw new AppError(502, 'UPSTREAM_AUTH_FAILED', 'The portal rejected the configured credentials.');
      }
    }

    if (!this.cookieHeader) {
      throw new AppError(502, 'UPSTREAM_AUTH_FAILED', 'Portal sign-in did not establish a session.');
    }
    this.authenticated = true;
  }
}

module.exports = { UrjaAuthService };
