export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { action, phone, password, otp, newPass } = req.body || {};

    // ====== تسجيل الدخول - تحقق حقيقي ======
    if (action === 'login') {
        try {
            // الخطوة 1: فتح صفحة تسجيل الدخول
            const r1 = await fetch('https://web.vodafone.com.eg/auth/realms/vf-realm/protocol/openid-connect/auth?client_id=website&redirect_uri=https://web.vodafone.com.eg/spa/myHome&response_mode=query&response_type=code&scope=openid&ui_locales=ar');
            const html = await r1.text();
            const cookies = r1.headers.get('set-cookie') || '';
            
            // استخراج action URL
            const fm = html.match(/action="([^"]+)"/);
            const actionUrl = fm ? fm[1].replace(/&amp;/g, '&') : '';
            
            if (!actionUrl) {
                return res.json({ success: false, msg: '❌ فشل الاتصال بالموقع' });
            }
            
            // الخطوة 2: إرسال بيانات تسجيل الدخول
            const r2 = await fetch(actionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookies
                },
                body: new URLSearchParams({ username: phone, password }).toString(),
                redirect: 'manual'
            });
            
            // نجاح = Status 302 + redirect لـ myHome
            if (r2.status === 302 || r2.status === 303) {
                const loc = r2.headers.get('Location') || '';
                if (loc.includes('myHome') || loc.includes('code=')) {
                    return res.json({ success: true, msg: '✅ تسجيل الدخول ناجح!' });
                }
            }
            
            // فشل = Status 200 + بقينا في نفس الصفحة
            if (r2.status === 200) {
                return res.json({ success: false, msg: '❌ رقم الهاتف أو كلمة المرور غير صحيحة' });
            }
            
            return res.json({ success: false, msg: '❌ بيانات غير صحيحة' });
            
        } catch(e) {
            return res.json({ success: false, msg: '❌ خطأ في الاتصال' });
        }
    }

    // ====== نسيت كلمة المرور ======
    if (action === 'resetSendCode') {
        try {
            const r1 = await fetch('https://web.vodafone.com.eg/auth/realms/vf-realm/login-actions/reset-credentials?client_id=website');
            const html = await r1.text();
            const cookies = r1.headers.get('set-cookie') || '';
            
            const fm = html.match(/action="([^"]+)"/);
            const actionUrl = fm ? fm[1].replace(/&amp;/g, '&') : '';
            
            if (!actionUrl) {
                return res.json({ success: false, msg: '❌ فشل تحميل الصفحة' });
            }
            
            const r2 = await fetch(actionUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookies },
                body: new URLSearchParams({ username: phone }).toString(),
                redirect: 'manual'
            });
            
            const html2 = await r2.text();
            const cookies2 = r2.headers.get('set-cookie') || cookies;
            
            if (html2.includes('smsCode')) {
                const fm2 = html2.match(/action="([^"]+)"/);
                const otpAction = fm2 ? fm2[1].replace(/&amp;/g, '&') : actionUrl;
                
                return res.json({ success: true, msg: '✅ تم إرسال كود التحقق', otpAction, cookies: cookies2 });
            }
            
            return res.json({ success: false, msg: '❌ رقم غير مسجل' });
            
        } catch(e) {
            return res.json({ success: false, msg: '❌ خطأ في الاتصال' });
        }
    }

    if (action === 'resetVerifyCode') {
        const { otpAction, cookies } = req.body;
        try {
            const r3 = await fetch(otpAction, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookies },
                body: new URLSearchParams({ username: phone, smsCode: otp }).toString(),
                redirect: 'manual'
            });
            
            const html3 = await r3.text();
            const cookies3 = r3.headers.get('set-cookie') || cookies;
            
            if (html3.includes('رمز التحقق غير صحيح') || html3.includes('Invalid')) {
                return res.json({ success: false, msg: '❌ كود غير صحيح' });
            }
            
            if (html3.includes('password-new')) {
                const fm3 = html3.match(/action="([^"]+)"/);
                const passAction = fm3 ? fm3[1].replace(/&amp;/g, '&') : otpAction;
                return res.json({ success: true, msg: '✅ الكود صحيح', passAction, cookies: cookies3 });
            }
            
            return res.json({ success: false, msg: '❌ فشل التحقق' });
            
        } catch(e) {
            return res.json({ success: false, msg: '❌ خطأ في الاتصال' });
        }
    }

    if (action === 'resetChangePass') {
        const { passAction, cookies } = req.body;
        try {
            const r4 = await fetch(passAction, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookies },
                body: new URLSearchParams({ username: phone, 'password-new': newPass, 'password-confirm': newPass }).toString(),
                redirect: 'manual'
            });
            
            if (r4.status === 200 || r4.status === 302) {
                return res.json({ success: true, msg: '✅ تم تغيير كلمة المرور بنجاح!' });
            }
            
            return res.json({ success: false, msg: '❌ فشل تغيير كلمة المرور' });
            
        } catch(e) {
            return res.json({ success: false, msg: '❌ خطأ في الاتصال' });
        }
    }

    res.json({ success: false, msg: '❌ إجراء غير معروف' });
}
