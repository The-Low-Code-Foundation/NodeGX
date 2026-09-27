#!/usr/bin/env node
/**
 * Which wires did a deploy drop? Names them; the census only counts them.
 *
 * `deploy-from-disk.entry.ts` reports `droppedByComponent` as a per-component
 * COUNT — "/Pages/Read: 46 on graph, 43 deployed". That is enough to know
 * something went missing and not enough to know what, and the gap between those
 * two sentences is the whole cost of D52: three dropped wires read as "the
 * product drops the wires that make a repeated row clickable" until somebody
 * diffs them and finds they are all one `For Each`'s item ports.
 *
 * This reads the AUTHORED connections out of a v2 project directory and the
 * DEPLOYED ones out of the bundle, and prints the set difference with each
 * end's node type attached.
 *
 * 🔴 The two sides spell a connection differently and neither is wrong:
 * authored is `fromId`/`fromProperty`/`toId`/`toProperty`, deployed is
 * `sourceId`/`sourcePort`/`targetId`/`targetPort`. Keying one shape against the
 * other reports EVERY connection as dropped, which is a very convincing way to
 * find a catastrophe that is not there.
 *
 * ⚠️ A deployed component lives in `noodl_bundles/*.json` (a bare ARRAY) or
 * under `components` in the root export. Reading only one shape reports zero
 * deployed connections on a deploy that carried hundreds.
 *
 * Usage:
 *   node scripts/devtools/deploy-connection-diff.js <project-dir> <deploy-dir>
 *
 * Exits 0 whether or not anything was dropped: what was dropped is the reading,
 * not an error. Exits 1 only when it could not take the reading at all.
 */
const fs = require('fs');
const path = require('path');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

/** Every component in a deploy folder, from both shapes it uses. */
function deployedComponents(deployDir) {
  const indexName = fs.readdirSync(deployDir).find((f) => /^index(-[0-9a-f]+)?\.js$/.test(f));
  if (!indexName) throw new Error(`no index js in ${deployDir} — is that a deploy folder?`);
  const js = fs.readFileSync(path.join(deployDir, indexName), 'utf8');
  const m = js.match(/window\.projectData\s*=\s*(\{[\s\S]*\});\s*$/);
  if (!m) throw new Error(`could not read window.projectData out of ${indexName}`);

  const out = [];
  const take = (list) => {
    for (const c of list ?? []) out.push(c);
  };
  take(JSON.parse(m[1]).components);

  const bundleDir = path.join(deployDir, 'noodl_bundles');
  if (fs.existsSync(bundleDir)) {
    for (const f of fs.readdirSync(bundleDir).filter((f) => f.endsWith('.json'))) {
      const b = readJson(path.join(bundleDir, f));
      take(Array.isArray(b) ? b : b.components);
    }
  }
  return out;
}

/** Every directory under components/ that holds a connections.json. */
function authoredComponents(projectDir) {
  const root = path.join(projectDir, 'components');
  const found = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(path.join(dir, e.name));
      else if (e.name === 'connections.json') found.push(dir);
    }
  })(root);
  return found.map((dir) => ({ dir, name: '/' + path.relative(root, dir) }));
}

function main() {
  const [projectDir, deployDir] = process.argv.slice(2);
  if (!projectDir || !deployDir) {
    console.error('usage: deploy-connection-diff.js <project-dir> <deploy-dir>');
    process.exit(2);
  }

  const deployed = deployedComponents(path.resolve(deployDir));
  const authoredKey = (c) => `${c.fromId}.${c.fromProperty}->${c.toId}.${c.toProperty}`;
  const deployedKey = (c) => `${c.sourceId}.${c.sourcePort}->${c.targetId}.${c.targetPort}`;

  let totalAuthored = 0;
  let totalDeployed = 0;
  let totalMissing = 0;

  for (const { dir, name } of authoredComponents(path.resolve(projectDir))) {
    const dep = deployed.find((c) => c.name === name);
    if (!dep) {
      console.log(`${name}: NOT IN THE DEPLOY AT ALL`);
      continue;
    }
    const have = new Set((dep.connections ?? []).map(deployedKey));

    const raw = readJson(path.join(dir, 'connections.json'));
    const authored = Array.isArray(raw) ? raw : raw.connections ?? [];

    // Node types, so a dropped wire says what it was rather than two ids.
    const byId = {};
    const nodesRaw = readJson(path.join(dir, 'nodes.json'));
    (function walk(list) {
      for (const n of list ?? []) {
        byId[n.id] = n;
        walk(n.children);
      }
    })(Array.isArray(nodesRaw) ? nodesRaw : nodesRaw.roots ?? nodesRaw.nodes);

    const missing = authored.filter((c) => !have.has(authoredKey(c)));
    totalAuthored += authored.length;
    totalDeployed += have.size;
    totalMissing += missing.length;

    console.log(`${name}: authored ${authored.length}, deployed ${have.size}, missing ${missing.length}`);
    for (const c of missing) {
      const f = byId[c.fromId];
      const t = byId[c.toId];
      const type = (n) => (n ? (typeof n.type === 'string' ? n.type : n.type && n.type.name) : '?');
      console.log(`    ${type(f)}[${c.fromId}].${c.fromProperty}  ->  ${type(t)}[${c.toId}].${c.toProperty}`);
    }
  }

  console.log(`\nTOTAL authored ${totalAuthored}, deployed ${totalDeployed}, missing ${totalMissing}`);
}

try {
  main();
} catch (e) {
  console.error((e && e.stack) || String(e));
  process.exit(1);
}
