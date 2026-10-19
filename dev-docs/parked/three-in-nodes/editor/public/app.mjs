// The scene editor's page: the outline of one 3D scene, what can be added to it, the selected thing's settings, and
// the real app in the middle. Edits change the component files held by the model; a setting reaches the running app
// at once (the runtime's own setParameter), and an edit to the tree (add, remove, move under) re-renders the app.
// Save writes the files through the kit's store. three-kit's port definitions (names, defaults, choices) are read from
// the running app's node library, so the editor and the kit cannot disagree about them.

import { SceneModel, onlyParameters, parameterDiff } from '/core/model.mjs';
import { Viewport } from '/viewport.mjs';
import { ICONS, TINTS } from '/icons.mjs';

const $ = (s) => document.querySelector(s);
const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
};

const T3 = { scene: 'three-kit.Scene', mesh: 'three-kit.Mesh', group: 'three-kit.Group', light: 'three-kit.Light' };
const IS3D = (type) => typeof type === 'string' && type.startsWith('three-kit.');
const COLOURS = ['#4f8cff', '#ff4757', '#2ed573', '#ffb547', '#a55eea', '#1ec8c8', '#ff7eb6', '#f1f2f6', '#57606f', '#ff9f43'];
const SHAPE_WORD = { box: 'Box', sphere: 'Ball', cylinder: 'Cylinder', cone: 'Cone', torus: 'Ring', plane: 'Tile' };

const TILES = [
  { key: 'box', label: 'Box', type: T3.mesh, params: { shape: 'box', sitOnFloor: true } },
  { key: 'sphere', label: 'Ball', type: T3.mesh, params: { shape: 'sphere', sitOnFloor: true } },
  { key: 'cylinder', label: 'Cylinder', type: T3.mesh, params: { shape: 'cylinder', sitOnFloor: true } },
  { key: 'cone', label: 'Cone', type: T3.mesh, params: { shape: 'cone', sitOnFloor: true } },
  { key: 'torus', label: 'Ring', type: T3.mesh, params: { shape: 'torus', sitOnFloor: true, width: 1.6, height: 1.6, depth: 1.6 } },
  { key: 'plane', label: 'Tile', type: T3.mesh, params: { shape: 'plane', width: 4, depth: 4, y: 0.01 } },
  { gap: true },
  { key: 'group', label: 'Group', type: T3.group, params: {} },
  { key: 'sun', label: 'Sun', type: T3.light, params: { kind: 'sun', intensity: 1.2, x: 5, y: 10, z: 5 } },
  { key: 'lamp', label: 'Lamp', type: T3.light, params: { kind: 'lamp', intensity: 2, x: 0, y: 3, z: 2, colour: '#ffd9a0' } },
  { key: 'sky', label: 'Sky', type: T3.light, params: { kind: 'sky', intensity: 0.7 } }
];

/** What the inspector shows for each kind, in order; a port's label, default and choices come from the kit. */
const LAYOUT = {
  [T3.mesh]: [['Shape', ['shape']], ['Colour', ['colour']], ['Place', ['x', 'y', 'z', 'rotationY', 'sitOnFloor']], ['Size', ['width', 'height', 'depth']], ['Motion', ['spin', 'spinSpeed']], ['More', ['wireframe', 'name']]],
  [T3.group]: [['Place', ['x', 'y', 'z', 'rotationY', 'scale']], ['Motion', ['spin', 'spinSpeed']], ['More', ['name']]],
  [T3.light]: [['Light', ['kind', 'colour', 'ground', 'intensity']], ['Place', ['x', 'y', 'z']]],
  [T3.scene]: [['Look', ['background', 'floor']], ['Camera', ['cameraDistance', 'cameraHeight', 'cameraAngle', 'fieldOfView', 'orbit']], ['Size', ['height']]]
};
const TRIPLES = [['x', 'y', 'z'], ['width', 'height', 'depth']];
const STEP = { x: 0.1, y: 0.1, z: 0.1, width: 0.1, height: 0.1, depth: 0.1, scale: 0.05, rotationY: 1, spinSpeed: 5, intensity: 0.05, cameraDistance: 0.5, cameraHeight: 0.25, cameraAngle: 1, fieldOfView: 1 };
const RANGE = { rotationY: [-180, 180], cameraAngle: [-180, 180], fieldOfView: [15, 110], intensity: [0, 5], spinSpeed: [-360, 360] };

const model = new SceneModel();
const state = { project: null, library: null, scenes: [], scene: null, sel: null, mode: 'edit', toldRows: false };
const vp = new Viewport($('#stage'), { onPick, onDrag, onDragEnd, onHover, onStatus });
window.__scene = { state, model, vp, select, addTile, save, undo, redo, setMode, currentTree, showTree, removeSelected, duplicateSelected, useThisView };

// ── the kit's own description of its nodes ──────────────────────────────────────────────────────────────────────

function typeInfo(type) {
  return state.library?.nodetypes?.find((t) => t.name === type);
}
function portInfo(type, name) {
  return typeInfo(type)?.ports?.find((p) => p.name === name && p.plug !== 'output');
}
function portType(p) {
  return typeof p?.type === 'object' ? p.type.name : p?.type;
}
function value(node, name) {
  const v = node.parameters?.[name];
  return v !== undefined ? v : portInfo(node.type, name)?.default;
}
function displayType(type) {
  if (type === 'For Each') return 'For Each';
  return typeInfo(type)?.displayNodeName ?? type.replace('three-kit.', '');
}
function kindOf(node) {
  if (!node) return 'other';
  if (node.type === T3.scene) return 'scene';
  if (node.type === T3.group) return 'group';
  if (node.type === 'For Each') return 'foreach';
  if (node.type === T3.mesh) return node.parameters?.shape || value(node, 'shape') || 'box';
  if (node.type === T3.light) return node.parameters?.kind || 'sun';
  return 'other';
}
function labelOf(node) {
  if (!node) return '';
  if (node.label) return node.label;
  if (node.parameters?.name) return node.parameters.name;
  if (node.type === T3.mesh) return SHAPE_WORD[kindOf(node)] ?? 'Mesh';
  if (node.type === T3.light) return { sun: 'Sun', lamp: 'Lamp', sky: 'Sky' }[kindOf(node)] ?? 'Light';
  return displayType(node.type);
}
function icon(kind, size) {
  const span = h('span', { class: 'ic', html: ICONS[kind] ?? ICONS.other });
  span.style.color = TINTS[kind] ?? TINTS.other;
  if (size) span.querySelector('svg')?.setAttribute('width', size), span.querySelector('svg')?.setAttribute('height', size);
  return span;
}

// ── the project as the preview renders it ───────────────────────────────────────────────────────────────────────

/**
 * The project as the preview renders it: the files on disk with this session's edits over them. In Edit, a STAGE:
 * the same files with the scene's own page as the app's root, so a scene behind a sign-in, a router or a button is
 * on screen to edit. Nothing of the stage is ever saved; Play renders the real root.
 */
const STAGE_ROOT = '__scene_stage__';
function currentTree({ stage } = {}) {
  const tree = { ...state.project.tree };
  for (const c of model.comps.values()) {
    const base = `components/${c.path}/`;
    tree[`${base}component.json`] = JSON.stringify(c.files.component, null, 2);
    tree[`${base}nodes.json`] = JSON.stringify(c.files.nodes, null, 2);
    tree[`${base}connections.json`] = JSON.stringify(c.files.connections, null, 2);
  }
  if (stage && state.scene && tree['nodegx.project.json']) {
    const c = model.comp(state.scene.key);
    let top = model.node(c.key, state.scene.id);
    while (top?.parent && model.node(c.key, top.parent)) top = model.node(c.key, top.parent);
    // The root is found by node id across every component, so the stage's root gets an id no other node has.
    const swap = (id) => (id === top.id ? STAGE_ROOT : id);
    const files = JSON.parse(JSON.stringify(c.files));
    for (const n of files.nodes.nodes) {
      n.id = swap(n.id);
      if (n.parent) n.parent = swap(n.parent);
      if (n.children) n.children = n.children.map(swap);
    }
    if (files.nodes.visualRoots) files.nodes.visualRoots = files.nodes.visualRoots.map(swap);
    for (const w of files.connections.connections) {
      w.fromId = swap(w.fromId);
      w.toId = swap(w.toId);
    }
    tree[`components/${c.path}/nodes.json`] = JSON.stringify(files.nodes, null, 2);
    tree[`components/${c.path}/connections.json`] = JSON.stringify(files.connections, null, 2);
    const project = JSON.parse(tree['nodegx.project.json']);
    project.rootNodeId = STAGE_ROOT;
    tree['nodegx.project.json'] = JSON.stringify(project, null, 2);
  }
  return tree;
}
function showTree() {
  return currentTree({ stage: state.mode === 'edit' });
}

function findScenes() {
  const out = [];
  for (const c of model.comps.values()) for (const n of c.files.nodes.nodes) if (n.type === T3.scene) out.push({ key: c.key, id: n.id, label: `${c.path} · ${labelOf(n)}` });
  return out;
}

/** The For Each's row template, when it names a component of this project. */
function templateOf(key, node) {
  if (node?.type !== 'For Each') return null;
  return model.byLegacyName(node.parameters?.template) ?? null;
}
function templateRoots(comp) {
  const ns = comp.files.nodes.nodes;
  const roots = comp.files.nodes.visualRoots?.length ? comp.files.nodes.visualRoots : ns.filter((n) => !n.parent).map((n) => n.id);
  return roots.filter((id) => IS3D(ns.find((n) => n.id === id)?.type));
}

let rebuildTimer = 0;
function rebuild() {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(async () => {
    await vp.show(showTree());
    await ensureVisible();
    vp.applyFocus();
    syncViewportSelection();
  }, 120);
}

/** The scene's page may not be the one the app opens on: ask the app's router for it. */
async function ensureVisible() {
  if (!state.scene || vp.engine()) return;
  const comp = model.comp(state.scene.key);
  const routers = [];
  for (const c of model.comps.values()) for (const n of c.files.nodes.nodes) if (n.type === 'Router') routers.push(n.parameters?.name || 'Main');
  for (const r of routers.length ? routers : ['Main']) {
    try {
      vp.win?.Noodl?.Navigation?.navigate(r, comp.legacyName);
    } catch {}
    if (await vp.whenSceneReady(2500)) {
      vp.restoreCamera();
      return;
    }
  }
}

// ── selection ───────────────────────────────────────────────────────────────────────────────────────────────────

function select(sel) {
  state.sel = sel ?? (state.scene ? { key: state.scene.key, id: state.scene.id } : null);
  syncViewportSelection();
  renderOutline();
  renderInspector();
  renderStatusSel();
}

function syncViewportSelection() {
  const sel = state.sel;
  const n = sel && model.node(sel.key, sel.id);
  if (!n || n.type === T3.scene) return vp.select([], null);
  if (n.type === 'For Each') {
    const tpl = templateOf(sel.key, n);
    return vp.select(tpl ? tpl.files.nodes.nodes.filter((x) => IS3D(x.type)).map((x) => x.id) : [], null);
  }
  vp.select([n.id], n.type === T3.light ? n.id : null);
}

/** Which node of the scene's component a picked object belongs to, and whether it can be dragged. */
function resolvePick(nodeId) {
  const key = state.scene.key;
  if (model.node(key, nodeId)) return { key, id: nodeId, row: false };
  for (const n of model.nodes(key)) {
    const tpl = templateOf(key, n);
    if (tpl && tpl.files.nodes.nodes.some((x) => x.id === nodeId)) return { key, id: n.id, row: true, tplKey: tpl.key, tplNode: nodeId };
  }
  return null;
}

function onPick(hit, { alt } = {}) {
  if (!hit) {
    select(null);
    return null;
  }
  if (hit.kind === 'light') {
    const r = resolvePick(hit.node);
    if (!r) return null;
    select({ key: r.key, id: r.id });
    return dragTarget(r.key, r.id);
  }
  const lineage = hit.lineage; // three.js objects, the mesh first, then each 3D Group it is in
  let r = resolvePick(hit.node);
  if (!r) return null;
  if (r.row) {
    select({ key: r.key, id: r.id });
    if (!state.toldRows) {
      state.toldRows = true;
      const fe = model.node(r.key, r.id);
      toast(`That is one row of “${labelOf(fe)}”. Its rows come from data, so they move with the data; open the row in the outline to change how every row looks.`);
    }
    return null;
  }
  // Pressing on something inside the selected 3D Group moves the group; Alt picks the group around the mesh.
  const cur = state.sel;
  const ids = lineage.map((o) => o.userData.nodeId);
  if (cur && cur.key === r.key && ids.includes(cur.id) && cur.id !== r.id) r = { ...r, id: cur.id };
  else if (alt && ids.length > 1 && model.node(r.key, ids[1])) r = { ...r, id: ids[1] };
  else select({ key: r.key, id: r.id });
  const obj = lineage.find((o) => o.userData.nodeId === r.id) ?? lineage[0];
  return dragTarget(r.key, r.id, obj);
}

function dragTarget(key, id, obj) {
  const n = model.node(key, id);
  if (!n) return null;
  // A wired axis takes its value from the graph: the drag leaves it alone and moves the others.
  const locked = ['x', 'y', 'z'].filter((p) => model.wireInto(key, id, p));
  if (locked.length === 3) {
    toast(`${labelOf(n)}’s X, Y and Z are all wired from the graph, so it moves when those values change, not by dragging.`);
    return null;
  }
  if (locked.length) {
    const from = locked.map((p) => labelOf(model.node(key, model.wireInto(key, id, p).fromId))).join(', ');
    say(`${labelOf(n)}’s ${locked.join(', ').toUpperCase()} ${locked.length > 1 ? 'are' : 'is'} wired from ${from}: dragging moves the rest.`);
  }
  if (!obj) {
    const eng = vp.engine();
    eng?.scene.traverse((o) => {
      if (!obj && o.userData?.nodeId === id && !o.userData.editor) obj = o;
    });
  }
  if (!obj) return null;
  return { key, id, obj, locked, start: { x: Number(value(n, 'x')) || 0, y: Number(value(n, 'y')) || 0, z: Number(value(n, 'z')) || 0 } };
}

function onDrag(target, next) {
  for (const [k, v] of Object.entries(next)) if (!target.locked?.includes(k)) setParam(target.key, target.id, k, v, `drag:${target.id}`, { quiet: true });
  renderInspector();
  renderStatusSel();
  renderChrome();
}

function onDragEnd() {
  model.settle();
  renderInspector();
}

function onHover(hit) {
  if (hit.kind === 'light') return labelOf(model.node(state.scene.key, hit.node));
  const r = resolvePick(hit.node);
  if (!r) return null;
  const n = model.node(r.key, r.id);
  return r.row ? `${labelOf(n)} · a row` : labelOf(n);
}

function onStatus(kind, r) {
  $('#busy').hidden = kind !== 'busy';
  if (kind === 'error') say(`The app did not render: ${r?.message ?? r?.status}`, 'bad');
}

// ── edits ───────────────────────────────────────────────────────────────────────────────────────────────────────

function setParam(key, id, name, v, merge, { quiet } = {}) {
  const n = model.node(key, id);
  if (!n) return;
  model.setParam(key, id, name, v, merge ?? `${id}:${name}`);
  const live = v !== undefined ? v : portInfo(n.type, name)?.default;
  if (!vp.liveSet(model.comp(key).legacyName, id, name, live)) rebuild();
  if (!quiet) {
    renderChrome();
    if (name === 'shape' || name === 'kind' || name === 'name') renderOutline();
  }
}

/** Somewhere on the floor no sibling stands, near the middle. */
function freeSpot(key, parent) {
  const taken = (model.node(key, parent)?.children ?? []).map((id) => model.node(key, id)).filter((n) => n && n.type !== T3.light).map((n) => [Number(value(n, 'x')) || 0, Number(value(n, 'z')) || 0]);
  for (let ring = 0; ring < 8; ring++) {
    const steps = ring === 0 ? 1 : ring * 8;
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const x = Math.round(Math.cos(a) * ring * 2 * 2) / 2;
      const z = Math.round(Math.sin(a) * ring * 2 * 2) / 2;
      if (taken.every(([tx, tz]) => Math.hypot(tx - x, tz - z) > 1.6)) return { x, z };
    }
  }
  return { x: 0, z: 0 };
}

function addTile(tileKey) {
  if (!state.scene) return;
  const tile = TILES.find((t) => t.key === tileKey);
  const key = state.scene.key;
  const sel = state.sel && state.sel.key === key ? model.node(key, state.sel.id) : null;
  let parent = state.scene.id;
  if (sel && (sel.type === T3.group || sel.type === T3.scene)) parent = sel.id;
  else if (sel?.parent && model.node(key, sel.parent)?.type === T3.group) parent = sel.parent;
  const params = { ...tile.params };
  if (tile.type === T3.mesh) {
    const used = model.nodes(key).filter((n) => n.type === T3.mesh).length;
    params.colour = COLOURS[used % COLOURS.length];
    if (tile.key !== 'plane') Object.assign(params, freeSpot(key, parent));
  }
  if (tile.type === T3.group) Object.assign(params, freeSpot(key, parent));
  const id = model.addNode(key, { type: tile.type, parent, label: tile.label, parameters: params });
  if (tile.type !== T3.light) model.node(key, id).parameters.name = id;
  rebuild();
  select({ key, id });
  renderChrome();
}

function removeSelected() {
  const sel = state.sel;
  const n = sel && model.node(sel.key, sel.id);
  if (!n || n.type === T3.scene || sel.key !== state.scene.key) return;
  const parent = n.parent;
  model.removeNode(sel.key, sel.id);
  rebuild();
  select(parent && model.node(sel.key, parent)?.type === T3.group ? { key: sel.key, id: parent } : null);
  renderChrome();
}

function duplicateSelected() {
  const sel = state.sel;
  const n = sel && model.node(sel.key, sel.id);
  if (!n || n.type === T3.scene || sel.key !== state.scene.key) return;
  const id = model.duplicate(sel.key, sel.id);
  if (!id) return;
  rebuild();
  select({ key: sel.key, id });
  renderChrome();
}

function useThisView() {
  const v = vp.view();
  if (!v || !state.scene) return;
  const { key, id } = state.scene;
  const r1 = (x) => Math.round(x * 10) / 10;
  let angle = ((v.angle % 360) + 540) % 360 - 180;
  setParam(key, id, 'cameraDistance', r1(v.distance), 'view');
  setParam(key, id, 'cameraHeight', r1(v.height), 'view');
  setParam(key, id, 'cameraAngle', Math.round(angle), 'view');
  model.settle();
  renderInspector();
  toast('The app now opens on this view.');
}

function applyTravel(t) {
  if (!t) return;
  const comp = model.comp(t.key);
  if (onlyParameters(t.before, t.after)) {
    let ok = true;
    for (const [id, name, v] of parameterDiff(t.before, t.after)) {
      const n = t.after.nodes.nodes.find((x) => x.id === id);
      ok = vp.liveSet(comp.legacyName, id, name, v !== undefined ? v : portInfo(n?.type, name)?.default) && ok;
    }
    if (!ok) rebuild();
  } else rebuild();
  if (state.sel && !model.node(state.sel.key, state.sel.id)) state.sel = null;
  select(state.sel);
  renderChrome();
}
function undo() {
  applyTravel(model.undo());
}
function redo() {
  applyTravel(model.redo());
}

async function save() {
  const changes = model.changes();
  if (!changes.length) return;
  $('#save').disabled = true;
  $('#save').textContent = 'Saving…';
  try {
    const r = await post('/api/save', { changes });
    model.markSaved(r.components.filter((c) => r.saved.some((s) => s.key === c.key)));
    state.project.tree = r.tree;
    const n = r.saved.filter((s) => !s.unchanged).length;
    if (r.refused.length) {
      say(r.refused.map((x) => x.message).join(' '), 'bad');
      toast(r.refused.map((x) => x.message).join(' '), true);
    } else say(`Saved ${n} component${n === 1 ? '' : 's'} to ${state.project.dir.split('/').pop()}${r.validation.length ? ` · ${r.validation.length} validation note(s)` : ' · the project validates'}.`, r.validation.length ? '' : 'ok');
  } catch (err) {
    say(`Not saved: ${err.message}`, 'bad');
  }
  renderChrome();
}

async function post(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data;
}

function setMode(mode) {
  state.mode = mode;
  vp.setMode(mode);
  $('#mode-edit').classList.toggle('on', mode === 'edit');
  $('#mode-play').classList.toggle('on', mode === 'play');
  renderHint();
  if (state.scene) rebuild();
  if (mode === 'edit') syncViewportSelection();
}

// ── rendering ───────────────────────────────────────────────────────────────────────────────────────────────────

function renderChrome() {
  const dirty = model.dirtyKeys().length;
  const btn = $('#save');
  btn.disabled = dirty === 0;
  btn.textContent = dirty ? `Save${dirty > 1 ? ` ${dirty}` : ''}` : 'Saved';
  $('#undo').disabled = model.past.length === 0;
  $('#redo').disabled = model.future.length === 0;
}

function renderHint() {
  const el = $('#hint');
  el.innerHTML =
    state.mode === 'edit'
      ? '<span><b>Click</b> select</span><span><b>Drag</b> move</span><span><b>⇧ drag</b> up / down</span><span><b>Drag empty</b> orbit</span><span><b>Wheel</b> zoom</span>'
      : '<span><b>Playing</b> — the app takes your clicks, as it will when it runs</span><span><b>E</b> back to editing</span>';
}

function renderPalette() {
  const root = $('#tiles');
  root.innerHTML = '';
  for (const t of TILES) {
    if (t.gap) {
      root.append(h('div', { class: 'tile-gap' }));
      continue;
    }
    root.append(h('button', { class: 'tile', title: `Add a ${t.label.toLowerCase()} to the scene`, 'data-tile': t.key, onclick: () => addTile(t.key) }, icon(t.key), h('span', {}, t.label)));
  }
}

let dragRow = null;
function renderOutline() {
  const root = $('#outline');
  root.innerHTML = '';
  if (!state.scene) return;
  const walk = (key, id, depth, tpl) => {
    const n = model.node(key, id);
    if (!n) return;
    root.append(outlineRow(key, n, depth, tpl));
    const t = templateOf(key, n);
    if (t) for (const r of templateRoots(t)) walk(t.key, r, depth + 1, true);
    for (const ch of n.children ?? []) walk(key, ch, depth + 1, tpl);
  };
  walk(state.scene.key, state.scene.id, 0, false);
}

function outlineRow(key, n, depth, tpl) {
  const kind = kindOf(n);
  const sel = state.sel && state.sel.key === key && state.sel.id === n.id;
  const t = templateOf(key, n);
  const sub = t ? `↻ ${t.path.split('/').pop()}` : tpl ? 'each row' : '';
  const row = h(
    'div',
    { class: `row${sel ? ' sel' : ''}${tpl ? ' tpl' : ''}`, role: 'treeitem', 'data-node': n.id, 'data-key': key, draggable: !tpl && n.type !== T3.scene ? 'true' : null, onclick: () => select({ key, id: n.id }) },
    icon(kind, 18),
    h('span', { class: 'lbl' }, labelOf(n)),
    sub ? h('span', { class: 'sub' }, sub) : null
  );
  row.style.paddingLeft = `${8 + depth * 14}px`;
  if (tpl) return row;
  const container = n.type === T3.group || n.type === T3.scene;
  row.addEventListener('dragstart', (e) => {
    dragRow = { key, id: n.id };
    row.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', n.id);
  });
  row.addEventListener('dragend', () => {
    dragRow = null;
    row.classList.remove('dragging');
    for (const r of document.querySelectorAll('.drop-into,.drop-before,.drop-after')) r.classList.remove('drop-into', 'drop-before', 'drop-after');
  });
  const where = (e) => {
    const r = row.getBoundingClientRect();
    const f = (e.clientY - r.top) / r.height;
    if (n.type === T3.scene) return 'into';
    if (container) return f < 0.25 ? 'before' : f > 0.75 ? 'after' : 'into';
    return f < 0.5 ? 'before' : 'after';
  };
  row.addEventListener('dragover', (e) => {
    if (!dragRow || dragRow.key !== key || dragRow.id === n.id) return;
    e.preventDefault();
    row.classList.remove('drop-into', 'drop-before', 'drop-after');
    row.classList.add(`drop-${where(e)}`);
  });
  row.addEventListener('dragleave', () => row.classList.remove('drop-into', 'drop-before', 'drop-after'));
  row.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!dragRow || dragRow.key !== key) return;
    const w = where(e);
    let ok;
    if (w === 'into') ok = model.reparent(key, dragRow.id, n.id);
    else {
      const p = model.node(key, n.parent);
      const at = p.children.indexOf(n.id) + (w === 'after' ? 1 : 0);
      ok = model.reparent(key, dragRow.id, p.id, at);
    }
    if (!ok) return toast('A group cannot go inside itself.');
    rebuild();
    select({ key, id: dragRow.id });
    renderChrome();
  });
  return row;
}

function renderStatusSel() {
  const sel = state.sel;
  const n = sel && model.node(sel.key, sel.id);
  const el = $('#status-sel');
  if (!n || n.type === T3.scene || n.type === 'For Each') return (el.textContent = n ? labelOf(n) : '');
  const f = (p) => (Number(value(n, p)) || 0).toFixed(2);
  el.textContent = `${labelOf(n)}  ·  x ${f('x')}  y ${f('y')}  z ${f('z')}`;
}

// ── the inspector ───────────────────────────────────────────────────────────────────────────────────────────────

function renderInspector() {
  const root = $('#inspector');
  const active = document.activeElement;
  const keep = active && root.contains(active) && active.dataset.port ? { port: active.dataset.port, start: active.selectionStart } : null;
  root.innerHTML = '';
  const sel = state.sel;
  const n = sel && model.node(sel.key, sel.id);
  if (!n) {
    root.append(keysHelp());
    return;
  }
  const { key } = sel;
  const kind = kindOf(n);
  const comp = model.comp(key);

  // The head: the name a person calls it, where it sits, and what can be done to it.
  const title = h('input', { value: labelOf(n), 'aria-label': 'Name', 'data-port': '__label' });
  title.addEventListener('input', () => {
    model.rename(key, n.id, title.value);
    renderOutline();
    renderChrome();
  });
  title.addEventListener('keydown', (e) => e.key === 'Enter' && title.blur());
  const meta = h('div', { class: 'insp-meta' }, h('span', {}, displayType(n.type)));
  const chain = [];
  for (let p = n.parent && model.node(key, n.parent); p; p = p.type === T3.scene ? null : p.parent && model.node(key, p.parent)) chain.unshift(p);
  if (key !== state.scene.key) meta.append(h('span', {}, '· the row template in'), h('span', { class: 'crumb', onclick: () => select(null) }, comp.path));
  else if (chain.length && n.type !== T3.scene) {
    meta.append(h('span', {}, '· in'));
    chain.forEach((p, i) => {
      if (i) meta.append(h('span', {}, '›'));
      meta.append(h('span', { class: 'crumb', onclick: () => select({ key, id: p.id }) }, labelOf(p)));
    });
  }
  const head = h('div', { class: 'insp-head' }, h('div', { class: 'insp-title' }, icon(kind, 22), title), meta);
  if (n.type !== T3.scene && key === state.scene.key && n.type !== 'For Each') {
    head.append(
      h(
        'div',
        { class: 'insp-actions' },
        h('button', { class: 'btn', onclick: duplicateSelected, title: 'Duplicate (⌘D)', html: `${ICONS.copy}<span>Duplicate</span>` }),
        h('button', { class: 'btn danger', onclick: removeSelected, title: 'Delete (⌫)', html: `${ICONS.trash}<span>Delete</span>` })
      )
    );
  }
  if (n.type === T3.scene) head.append(h('div', { class: 'insp-actions' }, h('button', { class: 'btn accent', onclick: useThisView, title: 'Make the orbit you have now the camera the app opens with', html: `${ICONS.camera}<span>Use this view</span>` })));
  root.append(head);

  if (n.type === 'For Each') {
    const t = templateOf(key, n);
    const src = model.wireInto(key, n.id, 'items');
    const from = src && model.node(key, src.fromId);
    root.append(
      h(
        'div',
        { class: 'sect' },
        h('h4', {}, 'One per row'),
        h('p', { class: 'note', html: `Draws <b>${t ? t.path : n.parameters?.template ?? '?'}</b> once for every row of <b>${from ? labelOf(from) : 'its items'}</b>. A bar chart is this: change the data and the scene follows.` }),
        t ? h('p', { class: 'note' }, 'To change how every row looks, pick the row in the outline (the lines in italics).') : null
      )
    );
    return;
  }

  for (const [title2, ports] of LAYOUT[n.type] ?? []) {
    const visible = ports.filter((p) => shown(n, p) && portInfo(n.type, p));
    if (!visible.length) continue;
    const sect = h('div', { class: 'sect' }, h('h4', {}, title2));
    const done = new Set();
    for (const p of visible) {
      if (done.has(p)) continue;
      const triple = TRIPLES.find((t) => t[0] === p && t.every((q) => visible.includes(q)));
      if (triple) {
        const row = h('div', { class: 'triple' });
        triple.forEach((q, i) => {
          done.add(q);
          row.append(numberBox(key, n, q, i === 0 ? (p === 'x' ? 'x' : 'n') : '', p === 'x' ? 'xyz'[i] : 'WHD'[i]));
        });
        sect.append(row);
        const wired = triple.map((q) => wireNote(key, n, q)).filter(Boolean);
        for (const wn of wired) sect.append(wn);
        continue;
      }
      done.add(p);
      sect.append(field(key, n, p));
    }
    root.append(sect);
  }
  if (keep) {
    const el = root.querySelector(`[data-port="${keep.port}"]`);
    if (el) {
      el.focus();
      try {
        el.setSelectionRange(keep.start, keep.start);
      } catch {}
    }
  }
}

function shown(n, p) {
  if (n.type === T3.light) {
    const kind = value(n, 'kind');
    if (p === 'ground') return kind === 'sky';
    if ('xyz'.includes(p)) return kind !== 'sky';
  }
  if (p === 'spinSpeed') return !!value(n, 'spin');
  return true;
}

function wireNote(key, n, p) {
  const w = model.wireInto(key, n.id, p);
  if (!w) return null;
  const from = model.node(key, w.fromId);
  const what = from?.type === 'Component Inputs' ? `the row’s ${w.fromProperty}` : `${labelOf(from)} · ${w.fromProperty}`;
  return h('div', { class: 'wire-note' }, `${portInfo(n.type, p)?.displayName ?? p} ← ${what}`);
}

function numberBox(key, n, p, axisClass, axisText) {
  const info = portInfo(n.type, p);
  const wired = !!model.wireInto(key, n.id, p);
  const raw = value(n, p);
  const isUnit = raw && typeof raw === 'object';
  const num = isUnit ? raw.value : Number(raw) || 0;
  const input = h('input', { value: fmt(num), 'data-port': p, inputmode: 'decimal', disabled: wired, title: info?.description ?? '' });
  const set = (v, merge) => setParam(key, n.id, p, isUnit ? { ...raw, value: v } : v, merge);
  input.addEventListener('change', () => {
    const v = Number(input.value);
    if (Number.isFinite(v)) set(v);
    renderInspector();
    renderStatusSel();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const step = (STEP[p] ?? 0.1) * (e.shiftKey ? 10 : 1) * (e.key === 'ArrowUp' ? 1 : -1);
      const v = round((Number(input.value) || 0) + step, STEP[p] ?? 0.1);
      input.value = fmt(v);
      set(v, `${n.id}:${p}`);
      renderStatusSel();
    }
  });
  const ax = h('span', { class: `ax ${axisClass || 'n'}`, title: 'Drag sideways to change' }, axisText);
  if (!wired) scrubber(ax, () => Number(input.value) || 0, (v) => {
    input.value = fmt(v);
    set(v, `scrub:${n.id}:${p}`);
    renderStatusSel();
  }, STEP[p] ?? 0.1);
  return h('div', { class: `num${wired ? ' wired' : ''}` }, ax, input, isUnit ? h('span', { class: 'unit' }, raw.unit) : null);
}

function field(key, n, p) {
  const info = portInfo(n.type, p);
  const label = info?.displayName ?? p;
  const t = portType(info);
  const wired = model.wireInto(key, n.id, p);
  const v = value(n, p);
  const lab = h('label', { title: info?.description ?? '' }, label);
  let control;
  if (p === 'shape') {
    const enums = info.type.enums ?? [];
    control = h('div', { class: 'shapes' }, enums.map((e) => h('button', { class: v === e.value ? 'on' : '', title: e.label, html: ICONS[e.value] ?? e.label, onclick: () => (setParam(key, n.id, p, e.value), renderInspector()) })));
    return h('div', { class: 'shape-field' }, control, wireNote(key, n, p));
  }
  if (t === 'enum') {
    control = h('div', { class: 'segs' }, (info.type.enums ?? []).map((e) => h('button', { class: v === e.value ? 'on' : '', onclick: () => (setParam(key, n.id, p, e.value), renderInspector(), renderOutline()), html: `${ICONS[e.value] ? `<span style="color:${TINTS[e.value] ?? 'inherit'};display:inline-flex">${ICONS[e.value].replace(/width="24" height="24"/, 'width="16" height="16"')}</span>` : ''}${e.label}` })));
  } else if (t === 'boolean') {
    const on = v === true || v === 'true';
    control = h('div', {}, h('button', { class: `toggle${on ? ' on' : ''}`, role: 'switch', 'aria-checked': String(on), 'aria-label': label, disabled: !!wired, onclick: () => (setParam(key, n.id, p, !on), renderInspector()) }));
  } else if (t === 'color') {
    const cur = String(v ?? '#ffffff');
    const pick = h('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(cur) ? cur : '#ffffff', disabled: !!wired, title: 'Any colour' });
    pick.addEventListener('input', () => setParam(key, n.id, p, pick.value, `${n.id}:${p}`));
    pick.addEventListener('change', () => renderInspector());
    const sws = (p === 'background' ? ['#14181f', '#0b1020', '#1d2b3a', '#f1f2f6', '#fdf6e3', '#2d1b33'] : p === 'ground' ? ['#444444', '#2d3436', '#3d2b1f', '#1e3a2a'] : COLOURS).map((c) =>
      h('button', { class: `sw${c.toLowerCase() === cur.toLowerCase() ? ' on' : ''}`, style: `background:${c}`, title: c, disabled: !!wired, onclick: () => (setParam(key, n.id, p, c), renderInspector()) })
    );
    control = h('div', { class: 'colours' }, sws, pick);
    if (p === 'colour' && n.type === T3.mesh) return h('div', {}, control, wireNote(key, n, p));
  } else if (t === 'number' && RANGE[p]) {
    const [lo, hi] = RANGE[p];
    const box = numberBox(key, n, p, 'n', '');
    const range = h('input', { type: 'range', min: lo, max: hi, step: STEP[p] ?? 0.1, value: Number(v) || 0, disabled: !!wired, 'aria-label': label });
    range.addEventListener('input', () => {
      setParam(key, n.id, p, Number(range.value), `range:${n.id}:${p}`);
      box.querySelector('input').value = fmt(Number(range.value));
    });
    control = h('div', { class: 'slider' }, range, box);
    lab.className = '';
  } else if (t === 'number' || (v && typeof v === 'object' && 'unit' in v)) {
    control = numberBox(key, n, p, 'n', '');
    const ax = control.querySelector('.ax');
    ax.remove();
    lab.className = 'scrub';
    if (!wired) scrubber(lab, () => Number(control.querySelector('input').value) || 0, (nv) => {
      control.querySelector('input').value = fmt(nv);
      const raw = value(n, p);
      setParam(key, n.id, p, raw && typeof raw === 'object' ? { ...raw, value: nv } : nv, `scrub:${n.id}:${p}`);
    }, STEP[p] ?? (p === 'height' ? 10 : 0.1));
  } else {
    control = h('input', { class: 'text', value: v ?? '', 'data-port': p, disabled: !!wired, placeholder: p === 'name' ? 'what Tapped Name says' : '' });
    control.addEventListener('input', () => setParam(key, n.id, p, control.value, `${n.id}:${p}`));
  }
  const out = h('div', { class: 'field' }, lab, control);
  const wn = wireNote(key, n, p);
  if (wn) out.append(wn);
  if (p === 'name') out.append(h('div', { class: 'help' }, 'Tapped Name on the Scene says this when it is tapped.'));
  return out;
}

function scrubber(el, get, set, step) {
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const x0 = e.clientX;
    const v0 = get();
    el.setPointerCapture(e.pointerId);
    const move = (ev) => set(round(v0 + (ev.clientX - x0) * step * (ev.shiftKey ? 10 : 1) * 0.5, step));
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      model.settle();
      renderInspector();
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
  });
}

const round = (v, step) => {
  const d = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;
  return Math.round(v * 10 ** d) / 10 ** d;
};
const fmt = (v) => String(Math.round(v * 100) / 100);

function keysHelp() {
  return h('div', { class: 'keys', html: '<kbd>⌫</kbd> delete · <kbd>⌘D</kbd> duplicate<br><kbd>⌘Z</kbd> undo · <kbd>⇧⌘Z</kbd> redo · <kbd>⌘S</kbd> save<br><kbd>E</kbd> edit · <kbd>P</kbd> play · <kbd>F</kbd> fill the view<br><kbd>Esc</kbd> select the scene' });
}

// ── messages ────────────────────────────────────────────────────────────────────────────────────────────────────

function say(text, cls = '') {
  const el = $('#status-msg');
  el.textContent = text;
  el.className = cls;
}
let toastTimer = 0;
function toast(text, bad) {
  const el = $('#toast');
  el.textContent = text;
  el.className = `toast${bad ? ' bad' : ''}`;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 5200);
}

// ── an app with no 3D scene yet ─────────────────────────────────────────────────────────────────────────────────

function renderEmpty() {
  const el = $('#empty');
  el.innerHTML = '';
  if (state.scene) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  const pages = [...model.comps.values()].filter((c) => c.files.nodes.nodes.some((n) => n.type === 'Page'));
  const pick = h('select', { id: 'page-pick' }, pages.map((c) => h('option', { value: c.key }, c.path)));
  const kitWord = state.project.kit.installed ? '' : ' (and three-kit into its noodl_modules)';
  el.append(
    h(
      'div',
      { class: 'empty-card' },
      h('div', { class: 'big', html: ICONS.scene.replace(/width="24" height="24"/, 'width="44" height="44"') }),
      h('h2', {}, 'No 3D scene in this app yet'),
      h('p', {}, `Pick a page and a 3D window goes on it: a Scene with a sky, a sun and a box to start from${kitWord}.`),
      pages.length
        ? h('div', { class: 'row-pick' }, pick, h('button', { class: 'btn primary', id: 'add-scene', onclick: () => addScene(pick.value) }, 'Add a 3D scene'))
        : h('p', {}, 'This project has no page to put one on.')
    )
  );
}

async function addScene(pageKey) {
  try {
    if (!state.project.kit.installed) {
      say('Adding three-kit to the project…');
      const r = await post('/api/add-kit', {});
      state.project.tree = r.tree;
      state.project.kit = r.kit;
      toast('three-kit is in the project now (noodl_modules/three-kit), the same copy `npx @nodegx/three-kit add` makes.');
    }
    const page = model.nodes(pageKey).find((n) => n.type === 'Page');
    const scene = model.addNode(pageKey, { type: T3.scene, parent: page.id, label: '3D scene', parameters: { height: { value: 420, unit: 'px' } } });
    model.addNode(pageKey, { type: T3.light, parent: scene, label: 'Sky', parameters: { kind: 'sky', intensity: 0.7 } });
    model.addNode(pageKey, { type: T3.light, parent: scene, label: 'Sun', parameters: { kind: 'sun', intensity: 1.2, x: 5, y: 10, z: 5 } });
    const box = model.addNode(pageKey, { type: T3.mesh, parent: scene, label: 'Box', parameters: { shape: 'box', sitOnFloor: true, colour: COLOURS[0] } });
    model.node(pageKey, box).parameters.name = box;
    state.scenes = findScenes();
    setScene(state.scenes.find((s) => s.key === pageKey && s.id === scene));
    renderScenePick();
    renderEmpty();
    await vp.show(showTree());
    state.library = vp.preview.nodeLibrary;
    await ensureVisible();
    vp.applyFocus();
    select(null);
    renderChrome();
    say('A 3D scene is on the page. Save writes it into the project.');
  } catch (err) {
    toast(`Could not add the scene: ${err.message}`, true);
  }
}

function setScene(scene) {
  state.scene = scene ?? null;
  vp.sceneId = state.scene?.id ?? null;
  vp.camera = null;
}

function renderScenePick() {
  const sp = $('#scene-pick');
  sp.innerHTML = '';
  for (const s of state.scenes) sp.append(h('option', { value: `${s.key}#${s.id}`, selected: state.scene && s.key === state.scene.key && s.id === state.scene.id }, s.label));
  sp.hidden = state.scenes.length === 0;
}

// ── start ───────────────────────────────────────────────────────────────────────────────────────────────────────

function bindChrome() {
  $('#brand-mark').innerHTML = ICONS.box.replace(/width="24" height="24"/, 'width="20" height="20"');
  $('#undo').innerHTML = ICONS.undo;
  $('#redo').innerHTML = ICONS.redo;
  $('#mode-edit').innerHTML = `${ICONS.edit}<span>Edit</span>`;
  $('#mode-play').innerHTML = `${ICONS.play}<span>Play</span>`;
  $('#tool-focus').innerHTML = `${ICONS.focus}<span>Fill the view</span>`;
  $('#tool-snap').innerHTML = `${ICONS.grid}<span>Snap</span>`;
  $('#undo').onclick = undo;
  $('#redo').onclick = redo;
  $('#save').onclick = save;
  $('#mode-edit').onclick = () => setMode('edit');
  $('#mode-play').onclick = () => setMode('play');
  $('#tool-focus').onclick = () => {
    vp.setFocus(!vp.focus);
    $('#tool-focus').classList.toggle('on', vp.focus);
  };
  $('#tool-snap').onclick = () => {
    vp.snap = !vp.snap;
    $('#tool-snap').classList.toggle('on', vp.snap);
  };
  $('#scene-pick').onchange = (e) => {
    const [key, id] = e.target.value.split('#');
    setScene(state.scenes.find((s) => s.key === key && s.id === id));
    rebuild();
    select(null);
  };
  window.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) && document.activeElement.type !== 'range' && document.activeElement.type !== 'color';
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 's') {
      e.preventDefault();
      save();
      return;
    }
    if (typing) return;
    if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      e.shiftKey ? redo() : undo();
    } else if (mod && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      redo();
    } else if (mod && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      duplicateSelected();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      removeSelected();
    } else if (e.key === 'Escape') select(null);
    else if (!mod && e.key.toLowerCase() === 'p') setMode('play');
    else if (!mod && e.key.toLowerCase() === 'e') setMode('edit');
    else if (!mod && e.key.toLowerCase() === 'f') $('#tool-focus').click();
  });
  window.addEventListener('beforeunload', (e) => {
    if (model.dirtyKeys().length) e.preventDefault();
  });
}

async function start() {
  bindChrome();
  renderPalette();
  renderHint();
  const project = await (await fetch('/api/project')).json();
  if (!project.dir) return renderOpen();
  await openPayload(project);
}

/** No project yet: a folder to open, or the demo. */
function renderOpen() {
  say('Open a NodeGX project, or try the demo.');
  const el = $('#empty');
  el.hidden = false;
  el.innerHTML = '';
  const path = h('input', { class: 'text', id: 'open-path', placeholder: '/path/to/your/nodegx/project', style: 'flex:1' });
  const go = async (url, body) => {
    try {
      el.querySelectorAll('button').forEach((b) => (b.disabled = true));
      await openPayload(await post(url, body));
    } catch (err) {
      toast(err.message, true);
      el.querySelectorAll('button').forEach((b) => (b.disabled = false));
    }
  };
  path.addEventListener('keydown', (e) => e.key === 'Enter' && go('/api/open', { dir: path.value.trim() }));
  el.append(
    h(
      'div',
      { class: 'empty-card' },
      h('div', { class: 'big', html: ICONS.scene.replace(/width="24" height="24"/, 'width="44" height="44"') }),
      h('h2', {}, 'The 3D scenes in your app'),
      h('p', {}, 'Open a NodeGX project folder. If it has no 3D scene yet, you can put one on any page.'),
      h('div', { class: 'row-pick' }, path, h('button', { class: 'btn primary', id: 'open-go', onclick: () => go('/api/open', { dir: path.value.trim() }) }, 'Open')),
      h('p', { style: 'margin:18px 0 0' }, h('button', { class: 'btn accent', id: 'open-demo', onclick: () => go('/api/demo', {}) }, 'Try the demo'), ' a bar chart, a ball and a robot, in a fresh copy')
    )
  );
}

async function openPayload(project) {
  state.project = project;
  $('#proj-name').textContent = project.name;
  document.title = `${project.name} · NodeGX Scene`;
  model.load(project.components);
  state.scenes = findScenes();
  setScene(state.scenes[0] ?? null);
  renderScenePick();
  await vp.mount();
  const r = await vp.show(showTree());
  state.library = vp.preview.nodeLibrary;
  if (r.status !== 'ok') say(`The app did not render: ${r.message ?? r.status}`, 'bad');
  else say(state.scene ? `${project.name} is running. Edits reach it as you make them; Save writes them into the project.` : `${project.name} is running. It has no 3D scene yet.`, 'ok');
  if (state.scene && !state.project.kit.installed) toast('This project uses three-kit nodes but has no noodl_modules/three-kit folder, so its scene cannot draw.', true);
  await ensureVisible();
  vp.applyFocus();
  renderEmpty();
  select(null);
  renderChrome();
  state.ready = true;
}

start().catch((err) => {
  console.error(err);
  say(`The editor did not start: ${err.message}`, 'bad');
});
