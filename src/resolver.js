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
    if (this.#sincronizado || !this.#store?.contacts) return;
    this.#actualizarIndice(Object.values(this.#store.contacts));
    this.#sincronizado = true;
  }

  esResolvable(lid) { return esLid(lid) && (this.#reverseIndex.has(lid) || this.#cache.has(lid)); }
  destroy() { this.#cache.destroy(); this.#reverseIndex.clear(); }
}
