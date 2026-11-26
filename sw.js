// MISTFALL offline support. The game is one file, kept in a cache so it opens with no connection.
// It stays on the version it has until the player taps "Update now" in the game, which asks this worker to fetch
// the new version. Saves live in the browser's own storage and are never touched here.
var CACHE = 'mistfall-app';
var FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.match('./index.html').then(function (have) { return have ? null : c.addAll(FILES); });
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('message', function (e) {
  if (e.data !== 'mf-update') return;
  var src = e.source;
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(FILES.map(function (f) {
      return fetch(f, { cache: 'no-store' }).then(function (r) { if (r && r.ok) return c.put(f === './' ? './index.html' : f, r); });
    }));
  }).then(function () { if (src) src.postMessage('mf-updated'); }).catch(function () { if (src) src.postMessage('mf-updated'); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request, u = new URL(req.url);
  if (req.method !== 'GET' || u.origin !== self.location.origin) return;
  if (/version\.json$/.test(u.pathname)) return;
  var page = req.mode === 'navigate' || /\/(index\.html)?$/.test(u.pathname);
  var key = page ? './index.html' : req;
  e.respondWith(caches.match(key).then(function (hit) {
    return hit || fetch(req).then(function (r) {
      if (r && r.ok) { var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(key, copy); }); }
      return r;
    });
  }));
});
