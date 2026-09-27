/* todo.digitalbricks.io — the host half of deadline reminders.
 *
 * The template's `Todo/Reminders switch` draws a bell only when this script says it can
 * (`data-reminders` on the root) and hands every press to `window.todoReminders.toggle()`.
 * This script registers the service worker, subscribes the device with the server's push key,
 * and keeps one `PushSubscription` row per device for the signed-in person. The server's
 * `todo-push` sender reads those rows and sends at 9am on the day a task is due.
 */
(function () {
  'use strict';

  var APP_ID = 'todo-list';
  var ROOT = document.documentElement;
  var ATTR = 'data-reminders';
  var ON_KEY = 'todo-reminders-endpoint';
  var COLLECTION = 'PushSubscription';

  var ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  var canPush = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  var busy = false;

  function setState(state) {
    if (state) ROOT.setAttribute(ATTR, state);
    else ROOT.removeAttribute(ATTR);
  }
  function storage(key, value) {
    try {
      if (value === undefined) return window.localStorage.getItem(key);
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    } catch (e) {
      return null;
    }
  }
  function sessionToken() {
    try {
      var raw = window.localStorage['Parse/' + APP_ID + '/currentUser'];
      var user = raw ? JSON.parse(raw) : null;
      return (user && user.sessionToken) || null;
    } catch (e) {
      return null;
    }
  }
  function api(method, path, body) {
    var headers = { 'X-Parse-Application-Id': APP_ID, 'X-Parse-Session-Token': sessionToken() || '' };
    if (body) headers['Content-Type'] = 'application/json';
    return fetch(path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined }).then(function (res) {
      return res.json().then(
        function (json) {
          if (!res.ok) throw new Error((json && json.error) || 'the server said ' + res.status);
          return json;
        },
        function () {
          if (!res.ok) throw new Error('the server said ' + res.status);
          return {};
        }
      );
    });
  }
  function keyBytes(base64url) {
    // Base64 wants a length that is a multiple of 4: an 87-character key needs one '=', not two.
    var padded = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
    var raw = window.atob(padded);
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  function timeZone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch (e) {
      return 'UTC';
    }
  }

  /** Create or update this device's row. Turning off keeps the row with enabled false — nothing is deleted. */
  function save(subscription, enabled) {
    var json = subscription.toJSON();
    var where = encodeURIComponent(JSON.stringify({ endpoint: json.endpoint }));
    var fields = { enabled: enabled, timeZone: timeZone(), p256dh: json.keys.p256dh, auth: json.keys.auth };
    return api('GET', '/classes/' + COLLECTION + '?limit=1&where=' + where).then(function (found) {
      var row = found && found.results && found.results[0];
      if (row) return api('PUT', '/classes/' + COLLECTION + '/' + row.objectId, fields);
      if (!enabled) return null;
      fields.endpoint = json.endpoint;
      fields.device = String(navigator.userAgent || '').slice(0, 160);
      return api('POST', '/classes/' + COLLECTION, fields);
    });
  }

  var ready = canPush
    ? navigator.serviceWorker.register('/sw.js').then(function () {
        return navigator.serviceWorker.ready;
      })
    : Promise.reject(new Error('no push in this browser'));
  ready.catch(function () {});

  function refresh() {
    if (!canPush) {
      setState(ios && !standalone ? 'install' : null);
      return Promise.resolve();
    }
    return ready
      .then(function (registration) {
        return registration.pushManager.getSubscription();
      })
      .then(function (subscription) {
        var on = !!subscription && Notification.permission === 'granted' && storage(ON_KEY) === subscription.endpoint;
        setState(on ? 'on' : 'off');
        // A phone that travelled: keep the time zone the 9am is counted in up to date.
        if (on && sessionToken()) save(subscription, true).catch(function () {});
      })
      .catch(function () {
        setState(null);
      });
  }

  function turnOn() {
    if (!sessionToken()) return Promise.reject(new Error('sign in first'));
    return Notification.requestPermission()
      .then(function (permission) {
        if (permission !== 'granted') {
          throw new Error(
            permission === 'denied'
              ? 'notifications are blocked for this site. Allow them in your browser or phone settings, then press the bell again'
              : 'notifications were not allowed'
          );
        }
        return Promise.all([ready, fetch('/pwa/vapid-public-key.txt', { cache: 'no-store' }).then(function (r) { return r.text(); })]);
      })
      .then(function (both) {
        var registration = both[0];
        var key = both[1].trim();
        return registration.pushManager.getSubscription().then(function (existing) {
          return existing || registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) });
        }).then(function (subscription) {
          return save(subscription, true).then(function () {
            storage(ON_KEY, subscription.endpoint);
            setState('on');
            return registration.showNotification('Reminders are on', {
              body: 'You will get a notification at 9am on the day a task is due.',
              tag: 'todo-reminders-on',
              icon: '/pwa/icon-192.png',
              badge: '/pwa/badge-96.png'
            });
          });
        });
      });
  }

  function turnOff() {
    return ready
      .then(function (registration) {
        return registration.pushManager.getSubscription();
      })
      .then(function (subscription) {
        if (!subscription) return null;
        return save(subscription, false).then(function () {
          return subscription.unsubscribe();
        });
      })
      .then(function () {
        storage(ON_KEY, null);
        setState('off');
      });
  }

  function toggle() {
    if (busy) return;
    var state = ROOT.getAttribute(ATTR);
    if (state === 'install') {
      window.alert('To get reminders on an iPhone, add Todo list to your Home Screen first: tap Share, then “Add to Home Screen”. Open it from there and press the bell.');
      return;
    }
    if (state !== 'on' && state !== 'off') return;
    busy = true;
    (state === 'on' ? turnOff() : turnOn())
      .catch(function (e) {
        window.alert('Could not turn reminders ' + (state === 'on' ? 'off' : 'on') + ': ' + ((e && e.message) || e) + '.');
        return refresh();
      })
      .then(function () {
        busy = false;
      });
  }

  window.todoReminders = { toggle: toggle, refresh: refresh };
  refresh();
})();
