#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
===============================================================================
              telegram bot - multi-language otp & number panel (249 Countries)
===============================================================================
"""

import asyncio
import logging
import requests
from telegram import Update, InlineKeyboardMarkup, InlineKeyboardButton
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes
from telegram.constants import ParseMode

try:
    from telegram import CopyTextButton
except ImportError:
    CopyTextButton = None

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

BOT_TOKEN = "8788737555:AAFYW0p88rCOG31RhrkTc5oKoQhoMsn58t4"
API_KEY = "np_live_6DknI4df2uZ0_BFv6CGGpX_BCBAq60TG1sKev64WPkw"
BASE_URL = "https://numberpanel.tech"
OTP_GROUP_URL = "https://t.me/PUBG_SKIN_FILES_HACKE"

HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

session = requests.Session()
session.headers.update(HEADERS)

TRANSLATIONS = {
    "ar": {
        "choose_language": "🌍 **اختر اللغة / Choose Language:**",
        "select_service": "📱 **اختر الخدمة المطلوبة:**",
        "select_country": "🌍 **اختر الدولة المطلوبة:**",
        "loading": "⏳ جاري التحميل ومعالجة الطلب...",
        "error": "❌ حدث خطأ أثناء الاتصال بالسيرفر. يرجى المحاولة لاحقاً.",
        "back": "◀️ رجوع",
        "numbers_ready": "✅ **تم تجهيز الأرقام بنجاح!**\n\n🏴 **الدولة:** {}\n🛠 **الخدمة:** {}\n\n👇 **اضغط على أي رقم للنسخ الفوري بنقرة واحدة:**",
        "get_otp": "📩 جلب OTP",
        "change_number": "🔄 تغيير الرقم",
        "otp_group": "🔑 مجموعة OTP",
        "no_numbers": "❌ لا توجد أرقام متاحة حالياً لهذه الخدمة.",
        "no_otp": "⏳ لم يصل كود التحقق بعد، اضغط مجدداً بعد ثوانٍ.",
        "otp_received": "✅ **الرموز الواصلة:**\n\n",
        "copied": "📋 تم نسخ الرقم بنجاح!"
    },
    "en": {
        "choose_language": "🌍 **Choose Language / اختر اللغة:**",
        "select_service": "📱 **Select Required Service:**",
        "select_country": "🌍 **Select Country:**",
        "loading": "⏳ Processing your request...",
        "error": "❌ An error occurred. Please try again later.",
        "back": "◀️ Back",
        "numbers_ready": "✅ **Numbers Ready!**\n\n🏴 **Country:** {}\n🛠 **Service:** {}\n\n👇 **Click any number below to copy instantly:**",
        "get_otp": "📩 Get OTP",
        "change_number": "🔄 Change Number",
        "otp_group": "🔑 OTP Group",
        "no_numbers": "❌ No available numbers right now.",
        "no_otp": "⏳ No OTP received yet. Please check again shortly.",
        "otp_received": "✅ **Received Codes:**\n\n",
        "copied": "📋 Copied to clipboard!"
    }
}

# قائمة كاملة تحتوي على 249 دولة كود ISO ALPHA-2
COUNTRIES = {
    "AD": {"flag": "🇦🇩", "ar": "أندورا", "en": "Andorra"},
    "AE": {"flag": "🇦🇪", "ar": "الإمارات", "en": "UAE"},
    "AF": {"flag": "🇦🇫", "ar": "أفغانستان", "en": "Afghanistan"},
    "AG": {"flag": "🇦🇬", "ar": "أنتيغوا وباربودا", "en": "Antigua and Barbuda"},
    "AI": {"flag": "🇦🇮", "ar": "أنغويلا", "en": "Anguilla"},
    "AL": {"flag": "🇦🇱", "ar": "ألبانيا", "en": "Albania"},
    "AM": {"flag": "🇦🇲", "ar": "أرمينيا", "en": "Armenia"},
    "AO": {"flag": "🇦🇴", "ar": "أنغولا", "en": "Angola"},
    "AQ": {"flag": "🇦🇶", "ar": "أنتاركتيكا", "en": "Antarctica"},
    "AR": {"flag": "🇦🇷", "ar": "الأرجنتين", "en": "Argentina"},
    "AS": {"flag": "🇦🇸", "ar": "ساموا الأمريكية", "en": "American Samoa"},
    "AT": {"flag": "🇦🇹", "ar": "النمسا", "en": "Austria"},
    "AU": {"flag": "🇦🇺", "ar": "أستراليا", "en": "Australia"},
    "AW": {"flag": "🇦🇼", "ar": "أروبا", "en": "Aruba"},
    "AX": {"flag": "🇦🇽", "ar": "جزر أولاند", "en": "Aland Islands"},
    "AZ": {"flag": "🇦🇿", "ar": "أذربيجان", "en": "Azerbaijan"},
    "BA": {"flag": "🇧🇦", "ar": "البوسنة والهرسك", "en": "Bosnia and Herzegovina"},
    "BB": {"flag": "🇧🇧", "ar": "باربادوس", "en": "Barbados"},
    "BD": {"flag": "🇧🇩", "ar": "بنغلاديش", "en": "Bangladesh"},
    "BE": {"flag": "🇧🇪", "ar": "بلجيكا", "en": "Belgium"},
    "BF": {"flag": "🇧🇫", "ar": "بوركينا فاسو", "en": "Burkina Faso"},
    "BG": {"flag": "🇧🇬", "ar": "بلغاريا", "en": "Bulgaria"},
    "BH": {"flag": "🇧🇭", "ar": "البحرين", "en": "Bahrain"},
    "BI": {"flag": "🇧🇮", "ar": "بوروندي", "en": "Burundi"},
    "BJ": {"flag": "🇧🇯", "ar": "بنين", "en": "Benin"},
    "BL": {"flag": "🇧🇱", "ar": "سان بارتيلمي", "en": "Saint Barthelemy"},
    "BM": {"flag": "🇧🇲", "ar": "برمودا", "en": "Bermuda"},
    "BN": {"flag": "🇧🇳", "ar": "بروناي", "en": "Brunei"},
    "BO": {"flag": "🇧🇴", "ar": "بوليفيا", "en": "Bolivia"},
    "BQ": {"flag": "🇧🇶", "ar": "بونير وسينت أوستاتيوس وصابا", "en": "Bonaire, Sint Eustatius and Saba"},
    "BR": {"flag": "🇧🇷", "ar": "البرازيل", "en": "Brazil"},
    "BS": {"flag": "🇧🇸", "ar": "الباهاما", "en": "Bahamas"},
    "BT": {"flag": "🇧🇹", "ar": "بوتان", "en": "Bhutan"},
    "BV": {"flag": "🇧🇻", "ar": "جزيرة بوفيه", "en": "Bouvet Island"},
    "BW": {"flag": "🇧🇼", "ar": "بوتسوانا", "en": "Botswana"},
    "BY": {"flag": "🇧🇾", "ar": "بيلاروسيا", "en": "Belarus"},
    "BZ": {"flag": "🇧🇿", "ar": "بيليز", "en": "Belize"},
    "CA": {"flag": "🇨🇦", "ar": "كندا", "en": "Canada"},
    "CC": {"flag": "🇨🇨", "ar": "جزر كوكوس", "en": "Cocos (Keeling) Islands"},
    "CD": {"flag": "🇨🇩", "ar": "الكونغو الديمقراطية", "en": "DR Congo"},
    "CF": {"flag": "🇨🇫", "ar": "جمهورية أفريقيا الوسطى", "en": "Central African Republic"},
    "CG": {"flag": "🇨🇬", "ar": "جمهورية الكونغو", "en": "Congo"},
    "CH": {"flag": "🇨🇭", "ar": "سويسرا", "en": "Switzerland"},
    "CI": {"flag": "🇨🇮", "ar": "ساحل العاج", "en": "Ivory Coast"},
    "CK": {"flag": "🇨🇰", "ar": "جزر كوك", "en": "Cook Islands"},
    "CL": {"flag": "🇨🇱", "ar": "تشيلي", "en": "Chile"},
    "CM": {"flag": "🇨🇲", "ar": "الكاميرون", "en": "Cameroon"},
    "CN": {"flag": "🇨🇳", "ar": "الصين", "en": "China"},
    "CO": {"flag": "🇨🇴", "ar": "كولومبيا", "en": "Colombia"},
    "CR": {"flag": "🇨🇷", "ar": "كوستاريكا", "en": "Costa Rica"},
    "CU": {"flag": "🇨🇺", "ar": "كوبا", "en": "Cuba"},
    "CV": {"flag": "🇨🇻", "ar": "الرأس الأخضر", "en": "Cape Verde"},
    "CW": {"flag": "🇨🇼", "ar": "كوراساو", "en": "Curacao"},
    "CX": {"flag": "🇨🇽", "ar": "جزيرة الكريسماس", "en": "Christmas Island"},
    "CY": {"flag": "🇨🇾", "ar": "قبرص", "en": "Cyprus"},
    "CZ": {"flag": "🇨🇿", "ar": "التشيك", "en": "Czech Republic"},
    "DE": {"flag": "🇩🇪", "ar": "ألمانيا", "en": "Germany"},
    "DJ": {"flag": "🇩🇯", "ar": "جيبوتي", "en": "Djibouti"},
    "DK": {"flag": "🇩🇰", "ar": "الدنمارك", "en": "Denmark"},
    "DM": {"flag": "🇩🇲", "ar": "دومينيكا", "en": "Dominica"},
    "DO": {"flag": "🇩🇴", "ar": "جمهورية الدومينيكان", "en": "Dominican Republic"},
    "DZ": {"flag": "🇩🇿", "ar": "الجزائر", "en": "Algeria"},
    "EC": {"flag": "🇪🇨", "ar": "الإكوادور", "en": "Ecuador"},
    "EE": {"flag": "🇪🇪", "ar": "إستونيا", "en": "Estonia"},
    "EG": {"flag": "🇪🇬", "ar": "مصر", "en": "Egypt"},
    "EH": {"flag": "🇪🇭", "ar": "الصحراء الغربية", "en": "Western Sahara"},
    "ER": {"flag": "🇪🇷", "ar": "إريتريا", "en": "Eritrea"},
    "ES": {"flag": "🇪🇸", "ar": "إسبانيا", "en": "Spain"},
    "ET": {"flag": "🇪🇹", "ar": "إثيوبيا", "en": "Ethiopia"},
    "FI": {"flag": "🇫🇮", "ar": "فنلندا", "en": "Finland"},
    "FJ": {"flag": "🇫🇯", "ar": "فيجي", "en": "Fiji"},
    "FK": {"flag": "🇫🇰", "ar": "جزر فوكلاند", "en": "Falkland Islands"},
    "FM": {"flag": "🇫🇲", "ar": "ميكرونيزيا", "en": "Micronesia"},
    "FO": {"flag": "🇫🇴", "ar": "جزر فارو", "en": "Faroe Islands"},
    "FR": {"flag": "🇫🇷", "ar": "فرنسا", "en": "France"},
    "GA": {"flag": "🇬🇦", "ar": "الغابون", "en": "Gabon"},
    "GB": {"flag": "🇬🇧", "ar": "المملكة المتحدة", "en": "United Kingdom"},
    "GD": {"flag": "🇬🇩", "ar": "غرينادا", "en": "Grenada"},
    "GE": {"flag": "🇬🇪", "ar": "جورجيا", "en": "Georgia"},
    "GF": {"flag": "🇬🇫", "ar": "غويانا الفرنسية", "en": "French Guiana"},
    "GG": {"flag": "🇬🇬", "ar": "غيرنزي", "en": "Guernsey"},
    "GH": {"flag": "🇬🇭", "ar": "غانا", "en": "Ghana"},
    "GI": {"flag": "🇬🇮", "ar": "جبل طارق", "en": "Gibraltar"},
    "GL": {"flag": "🇬🇱", "ar": "جرينلاند", "en": "Greenland"},
    "GM": {"flag": "🇬🇲", "ar": "غامبيا", "en": "Gambia"},
    "GN": {"flag": "🇬🇳", "ar": "غينيا", "en": "Guinea"},
    "GP": {"flag": "🇬🇵", "ar": "غوادلوب", "en": "Guadeloupe"},
    "GQ": {"flag": "🇬🇶", "ar": "غينيا الاستوائية", "en": "Equatorial Guinea"},
    "GR": {"flag": "🇬🇷", "ar": "اليونان", "en": "Greece"},
    "GS": {"flag": "🇬🇸", "ar": "جورجيا الجنوبية وجزر ساندويتش الجنوبية", "en": "South Georgia"},
    "GT": {"flag": "🇬🇹", "ar": "غواتيمالا", "en": "Guatemala"},
    "GU": {"flag": "🇬🇺", "ar": "غوام", "en": "Guam"},
    "GW": {"flag": "🇬🇼", "ar": "غينيا بيساو", "en": "Guinea-Bissau"},
    "GY": {"flag": "🇬🇾", "ar": "غيانا", "en": "Guyana"},
    "HK": {"flag": "🇭🇰", "ar": "هونغ كونغ", "en": "Hong Kong"},
    "HM": {"flag": "🇭🇲", "ar": "جزيرة هيرد وجزر ماكدونالد", "en": "Heard Island and McDonald Islands"},
    "HN": {"flag": "🇭🇳", "ar": "هندوراس", "en": "Honduras"},
    "HR": {"flag": "🇭🇷", "ar": "كرواتيا", "en": "Croatia"},
    "HT": {"flag": "🇭🇹", "ar": "هايتي", "en": "Haiti"},
    "HU": {"flag": "🇭🇺", "ar": "المجر", "en": "Hungary"},
    "ID": {"flag": "🇮🇩", "ar": "إندونيسيا", "en": "Indonesia"},
    "IE": {"flag": "🇮🇪", "ar": "أيرلندا", "en": "Ireland"},
    "IL": {"flag": "🇮🇱", "ar": "إسرائيل", "en": "Israel"},
    "IM": {"flag": "🇮🇲", "ar": "جزيرة مان", "en": "Isle of Man"},
    "IN": {"flag": "🇮🇳", "ar": "الهند", "en": "India"},
    "IO": {"flag": "🇮🇴", "ar": "إقليم المحيط الهندي البريطاني", "en": "British Indian Ocean Territory"},
    "IQ": {"flag": "🇮🇶", "ar": "العراق", "en": "Iraq"},
    "IR": {"flag": "🇮🇷", "ar": "إيران", "en": "Iran"},
    "IS": {"flag": "🇮🇸", "ar": "آيسلندا", "en": "Iceland"},
    "IT": {"flag": "🇮🇹", "ar": "إيطاليا", "en": "Italy"},
    "JE": {"flag": "🇯🇪", "ar": "جيرزي", "en": "Jersey"},
    "JM": {"flag": "🇯🇲", "ar": "جامايكا", "en": "Jamaica"},
    "JO": {"flag": "🇯🇴", "ar": "الأردن", "en": "Jordan"},
    "JP": {"flag": "🇯🇵", "ar": "اليابان", "en": "Japan"},
    "KE": {"flag": "🇰🇪", "ar": "كينيا", "en": "Kenya"},
    "KG": {"flag": "🇰🇬", "ar": "قيرغيزستان", "en": "Kyrgyzstan"},
    "KH": {"flag": "🇰🇭", "ar": "كمبوديا", "en": "Cambodia"},
    "KI": {"flag": "🇰🇮", "ar": "كيريباتي", "en": "Kiribati"},
    "KM": {"flag": "🇰🇲", "ar": "جزر القمر", "en": "Comoros"},
    "KN": {"flag": "🇰🇳", "ar": "سانت كيتس ونيفيس", "en": "Saint Kitts and Nevis"},
    "KP": {"flag": "🇰🇵", "ar": "كوريا الشمالية", "en": "North Korea"},
    "KR": {"flag": "🇰🇷", "ar": "كوريا الجنوبية", "en": "South Korea"},
    "KW": {"flag": "🇰🇼", "ar": "الكويت", "en": "Kuwait"},
    "KY": {"flag": "🇰🇾", "ar": "جزر كايمان", "en": "Cayman Islands"},
    "KZ": {"flag": "🇰🇿", "ar": "كازاخستان", "en": "Kazakhstan"},
    "LA": {"flag": "🇱🇦", "ar": "لاوس", "en": "Laos"},
    "LB": {"flag": "🇱🇧", "ar": "لبنان", "en": "Lebanon"},
    "LC": {"flag": "🇱🇨", "ar": "سانت لوسيا", "en": "Saint Lucia"},
    "LI": {"flag": "🇱🇮", "ar": "ليختنشتاين", "en": "Liechtenstein"},
    "LK": {"flag": "🇱🇰", "ar": "سريلانكا", "en": "Sri Lanka"},
    "LR": {"flag": "🇱🇷", "ar": "ليبيريا", "en": "Liberia"},
    "LS": {"flag": "🇱🇸", "ar": "ليسوتو", "en": "Lesotho"},
    "LT": {"flag": "🇱🇹", "ar": "ليتوانيا", "en": "Lithuania"},
    "LU": {"flag": "🇱🇺", "ar": "لوكسمبورغ", "en": "Luxembourg"},
    "LV": {"flag": "🇱🇻", "ar": "لاتفيا", "en": "Latvia"},
    "LY": {"flag": "🇱🇾", "ar": "ليبيا", "en": "Libya"},
    "MA": {"flag": "🇲🇦", "ar": "المغرب", "en": "Morocco"},
    "MC": {"flag": "🇲🇨", "ar": "موناكو", "en": "Monaco"},
    "MD": {"flag": "🇲🇩", "ar": "مولدوفا", "en": "Moldova"},
    "ME": {"flag": "🇲🇪", "ar": "الجبل الأسود", "en": "Montenegro"},
    "MF": {"flag": "🇲🇫", "ar": "سانت مارتن الفرنسية", "en": "Saint Martin"},
    "MG": {"flag": "🇲🇬", "ar": "مدغشقر", "en": "Madagascar"},
    "MH": {"flag": "🇲🇭", "ar": "جزر مارشال", "en": "Marshall Islands"},
    "MK": {"flag": "🇲🇰", "ar": "مقدونيا الشمالية", "en": "North Macedonia"},
    "ML": {"flag": "🇲🇱", "ar": "مالي", "en": "Mali"},
    "MM": {"flag": "🇲🇲", "ar": "ميانمار", "en": "Myanmar"},
    "MN": {"flag": "🇲🇳", "ar": "منغوليا", "en": "Mongolia"},
    "MO": {"flag": "🇲🇴", "ar": "ماكاو", "en": "Macau"},
    "MP": {"flag": "🇲🇵", "ar": "جزر ماريانا الشمالية", "en": "Northern Mariana Islands"},
    "MQ": {"flag": "🇲🇶", "ar": "مارتينيك", "en": "Martinique"},
    "MR": {"flag": "🇲🇷", "ar": "موريتانيا", "en": "Mauritania"},
    "MS": {"flag": "🇲🇸", "ar": "مونتسرات", "en": "Montserrat"},
    "MT": {"flag": "🇲🇹", "ar": "مالطا", "en": "Malta"},
    "MU": {"flag": "🇲🇺", "ar": "موريشيوس", "en": "Mauritius"},
    "MV": {"flag": "🇲🇻", "ar": "جزر المالديف", "en": "Maldives"},
    "MW": {"flag": "🇲🇼", "ar": "مالاوي", "en": "Malawi"},
    "MX": {"flag": "🇲🇽", "ar": "المكسيك", "en": "Mexico"},
    "MY": {"flag": "🇲🇾", "ar": "ماليزيا", "en": "Malaysia"},
    "MZ": {"flag": "🇲🇿", "ar": "موزمبيق", "en": "Mozambique"},
    "NA": {"flag": "🇳🇦", "ar": "ناميبيا", "en": "Namibia"},
    "NC": {"flag": "🇳🇨", "ar": "كاليدونيا الجديدة", "en": "New Caledonia"},
    "NE": {"flag": "🇳🇪", "ar": "النيجر", "en": "Niger"},
    "NF": {"flag": "🇳🇫", "ar": "جزيرة نورفولك", "en": "Norfolk Island"},
    "NG": {"flag": "🇳🇬", "ar": "نيجيريا", "en": "Nigeria"},
    "NI": {"flag": "🇳🇮", "ar": "نيكاراغوا", "en": "Nicaragua"},
    "NL": {"flag": "🇳🇱", "ar": "هولندا", "en": "Netherlands"},
    "NO": {"flag": "🇳🇴", "ar": "النرويج", "en": "Norway"},
    "NP": {"flag": "🇳🇵", "ar": "نيبال", "en": "Nepal"},
    "NR": {"flag": "🇳🇷", "ar": "ناورو", "en": "Nauru"},
    "NU": {"flag": "🇳🇺", "ar": "نيوي", "en": "Niue"},
    "NZ": {"flag": "🇳🇿", "ar": "نيوزيلندا", "en": "New Zealand"},
    "OM": {"flag": "🇴🇲", "ar": "عمان", "en": "Oman"},
    "PA": {"flag": "🇵🇦", "ar": "بنما", "en": "Panama"},
    "PE": {"flag": "🇵🇪", "ar": "بيرو", "en": "Peru"},
    "PF": {"flag": "🇵🇫", "ar": "بولينزيا الفرنسية", "en": "French Polynesia"},
    "PG": {"flag": "🇵🇬", "ar": "بابوا غينيا الجديدة", "en": "Papua New Guinea"},
    "PH": {"flag": "🇵🇭", "ar": "الفلبين", "en": "Philippines"},
    "PK": {"flag": "🇵🇰", "ar": "باكستان", "en": "Pakistan"},
    "PL": {"flag": "🇵🇱", "ar": "بولندا", "en": "Poland"},
    "PM": {"flag": "🇵🇲", "ar": "سان بيير وميكلون", "en": "Saint Pierre and Miquelon"},
    "PN": {"flag": "🇵🇳", "ar": "جزر بيتكيرن", "en": "Pitcairn Islands"},
    "PR": {"flag": "🇵🇷", "ar": "بورتوريكو", "en": "Puerto Rico"},
    "PS": {"flag": "🇵🇸", "ar": "فلسطين", "en": "Palestine"},
    "PT": {"flag": "🇵🇹", "ar": "البرتغال", "en": "Portugal"},
    "PW": {"flag": "🇵🇼", "ar": "بالاو", "en": "Palau"},
    "PY": {"flag": "🇵🇾", "ar": "باراغواي", "en": "Paraguay"},
    "QA": {"flag": "🇶🇦", "ar": "قطر", "en": "Qatar"},
    "RE": {"flag": "🇷🇪", "ar": "ريونيون", "en": "Reunion"},
    "RO": {"flag": "🇷🇴", "ar": "رومانيا", "en": "Romania"},
    "RS": {"flag": "🇷🇸", "ar": "صربيا", "en": "Serbia"},
    "RU": {"flag": "🇷🇺", "ar": "روسيا", "en": "Russia"},
    "RW": {"flag": "🇷🇼", "ar": "رواندا", "en": "Rwanda"},
    "SA": {"flag": "🇸🇦", "ar": "السعودية", "en": "Saudi Arabia"},
    "SB": {"flag": "🇸🇧", "ar": "جزر سليمان", "en": "Solomon Islands"},
    "SC": {"flag": "🇸🇨", "ar": "سيشيل", "en": "Seychelles"},
    "SD": {"flag": "🇸🇩", "ar": "السودان", "en": "Sudan"},
    "SE": {"flag": "🇸🇪", "ar": "السويد", "en": "Sweden"},
    "SG": {"flag": "🇸🇬", "ar": "سنغافورة", "en": "Singapore"},
    "SH": {"flag": "🇸🇭", "ar": "سانت هيلانة", "en": "Saint Helena"},
    "SI": {"flag": "🇸🇮", "ar": "سلوفينيا", "en": "Slovenia"},
    "SJ": {"flag": "🇸🇯", "ar": "سفالبارد ويان ماين", "en": "Svalbard and Jan Mayen"},
    "SK": {"flag": "🇸🇰", "ar": "سلوفاكيا", "en": "Slovakia"},
    "SL": {"flag": "🇸🇱", "ar": "سيراليون", "en": "Sierra Leone"},
    "SM": {"flag": "🇸🇲", "ar": "سان مارينو", "en": "San Marino"},
    "SN": {"flag": "🇸🇳", "ar": "السنغال", "en": "Senegal"},
    "SO": {"flag": "🇸🇴", "ar": "الصومال", "en": "Somalia"},
    "SR": {"flag": "🇸🇷", "ar": "سورينام", "en": "Suriname"},
    "SS": {"flag": "🇸🇸", "ar": "جنوب السودان", "en": "South Sudan"},
    "ST": {"flag": "🇸🇹", "ar": "ساوتومي وبرينسيب", "en": "Sao Tome and Principe"},
    "SV": {"flag": "🇸🇻", "ar": "السلفادور", "en": "El Salvador"},
    "SX": {"flag": "🇸🇽", "ar": "سينت مارتن الهولندية", "en": "Sint Maarten"},
    "SY": {"flag": "🇸🇾", "ar": "سوريا", "en": "Syria"},
    "SZ": {"flag": "🇸🇿", "ar": "إسواتيني", "en": "Eswatini"},
    "TC": {"flag": "🇹🇨", "ar": "جزر تركس وكايكوس", "en": "Turks and Caicos Islands"},
    "TD": {"flag": "🇹🇩", "ar": "تشاد", "en": "Chad"},
    "TF": {"flag": "🇹🇫", "ar": "الأراضي الجنوبية الفرنسية", "en": "French Southern Territories"},
    "TG": {"flag": "🇹🇬", "ar": "توغو", "en": "Togo"},
    "TH": {"flag": "🇹🇭", "ar": "تايلاند", "en": "Thailand"},
    "TJ": {"flag": "🇹🇯", "ar": "طاجيكستان", "en": "Tajikistan"},
    "TK": {"flag": "🇹🇰", "ar": "توكيلاو", "en": "Tokelau"},
    "TL": {"flag": "🇹🇱", "ar": "تيمور الشرقية", "en": "East Timor"},
    "TM": {"flag": "🇹🇲", "ar": "تركمانستان", "en": "Turkmenistan"},
    "TN": {"flag": "🇹🇳", "ar": "تونس", "en": "Tunisia"},
    "TO": {"flag": "🇹🇴", "ar": "تونغا", "en": "Tonga"},
    "TR": {"flag": "🇹🇷", "ar": "تركيا", "en": "Turkey"},
    "TT": {"flag": "🇹🇹", "ar": "ترينيداد وتوباغو", "en": "Trinidad and Tobago"},
    "TV": {"flag": "🇹🇻", "ar": "توفالو", "en": "Tuvalu"},
    "TW": {"flag": "🇹🇼", "ar": "تايوان", "en": "Taiwan"},
    "TZ": {"flag": "🇹🇿", "ar": "تنزانيا", "en": "Tanzania"},
    "UA": {"flag": "🇺🇦", "ar": "أوكرانيا", "en": "Ukraine"},
    "UG": {"flag": "🇺🇬", "ar": "أوغندا", "en": "Uganda"},
    "UM": {"flag": "🇺🇲", "ar": "جزر الولايات المتحدة الصغيرة النائية", "en": "US Outlying Islands"},
    "US": {"flag": "🇺🇸", "ar": "أمريكا", "en": "United States"},
    "UY": {"flag": "🇺🇾", "ar": "أوروغواي", "en": "Uruguay"},
    "UZ": {"flag": "🇺🇿", "ar": "أوزبكستان", "en": "Uzbekistan"},
    "VA": {"flag": "🇻🇦", "ar": "الفاتيكان", "en": "Vatican City"},
    "VC": {"flag": "🇻🇨", "ar": "سانت فنسنت والغرينادين", "en": "Saint Vincent and the Grenadines"},
    "VE": {"flag": "🇻🇪", "ar": "فنزويلا", "en": "Venezuela"},
    "VG": {"flag": "🇻🇬", "ar": "جزر العذراء البريطانية", "en": "British Virgin Islands"},
    "VI": {"flag": "🇻🇮", "ar": "جزر العذراء الأمريكية", "en": "US Virgin Islands"},
    "VN": {"flag": "🇻🇳", "ar": "فيتنام", "en": "Vietnam"},
    "VU": {"flag": "🇻🇺", "ar": "فانواتو", "en": "Vanuatu"},
    "WF": {"flag": "🇼🇫", "ar": "واليس وفوتونا", "en": "Wallis and Futuna"},
    "WS": {"flag": "🇼🇸", "ar": "ساموا", "en": "Samoa"},
    "YE": {"flag": "🇾🇪", "ar": "اليمن", "en": "Yemen"},
    "YT": {"flag": "🇾🇹", "ar": "مايوت", "en": "Mayotte"},
    "ZA": {"flag": "🇿🇦", "ar": "جنوب أفريقيا", "en": "South Africa"},
    "ZM": {"flag": "🇿🇲", "ar": "زامبيا", "en": "Zambia"},
    "ZW": {"flag": "🇿🇼", "ar": "زيمبابوي", "en": "Zimbabwe"}
}

def get_country_display(code, lang="ar"):
    code_upper = str(code).upper().strip()
    if code_upper in COUNTRIES:
        country = COUNTRIES[code_upper]
        return f"{country['flag']} {country[lang]}"
    return f"🏳️ {code}"

def get_text(lang, key, *args):
    text = TRANSLATIONS.get(lang, TRANSLATIONS["en"]).get(key, key)
    if args:
        text = text.format(*args)
    return text

def api_request_sync(method, endpoint, data=None, params=None):
    url = f"{BASE_URL}{endpoint}"
    try:
        if method == "GET":
            response = session.get(url, params=params, timeout=10)
        else:
            response = session.post(url, json=data, timeout=10)
        return response.json()
    except Exception as e:
        logger.error(f"API Connection Failure: {e}")
        return {"success": False, "error": str(e)}

async def api_request(method, endpoint, data=None, params=None):
    return await asyncio.to_thread(api_request_sync, method, endpoint, data, params)

async def safe_answer(query, text=None, show_alert=False):
    try:
        await query.answer(text=text, show_alert=show_alert)
    except Exception:
        pass

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [
        [
            InlineKeyboardButton("العربية 🇪🇬", callback_data="lang_ar", style="primary"),
            InlineKeyboardButton("English 🇬🇧", callback_data="lang_en", style="primary")
        ]
    ]
    await update.message.reply_text(
        "🌍 **اختر اللغة / Choose Language:**",
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode=ParseMode.MARKDOWN
    )

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    data = query.data
    
    if data.startswith("lang_"):
        lang = data.replace("lang_", "")
        context.user_data['lang'] = lang
        await safe_answer(query)
        await show_services(query, lang)
    
    elif data.startswith("service_"):
        await safe_answer(query)
        service = data.replace("service_", "")
        lang = context.user_data.get('lang', 'ar')
        await show_countries(query, service, lang)
    
    elif data.startswith("country_"):
        parts = data.split("_", 2)
        service = parts[1]
        country = parts[2]
        lang = context.user_data.get('lang', 'ar')
        await safe_answer(query)
        await show_numbers(query, service, country, lang)
    
    elif data == "check_otp":
        await safe_answer(query)
        await check_otp(query, context)
    
    elif data == "noop":
        await safe_answer(query, get_text(context.user_data.get('lang', 'ar'), "copied"))
    
    elif data == "back_to_services":
        await safe_answer(query)
        lang = context.user_data.get('lang', 'ar')
        await show_services(query, lang)
    
    elif data == "back_to_lang":
        await safe_answer(query)
        keyboard = [
            [
                InlineKeyboardButton("العربية 🇪🇬", callback_data="lang_ar", style="primary"),
                InlineKeyboardButton("English 🇬🇧", callback_data="lang_en", style="primary")
            ]
        ]
        await query.edit_message_text(
            "🌍 **اختر اللغة / Choose Language:**",
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode=ParseMode.MARKDOWN
        )

async def show_services(query, lang):
    services_data = await api_request("GET", "/api/services")
    if not services_data.get("success"):
        await query.edit_message_text(get_text(lang, "error"))
        return
    
    services = services_data.get("services", [])
    keyboard = []
    for service in services:
        name = service.get("name", "Unknown")
        count = service.get("count", 0)
        keyboard.append([InlineKeyboardButton(
            f"📱 {name} ({count})",
            callback_data=f"service_{name}",
            style="primary"
        )])
    
    keyboard.append([InlineKeyboardButton(f"◀️ {get_text(lang, 'back')}", callback_data="back_to_lang", style="danger")])
    
    await query.edit_message_text(
        get_text(lang, "select_service"),
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode=ParseMode.MARKDOWN
    )

async def show_countries(query, service, lang):
    countries_data = await api_request("GET", "/api/countries", params={"service": service})
    if not countries_data.get("success"):
        await query.edit_message_text(get_text(lang, "error"))
        return
    
    countries = countries_data.get("countries", [])
    keyboard = []
    row = []
    for country in countries:
        name = country.get("name", "")
        count = country.get("count", 0)
        display = get_country_display(name, lang)
        row.append(InlineKeyboardButton(
            f"{display} ({count})",
            callback_data=f"country_{service}_{name}",
            style="success"
        ))
        if len(row) == 2:
            keyboard.append(row)
            row = []
    if row:
        keyboard.append(row)
    
    keyboard.append([InlineKeyboardButton(f"◀️ {get_text(lang, 'back')}", callback_data="back_to_services", style="danger")])
    
    await query.edit_message_text(
        get_text(lang, "select_country"),
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode=ParseMode.MARKDOWN
    )

async def show_numbers(query, service, country, lang):
    tasks = [api_request("POST", "/api/request_number", data={"service": service, "country": country}) for _ in range(4)]
    results = await asyncio.gather(*tasks)
    
    numbers = [res["number"] for res in results if res.get("success") and "number" in res]
    
    if not numbers:
        await safe_answer(query, get_text(lang, "no_numbers"), show_alert=True)
        return
    
    c_display = get_country_display(country, lang)
    keyboard = []
    
    num_buttons = []
    for n in numbers:
        clean_num = str(n).replace('+', '').strip()
        
        if CopyTextButton:
            try:
                btn = InlineKeyboardButton(
                    text=f"{clean_num}",
                    copy_text=CopyTextButton(text=clean_num),
                    style="success"
                )
            except Exception:
                btn = InlineKeyboardButton(text=f"{clean_num}", callback_data="noop", style="success")
        else:
            btn = InlineKeyboardButton(text=f"{clean_num}", callback_data="noop", style="success")
        
        num_buttons.append(btn)
        if len(num_buttons) == 2:
            keyboard.append(num_buttons)
            num_buttons = []
    if num_buttons:
        keyboard.append(num_buttons)

    keyboard.append([InlineKeyboardButton(get_text(lang, "get_otp"), callback_data="check_otp", style="primary")])
    keyboard.append([InlineKeyboardButton(get_text(lang, "change_number"), callback_data=f"country_{service}_{country}", style="primary")])
    keyboard.append([InlineKeyboardButton(get_text(lang, "otp_group"), url=OTP_GROUP_URL, style="primary")])
    keyboard.append([InlineKeyboardButton(f"◀️ {get_text(lang, 'back')}", callback_data=f"service_{service}", style="danger")])
    
    await query.edit_message_text(
        get_text(lang, "numbers_ready", c_display, service),
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode=ParseMode.MARKDOWN
    )

async def check_otp(query, context):
    lang = context.user_data.get('lang', 'ar')
    
    otp_res = await api_request("GET", "/api/my_otps", params={"limit": 20})
    
    found_otps = []
    if otp_res.get("success") and otp_res.get("otps"):
        for item in otp_res.get("otps", []):
            num, code = None, None
            if isinstance(item, dict):
                num = str(item.get("number", "")).replace("+", "")
                code = item.get("code") or item.get("otp")
            elif isinstance(item, list) and len(item) >= 3:
                num = str(item[1]).replace("+", "")
                code = item[2]
            
            if num and code:
                found_otps.append(f"📱 Number: `{num}`\n🔑 OTP: `{code}`")

    if found_otps:
        msg = get_text(lang, "otp_received") + "\n\n".join(found_otps[:5])
        await query.message.reply_text(msg, parse_mode=ParseMode.MARKDOWN)
    else:
        await safe_answer(query, get_text(lang, "no_otp"), show_alert=True)

def main():
    logger.info("Starting Telegram Bot Application with 249 countries...")
    application = Application.builder().token(BOT_TOKEN).build()
    
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CallbackQueryHandler(button_handler))
    
    logger.info("Bot successfully started polling!")
    application.run_polling()

if __name__ == "__main__":
    main()

