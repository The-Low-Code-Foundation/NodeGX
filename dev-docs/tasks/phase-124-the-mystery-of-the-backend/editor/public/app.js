// The backend map: screens → functions → tables on one canvas, with who may do what and what just ran.
import * as W from './words.js';

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
  links: '#a78bfa'
};
const OPEN_COLORS = ['#45d08a', '#a78bfa', '#fdb022', '#f97066'];

const PEOPLE = {
  anon: { signedIn: false, roles: [], words: 'Someone not signed in' },
  learner: { signedIn: true, roles: [], words: 'A signed-in learner' },
  staff: { signedIn: true, roles: null, words: 'Someone in the staff group' }
};

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
  lastResult: null
};

// ───────────────────────────── loading ─────────────────────────────

async function api(path, body) {
  const res = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
  const json = await res.json().catch(() => ({ error: 'The editor’s server gave an answer the map couldn’t read.' }));
  if (!res.ok) throw Object.assign(new Error(json.error || 'Something went wrong.'), { refused: json.refused });
  return json;
}

async function load(keepView) {
  try {
    state.map = await api('/api/map');
  } catch (e) {
    $('backendLine').innerHTML = `<span class="bad">●</span> ${esc(e.message)}`;
    $('livePulse').classList.add('off');
    setTimeout(() => load(keepView), 4000);
    return;
  }
  const m = state.map;
  $('appName').textContent = `${m.app.name} — backend map`;
  $('backendLine').innerHTML =
    `<span class="${m.backend.enforced && !m.backend.devOpen ? 'ok' : 'bad'}">●</span> ${esc(m.backend.name)} is running · ` +
    `${m.tables.length} tables · ${m.functions.length} functions · ${m.people} people`;
  layout();
  if (!keepView) fit();
  renderSecure();
  renderLensNote();
  if (state.selected && state.byId[state.selected]) renderPanel();
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

  // Centre each column on y = 0.
  for (const kind of ['screen', 'fn', 'table']) {
    const col = nodes.filter((n) => n.kind === kind);
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
  const pad = { left: 370, right: state.selected ? 450 : 40, top: 110, bottom: 150 };
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
  const p = PEOPLE[state.lens];
  if (!p) return null;
  return { ...p, roles: p.roles ?? (state.map?.roles ?? []).map((r) => r.name) };
}

function directRead(table) {
  const r = W.tableRule(state.map.config, table);
  return { read: W.readRule(r.permissions), change: [r.permissions.create, r.permissions.update, r.permissions.delete], rule: r };
}

/** For the lens: what this kind of person can do with each node. */
function lensOf(node) {
  const p = person();
  if (!p) return null;
  if (node.kind === 'fn') return { can: W.passes(node.fn.call, p) };
  if (node.kind === 'table') {
    const d = directRead(node.key);
    const direct = W.passes(d.read, p) || d.change.some((r) => W.passes(r, p)) || (d.rule.creatorOwns && p.signedIn);
    const via = state.map.functions.filter((f) => W.passes(f.call, p) && f.touches.some((t) => t.table === node.key));
    return { can: direct || via.length > 0, direct, via };
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
    ['screen', 'THE APP’S SCREENS', 'where people click'],
    ['fn', 'FUNCTIONS', 'the doors to the data, with their locks'],
    ['table', 'TABLES', 'where the data lives']
  ];
  for (const [kind, h, s] of heads) {
    const col = state.nodes.filter((n) => n.kind === kind);
    const top = Math.min(...col.map((n) => n.y));
    const x = Math.min(...col.map((n) => n.x));
    ctx.fillStyle = '#c4cedb';
    ctx.font = '700 14px Inter, system-ui, sans-serif';
    ctx.fillText(h, x, top - 42);
    ctx.fillStyle = '#7d8a98';
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.fillText(s, x, top - 24);
  }

  const focus = state.selected ?? state.hover;
  const rel = focus ? related(focus) : null;

  // wires, under the blocks
  for (const e of state.edges) {
    const p = edgePoints(e);
    let alpha = e.kind === 'links' ? 0.16 : e.kind === 'mentions' ? 0.22 : 0.42;
    if (rel) alpha = rel.has(e.id) ? 0.95 : 0.05;
    if (state.lens !== 'all' && !rel) {
      const a = state.byId[e.from], b = state.byId[e.to];
      const la = lensOf(a), lb = lensOf(b);
      if ((a.kind === 'fn' && !la.can) || (b.kind === 'fn' && !lb.can)) alpha *= 0.15;
    }
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

  // runs flying along the wires
  state.particles = state.particles.filter((pt) => now - pt.start < pt.dur + pt.delay);
  for (const pt of state.particles) {
    const t = (now - pt.start - pt.delay) / pt.dur;
    if (t < 0) continue;
    const e = state.edges.find((x) => x.id === pt.edge);
    if (!e) continue;
    const p = edgePoints(e);
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
  if (state.search && !matchesSearch(n) && !rel) alpha = Math.min(alpha, 0.2);
  ctx.globalAlpha = alpha;

  const color = n.kind === 'screen' ? COLORS.screen : n.kind === 'fn' ? fnColor(n.fn) : COLORS.table;
  const sel = state.selected === n.id, hov = state.hover === n.id;

  // a run's flash
  const fl = state.flashes[n.id];
  if (fl) {
    const t = (now - fl.at) / 1600;
    if (t > 1) delete state.flashes[n.id];
    else {
      ctx.save();
      ctx.globalAlpha = (1 - t) * 0.9;
      ctx.strokeStyle = fl.ok ? '#45d08a' : '#f97066';
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
  if (n.kind === 'fn' && !n.fn.deployed) ctx.setLineDash([5, 4]);
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
  if (n.kind === 'screen') {
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
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 14px Inter, system-ui, sans-serif';
  ctx.fillText(clip(n.title, n.w - 80), n.x + 44, n.y + 24);
  ctx.font = '12px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#c4cedb';
  ctx.fillText(clip(subtitle(n), n.w - 80), n.x + 44, n.y + 42);

  // badges on the right
  if (n.kind === 'fn') drawLock(n.x + n.w - 26, n.y + n.h / 2, color, callKind(n.fn.call), lens && !lens.can);
  if (n.kind === 'table') {
    const d = directRead(n.key);
    const open = Math.max(W.openness(d.read), ...d.change.map(W.openness));
    drawShield(n.x + n.w - 26, n.y + n.h / 2, OPEN_COLORS[open], open === 0, d.rule.own);
    if (lens && lens.direct) {
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

function subtitle(n) {
  const m = state.map;
  if (n.kind === 'screen') {
    const fns = new Set(m.calls.filter((c) => c.screen === n.key).map((c) => c.fn));
    return `asks ${fns.size} function${fns.size === 1 ? '' : 's'}`;
  }
  if (n.kind === 'fn') {
    if (!n.fn.deployed) return 'not live on the backend';
    return `${W.ruleWords(n.fn.call)} may run it`;
  }
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
  add('info', `<b>${kinds.authenticated.length}</b> functions need someone signed in; <b>${kinds.role.length}</b> only the ${esc((m.roles[0]?.name) ?? 'staff')} group${kinds.nobody.length ? `; <b>${kinds.nobody.length}</b> nobody` : ''}.`);

  const unsaved = Object.keys({ ...m.config.collections, ...m.fileCollections }).filter(
    (t) => JSON.stringify(m.config.collections[t] ?? null) !== JSON.stringify(m.fileCollections[t] ?? null)
  );
  if (unsaved.length) add('bad', `<b>Not saved:</b> the rules for ${unsaved.map((t) => esc(W.tableWords(t))).join(', ')} differ between the backend and the app’s folder. A restart would put the folder’s back.`);
  else add('good', `<b>The backend and the app’s folder agree</b> on every table’s rule, so a restart changes nothing.`);

  const notLive = m.functions.filter((f) => !f.deployed);
  if (notLive.length) add('warn', `<b>Not live:</b> ${notLive.map((f) => esc(f.name)).join(', ')} ${notLive.length === 1 ? 'is' : 'are'} in the app but not on the backend.`);
  if (m.config.signup === 'nobody' || m.config.signup == null) add('good', 'Nobody can make their own account: people are added by staff.');
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
  el.querySelector('h3').onclick = () => el.classList.remove('mini');
}

function renderLensNote() {
  const el = $('lensNote');
  const p = person();
  if (!p || !state.map) return el.classList.add('hidden');
  const m = state.map;
  const fns = m.functions.filter((f) => W.passes(f.call, p));
  const tables = state.nodes.filter((n) => n.kind === 'table').map((n) => [n, lensOf(n)]);
  const direct = tables.filter(([, l]) => l.direct);
  const via = tables.filter(([, l]) => !l.direct && l.via.length);
  el.classList.remove('hidden');
  el.innerHTML =
    `<b>${esc(p.words)}</b> can run <b>${fns.length}</b> of ${m.functions.length} functions` +
    `${fns.length && fns.length <= 4 ? ` (${fns.map((f) => esc(f.name)).join(', ')})` : ''}, ` +
    `open <b>${direct.length}</b> table${direct.length === 1 ? '' : 's'} directly${direct.length ? ` (${direct.map(([n]) => esc(n.title)).join(', ')})` : ''}, ` +
    `and reach <b>${via.length}</b> more only through those functions, which choose the rows in their own code. Dim means out of reach.`;
}

// ───────────────────────────── the side panel ─────────────────────────────

function select(id) {
  state.selected = id;
  // the safety card folds to its headline while the panel is open, to leave the map room
  $('secure').classList.toggle('mini', !!id);
  if (!id) {
    $('panel').classList.add('hidden');
    return;
  }
  const n = state.byId[id];
  if (n?.kind === 'table') {
    const d = directRead(n.key);
    state.edit = { table: n.key, read: d.read, change: W.changeRule(d.rule.permissions), creatorOwns: d.rule.creatorOwns };
  }
  state.lastResult = null;
  renderPanel();
}

function renderPanel() {
  const n = state.byId[state.selected];
  if (!n) return select(null);
  $('panel').classList.remove('hidden');
  const html = n.kind === 'table' ? tablePanel(n) : n.kind === 'fn' ? fnPanel(n) : screenPanel(n);
  $('panelBody').innerHTML = html;
  for (const a of $('panelBody').querySelectorAll('[data-go]')) a.onclick = () => focusOn(a.dataset.go);
  if (n.kind === 'table') wireTableControls(n);
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
  if (open === 0 && !d.rule.creatorOwns)
    verdict = `<div class="verdict good"><b>Sealed.</b> Nobody can open this table directly. Its rows are reached only through ${users.length ? `${users.length} function${users.length === 1 ? '' : 's'}` : 'no function at all'}, and each function decides in its own code whose rows to hand back.</div>`;
  else if (open >= 3)
    verdict = `<div class="verdict bad"><b>Open to anyone at all.</b> Someone not even signed in can ${W.openness(d.read) >= 3 ? 'read every row' : 'change rows'} directly, without any function checking.</div>`;
  else
    verdict = `<div class="verdict warn"><b>Partly open.</b> Reading directly: ${esc(W.ruleWords(d.read))}. Changing directly: ${esc(W.ruleWords(W.changeRule(d.rule.permissions) ?? d.change))}.${d.rule.creatorOwns ? ' And whoever made a row may always read and change that row.' : ''}</div>`;

  const fnLine = (f) => {
    const x = f.touches.find((y) => y.table === t.name);
    return `<li>${go(`f:${f.name}`, f.name)} ${x.hows.map((h) => esc(W.HOW_WORDS[h])).join(', ')} it${x.via.length ? ` (through ${esc(x.via.join(', '))})` : ''} — <b>${esc(W.ruleWords(f.call))}</b> may run it</li>`;
  };

  return `
    <div class="kind">Table</div>
    <h2>${esc(n.title)}</h2>
    <p><b>${t.rows ?? '?'}</b> row${t.rows === 1 ? '' : 's'} now · ${t.columns.length} things in each row${d.rule.own ? '' : ' · uses the app’s standard rule'}</p>
    ${verdict}
    <h4>Who may open it directly</h4>
    <div id="ruleEditor"></div>
    <h4>Who reaches it through functions</h4>
    ${users.length ? `<ul>${readers.map(fnLine).join('')}${users.filter((f) => !readers.includes(f)).map(fnLine).join('')}</ul>` : '<p>No function uses it.</p>'}
    <h4>What’s in a row</h4>
    <div class="chips">${t.columns.map((c) => `<span class="chip ${keys.has(c.name) ? 'key' : ''}" title="${esc(typeWords(c.type))}">${esc(c.name)} · ${esc(typeWords(c.type))}</span>`).join('')}</div>
    <p style="font-size:12px;color:#7d8a98">Green: no two rows may share it.</p>
    ${outLinks.length || inLinks.length ? `<h4>Linked tables</h4>
    <ul>
      ${outLinks.map((l) => `<li>Each row points at ${go(`t:${l.to}`, W.tableWords(l.to))} by its <b>${esc(l.column)}</b></li>`).join('')}
      ${inLinks.map((l) => `<li>${go(`t:${l.from}`, W.tableWords(l.from))} rows point here by their <b>${esc(l.column)}</b></li>`).join('')}
    </ul>
    <p style="font-size:12px;color:#7d8a98">These links are read from the column names (a “conceptId” points at the table whose key is conceptId). The backend itself doesn’t declare them.</p>` : ''}
  `;
}

function wireTableControls(n) {
  const m = state.map;
  const choices = W.audienceChoices(m.roles.map((r) => r.name));
  const e = state.edit;
  const d = directRead(n.key);
  const cur = { read: d.read, change: W.changeRule(d.rule.permissions), creatorOwns: d.rule.creatorOwns };
  const changed = JSON.stringify(cur.read) !== JSON.stringify(e.read) || JSON.stringify(cur.change) !== JSON.stringify(e.change) || cur.creatorOwns !== e.creatorOwns;
  const pills = (field) =>
    choices
      .map((c) => {
        const on = JSON.stringify(e[field]) === JSON.stringify(c.value);
        const o = W.openness(c.value);
        return `<button class="pill ${on ? 'on' : ''} ${on && o >= 3 ? 'risky' : on && o === 2 ? 'mid' : ''}" data-field="${field}" data-value="${esc(c.value)}" title="${esc(c.long)}">${esc(c.words)}</button>`;
      })
      .join('');
  const known = (v) => choices.some((c) => JSON.stringify(c.value) === JSON.stringify(v));

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
      ? `<div class="verdict good">${checksHtml(r.checks)}</div>`
      : `<div class="verdict good result">
          <div class="row"><span class="${r.inBackend ? 'yes' : 'no'}">${r.inBackend ? '✓' : '✗'}</span><span>${r.inBackend ? 'The backend is obeying it now.' : 'The backend is not showing it.'}</span></div>
          <div class="row"><span class="${r.inFile ? 'yes' : 'no'}">${r.inFile ? '✓' : '✗'}</span><span>${r.inFile ? `Saved in the app’s folder (${esc(m.securityFile)}): it holds when the backend restarts.` : 'Not in the app’s folder: a restart would undo it.'}</span></div>
          ${checksHtml(r.checks)}
        </div>`
    : '';

  $('ruleEditor').innerHTML = `
    <p>Looking at rows${known(e.read) ? '' : ` <span class="chip">now: ${esc(W.ruleWords(e.read))}</span>`}</p>
    <div class="choice-group">${pills('read')}</div>
    <p>Adding, changing or deleting rows${known(e.change) ? '' : ` <span class="chip">now: ${esc(e.change === null ? 'a mixed rule' : W.ruleWords(e.change))}</span>`}</p>
    <div class="choice-group">${pills('change')}</div>
    <label class="check"><input type="checkbox" id="creatorOwns" ${e.creatorOwns ? 'checked' : ''}> <span>Whoever made a row may always see and change that row</span></label>
    ${preview}
    <button class="go" id="applyRule" ${changed && e.read != null && e.change != null && known(e.read) && known(e.change) ? '' : 'disabled'}>Make it so</button>
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
      const { checks } = await api(`/api/check?table=${encodeURIComponent(n.key)}`);
      state.lastResult = { checks, onlyChecks: true };
      wireTableControls(n);
    } catch (err) {
      toast(err.message, 'bad');
    }
  };
}

function checksHtml(checks) {
  if (!checks?.length) return '';
  const by = {};
  for (const c of checks) (by[c.who] ??= {})[c.op] = c;
  return `<p style="margin-top:10px"><b>The backend’s own answer</b> (a dry run: nothing ran, nothing changed):</p><ul>${Object.entries(by)
    .map(
      ([who, ops]) =>
        `<li><b>${esc(who)}</b>: looking ${ops.find?.allowed ? '<span class="no">let in</span>' : '<span class="yes">turned away</span>'}, adding ${ops.create?.allowed ? '<span class="no">let in</span>' : '<span class="yes">turned away</span>'}</li>`
    )
    .join('')}</ul>`;
}

async function saveRule(n, reset) {
  const e = state.edit;
  const btn = $('applyRule') ?? $('resetRule');
  if (btn) btn.disabled = true;
  try {
    const r = await api('/api/table-rule', {
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
    toast(r.unchanged ? 'Nothing to change: it already was like that.' : `Done. The backend obeys the new rule for ${W.tableWords(n.key)}, and it is saved.`, 'good');
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
  return `
    <div class="kind">Screen</div>
    <h2>${esc(n.title)}</h2>
    <p>What happens on this screen that reaches the backend:</p>
    <ul>${calls.map((c) => `<li>${esc(cap(c.trigger.words))} runs ${go(`f:${c.fn}`, c.fn)} — ${esc(W.ruleWords(m.functions.find((f) => f.name === c.fn)?.call))} may</li>`).join('')}</ul>
  `;
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// ───────────────────────────── live runs ─────────────────────────────

let newest = 0;
async function poll(first) {
  try {
    const { runs, total } = await api(`/api/runs${newest ? `?since=${newest}` : ''}`);
    $('livePulse').classList.remove('off');
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
        `<div class="run ${r.status === 'success' ? '' : 'error'} ${i < freshCount ? 'fresh' : ''}" data-fn="${esc(r.name)}"><b>${esc(r.name)}</b> ${esc(W.runWords(r))}<div class="when">${esc(W.ago(r.startedAt))}${r.durationMs != null ? ` · took ${r.durationMs} ms` : ''}</div></div>`
    )
    .join('') || '<span style="color:#7d8a98">Nothing has run yet. Use the app and watch.</span>';
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
  if (n.kind === 'fn') {
    const f = n.fn;
    return `<b>${esc(f.name)}</b><br>${esc(W.ruleWords(f.call))} may run it.<br>Touches ${f.touches.length} table${f.touches.length === 1 ? '' : 's'}. Click for the whole story.`;
  }
  if (n.kind === 'table') {
    const d = directRead(n.key);
    return `<b>${esc(n.title)}</b><br>${n.table.rows ?? '?'} rows.<br>Directly: reading — ${esc(W.ruleWords(d.read))}; changing — ${esc(W.ruleWords(W.changeRule(d.rule.permissions) ?? d.change))}.<br>Click to see or change who may.`;
  }
  const fns = new Set(state.map.calls.filter((c) => c.screen === n.key).map((c) => c.fn));
  return `<b>${esc(n.title)}</b><br>Asks ${[...fns].map(esc).join(', ')}.`;
}

for (const b of document.querySelectorAll('.lens button')) {
  b.onclick = () => {
    state.lens = b.dataset.lens;
    for (const o of document.querySelectorAll('.lens button')) o.classList.toggle('on', o === b);
    renderLensNote();
  };
}
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
setInterval(() => load(true), 30000);
window.__map = state;
