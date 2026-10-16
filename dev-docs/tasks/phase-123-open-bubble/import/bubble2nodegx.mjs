#!/usr/bin/env node
// bubble2nodegx — a spike: a Bubble app export (.bubble / JSON) → a NodeGX v2 project folder.
// Usage: node bubble2nodegx.mjs <export.json> <outdir>
// No dependencies. Everything it cannot map is written to <outdir>/docs/IMPORT-REPORT.md as a finding,
// and placed in the graph as a labelled placeholder so the page still opens.
import fs from 'node:fs';
import path from 'node:path';

const [,, srcPath, outDir] = process.argv;
if (!srcPath || !outDir) { console.error('usage: bubble2nodegx.mjs <export.json> <outdir>'); process.exit(2); }
const app = JSON.parse(fs.readFileSync(srcPath, 'utf8'));

// ---------------------------------------------------------------- bookkeeping
const findings = []; // { level: 'ok'|'todo'|'ai', where, what }
const stats = { elements: 0, customStates: 0, reusables: 0, optionSets: 0, fieldReadsGuessed: 0, mapped: 0, placeholders: 0, workflows: 0, actions: 0, actionsMapped: 0, expressions: 0, exprOpsUnknown: 0, styles: 0, states: 0 };
const todo = (where, what) => findings.push({ level: 'todo', where, what });
const ai = (where, what) => findings.push({ level: 'ai', where, what });
const px = (n) => ({ value: Number(n), unit: 'px' });
const pct = (n) => ({ value: Number(n), unit: '%' });
const cssLen = (s) => { const m = /^(-?[\d.]+)(px|%)$/.exec(String(s ?? '')); return m ? { value: Number(m[1]), unit: m[2] } : undefined; };
const safeName = (s) => String(s).replace(/[\/\\:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
let uid = 0; const fresh = (p) => `${p}_${(++uid).toString(36)}`;
const uuid = (seed) => { // deterministic, from a string
  let h = 2166136261; for (const c of seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  const x = (h.toString(16) + '0000000000000000').slice(0, 12) + (Math.imul(h, 97).toString(16) + '0000000000000000').slice(0, 20);
  return `${x.slice(0,8)}-${x.slice(8,12)}-5${x.slice(13,16)}-8${x.slice(17,20)}-${x.slice(20,32).padEnd(12,'0')}`;
};

// ---------------------------------------------------------------- app-level: types, tokens, api calls
const userTypes = app.user_types || {};
const typeDisplay = (t) => { const k = String(t).replace(/^custom\./, ''); return userTypes[k]?.display || k; };
const fieldDisplay = (typeKey, fieldKey) => {
  const t = userTypes[String(typeKey).replace(/^custom\./, '')];
  const f = t?.fields?.[fieldKey]; if (f?.display) return f.display;
  return String(fieldKey).replace(/^custom\./, '').replace(/_(text|number|boolean|date|date_range|image|file|user|geographic_address)$/, '').replace(/_(list|custom|option)_[a-z0-9_.]+$/, '').replace(/_$/, '');
};
const optionSets = app.option_sets || {};
const customElements = app.custom_elements || {}; // reusable elements: id (key) → { name, properties, elements, workflows }
const pluginsInstalled = app.plugins_installed || {};
const pluginName = (typeKey) => { const m = /^(\d{13}x\d+)-(\w+)$/.exec(typeKey); if (!m) return null; const p = pluginsInstalled[m[1]]; return p ? `${p.human}: ${p.elements[m[2]] || p.actions[m[2]] || m[2]}` : `plugin ${m[1]} (${m[2]})`; };
const allFieldKeys = new Map(); // field key → display, across every data type
for (const t of Object.values(userTypes)) for (const [fk, fd] of Object.entries((t && t.fields) || {})) if (fd && typeof fd === 'object') allFieldKeys.set(fk, fd.display || fk);
const bubbleFieldType = (v) => typeof v !== 'string' ? 'String' : ({ text: 'String', number: 'Number', boolean: 'Boolean', date: 'Date', image: 'String', file: 'String', geographic_address: 'Object' }[v] || (v.startsWith('list.') ? 'Array' : v.startsWith('custom.') ? 'Pointer' : v.startsWith('option.') ? 'String' : 'String'));

const dbCollections = Object.entries(userTypes).filter(([k, t]) => t && typeof t === 'object' && (t.fields || t.display)).map(([k, t]) => ({
  name: t.display || k,
  columns: Object.entries(t.fields || {}).filter(([, f]) => f && typeof f === 'object').map(([fk, f]) => ({ name: f.display || fieldDisplay(k, fk), type: bubbleFieldType(f.value || 'text') })),
  createdAt: null,
}));
for (const [k, t] of Object.entries(userTypes)) if (t.privacy_role) ai(`data type ${t.display || k}`, `privacy rules (${Object.keys(t.privacy_role).join(', ')}) are not converted; nodegx.security.json needs a human or an AI pass`);

const cs = app.settings?.client_safe || {};
const customTokens = [];
const rgbTriple = (v) => { const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(v); return m ? `${m[1]}, ${m[2]}, ${m[3]}` : null; };
for (const [group, shades] of Object.entries(cs.color_tokens || {})) for (const [shade, value] of Object.entries(shades)) {
  customTokens.push({ name: `--color_${group}_${shade}`, value, category: 'color-semantic', isCustom: true, description: `Bubble colour token ${group}/${shade}` });
  const t = rgbTriple(value); if (t) customTokens.push({ name: `--color_${group}_${shade}_rgb`, value: t, category: 'color-semantic', isCustom: true, description: `Bubble colour token ${group}/${shade}, as r, g, b` });
}
for (const [name, value] of Object.entries(cs.font_tokens || {})) customTokens.push({ name: `--font_${name}`, value, category: 'typography', isCustom: true, description: `Bubble font token ${name}` });
let usedMaterialIcons = false; const fontsUsed = new Map(); // s4: family → weights, for the Google Fonts link in settings.headCode
const fontOf = (s) => { if (!s) return undefined; const m = /^var\(--font_(\w+)\)/.exec(s); return m ? (cs.font_tokens?.[m[1]] || s) : s; };

// API Connector: id → { name, url, method, types }
const apiCalls = {};
for (const [apiId, api] of Object.entries(cs.apiconnector2 || {})) for (const [callId, call] of Object.entries(api.calls || {})) {
  let types = {}; try { types = JSON.parse(call.types || '{}'); } catch {}
  apiCalls[`${apiId}.${callId}`] = { id: `${apiId}.${callId}`, api: api.human, name: call.name, url: call.url, method: (call.method || 'get').toUpperCase(), types, publish_as: call.publish_as };
}
const apiFieldPath = (field) => { // "_api_c2_entries" → path from the types tables, else the name without its prefix
  for (const call of Object.values(apiCalls)) for (const table of Object.values(call.types)) { const f = table.fields?.[field]; if (f?.path) return f.path; }
  return [field.replace(/^_api_c2_/, '')];
};
if (Object.keys(cs.plugins || {}).some((p) => p !== 'apiconnector2')) ai('settings', `plugins installed: ${Object.keys(cs.plugins).join(', ')} — plugin elements and actions have no NodeGX counterpart; each one is a hand or AI port`);

// ---------------------------------------------------------------- styles → variants
const styleTypeMap = { Button: 'net.noodl.controls.button', Text: 'Text', Group: 'Group', Input: 'net.noodl.controls.textinput', MultiLineInput: 'net.noodl.controls.textinput', Image: 'Image', Checkbox: 'net.noodl.controls.checkbox', Dropdown: 'net.noodl.controls.options', RepeatingGroup: 'Group', Icon: 'net.noodl.visual.icon', Link: 'Text', Shape: 'Group', Popup: 'Group', FloatingGroup: 'Group', GroupFocus: 'Group', Alert: 'Group', RadioButtons: 'net.noodl.controls.options', AutocompleteDropdown: 'net.noodl.controls.options' };

// Bubble visual properties → NodeGX parameters (shared by styles and elements)
function styleParams(p, type) {
  const o = {};
  if ((p.background_style === 'bgcolor' || p.background_style == null) && p.bgcolor) o.backgroundColor = p.bgcolor;
  if (p.background_style === 'gradient' && p.background_gradient_from) o.backgroundGradient = `linear-gradient(to ${p.background_gradient_direction || 'bottom'}, ${p.background_gradient_from}, ${p.background_gradient_to})`;
  if (p.background_style === 'none') o.backgroundColor = 'transparent';
  if (p.background_style === 'image') { const url = typeof p.background_image === 'string' ? p.background_image : textLiteral(p.background_image); if (url) { o.backgroundImage = url.startsWith('//') ? 'https:' + url : url; o.backgroundSize = p.background_size_cover === false ? 'contain' : 'cover'; o.backgroundPosition = 'center'; if (p.bgcolor) o.backgroundColor = p.bgcolor; } }
  if (p.border_style && p.border_style !== 'none') { o.borderStyle = ['solid', 'dotted', 'dashed'].includes(p.border_style) ? p.border_style : 'solid'; if (p.border_width != null) o.borderWidth = px(p.border_width); if (p.border_color) o.borderColor = p.border_color; }
  else if (p.border_color && p.border_style == null && (type === 'Input' || type === 'MultiLineInput' || type === 'Dropdown')) { o.borderStyle = 'solid'; o.borderWidth = px(p.border_width ?? 1); o.borderColor = p.border_color; }
  if (p.border_roundness != null) o.borderRadius = px(p.border_roundness);
  if (p.boxshadow_style && p.boxshadow_style !== 'none') { o.boxShadowEnabled = true; o.boxShadowOffsetX = px(p.boxshadow_horizontal ?? 0); o.boxShadowOffsetY = px(p.boxshadow_vertical ?? 0); o.boxShadowBlurRadius = px(p.boxshadow_blur ?? 0); o.boxShadowSpreadRadius = px(p.boxshadow_spread ?? 0); if (p.boxshadow_color) o.boxShadowColor = p.boxshadow_color; if (p.boxshadow_style === 'inset') o.boxShadowInset = true; }
  if (p.font_color) o.color = p.font_color;
  if (p.font_size != null) o.fontSize = px(p.font_size);
  const faceWeight = /:::(\d{3}|regular|bold)/.exec(String(p.font_face || ''))?.[1];
  if (p.font_weight) o.fontWeight = String(p.font_weight); else if (faceWeight) o.fontWeight = faceWeight === 'regular' ? '400' : faceWeight === 'bold' ? '700' : faceWeight; else if (p.bold) o.fontWeight = '700';
  const family = fontOf(p.font_family) || (p.font_face ? String(p.font_face).split(':::')[0] : undefined);
  if (family) { o.fontFamily = family; if (!fontsUsed.has(family)) fontsUsed.set(family, new Set()); fontsUsed.get(family).add(Number(o.fontWeight || 400)); }
  if (p.line_height != null) o.lineHeight = Number(p.line_height);
  if (p.letter_spacing != null) o.letterSpacing = px(p.letter_spacing);
  if (p.font_alignment) o.textAlignX = p.font_alignment;
  for (const side of ['top', 'left', 'right', 'bottom']) { const S = side[0].toUpperCase() + side.slice(1); if (p[`padding_${side}`] != null) o[`padding${S}`] = px(p[`padding_${side}`]); if (p[`margin_${side}`] != null) o[`margin${S}`] = px(p[`margin_${side}`]); }
  if (p.opacity != null) o.opacity = Number(p.opacity) / 100;
  return o;
}
function layoutParams(p, parentLayout, type) {
  const o = {};
  const isContainer = ['Group', 'Page', 'RepeatingGroup', 'Popup', 'FloatingGroup', 'GroupFocus', 'Shape', 'Alert'].includes(type);
  if (isContainer) {
    const cl = p.container_layout;
    if (cl === 'row' || cl === 'column') { o.flexDirection = cl; if (p.use_gap) { if (p.row_gap != null) o.rowGap = px(p.row_gap); if (p.column_gap != null) o.columnGap = px(p.column_gap); } }
    const ax = { 'flex-start': 'flex-start', center: 'center', 'flex-end': 'flex-end', stretch: 'stretch', 'space-between': 'space-between', 'space-around': 'space-around' };
    const ai2 = (v) => ({ 'flex-start': 'flex-start', center: 'center', 'flex-end': 'flex-end', stretch: 'stretch' }[v] || 'center');
    if (cl === 'column') { if (p.container_horiz_alignment) o.alignItems = ai2(p.container_horiz_alignment); if (p.container_vert_alignment) o.justifyContent = ax[p.container_vert_alignment] || 'flex-start'; }
    if (cl === 'row') { if (p.container_horiz_alignment) o.justifyContent = ax[p.container_horiz_alignment] || 'flex-start'; if (p.container_vert_alignment) o.alignItems = ai2(p.container_vert_alignment); }
    if (p.clip) o.clip = true;
  }
  const aligned = parentLayout === 'relative' && !p.__inflow; // s4: Bubble "Align to parent": children sit on a 3×3 grid (nonant_alignment "<v><h>", a/b/c = start/center/end) with margins as offsets
  const absolute = parentLayout === 'fixed' || parentLayout === 'old' || aligned;
  if (absolute && !aligned) { o.position = 'absolute'; o.marginLeft = px(p.left ?? 0); o.marginTop = px(p.top ?? 0); }
  if (aligned) { o.position = 'absolute'; const na = String(p.nonant_alignment || 'aa'); o.alignY = { a: 'top', b: 'center', c: 'bottom' }[na[0]] || 'top'; o.alignX = { a: 'left', b: 'center', c: 'right' }[na[1]] || 'left'; }
  if (isContainer && p.container_layout === 'relative') o.position = o.position || 'relative';
  if (p.__inflow) { o.position = 'relative'; if (p.zindex != null) o.zIndex = Number(p.zindex); } // the in-flow child of an "Align to parent" container keeps its stacking order over the absolute siblings
  if (p.rotation_angle) o.transformRotation = Number(p.rotation_angle);
  if (!absolute && parentLayout === 'flex' && p.vert_alignment && p.vert_alignment !== 'stretch') o.alignY = { 'flex-start': 'top', center: 'center', 'flex-end': 'bottom' }[p.vert_alignment] || 'top';
  // width
  const stretch = !absolute && p.horiz_alignment === 'stretch';
  if (p.single_width === true || absolute) { if (p.width != null && p.width > 0) o.width = px(p.width); }
  else if (stretch) o.width = pct(100);
  else if (p.fit_width) {/* content */}
  else o.width = pct(100); // Bubble: not fixed-width = grows to fill, between min and max
  const minW = cssLen(p.min_width_css), maxW = cssLen(p.max_width_css);
  if (minW && minW.value > 0) o.minWidth = minW; if (maxW) o.maxWidth = maxW;
  // height
  if (p.is_visible === false) o[p.collapse_when_hidden === false ? 'visible' : 'mounted'] = false;
  if (p.single_height === true || absolute) { if (p.height != null && (p.height > 0 || !absolute)) o.height = px(p.height); }
  else { const minH = cssLen(p.min_height_css); if (minH && minH.value > 0) o.minHeight = minH; }
  const maxH = cssLen(p.max_height_css); if (maxH) o.maxHeight = maxH;
  const fitW = !o.width, fitH = !o.height;
  o.sizeMode = fitW && fitH ? 'contentSize' : fitH ? 'contentHeight' : fitW ? 'contentWidth' : 'explicit';
  if (!absolute && !o.alignX && p.horiz_alignment && p.horiz_alignment !== 'stretch') o.alignX = { 'flex-start': 'left', center: 'center', 'flex-end': 'right' }[p.horiz_alignment] || 'left';
  if (p.zindex != null && absolute) o.zIndex = Number(p.zindex);
  if (p.collapse_when_hidden === false) {/* NodeGX visible=false always collapses */}
  return o;
}

const variants = [];
for (const [styleId, st] of Object.entries(app.styles || {})) {
  const typename = styleTypeMap[st.type]; if (!typename) { todo(`style ${styleId}`, `no NodeGX element for a Bubble ${st.type}; style skipped`); continue; }
  const v = { name: st.display || styleId, typename, parameters: styleParams(st.properties || {}, st.type), stateParameters: {}, stateTransitions: {} };
  if (typename === 'Text' || typename === 'net.noodl.visual.icon') for (const k of Object.keys(v.parameters)) if (/^(padding|background|border|boxShadow)/.test(k)) delete v.parameters[k];
  for (const s of Object.values(st.states || {})) { const state = elementStateName(s.condition); if (state) v.stateParameters[state] = styleParams(s.properties || {}, st.type); else todo(`style ${styleId}`, `a conditional state whose condition is not hover/focus/pressed: ${JSON.stringify(s.condition).slice(0, 120)}`); }
  if (st.transitions) for (const [prop, tr] of Object.entries(st.transitions)) v.stateTransitions[prop] = { curve: tr.fn || 'ease', duration: tr.duration || 200 };
  variants.push(v); stats.styles++;
}
function elementStateName(cond) { // a "this element is hovered" condition → a NodeGX visual state
  if (cond?.type === 'ThisElement' && cond.next?.type === 'Message' && !cond.next.next) return { is_hovered: 'hover', is_focused: 'focused', is_pressed: 'pressed' }[cond.next.name] || null;
  return null;
}

// ---------------------------------------------------------------- pages
const pages = Object.entries(app.pages || {}).filter(([, p]) => p.type === 'Page');
for (const [, p] of Object.entries(app.pages || {})) if (p.type !== 'Page') ai(`pages/${p.name || p.id}`, `top-level entry of type ${p.type} — not converted`);
const pageById = {}; for (const [key, p] of pages) pageById[p.id] = p;
const pageComponentPath = (p) => `/Pages/${safeName(p.name)}`;
const components = []; // { path, type, nodes, connections, description }
const elementIndex = {}; // bubble inner id → { nodeId, type, componentPath }
const elementValuePort = { 'net.noodl.controls.textinput': 'onTextChanged', 'net.noodl.controls.checkbox': 'checked', 'net.noodl.controls.options': 'value' };

class Graph {
  constructor(path, kind, description) { this.path = path; this.kind = kind; this.nodes = []; this.connections = []; this.description = description; this.singletons = {}; this.lx = 700; this.ly = 40; graphByPath[path] = this; }
  add(n) { if (n.x == null) { n.x = this.lx; n.y = this.ly; this.ly += 110; } this.nodes.push(n); return n; }
  wire(fromId, fromProperty, toId, toProperty) { this.connections.push({ fromId, fromProperty, toId, toProperty }); }
  singleton(key, make) { if (!this.singletons[key]) this.singletons[key] = this.add(make()); return this.singletons[key]; }
}

const inflowOf = {}; // s4: an "Align to parent" container's biggest child stays in flow and gives the container its height, as Bubble's fit_height does; the other children are absolute over it on the 3×3 grid
function markInflow(elements) { for (const el of Object.values(elements || {})) { if (!el || typeof el !== 'object' || !el.elements) continue; if (el.properties?.container_layout === 'relative') { let best = null, area = -1; for (const c of Object.values(el.elements)) { if (!c || typeof c !== 'object') continue; const cp = c.properties || {}; const a = (cp.width || 0) * (cp.height || 0); if (a > area) { area = a; best = c; } } if (best) { inflowOf[el.id] = best; best.properties = best.properties || {}; best.properties.__inflow = true; } } markInflow(el.elements); } }
for (const [, pg] of Object.entries(app.pages || {})) markInflow(pg.elements); for (const d of Object.values(customElements)) markInflow(d && d.elements);
function convertPage(bubblePage) {
  const g = new Graph(pageComponentPath(bubblePage), 'page', `Converted from Bubble page "${bubblePage.name}" (${bubblePage.id})`);
  components.push(g);
  const pp = bubblePage.properties || {};
  const pageLayout = pp.new_responsive ? (!pp.container_layout || pp.container_layout === 'fixed' ? 'fixed' : 'flex') : 'old';
  const pageNode = g.add({ id: `page_${bubblePage.id}`, type: 'Page', label: bubblePage.name, parameters: { title: textLiteral(pp.title) || bubblePage.name, urlPath: bubblePage.name === 'index' ? '' : bubblePage.name }, children: [], x: 40, y: 40 });
  const root = g.add({ id: `root_${bubblePage.id}`, type: 'Group', label: `Page ${bubblePage.name}`, parent: pageNode.id, parameters: { ...layoutParams({ ...pp, horiz_alignment: 'stretch', width: undefined, height: undefined, single_width: false, single_height: false }, 'flex', 'Page'), width: pct(100), ...(pp.backdrop_background_style === 'bgcolor' && pp.backdrop_bgcolor ? { backgroundColor: pp.backdrop_bgcolor } : {}) }, children: [], x: 100, y: 160 });
  if (pp.min_height_px) root.parameters.minHeight = px(pp.min_height_px); else if (pageLayout !== 'flex' && pp.height) root.parameters.minHeight = px(pp.height);
  if (pageLayout !== 'flex') root.parameters.position = 'relative';
  if (!pp.backdrop_background_style && pp.backdrop_bgcolor) root.parameters.backgroundColor = pp.backdrop_bgcolor;
  root.parameters.sizeMode = 'contentHeight';
  if (!pp.container_layout) root.parameters.flexDirection = 'column';
  pageNode.children.push(root.id);
  elementIndex[bubblePage.id] = { nodeId: pageNode.id, type: 'Page', componentPath: g.path, page: bubblePage };
  for (const [sk, sv] of Object.entries(bubblePage.custom_states || {})) { const name = `${bubblePage.name}.${sv.display || sk}`.replace(/\W+/g, '_'); g.add({ id: `state_${bubblePage.id}_${sk.replace(/\W+/g, '_')}`, type: 'Variable2', label: `State ${sv.display || sk} of the page`, parameters: { name, ...(sv.default_val !== undefined ? { value: sv.default_val } : {}) }, metadata: { customState: { of: pageNode.id, name: sv.display || sk, type: sv.value, list: String(sv.value || '').startsWith('list.') } } }); stats.customStates++; }
  convertChildren(g, bubblePage.elements, root, pageLayout, bubblePage, 1, 160);
  if (pageLayout === 'old') ai(`page ${bubblePage.name}`, `old (absolute) responsive engine: every element placed by left/top in px; a human or an AI pass should re-flow it into rows and columns`);
  for (const wf of Object.values(bubblePage.workflows || {})) if (wf && typeof wf === 'object' && wf.type) { try { convertWorkflow(g, wf, bubblePage); } catch (e) { stats.crashes = (stats.crashes || 0) + 1; todo(`${bubblePage.name} workflow ${wf.id}`, `the converter threw on this ${wf.type}: ${String(e.message).slice(0, 100)}`); } }
  return g;
}

const BB = /\[\/?(b|i|u|s|sup|sub|ul|ol|li|center|left|right|h\d|color|size|font|url|img|br)(=[^\]]*)?\]/g;
function textLiteral(te) { if (!te) return undefined; if (typeof te === 'string') return te.replace(BB, ''); if (te.type === 'TextExpression') { const e = Object.values(te.entries || {}); if (e.every((x) => typeof x === 'string')) return e.join('').replace(BB, ''); } return undefined; }

function convertChildren(g, elements, parentNode, parentLayout, bubblePage, depth, y0) {
  const kids = Object.entries(elements || {}).filter(([k, v]) => k !== 'length' && v && typeof v === 'object' && v.type && !['AllOptionValue', 'OptionValue', 'OneOptionValue', 'ArbitraryText', 'GeoAddress', 'parameter', 'path_segment', 'CurrentCellsIndex', 'CurrentPageItem'].includes(v.type) && !v.deleted);
  kids.sort((a, b) => ((a[1].properties?.order ?? a[1].order ?? 0) - (b[1].properties?.order ?? b[1].order ?? 0)) || ((a[1].properties?.zindex ?? 0) - (b[1].properties?.zindex ?? 0)));
  let y = y0;
  for (const [, el] of kids) { try { y = convertElement(g, el, parentNode, parentLayout, bubblePage, depth, y); } catch (e) { stats.crashes = (stats.crashes || 0) + 1; todo(`${bubblePage.name} / ${el.name || el.default_name || el.id}`, `the converter threw on this ${el.type}: ${String(e.message).slice(0, 100)}`); } }
}

const graphByPath = {}; // component path → Graph
const rowPaths = {}; // repeating group id → its row component path, unique
const rowPathFor = (pageName, label, id) => { if (rowPaths[id]) return rowPaths[id]; let p = `/Rows/${safeName(pageName)} ${safeName(label)}`; if (Object.values(rowPaths).includes(p)) p += ` ${id}`; rowPaths[id] = p; return p; };
const groupDataNode = {}; // a Group's node id → the Expression node id holding its data source
function preIndex(elements, componentPath, pageName) {
  for (const [, el] of Object.entries(elements || {})) {
    if (!el || typeof el !== 'object' || !el.type || !el.id) continue;
    const ntype = typeMap[el.type] || (el.type === 'CustomElement' ? reusablePath(el.properties?.custom_id) : null) || 'Group';
    elementIndex[el.id] = { nodeId: `el_${el.id}`, type: ntype, bubbleType: el.type, componentPath, label: el.name || el.default_name || el.type, page: pageName };
    if (el.type === 'RepeatingGroup') preIndex(el.elements, rowPathFor(pageName, el.name || el.default_name || el.type, el.id), pageName);
    else preIndex(el.elements, componentPath, pageName);
  }
}
const reusableKeyById = {}; for (const [k, d] of Object.entries(customElements)) if (d && d.id) reusableKeyById[d.id] = k;
const reusablePath = (id) => { const key = customElements[id] ? id : reusableKeyById[id]; const def = customElements[key]; return def ? `/Reusable/${safeName(def.name || key)}` : null; };
const typeMap = { Group: 'Group', Text: 'Text', Button: 'net.noodl.controls.button', Input: 'net.noodl.controls.textinput', MultiLineInput: 'net.noodl.controls.textinput', Image: 'Image', Checkbox: 'net.noodl.controls.checkbox', Dropdown: 'net.noodl.controls.options', RadioButtons: 'net.noodl.controls.options', AutocompleteDropdown: 'net.noodl.controls.options', Icon: 'net.noodl.visual.icon', Shape: 'Group', Popup: 'Group', FloatingGroup: 'Group', GroupFocus: 'Group', Alert: 'Group', Link: 'Text', RepeatingGroup: 'Group' };

function convertElement(g, el, parentNode, parentLayout, bubblePage, depth, y) {
  stats.elements++;
  const p = el.properties || {};
  let ntype = typeMap[el.type];
  const label = el.name || el.default_name || el.type;
  const reusable = el.type === 'CustomElement' ? reusablePath(p.custom_id) : null;
  if (reusable) ntype = reusable;
  const plugin = !ntype ? pluginName(el.type) : null;
  const node = { id: `el_${el.id}`, type: ntype || 'Group', label: ntype ? label : `Bubble ${plugin || el.type}: ${label} (placeholder)`, parent: parentNode.id, parameters: {}, x: 100 + depth * 60, y };
  if (!ntype) { stats.placeholders++; (plugin ? ai : todo)(`${bubblePage.name} / ${label}`, plugin ? `plugin element ${plugin}: its code is in static.js (window.plugins), a kit node is a port` : `Bubble element type ${el.type} has no mapping yet; a Group placeholder stands in`); }
  else stats.mapped++;
  if (el.type === 'HTML') ai(`${bubblePage.name} / ${label}`, `an HTML element (${(textLiteral(p.html) || '').slice(0, 60).replace(/\n/g, ' ')}…): raw HTML/CSS, a person decides what it becomes`);
  node.parameters = { ...layoutParams(p, parentLayout, el.type), ...styleParams(p, el.type) };
  const TEXT_ONLY = (k) => /^(padding|background|border|boxShadow|clip$|flexDirection|rowGap|columnGap|alignItems|justifyContent)/.test(k);
  if (ntype === 'Text' && ((p.background_style === 'bgcolor' && p.bgcolor) || (p.border_style && p.border_style !== 'none'))) { node._box = {}; for (const k of Object.keys(node.parameters)) if (TEXT_ONLY(k)) node._box[k] = node.parameters[k]; } // s4: a Text takes no box; the box goes on a Group around it
  if (ntype === 'Text' || ntype === 'net.noodl.visual.icon') for (const k of Object.keys(node.parameters)) if (TEXT_ONLY(k)) delete node.parameters[k];
  const dynamic = [];
  if (ntype === 'Text') { const t = textLiteral(p.text); if (t !== undefined) node.parameters.text = t; else if (p.text) dynamic.push(['text', p.text]); }
  if (el.type === 'Link' && node.parameters.text === undefined && !p.text) node.parameters.text = ''; // s4: an icon-only Link has no text; the node's default "Text" would show
  if (node._box) { const box = node._box; delete node._box; if (node.parameters.text !== undefined) { const LAYOUT = /^(width|minWidth|maxWidth|height|minHeight|maxHeight|sizeMode|margin|position|alignX|alignY|zIndex|opacity|mounted|visible|transform)/; const tp = {}; const gp = { ...box, flexDirection: 'column', justifyContent: p.vertical_centering ? 'center' : 'flex-start' }; for (const [k, v] of Object.entries(node.parameters)) (LAYOUT.test(k) ? gp : tp)[k] = v; tp.width = pct(100); tp.sizeMode = 'contentHeight'; node._iconChild = { id: `text_${el.id}`, type: 'Text', label: `${label} text`, parent: node.id, parameters: tp, x: node.x + 60, y: y + 110 }; node.type = 'Group'; ntype = 'Group'; node.parameters = gp; node.children = []; } }
  if (ntype === 'net.noodl.controls.button') { const t = textLiteral(p.text); node.parameters.label = t ?? label; node.parameters.useLabel = true; if (t === undefined && p.text) dynamic.push(['label', p.text]); }
  if (ntype === 'net.noodl.controls.textinput') { const ph = textLiteral(p.placeholder); if (ph) node.parameters.placeholder = ph; else if (p.placeholder) dynamic.push(['placeholder', p.placeholder]); const fmt = { password: 'password', email: 'email', int: 'number', decimal: 'number', number: 'number', phone: 'tel', url: 'url' }[p.content_format]; if (fmt) node.parameters.type = fmt; if (el.type === 'MultiLineInput') node.parameters.type = 'textArea'; }
  if (ntype === 'net.noodl.controls.checkbox') { const t = textLiteral(p.text); if (t) { node.parameters.label = t; node.parameters.useLabel = true; } }
  if (ntype === 'net.noodl.controls.checkbox' && node.parameters.width?.unit === '%') { delete node.parameters.width; node.parameters.sizeMode = node.parameters.height ? 'contentWidth' : 'contentSize'; } // a checkbox takes no % width
  if (ntype === 'Image' && (p.src || p.image)) { const im = p.src || p.image; const u = typeof im === 'string' ? im : textLiteral(im); if (u) node.parameters.src = u.startsWith('//') ? 'https:' + u : u; else dynamic.push(['src', im]); node.parameters.objectFit = 'contain'; if (p.use_aspect_ratio && p.aspect_ratio_width && p.aspect_ratio_height && node.parameters.width?.unit === 'px') { node.parameters.height = px(Math.round(node.parameters.width.value * p.aspect_ratio_height / p.aspect_ratio_width)); delete node.parameters.minHeight; node.parameters.sizeMode = 'explicit'; } } // s4: Bubble shows the whole image inside its box; a fixed-width image with an aspect ratio takes its height from it
  if (!ntype && el.type === 'materialicons-Materialicon') { ntype = 'net.noodl.visual.icon'; node.type = ntype; node.label = label; stats.placeholders--; stats.mapped++; findings.pop(); usedMaterialIcons = true; p.icon = p.icon || 'circle'; node.parameters = { ...layoutParams({ ...p, single_width: true, single_height: true, width: p.width || 24, height: p.height || 24 }, parentLayout, el.type), ...styleParams(p, el.type) }; node._materialIcon = true; }
  if (ntype === 'net.noodl.visual.icon') { ntype = 'Group'; node.type = 'Group'; node.children = []; const ic = { id: `icon_${el.id}`, type: 'net.noodl.visual.icon', label: `${label} glyph`, parent: node.id, parameters: { iconIconSource: node._materialIcon ? { class: 'material-icons', code: String(p.icon), codeAsClass: false } : { class: String(p.icon || ''), code: '', codeAsClass: true }, iconSize: px(Math.min(p.height || 24, p.width || 24)), ...(p.icon_color ? { iconColor: p.icon_color } : {}) }, x: node.x + 60, y: y + 110 }; node._iconChild = ic; }
  if (el.type === 'Popup' || el.type === 'GroupFocus') { delete node.parameters.visible; node.parameters.mounted = false; }
  if (el.type === 'Link') { if (p.link_type === 'pagelink' && pageById[p.page]) { const nav = g.add({ id: `nav_${el.id}`, type: 'RouterNavigate', label: `Go to page ${pageById[p.page].name}`, parameters: { target: pageComponentPath(pageById[p.page]) } }); g.wire(node.id, 'onClick', nav.id, 'navigate'); } else todo(`${bubblePage.name} / ${label}`, `a Link to a URL became a Text; its destination (${JSON.stringify(p.link_url || p.url || '').slice(0, 80)}) is not wired`); }
  if (ntype === 'net.noodl.controls.textinput' && p.initial_content) dynamic.push(['startValue', p.initial_content]);
  if (reusable) { node.parameters = Object.fromEntries(Object.entries(node.parameters).filter(([k]) => ['position', 'marginLeft', 'marginTop', 'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'sizeMode', 'alignX'].includes(k))); }
  if (el.style) { const v = variants.find((x) => x.name === (app.styles?.[el.style]?.display || el.style)); if (v) { node.variant = v.name; for (const k of Object.keys(v.parameters)) if (JSON.stringify(node.parameters[k]) === JSON.stringify(v.parameters[k])) delete node.parameters[k]; } }
  if (el.type === 'Button') { node.parameters.sizeMode = node.parameters.sizeMode === 'contentSize' ? 'contentSize' : node.parameters.sizeMode; }
  g.add(node); parentNode.children = parentNode.children || []; parentNode.children.push(node.id);
  if (node._iconChild) { const ic = node._iconChild; delete node._iconChild; g.add(ic); node.children.push(ic.id); y += 110; }
  for (const [port, expr] of dynamic) wireValue(g, expr, node.id, port, bubblePage, `${label}.${port}`, node);
  elementIndex[el.id] = { ...(elementIndex[el.id] || {}), nodeId: node.id, type: ntype || 'Group', bubbleType: el.type, componentPath: g.path, label };
  // a Group's data source: an Expression holding it, which the children's "Parent group's thing" reads
  if (p.data_source && el.type !== 'RepeatingGroup' && !['net.noodl.controls.options'].includes(ntype)) { const ds = compileExpr(g, p.data_source, { page: bubblePage, element: node }); const ex = exprNode(g, `${label}: data = ${ds.text}`, ds.js, ds, { x: node.x + 500, y: node.y }); groupDataNode[node.id] = ex.id; }
  else if (p.data_source && ntype === 'net.noodl.controls.options') { const ds = compileExpr(g, p.data_source, { page: bubblePage, element: node }); const ex = exprNode(g, `${label}: items = ${ds.text}`, ds.js, ds, { x: node.x + 500, y: node.y }); g.wire(ex.id, 'result', node.id, 'items'); }
  y += 110;
  for (const [sk, sv] of Object.entries(el.custom_states || {})) { const name = `${label}.${sv.display || sk}`.replace(/\W+/g, '_'); g.add({ id: `state_${el.id}_${sk.replace(/\W+/g, '_')}`, type: 'Variable2', label: `State ${sv.display || sk} of ${label}`, parameters: { name, ...(sv.default_val !== undefined ? { value: sv.default_val } : {}) }, metadata: { customState: { of: node.id, name: sv.display || sk, type: sv.value, list: String(sv.value || '').startsWith('list.') } } }); stats.customStates = (stats.customStates || 0) + 1; }
  // element conditions (states)
  for (const s of Object.values(el.states || {})) {
    if (!s || !s.condition) continue; stats.states++;
    const sp = styleParams(s.properties || {}, el.type);
    const stateName = elementStateName(s.condition);
    if (stateName) { node.stateParameters = node.stateParameters || {}; node.stateParameters[stateName] = { ...(node.stateParameters[stateName] || {}), ...sp }; continue; }
    if (s.condition?.type === 'ThisElement' && /valid/.test(s.condition.next?.name || '')) { todo(`${bubblePage.name} / ${label}`, `conditional "this input is${s.condition.next.name === 'isnt_valid' ? "n't" : ''} valid" has no NodeGX state; skipped`); continue; }
    const cond = compileExpr(g, s.condition, { page: bubblePage, element: node });
    for (const [bk, bv] of Object.entries(s.properties || {})) {
      if (bk === 'is_visible') { const visKey = p.collapse_when_hidden === false ? 'visible' : 'mounted'; const ex = exprNode(g, `${label}: ${visKey} when not (${cond.text})`, `!(${cond.js})`, cond, { x: node.x + 500, y: node.y }); g.wire(ex.id, 'result', node.id, visKey); if (bv !== false) ex.parameters.expression = `(${cond.js})`; continue; }
      const glyph = g.nodes.find((x) => x.id === `icon_${el.id}`); const CONTENT = { text: ntype === 'Text' ? 'text' : ntype === 'net.noodl.controls.button' ? 'label' : null, src: 'src', icon: glyph ? 'iconIconSource' : null, icon_color: glyph ? 'iconColor' : null, border_color: 'borderColor', initial_content: 'startValue', placeholder: 'placeholder', boxshadow_blur: 'boxShadowBlurRadius', column_gap: 'columnGap', row_gap: 'rowGap', button_disabled: 'enabled', disabled: 'enabled' };
      const PORT_OK = { enabled: ['net.noodl.controls.button', 'net.noodl.controls.textinput', 'net.noodl.controls.checkbox', 'net.noodl.controls.options'], src: ['Image'], text: ['Text'], label: ['net.noodl.controls.button', 'net.noodl.controls.checkbox'], placeholder: ['net.noodl.controls.textinput', 'net.noodl.controls.options'], startValue: ['net.noodl.controls.textinput'], borderColor: ['Group', 'Image', 'net.noodl.controls.button', 'net.noodl.controls.textinput', 'net.noodl.controls.checkbox', 'net.noodl.controls.options'], boxShadowBlurRadius: ['Group', 'Image', 'net.noodl.controls.button'], columnGap: ['Group'], rowGap: ['Group'] };
      const portOk = (key) => key === 'iconIconSource' || key === 'iconColor' ? !!glyph : !PORT_OK[key] || PORT_OK[key].includes(ntype);
      if (bk in CONTENT && CONTENT[bk] && portOk(CONTENT[bk]) && !((ntype === 'Text' || ntype === 'net.noodl.visual.icon') && TEXT_ONLY(CONTENT[bk]))) { const key = CONTENT[bk]; const inv = bk === 'button_disabled' || bk === 'disabled'; let valJs; if (bv && typeof bv === 'object' && bv.type) { const sub = compileExpr(g, bv, { page: bubblePage, element: node }); for (const c of sub.chips) cond.chips.push(c); valJs = sub.js; } else valJs = inv ? String(!bv) : typeof bv === 'number' ? String(bv) : JSON.stringify(bv); const target = (key === 'iconIconSource' || key === 'iconColor') && glyph ? glyph : node; const base = target.parameters[key]; const ex = exprNode(g, `${label}: ${key} when ${cond.text}`, `(${cond.js}) ? ${valJs} : ${JSON.stringify(base ?? (inv ? true : null))}`, cond, { x: node.x + 500, y: node.y }); g.wire(ex.id, 'result', target.id, key); continue; }
      if (bk in CONTENT && CONTENT[bk] && !portOk(CONTENT[bk])) { todo(`${bubblePage.name} / ${label}`, `conditional ${bk} on a ${el.type} placed as ${ntype}: no such input here`); continue; }
      if (bk === 'data_source') { todo(`${bubblePage.name} / ${label}`, 'a conditional data source (two sources by condition): one Expression choosing between two queries is the NodeGX way'); continue; }
      if (bk === 'background_style') { if (bv === 'none' && ntype !== 'Text' && ntype !== 'net.noodl.visual.icon') { const ex = exprNode(g, `${label}: background when ${cond.text}`, `(${cond.js}) ? "transparent" : ${JSON.stringify(node.parameters.backgroundColor ?? null)}`, cond, { x: node.x + 500, y: node.y }); g.wire(ex.id, 'result', node.id, 'backgroundColor'); } continue; }
      const mapped = { ...styleParams({ [bk]: bv }, el.type), ...layoutParams({ [bk]: bv }, 'flex', el.type) }; delete mapped.sizeMode;
      const keys = Object.keys(mapped).filter((k) => sp[k] !== undefined || k in mapped);
      if (!keys.length) { todo(`${bubblePage.name} / ${label}`, `conditional property ${bk} has no NodeGX parameter`); continue; }
      for (const k of keys) { if ((ntype === 'Text' || ntype === 'net.noodl.visual.icon') && TEXT_ONLY(k)) continue; const base = node.parameters[k] ?? variants.find((v) => v.name === node.variant)?.parameters?.[k]; const val = mapped[k]; const lit = (x) => x && typeof x === 'object' && 'unit' in x ? (x.unit === 'px' ? String(x.value) : JSON.stringify(x)) : JSON.stringify(x ?? null); /* s4: a % size is a {value, unit} object; the runtime refuses the string "100%" */ const ex = exprNode(g, `${label}: ${k} when ${cond.text}`, `(${cond.js}) ? ${lit(val)} : ${lit(base)}`, cond, { x: node.x + 500, y: node.y }); g.wire(ex.id, 'result', node.id, k); }
    }
  }
  // children
  if (el.type === 'RepeatingGroup') {
    const rowPath = rowPathFor(bubblePage.name, label, el.id);
    const rg = new Graph(rowPath, 'visual', `A row of Bubble repeating group "${label}" on page ${bubblePage.name}`); components.push(rg);
    const cell = rg.add({ id: `cell_${el.id}`, type: 'Group', label: 'Cell', parameters: { width: pct(100), sizeMode: 'contentHeight', flexDirection: 'column', position: 'relative' }, children: [], x: 40, y: 40 });
    const inputs = rg.add({ id: `in_${el.id}`, type: 'Component Inputs', label: 'This row', ports: [], x: 700, y: 40 });
    rg.rowInputs = inputs; rg.itemType = p.group_type;
    const cellLayout = p.container_layout ? (p.container_layout === 'fixed' ? 'fixed' : 'flex') : 'old';
    if (cellLayout === 'old') { cell.parameters.minHeight = px(p.cell_height || Math.max(40, Math.round((p.height || 200) / (p.rows || 4)))); }
    convertChildren(rg, el.elements, cell, cellLayout, bubblePage, 1, 160);
    const each = g.add({ id: `each_${el.id}`, type: 'For Each', label: `One row per item of ${label}`, parent: node.id, parameters: { template: rowPath, templateType: 'explicit' }, x: node.x + 60, y });
    node.children = node.children || []; node.children.push(each.id); y += 110;
    if (p.data_source) { const ds = compileExpr(g, p.data_source, { page: bubblePage, element: node }); const ex = exprNode(g, `${label}: items = ${ds.text}`, ds.js, ds, { x: node.x + 500, y: each.y }); g.wire(ex.id, 'result', each.id, 'items'); }
    else todo(`${bubblePage.name} / ${label}`, 'repeating group without a data source');
    return y;
  }
  const childLayout = ['Group', 'Popup', 'FloatingGroup', 'GroupFocus', 'Shape', 'Alert'].includes(el.type) ? (p.container_layout ? (p.container_layout === 'fixed' ? 'fixed' : p.container_layout === 'relative' ? 'relative' : 'flex') : (parentLayout === 'old' ? 'old' : 'fixed')) : 'flex';
  if (el.elements) y = convertChildrenInto(g, el.elements, node, childLayout, bubblePage, depth + 1, y);
  if (p.container_layout === 'relative' && inflowOf[el.id]) { const na = String(inflowOf[el.id].properties?.nonant_alignment || 'aa'); node.parameters.flexDirection = 'column'; node.parameters.justifyContent = { a: 'flex-start', b: 'center', c: 'flex-end' }[na[0]] || 'flex-start'; node.parameters.alignItems = { a: 'flex-start', b: 'center', c: 'flex-end' }[na[1]] || 'flex-start'; }
  return y;
}
function convertChildrenInto(g, elements, node, layout, bubblePage, depth, y) { const before = g.ly; convertChildren(g, elements, node, layout, bubblePage, depth, y); const n = Object.keys(elements || {}).filter((k) => k !== 'length').length; return y + n * 110; }

// ---------------------------------------------------------------- expressions: Bubble's Message chain → JavaScript + chips
// returns { js, text, chips: [{ name, fromId, fromPort }] }
function exprNode(g, label, js, compiled, pos) {
  stats.expressions++;
  const ex = g.add({ id: fresh('ex'), type: 'Expression', label: label.slice(0, 80), parameters: { expression: js, evaluateAtLoad: true }, metadata: { bubble: compiled.text }, x: pos?.x, y: pos?.y }); // evaluateAtLoad: an input that never arrives must still yield a value
  for (const c of compiled.chips) g.wire(c.fromId, c.fromPort, ex.id, c.name);
  return ex;
}
const OPS = {
  get_data: (x) => x, is_empty: (x) => `(${x} == null || ${x} === "" || (Array.isArray(${x}) && ${x}.length === 0))`, is_not_empty: (x) => `!(${x} == null || ${x} === "" || (Array.isArray(${x}) && ${x}.length === 0))`,
  contains: (x, a) => `(Array.isArray(${x}) ? ${x} : String(${x} ?? "")).includes(${a})`, doesnt_contain: (x, a) => `!(Array.isArray(${x}) ? ${x} : String(${x} ?? "")).includes(${a})`,
  equals: (x, a) => `(${x} == ${a})`, not_equals: (x, a) => `(${x} != ${a})`, isnt: (x, a) => `(${x} != ${a})`, is: (x, a) => `(${x} == ${a})`,
  and_: (x, a) => `(${x} && ${a})`, or_: (x, a) => `(${x} || ${a})`, not: (x) => `!(${x})`, is_true: (x) => `(${x} === true)`, is_false: (x) => `(${x} === false)`,
  less_than: (x, a) => `(${x} < ${a})`, less_or_equal_than: (x, a) => `(${x} <= ${a})`, greater_than: (x, a) => `(${x} > ${a})`, greater_or_equal_than: (x, a) => `(${x} >= ${a})`,
  plus: (x, a) => `(${x} + ${a})`, minus: (x, a) => `(${x} - ${a})`, mult: (x, a) => `(${x} * ${a})`, div: (x, a) => `(${x} / ${a})`, rounded_to: (x, a) => `Number((${x}).toFixed(${a}))`,
  count: (x) => `(${x} ?? []).length`, first_item: (x) => `(${x} ?? [])[0]`, last_item: (x) => `(${x} ?? []).slice(-1)[0]`, item_from: (x, a) => `(${x} ?? [])[(${a}) - 1]`,
  append: (x, a) => `(String(${x} ?? "") + String(${a} ?? ""))`, lowercase: (x) => `String(${x} ?? "").toLowerCase()`, uppercase: (x) => `String(${x} ?? "").toUpperCase()`, trimmed: (x) => `String(${x} ?? "").trim()`, converted_to_number: (x) => `Number(${x})`,
  logged_in: (x) => x, logged_out: (x) => `!(${x})`, not_logged_in: (x) => `!(${x})`,
  first_element: (x) => `(${x} ?? [])[0]`, last_element: (x) => `(${x} ?? []).slice(-1)[0]`, get_list_data: (x) => x, get_group_data: (x) => x, imgix_treatment: (x) => x,
  _id: (x) => `${x}?.id`, display: (x) => `(${x}?.display ?? ${x})`, email: (x) => `${x}?.email`, 'Created By': (x) => `${x}?.createdBy`, 'Created Date': (x) => `${x}?.createdAt`, 'Modified Date': (x) => `${x}?.updatedAt`,
  format_number: (x) => `String(${x} ?? "")`, format_date: (x) => `String(${x} ?? "")`, format_boolean: (x) => `String(${x} ?? "")`, number_from_text: (x) => `Number(${x})`,
  min: (x) => `Math.min(...(${x} ?? []))`, max: (x) => `Math.max(...(${x} ?? []))`, sum: (x) => `(${x} ?? []).reduce((a, b) => a + b, 0)`, average: (x) => `((${x} ?? []).reduce((a, b) => a + b, 0) / ((${x} ?? []).length || 1))`,
  to_days: (x) => `(${x} / 86400000)`, to_hours: (x) => `(${x} / 3600000)`, to_minutes: (x) => `(${x} / 60000)`, days_between: (x, a) => `((new Date(${a}) - new Date(${x})) / 86400000)`,
  is_in: (x, a) => `(${a} ?? []).includes(${x})`, isnt_in: (x, a) => `!(${a} ?? []).includes(${x})`, contains_list: (x, a) => `(${a} ?? []).every((i) => (${x} ?? []).includes(i))`,
  unique_elements: (x) => `[...new Set(${x} ?? [])]`, items_from: (x, a) => `(${x} ?? []).slice((${a}) - 1)`, items_until: (x, a) => `(${x} ?? []).slice(0, ${a})`, random_item: (x) => `(${x} ?? [])[Math.floor(Math.random() * (${x} ?? []).length)]`,
  plus_item: (x, a) => `[...(${x} ?? []), ${a}]`, minus_item: (x, a) => `(${x} ?? []).filter((i) => i !== ${a})`, merged_with: (x, a) => `[...(${x} ?? []), ...(${a} ?? [])]`,
  truncate: (x, a) => `String(${x} ?? "").slice(0, ${a})`, truncated: (x, a) => `String(${x} ?? "").slice(0, ${a})`, limit_to: (x, a) => `(${x} ?? []).slice(0, ${a})`, length: (x) => `(${x} ?? "").length`, times: (x, a) => `(${x} * ${a})`, divided_by: (x, a) => `(${x} / ${a})`, modulo: (x, a) => `(${x} % ${a})`, equals_rounded_down: (x, a) => `(Math.floor(${x}) == Math.floor(${a}))`,
  to_uppercase: (x) => `String(${x} ?? "").toUpperCase()`, to_lowercase: (x) => `String(${x} ?? "").toLowerCase()`, to_capitalized_words: (x) => `String(${x} ?? "").replace(/\\b\\w/g, (c) => c.toUpperCase())`, get_loading_status: () => 'false', is_first_page: () => 'true', is_last_page: () => 'true', is_visible: () => 'true',
  plus_hours: (x, a) => `new Date(new Date(${x}).getTime() + (${a}) * 3600000)`, plus_minutes: (x, a) => `new Date(new Date(${x}).getTime() + (${a}) * 60000)`, plus_seconds: (x, a) => `new Date(new Date(${x}).getTime() + (${a}) * 1000)`, plus_days: (x, a) => `new Date(new Date(${x}).getTime() + (${a}) * 86400000)`,
  plus_months: (x, a) => `((d) => (d.setMonth(d.getMonth() + (${a})), d))(new Date(${x}))`, plus_years: (x, a) => `((d) => (d.setFullYear(d.getFullYear() + (${a})), d))(new Date(${x}))`,
  change_hours: (x, a) => `((d) => (d.setHours(${a}), d))(new Date(${x}))`, change_minutes: (x, a) => `((d) => (d.setMinutes(${a}), d))(new Date(${x}))`, change_seconds: (x, a) => `((d) => (d.setSeconds(${a}), d))(new Date(${x}))`, change_date: (x, a) => `((d) => (d.setDate(${a}), d))(new Date(${x}))`,
  extract_from_date: (x, a) => `((d, w) => ({ year: d.getFullYear(), month: d.getMonth() + 1, date: d.getDate(), day: d.getDay(), hours: d.getHours(), minutes: d.getMinutes() })[w])(new Date(${x}), ${a})`,
  to_range: (x, a) => `[${x}, ${a}]`, range_contains_point: (x, a) => `((r, p) => r && new Date(p) >= new Date(r[0]) && new Date(p) <= new Date(r[1]))(${x}, ${a})`, range_less_than_point: (x, a) => `((r, p) => r && new Date(r[1]) < new Date(p))(${x}, ${a})`, range_overlaps: (x, a) => `((a, b) => a && b && new Date(a[0]) <= new Date(b[1]) && new Date(b[0]) <= new Date(a[1]))(${x}, ${a})`,
  file_name: (x) => `String(${x} ?? "").split("/").pop()`, formatted_address: (x) => `(${x}?.formattedAddress ?? ${x}?.address ?? ${x})`, id: (x) => `${x}?.id`, error: (x) => `${x}?.error`, find_replace: (x) => `String(${x} ?? "")`, split_by: (x, a) => `String(${x} ?? "").split(${a})`, join_with: (x, a) => `(${x} ?? []).join(${a})`, extract: (x) => `String(${x} ?? "")`,
};
function compileExpr(g, node, ctx) {
  if (!ctx.element && wfElement) ctx = { ...ctx, element: wfElement };
  const chips = []; const seen = new Set();
  const chip = (name, fromId, fromPort) => { if (!seen.has(name)) { seen.add(name); chips.push({ name, fromId, fromPort }); } return name; };
  const lit = (v) => typeof v === 'string' ? JSON.stringify(v) : v == null ? 'null' : typeof v === 'object' ? (v.type ? walk(v) : JSON.stringify(v)) : String(v);
  const walkArgs = (a) => a && typeof a === 'object' && a.type ? walk(a) : lit(a);
  function root(n) {
    switch (n.type) {
      case 'GetElement': { const ref = elementIndex[n.properties?.element_id]; if (!ref) { todo(`${ctx.page.name}`, `expression refers to element ${n.properties?.element_id} which is not in the export`); return 'undefined'; } if (ref.componentPath !== g.path) { ai(`${ctx.page.name}`, `"${ref.label}" is read from ${ref.componentPath} (another component): a Component Output is the NodeGX way`); return 'undefined'; } if (ref.type === 'Page') return chip('thisPage', ref.nodeId, 'this'); const port = elementValuePort[ref.type] || 'this'; return chip(`el_${ref.label.replace(/\W+/g, '_')}`, ref.nodeId, port); }
      case 'ThisElement': { if (n.properties?.element_id && elementIndex[n.properties.element_id]) return root({ ...n, type: 'GetElement' }); if (!ctx.element) { todo(ctx.page.name, '"This element" outside an element or a workflow with one'); return 'undefined'; } const port = elementValuePort[ctx.element.type] || 'this'; return chip('thisElement', ctx.element.id, port); }
      case 'CurrentUser': { const u = g.singleton('user', () => ({ id: fresh('user'), type: 'net.noodl.user.User', label: 'Current user', parameters: {} })); const first = n.next?.name; if (first === 'logged_in' || first === 'logged_out') return chip('userAuthenticated', u.id, 'authenticated'); if (first && /^email/.test(first)) return chip('userEmail', u.id, 'email'); return chip('userId', u.id, 'id'); }
      case 'GetParamFromUrl': { const name = textLiteral(n.properties?.parameter_name) || 'param'; const pi = g.singleton('pageInputs', () => ({ id: fresh('pin'), type: 'PageInputs', label: 'URL parameters', parameters: { queryParams: '' } })); const list = pi.parameters.queryParams ? pi.parameters.queryParams.split(',') : []; if (!list.includes(name)) list.push(name); pi.parameters.queryParams = list.join(','); return chip(`url_${name.replace(/\W+/g, '_')}`, pi.id, `pm-${name}`); }
      case 'PageData': { const sr = g.singleton('screen', () => ({ id: fresh('scr'), type: 'Screen Resolution', label: 'Screen', parameters: {} })); const what = n.properties?.name || ''; if (/Date\/Time/i.test(what)) return 'new Date()'; if (/Website Home/i.test(what)) return 'location.origin'; if (/Page Name/i.test(what)) return 'location.pathname.split("/").pop()'; if (/Scrolling/i.test(what)) return 'window.scrollY'; if (/Position/i.test(what)) { ai(ctx.page.name, 'Current Position (geolocation): a Geolocation node is the NodeGX way'); return '__bubble("position")'; } return /width/i.test(what) ? chip('pageWidth', sr.id, 'width') : /height/i.test(what) ? chip('pageHeight', sr.id, 'height') : (todo(ctx.page.name, `page data "${what}" not mapped`), 'undefined'); }
      case 'GetDataFromAPI': { const id = String(n.properties?.provider || '').replace(/^apiconnector2\./, ''); const call = apiCalls[id]; if (!call) { const pl = pluginName(id.replace('.', '-')); ai(ctx.page.name, pl ? `data from the plugin API ${pl}` : `API call ${id} not in the export's API Connector`); return '__bubble("api")'; } const h = g.singleton(`api_${id}`, () => ({ id: fresh('http'), type: 'net.noodl.HTTP', label: `${call.api}: ${call.name}`, parameters: { url: call.url, method: call.method } })); const page = (g.nodes.find((x) => x.type === 'Page') || g.nodes[0]); if (page && !g.connections.some((c) => c.toId === h.id && c.toProperty === 'fetch')) g.wire(page.id, 'didMount', h.id, 'fetch'); return chip(`api_${call.name.replace(/\W+/g, '_')}`, h.id, 'response'); }
      case 'ElementParent': { if (g.rowInputs) { const field = n.next?.name; if (field) { const pth = apiFieldPath(field); const pname = pth[0]; if (!g.rowInputs.ports.some((p) => p.name === pname)) g.rowInputs.ports.push({ name: pname, plug: 'output', type: '*' }); const c = chip(`row_${pname.replace(/\W+/g, '_')}`, g.rowInputs.id, pname); n = { ...n, next: n.next.next }; const rest = n.next ? chain(c, n.next) : c; return { done: rest }; } if (!g.rowInputs.ports.some((p) => p.name === 'item')) g.rowInputs.ports.push({ name: 'item', plug: 'output', type: '*' }); return chip('rowItem', g.rowInputs.id, 'item'); } let cur = ctx.element ? g.nodes.find((x) => x.id === ctx.element.id) : null; cur = cur && g.nodes.find((x) => x.id === cur.parent); while (cur && !groupDataNode[cur.id]) cur = g.nodes.find((x) => x.id === cur.parent); if (cur) { const c = chip(`data_${cur.id}`, groupDataNode[cur.id], 'result'); const rest = n.next ? chain(c, n.next) : c; return { done: rest }; } todo(ctx.page.name, `"Parent group's thing" with no ancestor group holding data`); return 'undefined'; }
      case 'InjectedValue': return 'thing';
      case 'OneOptionValue': case 'OptionValue': { const set = String(n.properties?.option_set || '').replace(/^option\./, ''); const v = n.properties?.option_value; const os = optionSets[set]; const row = os?.values?.[v]; return row ? JSON.stringify({ value: v, display: row.display ?? v }) : JSON.stringify(v ?? null); }
      case 'AllOptionValue': case 'AllOptions': { const set = String(n.properties?.option_set || '').replace(/^option\./, ''); const os = optionSets[set]; if (!os) { todo(ctx.page.name, `option set ${set} unknown`); return '[]'; } const inst = g.singleton(`os_${set}`, () => ({ id: fresh('osi'), type: `/Option sets/${safeName(os.display || set)}`, label: `Option set ${os.display || set}` })); return chip(`options_${set.replace(/\W+/g, '_')}`, inst.id, 'items'); }
      case 'PreviousStep': { const aid = n.properties?.action_id; const an = g.nodes.find((x) => x.id === `act_${aid}`); const port = !an ? 'result' : { NewDbModelProperties: 'id', 'net.noodl.HTTP': 'response', DbCollection2: 'items', Expression: 'result', SetDbModelProperties: 'id' }[an.type] || 'result'; if (!an) todo(ctx.page.name, `result of step ${aid} read before that step exists in this component`); return chip(`step_${aid}`, `act_${aid}`, port); }
      case 'CurrentWorkflowItem': case 'CurrentPageItem': case 'CurrentCellsIndex': { if (n.type === 'CurrentWorkflowItem' && wfReceiver) { const pn = String(n.properties?.param_name || 'payload').replace(/\W+/g, '_'); return chip(`param_${pn}`, wfReceiver.id, pn); } if (g.rowInputs) { const pname = n.type === 'CurrentCellsIndex' ? 'index' : 'item'; if (!g.rowInputs.ports.some((p) => p.name === pname)) g.rowInputs.ports.push({ name: pname, plug: 'output', type: '*' }); return chip(`row_${pname}`, g.rowInputs.id, pname); } if (n.type === 'CurrentPageItem') { todo(ctx.page.name, 'Current page thing: a page-level record parameter (a query by the id in the URL is the NodeGX way)'); return 'undefined'; } todo(ctx.page.name, `${n.type} outside a row or a workflow with a parameter`); return 'undefined'; }
      case 'Formulas': { ai(ctx.page.name, `a Formulas expression (${n.properties?.formula_type}) needs a function`); return `__bubble("formula:${n.properties?.formula_type}")`; }
      case 'ArbitraryText': return lit(textLiteral(n.properties?.text) ?? '');
      case 'Empty': return 'undefined';
      case 'Search': case 'DoASearch': case 'SearchFor': { return search(n); }
      case 'TextExpression': { const parts = Object.values(n.entries || {}).map((e) => typeof e === 'string' ? JSON.stringify(e.replace(BB, '')) : `String(${walk(e)} ?? "")`); return parts.length === 1 ? parts[0] : parts.join(' + '); }
      case 'GetOption': case 'GetOptionSet': case 'AllOptions': { todo(ctx.page.name, `option set reads are not compiled in this spike (they become a Static Data component)`); return 'undefined'; }
      default: { stats.exprOpsUnknown++; ai(ctx.page.name, `expression root of type ${n.type} not understood: ${JSON.stringify(n).slice(0, 140)}`); return `__bubble(${JSON.stringify(n.type)})`; }
    }
  }
  function search(n) { // "Do a search for" → a DbCollection2 node with a visual filter; each constraint value a qp-port
    const coll = typeDisplay(n.properties?.thing_type || n.properties?.type || 'thing'); const id = fresh('q');
    const q = g.add({ id, type: 'DbCollection2', label: `Search for ${coll}s`, parameters: { collectionName: coll, visualFilter: { combinator: 'and', rules: [] } } }); stats.searches = (stats.searches || 0) + 1;
    const OPS2 = { equals: 'equal to', 'not equal': 'not equal to', not_equals: 'not equal to', contains: 'contains', 'text contains': 'contains', email_equals: 'equal to', in: 'contains', gte: 'greater than or equal to', lte: 'less than or equal to', gt: 'greater than', lt: 'less than', 'doesnt contain': 'does not contain', 'greater than': 'greater than', 'less than': 'less than', is_empty: 'exists', 'is not empty': 'exists', 'is in': 'contains', 'isn\'t in': 'does not contain' };
    let i = 0;
    for (const c of Object.values(n.properties?.constraints || {})) {
      if (!c || !c.key) continue; const field = fieldDisplay(n.properties?.thing_type, c.key); if (c.constraint_type && typeof c.constraint_type === 'object') { todo(ctx.page.name, `search constraint on ${coll}.${field} with a dynamic operator`); continue; } const op = OPS2[c.constraint_type]; if (!op) { (String(c.constraint_type).startsWith('range') ? ai : todo)(ctx.page.name, String(c.constraint_type).startsWith('range') ? `date-range constraint "${c.constraint_type}" on ${coll}.${field}: no range column type in the backend yet` : `search constraint "${c.constraint_type}" on ${coll}.${field} not in the filter table`); continue; }
      const port = `v${i++}`; q.parameters.visualFilter.rules.push({ property: field, operator: op, input: port });
      if (c.value && typeof c.value === 'object' && c.value.type && c.value.type !== 'OneOptionValue') { const sub = compileExpr(g, c.value, ctx); const ex = exprNode(g, `${coll}.${field} ${op} ${sub.text}`, sub.js, sub); g.wire(ex.id, 'result', q.id, `qp-${port}`); }
      else q.parameters[`qp-${port}`] = c.value && typeof c.value === 'object' ? c.value.properties?.option_value ?? null : c.value;
    }
    if (n.properties?.sort_field) q.parameters.sort = [{ property: fieldDisplay(n.properties?.thing_type, n.properties.sort_field), order: n.properties.descending ? 'descending' : 'ascending' }];
    const page = (g.nodes.find((x) => x.type === 'Page') || g.nodes[0]); if (page) g.wire(page.id, 'didMount', q.id, 'fetch');
    return chip(`search_${id}`, q.id, 'items');
  }
  function chain(x, m) { // apply a Message chain to js x
    let js = x;
    while (m) {
      if (m.type !== 'Message') { js = `${js}/*?${m.type}*/`; break; }
      if (m.name === 'get_data' && m.next?.type === 'Message' && /^(custom\.|_p_)/.test(m.next.name || '')) { /* "Group X's data's field": the group's data source value then the field */ }
      const name = m.name; const a = m.args !== undefined ? walkArgs(m.args) : undefined;
      if (OPS[name]) js = OPS[name](js, a);
      else if (name.startsWith('_api_c2_')) { const pth = apiFieldPath(name); js = `${js}?.${pth.map((s) => /^\w+$/.test(s) ? s : `[${JSON.stringify(s)}]`).join('?.')}`; }
      else if (allFieldKeys.has(name)) { js = `${js}?.${String(allFieldKeys.get(name)).replace(/\W+/g, '_')}`; }
      else if (name === 'filtered' || name === 'sorted' || name === 'sorted_by') { ai(ctx.page.name, `a ":${name}" list operator (${JSON.stringify(m.properties || m.args || null).slice(0, 80)}): JavaScript in the composer's JS view`); js = `__bubble(${JSON.stringify(name)}, ${js})`; }
      else if (/^custom\.\w+_?$/.test(name) || /^_p_\w+$/.test(name) || /^[a-z0-9]+_(text|number|boolean|date|date_range|image|file|list|custom|option|user|geographic_address)[a-z0-9_.]*$/i.test(name)) { js = `${js}?.${fieldDisplay('', name.replace(/^_p_/, '')).replace(/\W+/g, '_')}`; }
      else if (m.args === undefined && /^[A-Za-z_][\w.]*$/.test(name)) { stats.fieldReadsGuessed++; js = `${js}?.${name.replace(/^_p_/, '').split('.').map((p) => p.replace(/\W+/g, '_')).join('?.')}`; }
      else { stats.exprOpsUnknown++; ai(ctx.page.name, `expression operator "${name}" not in the dictionary (args ${JSON.stringify(m.args ?? null).slice(0, 60)})`); js = `__bubble(${JSON.stringify(name)}, ${js}${a !== undefined ? ', ' + a : ''})`; }
      m = m.next;
    }
    return js;
  }
  function walk(n) { if (!n || typeof n !== 'object') return lit(n); const r = root(n); if (r && typeof r === 'object' && 'done' in r) return r.done; return n.next ? chain(r, n.next) : r; }
  const js = walk(node);
  return { js, chips, text: describe(node) };
}
function describe(n) { // a human line for the label
  if (!n || typeof n !== 'object') return JSON.stringify(n);
  const parts = []; let cur = n;
  const rootName = { GetElement: `Element ${elementIndex[n.properties?.element_id]?.label || n.properties?.element_id}`, CurrentUser: 'Current User', ThisElement: 'This element', GetParamFromUrl: `URL param ${textLiteral(n.properties?.parameter_name)}`, PageData: n.properties?.name, GetDataFromAPI: `API ${n.properties?.provider}`, ElementParent: "Parent group's item", TextExpression: Object.values(n.entries || {}).map((e) => typeof e === 'string' ? JSON.stringify(e) : describe(e)).join(' ') }[n.type] || n.type;
  parts.push(rootName); cur = n.next;
  while (cur && cur.type === 'Message') { parts.push(`'s ${cur.name}${cur.args !== undefined ? ' ' + (typeof cur.args === 'object' ? describe(cur.args) : JSON.stringify(cur.args)) : ''}`); cur = cur.next; }
  return parts.join('');
}

// ---------------------------------------------------------------- workflows
const EVENT_PORTS = { Group: ['onClick', 'didMount', 'hoverStart', 'hoverEnd'], Text: ['onClick', 'didMount'], Image: ['onClick', 'didMount'], 'net.noodl.controls.button': ['onClick', 'didMount', 'onFocus', 'onBlur'], 'net.noodl.controls.textinput': ['onTextChanged', 'onEnter', 'onBlur', 'onFocus', 'didMount'], 'net.noodl.controls.checkbox': ['onChange', 'didMount'], 'net.noodl.controls.options': ['onChange', 'didMount'], Page: ['didMount'] };
const eventPortOk = (type, port) => type.startsWith('/') ? false : (EVENT_PORTS[type] || ['onClick', 'didMount']).includes(port);
const EVENTS = { ButtonClicked: ['onClick'], InputChanged: ['onTextChanged'], ElementClicked: ['onClick'], PageLoaded: ['didMount'], PageIsLoaded: ['didMount'], InputValueChanged: ['onTextChanged'], InputChanged: ['onTextChanged'], ValueChanged: ['onChange'], ElementHovered: ['hoverStart'], UserIsLoggedIn: ['didMount'] };
const customEventIds = {}; // workflow id → event name, for TriggerCustomEvent
let wfElement = null, wfReceiver = null; // the element (node) a workflow hangs on, and its Event Receiver, while its actions convert
function convertWorkflow(g, wf, bubblePage) {
  stats.workflows++; wfElement = null; wfReceiver = null; const wfRef = wf.properties?.element_id ? elementIndex[wf.properties.element_id] : null; if (wfRef) wfElement = { id: wfRef.nodeId, type: wfRef.type };
  const evPorts = EVENTS[wf.type];
  let fromId, fromPort, evLabel;
  if (evPorts) {
    const ref = wf.properties?.element_id ? elementIndex[wf.properties.element_id] : null;
    if (wf.type.startsWith('Page') || !wf.properties?.element_id) { const page = (g.nodes.find((x) => x.type === 'Page') || g.nodes[0]); fromId = page.id; fromPort = 'didMount'; evLabel = 'Page is loaded'; }
    else if (ref && ref.componentPath !== g.path && graphByPath[ref.componentPath]) { g = graphByPath[ref.componentPath]; fromId = ref.nodeId; fromPort = ref.type === 'net.noodl.controls.checkbox' || ref.type === 'net.noodl.controls.options' ? (wf.type === 'InputChanged' ? 'onChange' : evPorts[0]) : evPorts[0]; evLabel = `${ref.label} ${wf.type}`; if (!eventPortOk(ref.type, fromPort)) { ai(`${bubblePage.name} workflow ${wf.id}`, `event ${wf.type} on ${ref.label} (${ref.bubbleType || ref.type}): that element has no such signal here`); fromId = null; } }
    else if (ref) { fromId = ref.nodeId; fromPort = ref.type === 'net.noodl.controls.checkbox' || ref.type === 'net.noodl.controls.options' ? (wf.type === 'InputChanged' ? 'onChange' : evPorts[0]) : evPorts[0]; evLabel = `${ref.label} ${wf.type}`; if (!eventPortOk(ref.type, fromPort)) { ai(`${bubblePage.name} workflow ${wf.id}`, `event ${wf.type} on ${ref.label} (${ref.bubbleType || ref.type}): that element has no such signal here; its actions are converted but nothing fires them`); fromId = null; } }
    else { todo(`${bubblePage.name} workflow ${wf.id}`, `event ${wf.type} on an unknown element ${wf.properties?.element_id}`); return; }
  } else if (wf.type === 'CustomEvent') { const nm = wf.properties?.event_name || wf.properties?.name || wf.id; const r = g.add({ id: `ev_${wf.id}`, type: 'Event Receiver', label: `Custom event ${nm}`, parameters: { channelName: nm } }); wfReceiver = r; fromId = r.id; fromPort = 'eventReceived'; evLabel = `custom event ${nm}`; customEventIds[wf.id] = nm; }
  else if (wf.type === 'ConditionTrue') { // Bubble fires on the false→true transition; isTrueEv would fire on every truthy evaluation and loop when an action changes what it reads
    const c = compileExpr(g, wf.properties?.condition, { page: bubblePage }); const ex = exprNode(g, `Do when ${c.text}`, c.js, c); const vc = g.add({ id: fresh('vc'), type: 'Value Changed', label: 'when it changes', parameters: {} }); const cond = g.add({ id: fresh('ct'), type: 'Condition', label: `…and is true`, parameters: {} }); g.wire(ex.id, 'result', vc.id, 'value'); g.wire(vc.id, 'valueChanged', cond.id, 'eval'); g.wire(ex.id, 'result', cond.id, 'condition'); fromId = cond.id; fromPort = 'ontrue'; evLabel = `when ${c.text}`; }
  else if (/^(\d{13}x\d+)-/.test(wf.type) || /^[a-z0-9]+-\w+$/i.test(wf.type)) { const nm = pluginName(wf.type) || wf.type; ai(`${bubblePage.name} workflow ${wf.id}`, `plugin event ${nm}: its actions are converted but nothing fires them`); evLabel = nm; }
  else { ai(`${bubblePage.name} workflow ${wf.id}`, `event type ${wf.type} not in the event dictionary; its ${Object.keys(wf.actions || {}).length} actions were still converted but nothing triggers them`); evLabel = wf.type; }
  if (wf.properties?.condition || wf.condition) { const c = compileExpr(g, wf.properties?.condition || wf.condition, { page: bubblePage }); const cond = g.add({ id: fresh('wfc'), type: 'Condition', label: `Only when ${c.text}`, parameters: {} }); const ex = exprNode(g, `Only when ${c.text}`, c.js, c); g.wire(ex.id, 'result', cond.id, 'condition'); if (fromId) g.wire(fromId, fromPort, cond.id, 'eval'); fromId = cond.id; fromPort = 'ontrue'; }
  const actions = Object.entries(wf.actions || {}).filter(([k, a]) => k !== 'length' && a && a.type).sort((a, b) => Number(a[0]) - Number(b[0]));
  let x = 700, y = g.ly;
  for (const [, action] of actions) {
    stats.actions++;
    const made = convertAction(g, action, bubblePage, evLabel);
    if (!made) continue;
    let { node, trigger, done } = made;
    if (action.properties?.condition) { const c = compileExpr(g, action.properties.condition, { page: bubblePage }); const cond = g.add({ id: fresh('ac'), type: 'Condition', label: `Only when ${c.text}`, parameters: {} }); const ex = exprNode(g, `Only when ${c.text}`, c.js, c); g.wire(ex.id, 'result', cond.id, 'condition'); if (fromId) g.wire(fromId, fromPort, cond.id, 'eval'); g.wire(cond.id, 'ontrue', node.id, trigger); }
    else if (fromId) g.wire(fromId, fromPort, node.id, trigger);
    fromId = node.id; fromPort = done;
  }
}
function wireValue(g, expr, toId, toPort, bubblePage, label, element) { // a Bubble value (TextExpression / expression) into a port: a direct wire when it is one element's value, else an Expression
  if (expr == null) return;
  const lit = textLiteral(expr); if (lit !== undefined) { const n = g.nodes.find((x) => x.id === toId); n.parameters[toPort] = lit; return; }
  const single = expr.type === 'TextExpression' && Object.values(expr.entries || {}).length === 1 ? Object.values(expr.entries)[0] : expr;
  if (single && single.type === 'GetElement' && single.next?.name === 'get_data' && !single.next.next) { const ref = elementIndex[single.properties.element_id]; if (ref && elementValuePort[ref.type]) { g.wire(ref.nodeId, elementValuePort[ref.type], toId, toPort); return; } }
  const c = compileExpr(g, expr, { page: bubblePage, element }); const ex = exprNode(g, `${label} = ${c.text}`, c.js, c); g.wire(ex.id, 'result', toId, toPort);
}
function convertAction(g, action, bubblePage, evLabel) {
  const p = action.properties || {}; const id = `act_${action.id}`;
  switch (action.type) {
    case 'NewThing': { stats.actionsMapped++; const coll = typeDisplay(p.thing_type); const n = g.add({ id, type: 'NewDbModelProperties', label: `Create a new ${coll}`, parameters: { collectionName: coll } }); for (const iv of Object.values(p.initial_values || {})) { if (!iv || !iv.key) continue; const field = fieldDisplay(p.thing_type, iv.key); wireValue(g, iv.value, n.id, `prop-${field}`, bubblePage, `${coll}.${field}`); } return { node: n, trigger: 'store', done: 'done' }; }
    case 'MakeChanges': case 'MakeChangesToThing': { stats.actionsMapped++; const coll = typeDisplay(p.thing_type || p.thing?.next?.type || 'thing'); const n = g.add({ id, type: 'SetDbModelProperties', label: `Make changes to a ${coll}`, parameters: { collectionName: coll, idSource: 'explicit' } }); if (p.thing_to_change || p.thing) { const c = compileExpr(g, p.thing_to_change || p.thing, { page: bubblePage }); const ex = exprNode(g, `which ${coll}: ${c.text}`, `${c.js}?.id ?? ${c.js}`, c); g.wire(ex.id, 'result', n.id, 'modelId'); } for (const ch of Object.values(p.changes || p.initial_values || {})) { if (!ch || !ch.key) continue; const field = fieldDisplay(p.thing_type, ch.key); wireValue(g, ch.value, n.id, `prop-${field}`, bubblePage, `${coll}.${field}`); } return { node: n, trigger: 'store', done: 'done' }; }
    case 'DeleteThing': case 'DeleteListOfThings': { stats.actionsMapped++; const n = g.add({ id, type: 'DeleteDbModelProperties', label: 'Delete a record', parameters: { idSource: 'explicit' } }); if (p.thing_to_delete || p.thing || p.to_delete) { const c = compileExpr(g, p.thing_to_delete || p.thing || p.to_delete, { page: bubblePage }); const ex = exprNode(g, `which record: ${c.text}`, `${c.js}?.id ?? ${c.js}`, c); g.wire(ex.id, 'result', n.id, 'modelId'); } return { node: n, trigger: 'store', done: 'done' }; }
    case 'ChangePage': { stats.actionsMapped++; const target = pageById[p.element_id] || Object.values(pageById).find((pg) => pg.id === p.element_id); const n = g.add({ id, type: 'RouterNavigate', label: `Go to page ${target?.name || p.element_id}`, parameters: { target: target ? pageComponentPath(target) : '/Pages/?' } }); if (!target) todo(bubblePage.name, `Go to page: page ${p.element_id} not in the export`); if (p.parameters) todo(bubblePage.name, `Go to page ${target?.name}: "data to send"/parameters not wired`); return { node: n, trigger: 'navigate', done: 'done' }; }
    case 'ResetPassword': { stats.actionsMapped++; const n = g.add({ id, type: 'net.noodl.user.ResetPassword', label: 'Reset the password', parameters: {} }); wireValue(g, p.new_password, n.id, 'newPassword', bubblePage, 'new password'); const pi = g.singleton('pageInputs', () => ({ id: fresh('pin'), type: 'PageInputs', label: 'URL parameters', parameters: { queryParams: '' } })); const list = pi.parameters.queryParams ? pi.parameters.queryParams.split(',') : []; if (!list.includes('token')) list.push('token'); pi.parameters.queryParams = list.join(','); g.wire(pi.id, 'pm-token', n.id, 'token'); if (p.new_password_again) todo(bubblePage.name, 'Reset password: the "confirm password" check is Bubble-side; add a Condition comparing the two inputs before the reset'); return { node: n, trigger: 'reset', done: 'success' }; }
    case 'LogIn': case 'LoginUser': { stats.actionsMapped++; const n = g.add({ id, type: 'net.noodl.user.LogIn', label: 'Log the user in', parameters: {} }); wireValue(g, p.email, n.id, 'username', bubblePage, 'email'); wireValue(g, p.password, n.id, 'password', bubblePage, 'password'); return { node: n, trigger: 'login', done: 'done' }; }
    case 'SignUp': case 'SignUpUser': { stats.actionsMapped++; const n = g.add({ id, type: 'net.noodl.user.SignUp', label: 'Sign the user up', parameters: {} }); wireValue(g, p.email, n.id, 'email', bubblePage, 'email'); wireValue(g, p.email, n.id, 'username', bubblePage, 'email'); wireValue(g, p.password, n.id, 'password', bubblePage, 'password'); return { node: n, trigger: 'signup', done: 'done' }; }
    case 'LogOut': case 'LogoutUser': { stats.actionsMapped++; const n = g.add({ id, type: 'net.noodl.user.LogOut', label: 'Log the user out', parameters: {} }); return { node: n, trigger: 'login', done: 'done' }; }
    case 'SetCustomState': case 'SetState': { stats.actionsMapped++; const ref = elementIndex[p.element_id]; const stKey = String(p.custom_state || p.state || 'state').replace(/^custom\./, '').replace(/_$/, ''); const name = `${ref?.label || p.element_id}.${stKey}`.replace(/\W+/g, '_'); const n = g.add({ id, type: 'Set Variable', label: `Set state ${name}`, parameters: { name, setWith: '*' } }); wireValue(g, p.value, n.id, 'value', bubblePage, name); return { node: n, trigger: 'do', done: 'done' }; }
    case 'TriggerCustomEvent': case 'ScheduleCustom': { stats.actionsMapped++; const nm = customEventIds[p.custom_event] || p.name || p.event || p.custom_event || 'custom'; const n = g.add({ id, type: 'Event Sender', label: `Trigger ${nm}`, parameters: { channelName: nm, propagation: 'global' } }); if (action.type === 'ScheduleCustom') todo(bubblePage.name, `Schedule custom event ${nm} after ${p.delay}s: sent at once (a Timer is the NodeGX way)`); return { node: n, trigger: 'sendEvent', done: 'done' }; }
    case 'ChangeThing': case 'MakeChangeCurrentUser': { stats.actionsMapped++; const isUser = action.type === 'MakeChangeCurrentUser' || p.thing_to_change?.type === 'CurrentUser'; const coll = isUser ? 'User' : typeDisplay(p.thing_to_change?.properties?.thing_type || p.thing_to_change?.next?.type || p.thing_type || 'thing'); const n = g.add({ id, type: 'SetDbModelProperties', label: `Make changes to ${isUser ? 'the current user' : 'a ' + coll}`, parameters: { collectionName: coll, idSource: 'explicit' } }); if (isUser) { const u = g.singleton('user', () => ({ id: fresh('user'), type: 'net.noodl.user.User', label: 'Current user', parameters: {} })); g.wire(u.id, 'id', n.id, 'modelId'); } else if (p.thing_to_change) { const c = compileExpr(g, p.thing_to_change, { page: bubblePage }); const ex = exprNode(g, `which ${coll}: ${c.text}`, `${c.js}?.id ?? ${c.js}`, c); g.wire(ex.id, 'result', n.id, 'modelId'); } for (const ch of Object.values(p.changes || {})) { if (!ch || !ch.key) continue; const field = fieldDisplay('', ch.key); wireValue(g, ch.value, n.id, `prop-${field}`, bubblePage, `${coll}.${field}`); } return { node: n, trigger: 'store', done: 'done' }; }
    case 'OpenURL': { stats.actionsMapped++; const n = g.add({ id, type: 'net.noodl.externallink', label: 'Open an external website', parameters: { openInNewTab: !!p.new_tab } }); wireValue(g, p.url, n.id, 'link', bubblePage, 'url'); return { node: n, trigger: 'do', done: 'done' }; }
    case 'GoPrevious': { stats.actionsMapped++; const n = g.add({ id, type: 'PageStackNavigateBack', label: 'Go to previous page', parameters: {} }); return { node: n, trigger: 'navigate', done: 'done' }; }
    case 'ScrollToElement': case 'ResetInputs': case 'ResetGroup': case 'TerminateWorkflow': case 'AnimateElement': case 'ListShowNext': case 'ListShowPrevious': case 'SetFocusToElement': case 'PauseWFClient': { stats.actionsMapped++; const ref = elementIndex[p.element_id]; const n = g.add({ id, type: 'Expression', label: `${action.type}${ref ? ' ' + ref.label : ''} (small action)`, parameters: { expression: `/* ${action.type} ${ref?.label || ''} */ true` } }); if (action.type === 'ScrollToElement' && ref && ref.componentPath === g.path) { g.wire(n.id, 'done', ref.nodeId, 'scrollIntoView'); } else if (action.type === 'SetFocusToElement' && ref && ref.componentPath === g.path) g.wire(n.id, 'done', ref.nodeId, 'focus'); else todo(bubblePage.name, `${action.type}: a one-signal action with no exact node yet (chain kept)`); return { node: n, trigger: 'run', done: 'done' }; }
    case 'ScheduleAPIEvent': case 'ScheduleAPIWorkflow': { ai(`${bubblePage.name}`, `Schedule API workflow ${p.api_event}: a backend workflow → a cloud function (${Object.keys(p).filter((k) => k.startsWith('_wf_param_')).map((k) => k.slice(10)).join(', ')})`); const n = g.add({ id, type: 'Expression', label: `TODO backend workflow ${p.api_event}`, parameters: { expression: '/* Schedule API workflow: a cloud function call */ true' } }); return { node: n, trigger: 'run', done: 'done' }; }
    case 'SendEmail': case 'SendConfirmationEmail': case 'SendPasswordResetEmail': { ai(`${bubblePage.name}`, `${action.type}: Bubble sends mail from the server; NodeGX's cloud SendEmail node is the home (subject ${JSON.stringify(textLiteral(p.subject) || '').slice(0, 40)})`); const n = g.add({ id, type: 'Expression', label: `TODO ${action.type}`, parameters: { expression: '/* send an email from a cloud function */ true' } }); return { node: n, trigger: 'run', done: 'done' }; }
    case 'DisplayGroupData': { stats.actionsMapped++; const ref = elementIndex[p.element_id]; const name = `${ref?.label || p.element_id}.data`.replace(/\W+/g, '_'); const n = g.add({ id, type: 'Set Variable', label: `Display data in ${ref?.label}`, parameters: { name, setWith: '*' } }); wireValue(g, p.data_source, n.id, 'value', bubblePage, name); return { node: n, trigger: 'do', done: 'done' }; }
    case 'OAuthLogin': { ai(bubblePage.name, `OAuth login with ${p.oauth_provider}: NodeGX's SignInWith node needs the provider configured`); const n = g.add({ id, type: 'Expression', label: `TODO OAuth ${p.oauth_provider}`, parameters: { expression: '/* sign in with an OAuth provider */ true' } }); return { node: n, trigger: 'run', done: 'done' }; }
    case 'UpdateCredentials': { stats.actionsMapped++; const n = g.add({ id, type: 'net.noodl.user.SetUserProperties', label: 'Update credentials', parameters: {} }); wireValue(g, p.email, n.id, 'email', bubblePage, 'email'); if (p.password) todo(bubblePage.name, 'Update credentials: a new password needs the ResetPassword flow; only the email is set'); return { node: n, trigger: 'store', done: 'done' }; }
    case 'ShowElement': case 'HideElement': case 'ToggleElement': { const ref = elementIndex[p.element_id]; const name = `${ref?.label || p.element_id}.mounted`.replace(/\W+/g, '_'); const n = g.add({ id, type: 'Set Variable', label: `${action.type} ${ref?.label}`, parameters: { name, setWith: 'boolean', value: action.type === 'ShowElement' } }); if (ref && ref.componentPath !== g.path) { ai(bubblePage.name, `${action.type} ${ref.label}: the element lives in ${ref.componentPath}, another component; a Component Input/Output carries that`); } else if (ref) { const v = g.singleton(`vis_${ref.nodeId}`, () => ({ id: fresh('vis'), type: 'Variable2', label: `${ref.label} visible`, parameters: { name, value: ref.nodeId && g.nodes.find((x) => x.id === ref.nodeId)?.parameters.mounted !== false } })); g.wire(v.id, 'value', ref.nodeId, 'mounted'); } stats.actionsMapped++; if (action.type === 'ToggleElement') todo(bubblePage.name, `Toggle element ${ref?.label}: set to true in this spike; needs an inverter`); return { node: n, trigger: 'do', done: 'done' }; }
    default: { const plugin = pluginName(action.type) || (/^apiconnector2-/.test(action.type) ? `API Connector call ${action.type.slice(14)}` : null); if (plugin) { const n = g.add({ id, type: 'Expression', label: `TODO ${plugin}`, parameters: { expression: `/* ${plugin} */ true` } }); ai(`${bubblePage.name} / ${evLabel}`, /^API Connector/.test(plugin) ? `${plugin}: an HTTP node with the call's url/method/headers from settings.apiconnector2` : `plugin action ${plugin}: its code is in static.js (window.plugins)`); return { node: n, trigger: 'run', done: 'done' }; }
      const n = g.add({ id, type: 'Expression', label: `TODO Bubble action ${action.type}`, parameters: { expression: `/* TODO Bubble action ${action.type}: ${JSON.stringify(p).replace(/\*\//g, '* /').slice(0, 300)} */ true` } }); ai(`${bubblePage.name} / ${evLabel}`, `action type ${action.type} has no mapping; a placeholder keeps the chain intact`); return { node: n, trigger: 'run', done: 'done' }; }
  }
}

// ---------------------------------------------------------------- run
// reusable elements first (so instances know their path), then option sets, then pages
function convertReusable(id, def) {
  const name = def.name || id; const g = new Graph(reusablePath(id), 'visual', `Converted from Bubble reusable element "${name}" (${id}, a ${def.properties?.element_type || 'Group'})`);
  components.push(g); stats.reusables++;
  const pp = def.properties || {}; const fake = { id, name: `reusable ${name}`, properties: pp, elements: def.elements, workflows: def.workflows, custom_states: def.custom_states };
  const root = g.add({ id: `root_${id}`, type: 'Group', label: name, parameters: { ...layoutParams({ ...pp, horiz_alignment: 'stretch', single_width: false, single_height: false, width: undefined, height: undefined }, 'flex', 'Group'), ...styleParams(pp, 'Group'), width: pct(100), sizeMode: 'contentHeight', flexDirection: pp.container_layout === 'row' ? 'row' : 'column' }, children: [], x: 40, y: 40 });
  if (pp.element_type === 'Popup' || pp.element_type === 'GroupFocus') root.parameters.mounted = false;
  for (const k of [id, def.id]) if (k) elementIndex[k] = { nodeId: root.id, type: 'Group', componentPath: g.path, label: name };
  const layout = pp.container_layout ? (pp.container_layout === 'fixed' ? 'fixed' : 'flex') : 'fixed';
  if (layout === 'fixed') { root.parameters.position = 'relative'; if (pp.height) root.parameters.minHeight = px(pp.height); }
  convertChildren(g, def.elements, root, layout, fake, 1, 160);
  for (const [sk, sv] of Object.entries(def.custom_states || {})) { const nm = `${name}.${sv.display || sk}`.replace(/\W+/g, '_'); g.add({ id: `state_${id}_${sk.replace(/\W+/g, '_')}`, type: 'Variable2', label: `State ${sv.display || sk}`, parameters: { name: nm }, metadata: { customState: { of: root.id, name: sv.display || sk, type: sv.value } } }); stats.customStates++; }
  for (const wf of Object.values(def.workflows || {})) if (wf && typeof wf === 'object' && wf.type) { try { convertWorkflow(g, wf, fake); } catch (e) { stats.crashes = (stats.crashes || 0) + 1; todo(`reusable ${name} workflow ${wf.id}`, `the converter threw on this ${wf.type}: ${String(e.message).slice(0, 100)}`); } }
}
for (const [id, def] of Object.entries(customElements)) if (def && def.type === 'CustomDefinition') { for (const k of [id, def.id]) if (k) elementIndex[k] = { nodeId: `root_${id}`, type: 'Group', componentPath: reusablePath(id), label: def.name || id }; preIndex(def.elements, reusablePath(id), `reusable ${def.name || id}`); }
for (const [, p] of pages) { elementIndex[p.id] = { nodeId: `page_${p.id}`, type: 'Page', componentPath: pageComponentPath(p), page: p, label: p.name }; preIndex(p.elements, pageComponentPath(p), p.name); }
for (const [id, def] of Object.entries(customElements)) if (def && def.type === 'CustomDefinition') convertReusable(id, def);
for (const [key, os] of Object.entries(optionSets)) {
  if (!os || typeof os !== 'object') continue; const name = os.display || key; const g = new Graph(`/Option sets/${safeName(name)}`, 'visual', `Bubble option set "${name}" (${key})`); components.push(g); stats.optionSets++;
  const rows = Object.entries(os.values || {}).sort((a, b) => (a[1].sort_factor ?? 0) - (b[1].sort_factor ?? 0)).map(([v, o]) => ({ value: v, display: o.display ?? v, ...Object.fromEntries(Object.entries(o).filter(([k]) => !['display', 'sort_factor'].includes(k)).map(([k, x]) => [k.replace(/_$/, ''), x])) }));
  const data = g.add({ id: `os_${key}`, type: 'Static Data', label: `All options of ${name}`, parameters: { type: 'json', json: JSON.stringify(rows) }, x: 40, y: 40 });
  const outs = g.add({ id: `osout_${key}`, type: 'Component Outputs', label: 'All options', ports: [{ name: 'items', plug: 'input', type: 'array' }, { name: 'count', plug: 'input', type: 'number' }], x: 400, y: 40 });
  g.wire(data.id, 'items', outs.id, 'items'); g.wire(data.id, 'count', outs.id, 'count');
}
for (const [, p] of pages) convertPage(p);
// the App component with a Router listing every page
const appG = new Graph('/App', 'visual', 'Converted from a Bubble export'); components.unshift(appG);
const startPage = pages.find(([, p]) => p.name === 'index')?.[1] || pages[0]?.[1];
appG.add({ id: 'app_root', type: 'Group', label: 'App', parameters: { sizeMode: 'explicit', width: pct(100), height: pct(100), flexDirection: 'column', backgroundColor: 'var(--color_background_default)' }, children: ['app_router'], x: 40, y: 40 });
appG.add({ id: 'app_router', type: 'Router', label: 'Main router', parent: 'app_root', parameters: { name: 'Main', pages: { startPage: startPage ? pageComponentPath(startPage) : undefined, routes: pages.map(([, p]) => pageComponentPath(p)) } }, x: 100, y: 160 });
const defaultFont = cs.font_tokens?.default; if (defaultFont) appG.add({ id: 'app_css', type: 'CSS Definition', label: 'Bubble defaults', parameters: { style: `html, body { font-family: "${defaultFont}", sans-serif; }` }, x: 400, y: 40 });

// write
const now = new Date().toISOString();
fs.rmSync(outDir, { recursive: true, force: true }); fs.mkdirSync(path.join(outDir, 'components'), { recursive: true }); fs.mkdirSync(path.join(outDir, 'docs'), { recursive: true });
const registry = { $schema: 'https://opennoodl.dev/schemas/registry-v2.json', version: 1, lastUpdated: now, components: {} };
for (const g of components) {
  const rel = g.path.replace(/^\//, ''); const dir = path.join(outDir, 'components', rel); fs.mkdirSync(dir, { recursive: true });
  const cid = uuid(g.path); const name = path.basename(g.path);
  fs.writeFileSync(path.join(dir, 'component.json'), JSON.stringify({ $schema: 'https://opennoodl.dev/schemas/component-v2.json', id: cid, name, path: g.path, type: g.kind, created: now, modified: now, modifiedBy: 'bubble2nodegx', description: g.description }, null, 2));
  fs.writeFileSync(path.join(dir, 'nodes.json'), JSON.stringify({ $schema: 'https://opennoodl.dev/schemas/nodes-v2.json', componentId: cid, version: 1, nodes: g.nodes }, null, 2));
  fs.writeFileSync(path.join(dir, 'connections.json'), JSON.stringify({ $schema: 'https://opennoodl.dev/schemas/connections-v2.json', componentId: cid, version: 1, connections: g.connections }, null, 2));
  registry.components[rel] = { path: rel, type: g.kind === 'page' ? 'page' : 'visual', nodeCount: g.nodes.length, connectionCount: g.connections.length, modified: now, created: now };
}
fs.writeFileSync(path.join(outDir, 'components', '_registry.json'), JSON.stringify(registry, null, 2));
const BUILTIN_FONTS = new Set(['Arial', 'Arial Black', 'Courier New', 'Helvetica', 'Impact', 'Lucida Console', 'Tahoma', 'Times New Roman', 'Verdana', 'Georgia', 'serif', 'sans-serif', 'monospace', 'system-ui']);
const fontFamilies = [...fontsUsed].filter(([f]) => f && !BUILTIN_FONTS.has(f) && !/^var\(/.test(f)).map(([f, ws]) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}${ws.size ? ':wght@' + [...ws].filter((w) => w >= 100 && w <= 900).sort((a, b) => a - b).join(';') : ''}`);
if (usedMaterialIcons) fontFamilies.push('family=Material+Icons');
const headCode = fontFamilies.length ? `<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?${fontFamilies.join('&')}&display=swap" rel="stylesheet">` : ''; // s4: Bubble links its Google fonts; the deploy and the in-page preview both apply settings.headCode
fs.writeFileSync(path.join(outDir, 'nodegx.project.json'), JSON.stringify({ $schema: 'https://opennoodl.dev/schemas/project-v2.json', name: app._id || 'Bubble import', version: '4', nodegxVersion: '1.1.0', settings: { htmlTitle: cs.default_page_title || app._id, navigationPathType: 'path', bodyScroll: true, ...(headCode ? { headCode } : {}) }, structure: { componentsDir: 'components', assetsDir: 'assets' }, metadata: { designTokens: { version: 1, customTokens }, dbCollections, bubbleImport: { source: path.basename(srcPath), appId: app._id, bubbleVersion: cs.bubble_version, convertedAt: now } } }, null, 2));
fs.writeFileSync(path.join(outDir, 'nodegx.styles.json'), JSON.stringify({ $schema: 'https://opennoodl.dev/schemas/styles-v2.json', version: 1, variants }, null, 2));

const pctOf = (a, b) => b ? Math.round((100 * a) / b) : 100;
const report = [`# Bubble → NodeGX import report`, '', `Source: ${path.basename(srcPath)} (app ${app._id}, Bubble version ${cs.bubble_version}). Converted ${now}.`, '',
  '| what | count | mapped |', '|---|---|---|',
  `| pages | ${pages.length} | ${pages.length} |`, `| elements | ${stats.elements} | ${stats.mapped} (${pctOf(stats.mapped, stats.elements)}%) |`, `| element conditions | ${stats.states} | see findings |`, `| styles → variants | ${Object.keys(app.styles || {}).length} | ${stats.styles} |`,
  `| workflows | ${stats.workflows} | ${stats.workflows} |`, `| actions | ${stats.actions} | ${stats.actionsMapped} (${pctOf(stats.actionsMapped, stats.actions)}%) |`, `| expressions compiled | ${stats.expressions} | unknown operators: ${stats.exprOpsUnknown}; field reads guessed by name: ${stats.fieldReadsGuessed} |`, `| data types → collections | ${dbCollections.length} | ${dbCollections.length} |`, `| reusable elements → components | ${Object.keys(customElements).length} | ${stats.reusables} |`, `| option sets → components | ${Object.keys(optionSets).length} | ${stats.optionSets} |`, `| custom states → variables | — | ${stats.customStates} |`, `| searches → queries | — | ${stats.searches || 0} |`, `| converter crashes (caught) | — | ${stats.crashes || 0} |`, '',
  `## Findings (${findings.length})`, '', '| needs | where | what |', '|---|---|---|', ...findings.map((f) => `| ${f.level === 'ai' ? 'a person or an AI' : 'the dictionary'} | ${f.where} | ${f.what.replace(/\|/g, '\\|')} |`), ''].join('\n');
fs.writeFileSync(path.join(outDir, 'docs', 'IMPORT-REPORT.md'), report);
console.log(report);
