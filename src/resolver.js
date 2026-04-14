import { LidCache } from "./cache.js";

const SUFIJO_LID = "@lid";
const SUFIJO_JID = "@s.whatsapp.net";

function esLid(valor) {
  return typeof valor === "string" && valor.endsWith(SUFIJO_LID);
}

function esJidResuelto(valor) {
  return typeof valor === "string" && valor.endsWith(SUFIJO_JID);
}

function limpiarJid(valor) {
  if (typeof valor !== "string") return null;
  return `${valor.split("@")[0].split(":")[0]}${SUFIJO_JID}`;
}

export class LidResolver {
  #cache;
  #sock;
  #store;
  #reverseIndex = new Map();
  #handler;
  #maxIndexSize;

  constructor(sock, options = {}) {
    if (!sock || !sock.ev) {
      throw new Error("Se requiere un socket válido de Baileys");
    }
    this.#sock = sock;
    this.#store = options.store || null;
    this.#cache = new LidCache(options.cache || {});

    this.#maxIndexSize = Math.max(1000, options.maxIndexSize || 50000);
    this.#handler = (contactos) => this.#actualizarIndice(contactos);

    this.sincronizarDesdeStore();
    this.#suscribirAEventos();
  }

  #suscribirAEventos() {
    this.#sock.ev.on("contacts.upsert", this.#handler);
    this.#sock.ev.on("contacts.update", this.#handler);
  }

  #limpiarExcesoIndice() {
    while (this.#reverseIndex.size > this.#maxIndexSize) {
      const oldest = this.#reverseIndex.keys().next().value;
      this.#reverseIndex.delete(oldest);
    }
  }

  #actualizarIndice(contactos) {
    if (!Array.isArray(contactos)) return;

    for (const c of contactos) {
      let lid = null;
      let jid = null;

      if (c.lid && c.id && esJidResuelto(c.id)) {
        lid = c.lid;
        jid = c.id;
      } else if (c.id && esLid(c.id) && c.phoneNumber) {
        lid = c.id;
        jid = c.phoneNumber;
      } else if (c.lid && c.phoneNumber) {
        lid = c.lid;
        jid = c.phoneNumber;
      }

      if (lid && jid) {
        const lidNorm = String(lid).endsWith(SUFIJO_LID) ? String(lid) : `${lid}${SUFIJO_LID}`;
        this.#reverseIndex.set(lidNorm, limpiarJid(jid));
        this.#limpiarExcesoIndice();
      }
    }
  }

  async resolver(id) {
    if (!id || typeof id !== "string") return null;
    if (esJidResuelto(id)) return limpiarJid(id);
    if (!esLid(id)) return null;

    const cached = this.#cache.get(id);
    if (cached) return cached;

    const jid = this.#reverseIndex.get(id);
    if (jid) {
      this.#cache.set(id, jid);
      return jid;
    }

    try {
      const repo = this.#sock.signalRepository?.lidMapping;
      if (repo?.getPNForLID) {
        const pn = await repo.getPNForLID(id);
        if (pn) {
          const jidReal = limpiarJid(pn);
          this.#reverseIndex.set(id, jidReal);
          this.#limpiarExcesoIndice();
          this.#cache.set(id, jidReal);
          return jidReal;
        }
      }
    } catch (e) {
      console.warn(`[LidSync] Error en signalRepository al resolver LID ${id}:`, e.message);
    }

    return null;
  }

  async resolverLote(lids, { concurrencia = 5 } = {}) {
    const resultados = new Map();
    const cola = [...new Set(lids)].filter(id => esLid(id));

    if (cola.length === 0) return resultados;

    const ejecutarWorker = async () => {
      while (cola.length > 0) {
        const lid = cola.shift();
        const res = await this.resolver(lid);
        resultados.set(lid, res);
      }
    };

    const workers = Array(Math.min(concurrencia, cola.length))
      .fill(null)
      .map(() => ejecutarWorker());

    await Promise.all(workers);
    return resultados;
  }

  esResolvable(lid) {
    if (!esLid(lid)) return false;
    return this.#reverseIndex.has(lid);
  }

  sincronizarDesdeStore() {
    if (this.#store?.contacts) {
      this.#actualizarIndice(Object.values(this.#store.contacts));
    }
  }

  precargarCache(pares) {
    for (const { lid, jid } of pares) {
      if (esLid(lid) && esJidResuelto(jid)) {
        const jidLimpio = limpiarJid(jid);
        this.#reverseIndex.set(lid, jidLimpio);
        this.#limpiarExcesoIndice();
        this.#cache.set(lid, jidLimpio);
      }
    }
  }

  destroy() {
    if (this.#sock?.ev) {
      this.#sock.ev.off("contacts.upsert", this.#handler);
      this.#sock.ev.off("contacts.update", this.#handler);
    }
    this.#cache.destroy();
    this.#reverseIndex.clear();
  }
}
