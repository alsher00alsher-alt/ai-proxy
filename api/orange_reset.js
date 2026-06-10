const axios = require('axios');
const crypto = require('crypto');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
        const { number, step, otp, newPassword } = req.body;
        const secret = ",{.c][o^uecnlkijh*.iomv:QzCFRcd;drof/zx}w;ls.e85T^#ASwa?=(lk";

        // خطوة 1: طلب OTP
        if (step === 1 || !step) {
            // Generate Token
            const tokenRes = await axios.post('https://services.orange.eg/GetToken.svc/GenerateToken', {
                channel: { ChannelName: 'MobinilAndMe', Password: 'ig3yh*mk5l42@oj7QAR8yF' }
            }, { headers: { 'User-Agent': 'okhttp/4.12.0', 'Content-Type': 'application/json; charset=UTF-8' }, timeout: 20000 });

            const ctv = tokenRes.data.GenerateTokenResult.Token;
            const htv = crypto.createHash('sha256').update(ctv + secret).digest('hex').toUpperCase();

            // طلب OTP
            const otpRes = await axios.post('https://services.orange.eg/ProfileService.svc/ForgotPassword', {
                channel: { ChannelName: 'MobinilAndMe', Password: 'ig3yh*mk5l42@oj7QAR8yF' },
                dialNumber: number,
                lang: 'ar'
            }, { headers: { 'User-Agent': 'okhttp/4.12.0', '_ctv': ctv, '_htv': htv, 'Content-Type': 'application/json; charset=UTF-8' }, timeout: 20000 });

            const otpData = otpRes.data;
            if (otpData.ErrorCode === 0 || otpData.ForgotPasswordResult?.ErrorCode === 0) {
                return res.json({ success: true, message: '✅ تم إرسال كود التفعيل (OTP) إلى هاتفك', ctv, htv, step: 2 });
            } else {
                return res.json({ error: otpData.ErrorDescription || 'فشل إرسال OTP' });
            }
        }

        // خطوة 2: تغيير كلمة السر
        if (step === 2) {
            if (!otp || !newPassword) {
                return res.json({ error: 'مطلوب OTP وكلمة سر جديدة' });
            }

            const tokenRes2 = await axios.post('https://services.orange.eg/GetToken.svc/GenerateToken', {
                channel: { ChannelName: 'MobinilAndMe', Password: 'ig3yh*mk5l42@oj7QAR8yF' }
            }, { headers: { 'User-Agent': 'okhttp/4.12.0', 'Content-Type': 'application/json; charset=UTF-8' }, timeout: 20000 });

            const ctv1 = tokenRes2.data.GenerateTokenResult.Token;
            const htv1 = crypto.createHash('sha256').update(ctv1 + secret).digest('hex').toUpperCase();

            const changeRes = await axios.post('https://services.orange.eg/ProfileService.svc/ChangePassword', {
                channel: { ChannelName: 'MobinilAndMe', Password: 'ig3yh*mk5l42@oj7QAR8yF' },
                dialNumber: number,
                newPassword: newPassword,
                oldPassword: otp
            }, { headers: { 'User-Agent': 'okhttp/4.12.0', '_ctv': ctv1, '_htv': htv1, 'Content-Type': 'application/json; charset=UTF-8' }, timeout: 20000 });

            const changeData = changeRes.data;
            if (changeData.ErrorCode === 0 || changeData.ChangePasswordResult?.ErrorCode === 0) {
                return res.json({ success: true, message: '🎉 تم تغيير كلمة المرور بنجاح!' });
            } else {
                return res.json({ error: changeData.ErrorDescription || 'فشل تغيير كلمة المرور. تأكد من OTP.' });
            }
        }

        return res.json({ error: 'خطوة غير معروفة' });

    } catch (error) {
        const msg = error.response?.data ? JSON.stringify(error.response.data).substring(0, 300) : error.message;
        return res.json({ error: msg });
    }
};
