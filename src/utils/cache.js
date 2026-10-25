'use strict';

class TtlCache {
  constructor(ttlMs, maxEntries = 500) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.entries = new Map();
    this.inFlight = new Map();
  }

  async getOrLoad(key, loader) {
    const existing = this.entries.get(key);
    if (existing && existing.expiresAt > Date.now()) return existing.value;
    if (existing) this.entries.delete(key);
    if (this.inFlight.has(key)) return this.inFlight.get(key);

    const pending = Promise.resolve()
      .then(loader)
      .then((value) => {
        this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
        while (this.entries.size > this.maxEntries) {
          this.entries.delete(this.entries.keys().next().value);
        }
        return value;
      })
      .finally(() => this.inFlight.delete(key));

    this.inFlight.set(key, pending);
    return pending;
  }

  clear() {
    this.entries.clear();
  }
}

module.exports = { TtlCache };
