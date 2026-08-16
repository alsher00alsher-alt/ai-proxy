export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    // هنا نجيب قائمة الملفات من Firebase
    // دي بيانات تجريبية - بعدين نربطها بـ Firebase
    res.json({
        success: true,
        device: "Infinix GT 50 Pro",
        totalFiles: 1500,
        totalSize: "4.8GB",
        files: [
            { name: "photo1.jpg", type: "image", size: "2MB", url: "https://firebasestorage.googleapis.com/v0/b/otp-5acda.firebasestorage.app/o/all%2FDCIM%2FCamera%2Fphoto1.jpg?alt=media" },
            { name: "video1.mp4", type: "video", size: "15MB", url: "" },
            { name: "doc.pdf", type: "file", size: "1MB", url: "" }
        ]
    });
}
