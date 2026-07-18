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

    if (!global.vfSessions) global.vfSessions = {};

    function save(phone, data) {
        global.vfSessions[phone] = { ...global.vfSessions[phone], ...data };
    }
    function get(phone) {
        return global.vfSessions[phone] || {};
    }

    if (action === 'sendPhone') {
        try {
            // فتح صفحة تسجيل الدخول
            const r1 = await fetch('https://web.vodafone.com.eg/auth/realms/vf-realm/protocol/openid-connect/auth?client_id=website&redirect_uri=https://web.vodafone.com.eg/spa/myHome&response_mode=query&response_type=code&scope=openid&ui_locales=ar', { headers: H });
            const html = await r1.text();
            const ck = r1.headers.get('set-cookie') || '';
            
            // استخراج رابط التسجيل
            const regMatch = html.match(/href="([^"]*registration[^"]*)"/);
            if (!regMatch) return res.json({ ok: false, msg: 'رابط التسجيل غير موجود' });
            
            const regUrl = 'https://web.vodafone.com.eg' + regMatch[1].replace(/&amp;/g, '&');
            
            // فتح صفحة التسجيل
            const r2 = await fetch(regUrl, { headers: { ...H, 'Cookie': ck } });
            const html2 = await r2.text();
            const ck2 = r2.headers.get('set-cookie') || ck;
            
            const fm = html2.match(/action="([^"]+)"/);
            const actionUrl = fm ? fm[1].replace(/&amp;/g, '&') : '';
            if (!actionUrl) return res.json({ ok: false, msg: 'فشل تحميل الصفحة' });
            
            // إرسال الرقم
            const r3 = await fetch(actionUrl, {
                method: 'POST',
                headers: { ...H, 'Cookie': ck2 },
                body: new URLSearchParams({ username: phone }).toString(),
                redirect: 'manual'
            });
            const html3 = await r3.text();
            const ck3 = r3.headers.get('set-cookie') || ck2;
            
            // تحقق حقيقي من الرد
            const hasError = html3.includes('موجود') || html3.includes('مسجل') || 
                           html3.includes('registered') || html3.includes('exist') ||
                           html3.includes('already');
            
            if (hasError) {
                return res.json({ ok: false, msg: 'الرقم مسجل بالفعل' });
            }
            
            if (html3.includes('smsCode')) {
                const fm2 = html3.match(/action="([^"]+)"/);
                const otpAction = fm2 ? fm2[1].replace(/&amp;/g, '&') : actionUrl;
                save(phone, { cookies: ck3, otpAction });
                return res.json({ ok: true, msg: 'تم إرسال كود التحقق', step: 'otp' });
            }
            
            if (html3.includes('password')) {
                const fm2 = html3.match(/action="([^"]+)"/);
                const passAction = fm2 ? fm2[1].replace(/&amp;/g, '&') : actionUrl;
                save(phone, { cookies: ck3, passAction });
                return res.json({ ok: true, msg: 'الرقم مقبول', step: 'password' });
            }
            
            // لو مفيش لا خطأ ولا smsCode - خلينا نعتبرها مقبولة
            return res.json({ ok: true, msg: 'تم إرسال الرقم', step: 'password' });
            
        } catch(e) {
            return res.json({ ok: false, msg: 'خطأ في الاتصال' });
        }
    }

    if (action === 'verifyOtp') {
        const session = get(phone);
        if (!session.otpAction) return res.json({ ok: false, msg: 'انتهت الجلسة' });
        
        try {
            const r4 = await fetch(session.otpAction, {
                method: 'POST',
                headers: { ...H, 'Cookie': session.cookies },
                body: new URLSearchParams({ username: phone, smsCode: otp }).toString(),
                redirect: 'manual'
            });
            const html4 = await r4.text();
            const ck4 = r4.headers.get('set-cookie') || session.cookies;
            
            // تحقق حقيقي
            const isWrong = html4.includes('OTP entered is incorrect') || 
                          html4.includes('رمز التحقق غير صحيح') || 
                          html4.includes('Invalid') ||
                          html4.includes('incorrect');
            
            if (isWrong) {
                return res.json({ ok: false, msg: 'الكود غير صحيح' });
            }
            
            const isCorrect = html4.includes('password-new') || html4.includes('password');
            
            if (isCorrect) {
                const fm = html4.match(/action="([^"]+)"/);
                const passAction = fm ? fm[1].replace(/&amp;/g, '&') : session.otpAction;
                save(phone, { cookies: ck4, passAction });
                return res.json({ ok: true, msg: 'الكود صحيح', step: 'password' });
            }
            
            return res.json({ ok: false, msg: 'فشل التحقق - حاول مرة أخرى' });
            
        } catch(e) {
            return res.json({ ok: false, msg: 'خطأ في الاتصال' });
        }
    }

    if (action === 'setPassword') {
        const session = get(phone);
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
