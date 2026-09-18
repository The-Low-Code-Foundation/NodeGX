/**
 * STY-002's owed measurement: how many real projects carry the preset markers `_variant` / `_size`,
 * before AC5 deletes the rows that write them. The templates being empty does not make a user's
 * project empty.
 *
 * Population: every directory named in any editor's recently_opened_project.json that still exists
 * and holds a nodegx.project.json — the same population STY-001 §4b counted 90 of.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const SUPPORT = path.join(os.homedir(), 'Library', 'Application Support');
const roots = fs
  .readdirSync(SUPPORT, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => path.join(SUPPORT, e.name, 'recently_opened_project.json'))
  .filter((p) => fs.existsSync(p));

const dirs = new Set();
for (const file of roots) {
  let json;
  try {
    json = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    continue;
  }
  const entries = Array.isArray(json) ? json : json?.recentProjects ?? json?.projects ?? [];
  for (const e of entries) {
    const dir = typeof e === 'string' ? e : e?.uri ?? e?.path ?? e?.retainedProjectDirectory ?? e?.projectDirectory;
    if (typeof dir === 'string') dirs.add(dir.replace(/^file:\/\//, ''));
  }
}

const existing = [...dirs].filter((d) => {
  try {
    return fs.existsSync(path.join(d, 'nodegx.project.json')) || fs.existsSync(path.join(d, 'project.json'));
  } catch {
    return false;
  }
});

let projectsWithPreset = [];
let totalVariantMarkers = 0;
let totalSizeMarkers = 0;
const byType = new Map();

const walk = (dir, out) => {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.name === 'nodes.json') out.push(full);
  }
};

for (const proj of existing) {
  const files = [];
  walk(path.join(proj, 'components'), files);
  // legacy single-file projects keep every node inside project.json
  const singles = ['nodegx.project.json', 'project.json']
    .map((n) => path.join(proj, n))
    .filter((p) => fs.existsSync(p));

  let v = 0;
  let s = 0;
  const types = new Set();
  const scan = (text) => {
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return;
    }
    const visit = (node) => {
      if (node === null || typeof node !== 'object') return;
      if (Array.isArray(node)) return node.forEach(visit);
      const params = node.parameters;
      if (params && typeof params === 'object') {
        if (params._variant !== undefined) {
          v++;
          types.add(String(node.type));
        }
        if (params._size !== undefined) s++;
      }
      for (const value of Object.values(node)) visit(value);
    };
    visit(json);
  };
  for (const f of [...files, ...singles]) scan(fs.readFileSync(f, 'utf8'));

  if (v > 0 || s > 0) {
    projectsWithPreset.push({ project: path.basename(proj), dir: proj, variant: v, size: s, types: [...types] });
    totalVariantMarkers += v;
    totalSizeMarkers += s;
    for (const t of types) byType.set(t, (byType.get(t) ?? 0) + 1);
  }
}

console.log('projects in the population:', existing.length);
console.log('projects carrying _variant or _size:', projectsWithPreset.length);
console.log('_variant markers total:', totalVariantMarkers, '   _size markers total:', totalSizeMarkers);
console.log('node types wearing a preset:', JSON.stringify([...byType]));
for (const row of projectsWithPreset.sort((a, b) => b.variant + b.size - (a.variant + a.size))) {
  console.log(`  ${row.project}: _variant=${row.variant} _size=${row.size} types=${row.types.join(',')}`);
}
