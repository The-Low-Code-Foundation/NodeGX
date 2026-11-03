# HTX-001 — The first page in plain files

**Phase:** [134](README.md). **AC:** AC1. **Sessions:** 1. **Status: ✅ done 2026-11-03** (README §10, session 1; evidence [`htx-001/`](htx-001/)). R4 measured, waiting on Richard. **Needs:** R1 and R4 ruled (the output's shape); R3 says
when.

## The sentence

> "I exported story-engine as HTML, ran a static server on the folder and the first page was there, the same as in
> NodeGX."

## Measure first

1. **The plan without React, for HTML.** Read `planProject`'s `ComponentPlan` for story-engine's 9 components the way
   EXP-022 S1 did, and list every field the HTML printer reads. Any decision found only in `component.ts` is a leak:
   copy it with a comment naming the React line, and file it beside `P18-EXP022-S1-COLLAPSE`.
2. **The roles.** Swift S1 counted 7 drawn roles in story-engine (page, group, text, button, input, instance, repeater).
   Confirm, and count the CSS properties `computeNodeStyle` gives its drawn nodes (Swift S1: 29).
3. **`@nodegx/core` as one readable file.** Can `packages/nodegx-core/src/*.ts` (minus `react.ts`) be type-stripped
   into one `lib/core.js` a person can read top to bottom? Node's `module.stripTypeScriptTypes` (≥22.13) is the route
   Swift S3 used; measure what it leaves (blank lines where types were) and whether a formatter is needed after.
4. **Double-click (R4).** Open a two-module page from `file://` in Chrome, Safari and Firefox; write down which load it.

## Build

- `src/emit/html/` with `emitHtmlApp(ir, catalog)` returning `{ files, copies }` (the shape `write/` already takes), and
  `--target html` in the CLI beside `react` and `swift`.
- `index.html`, `app.js`, `components/<name>.js` with `mount<Name>(element, inputs)`, `styles/`, `lib/core.js`,
  `lib/dom.js` (bind text, bind attribute only: lists and show/hide are HTX-003).
- The visual tier only: logic the page needs to draw its first page is read as constants from the plan; the rest is
  refused by the preflight, by name.

## Done when

- `nodegx export --target html` on story-engine writes a folder with no `package.json` dependencies; `npx serve` (or
  `python3 -m http.server`) on it draws the first page; a screenshot beside `nodegx render` of the same page, kept in
  `htx-001/`.
- A spec in `packages/nodegx-export/tests/` mounts `app.js` in jsdom and finds the first page's texts.
- The cost so far written down: printer lines, and what was copied from `component.ts`.

## Traps already known

- 🔴 Chrome tests hang in Claude's bash sandbox (memory: my-bash-sandbox-hangs-every-chrome-test): screenshot with the
  sandbox off or through the run-editor/render tooling, and keep the jsdom spec as the gate.
- A peer may be running the export's suite: check `ps -A -o pid,comm | grep -E 'jest|node'` by `comm`, never a
  `pgrep -f` wait loop.
