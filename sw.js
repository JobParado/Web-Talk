const CACHE_NAME = 'webtalk-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/create.html',
  '/homePage.html',
  // '/css/homepage.css',
  // '/css/LoginCreate.css',
  '/images/favicon_io/favicon.ico',
  '/images/favicon_io/android-chrome-192x192.png',
  '/images/favicon_io/android-chrome-512x512.png'

  // '/src/homePage.js',
  // '/src/account/account.js',
  // '/src/account/loginEmail.js',
  // '/src/account/loginGoogle.js',
  // '/src/account/registerEmail.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames
        .filter((cacheName) => cacheName !== CACHE_NAME)
        .map((cacheName) => caches.delete(cacheName))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  if (new URL(event.request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }

        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
