🌸 LidSync

<p align="center">
  <img src="https://files.catbox.moe/m28b4w.gif" width="100%" />
</p><p align="center">
  <b>🔗 LID → JID Identity Resolver for Baileys</b><br>
  <sub>Optimizado para bots de WhatsApp</sub>
</p><p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg"/>
  <img src="https://img.shields.io/badge/license-MIT-yellow.svg"/>
  <img src="https://img.shields.io/badge/status-active-success.svg"/>
</p>

---

✨ ¿Qué es LidSync?

LidSync es una librería avanzada que permite convertir identificadores privados de WhatsApp (LIDs) en identificadores reales (JIDs) mediante un sistema híbrido optimizado.

<p align="center">
  <code>170360431460562@lid → 521234567890@s.whatsapp.net</code>
</p>

---

⚠️ Regla Importante — Ice-Breaking

<p align="center">
  ❌ <b>No puedes resolver un número si el usuario nunca ha interactuado</b>
</p>✔ Cómo funciona

- El usuario envía un mensaje, reacción o sticker
- WhatsApp comparte las claves necesarias
- LidSync captura y guarda la relación LID ↔ JID automáticamente

💡 Esto implica

- ❌ No funciona en eventos de bienvenida
- ✔ Funciona después de la primera interacción del usuario

---

⚙️ Compatibilidad

- 📦 Baileys: "@whiskeysockets/baileys" (v7+ recomendado)
- 🟢 Node.js: 16 o superior
- 💻 Compatible con Termux y paneles (Pterodactyl / Pelican)

---

📦 Instalación
```
npm install lidsync
```
---

🚀 Uso rápido
```js
import makeWASocket from "@whiskeysockets/baileys"
import { pluginLid } from "lidsync"
import storePro from "./store.js"

async function start() {
  let sock = makeWASocket({})

  // 1. Vincular el store
  storePro.bind(sock.ev)

  // 2. Inyectar LidSync
  sock = pluginLid(sock, { store: storePro })

  // Usa LidSync en tu bot
}
```
---

🔎 Métodos disponibles

➤ Resolver un LID
```js
const jid = await sock.lid.resolve("170360431460562@lid")
console.log(jid)
```
---

➤ JIDs Limpios Automáticamente ✨

LidSync elimina automáticamente los sufijos como ":0" o ":1" y devuelve un JID limpio listo para usar.
```js
const jidReal = await sock.lid.resolve("170360431460562@lid")

if (jidReal) {
  const numero = jidReal.split('@')[0]
  console.log(`wa.me/${numero}`)
}
```
---

➤ Resolución en lote
```js
const ids = ["id1@lid", "id2@lid"]

const result = await sock.lid.resolveBatch(ids, {
  concurrencia: 5
})

for (const [lid, jidReal] of result) {
  console.log(`${lid} ➔ ${jidReal}`)
}
```
---

➤ Estadísticas

```js
const stats = sock.lid.getStats()
console.log(stats)
```
---

💾 Store Pro Incluido (Recomendado)

El store oficial de Baileys puede consumir mucha RAM o corromperse.
LidSync incluye un Store optimizado en "examples/store.js".

✔ Ventajas

- 🧠 Bajo consumo de RAM (Ring Buffer)
- 🔐 Anti-corrupción (escritura atómica ".tmp")
- ⚡ Guardado automático al apagar
- 🚀 Optimizado para búsquedas O(1)

---

🧠 Arquitectura

- ⚡ LRU Cache (RAM — ultra rápida)
- 📂 Store Index (persistencia en disco)
- 🔐 Signal Engine (Baileys)

---

🧪 Testing

🔗 https://github.com/Neykoor/LidSync-CoreBot.git

---

👨‍💻 Creador

<p align="center">
  <a href="https://github.com/Neykoor">
    <img src="https://github.com/Neykoor.png" width="90" style="border-radius:50%" />
  </a>
</p><p align="center">
  <b>Neykoor</b><br>
  https://github.com/Neykoor
</p>

---

🤝 Agradecimientos

<p align="center">
  <a href="https://github.com/WhiskeySockets">
    <img src="https://github.com/WhiskeySockets.png" width="90" style="border-radius:50%" />
  </a>
</p><p align="center">
  <b>Baileys (WhiskeySockets)</b><br>
  https://github.com/WhiskeySockets
</p>

---

🌸 Nota final

<p align="center">
  LidSync está diseñado para bots avanzados que trabajan con la nueva capa de privacidad de WhatsApp.<br><br>
  ⚡ <b>Rápido, inteligente y listo para producción</b>
</p>
