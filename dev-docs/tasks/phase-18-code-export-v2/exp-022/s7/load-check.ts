/**
 * EXP-022 S7 — the carried modules of a store scenario, loaded in a bare JavaScript context the way the Swift host loads
 * them (`__define` / `__require`), then one node made and driven. `SC=<file>:<index>`. Emits only; builds nothing.
 */
const PKG = '../../../../../packages/nodegx-export';
/* eslint-disable @typescript-eslint/no-var-requires */
const vm = require('vm');
const spec = require(`${PKG}/../nodegx-node-spec/src`);
const { graphComponent, probeProject, drivenInputs } = require(`${PKG}/tests/helpers/node-spec-target`);
const { loadCatalog } = require(`${PKG}/src/catalog`);
const { emitApp } = require(`${PKG}/src/emit/emitApp`);
const { clientModulesJs } = require(`${PKG}/src/emit/swift/client`);
const [file, i] = (process.env.SC ?? 't02-state-history:0').split(':');
const sc = spec.loadGraphScenarios().filter((s: any) => (s.file ?? '').includes(file))[Number(i)];
const app = emitApp(probeProject(graphComponent(sc.nodes, sc.wires ?? [], drivenInputs(sc))), loadCatalog());
const mods = clientModulesJs(app.files);
console.log('modules:', mods.map((m: any) => m.name).join(' '));
const ctx: any = { console, setTimeout, clearTimeout };
vm.createContext(ctx);
vm.runInContext(`var __modules = {}, __loaded = {};
function __define(n, f) { __modules[n] = f; }
function __require(n) { if (__loaded[n]) return __loaded[n].exports; var f = __modules[n]; if (!f) throw new Error('no module ' + n); var m = { exports: {} }; __loaded[n] = m; f(m.exports, __require); return m.exports; }
__define('react', function (e) { ['useEffect','useReducer','useRef','useLayoutEffect','useMemo','useState','useCallback','useSyncExternalStore'].forEach(function (n) { e[n] = function () { throw new Error(n); }; }); });`, ctx);
for (const m of mods) vm.runInContext(m.js, ctx);
for (const m of mods) if (m.name !== 'nodegx-core') console.log(m.name, Object.keys(vm.runInContext(`__require(${JSON.stringify(m.name)})`, ctx)).join(' ').slice(0, 200));
console.log(vm.runInContext(process.env.JS ?? `
  var h = __require('lib/history'), app = __require('stores/app').app;
  var n = h.createStateHistoryNode({ label: 'H', nodeId: 'h', componentName: 'P' }, app, function () {});
  n.setupTracking(); app.set({ count: 1 });
  var u = h.createUndoRedoNode({ label: 'U', nodeId: 'u', componentName: 'P' }, app, function () {});
  u.undo();
  JSON.stringify({ size: n.historySize, index: n.currentIndex, canUndo: n.canUndo, canRedo: n.canRedo, state: app.peek() })`, ctx));
