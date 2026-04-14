import fs from 'fs/promises';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PATH = path.join(__dirname, '..', 'data', 'store.json');

export class StorePro {
  #bound = false;
  #savePromise = null;
  #exitHandler = null;

  constructor(options = {}) {
    this.path = options.path || DEFAULT_PATH;
    this.maxMessagesPerChat = options.maxMessagesPerChat || 50;
    this.saveIntervalMs = options.saveIntervalMs || 10_000;

    this.contacts = {};
    this.chats = {};
    this.messages = {};

    this._saveInterval = null;

    const dir = path.dirname(this.path);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    this._loadSync();
    this.#bindShutdown();
  }

  _loadSync() {
    try {
      if (existsSync(this.path)) {
        const data = readFileSync(this.path, 'utf-8');
        const parsed = JSON.parse(data);
        this.contacts = parsed.contacts || {};
        this.chats = parsed.chats || {};
      }
    } catch (err) {
      console.warn('[StorePro] Iniciando store en limpio (JSON previo ausente o corrupto).');
    }
  }

  bind(ev) {
    if (this.#bound) return;
    this.#bound = true;

    ev.on('contacts.upsert', (contactos) => {
      for (const c of contactos) {
        if (c.id) this.contacts[c.id] = Object.assign(this.contacts[c.id] || {}, c);
      }
    });

    ev.on('contacts.update', (updates) => {
      for (const u of updates) {
        if (u.id) this.contacts[u.id] = Object.assign(this.contacts[u.id] || {}, u);
      }
    });

    ev.on('chats.upsert', (chats) => {
      for (const c of chats) {
        if (c.id) this.chats[c.id] = Object.assign(this.chats[c.id] || {}, c);
      }
    });

    ev.on('chats.update', (updates) => {
      for (const u of updates) {
        if (u.id) this.chats[u.id] = Object.assign(this.chats[u.id] || {}, u);
      }
    });

    ev.on('chats.delete', (deletions) => {
      for (const id of deletions) {
        delete this.chats[id];
        delete this.messages[id];
      }
    });

    ev.on('messages.upsert', ({ messages }) => {
      for (const msg of messages) {
        const jid = msg.key.remoteJid;
        if (!jid) continue;
        if (!this.messages[jid]) this.messages[jid] = [];
        this.messages[jid].push(msg);
        if (this.messages[jid].length > this.maxMessagesPerChat) {
          this.messages[jid].shift();
        }
      }
    });

    this.#startAutoSave();
  }

  #startAutoSave() {
    if (this._saveInterval) clearInterval(this._saveInterval);
    this._saveInterval = setInterval(() => this.save(), this.saveIntervalMs);
    if (this._saveInterval.unref) this._saveInterval.unref();
  }

  #bindShutdown() {
    this.#exitHandler = async () => {
      await this.destroy();
      process.exit(0);
    };
    process.on('SIGINT', this.#exitHandler);
    process.on('SIGTERM', this.#exitHandler);
  }

  async save(force = false) {
    if (this.#savePromise) {
      if (!force) return this.#savePromise;
      await this.#savePromise;
    }

    const p = this.#doSave().finally(() => {
      if (this.#savePromise === p) this.#savePromise = null;
    });
    
    this.#savePromise = p;
    return p;
  }

  async #doSave() {
    try {
      const data = JSON.stringify({ contacts: this.contacts, chats: this.chats });
      const tmpPath = `${this.path}.tmp`;
      await fs.writeFile(tmpPath, data);
      await fs.rename(tmpPath, this.path);
    } catch (error) {
      console.error('[StorePro] Error guardando estado:', error.message);
    }
  }

  async destroy() {
    if (this._saveInterval) {
      clearInterval(this._saveInterval);
      this._saveInterval = null;
    }
    if (this.#exitHandler) {
      process.off('SIGINT', this.#exitHandler);
      process.off('SIGTERM', this.#exitHandler);
      this.#exitHandler = null;
    }
    await this.save(true);
  }
}
