#!/usr/bin/env node
/**
 * PUT THIS APP'S CLOUD FUNCTIONS INTO A RUNNING BACKEND (DBU-01).
 *
 *   node tools/deploy-functions.mjs [--backend <url>] [--token <admin>]
 *
 * A NodeGX backend does not read functions from the project folder
 * (PLATFORM.md); the editor's Deploy button and the MCP's deploy_cloud_functions
 * both need the editor's own backend. This is the terminal's way, copied in
 * shape from digital-bricks-training/tools/deploy-functions.mjs:
 *
 *  - On disk a wire is {fromId, fromProperty, toId, toProperty}; in a bundle it
 *    is {sourceId, sourcePort, targetId, targetPort}. Getting this wrong deploys
 *    cleanly and then every call hangs for 30 s.
 *  - A helper's interface is derived from its Component Inputs/Outputs.
 *  - REFUSES a script calling Outputs.x() with no out-x signal port (it would
 *    throw mid-run and read to the caller as a hang).
 *  - REFUSES to finish while any served function has no rule in the live
 *    policy: an unruled function runs for any signed-in caller.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { APP, BACKEND, arg, token } from './lib/local.mjs';

const CLOUD = join(APP, 'components', '__cloud__');
const BUNDLE = arg('bundle') || 'dbu';
const TOKEN = token();
const failures = [];

const componentDirs = (dir) =>
  readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) => {
      const path = join(dir, d.name);
      return existsSync(join(path, 'component.json')) ? [path] : componentDirs(path);
    });

const componentPorts = (nodes) => {
  const ports = [];
  for (const n of nodes) {
    const plug = n.type === 'Component Inputs' ? 'input' : n.type === 'Component Outputs' ? 'output' : null;
    if (!plug) continue;
    (n.ports || []).forEach((p) => ports.push({ name: p.name, type: p.type || '*', plug, index: ports.length }));
  }
  return ports;
};

const components = [];
const endpoints = [];
for (const root of componentDirs(CLOUD)) {
  const meta = JSON.parse(readFileSync(join(root, 'component.json'), 'utf8'));
  const { nodes } = JSON.parse(readFileSync(join(root, 'nodes.json'), 'utf8'));
  const wires = existsSync(join(root, 'connections.json')) ? JSON.parse(readFileSync(join(root, 'connections.json'), 'utf8')).connections || [] : [];
  if (!meta.path || !meta.path.startsWith('/#__cloud__/')) {
    failures.push(`${root}: component.json path is ${JSON.stringify(meta.path)}, not /#__cloud__/<name>`);
    continue;
  }
  for (const n of nodes) {
    const declared = new Set((n.ports || []).filter((p) => p.plug === 'output' && p.type === 'signal').map((p) => p.name));
    for (const m of String((n.parameters || {}).functionScript || '').matchAll(/Outputs\.([A-Za-z_$][\w$]*)\s*\(/g)) {
      if (m[1] === 'success' || m[1] === 'failure') continue;
      if (!declared.has(`out-${m[1]}`)) failures.push(`${meta.path} node "${n.id}" calls Outputs.${m[1]}() with no out-${m[1]} signal port`);
    }
  }
  if (nodes.some((n) => n.type === 'noodl.cloud.request')) endpoints.push(meta.path.slice('/#__cloud__/'.length));
  components.push({
    name: meta.path,
    ...(meta.description ? { description: meta.description } : {}),
    nodes: nodes.map((n) => ({ id: n.id, type: n.type, parameters: n.parameters || {}, ports: n.ports || [], children: n.children || [] })),
    connections: wires.map((c) => ({ sourceId: c.fromId, sourcePort: c.fromProperty, targetId: c.toId, targetPort: c.toProperty })),
    ports: componentPorts(nodes),
    roots: []
  });
}
if (failures.length) {
  console.error(`deploy-functions: ${failures.length} problem(s), nothing deployed:\n  ✗ ${failures.join('\n  ✗ ')}`);
  process.exit(1);
}

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

await call('PUT', `/admin/workflows/${BUNDLE}`, { components, settings: {}, metadata: {}, modules: [] });
const reloaded = await call('POST', '/admin/workflows/reload');

const health = await (await fetch(`${BACKEND}/health`)).json();
const served = (health.workflows?.functions || []).filter((f) => f.workflow === BUNDLE).map((f) => f.name).sort();
const missing = endpoints.filter((n) => !served.includes(n));
if (missing.length) {
  console.error(`deploy-functions: deployed, but the backend does not serve ${missing.join(', ')}.`);
  process.exit(1);
}
const live = await call('GET', '/admin/permissions');
const rules = (live.config || live).functions || {};
const unruled = served.filter((n) => !rules[n]);
if (unruled.length) {
  console.error(
    `deploy-functions: the live policy has no rule for ${unruled.join(', ')}, so each runs for ANY signed-in caller. ` +
      'Add it to nodegx.security.json and apply the file (reset-demo does), then deploy again.'
  );
  process.exit(1);
}
console.log(
  `deploy-functions: bundle "${BUNDLE}", ${components.length} component(s) (${reloaded.count} loaded); ` +
    `${served.length} endpoint(s): ${served.map((n) => `${n} [${rules[n].call}]`).join(', ')}; ${components.length - endpoints.length} helper(s).`
);
