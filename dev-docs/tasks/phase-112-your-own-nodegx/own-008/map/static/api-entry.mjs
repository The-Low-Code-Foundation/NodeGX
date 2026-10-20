// The map editor's server, answered inside the page: what `editor/server.mjs` does for `/api/*`, run on a
// project held in memory. Bundled by build.mjs into `api.js`, which the static copy loads before `app.mjs`.
//
// The project is `project.json` beside the page (every text file, path → text, as `projectTree` reads it).
// Save goes through the same `core/commit.mjs` the server and the suite adapter use, into memory, so a
// person can rewire and save on nodegx.io and nothing leaves the tab. The ports and the type list come
// from the repo's `@nodegx/node-spec` (the build aliases it to the source), not the copy on npm.

import { specFor, specs, drawnPorts } from '@nodegx/node-spec';
import { memoryFiles, isV2Project } from '@nodegx/project-contract/format.js';
import { validateStructure } from '@nodegx/project-contract/editor-suite.js';
import { V2ProjectStore, commit, readProject } from '../editor/core/commit.mjs';

/** What the header shows beside the app's name, and what Save says it saved into. */
const WHERE = 'this browser tab (nothing is uploaded)';

let files = null;
const loading = fetch(new URL('project.json', document.baseURI))
  .then((r) => {
    if (!r.ok) throw new Error(`project.json answered ${r.status}`);
    return r.json();
  })
  .then((initial) => {
    if (!isV2Project(memoryFiles(initial))) throw new Error('project.json is not a NodeGX project.');
    files = memoryFiles(initial);
  });

const tree = () => files.entries();

function projectPayload() {
  const store = new V2ProjectStore(files);
  const project = store.readProjectFile() ?? {};
  return { dir: WHERE, name: project.name ?? 'NodeGX app', formatVersion: project.version, components: readProject(store), tree: tree() };
}

function revisions() {
  const out = {};
  for (const c of readProject(new V2ProjectStore(files))) out[c.key] = c.revision;
  return out;
}

/** As the server's `portsOf`: the ports node-spec gives a node with these params and this context. */
function portsOf({ type, parameters, context }) {
  const spec = specFor(type);
  if (!spec) return { known: false, ports: [] };
  try {
    return { known: true, ports: drawnPorts(spec, parameters ?? {}, context ?? {}) };
  } catch (err) {
    try {
      return { known: true, partial: err.message, ports: drawnPorts(spec, parameters ?? {}, {}) };
    } catch (err2) {
      return { known: true, partial: err2.message, ports: [] };
    }
  }
}

async function answer(path, method, body) {
  await loading;
  if (path === 'project' && method === 'GET') return [200, projectPayload()];
  if (path === 'open') return [400, { error: 'This copy shows one app, the todo list. Install the map editor to open your own.' }];
  if (path === 'revisions' && method === 'GET') return [200, revisions()];
  if (path === 'music' && method === 'GET') return [200, []];
  if (path === 'types' && method === 'GET') return [200, Object.keys(specs).sort()];
  if (path === 'ports' && method === 'POST') {
    if (Array.isArray(body.items)) {
      return [200, body.items.map((item) => {
        const r = portsOf(item);
        return r.known ? r.ports.map((p) => [p.name, p.plug, p.type]) : null;
      })];
    }
    return [200, portsOf(body)];
  }
  if (path === 'save' && method === 'POST') {
    const result = commit(new V2ProjectStore(files), body.changes ?? []);
    result.validation = validateStructure(tree());
    result.tree = tree();
    return [200, result];
  }
  return [404, { error: 'not found' }];
}

const apiBase = new URL('api/', document.baseURI).href;
const realFetch = window.fetch.bind(window);

window.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url, document.baseURI).href;
  if (!url.startsWith(apiBase)) return realFetch(input, init);
  const method = (init.method ?? 'GET').toUpperCase();
  let status;
  let json;
  try {
    [status, json] = await answer(url.slice(apiBase.length).split('?')[0], method, init.body ? JSON.parse(init.body) : {});
  } catch (err) {
    [status, json] = [500, { error: err.message }];
  }
  return new Response(JSON.stringify(json), { status, headers: { 'content-type': 'application/json' } });
};
