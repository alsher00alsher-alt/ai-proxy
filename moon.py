# نفس كود التجميع بتاعك + Flask API في الآخر

import threading
from flask import Flask, jsonify

app = Flask(__name__)
scores = {"ahmed.alsher0": 0, "zoor579": 0, "ahmedppl": 0}

@app.route('/score/<account>')
def get_score(account):
    return jsonify({"score": scores.get(account, 0)})

@app.route('/ping')
def ping():
    return "pong"

# في farmer - لما يجيب score يحدث scores dictionary
# scores[username] = current_score

threading.Thread(target=lambda: app.run(host='0.0.0.0', port=3000)).start()
