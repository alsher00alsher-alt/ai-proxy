export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { action, phone, password, otp, newPass, otpAction, cookies, passAction } = req.body || {};

    if (action === 'login') {
        try {
            const r1 = await fetch('https://web.vodafone.com.eg/auth/realms/vf-realm/protocol/openid-connect/auth?client_id=website&redirect_uri=https://web.vodafone.com.eg/spa/myHome&response_mode=query&response_type=code&scope=openid&ui_locales=ar');
            const html = await r1.text();
            const ck = r1.headers.get('set-cookie') || '';
            const m = html.match(/action="([^"]+)"/);
            const url = m ? m[1].replace(/&amp;/g, '&') : '';
            if (!url) return res.json({ ok: false, msg: 'فشل الاتصال' });
            
            const r2 = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': ck },
                body: new URLSearchParams({ username: phone, password }).toString(),
                redirect: 'manual'
            });
            
            if (r2.status === 302 || r2.status === 303) {
                const loc = r2.headers.get('Location') || '';
                if (loc.includes('myHome') || loc.includes('code=')) {
                    return res.json({ ok: true, msg: 'ناجح' });
                }
            }
            return res.json({ ok: false, msg: 'رقم الهاتف أو كلمة المرور غير صحيحة' });
        } catch(e) { return res.json({ ok: false, msg: 'خطأ' }); }
    }

    if (action === 'sendCode') {
        try {
            const r1 = await fetch('https://web.vodafone.com.eg/auth/realms/vf-realm/login-actions/reset-credentials?client_id=website');
            const html = await r1.text();
            const ck = r1.headers.get('set-cookie') || '';
            const m = html.match(/action="([^"]+)"/);
            const url = m ? m[1].replace(/&amp;/g, '&') : '';
            if (!url) return res.json({ ok: false, msg: 'فشل' });
            
            const r2 = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': ck },
                body: new URLSearchParams({ username: phone }).toString(),
                redirect: 'manual'
            });
            
            const html2 = await r2.text();
            const ck2 = r2.headers.get('set-cookie') || ck;
            if (html2.includes('smsCode')) {
                const m2 = html2.match(/action="([^"]+)"/);
                const otpUrl = m2 ? m2[1].replace(/&amp;/g, '&') : url;
                return res.json({ ok: true, msg: 'تم إرسال الكود', otpAction: otpUrl, cookies: ck2 });
            }
            return res.json({ ok: false, msg: 'رقم غير مسجل' });
        } catch(e) { return res.json({ ok: false, msg: 'خطأ' }); }
    }

    if (action === 'verifyCode') {
        try {
            const r3 = await fetch(otpAction, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookies },
                body: new URLSearchParams({ username: phone, smsCode: otp }).toString(),
                redirect: 'manual'
            });
            const html3 = await r3.text();
            const ck3 = r3.headers.get('set-cookie') || cookies;
            if (html3.includes('رمز التحقق غير صحيح')) return res.json({ ok: false, msg: 'كود غير صحيح' });
            if (html3.includes('password-new')) {
                const m3 = html3.match(/action="([^"]+)"/);
                const passUrl = m3 ? m3[1].replace(/&amp;/g, '&') : otpAction;
                return res.json({ ok: true, msg: 'الكود صحيح', passAction: passUrl, cookies: ck3 });
            }
            return res.json({ ok: false, msg: 'فشل' });
        } catch(e) { return res.json({ ok: false, msg: 'خطأ' }); }
    }

    if (action === 'changePass') {
        try {
            const r4 = await fetch(passAction, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookies },
                body: new URLSearchParams({ username: phone, 'password-new': newPass, 'password-confirm': newPass }).toString(),
                redirect: 'manual'
            });
            if (r4.status === 200 || r4.status === 302) return res.json({ ok: true, msg: 'تم تغيير كلمة المرور!' });
            return res.json({ ok: false, msg: 'فشل' });
        } catch(e) { return res.json({ ok: false, msg: 'خطأ' }); }
    }

    return res.json({ ok: false, msg: 'خطأ' });
}
