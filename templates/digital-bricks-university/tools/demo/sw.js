/*
 * THE DEMO'S SERVICE WORKER (DBU-11): the backend, for one browser.
 *
 * Every request under <scope>/demo-api/ is answered by the engine (engine.js, above in the built file); every
 * other request goes to the network untouched, and nothing is cached, so a redeploy is never a stale app.
 * The world lives in IndexedDB (`dbu-demo`): one record holds the rows, another store the files' bytes.
 * The page talks to it through boot.js: `reset`, `session` (a persona's stored session), `people`.
 */
/* global DBU_DEMO, DbuDemoEngine */
(function () {
  'use strict';
  var DB = 'dbu-demo';
  var API = new URL('demo-api/', self.registration.scope).pathname;
  var CONFIG = new URL('nodegx-config.json', self.registration.scope).pathname;

  function idb() {
    return new Promise(function (resolve, reject) {
      var open = indexedDB.open(DB, 1);
      open.onupgradeneeded = function () {
        open.result.createObjectStore('state');
        open.result.createObjectStore('files');
      };
      open.onsuccess = function () { resolve(open.result); };
      open.onerror = function () { reject(open.error); };
    });
  }
  function tx(store, mode, work) {
    return idb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(store, mode);
        var r = work(t.objectStore(store));
        t.oncomplete = function () { resolve(r && 'result' in r ? r.result : undefined); };
        t.onerror = function () { reject(t.error); };
      });
    });
  }

  var engine = DbuDemoEngine.createEngine({
    graphs: DBU_DEMO.graphs,
    policy: DBU_DEMO.policy,
    buildWorld: function (at) { return DBU_DEMO.buildWorld(at, DBU_DEMO.sources); },
    resolveRows: DBU_DEMO.resolveRows,
    appUrl: function () { return new URL('./', self.registration.scope).href.replace(/\/$/, ''); },
    log: function (s) { console.log('[dbu demo backend]', s); },
    fixtureFile: function (name) {
      return fetch(new URL('demo/files/' + encodeURIComponent(name), self.registration.scope), { cache: 'no-store' })
        .then(function (r) {
          if (!r.ok) throw new Error('fixture ' + name + ' answered ' + r.status);
          return r.arrayBuffer();
        })
        .then(function (b) { return new Uint8Array(b); });
    },
    load: function () { return tx('state', 'readonly', function (s) { return s.get('world'); }); },
    save: function (state) { return tx('state', 'readwrite', function (s) { s.put(state, 'world'); }); },
    files: {
      put: function (name, bytes, contentType) {
        return tx('files', 'readwrite', function (s) { s.put({ bytes: bytes, contentType: contentType }, name); });
      },
      get: function (name) { return tx('files', 'readonly', function (s) { return s.get(name); }); },
      clear: function () { return tx('files', 'readwrite', function (s) { s.clear(); }); }
    }
  });

  self.addEventListener('install', function () { self.skipWaiting(); });
  self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

  self.addEventListener('fetch', function (event) {
    var url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return;
    if (url.pathname === CONFIG) {
      // DEP-001: the viewer reads its backend address from nodegx-config.json beside the page. This one names
      // the demo's own folder, wherever it is served (the preview harness, a folder on nodegx.io).
      event.respondWith(new Response(JSON.stringify({ cloudservices: Object.assign({}, DBU_DEMO.cloudservices, { endpoint: new URL('demo-api', self.registration.scope).href }) }), {
        headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
      }));
      return;
    }
    if (url.pathname.indexOf(API) !== 0) return;
    var rest = url.pathname.slice(API.length - 1);
    if (rest === '/realtime' && event.request.method === 'GET') return event.respondWith(openStream());
    if (rest === '/realtime/subscriptions' && event.request.method === 'POST') return event.respondWith(subscribe(event.request));
    event.respondWith(answer(event.request));
  });

  /*
   * LIVE UPDATES: the backend's server-sent events, as NODEGX_SSE in the runtime reads them. A stream says
   * `connected {clientId}`; a POST names the collections it wants (it replaces the set) and is answered
   * `accepted[]`; every write the engine makes reaches the streams that asked for its collection as
   * `change {action, collection, record}`. One worker serves every tab of the demo, so Camille in one tab and
   * Richard in another see each other's work arrive, as on the real backend. Row ACLs are not checked: a
   * change frame only makes a page read again, through its functions.
   */
  var streams = {};
  var enc = new TextEncoder();
  function frame(name, data) {
    return enc.encode('event: ' + name + '\ndata: ' + JSON.stringify(data) + '\n\n');
  }
  function openStream() {
    var id = 'demo-' + Math.random().toString(36).slice(2, 10);
    var body = new ReadableStream({
      start: function (c) {
        streams[id] = { c: c, subs: {} };
        c.enqueue(frame('connected', { clientId: id }));
      },
      cancel: function () { delete streams[id]; }
    });
    return new Response(body, { headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-store' } });
  }
  function subscribe(request) {
    return request.json().then(function (b) {
      var s = streams[b && b.clientId];
      var asked = (b && b.subscriptions) || [];
      if (!s) {
        return Response.json({ accepted: [], rejected: asked.map(function (x) { return { collection: x.collection, reason: 'unknown client' }; }) });
      }
      s.subs = {};
      asked.forEach(function (x) { s.subs[x.collection] = true; });
      return Response.json({ accepted: asked.map(function (x) { return { collection: x.collection }; }), rejected: [] });
    });
  }
  engine.onChange(function (collection, row, action) {
    Object.keys(streams).forEach(function (id) {
      var s = streams[id];
      if (!s.subs[collection]) return;
      try {
        s.c.enqueue(frame('change', { action: action || 'update', collection: collection, record: row }));
      } catch (e) {
        delete streams[id];
      }
    });
  });

  function answer(request) {
    var headers = {};
    request.headers.forEach(function (v, k) { headers[k.toLowerCase()] = v; });
    var body = request.method === 'GET' || request.method === 'HEAD' ? Promise.resolve(new ArrayBuffer(0)) : request.arrayBuffer();
    return body
      .then(function (buf) {
        var bytes = new Uint8Array(buf);
        return engine.handle({ method: request.method, url: request.url, headers: headers, bytes: bytes, body: new TextDecoder().decode(bytes) });
      })
      .then(function (r) {
        return new Response(r.body, { status: r.status, headers: r.headers });
      })
      .catch(function (e) {
        console.error('[dbu demo backend]', e);
        return new Response(JSON.stringify({ error: 'The demo backend failed: ' + ((e && e.message) || e) }), {
          status: 500, headers: { 'content-type': 'application/json' }
        });
      });
  }

  self.addEventListener('message', function (event) {
    var msg = event.data || {};
    var reply = function (v) { if (event.ports[0]) event.ports[0].postMessage(v); };
    var work;
    if (msg.type === 'ready') work = engine.ready().then(function () { return { ok: true }; });
    else if (msg.type === 'reset') work = engine.reset().then(function () { return { ok: true }; });
    else if (msg.type === 'session') work = engine.ready().then(function () { return { session: engine.session(msg.userId) }; });
    else if (msg.type === 'people') work = engine.ready().then(function () { return { people: engine.people() }; });
    else work = Promise.resolve({ error: 'unknown message ' + msg.type });
    event.waitUntil(work.then(reply, function (e) { reply({ error: String((e && e.message) || e) }); }));
  });
})();
