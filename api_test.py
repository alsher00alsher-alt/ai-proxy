import requests
import json

B = 'https://numberpanel.tech'
K = 'np_live_p7ixAR9OQq305WZlIocWG-lMEHqOjNtoQ8-WWHYQJa8'
H = {'Authorization': f'Bearer {K}'}

print('='*50)
print('🧪 اختبار NumberPanel API')
print('='*50)

# 1. الخدمات
print('\n📋 [1/7] الخدمات المتاحة:')
r = requests.get(f'{B}/api/services')
d = r.json()
if d.get('success'):
    for s in d['services'][:5]:
        print(f'  ✅ {s["name"]}: {s["count"]} رقم')
else:
    print('  ❌ فشل')

# 2. الدول
print('\n🌍 [2/7] دول واتساب:')
r = requests.get(f'{B}/api/countries', params={'service': 'WhatsApp'})
d = r.json()
if d.get('success'):
    for c in d['countries'][:5]:
        print(f'  ✅ {c["name"]}: {c["count"]} رقم')
else:
    print('  ❌ فشل')

# 3. OTP العام
print('\n🔐 [3/7] أحدث OTP:')
r = requests.get(f'{B}/api/otp', params={'count': 3})
d = r.json()
for item in d[:3]:
    print(f'  ✅ {item[0]} | {item[1]} | كود: {item[2]}')

# 4. النطاقات
print('\n📧 [4/7] نطاقات البريد:')
r = requests.get(f'{B}/api/mail/domains', headers=H)
d = r.json()
if d.get('success'):
    for domain in d['domains']:
        print(f'  ✅ {domain}')
else:
    print(f'  ❌ {d.get("error", "فشل")}')

# 5. الأرقام النشطة
print('\n📱 [5/7] أرقامي النشطة:')
r = requests.get(f'{B}/api/my_numbers', headers=H)
d = r.json()
if d.get('success'):
    nums = d.get('numbers', [])
    if nums:
        for n in nums[:3]:
            print(f'  ✅ {n["number"]} | {n["service"]} | {n["country"]}')
    else:
        print('  ⚠️ لا توجد أرقام نشطة')
else:
    print(f'  ❌ {d.get("error", "فشل")}')

# 6. إحصائيات
print('\n📊 [6/7] إحصائيات:')
r = requests.get(f'{B}/api/stats/detailed', params={'period': 'daily'})
d = r.json()
print(f'  ✅ OTP: {d.get("otp_count", "N/A")}')
print(f'  ✅ دول: {d.get("countries_count", "N/A")}')
print(f'  ✅ خدمات: {d.get("services_count", "N/A")}')

# 7. طلب رقم (اختياري)
print('\n📱 [7/7] طلب رقم واتساب:')
data = {'service': 'whatsapp', 'country': 'MZ'}
r = requests.post(f'{B}/api/request_number', headers=H, json=data)
d = r.json()
if d.get('success'):
    print(f'  ✅ رقم: {d.get("number", "N/A")}')
    print(f'  ✅ ID: {d.get("id", "N/A")}')
else:
    print(f'  ❌ {d.get("error", "فشل")}')

print('\n' + '='*50)
print('✅ تم اختبار كل الـ APIs!')
print('='*50)
