/*
 * THE DEMO'S PAGE SIDE (DBU-11), loaded from the demo's head before the app.
 *
 * Starts the service worker that plays the backend (demo-sw.js) and, once it answers, gives the app
 * `window.dbuDemo`: who you are looking as, and the three things the demo's own buttons do (Demo/ components):
 *
 *   dbuDemo.lookAs('camille' | 'richard' | …)  sign in as that person (a stored session, no email) and reload
 *   dbuDemo.reset()                            put the example world back, and reload
 *   dbuDemo.leave()                            sign out, back to the intro
 *
 * The first visit reloads once: a page is only answered by a service worker that started before it.
 * Without service workers (a private window in some browsers) the intro says the demo cannot run here.
 */
(function () {
  'use strict';
  var APP_ID = '__APP_ID__';
  var SESSION_KEY = 'Parse/' + APP_ID + '/currentUser';
  var PERSONA_KEY = 'dbu-demo-persona';
  // Look as …: the next person's session waits under its own key and is moved into place HERE, before the
  // app loads. Written straight into SESSION_KEY, a signed-out page (the intro) re-reads it before the
  // reload and its gate sends it to Home half signed in: calls go out with no session (403), measured
  // on nodegx.io.
  var PENDING_KEY = 'dbu-demo-pending-session';
  var demo = { supported: 'serviceWorker' in navigator, persona: null };
  window.dbuDemo = demo;

  // DEP-001: the viewer reads its backend address from nodegx-config.json beside the page, and the
  // worker answers it with the demo-api folder's ABSOLUTE address (realtime refuses a relative one).
  // A page the worker has not taken yet would read the static file instead ("demo-api"), and its
  // live updates fail with "Backend URL is not a valid http(s) URL" (seen once in five drives under
  // a sub-path). So the page answers that one read itself, the same way, whoever serves it.
  var CONFIG_URL = new URL('nodegx-config.json', document.baseURI).href;
  var pageFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : null;
  if (pageFetch) {
    window.fetch = function (input, init) {
      var asked = typeof input === 'string' ? input : input && input.url;
      try {
        if (asked && new URL(asked, document.baseURI).href.split('?')[0] === CONFIG_URL) {
          var config = { cloudservices: { endpoint: new URL('demo-api', document.baseURI).href, appId: APP_ID, type: '__TYPE__' } };
          return Promise.resolve(new Response(JSON.stringify(config), { headers: { 'content-type': 'application/json' } }));
        }
      } catch (e) {
        /* not a URL this page can read: the browser's own fetch answers */
      }
      return pageFetch(input, init);
    };
  }

  try {
    var pending = localStorage.getItem(PENDING_KEY);
    if (pending) {
      localStorage.setItem(SESSION_KEY, pending);
      localStorage.removeItem(PENDING_KEY);
    }
    demo.persona = localStorage.getItem(PERSONA_KEY);
  } catch (e) {
    /* storage blocked: the intro still shows */
  }

  function ask(type, extra) {
    return navigator.serviceWorker.ready.then(function (reg) {
      return new Promise(function (resolve, reject) {
        var ch = new MessageChannel();
        ch.port1.onmessage = function (e) {
          if (e.data && e.data.error) reject(new Error(e.data.error));
          else resolve(e.data);
        };
        (navigator.serviceWorker.controller || reg.active).postMessage(Object.assign({ type: type }, extra || {}), [ch.port2]);
      });
    });
  }

  function home() {
    // The app's own gate sends staff to Learners and a learner to Home from Sign in.
    // replaceState, not location.hash: a hashchange runs the router on THIS page, as the person who
    // was signed in a moment ago, while the stored session is already the next one (or, after a reset,
    // one the new world never issued). Its calls are refused (403) just before the reload; measured on
    // nodegx.io, where the round trip is long enough for them to land.
    history.replaceState(null, '', '#/sign-in');
    location.reload();
  }

  demo.lookAs = function (key) {
    return ask('session', { userId: 'u-' + key }).then(function (r) {
      if (!r.session) throw new Error('nobody called ' + key + ' in the demo');
      localStorage.setItem(PENDING_KEY, JSON.stringify(r.session));
      localStorage.setItem(PERSONA_KEY, key);
      home();
    });
  };

  demo.reset = function () {
    return ask('reset').then(home);
  };

  demo.leave = function () {
    try {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(PERSONA_KEY);
    } catch (e) {
      /* nothing stored */
    }
    home();
  };

  if (!demo.supported) {
    demo.ready = Promise.resolve(false);
    return;
  }
  demo.ready = navigator.serviceWorker
    .register('demo-sw.js')
    .then(function () {
      if (navigator.serviceWorker.controller) return ask('ready').then(function () { return true; });
      // First visit: wait for the worker to take this page, then load the app again under it.
      return new Promise(function () {
        navigator.serviceWorker.addEventListener('controllerchange', function () { location.reload(); });
      });
    })
    .catch(function (e) {
      console.error('[dbu demo] the demo backend could not start', e);
      demo.supported = false;
      return false;
    });
})();
