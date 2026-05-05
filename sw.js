const CACHE_NAME = 'webtalk-v2';
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
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
