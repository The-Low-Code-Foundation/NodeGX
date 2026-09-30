'use strict';
/**
 * copies.js — the island backups (R14 "Back up the real save"): the family read out of the page by ONE fixed
 * expression, written as a dated file holding the stored JSON and the save code, one a day for a month; nothing for a
 * family with no players; the save code byte-identical to the page's own encoder (the TEMPLATE's scripts run here); a
 * restore that writes the store back as data; the quit held for the backup, bounded; the backend's SQLite copy retired.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const http = require('http');
const path = require('path');
const vm = require('vm');

const C = require('../copies');
const { createRelay } = require('../relay');
const config = require('../garden.json');
const { tmp } = require('./helpers');

const REPO = path.resolve(__dirname, '../../../../../..');
const KEY = C.STORE_PREFIX + config.backups.storageKey;
const READ = C.readExpression(config.backups.storageKey);

// ── The page, in a box ──────────────────────────────────────────────────────

/** A page's localStorage that records every call. `throws` makes every access throw (a storage the page cannot open). */
function fakeStorage(initial = {}, { throws = false } = {}) {
  const map = new Map(Object.entries(initial));
  const calls = [];
  const s = {
    getItem(k) {
      calls.push(['getItem', k]);
      if (throws) throw new Error('SecurityError');
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      calls.push(['setItem', k, v]);
      map.set(k, String(v));
    },
    removeItem(k) {
      calls.push(['removeItem', k]);
      map.delete(k);
    },
    clear() {
      calls.push(['clear']);
      map.clear();
    }
  };
  return { s, map, calls };
}

/** A stand-in for Electron's webContents: evaluates what it is given against a fake page, records every expression. */
function fakeWebContents(storage) {
  const evaluated = [];
  const listeners = {};
  const ctx = vm.createContext({ window: { localStorage: storage.s } });
  return {
    evaluated,
    ctx,
    reloads: 0,
    isDestroyed: () => false,
    async executeJavaScript(expr) {
      evaluated.push(expr);
      return vm.runInContext(expr, ctx);
    },
    once(ev, fn) {
      (listeners[ev] = listeners[ev] || []).push(fn);
    },
    reload() {
      this.reloads++;
      setTimeout(() => (listeners['did-finish-load'] || []).splice(0).forEach((fn) => fn()), 5);
    }
  };
}

/** A Logic component of the generated template, run as the page runs it (a JavaScriptFunction: Inputs → Outputs). */
function pageScript(component) {
  const file = path.join(REPO, 'templates', 'bot-garden', 'components', 'Logic', component, 'nodes.json');
  assert.ok(fs.existsSync(file), `the template's ${component} (${file}) — a missing template must fail, not skip`);
  const n = JSON.parse(fs.readFileSync(file, 'utf8'));
  const list = Array.isArray(n) ? n : n.nodes || Object.values(n);
  const script = list.find((x) => x.type === 'JavaScriptFunction').parameters.functionScript;
  return (inputs) => {
    const Outputs = {};
    vm.runInNewContext(script, { Inputs: inputs, Outputs, btoa, atob });
    // Out of the page's realm, so deepStrictEqual compares values, not realms.
    return JSON.parse(JSON.stringify(Outputs));
  };
}

/** A family the page's own scripts made: Ada (robot Bolt) with a request done, Béa (robot Zoë), both v3. */
function pageFamily() {
  const add = pageScript('Add profile');
  const complete = pageScript('Complete request');
  let m = add({ model: null, name: 'Ada', band: 2, lang: 'en', face: 'fox', robotName: 'Bolt', color: '#3366FF', eye: 'round' }).model;
  const ada = m.island.activeId;
  m = add({ model: m, name: 'Béa ✿', band: 1, lang: 'fr', face: 'owl', robotName: 'Zoë', color: '#FF7A59', eye: 'star' }).model;
  m = complete({ model: m, requestId: 'tulips', profileId: ada, tricks: [1, 2], reward: { kind: 'hat', id: 'straw' } }).model;
  // P106 IG-004 (v4): a won plot keeps its program and the robot pinned to it — the code carries both.
  m = complete({ model: m, requestId: 'path', profileId: ada, tricks: [1], reward: null, program: [{ id: 1, t: 'fwd' }, { id: 2, t: 'repeat', n: 2, body: [{ id: 3, t: 'left' }] }], now: 1759000000000 }).model;
  return JSON.parse(JSON.stringify(m));
}

const stored = (model) => JSON.stringify({ model });

// ── The read ────────────────────────────────────────────────────────────────

test('the read is ONE constant expression: it asks for the family’s key and nothing else, and never throws', () => {
  assert.equal(KEY, 'noodl_store_bot-garden');
  const st = fakeStorage({ [KEY]: '{"model":{}}', other: 'x' });
  const got = vm.runInContext(READ, vm.createContext({ window: { localStorage: st.s } }));
  assert.equal(got, '{"model":{}}');
  assert.deepEqual(st.calls, [['getItem', KEY]], 'a read, only a read, only the key');
  const broken = fakeStorage({}, { throws: true });
  assert.equal(vm.runInContext(READ, vm.createContext({ window: { localStorage: broken.s } })), null);
});

test('the key is the page’s: the runtime’s persisted-store prefix + the template’s storage key (read from their sources)', () => {
  const runtime = fs.readFileSync(path.join(REPO, 'packages/noodl-runtime/src/nodes/std-library/agent/globalstore.ts'), 'utf8');
  assert.equal(/const STORAGE_KEY_PREFIX = '([^']+)'/.exec(runtime)[1], C.STORE_PREFIX);
  const pages = fs.readFileSync(path.join(REPO, 'packages/noodl-mcp/tests/cg003Components.ts'), 'utf8');
  assert.equal(/export const STORAGE_KEY = '([^']+)'/.exec(pages)[1], config.backups.storageKey);
  // …and the App store persists under it (a store that stopped persisting would leave the backups reading nothing).
  assert.match(pages, /persist: true, storageKey: STORAGE_KEY/);
});

// ── The write ───────────────────────────────────────────────────────────────

test('a family is written as the day’s file: the stored JSON, the players, the save code; the expression evaluated is the constant', async () => {
  const dir = tmp('garden-backups-');
  const fam = pageFamily();
  const wc = fakeWebContents(fakeStorage({ [KEY]: stored(fam) }));
  const b = C.createIslandBackups({ webContents: () => wc, folder: () => dir, storageKey: config.backups.storageKey, now: () => new Date(2026, 8, 28, 19, 0, 0) });
  const r = await b.run('test');
  assert.equal(r.wrote, path.join(dir, 'island-backup-2026-09-28.json'));
  const body = JSON.parse(fs.readFileSync(r.wrote, 'utf8'));
  assert.equal(body.kind, 'olive-island-backup');
  assert.deepEqual(body.players, ['Ada', 'Béa ✿']);
  assert.deepEqual(body.store, { model: fam }, 'the stored JSON itself');
  assert.match(body.saveCode, /^BG1\.[A-Za-z0-9_-]+$/);
  assert.ok(fs.readFileSync(path.join(dir, 'README.txt'), 'utf8').includes('Restaurer une sauvegarde'), 'README in FR');
  assert.ok(fs.readFileSync(path.join(dir, 'README.txt'), 'utf8').includes('Restore a backup'), 'README in EN');
  // The expression is the constant — the same string for a different family (it is not built from page data).
  const wc2 = fakeWebContents(fakeStorage({ [KEY]: stored({ ...fam, profiles: fam.profiles.slice(0, 1) }) }));
  await C.createIslandBackups({ webContents: () => wc2, folder: () => dir, storageKey: config.backups.storageKey }).run('test');
  assert.deepEqual(wc.evaluated, [READ]);
  assert.deepEqual(wc2.evaluated, [READ]);
  assert.equal(b.readExpr, READ);
});

test('a family with no players, no entry, an unreadable entry, no window: nothing written', async () => {
  const dir = tmp('garden-backups-');
  const empty = { ...pageFamily(), profiles: [] };
  for (const [label, entry, want] of [
    ['no players', stored(empty), 'empty'],
    ['no entry', undefined, 'none'],
    ['not JSON', '{nope', 'unreadable'],
    ['no model', '{"other":1}', 'unreadable']
  ]) {
    const wc = fakeWebContents(fakeStorage(entry === undefined ? {} : { [KEY]: entry }));
    const r = await C.createIslandBackups({ webContents: () => wc, folder: () => dir, storageKey: config.backups.storageKey }).run('test');
    assert.equal(r.wrote, null, label);
    assert.equal(r.reason, want, label);
  }
  const r = await C.createIslandBackups({ webContents: () => null, folder: () => dir, storageKey: config.backups.storageKey }).run('test');
  assert.equal(r.reason, 'no-window');
  assert.deepEqual(fs.readdirSync(dir), [], 'not even a README');
});

test('retention: the newest 31 days are kept (a restore’s safety copy counts in its day); other files are never touched', () => {
  const dir = tmp('garden-backups-');
  for (let i = 0; i < 40; i++) {
    const d = C.dayOf(new Date(2026, 7, 1 + i));
    fs.writeFileSync(path.join(dir, `island-backup-${d}.json`), '{}');
  }
  fs.writeFileSync(path.join(dir, 'island-backup-2026-08-01-before-restore.json'), '{}');
  fs.writeFileSync(path.join(dir, 'island-backup-2026-09-09-before-restore.json'), '{}');
  fs.writeFileSync(path.join(dir, 'notes.txt'), 'mine');
  fs.writeFileSync(path.join(dir, '2026-01-01.ngxbackup.tar.gz'), 'an old build’s');
  const fam = C.readFamily(stored(pageFamily()));
  C.writeBackup(dir, fam, { now: new Date(2026, 8, 10, 19, 0, 0), keepDays: config.backups.keepDays });
  const days = [...new Set(C.listCopies(dir).map((c) => c.day))];
  assert.equal(config.backups.keepDays, 31);
  assert.equal(days.length, 31);
  assert.equal(days[0], '2026-09-10', 'newest first');
  assert.equal(days[30], '2026-08-11');
  assert.ok(fs.existsSync(path.join(dir, 'island-backup-2026-09-09-before-restore.json')), 'a kept day keeps its safety copy');
  assert.ok(!fs.existsSync(path.join(dir, 'island-backup-2026-08-01-before-restore.json')), 'an old day’s goes with it');
  for (const f of ['notes.txt', '2026-01-01.ngxbackup.tar.gz', 'README.txt']) assert.ok(fs.existsSync(path.join(dir, f)), f);
});

test('the day’s backup on launch only when the day has none (the page is not even read otherwise)', async () => {
  const dir = tmp('garden-backups-');
  const wc = fakeWebContents(fakeStorage({ [KEY]: stored(pageFamily()) }));
  const b = C.createIslandBackups({ webContents: () => wc, folder: () => dir, storageKey: config.backups.storageKey, now: () => new Date(2026, 8, 28, 9, 0, 0) });
  assert.ok((await b.runIfNoneToday('launch')).wrote);
  assert.equal((await b.runIfNoneToday('launch')).reason, 'done-today');
  assert.equal(wc.evaluated.length, 1);
});

test('every evening at dailyAt while open, local time', () => {
  const set = [];
  const timers = { setTimeout: (fn, ms) => (set.push(ms), set.length), clearTimeout: () => {} };
  const at = (h, m) => C.createIslandBackups({ webContents: () => null, folder: tmp, storageKey: 'k', dailyAt: config.backups.dailyAt, timers, now: () => new Date(2026, 8, 28, h, m) }).schedule();
  assert.equal(config.backups.dailyAt, '19:00');
  assert.deepEqual(at(18, 0), new Date(2026, 8, 28, 19, 0));
  assert.deepEqual(at(20, 30), new Date(2026, 8, 29, 19, 0));
  assert.deepEqual(set, [3_600_000, 22.5 * 3_600_000]);
});

// ── The save code ───────────────────────────────────────────────────────────

test('the save code is byte-identical to the page’s own encoder, and the page’s decoder gives the family back', () => {
  const encode = pageScript('Encode save code');
  const decode = pageScript('Decode save code');
  const fam = pageFamily();
  assert.equal(C.saveCodeOf(fam), encode({ model: fam }).code);
  // The edges the page normalises: seven players (six kept), long names, a string band, no tricks, a repeated request.
  const edge = JSON.parse(JSON.stringify(fam));
  for (let i = 0; i < 5; i++) edge.profiles.push({ ...JSON.parse(JSON.stringify(fam.profiles[0])), id: `px${i}`, name: 'N'.repeat(30 + i) });
  edge.profiles[1].band = '1';
  edge.profiles[1].robot.name = 'R'.repeat(20);
  delete edge.profiles[2].tricks;
  edge.profiles[0].island.done.push('tulips', 'tulips');
  assert.equal(C.saveCodeOf(edge), encode({ model: edge }).code, 'the edges pack as the page packs them');
  const back = decode({ code: C.saveCodeOf(fam) });
  assert.equal(back.ok, true);
  assert.equal(back.migrated, false);
  assert.deepEqual(back.model.profiles.map((p) => [p.name, p.robot.name, p.island.done]), fam.profiles.map((p) => [p.name, p.robot.name, p.island.done]));
  // P106 IG-004: the pinned plot rode through the code (program, robot, when).
  assert.deepEqual(back.model.profiles[0].island.plots, fam.profiles[0].island.plots);
  assert.equal(fam.profiles[0].island.plots.path.robotId, 'r1');
  // P106 IG-005: a family with lent robots (Sami's post-box walk lends Cobble, Biscuit's bowl Pocket), one renamed and
  // recoloured, and rows a hand-edit broke (an unknown kind, a bad colour, a long name): packed as the page packs them.
  const complete = pageScript('Complete request');
  const lent = JSON.parse(JSON.stringify(fam));
  const ada = lent.profiles[0].id;
  let m = complete({ model: lent, requestId: 'path-postbox', profileId: ada, tricks: [1], reward: null }).model;
  m = complete({ model: m, requestId: 'bowl-if', profileId: ada, tricks: [4], reward: null }).model;
  const lentRobots = m.profiles[0].island.robots;
  assert.deepEqual(lentRobots.map((r) => r.id), ['r1', 'cobble', 'pocket'], 'the page lent both');
  lentRobots[1].name = 'Rocky';
  lentRobots[2].color = '#3FA66B';
  m.profiles[1].island.robots = [{ id: 'r1' }, { id: 'echo', kind: 'dragon', name: 'E'.repeat(20), color: 'violet', eye: 'star', hat: '' }, 'pocket'];
  assert.equal(C.saveCodeOf(m), encode({ model: m }).code, 'lent robots pack as the page packs them');
  const round = decode({ code: C.saveCodeOf(m) });
  assert.deepEqual(round.model.profiles[0].island.robots, lentRobots.map((r) => ({ ...r })), 'and the page reads them back');
  // P108 IW-001 F8: the cards a child has seen ride on her profile (row 15, only when there are any): packed as the page
  // packs them, the page reads them back, and a sibling's stay hers; a hand-edit (repeats, blanks, a number) is normalised.
  const seenFam = JSON.parse(JSON.stringify(fam));
  seenFam.profiles[0].cardsSeen = ['fwd', 'olive:read', 'fwd', '  ', 7, ' repeat '];
  assert.equal(C.saveCodeOf(seenFam), encode({ model: seenFam }).code, 'the cards seen pack as the page packs them');
  const seenBack = decode({ code: C.saveCodeOf(seenFam) });
  assert.deepEqual(seenBack.model.profiles.map((p) => p.cardsSeen), [['fwd', 'olive:read', 'repeat'], undefined], 'hers, and none for her sibling');
  assert.equal(seenBack.migrated, false);
  // None seen packs as a family that never had the field (row 15 null).
  const noneSeen = JSON.parse(JSON.stringify(fam));
  noneSeen.profiles[0].cardsSeen = [];
  assert.equal(C.saveCodeOf(noneSeen), C.saveCodeOf(fam));
  assert.equal(encode({ model: noneSeen }).code, C.saveCodeOf(fam));
  // A model this shell does not know is kept as stored, never packed by a guess (v3 is migrated by the page on load).
  assert.equal(C.saveCodeOf({ ...fam, v: 6 }), null);
  assert.equal(C.saveCodeOf({ ...fam, v: 4 }), null);
  assert.equal(C.saveCodeOf({ ...fam, v: 3 }), null);
  assert.equal(C.saveCodeOf({ ...fam, v: 2 }), null);
  // P108 IW-006 (v5): shells, what she bought, a plot's live job and brains (r1's and a copy's) pack as the page packs them,
  // and a hand-edit (spent over earned, a repeated id, a brain that is not a size) is normalised the same way.
  const rich = JSON.parse(JSON.stringify(m));
  rich.profiles[0].shells = { earned: 41.5, spent: 12 };
  rich.profiles[0].owned = ['rain', 'can+', 'rain', 7];
  rich.profiles[1].shells = { earned: 3, spent: 9 };
  rich.profiles[0].island.robots[0].brain = 16;
  rich.profiles[0].island.robots.push({ id: 'rk2', kind: 'pip', name: 'Bubbles', color: '#FF7A59', eye: 'round', hat: 'none', brain: 20 }, { id: 'rk3', kind: 'pip', name: 'Sprout', brain: 13 });
  const pinnedId = Object.keys(rich.profiles[0].island.plots)[0];
  rich.profiles[0].island.plots[pinnedId].live = { things: [{ kind: 'tulip', id: 't1', x: 2, y: 1, have: 1, need: 3 }], age: 44, seed: 7, helper: 'selfcan' };
  assert.equal(C.saveCodeOf(rich), encode({ model: rich }).code, 'v5 packs as the page packs it');
  const richBack = decode({ code: C.saveCodeOf(rich) });
  assert.equal(richBack.migrated, false);
  assert.deepEqual(richBack.model.profiles.map((p) => [p.shells, p.owned]), [[{ earned: 41, spent: 12 }, ['rain', 'can+']], [{ earned: 3, spent: 3 }, []]]);
  assert.deepEqual(richBack.model.profiles[0].island.robots.map((r) => r.brain), [16, undefined, undefined, 20, undefined]);
  assert.deepEqual([richBack.model.profiles[0].island.plots[pinnedId].live.age, richBack.model.profiles[0].island.plots[pinnedId].live.helper], [44, 'selfcan']);
});

// ── The restore ─────────────────────────────────────────────────────────────

test('the restore expression writes the store as DATA: a name made of code stays a name', () => {
  const fam = pageFamily();
  fam.profiles[0].name = '"); globalThis.pwned = 1; (" </script>';
  const st = fakeStorage();
  const ctx = vm.createContext({ window: { localStorage: st.s } });
  assert.equal(vm.runInContext(C.restoreExpression(config.backups.storageKey, { model: fam }), ctx), true);
  assert.equal(st.map.get(KEY), stored(fam));
  assert.equal(ctx.pwned, undefined);
  assert.deepEqual(st.calls.map((c) => c[0] + ' ' + c[1]), [`setItem ${KEY}`, `getItem ${KEY}`]);
});

test('a restore keeps the family now first, writes the day back, reloads, and reads the players back', async () => {
  const dir = tmp('garden-backups-');
  const then = pageFamily();
  const file = C.writeBackup(dir, C.readFamily(stored(then)), { now: new Date(2026, 8, 20, 19, 0, 0) });
  const now = { ...pageFamily(), profiles: [pageFamily().profiles[1]] };
  const st = fakeStorage({ [KEY]: stored(now) });
  const wc = fakeWebContents(st);
  const b = C.createIslandBackups({ webContents: () => wc, folder: () => dir, storageKey: config.backups.storageKey, now: () => new Date(2026, 8, 28, 10, 0, 0) });
  const parsed = C.parseBackupFile(fs.readFileSync(file, 'utf8'));
  assert.equal(parsed.ok, true);
  const r = await b.restore(parsed);
  assert.equal(r.ok, true);
  assert.deepEqual(r.players, ['Ada', 'Béa ✿']);
  assert.equal(wc.reloads, 1);
  assert.equal(st.map.get(KEY), stored(then), 'the day is back in the page’s storage');
  const kept = JSON.parse(fs.readFileSync(path.join(dir, 'island-backup-2026-09-28-before-restore.json'), 'utf8'));
  assert.deepEqual(kept.players, ['Béa ✿'], 'the family before the restore was kept first');
});

test('a file that is not a backup, or a backup of nobody, is refused before anything is touched', () => {
  assert.equal(C.parseBackupFile('hello').reason, 'not-a-backup');
  assert.equal(C.parseBackupFile(JSON.stringify({ kind: 'other', store: { model: pageFamily() } })).reason, 'not-a-backup');
  assert.equal(C.parseBackupFile(JSON.stringify({ kind: 'olive-island-backup', store: { model: { ...pageFamily(), profiles: [] } } })).reason, 'empty');
});

// ── The quit ────────────────────────────────────────────────────────────────

test('the quit waits once for the backup, then goes; a backup that never answers is given up on', async () => {
  const ev = () => ({ prevented: 0, preventDefault() {
    this.prevented++;
  } });
  let ran = 0;
  const again = [];
  const l = C.createLeaving({ backup: async () => void ran++, timeoutMs: 1000 });
  const e1 = ev();
  assert.equal(l.hold(e1, () => again.push('quit')), true);
  const e2 = ev();
  assert.equal(l.hold(e2, () => again.push('close')), true, 'a close while it runs waits too');
  await new Promise((r) => setTimeout(r, 20));
  assert.deepEqual([e1.prevented, e2.prevented, ran], [1, 1, 1], 'one backup for both');
  assert.deepEqual(again, ['quit', 'close']);
  const e3 = ev();
  assert.equal(l.hold(e3, () => again.push('late')), false, 'then everything passes');
  assert.equal(e3.prevented, 0);

  const hung = C.createLeaving({ backup: () => new Promise(() => {}), timeoutMs: 60 });
  let went = 0;
  const t0 = Date.now();
  hung.hold(ev(), () => went++);
  await new Promise((r) => setTimeout(r, 120));
  assert.equal(went, 1);
  assert.ok(Date.now() - t0 < 1000);
});

// ── The backend's SQLite copy, retired ──────────────────────────────────────

test('the backend’s SQLite backup: never seeded; one an older build seeded is switched off, the rest kept', () => {
  const dir = tmp('garden-data-');
  assert.equal(C.retireBackendBackups(dir), 'none');
  assert.ok(!fs.existsSync(path.join(dir, 'backups.json')), 'nothing written where there was nothing');
  const seeded = { version: 1, schedule: { enabled: true, cron: '0 19 * * *', missedFirePolicy: 'run-once-on-start' }, retention: { keepLast: 1, keepDaily: 30, keepWeekly: 0 }, destination: { type: 'local', path: '/x/Bot Garden backups' }, includeSecrets: false };
  fs.writeFileSync(path.join(dir, 'backups.json'), JSON.stringify(seeded));
  assert.equal(C.retireBackendBackups(dir), 'retired');
  const after = JSON.parse(fs.readFileSync(path.join(dir, 'backups.json'), 'utf8'));
  assert.deepEqual(after, { ...seeded, schedule: { ...seeded.schedule, enabled: false } });
  assert.equal(C.retireBackendBackups(dir), 'already');
});

// ── The door and the menu ───────────────────────────────────────────────────

function get(port, p, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: p, method }, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        let body = null;
        try {
          body = raw ? JSON.parse(raw) : null;
        } catch {
          body = raw;
        }
        resolve({ status: res.statusCode, body });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

test('the one door lists the backups (read-only); the old copy/restore doors are gone; the rest goes past', async () => {
  const dir = tmp('garden-backups-');
  C.writeBackup(dir, C.readFamily(stored(pageFamily())), { now: new Date(2026, 8, 28, 19, 0, 0) });
  const appDir = tmp('garden-app-');
  fs.writeFileSync(path.join(appDir, 'index.html'), '<html></html>');
  const server = createRelay({ appDir, backendPort: () => null, shell: C.createShellDoors({ folder: () => dir }, { prefix: config.doorPrefix }) });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  try {
    const list = await get(port, '/__garden/copies');
    assert.equal(list.status, 200);
    assert.deepEqual(list.body.copies.map((c) => c.name), ['island-backup-2026-09-28.json']);
    assert.equal((await get(port, '/__garden/copy', 'POST')).status, 404);
    assert.equal((await get(port, '/__garden/restore', 'POST')).status, 404);
    assert.equal((await get(port, '/functions/savePage')).status, 503, 'past the doors to the (absent) backend');
  } finally {
    server.close();
  }
});

test('the menu: one item that restores a backup; on a Mac beside Quit, and the Edit menu (Cmd+C/V in a text box)', () => {
  let asked = 0;
  const mac = C.restoreMenu('darwin', config, () => asked++);
  assert.equal(mac.length, 2);
  assert.deepEqual(mac[1], { role: 'editMenu' });
  assert.equal(mac[0].label, config.name);
  assert.deepEqual(mac[0].submenu.map((i) => i.label || i.role || i.type), [C.RESTORE_LABEL, 'separator', 'quit']);
  const win = C.restoreMenu('win32', config, () => asked++);
  assert.equal(win.length, 1);
  assert.deepEqual(win[0].submenu.map((i) => i.label), [C.RESTORE_LABEL]);
  win[0].submenu[0].click();
  assert.equal(asked, 1);
  assert.match(C.RESTORE_LABEL, /Restore a backup… \/ Restaurer une sauvegarde…/);
});
