/* Service worker. Caches the app shell so the login and static assets
   load without a network. API calls always go to the network so data
   stays fresh and private. */
var CACHE = 'mera-shell-v1';
var SHELL = [
  '/',
  '/css/styles.css',
  '/js/common.js',
  '/js/i18n.js',
  '/favicon.svg',
  '/manifest.webmanifest',
  '/vendor/leaflet.js',
  '/vendor/leaflet.css',
  '/offline.html'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(SHELL);
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  // Never cache API responses. They may hold private data.
  if (url.pathname.indexOf('/api/') === 0) return;

  // Map tiles: try network, ignore if offline.
  if (url.hostname.indexOf('tile.openstreetmap.org') !== -1) return;

  // Static assets and shell: cache first, then network.
  event.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        return res;
      }).catch(function () {
        if (req.mode === 'navigate') return caches.match('/offline.html');
      });
    })
  );
});
