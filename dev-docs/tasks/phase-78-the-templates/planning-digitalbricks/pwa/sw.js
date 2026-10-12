/* Planning service worker: installability only. It caches nothing — the week lives on the server,
 * and a stale app shell after a redeploy would ask for bundles that no longer exist. */
self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

