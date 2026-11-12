// The shipyard: an editor built from a model's declaration (models/kestrel.mjs). Nothing here knows what a Kestrel is.
// The panel is made from `model.settings`, the stage points at `model.parts`, the handles come from the settings that
// declare one, and the checks are the model's own. A new setting in the declaration appears here without a line changed.
//
// The point (PLY-009, Richard 2026-10-29): a 3D game is still mostly JavaScript, but written the NodeGX way, so a person
// can see and change what the author chose to make changeable, and check it, in an editor made for exactly that.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { model, build, checks, sectionAt } from './models/kestrel.mjs';
import { resolve, changesOf, show, same, legal, lint, extremes } from './models/model.mjs';
import { frigateInterior } from './interiors.mjs';
import { fighter, foldWings, setThrust, setEngineColor, SHELL_LAYER } from './ships.mjs';
import { Space } from './space.mjs';
import { LightPool } from './lights.mjs';
import { makePerson, randomLook } from './people.mjs';
import { el, mulberry } from './util.mjs';
import { readDesign, writeDesign, SAVED_IN } from './models/store.mjs';

const $ = (id) => document.getElementById(id);
const S = model.settings;
const KEYS = Object.keys(S);
const partLabel = (id) => model.parts.find((p) => p.id === id)?.label ?? id;
const scopeOf = (k) => (S[k].scope === 'interior' ? 'interior' : 'hull');
const settingsOf = (part) => KEYS.filter((k) => S[k].parts.includes(part));
const DESIGN_FILE = SAVED_IN(model.id);

// --- the stage ------------------------------------------------------------------------------------------------------

const canvas = $('yard-view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor('#02030a');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 20000);
scene.add(new THREE.HemisphereLight('#9fb4d8', '#1a1410', 0.9));
const sun = new THREE.DirectionalLight('#fff4e0', 1.6);
sun.position.set(0.6, 0.8, 0.3);
scene.add(sun);
// A soft light from below and astern, the shipyard's own (the game has none): a model viewer must show her belly.
const fill = new THREE.DirectionalLight('#aab8d4', 1.0); // at 0.55 her belly at its palest and darkest differed by under 10 levels: unseeable
fill.position.set(-0.4, -0.7, 0.5);
scene.add(fill);
const space = new Space(scene, renderer, sun);
const pool = new LightPool(scene, 18); // every room lit at once in the cutaway (the Kestrel has 17 lamps)
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.14;
controls.maxDistance = 600;

const CLIP_Y = 0.55; // the cutaway takes everything above 2.55 m over her deck: ceilings, the hull's top, the spine
const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), CLIP_Y);
// The Wren goes through the bay door with her wings folded (s6, TS-S5-WRENBAY): that is the span the door must take.
const WREN_SPAN = (() => {
  const w = fighter();
  foldWings(w, 1);
  return new THREE.Box3().setFromObject(w).getSize(new THREE.Vector3()).x;
})();

// Where a person can stand (or sit): id, label, x, z, facing, eye height over the deck, look down by.
const EYES = [
  ['helm', 'At the helm', 0, -31.15, 0, 1.45, 0.02],
  ['chair', "In the captain's chair", 0, -24.35, 0, 1.3, 0.06],
  ['door', 'The bridge door', 0, -20.6, 0, 1.65, 0.05],
  ['corridor', 'The corridor, looking forward', 0, 5.5, 0, 1.65, 0.05],
  ['turret', 'The turret pod', 3.4, -10, -Math.PI / 2, 1.65, 0.05],
  ['airlock', 'The airlock', -3.9, -6, Math.PI / 2, 1.65, 0.05],
  ['quarters', 'Your quarters', -3.6, 2, Math.PI / 2, 1.65, 0.05],
  ['engine', 'The engine room', 3.6, 0.5, -Math.PI / 2, 1.65, 0.05],
  ['hold', 'The cargo hold', 0, 6.6, Math.PI, 1.65, 0.05],
  ['bay', 'The fighter bay', 0, 20.2, Math.PI, 1.65, 0.05]
];

// --- state ----------------------------------------------------------------------------------------------------------

let values = resolve(model, {});
let savedValues = { ...values };
let ship = null;
let interior = null;
let wren = null;
let mode = 'outside';
let eye = { id: 'helm', yaw: 0, pitch: 0 };
let thrust = 0.55;
let showHandles = true;
let selected = null;
let lastChecks = [];
let gateResult = null;
const past = [];
const future = [];
let pendingBase = null;
const dirty = { hull: true, interior: true };
let lastInterior = 0;
const views = {}; // the camera kept per mode, so going back to Outside finds the view you left

// --- building -------------------------------------------------------------------------------------------------------

function disposeTree(obj, keep = null) {
  obj.traverse((o) => {
    if (keep && (o === keep || isUnder(o, keep))) return;
    o.geometry?.dispose?.();
  });
}
function isUnder(o, anc) {
  for (let p = o.parent; p; p = p.parent) if (p === anc) return true;
  return false;
}

function rebuildHull() {
  const old = ship;
  ship = build(values);
  setThrust(ship, thrust);
  scene.add(ship);
  // A space-walker on her back, for scale: 1.8 m against 84 m of ship.
  const S0 = sectionAt(ship.userData.sections, -14);
  const walker = makePerson(randomLook(mulberry(5)), { kind: 'suit' });
  walker.position.set(-Math.min(4.5, S0.w / 2 - 2), S0.y + S0.h / 2, -14);
  walker.rotation.y = 0.6;
  walker.traverse((o) => (o.userData.scaleFigure = true));
  ship.add(walker);
  if (interior) {
    interior.group.removeFromParent();
    ship.add(interior.group);
    interior.host = ship;
  }
  if (wren) {
    wren.userData.hullMat.color.set(values.paint);
    setEngineColor(wren, values.engineGlow);
  }
  if (old) {
    old.removeFromParent();
    disposeTree(old, interior?.group);
  }
  dirty.hull = false;
}

function rebuildInterior() {
  if (interior) {
    interior.group.removeFromParent();
    disposeTree(interior.group);
  }
  interior = frigateInterior(ship, values);
  wren = fighter({ paint: values.paint, engine: values.engineGlow });
  wren.position.copy(interior.fighterPad);
  wren.rotation.y = Math.PI;
  setThrust(wren, 0);
  interior.group.add(wren);
  // Crew at their posts, for scale and for life, but not where the eye views stand.
  const r = mulberry(11);
  const st = interior.stations;
  for (const [i, spot] of [st.idle[0], st.idle[1], st.idle[3], st.engine, st.party[0]].entries()) {
    interior.person(`crew${i}`, randomLook(r), spot.pos.x, spot.pos.z, spot.yaw, { pose: spot.pose ?? 'idle' });
  }
  dirty.interior = false;
  lastInterior = performance.now();
}

function runChecks() {
  lastChecks = checks(values, ship, { rooms: interior?.rooms ?? [], wrenSpan: WREN_SPAN });
}

// --- changing values ------------------------------------------------------------------------------------------------

function schedule(kind) {
  if (kind !== 'interior') dirty.hull = true;
  if (kind !== 'hull') dirty.interior = true;
}

/** Sets one value. `live` while a slider moves or a handle drags: the change is shown, and becomes one undo step when
 *  the gesture ends (`commit`). */
function set(key, v, { live = false } = {}) {
  const s = S[key];
  const nv = legal(s, v);
  if (!pendingBase) pendingBase = { ...values };
  if (!same(s, nv, values[key])) {
    values = { ...values, [key]: nv };
    schedule(scopeOf(key));
    refreshRows(key);
  }
  if (!live) commit();
}

function commit() {
  if (!pendingBase) return;
  if (KEYS.some((k) => !same(S[k], pendingBase[k], values[k]))) {
    past.push(pendingBase);
    future.length = 0;
  }
  pendingBase = null;
  refreshMeta();
}

function replaceAll(next, { record = true } = {}) {
  if (record) past.push({ ...values }), (future.length = 0);
  const before = values;
  values = resolve(model, next);
  const hull = KEYS.some((k) => scopeOf(k) === 'hull' && !same(S[k], before[k], values[k]));
  const inside = KEYS.some((k) => scopeOf(k) === 'interior' && !same(S[k], before[k], values[k]));
  if (hull) schedule('hull');
  if (inside) schedule('interior');
  refreshRows();
  refreshMeta();
}

function undo() {
  commit();
  if (!past.length) return;
  future.push({ ...values });
  replaceAll(past.pop(), { record: false });
}
function redo() {
  if (!future.length) return;
  past.push({ ...values });
  replaceAll(future.pop(), { record: false });
}

async function save() {
  commit();
  const status = $('yard-status');
  try {
    const j = await writeDesign(model.id, changesOf(model, values));
    if (!j.ok) throw new Error(j.error);
    savedValues = { ...values };
    refreshMeta();
    status.textContent = `Saved to ${DESIGN_FILE}`;
    return j;
  } catch (e) {
    status.textContent = `Not saved: ${e.message}`;
    status.className = 'dirty';
    return { ok: false, error: e.message };
  }
}

async function load() {
  values = resolve(model, await readDesign(model.id));
  savedValues = { ...values };
}

// --- the panel, from the declaration ----------------------------------------------------------------------------------

const rows = new Map(); // key → [{ row, update }]
const openGroups = new Set(['Paint', 'Hull']);

function refreshRows(key = null) {
  for (const [k, list] of rows) {
    if (key && k !== key) continue;
    const live = list.filter((r) => r.row.isConnected);
    rows.set(k, live);
    for (const r of live) r.update();
  }
}

function control(key, { help = false } = {}) {
  const s = S[key];
  const row = el('div', { class: 'yard-row', 'data-key': key });
  const name = el('div', { class: 'name', ondblclick: () => set(key, s.default) }, el('span', { class: 'mod' }), s.label);
  const ctl = el('div', { class: 'ctl' });
  let update = () => {};
  if (s.type === 'number') {
    const range = el('input', { type: 'range', min: s.min, max: s.max, step: s.step ?? 'any', 'aria-label': s.label });
    const val = el('input', { class: 'val', type: 'text', 'aria-label': `${s.label} value` });
    range.addEventListener('input', () => set(key, +range.value, { live: true }));
    range.addEventListener('change', commit);
    val.addEventListener('change', () => set(key, parseFloat(val.value)));
    val.addEventListener('keydown', (e) => e.key === 'Enter' && val.blur());
    ctl.append(range, val);
    update = () => {
      range.value = values[key];
      if (document.activeElement !== val) val.value = show(s, values[key]);
    };
  } else if (s.type === 'int') {
    const n = el('span');
    ctl.append(el('div', { class: 'stepper' }, el('button', { onclick: () => set(key, values[key] - 1), 'aria-label': `fewer ${s.label}` }, '−'), n, el('button', { onclick: () => set(key, values[key] + 1), 'aria-label': `more ${s.label}` }, '+')), el('span', { class: 'hex' }, `${s.min}–${s.max}`));
    update = () => (n.textContent = values[key]);
  } else if (s.type === 'color') {
    const pick = el('input', { type: 'color', 'aria-label': s.label });
    const hex = el('span', { class: 'hex' });
    pick.addEventListener('input', () => set(key, pick.value, { live: true }));
    pick.addEventListener('change', commit);
    ctl.append(pick, hex);
    update = () => {
      pick.value = values[key];
      hex.textContent = values[key];
    };
  } else if (s.type === 'bool') {
    const t = el('div', { class: 'toggle', role: 'switch', tabindex: 0, 'aria-label': s.label, onclick: () => set(key, !values[key]) });
    t.addEventListener('keydown', (e) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), set(key, !values[key])));
    ctl.append(t, el('span', { class: 'hex' }));
    update = () => {
      t.classList.toggle('on', values[key]);
      t.setAttribute('aria-checked', String(values[key]));
      ctl.lastChild.textContent = values[key] ? 'on' : 'off';
    };
  } else if (s.type === 'text') {
    const t = el('input', { type: 'text', maxlength: s.max ?? 24, 'aria-label': s.label });
    t.addEventListener('input', () => set(key, t.value, { live: true }));
    t.addEventListener('change', commit);
    ctl.append(t);
    update = () => document.activeElement !== t && (t.value = values[key]);
  } else if (s.type === 'choice') {
    const seg = el('div', { class: 'seg' }, ...s.options.map(([v, label]) => el('button', { 'data-v': v, onclick: () => set(key, v) }, label)));
    ctl.append(seg);
    update = () => seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === String(values[key])));
  }
  row.append(name, ctl);
  if (help && s.help) row.append(el('div', { class: 'help' }, s.help));
  const full = () => {
    update();
    row.classList.toggle('changed', !same(s, values[key], s.default));
    name.title = `${s.help ? s.help + '\n' : ''}Default: ${show(s, s.default)}. Double-click to put it back.`;
  };
  full();
  if (!rows.has(key)) rows.set(key, []);
  rows.get(key).push({ row, update: full });
  return row;
}

function renderPanel() {
  const body = $('yard-body');
  body.replaceChildren();
  const problems = lint(model);
  if (problems.length) body.append(el('div', { class: 'yard-card' }, el('h3', {}, 'The declaration lies'), ...problems.map((p) => el('div', { class: 'check bad' }, el('span', { class: 'mark' }, '✗'), el('span', {}, p)))));
  body.append(el('div', { id: 'yard-point' }), el('div', { id: 'yard-checks' }), el('div', { id: 'yard-changes' }));
  for (const scope of ['hull', 'interior']) {
    body.append(el('div', { class: 'scope-head' }, scope === 'hull' ? 'Her outside' : 'Inside her'));
    for (const g of model.groups) {
      const keys = KEYS.filter((k) => S[k].group === g && scopeOf(k) === scope);
      if (!keys.length) continue;
      const d = el('details', { class: 'group', 'data-group': g }, el('summary', {}, el('span', {}, g), el('span', { class: 'count' })), ...keys.map((k) => control(k)));
      d.open = openGroups.has(g);
      d.addEventListener('toggle', () => (d.open ? openGroups.add(g) : openGroups.delete(g)));
      body.append(d);
    }
  }
  body.append(
    el('div', { class: 'yard-foot' },
      el('div', {}, `${KEYS.length} settings on ${model.parts.length} named parts, declared in `, el('code', {}, 'src/models/kestrel.mjs'), '. This panel is built from that declaration: a setting added there appears here. Saving writes only what differs from the defaults to ', el('code', {}, DESIGN_FILE), ', which the game reads when it starts.'),
      el('div', { style: 'margin-top:10px' }, el('button', { class: 'small', id: 'yard-gate', onclick: () => runGate() }, 'Check that every setting changes the picture')),
      el('div', { id: 'yard-gate-out' })
    )
  );
  renderPoint();
  refreshMeta();
}

function renderPoint() {
  const box = $('yard-point');
  if (!box) return;
  document.querySelectorAll('.yard-row.lit').forEach((r) => r.classList.remove('lit'));
  if (!selected) {
    box.replaceChildren();
    return;
  }
  const keys = settingsOf(selected);
  box.replaceChildren(
    el('div', { class: 'yard-card point' },
      el('h3', {}, el('span', {}, 'Pointing at'), el('button', { class: 'small', onclick: () => select(null) }, 'The whole ship')),
      el('div', { class: 'what' }, partLabel(selected)),
      keys.length ? el('div', { class: 'muted', style: 'font-size:12px;margin-bottom:6px' }, `${keys.length} setting${keys.length > 1 ? 's' : ''} shape it`) : el('div', { class: 'muted' }, 'Nothing about this part is a setting yet.'),
      ...keys.map((k) => control(k, { help: true }))
    )
  );
  for (const k of keys) document.querySelectorAll(`#yard-body details .yard-row[data-key="${k}"]`).forEach((r) => r.classList.add('lit'));
}

function refreshMeta() {
  const changed = changesOf(model, values);
  const unsaved = KEYS.filter((k) => !same(S[k], values[k], savedValues[k])).length;
  const status = $('yard-status');
  status.textContent = unsaved ? `${unsaved} change${unsaved > 1 ? 's' : ''} not saved` : 'Saved';
  status.className = unsaved ? 'dirty' : 'saved';
  $('yard-save').disabled = !unsaved;
  $('yard-undo').disabled = !past.length && !pendingBase;
  $('yard-redo').disabled = !future.length;
  $('yard-model').textContent = model.name;
  // What changed against the model as declared.
  const ch = $('yard-changes');
  if (ch) {
    const ks = Object.keys(changed);
    ch.replaceChildren(
      ...(ks.length
        ? [el('div', { class: 'yard-card' },
            el('h3', {}, el('span', {}, `Changed from the model (${ks.length})`)),
            ...ks.map((k) => el('div', { class: 'change' },
              el('span', {}, el('b', {}, S[k].label), ` · ${S[k].group}  `, el('span', { class: 'from' }, show(S[k], S[k].default)), ' → ', show(S[k], values[k])),
              el('button', { class: 'small', title: 'Put it back', onclick: () => set(k, S[k].default) }, '↺')
            ))
          )]
        : [])
    );
  }
  for (const d of document.querySelectorAll('details.group')) {
    const g = d.dataset.group;
    const n = KEYS.filter((k) => S[k].group === g && changed[k] !== undefined).length;
    const c = d.querySelector('.count');
    c.textContent = n ? `${n} changed` : `${KEYS.filter((k) => S[k].group === g).length}`;
    c.classList.toggle('changed', n > 0);
  }
  renderChecks();
}

function renderChecks() {
  const box = $('yard-checks');
  if (!box) return;
  const bad = lastChecks.filter((c) => !c.ok);
  box.replaceChildren(
    el('div', { class: 'yard-card' },
      el('h3', {}, el('span', {}, 'Checks'), el('span', { class: bad.length ? '' : 'muted', style: bad.length ? 'color:var(--warn)' : '' }, bad.length ? `${bad.length} to look at` : 'all pass')),
      ...lastChecks.map((c) => el('div', { class: `check ${c.ok ? 'ok' : c.level} ${c.part ? 'clickable' : ''}`, 'data-check': c.id, onclick: () => c.part && select(c.part) },
        el('span', { class: 'mark' }, c.ok ? '✓' : c.level === 'bad' ? '✗' : '!'),
        el('span', { class: 'label' }, c.label),
        el('span', { class: 'detail' }, c.detail)
      ))
    )
  );
}

// --- pointing -------------------------------------------------------------------------------------------------------

const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let selBox = null;

function aim(ev) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  ray.layers.mask = camera.layers.mask;
  ray.camera = camera;
}
function shown(o) {
  for (; o; o = o.parent) if (!o.visible) return false;
  return true;
}
/** What a person is pointing at: a declared part, a room, the scale figure, or nothing. */
function pointAt(ev) {
  aim(ev);
  const hits = ray.intersectObject(ship, true).filter((h) => shown(h.object) && !h.object.isSprite && h.object.material && !(h.object.material.transparent && h.object.material.opacity < 0.5) && (mode !== 'cutaway' || h.point.y <= CLIP_Y + 0.01));
  for (const h of hits) {
    for (let o = h.object; o; o = o.parent) {
      if (o.userData.scaleFigure) return { scale: true };
      if (o === interior?.group) {
        const p = ship.worldToLocal(h.point.clone());
        const R = interior.rooms.find((R) => p.x >= R.x1 - 0.2 && p.x <= R.x2 + 0.2 && p.z >= R.z1 - 0.2 && p.z <= R.z2 + 0.2);
        if (R) return { part: `room-${R.id}` };
        break; // a passage between rooms: look at what is behind it
      }
      if (o.userData.part) return { part: o.userData.part };
    }
  }
  return null;
}

function select(part) {
  selected = part;
  if (part && model.parts.find((p) => p.id === part)?.scope === 'interior' && mode === 'outside') setMode('cutaway');
  if (part) {
    // Open the groups that hold its settings.
    for (const k of settingsOf(part)) openGroups.add(S[k].group);
    document.querySelectorAll('details.group').forEach((d) => (d.open = openGroups.has(d.dataset.group)));
  }
  renderPoint();
  placeSelBox();
  $('yard-body').scrollTop = 0;
}

function placeSelBox() {
  selBox?.removeFromParent();
  selBox = null;
  if (!selected || !ship) return;
  let b;
  if (selected.startsWith('room-')) {
    const R = interior?.rooms.find((R) => `room-${R.id}` === selected);
    if (!R) return;
    b = new THREE.Box3(new THREE.Vector3(R.x1, R.y0, R.z1), new THREE.Vector3(R.x2, mode === 'cutaway' ? Math.min(R.y1, CLIP_Y) : R.y1, R.z2));
  } else {
    const p = ship.userData.parts[selected];
    if (!p || !p.visible) return;
    b = new THREE.Box3().setFromObject(p);
    if (b.isEmpty()) return;
  }
  selBox = new THREE.Box3Helper(b, '#58b0ff');
  selBox.material.depthTest = false;
  selBox.material.transparent = true;
  selBox.renderOrder = 9;
  scene.add(selBox);
}

// --- handles: a setting made physical -------------------------------------------------------------------------------

const handles = new THREE.Group();
scene.add(handles);
const handleGeo = new THREE.SphereGeometry(1, 16, 10);
const handleMat = new THREE.MeshBasicMaterial({ color: '#ffb347', depthTest: false, transparent: true, opacity: 0.95, toneMapped: false });
const handleHot = new THREE.MeshBasicMaterial({ color: '#ffffff', depthTest: false, transparent: true, opacity: 1, toneMapped: false });
const AXES = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
let drag = null;

function placeHandles() {
  handles.clear();
  if (mode !== 'outside' || !showHandles || !ship) return;
  for (const k of KEYS) {
    const p = S[k].handle && ship.userData.handles[k];
    if (!p) continue;
    const m = new THREE.Mesh(handleGeo, handleMat);
    m.position.copy(p);
    m.renderOrder = 10;
    m.userData.handle = k;
    handles.add(m);
  }
}

function handleAt(ev) {
  if (!handles.children.length) return null;
  aim(ev);
  return ray.intersectObjects(handles.children, false)[0]?.object ?? null;
}

// --- views ----------------------------------------------------------------------------------------------------------

let started = false;
function setMode(m) {
  if (started) views[mode] = { pos: camera.position.clone(), target: controls.target.clone() }; // not the unplaced camera at startup
  started = true;
  mode = m;
  document.querySelectorAll('#yard-mode button').forEach((b) => b.classList.toggle('on', b.dataset.mode === m));
  $('yard-eye').hidden = m !== 'eye';
  renderer.clippingPlanes = m === 'cutaway' ? [clip] : [];
  if (m === 'eye') camera.layers.disable(SHELL_LAYER);
  else camera.layers.enableAll();
  controls.enabled = m !== 'eye';
  const v = views[m];
  if (m === 'outside') {
    camera.position.copy(v?.pos ?? new THREE.Vector3(66, 24, -56)); // her sunlit starboard bow, from a little above
    controls.target.copy(v?.target ?? new THREE.Vector3(0, -1, 2));
  } else if (m === 'cutaway') {
    camera.position.copy(v?.pos ?? new THREE.Vector3(30, 58, 42));
    controls.target.copy(v?.target ?? new THREE.Vector3(0, -2, 0));
  } else setEye(eye.id);
  $('yard-hint').textContent = {
    outside: 'Click a part to see what you can change about it. Drag the amber handles. Drag the view to turn it, scroll to zoom.',
    cutaway: 'The decks with the ceilings off. Click a room to change its walls, deck, accent and lamps.',
    eye: 'Standing where the crew stand. Drag to look round; click a wall to change the room.'
  }[m];
  placeHandles();
  placeSelBox();
}

function setEye(id) {
  const e = EYES.find((x) => x[0] === id) ?? EYES[0];
  eye = { id: e[0], yaw: e[4], pitch: -e[6] };
  $('yard-eye').value = e[0];
}
function placeEye() {
  const e = EYES.find((x) => x[0] === eye.id);
  const y = -2 + e[5];
  camera.position.copy(ship.localToWorld(new THREE.Vector3(e[2], y, e[3])));
  camera.rotation.set(eye.pitch, eye.yaw, 0, 'YXZ');
}

// --- input ----------------------------------------------------------------------------------------------------------

let down = null;
let hoverAt = 0;
const capture = (ev) => {
  try {
    canvas.setPointerCapture(ev.pointerId);
  } catch {} // a synthetic pointer (a drive's) cannot be captured
};
// In the capture phase, so a press on a handle turns the orbit off before OrbitControls' own listener sees it.
canvas.addEventListener('pointerdown', (ev) => {
  down = { x: ev.clientX, y: ev.clientY };
  const h = mode === 'outside' && handleAt(ev);
  if (h) {
    const k = h.userData.handle;
    drag = { key: k, start: h.position.clone(), axis: AXES[S[k].handle.axis] };
    controls.enabled = false;
    capture(ev);
    h.material = handleHot;
    canvas.className = 'handle';
  } else if (mode === 'eye') {
    capture(ev);
    canvas.className = 'grab';
  }
}, { capture: true });
canvas.addEventListener('pointermove', (ev) => {
  if (drag) {
    aim(ev);
    const view = camera.getWorldDirection(new THREE.Vector3());
    const n = view.clone().addScaledVector(drag.axis, -view.dot(drag.axis));
    if (n.lengthSq() < 1e-6) return;
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n.normalize(), drag.start);
    const hit = ray.ray.intersectPlane(plane, new THREE.Vector3());
    if (!hit) return;
    const p = drag.start.clone().addScaledVector(drag.axis, hit.sub(drag.start).dot(drag.axis));
    set(drag.key, S[drag.key].handle.value(p, values, ship.userData), { live: true });
    showTip(ev, `${S[drag.key].label}: ${show(S[drag.key], values[drag.key])}`);
    return;
  }
  if (mode === 'eye' && down && ev.buttons) {
    eye.yaw -= ev.movementX * 0.005;
    eye.pitch = Math.max(-1.3, Math.min(1.3, eye.pitch - ev.movementY * 0.005));
    return;
  }
  if (ev.buttons || performance.now() - hoverAt < 40) return;
  hoverAt = performance.now();
  const h = mode === 'outside' && handleAt(ev);
  if (h) {
    canvas.className = 'handle';
    const k = h.userData.handle;
    return showTip(ev, `Drag: ${S[k].label} (${show(S[k], values[k])})`);
  }
  const p = pointAt(ev);
  canvas.className = p?.part ? 'over' : '';
  if (p?.scale) return showTip(ev, 'A space-walker, for scale: 1.8 m');
  if (p?.part) return showTip(ev, `${partLabel(p.part)} · ${settingsOf(p.part).length} settings`);
  hideTip();
});
canvas.addEventListener('pointerup', (ev) => {
  if (drag) {
    commit();
    drag = null;
    controls.enabled = mode !== 'eye';
    canvas.className = '';
    hideTip();
    placeHandles();
    return;
  }
  if (mode === 'eye') canvas.className = '';
  if (down && Math.hypot(ev.clientX - down.x, ev.clientY - down.y) < 5) {
    const p = pointAt(ev);
    select(p?.part ?? null);
  }
  down = null;
});
canvas.addEventListener('pointerleave', hideTip);

function showTip(ev, text) {
  const tip = $('yard-tip');
  const r = canvas.getBoundingClientRect();
  tip.textContent = text;
  tip.style.left = `${ev.clientX - r.left}px`;
  tip.style.top = `${ev.clientY - r.top}px`;
  tip.hidden = false;
}
function hideTip() {
  $('yard-tip').hidden = true;
}

document.querySelectorAll('#yard-mode button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
$('yard-eye').append(...EYES.map(([id, label]) => el('option', { value: id }, label)));
$('yard-eye').addEventListener('change', (e) => setEye(e.target.value));
$('yard-sky').addEventListener('change', (e) => space.setSector(e.target.value));
$('yard-thrust').addEventListener('input', (e) => {
  thrust = +e.target.value;
  setThrust(ship, thrust);
});
$('yard-handles').addEventListener('change', (e) => {
  showHandles = e.target.checked;
  placeHandles();
});
$('yard-save').addEventListener('click', save);
$('yard-undo').addEventListener('click', undo);
$('yard-redo').addEventListener('click', redo);
$('yard-reset').addEventListener('click', () => replaceAll({}));
window.addEventListener('keydown', (e) => {
  const typing = e.target.matches?.('input[type=text]');
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') return e.preventDefault(), save();
  if (typing) return;
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') return e.preventDefault(), e.shiftKey ? redo() : undo();
  if (e.key === 'Escape') select(null);
});
window.addEventListener('beforeunload', (e) => {
  if (KEYS.some((k) => !same(S[k], values[k], savedValues[k]))) e.preventDefault();
});

function resize() {
  const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas);

// --- the gate: every setting must visibly change the render (PLY-009) -------------------------------------------------

/** Renders the ship at each setting's two extremes and counts the pixels that differ. The cameras frame the parts the
 *  setting declares it shapes (a gun barrel is under a pixel in a view of the whole ship): four sides of a hull part's
 *  box; for a room, the cutaway over it and a person's eye down its length. A setting that changes nothing is inert,
 *  and an inert setting teaches a person a lie. */
async function runGate({ w = 240, h = 150, minPixels = 12, keys = KEYS } = {}) {
  const btn = $('yard-gate');
  const out = $('yard-gate-out');
  if (btn) btn.disabled = true;
  const keep = { ...values };
  const keepPlanes = renderer.clippingPlanes;
  const rt = new THREE.WebGLRenderTarget(w, h);
  const buf = new Uint8Array(w * h * 4);
  const cam = new THREE.PerspectiveCamera(45, w / h, 0.1, 5000);
  handles.visible = false;
  if (selBox) selBox.visible = false;
  const V = (a) => new THREE.Vector3(...a);
  const viewsFor = (k) => {
    const s = S[k];
    if (scopeOf(k) === 'hull') {
      const box = new THREE.Box3();
      for (const p of s.parts) {
        const o = ship.userData.parts[p];
        if (o?.visible) box.union(new THREE.Box3().setFromObject(o));
      }
      if (box.isEmpty()) box.setFromObject(ship);
      const c = box.getCenter(new THREE.Vector3());
      const d = (Math.max(3, box.getSize(new THREE.Vector3()).length() / 2) / Math.sin(THREE.MathUtils.degToRad(22.5))) * 1.05;
      return [[-1, 0.7, -1], [1, -0.7, 1], [1, 0.15, 0.1], [-1, 0.2, 0.3]].map((dir) => ({ pos: c.clone().addScaledVector(V(dir).normalize(), d), at: c }));
    }
    const views = [];
    for (const p of s.parts.slice(0, 3)) {
      const R = interior.rooms.find((R) => `room-${R.id}` === p);
      if (!R) continue;
      const cx = (R.x1 + R.x2) / 2, cz = (R.z1 + R.z2) / 2, rw = R.x2 - R.x1, rd = R.z2 - R.z1, r = Math.hypot(rw, rd) / 2;
      views.push({ pos: V([cx + r * 0.6, CLIP_Y + r * 1.6, cz + r * 0.9]), at: V([cx, R.y0, cz]), clip: true });
      const along = rd >= rw; // a person at one end, looking down the room's length
      views.push({ pos: along ? V([cx, R.y0 + 1.65, R.z2 - 0.6]) : V([R.x2 - 0.6, R.y0 + 1.65, cz]), at: along ? V([cx, R.y0 + 1.2, R.z1]) : V([R.x1, R.y0 + 1.2, cz]), eye: true });
    }
    return views;
  };
  const shots = (views) =>
    views.map((v) => {
      cam.position.copy(v.pos);
      cam.lookAt(v.at);
      cam.layers.enableAll();
      if (v.eye) cam.layers.disable(SHELL_LAYER);
      renderer.clippingPlanes = v.clip ? [clip] : [];
      space.follow(cam);
      pool.update(cam.position, [interior]);
      renderer.setRenderTarget(rt);
      renderer.render(scene, cam);
      renderer.readRenderTargetPixels(rt, 0, 0, w, h, buf);
      return buf.slice();
    });
  const diff = (A, B) => {
    let n = 0;
    for (let a = 0; a < A.length; a++) {
      let d = 0;
      for (let i = 0; i < A[a].length; i += 4) {
        if (Math.abs(A[a][i] - B[a][i]) > 10 || Math.abs(A[a][i + 1] - B[a][i + 1]) > 10 || Math.abs(A[a][i + 2] - B[a][i + 2]) > 10) d++;
      }
      n += d;
    }
    return n;
  };
  const results = [];
  try {
    for (const [i, k] of keys.entries()) {
      const s = S[k];
      const pair = [];
      const rebuild = scopeOf(k) === 'hull' ? () => (rebuildHull(), setThrust(ship, 0.6)) : rebuildInterior;
      const views = viewsFor(k); // framed on the design as it is, the same for both extremes
      for (const v of extremes(s)) {
        values = { ...keep, [k]: legal(s, v) };
        rebuild();
        pair.push(shots(views));
      }
      values = keep;
      rebuild(); // the next setting starts from the design, not from this one's extreme
      const px = diff(pair[0], pair[1]);
      results.push({ key: k, label: s.label, group: s.group, pixels: px, ok: px >= minPixels });
      if (out) out.textContent = `Checking ${i + 1} of ${keys.length}: ${s.group} · ${s.label}`;
      await new Promise((r) => setTimeout(r, 0));
    }
  } finally {
    renderer.setRenderTarget(null);
    rt.dispose();
    renderer.clippingPlanes = keepPlanes;
    values = keep;
    rebuildHull();
    rebuildInterior();
    runChecks();
    handles.visible = true;
    placeHandles();
    placeSelBox();
    if (btn) btn.disabled = false;
  }
  const inert = results.filter((r) => !r.ok);
  gateResult = { total: results.length, inert: inert.map((r) => `${r.group} · ${r.label} (${r.pixels} px)`), results };
  if (out) {
    out.replaceChildren(
      el('div', { style: `margin:8px 0 4px;color:var(--${inert.length ? 'bad' : 'good'})` }, inert.length ? `${inert.length} of ${results.length} settings change nothing you can see:` : `All ${results.length} settings change the picture.`),
      ...inert.map((r) => el('div', { class: 'gate-row bad' }, el('span', {}, `${r.group} · ${r.label}`), el('span', {}, `${r.pixels} px`)))
    );
  }
  return gateResult;
}

// --- the loop -------------------------------------------------------------------------------------------------------

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const rebuilt = dirty.hull || dirty.interior;
  if (dirty.hull) rebuildHull();
  if (dirty.interior && (now - lastInterior > 90 || !interior)) rebuildInterior();
  if (rebuilt && !dirty.interior) {
    runChecks();
    renderChecks();
    if (!drag) placeHandles();
    else for (const m of handles.children) m.userData.handle === drag.key || m.position.copy(ship.userData.handles[m.userData.handle]);
    placeSelBox();
  }
  if (mode === 'eye') placeEye();
  else controls.update();
  for (const m of handles.children) m.scale.setScalar(Math.max(0.2, camera.position.distanceTo(m.position) * 0.0065));
  space.frame(camera, dt);
  interior?.tick(dt);
  pool.update(mode === 'cutaway' ? controls.target : camera.position, [interior]);
  renderer.render(scene, camera);
}

await load();
resize();
renderPanel();
setMode('outside');
requestAnimationFrame(frame);

/** For a drive, an agent, or the console: the same verbs the panel uses. */
window.__shipyard = {
  model,
  get values() {
    return { ...values };
  },
  changes: () => changesOf(model, values),
  set: (k, v) => (set(k, v), values[k]),
  setAll: (v) => replaceAll(v),
  pick: (part) => (select(part), selected),
  get selected() {
    return selected;
  },
  get ship() {
    return ship;
  },
  view: (m, eyeId) => (setMode(m), eyeId && setEye(eyeId), mode),
  checks: () => (runChecks(), lastChecks),
  gate: (opts) => runGate(opts),
  get gateResult() {
    return gateResult;
  },
  save,
  undo,
  redo,
  ready: () => !!ship && !!interior && !dirty.hull && !dirty.interior,
  stats: () => ({ parts: Object.keys(ship.userData.parts).length, rooms: interior.rooms.length, settings: KEYS.length, handles: handles.children.length, lint: lint(model), meshes: count(ship) }),
  /** The screen point of a part's centre, for a drive that clicks where a person would. */
  screenOf: (part) => {
    const p = ship.userData.parts[part];
    const c = new THREE.Box3().setFromObject(p).getCenter(new THREE.Vector3()).project(camera);
    const r = canvas.getBoundingClientRect();
    return [Math.round(r.left + ((c.x + 1) / 2) * r.width), Math.round(r.top + ((1 - c.y) / 2) * r.height)];
  },
  screenOfPoint: (x, y, z) => {
    const c = ship.localToWorld(new THREE.Vector3(x, y, z)).project(camera);
    const r = canvas.getBoundingClientRect();
    return [Math.round(r.left + ((c.x + 1) / 2) * r.width), Math.round(r.top + ((1 - c.y) / 2) * r.height)];
  },
  screenOfHandle: (k) => {
    const m = handles.children.find((h) => h.userData.handle === k);
    if (!m) return null;
    const c = m.position.clone().project(camera);
    const r = canvas.getBoundingClientRect();
    return [Math.round(r.left + ((c.x + 1) / 2) * r.width), Math.round(r.top + ((1 - c.y) / 2) * r.height)];
  },
  camera
};

function count(o) {
  let n = 0;
  o.traverse((x) => x.isMesh && n++);
  return n;
}
