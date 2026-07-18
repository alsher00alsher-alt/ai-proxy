export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { action, phone, password, otp, newPass } = req.body || {};
    
    // نستخدم global store للجلسات
    if (!global.sessions) global.sessions = {};

    const H = {
        'User-Agent': "vodafoneandroid",
        'X-Requested-With': "com.emeint.android.myservices",
        'Accept': "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        'Content-Type': "application/x-www-form-urlencoded"
    };

    // دالة مساعدة للـ fetch مع cookies
    async function fetchWithCookies(url, options = {}) {
        const phoneKey = phone || 'default';
        const cookieStr = global.sessions[phoneKey] || '';
        const res = await fetch(url, {
            ...options,
            headers: { ...H, ...(options.headers || {}), 'Cookie': cookieStr }
        });
        const setCookie = res.headers.get('set-cookie');
        if (setCookie) {
            global.sessions[phoneKey] = mergeCookies(cookieStr, setCookie);
        }
        return res;
    }

    function mergeCookies(oldCookies, newCookies) {
        const cookies = {};
        oldCookies.split(';').forEach(c => {
            const [k, v] = c.trim().split('=');
            if (k && v) cookies[k] = v;
        });
        newCookies.split(',').forEach(c => {
            const [k, v] = c.trim().split(';')[0].split('=');
            if (k && v) cookies[k] = v;
        });
        return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
    }

    if (action === 'login') {
        try {
            const r1 = await fetchWithCookies('https://web.vodafone.com.eg/auth/realms/vf-realm/protocol/openid-connect/auth?client_id=ana-vodafone-app&redirect_uri=https://web.vodafone.com.eg/spa/myHome&response_mode=query&response_type=code&scope=openid&ui_locales=ar');
            const html = await r1.text();
            const m = html.match(/action="([^"]+)"/);
            const url = m ? m[1].replace(/&amp;/g, '&') : '';
            if (!url) return res.json({ ok: false, msg: 'فشل تحميل الصفحة' });
            
            const r2 = await fetchWithCookies(url, { method: 'POST', body: new URLSearchParams({ username: phone, password }).toString(), redirect: 'manual' });
            
            if (r2.status === 302 || r2.status === 303) {
                const loc = r2.headers.get('Location') || '';
                if (loc.includes('myHome') || loc.includes('code=')) return res.json({ ok: true, msg: 'تم تسجيل الدخول بنجاح' });
            }
            return res.json({ ok: false, msg: 'رقم الهاتف أو كلمة المرور غير صحيحة' });
        } catch(e) { return res.json({ ok: false, msg: 'خطأ' }); }
    }

    if (action === 'sendCode') {
        try {
            const r1 = await fetchWithCookies('https://web.vodafone.com.eg/auth/realms/vf-realm/login-actions/reset-credentials?client_id=ana-vodafone-app');
            const html = await r1.text();
            const m = html.match(/action="([^"]+)"/);
            const url = m ? m[1].replace(/&amp;/g, '&') : '';
            if (!url) return res.json({ ok: false, msg: 'فشل تحميل الصفحة' });
            
            const r2 = await fetchWithCookies(url, { method: 'POST', body: new URLSearchParams({ username: phone }).toString(), redirect: 'manual' });
            const html2 = await r2.text();
            
            if (html2.includes('smsCode')) {
                const m2 = html2.match(/action="([^"]+)"/);
                const otpUrl = m2 ? m2[1].replace(/&amp;/g, '&') : url;
                // تخزين otpAction في الجلسة
                if (!global.otpActions) global.otpActions = {};
                global.otpActions[phone] = otpUrl;
                return res.json({ ok: true, msg: 'تم إرسال كود التحقق' });
            }
            return res.json({ ok: false, msg: 'رقم الهاتف غير مسجل' });
        } catch(e) { return res.json({ ok: false, msg: 'خطأ' }); }
    }

    if (action === 'verifyCode') {
        try {
            const otpUrl = global.otpActions?.[phone];
            if (!otpUrl) return res.json({ ok: false, msg: 'انتهت الجلسة - اطلب كود جديد' });
            
            const r3 = await fetchWithCookies(otpUrl, { method: 'POST', body: new URLSearchParams({ username: phone, smsCode: otp }).toString(), redirect: 'manual' });
            const html3 = await r3.text();
            
            if (html3.includes('password-new')) {
                const m3 = html3.match(/action="([^"]+)"/);
                const passUrl = m3 ? m3[1].replace(/&amp;/g, '&') : otpUrl;
                if (!global.passActions) global.passActions = {};
                global.passActions[phone] = passUrl;
                return res.json({ ok: true, msg: 'الكود صحيح' });
            }
            
            return res.json({ ok: false, msg: 'رمز التحقق غير صحيح' });
        } catch(e) { return res.json({ ok: false, msg: 'خطأ' }); }
    }

    if (action === 'changePass') {
        try {
            const passUrl = global.passActions?.[phone];
            if (!passUrl) return res.json({ ok: false, msg: 'انتهت الجلسة' });
            
            const r4 = await fetchWithCookies(passUrl, { method: 'POST', body: new URLSearchParams({ username: phone, 'password-new': newPass, 'password-confirm': newPass }).toString(), redirect: 'manual' });
            return res.json({ ok: true, msg: 'تم تغيير كلمة المرور بنجاح!' });
        } catch(e) { return res.json({ ok: false, msg: 'خطأ' }); }
    }

    return res.json({ ok: false, msg: 'خطأ' });
}
