#!/usr/bin/env node
// bubble-run-bundle-to-export — a Bubble app's run-mode bundles → one export-shaped JSON.
//
//   node bubble-run-bundle-to-export.mjs <folder with *.dynamic.js [and static.js]> <out.json>
//
// Bubble's run mode ships the app definition to the browser in `/package/dynamic_js/.../<page>/dynamic.js`:
// `const app = JSON.parse('…')` (settings, user_types, option_sets, styles, reusable elements) and
// `app['%p3']['<pageKey>'] = …JSON.parse('…')` (that page's elements and workflows), in Bubble's abbreviated key
// form (`%p` properties, `%x` type, `%el` elements …). Each page's dynamic.js carries the whole app part and its own
// page, so one file per page gives the whole app. This expands the abbreviated keys to the names the paid-plan
// export uses, so `bubble2nodegx.mjs` reads either. `static.js` (optional) only lends plugin names.
// Nothing here is executed: the JS string literals are decoded as text and parsed as JSON.
import fs from 'node:fs';
import path from 'node:path';

const [,, folder, outPath] = process.argv;
if (!folder || !outPath) { console.error('usage: bubble-run-bundle-to-export.mjs <folder> <out.json>'); process.exit(2); }

// Bubble's abbreviated keys → the export's names (measured on a 22-page app of 2026-10; unknown keys are kept as-is)
const KEYS = {
  '%p': 'properties', '%x': 'type', '%nm': 'name', '%dn': 'default_name', '%el': 'elements', '%wf': 'workflows', '%ed': 'custom_elements', '%p3': 'pages',
  '%h': 'height', '%w': 'width', '%l': 'left', '%t': 'top', '%z': 'zindex', '%s1': 'style', '%s': 'states', '%c': 'condition', '%n': 'next', '%a': 'args', '%e': 'entries',
  '%ei': 'element_id', '%cp': 'current_parent', '%v': 'value', '%d': 'display', '%iv': 'is_visible', '%ds': 'data_source', '%gt': 'group_type',
  '%bgc': 'bgcolor', '%bas': 'background_style', '%bgf': 'background_gradient_from', '%bgt': 'background_gradient_to', '%bgi': 'background_image', '%br': 'border_roundness',
  '%bc': 'border_color', '%bw': 'border_width', '%bos': 'border_style', '%bs': 'boxshadow_style', '%bsb': 'boxshadow_blur', '%bsc': 'boxshadow_color', '%bsp': 'boxshadow_spread', '%bh': 'boxshadow_horizontal', '%bv': 'boxshadow_vertical',
  '%fc': 'font_color', '%fs': 'font_size', '%f': 'font_face', '%b': 'bold', '%lh': 'line_height', '%fa': 'font_alignment', '%ls': 'letter_spacing', '%vc': 'vertical_centering',
  '%tes': 'text_shadow_enabled', '%tsb': 'text_shadow_blur', '%tsc': 'text_shadow_color', '%tsh': 'text_shadow_horizontal', '%tsv': 'text_shadow_vertical',
  '%3': 'text', '%ps': 'placeholder', '%c1': 'initial_content', '%cf': 'content_format', '%1m': 'mandatory', '%lab': 'label', '%t1': 'title', '%md': 'meta_description', '%pet': 'page_type', '%rbh': 'repeat_background_horizontal', '%rbv': 'repeat_background_vertical',
  '%9i': 'icon', '%ic': 'icon_color', '%2f': 'image_fit', '%ht': 'html', '%d1': 'default', '%ch': 'choices', '%ci': 'custom_id', '%3f': 'float_vertical', '%et': 'element_type',
  '%1l': 'link_type', '%o9': 'open_in_new_tab', '%pa': 'page', '%rs': 'rows', '%c5': 'columns', '%sc': 'separator_color', '%ss': 'separator_style', '%sw': 'separator_width',
  '%co': 'constraints', '%k': 'key', '%c2': 'constraint_type', '%t5': 'type', '%sf': 'sort_field', '%d2': 'descending', '%ft': 'format',
  '%ak': 'action', '%tt': 'thing_type', '%i2': 'initial_values', '%cs': 'changes', '%tc': 'thing_to_change', '%ai': 'action_id', '%em': 'email', '%pw': 'password', '%p2': 'new_password_again', '%en': 'event_name', '%su': 'subject', '%b3': 'body', '%f3': 'fields', '%del': 'deleted'
};
const unknown = new Map();
function expand(o, parentKey) {
  if (Array.isArray(o)) return o.map((v) => expand(v, parentKey));
  if (o && typeof o === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(o)) {
      let nk = k;
      if (k.startsWith('%')) { nk = KEYS[k] ?? k; if (!KEYS[k]) unknown.set(k, (unknown.get(k) || 0) + 1); }
      // `%t5` is the thing type on a Search (its `type` key would clash with `%x`): keep both readable
      if (k === '%t5') nk = 'thing_type';
      out[nk] = expand(v, nk);
    }
    return out;
  }
  return o;
}

// decode a JS single-quoted string literal's body (no execution: an escape table)
function jsString(body) {
  return body.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|[\s\S])/g, (_, e) => {
    if (e[0] === 'u') return String.fromCodePoint(parseInt(e.replace(/^u\{?|\}$/g, ''), 16));
    if (e[0] === 'x') return String.fromCharCode(parseInt(e.slice(1), 16));
    return { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', '0': '\0', '\n': '' }[e] ?? e;
  });
}
const LIT = /'((?:[^'\\]|\\[\s\S])*)'/.source;

const files = fs.readdirSync(folder).filter((f) => f.endsWith('dynamic.js'));
if (!files.length) { console.error(`no *.dynamic.js in ${folder}`); process.exit(2); }
let app = null; const pages = {}; const seen = new Set(); let pageFiles = 0;
for (const f of files) {
  const t = fs.readFileSync(path.join(folder, f), 'utf8');
  const sig = t.length + ':' + t.slice(-300); if (seen.has(sig)) continue; seen.add(sig); // login-gated pages serve index again
  const base = t.match(new RegExp(`const app = JSON\\.parse\\(${LIT}\\)`));
  if (!base) { console.error(`${f}: no app literal`); continue; }
  const thisApp = JSON.parse(jsString(base[1]));
  if (!app) app = thisApp; else for (const k of ['%ed', 'styles', 'user_types', 'option_sets']) app[k] = { ...(app[k] || {}), ...(thisApp[k] || {}) }; // each page's bundle carries only the reusables it places
  for (const m of t.matchAll(new RegExp(`app\\['%p3'\\]\\['(\\w+)'\\] = Object\\.assign\\([^,]+, JSON\\.parse\\(${LIT}\\)\\)`, 'g'))) { pages[m[1]] = JSON.parse(jsString(m[2])); pageFiles++; }
  const idx = t.match(new RegExp(`app\\['_index'\\]\\['id_to_path'\\] = Object\\.assign\\([^,]+, JSON\\.parse\\(${LIT}\\)\\)`));
  if (idx) { app._index ??= {}; app._index.id_to_path = { ...(app._index.id_to_path || {}), ...JSON.parse(jsString(idx[1])) }; }
}
if (!app) { console.error('no app found'); process.exit(1); }

// plugin names from static.js, if present
const plugins = {};
const staticPath = path.join(folder, 'static.js');
if (fs.existsSync(staticPath)) {
  for (const line of fs.readFileSync(staticPath, 'utf8').split('\n')) {
    const m = /^window\.plugins\["([^"]+)"\]\s*=\s*(.*?);?$/.exec(line); if (!m) continue;
    try {
      const d = JSON.parse(m[2]);
      plugins[m[1]] = { human: d.human, elements: Object.fromEntries(Object.entries(d.plugin_elements || {}).map(([k, v]) => [k, v.display || k])), actions: Object.fromEntries(Object.entries(d.plugin_actions || {}).map(([k, v]) => [k, v.display || k])) };
    } catch { plugins[m[1]] = { human: m[1], elements: {}, actions: {} }; }
  }
}

const pagesTable = app['%p3'] || {};
const out = expand({
  _id: app._id, app_version: app.app_version, app_json_version: app.app_json_version, last_change: app.last_change,
  settings: app.settings, user_types: app.user_types, option_sets: app.option_sets, styles: app.styles, global_expressions: app.global_expressions,
  '%p3': Object.fromEntries(Object.entries(pages).map(([k, p]) => [k, { ...pagesTable[k], ...p }])),
  '%ed': app['%ed'] || {},
  _index: app._index,
});
out.pages_known = Object.fromEntries(Object.entries(pagesTable).map(([k, v]) => [k, v['%nm']]));
out.plugins_installed = plugins;
out.source = { kind: 'run-mode bundles', folder: path.basename(folder), pageFiles, pagesWithTree: Object.keys(pages).length, pagesInApp: Object.keys(pagesTable).length, unknownKeys: Object.fromEntries([...unknown].sort((a, b) => b[1] - a[1])) };
fs.writeFileSync(outPath, JSON.stringify(out));
const missing = Object.entries(pagesTable).filter(([k]) => !pages[k]).map(([, v]) => v['%nm']);
console.log(`${path.basename(outPath)}: ${(fs.statSync(outPath).size / 1e6).toFixed(1)} MB; pages with a tree ${Object.keys(pages).length}/${Object.keys(pagesTable).length}${missing.length ? ` (no bundle for: ${missing.join(', ')})` : ''}; reusables ${Object.keys(out.custom_elements).length}; data types ${Object.keys(out.user_types || {}).length}; option sets ${Object.keys(out.option_sets || {}).length}; styles ${Object.keys(out.styles || {}).length}; plugins named ${Object.keys(plugins).length}`);
if (unknown.size) console.log('abbreviated keys kept as-is:', [...unknown].map(([k, n]) => `${k}×${n}`).join(' '));
