---
id: P109-S17-EXPORTKITDEPS
title: An exported app never loads a kit's `manifest.dependencies` — the files are copied, nothing references them
status: fixed
commit: 90ee40009
phase: P109
task: ISL-035
severity: high
area: export / kits (nodegx-export: the kit bridge `src/kits/<Kit>.tsx` and the scaffold's index.html)
found: P109 ISL-012 AC6, session 17, 2026-10-05
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-012-A-KIT-CAN-SHIP-A-MODERN-LIBRARY.md §8 s17 "Driven"
regression: packages/nodegx-export/tests/isl-035-kit-dependencies.test.ts "the deploy loads three dependencies here, in its order, and the export loads the same three" — the deploy's own buildInjectionTags over the same project is the expected column; red on HEAD's parse + scaffold
---

A one-page project with one kit, `cube-kit`, whose `manifest.json` says `"dependencies": ["three.bundle.js"]` (three.js
as one plain script, the docs recipe). `nodegx deploy` loads it: the injector writes the dependency's `<script>` before
the kit's, and the deployed page draws the cube. `nodegx export` (exit 0; the dry run says *"Nothing"* is refused)
writes `public/noodl_modules/cube-kit/three.bundle.js`, but **no file of the export references it**: `index.html`
carries only `<script type="module" src="/src/main.tsx">`, the kit bridge `src/kits/CubeKit.tsx` imports
`./modules/cube-kit/index.js` alone, and `grep -rn 'three.bundle\|/noodl_modules' src index.html` finds nothing. The
exporter's source never reads `dependencies` from a kit manifest (`grep -rn dependencies packages/nodegx-export/src`
hits only package.json writers). So the kit's node mounts with `window.THREE` undefined and throws, which today blanks
the whole page (P109-S17-KITTHROWBLANKS).

Read from the emitted files, not from a built and running export (that needs `npm install` and a build). The reading
it needs: the same project exported, built, served, the cube drawn or not.

Reach: every kit with non-empty `dependencies` — garden-kit (Blockly, 4 files), garden-3d-kit (three.js) and the
maplibre kit (803,086 B + a stylesheet), measured s17. Owner: P18 (`nodegx-export`).

**Proposed fix:** the kit bridge loads each listed dependency, in manifest order, before it imports the kit's main (a
side-effect import per file where the file is a plain script, or a `<script>` tag in `index.html` per dependency as the
deploy injector writes them), and a dependency that is an `http(s)` URL becomes a tag, never a fetch at build time.

**Re-measured 2026-10-15 (P18 session 105, ISL-035 AC1): still firing** — `grep dependencies src` found only
package.json writers; the exported `index.html` carried `main.tsx` alone. **Fixed the same session.** `parseProject`
now asks the deploy injector itself for the list (`@nodegx/module-inject` `toInjectModules`, which owns the path rule,
the module order and the `requires` refusals; the export already depended on it for the scan), keeps
`buildInjectionTags`' loop (browser modules, each once), and the scaffold writes one classic `<script>` per entry
before the app's module script, an `http` entry at its own URL and the rest against `public/`, where they were
already copied. Classic and before the module script, so the library has run when the bundled kit evaluates, which is
the deployed page's order.

Graded against the deploy, not a description of it: the test builds a project with a relative and an `http`
dependency, one URL shared by two modules, a module with no `main` (the injector orders it after the kits whatever its
folder sorts as), a cloud-only module and a kit refused for a missing `requires`, and requires the exported page's
scripts to equal `buildInjectionTags`' over the same folder (three, in its order).

**Not done:** the reading the row asked for, the same project exported, `npm install`ed, built, served and the cube
seen. The emitted files are graded; the browser half rests on the HTML rule that a classic script runs before a
module script. Vite leaves a non-module `<script src>` in `index.html` as written (with a build warning) and serves
`public/` at the root.
