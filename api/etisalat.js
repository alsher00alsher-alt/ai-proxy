const axios = require('axios');
const xml2js = require('xml2js');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
        const { email, password } = req.body;
        const token = Buffer.from(`${email}:${password}`).toString('base64');
        const h = { 'Host': 'mab.etisalat.com.eg:11003', 'User-Agent': 'okhttp/5.0.0-alpha.11', 'Content-Type': 'text/xml; charset=UTF-8', 'applicationVersion': '2', 'applicationName': 'MAB', 'Authorization': `Basic ${token}`, 'Language': 'ar', 'APP-BuildNumber': '10650', 'APP-Version': '33.1.0', 'OS-Type': 'Android' };

        const loginXml = `<?xml version='1.0' encoding='UTF-8' standalone='yes' ?><loginRequest><deviceId></deviceId><firstLoginAttempt>false</firstLoginAttempt><modelType></modelType><osVersion></osVersion><platform>Android</platform><udid></udid></loginRequest>`;
        const loginRes = await axios.post('https://mab.etisalat.com.eg:11003/Saytar/rest/authentication/loginWithPlan', loginXml, { headers: h, timeout: 20000 });
        const parser = new xml2js.Parser({ explicitArray: false });
        const loginData = await parser.parseStringPromise(loginRes.data);
        const number = loginData.loginResponse?.dial;
        if (!number) return res.json({ error: 'فشل تسجيل الدخول' });

        const giftUrl = `https://mab.etisalat.com.eg:11003/Saytar/rest/dailyTipsWS/dailyTipsExtraGift?req=%3CdialAndLanguageRequest%3E%3CsubscriberNumber%3E${number}%3C%2FsubscriberNumber%3E%3Clanguage%3E1%3C%2Flanguage%3E%3C%2FdialAndLanguageRequest%3E`;
        const giftRes = await axios.get(giftUrl, { headers: h, timeout: 20000 });
        const giftData = await parser.parseStringPromise(giftRes.data);
        const dailyGifts = giftData.response?.dailyGifts?.dailyGift;
        if (!dailyGifts) return res.json({ error: 'لا توجد هدايا' });

        const gifts = Array.isArray(dailyGifts) ? dailyGifts : [dailyGifts];
        let activatedFound = false, result = '';

        for (const gift of gifts) {
            const redeemed = gift.redeemed?.toLowerCase() === 'true';
            const params = Array.isArray(gift.params?.param) ? gift.params.param : [gift.params?.param];
            let giftId = '', amount = '';
            params.forEach(p => { if (p.name === 'GIFT_ID') giftId = p.value; if (p.name === 'AMOUNT') amount = p.value; });

            if (redeemed) { result += `✅ ${amount} ميجا متفعلة\n`; activatedFound = true; }
            else if (activatedFound) {
                const submitXml = `<?xml version='1.0' encoding='UTF-8' standalone='yes' ?><dailyTipsSubmitRequest><operationId>REDEEM</operationId><params><param><name>GIFT_ID</name><value>${giftId}</value></param><param><name>AMOUNT</name><value>${amount}</value></param><param><name>GIFT_TYPE</name><value>DailyTip</value></param><param><name>GIFT_CATEGORY</name><value>Main</value></param></params><productId>DAILY_TIPS_GIFT</productId><subscriberNumber>${number}</subscriberNumber></dailyTipsSubmitRequest>`;
                const sr = await axios.post('https://mab.etisalat.com.eg:11003/Saytar/rest/dailyTipsWS/submitOrder', submitXml, { headers: { ...h, 'Content-Type': 'text/xml; charset=UTF-8' }, timeout: 20000 });
                const sd = await parser.parseStringPromise(sr.data);
                if (sd.response?.status?.toLowerCase() === 'true') result += `🎉 ${amount} ميجا سوشيال!`;
                else result += `❌ فشل ${amount}`;
                break;
            }
        }
        if (!result) result = 'كل الهدايا متفعلة ✅';
        return res.json({ success: true, message: result });
    } catch (e) { return res.json({ error: e.message }); }
};
