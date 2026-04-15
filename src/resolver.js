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
  const numero = valor.split("@")[0].split(":")[0].replace(/\D/g, "");
  if (!numero || numero.length < 5) return null;
  return `${numero}${SUFIJO_JID}`;
}

export class LidResolver {
  #cache; #sock; #store; #reverseIndex = new Map(); #handler; #maxIndexSize; #sincronizado = false;

  constructor(sock, options = {}) {
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

    this.#sock.ev.on("messages.upsert", ({ messages }) => {
      for (const m of messages) {
        const id = m.key.participant || m.key.remoteJid;
        if (id && esLid(id)) {
          const pn = m.key.participant?.split(':')[0] || m.key.remoteJid?.split(':')[0];
          if (pn && !pn.endsWith(SUFIJO_LID)) {
            this.#actualizarIndice([{ lid: id, phoneNumber: pn }]);
          }
        }
      }
    });
  }

  #limpiarExcesoIndice() {
    if (this.#reverseIndex.size > this.#maxIndexSize) {
      const cantidadABorrar = 100;
      const keysToDelete = Array.from(this.#reverseIndex.keys()).slice(0, cantidadABorrar);
      for (const key of keysToDelete) {
        this.#reverseIndex.delete(key);
      }
      console.log(`[LidSync] Librería limpiando: Índice saturado, se liberaron ${cantidadABorrar} espacios.`);
    }
  }

  #actualizarIndice(contactos) {
    if (!Array.isArray(contactos)) return;
    for (const c of contactos) {
      let lid = c.lid || (esLid(c.id) ? c.id : null);
      let jid = c.phoneNumber || (esJidResuelto(c.id) ? c.id : null);
      if (lid && jid) {
        const lidNorm = lid.endsWith(SUFIJO_LID) ? lid : `${lid}${SUFIJO_LID}`;
        const jidLimpio = limpiarJid(jid);
        if (jidLimpio) {
          this.#reverseIndex.set(lidNorm, jidLimpio);
          this.#cache.set(lidNorm, jidLimpio);
        }
      }
    }
    this.#limpiarExcesoIndice();
  }

  async resolver(id) {
    if (!id || typeof id !== "string") return null;
    if (esJidResuelto(id)) return limpiarJid(id) || id;
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
          if (jidReal) {
            this.#reverseIndex.set(id, jidReal);
            this.#cache.set(id, jidReal);
            return jidReal;
          }
        }
      }
    } catch (e) {}
    return null;
  }

  sincronizarDesdeStore() {
    try {
      if (this.#sincronizado || !this.#store) return;

      if (typeof this.#store !== 'object' || !this.#store.contacts) {
        console.error(`[LidSync] Error: El store proporcionado no cumple con los requisitos (Falta objeto 'contacts').`);
        return;
      }

      const contactos = Object.values(this.#store.contacts);
      if (contactos.length > 0) {
        this.#actualizarIndice(contactos);
        this.#sincronizado = true;
      }
    } catch (error) {
      console.warn(`[LidSync] Aviso: Error al leer la estructura del store (${error.message}).`);
    }
  }

  esResolvable(lid) { return esLid(lid) && (this.#reverseIndex.has(lid) || this.#cache.has(lid)); }
  destroy() { this.#cache.destroy(); this.#reverseIndex.clear(); }
}
