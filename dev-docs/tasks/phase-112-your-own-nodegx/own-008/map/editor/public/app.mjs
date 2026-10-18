// The map editor's page: loads the project into the model, draws it as a 3D map, shows the real
// app beside it (@nodegx/preview, in the page), and turns clicks into the model's changes. Save
// sends the changed components to the server, which writes them through the kit's store.

import { ProjectModel, MapRefusal } from '/core/model.mjs';
import { MapView, shortType } from '/map3d.mjs';

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const model = new ProjectModel();
const ui = {
  project: null, // { dir, name, formatVersion }
  tree: {}, // the project's files as last read or saved: path → text
  selection: null, // { key, id }
  focusKey: null,
  wiring: null, // { key, from?: { node, port }, to?: { node, port } }
  wiringTarget: null, // { key, id }: the other end, picked on the map
  reparenting: null, // { key, id }
  adding: false,
  addFilter: '',
  addInside: false,
  specTypes: [],
  library: null, // the runtime's node library, from the preview: type → { category, ports }
  compact: new Map(), // `${key}|${id}` → { in: {name: type}, out: {name: type} } from node-spec
  detail: new Map() // `${key}|${id}|${params}` → detailed port list
};

// --- what a node is and which ports it has -------------------------------------------------

const VISUAL_TYPES = /^(Group|Text|Image|Video|Circle|Icon|Columns|Page|Page Stack|Router|net\.noodl\.(controls|visual)\..*)$/;
const DATA_TYPES = /^(Variable2|Set Variable|Model2|NewModel|SetModelProperties|Collection2|Collection.*|DbCollection2|DbModel2|.*DbModel.*|Static Data|Filter Collection|Map Collection|net\.noodl\.user\..*|Cloud File|Upload File|Sign File URL)$/;
const JS_TYPES = /^(JavaScriptFunction|Javascript2|Expression|Logic Builder|CSS Definition)$/;

function categoryOf(key, node) {
  const t = node.type ?? '';
  if (t.startsWith('/') || t === 'Component Inputs' || t === 'Component Outputs') return 'component';
  if (JS_TYPES.test(t)) return 'javascript';
  const lib = ui.library?.get(t);
  if (lib?.category) {
    const c = lib.category.toLowerCase();
    if (c === 'visual') return 'visual';
    if (/data|cloud|variable/.test(c)) return 'data';
    if (/javascript|customcode/.test(c)) return 'javascript';
    if (/component/.test(c)) return 'component';
    return 'logic';
  }
  if (VISUAL_TYPES.test(t) || node.children || node.parent !== undefined) return 'visual';
  if (DATA_TYPES.test(t)) return 'data';
  return 'logic';
}

/** The ports a component instance has: its Component Inputs' and Component Outputs' ports. */
function instancePorts(type) {
  const target = model.componentForType(type);
  if (!target) return null;
  const inputs = [];
  const outputs = [];
  for (const n of target.files.nodes.nodes) {
    if (n.type === 'Component Inputs') for (const p of n.ports ?? []) inputs.push({ name: p.name, type: p.type ?? '*', plug: 'input' });
    if (n.type === 'Component Outputs') for (const p of n.ports ?? []) outputs.push({ name: p.name, type: p.type ?? '*', plug: 'output' });
  }
  return { inputs, outputs, target };
}

function ownPorts(node) {
  // Component Inputs hands its ports OUT into the component; Component Outputs takes them IN.
  if (node.type === 'Component Inputs') return { inputs: [], outputs: (node.ports ?? []).map((p) => ({ name: p.name, type: p.type ?? '*' })) };
  if (node.type === 'Component Outputs') return { inputs: (node.ports ?? []).map((p) => ({ name: p.name, type: p.type ?? '*' })), outputs: [] };
  return null;
}

/** The kind of one port, for colouring wires: 'signal' or a value type. */
function portTypeOf(key, nodeId, port, plug) {
  const node = model.node(key, nodeId);
  if (!node) return 'data';
  const own = ownPorts(node);
  if (own) return (plug === 'output' ? own.outputs : own.inputs).find((p) => p.name === port)?.type ?? 'data';
  const inst = node.type?.startsWith('/') ? instancePorts(node.type) : null;
  if (inst) return (plug === 'output' ? inst.outputs : inst.inputs).find((p) => p.name === port)?.type ?? 'data';
  const c = ui.compact.get(`${key}|${nodeId}`);
  return (plug === 'output' ? c?.out : c?.in)?.[port] ?? 'data';
}

/** What node-spec needs to draw a node's ports beyond its params: its wires and the project's component interfaces. */
function portContext(key, node) {
  const wires = model.wires(key);
  const components = {};
  for (const c of model.components.values()) {
    const inst = instancePorts(c.legacyName);
    const toMap = (list) => Object.fromEntries(list.map((p) => [p.name, { type: p.type }]));
    components[c.legacyName] = { inputs: toMap(inst.inputs), outputs: toMap(inst.outputs) };
  }
  return {
    wired: [...new Set(wires.filter((w) => w.toId === node.id).map((w) => w.toProperty))],
    wiredOutputs: [...new Set(wires.filter((w) => w.fromId === node.id).map((w) => w.fromProperty))],
    instancePorts: node.ports ?? [],
    components
  };
}

async function loadCompactPorts(keys) {
  const items = [];
  const ids = [];
  for (const key of keys) {
    for (const n of model.nodes(key)) {
      if (n.type?.startsWith('/') || ownPorts(n)) continue;
      items.push({ type: n.type, parameters: n.parameters ?? {}, context: { wired: [], wiredOutputs: [], instancePorts: n.ports ?? [] } });
      ids.push(`${key}|${n.id}`);
    }
  }
  if (!items.length) return;
  const res = await post('/api/ports', { items });
  res.forEach((ports, i) => {
    if (!ports) return ui.compact.delete(ids[i]);
    const c = { in: {}, out: {} };
    for (const [name, plug, type] of ports) (plug === 'output' ? c.out : c.in)[name] = type;
    ui.compact.set(ids[i], c);
  });
}

/** Every port of a node, in and out, with where it came from, plus any port its wires use that no list has. */
async function portsFor(key, node) {
  let inputs = [];
  let outputs = [];
  let source = 'none';
  let partial;
  const own = ownPorts(node);
  const inst = node.type?.startsWith('/') ? instancePorts(node.type) : null;
  if (own) {
    ({ inputs, outputs } = own);
    source = 'this node’s own ports';
  } else if (inst) {
    ({ inputs, outputs } = inst);
    source = `the ports of ${inst.target.key}`;
  } else {
    const cacheKey = `${key}|${node.id}|${JSON.stringify(node.parameters ?? {})}|${model.wires(key).length}`;
    let r = ui.detail.get(cacheKey);
    if (!r) {
      r = await post('/api/ports', { type: node.type, parameters: node.parameters ?? {}, context: portContext(key, node) });
      ui.detail.set(cacheKey, r);
    }
    if (r.known) {
      inputs = r.ports.filter((p) => p.plug === 'input');
      outputs = r.ports.filter((p) => p.plug === 'output');
      source = 'node-spec';
      partial = r.partial;
    } else if (ui.library?.get(node.type)?.ports?.length) {
      const ports = ui.library.get(node.type).ports;
      inputs = ports.filter((p) => p.plug === 'input' || p.plug === 'input/output');
      outputs = ports.filter((p) => p.plug === 'output' || p.plug === 'input/output');
      source = 'the runtime’s node library';
    }
  }
  const wires = model.wires(key);
  const has = (list, name) => list.some((p) => p.name === name);
  for (const w of wires) {
    if (w.toId === node.id && !has(inputs, w.toProperty)) inputs.push({ name: w.toProperty, type: '?', unlisted: true });
    if (w.fromId === node.id && !has(outputs, w.fromProperty)) outputs.push({ name: w.fromProperty, type: '?', unlisted: true });
  }
  return { inputs, outputs, source, partial };
}

// --- talking to the server ----------------------------------------------------------------

async function post(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? `${url} answered ${r.status}`);
  return j;
}

async function loadProject(payload) {
  if (!payload.dir) {
    $('#open-dialog').showModal();
    return;
  }
  ui.project = { dir: payload.dir, name: payload.name, formatVersion: payload.formatVersion };
  ui.tree = payload.tree;
  ui.selection = null;
  ui.focusKey = null;
  ui.compact.clear();
  ui.detail.clear();
  model.load(payload.components);
  $('#project-name').textContent = payload.name;
  $('#project-dir').textContent = payload.dir;
  document.title = `${payload.name} — NodeGX map`;
  $('#goto-list').innerHTML = model.keys().map((k) => `<option value="${esc(k)}"></option>`).join('');
  await loadCompactPorts(model.keys()).catch((e) => toast(`Could not read the node ports: ${e.message}`, 'bad'));
  map.build();
  map.overview();
  renderPanel();
  updatePreview(true);
}

async function save() {
  const changes = model.changes();
  if (!changes.length) return toast('Nothing to save: the files already hold every change.');
  $('#btn-save').disabled = true;
  try {
    const r = await post('/api/save', { changes });
    for (const s of r.saved) model.saved(s.key, s.revision);
    ui.tree = r.tree;
    const wrote = r.saved.filter((s) => !s.unchanged).length;
    const lines = [];
    if (wrote) lines.push(`Saved ${wrote} component${wrote === 1 ? '' : 's'} into ${ui.project.dir}.`);
    if (r.saved.length - wrote) lines.push(`${r.saved.length - wrote} came back to what the files already held: nothing written for them.`);
    for (const f of r.refused) lines.push(`Not saved: ${f.message}`);
    if (r.validation.length) lines.push(`The kit's validator reports ${r.validation.length} problem(s): ${r.validation.slice(0, 3).join(' ')}`);
    else lines.push('The kit’s validator reads every file clean.');
    if (changes.some((c) => c.key.includes('#__cloud__')) && wrote) lines.push('A cloud function changed: the app hears it only after it is deployed (ask your agent to run deploy_cloud_functions).');
    toast(lines.join('\n'), r.refused.length || r.validation.length ? 'bad' : 'good', 7000);
  } catch (e) {
    toast(`Save failed: ${e.message}`, 'bad');
  } finally {
    updateButtons();
  }
}

/** Someone else changed the files (an agent, the NodeGX editor): take their version of every component not changed here. */
async function watchDisk() {
  if (!ui.project) return;
  try {
    const revs = await (await fetch('/api/revisions')).json();
    const stale = Object.entries(revs).filter(([k, r]) => model.components.has(k) && model.component(k).revision !== r);
    const added = Object.keys(revs).filter((k) => !model.components.has(k));
    if (!stale.length && !added.length) return;
    const payload = await (await fetch('/api/project')).json();
    ui.tree = payload.tree;
    if (added.length) {
      toast(`${added.length} component(s) were added on disk; reloading the map.`);
      if (!model.dirtyCount()) return loadProject(payload);
    }
    const replaced = model.refresh(payload.components);
    if (replaced.length) toast(`Changed on disk, now shown: ${replaced.join(', ')}`);
    const conflicts = stale.filter(([k]) => model.component(k).dirty).map(([k]) => k);
    if (conflicts.length) {
      banner(`Changed on disk while you have unsaved changes here: ${conflicts.join(', ')}. Saving them will be refused, not overwrite the other change.`, 'warn');
      const take = document.createElement('button');
      take.textContent = 'Drop my changes there, load theirs';
      take.onclick = () => {
        const done = model.refresh(payload.components, { discard: conflicts });
        banner(null);
        toast(`Loaded from disk: ${done.join(', ')}. Your other changes are still here, unsaved.`);
      };
      $('#banner').appendChild(take);
    }
  } catch {
    /* the server is gone; the next poll tries again */
  }
}

// --- the map -------------------------------------------------------------------------------

const map = new MapView($('#map'), model, { categoryOf, portTypeOf });

map.on('click', (hit, e) => {
  if (ui.wiring) {
    if (!hit?.card) return;
    if (hit.card.key !== ui.wiring.key) return toast('A wire stays inside its component. To reach another component, wire to a Component Outputs here and from its instance there.', 'bad');
    ui.wiringTarget = hit.card;
    map.select({ key: hit.card.key, id: (ui.wiring.from ?? ui.wiring.to).node });
    renderPanel();
    return;
  }
  if (ui.reparenting) {
    if (!hit?.card) return;
    const r = ui.reparenting;
    ui.reparenting = null;
    banner(null);
    if (hit.card.key !== r.key) return toast('A node can only go inside a node of its own component.', 'bad');
    act(() => model.reparent(r.key, r.id, hit.card.id), `Put inside ${label(r.key, hit.card.id)}.`);
    return;
  }
  if (hit?.card) select(hit.card.key, hit.card.id);
  else if (hit?.plate) {
    ui.selection = null;
    ui.focusKey = hit.plate;
    map.select(null);
    map.focusComponent(hit.plate);
    renderPanel();
  } else if (!e.shiftKey) {
    ui.selection = null;
    map.select(null);
    renderPanel();
  }
});

map.on('move', (card, xy) => {
  act(() => model.move(card.key, card.id, xy.x, xy.y));
});

map.on('hover', (hit) => {
  const el = $('#hover');
  if (!hit?.card) return (el.hidden = true);
  const n = model.node(hit.card.key, hit.card.id);
  el.hidden = false;
  el.innerHTML = `${esc(n.label || shortType(n.type))} <span class="muted">${esc(shortType(n.type))} · ${esc(hit.card.key)}</span>`;
});
$('#map').addEventListener('pointermove', (e) => {
  const el = $('#hover');
  const r = $('#stage').getBoundingClientRect();
  el.style.left = `${e.clientX - r.left + 14}px`;
  el.style.top = `${e.clientY - r.top + 14}px`;
});

function select(key, id, fly = false) {
  ui.selection = { key, id };
  ui.focusKey = key;
  ui.wiringTarget = null;
  map.select(ui.selection);
  if (fly) map.flyToNode(key, id);
  renderPanel();
  highlightInPreview();
}

function label(key, id) {
  const n = model.node(key, id);
  return n ? n.label || shortType(n.type) : id;
}

/** Runs one change; a refusal is said, not thrown. */
function act(fn, message) {
  try {
    const r = fn();
    if (message) toast(message);
    return r;
  } catch (e) {
    toast(e instanceof MapRefusal ? e.message : `That did not work: ${e.message}`, 'bad');
    return undefined;
  }
}

model.onChange(async (ev) => {
  if (ev.kind === 'change' || ev.kind === 'undo' || ev.kind === 'refresh') {
    const keys = ev.keys ?? [ev.key];
    ui.detail.clear();
    await loadCompactPorts(keys).catch(() => {});
    for (const k of keys) map.redraw(k);
    if (ui.selection && !model.node(ui.selection.key, ui.selection.id)) {
      ui.selection = null;
      map.select(null);
    }
    renderPanel();
    updatePreview();
  }
  updateButtons();
});

// --- the panel -----------------------------------------------------------------------------

let renderSeq = 0;
async function renderPanel() {
  const seq = ++renderSeq;
  const el = $('#panel');
  let html = '';
  if (ui.wiring) html += wiringBlock();
  if (ui.selection && model.node(ui.selection.key, ui.selection.id)) {
    html += await nodeBlock(ui.selection.key, model.node(ui.selection.key, ui.selection.id));
  } else if (ui.focusKey) {
    html += componentBlock(ui.focusKey);
  } else {
    html += overviewBlock();
  }
  if (seq !== renderSeq) return; // a newer render started while this one waited for ports
  // Same subject: keep the place in the panel. Another node or component: start at the top.
  const subject = ui.selection ? `${ui.selection.key}|${ui.selection.id}` : ui.focusKey ?? '';
  const scroll = subject === el.dataset.subject ? el.scrollTop : 0;
  el.dataset.subject = subject;
  el.innerHTML = html;
  el.scrollTop = scroll;
  if (ui.adding) {
    const f = el.querySelector('#add-filter');
    f?.focus();
    f?.setSelectionRange(f.value.length, f.value.length);
  }
}

function overviewBlock() {
  const folders = new Map();
  for (const k of model.keys()) {
    const f = k.includes('/') ? k.split('/')[0] : '(top level)';
    folders.set(f, (folders.get(f) ?? 0) + 1);
  }
  let nodes = 0;
  let wires = 0;
  for (const k of model.keys()) {
    nodes += model.nodes(k).length;
    wires += model.wires(k).length;
  }
  return `<h2>${esc(ui.project?.name ?? 'No app open')}</h2>
    <div class="muted">${model.keys().length} components · ${nodes} nodes · ${wires} wires · format ${esc(ui.project?.formatVersion ?? '?')}</div>
    <h3>Districts</h3>
    ${[...folders.entries()].map(([f, n]) => `<div class="row"><span class="link" data-act="fly-folder" data-folder="${esc(f)}">${esc(f)}</span><span class="muted">${n} components</span></div>`).join('')}
    <h3>How it works</h3>
    <p class="muted">Each plate is a component; each card is a node, where the files place it. Arcs are wires: <span style="color:var(--signal)">signals</span> and <span style="color:var(--data)">values</span>. Purple arcs join a component to the places it is used. Click a card to read and change it; nothing reaches the app's files until you press <b>Save</b>.</p>`;
}

function componentBlock(key) {
  const c = model.component(key);
  const nodes = c.files.nodes.nodes;
  const users = [];
  for (const other of model.components.values()) for (const n of other.files.nodes.nodes) if (n.type === c.legacyName) users.push({ key: other.key, id: n.id });
  const cloud = key.includes('#__cloud__');
  return `<h2>${esc(key)}</h2>
    <div class="muted">${esc(c.files.component.type ?? '')} component · ${nodes.length} nodes · ${c.files.connections.connections.length} wires${c.dirty ? ' · <b>unsaved changes</b>' : ''}</div>
    ${c.files.component.description ? `<p>${esc(c.files.component.description)}</p>` : ''}
    ${cloud ? `<div class="note">This is a cloud function. A change saved here is not heard by the app until it is deployed; the map has no deploy, so ask your agent to run <code>deploy_cloud_functions</code> after saving.</div>` : ''}
    <div class="row"><button data-act="fly-component" data-key="${esc(key)}">Fly here</button><button data-act="add-open">Add a node…</button></div>
    ${ui.adding ? addBlock(key) : ''}
    ${users.length ? `<h3>Used in</h3>${users.map((u) => `<div class="row"><span class="link" data-act="select" data-key="${esc(u.key)}" data-id="${esc(u.id)}">${esc(u.key)}</span><span class="muted">${esc(label(u.key, u.id))}</span></div>`).join('')}` : ''}
    <h3>Nodes</h3>
    ${nodes.map((n) => `<div class="row"><span class="link" data-act="select" data-key="${esc(key)}" data-id="${esc(n.id)}">${esc(n.label || shortType(n.type))}</span><span class="muted">${esc(shortType(n.type))}</span></div>`).join('')}`;
}

function addBlock(key) {
  const sel = ui.selection && model.node(ui.selection.key, ui.selection.id);
  const canInside = sel && ui.selection.key === key && categoryOf(key, sel) === 'visual';
  const f = ui.addFilter.toLowerCase();
  const fromProject = model.keys().map((k) => ({ type: model.component(k).legacyName, note: 'component' }));
  const fromLib = ui.library ? [...ui.library.keys()].filter((t) => !ui.specTypes.includes(t)).map((t) => ({ type: t, note: 'runtime' })) : [];
  const all = [{ type: 'Component Inputs', note: 'interface' }, { type: 'Component Outputs', note: 'interface' }, ...fromProject, ...ui.specTypes.map((t) => ({ type: t, note: 'node-spec' })), ...fromLib];
  const shown = all.filter((t) => !f || t.type.toLowerCase().includes(f)).slice(0, 80);
  return `<div class="row"><input type="text" id="add-filter" placeholder="Type to find a node type…" value="${esc(ui.addFilter)}" /><button class="small" data-act="add-close">Close</button></div>
    ${canInside ? `<label class="row"><input type="checkbox" id="add-inside" ${ui.addInside ? 'checked' : ''}/> inside “${esc(sel.label || shortType(sel.type))}” (a child: placed by the tree, no position)</label>` : ''}
    <div class="picker">${shown.map((t) => `<div data-act="add" data-type="${esc(t.type)}"><span>${esc(t.type)}</span><span class="muted">${t.note}</span></div>`).join('') || '<div class="muted">No type matches.</div>'}</div>`;
}

function wiringBlock() {
  const w = ui.wiring;
  const end = w.from ?? w.to;
  const dir = w.from ? `from ${esc(label(w.key, end.node))}.<code>${esc(end.port)}</code>` : `into ${esc(label(w.key, end.node))}.<code>${esc(end.port)}</code>`;
  return `<div class="note">Wiring ${dir}. ${ui.wiringTarget ? 'Pick the port below.' : 'Click the card to wire ' + (w.from ? 'into' : 'from') + ' on the map.'} <button class="small" data-act="wire-cancel">Cancel</button></div>`;
}

async function nodeBlock(key, node) {
  const ports = await portsFor(key, node);
  const wires = model.wires(key);
  const inst = node.type?.startsWith('/') ? model.componentForType(node.type) : null;
  const parent = node.parent !== undefined ? model.node(key, node.parent) : null;
  let html = `<div class="muted"><span class="link" data-act="focus" data-key="${esc(key)}">${esc(key)}</span></div>
    <h2>${esc(node.label || shortType(node.type))}</h2>
    <div class="row"><span class="chip">${esc(node.type)}</span><span class="muted">id <code>${esc(node.id)}</code></span></div>
    <div class="row"><input type="text" id="f-label" value="${esc(node.label ?? '')}" placeholder="Label (what it is for)" /><button class="small" data-act="rename">Rename</button></div>`;
  if (inst) html += `<div class="row"><button class="small" data-act="focus-fly" data-key="${esc(inst.key)}">Go into ${esc(inst.key)}</button></div>`;
  if (Number.isFinite(node.x)) {
    html += `<div class="row">Position x <input id="f-x" size="5" value="${node.x}" /> y <input id="f-y" size="5" value="${node.y}" /><button class="small" data-act="move">Move</button></div>`;
  } else {
    html += `<div class="row muted">Placed by the tree (a child has no position of its own).</div>`;
  }
  html += `<div class="row">${parent ? `Inside <span class="link" data-act="select" data-key="${esc(key)}" data-id="${esc(parent.id)}">${esc(parent.label || shortType(parent.type))}</span>` : '<span class="muted">Not inside another node.</span>'}
    <button class="small" data-act="reparent">Put inside…</button>
    <button class="small danger" data-act="remove">Remove</button></div>`;
  const roots = model.component(key).files.nodes.visualRoots ?? [];
  if (categoryOf(key, node) === 'visual' && !parent && !roots.includes(node.id) && model.component(key).files.component.type === 'visual') {
    html += `<div class="note">Not on screen: this visual node is outside the component's visual tree, so the app never draws it and its wires do nothing. Use <b>Put inside…</b> to place it in a Group.</div>`;
  }
  if (ui.reparenting) html += `<div class="note">Click the card to put this node inside. <button class="small" data-act="reparent-cancel">Cancel</button></div>`;
  if (node.children?.length) html += `<div class="row muted">Holds ${node.children.map((c) => `<span class="link" data-act="select" data-key="${esc(key)}" data-id="${esc(c)}">${esc(label(key, c))}</span>`).join(', ')}</div>`;

  // The other end of a wire being drawn: pick its port.
  if (ui.wiring && ui.wiringTarget) {
    const t = model.node(key, ui.wiringTarget.id);
    const tp = await portsFor(key, t);
    const fromType = ui.wiring.from ? portTypeOf(key, ui.wiring.from.node, ui.wiring.from.port, 'output') : portTypeOf(key, ui.wiring.to.node, ui.wiring.to.port, 'input');
    const list = ui.wiring.from ? tp.inputs : tp.outputs;
    const isSig = fromType === 'signal';
    const sorted = [...list].sort((a, b) => Number((b.type === 'signal') === isSig) - Number((a.type === 'signal') === isSig));
    html += `<h3>${ui.wiring.from ? 'Wire into' : 'Wire from'} ${esc(t.label || shortType(t.type))}</h3>
      <div class="picker">${sorted.map((p) => `<div data-act="wire-to" data-port="${esc(p.name)}" class="${(p.type === 'signal') === isSig ? 'match' : 'other'}"><span><code>${esc(p.name)}</code> ${p.displayName ? `<span class="muted">${esc(p.displayName)}</span>` : ''}</span><span class="muted">${esc(p.type)}</span></div>`).join('') || '<div class="muted">This node has no ports on that side.</div>'}</div>`;
  }

  // Parameters.
  const params = node.parameters ?? {};
  const valueInputs = ports.inputs.filter((p) => p.type !== 'signal' && !(p.name in params));
  html += `<h3>Parameters<span class="spacer"></span></h3><table>`;
  for (const [name, value] of Object.entries(params)) {
    const decl = ports.inputs.find((p) => p.name === name);
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    const long = typeof value === 'string' && (value.includes('\n') || value.length > 60);
    html += `<tr><td class="name">${esc(name)}${decl?.displayName ? `<small>${esc(decl.displayName)}</small>` : ''}</td><td>${
      long ? `<textarea rows="${Math.min(12, value.split('\n').length + 1)}" data-param="${esc(name)}" style="width:100%">${esc(text)}</textarea><button class="small" data-act="param-apply" data-param="${esc(name)}">Apply</button>` : `<input data-param="${esc(name)}" value="${esc(text)}" title="${esc(typeof value)}" />`
    }</td><td><button class="small" title="Take it off (back to the default)" data-act="param-unset" data-param="${esc(name)}">×</button></td></tr>`;
  }
  html += `</table>`;
  if (valueInputs.length) {
    html += `<div class="row"><select id="f-newparam">${valueInputs.map((p) => `<option value="${esc(p.name)}">${esc(p.displayName ? `${p.displayName} (${p.name})` : p.name)} — ${esc(p.type)}</option>`).join('')}</select><button class="small" data-act="param-add">Set…</button></div>`;
  }

  // Ports and their wires.
  const wireRow = (w, out) => {
    const other = out ? w.toId : w.fromId;
    const port = out ? w.toProperty : w.fromProperty;
    return `<div class="wire"><span class="link" data-act="select" data-key="${esc(key)}" data-id="${esc(other)}">${esc(label(key, other))}</span>.<code>${esc(port)}</code><button class="small" title="Cut this wire" data-act="cut" data-from="${esc(w.fromId)}" data-fp="${esc(w.fromProperty)}" data-to="${esc(w.toId)}" data-tp="${esc(w.toProperty)}">cut</button></div>`;
  };
  // Wired ports first, as rows; the rest folded away, as on a NodeGX card only wired ports show.
  const portRows = (list, out) => {
    const rows = list.map((p) => {
      const ws = wires.filter((w) => (out ? w.fromId === node.id && w.fromProperty === p.name : w.toId === node.id && w.toProperty === p.name));
      return { p, ws };
    });
    const wired = rows.filter((r) => r.ws.length);
    const rest = rows.filter((r) => !r.ws.length);
    const draw = (rs) => rs.map((r) => portRow(r, out)).join('');
    if (!rest.length) return draw(wired);
    return `${draw(wired)}<details ${wired.length ? '' : 'open'}><summary>${wired.length ? `${rest.length} more, not wired` : `${rest.length} ports, none wired`}</summary>${draw(rest)}</details>`;
  };
  const portRow = ({ p, ws }, out) =>
    `<div class="port"><span class="pname ${p.type === 'signal' ? 'signal' : 'data'}" title="${esc(p.description ?? '')}">${esc(p.name)}</span><span class="ptype">${esc(p.type)}</span>${p.unlisted ? '<span class="unlisted" title="A wire uses this port, but the port list does not have it at these parameters.">not in the list</span>' : ''}
      <span class="pwires">${ws.map((w) => wireRow(w, out)).join('')}</span><button class="small" title="${out ? 'Wire from this output' : 'Wire into this input'}" data-act="${out ? 'wire-from' : 'wire-into'}" data-port="${esc(p.name)}">${out ? 'wire →' : '← wire'}</button></div>`;
  html += `<h3>Inputs <span class="muted" style="text-transform:none">from ${esc(ports.source)}</span></h3>${portRows(ports.inputs, false) || '<div class="muted">None.</div>'}`;
  html += `<h3>Outputs</h3>${portRows(ports.outputs, true) || '<div class="muted">None.</div>'}`;
  if (ports.partial) html += `<div class="note">node-spec drew only the declared ports here: ${esc(ports.partial)}</div>`;
  html += `<h3>Component</h3><div class="row"><button class="small" data-act="add-open">Add a node…</button><button class="small" data-act="focus" data-key="${esc(key)}">All of ${esc(key)}</button></div>${ui.adding ? addBlock(key) : ''}`;
  return html;
}

function parseValue(text, previous, type) {
  if (typeof previous === 'number' || ((previous === undefined || previous === null) && type === 'number')) {
    if (text.trim() === '') throw new MapRefusal('A number cannot be empty; use × to take the parameter off.');
    const n = Number(text);
    if (!Number.isFinite(n)) throw new MapRefusal(`"${text}" is not a number.`);
    return n;
  }
  if (typeof previous === 'boolean' || ((previous === undefined || previous === null) && type === 'boolean')) {
    if (!['true', 'false'].includes(text.trim())) throw new MapRefusal('This one is true or false.');
    return text.trim() === 'true';
  }
  if (previous !== null && typeof previous === 'object') {
    try {
      return JSON.parse(text);
    } catch {
      throw new MapRefusal('This parameter holds JSON (for example {"value": 100, "unit": "%"}), and that is not valid JSON.');
    }
  }
  return text;
}

$('#panel').addEventListener('click', (e) => {
  const t = e.target.closest('[data-act]');
  if (!t) return;
  const sel = ui.selection;
  const node = sel && model.node(sel.key, sel.id);
  const d = t.dataset;
  switch (d.act) {
    case 'select':
      return select(d.key, d.id, true);
    case 'focus':
      ui.selection = null;
      ui.focusKey = d.key;
      map.select(null);
      map.focusComponent(d.key);
      return renderPanel();
    case 'focus-fly':
    case 'fly-component':
      ui.selection = null;
      ui.focusKey = d.key;
      map.select(null);
      map.focusComponent(d.key);
      map.flyToComponent(d.key);
      return renderPanel();
    case 'fly-folder': {
      const first = model.keys().find((k) => (k.includes('/') ? k.split('/')[0] : '(top level)') === d.folder);
      return first && map.flyToComponent(first);
    }
    case 'rename':
      return act(() => model.rename(sel.key, sel.id, $('#f-label').value));
    case 'move':
      return act(() => model.move(sel.key, sel.id, Number($('#f-x').value), Number($('#f-y').value)));
    case 'remove': {
      const name = label(sel.key, sel.id);
      const gone = act(() => model.removeNode(sel.key, sel.id));
      if (gone) toast(`Removed ${name}${gone.length > 1 ? ` and the ${gone.length - 1} node(s) inside it` : ''}, with their wires. Undo brings it back.`);
      return;
    }
    case 'reparent':
      ui.reparenting = { key: sel.key, id: sel.id };
      banner('Click the card to put it inside. Esc cancels.');
      return renderPanel();
    case 'reparent-cancel':
      ui.reparenting = null;
      banner(null);
      return renderPanel();
    case 'param-unset':
      return act(() => model.setParameter(sel.key, sel.id, d.param, undefined));
    case 'param-apply': {
      const ta = $('#panel').querySelector(`textarea[data-param="${CSS.escape(d.param)}"]`);
      return act(() => model.setParameter(sel.key, sel.id, d.param, parseValue(ta.value, node.parameters?.[d.param])));
    }
    case 'param-add': {
      const name = $('#f-newparam').value;
      portsFor(sel.key, node).then((ports) => {
        const decl = ports.inputs.find((p) => p.name === name);
        const shown = decl?.default !== undefined ? (typeof decl.default === 'string' ? decl.default : JSON.stringify(decl.default)) : '';
        const text = prompt(`${name} (${decl?.type ?? 'value'})${decl?.description ? `\n${decl.description}` : ''}`, shown);
        if (text === null) return;
        act(() => model.setParameter(sel.key, sel.id, name, parseValue(text, decl?.default !== undefined && typeof decl.default === 'object' ? decl.default : undefined, decl?.type)));
      });
      return;
    }
    case 'wire-from':
      ui.wiring = { key: sel.key, from: { node: sel.id, port: d.port } };
      ui.wiringTarget = null;
      banner(`Wiring from ${label(sel.key, sel.id)}.${d.port}: click the card to wire into. Esc cancels.`);
      return renderPanel();
    case 'wire-into':
      ui.wiring = { key: sel.key, to: { node: sel.id, port: d.port } };
      ui.wiringTarget = null;
      banner(`Wiring into ${label(sel.key, sel.id)}.${d.port}: click the card to wire from. Esc cancels.`);
      return renderPanel();
    case 'wire-to': {
      const w = ui.wiring;
      const other = { node: ui.wiringTarget.id, port: d.port };
      ui.wiring = null;
      ui.wiringTarget = null;
      banner(null);
      return act(() => (w.from ? model.connect(w.key, w.from, other) : model.connect(w.key, other, w.to)));
    }
    case 'wire-cancel':
      return cancelModes();
    case 'cut':
      return act(() => model.disconnect(sel.key, { node: d.from, port: d.fp }, { node: d.to, port: d.tp }));
    case 'add-open':
      ui.adding = true;
      // With a visual node selected, a new node goes inside it unless the person unticks it.
      ui.addInside = !!(node && categoryOf(sel.key, node) === 'visual');
      return renderPanel();
    case 'add-close':
      ui.adding = false;
      return renderPanel();
    case 'add': {
      const key = ui.selection?.key ?? ui.focusKey;
      const inside = $('#add-inside')?.checked && ui.selection;
      const spec = { type: d.type };
      if (inside) spec.parent = ui.selection.id;
      else Object.assign(spec, map.dropPoint(key));
      const id = act(() => model.addNode(key, spec));
      if (id) {
        ui.adding = false;
        ui.addFilter = '';
        select(key, id, true);
        toast(`Added a ${shortType(d.type)}.`);
      }
      return;
    }
  }
});

$('#panel').addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'add-inside') {
    ui.addInside = t.checked;
    return;
  }
  if (t.tagName === 'INPUT' && t.dataset.param !== undefined) {
    const sel = ui.selection;
    const node = model.node(sel.key, sel.id);
    act(() => model.setParameter(sel.key, sel.id, t.dataset.param, parseValue(t.value, node.parameters?.[t.dataset.param])));
  }
  if (t.id === 'f-label') act(() => model.rename(ui.selection.key, ui.selection.id, t.value));
});

$('#panel').addEventListener('input', (e) => {
  if (e.target.id === 'add-filter') {
    ui.addFilter = e.target.value;
    renderPanel();
  }
});

$('#panel').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.target.blur();
});

function cancelModes() {
  ui.wiring = null;
  ui.wiringTarget = null;
  ui.reparenting = null;
  banner(null);
  renderPanel();
}

// --- the bar, keys, messages ---------------------------------------------------------------

function updateButtons() {
  const n = model.dirtyCount();
  $('#btn-save').textContent = n ? `Save (${n})` : 'Saved';
  $('#btn-save').disabled = n === 0;
  $('#btn-undo').disabled = model.history.length === 0;
}

$('#btn-save').addEventListener('click', save);
$('#btn-undo').addEventListener('click', () => {
  const u = model.undo();
  if (u) toast(`Undid: ${u.what}`);
});
$('#btn-overview').addEventListener('click', () => map.overview());
$('#btn-open').addEventListener('click', () => {
  $('#open-path').value = ui.project?.dir ?? '';
  $('#open-dialog').showModal();
});
$('#open-dialog').addEventListener('close', async () => {
  if ($('#open-dialog').returnValue !== 'ok') return;
  if (model.dirtyCount() && !confirm('There are unsaved changes. Open another app and lose them?')) return;
  try {
    await loadProject(await post('/api/open', { dir: $('#open-path').value }));
  } catch (e) {
    toast(e.message, 'bad');
  }
});
$('#goto').addEventListener('change', (e) => {
  const key = e.target.value;
  if (!model.components.has(key)) return;
  ui.selection = null;
  ui.focusKey = key;
  map.select(null);
  map.focusComponent(key);
  map.flyToComponent(key);
  renderPanel();
  e.target.value = '';
  e.target.blur();
});

window.addEventListener('keydown', (e) => {
  const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault();
    return save();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !typing) {
    e.preventDefault();
    return $('#btn-undo').click();
  }
  if (typing) return;
  if (e.key === 'Escape') {
    if (ui.wiring || ui.reparenting) return cancelModes();
    ui.selection = null;
    map.select(null);
    renderPanel();
  }
  if ((e.key === 'Delete' || e.key === 'Backspace') && ui.selection) {
    e.preventDefault();
    $('#panel').querySelector('[data-act="remove"]')?.click();
  }
  if (e.key === 'f' && ui.selection) map.flyToNode(ui.selection.key, ui.selection.id);
  if (e.key === 'Home') map.overview();
});

window.addEventListener('beforeunload', (e) => {
  if (model.dirtyCount()) e.preventDefault();
});

let toastTimer;
function toast(text, kind = '', ms = 4000) {
  const el = $('#toast');
  el.textContent = text;
  el.className = kind;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), ms);
}

function banner(text, kind = '') {
  const el = $('#banner');
  el.hidden = !text;
  el.className = kind;
  el.textContent = text ?? '';
}

// --- the real app, beside the map ------------------------------------------------------------

let preview = null;
let previewTimer;
let previewOn = true;

/** The project's files as they would be with every change here: what the in-page preview renders. */
function currentFiles() {
  const files = { ...ui.tree };
  for (const c of model.components.values()) {
    const dir = `components/${c.path}`;
    files[`${dir}/component.json`] = JSON.stringify(c.files.component, null, 2);
    files[`${dir}/nodes.json`] = JSON.stringify(c.files.nodes, null, 2);
    files[`${dir}/connections.json`] = JSON.stringify(c.files.connections, null, 2);
  }
  return files;
}

function updatePreview(now = false) {
  if (!previewOn) return;
  clearTimeout(previewTimer);
  previewTimer = setTimeout(runPreview, now ? 0 : 700);
}

async function runPreview() {
  const status = $('#preview-status');
  try {
    if (!preview) {
      status.textContent = 'starting…';
      await loadScript('/kit/preview/noodl-preview-in-page.js');
      preview = await window.NodegxPreview.mountPreview($('#preview'), { runtimeBase: '/runtime/' });
      preview.onTrace(onTrace);
    }
    status.textContent = 'building…';
    const r = await preview.update(currentFiles());
    if (r.status === 'ok') {
      status.textContent = r.warnings?.length ? `${r.warnings.length} warning(s)` : 'live';
      status.title = (r.warnings ?? []).map((w) => w.message ?? JSON.stringify(w)).join('\n');
    } else {
      status.textContent = 'not drawn';
      status.title = r.message ?? JSON.stringify(r);
      toast(`The app does not build with these changes: ${r.message ?? ''}`, 'bad');
    }
    if (!ui.library && preview.nodeLibrary) {
      ui.library = libraryIndex(preview.nodeLibrary);
      map.build();
      if (ui.selection) map.select(ui.selection);
      renderPanel();
    }
    highlightInPreview();
  } catch (e) {
    status.textContent = 'failed';
    status.title = e.message;
  }
}

/** The runtime's node library as type → { category, ports }. */
function libraryIndex(lib) {
  const out = new Map();
  const list = lib.nodetypes ?? lib.nodeTypes ?? (Array.isArray(lib) ? lib : []);
  for (const t of list) {
    if (!t?.name) continue;
    const ports = (t.ports ?? []).map((p) => ({ name: p.name, plug: p.plug, type: typeof p.type === 'object' ? p.type?.name ?? 'object' : p.type ?? '*', displayName: p.displayName, description: p.tooltip?.standard ?? p.description }));
    out.set(t.name, { category: t.category, ports });
  }
  return out;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`${src} did not load`));
    document.head.appendChild(s);
  });
}

let highlighted = [];
function highlightInPreview() {
  for (const el of highlighted) el.style.outline = el.dataset.mapOutline ?? '';
  highlighted = [];
  if (!preview || !ui.selection) return;
  try {
    for (const el of preview.elementsOf(ui.selection.id) ?? []) {
      el.dataset.mapOutline = el.style.outline;
      el.style.outline = '2px solid #1570ef';
      highlighted.push(el);
    }
  } catch {
    /* the app is rebuilding */
  }
}

/**
 * The running app's trace: each event is one value or signal sent along one wire
 * ({ fromNode, fromPort, toNode, toPort, kind, value }); the dictionary names each node's
 * component. Each becomes a bead running along that wire on the map.
 */
let dictionary = null;
function onTrace(batch) {
  if (batch.dictionary) dictionary = batch.dictionary;
  for (const ev of batch.events.slice(-60)) {
    const legacy = dictionary?.nodes?.[ev.fromNode]?.component;
    const c = legacy && model.componentForType(legacy);
    if (c) map.pulse(c.key, { node: ev.fromNode, port: ev.fromPort }, { node: ev.toNode, port: ev.toPort });
  }
}

$('#btn-preview').addEventListener('click', () => {
  previewOn = !previewOn;
  $('#preview-box').classList.toggle('collapsed', !previewOn);
  $('#btn-preview').textContent = previewOn ? 'Hide' : 'Show';
  if (previewOn) updatePreview(true);
});

// --- start ---------------------------------------------------------------------------------

window.__map = { map, model, ui }; // for the developer's console and the test driver

(async () => {
  try {
    ui.specTypes = await (await fetch('/api/types')).json();
    await loadProject(await (await fetch('/api/project')).json());
  } catch (e) {
    toast(`Could not open the app: ${e.message}`, 'bad', 15000);
  }
  updateButtons();
  setInterval(watchDisk, 3000);
})();
