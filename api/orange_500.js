const axios = require('axios');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
        const { number, password } = req.body;

        const r1 = await axios.post('https://services.orange.eg/SignIn.svc/SignInUser', {
            appVersion: '9.0.1',
            channel: { ChannelName: 'MobinilAndMe', Password: 'ig3yh*mk5l42@oj7QAR8yF' },
            dialNumber: number, isAndroid: true, lang: 'ar', password: password
        }, { headers: { 'User-Agent': 'okhttp/4.10.0', 'Content-Type': 'application/json; charset=UTF-8' }, timeout: 20000 });

        if (r1.data.SignInUserResult?.ErrorCode !== 0) return res.json({ error: 'رقم أو باسورد غلط' });
        const at = r1.data.SignInUserResult.AccessToken;

        const r2 = await axios.post('https://services.orange.eg/APIs/Profile/api/BasicAuthentication/Generate', {
            ChannelName: 'MobinilAndMe', ChannelPassword: 'ig3yh*mk5l42@oj7QAR8yF',
            Dial: number, Language: 'ar', Module: '0', Password: password
        }, { headers: { 'User-Agent': 'okhttp/4.12.0', 'AppVersion': '9.6.0', 'OsVersion': '12', 'IsAndroid': 'true', 'IsEasyLogin': 'false', 'Token': at, 'Content-Type': 'application/json; charset=UTF-8' }, timeout: 20000 });

        if (r2.data.ErrorCode !== 0) return res.json({ error: 'خطأ في المصادقة' });
        const t2 = r2.data.Token;

        const r3 = await axios.post('https://services.orange.eg/APIs/Promotions/api/Postpaid5G/Redeem', {
            Dial: number, Language: 'ar', Token: t2
        }, { headers: { 'User-Agent': 'Mozilla/5.0', 'Content-Type': 'application/json', 'Origin': 'https://services.orange.eg', 'X-Requested-With': 'com.orange.mobinilandme' }, timeout: 20000 });

        if (r3.data.ErrorCode === 0 || r3.data.ErrorDescription?.includes('Success')) {
            return res.json({ success: true, message: '🎉 500 ميجا أورنج! صالحة 14 يوم.' });
        } else {
            return res.json({ error: r3.data.ErrorDescription || 'فشل التفعيل' });
        }
    } catch (e) { return res.json({ error: e.message }); }
};
