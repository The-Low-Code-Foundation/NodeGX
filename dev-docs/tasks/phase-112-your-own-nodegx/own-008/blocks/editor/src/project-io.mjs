// Reading an app and saving changes back, with the kit's store and validator. The server runs this
// over the app's folder; the suite's adapter runs the same code over files held in memory.

import { V2ProjectStore, SchemaValidator, SCHEMA_IDS, FormatRefusal, formatValidationErrors } from '@nodegx/project-contract/format.js';

export const EDITOR_NAME = 'big-block-editor';

/** Everything the page needs to open an app. Reading only: nothing is written. */
export function readProject(store, allFiles) {
  const project = store.readProjectFile();
  const components = store.componentKeys().map((key) => {
    const { files, revision } = store.readComponent(key);
    return { key, revision, files };
  });
  return {
    name: project?.name || 'My app',
    version: project?.version,
    files: allFiles,
    components
  };
}

/** One part read again from disk, after someone else changed it. */
export function readOne(store, key) {
  const { files, revision } = store.readComponent(key);
  return { key, revision, files };
}

/**
 * Saves each changed part: checks it, then writes it through the store with the revision it was
 * read at, so a part someone else changed meanwhile is refused instead of overwritten.
 * Returns one result per part: `{ ok, key, revision }` or `{ ok: false, key, reason, message, problems }`.
 */
export function saveChanges(store, changes, { now = () => new Date().toISOString() } = {}) {
  const results = [];
  for (const change of changes) {
    const { key, revision } = change;
    const files = JSON.parse(JSON.stringify(change.files));
    const problems = checkComponent(files);
    if (problems.length) {
      results.push({ ok: false, key, reason: 'invalid', message: `"${key}" was not saved: ${problems[0]}`, problems });
      continue;
    }
    if (!revision) {
      results.push({ ok: false, key, reason: 'no-revision', message: `"${key}" was not saved: the editor does not know which version it changed.` });
      continue;
    }
    try {
      const written = store.writeComponent(key, files, {
        ifRevision: revision,
        prepare: () => {
          // Who changed it, and when. The store leaves these to the writer; the comparison ignores them.
          files.component.modified = now();
          files.component.modifiedBy = EDITOR_NAME;
        }
      });
      results.push({ ok: true, key, revision: written.revision, unchanged: !!written.unchanged });
    } catch (err) {
      if (err instanceof FormatRefusal) {
        results.push({ ok: false, key, reason: err.reason, message: err.message });
      } else {
        results.push({ ok: false, key, reason: 'error', message: String(err && err.message ? err.message : err) });
      }
    }
  }
  return results;
}

/** Sentences for anything in one part that would break the app; empty when it is fine. */
export function checkComponent(files) {
  const out = [];
  const v = SchemaValidator.instance;
  for (const [name, id, data] of [
    ['component.json', SCHEMA_IDS.COMPONENT, files.component],
    ['nodes.json', SCHEMA_IDS.NODES, files.nodes],
    ['connections.json', SCHEMA_IDS.CONNECTIONS, files.connections]
  ]) {
    const r = v.validate(id, data);
    if (!r.valid) out.push(`${name}: ${formatValidationErrors(r.errors)}`);
  }
  if (out.length) return out;

  // The tree must read the same way flat (the server) and walked from the roots (the preview).
  const nodes = files.nodes.nodes;
  const byId = new Map();
  for (const n of nodes) {
    if (byId.has(n.id)) out.push(`two blocks share the id "${n.id}".`);
    byId.set(n.id, n);
  }
  const listedBy = new Map();
  for (const n of nodes) {
    for (const c of n.children || []) {
      if (!byId.has(c)) out.push(`"${n.id}" lists a child "${c}" that is not there.`);
      if (listedBy.has(c)) out.push(`"${c}" is listed as a child twice (in "${listedBy.get(c)}" and "${n.id}").`);
      listedBy.set(c, n.id);
      const child = byId.get(c);
      if (child && child.parent !== n.id) out.push(`"${c}" is inside "${n.id}" but says its parent is "${child.parent}".`);
    }
  }
  for (const n of nodes) {
    if (n.parent !== undefined && listedBy.get(n.id) !== n.parent) out.push(`"${n.id}" says it is inside "${n.parent}", which does not list it.`);
  }
  for (const r of files.nodes.visualRoots || []) if (!byId.has(r)) out.push(`the screen starts at "${r}", which is not there.`);
  for (const w of files.connections.connections) {
    if (!byId.has(w.fromId) || !byId.has(w.toId)) out.push(`a wire ${w.fromId}.${w.fromProperty} → ${w.toId}.${w.toProperty} joins a block that is not there.`);
  }
  return out;
}

export { V2ProjectStore };
