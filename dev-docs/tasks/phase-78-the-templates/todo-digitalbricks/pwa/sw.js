/* Todo list service worker: installability, and showing the deadline reminders the server pushes.
 * It caches nothing — the list lives on the server, and a stale app shell after a redeploy would
 * ask for bundles that no longer exist. */
self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
  var data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Todo list', {
      body: data.body || '',
      tag: data.tag || 'todo-list',
      icon: '/pwa/icon-192.png',
      badge: '/pwa/badge-96.png',
      data: { url: data.url || '/todo-list' }
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/todo-list';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windows) {
      for (var i = 0; i < windows.length; i++) {
        if ('focus' in windows[i]) return windows[i].focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
