import fs from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

const filePath = path.resolve(process.cwd(), "baileys_store.json");

const store = {
    contacts: {},
    _dirty: false,
    _saving: false,

    load() {
        try {
            if (!existsSync(filePath)) return;
            const data = JSON.parse(readFileSync(filePath, 'utf-8'));
            this.contacts = data.contacts || {};
        } catch (err) {
            this.contacts = {};
        }
    },

    async save(force = false) {
        if (this._saving || (!this._dirty && !force)) return;
        
        this._saving = true;
        this._dirty = false;
        
        try {
            const data = JSON.stringify({ contacts: this.contacts }, null, 2);
            await fs.writeFile(filePath + '.tmp', data);
            await fs.rename(filePath + '.tmp', filePath);
        } catch (err) {
            this._dirty = true;
        } finally {
            this._saving = false;
        }
    },

    bind(ev) {
        const actualizar = (contactos) => {
            if (!Array.isArray(contactos)) return;
            for (const c of contactos) {
                const existing = this.contacts[c.id] || {};
                this.contacts[c.id] = { ...existing, ...c };
            }
            this._dirty = true;
        };

        ev.on('contacts.upsert', actualizar);
        ev.on('contacts.update', actualizar);
        ev.on('contacts.set', actualizar);
    }
};

store.load();

const saveInterval = setInterval(() => store.save(), 10000);

const cerrarLimpiamente = async (signal) => {
    clearInterval(saveInterval);
    await store.save(true);
    process.exit(0);
};

process.on("SIGINT", () => cerrarLimpiamente("SIGINT"));
process.on("SIGTERM", () => cerrarLimpiamente("SIGTERM"));

export default store;
