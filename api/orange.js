const axios = require('axios');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
        const { number, password } = req.body;

        // خطوة 1: تسجيل الدخول
        const r1 = await axios.post('https://services.orange.eg/SignIn.svc/SignInUser', {
            appVersion: '9.0.1',
            channel: { ChannelName: 'MobinilAndMe', Password: 'ig3yh*mk5l42@oj7QAR8yF' },
            dialNumber: number,
            isAndroid: true,
            lang: 'ar',
            password: password
        }, {
            headers: {
                'User-Agent': 'okhttp/4.10.0',
                'Connection': 'Keep-Alive',
                'Accept-Encoding': 'gzip',
                'Content-Type': 'application/json; charset=UTF-8'
            },
            timeout: 20000
        });

        if (!r1.data.SignInUserResult?.AccessToken) {
            return res.json({ error: 'رقم الهاتف أو كلمة المرور غير صحيحة' });
        }

        const AccessToken = r1.data.SignInUserResult.AccessToken;

        // خطوة 2: توليد Token
        const r2 = await axios.post('https://services.orange.eg/APIs/Profile/api/BasicAuthentication/Generate', {
            ChannelName: 'MobinilAndMe',
            ChannelPassword: 'ig3yh*mk5l42@oj7QAR8yF',
            Dial: number,
            Language: 'ar',
            Module: '0',
            Password: password
        }, {
            headers: {
                'User-Agent': 'okhttp/4.10.0',
                'Connection': 'Keep-Alive',
                'Accept-Encoding': 'gzip',
                'Content-Type': 'application/json; charset=UTF-8',
                'AppVersion': '9.0.1',
                'OsVersion': '13',
                'IsAndroid': 'true',
                'IsEasyLogin': 'false',
                'Token': AccessToken
            },
            timeout: 20000
        });

        const Token = r2.data.Token;

        // خطوة 3: جلب الأسئلة
        const qHeaders = {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 13; 21061119AG Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/139.0.7258.158 Mobile Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Content-Type': 'application/json',
            'sec-ch-ua-platform': '"Android"',
            'sec-ch-ua': '"Not;A=Brand";v="99", "Android WebView";v="139", "Chromium";v="139"',
            'sec-ch-ua-mobile': '?1',
            'Origin': 'https://services.orange.eg',
            'X-Requested-With': 'com.orange.mobinilandmf',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Dest': 'empty',
            'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8'
        };

        const r3 = await axios.post('https://services.orange.eg/APIs/Ramadan2024/api/RamadanOffers/Fawazeer/Questions', {
            Dial: number,
            Language: 'ar',
            Token: Token
        }, {
            headers: qHeaders,
            timeout: 20000
        });

        const data = r3.data;

        if (data.ErrorCode === 1) {
            return res.json({ error: 'انت دخلت على الفوازير النهارده، جرب بكره' });
        }

        const questions = data.Questions;
        const answersList = [];

        for (const q of questions) {
            for (const a of q.Answers) {
                if (a.IsCorrect === true) {
                    answersList.push({
                        QuestionId: a.QuestionId,
                        AnswerId: a.Id
                    });
                    break;
                }
            }
        }

        // خطوة 4: إرسال الإجابات
        const r4 = await axios.post('https://services.orange.eg/APIs/Ramadan2024/api/RamadanOffers/Fawazeer/Submit', {
            Dial: number,
            Language: 'ar',
            Token: Token,
            Answers: answersList
        }, {
            headers: qHeaders,
            timeout: 20000
        });

        if (r4.data.ErrorDescription === 'FawazeerSuccess') {
            return res.json({ success: true, message: '🎉 تم إرسال 250 ميجا بنجاح!' });
        } else {
            return res.json({ error: r4.data.ErrorDescription || 'فشل التفعيل' });
        }

    } catch (error) {
        const msg = error.response?.data ? JSON.stringify(error.response.data).substring(0, 300) : error.message;
        return res.json({ error: msg });
    }
};
