/**
 * THE DEMO ENGINE'S INPUTS, READ FROM THE PROJECT (DBU-11).
 *
 * tools/build-demo.mjs embeds these in the demo's service worker; tools/check-demo.mjs builds the same engine in
 * Node with nodeEngine() and calls the template's functions through it.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative, sep } from 'node:path';
import { APP, readJson } from './local.mjs';
import { FILES_DIR, worldSources } from './seed.mjs';
import { buildWorld, resolveRows } from './world.mjs';

const require = createRequire(import.meta.url);

/** Every component under components/__cloud__, keyed by its path ('__cloud__/addLearner', '__cloud__/shared/Message mail'). */
export function cloudGraphs() {
  const base = join(APP, 'components');
  const out = {};
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const d = join(dir, e.name);
      if (existsSync(join(d, 'nodes.json'))) {
        const key = relative(base, d).split(sep).join('/');
        const nodes = JSON.parse(readFileSync(join(d, 'nodes.json'), 'utf8')).nodes;
        const cf = join(d, 'connections.json');
        const connections = existsSync(cf) ? JSON.parse(readFileSync(cf, 'utf8')).connections : [];
        out[key] = { nodes, connections };
      }
      walk(d);
    }
  };
  walk(join(base, '__cloud__'));
  return out;
}

/** The node types the engine knows. A cloud component using any other fails the build, not the visitor. */
export const ENGINE_NODE_TYPES = new Set([
  'noodl.cloud.request', 'noodl.cloud.response', 'JavaScriptFunction', 'Component Inputs', 'Component Outputs',
  'noodl.cloud.createuser', 'noodl.cloud.getuserroles', 'noodl.cloud.addusertorole', 'noodl.cloud.listusersinrole'
]);

export function unsupportedNodes(graphs) {
  const bad = [];
  for (const [path, g] of Object.entries(graphs)) {
    for (const n of g.nodes) {
      if (ENGINE_NODE_TYPES.has(n.type)) continue;
      if (n.type.startsWith('/#') && graphs[n.type.slice(2)]) continue;
      bad.push(`${path}: ${n.id} (${n.type})`);
    }
  }
  return bad;
}

/** The engine, in Node: memory for storage, fixture files from disk. */
export function nodeEngine({ now, log } = {}) {
  require(join(APP, 'tools', 'demo', 'engine.js'));
  const { createEngine } = globalThis.DbuDemoEngine;
  const sources = worldSources();
  const files = new Map();
  let saved = null;
  return createEngine({
    graphs: cloudGraphs(),
    policy: readJson('nodegx.security.json'),
    now,
    log: log || (() => {}),
    buildWorld: (at) => buildWorld(at, sources),
    resolveRows,
    fixtureFile: async (name) => new Uint8Array(readFileSync(join(FILES_DIR, name))),
    load: async () => saved,
    save: async (s) => { saved = JSON.parse(JSON.stringify(s)); },
    files: {
      put: async (name, bytes, contentType) => { files.set(name, { bytes, contentType }); },
      get: async (name) => files.get(name) || null,
      clear: async () => files.clear()
    }
  });
}
