# 🌸 LidSync

<p align="center">
  <img src="https://files.catbox.moe/m28b4w.gif" width="100%" />
</p>«🔗 LID → JID Identity Resolver for Baileys (WhatsApp Bots)»

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg"/>
  <img src="https://img.shields.io/badge/license-MIT-yellow.svg"/>
  <img src="https://img.shields.io/badge/status-active-success.svg"/>
</p>

---

✨ ¿Qué es LidSync?

LidSync es una librería avanzada que permite convertir identificadores privados de WhatsApp (LIDs) en identificadores reales (JIDs) usando un sistema híbrido optimizado.

🔍 Convierte:

170360431460562@lid → 521234567890@s.whatsapp.net

---

⚠️ Regla Importante: "Ice-Breaking"

Debido a la privacidad de WhatsApp:

«❌ No puedes resolver un número si el usuario nunca ha interactuado»

✔ Cómo funciona:

1. El usuario envía un mensaje / reacción / sticker
2. WhatsApp comparte las claves necesarias
3. LidSync captura y guarda la relación LID ↔ JID automáticamente

💡 Esto significa:

- No funciona en el evento de bienvenida
- Funciona después del primer mensaje del usuario

---

⚙️ Compatibilidad

- 📦 Baileys: "@whiskeysockets/baileys" (v7+ recomendado)
- 🟢 Node.js: 16 o superior
- 💻 Compatible con Termux

---

📦 Instalación

npm install lidsync

---

🚀 Uso rápido

import makeWASocket from "@whiskeysockets/baileys"
import { pluginLid } from "lidsync"
import store from "./lib/store.js"

const sock = pluginLid(makeWASocket({}), { store })

// Usa LidSync en tu bot

---

🔎 Métodos disponibles

➤ Resolver un LID

const jid = await sock.lid.resolve("170360431460562@lid")
console.log(jid)

---

➤ Limpiar número (:0)

const jidReal = await sock.lid.resolve("170360431460562@lid")

if (jidReal) {
  const clean = jidReal.split('@')[0].split(':')[0]
  console.log(`wa.me/${clean}`)
}

---

➤ Resolución en lote

const ids = ["id1@lid", "id2@lid"]

const result = await sock.lid.resolveBatch(ids, {
  concurrency: 5
})

---

➤ Estadísticas

const stats = sock.lid.getStats()
console.log(stats)

---

💾 Uso con Store (Recomendado)

Aunque es opcional, usar una base de datos mejora mucho el rendimiento:

✔ Recuperación instantánea
✔ Persistencia de datos
✔ Resoluciones en O(1)
✔ Menor uso del sistema

---

🧠 Arquitectura

Sistema de 3 niveles:

1. ⚡ LRU Cache (RAM)
2. 📂 Store Index (persistencia)
3. 🔐 Signal Engine (Baileys)

---

🧪 Testing

Repositorio de pruebas:

🔗 https://github.com/ScriptNex/bot-test-lid

---

👨‍💻 Creador

<p align="center">
  <a href="https://github.com/Neykoor">
    <img src="https://github.com/Neykoor.png" width="100" style="border-radius:50%" />
  </a>
</p><p align="center">
  <b>Neykoor</b><br>
  https://github.com/Neykoor
</p>---

🤝 Agradecimientos

<p align="center">
  <a href="https://github.com/WhiskeySockets">
    <img src="https://github.com/WhiskeySockets.png" width="100" style="border-radius:50%" />
  </a>
</p><p align="center">
  <b>Baileys (WhiskeySockets)</b><br>
  https://github.com/WhiskeySockets
</p>---

🌸 Nota final

LidSync está diseñado para bots avanzados que trabajan con la nueva capa de privacidad de WhatsApp.

«⚡ Rápido, inteligente y listo para producción.»
