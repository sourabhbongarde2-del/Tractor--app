# TractorWala — Business Manager (v4.0)

Tractor operators ke liye Marathi/Hindi/English business management app. Firebase (Firestore + Auth) backed, GitHub Pages par free host ho sakta hai.

## Folder Structure (Multi-file — har page alag)

```
TractorWala/
├── index.html              ← App shell (sidebar, nav, modals) - sirf yeh load hota hai
├── firestore.rules         ← Firebase security rules
├── css/
│   ├── base.css            ← Design tokens, layout, sidebar, cards, buttons, forms
│   ├── landing.css         ← Login page design
│   └── invoice.css         ← Invoice design
├── js/
│   ├── firebase-config.js  ← Firebase init (auth/db)
│   ├── core.js             ← Shared state, helpers, router, login/logout
│   ├── dashboard.js        ← Dashboard page
│   ├── work-entry.js       ← Naya kaam record karna
│   ├── work-list.js        ← Kaam ki list (flat + customer-wise grouped)
│   ├── rate-card.js        ← Dar card (rate management)
│   ├── expenses.js         ← Kharch
│   ├── payments.js         ← Payments page + universal payment-add modal
│   ├── invoice.js          ← Invoice banana (single + consolidated) + PDF/WA
│   ├── shetkari.js         ← Shetkari DB (farmer directory)
│   ├── khata.js            ← NAYA: Farmer Khata (ledger) page
│   ├── reports.js          ← Reports page
│   ├── backup.js           ← Backup/Restore
│   └── profile.js          ← Business profile + language switch
└── assets/
    ├── logo/logo.svg       ← App logo - replace karke apna lagao
    └── ads/                ← Banner images + ads-config.json
```

**Kuch fix karna ho ek specific page ka, to sirf usi page ki `.js` file kholo** — baki kuch chedne ki zaroorat nahi. Jaise sirf Invoice ka design badalna hai to `js/invoice.js` aur `css/invoice.css` hi chahiye.

## Is Update Me Naya Kya Hai (v4.0)

### 1. Farmer Khata (Ledger) Page — bilkul naya
Kisi bhi farmer ke naam par click karo (Shetkari DB, Work List, Payments, Reports — kahin se bhi) to **Khata page** khulta hai:
- Total kaam, total jama, baki rakam — sab top par
- Sab kaam ki list, har ek ka status (paid/pending)
- Seedha payment add karne ka button
- WhatsApp se baki ka reminder bhejne ka button
- **Date-range Consolidated Invoice** — kisi bhi period ka poora khata ek invoice me

Bottom-nav me "खाता" button dabane se farmer-picker list khulti hai agar koi farmer pehle se select nahi hai.

### 2. Naya Modern Invoice Design
- Clean professional look — header band, customer/work info boxes, proper table, summary box
- **Developer credit** har invoice me (text WhatsApp message, PDF, aur Image teeno me) — "Developed by Sourabh Bongarde · Bongarde Software Solutions Pvt. Ltd."
- **Consolidated invoice**: ek farmer ka date-range ka sara kaam ek hi bill me, Khata page se 1-tap

### 3. WhatsApp + PDF Flow
"WhatsApp वर पाठवा" button dabane se:
1. PDF turant download ho jaati hai
2. 1.5 second baad WhatsApp khud khulta hai, customer ka number aur message already bhara hua
3. Tumhe sirf downloaded PDF ko manually attach karna hai

**Zaroori baat:** Koi bhi website/app browser se seedha WhatsApp ke attachment me file daal nahi sakta — yeh sabhi browsers ki security restriction hai (Swiggy, Zomato, banks — koi bhi app yeh nahi kar sakta). Isliye PDF manually attach karna padega, lekin baaki sab kaam (download + WhatsApp khulna + number/message bharna) automatic hai.

### 4. Banner Sab 11 Pages Par
Pehle sirf Dashboard aur Work List par banner tha. Ab **har page** (Work Entry, Rate Card, Expenses, Payments, Invoice, Shetkari, Khata, Reports, Backup, Profile) par banner slot hai. `assets/ads/ads-config.json` me `placement` field se control hota hai.

### 5. Nav Shortcuts
Bottom-nav me sabse zyada use hone wale 5: **Dashboard, Kaam, Payments, Khata, Shetkari**. Baki sab (Rate Card, Expenses, Invoice, Reports, Backup, Profile) sidebar me hai.

### 6. Auto-Backup
Har save/edit/delete ke baad background me chhota snapshot Firestore ke `backups` collection me likha jata hai — silently, bina kisi delay ke. Ismein koi UI nahi hai abhi, yeh sirf extra safety copy hai.

## Logo Kaise Change Karein

1. Apna logo image (square shape best, jaise 200x200px) `assets/logo/` me daalo.
2. File ka naam `logo.svg` ya `logo.png` rakhna hai — agar alag naam hai, to `index.html` aur `js/invoice.js` me `assets/logo/logo.svg` ko apne naye filename se replace karo (3 jagah aayega).
3. Login page, sidebar, aur invoice — teeno jagah naya logo dikhega.

Image load na ho to app khud tractor icon dikha dega, crash nahi hoga.

## Ads Kaise Add/Change Karein

`assets/ads/ads-config.json` me banners control hote hain — code chedne ki zaroorat nahi.

```json
{ "id": "ad15", "image": "assets/ads/mera-banner.jpg", "link": "", "active": true, "placement": "dashboard-top" }
```

**placement** options (12 total): `dashboard-top`, `work-entry-top`, `work-list-top`, `rate-card-top`, `expenses-top`, `payments-top`, `invoice-top`, `shetkari-top`, `khata-top`, `reports-top`, `backup-top`, `profile-top`

Same placement me 2+ banner ho to apne-aap slide hote hain (4 second interval, dots dikhte hain).

Recommended size: **2:1 ratio** (jaise 1774x887, jo already use kar rahe ho).

## Firebase Setup

Same Firebase project use ho raha hai (`tractor--app`) — koi naya project nahi banaya.

### Firestore Rules Deploy Karna (ZAROORI)

1. [Firebase Console](https://console.firebase.google.com) → apna project → **Firestore Database** → **Rules** tab
2. `firestore.rules` ka poora content paste karo → **Publish**

Naye rules me **`backups` collection** ka access bhi add kiya hai (auto-backup feature ke liye) — agar purane rules already deploy kiye the, dobara deploy karna padega warna auto-backup silently fail hoga.

## GitHub Pages Deploy

Pehle jaisa hi process — poora folder (sub-folders ke saath: `css/`, `js/`, `assets/`) upload karo, **Settings → Pages** me enable karo, aur Firebase **Authorized domains** me apna GitHub Pages domain add karo.

⚠️ Is baar **`js/` folder** bhi hai (14 files) — saari files apne respective sub-folder ke andar hi rakhna, warna `import` paths break ho jayenge.

## Known Limitations (Agla Update Me)

- Bade data (500+ kaam) hone par list load thoda slow ho sakta hai — pagination agla zaroori step hai.
- GST invoice fields (GST number, tax breakup) abhi nahi hai.
- Multi-day kaam ek hi entry me track nahi hota.
- Per-customer custom rate ka option nahi — sabko same rate card.
