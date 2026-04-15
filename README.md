<p align="center">
  <img src="https://files.catbox.moe/m28b4w.gif" width="100%" />
</p>

<h1 align="center">🌸 LidSync</h1>

<p align="center">
  <b>LID → JID Identity Resolver para bots de WhatsApp con Baileys</b><br>
  <sub>Cache LRU · Store Inteligente · Auto-Aprendizaje · Normalización automática de JIDs</sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-5.0.0-blue.svg?style=flat-square"/>
  <img src="https://img.shields.io/badge/license-MIT-yellow.svg?style=flat-square"/>
  <img src="https://img.shields.io/badge/Node.js-18%2B-green.svg?style=flat-square&logo=node.js"/>
  <img src="https://img.shields.io/badge/Baileys-%3E%3D6.7.0-purple.svg?style=flat-square"/>
  <img src="https://img.shields.io/badge/status-stable-success.svg?style=flat-square"/>
</p>

---

> ## 🎉 ¡Bienvenidos a LidSync v5 "Gentle"!
>
> Esta versión marca un salto significativo en estabilidad y persistencia. La v5 fue diseñada para ser **infalible pero ligera**: los usuarios ya no se "olvidan" tras un reinicio gracias al auto-aprendizaje pasivo y la persistencia de 24 horas.
>
> **¿Vienes de la v4?** Todo el API que conoces sigue funcionando igual. Solo necesitas actualizar la dependencia y, opcionalmente, adoptar los nuevos métodos.
>
> 🔭 **¿Qué sigue?** La **v6** está en desarrollo y llegará el próximo mes con aún más mejoras. ¡Mantente pendiente!

---

## ¿Qué es LidSync?

WhatsApp introdujo los **LIDs** (`170360431460562@lid`) como identificadores de privacidad que ocultan el número real del usuario. LidSync resuelve esos LIDs a JIDs reales (`521234567890@s.whatsapp.net`) mediante un sistema de tres capas:

```
170360431460562@lid  →  521234567890@s.whatsapp.net
```

---

## 🆕 ¿Qué hay de nuevo en la v5?

| Característica | v4 | v5 "Gentle" |
|---|---|---|
| Persistencia de identidades | TTL 1h | **Persistencia 24h con refresco automático** |
| Aprendizaje de JIDs | Solo en eventos principales | **Pasivo: mensajes, stickers, reacciones** |
| Logs de mantenimiento | Sin avisos | **Mensajes en consola al limpiar memoria** |
| Validación del Store | Sin protección | **Protección contra `store.json` corrupto** |

- **Detección Pasiva:** Captura mapeos desde cualquier evento (Mensajes, Stickers, Reacciones).
- **Persistencia de 24h:** El cache mantiene identidades por un día completo, refrescándose automáticamente con cada interacción.
- **Logs de Mantenimiento:** Avisos en consola cuando la librería realiza limpieza de memoria.
- **Validación de Store:** Protección contra archivos `store.json` corruptos o incompletos sin detener el bot.

---

## 🧠 Jerarquía de Resolución

LidSync utiliza una estrategia de tres capas para garantizar que el Owner y los usuarios siempre sean reconocidos:

| Nivel | Fuente | Lógica |
|---|---|---|
| **1** | **Cache Dinámico** | Persistencia de 24h con refresco automático (LRU). |
| **2** | **Auto-Aprendizaje** | Captura JIDs reales desde metadatos de mensajes entrantes. |
| **3** | **Store & Signal** | Fallback a la base de datos local y al repositorio de Baileys. |

---

## ⚠️ El problema de los LIDs opacos

> **Un LID solo puede resolverse si el usuario ya interactuó con el bot o está en la agenda del número vinculado.**

Esto es una restricción de WhatsApp, no de LidSync. La v5 soluciona esto detectando automáticamente el JID real cuando el usuario envía:

- ❌ Eventos de bienvenida con LID puro → no resoluble hasta primera interacción
- ✅ Un mensaje de texto
- ✅ Un Sticker o Audio
- ✅ Una Reacción (Emoji)

---

## 📦 Instalación

```bash
# En tu package.json
"lidsync": "git+https://github.com/Neykoor/LidSync.git"
```

```bash
npm install
```

---

## 🚀 Inicio Rápido

```js
import { connectToWhatsApp } from './connection.js';
import { loadEvents } from './loader.js';
import { pluginLid } from 'lidsync';
import { StorePro } from 'lidsync/examples/store.js';

const store = new StorePro({ path: './data/store.json' });

async function start() {
    let sock = await connectToWhatsApp();

    // 1. Vincular el store a los eventos del socket
    store.bind(sock.ev);

    // 2. Inyectar LidSync en el socket
    sock = pluginLid(sock, { store });

    // Ahora sock.lid está disponible en todo el bot
    await loadEvents(sock);
}

start();
```

### Integración con Auto-Aprendizaje (v5)

```js
import { pluginLid } from 'lidsync';
import { StorePro } from './database/store.js';

const store = new StorePro({ path: './database/store.json' });

async function start() {
    let sock = await connectToWhatsApp();
    
    // Inyectar LidSync v5
    sock = pluginLid(sock, { store });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        const sender = m.key.participant || m.key.remoteJid;
        
        // Resolución transparente — v5 aprende automáticamente de este evento
        const realJid = await sock.lid.resolve(sender);
        console.log(`Mensaje de: ${realJid}`);
    });
}
```

---

## 🔎 API

### `sock.lid.resolve(id)`

Resuelve un LID a su JID real. Si el input ya es un JID (`@s.whatsapp.net`), lo devuelve directamente. En v5, también normaliza sufijos de dispositivo (`:1`, `:2`).

```js
const jid = await sock.lid.resolve('170360431460562@lid');
// → '521234567890@s.whatsapp.net' | null
```

**Retorna:** `string | null`
- `string` — JID limpio, sin sufijos de dispositivo (`:0`, `:1`)
- `null` — LID no resoluble (usuario sin interacción previa)

---

### `sock.lid.resolveBatch(ids, opciones?)`

Resuelve múltiples LIDs con concurrencia controlada para no saturar el socket. Los JIDs reales mezclados en el array se resuelven directamente sin consultas adicionales.

```js
const ids = ['id1@lid', 'id2@lid', 'id3@lid'];

const resultados = await sock.lid.resolveBatch(ids, { concurrencia: 5 });

for (const [lid, jid] of resultados) {
    console.log(`${lid} → ${jid ?? 'no encontrado'}`);
}
```

**Retorna:** `Map<string, string | null>`

---

### `sock.lid.isResolvable(id)`

Verifica si un LID tiene mapeo conocido en el índice o cache **sin hacer consultas de red**.

```js
if (sock.lid.isResolvable('170360431460562@lid')) {
    // Seguro de resolver sin latencia
}
```

**Retorna:** `boolean`

---

### `sock.lid.preload(pares)`

Pre-carga mapeos conocidos (por ejemplo, desde tu base de datos) al cache en memoria.

```js
sock.lid.preload([
    { lid: '123456789@lid', jid: '521234567890@s.whatsapp.net' }
]);
```

---

### `sock.lid.getStats()`

Devuelve estadísticas del cache LRU. En v5 incluye estimación de memoria mejorada.

```js
const stats = sock.lid.getStats();
console.log(stats);
/*
{
    "size": 1250,
    "hitRate": "98.5%",
    "memoryEstimate": "310.20 KB"
}
*/
```

---

### `sock.lid.destroy()`

Limpia los listeners del socket y destruye el cache interno. **Úsalo siempre antes de una reconexión.**

```js
// En tu lógica de reconexión:
sock.lid.destroy();
sock = await reconnect();
sock = pluginLid(sock, { store });
```

---

## 📊 Monitoreo y Limpieza (v5)

LidSync v5 gestiona la memoria de forma inteligente. Verás estos mensajes en consola cuando el sistema realice mantenimiento preventivo:

```
[LidSync] Librería limpiando: X entradas caducadas eliminadas.
[LidSync] Librería limpiando: Índice saturado, se liberaron X espacios.
```

Esto ocurre automáticamente cuando el cache supera el **85% de su capacidad**, asegurando que el bot nunca consuma RAM en exceso.

---

## 💾 Store Pro (incluido)

El store oficial de Baileys (`makeInMemoryStore`) crece indefinidamente hasta agotar la RAM. LidSync incluye un store optimizado con escrituras atómicas y validación de integridad en v5.

**Ventajas sobre el store oficial:**

| Característica | Store oficial | Store Pro |
|---|---|---|
| Consumo de RAM | Ilimitado | Ring buffer (50 msg/chat) |
| Corrupción en crash | Posible | Escritura atómica `.tmp` |
| Guardado automático | No | Cada 10s |
| Graceful shutdown | No | `SIGINT` / `SIGTERM` |
| Doble bind en reconexión | No protegido | Guard automático |
| Validación de integridad | No | **Sí (v5)** |

```js
import { StorePro } from 'lidsync/examples/store.js';

const store = new StorePro({
    path: './database/store.json',
    saveIntervalMs: 20000,     // Optimizado para Termux (v5)
    maxGroupsInCache: 1000
});
```

> **Nota:** `messages` es un buffer temporal en RAM. No se persiste en disco intencionalmente para evitar sobrecarga de I/O.

---

## 🧠 Arquitectura interna

```
pluginLid(sock, { store })
│
├── LidResolver
│   ├── LidCache (LRU, TTL 24h, máx 5000 entradas)   ← v5: era 1h
│   ├── #reverseIndex (Map<LID, JID> — índice O(1))
│   ├── AutoLearn (mensajes, stickers, reacciones)    ← nuevo en v5
│   └── sock.signalRepository (Baileys interno)
│
└── sock.lid
    ├── resolve()
    ├── resolveBatch()
    ├── isResolvable()
    ├── preload()
    ├── getStats()
    └── destroy()
```

**Normalización automática:** todos los JIDs que salen de LidSync están limpios de sufijos de dispositivo.

```js
// Entrada interna:  521234567890:1@s.whatsapp.net
// Salida garantizada: 521234567890@s.whatsapp.net
```

---

## ⚙️ Compatibilidad

- **Baileys:** `@whiskeysockets/baileys` `>=6.7.0`
- **Node.js:** 18 o superior
- **Entornos:** Termux, Render, Pterodactyl / Pelican

---

## 🧪 Bot de prueba

Repositorio de referencia con implementación completa:

🔗 [LidSync-CoreBot](https://github.com/Neykoor/LidSync-CoreBot)

---

## 👨‍💻 Creador

<p align="center">
  <a href="https://github.com/Neykoor">
    <img src="https://github.com/Neykoor.png" width="80" style="border-radius:50%"/>
  </a><br>
  <b>Neykoor</b><br>
  <a href="https://github.com/Neykoor">github.com/Neykoor</a>
</p>

---

## 🤝 Agradecimientos

<p align="center">
  <a href="https://github.com/WhiskeySockets/Baileys">
    <img src="https://github.com/WhiskeySockets.png" width="80" style="border-radius:50%"/>
  </a><br>
  <b>Baileys — WhiskeySockets</b><br>
  <a href="https://github.com/WhiskeySockets/Baileys">github.com/WhiskeySockets/Baileys</a>
</p>

---

<p align="center">
  LidSync está diseñado para bots avanzados que trabajan con la nueva capa de privacidad de WhatsApp.<br><br>
  <b>⚡ Rápido, predecible y listo para producción</b>
</p>
