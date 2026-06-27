# TractorWala — Business Manager (v5.0)

Tractor operators ke liye Marathi/Hindi/English business management app. Firebase (Firestore + Auth) backed.

## Is Update Me Naya Kya Hai (v5.0)

### 1. Trial + Lock + Monthly Subscription System (बहुत महत्वाचा)
- Login ke 7 din baad auto-trial-expire, fir poora app lock
- Lock screen pe QR code (`assets/payment/payment-qr.png` — apna QR daalo) + Unlock Code box
- **Hidden Admin Panel** (`admin-panel.html` — GitHub upload karte waqt naam badal dena!) jaha se customer ka email daalke unique 30-din ka code generate hota hai
- Security: Firestore Security Rules (server-side, Google ke server pe) verify karte hain — koi bhi browser console se bypass nahi kar sakta
- Har 5 minute me license status auto-recheck hota hai (app khula rehte hue bhi expire ho jaye to lock ho jayega)

**ZAROORI SETUP:**
1. `firestore.rules` naye sirf se deploy karo (Console → Firestore → Rules)
2. `assets/payment/payment-qr.png` me apna real UPI QR daalo
3. `admin-panel.html` ka naam badal do kisi secret naam se (jaise `xyz-9281.html`) — kahin link nahi hai, sirf tumhe URL pata hona chahiye
4. Admin panel sirf `sourabhbongarde2@gmail.com` se login hone par kaam karega (code me hardcoded hai)

### 2. Work Entry — Multi-Work Billing
Ek hi farmer ka 2-3 kaam (jaise same din alag-alag fields me kaam) ek session me add kar sakte ho — "आणखी काम जोडा" button se naya row aata hai, "सेव्ह करा" sabko ek saath save kar deta hai (alag-alag entries ke roop me, lekin ek hi baar form bharna padta hai).

### 3. Phone Contacts Import
Customer ka naam/number daalte waqt "📇" (contacts) button se phone ke contacts se directly select kar sakte ho (Android Chrome pe kaam karta hai; jis browser me support nahi hai wahan button khud-ba-khud chhup jata hai). Dropdown me already-saved farmers bhi dikhte hain jaise pehle se tha.

### 4. Invoice — Naya Farmer-First Flow
Pehle: kaam-dropdown se search karna padta tha.
Ab: seedha **farmer-list** dikhti hai (kis ka kitna baki hai, sabse upar). Farmer pe click karo to unke **sirf unpaid kaam** checkbox-list me dikhte hain (sab by-default selected). Jo kaam chuno unka ek consolidated invoice ban jata hai. Single-work invoice (Work List/Dashboard ke "Invoice" button se) bhi available hai jaisa pehle tha.

## Folder Structure

```
TractorWala/
├── index.html              ← Customer-facing app shell
├── admin-panel.html        ← Hidden admin panel (RENAME karo upload se pehle!)
├── firestore.rules         ← Security rules (license system bhi isme hai)
├── css/
│   ├── base.css, landing.css, invoice.css, license.css, admin.css
├── js/
│   ├── firebase-config.js, core.js, license.js     ← Shared/core
│   ├── dashboard.js, work-entry.js, work-list.js
│   ├── rate-card.js, expenses.js, payments.js
│   ├── invoice.js, shetkari.js, khata.js
│   ├── reports.js, backup.js, profile.js
│   └── admin.js            ← Admin panel logic
└── assets/
    ├── logo/logo.svg
    ├── ads/ (banners + ads-config.json)
    └── payment/payment-qr.png  ← Apna UPI QR yahan daalo
```

## Logo/Ads Setup
(Pehle jaisa hi — README ke purane version me detail hai, koi change nahi)

## Firebase Setup

Same project (`tractor--app`). **Naye rules deploy karna ZAROORI hai** — `licenses` aur `unlockCodes` collections ke bina trial/lock system kaam nahi karega.

## GitHub Pages Deploy

Pehle jaisa hi — poora folder upload karo (sub-folders ke saath), Pages enable karo, Authorized domains me domain add karo. **Extra step:** `admin-panel.html` ka naam upload karne se pehle badal do.

## Known Limitations
- Bade data (500+ kaam) hone par list load thoda slow ho sakta hai
- GST invoice fields abhi nahi hai
- Naya Google account banake fresh-trial milna technically possible hai (koi bhi free-trial app me yeh limitation hota hai, phone-verification ke bina rokna mushkil hai)
