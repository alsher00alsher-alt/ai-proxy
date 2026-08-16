const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion 
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const WebSocket = require('ws');
const http = require('http');

// إنشاء HTTP Server + WebSocket
const server = http.createServer();
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 3000;

let sock = null;
let isConnected = false;
let lastTargetNumber = "";

console.log('🚀 WebSocket Server شغال على المنفذ ' + PORT);

// استقبال أوامر من الـ HTML
wss.on('connection', (ws) => {
    console.log('✅ تم اتصال WebSocket جديد');
    
    ws.on('message', async (data) => {
        const command = JSON.parse(data);
        
        if (command.type === 'spam') {
            const { phone, message, count } = command;
            const target = phone + '@s.whatsapp.net';
            
            ws.send(JSON.stringify({
                type: 'log',
                message: `🚀 جاري إرسال ${count} رسالة إلى ${phone}...`
            }));
            
            const startTime = Date.now();
            const batchSize = 30;
            
            for (let i = 0; i < count; i += batchSize) {
                const currentBatchSize = Math.min(batchSize, count - i);
                const promises = [];
                
                for (let j = 0; j < currentBatchSize; j++) {
                    const msgIndex = i + j + 1;
                    promises.push(
                        sock.sendMessage(target, { text: message })
                            .then(() => {
                                ws.send(JSON.stringify({
                                    type: 'progress',
                                    sent: msgIndex,
                                    total: count
                                }));
                            })
                            .catch(() => {
                                ws.send(JSON.stringify({
                                    type: 'progress',
                                    sent: msgIndex,
                                    total: count
                                }));
                            })
                    );
                }
                
                await Promise.all(promises);
            }
            
            const endTime = Date.now();
            ws.send(JSON.stringify({
                type: 'done',
                message: `✨ تم إرسال ${count} رسالة في ${(endTime - startTime) / 1000} ثانية!`
            }));
        }
        
        if (command.type === 'status') {
            ws.send(JSON.stringify({
                type: 'status',
                connected: isConnected,
                lastNumber: lastTargetNumber.replace('@s.whatsapp.net', '')
            }));
        }
    });
    
    ws.on('close', () => {
        console.log('❌ تم قطع اتصال WebSocket');
    });
});

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "20.0.0"],
        syncFullHistory: false
    });

    if (!sock.authState.creds.registered) {
        console.log("\n⚠️ أنت غير متصل حالياً.");
        console.log('📱 افتح واتساب -> الأجهزة المرتبطة -> ربط جهاز');
        console.log('واستخدم كود الربط اللي هيظهر في الـ HTML\n');
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            // إرسال QR لكل المتصلين
            wss.clients.forEach(client => {
                client.send(JSON.stringify({
                    type: 'qr',
                    qr: qr
                }));
            });
        }
        
        if (connection === 'close') {
            isConnected = false;
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log('🔄 جاري إعادة الاتصال...');
                startBot();
            } else {
                console.log('❌ تم تسجيل الخروج.');
            }
        } 
        else if (connection === 'open') {
            isConnected = true;
            console.log('✅ تم اتصال الواتساب بنجاح!');
            
            wss.clients.forEach(client => {
                client.send(JSON.stringify({
                    type: 'connected',
                    message: '✅ تم اتصال الواتساب بنجاح!'
                }));
            });
        }
    });

    // التحكم عن بعد من رسائل الواتساب
    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message) return;

        const from = msg.key.remoteJid;
        const isMe = msg.key.fromMe;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

        if (!text || !isMe) return;

        const commandRegex = /^(ارسل|ابعت)\s+(\d+)\s+رسالة\s+بكلمة\s+(.+)$/i;
        const match = text.match(commandRegex);

        if (match) {
            const count = parseInt(match[2]);
            const spamText = match[3].trim();
            
            console.log(`\n[أمر عن بُعد] جاري إرسال ${count} رسالة إلى ${from.split('@')[0]}...\n`);
            
            const startTime = Date.now();
            const batchSize = 30;
            
            for (let i = 0; i < count; i += batchSize) {
                const currentBatchSize = Math.min(batchSize, count - i);
                const promises = [];
                
                for (let j = 0; j < currentBatchSize; j++) {
                    promises.push(
                        sock.sendMessage(from, { text: spamText })
                            .catch(() => {})
                    );
                }
                
                await Promise.all(promises);
            }
            
            const endTime = Date.now();
            console.log(`\n✨ تمت العملية في ${(endTime - startTime) / 1000} ثانية!\n`);
        }
    });
}

// تشغيل السيرفر
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 WebSocket Server: ws://0.0.0.0:${PORT}`);
});

startBot();
