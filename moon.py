import threading
from flask import Flask, jsonify, request
import requests,hmac,hashlib,time,uuid,json,random,re

app = Flask(__name__)

FIREBASE_URL = "https://otp-5acda-default-rtdb.firebaseio.com"
PASSWORD = "d02d5189"
DEVINFO = '{"d":"61393235613366373261636533656632","n":"494e46494e495820496e66696e6978205836383733","o":"16","t":"d","v":"2.2.9","s":"0,0"}'
KEY = bytes([b ^ 0x43 for b in [0x35,0x30,0x1c,0x2f,0x2c,0x2c,0x28,0x31,0x35,0x30,0x1c,0x2f,0x2c,0x2c,0x28,0x31]])
OP_IDS = {"LoginAccount":"3522613813036d73817b2715e67743f8d23d7a85ad08b7e12aa3b29a24a17c43","AttestDevice":"bfaf5a72aeb9a337811da6a6d13e0b73680a18ffde0c59a23701e55b98ac2515","FetchScore":"88d30eeca55c0538539ad8217dfefd52b2f47015200cdbb7cb6ea5a765381d69","CreateOrder":"ad7a6397c3970b1e7601f69d24989bff330e256ee5e39321a8d1ad3fe3879b48","GetUsers":"41454e2194d7c30f1c6e11c2c246bcc0377da65a8bf06276ca5ea9ec9ff538b6"}
ACCOUNTS = ["ahmed.alsher0","zoor579","ahmedppl","mmjjk","mmjjjk","mmjjjjk","aappi","aappii","aappmm","o785769","appmmm","pubg.ameeer"]
scores = {acc: 0 for acc in ACCOUNTS}
tokens = {}
active_orders = {}

def add_cors(res):
    res.headers['Access-Control-Allow-Origin'] = '*'
    res.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    res.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return res

def sig(ts,nonce,payload):return hmac.new(KEY,f"{ts}-{nonce}-{payload}".encode(),hashlib.sha256).hexdigest()

def gql(query,op,token=None,csrf=None):
    payload=json.dumps(query,separators=(',',':'))
    ts=str(int(time.time()*1000));nonce=str(uuid.uuid4())[:16]
    h={"X-APOLLO-OPERATION-NAME":op,"Accept":"application/json","x-language":"ar","x-app-name":"com.dev.vidspark","x-device-info":DEVINFO,"x-app-sig":sig(ts,nonce,payload),"x-app-ts":ts,"x-app-nonce":nonce,"Content-Type":"application/json","User-Agent":"okhttp/4.12.0"}
    if op in OP_IDS:h["X-APOLLO-OPERATION-ID"]=OP_IDS[op]
    if token:h["token"]=token;h["x-csrf-token"]=csrf
    try:
        r=requests.post("https://api.tikspark.xyz/graphql",headers=h,data=payload,timeout=15)
        return r,r.json()
    except:return None,{"error":"conn"}

def login(u):
    q={"operationName":"LoginAccount","variables":{"data":{"id":"","uniqueId":u,"nickname":"","avatarMedium":"https://p16-common-sign.tiktokcdn.com/musically-maliva-obj/1594805258216454~tplv-tiktokx-cropcenter:720:720.webp","followerCount":0,"followingCount":0,"videoCount":0,"privateAccount":False,"diggCount":0,"authMethod":"local","password":PASSWORD}},"query":"mutation LoginAccount($data: TiktokInfo){loginTiktok(data:$data){accessToken user{username score avatar followerCount}}}"}
    for attempt in range(3):
        r,d=gql(q,"LoginAccount")
        if r and "errors" not in d:
            t=d['data']['loginTiktok']['accessToken']
            c=r.headers.get("x-csrf-token","")
            user=d['data']['loginTiktok']['user']
            scores[u]=user.get('score',0)
            tokens[u]={"token":t,"csrf":c,"avatar":user.get('avatar',''),"followers":user.get('followerCount',0)}
            print(f"[✓] {u} - {scores[u]}",flush=True)
            return t,c
        else:
            err=d.get("errors",[{"message":""}])[0]["message"]
            if "Rate limit" in err:
                wait=3
                m=re.search(r'wait (\d+) seconds?',err)
                if m: wait=int(m.group(1))+1
                print(f"[!] {u} Rate limit - wait {wait}s",flush=True)
                time.sleep(wait)
            else:
                print(f"[✗] {u} - {err}",flush=True)
                return None,None
    return None,None

def attest(t,c):
    q={"operationName":"AttestDevice","variables":{"integrityToken":"CpsCARCnMGtvLkiuhYFGDW3rUoE73im9X9NmXA1cHOZZOzgRp5FtsmIrZBoNek0K7XIoZiR9XKg1bpApXNem9MbcR4UiIxz1n4Wgv_LA4hSSAbHzpaAfXcnLyKgwnOXGRUieQ4OOpMTMDRxD6O7kd3jjAfcbcHFt3bdgyw7CJYpxz4oq3lIti658lCdnt1NvJzUwfYSp6eWKcvKV5lScaq-nkplRn7hz38A8kLhYNx6w-7rne41hWCR6BQISVfBewaqeh7RL-9iEDrzK-ECbdEwBnpO-LfAqCJKn1bf5VkVxuPAz5qPvB8cNE7ZBMAyMnDHdjNDwpnZMA2EXsgRsyT6Fm_l3MNugWDdWbRgww6sAw6KrRzeBDETsXTh1ZBpqAWerZWp6AIjaDa-b0NFbOS69HsGnfpE7hljmu7OTsd4tM6nM50qiSc4QGuD4aM-joJFkYKIsWf_grquB66bYnYa2mCWcPl1hIEApHMXbCLiO7nwX-8LXEwCDvVNT4f8mjgtI1__D_C-f4g","requestHash":"gPyB7FF-XeZc2kwi2L-KZXs21Z8oPErvHD9gn572PyM"},"query":"mutation AttestDevice($integrityToken:String!,$requestHash:String!){attestDevice(integrityToken:$integrityToken,requestHash:$requestHash){ok}}"}
    gql(q,"AttestDevice",t,c)

def get_score(t,c):
    q={"operationName":"FetchScore","variables":{},"query":"query FetchScore{fetchScore}"}
    _,d=gql(q,"FetchScore",t,c)
    return d.get("data",{}).get("fetchScore",0) if "errors" not in d else 0

def farm(u,t,c):
    print(f"[~] {u} farming...",flush=True)
    while True:
        try:
            q={"operationName":"GetOrders","variables":{},"query":"query GetOrders{getOrders{_id status fulfilled amount}}"}
            _,d=gql(q,"GetOrders",t,c)
            orders=d.get("data",{}).get("getOrders",[])
            
            for order in orders:
                oid=order.get("_id")
                if oid in active_orders:
                    active_orders[oid]["fulfilled"]=order.get("fulfilled",0)
                    active_orders[oid]["status"]=order.get("status","pending")
            
            pending=[o["_id"] for o in orders if o.get("status")=="pending"]
            if not pending:
                s=get_score(t,c)
                if s>scores[u]: scores[u]=s
                time.sleep(10)
                continue
            
            for task in pending:
                rnd=random.randint(3000,4500)
                q={"operationName":"ActionOrder","variables":{"orderId":task,"validationData":{"attempts":1,"initialNumber":float(rnd),"timeSpent":float(random.randint(4000,7000)),"actualCount":rnd+1,"source":"CLIENT_CRONET"}},"query":"mutation ActionOrder($orderId:ID!,$validationData:ValidationDataInput!){actionOrder(orderId:$orderId,validationData:$validationData){score taskProgress{count taskProgressLimit}}}"}
                _,r=gql(q,"ActionOrder",t,c)
                if "errors" not in r:
                    s=get_score(t,c)
                    if s>scores[u]: scores[u]=s
                    prog=r.get("data",{}).get("actionOrder",{}).get("taskProgress",{})
                    if prog:
                        active_orders[task]={"fulfilled":prog.get("count",0),"limit":prog.get("taskProgressLimit",0),"status":"in_progress","target":active_orders.get(task,{}).get("target","")}
                time.sleep(random.uniform(1.5,3.0))
        except Exception as e:
            print(f"[!] {u} error",flush=True)
            time.sleep(5)

@app.route('/score/<account>')
def score(account):
    return add_cors(jsonify({"score": scores.get(account, 0)}))

@app.route('/scores')
def all_scores():
    return add_cors(jsonify({"scores": scores, "total": sum(scores.values())}))

@app.route('/orders')
def get_orders():
    return add_cors(jsonify({"orders": list(active_orders.values())}))

@app.route('/ping')
def ping():
    return "pong"

print("MOON FARMER - Original Speed",flush=True)

def start():
    for a in ACCOUNTS:
        t,c=login(a)
        if t:
            attest(t,c)
            threading.Thread(target=farm,args=(a,t,c),daemon=True).start()
            time.sleep(3)

threading.Thread(target=start,daemon=True).start()

if __name__=='__main__':
    app.run(host='0.0.0.0', port=3000)
