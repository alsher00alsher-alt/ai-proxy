const express = require('express');
const { exec } = require('child_process');
const app = express();
const cors = require('cors');
const fs = require('fs');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.post('/build', (req, res) => {
    const { app_name, package_name, html_content } = req.body;
    if (!app_name || !html_content) {
        return res.status(400).json({ status: 'error', message: 'اسم التطبيق والمحتوى مطلوبان' });
    }
    
    const safeName = (package_name || 'com.app.' + app_name.toLowerCase()).replace(/[^a-z0-9.]/g, '');
    const appDir = `/app/apps/${safeName}`;
    
    try {
        fs.mkdirSync(`${appDir}/assets`, { recursive: true });
        fs.mkdirSync(`${appDir}/classes`, { recursive: true });
        
        const javaDir = `${appDir}/java/${safeName.replace(/\./g, '/')}`;
        fs.mkdirSync(javaDir, { recursive: true });
        
        fs.writeFileSync(`${appDir}/assets/index.html`, html_content);
        
        fs.writeFileSync(`${appDir}/AndroidManifest.xml`, `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="${safeName}">
    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="36" />
    <uses-permission android:name="android.permission.INTERNET" />
    <application android:label="${app_name}" android:usesCleartextTraffic="true" android:enableOnBackInvokedCallback="true">
        <activity android:name=".MainActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`);
        
        const javaFile = `${javaDir}/MainActivity.java`;
        fs.writeFileSync(javaFile, `package ${safeName};
import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
public class MainActivity extends Activity {
    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        WebView w = new WebView(this);
        w.getSettings().setJavaScriptEnabled(true);
        w.setWebViewClient(new WebViewClient());
        w.loadUrl("file:///android_asset/index.html");
        setContentView(w);
    }
}`);
        
        const buildCmd = `cd ${appDir} && \
        javac -source 1.8 -target 1.8 -classpath $ANDROID_HOME/platforms/android-34/android.jar -d classes ${javaFile} && \
        find classes -name "*.class" > classes.txt && \
        $ANDROID_HOME/build-tools/34.0.0/d8 --release --lib $ANDROID_HOME/platforms/android-34/android.jar --output . $(cat classes.txt) && \
        $ANDROID_HOME/build-tools/34.0.0/aapt2 link -o unaligned.apk -I $ANDROID_HOME/platforms/android-34/android.jar --manifest AndroidManifest.xml -A assets && \
        $ANDROID_HOME/build-tools/34.0.0/aapt add unaligned.apk classes.dex && \
        $ANDROID_HOME/build-tools/34.0.0/zipalign -p -f 4 unaligned.apk ${safeName}.apk && \
        keytool -genkey -v -keystore debug.keystore -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -storepass android -keypass android -dname "CN=Android Debug,O=Android,C=US" 2>/dev/null || true && \
        $ANDROID_HOME/build-tools/34.0.0/apksigner sign --ks debug.keystore --ks-pass pass:android --key-pass pass:android ${safeName}.apk`;
        
        exec(buildCmd, { timeout: 60000 }, (err, stdout, stderr) => {
            if (err) {
                return res.status(500).json({ status: 'error', message: (stderr || err.message).slice(0, 300) });
            }
            res.json({ status: 'success', app_name, download: `/download/${safeName}.apk` });
        });
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

app.get('/download/:file', (req, res) => {
    const appName = req.params.file.replace('.apk', '');
    const filePath = `/app/apps/${appName}/${req.params.file}`;
    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).json({ status: 'error', message: 'ملف غير موجود' });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
