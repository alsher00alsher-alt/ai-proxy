const axios = require('axios');
const FormData = require('form-data');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
        const { image_url } = req.body;
        if (!image_url) return res.json({ error: 'رابط الصورة مطلوب' });

        // تحميل الصورة
        const imgRes = await axios.get(image_url, { responseType: 'arraybuffer', timeout: 30000 });
        const imageBuffer = Buffer.from(imgRes.data);

        // رفع إلى Vheer
        const form = new FormData();
        form.append('file', imageBuffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
        form.append('params', '2eYfnBtLhGE1cyYwsXjNqgT3y6LwF6W5De2QVtwDJIou9XywW/q3B83MaOQbHJnd5EkPEK96+vNfstY=');

        const uploadRes = await axios.post('https://access.vheer.com/api/Vheer/UploadByFileNew', form, {
            headers: {
                ...form.getHeaders(),
                'Origin': 'https://vheer.com',
                'Referer': 'https://vheer.com/',
                'User-Agent': 'Mozilla/5.0'
            },
            timeout: 30000
        });

        const caption = uploadRes.data?.data?.caption || '';

        if (!caption) return res.json({ error: 'فشل تحليل الصورة' });

        // ترجمة للعربي
        const translateRes = await axios.get(
            'https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=auto&tl=ar&q=' + encodeURIComponent(caption),
            { timeout: 15000 }
        );

        const translated = translateRes.data?.[0]?.map(i => i[0]).join('') || caption;

        return res.json({ success: true, description: translated, original: caption });

    } catch (error) {
        return res.json({ error: error.message });
    }
};
