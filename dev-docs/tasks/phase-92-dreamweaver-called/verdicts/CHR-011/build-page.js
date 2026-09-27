// CHR-011 page builder — the one page Richard opens to rule the phase.
//
//   node build-page.js <outDir>            e.g. node build-page.js 2026-09-18
//
// Reads CHR-001's before numbers and CHR-011's after numbers (whichever exist) and writes
// <outDir>/index.html: eight before/after pairs, the AC2 table, and a verdict slot per surface.
// Plain HTML, relative images, no build — it opens from disk with `open <outDir>/index.html`.
//
// It runs BEFORE the pictures exist on purpose: every missing after-shot renders as a labelled
// gap, so the page is honest about what has not been taken rather than silently short
// ([[assert-an-absence-with-a-known-firing-signal-beside-it]]).
const fs = require('fs');
const path = require('path');

const outDir = path.resolve(process.cwd(), process.argv[2] || '');
if (!process.argv[2]) { console.error('usage: node build-page.js <outDir>'); process.exit(2); }
fs.mkdirSync(outDir, { recursive: true });

const BEFORE_DIR = path.resolve(__dirname, '../CHR-001/2026-09-15');
const beforeRel = path.relative(outDir, BEFORE_DIR);
const readJson = (p, fallback) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; } };

const beforeNumbers = readJson(path.join(BEFORE_DIR, 'numbers.json'), null);
const beforeManifest = readJson(path.join(BEFORE_DIR, 'manifest.json'), null);
const after = {
  dark: readJson(path.join(outDir, 'measured-dark.json'), null),
  light: readJson(path.join(outDir, 'measured-light.json'), null)
};
const afterManifest = readJson(path.join(outDir, 'manifest.json'), null);

const SURFACES = [
  { key: 'launcher-projects', title: 'Launcher — Projects', note: 'CHR-005: one page, one card, one button, one chip' },
  { key: 'launcher-community', title: 'Launcher — Community', note: 'CHR-012, closed as passable' },
  { key: 'launcher-learning', title: 'Launcher — Learning', note: 'CHR-005' },
  { key: 'launcher-templates', title: 'Launcher — Templates', note: 'CHR-006, ruled WORTHY: the homepage grid with real pictures' },
  { key: 'editor-group-panel-top', title: 'Property panel — top of a Group', measureKey: 'editor-group-panel', note: 'CHR-007, CHR-008, CHR-009' },
  { key: 'editor-group-panel-boxshadow', title: 'Property panel — Box Shadow, switched off', measureKey: 'editor-group-panel', note: 'CHR-008 R8: six gate sentences become one line' },
  { key: 'editor-nodepicker', title: 'Node picker', note: 'whole window, so it carries the chrome behind the modal' }
];

// AC2. `after` is a function of the measured JSON so a row cannot claim a number nobody took.
const num = (o, p) => p.split('.').reduce((v, k) => (v == null ? v : v[k]), o);
const AC2 = [
  { label: 'font sizes, Templates tab', before: 10, target: '≤ 5', owed: 'CHR-002',
    read: () => num(after.dark, 'launcher-templates.auditMethod.fontSizes.distinct') },
  { label: 'font sizes, Group panel', before: 10, target: '2', owed: 'CHR-002, CHR-009',
    read: () => num(after.dark, 'editor-group-panel.auditMethod.fontSizes.distinct') },
  { label: 'button styles, Templates tab', before: 7, target: '≤ 3', owed: 'CHR-005',
    read: () => num(after.dark, 'launcher-templates.buttons.distinctStyles') },
  { label: 'elements, Group panel', before: 1125, target: '≤ 600', owed: 'CHR-008',
    read: () => num(after.dark, 'editor-group-panel.elements') },
  { label: 'inline-styled, Group panel', before: 250, target: '≤ 30', owed: 'CHR-008',
    read: () => num(after.dark, 'editor-group-panel.inlineStyled') }
];

// The static half, taken without a build (CHR-011 §6, re-measured at 24d2a282c in §7).
const STATIC = [
  ['`createRoot` files under `propertyeditor/`', '39', '38 code calls (42 by plain grep, which counts prose)', '≤ 3',
   '❌ <b>CHR-008 stays open</b> — §3.1 ships inert and ≤3 is unreachable while popout roots exist (CHR-008 §10.4)'],
  ['tests parsing CSS text', '28', '24', '≤ 4',
   '❌ <b>CHR-004 stays open</b> — the six colour-pinning specs went in s30; the rest is §3.3, unruled'],
  ['`fa-` uses editor-wide', '32', '0', '0', '✅ CHR-010; <code>npm run icons:font</code> holds it at zero over 3,187 files'],
  ['<code>type</code> ratchet', 'baseline', '−3 raw px vs baseline, exit 0', 'no regression', '✅'],
  ['<code>colors</code> ratchet', '16 = 16', '16 = 16, exit 0', 'no regression', '✅'],
  ['<code>icons:css</code>', '—', '0 url()-to-SVG over 332 files, exit 0', '0', '✅'],
  ['<code>tokens:css</code>', '—', 'every var(--…) defined over 333 stylesheets, exit 0', 'green', '✅']
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const shotExists = (dir, file) => fs.existsSync(path.join(dir, file));

function pair(surface, theme) {
  const file = surface.key + '-' + theme + '.png';
  const beforeSrc = beforeRel + '/' + file;
  const haveBefore = shotExists(BEFORE_DIR, file);
  const haveAfter = shotExists(outDir, file);
  const cell = (src, have, label) => have
    ? '<figure><img src="' + esc(src) + '" alt="' + esc(label) + '"><figcaption>' + esc(label) + '</figcaption></figure>'
    : '<figure class="gap"><div class="missing">not taken</div><figcaption>' + esc(label) + '</figcaption></figure>';
  return '<div class="pair">' +
    cell(beforeSrc, haveBefore, 'before — 0.2.4, 2026-09-15') +
    cell(file, haveAfter, 'after — packaged HEAD') +
    '</div>';
}

function surfaceNumbers(surface) {
  const mk = surface.measureKey || surface.key;
  const rows = [];
  for (const theme of ['dark', 'light']) {
    const b = beforeNumbers && beforeNumbers.surfaces && beforeNumbers.surfaces[mk.replace(/-top$|-boxshadow$/, '')];
    const a = after[theme] && after[theme][mk];
    if (!a && !b) continue;
    rows.push('<tr><td>' + theme + '</td>' +
      '<td>' + (b ? esc(b.fontSizes ? b.fontSizes.auditMethod : '—') : '—') + '</td>' +
      '<td>' + (a ? esc(num(a, 'auditMethod.fontSizes.distinct')) : '<i>not taken</i>') + '</td>' +
      '<td>' + (b ? esc(b.elements) : '—') + '</td>' +
      '<td>' + (a ? esc(a.elements) : '<i>not taken</i>') + '</td>' +
      '<td>' + (b ? esc(b.inlineStyled) : '—') + '</td>' +
      '<td>' + (a ? esc(a.inlineStyled) : '<i>not taken</i>') + '</td></tr>');
  }
  if (!rows.length) return '';
  return '<table class="nums"><thead><tr><th>theme</th><th>sizes before</th><th>sizes after</th>' +
    '<th>elements before</th><th>elements after</th><th>inline before</th><th>inline after</th></tr></thead>' +
    '<tbody>' + rows.join('') + '</tbody></table>';
}

const ac2Rows = AC2.map((r) => {
  const v = r.read();
  return '<tr><td>' + esc(r.label) + '</td><td>' + esc(r.before) + '</td><td>' +
    (v == null ? '<i>needs the packaged build</i>' : '<b>' + esc(v) + '</b>') +
    '</td><td>' + esc(r.target) + '</td><td>' + esc(r.owed) + '</td></tr>';
}).join('');

const staticRows = STATIC.map((r) =>
  '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td><td>' + r[3] + '</td><td>' + r[4] + '</td></tr>').join('');

const sections = SURFACES.map((s) =>
  '<section><h2>' + esc(s.title) + '</h2><p class="note">' + esc(s.note) + '</p>' +
  '<h3>dark</h3>' + pair(s, 'dark') +
  '<h3>light</h3>' + pair(s, 'light') +
  surfaceNumbers(s) +
  '<div class="verdict"><b>Verdict:</b> WORTHY / PASSABLE / SHITTY — <i>and if not WORTHY, which region</i></div>' +
  '</section>').join('\n');

const shotsTaken = SURFACES.reduce((n, s) => n + ['dark', 'light'].filter((t) => shotExists(outDir, s.key + '-' + t + '.png')).length, 0);

const html = '<!doctype html>\n<meta charset="utf-8">\n<title>CHR-011 — the after picture</title>\n' +
  '<style>' +
  'body{margin:0;padding:32px;background:#121214;color:#e7e7ea;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}' +
  'h1{font-size:28px;margin:0 0 4px}h2{font-size:20px;margin:0 0 4px}h3{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#8a8a94;margin:20px 0 8px}' +
  'section{max-width:1400px;margin:0 0 56px;padding:24px;background:#18181b;border:1px solid #26262b;border-radius:8px}' +
  '.note{color:#8a8a94;margin:0 0 8px}' +
  '.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}' +
  'figure{margin:0}figure img{width:100%;display:block;border:1px solid #303036;border-radius:4px}' +
  'figcaption{color:#8a8a94;font-size:12px;margin-top:6px}' +
  '.gap .missing{aspect-ratio:1368/781;display:flex;align-items:center;justify-content:center;border:1px dashed #44444c;border-radius:4px;color:#6a6a74}' +
  'table{border-collapse:collapse;margin:20px 0;width:100%;max-width:1400px}' +
  'th,td{border:1px solid #2c2c32;padding:6px 10px;text-align:left;vertical-align:top}th{color:#8a8a94;font-weight:600;font-size:12px}' +
  '.verdict{margin-top:20px;padding:12px 14px;background:#1e1e22;border-left:3px solid #6a6a74;border-radius:4px;color:#b8b8c0}' +
  'code{background:#26262b;padding:1px 4px;border-radius:3px}' +
  '.head{max-width:1400px;margin-bottom:40px}' +
  '</style>\n' +
  '<div class="head"><h1>CHR-011 — the after picture</h1>' +
  '<p class="note">Phase 92 closes on this page. Before is the installed 0.2.4 shot on 2026-09-15 (CHR-001, HEAD <code>' +
  esc(beforeNumbers ? beforeNumbers.head : 'unknown') + '</code>); after is the packaged build of the HEAD named in <code>manifest.json</code>. ' +
  'Same viewports, same two seeded projects, same eval.</p>' +
  '<p class="note"><b>' + shotsTaken + ' of ' + (SURFACES.length * 2) + ' after-shots taken.</b>' +
  (afterManifest ? '' : ' No <code>manifest.json</code> in this directory yet, so the build these pictures came from is not pinned.') + '</p>' +
  '<h3>AC2 — the rendered numbers</h3>' +
  '<table><thead><tr><th>number</th><th>CHR-001</th><th>CHR-011</th><th>promised</th><th>owed by</th></tr></thead><tbody>' + ac2Rows + '</tbody></table>' +
  '<h3>AC2 — the static numbers, which need no build</h3>' +
  '<table><thead><tr><th>number</th><th>CHR-001</th><th>now</th><th>target</th><th>verdict</th></tr></thead><tbody>' + staticRows + '</tbody></table>' +
  '</div>\n' + sections + '\n';

fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log('wrote', path.join(outDir, 'index.html'), '—', shotsTaken, 'of', SURFACES.length * 2, 'after-shots present');
