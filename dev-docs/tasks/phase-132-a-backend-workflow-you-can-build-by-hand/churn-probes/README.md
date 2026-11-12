# P132 s22 — probes for a re-render loop in the dev editor

Each is one expression for `node ../editor-drive.cjs eval "$(cat <file>)"` (CDP 9222, the dev editor running):

- `observe.js` — a 2 s `MutationObserver` on `document.body`: the total and the top 8 targets, and how many children the
  dialog portal holds.
- `fibers.js` — every React root's fiber tree read twice 300 ms apart: which components got new props (re-rendered),
  counted by the last four names of their path.
- `hooks.js` — for the components named in `window.__want` (comma list; default `EditorTopbar`): which hook slots
  changed in 120 ms, before and after.
- `wm.js` — `WarningsModel`'s five writers wrapped for 1 s through `webpackChunknoodl_editor` (gets `__webpack_require__`):
  the calls, the `warningsChanged` count, and the top caller stacks.
