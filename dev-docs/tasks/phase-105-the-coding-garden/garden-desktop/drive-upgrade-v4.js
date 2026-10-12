#!/usr/bin/env node
/**
 * P108 IW-006 AC5 (session 5, lane O) — the packaged upgrade drive over a REAL v4 app: a family the v4 app stored is
 * opened by the current build, migrated to save v5 and written back at once, nothing lost, in English and in French.
 *
 *   node dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/drive-upgrade-v4.js --v4-exe <v4 app binary> [--exe <current app binary>]
 *
 * --v4-exe is an app built before save v5 (the drive reads its page bundle on disk and refuses one whose SAVE_VERSION is
 * not 4). --exe is the current build (the Mac's `shell/dist/mac-arm64/Olive's Island.app/Contents/MacOS/Olive's Island`);
 * without it the current build is `electron .` in shell/ (build-app.js must have run). Both launch against one throwaway
 * GARDEN_HOME, so launch 2 finds launch 1's leavings exactly as an installed upgrade does (Electron's userData and the
 * page's localStorage under it, pinned by main.js). GARDEN_OLIVE_STUB=1 on every launch: the owl is the shell's stub
 * engine behind the real route — no 500 MB model is loaded on a shared box (the owl is CG-004's drive, not this one's).
 *
 * For each band of `packages/noodl-mcp/tests/fixtures/iw006-v4-saves.json` (authentic v4 save codes, written by the v4
 * encoder; band 7–9: Léa FR; band 10–12: Noa FR and Sam EN), in its own home:
 *   launch 1 (the v4 app)        page drawn → Grown-ups → the v4 code pasted into "Paste a code" → "Replace the islands"
 *                                 → the v4 app's OWN decoder and store write the family (storage: v 4, its profiles) →
 *                                 quit (its shell backs the family up at quit)
 *   launch 2 (the current build)  page drawn → storage is v5 within seconds, with no tap (migrated and written back at
 *                                 once) → every profile whole: equal to what the v4 app stored, field for field, but for
 *                                 the wallet {0, 0} and owned [] added; its robots, stickers, hats, plots and programs
 *                                 listed → Profiles draws every kid → each kid's island opens in HER language, her
 *                                 requests done listed by their titles in it → quit
 *   disk                          the island backup of the day, rewritten at launch 2's quit: its stored family v5, its
 *                                 save code decoded by the CURRENT template's own decoder holds every kid
 *   wire                          every request of every launch: host 127.0.0.1
 *
 * Plain Node 22 (global WebSocket), no dependencies. Writes the report to GARDEN_DRIVE_REPORT when set.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');

const lib = require('./drive-lib');
const { config, CDP_PORT, ORIGIN, wait, until, portListening, quit, watchNetwork } = lib;

const argv = process.argv.slice(2);
const opt = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? path.resolve(argv[i + 1]) : null;
};
const V4_EXE = opt('--v4-exe');
const EXE = opt('--exe');
const REPO = path.resolve(lib.HERE, '../../../..');
const TEMPLATE = path.join(REPO, 'templates', 'bot-garden', 'components');
const FIXTURE = require(path.join(REPO, 'packages', 'noodl-mcp', 'tests', 'fixtures', 'iw006-v4-saves.json'));
const STORE_KEY = 'noodl_store_' + config.backups.storageKey;

const R = { bands: {}, hosts: {} };
const step = (s) => {
  R.steps = R.steps || [];
  R.steps.push(s);
  console.log(`· ${s}`);
};
function report() {
  const json = JSON.stringify(R, null, 2);
  console.log(json);
  if (process.env.GARDEN_DRIVE_REPORT) fs.writeFileSync(process.env.GARDEN_DRIVE_REPORT, json);
}

// ── What the current template says (its words, its requests, its decoder): never typed here ──
const nodesOf = (component) => {
  const nodes = JSON.parse(fs.readFileSync(path.join(TEMPLATE, ...component.split('/'), 'nodes.json'), 'utf8'));
  return Array.isArray(nodes) ? nodes : nodes.nodes || Object.values(nodes);
};
const rowsOf = (component) => JSON.parse(nodesOf(component).find((n) => n.type === 'Static Data').parameters.json);
const scriptOf = (component) => nodesOf(component).find((n) => n.type === 'JavaScriptFunction').parameters.functionScript;
const WORDS = {};
for (const r of rowsOf('Data/Words')) WORDS[r.key] = r;
const word = (lang, key) => String((WORDS[key] || {})[lang] || '');
const REQUESTS = rowsOf('Data/Requests');
const titleOf = (lang, id) => word(lang, REQUESTS.find((r) => r.id === id).copyKeys.title);
const CURRENT_V = Number(/var SAVE_VERSION = (\d+);/.exec(scriptOf('Logic/Encode save code'))[1]);
const decodeNow = (code) => {
  const Outputs = {};
  vm.runInNewContext(scriptOf('Logic/Decode save code'), { Inputs: { code }, Outputs, btoa, atob });
  return JSON.parse(JSON.stringify(Outputs));
};

/** The SAVE_VERSION a packaged app's page declares, read from its bundle on disk (Resources/app). */
function saveVersionOf(exe) {
  if (!exe) return CURRENT_V;
  const app = path.join(path.dirname(exe), '..', 'Resources', 'app');
  const seen = new Set();
  const walk = (dir) => {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, f.name);
      if (f.isDirectory()) walk(p);
      else if (/\.(json|js)$/.test(f.name)) for (const m of fs.readFileSync(p, 'utf8').matchAll(/SAVE_VERSION = (\d+)/g)) seen.add(Number(m[1]));
    }
  };
  walk(app);
  return [...seen];
}

/** Two values alike whatever order their keys were written in. */
const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((q) => [q, x[q]])) : x));
const without = (p) => {
  const q = JSON.parse(JSON.stringify(p));
  delete q.shells;
  delete q.owned;
  return q;
};
/** What a profile carries, listed: robots, stickers, hats, plots and their programs. */
const inventory = (p) => ({
  name: p.name,
  lang: p.lang,
  band: p.band,
  robots: (p.island.robots || []).map((r) => r.id),
  stickers: p.stickers,
  hats: p.hats,
  done: p.island.done,
  plots: Object.fromEntries(Object.entries(p.island.plots || {}).map(([k, v]) => [k, { robotId: v.robotId, blocks: Array.isArray(v.program) ? v.program.length : 0 }]))
});

const safe = (page, expr) => page.evaluate(expr).catch(() => null);
const storedModel = (page) => safe(page, `(() => { try { const v = JSON.parse(localStorage.getItem(${JSON.stringify(STORE_KEY)}) || 'null'); return v && (v.model || v); } catch (e) { return null; } })()`);
const go = (page, where) => safe(page, `location.assign(${JSON.stringify(ORIGIN + where)})`);
const pathIs = (page, want, ms = 10_000) =>
  until(`location ${want}`, () => safe(page, 'location.pathname'), (p) => p === want, ms).then(
    () => true,
    () => false
  );
const visibleInputs = `[...document.querySelectorAll('input')].filter((e) => e.offsetParent !== null)`;
const press = (page, finder) =>
  safe(
    page,
    `(() => { const el = (${finder}); if (!el) return { found: false };
      el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      const hit = !!at && (el === at || el.contains(at)); el.click(); return { found: true, hit }; })()`
  );
const type = (page, finder, value) =>
  safe(
    page,
    `(() => { const el = (${finder}); if (!el) return false; el.focus();
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur(); return true; })()`
  );

async function launch(home, exe, version) {
  const app = await lib.launch(home, exe, { GARDEN_VERSION: version, GARDEN_OLIVE_STUB: '1' });
  app.net = await watchNetwork(app.page);
  await until('page drawn', () => safe(app.page, 'document.body ? document.body.innerText : ""'), (s) => !!s && s.length > 0, 60_000);
  return app;
}
function mergeHosts(app) {
  for (const [h, n] of Object.entries(app.net.hosts())) R.hosts[h] = (R.hosts[h] || 0) + n;
}

/** The island backups of a home (R14): each file's stored family version and kids, and its save code decoded NOW. */
function backups(home) {
  const dir = path.join(home, 'Documents', config.backups.folderName);
  let names = [];
  try {
    names = fs.readdirSync(dir).filter((n) => /^island-backup-\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort();
  } catch {
    return [];
  }
  return names.map((name) => {
    try {
      const body = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
      const m = body.store && body.store.model;
      const d = body.saveCode ? decodeNow(body.saveCode) : null;
      return { name, storedV: m ? m.v : null, stored: m ? m.profiles.map((p) => p.name) : [], code: d && d.ok ? d.model.profiles.map((p) => p.name) : null, codeV: d && d.ok ? d.model.v : null };
    } catch (e) {
      return { name, error: String(e.message).slice(0, 200) };
    }
  });
}

async function band(key, home) {
  const fx = FIXTURE[key];
  const kids = fx.model.profiles.map((p) => p.name);
  const B = (R.bands[key] = { kids });

  // ── launch 1: the v4 app; its own Grown-ups page takes the v4 code ──
  step(`${key}: launch 1 — the v4 app (${path.basename(path.dirname(path.dirname(path.dirname(V4_EXE))))}), the v4 code pasted on Grown-ups`);
  let app = await launch(home, V4_EXE, '0.0.4');
  const L1 = (B.launch1 = {});
  L1.before = await storedModel(app.page);
  await go(app.page, '/grown-ups');
  L1.onGrownups = await pathIs(app.page, '/grown-ups', 15_000);
  await until('the paste box', () => safe(app.page, `!!(document.querySelector('input.bg-paste') || document.querySelector('.bg-paste input'))`), (b) => b === true, 15_000).catch(() => null);
  L1.typed = await type(app.page, `(document.querySelector('input.bg-paste') || document.querySelector('.bg-paste input'))`, fx.code);
  await wait(300);
  L1.replace = await press(app.page, `document.querySelector('.bg-paste-go')`);
  L1.stored = await until('the v4 family in storage', () => storedModel(app.page), (m) => !!m && Array.isArray(m.profiles) && m.profiles.length === kids.length, 10_000).catch(() => null);
  L1.storedV = L1.stored ? L1.stored.v : null;
  L1.storedKids = L1.stored ? L1.stored.profiles.map((p) => p.name) : [];
  // Authentic: what the v4 app wrote is the v4 encoder's own model of that code, field for field.
  L1.sameAsFixture = !!L1.stored && canon(L1.stored) === canon(fx.model);
  // Where the v4 app's own decoder and the fixture's model differ (a field a later v4 encoder wrote), path by path.
  L1.differsFromFixture = [];
  const diff = (a, b, at) => {
    if (canon(a) === canon(b)) return;
    if (a && b && typeof a === 'object' && typeof b === 'object') for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[k], b[k], `${at}.${k}`);
    else L1.differsFromFixture.push({ at, fixture: a === undefined ? '(absent)' : a, stored: b === undefined ? '(absent)' : b });
  };
  if (L1.stored) diff(fx.model, L1.stored, '');
  L1.logs = app.page.logs.slice(-10);
  await wait(1500);
  mergeHosts(app);
  L1.quit = await quit(app);
  await wait(1500);
  B.disk1 = backups(home);

  // ── launch 2: the current build over the same home ──
  step(`${key}: launch 2 — the current build (save v${CURRENT_V}) over the same home`);
  app = await launch(home, EXE, '0.0.5');
  const L2 = (B.launch2 = {});
  const t0 = Date.now();
  L2.migrated = await until('written back as the current version', () => storedModel(app.page), (m) => !!m && m.v === CURRENT_V, 15_000).catch(() => null);
  L2.migratedMs = Date.now() - t0;
  L2.v = L2.migrated ? L2.migrated.v : null;
  const v4 = L1.stored || fx.model;
  L2.whole = !!L2.migrated && L2.migrated.profiles.length === v4.profiles.length && v4.profiles.every((p, i) => canon(without(L2.migrated.profiles[i])) === canon(p));
  L2.wallets = L2.migrated ? L2.migrated.profiles.map((p) => ({ shells: p.shells, owned: p.owned })) : [];
  L2.walletsNew = L2.wallets.every((w) => canon(w.shells) === canon({ earned: 0, spent: 0 }) && canon(w.owned) === '[]');
  L2.activeKept = !!L2.migrated && L2.migrated.island.activeId === v4.island.activeId;
  L2.before = v4.profiles.map(inventory);
  L2.after = L2.migrated ? L2.migrated.profiles.map(inventory) : [];
  L2.inventoryKept = canon(L2.before) === canon(L2.after);
  // Profiles: every kid drawn; each kid's island in her own language.
  await go(app.page, '/');
  L2.cards = (await until('every kid’s card', () => safe(app.page, `[...document.querySelectorAll('.bg-profile h3')].filter((e) => e.offsetParent !== null).map((e) => e.innerText.trim())`), (l) => Array.isArray(l) && l.length >= kids.length, 15_000).catch(() => null)) || [];
  L2.islands = [];
  for (const p of v4.profiles) {
    await go(app.page, '/');
    await until('the cards', () => safe(app.page, `document.querySelectorAll('.bg-profile h3').length`), (n) => n >= kids.length, 10_000).catch(() => null);
    await wait(600);
    const chose = await press(app.page, `[...document.querySelectorAll('.bg-profile')].find((e) => e.offsetParent !== null && (e.querySelector('h3') || {}).innerText === ${JSON.stringify(p.name)})`);
    const onIsland = await pathIs(app.page, '/island', 10_000);
    await wait(1500);
    const heads = (await safe(app.page, `[...document.querySelectorAll('.bg-quest, .bg-island *')].filter((e) => e.offsetParent !== null && e.children.length === 0).map((e) => String(e.innerText || '').trim()).filter(Boolean)`)) || [];
    const titles = p.island.done.map((id) => titleOf(p.lang, id).split('{b}').join(p.robot.name));
    const isReq = word(p.lang, 'isReq');
    const again = await storedModel(app.page);
    L2.islands.push({
      name: p.name,
      lang: p.lang,
      chose,
      onIsland,
      inHerLanguage: heads.some((h) => h.toLowerCase() === isReq.toLowerCase()),
      titles,
      titlesShown: titles.every((t) => heads.some((h) => h.includes(t))),
      active: again && again.island.activeId === p.id,
      stillV: again && again.v
    });
  }
  L2.logs = app.page.logs.slice(-10);
  await wait(1000);
  mergeHosts(app);
  L2.quit = await quit(app);
  await wait(1500);
  B.disk2 = backups(home);

  B.clauses = {
    v4App: Array.isArray(R.v4SaveVersions) && R.v4SaveVersions.length === 1 && R.v4SaveVersions[0] === 4,
    seededByTheV4App: !!L1.onGrownups && !!L1.typed && !!L1.replace && L1.replace.found && L1.storedV === 4 && canon(L1.storedKids) === canon(kids),
    migratedAtOnce: L2.v === CURRENT_V && L2.migratedMs < 15_000,
    nothingLost: L2.whole && L2.walletsNew && L2.activeKept && L2.inventoryKept,
    everyKidOnProfiles: kids.every((k) => L2.cards.includes(k)),
    eachInHerLanguage: L2.islands.length === kids.length && L2.islands.every((x) => x.onIsland && x.inHerLanguage && x.titlesShown && x.active && x.stillV === CURRENT_V),
    languagesCovered: key === 'band2' ? ['en', 'fr'].every((l) => L2.islands.some((x) => x.lang === l)) : L2.islands.some((x) => x.lang === 'fr'),
    backupRewrittenV5: B.disk2.length === 1 && B.disk2[0].storedV === CURRENT_V && canon(B.disk2[0].stored) === canon(kids) && canon(B.disk2[0].code) === canon(kids)
  };
}

async function main() {
  if (!V4_EXE || !fs.existsSync(V4_EXE)) throw new Error(`--v4-exe must name a v4 app binary (got ${V4_EXE})`);
  if (EXE && !fs.existsSync(EXE)) throw new Error(`--exe ${EXE} does not exist`);
  for (const p of [CDP_PORT, config.port]) if (await portListening(p)) throw new Error(`port ${p} is already taken; nothing was launched`);
  R.v4Exe = V4_EXE;
  R.exe = EXE || 'electron . (shell/)';
  R.v4SaveVersions = saveVersionOf(V4_EXE);
  R.currentSaveVersions = EXE ? saveVersionOf(EXE) : [CURRENT_V];
  if (!(R.v4SaveVersions.length === 1 && R.v4SaveVersions[0] === 4)) throw new Error(`--v4-exe's page declares SAVE_VERSION ${R.v4SaveVersions.join(', ')}, not 4`);
  const scratch = fs.mkdtempSync(path.join(process.env.GARDEN_DRIVE_SCRATCH || os.tmpdir(), 'garden-upgrade-v4-'));
  R.home = scratch;
  await band('band2', path.join(scratch, 'band2'));
  await band('band1', path.join(scratch, 'band1'));
  R.offLoopback = Object.keys(R.hosts).filter((h) => !['127.0.0.1', 'about', 'data', 'blob'].includes(h));
  R.clauses = {
    ...Object.fromEntries(Object.entries(R.bands).flatMap(([k, b]) => Object.entries(b.clauses).map(([c, ok]) => [`${k}.${c}`, ok]))),
    currentIsV5: R.currentSaveVersions.length === 1 && R.currentSaveVersions[0] === CURRENT_V && CURRENT_V === 5,
    wire: R.offLoopback.length === 0
  };
  const n = Object.keys(R.clauses).length;
  const passed = Object.values(R.clauses).filter(Boolean).length;
  R.verdict = passed === n ? 'PASS' : 'FAIL';
  report();
  console.log(`\n${passed}/${n} clauses passed`);
  process.exit(passed === n ? 0 : 1);
}

main().catch((e) => {
  console.error(`drive-upgrade-v4: ${e.stack || e.message}`);
  R.error = e.message;
  lib.killAll();
  report();
  process.exit(1);
});
