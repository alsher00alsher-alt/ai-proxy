const axios = require('axios');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { number, password } = req.body;

        // الخطوة 1: تسجيل الدخول
        const signinUrl = 'https://services.orange.eg/SignIn.svc/SignInUser';
        const signinPayload = {
            appVersion: '9.0.1',
            channel: {
                ChannelName: 'MobinilAndMe',
                Password: 'ig3yh*mk5l42@oj7QAR8yF'
            },
            dialNumber: number,
            isAndroid: true,
            lang: 'ar',
            password: password
        };
        const signinHeaders = {
            'User-Agent': 'okhttp/4.10.0',
            'Content-Type': 'application/json'
        };

        const signinRes = await axios.post(signinUrl, signinPayload, { headers: signinHeaders });
        
        if (!signinRes.data.SignInUserResult || !signinRes.data.SignInUserResult.AccessToken) {
            return res.status(400).json({ error: 'رقم الهاتف أو كلمة المرور غير صحيحة' });
        }
        
        const accessToken = signinRes.data.SignInUserResult.AccessToken;

        // الخطوة 2: توليد التوكن
        const genUrl = 'https://services.orange.eg/APIs/Profile/api/BasicAuthentication/Generate';
        const genPayload = {
            ChannelName: 'MobinilAndMe',
            ChannelPassword: 'ig3yh*mk5l42@oj7QAR8yF',
            Dial: number,
            Language: 'ar',
            Module: '0',
            Password: password
        };
        const genHeaders = {
            'User-Agent': 'okhttp/4.10.0',
            'Content-Type': 'application/json',
            'Token': accessToken
        };

        const genRes = await axios.post(genUrl, genPayload, { headers: genHeaders });
        const token = genRes.data.Token;

        // الخطوة 3: جلب الأسئلة
        const questionsUrl = 'https://services.orange.eg/APIs/Ramadan2024/api/RamadanOffers/Fawazeer/Questions';
        const questionsPayload = {
            Dial: number,
            Language: 'ar',
            Token: token
        };
        const questionsHeaders = {
            'User-Agent': 'Mozilla/5.0',
            'Content-Type': 'application/json'
        };

        const questionsRes = await axios.post(questionsUrl, questionsPayload, { headers: questionsHeaders });
        const data = questionsRes.data;

        if (data.ErrorCode === 1) {
            return res.status(400).json({ error: 'انت دخلت على الفوازير النهارده، جرب بكره' });
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

        // الخطوة 4: إرسال الإجابات
        const submitUrl = 'https://services.orange.eg/APIs/Ramadan2024/api/RamadanOffers/Fawazeer/Submit';
        const submitPayload = {
            Dial: number,
            Language: 'ar',
            Token: token,
            Answers: answersList
        };

        const submitRes = await axios.post(submitUrl, submitPayload, { headers: questionsHeaders });
        
        if (submitRes.data.ErrorDescription === 'FawazeerSuccess') {
            return res.status(200).json({ success: true, message: '🎉 تم إرسال 250 ميجا بنجاح! استمتع.' });
        } else {
            return res.status(200).json({ success: false, message: submitRes.data.ErrorDescription });
        }

    } catch (error) {
        return res.status(500).json({ error: 'حدث خطأ: ' + error.message });
    }
};
