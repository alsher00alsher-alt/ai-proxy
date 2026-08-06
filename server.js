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
let connectedPhone = '';

async function startWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version, auth: state, printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "20.0.0"], syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection } = update;
        if (connection === 'open') {
            connectedPhone = sock.user?.id?.split(':')[0] || '';
            io.emit('whatsapp-connected', connectedPhone);
            console.log('✅ WhatsApp Connected:', connectedPhone);
        }
    });

    // قراءة الرسايل
    sock.ev.on('messages.upsert', (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;
        
        const from = msg.key.remoteJid.split('@')[0];
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '📎';
        const type = msg.key.fromMe ? 'out' : 'in';

        io.emit('chat-message', {
            from, text, type,
            time: new Date().toISOString(),
            jid: msg.key.remoteJid
        });
    });
}

io.on('connection', (socket) => {
    console.log('👤 Web:', socket.id);

    // طلب كود الربط
    socket.on('request-pairing', async (phone) => {
        try {
            if (!sock) await startWhatsApp();
            const code = await sock.requestPairingCode(phone.replace(/\D/g, ''));
            socket.emit('pairing-code', code.match(/.{1,4}/g).join('-'));
            console.log('🔑 Code:', code);
        } catch(e) {
            socket.emit('error', 'فشل طلب الكود: ' + e.message);
        }
    });

    // إرسال سبام
    socket.on('send-spam', async (data) => {
        const { target, message, count } = data;
        const jid = target.includes('@s.whatsapp.net') ? target : target + '@s.whatsapp.net';
        
        for (let i = 0; i < count; i++) {
            try {
                await sock.sendMessage(jid, { text: message });
                socket.emit('spam-progress', i + 1, count);
            } catch(e) {}
            await new Promise(r => setTimeout(r, 100));
        }
        socket.emit('action-done', '✅ تم إرسال ' + count + ' رسالة');
    });

    // جلب جهات الاتصال
    socket.on('get-contacts', async () => {
        if (!sock) return;
        const contacts = await sock.contactsQuery();
        const list = contacts.map(c => ({
            jid: c.id, name: c.name || c.notify || c.id.split('@')[0],
            phone: c.id.split('@')[0]
        }));
        socket.emit('contacts-list', list);
    });

    // جلب الجروبات
    socket.on('get-groups', async () => {
        if (!sock) return;
        const groups = await sock.groupFetchAllParticipating();
        const list = Object.values(groups).map(g => g.subject);
        socket.emit('action-done', '📋 الجروبات:\n' + list.join('\n'));
    });

    // إضافة أعضاء
    socket.on('add-members', async (data) => {
        const { group, numbers } = data;
        for (const num of numbers) {
            try {
                const jid = num.includes('@s.whatsapp.net') ? num : num + '@s.whatsapp.net';
                await sock.groupParticipantsUpdate(group, [jid], "add");
            } catch(e) {}
        }
        socket.emit('action-done', '✅ تمت الإضافة');
    });
});

app.get('/ping', (req, res) => res.send('pong'));

startWhatsApp();
server.listen(3000, () => console.log('✅ Server on 3000'));
