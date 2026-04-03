import { LidCache } from "./cache.js";

const SUFIJO_LID = "@lid";
const SUFIJO_JID = "@s.whatsapp.net";

function esLid(valor) {
  return typeof valor === "string" && valor.endsWith(SUFIJO_LID);
}

function esJidResuelto(valor) {
  return typeof valor === "string" && valor.endsWith(SUFIJO_JID);
}

export class LidResolver {
  #cache;
  #sock;
  #store;
  #reverseIndex = new Map();

  constructor(sock, options = {}) {
    if (!sock || !sock.ev) {
      throw new Error("LidSync requiere un socket válido de Baileys");
    }
    this.#sock = sock;
    this.#store = options.store || null;
    this.#cache = new LidCache(options.cache || {});
    
    this.sincronizarDesdeStore();
    this.#suscribirAEventos();
  }

  #suscribirAEventos() {
    const handler = (contactos) => {
        const arrayContactos = Array.isArray(contactos) ? contactos : (contactos.contacts || []);
        this.#actualizarIndice(arrayContactos);
    };
    this.#sock.ev.on("contacts.upsert", handler);
    this.#sock.ev.on("contacts.update", handler);
  }

  #actualizarIndice(contactos) {
    if (!Array.isArray(contactos)) return;
    
    for (const c of contactos) {
      let lid = c.lid || (esLid(c.id) ? c.id : null);
      let jid = (esJidResuelto(c.id) ? c.id : null) || (c.phoneNumber ? (c.phoneNumber.includes('@') ? c.phoneNumber : `${c.phoneNumber}${SUFIJO_JID}`) : null);

      if (lid && jid) {
        const lidNorm = String(lid).endsWith(SUFIJO_LID) ? String(lid) : `${lid}${SUFIJO_LID}`;
        const jidNorm = jid.split(':')[0].split('@')[0] + SUFIJO_JID;
        this.#reverseIndex.set(lidNorm, jidNorm);
      }
    }
  }

  async resolver(id) {
    if (!id || typeof id !== "string") return null;
    if (esJidResuelto(id)) return id;
    if (!esLid(id)) return null;

    const cached = this.#cache.get(id);
    if (cached) return cached;

    const jid = this.#reverseIndex.get(id);
    if (jid) {
      this.#cache.set(id, jid);
      return jid;
    }

    try {
      const lidMapping = this.#sock.signalRepository?.lidMapping;
      if (lidMapping?.getPNForLID) {
        const pn = await lidMapping.getPNForLID(id);
        if (pn) {
          const jidReal = pn.includes('@') ? pn.split(':')[0] : `${pn.split(':')[0]}${SUFIJO_JID}`;
          this.#reverseIndex.set(id, jidReal);
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
        const lid = cola.pop();
        const res = await this.resolver(lid);
        resultados.set(lid, res);
      }
    };

    const workers = Array.from(
      { length: Math.min(concurrencia, cola.length) },
      () => ejecutarWorker()
    );

    await Promise.all(workers);
    return resultados;
  }

  esResolvable(lid) {
    if (!esLid(lid)) return false;
    return this.#reverseIndex.has(lid) || this.#cache.get(lid) !== null;
  }

  sincronizarDesdeStore() {
    if (this.#store) {
      const contactos = this.#store.contacts || (typeof this.#store.getAllContacts === 'function' ? this.#store.getAllContacts() : null);
      if (contactos) {
        this.#actualizarIndice(Object.values(contactos));
      }
    }
  }

  getStats() {
    return this.#cache.getStats();
  }

  precargarCache(pares) {
    if (!Array.isArray(pares)) return;
    for (const item of pares) {
      const { lid, jid } = item;
      if (esLid(lid) && jid) {
        const jidNorm = jid.includes('@') ? jid : `${jid}${SUFIJO_JID}`;
        this.#reverseIndex.set(lid, jidNorm);
        this.#cache.set(lid, jidNorm);
      }
    }
  }
}
