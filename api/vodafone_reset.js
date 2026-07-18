export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { action, phone, otp, newPass } = req.body || {};
    
    const session = {};
    
    try {
        if (action === 'sendCode') {
            // إرسال كود التحقق
            const resp = await fetch('https://web.vodafone.com.eg/auth/realms/vf-realm/login-actions/reset-credentials?client_id=website', {
                redirect: 'manual'
            });
            const cookies = resp.headers.get('set-cookie') || '';
            const html = await resp.text();
            
            // استخراج action URL
            const formMatch = html.match(/action="([^"]+)"/);
            const actionUrl = formMatch ? formMatch[1].replace(/&amp;/g, '&') : '';
            
            if (!actionUrl) {
                return res.json({ success: false, msg: 'فشل تحميل الصفحة' });
            }
            
            // إرسال رقم الهاتف
            const resp2 = await fetch(actionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookies
                },
                body: new URLSearchParams({ username: phone }).toString(),
                redirect: 'manual'
            });
            
            const html2 = await resp2.text();
            const cookies2 = resp2.headers.get('set-cookie') || cookies;
            
            if (html2.includes('smsCode')) {
                const formMatch2 = html2.match(/action="([^"]+)"/);
                const otpAction = formMatch2 ? formMatch2[1].replace(/&amp;/g, '&') : actionUrl;
                
                return res.json({ 
                    success: true, 
                    msg: 'تم إرسال كود التحقق',
                    otpAction,
                    cookies: cookies2
                });
            } else {
                return res.json({ success: false, msg: 'رقم غير مسجل' });
            }
        }
        
        if (action === 'verifyCode') {
            const { otpAction, cookies } = req.body;
            
            const resp3 = await fetch(otpAction, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookies
                },
                body: new URLSearchParams({ username: phone, smsCode: otp }).toString(),
                redirect: 'manual'
            });
            
            const html3 = await resp3.text();
            const cookies3 = resp3.headers.get('set-cookie') || cookies;
            
            if (html3.includes('رمز التحقق غير صحيح') || html3.includes('Invalid')) {
                return res.json({ success: false, msg: 'رمز التحقق غير صحيح' });
            }
            
            if (html3.includes('password-new') || html3.includes('password')) {
                const formMatch3 = html3.match(/action="([^"]+)"/);
                const passAction = formMatch3 ? formMatch3[1].replace(/&amp;/g, '&') : otpAction;
                
                return res.json({ 
                    success: true, 
                    msg: 'الكود صحيح',
                    passAction,
                    cookies: cookies3
                });
            }
            
            return res.json({ success: false, msg: 'فشل التحقق' });
        }
        
        if (action === 'changePass') {
            const { passAction, cookies } = req.body;
            
            const resp4 = await fetch(passAction, {
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
            
            if (resp4.status === 200) {
                return res.json({ success: true, msg: 'تم تغيير كلمة المرور بنجاح!' });
            } else {
                return res.json({ success: false, msg: 'فشل تغيير كلمة المرور' });
            }
        }
        
    } catch(e) {
        return res.json({ success: false, msg: e.message });
    }
}
