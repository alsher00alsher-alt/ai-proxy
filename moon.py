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
                s=get_score(t,c)
                if s>scores[u]: scores[u]=s
                time.sleep(10)
                continue
            for task in pending:
                rnd=random.randint(3000,4500)
                q={"operationName":"ActionOrder","variables":{"orderId":task,"validationData":{"attempts":1,"initialNumber":float(rnd),"timeSpent":float(random.randint(4000,7000)),"actualCount":rnd+1,"source":"CLIENT_CRONET"}},"query":"mutation ActionOrder($orderId:ID!,$validationData:ValidationDataInput!){actionOrder(orderId:$orderId,validationData:$validationData){score}}"}
                _,r=gql(q,"ActionOrder",t,c)
                if "errors" not in r:
                    s=get_score(t,c)
                    if s>scores[u]: scores[u]=s
                time.sleep(random.uniform(1.5,3.0))
        except: time.sleep(5)

def create_order(account, order_type, target, amount):
    if account not in tokens: return {"success":False}
    t=tokens[account]["token"];c=tokens[account]["csrf"]
    avatar=tokens[account]["avatar"];followers=tokens[account]["followers"]
    vars_data={"type":order_type,"amount":amount}
    if order_type=="followers":
        vars_data["tiktokerUsername"]=target
        vars_data["avatar"]=avatar
        vars_data["initialCount"]=followers
    elif order_type=="likes" or order_type=="views":
        vars_data["videoLink"]=target
    elif order_type=="comments":
        vars_data["videoLink"]=target
    q={"operationName":"CreateOrder","variables":vars_data,"query":"mutation CreateOrder($type:Action!,$amount:Int!,$tiktokerUsername:String,$videoLink:String,$avatar:String,$initialCount:Int){createOrder(orderInput:{type:$type amount:$amount tiktokerUsername:$tiktokerUsername videoLink:$videoLink avatar:$avatar initialCount:$initialCount}){_id status}}"}
    _,d=gql(q,"CreateOrder",t,c)
    return {"success":"errors" not in d}

@app.route('/score/<account>')
def score(account): return add_cors(jsonify({"score":scores.get(account,0)}))

@app.route('/scores')
def all_scores(): return add_cors(jsonify({"scores":scores,"total":sum(scores.values())}))

@app.route('/create-order', methods=['POST','OPTIONS'])
def create_order_api():
    if request.method=='OPTIONS': return add_cors(jsonify({}))
    data=request.json
    service=data.get('service','followers')
    target=data.get('target','').strip()
    amount=data.get('amount',0)
    if not target or amount<=0: return add_cors(jsonify({"success":False,"error":"بيانات ناقصة"}))
    
    # حساب النقاط
    points_map={"followers":5,"likes":2,"views":1,"comments":3}
    points_needed=amount*points_map.get(service,5)
    total_points=sum(scores.values())
    if points_needed>total_points: return add_cors(jsonify({"success":False,"error":f"نقاط غير كافية! تحتاج {int(points_needed)}"}))
    
    used=[]
    for account in ACCOUNTS:
        if points_needed<=0: break
        if scores.get(account,0)>=points_map.get(service,5):
            amt=min(amount,int(scores[account]//points_map.get(service,5)))
            if amt>0:
                if create_order(account,service,target,amt)["success"]:
                    used.append({"account":account,"amount":amt})
                    scores[account]-=amt*points_map.get(service,5)
                    points_needed-=amt*points_map.get(service,5)
                    amount-=amt
    
    if used:
        order_record={"service":service,"target":target,"amount":sum(u["amount"] for u in used),"time":time.strftime("%Y-%m-%d %H:%M:%S"),"used_accounts":used}
        requests.put(f"{FIREBASE_URL}/orders/{int(time.time()*1000)}.json",json=order_record)
        return add_cors(jsonify({"success":True,"message":"تم الطلب!"}))
    return add_cors(jsonify({"success":False,"error":"فشل"}))

@app.route('/orders')
def get_orders():
    try:
        r=requests.get(f"{FIREBASE_URL}/orders.json")
        data=r.json()
        if data: return add_cors(jsonify({"orders":list(data.values())}))
    except: pass
    return add_cors(jsonify({"orders":[]}))

@app.route('/ping')
def ping(): return "pong"

print("MOON SERVICES PANEL",flush=True)

def start():
    for a in ACCOUNTS:
        t,c=login(a)
        if t:
            threading.Thread(target=farm,args=(a,t,c),daemon=True).start()
            time.sleep(3)

threading.Thread(target=start,daemon=True).start()

if __name__=='__main__':
    app.run(host='0.0.0.0', port=3000)
