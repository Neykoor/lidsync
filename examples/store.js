/**
 * 🌸 Ejemplo: Integración de LidSync con Store
 * * Este ejemplo demuestra cómo usar `pluginLid` junto con un Store (en este caso 
 * el nativo de Baileys `makeInMemoryStore`) para que el bot pueda mapear y 
 * recordar las identidades (LID -> Número real).
 */

import { makeWASocket, useMultiFileAuthState, makeInMemoryStore, jidNormalizedUser } from '@whiskeysockets/baileys';
import { pluginLid } from 'lidsync';
import pino from 'pino';

// 1. Inicializamos el Store en memoria
// El Store es vital porque guarda los contactos y mensajes, 
// permitiendo a LidSync buscar los mapeos en caché.
const store = makeInMemoryStore({ 
    logger: pino().child({ level: 'silent', stream: 'store' }) 
});

// Opcional: Guardar el store en un archivo cada 10 segundos
store.readFromFile('./baileys_store.json');
setInterval(() => {
    store.writeToFile('./baileys_store.json');
}, 10_000);

async function startExample() {
    const { state, saveCreds } = await useMultiFileAuthState('./session_example');

    let sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' })
    });

    // 🚀 2. INYECCIÓN DE LIDSYNC
    // Pasamos el objeto `store` en la configuración para que el plugin 
    // lo utilice como base de datos de aprendizaje.
    sock = pluginLid(sock, { store });

    // 3. Vinculamos el store a los eventos del socket
    store.bind(sock.ev);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection } = update;
        if (connection === 'open') {
            console.log('✅ Bot conectado y LidSync activado.');
        }
    });

    // 🔍 4. USO PRÁCTICO EN MENSAJES
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        // El remitente puede venir como un número normal o como un @lid
        let sender = msg.key.participant || msg.key.remoteJid;
        sender = jidNormalizedUser(sender);

        let realJid = sender;

        // Si LidSync está inyectado y el remitente es un LID, intentamos resolverlo
        if (sock.lid?.resolve && sender.endsWith('@lid')) {
            try {
                const resolved = await sock.lid.resolve(sender);
                if (resolved) {
                    realJid = jidNormalizedUser(resolved);
                }
            } catch (error) {
                console.error('Error resolviendo LID:', error.message);
            }
        }

        console.log('--------------------------------------------------');
        console.log(`📩 Mensaje de: ${msg.pushName || 'Desconocido'}`);
        console.log(`🆔 ID Original (LID): ${sender}`);
        console.log(`✅ ID Resuelto (Real): ${realJid}`);
        console.log(`💬 Texto: ${msg.message.conversation || msg.message.extendedTextMessage?.text || '[Multimedia]'}`);
        console.log('--------------------------------------------------');
    });
}

startExample();
