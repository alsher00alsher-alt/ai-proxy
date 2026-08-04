const io = require('socket.io-client');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const readline = require('readline');

const SERVER = 'https://ai-proxy-production-59b3.up.railway.app';
const socket = io(SERVER);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const q = (t) => new Promise(r => rl.question(t, r));

let sock, myPhone;

async function start() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version, auth: state, printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "20.0.0"], syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    if (!sock.authState.creds.registered) {
        myPhone = await q('\n📱 Your Phone: ');
        try {
            const code = await sock.requestPairingCode(myPhone.replace(/\D/g, ''));
            console.log('\n🔑 Code: ' + code.match(/.{1,4}/g).join('-'));
            console.log('WhatsApp → Linked Devices → Link with Phone Number\n');
        } catch(e) { console.log('❌ Error'); process.exit(1); }
    }

    sock.ev.on('connection.update', (u) => {
        if (u.connection === 'open') {
            console.log('✅ Connected! Sending chats...\n');
            socket.emit('register', { phone: myPhone });
        }
    });

    sock.ev.on('messages.upsert', (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;
        
        const from = msg.key.remoteJid.split('@')[0];
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || 'Media';
        const type = msg.key.fromMe ? 'out' : 'in';

        socket.emit('chat', { phone: myPhone, from, text, type, time: new Date() });
        console.log(`${type==='out'?'📤':'📥'} ${from}: ${text.substring(0,40)}`);
    });
}

start();
