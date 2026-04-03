# 🌸 LidSync

<p align="center">
  <img src="https://files.catbox.moe/m28b4w.gif" width="100%" />
</p>

<p align="center">
  <b>🔗 LID → JID Identity Resolver for Baileys</b><br>
  <sub>Optimizado para bots de WhatsApp</sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg"/>
  <img src="https://img.shields.io/badge/license-MIT-yellow.svg"/>
  <img src="https://img.shields.io/badge/status-active-success.svg"/>
</p>

---

## ✨ ¿Qué es LidSync?

**LidSync** es una librería avanzada que permite convertir identificadores privados de WhatsApp (**LIDs**) en identificadores reales (**JIDs**) mediante un sistema híbrido optimizado.

<p align="center">

```
170360431460562@lid → 521234567890@s.whatsapp.net
```

</p>

---

## ⚠️ Regla Importante — *Ice-Breaking*

<p align="center">
  ❌ <b>No puedes resolver un número si el usuario nunca ha interactuado</b>
</p>

### ✔ Cómo funciona

1. El usuario envía un mensaje, reacción o sticker  
2. WhatsApp comparte las claves necesarias  
3. **LidSync** captura y guarda la relación **LID ↔ JID automáticamente**

### 💡 Esto implica

- No funciona en eventos de bienvenida  
- Funciona después de la primera interacción del usuario  

---

## ⚙️ Compatibilidad

- 📦 **Baileys:** `@whiskeysockets/baileys` (v7+ recomendado)  
- 🟢 **Node.js:** 16 o superior  
- 💻 Compatible con Termux  

---

## 📦 Instalación

```bash
npm install lidsync
```

---

## 🚀 Uso rápido

```js
import makeWASocket from "@whiskeysockets/baileys"
import { pluginLid } from "lidsync"
import store from "./lib/store.js"

const sock = pluginLid(makeWASocket({}), { store })

// Usa LidSync en tu bot
```

---

## 🔎 Métodos disponibles

### ➤ Resolver un LID

```js
const jid = await sock.lid.resolve("170360431460562@lid")
console.log(jid)
```

---

### ➤ Limpiar número (:0)

```js
const jidReal = await sock.lid.resolve("170360431460562@lid")

if (jidReal) {
  const clean = jidReal.split('@')[0].split(':')[0]
  console.log(`wa.me/${clean}`)
}
```

---

### ➤ Resolución en lote

```js
const ids = ["id1@lid", "id2@lid"]

const result = await sock.lid.resolveBatch(ids, {
  concurrency: 5
})
```

---

### ➤ Estadísticas

```js
const stats = sock.lid.getStats()
console.log(stats)
```

---

## 💾 Uso con Store (Recomendado)

El uso de una base de datos mejora significativamente el rendimiento:

✔ Recuperación instantánea  
✔ Persistencia de datos  
✔ Resoluciones en O(1)  
✔ Menor uso del sistema  

---

## 🧠 Arquitectura

```
⚡ LRU Cache (RAM)
📂 Store Index (persistencia)
🔐 Signal Engine (Baileys)
```

---

## 🧪 Testing

Repositorio de pruebas:

🔗 https://github.com/Neykoor/LidSync-CoreBot.git

---

## 👨‍💻 Creador

<p align="center">
  <a href="https://github.com/Neykoor">
    <img src="https://github.com/Neykoor.png" width="100" style="border-radius:50%" />
  </a>
</p>

<p align="center">
  <b>Neykoor</b><br>
  https://github.com/Neykoor
</p>

---

## 🤝 Agradecimientos

<p align="center">
  <a href="https://github.com/WhiskeySockets">
    <img src="https://github.com/WhiskeySockets.png" width="100" style="border-radius:50%" />
  </a>
</p>

<p align="center">
  <b>Baileys (WhiskeySockets)</b><br>
  https://github.com/WhiskeySockets
</p>

---

## 🌸 Nota final

<p align="center">
  LidSync está diseñado para bots avanzados que trabajan con la nueva capa de privacidad de WhatsApp.<br><br>
  ⚡ <b>Rápido, inteligente y listo para producción</b>
</p>
