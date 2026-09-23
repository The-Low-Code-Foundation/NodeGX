#!/usr/bin/env node
/**
 * PUT THIS TEMPLATE'S CLOUD FUNCTIONS INTO A RUNNING LOCAL BACKEND (TASK-L170).
 *
 * ── WHY THIS TOOL EXISTS AT ALL ────────────────────────────────────────────
 * A NodeGX backend does not read cloud functions out of a project directory.
 * `--project-dir` applies `nodegx.security.json` (SB-015) and nothing else;
 * functions live in the backend's own `<dataDir>/workflows/*.workflow.json`,
 * and the thing that puts them there is the EDITOR's exporter
 * (`noodl-editor/src/editor/src/utils/exporter/cloudFunctions.ts`), which is
 * TypeScript inside an Electron app. So a template that carries functions and
 * wants them testable from a terminal has to assemble the bundle itself — the
 * same gap `setup-backend.mjs` fills for the schema, for the same reason, and
 * the answer is the same shape: read the files, POST them, read back.
 *
 * Offered as a candidate core task (a `nodegx-backend deploy --project-dir`,
 * or the exporter extracted to a package a script can import) — not opened.
 *
 * ── THE TWO SHAPES ARE NOT THE SAME SHAPE, AND THAT IS THE WHOLE JOB ───────
 * On disk a component is three files and its wires read
 * `{fromId, fromProperty, toId, toProperty}`. In a deployed bundle a component
 * is one object and its wires read `{sourceId, sourcePort, targetId,
 * targetPort}`. Nothing warns about the difference: a bundle with the on-disk
 * spelling deploys cleanly, loads cleanly, and then every node sits there
 * unwired while the caller waits out the 30-second timeout.
 *
 * ── IT REFUSES AN UNDECLARED SIGNAL OUTPUT, BECAUSE NOTHING ELSE WILL ──────
 * `BACKEND-AUTHORING-MODEL.md` rule 1: the editor derives a code node's custom
 * signal ports by parsing the script; this door derives nothing. An
 * `Outputs.done()` with no `out-done` port throws mid-run, reaches no Response
 * node, and reads to the caller as a hang rather than as an error. It is the
 * cheapest possible check and the most expensive possible thing to debug, so
 * it happens here rather than being remembered.
 *
 * Run: node tools/deploy-functions.mjs --backend http://127.0.0.1:8577 --token <admin credential>
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = join(here, '..');
const CLOUD = join(TEMPLATE, 'components', '__cloud__');
const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const BACKEND = (arg('backend') || 'http://127.0.0.1:8577').replace(/\/$/, '');
const TOKEN = arg('token') || process.env.NODEGX_ADMIN_TOKEN;
/* The bundle name is the file the backend stores this under. One bundle for the
   whole template: the deploy is all-or-nothing, so a half-updated set of
   functions is not a state anybody can reach. */
const BUNDLE = arg('bundle') || 'dbt';
if (!TOKEN) {
  console.error('deploy-functions: pass --token <admin credential> (or NODEGX_ADMIN_TOKEN).');
  process.exit(2);
}
if (!existsSync(CLOUD)) {
  console.error(`deploy-functions: no ${CLOUD}. Nothing to deploy.`);
  process.exit(2);
}

const REQUEST_NODE_TYPE = 'noodl.cloud.request';
const failures = [];
const fail = (m) => failures.push(m);

/** Every `Outputs.<name>(` a script calls — the signals the node must declare. */
const signalsCalledBy = (script) => {
  const out = new Set();
  for (const m of String(script || '').matchAll(/Outputs\.([A-Za-z_$][\w$]*)\s*\(/g)) out.add(m[1]);
  return out;
};

/* Every directory under __cloud__ that holds a component.json — at any depth, so
   helpers can live in a folder of their own (`__cloud__/shared/…`) the way the
   editor files them, rather than beside the endpoints in one flat list. */
const componentDirs = (dir) =>
  readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) => {
      const path = join(dir, d.name);
      return existsSync(join(path, 'component.json')) ? [path] : componentDirs(path);
    });

/*
 * A COMPONENT'S INTERFACE IS DERIVED, AND AN EMPTY ONE FAILS SILENTLY.
 * The editor's exporter writes `ports` from `ComponentModel.getPorts()`: every
 * port on a `Component Inputs` node (an OUTPUT there) becomes a component INPUT,
 * and every port on a `Component Outputs` node (an INPUT there) becomes a
 * component OUTPUT. This tool first wrote `ports: []` — which deploys, loads,
 * and gives every instance of a helper no ports at all, so the wires into it go
 * nowhere and the endpoint waits out its 30 s with no error anywhere. Found by
 * the first live call of the first function that placed a helper.
 */
const componentPorts = (nodes) => {
  const ports = [];
  for (const n of nodes) {
    const flip = n.type === 'Component Inputs' ? 'input' : n.type === 'Component Outputs' ? 'output' : null;
    if (!flip) continue;
    (n.ports || []).forEach((p) => ports.push({ name: p.name, type: p.type || '*', plug: flip, index: ports.length }));
  }
  return ports;
};

const components = [];
const endpoints = [];
for (const root of componentDirs(CLOUD)) {
  const dir = { name: root.slice(CLOUD.length + 1) };
  const meta = JSON.parse(readFileSync(join(root, 'component.json'), 'utf8'));
  const { nodes } = JSON.parse(readFileSync(join(root, 'nodes.json'), 'utf8'));
  const wires = existsSync(join(root, 'connections.json'))
    ? JSON.parse(readFileSync(join(root, 'connections.json'), 'utf8')).connections || []
    : [];

  /* The PATH is the identity, never the directory name. A component whose path
     and folder disagree is served under its path, and guessing from the folder
     would deploy one function under another's name. */
  if (!meta.path || !meta.path.startsWith('/#__cloud__/')) {
    fail(`${dir.name}: component.json path is ${JSON.stringify(meta.path)}, not /#__cloud__/<name>`);
    continue;
  }

  for (const n of nodes) {
    const declared = new Set(
      (n.ports || []).filter((p) => p.plug === 'output' && p.type === 'signal').map((p) => p.name)
    );
    for (const s of signalsCalledBy((n.parameters || {}).functionScript)) {
      /* `success` and `failure` are declared on the node type itself and always
         resolve; only a node's OWN signals have to be written out. */
      if (s === 'success' || s === 'failure') continue;
      if (!declared.has(`out-${s}`)) {
        fail(
          `${meta.path} node "${n.id}" calls Outputs.${s}() with no {"name":"out-${s}","plug":"output","type":"signal"} port ` +
            `— it would throw mid-run and read to the caller as a 30s hang (BACKEND-AUTHORING-MODEL rule 1)`
        );
      }
    }
  }

  const isEndpoint = nodes.some((n) => n.type === REQUEST_NODE_TYPE);
  if (isEndpoint) endpoints.push(meta.path.slice('/#__cloud__/'.length));

  components.push({
    name: meta.path,
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type,
      parameters: n.parameters || {},
      ports: n.ports || [],
      children: n.children || []
    })),
    connections: wires.map((c) => ({
      sourceId: c.fromId,
      sourcePort: c.fromProperty,
      targetId: c.toId,
      targetPort: c.toProperty
    })),
    ports: componentPorts(nodes),
    roots: []
  });
}

if (failures.length) {
  console.error(`deploy-functions: ${failures.length} problem(s), nothing deployed:\n  ✗ ${failures.join('\n  ✗ ')}`);
  process.exit(1);
}
if (components.length === 0) {
  console.error('deploy-functions: no cloud components found.');
  process.exit(2);
}

/* `settings`, `metadata` and `modules` are the bundle's other three keys. They
   are empty on purpose: this template's functions read records through
   `Noodl.Records`, which the CloudRunner points at the service itself, so there
   is nothing here to configure and an invented `cloudservices` block would be a
   second answer to a question the runner has already answered. */
const bundle = { components, settings: {}, metadata: {}, modules: [] };

const call = async (method, path, body) => {
  const res = await fetch(BACKEND + path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : {};
};

await call('PUT', `/admin/workflows/${BUNDLE}`, bundle);
const reloaded = await call('POST', '/admin/workflows/reload');

/* Read back what the backend says it serves, rather than trusting the reload's
   own count: the thing that matters is the function list, and a bundle that
   loaded with a component the runner does not treat as an endpoint would report
   a happy reload and serve nothing. */
const health = await (await fetch(`${BACKEND}/health`)).json();
const served = (health.workflows?.functions || []).filter((f) => f.workflow === BUNDLE).map((f) => f.name).sort();
const missing = endpoints.filter((n) => !served.includes(n));
if (missing.length) {
  console.error(`deploy-functions: deployed, but the backend does not serve ${missing.join(', ')}.`);
  process.exit(1);
}
const helpers = components.length - endpoints.length;
console.log(
  `deploy-functions: ${components.length} component(s) in bundle "${BUNDLE}" (${reloaded.count} loaded); ` +
    `${served.length} endpoint(s) served: ${served.join(', ')}` +
    `${helpers ? `; ${helpers} helper(s) with no Request node` : ''}.`
);
