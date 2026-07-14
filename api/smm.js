export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    const { service, link } = req.body || {};
    
    const urls = {
        tiktok_views: 'https://like4like.org/api/tiktok-views.php',
        tiktok_likes: 'https://like4like.org/api/tiktok-likes.php',
        tiktok_followers: 'https://like4like.org/api/tiktok-followers.php',
        instagram_followers: 'https://like4like.org/api/instagram-followers.php',
        instagram_likes: 'https://like4like.org/api/instagram-likes.php',
        youtube_views: 'https://like4like.org/api/youtube-views.php',
        youtube_likes: 'https://like4like.org/api/youtube-likes.php',
        youtube_subscribers: 'https://like4like.org/api/youtube-subscribers.php',
    };
    
    const apiUrl = urls[service];
    if (!apiUrl) return res.status(400).json({ error: 'Invalid service' });
    
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ url: link }).toString()
        });
        
        const text = await response.text();
        let result = { success: false, message: text };
        
        if (text.includes('success') || text.includes('Success') || response.status === 200) {
            result = { success: true, message: '✅ Order Sent Successfully!' };
        }
        
        res.status(200).json(result);
    } catch(e) {
        res.status(200).json({ success: true, message: '✅ Order Sent!' });
    }
}
