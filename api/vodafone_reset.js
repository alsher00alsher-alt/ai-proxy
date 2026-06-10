const axios = require('axios');
const { JSDOM } = require('jsdom');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
        const { number, step, otp, newPassword } = req.body;
        const session = axios.create({
            headers: {
                'User-Agent': 'vodafoneandroid',
                'X-Requested-With': 'com.emeint.android.myservices',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            maxRedirects: 0,
            validateStatus: s => s < 400 || s === 302
        });

        // خطوة 1: طلب OTP
        if (step === 1 || !step) {
            const initUrl = 'https://web.vodafone.com.eg/auth/realms/vf-realm/login-actions/reset-credentials?client_id=ana-vodafone-app';
            const initRes = await session.get(initUrl);

            const dom = new JSDOM(initRes.data);
            const form = dom.window.document.querySelector('form');
            if (!form) return res.json({ error: 'فشل تحميل الصفحة' });

            const actionUrl = form.getAttribute('action');
            await session.post(actionUrl, new URLSearchParams({ username: number }), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            return res.json({ success: true, message: '✅ تم إرسال كود OTP إلى هاتفك', step: 2 });
        }

        // خطوة 2: تغيير كلمة السر
        if (step === 2) {
            if (!otp || !newPassword) {
                return res.json({ error: 'مطلوب OTP وكلمة سر جديدة' });
            }

            // إعادة تحميل الصفحة
            const initUrl = 'https://web.vodafone.com.eg/auth/realms/vf-realm/login-actions/reset-credentials?client_id=ana-vodafone-app';
            const initRes = await session.get(initUrl);
            const dom1 = new JSDOM(initRes.data);
            const form1 = dom1.window.document.querySelector('form');
            if (!form1) return res.json({ error: 'فشل تحميل الصفحة' });

            const actionUrl1 = form1.getAttribute('action');
            await session.post(actionUrl1, new URLSearchParams({ username: number }), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            // إرسال OTP
            const otpRes = await session.post(actionUrl1, new URLSearchParams({ username: number, smsCode: otp }), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            if (otpRes.data.includes('smsCode') || otpRes.data.includes('error')) {
                return res.json({ error: 'الكود غير صحيح' });
            }

            const dom2 = new JSDOM(otpRes.data);
            const passForm = dom2.window.document.querySelector('form');
            if (!passForm) return res.json({ error: 'فشل في صفحة كلمة المرور' });

            const finalUrl = passForm.getAttribute('action');
            await session.post(finalUrl, new URLSearchParams({
                username: number,
                'password-new': newPassword,
                'password-confirm': newPassword
            }), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            return res.json({ success: true, message: '🎉 تم تغيير كلمة مرور فودافون بنجاح!' });
        }

        return res.json({ error: 'خطوة غير معروفة' });

    } catch (error) {
        const msg = error.response?.data ? error.response.data.substring(0, 300) : error.message;
        return res.json({ error: msg });
    }
};
