import os
import time
import requests
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/', methods=['GET'])
def home():
    return jsonify({"status": "running", "message": "Kuvu AI Proxy Server is Live!"})

@app.route('/wifi-checker', methods=['GET'])
def wifi_checker():
    return send_from_directory('public', 'wifi-checker.html')

@app.route('/api/kuvu/generate', methods=['POST'])
def generate_kuvu():
    try:
        data = request.json or {}
        prompt = data.get('prompt', '')
        mode = data.get('mode', 'video')
        aspect_ratio = data.get('aspect_ratio', '16:9')
        quality = data.get('quality', '720p')

        if not prompt:
            return jsonify({'status': 'FAILED', 'errorMessage': 'الوصف مطلوب'}), 400

        return jsonify({
            'status': 'SUCCESS',
            'url': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' if mode == 'video' else 'https://picsum.photos/800/600'
        })

    except Exception as e:
        return jsonify({'status': 'FAILED', 'errorMessage': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)
