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

## s3 (2026-10-16): the Bubble importer spike — read import/IMPORT.md

`import/bubble2nodegx.mjs <export.json> <outdir>` converts a Bubble app export into a NodeGX v2 project and writes
`<outdir>/docs/IMPORT-REPORT.md` (counts + findings); `import/drive-open-bubble.mjs <outdir> <shots>` opens it in
this editor headless and screenshots the tabs. Measured on Richard's 2023 test export: everything in it converts, the
project opens here with the button in Bubble blue. **Waits on Richard:** real exports (IMPORT.md §5) — every Bubble
feature the test app lacks needs one real example before its dictionary row can be written. If he sends them: run the
converter, read the report, add rows until it says 0 "the dictionary" findings, open it here, screenshot. Uncommitted
at the end of s3: `import/`, `look/import-*.png`, this file, README §7 (all untracked or this phase's own).

### s3b: the run-mode bundles (read IMPORT.md §7 first)

`import/bubble-run-bundle-to-export.mjs <folder of *.dynamic.js> <out.json>` then `bubble2nodegx.mjs` converts any
Bubble app whose pages a person can open in run mode — TrybeUP (live on bubbleapps.io, test version) converted to 0
validation errors and opens here. The bundles themselves (38 MB, with keys inside) are in the session scratchpad only;
refetch with the loop in IMPORT.md §7 into `import/exports/` (gitignored). `import/validate-project.mjs <dir>` validates
through the MCP over stdio; `import/probe-heights.mjs <dir>` lists the tallest elements in the live preview. Next
rows, by count, are listed in IMPORT.md §7; the biggest single win is the Design canvas (instance width, fonts, texts
whose inputs never arrive). Uncommitted: everything in `import/`, `look/import-*.png`, README §7, this file,
`.gitignore` (three ignore lines).

## s4 (2026-10-16, evening): TrybeUP held; the template looks the same — read IMPORT.md §8 and §9

Richard stopped the TrybeUP push (*"we bit off more than we could chew"*) after §8's measurement: the page was
not flickering, the main thread was pegged by ~1,550 console errors a second, almost all converter rows plus 89
queries with no backend. He made a boilerplate Bubble template (one landing page, no data) and the brief became
**make the NodeGX render look the same, section by section, before any data.** Done for that page: 188/188
elements, 0 validation errors, 0 console errors, `look/import-template-nodegx.png` beside his
`import/template-screens/`. §9 has the eleven rows the page added (Google Fonts via `settings.headCode`,
Material Icons, `src`, Align-to-parent with an in-flow biggest child, a boxed Text, BBCode `[sup]`, `alignY`,
`{value, unit}` for a % size, empty Links, rotation, `fixed_width` ignored) and the three differences left.

**Next, in order:** (1) the row width-distribution rule (a two-column Bubble test page with known min/max widths,
measure Bubble's computed widths, write the rule) — it is the only thing that still reads as "not the same" on
this page; (2) Links to a URL → an External Link node; (3) then a second template page WITH a repeating group and
a search, against a `provision_backend`-seeded empty backend, before going back to anything TrybeUP-sized. To
re-run: `exports/template/` is gitignored — refetch with the curl loop in IMPORT.md §7 (the app is public), then
`bubble2nodegx.mjs exports/template/app.export.json /tmp/template-open-bubble` and `preview-solo.mjs` on it.
The converter has no test of its own yet: a gate that converts `exports/template` and asserts 0 errors, 0
dictionary findings except the Links, and the headCode link, is the first thing to add before the next row.
