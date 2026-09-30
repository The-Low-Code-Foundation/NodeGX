/**
 * The island backups (P105 CG-004 §8.x, Richard's ruling R14 "Back up the real save", 2026-09-28).
 * Forked from Nightbook's shell (TPL-011 V1-6) and rewritten: its copies were the backend's SQLite snapshot, and the
 * game keeps NOTHING there (measured: every data table 0 rows; the policy is closed, `workflows: []`). The family — every
 * player, her robot, her island — is ONE localStorage entry of the page (the runtime's persisted Global store:
 * `noodl_store_` + the template's storage key `bot-garden`). So:
 *
 * - READ: the main process evaluates ONE fixed, side-effect-free expression in the page (`readExpression(key)`, built
 *   from garden.json's key, never from page data) and gets that entry as a string.
 * - WRITE: a family with at least one player becomes `island-backup-YYYY-MM-DD.json` in `Documents/<folderName>`: the
 *   stored JSON itself (what a restore writes back; the page migrates an older save on load, as it does after any
 *   upgrade) and the save code (the same code the Grown-ups page shows, `BG1.` + the packed v5 model, byte-identical to
 *   the page's own encoder — `tests/copies.test.js` runs the template's encoder and decoder against this one). One file
 *   a day (a later run the same day replaces it), the newest `keepDays` days kept, and a `README.txt` in EN and FR.
 *   No players → nothing written. Nothing leaves the machine.
 * - RESTORE: the shell's menu "Restore a backup…" (main.js): a parent picks a day's file and confirms; the family now
 *   is kept first (`…-before-restore.json`), the stored JSON is written back into the page's storage, the page
 *   reloads, and the players are read back to say whether it worked.
 * - The relay's one door: `GET <prefix>copies` lists the backups, newest first (read-only). The old POST doors (make a
 *   SQLite copy, restore one) went with the SQLite copy: no page ever called them.
 *
 * Plain Node, no dependencies, so `node --test` runs it.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const PREFIX = '/__garden/';
const HEADER = 'x-garden';
/** The persisted Global store's prefix (packages/noodl-runtime/src/nodes/std-library/agent/globalstore.ts). */
const STORE_PREFIX = 'noodl_store_';
const FILE_RE = /^island-backup-(\d{4}-\d{2}-\d{2})(-before-restore)?\.json$/;
/** A family is a few kilobytes; anything near this is not one. */
const MAX_BYTES = 2 * 1024 * 1024;
const KIND = 'olive-island-backup';

// ── The page's save, read and written ────────────────────────────────────────

/**
 * The one expression the shell evaluates to READ the page: a constant for a key. It reads, it never writes, and it
 * never throws (a storage the page cannot open is "nothing to back up").
 */
function readExpression(storageKey) {
  return `(() => { try { return window.localStorage.getItem(${JSON.stringify(STORE_PREFIX + storageKey)}); } catch (e) { return null; } })()`;
}

/**
 * The expression that WRITES a restored family back. The value is the shell's own re-serialisation of a file it has
 * parsed, passed as a JSON string literal: data, never code, whatever a name holds.
 */
function restoreExpression(storageKey, store) {
  const key = JSON.stringify(STORE_PREFIX + storageKey);
  return `((k, v) => { window.localStorage.setItem(k, v); return window.localStorage.getItem(k) === v; })(${key}, ${JSON.stringify(JSON.stringify(store))})`;
}

/**
 * What the page's storage held, read: `{ ok: true, store, model, players }` for a family with at least one player,
 * else `{ ok: false, reason }` — `none` (no entry), `too-big`, `unreadable`, `empty` (no players: nothing to keep).
 */
function readFamily(raw) {
  if (raw === null || raw === undefined || raw === '') return { ok: false, reason: 'none' };
  if (typeof raw !== 'string') return { ok: false, reason: 'unreadable' };
  if (raw.length > MAX_BYTES) return { ok: false, reason: 'too-big' };
  let store;
  try {
    store = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'unreadable' };
  }
  const model = store && typeof store === 'object' && !Array.isArray(store) ? store.model : null;
  if (!model || typeof model !== 'object' || !Array.isArray(model.profiles)) return { ok: false, reason: 'unreadable' };
  if (model.profiles.length === 0) return { ok: false, reason: 'empty' };
  const players = model.profiles.map((p) => String((p && p.name) || '')).filter(Boolean);
  return { ok: true, store, model, players };
}

// ── The save code (the page's `Logic/Encode save code`, v5 only — P106 IG-004, P108 IW-006) ─

const SAVE_VERSION = 5;
/** P108 IW-006 (v5): the page's BRAIN_SIZE and BRAIN_SIZES (cg002Content.ts) — a row keeps a brain only when it is a bigger size. */
const BRAIN_SIZE = 12;
const BRAIN_SIZES = [12, 16, 20];
const FIRST_ROBOT_ID = 'r1';
const MAX_PROFILES = 6;
const ROBOT_NAME_MAX = 16;
const TRICK_KEYS = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7'];
/** P108 IW-001 F8: the page's CARDS_MAX (cg002Scripts.ts) — the most block cards a profile keeps as seen. */
const CARDS_MAX = 64;

/** P108 IW-001 F8: the page's `cardsOf` — text ids, trimmed, once each, first seen first, at most CARDS_MAX. */
function cardsOf(raw) {
  const out = [];
  for (const v of Array.isArray(raw) ? raw : []) {
    if (out.length >= CARDS_MAX) break;
    const id = typeof v === 'string' ? v.trim().slice(0, 40) : '';
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

function trickLetters(raw) {
  let out = '';
  for (const k of TRICK_KEYS) {
    const v = raw && raw[k];
    const t = v === 'bloom' || v === 'sprout' ? v : k === 'n1' ? 'sprout' : 'seed';
    out += t === 'bloom' ? 'b' : t === 'sprout' ? 's' : '-';
  }
  return out;
}

/** P106 IG-005: the robot kinds of the page's catalogue (`cg002Content.ts` ROBOTS) — a row's kind is kept only when it is one. */
const ROBOT_KINDS = ['pip', 'cobble', 'pocket', 'echo'];

/** P106 IG-004/005: the page's robotsOf — every row once, the first robot always there and first, a lent robot's look kept. */
function robotsOf(raw) {
  const out = [{ id: FIRST_ROBOT_ID }];
  const seen = { [FIRST_ROBOT_ID]: 1 };
  for (const r of Array.isArray(raw) ? raw : []) {
    const id = r && typeof r === 'object' ? String(r.id || '') : typeof r === 'string' ? r : '';
    // P108 IW-006 (v5): r1 is always first; its stored row gives it only its brain.
    if (id === FIRST_ROBOT_ID && seen[id] === 1) {
      crewOnto(brainOnto(out[0], r), r);
      seen[id] = 2;
      continue;
    }
    if (!id || seen[id]) continue;
    seen[id] = 1;
    out.push(id === FIRST_ROBOT_ID ? crewOnto(brainOnto({ id }, r), r) : robotFields(id, r));
  }
  return out;
}

/** P108 IW-008 (lane C): the page's crewOnto — a row's program (one block at least) and the plot it helps on, when sound. */
function crewOnto(row, r) {
  if (!r || typeof r !== 'object') return row;
  const pg = programOf(r.program);
  if (pg && pg.length) row.program = pg;
  if (typeof r.helps === 'string' && r.helps && r.helps !== 'free') row.helps = r.helps.slice(0, 40);
  return row;
}

/** P108 IW-008 (lane C): the page's crewHelps — a second robot only beside the one pinned there, with a program, one a plot. */
function crewHelps(robots, plots) {
  const taken = {};
  for (const r of robots) {
    if (!r.helps) continue;
    const q = plots[r.helps];
    const pinnedHere = Object.keys(plots).some((id) => plots[id] && plots[id].robotId === r.id);
    if (!q || !q.robotId || q.robotId === r.id || pinnedHere || taken[r.helps] || !r.program) {
      delete r.helps;
      continue;
    }
    taken[r.helps] = r.id;
  }
}

/** P108 IW-006 (v5): the page's brainOnto — a brain kept only when it is one of BRAIN_SIZES and bigger than BRAIN_SIZE. */
function brainOnto(row, r) {
  const b = r && typeof r === 'object' ? Math.floor(Number(r.brain)) : 0;
  if (b > BRAIN_SIZE && BRAIN_SIZES.includes(b)) row.brain = b;
  return row;
}

/** P108 IW-006 (v5): the page's shellsOf — whole shells, never below 0, never more spent than earned. */
function shellsOf(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const earned = Math.max(0, Math.floor(Number(r.earned)) || 0);
  return { earned, spent: Math.min(earned, Math.max(0, Math.floor(Number(r.spent)) || 0)) };
}

/** P108 IW-006 (v5): the page's ownedOf — text ids, trimmed, once each, in the order bought, at most CARDS_MAX. */
function ownedOf(raw) {
  const out = [];
  for (const v of Array.isArray(raw) ? raw : []) {
    if (out.length >= CARDS_MAX) break;
    const id = typeof v === 'string' ? v.trim().slice(0, 40) : '';
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

/** P108 IW-006 (v5): the page's liveOf — a plot's live job { things, age, seed, spent?, helper? }, or null. */
function liveOf(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !Array.isArray(raw.things)) return null;
  const out = { things: JSON.parse(JSON.stringify(raw.things)), age: Math.max(0, Math.floor(Number(raw.age)) || 0), seed: Number(raw.seed) >>> 0 };
  if (Array.isArray(raw.spent) && raw.spent.length) out.spent = JSON.parse(JSON.stringify(raw.spent));
  if (typeof raw.helper === 'string' && raw.helper) out.helper = raw.helper.slice(0, 40);
  return out;
}

/** P106 IG-005: the page's robotFields — each field of a lent robot's row only when it is there and sound. */
function robotFields(id, r) {
  const row = { id };
  if (!r || typeof r !== 'object') return row;
  if (ROBOT_KINDS.includes(String(r.kind))) row.kind = String(r.kind);
  const n = typeof r.name === 'string' ? r.name.trim().slice(0, ROBOT_NAME_MAX) : '';
  if (n) row.name = n;
  if (typeof r.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(r.color)) row.color = r.color;
  if (r.eye === 'round' || r.eye === 'happy' || r.eye === 'wink') row.eye = r.eye;
  if (typeof r.hat === 'string' && r.hat) row.hat = r.hat;
  return crewOnto(brainOnto(row, r), r);
}

function programOf(v) {
  let p = v;
  if (typeof p === 'string') {
    try {
      p = JSON.parse(p);
    } catch {
      p = null;
    }
  }
  return Array.isArray(p) ? JSON.parse(JSON.stringify(p)) : null;
}

/** The page's plotsOf: a plot pinned only to a robot of this island with a program; a robot pinned twice keeps its latest. */
function plotsOf(raw, robots) {
  const out = {};
  const ids = [];
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  for (const id of Object.keys(src)) {
    const p = src[id];
    if (!id || id === 'free' || !p || typeof p !== 'object') continue;
    const plot = { program: programOf(p.program), robotId: String(p.robotId || ''), wonAt: Number(p.wonAt) || 0 };
    const live = liveOf(p.live);
    if (live) plot.live = live;
    const pinned = Array.isArray(plot.program) && plot.program.length && plot.robotId && robots.some((r) => r.id === plot.robotId);
    if (!pinned) plot.robotId = '';
    out[id] = plot;
    ids.push(id);
  }
  ids.sort((a, b) => out[b].wonAt - out[a].wonAt);
  const taken = {};
  for (const id of ids) {
    const q = out[id];
    if (!q.robotId) continue;
    if (taken[q.robotId]) q.robotId = '';
    else taken[q.robotId] = id;
  }
  return out;
}

function islandOf(raw) {
  const i = raw && typeof raw === 'object' ? raw : {};
  const done = [];
  for (const d of Array.isArray(i.done) ? i.done : []) if (!done.includes(String(d))) done.push(String(d));
  const robots = robotsOf(i.robots);
  const plots = plotsOf(i.plots, robots);
  crewHelps(robots, plots);
  return { done, plots, robots };
}

/**
 * The save code of a v5 model, exactly as the page packs it (profileOf's defaults, six players at most), or null for
 * any other version or a model missing an id: a model this shell does not know is kept as stored, never packed by a
 * guess (the page would mint a random id where one is missing).
 */
function saveCodeOf(model) {
  if (!model || Number(model.v) !== SAVE_VERSION) return null;
  const fam = model.family && typeof model.family === 'object' ? model.family : {};
  const isl = model.island && typeof model.island === 'object' ? model.island : {};
  if (!fam.id || !Number(fam.created)) return null;
  const list = (Array.isArray(model.profiles) ? model.profiles : []).slice(0, MAX_PROFILES);
  const p = [];
  for (const raw of list) {
    const x = raw && typeof raw === 'object' ? raw : {};
    if (!x.id) return null;
    const r = x.robot && typeof x.robot === 'object' ? x.robot : {};
    const island = islandOf(x.island);
    const plots = Object.keys(island.plots)
      .map((id) => {
        const q = island.plots[id];
        const row = [id, q.program, q.robotId, q.wonAt];
        if (q.live) row.push(q.live);
        return row;
      })
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    const row = [
      String(x.id),
      String(x.name || '').slice(0, 24),
      Number(x.band) === 1 ? 1 : 2,
      x.lang === 'fr' ? 'fr' : 'en',
      String(x.face || ''),
      String(r.name || 'Pip').slice(0, ROBOT_NAME_MAX),
      String(r.color || '#FF7A59'),
      String(r.eye || 'round'),
      String(r.hat || 'none'),
      trickLetters(x.tricks),
      Array.isArray(x.stickers) ? x.stickers.map(String) : [],
      Array.isArray(x.hats) ? x.hats.map(String) : [],
      island.done,
      plots,
      // P106 IG-005: r1 (and a row with no kind) is its id; a lent robot is [id, kind, name, color, eye, hat]. P108 IW-006
      // (v5): a robot with a bigger brain is always a row, its brain the seventh field.
      // P108 IW-008 (lane C): the program it carries the eighth field, the plot it helps on the ninth (null before a later one).
      island.robots.map((r) => {
        if ((r.id === FIRST_ROBOT_ID || !r.kind) && !r.brain && !r.program && !r.helps) return r.id;
        const rr = [r.id, r.id === FIRST_ROBOT_ID ? '' : r.kind || '', r.name || '', r.color || '', r.eye || '', r.hat || ''];
        if (r.brain || r.program || r.helps) rr.push(r.brain || null);
        if (r.program || r.helps) rr.push(r.program || null);
        if (r.helps) rr.push(r.helps);
        return rr;
      })
    ];
    // P108 IW-001 F8: row 15, the cards seen (null when none). P108 IW-006 (v5): row 16 the shells, row 17 what she bought.
    const seen = cardsOf(x.cardsSeen);
    const shells = shellsOf(x.shells);
    row.push(seen.length ? seen : null, [shells.earned, shells.spent], ownedOf(x.owned));
    p.push(row);
  }
  const packed = { v: SAVE_VERSION, f: [String(fam.id), Number(fam.created)], p, a: String(isl.activeId || (list[0] ? list[0].id : '')) };
  const b64 = Buffer.from(JSON.stringify(packed), 'utf8').toString('base64');
  return 'BG1.' + b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ── The folder ───────────────────────────────────────────────────────────────

/** The local calendar day, `YYYY-MM-DD`. */
function dayOf(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const fileFor = (day, tag = '') => `island-backup-${day}${tag}.json`;

/** The backups in `dir`, newest first: `{ name, day, at, bytes }`. A missing folder is none, never a throw. */
function listCopies(dir) {
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch {
    return [];
  }
  return names
    .filter((n) => FILE_RE.test(n))
    .map((name) => {
      try {
        const st = fs.statSync(path.join(dir, name));
        return st.isFile() ? { name, day: FILE_RE.exec(name)[1], at: st.mtime.toISOString(), bytes: st.size } : null;
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => (a.name < b.name ? 1 : a.name > b.name ? -1 : 0));
}

/** One a day for a month: every backup of a day older than the newest `keepDays` days goes; nothing else is touched. */
function prune(dir, keepDays) {
  const copies = listCopies(dir);
  const days = [...new Set(copies.map((c) => c.day))].sort().reverse();
  const keep = new Set(days.slice(0, keepDays));
  const removed = [];
  for (const c of copies) {
    if (keep.has(c.day)) continue;
    try {
      fs.unlinkSync(path.join(dir, c.name));
      removed.push(c.name);
    } catch {
      // a file that cannot go stays; the next run tries again
    }
  }
  return removed;
}

const README = `Olive's Island — backups of the islands
L'île d'Olive — sauvegardes des îles

EN
Every day Olive's Island is open, it keeps a copy of the family's islands in this folder: every player, their robot and
everything they have done on their island. One file a day, for a month. Nothing is sent anywhere: these files stay on
this computer.
To bring the islands back: open Olive's Island, open its menu (on a Mac, "Olive's Island" at the top of the screen; on
Windows, press the Alt key) and choose "Restore a backup…", then pick a day. The islands on the computer before that are
kept first, in a file marked "before-restore".
Each file also holds the family's save code (the line "saveCode"), the same code as on the Grown-ups page.

FR
Chaque jour où L'île d'Olive est ouverte, elle garde une copie des îles de la famille dans ce dossier : chaque joueur,
son robot et tout ce qu'il a fait sur son île. Un fichier par jour, pendant un mois. Rien n'est envoyé nulle part : ces
fichiers restent sur cet ordinateur.
Pour retrouver les îles : ouvre L'île d'Olive, ouvre son menu (sur un Mac, « Olive's Island » en haut de l'écran ; sous
Windows, appuie sur la touche Alt) et choisis « Restaurer une sauvegarde… », puis choisis un jour. Les îles qui étaient
sur l'ordinateur avant sont gardées d'abord, dans un fichier marqué « before-restore ».
Chaque fichier contient aussi le code de sauvegarde de la famille (la ligne « saveCode »), le même code que sur la page
Parents.
`;

function writeAtomic(file, text) {
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
}

/**
 * Write a family (a `readFamily` result that is ok) as the day's backup. `tag` is '' for the day's copy or
 * '-before-restore' for the copy a restore keeps first. Returns the file written.
 */
function writeBackup(dir, family, { now = new Date(), tag = '', keepDays = 31 } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, fileFor(dayOf(now), tag));
  const body = { kind: KIND, v: 1, at: now.toISOString(), players: family.players, saveCode: saveCodeOf(family.model), store: family.store };
  writeAtomic(file, JSON.stringify(body, null, 2) + '\n');
  const readme = path.join(dir, 'README.txt');
  let current = null;
  try {
    current = fs.readFileSync(readme, 'utf8');
  } catch {
    // none yet
  }
  if (current !== README) writeAtomic(readme, README);
  prune(dir, keepDays);
  return file;
}

/** A backup file read for a restore: `{ ok: true, store, players, at }` or `{ ok: false, reason }`. */
function parseBackupFile(text) {
  if (typeof text !== 'string' || text.length > MAX_BYTES) return { ok: false, reason: 'too-big' };
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'not-a-backup' };
  }
  if (!body || body.kind !== KIND || !body.store) return { ok: false, reason: 'not-a-backup' };
  const family = readFamily(JSON.stringify(body.store));
  if (!family.ok) return { ok: false, reason: family.reason === 'empty' ? 'empty' : 'not-a-backup' };
  return { ok: true, store: family.store, players: family.players, at: String(body.at || '') };
}

// ── The shell's side ────────────────────────────────────────────────────────

/**
 * The backups, bound to a window. `webContents()` returns the page's webContents or null; the ONLY expression this
 * evaluates to read is `readExpr` (a constant for the key).
 *
 * @param {{ webContents: () => any, folder: () => string, storageKey: string, keepDays?: number, dailyAt?: string,
 *   now?: () => Date, log?: (l: string) => void, timers?: { setTimeout: Function, clearTimeout: Function },
 *   reloadTimeoutMs?: number }} o
 */
function createIslandBackups(o) {
  const log = o.log || (() => {});
  const now = o.now || (() => new Date());
  const timers = o.timers || { setTimeout, clearTimeout };
  const keepDays = o.keepDays || 31;
  const readExpr = readExpression(o.storageKey);
  let timer = null;

  const live = () => {
    const wc = o.webContents();
    return wc && !(typeof wc.isDestroyed === 'function' && wc.isDestroyed()) ? wc : null;
  };

  async function readPage() {
    const wc = live();
    if (!wc) return { ok: false, reason: 'no-window' };
    let raw;
    try {
      raw = await wc.executeJavaScript(readExpr);
    } catch {
      return { ok: false, reason: 'unreadable' };
    }
    return readFamily(raw);
  }

  /** One backup now. Never throws: the result says what happened. */
  async function run(why, { tag = '' } = {}) {
    try {
      const family = await readPage();
      if (!family.ok) {
        log(`backup (${why}): nothing written — ${family.reason}`);
        return { wrote: null, reason: family.reason };
      }
      const file = writeBackup(o.folder(), family, { now: now(), tag, keepDays });
      log(`backup (${why}): ${family.players.length} player(s) -> ${file}`);
      return { wrote: file, players: family.players };
    } catch (e) {
      log(`backup (${why}) failed: ${e && e.message}`);
      return { wrote: null, reason: 'failed' };
    }
  }

  /** The day's backup unless the day has one (what the old policy called "run once on start" for a missed evening). */
  function runIfNoneToday(why) {
    const today = fileFor(dayOf(now()));
    if (listCopies(o.folder()).some((c) => c.name === today)) return Promise.resolve({ wrote: null, reason: 'done-today' });
    return run(why);
  }

  /** Every day at `dailyAt` (local time) while the app is open. Returns when the next one is. */
  function schedule() {
    const m = /^(\d{1,2}):(\d{2})$/.exec(o.dailyAt || '');
    const [h, min] = m ? [Number(m[1]), Number(m[2])] : [19, 0];
    const t = now();
    const next = new Date(t.getFullYear(), t.getMonth(), t.getDate(), h, min, 0, 0);
    if (next <= t) next.setDate(next.getDate() + 1);
    timer = timers.setTimeout(() => {
      run('daily').finally(schedule);
    }, next - t);
    return next;
  }

  function stop() {
    if (timer) timers.clearTimeout(timer);
    timer = null;
  }

  /**
   * Bring a parsed backup back into the page: the family now kept first, the store written, the page reloaded, the
   * players read back. `{ ok, players, reason? }`.
   */
  async function restore(parsed) {
    const wc = live();
    if (!wc) return { ok: false, reason: 'no-window' };
    const kept = await run('before a restore', { tag: '-before-restore' });
    const written = await wc.executeJavaScript(restoreExpression(o.storageKey, parsed.store));
    if (written !== true) return { ok: false, reason: 'not-written', kept: kept.wrote };
    const loaded = new Promise((resolve) => {
      const t = timers.setTimeout(resolve, o.reloadTimeoutMs || 15_000);
      wc.once('did-finish-load', () => {
        timers.clearTimeout(t);
        resolve();
      });
    });
    wc.reload();
    await loaded;
    const back = await readPage();
    const same = back.ok && parsed.players.every((n) => back.players.includes(n));
    log(`restore: ${same ? 'done' : 'NOT confirmed'} — ${parsed.players.join(', ')}`);
    return same ? { ok: true, players: back.players, kept: kept.wrote } : { ok: false, reason: 'not-read-back', players: back.players || [], kept: kept.wrote };
  }

  return { run, runIfNoneToday, schedule, stop, restore, folder: o.folder, readExpr };
}

/**
 * The backup at quit, held so it finishes before the app goes, and bounded so a page that never answers cannot keep
 * the app open. `hold(event, again)`: the first time (and while it runs), prevents the event, starts the backup once,
 * and calls every `again` (quit again / close again) when it settles or after `timeoutMs`; once it has settled,
 * returns false and lets everything pass.
 */
function createLeaving({ backup, timeoutMs = 3000, log = () => {} }) {
  let done = false;
  let running = null;
  const waiting = [];
  function hold(event, again) {
    if (done) return false;
    event.preventDefault();
    waiting.push(again);
    if (!running) {
      let timer;
      const late = new Promise((resolve) => {
        timer = setTimeout(() => {
          log(`backup at quit: gave up after ${timeoutMs} ms`);
          resolve();
        }, timeoutMs);
      });
      running = Promise.race([Promise.resolve().then(backup).catch(() => {}), late]).then(() => {
        clearTimeout(timer);
        done = true;
        for (const fn of waiting.splice(0)) fn();
      });
    }
    return true;
  }
  return { hold, isDone: () => done };
}

/**
 * The backend's SQLite backup, retired (it holds nothing of the game): a `backups.json` seeded by a build before R14 is
 * switched off in place, everything else in it kept. No file → nothing written.
 */
function retireBackendBackups(dataDir) {
  const file = path.join(dataDir, 'backups.json');
  let policy;
  try {
    policy = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return 'none';
  }
  if (!policy || !policy.schedule || !policy.schedule.enabled) return 'already';
  policy.schedule.enabled = false;
  writeAtomic(file, JSON.stringify(policy, null, 2) + '\n');
  return 'retired';
}

/** The menu's one item, in both languages (a parent may read either). */
const RESTORE_LABEL = 'Restore a backup… / Restaurer une sauvegarde…';

/**
 * The shell's whole menu: one item that restores a backup. On a Mac it sits in the app's menu with Quit (Cmd+Q);
 * elsewhere it is the window's one menu, hidden until Alt (`autoHideMenuBar` in main.js).
 * 🔴 On a Mac the Edit menu IS the clipboard: without its roles Cmd+C / Cmd+V do nothing in a text box (and Electron
 * has no right-click menu), so a parent could not paste a save code into Grown-ups. Windows needs no menu for Ctrl+V.
 */
function restoreMenu(platform, config, onRestore) {
  const item = { label: RESTORE_LABEL, click: () => onRestore() };
  if (platform === 'darwin') return [{ label: config.name, submenu: [item, { type: 'separator' }, { role: 'quit' }] }, { role: 'editMenu' }];
  return [{ label: config.name, submenu: [item] }];
}

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'content-length': Buffer.byteLength(json) });
  res.end(json);
}

/**
 * The relay's hook: `GET <prefix>copies` (the backups, newest first); anything else under the prefix is 404 (Olive's
 * doors answer first); returns false for anything outside the prefix.
 *
 * @param {{ folder: () => string }} api
 * @param {{ prefix?: string }} [o]
 */
function createShellDoors(api, o = {}) {
  const prefix = o.prefix || PREFIX;
  return function handle(req, res, urlPath) {
    if (!urlPath.startsWith(prefix)) return false;
    if (req.method === 'GET' && urlPath.slice(prefix.length) === 'copies') {
      send(res, 200, { copies: listCopies(api.folder()) });
      return true;
    }
    send(res, 404, { error: 'no such door' });
    return true;
  };
}

module.exports = {
  STORE_PREFIX,
  PREFIX,
  HEADER,
  README,
  readExpression,
  restoreExpression,
  readFamily,
  saveCodeOf,
  dayOf,
  listCopies,
  prune,
  writeBackup,
  parseBackupFile,
  createIslandBackups,
  createLeaving,
  retireBackendBackups,
  restoreMenu,
  RESTORE_LABEL,
  createShellDoors
};
