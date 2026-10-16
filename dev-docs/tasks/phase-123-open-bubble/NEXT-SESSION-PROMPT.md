# Phase 123 — next session prompt

**Written 2026-10-16 by Fable 5.1 after s2** (s1: scoped and built in one session; s2: Richard's six things from real
Bubble and a design pass, the same day). Read BRIEF.md (his words, both asks, the assumptions), the README (§3 and §3b
what each tab does and how it was measured, §4 where it stops, §5 findings, §6 rulings R1–R6), LOOK.md §s2, then
PLAYTEST.md. The board lists P123 in §4 (parked, a prototype): **it opens only for Richard's sitting, or when he says
it takes a lane-2 slot.**

## What exists

- `editor/open-bubble.html` + `editor/serve.mjs`: the editor (four tabs on an icon rail: Design, Workflow, Data,
  Styles; the composer; custom states; branches; option sets) and its server (plain `node`, no install).
- `editor/cdp.mjs`: a headless-Chrome driver; `editor/check.mjs`: the gate, **PASS 37/37** at s2; `--shots` writes
  `look/s2-*.png`.
- `look/`: s1's four and s2's eight screenshots, on a copy of `templates/todo-list`.

## To run it

```sh
npm run build:editor:_viewer                                           # the deploy runtime, if missing
npm --prefix packages/noodl-preview run build                          # the in-page preview bundle (s2 fixed the exporter: rebuild it)
dev-docs/tasks/phase-112-your-own-nodegx/prototype/real/build.sh       # look.js and specs.js (gitignored, Orbit's; s2 added expressionPorts)
cd dev-docs/tasks/phase-123-open-bubble/editor && node check.mjs       # the gate
node serve.mjs /path/to/a/COPY/of/a/project --port 47900               # then open http://127.0.0.1:47900/
```

A copy, never the real project. Bind the copy to a backend of its own (README s1 handoff has the two commands).
Richard's own instance from s1c (`serve.mjs /tmp/puppies`, port 47900-ish) reads the page from disk on every request,
so a reload shows s2 — but its `specs.js` and preview bundle are the files on disk too, rebuilt by s2.

## What s2 found in the kit (and fixed)

**P123-S2-VARIANTLOST**: the kit's preview and `render_report` exported every node without its variant
(`exportNode` read it through `NodeLibrary.findVariant`, empty outside `ProjectModel.instance`). Fixed in
`packages/noodl-editor/src/editor/src/utils/exporter/util.ts` with a fallback to the node's own `variantName`;
regression `packages/noodl-preview/tests/p123-s2-variant-exported.test.ts`; row in `dev-docs/bugs/`. Every kit
stranger's app with a Look was previewed without it until now — worth a line in OWN-019's defect list.

## If Richard sits with it (PLAYTEST.md)

Write his words and every "in Bubble I would…" into PLAYTEST.md as he says them. Ask R1–R6 (README §6) with the page
open, not before. The six things he named are built; what he does with them in the first ten minutes is the measure.

## If he says it takes a lane

Then it is an OWN-008 stranger built by us, and the first tasks are what §4 names: inserting a step between two, a
rejoin after a branch (R4), `:filtered`-style list operators in the composer, privacy rules from
`nodegx.security.json`, the editor-side ports (P123-S1-EDITORPORTS) and the composer's chip model moved into a kit
package so no editor invents them again. Run the editor suite's adapter against it (`@nodegx/project-contract/
editor-suite`, OWN-006) before any of that.

## Uncommitted at the end of s2

Nothing of this phase: committed by s2 with pathspecs (the phase folder, the exporter fix and its test, Orbit's
`specs-entry.ts`, the bug row, the board line, memory). The peers' piles in the working tree are theirs.
