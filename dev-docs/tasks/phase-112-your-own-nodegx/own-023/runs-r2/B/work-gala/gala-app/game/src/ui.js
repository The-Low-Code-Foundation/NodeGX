// The side sheet: the preparations (one tab per problem), the live evening, the verdicts, the shop. Everything she sets is
// written into G.S.plan or G.S.school, saved, and the day is simulated again from scratch.
import { G, save, resetAll } from './state.js';
import {
  RULES, CLS, NUMBERS, numDur, itemKind, STYLES, MOVES, MAX_MOVES, LEVELS, OUTFITS, HAIRS, SHOES, ACCS, PIECES, LOGE, SNACKS, UPGRADES,
  BACKDROPS, PARKING, COLORS, seasonRules, hm,
} from './data.js';
import { simulate, routineInfo, danceOf, judgeMusic, stageOf, isOwned, fits, againstWall, footprint, analyseLoge, clamp, seatsOf } from './engine.js';
import { addSeasonNumbers } from './plan.js';
import { t, nm, clsName, numName, dancerName, moveName, itemName, styleName, clockOf, durOf, num } from './i18n.js';
import * as W from './world.js';
import { wake } from './music.js';
import { TUNES } from './tunes.js';
import { dancers, buildDancers, redressAll, idle, idleScene, startRun, stepRun, skipNumber, fastForward, snapDancers } from './play.js';

const $ = (s) => document.querySelector(s);
const sheet = $('#sheet'), sbody = $('#sbody'), tabsEl = $('#tabs'), goEl = $('#go'), toastEl = $('#toast'), camBar = $('#cam'), modal = $('#modal'), floatEl = $('#float');
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let toastT; export function toast(text) { toastEl.textContent = text; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 2600); }
const rules = () => seasonRules(G.S.season);
const activeNums = () => G.S.plan.order.filter((id) => NUMBERS[id] && rules().classes.includes(NUMBERS[id].cls));
const forecast = () => simulate({ plan: G.S.plan, school: G.S.school, season: G.S.season, mode: 'rehearsal', seed: G.S.seed });
const dot = (cls) => `<span class="dot" style="background:${cls ? CLS[cls].color : 'var(--accent)'}"></span>`;
const stepper = (id, label, value) => `<div class="step"><span class="lab">${esc(label)}</span><button type="button" data-st="${id}" data-d="-1" aria-label="−">−</button><output id="out-${id}">${esc(value)}</output><button type="button" data-st="${id}" data-d="1" aria-label="+">+</button></div>`;
const facts = (list) => `<ul class="facts">${list.map((f) => `<li>${f}</li>`).join('')}</ul>`;
const diffDots = (d) => '●'.repeat(d) + '○'.repeat(3 - d);
const LEVEL_ICON = ['⬇', '➖', '⬆'];
function bindSteppers(fn) { for (const b of sbody.querySelectorAll('[data-st]')) b.onclick = () => { fn(b.dataset.st, +b.dataset.d); changed(); }; }
// any change: save, re-simulate (the sheet reads the fresh day), put the dancers where the tab shows them
export function changed(opts = {}) { save(); if (!G.run) idle(); if (opts.world) refreshWorld(); paintSheet(); hud(); }

/* ---------------- the world follows the save ---------------- */
export function refreshWorld() {
  const sc = G.S.school, up = sc.upgrades;
  W.buildLoge(); W.showFurniture(); W.buildSeats(up.sieges || 0, !!up.confort); W.showBuvette(up.buvette); W.buildLights(up);
  W.buildParking(G.S.plan.parking.width, up.rangee ? 2 : 1); W.showBackdrop(G.S.plan.backdrop); W.drawStageTape(stageOf(sc)); W.drawSign(schoolName()); W.setStageFloor('tapis');
  if (!G.run) idleScene();
}
export const schoolName = () => G.S.school.name || t().school;

/* ---------------- buying ---------------- */
export function buy(kind, id, price, name) {
  const sc = G.S.school;
  if (sc.stars < price) { toast(t().notEnough); return false; }
  sc.stars -= price;
  if (kind === 'up') sc.upgrades[id] = id === 'sieges' ? (sc.upgrades[id] || 0) + 1 : true;
  else sc.owned[`${kind}:${id}`] = true;
  if (kind === 'up' && id === 'logeXL') sc.logeCols = LOGE.colsBig;
  toast(t().bought(name)); changed({ world: kind === 'up' });
  return true;
}
const priceOf = (kind, id) => (kind === 'up' ? UPGRADES[id].price : kind === 'food' ? 15 + (id === 'crepes' ? 5 : 0) : ({ outfit: OUTFITS, hair: HAIRS, shoes: SHOES, acc: ACCS, piece: PIECES, snack: SNACKS }[kind][id].price || 0));

/* ---------------- the frame: top bar, camera bar, tabs ---------------- */
export function hud() {
  const run = G.run;
  $('#daychip').textContent = run && !run.done ? `${t().live(run.mode)} · ${clockOf(run.t, false)}` : '';
  $('#seasonchip').textContent = t().season(G.S.season);
  $('#starchip').textContent = t().stars(G.S.school.stars);
  $('#langBtn').textContent = t().lang;
  $('#brand').textContent = schoolName();
  const gu = $('#grownUpsBtn'); if (gu) gu.textContent = t().grownUps;
}
export function paintCamBar() {
  const v = t().views, m = W.view.mode;
  camBar.innerHTML = `<button type="button" data-c="rotL" title="${v.rotL}" aria-label="${v.rotL}">⟲</button><button type="button" data-c="rotR" title="${v.rotR}" aria-label="${v.rotR}">⟳</button>`
    + `<button type="button" data-c="high" aria-pressed="${W.view.high}">⇕ ${v.high}</button>`
    + `<button type="button" data-c="school" aria-pressed="${m === 'school'}">🏫 ${v.school}</button><button type="button" data-c="stage" aria-pressed="${m === 'stage'}">🎭 ${v.stage}</button>`
    + (rules().parking ? `<button type="button" data-c="park" aria-pressed="${m === 'park'}">🅿️</button>` : '')
    + `<button type="button" data-c="walls">🧱 ${v.walls} : ${t().wallModes[W.wallMode]}</button>`
    + `<button type="button" data-c="out" aria-label="−">−</button><button type="button" data-c="in" aria-label="+">+</button>`;
  for (const b of camBar.querySelectorAll('[data-c]')) b.onclick = () => camCmd(b.dataset.c);
  requestAnimationFrame(() => resize());
}
export function camCmd(c) {
  const v = W.view;
  if (c === 'rotL' || c === 'rotR') { v.rot = (v.rot + (c === 'rotL' ? 3 : 1)) % 4; if (['stage', 'podium', 'park'].includes(v.mode)) v.mode = G.pickedRoom ? 'room' : 'school'; W.cutTo(); }
  if (c === 'high') { v.high = !v.high; if (['stage', 'podium'].includes(v.mode)) v.mode = 'school'; W.cutTo(); }
  if (c === 'school') { G.pickedRoom = null; W.cutTo('school'); if (G.screen === 'prep') paintSheet(); }
  if (c === 'stage') { W.cutTo(v.mode === 'stage' ? 'school' : 'stage'); }
  if (c === 'park') { G.pickedRoom = null; W.cutTo(v.mode === 'park' ? 'school' : 'park'); }
  if (c === 'walls') W.setWallMode((W.wallMode + 1) % 3);
  if (c === 'in') W.zoomBy(1.25); if (c === 'out') W.zoomBy(0.8);
  if (G.run) G.run.auto = 'manual';
  paintCamBar();
}
export function pickRoom(r) { G.pickedRoom = r; W.cutTo(r ? 'room' : 'school'); if (G.screen === 'prep') paintSheet(); paintCamBar(); }
const TABS = () => ['order', 'formation', 'gouter', 'costumes', 'build', ...(rules().parking ? ['parking'] : []), 'shop', 'notebook'];
export function setTab(k) {
  G.tab = k; G.armed = null; W.setGhost(null);
  if (k !== 'build') { G.selected = null; W.showFurniture(); }
  if (k === 'formation') { G.pickedRoom = null; W.cutTo('stage'); }
  else if (k === 'costumes') { G.pickedRoom = null; W.cutTo('podium'); }
  else if (k === 'build') pickRoom('dr');
  else if (k === 'parking') { G.pickedRoom = null; W.cutTo('park'); }
  else if (['podium', 'park'].includes(W.view.mode)) W.cutTo('school');
  idle(); paintSheet(); paintCamBar();
}
export function showScreen(s) { G.screen = s; paintSheet(); hud(); }
export function paintSheet() {
  tabsEl.hidden = G.screen !== 'prep';
  const pop = document.getElementById('planpop'); if (pop) pop.hidden = true; // the formation tab shows it again when it is open
  if (G.screen === 'prep') {
    if (!TABS().includes(G.tab)) G.tab = 'order';
    tabsEl.innerHTML = TABS().map((k) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${G.tab === k}">${esc(t().tabs[k])}</button>`).join('');
    for (const b of tabsEl.querySelectorAll('[data-tab]')) b.onclick = () => setTab(b.dataset.tab);
    ({ order: paintOrder, formation: paintFormation, gouter: paintGouter, costumes: paintCostumes, build: paintBuild, parking: paintParking, shop: paintShop, notebook: paintNotebook })[G.tab]();
    goEl.innerHTML = `<button type="button" class="reh" id="rehBtn">${esc(t().rehearse)}</button>` + (G.S.galaDone ? `<button type="button" class="gala" id="seasonBtn">${esc(t().newSeason)}</button><div class="hint wide" style="margin:0">${esc(t().galaDone)}</div>` : `<button type="button" class="gala" id="galaBtn">${esc(t().gala)}</button>`);
    goEl.querySelector('#rehBtn').onclick = () => beginRun('rehearsal');
    const gb = goEl.querySelector('#galaBtn'); if (gb) gb.onclick = () => beginRun('gala');
    const sb = goEl.querySelector('#seasonBtn'); if (sb) sb.onclick = nextSeason;
  } else if (G.screen === 'run') paintRunSheet(true);
  else if (G.screen === 'results') paintResults();
  requestAnimationFrame(() => resize());
}

/* ---------------- the programme ---------------- */
let dragId = null;
function paintOrder() {
  const P = G.S.plan, s = G.S.season;
  sbody.innerHTML = `<h2>${esc(t().orderH)}</h2>${facts(t().orderFacts(s))}`
    + stepper('start', t().start, clockOf(P.start)) + stepper('interval', t().interval, durOf(P.interval))
    + `<p class="hint">${esc(t().orderHint)}</p><div class="cards" id="orderCards">${P.order.map((id, k) => {
      const kind = itemKind(id), locked = k === 0 || k === P.order.length - 1, dur = kind === 'interval' ? P.interval : kind === 'number' ? numDur(id) : null;
      const tags = kind === 'number' && s >= 3 ? `<span class="tags">${STYLES[NUMBERS[id].style].icon}${NUMBERS[id].mood === 'calme' ? '🐢' : '⚡'}</span>` : '';
      return `<div class="card${locked ? ' locked' : ''}${dragId === id ? ' dragging' : ''}" data-id="${id}">${dot(kind === 'number' ? NUMBERS[id].cls : null)}<span class="nm">${esc(itemName(id))}</span>${tags}<span class="du">${dur ? esc(durOf(dur)) : id === 'accueil' ? '4 min' : '3 min'}</span>${locked ? '<span class="du">🔒</span>' : `<span class="mv"><button type="button" data-mv="-1" aria-label="▲">▲</button><button type="button" data-mv="1" aria-label="▼">▼</button></span>`}</div>`;
    }).join('')}</div>`;
  bindSteppers((id, d) => { if (id === 'start') P.start = clamp(P.start + d * 300, RULES.startMin, RULES.startMax); if (id === 'interval') P.interval = clamp(P.interval + d * 300, RULES.intervalMin, RULES.intervalMax); W.drawClock(P.start); });
  for (const c of sbody.querySelectorAll('.card:not(.locked)')) {
    c.querySelectorAll('[data-mv]').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); moveCard(c.dataset.id, +b.dataset.mv); }));
    c.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; dragId = c.dataset.id; c.classList.add('dragging'); e.preventDefault(); });
  }
}
function moveCard(id, d) { const o = G.S.plan.order, i = o.indexOf(id), j = clamp(i + d, 1, o.length - 2); if (i === j) return; o.splice(i, 1); o.splice(j, 0, id); changed(); }
document.addEventListener('pointermove', (e) => {
  if (!dragId) return; const cards = [...sbody.querySelectorAll('#orderCards .card')], o = G.S.plan.order, i = o.indexOf(dragId);
  let j = i; for (let k = 1; k < cards.length - 1; k++) { const r = cards[k].getBoundingClientRect(); if (e.clientY > r.top && e.clientY < r.bottom) { j = k; break; } }
  if (j !== i) { o.splice(i, 1); o.splice(j, 0, dragId); paintOrder(); }
});
document.addEventListener('pointerup', () => { if (dragId) { dragId = null; changed(); } });

/* ---------------- the formation and the choreography ---------------- */
let selMove = null, allMoves = false;
function numChips(onPick) {
  return `<div class="chips numchips">${activeNums().map((id) => `<button type="button" data-num="${id}" aria-pressed="${G.pickNum === id}">${dot(NUMBERS[id].cls)} ${esc(numName(id))}</button>`).join('')}</div>`;
}
function bindNumChips(after) { for (const b of sbody.querySelectorAll('[data-num]')) b.onclick = () => { G.pickNum = b.dataset.num; G.pickDancer = null; G.editB = false; selMove = null; idle(); after(); }; }
// the blocks of a dance get a colour each, in the order they were made
const BLOCK_COLORS = ['#86d9a6', '#b48cff', '#7cc6ff', '#ffb86b', '#ff9ec7', '#f5e36b', '#9fe0e0', '#d0b0ff'];
const MAX_BLOCKS = 8, MAX_CHAIN = 60;
let selBlock = {}, selChain = null;
const blockColor = (np, bid) => BLOCK_COLORS[Math.max(0, np.blocks.findIndex((b) => b.id === bid)) % BLOCK_COLORS.length];
const blockCounts = (b) => b.moves.reduce((s, mid) => s + MOVES[mid].c, 0);
// a chain's counts as a sum, equal blocks in a row grouped: "3 × 32 + 16"
export function chainSum(parts) {
  const out = []; for (const p of parts) { const last = out[out.length - 1]; if (last && last.v === p) last.n++; else out.push({ v: p, n: 1 }); }
  return out.map((x) => (x.n > 1 ? `${x.n} × ${x.v}` : `${x.v}`)).join(' + ') || '0';
}
function paintFormation() {
  if (!activeNums().includes(G.pickNum)) G.pickNum = activeNums().includes('G1') ? 'G1' : activeNums()[0];
  const id = G.pickNum, N = NUMBERS[id], cls = CLS[N.cls], np = G.S.plan.numbers[id], st = stageOf(G.S.school), dance = danceOf(np), info = routineInfo(dance.moves, N.style, false);
  if (info.swaps && !np.B) np.B = np.A.map((p) => ({ ...p }));
  if (!info.swaps) G.editB = false;
  if (!np.blocks.some((b) => b.id === selBlock[id])) selBlock[id] = np.blocks[0].id;
  const bid = selBlock[id], blk = np.blocks.find((b) => b.id === bid), binfo = routineInfo(blk.moves, N.style, false);
  if (selChain !== null && selChain >= np.chain.length) selChain = null;
  const res = forecast(), P = res.perf[id];
  let h = `<h2>${esc(t().formH)}</h2>${numChips()}`;
  h += facts([...t().musicFacts(durOf(numDur(id)), N.bpm), t().tuneFact(esc(nm(TUNES[id].title)), esc(nm(TUNES[id].by))), t().spanFact(clsName(N.cls), `${num(cls.span)} m`), t().hiddenFact, `${STYLES[N.style].icon} ${esc(styleName(N.style))}`]);
  const abChips = info.swaps ? `<button type="button" data-ab="A" aria-pressed="${!G.editB}">${esc(t().posA)}</button><button type="button" data-ab="B" aria-pressed="${G.editB}">${esc(t().posB)}</button>` : '';
  const planTools = `${abChips}<button type="button" data-ruler aria-pressed="${!!G.ruler}">${esc(t().ruler)}</button><button type="button" data-big>${esc(G.planBig ? t().smallPlan : t().bigPlan)}</button>`;
  const planSvg = stagePlanSvg(id, np, cls, st, info, blk.moves);
  h += `<p class="hint">${esc(t().formHint)}</p>`;
  h += G.planBig ? `<p class="hint">${esc(t().bigNote)}</p><div class="chips">${planTools}</div>` : planSvg + `<div class="chips">${planTools}</div>${G.ruler ? `<p class="hint">${esc(t().rulerHint)}</p>` : ''}`;
  h += `<p class="hint">${np.A.map((_, i) => `${i + 1} ${esc(dancerName(N.cls, i))}`).join(' · ')}</p>`;
  // the blocks, and the steps of the chosen one
  h += `<h3>${esc(t().blocksH)}</h3><p class="hint">${esc(t().blocksHint)}</p><div class="chips blocks">`;
  for (const b of np.blocks) h += `<button type="button" data-blk="${b.id}" aria-pressed="${b.id === bid}" style="border-left:7px solid ${blockColor(np, b.id)}">${esc(b.name)} <small>${esc(t().countsShort(blockCounts(b)))}</small></button>`;
  h += `</div><div class="chips"><button type="button" id="newBlk">${esc(t().newBlock)}</button><button type="button" id="copyBlk">${esc(t().copyBlock)}</button><button type="button" id="renBlk">${esc(t().renameBlock)}</button>${np.blocks.length > 1 ? `<button type="button" id="delBlk">${esc(t().delBlock)}</button>` : ''}</div>`;
  h += `<div class="seq blockseq" style="border-left-color:${blockColor(np, bid)}">`;
  blk.moves.forEach((mid, k) => {
    const m = MOVES[mid], l = binfo.links[k];
    h += `<button type="button" class="mvchip" data-k="${k}" aria-pressed="${selMove === k}"><span class="ic">${m.icon}</span><span class="mn">${esc(moveName(mid))}</span><span class="ct">${esc(t().countsShort(m.c))} · ${diffDots(m.d)}</span></button>`;
    if (l) h += `<span class="lk ${l.gap === 0 && !l.off ? 'ok' : l.gap === 2 ? 'bad' : 'meh'}" title="${l.off ? esc(t().offStyle) : ''}">${l.gap === 0 && !l.off ? '✨' : l.gap === 2 ? '💥' : '〰️'}</span>`;
  });
  if (!blk.moves.length) h += `<span class="hint">${esc(t().emptyBlock)}</span>`;
  h += `</div><p class="hint small">${esc(t().harmonyLegend)}</p>`;
  if (selMove !== null && blk.moves[selMove]) h += `<div class="chips"><button type="button" data-sm="-1">◀ ${esc(t().moveLeft)}</button><button type="button" data-sm="1">${esc(t().moveRight)} ▶</button><button type="button" data-sm="x">✕ ${esc(t().removeMove)}</button></div>`;
  h += `<p>${t().blockLen(esc(blk.name), blockCounts(blk))}</p>`;
  h += `<h3>${esc(t().addMoves)}</h3><div class="chips"><button type="button" id="filtBtn" aria-pressed="${!allMoves}">${esc(t().onlyStyle(styleName(N.style)))}</button><button type="button" id="allBtn" aria-pressed="${allMoves}">${esc(t().allMoves)}</button></div><div class="pal">`;
  for (const [mid, m] of Object.entries(MOVES)) {
    const suits = m.st === '*' || m.st.split(' ').includes(N.style); if (!allMoves && !suits) continue;
    h += `<button type="button" data-add="${mid}"${blk.moves.length >= MAX_MOVES ? ' disabled' : ''}><span class="ic">${m.icon}</span><span class="mn">${esc(moveName(mid))}</span><span class="ct">${esc(t().countsShort(m.c))} · ${diffDots(m.d)} · ${LEVEL_ICON[m.a]}→${LEVEL_ICON[m.b]}${m.dx ? ` · ${m.dx > 0 ? '→' : '←'}1 m` : ''}${m.dz ? ` · ${m.dz < 0 ? '↓' : '↑'}1 m` : ''}</span></button>`;
  }
  h += `</div><p class="hint small">${LEVEL_ICON.map((ic, k) => `${ic} ${LEVELS[G.lang][k]}`).join(' · ')}</p>`;
  // the dance: the blocks in order, and how the joins between them flow
  const byId = Object.fromEntries(np.blocks.map((b) => [b.id, b])), music = judgeMusic(id, dance, info);
  h += `<h3>${esc(t().chainH)}</h3><p class="hint">${esc(t().chainHint)}</p><div class="seq chain">`;
  dance.marks.forEach((mk, n) => {
    h += `<button type="button" class="chainchip" data-ch="${mk.j}" aria-pressed="${selChain === mk.j}" style="background:${blockColor(np, mk.block)}">${esc(byId[mk.block].name)}</button>`;
    const next = dance.marks[n + 1], l = next && mk.k1 > mk.k0 && next.k1 > next.k0 ? info.links[mk.k1 - 1] : null;
    if (l) h += `<span class="lk ${l.gap === 0 && !l.off ? 'ok' : l.gap === 2 ? 'bad' : 'meh'}">${l.gap === 0 && !l.off ? '✨' : l.gap === 2 ? '💥' : '〰️'}</span>`;
  });
  if (!dance.marks.length) h += `<span class="hint">${esc(t().chainEmpty)}</span>`;
  h += `</div><div class="chips"><button type="button" id="addCh">${esc(t().addToChain(blk.name))}</button>`;
  if (selChain !== null) h += `<button type="button" data-cm="-1">◀ ${esc(t().moveLeft)}</button><button type="button" data-cm="1">${esc(t().moveRight)} ▶</button><button type="button" data-cm="x">✕ ${esc(t().removeMove)}</button>`;
  h += `</div><p>${t().danceLen(chainSum(music.parts), info.phrase, N.counts)}</p>` + musicBar(id, np, dance, info);
  // how they'll feel
  if (P) h += forecastBox(P, cls);
  h += `<div class="chips"><button type="button" class="big" id="tryBtn">${esc(t().tryBtn)}</button></div><p class="hint small">${esc(t().tryNote)}</p>`;
  sbody.innerHTML = h;
  // the plan, enlarged over the 3D view when she asks for it
  let pop = document.getElementById('planpop');
  if (G.planBig) {
    if (!pop) { pop = document.createElement('div'); pop.id = 'planpop'; document.body.appendChild(pop); }
    pop.hidden = false;
    pop.innerHTML = `<div class="pophead"><b>${dot(N.cls)} ${esc(numName(id))}</b><div class="chips">${planTools}<button type="button" class="big" data-try>${esc(t().tryBtn)}</button></div></div>${G.ruler ? `<p class="hint">${esc(t().rulerHint)}</p>` : ''}${planSvg}`;
  } else if (pop) pop.hidden = true;
  const planRoot = G.planBig ? pop : sbody;
  bindNumChips(paintFormation);
  for (const root of G.planBig ? [sbody, pop] : [sbody]) {
    for (const b of root.querySelectorAll('[data-ab]')) b.onclick = () => { G.editB = b.dataset.ab === 'B'; idle(); paintFormation(); };
    for (const b of root.querySelectorAll('[data-ruler]')) b.onclick = () => { G.ruler = G.ruler ? null : { x: -2.5, z: 0.4, a: 0 }; paintFormation(); };
    for (const b of root.querySelectorAll('[data-big]')) b.onclick = () => { G.planBig = !G.planBig; paintFormation(); };
    for (const b of root.querySelectorAll('[data-try]')) b.onclick = () => beginRun('try', id);
  }
  for (const b of sbody.querySelectorAll('[data-blk]')) b.onclick = () => { selBlock[id] = b.dataset.blk; selMove = null; paintFormation(); };
  sbody.querySelector('#newBlk').onclick = () => {
    if (np.blocks.length >= MAX_BLOCKS) { toast(t().maxBlocks); return; }
    const free = 'abcdefgh'.split('').find((c) => !np.blocks.some((b) => b.id === c));
    np.blocks.push({ id: free, name: free.toUpperCase(), moves: [] }); selBlock[id] = free; selMove = null; changed();
  };
  sbody.querySelector('#copyBlk').onclick = () => {
    if (np.blocks.length >= MAX_BLOCKS) { toast(t().maxBlocks); return; }
    const free = 'abcdefgh'.split('').find((c) => !np.blocks.some((b) => b.id === c));
    np.blocks.push({ id: free, name: `${blk.name} 2`.slice(0, 24), moves: [...blk.moves] }); selBlock[id] = free; selMove = null; changed();
  };
  sbody.querySelector('#renBlk').onclick = () => { const v = prompt(t().renameAsk, blk.name); if (v && v.trim()) { blk.name = v.trim().slice(0, 24); changed(); } };
  const del = sbody.querySelector('#delBlk');
  if (del) del.onclick = () => { if (!confirm(t().delAsk(blk.name))) return; np.blocks = np.blocks.filter((b) => b !== blk); np.chain = np.chain.filter((x) => x !== bid); selChain = null; selMove = null; changed(); };
  for (const b of sbody.querySelectorAll('[data-k]')) b.onclick = () => { selMove = selMove === +b.dataset.k ? null : +b.dataset.k; paintFormation(); };
  for (const b of sbody.querySelectorAll('[data-sm]')) b.onclick = () => {
    const mv = blk.moves, k = selMove; if (k === null) return;
    if (b.dataset.sm === 'x') { mv.splice(k, 1); selMove = null; }
    else { const j = clamp(k + +b.dataset.sm, 0, mv.length - 1); if (j !== k) { const [x] = mv.splice(k, 1); mv.splice(j, 0, x); selMove = j; } }
    changed();
  };
  for (const b of sbody.querySelectorAll('[data-add]')) b.onclick = () => { if (blk.moves.length >= MAX_MOVES) { toast(t().maxMoves); return; } blk.moves.push(b.dataset.add); changed(); };
  for (const b of sbody.querySelectorAll('[data-ch]')) b.onclick = () => { selChain = selChain === +b.dataset.ch ? null : +b.dataset.ch; paintFormation(); };
  sbody.querySelector('#addCh').onclick = () => { if (np.chain.length >= MAX_CHAIN) { toast(t().maxChain); return; } np.chain.push(bid); changed(); };
  for (const b of sbody.querySelectorAll('[data-cm]')) b.onclick = () => {
    const ch = np.chain, k = selChain; if (k === null) return;
    if (b.dataset.cm === 'x') { ch.splice(k, 1); selChain = null; }
    else { const j = clamp(k + +b.dataset.cm, 0, ch.length - 1); if (j !== k) { const [x] = ch.splice(k, 1); ch.splice(j, 0, x); selChain = j; } }
    changed();
  };
  sbody.querySelector('#filtBtn').onclick = () => { allMoves = false; paintFormation(); };
  sbody.querySelector('#allBtn').onclick = () => { allMoves = true; paintFormation(); };
  sbody.querySelector('#tryBtn').onclick = () => beginRun('try', id);
  bindStagePlan(planRoot, id, np, cls, st, info);
}
// the music above, the dance below: each block of the chain in its colour, red where it runs past the music
function musicBar(id, np, dance, info) {
  const N = NUMBERS[id], scale = Math.max(N.counts, info.phrase, 1), W0 = 100;
  let blocks = '';
  for (const mk of dance.marks.slice(0, 120)) {
    if (mk.k1 === mk.k0) continue;
    const s0 = info.starts[mk.k0], s1 = info.starts[mk.k1 - 1] + MOVES[dance.moves[mk.k1 - 1]].c, x0 = (s0 / scale) * W0, x1 = Math.min((s1 / scale) * W0, W0);
    blocks += `<rect x="${x0}" y="9" width="${Math.max(0.2, x1 - x0 - 0.25)}" height="6" rx="1" fill="${s1 > N.counts ? '#ff6f6f' : blockColor(np, mk.block)}"/>`;
  }
  const mW = (N.counts / scale) * W0;
  return `<svg class="musicbar" viewBox="-1 0 102 22" role="img" aria-label="${esc(t().musicBar)}"><text x="0" y="3.6">${esc(t().musicBar)}</text><rect x="0" y="4.5" width="${mW}" height="3.2" rx="1" fill="#f5b942"/><text x="0" y="20.5">${esc(t().yourDance)}</text>${blocks}<line x1="${mW}" x2="${mW}" y1="3" y2="16" stroke="#fff" stroke-width=".3" stroke-dasharray="1 .6"/></svg>`;
}
function forecastBox(P, cls) {
  const s = P.state, meter = (label, v, good) => { const ok = good === 'high' ? v >= 60 : v <= 40, bad = good === 'high' ? v < 40 : v > 60; return `<div class="meter"><span>${esc(label)}</span><span class="bar"><i style="width:${v}%;background:${ok ? 'var(--good)' : bad ? 'var(--bad)' : 'var(--warn)'}"></i></span><b>${v}</b></div>`; };
  const reasons = riskReasons(P, cls);
  return `<h3>${esc(t().forecastH)}</h3><div class="meters">${meter(t().energy, s.energy, 'high')}${meter(t().hunger, s.hunger, 'low')}${meter(t().nerves, s.nerves, 'low')}${meter(t().focus, s.focus, 'high')}</div>`
    + `<p class="risk ${P.risk}">${esc(t().risk[P.risk])}</p>${reasons.length ? `<ul class="facts">${reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}`;
}
function riskReasons(P, cls) {
  const S = t().sum, out = [], ex = P.ex;
  for (const x of ex.per) if (x.gap >= 1 && !out.some((o) => o.includes(moveName(x.id)))) out.push(S.tooHard(moveName(x.id), MOVES[x.id].d, cls.exp));
  if (ex.per.some((x) => x.streak)) out.push(S.streak);
  if (ex.bored > 0) out.push(S.bored(num(P.info.avgDiff), cls.exp));
  if (ex.long) out.push(S.longRep(P.dance.mostRepeated));
  if (ex.shoe > 1) out.push(S.pointes);
  if (P.state.energy < 55) out.push(`${t().energy} ${P.state.energy}`);
  if (P.state.hunger > 50) out.push(`${t().hunger} ${P.state.hunger}`);
  if (P.state.nerves > 50) out.push(`${t().nerves} ${P.state.nerves}`);
  if (P.state.focus < 55) out.push(`${t().focus} ${P.state.focus}`);
  return out.slice(0, 6);
}
// the stage seen from above: the audience at the bottom, metres from the middle along the front, metres back up the side
function stagePlanSvg(id, np, cls, st, info, pathMoves) {
  const Wd = st.halfW, D = st.depth, F = G.editB && np.B ? np.B : np.A, col = np.costume.color === '#ffffff' ? '#e8e2f5' : np.costume.color;
  let s = `<svg class="stageplan" id="plan" viewBox="${-Wd - 0.9} -0.5 ${2 * Wd + 1.8} ${D + 1.7}" role="img" aria-label="stage">`;
  s += `<rect x="${-Wd - 0.9}" y="-0.5" width="0.9" height="${D + 0.5}" fill="#1b1720"/><rect x="${Wd}" y="-0.5" width="0.9" height="${D + 0.5}" fill="#1b1720"/>`;
  s += `<rect x="${-Wd}" y="0" width="${2 * Wd}" height="${D}" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="0.04"/>`;
  for (let x = -Wd; x <= Wd + 1e-9; x += 0.5) for (let z = 0; z <= D + 1e-9; z += 0.5) s += `<circle cx="${x}" cy="${D - z}" r="${Number.isInteger(x) && Number.isInteger(z) ? 0.05 : 0.03}" fill="rgba(255,255,255,${Number.isInteger(x) && Number.isInteger(z) ? 0.5 : 0.28})"/>`;
  for (let x = Math.ceil(-Wd); x <= Wd; x++) s += `<text class="lbl" x="${x}" y="${D + 0.32}">${Math.abs(x)}</text>`;
  for (let z = 1; z <= D; z++) s += `<text class="lbl" x="${-Wd - 0.45}" y="${D - z}">${z}</text>`;
  s += `<text x="0" y="${D + 0.85}" class="aud">▼ ${esc(t().audience)} ▼</text>`;
  // the selected dancer's arms and her path through one phrase
  const sel = G.pickDancer;
  if (sel !== null && F[sel]) {
    const p = F[sel], r = cls.span / 2;
    let path = `${p.x},${D - p.z}`, x = p.x, z = p.z, cur = F, other = cur === np.A ? (np.B || np.A) : np.A;
    pathMoves.forEach((mid) => { const m = MOVES[mid]; if (m.swap && np.B) { x += other[sel].x - cur[sel].x; z += other[sel].z - cur[sel].z; [cur, other] = [other, cur]; } x += m.dx || 0; z += m.dz || 0; path += ` ${x},${D - z}`; });
    s += `<polyline points="${path}" fill="none" stroke="#7cc6ff" stroke-width="0.05" stroke-dasharray="0.15 0.1"/>`;
    s += `<circle cx="${p.x}" cy="${D - p.z}" r="${r}" fill="rgba(245,185,66,.12)" stroke="#f5b942" stroke-width="0.04" stroke-dasharray="0.12 0.08"/>`;
    s += `<line x1="${p.x - r}" y1="${D - p.z}" x2="${p.x + r}" y2="${D - p.z}" stroke="#f5b942" stroke-width="0.07"/><circle cx="${p.x - r}" cy="${D - p.z}" r="0.08" fill="#f5b942"/><circle cx="${p.x + r}" cy="${D - p.z}" r="0.08" fill="#f5b942"/>`;
    s += `<text class="lbl gold" x="${p.x}" y="${D - p.z - r - 0.14}">${esc(t().arms)}</text>`;
  }
  s += F.map((p, i) => `<g data-dot="${i}" style="cursor:grab"><circle cx="${p.x}" cy="${D - p.z}" r="0.3" fill="${col}" stroke="${sel === i ? '#f5b942' : '#fff'}" stroke-width="${sel === i ? 0.09 : 0.05}"/><text x="${p.x}" y="${D - p.z}">${i + 1}</text></g>`).join('');
  if (G.ruler) {
    const R = G.ruler, L = 3; let ticks = '';
    for (let k = 0; k <= 30; k++) { const big = k % 5 === 0; ticks += `<line x1="${k / 10}" y1="0" x2="${k / 10}" y2="${big ? 0.2 : k % 5 ? 0.09 : 0.14}" stroke="#2b2236" stroke-width="${big ? 0.025 : 0.015}"/>`; if (big) ticks += `<text class="rl" x="${k / 10}" y="0.3">${num(k / 10)}</text>`; }
    s += `<g id="ruler" transform="translate(${R.x} ${D - R.z}) rotate(${-R.a})"><rect x="-0.08" y="-0.02" width="${L + 0.16}" height="0.42" rx="0.03" fill="#ffe7a8" stroke="#2b2236" stroke-width="0.02" style="cursor:move"/>${ticks}<circle id="rulerTurn" cx="${L + 0.25}" cy="0.2" r="0.16" fill="#f5b942" stroke="#2b2236" stroke-width="0.02" style="cursor:alias"/></g>`;
  }
  return s + '</svg>';
}
function bindStagePlan(root, id, np, cls, st, info) {
  const svg = root.querySelector('#plan'), D = st.depth, Wd = st.halfW; let drag = null, moved = false, rDrag = null;
  const toPlan = (e) => { const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const q = pt.matrixTransform(svg.getScreenCTM().inverse()); return { x: q.x, z: D - q.y }; };
  const F = () => (G.editB && np.B ? np.B : np.A);
  for (const g of svg.querySelectorAll('[data-dot]')) g.addEventListener('pointerdown', (e) => { drag = +g.dataset.dot; moved = false; svg.setPointerCapture(e.pointerId); e.preventDefault(); e.stopPropagation(); });
  const ruler = svg.querySelector('#ruler');
  if (ruler) {
    ruler.querySelector('rect').addEventListener('pointerdown', (e) => { const q = toPlan(e); rDrag = { kind: 'move', dx: q.x - G.ruler.x, dz: q.z - G.ruler.z }; svg.setPointerCapture(e.pointerId); e.preventDefault(); e.stopPropagation(); });
    ruler.querySelector('#rulerTurn').addEventListener('pointerdown', (e) => { rDrag = { kind: 'turn' }; svg.setPointerCapture(e.pointerId); e.preventDefault(); e.stopPropagation(); });
  }
  svg.addEventListener('pointermove', (e) => {
    const q = toPlan(e);
    if (rDrag) {
      if (rDrag.kind === 'move') { G.ruler.x = q.x - rDrag.dx; G.ruler.z = q.z - rDrag.dz; }
      else G.ruler.a = Math.round(Math.atan2(q.z - G.ruler.z, q.x - G.ruler.x) * 180 / Math.PI / 5) * 5;
      ruler.setAttribute('transform', `translate(${G.ruler.x} ${D - G.ruler.z}) rotate(${-G.ruler.a})`); return;
    }
    if (drag === null) return; moved = true;
    const g = svg.querySelector(`[data-dot="${drag}"]`); g.querySelector('circle').setAttribute('cx', q.x); g.querySelector('circle').setAttribute('cy', D - q.z); g.querySelector('text').setAttribute('x', q.x); g.querySelector('text').setAttribute('y', D - q.z);
  });
  const drop = (e) => {
    if (rDrag) { rDrag = null; return; }
    if (drag === null) return; const i = drag; drag = null;
    if (moved) { const q = toPlan(e); F()[i] = { x: clamp(Math.round(q.x * 2) / 2, -Wd - 0.5, Wd + 0.5), z: clamp(Math.round(q.z * 2) / 2, 0, D) }; }
    G.pickDancer = i; changed();
  };
  svg.addEventListener('pointerup', drop); svg.addEventListener('pointercancel', () => { drag = null; rDrag = null; paintFormation(); });
}

/* ---------------- the goûter ---------------- */
function paintGouter() {
  const P = G.S.plan, sc = G.S.school, cl = rules().classes;
  let h = `<h2>${esc(t().gouterH)}</h2><h3>${esc(t().snackH)}</h3><p class="hint">${esc(t().snackHint)}</p><div class="cat">`;
  for (const [id, s] of Object.entries(SNACKS)) { const own = isOwned(sc, 'snack', id); h += `<button type="button" data-snack="${id}" aria-pressed="${P.snack === id}" class="${own ? '' : 'locked'}"><span>${s.icon}</span>${esc(nm(s))}<small>${esc(own ? t().snackFx[id] : t().buy(s.price))}</small></button>`; }
  h += `</div><h3>${esc(t().vGouter)}</h3>${facts([...t().gouterFacts, ...(sc.owned['food:crepes'] ? [t().crepeFact] : []), ...(sc.owned['food:compotes'] ? [t().compoteFact] : [])])}`;
  h += `<table class="kc"><tr>${t().kTable.map((x) => `<th>${esc(x)}</th>`).join('')}</tr>${cl.map((c) => `<tr><td>${esc(clsName(c))} <span class="muted">(${CLS[c].age})</span></td><td>${CLS[c].n}</td><td>${CLS[c].kcal} kcal</td><td>${CLS[c].juice} cl</td></tr>`).join('')}</table>`;
  h += stepper('cake', t().cake, `${P.cakeG} g`) + stepper('bottles', t().bottles, String(P.bottles));
  if (sc.owned['food:crepes']) h += stepper('crepes', t().crepes, String(P.crepes || 0));
  if (sc.owned['food:compotes']) h += stepper('compotes', t().compotes, String(P.compotes || 0));
  h += `<p class="hint">${esc(t().gouterHint)}</p>`;
  sbody.innerHTML = h;
  bindSteppers((id, d) => {
    if (id === 'cake') P.cakeG = clamp(P.cakeG + d * 50, 0, 8000); if (id === 'bottles') P.bottles = clamp(P.bottles + d, 0, 20);
    if (id === 'crepes') P.crepes = clamp((P.crepes || 0) + d, 0, 60); if (id === 'compotes') P.compotes = clamp((P.compotes || 0) + d, 0, 60);
    W.showTable(1, P.bottles, P.crepes);
  });
  for (const b of sbody.querySelectorAll('[data-snack]')) b.onclick = () => { const id = b.dataset.snack, s = SNACKS[id]; if (!isOwned(sc, 'snack', id)) { if (!buy('snack', id, s.price, nm(s))) return; } P.snack = id; changed(); };
}

/* ---------------- the costumes ---------------- */
function paintCostumes() {
  if (!activeNums().includes(G.pickNum)) G.pickNum = activeNums()[0];
  const id = G.pickNum, N = NUMBERS[id], cos = G.S.plan.numbers[id].costume, sc = G.S.school, cls = CLS[N.cls];
  const opt = (kind, list, cur, key, extra = () => '') => `<div class="cat">${Object.entries(list).filter(([, x]) => !x.season || x.season <= G.S.season).map(([k, x]) => {
    const own = isOwned(sc, kind, k), suits = (x.themes || []).includes(N.theme);
    return `<button type="button" data-cos="${key}" data-v="${k}" data-kind="${kind}" aria-pressed="${cur === k}" class="${own ? '' : 'locked'}">${x.icon ? `<span>${x.icon}</span>` : ''}${esc(nm(x))}<small>${own ? extra(x) : esc(t().buy(x.price))}${suits ? ' ✨' : ''}</small></button>`;
  }).join('')}</div>`;
  let h = `<h2>${esc(t().costH)}</h2><p class="hint">${esc(t().costHint)}</p>${numChips()}`;
  h += `<h3>${esc(t().outfit)}</h3>${opt('outfit', OUTFITS, cos.outfit, 'outfit', (x) => t().putOn(x.min))}`;
  h += `<h3>${esc(t().colour)}</h3><div class="swatches">${COLORS.map((c) => `<button type="button" data-col="${c}" aria-pressed="${cos.color === c}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div>`;
  h += `<h3>${esc(t().shoes)}</h3>${opt('shoes', SHOES, cos.shoes, 'shoes')}${SHOES[cos.shoes].expMin && cls.exp < SHOES[cos.shoes].expMin ? `<p class="hint warn">${esc(t().pointesWarn)}</p>` : ''}`;
  h += `<h3>${esc(t().acc)}</h3>${opt('acc', ACCS, cos.acc, 'acc')}<p class="hint small">✨ = ${esc(t().suits)}</p>`;
  h += `<h3>${esc(t().hairH)}</h3>`;
  for (const c of rules().classes) h += `<p class="sub">${dot(c)} ${esc(clsName(c))}</p><div class="chips">${Object.entries(HAIRS).map(([k, x]) => { const own = isOwned(sc, 'hair', k); return `<button type="button" data-hair="${c}" data-v="${k}" aria-pressed="${G.S.plan.hair[c] === k}" class="${own ? '' : 'locked'}">${esc(nm(x))} <small>${own ? `⏱ ${x.min} min` : esc(t().buy(x.price))}</small></button>`; }).join('')}</div>`;
  sbody.innerHTML = h;
  bindNumChips(paintCostumes);
  for (const b of sbody.querySelectorAll('[data-cos]')) b.onclick = () => {
    const kind = b.dataset.kind, k = b.dataset.v, list = { outfit: OUTFITS, shoes: SHOES, acc: ACCS }[kind];
    if (!isOwned(sc, kind, k) && !buy(kind, k, list[k].price, nm(list[k]))) return;
    cos[b.dataset.cos] = k; afterCostume(N.cls);
  };
  for (const b of sbody.querySelectorAll('[data-col]')) b.onclick = () => { cos.color = b.dataset.col; afterCostume(N.cls); };
  for (const b of sbody.querySelectorAll('[data-hair]')) b.onclick = () => { const k = b.dataset.v; if (!isOwned(sc, 'hair', k) && !buy('hair', k, HAIRS[k].price, nm(HAIRS[k]))) return; G.S.plan.hair[b.dataset.hair] = k; afterCostume(b.dataset.hair); };
}
function afterCostume(cls) { for (const d of dancers) if (d.cls === cls) d.lookKey = ''; changed(); }

/* ---------------- the dressing room ---------------- */
function paintBuild() {
  const sc = G.S.school, total = rules().classes.reduce((s, c) => s + CLS[c].n, 0), L = analyseLoge(sc, total), F = t().fx;
  let h = `<h3>${esc(t().schoolName)}</h3><input type="text" id="nameIn" maxlength="40" value="${esc(sc.name)}" placeholder="${esc(t().school)}">`;
  h += `<h2>${esc(t().buildH)}</h2>`;
  const lines = [L.postesRaw ? F.postes(L.postesRaw) : F.postesNone, F.rail(L.rail, L.railCap, total), F.seats(L.seats, total)];
  if (L.calm) lines.push(F.calm(L.calm));
  for (const k of ['water', 'fruit', 'fan', 'shoes', 'screen', 'sieste', 'doudous', 'barre', 'clock', 'music']) if (L[k]) lines.push(F[k]);
  if (L.clutter) lines.push(F.clutter);
  h += `<div class="fxbox"><b>${esc(t().fxH)}</b>${lines.map((x) => `<div>${esc(x)}</div>`).join('')}</div>`;
  for (const f of L.invalid) h += `<p class="hint warn">⚠️ ${esc(t().wallWarn(nm(PIECES[f.id])))}</p>`;
  if (G.pickedRoom !== 'dr') h += `<p class="hint">${esc(t().buildHint)}</p><button type="button" class="small" id="goDr">${esc(t().goLoge)}</button>`;
  else {
    h += `<p class="hint">${esc(t().buildHint)}</p>`;
    if (G.armed) h += `<div class="chips"><button type="button" id="rotArm">${esc(t().rotateKey)}</button><button type="button" id="cancelArm">${esc(t().cancel)}</button></div>`;
    if (G.selected) h += `<div class="chips"><button type="button" id="rotSel">${esc(t().rotate)}</button><button type="button" id="movSel">${esc(t().move)}</button><button type="button" id="delSel">${esc(t().remove)} · ${esc(nm(PIECES[G.selected.id]))}</button></div>`;
    h += `<div class="cat">${Object.entries(PIECES).map(([id, p]) => {
      const own = isOwned(sc, 'piece', id), tags = Object.entries(p.fx).map(([k, v]) => t().fxTag[k](v)).join(' · ') + (p.wall ? ` · ${t().wallTag}` : '');
      return `<button type="button" data-piece="${id}" aria-pressed="${G.armed && G.armed.id === id}" class="${own ? '' : 'locked'}"><span>${p.icon}</span>${esc(nm(p))}<small>${esc(own ? tags : `${t().buy(p.price)} · ${tags}`)}</small></button>`;
    }).join('')}</div>`;
  }
  sbody.innerHTML = h;
  const ni = sbody.querySelector('#nameIn'); ni.oninput = () => { sc.name = ni.value.slice(0, 40); save(); W.drawSign(schoolName()); hud(); };
  const gd = sbody.querySelector('#goDr'); if (gd) gd.onclick = () => pickRoom('dr');
  for (const b of sbody.querySelectorAll('[data-piece]')) b.onclick = () => {
    const id = b.dataset.piece; if (!isOwned(sc, 'piece', id) && !buy('piece', id, PIECES[id].price, nm(PIECES[id]))) return;
    G.armed = G.armed && G.armed.id === id ? null : { id, rot: PIECES[id].wall ? 0 : 0 }; G.selected = null; W.setGhost(null); W.showFurniture(); paintBuild();
  };
  const ra = sbody.querySelector('#rotArm'); if (ra) ra.onclick = rotateArmed;
  const ca = sbody.querySelector('#cancelArm'); if (ca) ca.onclick = cancelArmed;
  const rs = sbody.querySelector('#rotSel'); if (rs) rs.onclick = rotateSelected;
  const ms = sbody.querySelector('#movSel'); if (ms) ms.onclick = moveSelected;
  const ds = sbody.querySelector('#delSel'); if (ds) ds.onclick = removeSelected;
}
export function rotateArmed() { if (!G.armed) return; G.armed.rot = (G.armed.rot + 1) % 4; if (W.ghost.f) { const f = { ...W.ghost.f, rot: G.armed.rot }; showGhost(f); } }
export function rotateSelected() {
  const f = G.selected; if (!f) return; const old = { c: f.c, r: f.r, rot: f.rot }, cols = G.S.school.logeCols;
  f.rot = (f.rot + 1) % 4;
  if (!fits(f, G.S.school.furniture, cols, f)) { const fp = footprint(f); f.c = clamp(f.c, 0, cols - fp.w); f.r = clamp(f.r, 0, LOGE.rows - fp.d); if (!fits(f, G.S.school.furniture, cols, f)) Object.assign(f, old); }
  changed();
}
export function moveSelected() { const f = G.selected; if (!f) return; G.S.school.furniture = G.S.school.furniture.filter((x) => x !== f); G.armed = { id: f.id, rot: f.rot, was: f }; G.selected = null; W.showFurniture(); paintBuild(); }
export function removeSelected() { G.S.school.furniture = G.S.school.furniture.filter((x) => x !== G.selected); G.selected = null; changed(); }
function cancelArmed() { if (G.armed && G.armed.was) G.S.school.furniture.push(G.armed.was); G.armed = null; W.setGhost(null); changed(); }
function showGhost(f) { const cols = G.S.school.logeCols, ok = fits(f, G.S.school.furniture, cols); W.setGhost(f, !ok ? 'bad' : PIECES[f.id].wall && !againstWall(f, cols) ? 'warn' : 'ok'); }
export function hoverAt(x, y) {
  if (!G.armed || G.pickedRoom !== 'dr' || G.run) return;
  const tl = W.tileAt(W.groundAt(x, y)); if (!tl) { W.setGhost(null); return; }
  const cols = G.S.school.logeCols, fp = footprint({ id: G.armed.id, rot: G.armed.rot });
  const f = { id: G.armed.id, rot: G.armed.rot, c: clamp(tl.c - Math.floor((fp.w - 1) / 2), 0, cols - fp.w), r: clamp(tl.r - Math.floor((fp.d - 1) / 2), 0, LOGE.rows - fp.d) };
  const g = W.ghost.f; if (!g || g.c !== f.c || g.r !== f.r || g.rot !== f.rot || g.id !== f.id) showGhost(f);
}
export function tapAt(x, y) {
  if (G.run) return;
  if (G.tab === 'build' && G.pickedRoom === 'dr') {
    if (G.armed) { hoverAt(x, y); const g = W.ghost.f; if (g && fits(g, G.S.school.furniture, G.S.school.logeCols)) { const f = { id: g.id, c: g.c, r: g.r, rot: g.rot }; G.S.school.furniture.push(f); G.selected = f; if (G.armed.was) G.armed = null; W.setGhost(null); W.showFurniture(); changed(); hoverAt(x, y); } return; }
    const f = W.pieceAt(x, y); if (f) { G.selected = f; W.showFurniture(); paintBuild(); return; }
    if (G.selected) { G.selected = null; W.showFurniture(); paintBuild(); }
  }
  const g = W.groundAt(x, y); if (!g) return; const r = W.roomAt(g.x, g.z);
  const inside = g.x > -15 && g.x < W.ROOMS.dr.x1 && g.z > -9 && g.z < 7;
  if (!inside) { if (G.pickedRoom) pickRoom(null); return; }
  const room = r === 'wing' || r === 'stage' ? 'hall' : r; if (room !== G.pickedRoom) pickRoom(room);
}
// the little toolbar over a selected piece
export function placeFloat() {
  const f = G.selected;
  if (!f || G.run || G.tab !== 'build' || G.screen !== 'prep') { floatEl.hidden = true; return; }
  const fp = footprint(f), p = W.project(W.ROOMS.dr.x0 + f.c + fp.w / 2, 1.6, W.ROOMS.dr.z0 + f.r + fp.d / 2);
  if (p.behind) { floatEl.hidden = true; return; }
  if (floatEl.hidden || floatEl.dataset.for !== JSON.stringify(f)) {
    floatEl.innerHTML = `<button type="button" data-fl="rot" title="${esc(t().rotate)}">↻</button><button type="button" data-fl="mov" title="${esc(t().move)}">✥</button><button type="button" data-fl="del" title="${esc(t().remove)}">✕</button>`;
    floatEl.querySelector('[data-fl=rot]').onclick = rotateSelected; floatEl.querySelector('[data-fl=mov]').onclick = moveSelected; floatEl.querySelector('[data-fl=del]').onclick = removeSelected;
    floatEl.dataset.for = JSON.stringify(f); floatEl.hidden = false;
  }
  floatEl.style.transform = `translate(${Math.round(p.x - floatEl.offsetWidth / 2)}px, ${Math.round(p.y - floatEl.offsetHeight - 8)}px)`;
}

/* ---------------- the car park ---------------- */
function paintParking() {
  const P = G.S.plan, sc = G.S.school, res = forecast(), pk = res.parking;
  let h = `<h2>${esc(t().parkH)}</h2><p class="hint">${esc(t().parkHint)}</p>${facts(t().parkFacts(pk))}`;
  h += `<h3>${esc(t().bayWidth)}</h3><div class="chips">${PARKING.widths.map((w) => `<button type="button" data-w="${w}" aria-pressed="${P.parking.width === w}">${num(w)} m</button>`).join('')}</div>${P.parking.width < 2.5 ? `<p class="hint warn">${esc(t().narrowWarn)}</p>` : ''}`;
  h += `<h3>${esc(t().doors)}</h3><div class="chips">${PARKING.doorsOptions.map((m) => `<button type="button" data-door="${m}" aria-pressed="${P.parking.doors === m}">${esc(t().doorsVal(m))}</button>`).join('')}</div>`;
  h += `<h3>${esc(t().parkUpgrades)}</h3><div class="cat">${['placeur', 'covoit', 'navette', 'rangee'].map((k) => { const u = UPGRADES[k], own = !!sc.upgrades[k]; return `<button type="button" data-pu="${k}" class="${own ? '' : 'locked'}" aria-pressed="${own}"><span>${u.icon}</span>${esc(nm(u))}<small>${esc(own ? t().owned : t().buy(u.price))}</small></button>`; }).join('')}</div>`;
  sbody.innerHTML = h;
  for (const b of sbody.querySelectorAll('[data-w]')) b.onclick = () => { P.parking.width = +b.dataset.w; changed({ world: true }); };
  for (const b of sbody.querySelectorAll('[data-door]')) b.onclick = () => { P.parking.doors = +b.dataset.door; changed(); };
  for (const b of sbody.querySelectorAll('[data-pu]')) b.onclick = () => { const k = b.dataset.pu; if (!sc.upgrades[k]) buy('up', k, UPGRADES[k].price, nm(UPGRADES[k])); };
}

/* ---------------- the shop ---------------- */
let shopCat = 'hall';
function paintShop() {
  const sc = G.S.school, cats = ['hall', ...(rules().parking ? ['park'] : []), 'loge', 'outfit', 'hair', 'shoes', 'acc', 'food'];
  if (!cats.includes(shopCat)) shopCat = 'hall';
  let h = `<h2>${esc(t().shopH)} · ${esc(t().stars(sc.stars))}</h2><p class="hint">${esc(t().shopHint)}</p><div class="chips">${cats.map((c) => `<button type="button" data-cat="${c}" aria-pressed="${shopCat === c}">${esc(t().cats[c])}</button>`).join('')}</div><div class="shop">`;
  const row = (kind, id, icon, name, price, own, note = '') => `<div class="item${own ? ' own' : ''}"><span class="ic">${icon || '✨'}</span><span class="nm">${esc(name)}${note ? `<small>${esc(note)}</small>` : ''}</span>${own ? `<span class="ok">${esc(own === 'max' ? t().maxed : t().owned)}</span>` : `<button type="button" data-buy="${kind}|${id}"${sc.stars < price ? ' class="poor"' : ''}>${esc(t().buy(price))}</button>`}</div>`;
  if (shopCat === 'hall' || shopCat === 'park') {
    for (const [k, u] of Object.entries(UPGRADES)) {
      const isPark = ['placeur', 'covoit', 'navette', 'rangee'].includes(k); if ((shopCat === 'park') !== isPark) continue;
      if (u.season && u.season > G.S.season) continue;
      const n = sc.upgrades[k], own = u.max ? (n >= u.max ? 'max' : false) : !!n;
      h += row('up', k, u.icon, nm(u) + (u.max && n ? ` (${n}/${u.max})` : ''), u.price, own);
    }
  }
  if (shopCat === 'loge') for (const [k, p] of Object.entries(PIECES)) if (p.price) h += row('piece', k, p.icon, nm(p), p.price, isOwned(sc, 'piece', k), Object.entries(p.fx).map(([fk, v]) => t().fxTag[fk](v)).join(' · '));
  if (shopCat === 'outfit') for (const [k, o] of Object.entries(OUTFITS)) if (o.price) h += row('outfit', k, o.icon, nm(o), o.price, isOwned(sc, 'outfit', k), t().putOn(o.min));
  if (shopCat === 'hair') for (const [k, o] of Object.entries(HAIRS)) if (o.price) h += row('hair', k, '💇', nm(o), o.price, isOwned(sc, 'hair', k), `⏱ ${o.min} min`);
  if (shopCat === 'shoes') for (const [k, o] of Object.entries(SHOES)) if (o.price && (!o.season || o.season <= G.S.season)) h += row('shoes', k, '🩰', nm(o), o.price, isOwned(sc, 'shoes', k));
  if (shopCat === 'acc') for (const [k, o] of Object.entries(ACCS)) if (o.price) h += row('acc', k, '🎀', nm(o), o.price, isOwned(sc, 'acc', k));
  if (shopCat === 'food') { for (const [k, s] of Object.entries(SNACKS)) if (s.price) h += row('snack', k, s.icon, nm(s), s.price, isOwned(sc, 'snack', k)); for (const k of ['crepes', 'compotes']) h += row('food', k, k === 'crepes' ? '🥞' : '🍏', t().foods[k], priceOf('food', k), !!sc.owned[`food:${k}`]); }
  h += '</div>';
  if (shopCat === 'hall') h += `<h3>${esc(t().backdropH)}</h3><div class="chips">${Object.entries(BACKDROPS).filter(([, b]) => !b.need || sc.upgrades[b.need]).map(([k, b]) => `<button type="button" data-bd="${k}" aria-pressed="${G.S.plan.backdrop === k}">${b.icon}</button>`).join('')}</div>`;
  sbody.innerHTML = h;
  for (const b of sbody.querySelectorAll('[data-cat]')) b.onclick = () => { shopCat = b.dataset.cat; paintShop(); };
  for (const b of sbody.querySelectorAll('[data-buy]')) b.onclick = () => {
    const [kind, id] = b.dataset.buy.split('|'), item = kind === 'up' ? UPGRADES[id] : kind === 'food' ? { fr: TXT_food(id), en: TXT_food(id) } : { piece: PIECES, outfit: OUTFITS, hair: HAIRS, shoes: SHOES, acc: ACCS, snack: SNACKS }[kind][id];
    if (buy(kind, id, priceOf(kind, id), nm(item)) && kind === 'up' && id.startsWith('decor')) { G.S.plan.backdrop = { decorForet: 'foret', decorMer: 'mer', decorVille: 'ville' }[id]; changed({ world: true }); }
  };
  for (const b of sbody.querySelectorAll('[data-bd]')) b.onclick = () => { G.S.plan.backdrop = b.dataset.bd; changed({ world: true }); };
}
const TXT_food = (id) => t().foods[id];

/* ---------------- the notebook ---------------- */
function paintNotebook() {
  const N = G.S.notebook;
  sbody.innerHTML = `<h2>${esc(t().noteH)}</h2>` + (N.length ? N.map((n) => `<div class="verdict"><div class="vt">${esc(t().noteGala(n.season))} · ${esc(n.at)} · ${n.points} ⭐</div><p>${t().satisfaction(n.satisfaction)}</p><p class="small">${Object.entries(n.nums || {}).map(([id, p]) => `${esc(numName(id))} ${p} ⭐`).join(' · ')}</p></div>`).join('') : `<p class="hint">${esc(t().noteEmpty)}</p>`)
    + `<p style="margin-top:24px"><button type="button" class="small" id="resetBtn">${esc(t().reset)}</button></p>`;
  sbody.querySelector('#resetBtn').onclick = () => { if (confirm(t().resetAsk)) { resetAll(); G.pickNum = 'G1'; buildDancers(); refreshWorld(); idle(); paintCamBar(); showScreen('prep'); showIntro(); } };
}

/* ---------------- the run ---------------- */
export function beginRun(mode, tryId) {
  G.pickedRoom = null; G.armed = null; W.setGhost(null); G.selected = null; W.showFurniture();
  const run = startRun(mode, tryId); if (!run) return;
  wake(); lastNowStep = null;
  run.onDone = () => finishRun();
  if (mode !== 'try' && G.follow) W.cutTo('school');
  showScreen('run'); paintCamBar();
}
function finishRun() {
  const run = G.run, R = run.res;
  if (run.mode === 'gala') {
    G.S.galaDone = true; G.S.school.stars += R.points; G.S.school.earned += R.points;
    G.S.notebook.unshift({ season: G.S.season, at: new Date().toISOString().slice(0, 10), points: R.points, satisfaction: R.parents.satisfaction, nums: Object.fromEntries(Object.values(R.perf).map((p) => [p.id, p.total])) });
    save();
  }
  showScreen('results');
}
export function stopRun() { G.run = null; idle(); idleScene(); if (G.tab === 'formation') W.cutTo('stage'); showScreen('prep'); paintCamBar(); }
export function paintRunSheet(full = false) {
  const run = G.run; if (!run) return; const R = run.res;
  if (run.mode === 'try') {
    sbody.innerHTML = `<h2>${esc(t().live(run.mode))}</h2>${trySteps(run, false)}<div class="feed">${run.feed.slice().reverse().map((f) => `<div><b>${esc(clockOf(f.t, false))}</b> ${esc(f.text)}</div>`).join('')}</div>`;
    const now = sbody.querySelector('.step.now');
    if (now && now.dataset.k !== lastNowStep) { lastNowStep = now.dataset.k; now.scrollIntoView({ block: 'center' }); }
  } else {
  const items = R.order.items;
  sbody.innerHTML = `<h2>${esc(t().live(run.mode))}</h2><div class="cards">${items.map((it) => {
    const st = run.t >= it.end ? ' done' : run.t >= it.start - it.wait ? ' now' : '';
    return `<div class="card locked${st}">${dot(it.kind === 'number' ? NUMBERS[it.id].cls : null)}<span class="nm">${esc(itemName(it.id))}</span><span class="tm">${run.t >= it.start ? esc(clockOf(it.start, false)) : ''}</span></div>`;
  }).join('')}</div><div class="feed">${run.feed.slice().reverse().map((f) => `<div><b>${esc(clockOf(f.t, false))}</b> ${esc(f.text)}</div>`).join('')}</div>`;
  }
  if (!full) return;
  goEl.innerHTML = `<button type="button" class="reh" id="spdBtn">⏩ ${esc(t().speed)} ×${G.speed}</button>`
    + (run.mode !== 'try' ? `<button type="button" class="reh" id="folBtn" aria-pressed="${G.follow}">${esc(t().follow)} ${G.follow ? '✓' : ''}</button>` : '')
    + `<button type="button" class="reh" id="skipNumBtn">${esc(t().skipNum)}</button>`
    + (run.mode !== 'gala' ? `<button type="button" class="reh" id="stopBtn">${esc(t().stop)}</button>` : '')
    + `<button type="button" class="reh wide" id="skipBtn">${esc(t().skip)}</button>`;
  goEl.querySelector('#spdBtn').onclick = () => { G.speed = G.speed >= 8 ? 1 : G.speed * 2; paintRunSheet(true); };
  const fb = goEl.querySelector('#folBtn'); if (fb) fb.onclick = () => { G.follow = !G.follow; if (G.run) G.run.auto = ''; paintRunSheet(true); };
  goEl.querySelector('#skipNumBtn').onclick = () => skipNumber();
  const sb = goEl.querySelector('#stopBtn'); if (sb) sb.onclick = stopRun;
  goEl.querySelector('#skipBtn').onclick = () => fastForward(run.endT - run.t + 1);
}

/* ---------------- the verdicts ---------------- */
export function sayText(say, R) {
  const [k, ...a] = say, S = t().say, plan = R.plan;
  switch (k) {
    case 'wait': return S.wait(clsName(a[0]), durOf(a[1]));
    case 'floorSwap': return S.floorSwap(durOf(a[0]), a[1]);
    case 'startLate': return S.startLate(durOf(a[0]), clockOf(a[1]));
    case 'yawn': return S.yawn(numName(a[0]));
    case 'late': return S.late(durOf(a[0]));
    case 'onTime': return S.onTime(clockOf(a[0]));
    case 'collide': return S.collide(dancerName(a[0], a[1]), dancerName(a[0], a[2]));
    case 'offstage': return S.offstage(dancerName(a[0], a[1]));
    case 'hidden': return S.hidden(dancerName(a[0], a[1]), dancerName(a[0], a[2]));
    case 'bump': return S.bump(dancerName(a[0], a[1]), dancerName(a[0], a[2]));
    case 'jolt': return S.jolt(moveName(a[0]), moveName(a[1]));
    case 'trip': return S.trip(dancerName(a[0], a[1]), moveName(a[2]));
    case 'forget': return S.forget(dancerName(a[0], a[1]));
    case 'ankle': return S.ankle(dancerName(a[0], a[1]), moveName(a[2]));
    case 'musicLong': return S.musicLong(numName(a[0]), a[1]);
    case 'musicShort': return S.musicShort(numName(a[0]), durOf(a[1]));
    case 'applause': return S.applause(numName(a[0]), a[1]);
    case 'cakeOut': return S.cakeOut(clsName(a[0]));
    case 'juiceOut': return S.juiceOut(clsName(a[0]));
    default: return S[k] ? S[k](...a) : k;
  }
}
const L = (a, b = '', cls = '') => `<div class="${cls}"><span>${a}</span>${b !== '' ? `<span>${b}</span>` : ''}</div>`;
const card = (title, ok, sayList, sum, badge = '') => `<div class="verdict${ok ? '' : ' fix'}"><div class="vt">${ok ? '🌟' : '🔧'} ${esc(title)} · ${esc(ok ? t().perfect : t().fix)}${badge ? ` <span class="badge">${badge}</span>` : ''}</div>${sayList.map((s) => `<p>${esc(s)}</p>`).join('')}${sum ? `<details><summary>${esc(t().why)}</summary><div class="sum">${sum}</div></details>` : ''}</div>`;
export function verdictCards(R) {
  const S = t().sum, P = R.plan, O = R.order, G2 = R.gouter, SY = t().say;
  let out = '';
  // the programme
  let os = L(esc(S.start), esc(clockOf(P.start)));
  os += L(esc(S.hair(O.hairTotal, R.loge.postes, O.hairMin)));
  if (O.startLate) os += L(esc(S.realStart), esc(clockOf(O.start)), 'tot');
  for (const it of O.items) {
    if (it.co) os += L(`+ ${esc(durOf(it.co))} · ${esc(S.setChange)}`);
    if (it.fl) os += L(`+ ${esc(durOf(it.fl))} · ${esc(S.floor(it.floor))}`);
    if (it.change) { os += L(`<i>${esc(S.change(clsName(NUMBERS[it.id].cls), it.change.min))} ${it.change.lines.map(([k, m, o]) => esc(k === 'outfit' ? S.chLines.outfit(nm(OUTFITS[o]), m) : S.chLines[k](m))).join(' · ')}</i>`); }
    if (it.wait) os += L(`+ ${esc(durOf(it.wait))} · ${esc(S.waitCos)}`);
    os += L(`+ ${esc(durOf(it.dur))} · ${esc(itemName(it.id))}`, esc(clockOf(it.end)));
  }
  os += L(`${esc(S.end)} : ${esc(clockOf(O.end))} ${O.end <= RULES.hallCloses ? '≤' : '>'} ${esc(clockOf(RULES.hallCloses))}`, '', 'tot');
  if (O.lastEnd.petits !== undefined) os += L(`${esc(S.petitsEnd)} ${esc(clockOf(O.lastEnd.petits))} ${O.lastEnd.petits <= RULES.bedtime ? '≤' : '>'} ${esc(clockOf(RULES.bedtime))}`, '', 'tot');
  for (const y of O.yawns) os += L(esc(S.yawn(numName(y.id))));
  const oSay = [O.late ? SY.late(durOf(O.late)) : SY.onTime(clockOf(O.end)), ...(O.startLate ? [SY.startLate(durOf(O.startLate))] : []), ...O.waits.map((w) => SY.wait(clsName(NUMBERS[w.id].cls), durOf(w.wait))), O.sleepy ? SY.sleepy() : '', ...O.yawns.slice(0, 1).map((y) => SY.yawn(numName(y.id)))].filter(Boolean);
  out += card(t().vOrder, O.ok, oSay, os);
  // each number
  for (const it of O.items.filter((i) => i.kind === 'number')) {
    const p = R.perf[it.id], N = NUMBERS[it.id], cls = CLS[N.cls], sp = p.spacing, m = p.music, np = P.numbers[it.id], nmOf = (i) => `${dancerName(N.cls, i)} (${i + 1})`, mm = (x) => `${num(x)} m`;
    let s = L(`${esc(t().numParts.placement)} ${p.pts.placement}/3 · ${esc(t().numParts.music)} ${p.pts.music}/2 · ${esc(t().numParts.harmony)} ${p.pts.harmony}/3 · ${esc(t().numParts.execution)} ${p.pts.execution}/4 · ${esc(t().numParts.wow)} ${p.pts.wow}/5`, '', 'tot');
    sp.collide.slice(0, 3).forEach((c) => (s += L(esc(S.span(nmOf(c.i), nmOf(c.j), mm(c.d), mm(cls.span))))));
    sp.offstage.slice(0, 2).forEach((o) => (s += L(esc(Math.abs(o.x) > stageOf(G.S.school).halfW ? S.off(nmOf(o.i), num(Math.abs(o.x)), num(stageOf(G.S.school).halfW)) : S.offZ(nmOf(o.i))))));
    if (sp.offstage.length && (p.info.net.dx || p.info.net.dz)) s += L(esc(S.drift(num(p.info.net.dx), num(p.info.net.dz))));
    sp.hidden.slice(0, 2).forEach((h) => (s += L(esc(S.behind(nmOf(h.b), nmOf(h.f), mm(h.dx))))));
    sp.bump.slice(0, 2).forEach((b) => (s += L(esc(S.bump(nmOf(b.i), nmOf(b.j))))));
    if (sp.ok) s += L(esc(S.spanOk(mm(cls.span))));
    s += L(esc(S.counts(durOf(m.dur), m.bpm, m.counts))) + L(esc(S.chainSum(chainSum(m.parts), m.have, m.counts)), '', 'tot');
    p.info.links.filter((l) => l.gap === 2).forEach((l) => (s += L(esc(S.link(moveName(l.from), moveName(l.to))))));
    p.info.links.filter((l) => l.off).slice(0, 2).forEach((l) => (s += L(esc(S.linkOff(moveName(l.to))))));
    s += L(esc(S.harmony(p.pts.harmony)));
    s += L(esc(S.state(p.state)));
    for (const r of riskReasons(p, cls)) s += L(`· ${esc(r)}`);
    s += L(esc(R.mode !== 'rehearsal' ? S.slips(p.slips.length) : S.expected(num(p.ex.expected, 1))), '', 'tot');
    if (p.wow.src.length) s += L(`✨ ${p.wow.src.map((w) => esc(t().wow[w])).join(' · ')}`);
    const sayL = [];
    sp.collide.slice(0, 1).forEach((c) => sayL.push(SY.collide(dancerName(N.cls, c.i), dancerName(N.cls, c.j))));
    sp.offstage.slice(0, 1).forEach((o) => sayL.push(SY.offstage(dancerName(N.cls, o.i))));
    sp.hidden.slice(0, 1).forEach((h) => sayL.push(SY.hidden(dancerName(N.cls, h.b), dancerName(N.cls, h.f))));
    sp.bump.slice(0, 1).forEach((b) => sayL.push(SY.bump(dancerName(N.cls, b.i), dancerName(N.cls, b.j))));
    if (m.diff > 0) sayL.push(SY.musicLong(numName(it.id), m.stopsIn)); if (m.diff < 0) sayL.push(SY.musicShort(numName(it.id), durOf(m.playsOn)));
    const jl = p.info.links.find((l) => l.gap === 2); if (jl) sayL.push(SY.jolt(moveName(jl.from), moveName(jl.to)));
    if (R.mode !== 'rehearsal' && p.slips.length) sayL.push(S.slips(p.slips.length));
    out += card(`${clsName(N.cls)} · ${numName(it.id)}`, sp.ok && m.ok && !jl, sayL, s, t().ptsOf(p.total, p.max));
  }
  // the goûter
  let gs = R.rules.classes.map((c) => L(esc(S.kcal(c, CLS[c].n, CLS[c].kcal)), `${CLS[c].n * CLS[c].kcal} kcal`)).join('');
  gs += L(esc(S.total(G2.needKcal)), '', 'tot');
  const parts = [`${P.cakeG} g × 4 = ${G2.offer.cake} kcal`, ...(P.crepes ? [`${P.crepes} × 150 = ${G2.offer.crepes}`] : []), ...(P.compotes ? [`${P.compotes} × 70 = ${G2.offer.compotes}`] : [])].join(' + ');
  gs += L(`${esc(S.offer(parts, G2.kcal0))} ${G2.kcal0 >= G2.needKcal ? '≥' : '<'} ${G2.needKcal}`, '', 'tot');
  gs += R.rules.classes.map((c) => L(`${CLS[c].n} × ${CLS[c].juice} cl`, `${CLS[c].n * CLS[c].juice} cl`)).join('');
  gs += L(esc(S.juice(G2.needCl, num(G2.needCl / 100, 2), P.bottles)), '', 'tot');
  out += card(t().vGouter, G2.ok, [G2.cakeOut ? SY.cakeOut(clsName(G2.cakeOut)) : '', G2.juiceOut ? SY.juiceOut(clsName(G2.juiceOut)) : '', G2.ok ? SY.gouterOk() : ''].filter(Boolean), gs);
  // the car park
  if (R.parking) {
    const pk = R.parking;
    let ps = G.S.school.upgrades.covoit ? L(esc(S.carpool(pk.families, pk.famCars))) : '';
    ps += L(esc(S.cars(pk.famCars, pk.guests, pk.cars))) + L(esc(S.bays(num(pk.width), pk.perRow, pk.rows, pk.bays))) + (pk.overflow ? L(esc(S.overflow(pk.overflow))) : '');
    ps += L(esc(pk.lateCars ? S.lateCars(pk.lateCars, pk.lateParents) : S.noLate), '', 'tot');
    out += card(t().vPark, pk.ok, [pk.lateCars ? SY.lateParents(pk.lateParents) : SY.parkOk()], ps);
  }
  // the parents
  const ps = R.parents.sat.map(([k, v]) => L(esc(t().satLines[k]), `${v > 0 ? '+' : ''}${v}`)).join('') + L(`${R.parents.audience} / ${R.parents.seats}`, '', 'tot');
  out += card(t().vParents, R.parents.satisfaction >= 70, [t().satisfaction(R.parents.satisfaction).replace(/<\/?b>/g, ''), ...quotes(R)], ps);
  return out;
}
function quotes(R) {
  const Q = t().quotes, keys = R.parents.sat.map(([k]) => k), out = [];
  for (const k of ['late', 'lateParents', 'standing', 'yawns', 'startLate', 'buvetteShort', 'longWait', 'narrow']) if (keys.includes(k)) out.push(Q[k]);
  if (R.order.sleepy) out.push(Q.sleepy);
  if (keys.includes('comfy')) out.push(Q.comfy); if (keys.includes('buvette')) out.push(Q.buvette);
  out.push(R.parents.satisfaction >= 80 ? Q.great : Q.good);
  return out.slice(0, 3);
}
function paintResults() {
  const run = G.run, R = run.res;
  if (run.mode === 'try') {
    sbody.innerHTML = `<h2>${esc(t().endTry)}</h2>` + tryCard(R, run.tryId) + trySteps(run, true);
    goEl.innerHTML = `<button type="button" class="reh wide" id="backBtn">${esc(t().back)}</button>`;
    goEl.querySelector('#backBtn').onclick = stopRun; hud(); return;
  }
  const head = run.mode === 'gala' ? `<p class="pts">${t().galaPts(R.points)}</p>` : `<p class="pts">${t().rehPts(R.points)}</p><p class="hint">${esc(t().rehNote)}</p>`;
  sbody.innerHTML = `<h2>${esc(run.mode === 'gala' ? t().endGala : t().endReh)}</h2>${head}<div class="ptslist">${R.pts.map(([k, v]) => `<span>${esc(k.startsWith('num:') ? numName(k.slice(4)) : t().ptsLines[k])} <b>${v}</b></span>`).join('')}</div>${verdictCards(R)}`;
  goEl.innerHTML = `<button type="button" class="reh wide" id="backBtn">${esc(t().back)}</button>` + (run.mode === 'gala' ? `<button type="button" class="gala wide" id="nextBtn">${esc(t().newSeason)}</button>` : '');
  goEl.querySelector('#backBtn').onclick = stopRun;
  const nb = goEl.querySelector('#nextBtn'); if (nb) nb.onclick = () => { stopRun(); nextSeason(); };
  hud();
}
// a try-out, step by step like a graph of nodes: each block of the dance, each step in it, and what happened on it
let lastNowStep = null;
function trySteps(run, all) {
  const R = run.res, id = run.tryId, P = R.perf[id], d = P.dance, info = P.info, N = NUMBERS[id], np = R.plan.numbers[id], it = run.item;
  const c = all ? Infinity : (run.t - it.start) * N.bpm / 60, S = t().step, who = (i) => esc(dancerName(N.cls, i));
  const byId = Object.fromEntries(np.blocks.map((b) => [b.id, b])), seen = P.slips.filter((x) => info.starts[x.k] < c);
  const count = (kind) => seen.filter((x) => x.kind === kind).length;
  let h = `<h3>${esc(S.head)}</h3><p class="stepsum">😵 ${count('trip')} · 🤔 ${count('forget')} · 🤕 ${count('ankle')}</p>`;
  const start = [...P.spacing.collide.map((x) => S.touch(who(x.i), who(x.j))), ...P.spacing.hidden.map((x) => S.hidden(who(x.b)))];
  if (start.length) h += `<div class="blk"><div class="bh">${esc(S.start)}</div><div class="step done bad"><span class="out">${start.slice(0, 6).join('<br>')}</span></div></div>`;
  h += '<div class="steps">';
  for (const mk of d.marks) {
    if (mk.k1 === mk.k0) continue;
    h += `<div class="blk" style="border-left-color:${blockColor(np, mk.block)}"><div class="bh">${esc(byId[mk.block].name)} <small>${mk.j + 1}</small></div>`;
    for (let k = mk.k0; k < mk.k1; k++) {
      const m = MOVES[d.moves[k]], s0 = info.starts[k], past = c >= s0 + m.c, now = !past && c >= s0;
      let out = '', bad = false;
      if (past || now) {
        const notes = [];
        if (s0 >= N.counts) notes.push(S.silent);
        for (const x of P.slips) if (x.k === k) notes.push(x.kind === 'trip' ? S.fell(who(x.i)) : x.kind === 'ankle' ? S.ankle(who(x.i)) : S.forgot(who(x.i)));
        if (k > 0 && info.links[k - 1].gap === 2) notes.push(S.jar);
        for (const o of P.spacing.offstage) if (o.k === k) notes.push(S.off(who(o.i)));
        for (const x of P.spacing.bump) if (x.k === k) notes.push(S.bump(who(x.i), who(x.j)));
        bad = notes.length > 0; out = bad ? notes.join('<br>') : past ? S.ok : '…';
      }
      h += `<div class="step${now ? ' now' : past ? ' done' : ''}${bad ? ' bad' : ''}" data-k="${k}"><span class="ic">${m.icon}</span><span class="mn">${esc(moveName(d.moves[k]))}</span><span class="out">${out}</span></div>`;
    }
    h += '</div>';
  }
  return h + '</div>';
}
function tryCard(R, id) {
  const html = verdictCards(R), box = document.createElement('div'); box.innerHTML = html;
  const want = `${clsName(NUMBERS[id].cls)} · ${numName(id)}`;
  const found = [...box.querySelectorAll('.verdict')].find((v) => v.querySelector('.vt').textContent.includes(want));
  return found ? found.outerHTML : '';
}

/* ---------------- the seasons ---------------- */
export function nextSeason() {
  G.S.season++; G.S.galaDone = false; G.S.seed = (Math.random() * 1e9) >>> 0;
  addSeasonNumbers(G.S.plan, G.S.season); save();
  buildDancers(); refreshWorld(); idle(); paintCamBar(); showScreen('prep'); showIntro();
}
export function showIntro(force) {
  const s = G.S.season; if (!force && G.S.seenIntro >= s) return;
  const [title, body] = t().intro[s] || t().intro.free;
  modal.innerHTML = `<div class="box"><h2>${esc(title)}</h2><p>${body}</p><button type="button" class="gala" id="introGo">${esc(t().intro.go)}</button></div>`;
  modal.hidden = false;
  modal.querySelector('#introGo').onclick = () => { modal.hidden = true; G.S.seenIntro = s; save(); if (s === 2) setTab('parking'); };
}

/* ---------------- layout ---------------- */
export function resize() {
  if (innerWidth < 50 || innerHeight < 50) return;
  const side = innerWidth > 760; sheet.className = side ? 'side' : 'bottom';
  const under = side ? 0 : Math.min(innerHeight * 0.6, sheet.offsetHeight), top = Math.min(innerHeight * 0.4, camBar.getBoundingClientRect().bottom + 6);
  W.resizeRenderer(side ? sheet.offsetWidth : 0, under, top);
  camBar.style.right = `${(side ? sheet.offsetWidth : 0) + 12}px`;
}
