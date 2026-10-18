// Writing the map editor's changes back into a project, through the kit's store
// (@nodegx/project-contract), by the rules the nodegx server writes by: validate every file first,
// send back the revision the component was read at (a file changed since is refused, never
// overwritten), write nothing that did not change, keep the registry true. Used by the server for
// the folder on disk and by the suite adapter for the project in memory, so both save one way.

import { V2ProjectStore, FormatRefusal, SchemaValidator, SCHEMA_IDS } from '@nodegx/project-contract/format.js';

/** Every component as the model loads it: key, the name instances use, the three files, the revision. */
export function readProject(store) {
  return store.componentKeys().map((key) => {
    const c = store.readComponent(key);
    return { key: c.key, path: c.entry.path, legacyName: c.legacyName, files: c.files, revision: c.revision };
  });
}

/** Sentences for whatever in one component's files the format's schemas refuse; empty when clean. */
export function validateComponentFiles(key, files) {
  const v = SchemaValidator.instance;
  const out = [];
  for (const [name, id] of [
    ['component.json', SCHEMA_IDS.COMPONENT],
    ['nodes.json', SCHEMA_IDS.NODES],
    ['connections.json', SCHEMA_IDS.CONNECTIONS]
  ]) {
    const r = v.validate(id, files[name.replace('.json', '')]);
    if (!r.valid) for (const e of r.errors.slice(0, 3)) out.push(`${key}/${name}: ${e.path || '(root)'} ${e.message}`);
  }
  // The preview walks `children`; a child listed twice, or a child that is not a node, breaks it.
  const ids = new Set(files.nodes.nodes.map((n) => n.id));
  const seen = new Set();
  for (const n of files.nodes.nodes) {
    for (const c of n.children ?? []) {
      if (!ids.has(c)) out.push(`${key}/nodes.json: "${n.id}" lists a child "${c}" that is not a node.`);
      if (seen.has(c)) out.push(`${key}/nodes.json: "${c}" is listed as a child twice.`);
      seen.add(c);
    }
  }
  for (const w of files.connections.connections) {
    if (!ids.has(w.fromId) || !ids.has(w.toId)) out.push(`${key}/connections.json: the wire ${w.fromId}.${w.fromProperty} → ${w.toId}.${w.toProperty} names a node that is not there.`);
  }
  return out;
}

/**
 * Writes `changes` ([{ key, files, revision }]) into `store`. Each component is validated, then
 * written with `ifRevision`. A refused component is left as it is on disk and said in a sentence.
 */
export function commit(store, changes) {
  const saved = [];
  const refused = [];
  for (const change of changes) {
    const problems = validateComponentFiles(change.key, change.files);
    if (problems.length) {
      refused.push({ key: change.key, reason: 'invalid', message: problems.join(' ') });
      continue;
    }
    try {
      store.readComponent(change.key);
      const r = store.writeComponent(change.key, change.files, { ifRevision: change.revision });
      saved.push({ key: change.key, revision: r.revision, unchanged: !!r.unchanged });
    } catch (err) {
      if (err instanceof FormatRefusal) {
        const message =
          err.reason === 'stale-revision' || err.reason === 'drift'
            ? `${change.key} changed on disk after the map read it (another editor or an agent wrote it). Nothing was written for it; reload to see the new version.`
            : err.message;
        refused.push({ key: change.key, reason: err.reason, message });
      } else {
        refused.push({ key: change.key, reason: 'error', message: err.message });
      }
    }
  }
  return { saved, refused };
}

export { V2ProjectStore };
