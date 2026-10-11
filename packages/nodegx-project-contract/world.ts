/**
 * P116 ONT-001 — what a person said about their world, as project files.
 *
 * `@nodegx/project-contract/world`: the three files under `docs/world/`, the fourteen relation
 * kinds they are written in (`defineKind`), `describe()` for a picker, the validator and the
 * write rule, and `projectWorld()`, the schema it projects to (ONT-003), and `planMigration()`, what a changed sentence does to it (ONT-007); `validateVerbs()` and `projectVerb()`, the things a person does over it, as workflows (ONT-006). The JSON Schema for any other tool is `schemas/world.schema.json`.
 *
 * It is an entry of this package, not a package of its own: NSP-021 and OWN-001 name
 * `@nodegx/project-contract` the home of the project format ("do not grow a second one"),
 * and the eight v2 schemas join this one there when OWN-001 moves them.
 */
export * from './world/kind';
export * from './world/kinds';
export * from './world/noun';
export * from './world/files';
export * from './world/vocabulary';
export * from './world/validate';
export * from './world/write';
export * from './world/project';
export * from './world/paths';
export * from './world/mutants';
export * from './world/runner';
export * from './world/brief';
export * from './world/migrate';
export * from './world/verbs';
export * from './world/verb-project';
