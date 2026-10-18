/**
 * P112 OWN-001 — the v2 project format, out of the editor.
 *
 * `@nodegx/project-contract/format`: the file types, the eight JSON Schemas (`schemas/*.schema.json`)
 * and their structural validator, and a store that reads and writes a project with the MCP's rules
 * (refuse on drift, write nothing unchanged, keep the registry true) over any `ProjectFiles`. This
 * entry is the in-memory path: no `fs`, `path` or Node `crypto`, so a page bundles it. The folder
 * on disk is `@nodegx/project-contract/format-node`.
 *
 * The editor's `schemas/` and the MCP's `editor-deps.ts` re-export from here. The semantic validator
 * (the editor's `validation/`, which reads the node catalog and the editor's models) stays in the
 * editor (OWN-001 §3.4).
 */
export * from './format/types';
export * from './format/validator';
export * from './format/files';
export * from './format/store';
export * from './format/run-on-change-pins';

export { default as projectV2Schema } from './schemas/project-v2.schema.json';
export { default as componentSchema } from './schemas/component.schema.json';
export { default as nodesSchema } from './schemas/nodes.schema.json';
export { default as connectionsSchema } from './schemas/connections.schema.json';
export { default as registrySchema } from './schemas/registry.schema.json';
export { default as routesSchema } from './schemas/routes.schema.json';
export { default as stylesSchema } from './schemas/styles.schema.json';
export { default as modelSchema } from './schemas/model.schema.json';
