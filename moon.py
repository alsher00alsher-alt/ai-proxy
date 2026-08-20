import threading
from flask import Flask, jsonify, request
import requests,hmac,hashlib,time,uuid,json,random

app = Flask(__name__)

FIREBASE_URL = "https://otp-5acda-default-rtdb.firebaseio.com"
PASSWORD = "d02d5189"
DEVINFO = '{"d":"61393235613366373261636533656632","n":"494e46494e495820496e66696e6978205836383733","o":"16","t":"d","v":"2.2.9","s":"0,0"}'
KEY = bytes([b ^ 0x43 for b in [0x35,0x30,0x1c,0x2f,0x2c,0x2c,0x28,0x31,0x35,0x30,0x1c,0x2f,0x2c,0x2c,0x28,0x31]])
OP_IDS = {"LoginAccount":"3522613813036d73817b2715e67743f8d23d7a85ad08b7e12aa3b29a24a17c43","FetchScore":"88d30eeca55c0538539ad8217dfefd52b2f47015200cdbb7cb6ea5a765381d69"}
ACCOUNTS = ["ahmed.alsher0","zoor579","ahmedppl","mmjjk","mmjjjk","mmjjjjk","aappi","aappii","aappmm","o785769","appmmm","pubg.ameeer"]
scores = {acc: 0 for acc in ACCOUNTS}
tokens = {}

def save_order(order):
    try: requests.put(f"{FIREBASE_URL}/orders/{int(time.time()*1000)}.json", json=order)
    except: pass

def load_orders():
    try:
        r = requests.get(f"{FIREBASE_URL}/orders.json")
        data = r.json()
        if data:
            orders = list(data.values())
            orders.sort(key=lambda x: x.get('time',''), reverse=True)
            return orders
    except: pass
    return []

def add_cors(res):
    res.headers['Access-Control-Allow-Origin'] = '*'
    res.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    res.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return res

def sig(ts,nonce,payload):return hmac.new(KEY,f"{ts}-{nonce}-{payload}".encode(),hashlib.sha256).hexdigest()

def gql(query,op,token=None,csrf=None):
    payload=json.dumps(query,separators=(',',':'))
    ts=str(int(time.time()*1000));nonce=str(uuid.uuid4())[:16]
    h={"X-APOLLO-OPERATION-NAME":op,"Accept":"application/json","x-language":"en","x-app-name":"com.dev.vidspark","x-device-info":DEVINFO,"x-app-sig":sig(ts,nonce,payload),"x-app-ts":ts,"x-app-nonce":nonce,"Content-Type":"application/json","User-Agent":"okhttp/4.12.0"}
    if op in OP_IDS:h["X-APOLLO-OPERATION-ID"]=OP_IDS[op]
    if token:h["token"]=token;h["x-csrf-token"]=csrf
    try:
        r=requests.post("https://api.tikspark.xyz/graphql",headers=h,data=payload,timeout=15)
        return r,r.json()
    except:return None,{"error":"conn"}

def login(u):
    q={"operationName":"LoginAccount","variables":{"data":{"id":"","uniqueId":u,"nickname":"","avatarMedium":"","followerCount":0,"followingCount":0,"videoCount":0,"privateAccount":False,"diggCount":0,"authMethod":"local","password":PASSWORD}},"query":"mutation LoginAccount($data: TiktokInfo){loginTiktok(data:$data){accessToken user{username score}}}"}
    for _ in range(3):
        r,d=gql(q,"LoginAccount")
        if r and "errors" not in d:
            t=d['data']['loginTiktok']['accessToken']
            c=r.headers.get("x-csrf-token","")
            s=d['data']['loginTiktok']['user'].get('score',0)
            scores[u]=s
            tokens[u]={"token":t,"csrf":c}
            print(f"[✓] {u} - Score: {s}",flush=True)
            return t,c
        time.sleep(3)
    return None,None

def get_score(t,c):
    q={"operationName":"FetchScore","variables":{},"query":"query FetchScore{fetchScore}"}
    _,d=gql(q,"FetchScore",t,c)
    return d.get("data",{}).get("fetchScore",0) if "errors" not in d else 0

def farm(u,t,c):
    while True:
        try:
            q={"operationName":"GetOrders","variables":{},"query":"query GetOrders{getOrders{_id status}}"}
            _,d=gql(q,"GetOrders",t,c)
            orders=d.get("data",{}).get("getOrders",[])
            pending=[o["_id"] for o in orders if o.get("status")=="pending"]
            if not pending:
                # جيب النقاط الحالية
                s=get_score(t,c)
                if s>scores[u]:
                    scores[u]=s
                    print(f"[{u}] ✓ {s}",flush=True)
                time.sleep(5)
                continue
            for task in pending[:5]:
                rnd=random.randint(3000,4500)
                q={"operationName":"ActionOrder","variables":{"orderId":task,"validationData":{"attempts":1,"initialNumber":float(rnd),"timeSpent":float(random.randint(2000,4000)),"actualCount":rnd+1,"source":"CLIENT_CRONET"}},"query":"mutation ActionOrder($orderId:ID!,$validationData:ValidationDataInput!){actionOrder(orderId:$orderId,validationData:$validationData){score}}"}
                _,r=gql(q,"ActionOrder",t,c)
                if "errors" not in r:
                    s=get_score(t,c)
                    if s>scores[u]:
                        scores[u]=s
                        print(f"[{u}] ✓ {s}",flush=True)
                time.sleep(random.uniform(0.3,0.5))
        except Exception as e:
            print(f"[!] {u} error: {e}",flush=True)
            time.sleep(3)

@app.route('/score/<account>')
def score(account):
    return add_cors(jsonify({"score": scores.get(account, 0)}))

@app.route('/scores')
def all_scores():
    return add_cors(jsonify({"scores": scores, "total": sum(scores.values())}))

@app.route('/orders')
def get_orders():
    return add_cors(jsonify({"orders": load_orders()}))

@app.route('/ping')
def ping():
    return "pong"

print("MOON FARMER V3 - FAST + SAFE",flush=True)

def start():
    for a in ACCOUNTS:
        t,c=login(a)
        if t:
            threading.Thread(target=farm,args=(a,t,c),daemon=True).start()
            time.sleep(3)

threading.Thread(target=start,daemon=True).start()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000)
