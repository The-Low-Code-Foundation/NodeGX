// The backend map: people → screens → functions → tables on one canvas, with who may do what and what just ran.
import * as W from './words.js';
import * as R from './render.js';

const $ = (id) => document.getElementById(id);
const canvas = $('map');
const ctx = canvas.getContext('2d');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const COLORS = {
  screen: '#5ca9ff',
  table: '#45d08a',
  public: '#f97066',
  authenticated: '#4da3ff',
  role: '#a78bfa',
  nobody: '#7d8a98',
  calls: '#35c3e8',
  reads: '#45d08a',
  writes: '#fdb022',
  mentions: '#7d8a98',
  links: '#a78bfa',
  person: '#f776c4'
};
const OPEN_COLORS = ['#45d08a', '#a78bfa', '#fdb022', '#f97066'];

// BKO-003: the kinds of person "Look at it as" offers are the app's own: anyone signed in, and one per
// group its rules name (lens 'kind:signedIn', 'kind:role:<name>'). A real person is lens 'person'.
const KIND = 'kind:';

const state = {
  map: null,
  nodes: [],
  byId: {},
  edges: [],
  cam: { x: 0, y: 0, z: 1 },
  hover: null,
  selected: null,
  lens: 'all',
  search: '',
  particles: [],
  flashes: {},
  runs: [],
  seenRuns: new Set(),
  live: true,
  stars: [],
  edit: null,
  lastResult: null,
  // round 2: real people
  people: [],
  person: null, // { id, name, loading, reach: { tools, direct }, error }
  pathway: null, // { screen, loading, data, error }
  record: null, // { table, objectId, label, loading, data, error }
  rows: {}, // table → rows to choose from
  overlay: [], // wires drawn on top: a person's pathways
  lit: null, // node ids lit by the overlay
  tags: {}, // node id → { text, color }: a word above a block
  // round 3: what one person can reach, row by row, played out as it is measured
  reach: null, // { id, name, loading, tools: Set, notAllowed, readers, changers, fns, tables, rowIds, summary, runs }
  reachQueue: [],
  everyone: null // { loading, list: [ { person, reachedRows, totalRows, tables } ] }
};

// ───────────────────────────── loading ─────────────────────────────

async function api(path, body) {
  const res = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
  const json = await res.json().catch(() => ({ error: 'The editor’s server gave an answer the map couldn’t read.' }));
  if (!res.ok) throw Object.assign(new Error(json.error || 'Something went wrong.'), { refused: json.refused });
  return json;
}

/** A POST whose answer is one line of JSON per thing that happened, read as it arrives. */
async function stream(path, body, onEvent) {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });
  if (!res.ok || !res.body) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || 'Something went wrong.');
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (line) onEvent(JSON.parse(line));
    }
  }
  if (buf.trim()) onEvent(JSON.parse(buf));
}

async function load(keepView) {
  try {
    state.map = await api('api/map');
  } catch (e) {
    $('backendLine').innerHTML = `<span class="bad">●</span> ${esc(e.message)}`;
    $('livePulse').classList.add('off');
    setTimeout(() => load(keepView), 4000);
    return;
  }
  if (!state.people.length) {
    try {
      state.people = (await api('api/people')).people;
    } catch {
      /* the map still works without them */
    }
  }
  const m = state.map;
  R.setPersonKeys(m.personKeys);
  fillPicker();
  $('appName').textContent = `${m.app.name} — backend map`;
  const live = m.tables.filter((t) => !t.notOnBackend).length;
  const notYet = m.tables.length - live;
  $('backendLine').innerHTML =
    (m.backend.recordedAt
      ? `<span class="ok">●</span> A recording, made ${esc(new Date(m.backend.recordedAt).toLocaleDateString(undefined, { dateStyle: 'medium' }))} · `
      : `<span class="${m.backend.enforced && !m.backend.devOpen ? 'ok' : 'bad'}">●</span> ${esc(m.backend.name)} is running · `) +
    `${plural(live, 'table')}${notYet ? ` (and ${notYet} in the app, not on the backend yet)` : ''} · ${plural(m.functions.length, 'function')} · ${m.people == null ? 'people unknown' : plural(m.people, 'person', 'people')}` +
    ((m.problems ?? []).length ? ` · <span class="bad">couldn’t read its ${esc(m.problems.map((p) => p.what).join(', '))}</span>` : '');
  layout();
  if (!keepView) fit();
  renderSecure();
  renderLensNote();
  if (state.selected && state.byId[state.selected]) renderPanel();
}

/** "Look at it as": the kinds of person this app's rules know, then its real people. */
function fillPicker() {
  const roles = (state.map?.roles ?? []).map((r) => r.name);
  const kinds = [[`${KIND}signedIn`, 'Anyone signed in'], ...roles.map((r) => [`${KIND}role:${r}`, `Someone in the ${r} group`])];
  const opt = (v, words) => `<option value="${esc(v)}">${esc(words)}</option>`;
  const pick = $('personPick');
  const was = pick.value;
  pick.innerHTML =
    '<option value="">A person…</option>' +
    `<optgroup label="A kind of person">${kinds.map(([v, w]) => opt(v, w)).join('')}</optgroup>` +
    `<optgroup label="A real person">${
      state.people.length
        ? state.people.map((p) => opt(p.id, `${p.name}${p.roles.length ? ` (${p.roles.join(', ')})` : ''}`)).join('')
        : '<option disabled>Nobody has an account yet</option>'
    }</optgroup>`;
  if ([...pick.options].some((o) => o.value === was)) pick.value = was;
}

// ───────────────────────────── layout ─────────────────────────────

function screenWords(key) {
  if (key === 'App') return 'The app’s frame';
  return key.split('/').pop();
}

function callKind(rule) {
  if (Array.isArray(rule)) return rule.map(callKind).sort((a, b) => order(b) - order(a))[0] ?? 'nobody';
  if (rule === 'public') return 'public';
  if (rule === 'authenticated') return 'authenticated';
  if (typeof rule === 'string' && rule.startsWith('role:')) return 'role';
  return 'nobody';
  function order(k) {
    return { public: 3, authenticated: 2, role: 1, nobody: 0 }[k];
  }
}

function layout() {
  const m = state.map;
  const nodes = [];
  const edges = [];
  const add = (n) => (nodes.push(n), n);

  // the people, the real ones from the database, on the far left
  state.people.forEach((p, i) => add({ id: `p:${p.id}`, kind: 'person', key: p.id, person: p, title: p.name, x: -300, y: i * 66, w: 200, h: 46 }));
  m.screens.forEach((s, i) => add({ id: `s:${s}`, kind: 'screen', key: s, title: screenWords(s), x: 0, y: i * 84, w: 200, h: 56 }));
  const sy = Object.fromEntries(nodes.map((n) => [n.key, n.y]));

  // Functions, ordered by the screens that call them.
  const callersOf = {};
  for (const c of m.calls) (callersOf[c.fn] ??= new Set()).add(c.screen);
  const fns = [...m.functions].sort((a, b) => bary(a) - bary(b) || a.name.localeCompare(b.name));
  function bary(f) {
    const ys = [...(callersOf[f.name] ?? [])].map((s) => sy[s]);
    return ys.length ? ys.reduce((p, q) => p + q, 0) / ys.length : 1e6;
  }
  // two staggered columns, so the map is wide rather than tall
  const fx = (i) => 400 + (i % 2) * 280;
  const fyOf = (i) => Math.floor(i / 2) * 76 + (i % 2) * 38;
  fns.forEach((f, i) => add({ id: `f:${f.name}`, kind: 'fn', key: f.name, fn: f, title: f.name, x: fx(i), y: fyOf(i), w: 250, h: 56 }));
  const fy = Object.fromEntries(fns.map((f, i) => [f.name, fyOf(i)]));

  // Tables, ordered by the functions that touch them; two columns.
  const touchY = {};
  // NPMAUDIT-BACKENDMAPSCREENS: a screen that reads a table itself pulls it toward the screen.
  for (const u of m.uses ?? []) (touchY[u.table] ??= []).push([sy[u.screen] ?? 0, 0.5]);
  for (const f of m.functions) {
    for (const t of f.touches) {
      const w = t.hows.includes('mentions') && t.hows.length === 1 ? 0.25 : 1;
      (touchY[t.table] ??= []).push([fy[f.name], w]);
    }
  }
  const tb = (t) => {
    const l = touchY[t.name];
    if (!l) return 1e6;
    const sw = l.reduce((p, [, w]) => p + w, 0);
    return l.reduce((p, [y, w]) => p + y * w, 0) / sw;
  };
  const tables = [...m.tables].sort((a, b) => tb(a) - tb(b) || a.name.localeCompare(b.name));
  tables.forEach((t, i) => add({ id: `t:${t.name}`, kind: 'table', key: t.name, table: t, title: W.tableWords(t.name), x: 1110 + (i % 2) * 280, y: Math.floor(i / 2) * 76 + (i % 2) * 38, w: 240, h: 58 }));

  // BKO-003: a column the app doesn't have (no screens, no functions) leaves no hole: the next one moves up to the
  // gap the full map keeps between those two. With all four the places are the ones above.
  const GAP = { screen: 100, fn: 200, table: 180 };
  let cursor = null;
  for (const kind of ['person', 'screen', 'fn', 'table']) {
    const col = nodes.filter((n) => n.kind === kind);
    if (!col.length) continue;
    const left = Math.min(...col.map((n) => n.x));
    if (cursor !== null) col.forEach((n) => (n.x += cursor + (GAP[kind] ?? 180) - left));
    cursor = Math.max(...col.map((n) => n.x + n.w));
  }

  // Centre each column on y = 0.
  for (const kind of ['person', 'screen', 'fn', 'table']) {
    const col = nodes.filter((n) => n.kind === kind);
    if (!col.length) continue;
    const top = Math.min(...col.map((n) => n.y));
    const bottom = Math.max(...col.map((n) => n.y + n.h));
    const shift = -(top + bottom) / 2;
    col.forEach((n) => (n.y += shift));
  }

  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const pairs = {};
  for (const c of m.calls) {
    const id = `s:${c.screen}>f:${c.fn}`;
    if (!byId[`s:${c.screen}`] || !byId[`f:${c.fn}`]) continue;
    pairs[id] ??= { id, kind: 'calls', from: `s:${c.screen}`, to: `f:${c.fn}`, triggers: [] };
    pairs[id].triggers.push(c);
  }
  edges.push(...Object.values(pairs));
  // NPMAUDIT-BACKENDMAPSCREENS: the screen's own record nodes, straight to the table, no function between.
  const direct = {};
  for (const u of m.uses ?? []) {
    const id = `s:${u.screen}>t:${u.table}`;
    if (!byId[`s:${u.screen}`] || !byId[`t:${u.table}`]) continue;
    direct[id] ??= { id, kind: 'reads', from: `s:${u.screen}`, to: `t:${u.table}`, hows: [], uses: [] };
    if (!direct[id].hows.includes(u.how)) direct[id].hows.push(u.how);
    if (u.how !== 'reads') direct[id].kind = 'writes';
    direct[id].uses.push(u);
  }
  edges.push(...Object.values(direct));
  for (const f of m.functions) {
    for (const t of f.touches) {
      if (!byId[`t:${t.table}`]) continue;
      const writes = t.hows.some((h) => h === 'creates' || h === 'changes' || h === 'deletes');
      const kind = writes ? 'writes' : t.hows.includes('reads') ? 'reads' : 'mentions';
      edges.push({ id: `f:${f.name}>t:${t.table}`, kind, from: `f:${f.name}`, to: `t:${t.table}`, hows: t.hows, via: t.via });
    }
  }
  const seenLink = new Set();
  for (const l of m.links) {
    const k = `${l.from}>${l.to}`;
    if (seenLink.has(k) || !byId[`t:${l.from}`] || !byId[`t:${l.to}`]) continue;
    seenLink.add(k);
    edges.push({ id: `t:${l.from}>t:${l.to}`, kind: 'links', from: `t:${l.from}`, to: `t:${l.to}`, column: l.column, byName: l.byName });
  }
  state.nodes = nodes;
  state.byId = byId;
  state.edges = edges;
}

function fit() {
  const pad = { left: 30, right: state.selected ? 450 : 30, top: 175, bottom: 150 };
  const xs = state.nodes.map((n) => [n.x, n.x + n.w]).flat();
  const ys = state.nodes.map((n) => [n.y, n.y + n.h]).flat();
  const minX = Math.min(...xs) - 20, maxX = Math.max(...xs) + 120;
  const minY = Math.min(...ys) - 20, maxY = Math.max(...ys) + 20;
  const W_ = innerWidth - pad.left - pad.right, H_ = innerHeight - pad.top - pad.bottom;
  const z = Math.min(1.2, Math.max(0.25, Math.min(W_ / (maxX - minX), H_ / (maxY - minY))));
  state.cam.z = z;
  state.cam.x = pad.left + (W_ - (maxX - minX) * z) / 2 - minX * z;
  state.cam.y = pad.top + (H_ - (maxY - minY) * z) / 2 - minY * z;
}

// ───────────────────────────── what is lit ─────────────────────────────

function person() {
  if (!state.lens.startsWith(KIND)) return null;
  const kind = state.lens.slice(KIND.length);
  if (kind === 'signedIn') return { signedIn: true, roles: [], words: 'Anyone signed in' };
  const role = kind.slice('role:'.length);
  return { signedIn: true, roles: [role], words: `Someone in the ${role} group` };
}

function directRead(table) {
  const r = W.tableRule(state.map.config, table);
  return { read: W.readRule(r.permissions), change: [r.permissions.create, r.permissions.update, r.permissions.delete], rule: r };
}

/** For the lens: what this kind of person (or this real person) can do with each node. */
function lensOf(node) {
  if (state.lens === 'person') {
    // what they can reach is what came back to them, row by row: never what a function's code names
    const R_ = state.reach;
    if (!R_) return null;
    if (node.kind === 'person') return { can: node.key === R_.id };
    if (node.kind === 'fn') return { can: R_.tools.has(node.key) };
    if (node.kind === 'table') {
      const t = R_.tables[node.key];
      return { can: !!t?.reached, direct: !!t?.directly, via: Object.keys(t?.via ?? {}) };
    }
    if (node.kind === 'screen') {
      return {
        can:
          state.map.calls.some((c) => c.screen === node.key && R_.tools.has(c.fn)) ||
          (state.map.uses ?? []).some((u) => u.screen === node.key && R_.tables[u.table]?.directly)
      };
    }
    return { can: true };
  }
  const p = person();
  if (!p) return null;
  if (node.kind === 'person') return { can: true };
  if (node.kind === 'fn') return { can: W.passes(node.fn.call, p) };
  if (node.kind === 'table') {
    const d = directRead(node.key);
    const reads = W.passes(d.read, p);
    const writes = d.change.some((r) => W.passes(r, p));
    // "makers see their own": in, but to the rows they made only
    const ownOnly = !reads && d.rule.creatorOwns && p.signedIn;
    const via = state.map.functions.filter((f) => W.passes(f.call, p) && f.touches.some((t) => t.table === node.key));
    return { can: reads || writes || ownOnly || via.length > 0, direct: reads || writes || ownOnly, reads, writes, ownOnly, via };
  }
  return { can: true };
}

function related(id) {
  const set = new Set([id]);
  const n = state.byId[id];
  if (!n) return set;
  const out = (from) => state.edges.filter((e) => e.from === from);
  const inn = (to) => state.edges.filter((e) => e.to === to);
  if (n.kind === 'screen') {
    for (const e of out(id)) {
      set.add(e.to).add(e.id);
      for (const e2 of out(e.to)) if (e2.kind !== 'links') set.add(e2.to).add(e2.id);
    }
  } else if (n.kind === 'fn') {
    for (const e of [...out(id), ...inn(id)]) set.add(e.from).add(e.to).add(e.id);
  } else {
    for (const e of inn(id)) {
      set.add(e.from).add(e.id);
      if (e.kind !== 'links') for (const e2 of inn(e.from)) set.add(e2.from).add(e2.id);
    }
    for (const e of out(id)) set.add(e.to).add(e.id);
  }
  return set;
}

function matchesSearch(n) {
  if (!state.search) return true;
  const q = state.search.toLowerCase();
  return n.key.toLowerCase().includes(q) || n.title.toLowerCase().includes(q);
}

// ───────────────────────────── drawing ─────────────────────────────

function makeStars() {
  state.stars = Array.from({ length: 420 }, () => ({
    x: Math.random() * 4000 - 2000,
    y: Math.random() * 3000 - 1500,
    r: Math.random() * 1.3 + 0.2,
    tw: Math.random() * Math.PI * 2,
    d: Math.random() * 0.5 + 0.1
  }));
}

function resize() {
  const dpr = devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
}

function toScreen(x, y) {
  return [x * state.cam.z + state.cam.x, y * state.cam.z + state.cam.y];
}
function toWorld(sx, sy) {
  return [(sx - state.cam.x) / state.cam.z, (sy - state.cam.y) / state.cam.z];
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  // the block's notch, like a building block
  ctx.lineTo(x + 18, y);
  ctx.lineTo(x + 24, y + 5);
  ctx.lineTo(x + 38, y + 5);
  ctx.lineTo(x + 44, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function edgePoints(e) {
  const a = state.byId[e.from], b = state.byId[e.to];
  if (e.kind === 'links') {
    const x1 = a.x + a.w, y1 = a.y + a.h / 2, x2 = b.x + b.w, y2 = b.y + b.h / 2;
    const bulge = 40 + Math.abs(y2 - y1) * 0.25;
    const xm = Math.max(x1, x2) + bulge;
    return [x1, y1, xm, y1, xm, y2, x2, y2];
  }
  const x1 = a.x + a.w, y1 = a.y + a.h / 2, x2 = b.x, y2 = b.y + b.h / 2;
  const dx = Math.max(60, (x2 - x1) * 0.5);
  return [x1, y1, x1 + dx, y1, x2 - dx, y2, x2, y2];
}

/** A wire from any block to any block further right (or, for a person reaching a table, far right). */
function overlayPoints(a, b) {
  const x1 = a.x + a.w, y1 = a.y + a.h / 2, x2 = b.x, y2 = b.y + b.h / 2;
  const dx = Math.max(80, (x2 - x1) * 0.45);
  return [x1, y1, x1 + dx, y1, x2 - dx, y2, x2, y2];
}

function bez(p, t) {
  const u = 1 - t;
  return [
    u * u * u * p[0] + 3 * u * u * t * p[2] + 3 * u * t * t * p[4] + t * t * t * p[6],
    u * u * u * p[1] + 3 * u * u * t * p[3] + 3 * u * t * t * p[5] + t * t * t * p[7]
  ];
}

function draw(now) {
  const dpr = devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const Wd = innerWidth, Hd = innerHeight;
  ctx.fillStyle = state.map?.look?.colors?.ground ?? '#141318';
  ctx.fillRect(0, 0, Wd, Hd);

  // nebulae and stars, drifting slower than the map
  const neb = [
    [0.18, 0.35, '#5ca9ff'],
    [0.55, 0.6, '#a78bfa'],
    [0.85, 0.3, '#45d08a']
  ];
  for (const [fx, fy, c] of neb) {
    const gx = fx * Wd + state.cam.x * 0.08, gy = fy * Hd + state.cam.y * 0.08;
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(Wd, Hd) * 0.45);
    g.addColorStop(0, c + '14');
    g.addColorStop(1, c + '00');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, Wd, Hd);
  }
  for (const s of state.stars) {
    const x = ((s.x + state.cam.x * s.d) % Wd + Wd) % Wd;
    const y = ((s.y + state.cam.y * s.d) % Hd + Hd) % Hd;
    ctx.globalAlpha = 0.35 + 0.35 * Math.sin(now / 900 + s.tw);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (!state.map) return;

  ctx.setTransform(dpr * state.cam.z, 0, 0, dpr * state.cam.z, dpr * state.cam.x, dpr * state.cam.y);

  // column headings
  ctx.font = '600 13px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#7d8a98';
  const heads = [
    ['person', 'PEOPLE', 'the real ones, from the database'],
    ['screen', 'THE APP’S SCREENS', 'where people click'],
    ['fn', 'FUNCTIONS', 'the doors to the data, with their locks'],
    ['table', 'TABLES', 'where the data lives']
  ];
  for (const [kind, h, s] of heads) {
    const col = state.nodes.filter((n) => n.kind === kind);
    if (!col.length) continue;
    const top = Math.min(...col.map((n) => n.y));
    const x = Math.min(...col.map((n) => n.x));
    ctx.fillStyle = '#c4cedb';
    ctx.font = '700 14px Inter, system-ui, sans-serif';
    ctx.fillText(h, x, top - 42);
    ctx.fillStyle = '#7d8a98';
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.fillText(s, x, top - 24);
  }

  // A person's pathway (state.lit) is the highlight while it's shown; otherwise what's selected or hovered.
  const focus = (state.byId[state.selected] ? state.selected : null) ?? state.hover;
  const rel = state.lit ? null : focus ? related(focus) : null;

  // wires, under the blocks
  for (const e of state.edges) {
    const p = edgePoints(e);
    let alpha = e.kind === 'links' ? 0.16 : e.kind === 'mentions' ? 0.22 : 0.42;
    if (rel) alpha = rel.has(e.id) ? 0.95 : 0.05;
    if (state.lens !== 'all' && !rel) {
      const a = state.byId[e.from], b = state.byId[e.to];
      const la = lensOf(a), lb = lensOf(b);
      if ((a.kind === 'fn' && la?.can === false) || (b.kind === 'fn' && lb?.can === false)) alpha *= 0.15;
    }
    if (state.lit && !rel) alpha *= 0.25;
    if (state.search && !rel) {
      const a = state.byId[e.from], b = state.byId[e.to];
      if (!matchesSearch(a) && !matchesSearch(b)) alpha *= 0.2;
    }
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = COLORS[e.kind];
    ctx.lineWidth = e.kind === 'writes' ? 2.4 : 1.6;
    ctx.setLineDash(e.kind === 'mentions' ? [2, 5] : e.kind === 'links' ? [6, 5] : []);
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    ctx.bezierCurveTo(p[2], p[3], p[4], p[5], p[6], p[7]);
    ctx.stroke();
    if (rel && rel.has(e.id) && e.kind !== 'links') {
      // a gentle flow along the lit wires
      ctx.setLineDash([]);
      for (let k = 0; k < 3; k++) {
        const t = ((now / 2400 + k / 3) % 1);
        const [x, y] = bez(p, t);
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = COLORS[e.kind];
        ctx.beginPath();
        ctx.arc(x, y, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // a real person's pathways, on top
  for (const o of state.overlay) {
    const a = state.byId[o.from], b = state.byId[o.to];
    if (!a || !b) continue;
    const p = overlayPoints(a, b);
    ctx.globalAlpha = rel && !(rel.has(o.from) && rel.has(o.to)) ? 0.25 : 0.95;
    ctx.strokeStyle = o.color;
    ctx.lineWidth = o.width ?? 2.6;
    ctx.setLineDash(o.dash ?? []);
    ctx.shadowColor = o.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    ctx.bezierCurveTo(p[2], p[3], p[4], p[5], p[6], p[7]);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.setLineDash([]);
    if (o.flow !== false) {
      for (let k = 0; k < 2; k++) {
        const [x, y] = bez(p, (now / 1600 + k / 2 + (o.phase ?? 0)) % 1);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (o.label) {
      const [x, y] = bez(p, 0.5);
      ctx.font = '700 11px Inter, system-ui, sans-serif';
      const w = ctx.measureText(o.label).width + 12;
      ctx.fillStyle = 'rgba(12,12,16,0.92)';
      ctx.fillRect(x - w / 2, y - 9, w, 18);
      ctx.fillStyle = o.color;
      ctx.fillText(o.label, x - w / 2 + 6, y + 4);
    }
  }
  ctx.globalAlpha = 1;

  // runs flying along the wires
  state.particles = state.particles.filter((pt) => now - pt.start < pt.dur + pt.delay);
  for (const pt of state.particles) {
    const t = (now - pt.start - pt.delay) / pt.dur;
    if (t < 0) continue;
    let p;
    if (pt.from) {
      // a spark between any two blocks: a person's rows on their way
      const a = state.byId[pt.from], b = state.byId[pt.to];
      if (!a || !b) continue;
      p = overlayPoints(a, b);
    } else {
      const e = state.edges.find((x) => x.id === pt.edge);
      if (!e) continue;
      p = edgePoints(e);
    }
    for (let k = 0; k < 6; k++) {
      const tt = t - k * 0.03;
      if (tt < 0 || tt > 1) continue;
      const [x, y] = bez(p, tt);
      ctx.globalAlpha = 1 - k / 6;
      ctx.fillStyle = pt.color;
      ctx.shadowColor = pt.color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(x, y, 4.2 - k * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  for (const n of state.nodes) drawNode(n, now, rel);
}

function fnColor(f) {
  return COLORS[callKind(f.call)];
}

function drawNode(n, now, rel) {
  let alpha = 1;
  if (rel && !rel.has(n.id)) alpha = 0.18;
  const lens = state.lens !== 'all' ? lensOf(n) : null;
  if (lens && !lens.can && !rel) alpha = 0.22;
  if (state.lit && !rel) alpha = state.lit.has(n.id) ? 1 : n.kind === 'person' ? 0.4 : 0.16;
  if (state.search && !matchesSearch(n) && !rel) alpha = Math.min(alpha, 0.2);
  if (n.kind === 'table' && n.table.notOnBackend) alpha *= 0.7;
  ctx.globalAlpha = alpha;

  const color = n.kind === 'person' ? COLORS.person : n.kind === 'screen' ? COLORS.screen : n.kind === 'fn' ? fnColor(n.fn) : COLORS.table;
  const sel = state.selected === n.id, hov = state.hover === n.id;

  // a run's flash
  const fl = state.flashes[n.id];
  if (fl) {
    const t = (now - fl.at) / 1600;
    if (t > 1) delete state.flashes[n.id];
    else if (t >= 0) {
      ctx.save();
      ctx.globalAlpha = (1 - t) * 0.9;
      ctx.strokeStyle = fl.color ?? (fl.ok ? '#45d08a' : '#f97066');
      ctx.lineWidth = 3;
      const grow = t * 36;
      ctx.beginPath();
      ctx.roundRect(n.x - grow, n.y - grow, n.w + grow * 2, n.h + grow * 2, 14 + grow);
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = alpha;
    }
  }

  // glow
  if (sel || hov || (lens && lens.can && n.kind !== 'screen')) {
    ctx.shadowColor = lens && lens.direct ? '#f97066' : color;
    ctx.shadowBlur = sel ? 28 : 18;
  }
  roundRect(n.x, n.y, n.w, n.h, 10);
  ctx.fillStyle = sel ? '#2e2c36' : '#232129';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = sel ? 2.4 : 1.2;
  ctx.strokeStyle = sel || hov ? color : '#33323d';
  if ((n.kind === 'fn' && !n.fn.deployed) || (n.kind === 'table' && n.table.notOnBackend)) ctx.setLineDash([5, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // colour strip
  ctx.save();
  roundRect(n.x, n.y, n.w, n.h, 10);
  ctx.clip();
  ctx.fillStyle = color;
  ctx.fillRect(n.x, n.y, 6, n.h);
  ctx.restore();

  // icon
  const ix = n.x + 24, iy = n.y + n.h / 2;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  if (n.kind === 'person') {
    // a head and shoulders
    ctx.beginPath();
    ctx.arc(ix, iy - 5, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ix, iy + 11, 9, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else if (n.kind === 'screen') {
    ctx.strokeRect(ix - 8, iy - 10, 16, 20);
    ctx.fillRect(ix - 3, iy + 6, 6, 1.8);
  } else if (n.kind === 'fn') {
    // a door with a padlock
    ctx.strokeRect(ix - 8, iy - 11, 16, 22);
    ctx.beginPath();
    ctx.arc(ix + 3, iy + 1, 1.8, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // a stack of discs
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.ellipse(ix, iy - 7 + k * 7, 9, 3.2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // words
  const small = n.h < 50;
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 14px Inter, system-ui, sans-serif';
  ctx.fillText(clip(n.title, n.w - (n.kind === 'person' ? 56 : 80)), n.x + 44, n.y + (small ? 20 : 24));
  ctx.font = '12px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#c4cedb';
  ctx.fillText(clip(subtitle(n), n.w - (n.kind === 'person' ? 56 : 80)), n.x + 44, n.y + (small ? 36 : 42));

  // a word above the block, from a person's pathway ("REACHES IT", "RAN", …)
  const tag = state.tags?.[n.id];
  if (tag) {
    ctx.font = '700 11px Inter, system-ui, sans-serif';
    ctx.fillStyle = tag.color;
    ctx.fillText(tag.text, n.x + 44, n.y - 6);
  }

  // round 3: how much of this table reached the person, as a bar along its foot
  const R_ = state.lens === 'person' ? state.reach : null;
  if (R_ && n.kind === 'table') {
    const t = R_.tables[n.key];
    if (t && t.total) {
      ctx.save();
      roundRect(n.x, n.y, n.w, n.h, 10);
      ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(n.x + 6, n.y + n.h - 5, n.w - 6, 5);
      ctx.fillStyle = t.directly ? '#f97066' : COLORS.person;
      ctx.shadowColor = COLORS.person;
      ctx.shadowBlur = t.reached ? 8 : 0;
      ctx.fillRect(n.x + 6, n.y + n.h - 5, ((n.w - 6) * t.reached) / t.total, 5);
      ctx.restore();
    }
  }
  const ev = n.kind === 'person' && state.everyone?.byId?.[n.key];
  if (ev && ev.totalRows) {
    ctx.save();
    roundRect(n.x, n.y, n.w, n.h, 10);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(n.x + 6, n.y + n.h - 4, n.w - 6, 4);
    ctx.fillStyle = ev.person.roles?.length ? COLORS.role : COLORS.person;
    ctx.fillRect(n.x + 6, n.y + n.h - 4, ((n.w - 6) * ev.reachedRows) / ev.totalRows, 4);
    ctx.restore();
  }

  // badges on the right
  if (n.kind === 'fn') drawLock(n.x + n.w - 26, n.y + n.h / 2, color, callKind(n.fn.call), lens && !lens.can);
  if (n.kind === 'table') {
    const d = directRead(n.key);
    const open = Math.max(W.openness(d.read), ...d.change.map(W.openness));
    drawShield(n.x + n.w - 26, n.y + n.h / 2, OPEN_COLORS[open], open === 0, d.rule.own);
    if (lens && lens.direct && !state.tags?.[n.id]) {
      ctx.fillStyle = '#f97066';
      ctx.font = '700 11px Inter, system-ui, sans-serif';
      ctx.fillText('CAN OPEN DIRECTLY', n.x + 44, n.y - 6);
    }
  }
  ctx.globalAlpha = 1;
}

function drawLock(x, y, color, kind, closed) {
  ctx.save();
  ctx.strokeStyle = closed ? '#7d8a98' : color;
  ctx.fillStyle = closed ? '#7d8a98' : color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (kind === 'public') ctx.arc(x - 5, y - 3, 5, Math.PI, Math.PI * 1.9);
  else ctx.arc(x, y - 3, 5, Math.PI, 0);
  ctx.stroke();
  ctx.fillRect(x - 7, y - 3, 14, 11);
  ctx.restore();
}

function drawShield(x, y, color, sealed, own) {
  ctx.save();
  ctx.fillStyle = color + (sealed ? '33' : 'cc');
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(x, y - 11);
  ctx.lineTo(x + 9, y - 7);
  ctx.quadraticCurveTo(x + 9, y + 6, x, y + 11);
  ctx.quadraticCurveTo(x - 9, y + 6, x - 9, y - 7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (own) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + 9, y - 10, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function clip(text, max) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
  return t + '…';
}

/** A person's row in the app's profile table, in words ("learner id l-marie"), when the app has one. */
function profileWords(p) {
  // a recording made before BKO-003 carries `learnerId` where a person now has `profile`
  const keys = Object.entries(p.profile?.keys ?? (p.learnerId ? { learnerId: p.learnerId } : {}));
  return keys.map(([k, v]) => `${R.words(k).toLowerCase()} ${v}`).join(' · ');
}

function subtitle(n) {
  const m = state.map;
  if (n.kind === 'person') {
    const p = n.person;
    const ev = state.everyone?.byId?.[p.id];
    if (ev) return `reaches ${ev.reachedRows} of ${ev.totalRows} rows`;
    if (state.reach?.id === p.id && state.reach.summary) return `reaches ${state.reach.summary.reachedRows} of ${state.reach.summary.totalRows} rows`;
    return p.roles.length ? `the ${p.roles.join(', ')} group` : profileWords(p) || 'signed in, in no group';
  }
  if (n.kind === 'screen') {
    const fns = new Set(m.calls.filter((c) => c.screen === n.key).map((c) => c.fn));
    // a screen that reads and writes its tables itself (Query Records, Create Record) asks no function
    const own = new Set((m.uses ?? []).filter((u) => u.screen === n.key).map((u) => u.table));
    if (!fns.size && own.size) return `uses ${own.size} table${own.size === 1 ? '' : 's'} itself`;
    return `asks ${fns.size} function${fns.size === 1 ? '' : 's'}${own.size ? `, uses ${own.size} table${own.size === 1 ? '' : 's'} itself` : ''}`;
  }
  if (n.kind === 'fn') {
    if (!n.fn.deployed) return 'not live on the backend';
    return `${W.ruleWords(n.fn.call)} may run it`;
  }
  if (n.table.notOnBackend) return 'not on the backend yet';
  const d = directRead(n.key);
  const rows = n.table.rows == null ? '' : `${n.table.rows} row${n.table.rows === 1 ? '' : 's'} · `;
  const open = Math.max(W.openness(d.read), ...d.change.map(W.openness));
  return rows + (open === 0 ? (d.rule.creatorOwns ? 'sealed · makers see own' : 'sealed') : `open: ${W.ruleWords(d.read).toLowerCase()}`);
}

// ───────────────────────────── the "is it secure?" card ─────────────────────────────

function renderSecure() {
  const m = state.map;
  const lines = [];
  const add = (level, html) => lines.push({ level, html });
  if (m.backend.enforced && !m.backend.devOpen) add('good', '<b>The backend enforces its rules.</b> Nothing gets in without passing them.');
  else add('bad', '<b>The backend is NOT enforcing its rules</b> right now: everything is open.');
  for (const p of m.problems ?? []) add('bad', `<b>Couldn’t read the backend’s ${esc(p.what)}</b>, so the map leaves ${p.what === 'rules' ? 'every rule below unchecked' : 'that part out'}: ${esc(p.words)}`);
  if (!m.screens.length && !m.functions.length) add('info', '<b>The app reads and writes no table yet.</b> Once a screen or a function uses one, it shows here.');

  const openTables = m.tables
    .map((t) => ({ t, d: directRead(t.name) }))
    .filter(({ d }) => Math.max(W.openness(d.read), ...d.change.map(W.openness)) > 0 || d.rule.creatorOwns);
  if (!openTables.length) add('good', `<b>No table can be opened directly.</b> Every row is reached only through the app’s functions.`);
  else
    for (const { t, d } of openTables) {
      const o = Math.max(W.openness(d.read), ...d.change.map(W.openness));
      add(o >= 3 ? 'bad' : o >= 2 ? 'warn' : 'info', `<b>${esc(W.tableWords(t.name))}</b> can be opened directly: reading by ${esc(W.ruleWords(d.read).toLowerCase())}${d.rule.creatorOwns ? ', and makers see their own rows' : ''}.`);
    }

  const kinds = { public: [], authenticated: [], role: [], nobody: [] };
  for (const f of m.functions) kinds[callKind(f.call)].push(f.name);
  if (kinds.public.length) {
    const what = (name) => {
      const f = m.functions.find((x) => x.name === name);
      const t = f.touches.filter((x) => !x.hows.includes('mentions') || x.hows.length > 1);
      return t.length ? `${esc(name)}, which ${t.map((x) => `${x.hows.map((h) => W.HOW_WORDS[h]).join(' and ')} ${esc(W.tableWords(x.table))}`).join('; ')}` : esc(name);
    };
    add('warn', `<b>${kinds.public.length} function${kinds.public.length === 1 ? '' : 's'} anyone can run without signing in:</b> ${kinds.public.map(what).join(', ')}. Click it to check it only does what it should.`);
  }
  if (m.functions.length)
    add('info', `<b>${kinds.authenticated.length}</b> functions need someone signed in${kinds.role.length ? `; <b>${kinds.role.length}</b> only ${m.roles.length === 1 ? `the ${esc(m.roles[0].name)} group` : 'one group or another'}` : ''}${kinds.nobody.length ? `; <b>${kinds.nobody.length}</b> nobody` : ''}.`);

  const unsaved = Object.keys({ ...m.config.collections, ...m.fileCollections }).filter(
    (t) => JSON.stringify(m.config.collections[t] ?? null) !== JSON.stringify(m.fileCollections[t] ?? null)
  );
  if (unsaved.length) add('bad', `<b>Not saved:</b> the rules for ${unsaved.map((t) => esc(W.tableWords(t))).join(', ')} differ between the backend and the app’s folder. A restart would put the folder’s back.`);
  else add('good', `<b>The backend and the app’s folder agree</b> on every table’s rule, so a restart changes nothing.`);

  const notLive = m.functions.filter((f) => !f.deployed);
  if (notLive.length) add('warn', `<b>Not live:</b> ${notLive.map((f) => esc(f.name)).join(', ')} ${notLive.length === 1 ? 'is' : 'are'} in the app but not on the backend.`);
  if (m.config.signup === 'nobody' || m.config.signup == null) add('good', 'Nobody can make their own account: people are added by whoever runs the backend.');
  else add('warn', `${esc(W.ruleWords(m.config.signup))} can make an account.`);
  const fl = m.config.files ?? {};
  if (['upload', 'read', 'delete'].every((k) => W.openness(fl[k] ?? 'nobody') === 0)) add('good', 'Nobody can upload or read files directly.');
  add('info', 'What the map can’t see: which rows a function hands back is decided in its own code. The map shows which tables each function reaches, not which rows.');

  const worst = lines.some((l) => l.level === 'bad') ? 'bad' : lines.some((l) => l.level === 'warn') ? 'warn' : 'good';
  const dot = { good: '#45d08a', warn: '#fdb022', bad: '#f97066', info: '#7d8a98' };
  const head = { good: 'Is it secure? It looks locked down.', warn: 'Is it secure? Mostly — check the amber lines.', bad: 'Is it secure? Not right now — see the red lines.' }[worst];
  const el = $('secure');
  const small = el.classList.contains('small');
  el.innerHTML =
    `<h3><span style="color:${dot[worst]}">⬢</span> ${head}</h3>` +
    lines.map((l, i) => `<div class="line ${i > 2 ? 'more' : ''}"><span class="dot" style="background:${dot[l.level]}"></span><span>${l.html}</span></div>`).join('') +
    `<span class="toggle" id="secureToggle">${small ? 'Show all' : 'Show less'}</span>`;
  $('secureToggle').onclick = () => {
    el.classList.toggle('small');
    renderSecure();
  };
  el.querySelector('h3').onclick = () => el.classList.toggle('mini');
}

function renderLensNote() {
  const el = $('lensNote');
  if (state.lens === 'person' && state.reach) {
    el.classList.remove('hidden');
    const R_ = state.reach;
    if (R_.error) return (el.innerHTML = `Couldn’t look as <b>${esc(R_.name)}</b>: ${esc(R_.error)}`);
    const tables = Object.values(R_.tables);
    const got = tables.reduce((n, t) => n + t.reached, 0);
    const total = tables.reduce((n, t) => n + (t.total ?? 0), 0);
    const lit = tables.filter((t) => t.reached).length;
    el.innerHTML = R_.loading
      ? `<span class="spinner"></span>Running the backend’s functions as <b>${esc(R_.name)}</b>… <b>${got}</b> rows have reached them so far.`
      : `<b>${esc(R_.name)}</b> can reach <b>${got}</b> of ${total} rows, in <b>${lit}</b> of ${tables.length} tables. Dark tables: nothing of them reaches ${R_.id ? 'them' : 'anyone not signed in'}.${R_.id ? ' <b>Click a table</b> to see which rows.' : ''}`;
    return;
  }
  const p = person();
  if (!p || !state.map) return el.classList.add('hidden');
  const m = state.map;
  const fns = m.functions.filter((f) => W.passes(f.call, p));
  const tables = state.nodes.filter((n) => n.kind === 'table').map((n) => [n, lensOf(n)]);
  const read = tables.filter(([, l]) => l.reads);
  const own = tables.filter(([, l]) => l.ownOnly);
  const write = tables.filter(([, l]) => l.writes);
  const via = tables.filter(([, l]) => !l.direct && l.via.length);
  const names = (list) => (list.length ? ` (${list.map(([n]) => esc(n.title)).join(', ')})` : '');
  const parts = [
    ...(m.functions.length ? [`run <b>${fns.length}</b> of ${m.functions.length} functions${fns.length && fns.length <= 4 ? ` (${fns.map((f) => esc(f.name)).join(', ')})` : ''}`] : []),
    `read <b>${read.length}</b> table${read.length === 1 ? '' : 's'} directly${names(read)}`,
    ...(own.length ? [`see only the rows they made in <b>${own.length}</b> more${names(own)}`] : []),
    ...(write.length ? [`add or change rows directly in <b>${write.length}</b>${names(write)}`] : []),
    ...(m.functions.length ? [`reach <b>${via.length}</b> more only through those functions, which choose the rows in their own code`] : [])
  ];
  el.classList.remove('hidden');
  el.innerHTML = `<b>${esc(p.words)}</b> can ${parts.slice(0, -1).join(', ')}${parts.length > 1 ? ', and ' : ''}${parts.at(-1)}. Dim means out of reach.`;
}

// ───────────────────────────── the side panel ─────────────────────────────

function select(id) {
  const before = state.selected;
  state.selected = id;
  // the safety card folds to its headline while the panel is open, to leave the map room
  if (id) $('secure').classList.add('mini');
  if (!id) {
    $('panel').classList.add('hidden');
    if (state.pathway || state.record) {
      state.pathway = null;
      state.record = null;
      computeOverlay();
    }
    return;
  }
  const n = state.byId[id];
  if (n?.kind === 'table') {
    const d = directRead(n.key);
    state.edit = { table: n.key, read: d.read, change: W.changeRule(d.rule.permissions), creatorOwns: d.rule.creatorOwns };
    if (state.record && state.record.table !== n.key) state.record = null;
    if (!state.rows[n.key] && !n.table.notOnBackend) loadRows(n.key);
  }
  if (before !== id) {
    if (n?.kind !== 'screen') state.pathway = null;
    if (n?.kind !== 'table') state.record = null;
  }
  if (n?.kind === 'person') {
    if (state.reach?.id === n.key && !state.reach.error) {
      computeOverlay();
      return renderPanel();
    }
    return setPerson(n.key);
  }
  if (n?.kind === 'screen' && state.lens === 'person' && state.person?.id && state.person?.reach) followPathway(n.key);
  computeOverlay();
  state.lastResult = null;
  renderPanel();
}

function renderPanel() {
  if (state.selected === 'everyone' && state.everyone) {
    $('panel').classList.remove('hidden', 'wide');
    $('panelBody').innerHTML = everyonePanel();
    for (const b of $('panelBody').querySelectorAll('[data-as]')) b.onclick = () => setPerson(b.dataset.as);
    for (const b of $('panelBody').querySelectorAll('[data-anon]')) b.onclick = () => setPerson(null);
    return;
  }
  const n = state.byId[state.selected];
  if (!n) return select(null);
  $('panel').classList.remove('hidden');
  $('panel').classList.toggle('wide', n.kind === 'table');
  const html =
    n.kind === 'person'
      ? personPanel(n)
      : n.kind === 'table'
      ? state.record?.table === n.key
        ? recordPanel(n)
        : tablePanel(n)
      : n.kind === 'fn'
      ? fnPanel(n)
      : state.pathway?.screen === n.key
      ? pathwayPanel(n)
      : screenPanel(n);
  const keep = $('panel').scrollTop;
  const grid = $('panelBody').querySelector('.rowgrid-wrap')?.scrollTop ?? 0;
  const sameNode = $('panelBody').dataset.node === state.selected;
  $('panelBody').innerHTML = html;
  $('panelBody').dataset.node = state.selected;
  if (sameNode) {
    $('panel').scrollTop = keep;
    const g = $('panelBody').querySelector('.rowgrid-wrap');
    if (g) g.scrollTop = grid;
  }
  for (const a of $('panelBody').querySelectorAll('[data-go]')) a.onclick = () => focusOn(a.dataset.go);
  for (const b of $('panelBody').querySelectorAll('[data-row]')) b.onclick = () => openRecord(n.key, b.dataset.row);
  for (const b of $('panelBody').querySelectorAll('[data-as]')) b.onclick = () => setPerson(b.dataset.as);
  if ($('findReach')) $('findReach').onclick = () => findReach();
  if ($('backToTable')) $('backToTable').onclick = () => {
    state.record = null;
    computeOverlay();
    renderPanel();
  };
  if ($('stopPerson')) $('stopPerson').onclick = () => setLens('all');
  if ($('compareHere')) $('compareHere').onclick = () => compareEveryone();
  if ($('rowFilter')) {
    $('rowFilter').oninput = (ev) => {
      const q = ev.target.value.trim().toLowerCase();
      for (const tr of $('panelBody').querySelectorAll('tr.r')) tr.style.display = !q || tr.textContent.toLowerCase().includes(q) ? '' : 'none';
    };
  }
  if (n.kind === 'table' && $('ruleEditor')) wireTableControls(n);
}

// ───────────────────────────── round 2: real people ─────────────────────────────

const personById = (id) => state.people.find((p) => p.id === id);
const firstName = (p) => p.name.split(' ')[0];

function setLens(lens) {
  state.lens = lens;
  for (const o of document.querySelectorAll('.lens button[data-lens]')) o.classList.toggle('on', o.dataset.lens === lens || (lens === 'person' && o.dataset.lens === 'anon' && state.reach && !state.reach.id));
  $('personPick').classList.toggle('on', (lens === 'person' && !!state.reach?.id) || lens.startsWith(KIND));
  if (lens !== 'person') {
    state.person = null;
    state.pathway = null;
    state.reach = null;
    state.reachQueue = [];
    $('personPick').value = lens.startsWith(KIND) ? lens : '';
  }
  computeOverlay();
  renderLensNote();
  if (state.selected) renderPanel();
}

/**
 * 1. Look at it as one real person (or as someone not signed in: id null). The map runs, as them, every
 * function they may run that only reads, follows what came back, and finds every row of every table in
 * the answers. The map lights up as the answers arrive: a table lights only when rows of it reach them.
 */
async function setPerson(id) {
  const p = id ? personById(id) : { id: null, name: 'Someone not signed in' };
  if (!p) return;
  const R_ = {
    id,
    name: p.name,
    loading: true,
    tools: new Set(),
    notAllowed: [],
    readers: [],
    changers: [],
    fns: {},
    tables: Object.fromEntries(state.map.tables.filter((t) => !t.notOnBackend).map((t) => [t.name, { reached: 0, total: t.rows ?? 0, directly: false, via: {} }])),
    rowIds: {},
    runs: 0,
    refused: 0,
    summary: null
  };
  state.reach = R_;
  state.reachQueue = [];
  state.person = { id, name: p.name, reach: { tools: [], direct: {} } };
  state.pathway = null;
  state.record = null;
  $('personPick').value = id ?? '';
  setLens('person');
  if (id) state.selected = `p:${id}`;
  else state.selected = null;
  fit();
  if (id) renderPanel();
  else $('panel').classList.add('hidden');
  try {
    await stream('api/as/everything', { person: id }, (e) => {
      if (state.reach !== R_) return;
      state.reachQueue.push(e);
      pump();
    });
  } catch (e) {
    if (state.reach === R_) state.reachQueue.push({ type: 'error', error: e.message }), pump();
  }
}

/** Plays the measurement out at a pace a person can follow: one run at a time, each one a spark. */
let pumping = null;
function pump() {
  if (pumping) return;
  const step = () => {
    const R_ = state.reach;
    const e = state.reachQueue.shift();
    if (!R_ || !e) return (pumping = null);
    applyReach(R_, e);
    // quick when there is a lot to show (staff), slower when a person only gets a little
    const left = state.reachQueue.length;
    const ms = e.type === 'run' ? (left > 40 ? 45 : left > 15 ? 80 : 150) : 20;
    pumping = setTimeout(step, ms);
  };
  pumping = setTimeout(step, 0);
}

function applyReach(R_, e) {
  const now = performance.now();
  const pid = R_.id ? `p:${R_.id}` : null;
  if (e.type === 'start') {
    R_.tools = new Set(e.tools);
    R_.notAllowed = e.notAllowed;
    R_.readers = e.readers;
    for (const t of e.direct ?? []) if (R_.tables[t]) R_.tables[t].directly = true;
    state.person.reach = { tools: e.tools.map((name) => ({ name, required: [], description: '' })), direct: Object.fromEntries((e.direct ?? []).map((t) => [t, { find: { allowed: true }, create: { allowed: false } }])) };
  } else if (e.type === 'skip') {
    R_.changers.push(e);
  } else if (e.type === 'run') {
    const f = (R_.fns[e.fn] ??= { runs: 0, refused: 0, rows: {}, newRows: 0 });
    if (e.status === 'ran') {
      f.runs++;
      R_.runs++;
    } else {
      f.refused++;
      R_.refused++;
    }
    const fid = `f:${e.fn}`;
    state.flashes[fid] = { at: now, ok: e.status === 'ran' };
    if (pid) state.particles.push({ from: pid, to: fid, start: now, delay: 0, dur: 420, color: COLORS.person });
    for (const [t, n] of Object.entries(e.rows ?? {})) f.rows[t] = Math.max(f.rows[t] ?? 0, n);
    for (const [t, ids] of Object.entries(e.newRows ?? {})) {
      const set = (R_.rowIds[t] ??= new Set());
      for (const id of ids) set.add(id);
      f.newRows += ids.length;
      const T = R_.tables[t];
      if (T) {
        T.reached = set.size;
        T.via[e.fn] = (T.via[e.fn] ?? 0) + ids.length;
      }
      state.particles.push({ from: fid, to: `t:${t}`, start: now, delay: 300, dur: 520, color: COLORS.person });
      state.flashes[`t:${t}`] = { at: now + 500, ok: true, color: COLORS.person };
    }
  } else if (e.type === 'done') {
    R_.loading = false;
    R_.summary = e.summary;
    for (const [t, v] of Object.entries(e.summary.tables)) if (R_.tables[t]) Object.assign(R_.tables[t], v);
    for (const [t, rows] of Object.entries(e.summary.rows ?? {})) R_.rowIds[t] = new Set(rows.map((r) => r.id));
    R_.changers = e.summary.changers.map((c) => ({ ...c, writes: R_.changers.find((x) => x.fn === c.fn)?.writes ?? c.writes ?? [] }));
    if (pid) state.flashes[pid] = { at: now, ok: true, color: COLORS.person };
  } else if (e.type === 'error') {
    R_.loading = false;
    R_.error = e.error;
  }
  computeOverlay();
  renderLensNote();
  const sel = state.byId[state.selected];
  if (sel && (sel.kind === 'person' || sel.kind === 'table') && (e.type !== 'run' || state.reachQueue.length % 4 === 0)) renderPanel();
}

/** Every person, measured the same way, ranked: the one picture of who sees how much. */
async function compareEveryone() {
  const ev = { loading: true, list: [], byId: {} };
  state.everyone = ev;
  setLens('all');
  $('compareBtn').classList.add('on');
  state.selected = 'everyone';
  fit();
  renderPanel();
  try {
    await stream('api/everyone', {}, (e) => {
      if (state.everyone !== ev) return;
      if (e.type === 'person') {
        ev.list.push(e);
        if (e.person.id) {
          ev.byId[e.person.id] = e;
          state.flashes[`p:${e.person.id}`] = { at: performance.now(), ok: true, color: COLORS.person };
        }
      }
      if (e.type === 'error') ev.error = e.error;
      if (e.type === 'done') ev.loading = false;
      if (state.selected === 'everyone') renderPanel();
    });
  } catch (err) {
    ev.error = err.message;
  }
  ev.loading = false;
  $('compareBtn').classList.remove('on');
  if (state.selected === 'everyone') renderPanel();
}

/** 2. One screen, as that person: its functions run as them, and the real answers. */
async function followPathway(screen) {
  const P = state.person;
  state.pathway = { screen, loading: true };
  computeOverlay();
  try {
    const data = await api('api/as/screen', { person: P.id, screen });
    if (state.pathway?.screen !== screen || state.person?.id !== P.id) return;
    state.pathway = { screen, data };
    for (const c of [...data.calls, ...data.extra]) if (c.status === 'ran' || c.status === 'refused') state.flashes[`f:${c.fn}`] = { at: performance.now(), ok: c.status === 'ran' };
  } catch (e) {
    if (state.pathway?.screen === screen) state.pathway = { screen, error: e.message };
  }
  computeOverlay();
  if (state.selected === `s:${screen}`) renderPanel();
}

async function loadRows(table) {
  try {
    state.rows[table] = (await api(`api/rows?table=${encodeURIComponent(table)}`)).rows;
  } catch (e) {
    state.rows[table] = { error: e.message };
  }
  if (state.selected === `t:${table}` && !state.record) renderPanel();
}

function openRecord(table, objectId) {
  const r = (state.rows[table] ?? []).find?.((x) => x.objectId === objectId);
  state.record = { table, objectId, label: r?.label ?? objectId, key: r?.key, owner: r?.owner };
  computeOverlay();
  renderPanel();
}

/** 3. One row: who can reach it, directly or through which function. Real runs, as each person. */
async function findReach() {
  const rec = state.record;
  rec.loading = true;
  renderPanel();
  try {
    rec.data = await api('api/record-reach', { table: rec.table, objectId: rec.objectId });
  } catch (e) {
    rec.error = e.message;
  }
  rec.loading = false;
  if (state.record !== rec) return;
  // play it out one person at a time, so each pathway can be seen arriving
  rec.shown = 0;
  const people = rec.data?.people ?? [];
  const tick = () => {
    if (state.record !== rec || rec.shown >= people.length) return;
    const p = people[rec.shown++];
    const now = performance.now();
    state.flashes[`p:${p.person.id}`] = { at: now, ok: p.reaches, color: p.reaches ? COLORS.person : '#7d8a98' };
    for (const fn of p.via) {
      state.particles.push({ from: `p:${p.person.id}`, to: `f:${fn}`, start: now, delay: 0, dur: 450, color: COLORS.person });
      state.particles.push({ from: `f:${fn}`, to: `t:${rec.table}`, start: now, delay: 380, dur: 500, color: COLORS.person });
    }
    if (p.reaches) state.flashes[`t:${rec.table}`] = { at: now + 800, ok: true, color: COLORS.person };
    computeOverlay();
    setTimeout(tick, p.reaches ? 420 : 160);
  };
  tick();
  renderPanel();
}

/** The wires drawn on top, and what's lit, from whichever question is being answered. */
function computeOverlay() {
  const out = [];
  const lit = new Set();
  const tags = {};
  const pink = COLORS.person;
  const rec = state.record;
  if (rec) {
    const tid = `t:${rec.table}`;
    lit.add(tid);
    tags[tid] = { text: 'THIS ROW', color: pink };
    if (rec.data) {
      rec.data.people.slice(0, rec.shown ?? Infinity).forEach((p, i) => {
        const pid = `p:${p.person.id}`;
        const directly = p.direct.get.allowed || p.direct.find.allowed;
        if (p.reaches) {
          lit.add(pid);
          tags[pid] = { text: directly ? 'OPENS IT DIRECTLY' : 'REACHES IT', color: directly ? '#f97066' : pink };
        } else tags[pid] = { text: 'CAN’T REACH IT', color: '#7d8a98' };
        for (const fn of p.via) {
          lit.add(`f:${fn}`);
          out.push({ from: pid, to: `f:${fn}`, color: pink, phase: i / 12 });
          out.push({ from: `f:${fn}`, to: tid, color: pink, phase: i / 12, label: i === 0 ? '' : '' });
          tags[`f:${fn}`] = { text: 'HANDS IT OVER', color: pink };
        }
        if (directly) out.push({ from: pid, to: tid, color: '#f97066', dash: [8, 6], label: 'directly' });
      });
    }
  } else if (state.lens === 'person' && state.person?.reach) {
    const pid = `p:${state.person.id}`;
    if (state.person.id) {
      lit.add(pid);
      tags[pid] = { text: 'LOOKING AS', color: pink };
    }
    const pw = state.pathway;
    if (pw) {
      const sid = `s:${pw.screen}`;
      lit.add(sid);
      out.push({ from: pid, to: sid, color: pink, width: 3.2 });
      for (const c of [...(pw.data?.calls ?? []), ...(pw.data?.extra ?? [])]) {
        const fid = `f:${c.fn}`;
        const color = c.status === 'ran' ? '#45d08a' : c.status === 'refused' ? '#f97066' : c.status === 'not-allowed' ? '#a78bfa' : '#7d8a98';
        lit.add(fid);
        tags[fid] = { text: { ran: 'RAN AS THEM', refused: 'REFUSED', 'not-allowed': 'NOT ALLOWED', 'not-run': 'NOT RUN' }[c.status] ?? '', color };
        out.push({ from: sid, to: fid, color, dash: c.status === 'ran' ? [] : [4, 5], flow: c.status === 'ran' });
        if (c.status === 'ran') {
          for (const t of c.touches ?? []) {
            const tid = `t:${t.table}`;
            if (!state.byId[tid]) continue;
            lit.add(tid);
            out.push({ from: fid, to: tid, color: t.hows.includes('mentions') && t.hows.length === 1 ? '#7d8a98' : '#45d08a', width: 1.6, dash: t.hows.includes('mentions') && t.hows.length === 1 ? [2, 5] : [] });
          }
        }
      }
      if (!pw.data) for (const c of state.map.calls.filter((x) => x.screen === pw.screen)) lit.add(`f:${c.fn}`);
    } else if (state.reach) {
      // what came back to them: a pink wire only where rows of a table reached them through a function
      const R_ = state.reach;
      for (const s_ of state.map.screens) if (state.map.calls.some((c) => c.screen === s_ && R_.tools.has(c.fn))) lit.add(`s:${s_}`);
      for (const [fn, f] of Object.entries(R_.fns)) {
        const fid = `f:${fn}`;
        lit.add(fid);
        const tables = Object.entries(R_.tables).filter(([, t]) => t.via[fn]);
        tags[fid] = tables.length
          ? { text: `HANDED THEM ${tables.reduce((n, [, t]) => n + t.via[fn], 0)} ROW${tables.reduce((n, [, t]) => n + t.via[fn], 0) === 1 ? '' : 'S'}`, color: pink }
          : f.runs
          ? { text: 'RAN · NOTHING NEW', color: '#7d8a98' }
          : { text: 'REFUSED', color: '#f97066' };
        if (state.person.id) out.push({ from: pid, to: fid, color: tables.length ? pink : '#7d8a98', width: tables.length ? 2 : 1.2, flow: tables.length > 0, dash: tables.length ? [] : [3, 5] });
        for (const [t, v] of tables) out.push({ from: fid, to: `t:${t}`, color: pink, width: Math.min(4, 1.2 + Math.log2(1 + v.via[fn])), phase: (t.length % 7) / 7 });
      }
      for (const c of R_.changers) {
        const fid = `f:${c.fn}`;
        lit.add(fid);
        tags[fid] = { text: 'CAN CHANGE · NOT RUN', color: '#fdb022' };
      }
      for (const [t, v] of Object.entries(R_.tables)) {
        const tid = `t:${t}`;
        if (v.directly) {
          if (state.person.id) out.push({ from: pid, to: tid, color: '#f97066', dash: [8, 6], label: 'directly' });
          tags[tid] = { text: `OPENS ALL ${v.total} DIRECTLY`, color: '#f97066' };
          lit.add(tid);
        } else if (v.reached) {
          tags[tid] = { text: `${v.reached} OF ${v.total} ROW${v.total === 1 ? '' : 'S'}`, color: pink };
          lit.add(tid);
        }
      }
    }
  }
  state.overlay = out;
  state.lit = out.length || rec || (state.lens === 'person' && state.reach && !state.pathway) ? lit : null;
  state.tags = tags;
}

const ORDER = { ran: 0, refused: 1, 'not-allowed': 2, 'not-run': 3 };
const STATUS_WORDS = { ran: 'ran as them', refused: 'refused', 'not-allowed': 'not allowed', 'not-run': 'not run' };

function mineNote(keyName, person, count) {
  const at = state.map?.backend?.recordedAt;
  if (at)
    return `<div class="mine-note">These answers come from <b>real runs</b>${count ? ` (${count})` : ''}, made by this map as ${esc(person)} on a copy of ${esc(state.map.app.name)}’s backend and recorded on ${esc(new Date(at).toLocaleDateString(undefined, { dateStyle: 'long' }))}. The map only runs a function that reads; one that changes anything is listed as not run. Nothing you do here reaches any backend.</div>`;
  return `<div class="mine-note">These are <b>real runs</b>${count ? ` (${count})` : ''}, made just now by this map as ${esc(person)}, through the backend’s MCP door with a key named <b>${esc(keyName)}</b>. The key was deleted straight after. Each run shows in “What just ran”, marked as the map’s. The map only runs a function that reads; one that changes anything is listed as not run.</div>`;
}

function argsWords(c) {
  const a = Object.entries(c.args ?? {});
  if (!a.length) return '';
  return `<div class="ans-why">Asked with ${a.map(([k, v]) => `<b>${esc(k)}</b> = ${esc(v)}${c.from?.[k] ? ` (${esc(c.from[k])})` : ''}`).join(', ')}</div>`;
}

function callCard(c, needles = []) {
  return `<div class="ans">
    <div class="ans-head"><span class="fn">${go(`f:${c.fn}`, c.fn)}</span><span class="badge ${c.status}">${esc(STATUS_WORDS[c.status] ?? c.status)}</span>${c.ms != null ? `<span class="ans-none">${c.ms} ms</span>` : ''}${c.found ? '<span class="badge found">has this row</span>' : ''}</div>
    ${c.triggers ? `<div class="ans-why">Runs on ${c.triggers.map((t) => esc(t.words)).join('; ')}</div>` : ''}
    ${c.why ? `<div class="ans-why">${c.status === 'refused' ? 'The backend said: ' : 'Why: '}${esc(c.why)}</div>` : ''}
    ${argsWords(c)}
    ${c.status === 'ran' && c.value !== undefined ? `<div class="ans-body">${R.value(c.value, needles)}</div>` : ''}
  </div>`;
}

const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

function personPanel(n) {
  const p = n.person;
  const R_ = state.reach?.id === p.id ? state.reach : null;
  const head = `<div class="kind">Person · what they can reach</div><h2>${esc(p.name)}</h2>
    <p>${p.email ? esc(p.email) + ' · ' : ''}${p.roles.length ? `in the <b>${esc(p.roles.join(', '))}</b> group` : 'no group'}${profileWords(p) ? ` · ${esc(profileWords(p))}` : ''}</p>`;
  if (!R_) return head + `<p><span class="spinner"></span>Starting…</p>`;
  return head + reachBody(R_, firstName(p)) + `
    <h4>Next</h4>
    <p>${state.map.screens.length ? `<b>Click a screen</b> to see exactly what ${esc(firstName(p))} gets there. ` : ''}<b>Click a table</b> to see which of its rows are ${esc(firstName(p))}’s to see.</p>
    <button class="go" id="compareHere">Who sees how much? Compare everyone</button>
    <button class="ghost" id="stopPerson">Stop looking as ${esc(firstName(p))}</button>`;
}

/** The count, the tables it came from, and how the map knows. Shared by a person and by "not signed in". */
function reachBody(R_, who) {
  const tables = Object.entries(R_.tables);
  const reached = tables.filter(([, t]) => t.reached).sort((a, b) => b[1].reached - a[1].reached || a[0].localeCompare(b[0]));
  const out = tables.filter(([, t]) => !t.reached);
  const total = tables.reduce((s_, [, t]) => s_ + (t.total ?? 0), 0);
  const got = reached.reduce((s_, [, t]) => s_ + t.reached, 0);
  const capped = (R_.summary?.functions ?? []).filter((f) => f.capped);
  const status = R_.error
    ? `<div class="verdict bad">${esc(R_.error)}</div>`
    : R_.loading
    ? `<p><span class="spinner"></span>Running, as ${esc(who)}, every function they may run that only reads… <b>${R_.runs}</b> run${R_.runs === 1 ? '' : 's'} so far.</p>`
    : '';
  const bar = ([t, v]) => `<div class="bar-row" data-go="t:${esc(t)}"><span class="bar-name">${esc(W.tableWords(t))}</span><span class="bar-track"><span class="bar-fill" style="width:${pct(v.reached, v.total)}%"></span></span><span class="bar-n">${v.reached} of ${v.total}</span>
    <span class="bar-via">${v.directly ? '<b style="color:#f97066">opens the whole table directly</b>' : `through ${Object.keys(v.via).map(esc).join(', ')}`}</span></div>`;
  return `
    ${status}
    <div class="verdict pink"><div class="big-number">${got} <small>of ${total} rows (${pct(got, total)}%)</small></div>
      ${esc(who)} can reach rows in <b>${reached.length}</b> of ${tables.length} tables${R_.loading ? ' so far' : ''}. ${
        reached.length < tables.length ? `The other ${out.length} ${out.length === 1 ? 'stays' : 'stay'} dark: nothing of ${out.length === 1 ? 'it' : 'theirs'} comes back to ${esc(who)}.` : ''
      }</div>
    ${reached.length ? `<h4>What reaches ${esc(who)}</h4><div class="bars">${reached.map(bar).join('')}</div>` : ''}
    ${out.length ? `<h4>Out of reach (${out.length})</h4><p class="out-of-reach">${out.map(([t]) => go(`t:${t}`, W.tableWords(t))).join(', ')}</p>` : ''}
    <h4>How the map knows</h4>
    ${
      state.map.functions.length
        ? `<p style="font-size:12.5px">It ran, as ${esc(who)}, every function the backend lets them run that only reads (${plural(R_.runs, 'real run')}${R_.refused ? `, ${R_.refused} refused` : ''}). When an answer showed them something they could click (a row’s id), it asked again the way the app would. Then it looked for every row of every table in what came back, by its ids. A table lights up only if rows of it came back.</p>`
        : `<p style="font-size:12.5px">The app has no function, so this is the backend’s own rule check for each table, asked as ${esc(who)}: a table lights up when its rule lets them open it.</p>`
    }
    ${capped.length ? `<p style="font-size:12.5px">${capped.map((f) => `<b>${esc(f.fn)}</b> could be asked ${f.possible} ways; the map asked ${f.runs + f.refused}`).join('; ')}. So this is <b>at least</b> what they reach.</p>` : ''}
    ${(R_.summary?.functions ?? []).filter((f) => f.gaveUp).map((f) => `<p style="font-size:12.5px"><b>${esc(f.fn)}</b> turned the map away ${f.refused} times in a row, so it stopped asking.</p>`).join('')}
    ${R_.changers.length ? `<h4>What they can change (never run here)</h4><ul>${R_.changers.map((c) => `<li>${go(`f:${c.fn}`, c.fn)}${c.writes?.length ? ` changes ${c.writes.map((t) => esc(W.tableWords(t))).join(', ')}` : ''}</li>`).join('')}</ul><p style="font-size:12px;color:#7d8a98">A function that changes data is never run by the map, so what it would hand back isn’t counted.</p>` : ''}
    ${R_.notAllowed?.length ? `<h4>Turned away from (${R_.notAllowed.length})</h4><p class="out-of-reach">${R_.notAllowed.map((f) => go(`f:${f}`, f)).join(', ')}</p>` : ''}
    ${R_.summary?.keyName && R_.runs + R_.refused ? mineNote(R_.summary.keyName, R_.name, R_.runs + R_.refused) : ''}`;
}

function everyonePanel() {
  const ev = state.everyone;
  const list = [...ev.list].sort((a, b) => b.reachedRows - a.reachedRows);
  const max = list[0]?.totalRows ?? 0;
  const row = (e) => `<div class="bar-row" ${e.person.id ? `data-as="${esc(e.person.id)}"` : 'data-anon="1"'}><span class="bar-name"><b>${esc(e.person.name)}</b>${e.person.roles?.length ? ` · ${esc(e.person.roles.join(', '))}` : ''}</span>
    <span class="bar-track"><span class="bar-fill ${e.person.roles?.length ? 'staff' : e.reachedRows ? '' : 'none'}" style="width:${pct(e.reachedRows, e.totalRows)}%"></span></span><span class="bar-n">${e.reachedRows}</span>
    <span class="bar-via">${Object.values(e.tables).filter((t) => t.reached).length} of ${Object.keys(e.tables).length} tables</span></div>`;
  return `<div class="kind">Everyone, measured</div><h2>Who sees how much</h2>
    <p>Each person, for real: every function they may run that only reads, run as them, and every row that came back, counted. Out of <b>${max}</b> rows in the backend.</p>
    ${ev.error ? `<div class="verdict bad">${esc(ev.error)}</div>` : ''}
    ${ev.loading ? `<p><span class="spinner"></span>Measuring… ${ev.list.length} of ${state.people.length + 1} so far.</p>` : ''}
    <div class="bars">${list.map(row).join('')}</div>
    <p style="font-size:12.5px;color:#7d8a98">Click anyone to watch their rows reach them on the map. Purple: someone in a group.</p>`;
}

function pathwayPanel(n) {
  const P = state.person;
  const pw = state.pathway;
  const head = `<div class="kind">Pathway · as a real person</div><h2>${esc(n.title)}, as ${esc(P.name)}</h2>`;
  if (pw.loading) return head + `<p><span class="spinner"></span>Running this screen’s functions as ${esc(P.name)}…</p>`;
  if (pw.error) return head + `<div class="verdict bad">${esc(pw.error)}</div>`;
  const d = pw.data;
  const ran = [...d.calls, ...d.extra].filter((c) => c.status === 'ran' || c.status === 'refused');
  const shown = d.calls.filter((c) => c.status === 'ran');
  return `${head}
    <p>What ${esc(firstName(P))} gets on this screen: each function it asks the backend for, run as them, and the real answer, the way the screen lists it.</p>
    ${mineNote(d.keyName, P.name, ran.length)}
    ${shown.length || !d.calls.length ? '' : '<div class="verdict warn">Nothing on this screen could be run as them: see why on each function below.</div>'}
    ${d.extra.map((c) => callCard({ ...c, triggers: null })).join('')}
    ${[...d.calls].sort((a, b) => ORDER[a.status] - ORDER[b.status]).map((c) => callCard(c)).join('')}
    ${usesSection(d.uses ?? [], P)}`;
}

/** NPMAUDIT-BACKENDMAPSCREENS: what the screen reads and writes itself, and whether the table's rule lets this person. */
function usesSection(uses, P) {
  if (!uses.length) return '';
  const verdict = (x) => (x.allowed === true ? 'the rule lets them' : x.allowed === false ? 'the rule refuses them' : `could not ask (${x.reason})`);
  return `<h4>Straight from the tables (no function between)</h4>
    <ul>${uses
      .map((x) => `<li>${esc(cap(x.trigger.words))} ${esc(x.how)} ${go(`t:${x.table}`, W.tableWords(x.table))}${x.label ? ` (“${esc(x.label)}”)` : ''}: ${esc(verdict(x))}</li>`)
      .join('')}</ul>
    <p style="font-size:12.5px;color:#7d8a98">Asked of the backend's rules as ${esc(P.name)}; nothing is read or written.</p>`;
}

const SKIP_COLS = new Set(['objectId', 'createdAt', 'updatedAt', 'ACL', 'emailVerified', 'authData', 'sessionToken']);

/** The table's rows, as a table you can read and filter. Looking as someone: their rows lit, the rest dim. */
function rowsSection(n) {
  const rows = state.rows[n.key];
  const R_ = state.lens === 'person' ? state.reach : null;
  const theirs = R_?.rowIds?.[n.key] ?? new Set();
  const who = R_ ? (R_.id ? firstName({ name: R_.name }) : 'someone not signed in') : null;
  let body;
  if (!rows) body = '<p><span class="spinner"></span>Reading its rows…</p>';
  else if (rows.error) body = `<p>${esc(rows.error)}</p>`;
  else if (!rows.length) body = '<p>It has no rows.</p>';
  else {
    const cols = [];
    const sample = rows[0].cells ?? {};
    // the columns that point at another table first (a person, a step), then the plain words
    const linking = state.map.links.filter((l) => l.from === n.key).map((l) => l.column);
    const prefer = [...linking, 'status', 'kind', 'email', 'title', 'name', 'subject', 'position', 'attempt', 'state'];
    for (const c of prefer) if (c in sample && !cols.includes(c)) cols.push(c);
    for (const c of Object.keys(sample)) if (cols.length < 4 && !SKIP_COLS.has(c) && !cols.includes(c) && !/Id$/.test(c)) cols.push(c);
    const shown = cols.slice(0, 4);
    const sorted = R_ ? [...rows].sort((a, b) => theirs.has(b.objectId) - theirs.has(a.objectId)) : rows;
    const tr = (r) => {
      const mine = theirs.has(r.objectId);
      return `<tr class="r ${R_ ? (mine ? 'theirs' : 'not-theirs') : ''}" data-row="${esc(r.objectId)}"><td class="mark">${mine ? '●' : ''}</td><td><b>${esc(r.label)}</b></td>${shown.map((c) => `<td title="${esc(r.cells?.[c] ?? '')}">${esc(r.cells?.[c] ?? '')}</td>`).join('')}</tr>`;
    };
    body = `${R_ && !R_.loading ? `<div class="verdict pink"><b>${theirs.size} of these ${rows.length} rows reach ${esc(who)}</b>${theirs.size ? `, lit below${R_.tables[n.key]?.via ? `, through ${Object.keys(R_.tables[n.key].via).map(esc).join(' and ')}` : ''}` : ''}. ${theirs.size < rows.length ? `The other ${rows.length - theirs.size} never come back to them.` : ''}</div>` : ''}
      <input class="filter" id="rowFilter" placeholder="Find a row" autocomplete="off">
      <div class="rowgrid-wrap"><table class="rowgrid"><thead><tr><th></th><th>Row</th>${shown.map((c) => `<th>${esc(R.words(c))}</th>`).join('')}</tr></thead><tbody>${sorted.map(tr).join('')}</tbody></table></div>
      <p style="font-size:12px;color:#7d8a98">Click any row, then <b>Who can access this?</b> to watch who it reaches.</p>`;
  }
  return `<h4>Its rows${Array.isArray(rows) ? ` (${rows.length})` : ''}</h4>${body}`;
}

function theirLine(R_, rec) {
  const hit = R_.summary?.rows?.[rec.table]?.find((r) => r.id === rec.objectId);
  const who = esc(R_.name);
  if (!hit && !R_.rowIds?.[rec.table]?.has(rec.objectId)) return `This row never comes back to <b>${who}</b>.`;
  const ways = (hit?.hits ?? []).map((h) => `${esc(h.fn)}${h.args && Object.keys(h.args).length ? ` (asked with ${Object.entries(h.args).map(([k, v]) => `${esc(k)} = ${esc(v)}`).join(', ')})` : ''}`);
  return `<b>${who}</b> gets this row${ways.length ? ` through ${ways.join(' and ')}` : ''}.`;
}

function recordPanel(n) {
  const rec = state.record;
  const R_ = state.lens === 'person' && state.reach && !state.reach.loading ? state.reach : null;
  const head = `<div class="kind">One row of ${esc(n.title)}</div><h2>${esc(rec.label)}</h2><p><a id="backToTable">← back to the table</a></p>`;
  if (rec.error) return head + `<div class="verdict bad">${esc(rec.error)}</div>`;
  if (!rec.data) {
    const fns = state.map.functions.filter((f) => f.touches.some((t) => t.table === rec.table));
    return `${head}
      <p>Who could reach this row? The map asks the backend, for each of the ${state.people.length} people:</p>
      <ul>
        <li><b>directly</b>: the backend’s own rule check, for this row;</li>
        <li><b>through a function</b>: it runs, as each person, every function that touches ${esc(n.title)} and only reads (${fns.length} touch it), and looks for this row in what comes back.</li>
      </ul>
      <p style="font-size:12.5px;color:#7d8a98">${state.map.backend.recordedAt ? `In this recording, the answer is read off each person’s recorded reach: the same real runs, seen from this row’s side.` : `These are real runs (read-only), up to ${state.people.length} people × a few functions, each marked as the map’s in “What just ran”. A few seconds.`}</p>
      ${R_ ? `<div class="verdict pink">${theirLine(R_, rec)}</div>` : ''}
      <button class="go" id="findReach" ${rec.loading ? 'disabled' : ''}>${rec.loading ? '<span class="spinner"></span>Asking, as each person…' : 'Who can access this?'}</button>`;
  }
  const d = rec.data;
  const reachers = d.people.filter((p) => p.reaches);
  const others = d.people.filter((p) => !p.reaches);
  const anonDirect = d.anonymous && (d.anonymous.get.allowed || d.anonymous.find.allowed);
  const notRun = {};
  for (const p of d.people) for (const r of p.results) if (r.status === 'not-run') notRun[r.fn] = r.why;
  const runs = d.people.reduce((s, p) => s + p.results.filter((r) => r.status === 'ran' || r.status === 'refused').length, 0);
  const whoLine = (p) => {
    const directly = p.direct.get.allowed || p.direct.find.allowed;
    const ran = p.results.filter((r) => r.status === 'ran');
    return `<div class="who"><span class="dot" style="background:${p.reaches ? (directly ? '#f97066' : COLORS.person) : '#33323d'}"></span><span class="t"><a data-as="${esc(p.person.id)}"><b>${esc(p.person.name)}</b></a>${p.person.roles.length ? ` (${esc(p.person.roles.join(', '))})` : ''}: ${
      p.reaches
        ? `${directly ? '<b>opens it directly</b>' : ''}${directly && p.via.length ? ', and ' : ''}${p.via.length ? `gets it through ${p.via.map((f) => go(`f:${f}`, f)).join(' and ')}` : ''}${p.results
            .filter((r) => r.found && Object.keys(r.args ?? {}).length)
            .map((r) => ` (${esc(r.fn)} asked with ${Object.entries(r.args).map(([k, v]) => `${esc(k)} = ${esc(v)}`).join(', ')}, ${esc(Object.values(r.from ?? {})[0] ?? '')})`)
            .join('')}`
        : `can’t reach it. ${ran.length ? `${ran.map((r) => esc(r.fn)).join(' and ')} answered without it` : 'No function that reads it is open to them'}; the backend’s rule check says no to opening it directly.`
    }</span></div>`;
  };
  const excerpt = reachers.flatMap((p) => p.results.filter((r) => r.found && r.value).map((r) => ({ p, r })))[0];
  return `${head}
    ${R.row(d.row)}
    <div class="verdict ${reachers.some((p) => p.direct.get.allowed || p.direct.find.allowed) || anonDirect ? 'bad' : 'good'}">
      <b>${reachers.length} of ${d.people.length} people can reach this row</b>${reachers.length ? `: ${reachers.map((p) => esc(p.person.name)).join(', ')}` : ''}.
      ${anonDirect ? ' <b>Someone not signed in can open it directly.</b>' : ' Someone not signed in can’t.'}
      ${reachers.some((p) => p.direct.get.allowed || p.direct.find.allowed) ? '' : ' Nobody can open it directly: every pathway goes through a function.'}
    </div>
    ${mineNote('view-as-<each person>' + '-by-backend-map', 'each person in turn', d.recorded ? 0 : runs)}
    <h4>Who reaches it, and how</h4>
    ${reachers.map(whoLine).join('') || '<p>Nobody.</p>'}
    <h4>Who can’t</h4>
    ${others.map(whoLine).join('') || '<p>Everyone can.</p>'}
    ${excerpt ? `<h4>What ${esc(excerpt.p.person.name)} sees of it, in ${esc(excerpt.r.fn)}</h4><div class="ans">${R.value(excerpt.r.value, d.needles)}</div>` : ''}
    <h4>What this didn’t check</h4>
    <ul>${Object.entries(notRun).map(([f, why]) => `<li>${go(`f:${f}`, f)} was not run: ${esc(why)}.</li>`).join('') || '<li>Every function that touches this table was run, for everyone allowed to.</li>'}
      <li>Functions the map doesn’t see touching ${esc(n.title)} weren’t run.</li></ul>`;
}

function focusOn(id) {
  const n = state.byId[id];
  if (!n) return;
  select(id);
  const cx = (innerWidth - 450 + 360) / 2, cy = innerHeight / 2;
  animateCam(cx - (n.x + n.w / 2) * state.cam.z, cy - (n.y + n.h / 2) * state.cam.z);
}

function animateCam(tx, ty) {
  const sx = state.cam.x, sy = state.cam.y;
  let t0;
  const step = (now) => {
    t0 ??= now;
    const t = Math.min(1, (now - t0) / 450);
    const e = 1 - Math.pow(1 - t, 3);
    state.cam.x = sx + (tx - sx) * e;
    state.cam.y = sy + (ty - sy) * e;
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const go = (id, text) => `<a data-go="${esc(id)}">${esc(text)}</a>`;

function typeWords(t) {
  return { String: 'text', Number: 'number', Boolean: 'yes/no', Date: 'date', Object: 'a bundle of values', Array: 'a list', File: 'a file', Pointer: 'a link', Relation: 'links' }[t] ?? t;
}

function tablePanel(n) {
  const m = state.map;
  const t = n.table;
  const d = directRead(t.name);
  const users = m.functions.filter((f) => f.touches.some((x) => x.table === t.name));
  const readers = users.filter((f) => f.touches.find((x) => x.table === t.name).hows.some((h) => h !== 'mentions'));
  const outLinks = m.links.filter((l) => l.from === t.name);
  const inLinks = m.links.filter((l) => l.to === t.name);
  const keys = new Set(t.keys.filter((k) => k.length === 1).map((k) => k[0]));
  const open = Math.max(W.openness(d.read), ...d.change.map(W.openness));

  let verdict;
  if (t.notOnBackend)
    verdict = `<div class="verdict info"><b>Not on the backend yet.</b> The app has it (${esc(t.from.join('; '))}); the backend makes the table when its first row is saved. Its rule: reading — ${esc(W.ruleWords(d.read))}; changing — ${esc(W.changeWords(d.rule.permissions))}.</div>`;
  else if (open === 0 && !d.rule.creatorOwns)
    verdict = `<div class="verdict good"><b>Sealed.</b> Nobody can open this table directly. Its rows are reached only through ${users.length ? `${users.length} function${users.length === 1 ? '' : 's'}` : 'no function at all'}, and each function decides in its own code whose rows to hand back.</div>`;
  else if (open >= 3)
    verdict = `<div class="verdict bad"><b>Open to anyone at all.</b> Someone not even signed in can ${W.openness(d.read) >= 3 ? 'read every row' : 'change rows'} directly, without any function checking.</div>`;
  else
    verdict = `<div class="verdict warn"><b>Partly open.</b> Reading directly: ${esc(W.ruleWords(d.read))}. Changing directly: ${esc(W.changeWords(d.rule.permissions))}.${d.rule.creatorOwns ? ' And whoever made a row may always read and change that row.' : ''}</div>`;

  const fnLine = (f) => {
    const x = f.touches.find((y) => y.table === t.name);
    return `<li>${go(`f:${f.name}`, f.name)} ${x.hows.map((h) => esc(W.HOW_WORDS[h])).join(', ')} it${x.via.length ? ` (through ${esc(x.via.join(', '))})` : ''} — <b>${esc(W.ruleWords(f.call))}</b> may run it</li>`;
  };

  return `
    <div class="kind">Table</div>
    <h2>${esc(n.title)}</h2>
    <p>${t.notOnBackend ? (t.columns.length ? `${plural(t.columns.length, 'thing')} in each row, as the app declares it` : 'What a row holds is known once the first one is saved') : `<b>${t.rows ?? '?'}</b> row${t.rows === 1 ? '' : 's'} now · ${plural(t.columns.length, 'thing')} in each row`}${d.rule.own ? '' : ' · uses the app’s standard rule'}</p>
    ${verdict}
    ${t.notOnBackend ? '' : rowsSection(n)}
    <h4>Who may open it directly</h4>
    <div id="ruleEditor"></div>
    <h4>Which functions name it in their code</h4>
    ${users.length ? `<ul>${readers.map(fnLine).join('')}${users.filter((f) => !readers.includes(f)).map(fnLine).join('')}</ul>` : '<p>No function uses it.</p>'}
    ${users.length ? '<p style="font-size:12px;color:#7d8a98">Naming a table is not handing its rows to everyone who may run the function: the function’s own code chooses whose rows come back. Look as a real person to see which rows do.</p>' : ''}
    ${t.columns.length ? `<h4>What’s in a row</h4>
    <div class="chips">${t.columns.map((c) => `<span class="chip ${keys.has(c.name) ? 'key' : ''}" title="${esc(typeWords(c.type))}">${esc(c.name)} · ${esc(typeWords(c.type))}</span>`).join('')}</div>
    <p style="font-size:12px;color:#7d8a98">Green: no two rows may share it.</p>` : ''}
    ${outLinks.length || inLinks.length ? `<h4>Linked tables</h4>
    <ul>
      ${outLinks.map((l) => `<li>Each row points at ${go(`t:${l.to}`, W.tableWords(l.to))} by its <b>${esc(l.column)}</b></li>`).join('')}
      ${inLinks.map((l) => `<li>${go(`t:${l.from}`, W.tableWords(l.from))} rows point here by their <b>${esc(l.column)}</b></li>`).join('')}
    </ul>
    ${[...outLinks, ...inLinks].some((l) => l.byName) ? `<p style="font-size:12px;color:#7d8a98">${[...outLinks, ...inLinks].every((l) => l.byName) ? 'These links are' : 'Some of these links are'} read from the column names (a column called “<i>name</i>Id” points at the table whose key it is): the backend itself doesn’t declare ${[...outLinks, ...inLinks].every((l) => l.byName) ? 'them' : 'those'}.</p>` : ''}` : ''}
  `;
}

function wireTableControls(n) {
  const m = state.map;
  const roleNames = m.roles.map((r) => r.name);
  const choicesFor = (field) => (field === 'change' ? W.changeChoices(roleNames) : W.audienceChoices(roleNames));
  const e = state.edit;
  const d = directRead(n.key);
  const cur = { read: d.read, change: W.changeRule(d.rule.permissions), creatorOwns: d.rule.creatorOwns };
  const changed = JSON.stringify(cur.read) !== JSON.stringify(e.read) || JSON.stringify(cur.change) !== JSON.stringify(e.change) || cur.creatorOwns !== e.creatorOwns;
  const pills = (field) =>
    choicesFor(field)
      .map((c) => {
        const on = JSON.stringify(e[field]) === JSON.stringify(c.value);
        const o = W.openness(c.value);
        return `<button class="pill ${on ? 'on' : ''} ${on && o >= 3 ? 'risky' : on && o === 2 ? 'mid' : ''}" data-field="${field}" data-value="${esc(c.value)}" title="${esc(c.long)}">${esc(c.words)}</button>`;
      })
      .join('');
  const known = (v, field = 'read') => choicesFor(field).some((c) => JSON.stringify(c.value) === JSON.stringify(v));

  let preview = '';
  if (changed) {
    const o = Math.max(W.openness(e.read), W.openness(e.change));
    const lvl = o >= 3 ? 'bad' : o >= 2 ? 'warn' : 'good';
    preview = `<div class="verdict ${lvl}">After this: reading directly — <b>${esc(W.ruleWords(e.read))}</b>; adding, changing and deleting directly — <b>${esc(W.ruleWords(e.change))}</b>${e.creatorOwns ? '; and makers always see and change their own rows' : ''}.${
      o >= 3 ? ' Anyone on the internet could do that, with no function checking.' : o === 2 ? ' That is every signed-in person, for every row — not only their own.' : ''
    }</div>`;
  }
  const r = state.lastResult;
  const result = r
    ? r.error
      ? `<div class="verdict bad">${esc(r.error)}</div>`
      : r.onlyChecks
      ? `<div class="verdict ${rulesOffIn(r.checks) ? 'bad' : 'good'}">${checksHtml(r.checks)}</div>`
      : `<div class="verdict ${r.enforced === false ? 'bad' : 'good'} result">
          <div class="row"><span class="${r.inBackend && r.enforced !== false ? 'yes' : 'no'}">${r.inBackend && r.enforced !== false ? '✓' : '✗'}</span><span>${
            !r.inBackend ? 'The backend is not showing it.' : r.enforced === false ? 'The backend has it, but is NOT enforcing its rules right now: it keeps nobody out yet.' : 'The backend is obeying it now.'
          }</span></div>
          <div class="row"><span class="${r.inFile ? 'yes' : 'no'}">${r.inFile ? '✓' : '✗'}</span><span>${r.inFile ? `Saved in the app’s folder (${esc(m.securityFile)}): it holds when the backend restarts.` : 'Not in the app’s folder: a restart would undo it.'}</span></div>
          ${checksHtml(r.checks)}
        </div>`
    : '';

  $('ruleEditor').innerHTML = `
    <p>Looking at rows${known(e.read) ? '' : ` <span class="chip">now: ${esc(W.ruleWords(e.read))}</span>`}</p>
    <div class="choice-group">${pills('read')}</div>
    <p>Adding, changing or deleting rows${known(e.change, 'change') ? '' : ` <span class="chip">now: ${esc(e.change === null ? W.changeWords(d.rule.permissions) : W.ruleWords(e.change))}</span>`}</p>
    <div class="choice-group">${pills('change')}</div>
    <label class="check"><input type="checkbox" id="creatorOwns" ${e.creatorOwns ? 'checked' : ''}> <span>Whoever made a row may always see and change that row</span></label>
    ${preview}
    <button class="go" id="applyRule" ${changed && e.read != null && e.change != null && known(e.read) && known(e.change, 'change') ? '' : 'disabled'}>Make it so</button>
    ${changed ? '<button class="ghost" id="undoEdit">Never mind</button>' : ''}
    ${d.rule.own && !changed ? '<button class="ghost" id="resetRule">Back to the app’s standard rule</button>' : ''}
    <button class="ghost" id="askBackend">Ask the backend who gets in</button>
    ${result}
  `;
  for (const b of $('ruleEditor').querySelectorAll('.pill')) {
    b.onclick = () => {
      state.edit[b.dataset.field] = b.dataset.value;
      state.lastResult = null;
      wireTableControls(n);
    };
  }
  $('creatorOwns').onchange = (ev) => {
    state.edit.creatorOwns = ev.target.checked;
    state.lastResult = null;
    wireTableControls(n);
  };
  if ($('undoEdit')) $('undoEdit').onclick = () => select(n.id);
  if ($('applyRule')) $('applyRule').onclick = () => saveRule(n, false);
  if ($('resetRule')) $('resetRule').onclick = () => saveRule(n, true);
  $('askBackend').onclick = async () => {
    try {
      const { checks } = await api(`api/check?table=${encodeURIComponent(n.key)}`);
      state.lastResult = { checks, onlyChecks: true };
      wireTableControls(n);
    } catch (err) {
      toast(err.message, 'bad');
    }
  };
}

/** NPMAUDIT-BACKENDMAPCHECK: the server marks every check with `ruleAllows` when the backend's rules are off. */
const rulesOffIn = (checks) => !!checks?.some((c) => 'ruleAllows' in c);

function checksHtml(checks) {
  if (!checks?.length) return '';
  const by = {};
  for (const c of checks) (by[c.who] ??= {})[c.op] = c;
  // With the rules off, what happens comes first and the rule's answer second.
  const off = rulesOffIn(checks);
  const said = (c) =>
    (c?.allowed ? '<span class="no">let in</span>' : '<span class="yes">turned away</span>') +
    (off && c && !c.ruleAllows ? ' (the rule would turn them away once rules are on)' : '');
  return `${off ? '<p class="verdict bad" style="margin-top:10px"><b>The backend is NOT enforcing its rules right now</b>, so everyone below is let in, whatever the rule says.</p>' : ''}<p style="margin-top:10px"><b>The backend’s own answer</b> (a dry run: nothing ran, nothing changed):</p><ul>${Object.entries(by)
    .map(([who, ops]) => `<li><b>${esc(who)}</b>: looking ${said(ops.find)}, adding ${said(ops.create)}</li>`)
    .join('')}</ul>`;
}

async function saveRule(n, reset) {
  const e = state.edit;
  const btn = $('applyRule') ?? $('resetRule');
  if (btn) btn.disabled = true;
  try {
    const r = await api('api/table-rule', {
      table: n.key,
      reset,
      read: e.read,
      change: e.change,
      creatorOwns: e.creatorOwns,
      etag: state.map.etag,
      fileStamp: state.map.fileStamp
    });
    await load(true);
    select(n.id);
    state.lastResult = r;
    renderPanel();
    toast(
      r.unchanged
        ? 'Nothing to change: it already was like that.'
        : r.enforced === false
          ? `Saved, but the backend is NOT enforcing its rules right now, so the new rule for ${W.tableWords(n.key)} keeps nobody out yet.`
          : `Done. The backend obeys the new rule for ${W.tableWords(n.key)}, and it is saved.`,
      r.enforced === false ? 'bad' : 'good'
    );
    state.flashes[n.id] = { at: performance.now(), ok: true };
  } catch (err) {
    state.lastResult = { error: err.message };
    if (err.refused) await load(true);
    renderPanel();
  }
}

function fnPanel(n) {
  const m = state.map;
  const f = n.fn;
  const k = callKind(f.call);
  const verdict = {
    public: `<div class="verdict bad"><b>Anyone at all may run this</b> — even someone not signed in. That can be on purpose (an unsubscribe link has to work without signing in); check it only does that.</div>`,
    authenticated: `<div class="verdict good"><b>Only someone signed in may run this.</b> Who they are comes from their sign-in, so the function knows whose rows are theirs.</div>`,
    role: `<div class="verdict good"><b>Only ${esc(W.ruleWords(f.call).toLowerCase())} may run this.</b> Anyone else is turned away before it starts.</div>`,
    nobody: `<div class="verdict good"><b>Nobody may run this</b> from outside.</div>`
  }[k];
  const used = m.calls.filter((c) => c.fn === f.name);
  const myRuns = state.runs.filter((r) => r.name === f.name).slice(0, 6);
  const steps = f.steps.filter((s) => !/^steps?$/i.test(s)).slice(0, 14);
  return `
    <div class="kind">Function</div>
    <h2>${esc(f.name)}</h2>
    <p>${f.deployed ? 'Live on the backend.' : '<b>Not live on the backend</b>: it is in the app, but the backend doesn’t have it. Your agent can deploy it.'} Changes to a function’s steps only reach the backend when they’re deployed.</p>
    ${verdict}
    <h4>When it runs</h4>
    ${used.length ? `<ul>${used.map((c) => `<li>On ${go(`s:${c.screen}`, screenWords(c.screen))}: ${esc(c.trigger.words)}${c.inside ? ` <span style="color:#7d8a98">(in “${esc(c.inside.split('/').pop())}”)</span>` : ''}</li>`).join('')}</ul>` : '<p>No screen of the app asks for it. It is called from outside the app: a script, an email link or an assistant.</p>'}
    <h4>The data it touches</h4>
    ${f.touches.length ? `<ul>${f.touches.map((x) => `<li>${x.hows.map((h) => esc(W.HOW_WORDS[h])).join(', ')} ${go(`t:${x.table}`, W.tableWords(x.table))}${x.via.length ? ` <span style="color:#7d8a98">(through ${esc(x.via.join(', '))})</span>` : ''}</li>`).join('')}</ul>` : '<p>It touches no table the map can see.</p>'}
    ${f.touches.some((x) => x.hows.includes('mentions')) ? '<p style="font-size:12px;color:#7d8a98">“Names” means the table’s name is in its code but the map can’t read for sure what it does with it.</p>' : ''}
    ${f.asks.length ? `<h4>What it asks for</h4><div class="chips">${f.asks.map((a) => `<span class="chip">${esc(a)}</span>`).join('')}</div>` : ''}
    ${steps.length ? `<h4>What it does, step by step</h4>${steps.map((s, i) => `<div class="step"><span class="n">${i + 1}</span><span class="t">${esc(s)}</span></div>`).join('')}` : ''}
    ${f.helpers.length ? `<p style="font-size:12px;color:#7d8a98">Uses the shared parts: ${f.helpers.map(esc).join(', ')}.</p>` : ''}
    <h4>Its last runs</h4>
    ${myRuns.length ? `<ul>${myRuns.map((r) => `<li>${esc(W.ago(r.startedAt))}: ${esc(W.runWords(r))}${r.durationMs != null ? ` (${r.durationMs} ms)` : ''}</li>`).join('')}</ul>` : '<p>None in the recent runs.</p>'}
  `;
}

function screenPanel(n) {
  const m = state.map;
  const calls = m.calls.filter((c) => c.screen === n.key);
  const uses = (m.uses ?? []).filter((u) => u.screen === n.key);
  // NPMAUDIT-BACKENDMAPSCREENS: what the screen reads and writes itself, by the table's own rule.
  const useLine = (u) => {
    const d = directRead(u.table);
    const rule = u.how === 'reads' ? d.read : d.change[{ creates: 0, changes: 1, deletes: 2 }[u.how] ?? 1];
    return `<li>${esc(cap(u.trigger.words))} ${esc(u.how)} ${go(`t:${u.table}`, W.tableWords(u.table))}${u.label ? ` (“${esc(u.label)}”)` : ''} — ${esc(W.ruleWords(rule))} may</li>`;
  };
  return `
    <div class="kind">Screen</div>
    <h2>${esc(n.title)}</h2>
    <p>What happens on this screen that reaches the backend:</p>
    <ul>${calls.map((c) => `<li>${esc(cap(c.trigger.words))} runs ${go(`f:${c.fn}`, c.fn)} — ${esc(W.ruleWords(m.functions.find((f) => f.name === c.fn)?.call))} may</li>`).join('')}${uses.map(useLine).join('')}</ul>
  `;
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// ───────────────────────────── live runs ─────────────────────────────

let newest = 0;
async function poll(first) {
  try {
    // ask again for the last ten seconds too: a run the map made may only be known as the map's a moment later
    const { runs, total } = await api(`api/runs${newest ? `?since=${newest - 10000}` : ''}`);
    $('livePulse').classList.remove('off');
    let changed = false;
    for (const r of runs) {
      const known = state.runs.find((x) => x.id === r.id);
      if (!known) continue;
      if (!known.byMap && r.byMap) (known.byMap = r.byMap), (changed = true);
      // a run first seen while it was still running: take its end
      if (known.status !== r.status) Object.assign(known, { status: r.status, durationMs: r.durationMs, errorMessage: r.errorMessage }), (changed = true);
    }
    if (changed) renderRuns(0);
    const fresh = runs.filter((r) => !state.seenRuns.has(r.id)).sort((a, b) => a.startedAt - b.startedAt);
    for (const r of fresh) {
      state.seenRuns.add(r.id);
      state.runs.unshift(r);
      newest = Math.max(newest, r.startedAt);
      if (!first) celebrate(r);
    }
    state.runs = state.runs.slice(0, 80);
    if (first) $('tickerNote').textContent = `${total} run${total === 1 ? '' : 's'} recorded so far · new ones light up the map as they happen`;
    else if (fresh.length) $('tickerNote').textContent = `${fresh.length} new just now`;
    renderRuns(first ? 0 : fresh.length);
    if (fresh.length && state.byId[state.selected]?.kind === 'fn') renderPanel();
  } catch (e) {
    $('livePulse').classList.add('off');
    $('tickerNote').textContent = e.message;
  }
  setTimeout(() => poll(false), 2000);
}

function celebrate(r) {
  const id = `f:${r.name}`;
  const n = state.byId[id];
  if (!n) return;
  const ok = r.status === 'success';
  const now = performance.now();
  state.flashes[id] = { at: now, ok };
  // a run this map made as someone: their block flashes too
  const who = r.byMap?.person && state.people.find((p) => p.name === r.byMap.person);
  if (who) state.flashes[`p:${who.id}`] = { at: now, ok };
  for (const e of state.edges.filter((x) => x.to === id)) state.particles.push({ edge: e.id, start: now, delay: 0, dur: 800, color: '#35c3e8' });
  if (ok) {
    for (const e of state.edges.filter((x) => x.from === id && x.kind !== 'mentions'))
      state.particles.push({ edge: e.id, start: now, delay: 750, dur: 900, color: e.kind === 'writes' ? '#fdb022' : '#45d08a' });
  }
}

function renderRuns(freshCount) {
  $('runs').innerHTML = state.runs
    .slice(0, 30)
    .map(
      (r, i) =>
        `<div class="run ${r.status === 'success' ? '' : 'error'} ${r.byMap ? 'mine' : ''} ${i < freshCount ? 'fresh' : ''}" data-fn="${esc(r.name)}"><b>${esc(r.name)}</b> ${esc(W.runWords(r))}${
          r.byMap ? `<div class="by">run by this map, as ${esc(r.byMap.person ?? 'someone')}</div>` : r.byKey ? `<div class="by">run with the key “${esc(r.byKey)}”</div>` : ''
        }<div class="when">${esc(W.ago(r.startedAt))}${r.durationMs != null ? ` · took ${r.durationMs} ms` : ''}</div></div>`
    )
    .join('') || `<span style="color:#7d8a98">${state.map?.backend?.recordedAt ? 'Pick a person and their runs play here.' : 'Nothing has run yet. Use the app and watch.'}</span>`;
  for (const el of $('runs').querySelectorAll('.run')) el.onclick = () => focusOn(`f:${el.dataset.fn}`);
}
setInterval(() => renderRuns(0), 30000);

// ───────────────────────────── input ─────────────────────────────

function hit(sx, sy) {
  const [x, y] = toWorld(sx, sy);
  for (let i = state.nodes.length - 1; i >= 0; i--) {
    const n = state.nodes[i];
    if (x >= n.x && x <= n.x + n.w && y >= n.y && y <= n.y + n.h) return n;
  }
  return null;
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  drag = { x: e.clientX, y: e.clientY, cx: state.cam.x, cy: state.cam.y, moved: false };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (drag) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    if (drag.moved) {
      canvas.classList.add('dragging');
      state.cam.x = drag.cx + dx;
      state.cam.y = drag.cy + dy;
      $('tip').classList.add('hidden');
      return;
    }
  }
  const n = hit(e.clientX, e.clientY);
  state.hover = n?.id ?? null;
  canvas.classList.toggle('pointing', !!n);
  const tip = $('tip');
  if (n) {
    tip.innerHTML = tipFor(n);
    tip.style.left = Math.min(innerWidth - 330, e.clientX + 16) + 'px';
    tip.style.top = e.clientY + 16 + 'px';
    tip.classList.remove('hidden');
  } else tip.classList.add('hidden');
});
canvas.addEventListener('pointerup', (e) => {
  canvas.classList.remove('dragging');
  if (drag && !drag.moved) {
    const n = hit(e.clientX, e.clientY);
    select(n?.id ?? null);
    // keep the chosen block clear of the side panel
    if (n) {
      const right = (n.x + n.w + 30) * state.cam.z + state.cam.x;
      const limit = innerWidth - 450;
      if (right > limit) animateCam(state.cam.x - (right - limit), state.cam.y);
    }
  }
  drag = null;
});
canvas.addEventListener('pointerleave', () => {
  state.hover = null;
  $('tip').classList.add('hidden');
});
canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    const z0 = state.cam.z;
    const z = Math.min(2.5, Math.max(0.2, z0 * Math.exp(-e.deltaY * 0.0015)));
    const [wx, wy] = toWorld(e.clientX, e.clientY);
    state.cam.z = z;
    state.cam.x = e.clientX - wx * z;
    state.cam.y = e.clientY - wy * z;
  },
  { passive: false }
);

function tipFor(n) {
  if (n.kind === 'person') return `<b>${esc(n.title)}</b><br>Click to see what ${esc(firstName(n.person))} can reach: the backend’s functions run as them, for real, and every row that comes back.`;
  if (n.kind === 'screen' && state.lens === 'person' && state.person?.reach) return `<b>${esc(n.title)}</b><br>Click to see exactly what ${esc(state.person.name)} gets here: its functions, run as them, for real.`;
  if (n.kind === 'fn') {
    const f = n.fn;
    return `<b>${esc(f.name)}</b><br>${esc(W.ruleWords(f.call))} may run it.<br>Touches ${f.touches.length} table${f.touches.length === 1 ? '' : 's'}. Click for the whole story.`;
  }
  if (n.kind === 'table') {
    const d = directRead(n.key);
    return `<b>${esc(n.title)}</b><br>${n.table.notOnBackend ? 'Not on the backend yet.' : `${n.table.rows ?? '?'} rows.`}<br>Directly: reading — ${esc(W.ruleWords(d.read))}; changing — ${esc(W.changeWords(d.rule.permissions))}.<br>Click to see or change who may.`;
  }
  const fns = new Set(state.map.calls.filter((c) => c.screen === n.key).map((c) => c.fn));
  return `<b>${esc(n.title)}</b><br>Asks ${[...fns].map(esc).join(', ')}.`;
}

for (const b of document.querySelectorAll('.lens button[data-lens]')) b.onclick = () => (b.dataset.lens === 'anon' ? setPerson(null) : setLens(b.dataset.lens));
$('personPick').onchange = (e) => {
  const v = e.target.value;
  if (!v) setLens('all');
  else if (v.startsWith(KIND)) setLens(v);
  else setPerson(v);
};
$('compareBtn').onclick = () => compareEveryone();
$('search').addEventListener('input', (e) => (state.search = e.target.value.trim()));
$('search').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const n = state.nodes.find(matchesSearch);
  if (n) focusOn(n.id);
});
$('closePanel').onclick = () => select(null);
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') select(null);
});
addEventListener('resize', resize);

let toastTimer;
function toast(text, kind) {
  const t = $('toast');
  t.textContent = text;
  t.className = kind ?? '';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 4200);
}

// ───────────────────────────── go ─────────────────────────────

resize();
makeStars();
const frame = (now) => {
  draw(now);
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
await load(false);
poll(true);
// A table name in the address (#t:Progress) opens it, so a link can go straight to a table.
if (location.hash.length > 1) focusOn(decodeURIComponent(location.hash.slice(1)));
// every minute: the backend limits admin requests, and the people questions need their share
setInterval(() => load(true), 60000);
window.__map = state;
// for the drives: the words the canvas draws, which no DOM query can read
window.__canvasWords = () => state.nodes.map((n) => `${n.title} — ${subtitle(n)}`);
