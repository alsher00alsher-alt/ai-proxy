const axios = require('axios');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
        const { number, step, otp, newPassword } = req.body;
        const baseHeaders = {
            'User-Agent': 'vodafoneandroid',
            'Content-Type': 'application/x-www-form-urlencoded'
        };

        // خطوة 1: طلب OTP
        if (step === 1 || !step) {
            const r1 = await axios.get(
                'https://web.vodafone.com.eg/auth/realms/vf-realm/login-actions/reset-credentials?client_id=ana-vodafone-app',
                { headers: baseHeaders, maxRedirects: 5, timeout: 20000 }
            );

            // استخراج action URL
            const match = r1.data.match(/action="([^"]+)"/);
            if (!match) return res.json({ error: 'فشل تحميل الصفحة' });

            const actionUrl = match[1].replace(/&amp;/g, '&');

            await axios.post(actionUrl, new URLSearchParams({ username: number }), {
                headers: baseHeaders, maxRedirects: 5, timeout: 20000
            });

            return res.json({ success: true, message: '✅ تم إرسال كود OTP إلى هاتفك', step: 2 });
        }

        // خطوة 2: تغيير كلمة السر
        if (step === 2) {
            if (!otp || !newPassword) {
                return res.json({ error: 'مطلوب OTP وكلمة سر جديدة' });
            }

            // إعادة الخطوات
            const r1 = await axios.get(
                'https://web.vodafone.com.eg/auth/realms/vf-realm/login-actions/reset-credentials?client_id=ana-vodafone-app',
                { headers: baseHeaders, maxRedirects: 5, timeout: 20000 }
            );

            const match1 = r1.data.match(/action="([^"]+)"/);
            if (!match1) return res.json({ error: 'فشل تحميل الصفحة' });

            const actionUrl1 = match1[1].replace(/&amp;/g, '&');

            await axios.post(actionUrl1, new URLSearchParams({ username: number }), {
                headers: baseHeaders, maxRedirects: 5, timeout: 20000
            });

            // إرسال OTP
            const otpRes = await axios.post(actionUrl1, new URLSearchParams({ username: number, smsCode: otp }), {
                headers: baseHeaders, maxRedirects: 5, timeout: 20000
            });

            if (otpRes.data.includes('smsCode') || otpRes.data.includes('Invalid')) {
                return res.json({ error: '❌ الكود غير صحيح' });
            }

            // استخراج action النهائي
            const match2 = otpRes.data.match(/action="([^"]+)"/);
            if (!match2) return res.json({ error: 'فشل في صفحة كلمة المرور' });

            const finalUrl = match2[1].replace(/&amp;/g, '&');

            await axios.post(finalUrl, new URLSearchParams({
                username: number,
                'password-new': newPassword,
                'password-confirm': newPassword
            }), {
                headers: baseHeaders, maxRedirects: 5, timeout: 20000
            });

            return res.json({ success: true, message: '🎉 تم تغيير كلمة مرور فودافون بنجاح!' });
        }

        return res.json({ error: 'خطوة غير معروفة' });

    } catch (error) {
        const msg = error.message;
        return res.json({ error: msg });
    }
};
