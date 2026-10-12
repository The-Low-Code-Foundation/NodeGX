#!/usr/bin/env node
/**
 * P109 ISL-021 — press, type, wait and read on a page rendered from disk, from one step list.
 *
 * Usage:
 *   node scripts/devtools/drive-steps.js <project-dir> --steps '<json array>' [options]
 *
 *   --steps <json|@file>   the step list (below), inline JSON or `@path/to/steps.json`
 *   --page <path>          start on this page ("/" or omitted = the start page), as `render_report --page`
 *   --viewport <spec>      "desktop", "phone" or WIDTHxHEIGHT (default: desktop)
 *   --out-dir <dir>        where `screenshot` steps write their PNGs (default: none are written)
 *   --backend-port <n>     proxy /__backend to this port
 *
 * Prints ONE JSON object on stdout: `{ verdict, steps: [...], consoleErrors, networkErrors, otherOrigins, page: {...} }`, or
 * `{ error: { message, problems, actionable } }`. Exit 0 either way when a run happened — a failed step
 * is a verdict, not a crash (the render harness's rule); exit 2 is a usage error.
 *
 * ## Why this exists (ISL-021, ruled 2026-10-04: "One call, a step list")
 *
 * `render_report` measures the first frame. Olive's Island is a game, and nothing it does is visible on
 * the first frame, so every claim about it was proved by a hand-written CDP script: 114 `drive-*.js`
 * files in this folder, 45,773 lines, none of which an agent using the MCP door could write or run.
 * This is the door's half: the verbs those drives use, measured from them (ISL-021 §2's census), in a
 * form a model can send as data.
 *
 * ## The rules it inherits from those drives, each of which cost a wrong reading once
 *
 * - **A tap is a finger, not `el.click()`.** `Input.dispatchMouseEvent` at the element's centre, after
 *   `scrollIntoView`, and only when `elementFromPoint` at that centre is the element or inside it
 *   (`el.contains(at)` — an ANCESTOR at the point is not the element: memory "a rect is not visibility").
 *   Refused otherwise, naming what the finger would have hit.
 * - **`pointer-events: none` hides an element from the hit test** (a label inside a button). The element
 *   is lent `pointer-events: auto` for the one measurement and restored before the press, so the press
 *   lands where a finger's would — on the button under the label.
 * - **A wait is a condition with a timeout**, polled; never a fixed sleep (a sleep grades the machine).
 * - **The run says whether the page was visible** (`document.visibilityState`, `hasFocus`): an occluded
 *   window throttles timers ~1000× (P56 BEN-003), and a 2D fallback must not read as a 3D pass (F36), so
 *   it reports whether WebGL2 was available too.
 *
 * Reuses `withRenderedPage` — the render harness's own Chrome, server and teardown. No second launcher.
 *
 * ⚠️ **Not `drive-page.js`.** That is P77's persistent driver for a URL (a browser kept alive between shell
 * calls — the "exploratory session" shape ISL-021 ruled against), and two of its traps are designed in here:
 * a SUBSTRING text match once pressed `Published` when asked for `Publish` and reported a reachable click on the
 * wrong element, so `text` is EXACT and `text_contains` is the opt-in that says what it matched; and `<title>`
 * matches every text query with zero area, so text is searched inside `body` among elements with area.
 *
 * ## Steps — each an object with ONE verb key
 *
 *   { "tap": T }                         press the element T (below)
 *   { "type": "Ada", "into": T?, "replace": true? }
 *                                        tap T first when given, then type the text as a keyboard would — it
 *                                        APPENDS to what the field holds; `replace` selects all first (⌘A).
 *                                        Measured s14: an agent typed a second name into a filled field and read
 *                                        "Grace HopperKatherine Johnson"
 *   { "key": "Enter" }                   one key press (Enter, Escape, Tab, Backspace, ArrowDown, …)
 *   { "wait_for": C, "timeout_ms": n? }  poll until C holds (default 5000 ms); C is one of
 *                                        { "text": "…" } on the page, { "testid" | "selector": "…" } visible,
 *                                        { "url": "…" } in the path or hash, { "expression": "js" } truthy
 *   { "read": R, "expect": V? }          R is { "text": T } (its innerText), { "variable": "name" } (an app
 *                                        Variable), { "storage": "key" } (localStorage), { "url": true },
 *                                        { "stub": "/path" } or { "expression": "js" }; with `expect` the step passes only when the
 *                                        value equals V, or contains V.contains. What the run has seen SO FAR:
 *                                        { "console_errors": true } (the page's errors and throws), { "network_errors":
 *                                        true } (a request that failed to load, or answered 400 or above, with its
 *                                        URL) and { "other_origins": true } (every origin other than the page's own
 *                                        that was asked for anything — a font CDN, an API); each a list, so
 *                                        `"expect": []` is "none yet" at that step
 *   { "navigate": "/island" }            go to a route. On a path-routed project this LOADS THE DOCUMENT again,
 *                                        even for the route it is on (measured s14 on the garden, 4 of 4) — the
 *                                        way to prove what survives a reload; on a hash-routed one it is a
 *                                        fragment change and nothing reloads
 *   { "viewport": "phone" | "390x844" }  resize
 *   { "screenshot": "name" }             a PNG of the viewport into --out-dir
 *   { "seed_storage": { "key": "value" } } write localStorage, and navigate afterwards to load it
 *   { "seed_storage": "key", "edit": "js" } change a saved value in place: `edit` is a body run on `v`, the key's
 *                                        parsed JSON (`v.model.shells = 22`) — the drives' `writeStore`
 *                                        🔴 A seed is written now AND again at the start of the NEXT document load,
 *                                        before the app's own scripts, once. A running app that saves its model
 *                                        (the garden writes it 7–23 ms after a page appears, or not at all —
 *                                        measured s14, 3 runs) would otherwise overwrite the seed before the reload
 *                                        reads it, and no condition on the page orders a step after that write.
 *                                        The edit form computes its value now and re-writes that value, so an
 *                                        edit is never applied twice; a later reload is not reset to it.
 *   { "clear_storage": true }            clear this origin's storage
 *   { "stub_route": "/__garden/status", "json": V?, "body": "text"?, "status": 200?, "content_type"? }
 *                                        answer every later request for that path with V (or the text), and
 *                                        never let it reach the server. A route ending in `*` is a prefix; a
 *                                        full `https://…` URL stubs another origin. Stubs at the START of the
 *                                        list are installed before the page first loads, so a fetch the app
 *                                        makes as it boots meets them; a stub later in the list answers from
 *                                        that step on. `{ "read": { "stub": "/path" } }` reads
 *                                        `{ hits, body }` — how many requests it answered, and the last body
 *                                        one sent (parsed when it is JSON)
 *   { "reduced_motion": true }           the page's `prefers-reduced-motion` reads `reduce` from here on (false: no
 *                                        preference), across later navigations too
 *
 *   T (a target) is { "text": "New player" } (exact, after trimming; a field's placeholder or aria-label counts), { "text_contains": "player" } (the
 *   opt-in substring form), { "testid": "plot-card" } (a `data-testid`, ISL-009) or { "selector": "css" };
 *   a bare string means { "text": … }. Every press reports what it pressed.
 *
 * A step that fails stops the run: every later step was written assuming it had happened.
 */
const fs = require('fs');
const path = require('path');

const { withRenderedPage, routedPages, resolvePageRequest, parseViewports } = require('./render-report');

const VERBS = [
  'tap',
  'type',
  'key',
  'wait_for',
  'read',
  'navigate',
  'viewport',
  'screenshot',
  'seed_storage',
  'clear_storage',
  'stub_route',
  'reduced_motion'
];

/** The keys `key` understands, as CDP wants them. */
const KEYS = {
  Enter: { key: 'Enter', code: 'Enter', keyCode: 13, text: '\r' },
  Escape: { key: 'Escape', code: 'Escape', keyCode: 27 },
  Tab: { key: 'Tab', code: 'Tab', keyCode: 9 },
  Backspace: { key: 'Backspace', code: 'Backspace', keyCode: 8 },
  Delete: { key: 'Delete', code: 'Delete', keyCode: 46 },
  Space: { key: ' ', code: 'Space', keyCode: 32, text: ' ' },
  ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
  ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
  ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
  ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 }
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

class UsageError extends Error {
  constructor(message) {
    super(message);
    this.usage = true;
  }
}

/** The one verb a step names, or a usage error naming what is wrong with it. */
function verbOf(step, n) {
  if (!step || typeof step !== 'object' || Array.isArray(step)) {
    throw new UsageError(`Step ${n} is not an object: ${JSON.stringify(step)}.`);
  }
  const verbs = Object.keys(step).filter((k) => VERBS.includes(k));
  if (verbs.length !== 1) {
    throw new UsageError(
      `Step ${n} must name exactly one of ${VERBS.join(', ')}; it names ${verbs.length ? verbs.join(' and ') : 'none'} ` +
        `(${JSON.stringify(step)}).`
    );
  }
  return verbs[0];
}

/** A target as a page-side expression returning `{ el, matched }`. */
function finder(target) {
  const t = typeof target === 'string' ? { text: target } : target || {};
  if (typeof t.testid === 'string') {
    return `(() => { const all = [...document.querySelectorAll('[data-testid=' + ${JSON.stringify(JSON.stringify(t.testid))} + ']')]; return { all }; })()`;
  }
  if (typeof t.selector === 'string') {
    return `(() => ({ all: [...document.querySelectorAll(${JSON.stringify(t.selector)})] }))()`;
  }
  if (typeof t.text === 'string' || typeof t.text_contains === 'string') {
    // The DEEPEST elements inside <body> with area whose text is the needle (EXACT for `text`, a substring
    // only for `text_contains`), so a button's label is found rather than the page that holds it.
    const exact = typeof t.text === 'string';
    return `(() => {
      const needle = ${JSON.stringify(exact ? t.text : t.text_contains)};
      const shown = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
      const own = (e) => (e.innerText || '').trim();
      const test = ${exact} ? (s) => s === needle : (s) => s.includes(needle);
      // A field is found by what a person reads on it: its placeholder or aria-label (an input has no text).
      const field = (e) => (e.tagName === 'INPUT' || e.tagName === 'TEXTAREA') && test((e.getAttribute('placeholder') || e.getAttribute('aria-label') || '').trim());
      const hits = [...document.body.querySelectorAll('*')].filter((e) => shown(e) && (test(own(e)) || field(e)));
      return { all: hits.filter((e) => !hits.some((o) => o !== e && e.contains(o))) };
    })()`;
  }
  throw new UsageError(`A target is { text }, { text_contains }, { testid } or { selector }; got ${JSON.stringify(target)}.`);
}

/** What the finger would press: the centre of the first matching element a finger can reach. */
function locateExpression(target) {
  return `(() => {
    const { all } = ${finder(target)};
    const describe = (e) => e ? (e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.getAttribute('data-testid') ? '[data-testid=' + e.getAttribute('data-testid') + ']' : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\\s+/).slice(0, 2).join('.') : '') + ' "' + (e.innerText || '').trim().slice(0, 40) + '"') : 'nothing';
    if (all.length === 0) return { found: false, matched: 0 };
    let last;
    for (const el of all) {
      el.scrollIntoView({ block: 'center', inline: 'center' });
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) { last = { x, y, offscreen: true, wouldHit: 'nothing (off screen)' }; continue; }
      // Lent pointer-events for the one measurement: elementFromPoint skips an element that has none.
      const before = el.style.pointerEvents;
      el.style.pointerEvents = 'auto';
      const at = document.elementFromPoint(x, y);
      el.style.pointerEvents = before;
      if (at && el.contains(at)) return { found: true, matched: all.length, x, y, target: describe(el) };
      last = { x, y, wouldHit: describe(at), target: describe(el) };
    }
    return { found: true, matched: all.length, covered: true, ...last };
  })()`;
}

function waitExpression(c) {
  if (!c || typeof c !== 'object') throw new UsageError(`wait_for takes { text | testid | selector | url | expression }; got ${JSON.stringify(c)}.`);
  if (typeof c.text === 'string') return `(document.body.innerText || '').includes(${JSON.stringify(c.text)})`;
  if (typeof c.testid === 'string' || typeof c.selector === 'string') {
    return `(() => { const { all } = ${finder(c)}; return all.some((e) => e.getClientRects().length > 0); })()`;
  }
  if (typeof c.url === 'string') return `(location.pathname + location.hash).includes(${JSON.stringify(c.url)})`;
  if (typeof c.expression === 'string') return `(async () => !!(${c.expression}))()`;
  throw new UsageError(`wait_for takes { text | testid | selector | url | expression }; got ${JSON.stringify(c)}.`);
}

/** A `stub_route` step as `{ route, prefix, status, body, contentType }`, or a usage error. */
function parseStub(step, n) {
  const route = step.stub_route;
  if (typeof route !== 'string' || !(route.startsWith('/') || /^https?:\/\//.test(route))) {
    throw new UsageError(`Step ${n}: stub_route takes a path ("/__garden/status") or a full http(s) URL; got ${JSON.stringify(route)}.`);
  }
  if ('json' in step && 'body' in step) throw new UsageError(`Step ${n}: stub_route takes json OR body, not both.`);
  if ('body' in step && typeof step.body !== 'string') throw new UsageError(`Step ${n}: stub_route's body is text; use json for a value.`);
  const status = Number(step.status ?? 200);
  if (!Number.isInteger(status) || status < 100 || status > 599) throw new UsageError(`Step ${n}: stub_route's status ${JSON.stringify(step.status)} is not an HTTP status.`);
  const isJson = !('body' in step);
  return {
    route: route.endsWith('*') ? route.slice(0, -1) : route,
    prefix: route.endsWith('*'),
    status,
    body: isJson ? JSON.stringify(step.json ?? {}) : step.body,
    contentType: String(step.content_type ?? (isJson ? 'application/json' : 'text/plain'))
  };
}

/**
 * The routes this run answers itself, on one tab, through CDP's `Fetch` domain — the shape 22 of the drives
 * hand-wrote (`Fetch.requestPaused` → `Fetch.fulfillRequest`). Newest stub first, so a later step can change
 * an answer. A paused request no stub claims is let through: the patterns are a glob, the match is exact.
 */
function routeStubs(tab) {
  const stubs = [];
  let listening = false;
  const where = (url) => {
    try {
      const u = new URL(url);
      return { path: u.pathname, full: u.origin + u.pathname };
    } catch {
      return null;
    }
  };
  const claim = (url) => {
    const at = where(url);
    if (!at) return undefined;
    return stubs.find((s) => {
      const subject = /^https?:/.test(s.route) ? at.full : at.path;
      return s.prefix ? subject.startsWith(s.route) : subject === s.route;
    });
  };
  const onPaused = (msg) => {
    if (msg.method !== 'Fetch.requestPaused') return;
    const { requestId, request } = msg.params;
    const stub = claim(request.url);
    if (!stub) {
      tab.client.send('Fetch.continueRequest', { requestId }).catch(() => {});
      return;
    }
    stub.hits += 1;
    if (request.postData !== undefined) stub.lastBody = request.postData;
    tab.client
      .send('Fetch.fulfillRequest', {
        requestId,
        responseCode: stub.status,
        responseHeaders: [{ name: 'content-type', value: stub.contentType }],
        body: Buffer.from(stub.body).toString('base64')
      })
      .catch(() => {});
  };
  // CDP's urlPattern treats `*` and `?` as wildcards and `\` as their escape.
  const glob = (route) => route.replace(/[*?\\]/g, (c) => `\\${c}`);
  return {
    async add(stub) {
      stubs.unshift({ ...stub, hits: 0 });
      if (!listening) {
        tab.onEvent(onPaused);
        listening = true;
      }
      const routes = [...new Set(stubs.map((s) => s.route))];
      await tab.client.send('Fetch.enable', {
        patterns: routes.map((r) => ({ urlPattern: `${/^https?:/.test(r) ? '' : '*'}${glob(r)}*`, requestStage: 'Request' }))
      });
    },
    /** `{ hits, body }` for the newest stub on this route, summed over every stub that named it. */
    read(route) {
      const key = route.endsWith('*') ? route.slice(0, -1) : route;
      const named = stubs.filter((s) => s.route === key);
      if (!named.length) throw new Error(`no stub_route for ${JSON.stringify(route)} was set before this read`);
      const last = named.find((s) => s.lastBody !== undefined)?.lastBody;
      let body = last ?? null;
      try {
        if (typeof body === 'string') body = JSON.parse(body);
      } catch {
        /* text stays text */
      }
      return { hits: named.reduce((n, s) => n + s.hits, 0), body };
    },
    report() {
      return stubs.map((s) => ({ route: s.prefix ? `${s.route}*` : s.route, status: s.status, hits: s.hits }));
    }
  };
}

/**
 * What the page asked the network for, from before its first load: the failures and the origins. ISL-021 AC3
 * (ruled 2026-10-04, "build the cheap 9"): the drives read `page.networkErrors` (`Network.loadingFailed`) and a
 * `Network.requestWillBeSent` list, and four of their clauses had no step to say it with.
 *
 * A failure is a request that did not load, or one answered 400 or above. A CANCELLED one is not: a reload
 * cancels whatever the page had in flight, and that is the step's own doing, not the app's. Nor is a 404 for
 * `/favicon.ico`: Chrome asks for it itself on every load (measured s15: the garden's only failure, every run).
 */
function networkLog(tab) {
  const urls = new Map();
  const errors = [];
  const origins = new Set();
  tab.onEvent((msg) => {
    if (msg.method === 'Network.requestWillBeSent') {
      const { requestId, request, documentURL } = msg.params;
      urls.set(requestId, request.url);
      try {
        const u = new URL(request.url);
        const home = new URL(documentURL || request.url).origin;
        if (/^https?:$/.test(u.protocol) && u.origin !== home) origins.add(u.origin);
      } catch {
        /* a URL Chrome sends is a URL; nothing to record otherwise */
      }
    } else if (msg.method === 'Network.loadingFailed' && !msg.params.canceled) {
      errors.push(`${msg.params.errorText} ${urls.get(msg.params.requestId) ?? `(${msg.params.type})`}`);
    } else if (msg.method === 'Network.responseReceived' && msg.params.response.status >= 400 && !/\/favicon\.ico$/.test(new URL(msg.params.response.url).pathname)) {
      errors.push(`${msg.params.response.status} ${msg.params.response.url}`);
    }
  });
  return {
    start: () => tab.client.send('Network.enable', {}),
    errors: () => errors.slice(),
    otherOrigins: () => [...origins].sort()
  };
}

/** The `read` forms answered from what the run itself recorded, not from the page. */
const RUN_READS = ['stub', 'console_errors', 'network_errors', 'other_origins'];
const READ_FORMS = 'text | variable | storage | url | stub | console_errors | network_errors | other_origins | expression';

function readExpression(r) {
  if (!r || typeof r !== 'object') throw new UsageError(`read takes { ${READ_FORMS} }; got ${JSON.stringify(r)}.`);
  if (r.text !== undefined) {
    return `(() => { const { all } = ${finder(r.text)}; const e = all[0]; return e ? (e.value !== undefined && e.value !== null && e.value !== '' ? e.value : (e.innerText || '').trim()) : null; })()`;
  }
  if (typeof r.variable === 'string') {
    return `(() => { const N = window.Noodl; if (!N || !N.Variables) throw new Error('This page has no Noodl.Variables to read.'); const v = N.Variables[${JSON.stringify(r.variable)}]; return v === undefined ? null : JSON.parse(JSON.stringify(v)); })()`;
  }
  if (typeof r.storage === 'string') return `localStorage.getItem(${JSON.stringify(r.storage)})`;
  if (r.url) return `location.pathname + location.hash`;
  if (typeof r.expression === 'string') return `(async () => { const v = await (${r.expression}); return v === undefined ? null : JSON.parse(JSON.stringify(v)); })()`;
  throw new UsageError(`read takes { ${READ_FORMS} }; got ${JSON.stringify(r)}.`);
}

/** A `seed_storage` step as the `{ key: text }` pairs to write — the edit form computed on the page, now. */
async function seedPairs(step, n, evaluate) {
  const seed = step.seed_storage;
  if (typeof seed === 'string') {
    if (typeof step.edit !== 'string') throw new UsageError(`Step ${n}: seed_storage "${seed}" edits a saved value and needs edit: "js that changes v".`);
    return evaluate(`(() => { const k = ${JSON.stringify(seed)}; const raw = localStorage.getItem(k);
      if (raw === null) throw new Error('localStorage has no ' + JSON.stringify(k) + ' to edit');
      const v = JSON.parse(raw); (function (v) { ${step.edit}
      })(v); return { [k]: JSON.stringify(v) }; })()`);
  }
  if (!seed || typeof seed !== 'object' || Array.isArray(seed)) {
    throw new UsageError(`Step ${n}: seed_storage takes { key: value } or a key with edit: "js that changes v".`);
  }
  return Object.fromEntries(Object.entries(seed).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]));
}

function matches(value, expected) {
  if (expected && typeof expected === 'object' && !Array.isArray(expected) && 'contains' in expected) {
    const hay = typeof value === 'string' ? value : JSON.stringify(value);
    return typeof hay === 'string' && hay.includes(String(expected.contains));
  }
  return JSON.stringify(value) === JSON.stringify(expected);
}

/** Run every step until one fails. Returns the rows. */
async function runSteps(page, steps, { outDir, stubs = routeStubs(page), network, beforeBoot = 0 }) {
  const rows = [];
  const pendingSeeds = [];
  const { client, evaluate } = page;
  // After an input, let the app answer before the next step looks: two animation frames is a condition
  // (React has committed and painted), not a sleep.
  const frames = () => evaluate('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))');
  const press = async (target) => {
    let p = await evaluate(locateExpression(target));
    // A target that is not there YET (an animation, a route still mounting) gets a short grace, as the
    // drives give it; one that is there and covered is refused at once.
    for (let i = 0; i < 20 && !p.found; i++) {
      await wait(100);
      p = await evaluate(locateExpression(target));
    }
    if (!p.found) throw new Error(`nothing on the page matches ${JSON.stringify(target)}`);
    // A target still moving (a sheet sliding in) is pressed where it WAS: the press lands on whatever has moved
    // under that point. Measured s14: the shop's Robots tab, tapped as its panel opened, 1 run in ~8 never
    // selected. The drives waited 200 ms and measured again; here the condition is the same centre two frames
    // apart, for up to 2 s.
    for (const end = Date.now() + 2000; p.found && !p.covered && Date.now() < end; ) {
      await frames();
      const again = await evaluate(locateExpression(target));
      const still = again.found && !again.covered && Math.abs(again.x - p.x) < 0.5 && Math.abs(again.y - p.y) < 0.5;
      p = again;
      if (still) break;
    }
    if (!p.found) throw new Error(`nothing on the page matches ${JSON.stringify(target)}`);
    if (p.covered) {
      throw new Error(
        `${p.target} is there but a finger at its centre would press ${p.wouldHit}` +
          (p.offscreen ? ' (its centre is off screen even after scrolling)' : '')
      );
    }
    for (const type of ['mousePressed', 'mouseReleased']) {
      await client.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 });
    }
    return p;
  };

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const verb = verbOf(step, i + 1);
    const started = Date.now();
    const row = { n: i + 1, do: verb, ok: true };
    try {
      if (verb === 'tap') {
        const p = await press(step.tap);
        row.pressed = p.target;
        if (p.matched > 1) row.matched = p.matched;
        await frames();
      } else if (verb === 'type') {
        if (typeof step.type !== 'string') throw new UsageError(`Step ${i + 1}: type takes a string.`);
        if (step.into !== undefined) await press(step.into);
        if (step.replace === true) {
          await evaluate(`(() => { const e = document.activeElement; if (e && typeof e.select === 'function') e.select(); return true; })()`);
        }
        await client.send('Input.insertText', { text: step.type });
        await frames();
        row.value = await evaluate(`(() => { const e = document.activeElement; return e && 'value' in e ? e.value : null; })()`);
      } else if (verb === 'key') {
        const k = KEYS[step.key];
        if (!k) throw new UsageError(`Step ${i + 1}: key "${step.key}" is not one of ${Object.keys(KEYS).join(', ')}.`);
        await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k.key, code: k.code, windowsVirtualKeyCode: k.keyCode, ...(k.text ? { text: k.text } : {}) });
        await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k.key, code: k.code, windowsVirtualKeyCode: k.keyCode });
        await frames();
      } else if (verb === 'wait_for') {
        const expr = waitExpression(step.wait_for);
        const timeout = Number(step.timeout_ms ?? 5000);
        const end = Date.now() + timeout;
        let ok = await evaluate(expr);
        while (!ok && Date.now() < end) {
          await wait(100);
          ok = await evaluate(expr);
        }
        if (!ok) throw new Error(`not true within ${timeout} ms: ${JSON.stringify(step.wait_for)}`);
      } else if (verb === 'read') {
        const r = step.read && typeof step.read === 'object' ? step.read : {};
        const own = RUN_READS.find((k) => r[k] !== undefined);
        if (own && own !== 'stub' && !network) throw new Error(`read ${own} needs the run's network log, which this runner was not given`);
        row.value =
          own === 'stub'
            ? stubs.read(String(r.stub))
            : own === 'console_errors'
              ? page.consoleErrors.slice()
              : own === 'network_errors'
                ? network.errors()
                : own === 'other_origins'
                  ? network.otherOrigins()
                  : await evaluate(readExpression(step.read));
        if ('expect' in step && !matches(row.value, step.expect)) {
          row.ok = false;
          row.error = `read ${JSON.stringify(row.value)}, expected ${JSON.stringify(step.expect)}`;
        }
      } else if (verb === 'navigate') {
        if (typeof step.navigate !== 'string') throw new UsageError(`Step ${i + 1}: navigate takes a route string.`);
        await page.navigate(step.navigate.startsWith('/') ? step.navigate : `/${step.navigate}`);
        // The load the seeds were waiting for has happened; their once-mark already spent them.
        for (const identifier of pendingSeeds.splice(0)) {
          await client.send('Page.removeScriptToEvaluateOnNewDocument', { identifier }).catch(() => {});
        }
        row.url = await evaluate('location.pathname + location.hash');
      } else if (verb === 'viewport') {
        const [vp] = parseViewports(String(step.viewport));
        await page.setViewport(vp);
        row.viewport = `${vp.width}x${vp.height}`;
      } else if (verb === 'screenshot') {
        if (!outDir) throw new UsageError(`Step ${i + 1}: screenshot needs --out-dir (render_report's out_dir rule).`);
        const name = String(step.screenshot).replace(/[^A-Za-z0-9._-]+/g, '-') || `step-${i + 1}`;
        const shot = await client.send('Page.captureScreenshot', { format: 'png' });
        fs.mkdirSync(outDir, { recursive: true });
        const file = path.join(outDir, `${name}.png`);
        fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
        row.file = file;
      } else if (verb === 'seed_storage') {
        const pairs = await seedPairs(step, i + 1, evaluate);
        await evaluate(`(() => { const p = ${JSON.stringify(pairs)}; for (const k of Object.keys(p)) localStorage.setItem(k, p[k]); return true; })()`);
        // Again on the next load, before the app runs — once (a sessionStorage mark survives the reload).
        const mark = JSON.stringify(`__drive_steps_seed_${process.pid}_${i + 1}`);
        const { identifier } = await client.send('Page.addScriptToEvaluateOnNewDocument', {
          source: `(() => { try { if (sessionStorage.getItem(${mark})) return; sessionStorage.setItem(${mark}, '1'); const p = ${JSON.stringify(pairs)}; for (const k of Object.keys(p)) localStorage.setItem(k, p[k]); } catch (e) {} })();`
        });
        pendingSeeds.push(identifier);
        row.keys = Object.keys(pairs);
      } else if (verb === 'clear_storage') {
        const origin = await evaluate('location.origin');
        await client.send('Storage.clearDataForOrigin', { origin, storageTypes: 'local_storage,indexeddb,cache_storage,service_workers' });
      } else if (verb === 'stub_route') {
        const stub = parseStub(step, i + 1);
        row.route = step.stub_route;
        // A leading stub was installed before the page first loaded (main's beforeBoot); say so.
        if (i < beforeBoot) row.before_boot = true;
        else await stubs.add(stub);
      } else if (verb === 'reduced_motion') {
        if (typeof step.reduced_motion !== 'boolean') throw new UsageError(`Step ${i + 1}: reduced_motion takes true or false.`);
        await client.send('Emulation.setEmulatedMedia', {
          features: [{ name: 'prefers-reduced-motion', value: step.reduced_motion ? 'reduce' : '' }]
        });
        await frames();
        row.value = await evaluate(`matchMedia('(prefers-reduced-motion: reduce)').matches`);
      }
    } catch (error) {
      if (error.usage) throw error;
      row.ok = false;
      row.error = error instanceof Error ? error.message : String(error);
    }
    row.ms = Date.now() - started;
    rows.push(row);
    if (!row.ok) break;
  }
  return rows;
}

async function main() {
  const argv = process.argv.slice(2);
  const VALUE_FLAGS = new Set(['--steps', '--page', '--viewport', '--out-dir', '--backend-port']);
  const flag = (name) => {
    const i = argv.indexOf(name);
    return i === -1 ? undefined : argv[i + 1];
  };
  const projectDir = argv.find((a, i) => !a.startsWith('--') && !VALUE_FLAGS.has(argv[i - 1]));
  const usage = (message) => {
    process.stdout.write(JSON.stringify({ error: { message, problems: [message], actionable: true } }));
    process.exit(2);
  };
  if (!projectDir) usage('drive-steps.js <project-dir> --steps <json|@file> [--page p] [--viewport v] [--out-dir d]');

  let steps;
  try {
    const raw = flag('--steps');
    if (!raw) throw new UsageError('--steps is required: a JSON array of steps.');
    steps = JSON.parse(raw.startsWith('@') ? fs.readFileSync(raw.slice(1), 'utf8') : raw);
    if (!Array.isArray(steps) || steps.length === 0) throw new UsageError('--steps must be a non-empty JSON array.');
    steps.forEach((s, i) => {
      if (verbOf(s, i + 1) === 'stub_route') parseStub(s, i + 1);
    });
  } catch (error) {
    usage(error.message);
  }

  let viewport;
  try {
    [viewport] = parseViewports(flag('--viewport') || 'desktop');
  } catch (error) {
    usage(error.message);
  }

  // Resolved before Chrome starts, as `render_report --page` is (EL-009 AC3).
  const routes = routedPages(projectDir);
  let start;
  if (flag('--page') !== undefined) {
    const resolved = resolvePageRequest(routes, flag('--page'));
    if (!resolved.ok) usage(resolved.message);
    start = resolved.page;
  }

  const backendPort = flag('--backend-port') ? Number(flag('--backend-port')) : undefined;
  const outDir = flag('--out-dir');

  // The stubs at the head of the list meet the page's first load (see stub_route above).
  let leading = 0;
  while (leading < steps.length && verbOf(steps[leading], leading + 1) === 'stub_route') leading++;
  let stubs;
  let network;
  const beforeBoot = async (tab) => {
    network = networkLog(tab);
    await network.start();
    stubs = routeStubs(tab);
    for (let i = 0; i < leading; i++) await stubs.add(parseStub(steps[i], i + 1));
  };

  try {
    const result = await withRenderedPage({ projectDir, backendPort, beforeBoot }, async (page) => {
      await page.setViewport(viewport);
      if (start && !start.isStart) await page.navigate(start.url);
      const rows = await runSteps(page, steps, { outDir, stubs, network, beforeBoot: leading });
      const pageState = await page.evaluate(`(() => {
        let webgl2 = false;
        try { webgl2 = !!document.createElement('canvas').getContext('webgl2'); } catch (e) {}
        return { url: location.pathname + location.hash, visibilityState: document.visibilityState, focused: document.hasFocus(), webgl2 };
      })()`);
      return {
        verdict: rows.length === steps.length && rows.every((r) => r.ok) ? 'passed' : 'failed',
        steps: rows,
        ran: rows.length,
        of: steps.length,
        viewport: `${viewport.width}x${viewport.height}`,
        page: pageState,
        ...(stubs.report().length ? { stubs: stubs.report() } : {}),
        consoleErrors: page.consoleErrors.slice(0, 20),
        networkErrors: network.errors().slice(0, 20),
        otherOrigins: network.otherOrigins()
      };
    });
    process.stdout.write(JSON.stringify(result));
  } catch (error) {
    if (error.usage) usage(error.message);
    const problems = error.problems || [error instanceof Error ? error.message : String(error)];
    process.stdout.write(JSON.stringify({ error: { message: problems.join(' '), problems, actionable: Boolean(error.actionable) } }));
  }
}

if (require.main === module) main();

module.exports = { runSteps, locateExpression, routeStubs, networkLog, parseStub, VERBS };
