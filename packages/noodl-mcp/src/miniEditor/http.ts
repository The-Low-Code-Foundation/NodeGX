/**
 * P125 CCN-008 — the mini editor's own paths on this server's loopback proxy (`studio/studioProxy.ts`).
 *
 * The panel is drawn by the host from `ui://nodegx/mini-editor.html` and talks to this origin, which the resource's
 * CSP names. Studio serves the preview bundle and the runtime (`/preview.js`, `/runtime/`, forwarded by the proxy);
 * everything that is the mini editor's is answered here, by the process that holds the project binding:
 *
 * - `GET  /__nodegx/mini/app.js`            the panel's code (`panelSource.ts`)
 * - `GET  /__nodegx/mini/mcp-app.js`        the MCP Apps SDK, from the Studio install (Studio need not be running)
 * - `GET  /__nodegx/mini/view.html?id=`     the same page for a browser window (a host that draws no panels)
 * - `GET  /__nodegx/mini/e/<id>`            the record, with each control's value as the files hold it now
 * - `GET  /__nodegx/mini/e/<id>/files`      the project as the stage renders it (kits included, the root moved)
 * - `POST /__nodegx/mini/e/<id>/set`        `{key, value}`: the person's change, written to the project
 * - `POST /__nodegx/mini/e/<id>/variant`    `{name}`: every value of a variant, written
 * - `POST /__nodegx/mini/e/<id>/decide`     `{outcome, note?}`: the decision, and the message for the conversation
 * - `POST /__nodegx/mini/e/<id>/shown`      `{panelId}`: a panel drew it
 *
 * 🔴 The person's change is written through a store of its own over the folder, never the agent's: the agent's store
 * remembers what it read, and a write through it would count as the agent having seen the change, so its drift rule
 * and `what_changed_since` would miss exactly what the person did. Studio's own writes are outside the agent's store
 * for the same reason. `component.json` is left as it is (Studio's watcher names the agent only when it is stamped
 * `noodl-mcp` in the same batch), so the change reads as the person's everywhere.
 *
 * @module miniEditor/http
 */

import * as fs from 'fs';
import type * as http from 'http';
import * as path from 'path';

import type { NodeV2, StylesV2File } from '../editor-deps';
import { ProjectStore } from '../project/ProjectStore';
import { findStudio } from '../studio/studioProcess';
import { STYLES_SCHEMA } from '../tools/elementStyles';
import { MINI_EDITOR_JS, miniEditorPage } from './panelSource';
import { decisionMessage, readRecord, updateRecord, type MiniEditorRecord } from './records';
import { currentValues, refuseValue, styleOf, type Control, type StyleVariant } from './spec';

export const MINI_PREFIX = '/__nodegx/mini/';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type'
};

const TEXT = new Set(['.json', '.js', '.css', '.md', '.html', '.txt', '.svg']);
const SKIP_DIRS = new Set(['node_modules', '.git', '.nodegx', '.noodl']);
/** A stage holds text only; a project's text larger than this is refused rather than sent to a panel. */
const MAX_TREE_BYTES = 24 * 1024 * 1024;

/** The project's text files, as the in-page preview takes them — kits under `noodl_modules/` included. */
export function projectTree(projectDir: string): Record<string, string> {
  const files: Record<string, string> = {};
  let bytes = 0;
  const walk = (dir: string, rel: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
      const abs = path.join(dir, entry.name);
      const r = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(abs, r);
      else if (TEXT.has(path.extname(entry.name).toLowerCase())) {
        const text = fs.readFileSync(abs, 'utf8');
        bytes += text.length;
        if (bytes > MAX_TREE_BYTES) throw new Error(`the project's text is over ${MAX_TREE_BYTES / 1024 / 1024} MB`);
        files[r] = text;
      }
    }
  };
  walk(projectDir, '');
  return files;
}

export const STAGE_ROOT = '__mini_stage_root__';

/**
 * The stage: the project with its root node moved to the part (NodeGX Scene's trick, `parked/three-in-nodes`). The
 * runtime finds the root by id across every component, so when another component holds the same id the stage's node
 * is renamed in its own component, and the panel is told the alias for its live sets.
 */
export function stageTree(projectDir: string, record: MiniEditorRecord): { files: Record<string, string>; rootAlias?: { from: string; to: string } } {
  const files = projectTree(projectDir);
  const projectFile = files['nodegx.project.json'];
  if (projectFile === undefined) throw new Error('no nodegx.project.json in the project');
  const store = new ProjectStore(projectDir);
  const registry = store.readRegistry();
  const stageNode = record.stage.node;
  const entry = registry.components[record.stage.component];
  if (!entry) throw new Error(`the stage's component ${record.stage.component} is gone`);
  const dirOf = (p: string) => `components/${p}`;
  let clash = false;
  for (const [key, e] of Object.entries(registry.components)) {
    if (key === record.stage.component) continue;
    const text = files[`${dirOf(e.path)}/nodes.json`];
    if (!text) continue;
    try {
      if ((JSON.parse(text) as { nodes: NodeV2[] }).nodes.some((n) => n.id === stageNode)) clash = true;
    } catch {
      /* a broken file is the preview's to report */
    }
  }
  let root = stageNode;
  let rootAlias: { from: string; to: string } | undefined;
  if (clash) {
    root = STAGE_ROOT;
    rootAlias = { from: stageNode, to: STAGE_ROOT };
    const swap = (id: string) => (id === stageNode ? STAGE_ROOT : id);
    const nodesPath = `${dirOf(entry.path)}/nodes.json`;
    const connPath = `${dirOf(entry.path)}/connections.json`;
    const nodes = JSON.parse(files[nodesPath]) as { nodes: NodeV2[]; visualRoots?: string[] };
    for (const n of nodes.nodes) {
      n.id = swap(n.id);
      if (n.parent) n.parent = swap(n.parent);
      if (n.children) n.children = n.children.map(swap);
    }
    if (nodes.visualRoots) nodes.visualRoots = nodes.visualRoots.map(swap);
    files[nodesPath] = JSON.stringify(nodes, null, 2);
    if (files[connPath]) {
      const conns = JSON.parse(files[connPath]) as { connections: Array<{ fromId: string; toId: string }> };
      for (const w of conns.connections) {
        w.fromId = swap(w.fromId);
        w.toId = swap(w.toId);
      }
      files[connPath] = JSON.stringify(conns, null, 2);
    }
  }
  const project = JSON.parse(projectFile) as Record<string, unknown>;
  project.rootNodeId = root;
  files['nodegx.project.json'] = JSON.stringify(project, null, 2);
  return { files, ...(rootAlias ? { rootAlias } : {}) };
}

/** `bag[key] = value`, or the key gone for "back to the default / as normal". */
function put(bag: Record<string, unknown> | undefined, key: string, value: unknown): Record<string, unknown> {
  const out = { ...(bag ?? {}) };
  if (value === null || value === undefined) delete out[key];
  else out[key] = value;
  return out;
}

/** A state's bag set or emptied; an empty state is dropped, and so is an empty `stateParameters`. */
function putState(
  states: Record<string, Record<string, unknown>> | undefined,
  state: string,
  key: string,
  value: unknown
): Record<string, Record<string, unknown>> | undefined {
  const out = { ...(states ?? {}) };
  const bag = put(out[state], key, value);
  if (Object.keys(bag).length > 0) out[state] = bag;
  else delete out[state];
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * The person's change, written to the project outside the agent's store. Returns the value as stored.
 *
 * - A node setting: the node's `parameters` (or `stateParameters[state]` for a visual state's value).
 * - `scope: "style"` (P125-CCN008-NOSTYLE): the style the node wears in `nodegx.styles.json` (its named one, else its
 *   type's element style, created when there is none), which every node of the type that sets nothing itself
 *   follows, and which Studio's Styles tab shows. The node's own value for the same setting is dropped in the same
 *   change: it wins over the style, so keeping it would leave the part the person was looking at unchanged.
 */
export function writeSetting(projectDir: string, control: Control, value: unknown): unknown {
  const store = new ProjectStore(projectDir);
  const stored = store.format.readComponent(control.component);
  const files = structuredClone(stored.files);
  const node = (files.nodes.nodes as NodeV2[]).find((n) => n.id === control.node);
  if (!node) throw new Error(`${control.nodeName} is no longer in ${control.legacyName}`);
  const stored_ = value ?? null;

  if (control.scope === 'style') {
    const styles: StylesV2File = store.readStyles() ?? { $schema: STYLES_SCHEMA };
    const variants = [...((styles.variants ?? []) as StyleVariant[])];
    let style = styleOf(variants, node);
    if (!style) {
      style = { typename: control.styleType ?? node.type, ...(control.styleName ? { name: control.styleName } : {}), parameters: {} };
      variants.push(style);
    }
    const i = variants.indexOf(style);
    variants[i] = control.state
      ? (() => {
          const next = { ...style, stateParameters: putState(style.stateParameters, control.state, control.port, value) };
          if (!next.stateParameters) delete next.stateParameters;
          return next;
        })()
      : { ...style, parameters: put(style.parameters, control.port, value) };
    styles.variants = variants as StylesV2File['variants'];
    store.writeStyles(styles);
    // The node's own value goes, so the part shows the style (only if it had one: an untouched component is not rewritten).
    const had = control.state ? Object.prototype.hasOwnProperty.call(node.stateParameters?.[control.state] ?? {}, control.port) : Object.prototype.hasOwnProperty.call(node.parameters ?? {}, control.port);
    if (had) {
      if (control.state) {
        const next = putState(node.stateParameters, control.state, control.port, null);
        if (next) node.stateParameters = next;
        else delete node.stateParameters;
      } else node.parameters = put(node.parameters, control.port, null);
      store.writeComponent(stored.key, files);
    }
    return stored_;
  }

  if (control.state) {
    const next = putState(node.stateParameters, control.state, control.port, value);
    if (next) node.stateParameters = next;
    else delete node.stateParameters;
  } else node.parameters = put(node.parameters, control.port, value);
  store.writeComponent(stored.key, files);
  return stored_;
}

/**
 * The nodes of a style-scoped setting's type that keep their own value (it wins over the style), other than the part
 * shown: what the agent and the person should know after the style changed.
 */
export function keepingTheirOwn(projectDir: string, controls: Control[]): string[] {
  const styled = controls.filter((c) => c.scope === 'style');
  if (styled.length === 0) return [];
  const store = new ProjectStore(projectDir);
  const out: string[] = [];
  for (const row of store.listComponents()) {
    let nodes: NodeV2[];
    try {
      nodes = store.readComponent(row.path).files.nodes.nodes as NodeV2[];
    } catch {
      continue;
    }
    for (const n of nodes) {
      const mine = styled.filter((c) => c.styleType === n.type && !(c.node === n.id && c.legacyName === row.legacyName) && (n.variant ?? '') === (c.styleName ?? ''));
      const kept = mine.filter((c) =>
        c.state ? Object.prototype.hasOwnProperty.call(n.stateParameters?.[c.state] ?? {}, c.port) : Object.prototype.hasOwnProperty.call(n.parameters ?? {}, c.port)
      );
      if (kept.length > 0) out.push(`${n.label ?? n.id} in ${row.legacyName.split('/').pop()} (${[...new Set(kept.map((c) => c.label))].join(', ')})`);
    }
  }
  return out;
}

function recordChange(record: MiniEditorRecord, control: Control, before: unknown, after: unknown): void {
  const had = record.changes[control.key];
  record.changes[control.key] = { label: control.label, from: had ? had.from : before, to: after, at: new Date().toISOString() };
}

async function body(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text) return {};
  const parsed = JSON.parse(text) as unknown;
  return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
}

export interface MiniEditorRoutes {
  /** True when the request was the mini editor's and has been answered. */
  handle(req: http.IncomingMessage, res: http.ServerResponse): boolean;
}

/** The routes, over whichever project is bound when a request arrives. */
export function miniEditorRoutes(projectDir: () => string | undefined, origin: () => string): MiniEditorRoutes {
  const send = (res: http.ServerResponse, status: number, payload: unknown, type = 'application/json') => {
    res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', ...CORS });
    res.end(typeof payload === 'string' ? payload : JSON.stringify(payload));
  };

  const answer = async (req: http.IncomingMessage, res: http.ServerResponse, url: URL): Promise<void> => {
    const rest = url.pathname.slice(MINI_PREFIX.length);
    if (rest === 'app.js') return send(res, 200, MINI_EDITOR_JS, 'text/javascript; charset=utf-8');
    if (rest === 'mcp-app.js') {
      const found = findStudio();
      if (found.dir === null) return send(res, 404, `/* ${found.reason} */`, 'text/javascript; charset=utf-8');
      return send(res, 200, fs.readFileSync(path.join(found.dir, 'editor', 'hosted', 'mcp-app.js'), 'utf8'), 'text/javascript; charset=utf-8');
    }
    if (rest === 'view.html') return send(res, 200, miniEditorPage(origin(), url.searchParams.get('id') ?? ''), 'text/html; charset=utf-8');

    const m = /^e\/([a-z0-9-]+)(?:\/(files|set|variant|decide|shown))?$/.exec(rest);
    if (!m) return send(res, 404, { error: `no mini editor path ${url.pathname}` });
    const dir = projectDir();
    if (dir === undefined) return send(res, 409, { error: 'No project is open on the agent\'s server.' });
    const id = m[1];
    const record = readRecord(dir, id);
    if (!record) return send(res, 404, { error: `No mini editor ${id} in this project.` });
    const verb = m[2];

    if (!verb && req.method === 'GET') {
      const store = new ProjectStore(dir);
      const controls = currentValues(store, record.controls);
      const revisions: Record<string, string> = {};
      for (const c of new Set(controls.map((x) => x.component).concat(record.stage.component))) {
        try {
          revisions[c] = store.format.readComponent(c).revision;
        } catch {
          /* gone: the panel says so when it rebuilds */
        }
      }
      return send(res, 200, { record: { ...record, controls }, revisions });
    }
    if (verb === 'files' && req.method === 'GET') return send(res, 200, stageTree(dir, record));
    if (req.method !== 'POST') return send(res, 405, { error: 'POST' });
    const args = await body(req);

    if (verb === 'shown') {
      const panelId = typeof args.panelId === 'string' ? args.panelId : 'unnamed';
      updateRecord(dir, id, (r) => {
        if (!r.shown.some((s) => s.panelId === panelId)) r.shown.push({ at: new Date().toISOString(), panelId });
      });
      return send(res, 200, { ok: true });
    }
    if (verb === 'set') {
      const control = record.controls.find((c) => c.key === args.key);
      if (!control) return send(res, 400, { error: `"${String(args.key)}" is not one of this editor's settings.` });
      const why = refuseValue(control, args.value);
      if (why) return send(res, 400, { error: `${control.label}: ${why}.` });
      const before = currentValues(new ProjectStore(dir), [control])[0].value;
      const stored = writeSetting(dir, control, args.value);
      updateRecord(dir, id, (r) => recordChange(r, control, before, stored));
      return send(res, 200, { ok: true, value: stored });
    }
    if (verb === 'variant') {
      const variant = record.variants.find((v) => v.name === args.name);
      if (!variant) return send(res, 400, { error: `No variant "${String(args.name)}".` });
      const store = new ProjectStore(dir);
      const written: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(variant.values)) {
        const control = record.controls.find((c) => c.key === key);
        if (!control) continue;
        const why = refuseValue({ ...control, custom: true }, value);
        if (why) return send(res, 400, { error: `Variant "${variant.name}", ${control.label}: ${why}.` });
        const before = currentValues(store, [control])[0].value;
        written[key] = writeSetting(dir, control, value);
        updateRecord(dir, id, (r) => recordChange(r, control, before, written[key]));
      }
      updateRecord(dir, id, (r) => {
        r.variant = variant.name;
      });
      return send(res, 200, { ok: true, values: written });
    }
    if (verb === 'decide') {
      const outcome = args.outcome;
      if (outcome !== 'approved' && outcome !== 'not-that' && outcome !== 'done') {
        return send(res, 400, { error: 'outcome is approved, not-that or done' });
      }
      const note = typeof args.note === 'string' && args.note.trim() ? args.note.trim().slice(0, 1000) : undefined;
      const decided = updateRecord(dir, id, (r) => {
        r.status = outcome;
        r.decision = { outcome, at: new Date().toISOString(), ...(note ? { note } : {}), ...(r.variant ? { variant: r.variant } : {}) };
      });
      const keeping = decided && outcome !== 'not-that' ? keepingTheirOwn(dir, decided.controls.filter((c) => decided.changes[c.key])) : [];
      return send(res, 200, { ok: true, status: outcome, message: decided ? decisionMessage(decided, { keepingTheirOwn: keeping }) : '' });
    }
    return send(res, 404, { error: `no mini editor path ${url.pathname}` });
  };

  return {
    handle(req, res) {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      if (!url.pathname.startsWith(MINI_PREFIX)) return false;
      if (req.method === 'OPTIONS') {
        res.writeHead(204, CORS);
        res.end();
        return true;
      }
      answer(req, res, url).catch((err: Error) => {
        if (!res.headersSent) send(res, 500, { error: err.message });
        else res.end();
      });
      return true;
    }
  };
}
