<p align="center">
  <img src="https://files.catbox.moe/m28b4w.gif" width="100%" />
</p>

<h1 align="center">🌸 LidSync</h1>

<p align="center">
  <b>LID → JID Identity Resolver para bots de WhatsApp con Baileys</b><br>
  <sub>Cache LRU · Store Inteligente · Auto-Aprendizaje · Normalización automática de JIDs</sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-5.0.2-blue.svg?style=flat-square"/>
  <img src="https://img.shields.io/badge/license-MIT-yellow.svg?style=flat-square"/>
  <img src="https://img.shields.io/badge/Node.js-18%2B-green.svg?style=flat-square&logo=node.js"/>
  <img src="https://img.shields.io/badge/Baileys-%3E%3D6.7.0-purple.svg?style=flat-square"/>
  <img src="https://img.shields.io/badge/status-stable-success.svg?style=flat-square"/>
</p>

---

> ## 🔧 LidSync v5.0.2 — Parche de estabilidad
>
> Esta actualización no añade características nuevas: corrige bugs de fondo que en la v5.0.0 causaban comportamientos silenciosos en producción. Métodos que existían en la API pública pero no estaban implementados, listeners que se quedaban vivos tras un `destroy()`, y un intervalo de limpieza que impedía que Node.js cerrara el proceso limpiamente.
>
> **¿Vienes de la v5.0.0?** El API es 100% compatible. Solo actualiza la dependencia y opcionalmente adopta `syncStore()`.

---

## ¿Qué es LidSync?

WhatsApp introdujo los **LIDs** (`170360431460562@lid`) como identificadores de privacidad que ocultan el número real del usuario. LidSync resuelve esos LIDs a JIDs reales (`521234567890@s.whatsapp.net`) mediante un sistema de tres capas:

```
170360431460562@lid  →  521234567890@s.whatsapp.net
```

---

## 🆕 ¿Qué se corrigió en la v5.0.2?

| Problema en v5.0.0 | Corrección en v5.0.2 |
|---|---|
| `resolveBatch` caía a loop secuencial | **Concurrencia real controlada implementada** |
| `preload()` llamaba a método inexistente | **`precargarCache()` implementado y funcional** |
| `getStats()` devolvía `{}` siempre | **Métricas reales de caché e índice** |
| `has()` no existía en `LidCache` → error en runtime | **Implementado** |
| `destroy()` dejaba el listener `messages.upsert` vivo | **Los 3 listeners se remueven correctamente** |
| Limpieza de índice se ejecutaba *después* de insertar | **Se ejecuta *antes* de insertar** |
| `.unref()` ausente → proceso zombi en Node.js | **Restaurado en el intervalo de limpieza** |
| `catch` vacíos → errores desaparecían sin traza | **`console.warn` en todos los casos** |
| `sincronizarDesdeStore()` solo era interno | **`syncStore()` expuesto en la API pública** |

---

## 🧠 Jerarquía de Resolución

LidSync utiliza una estrategia de tres capas para garantizar que el Owner y los usuarios siempre sean reconocidos:

| Nivel | Fuente | Lógica |
|---|---|---|
| **1** | **Cache Dinámico** | Persistencia de 24h con refresco automático (LRU). |
| **2** | **Índice Invertido** | Map en memoria `LID → JID`, O(1). Se promueve al caché en cada consulta. |
| **3** | **Store & Signal** | Fallback a la base de datos local y al repositorio interno de Baileys. |

---

## ⚠️ El problema de los LIDs opacos

> **Un LID solo puede resolverse si el usuario ya interactuó con el bot o está en la agenda del número vinculado.**

Esto es una restricción de WhatsApp, no de LidSync. La librería soluciona esto detectando automáticamente el JID real cuando el usuario envía:

- ❌ Eventos de bienvenida con LID puro → no resoluble hasta primera interacción
- ✅ Un mensaje de texto
- ✅ Un Sticker o Audio
- ✅ Una Reacción (Emoji)

---

## 📦 Instalación

```bash
# En tu package.json
"npm i lidsync"
```

```bash
npm install
```

---

## 🛠️ Vinculación correcta

Para que LidSync funcione es **imprescindible** que el socket, el store y los eventos estén vinculados entre sí. Esta configuración va en tu archivo principal de conexión (`connection.js` o `index.js`), justo después de inicializar el socket y antes de empezar a escuchar mensajes.

```js
import { makeWASocket, makeInMemoryStore } from "@whiskeysockets/baileys";
import { pluginLid } from "lidsync";

const store = makeInMemoryStore({});

async function connect() {
    let sock = makeWASocket({ /* tu config */ });

    // 1. Inyectar LidSync — pasar el store para que aprenda de tus contactos
    sock = pluginLid(sock, { store });

    // 2. Vincular el store a los eventos del socket
    store.bind(sock.ev);

    // 3. OPCIONAL: Si tu store carga desde un JSON, forzar sincronización
    //    una vez que la conexión ya esté abierta
    sock.ev.on('connection.update', (update) => {
        if (update.connection === 'open') {
            sock.lid.syncStore();
        }
    });

    return sock;
}
```

> **Nota:** `pluginLid` debe llamarse antes de `store.bind()` para que el resolver ya esté suscrito cuando lleguen los primeros eventos de contactos.

---

## 🚀 Inicio Rápido

```js
import { connectToWhatsApp } from './connection.js';
import { loadEvents } from './loader.js';
import { pluginLid } from 'lidsync';
import { makeInMemoryStore } from '@whiskeysockets/baileys';

const store = makeInMemoryStore({});

async function start() {
    let sock = await connectToWhatsApp();

    sock = pluginLid(sock, { store });
    store.bind(sock.ev);

    // sock.lid ya está disponible en todo el bot
    await loadEvents(sock);
}

start();
```

### Resolución en mensajes

```js
sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;

    const sender = m.key.participant || m.key.remoteJid;

    // resolve() devuelve el JID real o null si no es resoluble aún
    const realJid = await sock.lid.resolve(sender);
    console.log(`Mensaje de: ${realJid ?? sender}`);
});
```

---

## 🔎 API

### `sock.lid.resolve(id)`

Resuelve un LID a su JID real. Si el input ya es un JID (`@s.whatsapp.net`), lo devuelve directamente normalizado. Normaliza sufijos de dispositivo (`:1`, `:2`) automáticamente.

```js
const jid = await sock.lid.resolve('170360431460562@lid');
// → '521234567890@s.whatsapp.net' | null
```

**Retorna:** `string | null`
- `string` — JID limpio, sin sufijos de dispositivo (`:0`, `:1`)
- `null` — LID no resoluble (usuario sin interacción previa)

---

### `sock.lid.resolveBatch(ids, opciones?)`

Resuelve múltiples LIDs con concurrencia controlada. Los que ya están en caché se resuelven de inmediato sin consultas adicionales.

```js
const ids = ['id1@lid', 'id2@lid', 'id3@lid'];

const resultados = await sock.lid.resolveBatch(ids, { concurrency: 5 });

for (const [lid, jid] of resultados) {
    console.log(`${lid} → ${jid}`);
}
```

**Retorna:** `Map<string, string>` — solo incluye los LIDs que pudieron resolverse.

---

### `sock.lid.syncStore(forzar?)`

Sincroniza manualmente el índice desde el store. Útil cuando el store carga sus datos desde un archivo JSON después de que `pluginLid` fue inicializado.

```js
// Sincronización normal (solo si no se ha hecho antes)
sock.lid.syncStore();

// Forzar re-sincronización aunque ya se haya hecho antes
sock.lid.syncStore(true);
```

---

### `sock.lid.isResolvable(id)`

Verifica si un LID tiene mapeo conocido en el índice o caché **sin hacer consultas de red**.

```js
if (sock.lid.isResolvable('170360431460562@lid')) {
    // Resolución inmediata garantizada
    const jid = await sock.lid.resolve('170360431460562@lid');
}
```

**Retorna:** `boolean`

---

### `sock.lid.preload(pares)`

Pre-carga mapeos conocidos (por ejemplo, desde tu base de datos) al caché e índice en memoria.

```js
// Acepta Array de tuplas o Map
sock.lid.preload([
    ['123456789@lid', '521234567890@s.whatsapp.net'],
    ['987654321@lid', '521987654321@s.whatsapp.net']
]);
```

---

### `sock.lid.getStats()`

Devuelve estadísticas reales del caché LRU e índice invertido.

```js
const stats = sock.lid.getStats();
console.log(stats);
/*
{
    cache: {
        size: 1250,
        maxSize: 7500,
        hits: 4821,
        misses: 302,
        evictions: 0,
        expirations: 14,
        hitRate: "94.10%",
        memoryEstimate: "305.18 KB"
    },
    index: {
        size: 1250,
        maxSize: 50000
    },
    sincronizado: true
}
*/
```

---

### `sock.lid.destroy()`

Limpia el caché, vacía el índice y **remueve los 3 listeners** del socket. Llamar siempre antes de una reconexión para evitar listeners duplicados.

```js
// En tu lógica de reconexión:
sock.lid.destroy();
sock = await reconnect();
sock = pluginLid(sock, { store });
```

---

## 📊 Monitoreo y Limpieza

LidSync gestiona la memoria de forma automática. Verás estos mensajes en consola cuando el sistema realice mantenimiento preventivo:

```
[LidSync] Limpieza: 14 entradas caducadas eliminadas.
```

Esto ocurre automáticamente cuando el caché supera el **85% de su capacidad**. El intervalo usa `.unref()` para no impedir que Node.js cierre el proceso cuando sea necesario.

---

## ⚠️ Importante

La librería aprende de forma **pasiva**. Cuanto más tiempo esté el bot encendido y más mensajes/contactos reciba, más precisa será la base de datos de identidades. La vinculación correcta del store es lo que permite que el bot no "olvide" a los usuarios tras un reinicio.

---

## 🧠 Arquitectura interna

```
pluginLid(sock, { store })
│
├── LidResolver
│   ├── LidCache (LRU, TTL 24h, máx 7500 entradas)
│   ├── #reverseIndex (Map<LID, JID> — índice O(1), máx 50000)
│   ├── Auto-Aprendizaje (contacts.upsert, contacts.update, messages.upsert)
│   └── sock.signalRepository (Baileys interno — fallback)
│
└── sock.lid
    ├── resolve(id)
    ├── resolveBatch(ids, opts?)
    ├── syncStore(forzar?)
    ├── isResolvable(id)
    ├── preload(pares)
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
