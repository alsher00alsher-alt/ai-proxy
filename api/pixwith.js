const axios = require('axios');
const crypto = require('crypto');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
        const { image_base64, prompt, model_id } = req.body;

        if (!image_base64) return res.json({ error: 'الصورة مطلوبة' });

        const imageBuffer = Buffer.from(image_base64, 'base64');
        const filename = `img_${Date.now()}.jpg`;
        const sessionToken = crypto.randomBytes(16).toString('hex') + '0';

        const headers = {
            'authority': 'api.pixwith.ai',
            'accept': '*/*',
            'origin': 'https://pixwith.ai',
            'referer': 'https://pixwith.ai/',
            'user-agent': 'Mozilla/5.0',
            'x-session-token': sessionToken,
            'content-type': 'application/json'
        };

        // الحصول على Upload URL
        const preRes = await axios.post('https://api.pixwith.ai/api/chats/pre_url',
            { image_name: filename, content_type: 'image/jpeg' },
            { headers, timeout: 15000 }
        );

        const uploadData = preRes.data?.data || preRes.data;
        const uploadUrl = uploadData?.url;
        const fields = uploadData?.fields || {};

        if (!uploadUrl) return res.json({ error: 'فشل الحصول على رابط الرفع' });

        // رفع الصورة إلى S3
        const FormData = require('form-data');
        const form = new FormData();
        Object.entries(fields).forEach(([k, v]) => form.append(k, String(v)));
        form.append('file', imageBuffer, { filename, contentType: 'image/jpeg' });

        await axios.post(uploadUrl, form, {
            headers: { ...form.getHeaders(), origin: 'https://pixwith.ai' },
            timeout: 60000
        });

        const imageKey = fields.key;
        if (!imageKey) return res.json({ error: 'فشل رفع الصورة' });

        // إنشاء الفيديو
        const createRes = await axios.post('https://api.pixwith.ai/api/items/create',
            {
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
                model_id: model_id || '3-38'
            },
            { headers, timeout: 15000 }
        );

        if (![0, 1].includes(createRes.data?.code)) {
            return res.json({ error: 'فشل إنشاء الفيديو' });
        }

        // انتظار النتيجة
        for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 10000));

            const histRes = await axios.post('https://api.pixwith.ai/api/items/history',
                { tool_type: '3', tag: '', page: 0, page_size: 12 },
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

        return res.json({ error: 'انتهت مهلة الانتظار' });

    } catch (error) {
        return res.json({ error: error.message });
    }
};
