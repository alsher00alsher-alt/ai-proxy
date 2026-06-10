const axios = require('axios');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
        const { number, step, otp, newPassword } = req.body;
        
        // إنشاء session مع cookie jar
        const session = axios.create({
            headers: {
                'User-Agent': 'vodafoneandroid',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            withCredentials: true,
            maxRedirects: 5
        });

        const initUrl = 'https://web.vodafone.com.eg/auth/realms/vf-realm/login-actions/reset-credentials?client_id=ana-vodafone-app';

        // خطوة 1: طلب OTP
        if (step === 1 || !step) {
            const r1 = await session.get(initUrl, { timeout: 20000 });
            
            const actionMatch = r1.data.match(/action="([^"]+)"/);
            if (!actionMatch) return res.json({ error: 'فشل تحميل الصفحة' });
            
            const actionUrl = actionMatch[1].replace(/&amp;/g, '&');
            
            const r2 = await session.post(actionUrl, new URLSearchParams({ username: number }), { timeout: 20000 });
            
            if (r2.status === 200) {
                return res.json({ success: true, message: '✅ تم إرسال كود OTP إلى هاتفك', step: 2 });
            } else {
                return res.json({ error: 'فشل إرسال OTP' });
            }
        }

        // خطوة 2: تغيير كلمة السر
        if (step === 2) {
            if (!otp || !newPassword) {
                return res.json({ error: 'مطلوب OTP وكلمة سر جديدة' });
            }

            // إعادة إنشاء session
            const r1 = await session.get(initUrl, { timeout: 20000 });
            const actionMatch1 = r1.data.match(/action="([^"]+)"/);
            if (!actionMatch1) return res.json({ error: 'فشل تحميل الصفحة' });
            const actionUrl1 = actionMatch1[1].replace(/&amp;/g, '&');

            await session.post(actionUrl1, new URLSearchParams({ username: number }), { timeout: 20000 });

            // إرسال OTP
            const otpRes = await session.post(actionUrl1, new URLSearchParams({ username: number, smsCode: otp }), { timeout: 20000 });

            if (otpRes.data.includes('smsCode') || otpRes.data.includes('Invalid') || otpRes.data.includes('error')) {
                return res.json({ error: '❌ الكود غير صحيح' });
            }

            // استخراج action النهائي
            const actionMatch2 = otpRes.data.match(/action="([^"]+)"/);
            if (!actionMatch2) return res.json({ error: 'فشل في صفحة كلمة المرور' });
            const finalUrl = actionMatch2[1].replace(/&amp;/g, '&');

            await session.post(finalUrl, new URLSearchParams({
                username: number,
                'password-new': newPassword,
                'password-confirm': newPassword
            }), { timeout: 20000 });

            return res.json({ success: true, message: '🎉 تم تغيير كلمة مرور فودافون بنجاح!' });
        }

        return res.json({ error: 'خطوة غير معروفة' });

    } catch (error) {
        const msg = error.response?.data 
            ? error.response.data.substring(0, 300) 
            : error.message;
        return res.json({ error: msg });
    }
};
