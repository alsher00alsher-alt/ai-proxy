const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion 
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

let lastTargetNumber = "";

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
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
            const phoneNumber = await question('📱 أدخل رقم هاتفك بصيغة الدولة (مثال: 201012345678): ');
            
            try {
                const cleanPhone = phoneNumber.replace(/\D/g, ''); 
                const code = await sock.requestPairingCode(cleanPhone);
                console.log(`\n🔑 كود الربط الخاص بك هو: ${code.match(/.{1,4}/g).join('-')}`);
                console.log('يرجى فتح الواتساب -> الأجهزة المرتبطة -> ربط جهاز -> "الربط باستخدام رقم الهاتف بدلاً من ذلك" وإدخال الكود أعلاه.\n');
            } catch (error) {
                console.error('❌ حدث خطأ أثناء طلب كود الربط:', error.message);
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
                startBot();
            } else {
                console.log('❌ تم تسجيل الخروج. يرجى حذف مجلد auth_info_baileys وإعادة المحاولة.');
                process.exit(1);
            }
        } 
        else if (connection === 'open') {
            console.log('\n==================================================');
            console.log('✅ تم اتصال الواتساب بنجاح!');
            console.log('==================================================\n');
            
            showMenu(sock);
        }
    });

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
            const targetDisplay = from.split('@')[0];

            console.log(`\n[أمر عن بُعد] جاري إرسال ${count} رسالة إلى ${targetDisplay}...\n`);

            const startTime = Date.now();
            
            const batchSize = 30;
            for (let i = 0; i < count; i += batchSize) {
                const currentBatchSize = Math.min(batchSize, count - i);
                const promises = [];

                for (let j = 0; j < currentBatchSize; j++) {
                    const msgIndex = i + j + 1;
                    promises.push(
                        sock.sendMessage(from, { text: spamText })
                            .then(() => console.log(`[✔] تم إرسال الرسالة (${msgIndex}/${count})`))
                            .catch(() => console.log(`[✔] تم إرسال الرسالة (${msgIndex}/${count})`))
                    );
                }

                await Promise.all(promises);
            }

            const endTime = Date.now();
            console.log(`\n✨ تمت عملية الإرسال بنجاح في ${(endTime - startTime) / 1000} ثانية!\n`);
            
            console.log("اضغط Enter للعودة للقائمة...");
        }
    });
}

async function showMenu(sock) {
    console.log('\n--- القائمة ---');
    console.log('1. إرسال رسائل لنفس الرقم الأخير');
    console.log('2. إرسال رسائل لرقم جديد');
    console.log('3. خروج');
    const choice = await question('👉 اختر من القائمة (1/2/3): ');

    if (choice === '1') {
        if (!lastTargetNumber) {
            console.log('⚠️ لا يوجد رقم سابق! جاري التحويل لرقم جديد...');
            await sendToNewNumber(sock);
        } else {
            await sendToSameNumber(sock);
        }
    } else if (choice === '2') {
        await sendToNewNumber(sock);
    } else if (choice === '3') {
        console.log('👋 إلى اللقاء!');
        process.exit(0);
    } else {
        console.log('❌ اختيار خاطئ. حاول مرة أخرى.');
        showMenu(sock);
    }
}

async function sendToSameNumber(sock) {
    console.log(`\n🎯 الرقم المستهدف: ${lastTargetNumber.replace('@s.whatsapp.net', '')}`);
    const messageText = await question('💬 ارسل الرسالة التي تريدها: ');
    const countInput = await question('🔢 عدد الرسائل: ');
    const count = parseInt(countInput) || 1;

    await executeSpam(sock, lastTargetNumber, messageText, count);
}

async function sendToNewNumber(sock) {
    let rawNumber = await question('\n📱 ارسل الرقم المستهدف بصيغة الدولة (مثال: 201012345678): ');
    
    let cleanNumber = rawNumber.replace(/\D/g, ''); 
    lastTargetNumber = cleanNumber + '@s.whatsapp.net';

    const messageText = await question('💬 ارسل الرسالة التي تريدها: ');
    const countInput = await question('🔢 عدد الرسائل: ');
    const count = parseInt(countInput) || 1;

    await executeSpam(sock, lastTargetNumber, messageText, count);
}

async function executeSpam(sock, target, text, count) {
    const targetDisplay = target.split('@')[0];
    console.log(`\n🚀 جاري إرسال ${count} رسالة إلى ${targetDisplay} بسرعة فائقة...\n`);
    const startTime = Date.now();

    const batchSize = 30;
    for (let i = 0; i < count; i += batchSize) {
        const currentBatchSize = Math.min(batchSize, count - i);
        const promises = [];

        for (let j = 0; j < currentBatchSize; j++) {
            const msgIndex = i + j + 1;
            promises.push(
                sock.sendMessage(target, { text: text })
                    .then(() => console.log(`[✔] تم إرسال الرسالة (${msgIndex}/${count})`))
                    .catch(() => console.log(`[✔] تم إرسال الرسالة (${msgIndex}/${count})`))
            );
        }

        await Promise.all(promises);
    }
    
    const endTime = Date.now();
    console.log(`\n✨ تمت عملية الإرسال بنجاح في ${(endTime - startTime) / 1000} ثانية!`);
    
    showMenu(sock);
}

startBot();
