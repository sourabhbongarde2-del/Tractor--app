// sw.js — TractorWala Service Worker
// STRATEGY:
// - App shell (html/css/js): NETWORK-FIRST. Yeh app baar-baar update hoti hai (weekly
//   kai commits), isliye cache-first use karte to users purane bugs/features me hamesha
//   phas'te. Network-first ka matlab: online hote hi hamesha LATEST code milta hai,
//   offline hote hi turant cache se fallback ho jata hai - best of both.
// - Static assets (icons/fonts/images): CACHE-FIRST. Yeh kabhi nahi badalte, cache se
//   seedha serve karna fastest hai aur bandwidth bachata hai.
// - Firestore data sync KHUD Firebase SDK handle karta hai (enableIndexedDbPersistence
//   already core.js me hai) - service worker sirf STATIC FILES cache karta hai, data
//   layer ko touch nahi karta.

const CACHE_VERSION = 'tw-v1';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;

const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './css/base.css',
  './css/landing.css',
  './css/invoice.css',
  './css/license.css',
  './css/admin.css',
  './js/core.js',
  './js/firebase-config.js',
  './js/license.js',
  './js/dashboard.js',
  './js/work-entry.js',
  './js/work-list.js',
  './js/rate-card.js',
  './js/payments.js',
  './js/khata.js',
  './js/shetkari.js',
  './js/invoice.js',
  './js/reports.js',
  './js/expenses.js',
  './js/profile.js',
  './js/backup.js',
  './assets/logo/logo.svg',
];

self.addEventListener('install', (e) => {
  self.skipWaiting(); // naya SW turant activate ho, purane pe atka na rahe
  e.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_FILES).catch(() => {
      // koi ek file fail ho (jaise offline pehli baar install ho raha hai) to poora install fail na ho
    }))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith('tw-') && k !== SHELL_CACHE && k !== STATIC_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

function isStaticAsset(url) {
  return /\.(png|jpg|jpeg|svg|gif|webp|woff2?|ttf)$/i.test(url.pathname);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return; // POST/PUT waghera (Firestore calls) touch nahi karna
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Firestore/Firebase Auth calls ko seedha network pe jaane do - service worker
  // beech me nahi aayega, warna auth/realtime data sync tootne ka risk hai.
  // Cross-origin CDN files (fonts/Font Awesome/Firebase SDK) bhi yahin se pass ho
  // jaate hain kyunki neeche dono respondWith blocks sirf sameOrigin pe chalte hain -
  // matlab browser apne normal HTTP cache se unhe handle kar leta hai, jo safe hai.
  if (!sameOrigin && (url.hostname.includes('googleapis.com') || url.hostname.includes('firebaseio.com'))) {
    return;
  }

  if (sameOrigin && isStaticAsset(url)) {
    // Static assets: cache-first
    e.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const resClone = res.clone();
        caches.open(STATIC_CACHE).then((c) => c.put(req, resClone));
        return res;
      }).catch(() => cached))
    );
    return;
  }

  if (sameOrigin || req.mode === 'navigate') {
    // App shell (html/js/css): network-first, cache fallback for offline
    e.respondWith(
      fetch(req).then((res) => {
        const resClone = res.clone();
        caches.open(SHELL_CACHE).then((c) => c.put(req, resClone));
        return res;
      }).catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
    );
  }
});
