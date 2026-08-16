export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    res.json({
        success: true,
        device: "Infinix GT 50 Pro",
        files: [
            {name: "photo1.jpg", type: "image", size: "2MB"},
            {name: "video1.mp4", type: "video", size: "15MB"},
            {name: "doc.pdf", type: "file", size: "1MB"}
        ]
    });
}
