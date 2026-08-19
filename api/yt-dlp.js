import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import fs from 'fs';

const execAsync = promisify(exec);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    const { url, mode } = req.body;
    if (!url) return res.json({ success: false, error: 'الرابط مطلوب' });
    
    try {
        const tmpDir = os.tmpdir();
        const outputPath = `${tmpDir}/download_${Date.now()}`;
        const format = mode === 'mp3' ? 'mp3' : 'mp4';
        
        let cmd = `yt-dlp -P ${tmpDir} -o "${outputPath}.%(ext)s"`;
        
        if (mode === 'mp3') {
            cmd += ` -x --audio-format mp3 --embed-thumbnail --add-metadata "${url}"`;
        } else {
            cmd += ` -f bestvideo+bestaudio/best --merge-output-format mp4 "${url}"`;
        }
        
        const { stdout, stderr } = await execAsync(cmd, { timeout: 120000 });
        
        // البحث عن الملف
        const files = fs.readdirSync(tmpDir).filter(f => f.includes('download_'));
        if (files.length === 0) return res.json({ success: false, error: 'فشل التحميل' });
        
        const filePath = `${tmpDir}/${files[0]}`;
        const fileName = files[0].replace(/^download_\d+\./, '');
        
        // قراءة الملف
        const fileData = fs.readFileSync(filePath);
        
        res.setHeader('Content-Type', mode === 'mp3' ? 'audio/mpeg' : 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(fileData);
        
        // تنظيف
        fs.unlinkSync(filePath);
        
    } catch(e) {
        res.json({ success: false, error: 'الخدمة مش متاحة على Vercel - استخدم السكربت محلياً' });
    }
}
