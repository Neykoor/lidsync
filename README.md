🌸 LidSync
<p align="center">
<img src="https://files.catbox.moe/m28b4w.gif" width="100%" />
</p>
<p align="center">
<b>🔗 LID → JID Identity Resolver for Baileys</b>

<sub>Optimizado para bots de WhatsApp</sub>
</p>
<p align="center">
<img src="https://img.shields.io/badge/version-1.0.0-blue.svg"/>
<img src="https://img.shields.io/badge/license-MIT-yellow.svg"/>
<img src="https://img.shields.io/badge/status-active-success.svg"/>
</p>
✨ ¿Qué es LidSync?
LidSync es una librería avanzada que permite convertir identificadores privados de WhatsApp (LIDs) en identificadores reales (JIDs) mediante un sistema híbrido optimizado.
<p align="center">
170360431460562@lid → 521234567890@s.whatsapp.net

</p>
⚠️ Regla Importante — Ice-Breaking
<p align="center">
❌ <b>No puedes resolver un número si el usuario nunca ha interactuado</b>
</p>
✔ Cómo funciona
 * El usuario envía un mensaje, reacción o sticker
 * WhatsApp comparte las claves necesarias
 * LidSync captura y guarda la relación LID ↔ JID automáticamente
💡 Esto implica
 * No funciona en eventos de bienvenida
 * Funciona después de la primera interacción del usuario
⚙️ Compatibilidad
 * 📦 Baileys: @whiskeysockets/baileys (v7+ recomendado)
 * 🟢 Node.js: 16 o superior
 * 💻 Compatible con Termux y Paneles de Hosting (Pterodactyl/Pelican)
📦 Instalación
npm install lidsync

🚀 Uso rápido
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

🔎 Métodos disponibles
➤ Resolver un LID
const jid = await sock.lid.resolve("170360431460562@lid")
console.log(jid) // Retorna JID limpio o null

➤ JIDs Limpios Automáticamente ✨
¡Olvídate de hacer .split(':')! LidSync purifica los JIDs automáticamente desde el núcleo. Si el usuario tiene dispositivos vinculados, la librería remueve el :0 o :1 y devuelve el JID puro listo para usarse.
const jidReal = await sock.lid.resolve("170360431460562@lid")

if (jidReal) {
  const numeroLimpio = jidReal.split('@')[0]
  console.log(`wa.me/${numeroLimpio}`) 
}

➤ Resolución en lote
Optimizado con control de concurrencia para evitar saturar el hilo principal al extraer miembros de un grupo.
const ids = ["id1@lid", "id2@lid"]

const result = await sock.lid.resolveBatch(ids, {
  concurrencia: 5
})

for (const [lid, jidReal] of result) {
    console.log(`${lid} ➔ ${jidReal}`)
}

➤ Estadísticas
const stats = sock.lid.getStats()
console.log(stats)

💾 Store Pro Incluido (Recomendado)
El Store oficial de Baileys consume demasiada RAM y suele corromperse si el bot se apaga de golpe. Para solucionar esto, LidSync incluye un Store Optimizado en la carpeta examples/store.js.
Solo cópialo a la carpeta de tu bot y úsalo.
✔ Bajo consumo de RAM: Límite estricto (Ring Buffer) de mensajes por chat.
✔ Anti-Corrupción: Escritura atómica (ACID) con archivos temporales .tmp.
✔ Apagado Seguro: Detecta el cierre del servidor y guarda automáticamente.
✔ Compatibilidad 100%: Diseñado específicamente para nutrir la caché de LidSync en O(1).
🧠 Arquitectura
⚡ LRU Cache (RAM - Búsqueda ultra rápida)
📂 Store Index (Persistencia local en disco)
🔐 Signal Engine (Desencriptación Baileys)

🧪 Testing
Repositorio de pruebas:
🔗 https://github.com/Neykoor/LidSync-CoreBot.git
👨‍💻 Creador
<p align="center">
<a href="https://github.com/Neykoor">
<img src="https://github.com/Neykoor.png" width="100" style="border-radius:50%" />
</a>
</p>
<p align="center">
<b>Neykoor</b>

https://github.com/Neykoor
</p>
🤝 Agradecimientos
<p align="center">
<a href="https://github.com/WhiskeySockets">
<img src="https://github.com/WhiskeySockets.png" width="100" style="border-radius:50%" />
</a>
</p>
<p align="center">
<b>Baileys (WhiskeySockets)</b>

https://github.com/WhiskeySockets
</p>
🌸 Nota final
<p align="center">
LidSync está diseñado para bots avanzados que trabajan con la nueva capa de privacidad de WhatsApp.


⚡ <b>Rápido, inteligente y listo para producción</b>
</p>
