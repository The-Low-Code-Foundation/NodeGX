// The grown-ups' settings screen. Behind a long press on ⚙️ and a sum typed in, so a child doesn't open it by accident.
// Every field of settings.js, with its limits, a kind message when a value is refused, and ↺ back to the game's value.
// Each change is stored at once (the server's settings.json, and a copy in this browser); closing reloads the game, which
// lays the settings over the default rows before anything reads them (main.js).
import { G, resetAll } from './state.js';
import { t, nm } from './i18n.js';
import { esc, toast } from './ui.js';
import { MOVES, OUTFITS, STYLES, NUMBERS, START } from './data.js';
import { SCHEMA, DEFAULTS, ICONS, THEMES, MAX_NEW, check, withField, valueOf, newRow, newIds, sanitize, fieldsOf, isNewId } from './settings.js';
import { getFile, putFile, flush } from './store.js';

const LOCAL_KEY = 'gala-settings-copy', APPLIED_KEY = 'gala-settings-applied', MAX_FILE = 100 * 1024;
export const GS = { file: { v: 1, rows: {} }, reached: true, dirty: false, tab: 'moves', openRows: new Set(), msg: null, status: '' };
const copy = (o) => JSON.parse(JSON.stringify(o));
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

/* ---------------- start-up: where the settings come from ---------------- */
// the server's file; this browser's copy only when the server can't be reached (or has lost its file)
export async function loadSettings() {
  const r = await getFile('settings');
  let local = null; try { local = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null'); } catch { /* a broken copy */ }
  GS.reached = r.reached;
  GS.file = sanitize(r.reached && r.data ? r.data : local || {}).file;
  if (r.reached && !r.data && local) putFile('settings', GS.file, 0);
  keepCopy();
  return GS.file;
}
const keepCopy = () => { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(GS.file)); } catch { /* storage blocked */ } };
// after the reload that applies them: say so
export function sayApplied() { try { if (sessionStorage.getItem(APPLIED_KEY)) { sessionStorage.removeItem(APPLIED_KEY); toast(t().gs.applied); } } catch { /* storage blocked */ } }

/* ---------------- the gate: a long press, then a sum ---------------- */
export function bindGear(btn) {
  let timer = null;
  const start = (e) => { if (e.button > 0) return; e.preventDefault(); clearTimeout(timer); btn.classList.add('holding'); timer = setTimeout(() => { timer = null; btn.classList.remove('holding'); openGate(); }, 2000); };
  const stop = (tell) => { btn.classList.remove('holding'); if (timer) { clearTimeout(timer); timer = null; if (tell) toast(t().gs.hold); } };
  btn.addEventListener('pointerdown', start);
  btn.addEventListener('pointerup', () => stop(true));
  btn.addEventListener('pointerleave', () => stop(false)); btn.addEventListener('pointercancel', () => stop(false));
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
  btn.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat && !timer) start(e); });
  btn.addEventListener('keyup', (e) => { if (e.key === 'Enter' || e.key === ' ') stop(true); });
  btn.onclick = (e) => e.preventDefault();
}
let gateEl = null;
export function openGate() {
  if (G.run) { toast(t().gs.notNow); return; }
  if (!gateEl) { gateEl = document.createElement('div'); gateEl.id = 'gate'; document.body.appendChild(gateEl); }
  const ask = (msg = '') => {
    const a = rnd(12, 19), b = rnd(3, 9), T = t().gs;
    gateEl.innerHTML = `<div class="box" role="dialog" aria-modal="true" aria-labelledby="gateH"><h2 id="gateH">${esc(T.gateH)}</h2><p id="gateQ">${esc(T.gateQ(a, b))}</p>`
      + `<input type="text" id="gateIn" inputmode="numeric" maxlength="4" autocomplete="off" aria-labelledby="gateQ"><p class="hint warn" id="gateMsg">${esc(msg)}</p>`
      + `<div class="chips"><button type="button" class="big" id="gateOk">${esc(T.ok)}</button><button type="button" id="gateNo">${esc(T.cancel)}</button></div></div>`;
    gateEl.hidden = false;
    const inp = gateEl.querySelector('#gateIn'), shut = () => { gateEl.hidden = true; };
    const go = () => { if (inp.value.trim() === String(a * b)) { shut(); openSettings(); } else ask(T.gateNo); };
    gateEl.querySelector('#gateOk').onclick = go; gateEl.querySelector('#gateNo').onclick = shut;
    inp.onkeydown = (e) => { if (e.key === 'Enter') go(); if (e.key === 'Escape') shut(); };
    inp.focus();
  };
  ask();
}

/* ---------------- the screen ---------------- */
let panel = null;
export function openSettings() {
  if (!panel) { panel = document.createElement('div'); panel.id = 'grown'; document.body.appendChild(panel); }
  panel.hidden = false; GS.msg = null; GS.status = GS.reached ? '' : t().gs.offline; render();
}
export async function closeSettings() {
  if (!panel) return;
  if (!GS.dirty) { panel.hidden = true; return; }
  await flush();
  try { sessionStorage.setItem(APPLIED_KEY, '1'); } catch { /* storage blocked */ }
  location.reload();
}
const TABS = ['moves', 'outfits', 'shop', 'school', 'file'];
function render() {
  const T = t().gs, body = panel.querySelector('.gbody'), top = body ? body.scrollTop : 0;
  // the rows open now stay open (read here: the toggle event can come after a quick Enter)
  for (const d of panel.querySelectorAll('details[data-row]')) if (d.open) GS.openRows.add(d.dataset.row); else GS.openRows.delete(d.dataset.row);
  panel.innerHTML = `<div class="gpanel" role="dialog" aria-modal="true" aria-labelledby="gTitle"><div class="ghead"><h2 id="gTitle">${esc(T.title)}</h2>`
    + `<button type="button" class="small" id="gLang">${esc(t().lang)}</button><button type="button" class="gclose" id="gClose">${esc(T.close)}</button></div>`
    + `<p class="hint">${esc(T.intro)}</p><nav class="chips gtabs">${TABS.map((k) => `<button type="button" data-gtab="${k}" aria-pressed="${GS.tab === k}">${esc(T.tabs[k])}</button>`).join('')}</nav>`
    + `<div class="gbody">${({ moves: () => rowsOf('moves'), outfits: () => rowsOf('outfits'), shop: shopTab, school: schoolTab, file: fileTab })[GS.tab]()}</div>`
    + `<div class="gstatus" id="gStatus" role="status">${esc(GS.status)}</div></div>`;
  panel.querySelector('.gbody').scrollTop = top;
  bind();
}
const nameOf = (table, id) => valueOf(GS.file, table, id, G.lang) || valueOf(GS.file, table, id, 'fr') || id;
const iconOf = (table, id) => valueOf(GS.file, table, id, 'icon') || '';
const isChanged = (table, id) => table === 'names' ? !!GS.file.rows.names?.[id] : !!GS.file.rows[table]?.[id];
// one row: its name, and its fields when opened
function rowBlock(table, id, extra = '') {
  const key = `${table}|${id}`, mine = isNewId(id), T = t().gs;
  let h = `<details class="grow" data-row="${esc(key)}"${GS.openRows.has(key) ? ' open' : ''}><summary><span class="ic">${esc(iconOf(table, id))}</span> ${esc(nameOf(table, id))}`
    + `${mine ? ` <small class="mine">${esc(T.mine)}</small>` : isChanged(table, id) ? ` <small class="chg">● ${esc(T.changed)}</small>` : ''}</summary><div class="gfields">`;
  for (const [f, spec] of Object.entries(fieldsOf(table, id))) h += field(table, id, f, spec);
  if (mine) h += `<button type="button" class="small" data-del="${esc(key)}">${esc(T.remove)}</button>`;
  return `${h}${extra}</div></details>`;
}
function rowsOf(table) {
  const T = t().gs, ids = [...newIds(GS.file, table), ...Object.keys(DEFAULTS[table])];
  return `<div class="chips"><button type="button" class="big" data-add="${table}">${esc(table === 'moves' ? T.addMove : T.addOutfit)}</button></div>${ids.map((id) => rowBlock(table, id)).join('')}`;
}
function shopTab() {
  return ['hairs', 'shoes', 'accs', 'pieces', 'snacks', 'upgrades'].map((table) => `<h3>${esc(t().gs.shopH[table])}</h3>${Object.keys(DEFAULTS[table]).map((id) => rowBlock(table, id)).join('')}`).join('');
}
function schoolTab() {
  const T = t().gs, stars = valueOf(GS.file, 'start', 'start', 'stars');
  let h = `<h3>${esc(T.startH)}</h3>${field('start', 'start', 'stars', SCHEMA.start.fields.stars)}<div class="chips"><button type="button" id="gNewSchool">${esc(T.newSchool(stars))}</button></div>`;
  h += `<h3>${esc(T.classesH)}</h3>${Object.keys(DEFAULTS.classes).map((id) => rowBlock('classes', id)).join('')}`;
  h += `<h3>${esc(T.numbersH)}</h3>${Object.keys(DEFAULTS.numbers).map((id) => rowBlock('numbers', id)).join('')}`;
  h += `<h3>${esc(T.namesH)}</h3>`;
  for (const cls of Object.keys(DEFAULTS.names)) {
    const key = `names|${cls}`;
    h += `<details class="grow" data-row="${esc(key)}"${GS.openRows.has(key) ? ' open' : ''}><summary>${esc(nameOf('classes', cls))}${isChanged('names', cls) ? ` <small class="chg">● ${esc(T.changed)}</small>` : ''}</summary><div class="gfields">`
      + DEFAULTS.names[cls].map((_, i) => field('names', cls, i, SCHEMA.names.list, `${i + 1}`)).join('') + '</div></details>';
  }
  return h;
}
function fileTab() {
  const T = t().gs;
  return `<h3>${esc(T.fileH)}</h3><p class="hint">${esc(T.fileHint)}</p><div class="chips"><button type="button" id="gSaveFile">${esc(T.saveFile)}</button>`
    + `<button type="button" id="gLoadFile">${esc(T.loadFile)}</button><input type="file" id="gFile" accept=".json,application/json" hidden></div>`
    + `<h3>${esc(T.allDefault)}</h3><div class="chips"><button type="button" id="gAllDefault">↺ ${esc(T.allDefault)}</button></div>`;
}

/* ---------------- one field ---------------- */
const LEVEL_ICON = ['⬇', '➖', '⬆'];
function field(table, id, f, spec, label) {
  const T = t().gs, key = `${table}|${id}|${f}`, v = valueOf(GS.file, table, id, f), def = table === 'names' ? DEFAULTS.names[id][f] : isNewId(id) ? undefined : DEFAULTS[table][id]?.[f];
  const name = label ?? (f === 'min' && table === 'hairs' ? T.f.minHair : T.f[f]), at = { 'data-t': table, 'data-id': id, 'data-f': f };
  const attrs = Object.entries(at).map(([k, x]) => `${k}="${esc(x)}"`).join(' ');
  const same = isNewId(id) ? !GS.file.rows[table]?.[id] : JSON.stringify(v) === JSON.stringify(def);
  const back = `<button type="button" class="gdef" data-def ${attrs} title="${esc(T.defTip)}" aria-label="${esc(T.defTip)} (${esc(name)})"${same ? ' disabled' : ''}>${T.def}</button>`;
  const msg = GS.msg && GS.msg.key === key ? `<span class="gmsg" role="alert">${esc(GS.msg.text)}</span>` : '';
  let input;
  if (spec.kind === 'text') input = `<input type="text" data-k="text" ${attrs} maxlength="${spec.max}" value="${esc(v ?? '')}" aria-label="${esc(name)}">`;
  else if (spec.kind === 'int' && spec.max - spec.min <= 2) {
    const lab = (n) => (f === 'd' ? '●'.repeat(n) + '○'.repeat(3 - n) : f === 'a' || f === 'b' ? `${LEVEL_ICON[n]} ${T.levels[n]}` : String(n));
    input = `<span class="chips">${Array.from({ length: spec.max - spec.min + 1 }, (_, k) => spec.min + k).map((n) => `<button type="button" data-k="set" ${attrs} data-v="${n}" aria-pressed="${v === n}">${esc(lab(n))}</button>`).join('')}</span>`;
  } else if (spec.kind === 'int') input = `<span class="gnum"><button type="button" data-k="step" ${attrs} data-d="-1" aria-label="−">−</button><input type="text" data-k="int" ${attrs} inputmode="numeric" maxlength="${String(spec.max).length + 1}" value="${esc(v ?? '')}" aria-label="${esc(name)}"><button type="button" data-k="step" ${attrs} data-d="1" aria-label="+">+</button></span>`;
  else if (f === 'icon') input = `<span class="gicons">${ICONS.map((ic) => `<button type="button" data-k="set" ${attrs} data-v="${esc(ic)}" aria-pressed="${v === ic}">${esc(ic)}</button>`).join('')}</span>`;
  else if (f === 'c') input = `<span class="chips">${spec.of.map((n) => `<button type="button" data-k="set" ${attrs} data-v="${n}" aria-pressed="${v === n}">${esc(t().countsShort(n))}</button>`).join('')}</span>`;
  else if (spec.kind === 'pick') {
    const src = f === 'like' ? MOVES : OUTFITS;
    input = `<select data-k="select" ${attrs} aria-label="${esc(name)}">${spec.of.map((k) => `<option value="${esc(k)}"${v === k ? ' selected' : ''}>${esc(`${src[k]?.icon || ''} ${nm(src[k])}`)}</option>`).join('')}</select>`;
  } else if (spec.kind === 'styles') {
    const on = v === '*' ? [] : String(v || '').split(' ');
    input = `<span class="chips"><button type="button" data-k="styles" ${attrs} data-v="*" aria-pressed="${v === '*'}">${esc(T.allStyles)}</button>${Object.entries(STYLES).map(([k, s]) => `<button type="button" data-k="styles" ${attrs} data-v="${k}" aria-pressed="${on.includes(k)}">${s.icon} ${esc(nm(s))}</button>`).join('')}</span>`;
  } else if (spec.kind === 'themes') {
    const on = Array.isArray(v) ? v : [];
    input = `<span class="chips">${THEMES.map((th) => `<button type="button" data-k="themes" ${attrs} data-v="${th}" aria-pressed="${on.includes(th)}">${esc(Object.values(NUMBERS).filter((n) => n.theme === th).map((n) => nm(n)).join(' / '))}</button>`).join('')}</span>`;
  }
  return `<div class="gf" data-key="${esc(key)}"><span class="gl">${esc(name)}</span><span class="gin">${input}${back}</span>${msg}</div>`;
}

/* ---------------- what each control does ---------------- */
const whyText = (why, table, id, f) => {
  const W = t().gs.why, spec = table === 'names' ? SCHEMA.names.list : fieldsOf(table, id)[f] || {};
  return why === 'long' ? W.long(spec.max) : why === 'range' ? W.range(spec.min, spec.max) : W[why] || W.field;
};
const target = (el) => { const id = el.dataset.id, table = el.dataset.t, f = table === 'names' ? +el.dataset.f : el.dataset.f; return { table, id, f }; };
// a value from a control: stored if valid, otherwise a kind message and nothing changes
function setValue(el, value) {
  const { table, id, f } = target(el), c = check(table, id, f, value);
  if (!c.ok) { GS.msg = { key: `${table}|${id}|${f}`, text: whyText(c.why, table, id, f) }; render(); return false; }
  GS.msg = null; commit(withField(GS.file, table, id, f, c.value)); return true;
}
function commit(next) {
  GS.file = sanitize(next).file; GS.dirty = true; keepCopy();
  GS.status = t().gs.saved; render();
  putFile('settings', GS.file).then((ok) => { GS.status = ok ? t().gs.saved : t().gs.offline; const s = panel && panel.querySelector('#gStatus'); if (s) s.textContent = GS.status; });
}
function bind() {
  const $ = (s) => panel.querySelector(s), all = (s) => panel.querySelectorAll(s), T = t().gs;
  $('#gClose').onclick = closeSettings;
  $('#gLang').onclick = () => { document.getElementById('langBtn').click(); render(); };
  panel.onkeydown = (e) => { if (e.key === 'Escape' && !e.target.matches('input, select')) closeSettings(); };
  for (const b of all('[data-gtab]')) b.onclick = () => { GS.tab = b.dataset.gtab; GS.msg = null; render(); panel.querySelector('.gbody').scrollTop = 0; };
  for (const d of all('details[data-row]')) d.ontoggle = () => { if (d.open) GS.openRows.add(d.dataset.row); else GS.openRows.delete(d.dataset.row); };
  for (const el of all('input[data-k="text"], input[data-k="int"]')) {
    el.onchange = () => setValue(el, el.value);
    el.onkeydown = (e) => { if (e.key === 'Enter') el.blur(); };
  }
  for (const el of all('select[data-k="select"]')) el.onchange = () => setValue(el, el.value);
  for (const b of all('[data-k="set"]')) b.onclick = () => setValue(b, b.dataset.f === 'icon' ? b.dataset.v : +b.dataset.v);
  for (const b of all('[data-k="step"]')) b.onclick = () => {
    const { table, id, f } = target(b), spec = fieldsOf(table, id)[f], v = valueOf(GS.file, table, id, f) ?? spec.min;
    const n = Math.max(spec.min, Math.min(spec.max, v + +b.dataset.d * (f === 'stars' ? 5 : 1)));
    if (n !== v) setValue(b, n);
  };
  for (const b of all('[data-k="styles"]')) b.onclick = () => {
    const { table, id, f } = target(b), v = valueOf(GS.file, table, id, f), k = b.dataset.v;
    if (k === '*') { setValue(b, '*'); return; }
    const on = new Set(v === '*' ? [] : String(v).split(' ').filter(Boolean)); if (on.has(k)) on.delete(k); else on.add(k);
    setValue(b, on.size ? [...on].join(' ') : '');
  };
  for (const b of all('[data-k="themes"]')) b.onclick = () => {
    const { table, id, f } = target(b), on = new Set(valueOf(GS.file, table, id, f) || []), k = b.dataset.v;
    if (on.has(k)) on.delete(k); else on.add(k); setValue(b, [...on]);
  };
  for (const b of all('[data-def]')) b.onclick = () => { const { table, id, f } = target(b); GS.msg = null; commit(withField(GS.file, table, id, f, undefined)); };
  for (const b of all('[data-add]')) b.onclick = () => {
    const table = b.dataset.add, { id, row } = newRow(table, GS.file);
    if (!id) { toast(T.maxNew(MAX_NEW)); return; }
    const next = copy(GS.file); next.rows[table] = { ...(next.rows[table] || {}), [id]: row };
    GS.openRows.add(`${table}|${id}`); commit(next);
  };
  for (const b of all('[data-del]')) b.onclick = () => {
    const [table, id] = b.dataset.del.split('|');
    if (!confirm(T.removeAsk(nameOf(table, id)))) return;
    const next = copy(GS.file); delete next.rows[table][id]; if (!Object.keys(next.rows[table]).length) delete next.rows[table];
    commit(next);
  };
  const ns = $('#gNewSchool');
  if (ns) ns.onclick = () => {
    const stars = valueOf(GS.file, 'start', 'start', 'stars');
    if (!confirm(T.newSchoolAsk(stars))) return;
    START.stars = stars; resetAll(); GS.dirty = true; closeSettings();
  };
  const sf = $('#gSaveFile');
  if (sf) sf.onclick = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(GS.file, null, 2)], { type: 'application/json' })), a = document.createElement('a');
    a.href = url; a.download = 'gala-de-danse-reglages.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const lf = $('#gLoadFile'), fi = $('#gFile');
  if (lf) lf.onclick = () => fi.click();
  if (fi) fi.onchange = async () => {
    const file = fi.files && fi.files[0]; fi.value = ''; if (!file) return;
    if (file.size > MAX_FILE) { toast(T.bigFile); return; }
    let obj; try { obj = JSON.parse(await file.text()); } catch { toast(T.badFile); return; }
    // a settings file has a version and rows, or (an older one) at least one table the game knows
    const isSettings = obj && typeof obj === 'object' && !Array.isArray(obj) && ((obj.v !== undefined && obj.rows) || Object.keys(obj).some((k) => Object.hasOwn(SCHEMA, k)));
    if (!isSettings) { toast(T.badFile); return; }
    const r = sanitize(obj);
    commit(r.file); toast(T.loaded(r.dropped));
  };
  const ad = $('#gAllDefault');
  if (ad) ad.onclick = () => { if (confirm(T.allDefaultAsk)) commit({ v: 1, rows: {} }); };
}
