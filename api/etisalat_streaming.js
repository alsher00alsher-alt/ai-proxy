const axios = require('axios');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
        const { number, password, email } = req.body;
        let num = number.startsWith('011') ? number.substring(1) : number;
        const auth = Buffer.from(`${email}:${password}`).toString('base64');

        const loginRes = await axios.post('https://mab.etisalat.com.eg:11003/Saytar/rest/authentication/loginWithPlan',
            `<?xml version='1.0' encoding='UTF-8' standalone='yes' ?><loginRequest><deviceId></deviceId><firstLoginAttempt>true</firstLoginAttempt><modelType></modelType><osVersion></osVersion><platform>Android</platform><udid></udid></loginRequest>`,
            { headers: { 'Authorization': `Basic ${auth}`, 'applicationVersion': '2', 'applicationName': 'MAB', 'Content-Type': 'text/xml; charset=UTF-8', 'Host': 'mab.etisalat.com.eg:11003', 'User-Agent': 'okhttp/5.0.0-alpha.11' }, timeout: 20000 }
        );
        if (!loginRes.data.includes('true')) return res.json({ error: 'بيانات غلط' });

        const ck = (loginRes.headers['set-cookie']?.[0] || '').split(';')[0];
        const br = loginRes.headers['auth'] || '';

        const submitRes = await axios.post('https://mab.etisalat.com.eg:11003/Saytar/rest/servicemanagement/submitOrderV2',
            `<?xml version='1.0' encoding='UTF-8' standalone='yes'?><submitOrderRequest><mabOperation></mabOperation><msisdn>${num}</msisdn><operation>REDEEM</operation><productName>DOWNLOAD_GIFT_2_STREAMING_UNITS</productName></submitOrderRequest>`,
            { headers: { 'applicationVersion': '2', 'Cookie': ck, 'auth': `Bearer ${br}`, 'Content-Type': 'text/xml; charset=UTF-8', 'Host': 'mab.etisalat.com.eg:11003', 'User-Agent': 'okhttp/5.0.0-alpha.11' }, timeout: 20000 }
        );

        if (submitRes.data.includes('true')) return res.json({ success: true, message: '🎉 وحدات ستريمنج اتصالات!' });
        return res.json({ error: 'العرض متفعل بالفعل' });
    } catch (e) { return res.json({ error: e.message }); }
};
