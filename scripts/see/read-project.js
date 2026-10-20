/**
 * A project's components as plain data, from either format — for the P111 census (`census.js`) and the honesty ratchet
 * (`honesty-ledger.js`), so the two read one population.
 *
 *   v2      every folder under `components/` that holds a `nodes.json` — the FILES, not the registry, because a
 *           component can be on disk and deployed without a registry entry (bug P111-SEE001-DBTCLOUDUNREGISTERED).
 *   legacy  a `project.json` with `components[].graph.roots`, children included.
 *
 * → { format, bytes, files, handObjects, components: [{ name, nodes, connections }] }, or null when neither is there.
 */
const fs = require('fs');
const path = require('path');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

function walkFiles(dir, out = []) {
  for (const f of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walkFiles(p, out);
    else out.push(p);
  }
  return out;
}

/** "any object with `type` and `id`" — the scoping count, kept to explain the difference. */
function handCount(value) {
  if (Array.isArray(value)) return value.reduce((s, v) => s + handCount(v), 0);
  if (!value || typeof value !== 'object') return 0;
  return (typeof value.type === 'string' && value.id !== undefined ? 1 : 0) + Object.values(value).reduce((s, v) => s + handCount(v), 0);
}

/** → { format, bytes, files, handObjects, components: [{ name, nodes: [...], connections }] } */
function readProject(dir) {
  const componentsDir = path.join(dir, 'components');
  if (fs.existsSync(path.join(componentsDir, '_registry.json'))) {
    const files = walkFiles(componentsDir).filter((f) => f.endsWith('.json'));
    const projectFile = path.join(dir, 'nodegx.project.json');
    let bytes = fs.existsSync(projectFile) ? fs.statSync(projectFile).size : 0;
    let handObjects = 0;
    const byDir = new Map();
    for (const f of files) {
      bytes += fs.statSync(f).size;
      const j = readJson(f);
      handObjects += handCount(j);
      const base = path.basename(f);
      if (base === 'nodes.json' || base === 'connections.json' || base === 'component.json') {
        const d = path.dirname(f);
        if (!byDir.has(d)) byDir.set(d, {});
        byDir.get(d)[base] = j;
      }
    }
    const components = [...byDir.entries()]
      .filter(([, c]) => c['nodes.json'])
      .map(([d, c]) => ({
        name: (c['component.json'] && c['component.json'].path) || '/' + path.relative(componentsDir, d).split(path.sep).join('/'),
        nodes: c['nodes.json'].nodes || [],
        connections: ((c['connections.json'] && c['connections.json'].connections) || []).length
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { format: 'v2', bytes, files: files.length, handObjects, components };
  }
  const legacy = path.join(dir, 'project.json');
  if (fs.existsSync(legacy)) {
    const j = readJson(legacy);
    const flat = (roots, out = []) => {
      for (const n of roots || []) {
        out.push(n);
        flat(n.children, out);
      }
      return out;
    };
    const components = (j.components || []).map((c) => ({
      name: c.name,
      nodes: flat((c.graph && c.graph.roots) || []),
      connections: ((c.graph && c.graph.connections) || []).length
    }));
    return { format: 'legacy', bytes: fs.statSync(legacy).size, files: 1, handObjects: handCount(j), components };
  }
  return null;
}

/**
 * The template folders git tracks, by name, or null when `dir` is not the repo's own `templates/`
 * (the specs read copies) or git cannot answer. A shared checkout holds other sessions' untracked
 * templates (nightbook, for months); counting them made both gates red in the tree and green in CI.
 * Modified tracked files are still counted: they are real edits a commit must carry its numbers for.
 */
function trackedTemplateNames(root, dir) {
  if (path.resolve(dir) !== path.resolve(root, 'templates')) return null;
  try {
    const out = require('child_process').execSync('git ls-files -z -- templates', { cwd: root, encoding: 'utf8' });
    return new Set(out.split('\0').filter(Boolean).map((f) => f.split('/')[1]));
  } catch {
    return null;
  }
}

module.exports = { readProject, handCount, trackedTemplateNames };
