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

let sock = null;

async function startBot() {
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
            
            showMenu();
        }
    });
}

async function showMenu() {
    console.log('\n--- القائمة ---');
    console.log('1. إضافة أعضاء');
    console.log('2. تخمين وإضافة أعضاء');
    console.log('3. خروج');
    const choice = await question('👉 اختر من القائمة (1/2/3): ');

    if (choice === '1') {
        await addMembers();
    } else if (choice === '2') {
        await guessAndAdd();
    } else if (choice === '3') {
        console.log('👋 إلى اللقاء!');
        process.exit(0);
    } else {
        console.log('❌ اختيار خاطئ. حاول مرة أخرى.');
        showMenu();
    }
}

async function addMembers() {
    const groups = await sock.groupFetchAllParticipating();
    const groupList = Object.values(groups);
    
    console.log('\n👥 الجروبات:\n');
    groupList.forEach((g, i) => console.log(`${i+1}. ${g.subject}`));
    
    const num = parseInt(await question('\n👉 اختر رقم الجروب: '));
    
    if (num >= 1 && num <= groupList.length) {
        const group = groupList[num - 1];
        console.log(`\n📌 ${group.subject}\n`);
        console.log('أدخل الأرقام (سطر فارغ للانتهاء):\n');
        
        const numbers = [];
        while (true) {
            const n = await question('+ ');
            if (!n) break;
            numbers.push(n.replace(/\D/g, '') + '@s.whatsapp.net');
        }
        
        if (numbers.length > 0) {
            console.log(`\n👥 جاري إضافة ${numbers.length} عضو...\n`);
            let added = 0, fail = 0;
            
            for (const jid of numbers) {
                try {
                    await sock.groupParticipantsUpdate(group.id, [jid], "add");
                    added++;
                    console.log(`✅ ${jid.split('@')[0]}`);
                } catch(e) {
                    fail++;
                    console.log(`❌ ${jid.split('@')[0]}`);
                }
                await new Promise(r => setTimeout(r, 300));
            }
            
            console.log(`\n✅ تم: ${added} | ❌ فشل: ${fail}\n`);
        }
    }
    
    setTimeout(() => showMenu(), 1000);
}

async function guessAndAdd() {
    const groups = await sock.groupFetchAllParticipating();
    const groupList = Object.values(groups);
    
    console.log('\n👥 الجروبات:\n');
    groupList.forEach((g, i) => console.log(`${i+1}. ${g.subject}`));
    
    const num = parseInt(await question('\n👉 اختر رقم الجروب: '));
    
    if (num >= 1 && num <= groupList.length) {
        const group = groupList[num - 1];
        console.log(`\n📌 ${group.subject}\n`);
        
        console.log('اختر الدولة:');
        console.log('1. مصر 🇪🇬');
        console.log('2. السعودية 🇸🇦');
        console.log('3. الاتنين 🇪🇬+🇸🇦\n');
        
        const country = await question('👉 اختر: ');
        
        let prefixes = [];
        if (country === '1') prefixes = ['20'];
        else if (country === '2') prefixes = ['966'];
        else if (country === '3') prefixes = ['20', '966'];
        else return;
        
        const target = parseInt(await question('🔢 كم عضو عايز تضيف: '));
        
        console.log(`\n🎲 جاري تخمين ${target} رقم...\n`);
        
        let added = 0, invalid = 0, tried = 0;
        const start = Date.now();
        
        const timer = setInterval(() => {
            const elapsed = ((Date.now() - start) / 1000).toFixed(0);
            process.stdout.write(`\r⏱ ${elapsed}s | ✅${added}/${target} | ❌${invalid} | 🎲${tried}`);
        }, 200);
        
        while (added < target) {
            const batch = generateNumbers(prefixes, 10);
            tried += 10;
            
            for (const jid of batch) {
                if (added >= target) break;
                
                try {
                    await sock.groupParticipantsUpdate(group.id, [jid], "add");
                    added++;
                } catch(e) {
                    invalid++;
                }
                await new Promise(r => setTimeout(r, 100));
            }
            
            if (added < target) {
                await new Promise(r => setTimeout(r, 1500));
            }
        }
        
        clearInterval(timer);
        const time = ((Date.now() - start) / 1000).toFixed(1);
        console.log(`\r✅ تم! ${added} عضو | ❌${invalid} فشل | 🎲${tried} محاولة | ⏱${time}s\n`);
    }
    
    setTimeout(() => showMenu(), 1000);
}

function generateNumbers(prefixes, count) {
    const numbers = [];
    const egyptPre = ['10', '11', '12', '15'];
    const saudiPre = ['50', '53', '54', '55', '56', '57', '58', '59'];
    
    for (let i = 0; i < count; i++) {
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const pre = prefix === '20' 
            ? egyptPre[Math.floor(Math.random() * egyptPre.length)]
            : saudiPre[Math.floor(Math.random() * saudiPre.length)];
        const random = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
        numbers.push(prefix + pre + random + '@s.whatsapp.net');
    }
    
    return numbers;
}

startBot();
