export class LidCache {
  #data = new Map();
  #maxSize;
  #ttl;
  #purgeLimit;
  #stats = { hits: 0, misses: 0, evictions: 0, expirations: 0 };
  #purgeInterval = null;

  constructor(options = {}) {
    this.#maxSize = Math.max(1, options.maxSize || 5000);
    this.#ttl = Math.max(1000, options.ttlMs || 1000 * 60 * 60);
    this.#purgeLimit = options.purgeLimit || Math.max(100, Math.floor(this.#maxSize * 0.1));

    if (options.autoPurge !== false) {
      this.#startAutoPurge(options.purgeIntervalMs || 5 * 60 * 1000);
    }
  }

  get(lid) {
    if (!lid || typeof lid !== 'string') {
      this.#stats.misses++;
      return null;
    }

    const entry = this.#data.get(lid);

    if (!entry) {
      this.#stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.#data.delete(lid);
      this.#stats.expirations++;
      this.#stats.misses++;
      return null;
    }

    this.#data.delete(lid);
    this.#data.set(lid, entry);

    this.#stats.hits++;
    return entry.jid;
  }

  set(lid, jid, customTtl) {
    if (!lid || typeof lid !== 'string' || !jid || typeof jid !== 'string') {
      return false;
    }

    this.#data.delete(lid);

    if (this.#data.size >= this.#maxSize) {
      const oldest = this.#data.keys().next().value;
      this.#data.delete(oldest);
      this.#stats.evictions++;
    }

    const finalTtl = customTtl !== undefined ? Math.max(1, customTtl) : this.#ttl;

    this.#data.set(lid, {
      jid,
      expiry: Date.now() + finalTtl
    });

    return true;
  }

  setMany(pairs) {
    let added = 0;
    for (const [lid, jid] of pairs) {
      if (this.set(lid, jid)) added++;
    }
    return added;
  }

  delete(lid) {
    return this.#data.delete(lid);
  }

  purgeExpired(limit = null) {
    if (limit === 0) return 0;

    const now = Date.now();
    let purged = 0;

    for (const [key, value] of this.#data.entries()) {
      if (now > value.expiry) {
        this.#data.delete(key);
        purged++;
        this.#stats.expirations++;
      }
      if (limit !== null && purged >= limit) break;
    }

    return purged;
  }

  getStats() {
    const total = this.#stats.hits + this.#stats.misses;
    const estBytes = this.#data.size * 250;

    return {
      size: this.#data.size,
      maxSize: this.#maxSize,
      ttl: this.#ttl,
      ...this.#stats,
      hitRate: total > 0 ? `${((this.#stats.hits / total) * 100).toFixed(2)}%` : "0%",
      memoryEstimate: `~${(estBytes / 1024).toFixed(2)} KB`
    };
  }

  clear() {
    this.#data.clear();
    Object.keys(this.#stats).forEach(k => this.#stats[k] = 0);
  }

  destroy() {
    this.#stopAutoPurge();
    this.#data.clear();
    this.#stats = { hits: 0, misses: 0, evictions: 0, expirations: 0 };
  }

  #startAutoPurge(intervalMs) {
    this.#stopAutoPurge();
    this.#purgeInterval = setInterval(() => {
      this.purgeExpired(this.#purgeLimit);
    }, intervalMs);

    if (this.#purgeInterval.unref) {
      this.#purgeInterval.unref();
    }
  }

  #stopAutoPurge() {
    if (this.#purgeInterval) {
      clearInterval(this.#purgeInterval);
      this.#purgeInterval = null;
    }
  }

  get size() {
    return this.#data.size;
  }
}
