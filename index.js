import { LidResolver } from "./src/resolver.js";

export function pluginLid(sock, options = {}) {
  const resolver = new LidResolver(sock, options);

  sock.lid = {
    resolve: (id) => resolver.resolver(id),
    resolveBatch: (ids, opts) => resolver.resolverLote(ids, opts),
    preload: (pares) => resolver.precargarCache(pares),
    getStats: () => resolver.getStats?.() || {},
    isResolvable: (id) => resolver.esResolvable?.(id) || false
  };

  return sock;
}

export { LidResolver } from "./src/resolver.js";
export { LidCache } from "./src/cache.js";
export { esNumeroValido } from "./src/validator.js";

export default pluginLid;
