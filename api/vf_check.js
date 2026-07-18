export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { action, phone, password, otp, newPass } = req.body || {};

    // ====== تسجيل الدخول ======
    if (action === 'login') {
        try {
            const response = await fetch('https://web.vodafone.com.eg/auth/realms/vf-realm/protocol/openid-connect/auth?client_id=website&redirect_uri=https://web.vodafone.com.eg/spa/myHome&response_mode=query&response_type=code&scope=openid&ui_locales=ar', {
                redirect: 'manual'
            });
            
            const html = await response.text();
            const formMatch = html.match(/action="([^"]+)"/);
            const actionUrl = formMatch ? formMatch[1].replace(/&amp;/g, '&') : '';
            
            if (!actionUrl) {
                return res.json({ success: false, msg: 'فشل تحميل الصفحة' });
            }
            
            const cookies = response.headers.get('set-cookie') || '';
            
            const loginRes = await fetch(actionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookies
                },
                body: new URLSearchParams({ username: phone, password }).toString(),
                redirect: 'manual'
            });
            
            if (loginRes.status === 302 || loginRes.status === 303) {
                const loc = loginRes.headers.get('Location') || '';
                if (loc.includes('myHome') || loc.includes('code=')) {
                    return res.json({ success: true, msg: '✅ تسجيل الدخول ناجح!' });
                }
            }
            
            return res.json({ success: false, msg: '❌ رقم الهاتف أو كلمة المرور غير صحيحة' });
            
        } catch(e) {
            return res.json({ success: false, msg: 'خطأ في الاتصال' });
        }
    }

    // ====== نسيت كلمة المرور ======
    if (action === 'resetSendCode') {
        try {
            const resetRes = await fetch('https://web.vodafone.com.eg/auth/realms/vf-realm/login-actions/reset-credentials?client_id=website', {
                redirect: 'manual'
            });
            
            const html = await resetRes.text();
            const cookies = resetRes.headers.get('set-cookie') || '';
            
            const formMatch = html.match(/action="([^"]+)"/);
            const actionUrl = formMatch ? formMatch[1].replace(/&amp;/g, '&') : '';
            
            if (!actionUrl) {
                return res.json({ success: false, msg: 'فشل تحميل الصفحة' });
            }
            
            const sendRes = await fetch(actionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookies
                },
                body: new URLSearchParams({ username: phone }).toString(),
                redirect: 'manual'
            });
            
            const html2 = await sendRes.text();
            const cookies2 = sendRes.headers.get('set-cookie') || cookies;
            
            if (html2.includes('smsCode') || html2.includes('totp')) {
                const fm = html2.match(/action="([^"]+)"/);
                const otpAction = fm ? fm[1].replace(/&amp;/g, '&') : actionUrl;
                
                return res.json({
                    success: true,
                    msg: '✅ تم إرسال كود التحقق إلى هاتفك',
                    otpAction,
                    cookies: cookies2
                });
            }
            
            return res.json({ success: false, msg: '❌ رقم الهاتف غير مسجل' });
            
        } catch(e) {
            return res.json({ success: false, msg: 'خطأ في الاتصال' });
        }
    }

    // ====== التحقق من الكود ======
    if (action === 'resetVerifyCode') {
        const { otpAction, cookies } = req.body;
        
        try {
            const verifyRes = await fetch(otpAction, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookies
                },
                body: new URLSearchParams({ username: phone, smsCode: otp }).toString(),
                redirect: 'manual'
            });
            
            const html3 = await verifyRes.text();
            const cookies3 = verifyRes.headers.get('set-cookie') || cookies;
            
            if (html3.includes('رمز التحقق غير صحيح') || html3.includes('Invalid')) {
                return res.json({ success: false, msg: '❌ رمز التحقق غير صحيح' });
            }
            
            if (html3.includes('password-new') || html3.includes('password')) {
                const fm = html3.match(/action="([^"]+)"/);
                const passAction = fm ? fm[1].replace(/&amp;/g, '&') : otpAction;
                
                return res.json({
                    success: true,
                    msg: '✅ الكود صحيح',
                    passAction,
                    cookies: cookies3
                });
            }
            
            return res.json({ success: false, msg: 'فشل التحقق من الكود' });
            
        } catch(e) {
            return res.json({ success: false, msg: 'خطأ في الاتصال' });
        }
    }

    // ====== تغيير كلمة المرور ======
    if (action === 'resetChangePass') {
        const { passAction, cookies } = req.body;
        
        try {
            const changeRes = await fetch(passAction, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookies
                },
                body: new URLSearchParams({
                    username: phone,
                    'password-new': newPass,
                    'password-confirm': newPass
                }).toString(),
                redirect: 'manual'
            });
            
            if (changeRes.status === 200 || changeRes.status === 302) {
                return res.json({ success: true, msg: '✅ تم تغيير كلمة المرور بنجاح!' });
            }
            
            return res.json({ success: false, msg: 'فشل تغيير كلمة المرور' });
            
        } catch(e) {
            return res.json({ success: false, msg: 'خطأ في الاتصال' });
        }
    }

    res.json({ success: false, msg: 'إجراء غير معروف' });
}
