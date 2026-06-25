# TractorWala — Business Manager

Tractor operators ke liye Marathi/Hindi/English business management app. Firebase (Firestore + Auth) backed, GitHub Pages par free host ho sakta hai.

## Folder Structure

```
TractorWala/
├── index.html              ← Poora app (HTML+CSS+JS, ek hi file)
├── firestore.rules         ← Firebase security rules (neeche instructions hai)
├── assets/
│   ├── logo/
│   │   └── logo.svg        ← App ka logo. Yeh file replace karo apna logo lagane ke liye.
│   └── ads/
│       ├── banner1.svg     ← Sample ad banner (dashboard par dikhta hai)
│       ├── banner2.svg     ← Sample ad banner (work-list page par dikhta hai)
│       └── ads-config.json ← Ad banners ki settings (kaunsa banner kaha dikhega)
```

## Logo Kaise Change Karein

1. Apna logo image lo (square shape best hai, jaise 200x200px PNG ya SVG).
2. Usko `assets/logo/` folder me daalo.
3. Agar file ka naam `logo.svg` ya `logo.png` nahi hai, to do jagah file ka naam update karo (`index.html` me Ctrl+F se `assets/logo/logo.svg` dhundo — 2 jagah aayega, dono jagah naya filename daal do).
4. Bas — login page aur sidebar dono jagah naya logo dikhega automatically.

Agar image load nahi hoti (galat path/corrupt file) to app automatically purana tractor icon dikha dega — app kabhi crash nahi hoga.

## Ads Kaise Add/Change Karein (Blinkit-style banners)

Ad banners `assets/ads/ads-config.json` file se control hote hain — code chhedne ki zaroorat nahi.

1. Apni ad image `assets/ads/` folder me daalo (jaise `mera-banner.jpg`).
2. `ads-config.json` open karo, aur ek entry add/edit karo:

```json
{
  "id": "ad3",
  "image": "assets/ads/mera-banner.jpg",
  "link": "https://wa.me/919999999999",
  "active": true,
  "placement": "dashboard-top"
}
```

- **id**: unique naam (jaise `ad1`, `ad2`)
- **image**: file ka path
- **link**: banner click karne par kahan jayega (optional — khali rakho `""` agar click action nahi chahiye)
- **active**: `false` karke banner temporarily band kar sakte ho, code delete nahi karna padega
- **placement**: kaha dikhega — abhi 2 jagah support hai: `dashboard-top` (Dashboard page) aur `work-list-top` (Kaam Yaadi page)

### Ek Slot Me 2+ Banner (Auto-Slide)

Agar **same placement** wale 2 ya zyada banner config me ho, to wo automatically slide hote hain (har 4 second me change, neeche dots dikhte hain konsa banner active hai). Kuch alag se karna nahi padta — sirf dono entries me same `"placement"` value rakho:

```json
{ "id": "ad1", "image": "assets/ads/offer1.jpg", "placement": "dashboard-top", "active": true, "link": "" },
{ "id": "ad1b", "image": "assets/ads/offer2.jpg", "placement": "dashboard-top", "active": true, "link": "" }
```

Upar wala example dikhata hai — 2 banner same `dashboard-top` slot me, to ab Dashboard page par dono apne-aap slide hoke dikhenge.

Banner ka recommended size: **4:1 ratio** (jaise 800x200px) — chhota text wala wide banner sabse acha dikhta hai.

Agar image load nahi hoti, banner khud-ba-khud chhup jata hai (broken image icon kabhi nahi dikhega).

## Firebase Setup

App same Firebase project use karta hai jo pehle se configured tha (`tractor--app`). Koi naya project nahi banana.

### Firestore Security Rules Deploy Karna (ZAROORI)

Maine `firestore.rules` file banayi hai jo data ko owner-only access deti hai. Isse deploy karna zaroori hai:

1. [Firebase Console](https://console.firebase.google.com) kholo → apna project (`tractor--app`) select karo.
2. Left menu me **Firestore Database** → **Rules** tab par jao.
3. `firestore.rules` file ka poora content copy karke wahan paste karo.
4. **Publish** button dabao.

**Yeh rules kya karte hain:** Har document (`works`, `expenses`, `rates`, `shetkari`, `profiles`) me `uid` field check karte hain — sirf wahi logged-in user apna data dekh/badal sakta hai jiska `uid` match karta hai. Koi doosra user, chahe wo bhi login kare, kisi aur ka data access nahi kar sakta.

Agar rules already kuch aur set hain aur change karna ho, mujhe bata dena — main update kar dunga.

## GitHub Pages Par Deploy Karna

1. Is poore folder ko GitHub repo me upload karo (`git init`, `git add .`, `git commit`, `git push`).
2. Repo Settings → Pages → Source me `main` branch select karo, Save karo.
3. Kuch minutes me `https://<username>.github.io/<repo-name>/` par app live ho jayega.
4. Firebase Console → Authentication → Settings → **Authorized domains** me apna GitHub Pages domain add karna na bhoolo, warna Google Login fail hoga.

## Is Update Me Kya Fix Hua

- **Double-tap se duplicate entries** — Payment, Kaam, Kharch, Shetkari, Rate, Profile sab jagah save button ek hi baar process hota hai ab, double-tap karne par bhi duplicate data nahi banega.
- **Duplicate farmer entries** — naam match ab case/space-insensitive hai ("Ramesh" aur "ramesh " ab ek hi farmer maane jayenge).
- **Risky inline data pattern** — naam/notes me special characters (apostrophe waghera) hone par edit button kaam nahi karta tha; ab safe lookup system use hota hai.
- **Raw error messages** — Firebase ke technical error messages (jaise "permission denied") ki jagah ab samajhdar Marathi messages dikhte hain.
- **Offline support** — Firestore offline cache enable kiya hai, taaki net slow/jaane par bhi app khulta rahe (data cache se dikhega, naya data net aane par sync hoga).
- **Landing page redesign** — naya 3-step "kaise kaam karta hai" flow, stats strip, aur swappable logo.
- **Ad banner system** — assets folder se control hone wale banner slots, Blinkit-jaisa.

## Known Limitations (Agla Update Me Karna Hai)

- **Bada data hone par speed**: 500+ kaam entries hone ke baad list load thoda slow ho sakta hai, kyunki abhi poora data ek baar me fetch hota hai. Pagination add karna agla zaroori step hai.
- **GST invoice**: abhi invoice me GST number/tax breakup nahi hai.
- **Multi-day kaam**: ek customer ka 2-3 din ka kaam ek hi entry me track nahi ho sakta, alag-alag entries karni padti hai.
- **Per-customer custom rate**: sab customers ko same rate card lagta hai, regular customer ko discount dene ke liye manually rate change karna padta hai.

Yeh sab agle phase me handle kar sakte hain jab batao.
