/*
 * THE DEMO'S BACKEND, IN THE BROWSER (DBU-11).
 *
 * The browser-only demo on nodegx.io has no server. This engine stands where the NodeGX backend stands and
 * answers what it answers, by running THE TEMPLATE'S OWN CLOUD FUNCTIONS (components/__cloud__, read at build
 * time by tools/build-demo.mjs) against a store seeded from backend/fixtures (tools/lib/world.mjs, the same
 * builder setup-backend uses). Nothing here re-implements a function: change one in the template, rebuild the
 * demo, and the demo follows.
 *
 * What it provides, and nothing more (each one the backend's, measured in OpenNoodl's sources):
 *  - Noodl.Records.query / create / save / delete / count with `plain` rows, `equalTo`, `notEqualTo`,
 *    `containedIn`, `notContainedIn`, `exists`, the four comparisons, `and` / `or`, and `ifMatch`.
 *  - The cloud graph: Request (contract, session), Response (200 {result} / 400 {error}), Function
 *    (`run` or run-on-change, signals, `failure` on a throw), component instances, and Create User, Get User
 *    Roles, Add User To Role, List Users In Role.
 *  - The function policy of nodegx.security.json (`authenticated`, `role:<name>`, `nobody`, `public`).
 *  - Files: a private upload with the backend's sniffing and stored names, signed links, downloads.
 *  - A mailer that keeps what it would send in an outbox (`_noodl_send_email`), and the `appUrl` secret.
 *
 * ACLs are not enforced: no client reads a collection (one gate, DBU-01), and functions run with the master key
 * on the backend too. Environment-agnostic: the service worker (tools/demo/sw.js) and tools/check-demo.mjs both
 * build it with createEngine(...).
 */
/* eslint-disable no-var */
(function (root) {
  'use strict';

  var STATE_VERSION = 1;

  function clone(v) {
    return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  }

  function hex(n) {
    var s = '';
    for (var i = 0; i < n; i++) s += Math.floor(Math.random() * 16).toString(16);
    return s;
  }

  function newId() {
    var a = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var s = '';
    for (var i = 0; i < 10; i++) s += a[Math.floor(Math.random() * a.length)];
    return s;
  }

  /* ---------- the backend's content sniffing (nodegx-backend storage/sniff.ts) ---------- */
  function sniff(b, name) {
    var ascii = function (from, to) {
      var s = '';
      for (var i = from; i < to && i < b.length; i++) s += String.fromCharCode(b[i]);
      return s;
    };
    if (b.length >= 8 && b[0] === 0x89 && ascii(1, 4) === 'PNG') return 'image/png';
    if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
    if (ascii(0, 6) === 'GIF87a' || ascii(0, 6) === 'GIF89a') return 'image/gif';
    if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
    if (b.length >= 2 && b[0] === 0x42 && b[1] === 0x4d) return 'image/bmp';
    if (ascii(0, 5) === '%PDF-') return 'application/pdf';
    if (b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07)) return 'application/zip';
    if ((b.length >= 3 && b[0] === 0xff && (b[1] & 0xe0) === 0xe0) || ascii(0, 3) === 'ID3') return 'audio/mpeg';
    if (b.length >= 4 && b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0) return 'image/x-icon';
    var n = Math.min(b.length, 4096);
    for (var i = 0; i < n; i++) {
      var c = b[i];
      if (c === 0 || c < 0x09 || (c > 0x0d && c < 0x20)) return 'application/octet-stream';
    }
    var text = new TextDecoder().decode(b.subarray ? b.subarray(0, Math.min(b.length, 512)) : b).replace(/^\s+/, '');
    if (text.indexOf('<?xml') === 0 || /^<svg[\s>]/i.test(text)) return 'image/svg+xml';
    if (b.length === 0) return 'text/plain';
    try {
      JSON.parse(new TextDecoder().decode(b));
      return 'application/json';
    } catch (e) {
      /* not JSON */
    }
    var lower = String(name || '').toLowerCase();
    if (/\.csv$/.test(lower)) return 'text/csv';
    if (/\.html?$/.test(lower)) return 'text/html';
    if (/\.css$/.test(lower)) return 'text/css';
    if (/\.js$/.test(lower)) return 'text/javascript';
    return 'text/plain';
  }

  /* ---------- where clauses (the Noodl query format the scripts write) ---------- */
  function same(a, b) {
    if (a && typeof a === 'object' && a.objectId !== undefined) a = a.objectId;
    if (b && typeof b === 'object' && b.objectId !== undefined) b = b.objectId;
    if (a instanceof Date) a = a.toISOString();
    if (b instanceof Date) b = b.toISOString();
    return a === b;
  }
  function cmp(a, b) {
    if (a instanceof Date) a = a.toISOString();
    if (b instanceof Date) b = b.toISOString();
    return a < b ? -1 : a > b ? 1 : 0;
  }
  function matches(row, where) {
    if (!where) return true;
    for (var key in where) {
      var c = where[key];
      if (key === 'and') {
        if (!c.every(function (w) { return matches(row, w); })) return false;
        continue;
      }
      if (key === 'or') {
        if (!c.some(function (w) { return matches(row, w); })) return false;
        continue;
      }
      var v = row[key];
      if (c === null || typeof c !== 'object' || Array.isArray(c)) {
        if (!same(v, c)) return false;
        continue;
      }
      for (var op in c) {
        var x = c[op];
        var ok;
        switch (op) {
          case 'equalTo': ok = same(v, x); break;
          case 'notEqualTo': ok = !same(v, x); break;
          case 'containedIn': ok = (x || []).some(function (y) { return same(v, y); }); break;
          case 'notContainedIn': ok = !(x || []).some(function (y) { return same(v, y); }); break;
          case 'exists': ok = x ? v !== undefined && v !== null : v === undefined || v === null; break;
          case 'greaterThan': ok = v !== undefined && v !== null && cmp(v, x) > 0; break;
          case 'greaterThanOrEqualTo': ok = v !== undefined && v !== null && cmp(v, x) >= 0; break;
          case 'lessThan': ok = v !== undefined && v !== null && cmp(v, x) < 0; break;
          case 'lessThanOrEqualTo': ok = v !== undefined && v !== null && cmp(v, x) <= 0; break;
          default: throw new Error('demo backend: the query operator "' + op + '" is not supported');
        }
        if (!ok) return false;
      }
    }
    return true;
  }

  function sortRows(list, sort) {
    if (!sort) return list;
    var keys = [].concat(sort);
    return list.slice().sort(function (a, b) {
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        var desc = k[0] === '-';
        if (desc) k = k.slice(1);
        var r = cmp(a[k] === undefined ? null : a[k], b[k] === undefined ? null : b[k]);
        if (r) return desc ? -r : r;
      }
      return 0;
    });
  }

  /** What `Records.create` resolves to: the row, plus the Model methods a script might call on it. */
  function asModel(row) {
    var m = clone(row);
    Object.defineProperty(m, 'id', { value: row.objectId, enumerable: false });
    Object.defineProperty(m, 'getId', { value: function () { return row.objectId; }, enumerable: false });
    Object.defineProperty(m, 'get', { value: function (k) { return m[k]; }, enumerable: false });
    return m;
  }

  function createEngine(opts) {
    var graphs = opts.graphs; // { '<component path>': { nodes, connections } }
    var policy = opts.policy || {};
    var now = opts.now || function () { return new Date(); };
    var log = opts.log || function () {};
    var state = null;
    var saving = Promise.resolve();
    var listeners = [];

    /* ---------- the store ---------- */
    function table(c) {
      if (!state.rows[c]) state.rows[c] = {};
      return state.rows[c];
    }
    function persist() {
      var snapshot = state;
      saving = saving.then(function () { return opts.save(snapshot); }).catch(function (e) { log('save failed', e); });
      return saving;
    }
    function changed(collection, row, action) {
      listeners.forEach(function (fn) {
        try { fn(collection, clone(row), action); } catch (e) { /* a listener never fails a write */ }
      });
    }

    var Records = {
      query: async function (className, where, options) {
        if (className === undefined) throw new Error("'className' is undefined");
        var all = Object.values(table(className)).filter(function (r) { return matches(r, where); });
        all = sortRows(all, options && options.sort);
        var skip = (options && options.skip) || 0;
        var limit = options && options.limit !== undefined ? options.limit : 100;
        return clone(all.slice(skip, skip + limit));
      },
      count: async function (className, where) {
        return Object.values(table(className)).filter(function (r) { return matches(r, where); }).length;
      },
      fetch: async function (id, options) {
        var className = options && options.className;
        var row = className && table(className)[id];
        if (!row) throw new Error('Object not found.');
        return clone(row);
      },
      create: async function (className, properties) {
        if (className === undefined) throw new Error("'className' is undefined");
        var at = now().toISOString();
        var row = { objectId: newId() };
        var props = clone(properties || {});
        for (var k in props) if (props[k] !== undefined) row[k] = props[k];
        row.createdAt = at;
        row.updatedAt = at;
        table(className)[row.objectId] = row;
        persist();
        changed(className, row, 'create');
        return asModel(row);
      },
      save: async function (id, properties, options) {
        if (typeof id !== 'string') id = id && (id.objectId || (id.getId && id.getId()));
        var className = options && options.className;
        if (!className) throw new Error('No class name specified');
        var row = table(className)[id];
        if (!row) throw new Error('Object not found.');
        var ifMatch = options && options.ifMatch;
        if (ifMatch) {
          for (var f in ifMatch) {
            if (!same(row[f] === undefined ? null : row[f], ifMatch[f])) {
              var err = new Error('The record changed since it was read.');
              err.code = 'precondition-failed';
              err.expected = ifMatch;
              throw err;
            }
          }
        }
        var props = clone(properties || {});
        for (var k in props) if (props[k] !== undefined) row[k] = props[k];
        row.updatedAt = now().toISOString();
        persist();
        changed(className, row, 'update');
      },
      delete: async function (id, options) {
        if (typeof id !== 'string') id = id && (id.objectId || (id.getId && id.getId()));
        var className = options && options.className;
        if (!className) throw new Error('No class name specified');
        var gone = table(className)[id];
        if (!gone) throw new Error('Object not found.');
        delete table(className)[id];
        persist();
        changed(className, gone, 'delete');
      }
    };

    /* ---------- users, roles, sessions ---------- */
    function userById(id) {
      return id ? table('_User')[id] || null : null;
    }
    function rolesOf(id) {
      var roles = [];
      for (var name in state.roles) if (state.roles[name].indexOf(id) >= 0) roles.push(name);
      return roles;
    }
    /** A demo session token names its user: there is no secret to keep in a browser that holds the whole world. */
    function tokenFor(userId) {
      return 'demo-session-' + userId;
    }
    function userForToken(token) {
      var m = /^demo-session-(.+)$/.exec(String(token || ''));
      return m ? userById(m[1]) : null;
    }
    function publicUser(u) {
      var out = clone(u);
      delete out.ACL;
      return out;
    }

    /* ---------- secrets and mail ---------- */
    var secrets = function () {
      return { appUrl: opts.appUrl ? opts.appUrl() : 'https://nodegx.io/templates/digital-bricks-university' };
    };
    var cloudGlobals = {
      _noodl_get_secret: function (name) {
        var s = secrets();
        return Object.prototype.hasOwnProperty.call(s, name) ? { found: true, value: s[name] } : { found: false };
      },
      _noodl_send_email: async function (mail) {
        state.outbox.push({ at: now().toISOString(), to: mail.to, subject: mail.subject, text: mail.text });
        if (state.outbox.length > 200) state.outbox.splice(0, state.outbox.length - 200);
        persist();
        // The backend's mailer answers { success, messageId }; `ok` too, for a script that reads that.
        return { success: true, ok: true, messageId: 'demo-' + hex(8) };
      },
      _noodl_cloudservices: { endpoint: 'https://demo-backend.invalid', masterKey: 'demo' }
    };

    /* ---------- the cloud graph interpreter ---------- */
    var AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    var compiled = new Map();
    function compile(script) {
      if (!compiled.has(script)) {
        compiled.set(script, new AsyncFunction('Inputs', 'Outputs', 'Noodl', 'Component', 'fetch', 'globalThis', script));
      }
      return compiled.get(script);
    }

    var cloudFetch = async function (url) {
      // The one fetch a cloud script makes: shared/Signed file link, asking the backend to sign a file.
      var m = /\/files\/([^/?]+)\/sign$/.exec(String(url));
      if (!m) throw new Error('demo backend: a cloud script fetched ' + url);
      var name = decodeURIComponent(m[1]);
      var signed = signFile(name);
      return {
        ok: !!signed,
        status: signed ? 200 : 404,
        json: async function () { return signed; }
      };
    };

    /** One instance of a component's graph: its nodes' state and the wires between them. */
    function Instance(path, run, parent) {
      var graph = graphs[path];
      if (!graph) throw new Error('demo backend: no component ' + path);
      var self = this;
      this.path = path;
      this.run = run;
      this.nodes = {};
      this.out = {};
      this.inputs = {};
      this.instOutputs = parent || null; // set by the instance node that owns us
      graph.connections.forEach(function (c) {
        (self.out[c.fromId] = self.out[c.fromId] || []).push(c);
        (self.inputs[c.toId] = self.inputs[c.toId] || {})[c.toProperty] = true;
      });
      graph.nodes.forEach(function (n) {
        self.nodes[n.id] = { def: n, values: Object.assign({}, n.parameters || {}), outputs: {}, sub: null };
      });
    }
    Instance.prototype.emitValue = function (fromId, port, value) {
      var node = this.nodes[fromId];
      node.outputs[port] = value;
      var wires = this.out[fromId] || [];
      for (var i = 0; i < wires.length; i++) {
        if (wires[i].fromProperty === port) this.receiveValue(wires[i].toId, wires[i].toProperty, value);
      }
    };
    Instance.prototype.emitSignal = function (fromId, port) {
      var self = this;
      var wires = (this.out[fromId] || []).filter(function (w) { return w.fromProperty === port; });
      // Values set in the same turn arrive first; the signal follows, as in the runtime.
      if (wires.length) {
        Promise.resolve().then(function () {
          wires.forEach(function (w) { self.receiveSignal(w.toId, w.toProperty); });
        });
      }
    };
    Instance.prototype.receiveValue = function (id, port, value) {
      var node = this.nodes[id];
      if (!node) return;
      var prev = node.values[port];
      node.values[port] = value;
      var t = node.def.type;
      if (t === 'JavaScriptFunction') {
        if (port.indexOf('in-') === 0 && !(this.inputs[id] && this.inputs[id].run) && node.def.parameters['runOnChange-' + port] !== false) {
          if (prev !== value || typeof value === 'object') this.scheduleJs(id);
        }
      } else if (t === 'Component Outputs') {
        if (this.owner) this.owner.inst.emitValue(this.owner.id, port, value);
      } else if (t.indexOf('/#') === 0) {
        node.sub = node.sub || this.spawn(id);
        var into = node.sub.inputNode();
        if (into) node.sub.emitValue(into, port, value);
      }
    };
    Instance.prototype.receiveSignal = function (id, port) {
      var node = this.nodes[id];
      if (!node) return;
      var t = node.def.type;
      var v = node.values;
      var self = this;
      if (t === 'JavaScriptFunction') {
        if (port === 'run') this.runJs(id);
      } else if (t === 'noodl.cloud.response') {
        if (port === 'send') this.run.respond(node.def, v);
      } else if (t === 'Component Outputs') {
        if (this.owner) this.owner.inst.emitSignal(this.owner.id, port);
      } else if (t.indexOf('/#') === 0) {
        node.sub = node.sub || this.spawn(id);
        var into = node.sub.inputNode();
        if (into) node.sub.emitSignal(into, port);
      } else if (t === 'noodl.cloud.createuser' && port === 'create') {
        this.async(id, function () { return createUser(v); });
      } else if (t === 'noodl.cloud.getuserroles' && port === 'read') {
        this.async(id, function () {
          if (!v.userId || !userById(v.userId)) throw new Error('Get User Roles: a User Id is required.');
          var roles = rolesOf(v.userId);
          self.emitValue(id, 'roles', roles);
          return roles.length ? 'done' : 'unchanged';
        });
      } else if (t === 'noodl.cloud.addusertorole' && port === 'add') {
        this.async(id, function () {
          var role = v.role;
          if (!role || !state.roles[role]) throw new Error('Add User To Role: no role ' + role);
          if (!userById(v.userId)) throw new Error('Add User To Role: no user ' + v.userId);
          var had = state.roles[role].indexOf(v.userId) >= 0;
          if (!had) state.roles[role].push(v.userId);
          persist();
          self.emitValue(id, 'roles', rolesOf(v.userId));
          return had ? 'unchanged' : 'done';
        });
      } else if (t === 'noodl.cloud.listusersinrole' && port === 'read') {
        this.async(id, function () {
          var role = v.role;
          if (!role || !state.roles[role]) throw new Error('List Users In Role: no role ' + role);
          var ids = state.roles[role].filter(function (u) { return !!userById(u); });
          var skip = Number(v.skip) || 0;
          var page = ids.slice(skip, skip + (Number(v.limit) || 100));
          self.emitValue(id, 'users', page.map(function (u) { return publicUser(userById(u)); }));
          self.emitValue(id, 'userIds', page);
          self.emitValue(id, 'total', ids.length);
          return ids.length ? 'done' : 'unchanged';
        });
      }
    };
    Instance.prototype.async = function (id, work) {
      var self = this;
      var node = this.nodes[id];
      Promise.resolve()
        .then(work)
        .then(function (outcome) {
          if (outcome === 'unchanged' && node.def.parameters.treatUnchangedAs) outcome = node.def.parameters.treatUnchangedAs;
          if (outcome === 'failure') throw new Error(node.def.type + ': unchanged, treated as a failure');
          self.emitSignal(id, outcome || 'done');
        })
        .catch(function (e) {
          self.run.note(node.def.type + ' ' + id + ': ' + ((e && e.message) || e));
          self.emitValue(id, 'error', String((e && e.message) || e));
          self.emitSignal(id, 'failure');
        });
    };
    Instance.prototype.spawn = function (id) {
      var sub = new Instance(this.nodes[id].def.type.slice(2), this.run);
      sub.owner = { inst: this, id: id };
      return sub;
    };
    Instance.prototype.inputNode = function () {
      for (var id in this.nodes) if (this.nodes[id].def.type === 'Component Inputs') return id;
      return null;
    };
    Instance.prototype.scheduleJs = function (id) {
      var node = this.nodes[id];
      if (node.scheduled) return;
      node.scheduled = true;
      var self = this;
      Promise.resolve().then(function () {
        node.scheduled = false;
        self.runJs(id);
      });
    };
    Instance.prototype.runJs = function (id) {
      var self = this;
      var node = this.nodes[id];
      var inputs = {};
      Object.keys(node.values).forEach(function (k) {
        if (k.indexOf('in-') === 0) inputs[k.slice(3)] = node.values[k];
      });
      var outputs = new Proxy({}, {
        get: function (_, name) {
          if (typeof name !== 'string') return undefined;
          // A name holding a value reads it back; any other is a signal (`Outputs.done()`, `Outputs.done.send()`).
          if (node.outputs['out-' + name] !== undefined) return node.outputs['out-' + name];
          var fire = function () { self.emitSignal(id, 'out-' + name); };
          fire.send = fire;
          return fire;
        },
        set: function (_, name, value) {
          self.emitValue(id, 'out-' + String(name), value);
          return true;
        }
      });
      var fn;
      try {
        fn = compile(node.def.parameters.functionScript || '');
      } catch (e) {
        this.run.note('script ' + this.path + '/' + id + ' does not compile: ' + e.message);
        this.emitSignal(id, 'failure');
        return;
      }
      var noodl = { Records: Records, Outputs: outputs, Inputs: inputs, Object: {}, Variables: {} };
      var g = Object.assign(Object.create(root), cloudGlobals);
      fn(inputs, outputs, noodl, {}, cloudFetch, g).then(
        function () { self.emitSignal(id, 'success'); },
        function (e) {
          self.run.note(self.path + '/' + id + ' threw: ' + ((e && e.message) || e));
          self.emitValue(id, 'error', String((e && e.message) || e));
          self.emitSignal(id, 'failure');
        }
      );
    };
    async function createUser(v) {
      var username = String(v.username || '').trim();
      if (!username) throw new Error('Create User: a Username is required.');
      var existing = Object.values(table('_User')).find(function (u) { return u.username === username; });
      if (existing) return { userId: existing.objectId, outcome: 'unchanged' };
      var row = { username: username, email: v.email || username };
      Object.keys(v).forEach(function (k) {
        if (k.indexOf('prop-') === 0 && v[k] !== undefined) row[k.slice(5)] = v[k];
      });
      var created = await Records.create('_User', row);
      return { userId: created.objectId, outcome: 'done' };
    }
    // createuser needs to emit userId before its signal: wrap it in the instance's async helper.
    var baseAsync = Instance.prototype.async;
    Instance.prototype.async = function (id, work) {
      var self = this;
      if (this.nodes[id].def.type !== 'noodl.cloud.createuser') return baseAsync.call(this, id, work);
      return baseAsync.call(this, id, function () {
        return Promise.resolve(work()).then(function (r) {
          self.emitValue(id, 'userId', r.userId);
          return r.outcome;
        });
      });
    };

    /** Run one cloud function as `user` (null: the app itself, as a trigger runs it). */
    function runFunction(name, params, user, startedByApp) {
      return new Promise(function (resolve) {
        var path = '__cloud__/' + name;
        var graph = graphs[path];
        if (!graph) return resolve({ status: 404, body: { error: 'No function named ' + name } });
        var notes = [];
        var answered = false;
        var run = {
          note: function (s) { notes.push(s); log('[' + name + '] ' + s); },
          respond: function (def, values) {
            if (answered) return;
            answered = true;
            var success = def.parameters.status === undefined || def.parameters.status === 'success';
            if (!success) return resolve({ status: 400, body: { error: values.errorMessage }, notes: notes });
            var result = {};
            Object.keys(values).forEach(function (k) {
              if (k.indexOf('pm-') === 0) result[k.slice(3)] = values[k];
            });
            resolve({ status: 200, body: { result: clone(result) }, notes: notes });
          }
        };
        var inst = new Instance(path, run);
        var reqId = graph.nodes.find(function (n) { return n.type === 'noodl.cloud.request'; });
        if (!reqId) return resolve({ status: 500, body: { error: 'Function ' + name + ' has no Request node' } });
        var p = reqId.parameters || {};
        if (!user && p.allowNoAuth !== true && !startedByApp) {
          return resolve({ status: 400, body: { error: 'Unauthenticated requests not accepted.' } });
        }
        // CWF-014: the request contract, before the graph runs.
        var declared = String(p.params || '').split(',').filter(Boolean);
        var values = Object.assign({}, params || {});
        var errors = [];
        declared.forEach(function (d) {
          var type = p['ptype-' + d] || '*';
          var v = values[d];
          if (v === undefined || v === null || v === '') {
            if (p['pdef-' + d] !== undefined) values[d] = p['pdef-' + d];
            else if (p['preq-' + d]) errors.push(d + ' is required');
            return;
          }
          if (type === 'string' && typeof v !== 'string') {
            if (typeof v === 'number' || typeof v === 'boolean') values[d] = String(v);
            else errors.push(d + ' must be a string');
          } else if (type === 'number' && typeof v !== 'number') {
            var n = Number(v);
            if (typeof v === 'string' && v.trim() !== '' && isFinite(n)) values[d] = n;
            else errors.push(d + ' must be a number');
          } else if (type === 'boolean' && typeof v !== 'boolean') {
            if (v === 'true' || v === 'false') values[d] = v === 'true';
            else errors.push(d + ' must be a boolean');
          } else if ((type === 'array' && !Array.isArray(v)) || (type === 'object' && (typeof v !== 'object' || Array.isArray(v)))) {
            errors.push(d + ' must be an ' + type);
          }
        });
        if (errors.length) return resolve({ status: 400, body: { error: 'Bad request: ' + errors.join('; ') } });
        // The outputs of the Request node, then `receive`.
        var reqNode = reqId.id;
        if (user) inst.emitValue(reqNode, 'userId', user.objectId);
        Object.keys(values).forEach(function (k) { inst.emitValue(reqNode, 'pm-' + k, values[k]); });
        inst.emitSignal(reqNode, 'receive');
        setTimeout(function () {
          if (!answered) {
            answered = true;
            resolve({ status: 500, body: { error: 'The function ' + name + ' did not answer.' }, notes: notes });
          }
        }, opts.timeoutMs || 15000);
      });
    }

    /** nodegx.security.json's function rule, as the backend applies it before a function runs. */
    function allowed(name, user) {
      var rule = policy.functions && policy.functions[name];
      var call = rule ? rule.call : (policy.defaults && policy.defaults.functions && policy.defaults.functions.call) || 'nobody';
      if (call === 'public') return true;
      if (call === 'nobody' || !call) return false;
      if (!user) return false;
      if (call === 'authenticated') return true;
      if (call.indexOf('role:') === 0) return rolesOf(user.objectId).indexOf(call.slice(5)) >= 0;
      return false;
    }

    /* ---------- files ---------- */
    function signFile(name) {
      var f = Object.values(table('_Files')).find(function (r) { return r.storedName === name; });
      if (!f) return null;
      var exp = new Date(now().getTime() + 5 * 60 * 1000).toISOString();
      return { url: 'https://demo-backend.invalid/files/' + encodeURIComponent(name) + '?demo-signed=' + hex(12), expiresAt: exp };
    }
    async function storeFile(owner, originalName, bytes, isPrivate) {
      var stored = hex(16) + '_' + originalName.replace(/[^\w.\-]+/g, '_');
      var contentType = sniff(bytes, originalName);
      await opts.files.put(stored, bytes, contentType);
      await Records.create('_Files', {
        storedName: stored, originalName: originalName, owner: owner, private: isPrivate !== false,
        size: bytes.length, contentType: contentType
      });
      return { name: stored, url: 'files/' + encodeURIComponent(stored), contentType: contentType, size: bytes.length, filename: originalName };
    }

    /* ---------- seeding ---------- */
    async function seed() {
      var at = now();
      var world = opts.buildWorld(at);
      state = { version: STATE_VERSION, seededAt: at.toISOString(), rows: {}, roles: {}, outbox: [] };
      var userIds = {};
      world.users.forEach(function (u) {
        var id = 'u-' + u.key;
        userIds[u.key] = id;
        table('_User')[id] = Object.assign({ objectId: id, createdAt: at.toISOString(), updatedAt: at.toISOString() }, u.fields);
        u.roles.forEach(function (r) {
          (state.roles[r] = state.roles[r] || []).push(id);
        });
      });
      var stored = {};
      for (var i = 0; i < world.files.length; i++) {
        var f = world.files[i];
        var key = '@' + f.fixture;
        if (stored[key]) continue;
        var bytes = await opts.fixtureFile(f.fixture);
        stored[key] = (await storeFile(userIds[f.owner], f.fixture, bytes, true)).name;
      }
      Object.keys(world.rows).forEach(function (c) {
        var rows = opts.resolveRows(world.rows[c], {
          userId: function (k) { return userIds[k]; },
          storedName: function (n) { return stored[n]; }
        });
        rows.forEach(function (r) { table(c)[r.objectId] = r; });
      });
      table('Setting');
      // reset-demo fires the morning round and the check-in send once, so the quiet learner is in the inbox
      // (DBU-08) and a check-in due today has gone out (DBU-10). The round's digest lands in the outbox.
      await runFunction('morningRound', {}, null, true);
      await runFunction('sendCheckins', {}, null, true);
      await persist();
      return state;
    }

    // A world being built (first visit, Reset demo) holds every request until it is whole: a request that
    // read it half-built would find no users, and answer "unauthenticated".
    var building = null;
    function exclusively(work) {
      var prev = building || Promise.resolve();
      var run = prev.then(work);
      building = run.then(function () { return null; }, function () { return null; });
      return run;
    }

    async function ready() {
      if (building) await building;
      if (state) return state;
      return exclusively(async function () {
        if (state) return state;
        var loaded = await opts.load();
        if (loaded && loaded.version === STATE_VERSION) state = loaded;
        else await seed();
        return state;
      });
    }

    function reset() {
      return exclusively(async function () {
        await opts.files.clear();
        await seed();
        return state;
      });
    }

    /* ---------- the REST surface the app reaches ---------- */
    function json(status, body, headers) {
      return { status: status, headers: Object.assign({ 'content-type': 'application/json' }, headers || {}), body: JSON.stringify(body) };
    }

    async function handle(req) {
      await ready();
      var url = new URL(req.url, 'https://demo-backend.invalid');
      var path = url.pathname.replace(/^.*?\/demo-api(?=\/)/, '');
      var token = req.headers['x-parse-session-token'];
      var user = userForToken(token);
      var m;

      if ((m = /^\/functions\/([^/]+)$/.exec(path)) && req.method === 'POST') {
        var name = decodeURIComponent(m[1]);
        if (token && !user) return json(400, { code: 209, error: 'Invalid session token' });
        if (!allowed(name, user)) {
          return json(403, { error: user ? 'You are not allowed to run ' + name + '.' : 'Unauthenticated requests not accepted.' });
        }
        var params = {};
        try { params = req.body ? JSON.parse(req.body) : {}; } catch (e) { /* the backend treats it as empty */ }
        if (user) {
          // lastSeenAt is the functions' own business; the demo does not stamp anything else.
        }
        var r = await runFunction(name, params, user, false);
        return json(r.status, r.body);
      }

      if (path === '/users/me' && req.method === 'GET') {
        if (!user) return json(400, { code: 209, error: 'Invalid session token' });
        var me = publicUser(user);
        me.sessionToken = token;
        me.roles = rolesOf(user.objectId);
        return json(200, me);
      }
      if (path === '/logout' && req.method === 'POST') return json(200, {});

      if ((m = /^\/files\/([^/]+)\/sign$/.exec(path))) {
        var nm = decodeURIComponent(m[1]);
        var file = Object.values(table('_Files')).find(function (r) { return r.storedName === nm; });
        if (!file || !user) return json(404, { error: 'Not found' });
        var owner = file.owner;
        if (file.private && owner !== user.objectId && rolesOf(user.objectId).indexOf('staff') < 0) return json(403, { error: 'Forbidden' });
        return json(200, signFile(nm));
      }
      if ((m = /^\/files\/([^/]+)$/.exec(path))) {
        var fname = decodeURIComponent(m[1]);
        if (req.method === 'POST') {
          if (!user) return json(401, { error: 'Sign in to upload.' });
          if (req.bytes.length > 50 * 1024 * 1024) return json(413, { error: 'That file is larger than 50 MB.' });
          var kind = sniff(req.bytes, fname);
          if (kind === 'image/svg+xml') return json(415, { error: 'SVG files are not accepted.' });
          var isPrivate = String(req.headers['x-nodegx-file-private'] || '').toLowerCase() === 'true';
          return json(201, await storeFile(user.objectId, fname, req.bytes, isPrivate));
        }
        if (req.method === 'GET') {
          // A signed link (demo-signed) or the owner's own read: either way the bytes, as stored.
          var meta = Object.values(table('_Files')).find(function (r) { return r.storedName === fname; });
          var got = meta && (await opts.files.get(fname));
          if (!got) return { status: 404, headers: { 'content-type': 'text/plain' }, body: 'Not found' };
          var headers = { 'content-type': meta.contentType || 'application/octet-stream', 'cache-control': 'no-store' };
          // PLATFORM.md feature 5: the backend serves an uploaded page sandboxed; so does the demo.
          if (meta.contentType === 'text/html') headers['content-security-policy'] = 'sandbox allow-scripts';
          return { status: 200, headers: headers, body: got.bytes };
        }
      }

      if (path === '/health' || path === '/config') return json(200, {});

      log('unhandled ' + req.method + ' ' + path);
      return json(404, { error: 'The demo backend does not answer ' + req.method + ' ' + path });
    }

    return {
      ready: ready,
      reset: reset,
      handle: handle,
      call: async function (name, params, userId) {
        await ready();
        var user = userById(userId);
        if (!allowed(name, user)) return { status: 403, body: { error: 'not allowed' } };
        return runFunction(name, params, user, false);
      },
      runAsApp: async function (name, params) {
        await ready();
        return runFunction(name, params, null, true);
      },
      session: function (userId) {
        var u = userById(userId);
        if (!u) return null;
        var s = publicUser(u);
        s.sessionToken = tokenFor(userId);
        return s;
      },
      people: function () {
        return Object.values(table('_User')).map(function (u) {
          return { objectId: u.objectId, name: u.name, email: u.email, roles: rolesOf(u.objectId) };
        });
      },
      onChange: function (fn) { listeners.push(fn); },
      state: function () { return state; },
      flush: function () { return saving; },
      sniff: sniff
    };
  }

  root.DbuDemoEngine = { createEngine: createEngine, matches: matches, sniff: sniff };
})(typeof self !== 'undefined' ? self : globalThis);
