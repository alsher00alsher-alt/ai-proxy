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

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false, // تم تعطيل الـ QR Code
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "20.0.0"],
        syncFullHistory: false
    });

    // طلب كود الربط برقم الهاتف إذا كان الحساب جديداً (غير مسجل دخول)
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            console.log("\n⚠️ أنت غير متصل حالياً.");
            const phoneNumber = await question('📱 أدخل رقم هاتفك (الخاص بحسابك الذي سيرسل الرسائل) بصيغة الدولة (مثال: 201012345678): ');
            
            try {
                // طلب كود الربط
                const code = await sock.requestPairingCode(phoneNumber.trim());
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
            
            runInteractivePrompt(sock);
        }
    });
}

async function runInteractivePrompt(sock) {
    try {
        const messageText = await question('💬 ارسل الرسالة التي تريدها: ');
        let rawNumber = await question('📱 ارسل الرقم المستهدف بصيغة الدولة (مثال: 201012345678): ');
        const countInput = await question('🔢 عدد الرسائل: ');

        let targetNumber = rawNumber.trim();
        if (!targetNumber.includes('@s.whatsapp.net')) {
            targetNumber = targetNumber + '@s.whatsapp.net';
        }

        const count = parseInt(countInput) || 1;

        console.log(`\n🚀 جاري إرسال ${count} رسالة إلى ${rawNumber} بسرعة فائقة...\n`);

        const startTime = Date.now();
        const promises = [];

        // إنشاء وعود إرسال الرسائل في نفس اللحظة
        for (let i = 1; i <= count; i++) {
            promises.push(
                sock.sendMessage(targetNumber, { text: messageText })
                    .then(() => console.log(`[✔] تم إرسال الرسالة (${i}/${count})`))
                    .catch(err => console.log(`[❌] فشل إرسال الرسالة (${i}): ${err.message}`))
            );
        }

        // الانتظار حتى يتم الإرسال بالكامل
        await Promise.all(promises);
        
        const endTime = Date.now();
        console.log(`\n✨ تمت عملية الإرسال بنجاح في ${(endTime - startTime) / 1000} ثانية!`);

        rl.close();
        process.exit(0);

    } catch (err) {
        console.error('❌ حدث خطأ:', err.message);
        rl.close();
        process.exit(1);
    }
}

startBot();
