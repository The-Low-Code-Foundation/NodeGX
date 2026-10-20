// Usage (from packages/nodegx-export): tc.ts <exportSrc> <project> — the emitted app's strict typecheck (tests/helpers/typecheckApp), as its own `tsc -b` would run it.
const [E, project] = process.argv.slice(2);
const { loadCatalog } = require(`${E}/catalog`);
const { emitApp } = require(`${E}/emit/emitApp`);
const { parseProject } = require(`${E}/parse/parseProject`);
const tc = require(`${E}/../tests/helpers/typecheckApp`);
const catalog = loadCatalog();
const app = emitApp(parseProject(project, catalog), catalog);
const fn = tc.typecheckEmittedApp;
const r = fn(app);
console.log(JSON.stringify(r, null, 1).slice(0, 300000));
