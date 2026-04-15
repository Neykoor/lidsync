import { LidResolver } from "./src/resolver.js";

export function pluginLid(sock, options = {}) {
  const resolver = new LidResolver(sock, options);

  sock.lid = {
    resolve: async (id) => {
      try {
        return await resolver.resolver(id);
      } catch (error) {
        console.warn(`[LidSync] Error:`, error.message);
        return null;
      }
    },
    
    resolveBatch: async (ids, opts) => {
      if (!ids || typeof ids[Symbol.iterator] !== 'function') {
        return new Map();
      }
      try {
        return await resolver.resolverLote(ids, opts);
      } catch (error) {
        console.warn(`[LidSync] Batch Error:`, error.message);
        return new Map();
      }
    },
    
    preload: (pares) => {
      if (pares && typeof resolver.precargarCache === 'function') {
        resolver.precargarCache(pares);
      }
    },
    
    getStats: () => {
      return typeof resolver.getStats === 'function' ? resolver.getStats() : {};
    },
    
    isResolvable: (id) => {
      if (typeof resolver.esResolvable === 'function') {
        return resolver.esResolvable(id);
      }
      return typeof id === 'string' && id.endsWith('@lid');
    },

    destroy: () => {
      if (typeof resolver.destroy === 'function') {
        resolver.destroy();
      }
    }
  };

  return sock;
}

export { LidResolver } from "./src/resolver.js";
export { LidCache } from "./src/cache.js";
export { esNumeroValido } from "./src/validator.js";

export default pluginLid;
