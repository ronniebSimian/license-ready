// Offline support. tools/build.mjs rewrites VERSION and ASSETS whenever content changes.
const VERSION = 'dd6b809fb0';
const ASSETS = ["./",
  "css/app.css",
  "favicon.ico",
  "i18n/ar.json",
  "i18n/en.json",
  "i18n/es.json",
  "i18n/ru.json",
  "i18n/sw.json",
  "i18n/zh.json",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon.svg",
  "icons/maskable-512.png",
  "icons/maskable.svg",
  "index.html",
  "js/app.js",
  "js/srs.js",
  "js/store.js",
  "manifest.webmanifest",
  "states/idaho/facts.ar.json",
  "states/idaho/facts.en.json",
  "states/idaho/facts.es.json",
  "states/idaho/facts.ru.json",
  "states/idaho/facts.sw.json",
  "states/idaho/facts.zh.json",
  "states/idaho/signs/I-13.svg",
  "states/idaho/signs/R1-1.svg",
  "states/idaho/signs/R1-2.svg",
  "states/idaho/signs/R10-12.svg",
  "states/idaho/signs/R11-2.svg",
  "states/idaho/signs/R11-4.svg",
  "states/idaho/signs/R2-1.svg",
  "states/idaho/signs/R2-3P.svg",
  "states/idaho/signs/R2-4.svg",
  "states/idaho/signs/R3-1.svg",
  "states/idaho/signs/R3-2.svg",
  "states/idaho/signs/R3-4.svg",
  "states/idaho/signs/R3-5L.svg",
  "states/idaho/signs/R3-5R.svg",
  "states/idaho/signs/R3-5a.svg",
  "states/idaho/signs/R4-11.svg",
  "states/idaho/signs/R4-7.svg",
  "states/idaho/signs/R5-1.svg",
  "states/idaho/signs/S1-1-W16-7P.svg",
  "states/idaho/signs/S1-1.svg",
  "states/idaho/signs/W1-4b.svg",
  "states/idaho/signs/W10-1.svg",
  "states/idaho/signs/W11-2.svg",
  "states/idaho/signs/W11-3.svg",
  "states/idaho/signs/W11-4.svg",
  "states/idaho/signs/W12-2.svg",
  "states/idaho/signs/W14-3.svg",
  "states/idaho/signs/W16-1P.svg",
  "states/idaho/signs/W2-1.svg",
  "states/idaho/signs/W2-4.svg",
  "states/idaho/signs/W20-7a.svg",
  "states/idaho/signs/W3-3.svg",
  "states/idaho/signs/W4-1.svg",
  "states/idaho/signs/W4-2.svg",
  "states/idaho/signs/W4-3.svg",
  "states/idaho/signs/W6-1.svg",
  "states/idaho/signs/W6-2.svg",
  "states/idaho/signs/W6-3.svg",
  "states/idaho/signs/W7-1.svg",
  "states/idaho/signs/W8-5.svg",
  "states/idaho/state.json"];
const CACHE = `license-ready-${VERSION}`;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('license-ready-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Cache first (everything is precached), falling back to the network and caching what it returns.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  })));
});
