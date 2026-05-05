import { LidResolver } from "./src/resolver.js";

export function pluginLid(sock, options = {}) {
  const resolver = new LidResolver(sock, options);

  sock.lid = {
    resolve: async (id) => {
      try {
        return await resolver.resolver(id);
      } catch (error) {
        return null;
      }
    },

    resolveBatch: async (ids, opts) => {
      if (!ids || typeof ids[Symbol.iterator] !== "function") {
        return new Map();
      }
      try {
        return await resolver.resolverLote(ids, opts);
      } catch (error) {
        return new Map();
      }
    },

    resolveParticipants: async (participants) => {
      try {
        return await resolver.resolverParticipantes(participants);
      } catch (error) {
        return new Map();
      }
    },

    preload: (pares) => {
      if (pares) resolver.precargarCache(pares);
    },

    getStats: () => resolver.getStats(),

    isResolvable: (id) => resolver.esResolvable(id),

    syncStore: (forzar = false) => {
      resolver.sincronizarDesdeStore(forzar);
    },

    destroy: () => resolver.destroy(),

    onJoin: (callback) => resolver.onJoin(callback),
  };

  return sock;
}

export { LidResolver } from "./src/resolver.js";
