// P125 CCN-008 — the mini editor's panel: one part of the app, live, with the settings the agent chose for the person.
//
// Drawn by the host from ui://nodegx/mini-editor.html (or opened in a browser at /__nodegx/mini/view.html?id=). The
// page is the same for every call; what to show arrives from the tool call (its result names the editor's id) and is
// read from this server's proxy. Studio serves the preview bundle and the runtime; everything else is the proxy's.
//
// Embedded into panelSource.ts by scripts/embed-mini-editor.cjs (a spec checks the two agree). Plain ES2020, no
// build step: what is here is what the browser runs.

const MINI = window.__MINI || {};
const ORIGIN = MINI.origin || location.origin;
const HOSTED = window.parent !== window;
const POLL_MS = 3000;

const $ = (sel, root = document) => root.querySelector(sel);
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'text') el.textContent = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) el.append(kid instanceof Node ? kid : String(kid));
  return el;
}
const api = (p) => `${ORIGIN}/__nodegx/mini/${p}`;
async function getJson(url) {
  const r = await fetch(url, { cache: 'no-store' });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `${r.status} ${r.statusText}`);
  return d;
}
async function postJson(url, payload) {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload || {}) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `${r.status} ${r.statusText}`);
  return d;
}

const root = document.getElementById('me-root');
const state = {
  app: null,
  id: MINI.id || new URLSearchParams(location.search).get('id') || null,
  panel: null, // { id, seq }
  record: null,
  revisions: {},
  ownWriteAt: 0,
  preview: null,
  rootAlias: null,
  quiet: null, // null | 'fresh' | 'booted'
  values: {}, // control key -> value shown
  note: '',
  noteOpen: false,
  sent: null,
  error: null,
  stageNote: '',
  focusTimer: null
};
window.__mini = state; // a drive reads the state here; nothing in the page does

// ─── The host ────────────────────────────────────────────────────────────────

let resolveIdentity;
const identity = new Promise((resolve) => {
  resolveIdentity = resolve;
});

function takeResult(result) {
  if (result && result.isError) {
    const text = (result.content || []).map((c) => c.text || '').join(' ');
    let msg = text;
    try {
      msg = JSON.parse(text).error.message;
    } catch (e) {
      /* prose */
    }
    state.error = msg || 'The agent\'s call was refused.';
    render();
    return;
  }
  for (const c of (result && result.content) || []) {
    if (!c || c.type !== 'text') continue;
    try {
      const d = JSON.parse(c.text);
      if (d && d.miniEditorId) {
        resolveIdentity({ id: d.miniEditorId, panel: { id: d.panelId, seq: Number(d.issuedAt) || 0 } });
        return;
      }
    } catch (e) {
      /* not JSON */
    }
  }
}

async function connectHost() {
  if (!HOSTED) return;
  try {
    const { App } = await import(api('mcp-app.js'));
    const app = new App({ name: 'NodeGX mini editor', version: '0.1.0' }, { availableDisplayModes: ['inline', 'fullscreen'] }, { autoResize: false });
    app.ontoolresult = takeResult;
    app.ontoolinput = (p) => {
      const reopen = p && p.arguments && p.arguments.reopen;
      if (typeof reopen === 'string' && !state.id) state.reopenHint = reopen;
    };
    app.onhostcontextchanged = (ctx) => applyTheme(ctx && ctx.theme);
    await app.connect();
    state.app = app;
    applyTheme((app.getHostContext() || {}).theme);
  } catch (e) {
    state.hostError = e.message;
  }
}

function applyTheme(theme) {
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
}

let lastHeight = 0;
function fit() {
  if (!state.app) return;
  const height = Math.ceil(root.getBoundingClientRect().height) + 2;
  if (Math.abs(height - lastHeight) < 2) return;
  lastHeight = height;
  state.app.sendSizeChanged({ width: Math.ceil(window.innerWidth), height }).catch(() => {});
}
new ResizeObserver(fit).observe(root);

// ─── One live panel (R1): the newest panel in the conversation, Studio or mini editor, is the live one ───────────

async function claim(wake) {
  if (!HOSTED || !state.panel) return true;
  try {
    const r = await fetch(`${ORIGIN}/api/panel`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: state.panel.id, seq: state.panel.seq, ...(wake ? { wake: true } : {}) })
    });
    if (!r.ok) return true; // no Studio running: nothing else can be live
    return (await r.json()).you;
  } catch (e) {
    return true;
  }
}

function goQuiet(how) {
  if (state.quiet) return;
  state.quiet = how;
  try {
    state.preview && state.preview.dispose();
  } catch (e) {
    /* the frame goes with the page */
  }
  state.preview = null;
  clearInterval(state.focusTimer);
  render();
  if (state.app && state.app.getHostContext && (state.app.getHostContext() || {}).displayMode === 'fullscreen') {
    state.app.requestDisplayMode({ mode: 'inline' }).catch(() => {});
  }
}

async function wake() {
  await claim(true);
  if (state.quiet === 'booted') {
    location.reload();
    return;
  }
  state.quiet = null;
  await start();
}

// ─── The record ──────────────────────────────────────────────────────────────

async function load() {
  const d = await getJson(api(`e/${state.id}`));
  state.record = d.record;
  state.revisions = d.revisions || {};
  for (const c of state.record.controls) state.values[c.key] = c.value;
}

function changedSinceLoad(revisions) {
  for (const [k, v] of Object.entries(revisions || {})) if (state.revisions[k] !== v) return true;
  return false;
}

async function poll() {
  if (state.quiet) return;
  if (!(await claim(false))) {
    goQuiet('booted');
    return;
  }
  try {
    const d = await getJson(api(`e/${state.id}`));
    const outside = changedSinceLoad(d.revisions) && Date.now() - state.ownWriteAt > 1500;
    state.revisions = d.revisions || {};
    if (d.record.status !== state.record.status || outside) {
      state.record = d.record;
      for (const c of state.record.controls) state.values[c.key] = c.value;
      render();
      if (outside) rebuildStage();
    }
  } catch (e) {
    /* the server may be restarting: the next poll tries again */
  }
}

// ─── The stage ───────────────────────────────────────────────────────────────

let previewKit = null;
function loadPreviewKit() {
  if (previewKit) return previewKit;
  previewKit = new Promise((resolve, reject) => {
    if (window.NodegxPreview) return resolve(window.NodegxPreview);
    const s = document.createElement('script');
    s.src = `${ORIGIN}/preview.js`;
    s.onload = () => resolve(window.NodegxPreview);
    s.onerror = () => reject(new Error('the preview bundle did not load'));
    document.head.appendChild(s);
  });
  return previewKit;
}

async function studioUp() {
  for (let i = 0; i < 90; i++) {
    try {
      const r = await fetch(`${ORIGIN}/api/hold`, { cache: 'no-store' });
      if (r.ok) return true;
    } catch (e) {
      /* not yet */
    }
    setStageNote(i === 0 ? 'Starting the preview…' : `Starting the preview… (${i}s)`);
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

function setStageNote(text) {
  state.stageNote = text;
  const el = $('.me-stage-note');
  if (el) {
    el.textContent = text;
    el.hidden = !text;
  }
}

function frameWin() {
  return state.preview && state.preview.frame && state.preview.frame.contentWindow;
}

function runtime() {
  const w = frameWin();
  return w && w.Noodl && w.Noodl.Navigation && w.Noodl.Navigation._noodlRuntime;
}

/** A setting changed: the running app takes it now, no rebuild (NodeGX Scene s4's mechanism). */
function liveSet(control, value) {
  const rt = runtime();
  const gm = rt && ((rt.context && rt.context.graphModel) || rt.graphModel);
  const comp = gm && gm.getComponentWithName(control.legacyName);
  const id = state.rootAlias && state.rootAlias.from === control.node && control.component === state.record.stage.component ? state.rootAlias.to : control.node;
  const node = comp && comp.getNodeWithId(id);
  if (!node) return false;
  try {
    if (control.state) {
      // A visual state's value: `null` is "as normal" (the state's own value goes). The part shows that state now.
      node.setParameter(control.port, value === null ? undefined : value, control.state);
      showLook(control.state);
    } else {
      node.setParameter(control.port, value === undefined || value === null ? control.default : value);
      setTimeout(applyLook, 0);
    }
    if (state.record.stage.kind === '3d') setTimeout(focus3d, 60);
    else relayout(150);
    return true;
  } catch (e) {
    return false;
  }
}

/** The running instances of the part (a placed copy's inner node too: the runtime finds it from the root). */
function instancesOf(id) {
  const rt = runtime();
  const ctx = rt && (rt.context || rt);
  const top = ctx && ctx.rootComponent;
  try {
    return top && top.nodeScope ? top.nodeScope.getNodesWithIdRecursive(id) || [] : [];
  } catch (e) {
    return [];
  }
}

/**
 * P125-CCN008-NOSTATES (Richard: "I would have expected to see the hover and clicked / disabled variants"): the part
 * is drawn in the look the person picked, with the runtime's own visual states, so a hover colour left over from an
 * earlier edit shows here and not only on the live site. While a look is held the pointer cannot change it.
 */
function applyLook() {
  const stage = state.record && state.record.stage;
  if (!stage || !stage.target || !stage.states) return;
  const look = state.look || 'normal';
  const id = state.rootAlias && state.rootAlias.from === stage.target ? state.rootAlias.to : stage.target;
  for (const inst of instancesOf(id)) {
    if (!inst || typeof inst.setVisualStates !== 'function') continue;
    try {
      inst.setVisualStates(['__mini']); // a change of states, so the next call reads its values again
      if (look === 'normal') {
        inst.setVisualStates([]);
        if (typeof inst._updateVisualState === 'function') inst._updateVisualState();
      } else inst.setVisualStates([look]);
    } catch (e) {
      /* a node without states draws as it is */
    }
  }
  const doc = state.preview && state.preview.frame && state.preview.frame.contentDocument;
  const el = doc && doc.querySelector('[data-me-target]');
  if (el) {
    if (look === 'normal') el.removeAttribute('data-me-forced');
    else el.setAttribute('data-me-forced', '');
  }
}

function showLook(look) {
  state.look = look;
  if (ui && ui.looks) for (const b of ui.looks.querySelectorAll('button')) b.setAttribute('aria-checked', b.dataset.look === look ? 'true' : 'false');
  applyLook();
}

const LOOK_WORDS = { normal: 'Normal', hover: 'Hover', pressed: 'Pressed', focused: 'Focused', disabled: 'Disabled' };
const WHEN_WORDS = { hover: 'on hover', pressed: 'when pressed', focused: 'when focused', disabled: 'when disabled' };

const FOCUS_CSS =
  '[data-me-focus]{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;max-width:none!important;' +
  'max-height:none!important;margin:0!important;z-index:2147483000!important;border-radius:0!important}html,body{margin:0;overflow:hidden}';

function sceneEl() {
  const doc = state.preview && state.preview.frame && state.preview.frame.contentDocument;
  if (!doc) return null;
  const own = state.preview.elementsOf ? state.preview.elementsOf(state.record.stage.scene || '').find((el) => el.matches && el.matches('[data-three-scene]')) : null;
  return own || doc.querySelector('[data-three-scene]');
}

/** 3D: the Scene fills the stage, the game stands still, and only the part's own objects are drawn. */
function focus3d() {
  const doc = state.preview && state.preview.frame && state.preview.frame.contentDocument;
  const el = sceneEl();
  if (!doc || !el) return false;
  if (!doc.getElementById('me-focus-css')) {
    const st = doc.createElement('style');
    st.id = 'me-focus-css';
    st.textContent = FOCUS_CSS;
    doc.head.appendChild(st);
  }
  if (!el.hasAttribute('data-me-focus')) el.setAttribute('data-me-focus', '');
  const eng = el.__threeKit;
  if (!eng) return false;
  if (eng.pause) eng.pause(true);
  const focus = new Set(state.record.stage.focus || []);
  if (focus.size === 0 || !eng.scene) return true;
  // An object belongs to the part when the node that made it is in the part's subtree; lights stay on.
  const T = frameWin().THREE;
  for (const obj of eng.scene.children) {
    const id = obj.userData && obj.userData.nodeId;
    if (!id || obj.isLight) continue; // the floor, the lights
    obj.visible = focus.has(id);
  }
  if (T) frameModel(eng, T, focus);
  return true;
}

/**
 * The Scene's camera orbits the middle of the world and the engine keeps its aim to itself, so the model is brought
 * to the middle instead: the whole scene slides sideways (never up or down: the model keeps standing on its floor),
 * and the camera stands back by the model's size. Done again when the model's size changes (a Size setting).
 */
function frameModel(eng, T, focus) {
  const box = new T.Box3();
  let any = false;
  eng.scene.updateMatrixWorld(true);
  for (const obj of eng.scene.children) {
    const id = obj.userData && obj.userData.nodeId;
    if (!id || !focus.has(id)) continue;
    box.expandByObject(obj);
    any = true;
  }
  if (!any || box.isEmpty()) return;
  const size = new T.Vector3();
  const centre = new T.Vector3();
  box.getSize(size);
  box.getCenter(centre);
  const span = Math.max(size.x, size.y, size.z, 0.5);
  if (state.framed && Math.abs(span - state.framed) / state.framed < 0.25 && Math.abs(centre.x) < 0.05 && Math.abs(centre.z) < 0.05) return;
  eng.scene.position.x -= centre.x;
  eng.scene.position.z -= centre.z;
  const cam = eng.census().camera;
  const distance = span * 2 + 1;
  if (cam.distance > 0 && eng.zoom) eng.zoom(distance / cam.distance);
  if (eng.orbit) eng.orbit(0, distance * 0.4 + size.y * 0.5 - eng.census().camera.height);
  state.framed = span;
}

async function rebuildStage() {
  const box = $('.me-stage');
  if (!box || state.quiet) return;
  try {
    if (!state.preview) {
      if (!(await studioUp())) {
        setStageNote('The preview could not start (NodeGX Studio did not answer). The settings below still change the app.');
        return;
      }
      const kit = await loadPreviewKit();
      for (const old of box.querySelectorAll('.me-frame')) old.remove(); // a panel brought back after going quiet
      const frameBox = h('div', { class: 'me-frame' });
      box.prepend(frameBox);
      state.preview = await kit.mountPreview(frameBox, { runtimeBase: `${ORIGIN}/runtime/` });
    }
    setStageNote('Drawing…');
    const tree = await getJson(api(`e/${state.id}/files`));
    state.rootAlias = tree.rootAlias || null;
    const r = await state.preview.update(tree.files);
    if (r && r.status && r.status !== 'ok') {
      setStageNote(`The preview did not draw: ${r.message || r.status}`);
      return;
    }
    setStageNote('');
    state.framed = false;
    if (state.record.stage.kind === '3d') {
      box.classList.add('me-3d');
      clearInterval(state.focusTimer);
      let tries = 0;
      state.focusTimer = setInterval(() => {
        if (focus3d() && ++tries > 20) clearInterval(state.focusTimer);
      }, 250);
    } else {
      // Fonts and images arrive after the first draw and move the part: measure again as they land.
      for (const ms of [0, 300, 900, 2000]) setTimeout(layout2d, ms);
      setTimeout(applyLook, 350);
    }
  } catch (e) {
    setStageNote(`The preview did not draw: ${e.message}`);
  }
}

/**
 * 2D: the app is laid out at a desktop width (a hero looks like a hero), only the part's own elements are drawn, and
 * the frame is scaled and moved so the part sits in the stage: a button at its size in the middle, a section scaled
 * to the panel's width. The runtime renders the part's whole component (it takes the root to mean a component), so
 * the part is isolated here rather than on the server.
 */
const APP_WIDTH = 1100;
const APP_HEIGHT = 900;
const STAGE_MAX = 440;
const STAGE_PAD = 20;
// Only the part is drawn, on the colour it sits on in the app (the stage paints it: the frame's page is see-through),
// and nothing in the frame scrolls (P125-CCN008-STAGESCROLL: a wheel over the stage scrolled the app inside it, the
// part went and a white page was left). 🔴 A frame whose colour scheme differs from the page holding it is painted
// opaque by the browser, so the frame's page says `normal`, as the frame element does (mini-editor.css).
const TARGET_CSS =
  'body *{visibility:hidden!important}[data-me-target],[data-me-target] *{visibility:visible!important}' +
  '*{scrollbar-width:none!important}::-webkit-scrollbar{display:none!important}' +
  ':root{color-scheme:normal!important}html,body{background:transparent!important;overflow:hidden!important}' +
  '[data-me-noscroll]{overflow:hidden!important}[data-me-forced],[data-me-forced] *{pointer-events:none!important}';

/** What the part sits on in the app: the first thing behind it that paints, read before the page is made see-through. */
function backdropOf(el, win) {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const cs = win.getComputedStyle(p);
    if (cs.backgroundImage && cs.backgroundImage !== 'none') return { image: cs.backgroundImage, color: cs.backgroundColor };
    if (cs.backgroundColor && !/^(transparent|rgba\(0, 0, 0, 0\))$/.test(cs.backgroundColor)) return { color: cs.backgroundColor };
  }
  return { color: '#ffffff' };
}

/**
 * The part brought to the top of the frame's page by moving only that page's own scrollers.
 * 🔴 P125-CCN008-SCROLLJUMP: never `scrollIntoView` here. It scrolls every scrollable box above the element, the
 * frames above it included, so on every change the person made Desktop's chat moved until the part's top met the top
 * of the chat (Richard: "the chat scroll jumps down every time").
 */
function bringToTop(el, doc) {
  const win = doc.defaultView;
  for (let p = el.parentElement; p && p !== doc.body && p !== doc.documentElement; p = p.parentElement) {
    if (p.scrollHeight <= p.clientHeight + 1 && p.scrollWidth <= p.clientWidth + 1) continue;
    const cs = win.getComputedStyle(p);
    if (!/(auto|scroll|hidden|overlay)/.test(`${cs.overflowX} ${cs.overflowY}`)) continue;
    const pr = p.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    p.scrollTop += er.top - pr.top;
    p.scrollLeft += er.left - pr.left;
    p.setAttribute('data-me-noscroll', '');
  }
  const er = el.getBoundingClientRect();
  if (er.top < 0 || er.bottom > win.innerHeight) win.scrollTo(win.scrollX, win.scrollY + er.top);
}

function layout2d() {
  const box = $('.me-stage');
  const fb = box && box.querySelector('.me-frame');
  const doc = state.preview && state.preview.frame && state.preview.frame.contentDocument;
  if (!fb || !doc || !doc.body) return;
  const stageW = box.clientWidth;
  fb.style.cssText = `position:absolute;left:0;top:0;width:${APP_WIDTH}px;height:${APP_HEIGHT}px;transform-origin:0 0`;
  const target = state.record.stage.target;
  let rect = null;
  if (target) {
    const els = (state.preview.elementsOf ? state.preview.elementsOf(target) : []).filter((e) => {
      const r = e.getBoundingClientRect && e.getBoundingClientRect();
      return r && r.width > 0 && r.height > 0;
    });
    const el = els[0];
    if (el && !doc.getElementById('me-target-css')) {
      state.backdrop = backdropOf(el, doc.defaultView);
      const st = doc.createElement('style');
      st.id = 'me-target-css';
      st.textContent = TARGET_CSS;
      doc.head.appendChild(st);
    }
    for (const x of doc.querySelectorAll('[data-me-target]')) if (x !== el) x.removeAttribute('data-me-target');
    if (el) {
      el.setAttribute('data-me-target', '');
      if (state.look && state.look !== 'normal') el.setAttribute('data-me-forced', '');
      bringToTop(el, doc);
      rect = el.getBoundingClientRect();
      state.targetFound = true;
    } else {
      state.targetFound = false;
    }
  }
  const bd = rect && state.backdrop;
  box.style.background = bd ? (bd.image ? `${bd.image} center / cover, ${bd.color}` : bd.color) : '';
  // 🔴 The preview kit gives its frame an inline white background (`noodl-preview` inPage `mountPreview`), which beats
  // any stylesheet: measured as a white slab beside the part in the first drive of this fix.
  state.preview.frame.style.background = bd ? 'transparent' : '';
  state.preview.frame.style.colorScheme = bd ? 'normal' : '';
  let s;
  let tx;
  let ty;
  let height;
  if (rect) {
    s = Math.min(1, (stageW - 2 * STAGE_PAD) / rect.width, (STAGE_MAX - 2 * STAGE_PAD) / rect.height);
    tx = (stageW - rect.width * s) / 2 - rect.left * s;
    ty = STAGE_PAD - rect.top * s;
    height = rect.height * s + 2 * STAGE_PAD;
  } else {
    s = stageW / APP_WIDTH;
    tx = 0;
    ty = 0;
    height = Math.min(STAGE_MAX + 120, APP_HEIGHT * s);
  }
  fb.style.transform = `translate(${tx}px,${ty}px) scale(${s})`;
  box.style.height = `${Math.max(64, Math.ceil(height))}px`;
  state.scale = s;
}

let layoutTimer = null;
function relayout(delay) {
  clearTimeout(layoutTimer);
  layoutTimer = setTimeout(() => state.record && state.record.stage.kind === '2d' && layout2d(), delay || 0);
}
window.addEventListener('resize', () => relayout(100));

// ─── Writing the person's change ─────────────────────────────────────────────

const commitTimers = {};
function commit(control, value, delay) {
  clearTimeout(commitTimers[control.key]);
  commitTimers[control.key] = setTimeout(async () => {
    try {
      const r = await postJson(api(`e/${state.id}/set`), { key: control.key, value });
      state.ownWriteAt = Date.now();
      state.values[control.key] = r.value;
      flash(control.key, 'saved');
      const d = await getJson(api(`e/${state.id}`));
      state.revisions = d.revisions || {};
      state.record = d.record;
      renderChanged();
    } catch (e) {
      flash(control.key, e.message, true);
    }
  }, delay || 0);
}

function setValue(control, value, { live = true, save = true, delay = 0 } = {}) {
  state.values[control.key] = value;
  if (control.state && state.look !== control.state) showLook(control.state);
  const took = live ? liveSet(control, value) : true;
  if (save) {
    commit(control, value, delay);
    if (!took) setTimeout(rebuildStage, (delay || 0) + 300);
  }
}

function flash(key, text, bad) {
  const el = document.querySelector(`[data-key="${CSS.escape(key)}"] .me-flash`);
  if (!el) return;
  el.textContent = bad ? text : '';
  el.dataset.bad = bad ? '1' : '';
  el.parentElement.classList.toggle('me-saved', !bad);
  if (!bad) setTimeout(() => el.parentElement && el.parentElement.classList.remove('me-saved'), 900);
}

// ─── Controls, from the descriptors the server built from the part's own settings list ─────────────────────────

function numOf(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseFloat(v);
  if (v && typeof v === 'object' && typeof v.value === 'number') return v.value;
  return NaN;
}
function unitOf(v, units) {
  if (v && typeof v === 'object' && typeof v.unit === 'string') return v.unit;
  if (typeof v === 'string') {
    const m = /^-?[\d.]+\s*([a-z%]+)$/i.exec(v.trim());
    if (m) return m[1];
  }
  return units[0];
}
const isToken = (v) => typeof v === 'string' && /^var\(--[\w-]+\)$/.test(v);

function controlEl(c) {
  const v = state.values[c.key];
  const wrap = h('div', { class: `me-field me-${c.control}${c.state ? ' me-stated' : ''}`, 'data-key': c.key });
  const label = h('label', { class: 'me-label', title: c.description || '' }, c.label, h('span', { class: 'me-flash', 'aria-live': 'polite' }));
  wrap.append(label);
  const id = `f-${c.key.replace(/[^\w]/g, '_')}`;
  label.setAttribute('for', id);

  if (c.control === 'toggle') {
    const input = h('input', { type: 'checkbox', id, role: 'switch', class: 'me-switch' });
    input.checked = v === true;
    input.addEventListener('change', () => setValue(c, input.checked));
    wrap.append(input);
  } else if (c.control === 'enum') {
    const opts = c.enums || [];
    const short = opts.length <= 5 && opts.every((o) => String(o.label).length <= 12);
    if (short) {
      const seg = h('div', { class: 'me-seg', role: 'radiogroup', id });
      for (const o of opts) {
        const on = JSON.stringify(o.value) === JSON.stringify(v);
        seg.append(
          h(
            'button',
            {
              type: 'button',
              role: 'radio',
              'aria-checked': on ? 'true' : 'false',
              onclick: () => {
                for (const b of seg.children) b.setAttribute('aria-checked', 'false');
                seg.children[opts.indexOf(o)].setAttribute('aria-checked', 'true');
                setValue(c, o.value);
              }
            },
            o.label
          )
        );
      }
      wrap.append(seg);
    } else {
      const sel = h('select', { id }, ...opts.map((o, i) => h('option', { value: String(i) }, o.label)));
      sel.selectedIndex = Math.max(0, opts.findIndex((o) => JSON.stringify(o.value) === JSON.stringify(v)));
      sel.addEventListener('change', () => setValue(c, opts[sel.selectedIndex].value));
      wrap.append(sel);
    }
  } else if (c.control === 'color') {
    const row = h('div', { class: 'me-swatches', role: 'radiogroup', id });
    const nameOf = (value) => {
      const sw = (c.swatches || []).find((x) => x.value === value);
      return sw ? sw.label : typeof value === 'string' ? value.replace(/^var\(--([\w-]+)\)$/, '$1') : '';
    };
    const current = h('span', { class: 'me-current' }, nameOf(v));
    label.insertBefore(current, label.querySelector('.me-flash'));
    const pick = (value) => {
      for (const b of row.querySelectorAll('button')) b.setAttribute('aria-checked', b.dataset.v === value ? 'true' : 'false');
      if (hex) hex.value = /^#[0-9a-f]{6}$/i.test(value) ? value : hex.value;
      current.textContent = nameOf(value);
      setValue(c, value);
    };
    for (const s of c.swatches || []) {
      row.append(
        h('button', {
          type: 'button',
          role: 'radio',
          title: s.label,
          'aria-label': s.label,
          'data-v': s.value,
          'aria-checked': s.value === v ? 'true' : 'false',
          style: `background:${s.css}`,
          onclick: () => pick(s.value)
        })
      );
    }
    let hex = null;
    if (c.custom) {
      hex = h('input', { type: 'color', class: 'me-hex', title: 'Another colour', 'aria-label': `${c.label}: another colour` });
      hex.addEventListener('input', () => {
        current.textContent = hex.value;
      });
      hex.value = typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : '#888888';
      hex.addEventListener('input', () => liveSet(c, hex.value));
      hex.addEventListener('change', () => pick(hex.value));
      row.append(hex);
    }
    wrap.append(row);
  } else if (c.control === 'number' || c.control === 'units') {
    const units = c.units || [];
    const n0 = numOf(v);
    const unit0 = c.control === 'units' ? unitOf(v, units) : null;
    const shape = (n, unit) => {
      if (c.control !== 'units') return n;
      const objectBefore = v && typeof v === 'object';
      if (!objectBefore && unit === units[0] && typeof v !== 'string') return n;
      if (typeof v === 'string' && !isToken(v)) return `${n}${unit}`;
      return { value: n, unit };
    };
    const row = h('div', { class: 'me-num' });
    const num = h('input', { type: 'number', id, step: c.step !== undefined ? c.step : 'any', value: Number.isFinite(n0) ? n0 : '' });
    if (c.min !== undefined) num.min = c.min;
    if (c.max !== undefined) num.max = c.max;
    let range = null;
    let unitSel = null;
    const current = () => shape(parseFloat(num.value), unitSel ? unitSel.value : unit0);
    if (c.min !== undefined && c.max !== undefined) {
      range = h('input', { type: 'range', min: c.min, max: c.max, step: c.step !== undefined ? c.step : (c.max - c.min) / 100, 'aria-label': c.label });
      range.value = Number.isFinite(n0) ? n0 : c.min;
      range.addEventListener('input', () => {
        num.value = range.value;
        setValue(c, current(), { save: false });
      });
      range.addEventListener('change', () => setValue(c, current()));
      row.append(range);
    }
    num.addEventListener('input', () => {
      if (range) range.value = num.value;
      if (num.value !== '') setValue(c, current(), { delay: 500 });
    });
    row.append(num);
    if (c.control === 'units' && units.length > 0) {
      unitSel = h('select', { 'aria-label': `${c.label} unit` }, ...units.map((u) => h('option', { value: u }, u)));
      unitSel.value = unit0;
      unitSel.addEventListener('change', () => setValue(c, current()));
      row.append(unitSel);
    }
    if (isToken(v)) row.append(h('span', { class: 'me-token', title: 'A design token' }, v.replace(/^var\(--([\w-]+)\)$/, '$1')));
    wrap.append(row);
  } else {
    const multi = c.control === 'textarea';
    const input = h(multi ? 'textarea' : 'input', { id, rows: multi ? 2 : undefined, type: multi ? undefined : 'text' });
    input.value = typeof v === 'string' ? v : v === undefined || v === null ? '' : JSON.stringify(v);
    input.addEventListener('input', () => setValue(c, input.value, { delay: 600 }));
    wrap.append(input);
  }
  if (c.state) {
    // A state's value can go: the part then looks as it does normally in that state.
    const same = v === null || v === undefined;
    wrap.append(
      h(
        'button',
        {
          type: 'button',
          class: 'me-link me-asnormal',
          'aria-pressed': same ? 'true' : 'false',
          onclick: () => {
            setValue(c, null);
            render();
          }
        },
        same ? `As normal ${WHEN_WORDS[c.state] || c.state}` : 'Back to as normal'
      )
    );
  } else if (c.states && !state.record.controls.some((x) => x.node === c.node && x.port === c.port && x.state)) {
    // What a state shows instead, when the editor has no setting for it: the person sees why Hover looks different.
    const shown = Object.entries(c.states).map(([s, val]) => `${LOOK_WORDS[s] || s}: ${typeof val === 'string' ? val.replace(/^var\(--([\w-]+)\)$/, '$1') : JSON.stringify(val)}`);
    wrap.append(h('p', { class: 'me-stateline', title: 'This look changes it; press the look above the options to see it' }, shown.join(' · ')));
  }
  return wrap;
}

// ─── The page ────────────────────────────────────────────────────────────────

const OUTCOME_WORDS = { approved: 'Approved', 'not-that': 'Not that', done: 'Done', open: 'Waiting for you' };

function changedList() {
  const r = state.record;
  const lines = [];
  for (const ch of Object.values(r.changes || {})) {
    if (JSON.stringify(ch.from) === JSON.stringify(ch.to)) continue;
    lines.push(ch.label);
  }
  return lines;
}

function renderChanged() {
  const el = $('.me-changed');
  if (!el) return;
  const list = changedList();
  el.textContent = list.length ? `You changed: ${list.join(', ')}.` : '';
}

async function decide(outcome) {
  if (outcome === 'not-that' && !state.note.trim()) {
    state.noteOpen = true;
    render({ fields: false });
    const ta = $('.me-note textarea');
    if (ta) {
      ta.focus();
      ta.placeholder = 'What should change? (Claude reads this)';
    }
    return;
  }
  const buttons = document.querySelectorAll('.me-actions button');
  for (const b of buttons) b.disabled = true;
  try {
    const d = await postJson(api(`e/${state.id}/decide`), { outcome, note: state.note });
    state.record.status = d.status;
    state.sent = await tell(d.message);
    await load();
  } catch (e) {
    state.error = e.message;
  }
  render({ fields: false });
}

/**
 * The decision goes to Claude quietly, as the conversation's context (`ui/update-model-context`): Claude reads it with
 * the person's next message. 🔴 P125-CCN008-APPROVEWARN, ruled by Richard 2026-10-25 ("Send the decision quietly
 * instead please, nobody needs to see the prompt before sending, they already took the decisions"): sent as a
 * `ui/message`, Claude Desktop put it in the composer under "Use caution before running this prompt…" for the person to
 * send. Only a host that takes no context gets the message.
 */
async function tell(text) {
  const app = state.app;
  if (!app) return 'saved';
  try {
    await app.updateModelContext({ content: [{ type: 'text', text }] });
    return 'context';
  } catch (e) {
    /* the fallback below */
  }
  try {
    const r = await app.sendMessage({ role: 'user', content: [{ type: 'text', text }] });
    if (!r || !r.isError) return 'sent';
  } catch (e) {
    /* saved in the project all the same */
  }
  return 'saved';
}

const SENT_WORDS = {
  sent: 'Sent to Claude.',
  // An app cannot start Claude's turn without a message, so the person sends one: any line will do.
  context: 'Claude has your decision. Send it any message ("go" is enough) and it carries on.',
  saved: 'Saved in the project. Tell Claude in the chat that you have decided.'
};

/**
 * The page. Built once and then updated in place: 🔴 moving an iframe (or anything holding one) in the DOM reloads it,
 * and a reloaded preview frame is an empty document — measured in the 3D drive, where re-rendering after a variant
 * wiped the running scene. So the stage element never moves; everything around it is refilled.
 */
let ui = null;
function fill(el, ...kids) {
  el.textContent = '';
  for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) el.append(k instanceof Node ? k : String(k));
}

function skeleton() {
  const card = h('div', { class: 'me-card' });
  ui = {
    msg: h('div', { class: 'me-card me-wait', hidden: true }),
    quiet: h('div', { class: 'me-quiet', hidden: true }),
    card,
    head: h('header', { class: 'me-head' }),
    ask: h('p', { class: 'me-ask' }),
    stage: h('div', { class: 'me-stage' }, h('p', { class: 'me-stage-note', hidden: !state.stageNote }, state.stageNote)),
    looks: h('div', { class: 'me-looks', role: 'radiogroup', 'aria-label': 'Show it as', hidden: true }),
    variants: h('div', { class: 'me-variants', role: 'radiogroup', 'aria-label': 'Options' }),
    fields: h('div', { class: 'me-fields' }),
    changed: h('p', { class: 'me-changed' }),
    note: h('div', { class: 'me-notebox' }),
    actions: h('div', { class: 'me-actions' }),
    err: h('p', { class: 'me-errline', hidden: true }),
    foot: h('footer', { class: 'me-foot' })
  };
  card.append(ui.head, ui.ask, ui.stage, ui.looks, ui.variants, ui.fields, ui.changed, ui.note, ui.actions, ui.err, ui.foot);
  root.textContent = '';
  root.append(ui.msg, ui.quiet, card);
}

/** Draws the page from the state. `fields: false` leaves the controls as they are (a person may be typing in one). */
function render(opts) {
  const fields = !opts || opts.fields !== false;
  if (!ui) skeleton();
  const r = state.record;
  if (!r) {
    ui.card.hidden = true;
    ui.quiet.hidden = true;
    ui.msg.hidden = false;
    ui.msg.className = state.error ? 'me-card me-error' : 'me-card me-wait';
    fill(ui.msg, state.error ? [h('b', {}, 'The mini editor could not open. '), state.error] : 'Opening the mini editor…');
    return;
  }
  ui.msg.hidden = true;
  if (state.quiet) {
    const answered = r.status !== 'open';
    ui.card.hidden = true;
    ui.quiet.hidden = false;
    fill(
      ui.quiet,
      h('b', {}, r.title),
      h('span', { class: `me-chip me-${r.status}` }, OUTCOME_WORDS[r.status] || r.status),
      h('span', { class: 'me-quiet-words' }, answered ? 'Live in a newer message below.' : `Not answered yet. Ask Claude to show "${r.title}" again, or`),
      answered ? null : h('button', { type: 'button', class: 'me-link', onclick: wake }, 'use it here')
    );
    return;
  }
  ui.quiet.hidden = true;
  ui.card.hidden = false;
  const kind = r.kind || 'approve';
  ui.stage.dataset.kind = r.stage.kind;
  fill(ui.head, h('h1', {}, r.title), h('span', { class: `me-chip me-${r.status}` }, OUTCOME_WORDS[r.status] || r.status));
  fill(ui.ask, r.ask);
  const looks = r.stage.states && r.stage.target ? ['normal'].concat(r.stage.states) : [];
  ui.looks.hidden = looks.length === 0;
  fill(
    ui.looks,
    h('span', { class: 'me-label' }, 'Show it'),
    looks.map((l) =>
      h(
        'button',
        { type: 'button', role: 'radio', 'data-look': l, 'aria-checked': (state.look || 'normal') === l ? 'true' : 'false', onclick: () => showLook(l) },
        LOOK_WORDS[l] || l
      )
    )
  );
  ui.variants.hidden = !(r.variants && r.variants.length);
  fill(
    ui.variants,
    h('span', { class: 'me-label' }, 'Options'),
    (r.variants || []).map((v) =>
      h('button', { type: 'button', role: 'radio', 'aria-checked': r.variant === v.name ? 'true' : 'false', onclick: () => pickVariant(v) }, v.name)
    )
  );
  if (fields) fill(ui.fields, r.controls.map(controlEl));
  if (state.noteOpen || state.note) {
    if (!ui.note.querySelector('textarea')) {
      const ta = h('textarea', { rows: 2, placeholder: 'A note for Claude (optional)', 'aria-label': 'A note for Claude' });
      ta.value = state.note;
      ta.addEventListener('input', () => {
        state.note = ta.value;
      });
      fill(ui.note, h('div', { class: 'me-note' }, ta));
    }
  } else {
    fill(ui.note, h('button', { type: 'button', class: 'me-link me-addnote', onclick: openNote }, 'Add a note for Claude'));
  }
  fill(
    ui.actions,
    kind === 'approve'
      ? [
          h('button', { type: 'button', class: 'me-primary', onclick: () => decide('approved') }, 'Approve'),
          h('button', { type: 'button', class: 'me-secondary', onclick: () => decide('not-that') }, 'Not that')
        ]
      : h('button', { type: 'button', class: 'me-primary', onclick: () => decide('done') }, 'Done'),
    state.sent ? h('span', { class: 'me-sent' }, SENT_WORDS[state.sent]) : null
  );
  ui.err.hidden = !state.error;
  fill(ui.err, state.error || '');
  fill(ui.foot, `Kept in the project as ${r.id}. Ask Claude to show it again any time.`);
  renderChanged();
}

function openNote() {
  state.noteOpen = true;
  render({ fields: false });
  const ta = $('.me-note textarea');
  if (ta) ta.focus();
}

async function pickVariant(v) {
  try {
    const d = await postJson(api(`e/${state.id}/variant`), { name: v.name });
    state.ownWriteAt = Date.now();
    let allLive = true;
    for (const [key, value] of Object.entries(d.values || {})) {
      const c = state.record.controls.find((x) => x.key === key);
      if (c && !liveSet(c, value)) allLive = false;
    }
    await load();
    render();
    if (!allLive) rebuildStage();
  } catch (e) {
    state.error = e.message;
    render({ fields: false });
  }
}

async function start() {
  await load();
  render();
  postJson(api(`e/${state.id}/shown`), { panelId: state.panel ? state.panel.id : `browser-${Date.now().toString(36)}` }).catch(() => {});
  await rebuildStage();
  setInterval(poll, POLL_MS);
}

async function main() {
  render();
  await connectHost();
  if (!state.id) {
    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), HOSTED ? 8000 : 0));
    const got = await Promise.race([identity, timeout]);
    if (got) {
      state.id = got.id;
      state.panel = got.panel;
    } else if (state.reopenHint) {
      state.id = state.reopenHint;
      state.panel = { id: `m-${Date.now().toString(36)}`, seq: Date.now() };
    }
  } else if (HOSTED) {
    state.panel = { id: `m-${Date.now().toString(36)}`, seq: Date.now() };
  }
  if (!state.id) {
    if (!state.error) state.error = 'No mini editor was named: the agent\'s call carried no id.';
    render();
    return;
  }
  if (!(await claim(false))) {
    state.quiet = 'fresh';
    await load().catch(() => {});
    render();
    return;
  }
  try {
    await start();
  } catch (e) {
    state.error = e.message;
    render();
  }
}

main();
