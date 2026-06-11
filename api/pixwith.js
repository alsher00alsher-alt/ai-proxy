const axios = require('axios');
const crypto = require('crypto');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
        const { image_url, prompt, model_id } = req.body;
        
        // إنشاء session token
        const sessionToken = crypto.randomBytes(16).toString('hex') + '0';
        
        const headers = {
            'authority': 'api.pixwith.ai',
            'accept': '*/*',
            'origin': 'https://pixwith.ai',
            'referer': 'https://pixwith.ai/',
            'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
            'x-session-token': sessionToken,
            'content-type': 'application/json'
        };

        // خطوة 1: تحميل الصورة من الرابط
        const imgResponse = await axios.get(image_url, { responseType: 'arraybuffer', timeout: 30000 });
        const imageData = Buffer.from(imgResponse.data);
        const filename = `img_${Date.now()}.jpg`;

        // خطوة 2: الحصول على Upload URL
        const preUrlRes = await axios.post('https://api.pixwith.ai/api/chats/pre_url', 
            { image_name: filename, content_type: 'image/jpeg' }, 
            { headers, timeout: 15000 }
        );

        const uploadData = preUrlRes.data.data || preUrlRes.data;
        const uploadUrl = uploadData.url;
        const fields = uploadData.fields || {};

        // خطوة 3: رفع الصورة إلى S3
        const formData = new FormData();
        Object.entries(fields).forEach(([key, value]) => {
            formData.append(key, String(value));
        });
        formData.append('file', new Blob([imageData], { type: 'image/jpeg' }), filename);

        const uploadRes = await axios.post(uploadUrl, formData, {
            headers: { 'origin': 'https://pixwith.ai' },
            timeout: 60000
        });

        const imageKey = fields.key;
        if (!imageKey) return res.json({ error: 'فشل رفع الصورة' });

        // خطوة 4: إنشاء الفيديو
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

        if (createRes.data.code === 0 || createRes.data.code === 1) {
            // انتظار النتيجة
            let videoUrl = null;
            for (let i = 0; i < 30; i++) {
                await new Promise(r => setTimeout(r, 10000));
                
                const historyRes = await axios.post('https://api.pixwith.ai/api/items/history',
                    { tool_type: '3', tag: '', page: 0, page_size: 12 },
                    { headers, timeout: 15000 }
                );

                const items = historyRes.data?.data?.items || [];
                if (items.length > 0) {
                    const latest = items[0];
                    if (latest.status === 2) {
                        const result = latest.result_urls?.find(r => !r.is_input);
                        if (result) {
                            videoUrl = result.hd || result.url;
                            break;
                        }
                    } else if (latest.status === 3) {
                        return res.json({ error: 'فشل إنشاء الفيديو' });
                    }
                }
            }

            if (videoUrl) {
                return res.json({ success: true, video_url: videoUrl });
            } else {
                return res.json({ error: 'انتهت مهلة الانتظار' });
            }
        } else {
            return res.json({ error: 'فشل إنشاء الفيديو' });
        }

    } catch (error) {
        return res.json({ error: error.message });
    }
};
