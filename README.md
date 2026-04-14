<p align="center">
  <img src="https://files.catbox.moe/m28b4w.gif" width="100%" />
</p>

<h1 align="center">🌸 LidSync</h1>

<p align="center">
  <b>LID → JID Identity Resolver para bots de WhatsApp con Baileys</b><br>
  <sub>Cache LRU · Store integrado · Normalización automática de JIDs</sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.1.0-blue.svg?style=flat-square"/>
  <img src="https://img.shields.io/badge/license-MIT-yellow.svg?style=flat-square"/>
  <img src="https://img.shields.io/badge/Node.js-18%2B-green.svg?style=flat-square&logo=node.js"/>
  <img src="https://img.shields.io/badge/Baileys-%3E%3D6.7.0-purple.svg?style=flat-square"/>
  <img src="https://img.shields.io/badge/status-active-success.svg?style=flat-square"/>
</p>

---

## ¿Qué es LidSync?

WhatsApp introdujo los **LIDs** (`170360431460562@lid`) como identificadores de privacidad que ocultan el número real del usuario. LidSync resuelve esos LIDs a JIDs reales (`521234567890@s.whatsapp.net`) mediante un sistema de tres capas:

```
170360431460562@lid  →  521234567890@s.whatsapp.net
```

**Jerarquía de resolución:**

| Nivel | Fuente | Velocidad |
|---|---|---|
| 1 | Cache LRU en RAM | O(1) instantáneo |
| 2 | Índice invertido (Store) | O(1) en memoria |
| 3 | Signal Repository de Baileys | Asíncrono (criptográfico) |

---

## ⚠️ Limitación importante

> **Un LID solo puede resolverse si el usuario ya interactuó con el bot o está en la agenda del número vinculado.**

Esto es una restricción de WhatsApp, no de LidSync. Cuando un usuario envía un mensaje, Baileys captura automáticamente el mapeo LID ↔ JID y LidSync lo indexa. Sin esa interacción previa, el LID es opaco por diseño.

**Consecuencia práctica:**
- ❌ Eventos de bienvenida con LID puro → no resoluble hasta primera interacción
- ✅ Mensajes, reacciones, stickers → LidSync captura y resuelve automáticamente

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

---

## 🔎 API

### `sock.lid.resolve(id)`

Resuelve un LID a su JID real. Si el input ya es un JID (`@s.whatsapp.net`), lo devuelve directamente sin consultas.

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

Devuelve estadísticas del cache LRU.

```js
const stats = sock.lid.getStats();
console.log(stats);
/*
{
    size: 142,
    maxSize: 5000,
    ttl: 3600000,
    hits: 891,
    misses: 47,
    hitRate: '94.98%',
    evictions: 0,
    expirations: 3,
    memoryEstimate: '~20.85 KB'
}
*/
```

---

### `sock.lid.destroy()`

Limpia los listeners del socket y destruye el cache interno. Debe llamarse al reconectar el socket para evitar acumulación de handlers.

```js
// En tu lógica de reconexión:
sock.lid.destroy();
sock = await reconnect();
sock = pluginLid(sock, { store });
```

---

## 💾 Store Pro (incluido)

El store oficial de Baileys (`makeInMemoryStore`) crece indefinidamente hasta agotar la RAM. LidSync incluye un store optimizado en `examples/store.js`.

**Ventajas sobre el store oficial:**

| Característica | Store oficial | Store Pro |
|---|---|---|
| Consumo de RAM | Ilimitado | Ring buffer (50 msg/chat) |
| Corrupción en crash | Posible | Escritura atómica `.tmp` |
| Guardado automático | No | Cada 10s |
| Graceful shutdown | No | `SIGINT` / `SIGTERM` |
| Doble bind en reconexión | No protegido | Guard automático |

```js
import { StorePro } from 'lidsync/examples/store.js';

const store = new StorePro({
    path: './data/store.json',    // Ruta del archivo en disco
    maxMessagesPerChat: 50,       // Ring buffer por chat (solo en RAM)
    saveIntervalMs: 10_000        // Guardado cada 10 segundos
});
```

> **Nota:** `messages` es un buffer temporal en RAM. No se persiste en disco intencionalmente para evitar sobrecarga de I/O.

---

## 🧠 Arquitectura interna

```
pluginLid(sock, { store })
│
├── LidResolver
│   ├── LidCache (LRU, TTL 1h, máx 5000 entradas)
│   ├── #reverseIndex (Map<LID, JID> — índice O(1))
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
