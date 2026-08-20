from flask import Flask, jsonify
import json
import os

app = Flask(__name__)

# نقرأ النقاط من ملف
SCORES_FILE = 'scores.json'

def read_scores():
    try:
        with open(SCORES_FILE, 'r') as f:
            return json.load(f)
    except:
        return {"ahmed.alsher0": 0, "zoor579": 0, "ahmedppl": 0}

@app.route('/score/<account>')
def get_score(account):
    scores = read_scores()
    return jsonify({"score": scores.get(account, 0)})

@app.route('/ping')
def ping():
    return "pong"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 3000)))
