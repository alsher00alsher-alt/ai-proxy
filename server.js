const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');

const app = express();
app.use(cors());
app.use(express.static('public'));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

let sock = null;
let phoneNumber = '';

async function connectWA(phone) {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version, auth: state, printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "20.0.0"], syncFullHistory: false,
        msgRetryCounterCache: new Map(), defaultQueryTimeoutMs: undefined
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection } = update;
        if (connection === 'open') {
            phoneNumber = sock.user?.id?.split(':')[0] || phone;
            io.emit('whatsapp-connected', phoneNumber);
            console.log('✅ Connected:', phoneNumber);
        }
    });

    // طلب الكود
    if (!sock.authState.creds.registered) {
        const clean = phone.replace(/\D/g, '');
        const code = await sock.requestPairingCode(clean);
        io.emit('pairing-code', code.match(/.{1,4}/g).join('-'));
        console.log('🔑 Code:', code);
    }

    // قراءة الرسايل
    sock.ev.on('messages.upsert', (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;
        const from = msg.key.remoteJid.split('@')[0];
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '📎';
        const type = msg.key.fromMe ? 'out' : 'in';
        io.emit('chat-message', { from, text, type, jid: msg.key.remoteJid, time: new Date().toISOString() });
    });
}

io.on('connection', (socket) => {
    console.log('👤 Connected:', socket.id);

    socket.on('request-pairing', async (phone) => {
        try {
            await connectWA(phone);
        } catch(e) {
            socket.emit('error', 'فشل: ' + e.message);
        }
    });

    socket.on('send-spam', async (data) => {
        if (!sock) return;
        const { target, message, count } = data;
        const jid = target.includes('@s.whatsapp.net') ? target : target + '@s.whatsapp.net';
        for (let i = 0; i < count; i++) {
            try { await sock.sendMessage(jid, { text: message }); } catch(e) {}
            await new Promise(r => setTimeout(r, 50));
        }
        socket.emit('action-done', '✅ تم إرسال ' + count + ' رسالة');
    });

    socket.on('get-contacts', async () => {
        if (!sock) return;
        const contacts = await sock.contactsQuery();
        socket.emit('contacts-list', contacts.map(c => ({
            jid: c.id, name: c.name || c.notify || c.id.split('@')[0],
            phone: c.id.split('@')[0]
        })));
    });

    socket.on('get-groups', async () => {
        if (!sock) return;
        const groups = await sock.groupFetchAllParticipating();
        socket.emit('action-done', '📋 ' + Object.values(groups).map(g => g.subject).join('\n'));
    });

    socket.on('add-members', async (data) => {
        if (!sock) return;
        for (const num of data.numbers) {
            try {
                const jid = num.includes('@s.whatsapp.net') ? num : num + '@s.whatsapp.net';
                await sock.groupParticipantsUpdate(data.group, [jid], "add");
            } catch(e) {}
        }
        socket.emit('action-done', '✅ تمت الإضافة');
    });
});

app.get('/ping', (req, res) => res.send('pong'));
server.listen(3000, () => console.log('✅ Ready'));
