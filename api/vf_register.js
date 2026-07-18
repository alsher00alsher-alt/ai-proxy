export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { action, phone, otp, newPass } = req.body || {};

    const H = {
        'User-Agent': "vodafoneandroid",
        'X-Requested-With': "com.emeint.android.myservices",
        'Accept': "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        'Content-Type': "application/x-www-form-urlencoded"
    };

    // Store sessions
    if (!global.vfSessions) global.vfSessions = {};

    function saveSession(phone, data) {
        global.vfSessions[phone] = { ...global.vfSessions[phone], ...data };
    }
    function getSession(phone) {
        return global.vfSessions[phone] || {};
    }

    if (action === 'sendPhone') {
        try {
            // فتح صفحة تسجيل الدخول
            const r1 = await fetch('https://web.vodafone.com.eg/auth/realms/vf-realm/protocol/openid-connect/auth?client_id=website&redirect_uri=https://web.vodafone.com.eg/spa/myHome&response_mode=query&response_type=code&scope=openid&ui_locales=ar', { headers: H });
            const html = await r1.text();
            
            // استخراج رابط التسجيل
            const regMatch = html.match(/href="([^"]*registration[^"]*)"/);
            if (!regMatch) return res.json({ ok: false, msg: 'رابط التسجيل غير موجود' });
            
            const regUrl = 'https://web.vodafone.com.eg' + regMatch[1].replace(/&amp;/g, '&');
            
            // فتح صفحة التسجيل
            const r2 = await fetch(regUrl, { headers: { ...H, 'Cookie': r1.headers.get('set-cookie') || '' } });
            const html2 = await r2.text();
            const cookies = r2.headers.get('set-cookie') || r1.headers.get('set-cookie') || '';
            
            const formMatch = html2.match(/action="([^"]+)"/);
            const actionUrl = formMatch ? formMatch[1].replace(/&amp;/g, '&') : '';
            if (!actionUrl) return res.json({ ok: false, msg: 'فشل تحميل الصفحة' });
            
            // إرسال الرقم
            const r3 = await fetch(actionUrl, {
                method: 'POST',
                headers: { ...H, 'Cookie': cookies },
                body: new URLSearchParams({ username: phone }).toString(),
                redirect: 'manual'
            });
            const html3 = await r3.text();
            const cookies3 = r3.headers.get('set-cookie') || cookies;
            
            // تحقق من الأخطاء
            if (html3.includes('موجود') || html3.includes('مسجل') || html3.includes('registered')) {
                return res.json({ ok: false, msg: 'الرقم مسجل بالفعل' });
            }
            
            if (html3.includes('smsCode')) {
                const fm = html3.match(/action="([^"]+)"/);
                const otpAction = fm ? fm[1].replace(/&amp;/g, '&') : actionUrl;
                saveSession(phone, { cookies: cookies3, otpAction });
                return res.json({ ok: true, msg: 'تم إرسال كود التحقق', step: 'otp' });
            }
            
            if (html3.includes('password')) {
                const fm = html3.match(/action="([^"]+)"/);
                const passAction = fm ? fm[1].replace(/&amp;/g, '&') : actionUrl;
                saveSession(phone, { cookies: cookies3, passAction });
                return res.json({ ok: true, msg: 'الرقم مقبول', step: 'password' });
            }
            
            return res.json({ ok: false, msg: 'رد غير معروف' });
            
        } catch(e) {
            return res.json({ ok: false, msg: 'خطأ في الاتصال' });
        }
    }

    if (action === 'verifyOtp') {
        const session = getSession(phone);
        if (!session.otpAction) return res.json({ ok: false, msg: 'انتهت الجلسة' });
        
        try {
            const r4 = await fetch(session.otpAction, {
                method: 'POST',
                headers: { ...H, 'Cookie': session.cookies },
                body: new URLSearchParams({ username: phone, smsCode: otp }).toString(),
                redirect: 'manual'
            });
            const html4 = await r4.text();
            const cookies4 = r4.headers.get('set-cookie') || session.cookies;
            
            // كود غلط
            if (html4.includes('OTP entered is incorrect') || html4.includes('رمز التحقق غير صحيح') || html4.includes('Invalid')) {
                return res.json({ ok: false, msg: 'الكود غير صحيح' });
            }
            
            // كود صح
            if (html4.includes('password-new') || html4.includes('password')) {
                const fm = html4.match(/action="([^"]+)"/);
                const passAction = fm ? fm[1].replace(/&amp;/g, '&') : session.otpAction;
                saveSession(phone, { cookies: cookies4, passAction });
                return res.json({ ok: true, msg: 'الكود صحيح', step: 'password' });
            }
            
            return res.json({ ok: false, msg: 'فشل التحقق' });
            
        } catch(e) {
            return res.json({ ok: false, msg: 'خطأ في الاتصال' });
        }
    }

    if (action === 'setPassword') {
        const session = getSession(phone);
        if (!session.passAction) return res.json({ ok: false, msg: 'انتهت الجلسة' });
        
        try {
            const r5 = await fetch(session.passAction, {
                method: 'POST',
                headers: { ...H, 'Cookie': session.cookies },
                body: new URLSearchParams({ username: phone, 'password-new': newPass, 'password-confirm': newPass }).toString(),
                redirect: 'manual'
            });
            
            if (r5.status === 200 || r5.status === 302) {
                return res.json({ ok: true, msg: 'تم إنشاء الحساب بنجاح!' });
            }
            
            return res.json({ ok: false, msg: 'فشل تعيين كلمة المرور' });
            
        } catch(e) {
            return res.json({ ok: false, msg: 'خطأ في الاتصال' });
        }
    }

    return res.json({ ok: false, msg: 'خطأ' });
}
