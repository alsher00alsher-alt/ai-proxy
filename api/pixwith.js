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
        const token = crypto.randomBytes(16).toString('hex') + '0';

        const h = {
            'authority': 'api.pixwith.ai', 'accept': '*/*',
            'origin': 'https://pixwith.ai', 'referer': 'https://pixwith.ai/',
            'user-agent': 'Mozilla/5.0', 'x-session-token': token,
            'content-type': 'application/json'
        };

        const pre = await axios.post('https://api.pixwith.ai/api/chats/pre_url',
            { image_name: filename, content_type: 'image/jpeg' }, { headers: h, timeout: 15000 });

        const d = pre.data?.data || pre.data;
        const url = d?.url, fields = d?.fields || {};
        if (!url) return res.json({ error: 'فشل الرفع' });

        const FormData = require('form-data');
        const form = new FormData();
        Object.entries(fields).forEach(([k, v]) => form.append(k, String(v)));
        form.append('file', imageBuffer, { filename, contentType: 'image/jpeg' });

        await axios.post(url, form, { headers: { ...form.getHeaders(), origin: 'https://pixwith.ai' }, timeout: 60000 });

        const key = fields.key;
        if (!key) return res.json({ error: 'فشل المفتاح' });

        const cr = await axios.post('https://api.pixwith.ai/api/items/create', {
            images: { image1: key }, prompt: prompt || '',
            options: { prompt_optimization: true, num_outputs: 1, aspect_ratio: '16:9', resolution: '480p', duration: 4, sound: true },
            model_id: model_id || '3-38'
        }, { headers: h, timeout: 15000 });

        if (![0, 1].includes(cr.data?.code)) return res.json({ error: 'فشل الإنشاء' });

        for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 10000));
            const hr = await axios.post('https://api.pixwith.ai/api/items/history',
                { tool_type: '3', tag: '', page: 0, page_size: 12 }, { headers: h, timeout: 15000 });
            const items = hr.data?.data?.items || [];
            if (items.length > 0 && items[0].status === 2) {
                const r = items[0].result_urls?.find(x => !x.is_input);
                if (r) return res.json({ success: true, video_url: r.hd || r.url });
            }
            if (items.length > 0 && items[0].status === 3) return res.json({ error: 'فشل' });
        }
        return res.json({ error: 'مهلة' });
    } catch (e) {
        return res.json({ error: e.message });
    }
};
