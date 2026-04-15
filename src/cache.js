export class LidCache {
  #data = new Map();
  #maxSize;
  #ttl;
  #stats = { hits: 0, misses: 0, evictions: 0, expirations: 0 };
  #purgeInterval = null;

  constructor(options = {}) {
    this.#maxSize = Math.max(1, options.maxSize || 7500);
    this.#ttl = Math.max(1000, options.ttlMs || 1000 * 60 * 60 * 24);
    
    if (options.autoPurge !== false) {
      this.#startAutoPurge(options.purgeIntervalMs || 15 * 60 * 1000);
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

    const now = Date.now();
    if (now > entry.expiry) {
      this.#data.delete(lid);
      this.#stats.expirations++;
      this.#stats.misses++;
      return null;
    }

    entry.expiry = Math.max(entry.expiry, now + (this.#ttl * 0.2));
    this.#data.delete(lid);
    this.#data.set(lid, entry);
    
    this.#stats.hits++;
    return entry.jid;
  }

  set(lid, jid, customTtl) {
    if (!lid || typeof lid !== 'string' || !jid || typeof jid !== 'string') return false;

    this.#data.delete(lid);
    if (this.#data.size >= this.#maxSize) {
      const oldestKey = this.#data.keys().next().value;
      this.#data.delete(oldestKey);
      this.#stats.evictions++;
    }

    this.#data.set(lid, {
      jid,
      expiry: Date.now() + (customTtl || this.#ttl)
    });
    return true;
  }

  setMany(pairs) {
    if (!pairs) return 0;
    let added = 0;
    const entries = Array.isArray(pairs) ? pairs : Object.entries(pairs);
    for (const [lid, jid] of entries) {
      if (this.set(lid, jid)) added++;
    }
    return added;
  }

  getStats() {
    const total = this.#stats.hits + this.#stats.misses;
    return {
      size: this.#data.size,
      maxSize: this.#maxSize,
      ...this.#stats,
      hitRate: total > 0 ? `${((this.#stats.hits / total) * 100).toFixed(2)}%` : "0%",
      memoryEstimate: `${((this.#data.size * 250) / 1024).toFixed(2)} KB`
    };
  }

  purgeExpired(limit = 100) {
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
    if (purged > 0) {
      console.log(`[LidSync] Librería limpiando: ${purged} entradas caducadas eliminadas.`);
    }
    return purged;
  }

  #startAutoPurge(intervalMs) {
    this.#stopAutoPurge();
    this.#purgeInterval = setInterval(() => {
      if (this.#data.size > (this.#maxSize * 0.85)) {
        this.purgeExpired(100);
      }
    }, intervalMs);
    if (this.#purgeInterval.unref) this.#purgeInterval.unref();
  }

  #stopAutoPurge() {
    if (this.#purgeInterval) {
      clearInterval(this.#purgeInterval);
      this.#purgeInterval = null;
    }
  }

  delete(lid) { return this.#data.delete(lid); }
  clear() { this.#data.clear(); }
  destroy() { this.#stopAutoPurge(); this.#data.clear(); }
  get size() { return this.#data.size; }
}
