const axios = require('axios');
const crypto = require('crypto');
const FormData = require('form-data');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
        const { image_url, prompt } = req.body;
        if (!image_url) return res.json({ error: 'رابط الصورة مطلوب' });

        // Session
        const token = crypto.randomBytes(16).toString('hex') + '0';
        const headers = {
            'authority': 'api.pixwith.ai', 'accept': '*/*',
            'origin': 'https://pixwith.ai', 'referer': 'https://pixwith.ai/',
            'user-agent': 'Mozilla/5.0', 'x-session-token': token,
            'content-type': 'application/json'
        };

        // تحميل الصورة
        const imgRes = await axios.get(image_url, { responseType: 'arraybuffer', timeout: 30000 });
        const imageBuffer = Buffer.from(imgRes.data);
        const filename = `img_${Date.now()}.jpg`;

        // Upload URL
        const preRes = await axios.post('https://api.pixwith.ai/api/chats/pre_url',
            { image_name: filename, content_type: 'image/jpeg' },
            { headers, timeout: 15000 }
        );

        if (![0, 1].includes(preRes.data?.code)) {
            return res.json({ error: 'فشل الحصول على رابط الرفع' });
        }

        // رفع الصورة
        const s3 = preRes.data?.data?.url || preRes.data;
        const url = s3?.url;
        const fields = s3?.fields || {};
        
        if (!url) return res.json({ error: 'رابط الرفع غير صالح' });

        const form = new FormData();
        Object.entries(fields).forEach(([k, v]) => form.append(k, String(v)));
        form.append('file', imageBuffer, { filename, contentType: 'image/jpeg' });

        await axios.post(url, form, {
            headers: { ...form.getHeaders(), origin: 'https://pixwith.ai' },
            timeout: 60000
        });

        const imageKey = fields.key;
        if (!imageKey) return res.json({ error: 'فشل رفع الصورة' });

        // إنشاء الفيديو
        const createRes = await axios.post('https://api.pixwith.ai/api/items/create', {
            images: { image1: imageKey },
            prompt: prompt || '',
            options: {
                prompt_optimization: true,
                num_outputs: 1,
                aspect_ratio: '16:9',
                resolution: '480p',
                duration: 4,
                sound: true
            },
            model_id: '3-38'
        }, { headers, timeout: 15000 });

        if (![0, 1].includes(createRes.data?.code)) {
            return res.json({ error: 'فشل إنشاء الفيديو' });
        }

        // انتظار النتيجة
        for (let i = 0; i < 90; i++) {
            await new Promise(r => setTimeout(r, 10000));

            const histRes = await axios.post('https://api.pixwith.ai/api/items/history',
                { tool_type: '3', tag: '', page: 0, page_size: 1 },
                { headers, timeout: 15000 }
            );

            const items = histRes.data?.data?.items || [];
            if (items.length > 0) {
                const latest = items[0];
                if (latest.status === 2) {
                    const result = latest.result_urls?.find(r => !r.is_input);
                    if (result) {
                        return res.json({ success: true, video_url: result.hd || result.url });
                    }
                } else if (latest.status === 3) {
                    return res.json({ error: 'فشل إنشاء الفيديو' });
                }
            }
        }

        return res.json({ error: 'انتهت مهلة الانتظار (15 دقيقة)' });

    } catch (error) {
        return res.json({ error: error.message });
    }
};
