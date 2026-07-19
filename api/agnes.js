export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { action, message, prompt, image_url, size, ratio } = req.body || {};
    const API_KEY = "sk-qm0MjEinLfiGo1dAg6jGWSOfZ43qaci19sHexM37ZZkQ0yE6";
    const BASE = "https://apihub.agnes-ai.com/v1";

    // ====== شات ======
    if (action === 'chat') {
        try {
            const r = await fetch(`${BASE}/chat/completions`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "agnes-2.0-flash",
                    messages: [{ role: "user", content: message }],
                    max_tokens: 1024
                })
            });
            const d = await r.json();
            if (d.choices && d.choices[0]) {
                return res.json({ success: true, message: d.choices[0].message.content });
            }
            return res.json({ success: false, message: d.error?.message || 'خطأ' });
        } catch(e) { return res.json({ success: false, message: 'خطأ في الاتصال' }); }
    }

    // ====== صورة ======
    if (action === 'image') {
        try {
            const r = await fetch(`${BASE}/images/generations`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "agnes-image-2.1-flash",
                    prompt: prompt,
                    size: size || "1K",
                    ratio: ratio || "1:1",
                    extra_body: { response_format: "url" }
                })
            });
            const d = await r.json();
            if (d.data && d.data[0] && d.data[0].url) {
                return res.json({ success: true, image_url: d.data[0].url });
            }
            return res.json({ success: false, message: d.error?.message || 'خطأ' });
        } catch(e) { return res.json({ success: false, message: 'خطأ في الاتصال' }); }
    }

    // ====== فيديو ======
    if (action === 'video') {
        try {
            // إنشاء المهمة
            const r = await fetch(`${BASE}/videos`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "agnes-video-v2.0",
                    prompt: prompt,
                    num_frames: 121,
                    frame_rate: 24
                })
            });
            const d = await r.json();
            if (d.video_id) {
                return res.json({ success: true, video_id: d.video_id, status: 'queued' });
            }
            return res.json({ success: false, message: d.error?.message || 'خطأ' });
        } catch(e) { return res.json({ success: false, message: 'خطأ في الاتصال' }); }
    }

    // ====== نتيجة الفيديو ======
    if (action === 'video_result') {
        try {
            const { video_id } = req.body;
            const r = await fetch(`https://apihub.agnes-ai.com/agnesapi?video_id=${video_id}`, {
                headers: { 'Authorization': `Bearer ${API_KEY}` }
            });
            const d = await r.json();
            return res.json(d);
        } catch(e) { return res.json({ success: false, message: 'خطأ في الاتصال' }); }
    }

    return res.json({ success: false, message: 'إجراء غير معروف' });
}
