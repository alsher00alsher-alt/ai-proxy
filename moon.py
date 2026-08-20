import threading
from flask import Flask, jsonify, request
import requests,hmac,hashlib,time,uuid,json,random

app = Flask(__name__)

FIREBASE_URL = "https://otp-5acda-default-rtdb.firebaseio.com"

PASSWORD = "d02d5189"
DEVINFO = '{"d":"61393235613366373261636533656632","n":"494e46494e495820496e66696e6978205836383733","o":"16","t":"d","v":"2.2.9","s":"0,0"}'
KEY = bytes([b ^ 0x43 for b in [0x35,0x30,0x1c,0x2f,0x2c,0x2c,0x28,0x31,0x35,0x30,0x1c,0x2f,0x2c,0x2c,0x28,0x31]])
OP_IDS = {"LoginAccount":"3522613813036d73817b2715e67743f8d23d7a85ad08b7e12aa3b29a24a17c43","AttestDevice":"bfaf5a72aeb9a337811da6a6d13e0b73680a18ffde0c59a23701e55b98ac2515","FetchScore":"88d30eeca55c0538539ad8217dfefd52b2f47015200cdbb7cb6ea5a765381d69","CreateOrder":"ad7a6397c3970b1e7601f69d24989bff330e256ee5e39321a8d1ad3fe3879b48","GetUsers":"41454e2194d7c30f1c6e11c2c246bcc0377da65a8bf06276ca5ea9ec9ff538b6"}
ACCOUNTS = ["ahmed.alsher0","zoor579","ahmedppl","mmjjk","mmjjjk","mmjjjjk","aappi","aappii","aappmm","o785769","appmmm","pubg.ameeer"]
scores = {acc: 0 for acc in ACCOUNTS}
tokens = {}

def save_order(order):
    try:
        requests.put(f"{FIREBASE_URL}/orders/{int(time.time()*1000)}.json", json=order)
    except: pass

def load_orders():
    try:
        r = requests.get(f"{FIREBASE_URL}/orders.json")
        data = r.json()
        if data:
            orders = list(data.values())
            orders.sort(key=lambda x: x.get('time', ''), reverse=True)
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
    q={"operationName":"LoginAccount","variables":{"data":{"id":"","uniqueId":u,"nickname":"","avatarMedium":"","followerCount":0,"followingCount":0,"videoCount":0,"privateAccount":False,"diggCount":0,"authMethod":"local","password":PASSWORD}},"query":"mutation LoginAccount($data: TiktokInfo){loginTiktok(data:$data){accessToken user{username score avatar followerCount}}}"}
    for _ in range(3):
        r,d=gql(q,"LoginAccount")
        if r and "errors" not in d:
            t=d['data']['loginTiktok']['accessToken']
            c=r.headers.get("x-csrf-token","")
            user=d['data']['loginTiktok']['user']
            scores[u]=user.get('score',0)
            tokens[u]={"token":t,"csrf":c,"avatar":user.get('avatar',''),"followers":user.get('followerCount',0)}
            return t,c
        time.sleep(5)
    return None,None

def attest(t,c):
    q={"operationName":"AttestDevice","variables":{"integrityToken":"test","requestHash":"test"},"query":"mutation AttestDevice($integrityToken:String!,$requestHash:String!){attestDevice(integrityToken:$integrityToken,requestHash:$requestHash){ok}}"}
    gql(q,"AttestDevice",t,c)

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
            if not pending:time.sleep(8);continue
            for task in pending:
                rnd=random.randint(3000,4500)
                q={"operationName":"ActionOrder","variables":{"orderId":task,"validationData":{"attempts":1,"initialNumber":float(rnd),"timeSpent":float(random.randint(2000,4000)),"actualCount":rnd+1,"source":"CLIENT_CRONET"}},"query":"mutation ActionOrder($orderId:ID!,$validationData:ValidationDataInput!){actionOrder(orderId:$orderId,validationData:$validationData){score}}"}
                _,r=gql(q,"ActionOrder",t,c)
                if "errors" not in r:
                    s=get_score(t,c)
                    scores[u]=s
                time.sleep(random.uniform(1.5,2.5))
        except:time.sleep(5)

def create_order(account, target_user, amount):
    if account not in tokens:
        return {"success": False, "error": "الحساب مش متصل"}
    t=tokens[account]["token"];c=tokens[account]["csrf"]
    avatar=tokens[account]["avatar"];followers=tokens[account]["followers"]
    q={"operationName":"CreateOrder","variables":{"type":"followers","amount":amount,"tiktokerUsername":target_user,"avatar":avatar,"initialCount":followers},"query":"mutation CreateOrder($type: Action!, $amount: Int!, $tiktokerUsername: String, $avatar: String, $initialCount: Int){createOrder(orderInput:{type:$type amount:$amount tiktokerUsername:$tiktokerUsername avatar:$avatar initialCount:$initialCount}){_id status}}"}
    _,d=gql(q,"CreateOrder",t,c)
    if "errors" not in d:
        return {"success": True}
    return {"success": False, "error": d.get('errors',[{}])[0].get('message','')}

@app.route('/score/<account>')
def score(account):
    return add_cors(jsonify({"score": scores.get(account, 0)}))

@app.route('/scores')
def all_scores():
    return add_cors(jsonify({"scores": scores, "total": sum(scores.values())}))

@app.route('/buy-followers', methods=['POST', 'OPTIONS'])
def buy_followers():
    if request.method == 'OPTIONS':
        return add_cors(jsonify({}))
    data=request.json
    target=data.get('target','').replace('@','')
    amount=data.get('amount',0)
    if not target or amount<=0:
        return add_cors(jsonify({"success":False,"error":"بيانات ناقصة"}))
    
    points_needed=(amount/20)*100
    total_points=sum(scores.values())
    
    if points_needed>total_points:
        return add_cors(jsonify({"success":False,"error":f"نقاط غير كافية! تحتاج {int(points_needed)}","needed":int(points_needed),"total":total_points}))
    
    used_accounts=[]
    remaining_points=points_needed
    for account in ACCOUNTS:
        if remaining_points<=0:break
        if scores.get(account,0)>=100:
            account_orders=min(int(scores[account]//100), int(remaining_points//100))
            if account_orders>0:
                order_amount=account_orders*20
                result=create_order(account,target,order_amount)
                if result["success"]:
                    used_accounts.append({"account":account,"amount":order_amount,"points":account_orders*100})
                    remaining_points-=account_orders*100
                    scores[account]-=account_orders*100
    
    if used_accounts:
        order_record={"target":target,"amount":amount,"time":time.strftime("%Y-%m-%d %H:%M:%S"),"used_accounts":used_accounts}
        save_order(order_record)
        return add_cors(jsonify({"success":True,"message":f"تم طلب {amount} متابع لـ @{target}","order":order_record}))
    
    return add_cors(jsonify({"success":False,"error":"فشل تنفيذ الطلب"}))

@app.route('/orders')
def get_orders():
    return add_cors(jsonify({"orders": load_orders()}))

@app.route('/ping')
def ping():
    return "pong"

print("MOON CONTROL PANEL 24/7",flush=True)

def start():
    for a in ACCOUNTS:
        t,c=login(a)
        if t:
            attest(t,c)
            threading.Thread(target=farm,args=(a,t,c),daemon=True).start()
            time.sleep(5)

threading.Thread(target=start,daemon=True).start()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000)
