# Phase 134 — The app in plain files

**Scoped:** 2026-11-03, on Richard's ask ("Let's scope up the HTML export phase please, I think it'll be important").
**State:** 🔵 HTX-001 done 2026-11-03 (§10, session 1 of at most 10): story-engine exports as plain files and its first page draws in Chrome beside the running app. R1, R2, R3 and R5 ruled 2026-11-03 (§9); R4 measured, the recommendation stands, waiting on Richard. **Lane 4, reopened by Richard for this
phase only** (BOARD §2); React and Swift stay paused. **Read first:** this page, then [NEXT-SESSION-PROMPT.md](NEXT-SESSION-PROMPT.md),
then the task you take. The Swift precedent this phase copies is
[EXP-022](../phase-18-code-export-v2/EXP-022-THE-SAME-GRAPH-IN-SWIFT.md) §7–§9.

## 1. Why (Richard, verbatim, 2026-11-03)

> "When I reach for a web app, like HiveClip for example, it's straight away a NodeGX choice because I have a deep
> feeling of wanting the safety of knowing I can jump in and edit it one day if it becomes a serious production app and
> I want to take control of the development process, with or without Claude."

> "It's more the safety net for when Anthropic decides to start putting their models into American drone strikes and we
> have to stop using them … and maybe we don't have another easy option. Doomsday prepping. But yeah in general it's
> about retaining control more than saving tokens, and contingency planning."

> "We can already export to React, and we'll start working on vanilla HTML and JS next."

The same day the canon gained "Where NodeGX fits, and where it stops" (`docs/CANON.md`, awaiting his approval of the
words): NodeGX for the parts a person will change or must trust; plain code for the parts written once for one app (a
game's world). The phase serves both halves of that:

- **The off-ramp with nothing to install.** A NodeGX app leaves as HTML, CSS and JavaScript files that any person or
  any model can read and change, with no framework, no npm and no build step. React already gives a developer a way
  out; this gives everyone else one (pillar 3, DIRECTION §0).
- **The bridge.** A NodeGX part (a game's menu, a settings panel) goes into a page whose rest is plain code, and comes
  back out again after a Studio edit without touching that code.

## 2. The person sentences

> "I ran `nodegx export --target html` and got a folder. I put it on my server and it's my app. I opened `home.js` in a
> text editor and could see where the heading comes from."

> "My game is three.js. Its pause menu is a NodeGX component. I made the menu wider in Studio, exported it again, and
> the game picked it up. None of the game's own files changed."

## 3. What is already there (measured 2026-11-03, so nobody re-derives it)

- **Today's deploy is HTML and JavaScript, but not plain.** HiveClip's deployed window (`hiveclip/shell/ui-dist/`) is
  3.3 MB: `noodl.deploy.js` (1.75 MB minified, the runtime), React and React DOM, and the graph as data in
  `noodl_bundles/`. The browser interprets the graph. Nobody can open a file and change a heading. That is what this
  phase is not.
- **The export's pipeline is framework-free up to the last step.** `packages/nodegx-export/src/`: `parse` → `ir` →
  `analyze` (about 27,000 lines; `planProject(ir, catalog)` is a public export and its `ComponentPlan` carries `roleOf`,
  `childrenOf`, `bindings`, `handlers`, `repeaters`, `stateVars`, `statesMachines`, `instanceLifted` as data) → `emit`.
  Swift's S1 measured that a second printer can read the plan and call nothing in the React printer (one leak, the
  page collapse's style merge, `P18-EXP022-S1-COLLAPSE`).
- **The reactivity is framework-free.** `packages/nodegx-core/src/` (about 900 lines: `value`, `derived`, `signal`,
  `store`, `collection`, `events`, `effect`, `batch`) says so in its header: "React bindings live at
  `@nodegx/core/react` so a non-React consumer never pulls React in." An `effect` over a `value` is how a plain page
  updates one text node when its value changes.
- **The CSS is framework-free.** `emit/style.ts` (1,234 lines; `computeNodeStyle` is exported) names no React construct.
- **The React printer** is what this phase replaces: `emit/component.ts` (8,867 lines, the JSX), `emitApp.ts`, and
  the hook wrappers in the `*Lib.ts` helpers. Swift S7 found the helpers' cores are factories the hooks wrap
  (`createStateHistoryNode(source, store, rerender)`), so the cores travel and only the wrapper is rewritten.
- **The React export's output needs a build.** `emit/scaffold.ts` writes Vite, TypeScript, React 19 and
  `tsc -b && vite build`.
- **The grading rig runs without a browser.** `packages/nodegx-export/tests/helpers/node-spec-target.ts` mounts the
  React export's code in jsdom; `swift-graph-target.ts` replays the same P107 scenarios against Swift. A plain-JS
  target in jsdom needs no transpile and no `react-dom`. jsdom is installed.
- **The cost of a printer, measured once:** Swift reached React's results on every case both play in 5 sessions and
  about 3,600 printer lines (EXP-022 S5), against about 140 sessions and 24,700 lines for React, which built the plan
  as it went. Swift had to host JavaScript inside JavaScriptCore; HTML does not.
- **EXP-005 (2026-09) declined a native compiler per framework** ("a full generator per framework … permanent parity
  maintenance") and proposed AI ports of the React output instead. Swift overrode that in practice. R2 asks for this
  phase.
- **A real app is waiting.** HiveClip (`~/vscode_projects/hiveclip`) is the hybrid case: `ui/` is a NodeGX project
  (618 nodes: Group 148, Text 123, JavaScriptFunction 59, Button 38, For Each 19, Switch 15, HTTP 8, Page Stack
  Navigate 8), `engine/` is plain Python, and `shell/` is Electron around the deployed `ui/`. Closed source; Richard's.

## 4. The rule

One IR, three printers. `src/emit/html/` writes a folder:

| file | what |
|---|---|
| `index.html` | the page shell, the fonts, one `<script type="module" src="app.js">` |
| `app.js` | the router and the first page |
| `components/<name>.js` | one ES module per component: `export function mount<Name>(element, inputs) → { update(inputs), outputs, destroy() }` |
| `styles/<name>.css` | the component's CSS from `computeNodeStyle`, the project's tokens as custom properties in `styles/theme.css` |
| `lib/core.js` | `@nodegx/core`, as readable JavaScript (R1) |
| `lib/dom.js` | the small helpers the components call: bind a text, bind an attribute, a keyed list, show/hide with clean-up |
| `lib/*.js` | the helpers' framework-free cores (stores, history, actions, the backend client) |
| `functions/<name>.js` | each Function body as written, in the EXP-019 wrapper (`Inputs`, `Outputs`, `Noodl`) |
| `README.md` | how to serve it, what each folder is, what the preflight refused |

| IR | plain JavaScript |
|---|---|
| Group, Text, Button, Image, Icon, Text Input, Checkbox, Options | `document.createElement` once at mount; a value bound by an `effect` that writes one property |
| a state var, a Variable | a `value()` from `lib/core.js` |
| For Each | `lib/dom.js`'s keyed list: one `mount<Row>` per item, `destroy()` on removal |
| States, a condition that shows a part | mount on true, `destroy()` on false; every `effect` made inside is disposed with it |
| Page, Router, Navigate | the History API; a page is a component mounted into the router's element |
| a Function | its body, verbatim, in the wrapper |
| record verbs, Cloud Functions | the React export's own client (`src/lib/noodl.ts`, `src/api/client.ts`) with its types stripped at export time (Swift S3's route) |

The preflight says before anything is written what will not travel, by node and by sentence, as React's does.

## 5. Acceptance criteria

- **AC1 — the spike.** The smallest template (story-engine, as Swift S1) prints to a folder that a static server serves;
  its first page draws beside the running app's `render_report`. No npm install in the output folder.
- **AC2 — state, scripts and the hard four.** todo-list's logic printed from the plan; its Functions run unchanged; lists,
  show/hide, pages and text inputs (focus kept while typing) work; graded in jsdom by the desks.
- **AC3 — the backend.** todo-list signs in and reads and writes on a real backend through the one client; driven in
  Chrome beside the runtime and the React export, the three arms equal at every step.
- **AC4 — graded the same way.** P107's scenarios against a plain-JS `GraphTarget`; the line goes on P18's ledger beside
  React's and Swift's. The cost (sessions, printer lines) written beside theirs.
- **AC5 — one part inside another page.** `nodegx export --target html --component <name>` writes one component and what
  it needs into a folder, replacing only its own files. A three.js page mounts it; a Studio edit, re-exported, changes
  the menu, and the page's own files are byte-identical before and after.
- **AC6 — the test.** HiveClip's window (on a copy) exported to plain files and swapped into its shell beside the
  same engine; the drive HiveClip's `shell/check.mjs` runs passes on both. Then a stranger agent on a model that is not
  Claude (Mistral in Vibe, as OWN-026) makes one change Richard names in the exported files, and it works. That is
  the contingency sentence measured.

## 6. Tasks and order

| task | what | ACs |
|---|---|---|
| [HTX-001](HTX-001-THE-FIRST-PAGE-IN-PLAIN-FILES.md) | measure, then story-engine's first page in plain files | AC1 |
| [HTX-002](HTX-002-STATE-AND-SCRIPTS.md) | the plan's state, effects and lifts on `lib/core.js`; Functions verbatim | AC2 (logic) |
| [HTX-003](HTX-003-LISTS-SHOW-HIDE-PAGES-INPUTS.md) | the four jobs React did unnoticed | AC2 (screens) |
| [HTX-004](HTX-004-THE-BACKEND-THROUGH-THE-ONE-CLIENT.md) | todo-list on a real backend, three arms side by side | AC3 |
| [HTX-005](HTX-005-GRADED-THE-SAME-WAY.md) | the plain-JS `GraphTarget`, the ledger line, the cost | AC4 |
| [HTX-006](HTX-006-ONE-PART-INSIDE-ANOTHER-PAGE.md) | export one component; a three.js page mounts it | AC5 |
| [HTX-007](HTX-007-HIVECLIP-OFF-NODEGX.md) | HiveClip's window in plain files; a non-Claude agent changes it | AC6 |

HTX-006 needs only HTX-001–003 and can go before HTX-004 if Richard wants the game bridge first (R5).

**Sessions: hard stop at 10** (Swift: 12). HTX-001 one, HTX-002 one or two, HTX-003 two, HTX-004 one, HTX-005 one,
HTX-006 one, HTX-007 one. An overrun is reported as evidence against "a new target costs a printer", not hidden.

## 7. The cost of a third printer, said plainly

Every node type a printer covers is one more place a change in that node's behaviour has to land. Three things keep it
small, and HTX-002 builds them first:

1. **The cores are shared, not copied.** The stores, history, actions and backend client are written once as plain
   modules. The React printer's hooks wrap them; the HTML printer imports them as they are. Where React's helpers inline
   a core today, HTX-002 moves it out and React's suite proves nothing changed.
2. **The ledger grades all three.** A behaviour change that one printer misses turns its P107 line red.
3. **The preflight refuses by name.** A node the HTML printer does not print is said where it is placed, never dropped.

## 8. Not this phase

Svelte or Vue (EXP-005). Kotlin. Server rendering, SEO, minification, a bundler. Web Components as the output shape
(a later wrapper over `mount<Name>` if wanted). Translating Function bodies. Editing the exported files and bringing the
changes back into NodeGX: the export is a way out, not a round trip, except that AC5's re-export must never overwrite
what it did not write.

## 9. Rulings (Richard's), plain words, recommendation first

**Ruled 2026-11-03**, asked on one screen with the recommendation first (his choices, as picked):

- **R1: "Small library in folder"** (recommended).
- **R2: "A generator, like Swift"** (recommended). EXP-005's AI-port route does not apply to this target.
- **R3: "All of it now"** (not the recommended "first session now, rest after Beta"). Lane 4 reopens for P134 beside
  the Beta lanes; heavy jobs still one at a time on the box.
- **R5: "Backend, toward HiveClip"** (recommended): HTX-004 before HTX-006.
- **R4 not asked**: the recommendation (any static server) stands until HTX-001 measures double-click and he says
  otherwise.

The questions as scoped:

| # | question | recommended | other answers |
|---|---|---|---|
| R1 | What may "plain" include? | **Plain files plus a small library in the folder** (`lib/core.js`, `lib/dom.js`, about 1,000 readable lines, the same in every export). Plain JavaScript, no TypeScript. | No library at all: the update code is pasted into every component, longer and harder to read. One bundled file: opens by double-click but cannot be read. |
| R2 | A printer, or an AI port of the React export (EXP-005)? | **A printer.** It gives the same output every time, which AC5's re-export after a Studio edit needs; Swift measured it cheap. | AI port: no printer to keep, but every export is a new conversation and a re-export can differ. |
| R3 | When? | **HTX-001 now (one session, it measures the cost), the rest after Beta** (BOARD §2, lanes 9 and 2 first). | All of it now as lane 4 reopened beside Beta. After Beta entirely. |
| R4 | Must it open by double-clicking `index.html`? | **No: any static server** (`npx serve`, `python3 -m http.server`, every web host). Chrome refuses ES modules from a double-clicked file (other browsers to be measured in HTX-001). | Yes: a second, bundled copy of `app.js` beside the readable modules. |
| R5 | Which first after HTX-003: the backend (HiveClip, web apps) or the game bridge (AC5)? | **The backend**: HiveClip is the app he named. | The game bridge first. |

## 10. Sessions

### Session 1 — HTX-001, the first page in plain files (2026-11-03, Opus 5.5)

**Result: AC1 met.** `nodegx export --target html templates/story-engine <out>` writes 24 files and copies 5 font
files: no `package.json`, no TypeScript, nothing to install. Served by `python3 -m http.server`, both pages draw in
Chrome beside the running app's `nodegx render`, at 1280 and 390 wide:
[`htx-001/read-runtime-vs-html-1280x900.png`](htx-001/read-runtime-vs-html-1280x900.png),
[`htx-001/remix-runtime-vs-html-1280x900.png`](htx-001/remix-runtime-vs-html-1280x900.png). The printed folder is kept in
[`htx-001/story-html/`](htx-001/story-html/). The spec is `packages/nodegx-export/tests/html-the-first-page.test.ts`
(8 cases): it runs `app.js` and everything it imports in jsdom, from the export's own files only, reads the first page's
words, presses "Write your own story" and lands on `#/remix` with nothing of the Read page left behind.

**What it draws, and what it does not.** The same as Swift S1: the eyebrow, the passage rule and its States-chosen
"You are here", the "What you carry" card, both pill buttons, the footer, the Remix page whole but for the box's text.
Not the source line, the passage or the choices: those come from the logic component `/Story/Source` (HTX-002) and a
For Each (HTX-003). One thing the HTML export draws that the React export does not: the app shell's CSS Definition
(the page's warm ground, the pointer on a press), carried verbatim into `styles/app.css`. React drops it
(P18-S140-SHELLUNSAID).

**What was measured first:**

1. **The plan without React.** story-engine's 9 components: 7 drawn, 1 logic (`Story/Source`), 1 router shell. The
   printer reads `roleOf`, `childrenOf`, `bindings`, `handlers`, `props`, `outputProps`, `stateVars`,
   `statesMachines` (with `start` and `follow`), `head`, `refusals`, plus `computeNodeStyle` and `computeRoleCss`.
   **Four decisions are not in the plan** and were taken from the React printer: the element a node draws (`TAGS`,
   `authoredTag`, imported), a Mounted with no value keeping its authored Mounted, Mounted false not drawn, and the
   page collapse. Filed as P134-HTX001-PRINTERDECIDES (low), beside P18-EXP022-S1-COLLAPSE.
2. **The roles.** 7 drawn roles confirmed (page, group, text, button, input, instance, repeater). 29 CSS properties
   over the drawn nodes, the same 29 as Swift S1.
3. **`@nodegx/core` as one readable file: yes.** Node's `stripTypeScriptTypes` keeps every comment and line, but
   leaves the types as runs of spaces; Prettier (already in the repo) closes them. TypeScript's own transpile was
   measured too and rejected: it drops the blank lines and 8 of the 59 doc comments. The result is `lib/core.js`, 855
   lines, the core's own source, regenerated by `tests/helpers/html-core-js.ts` and checked by the spec.
4. **Double-click (R4).** Chrome refuses the modules from `file://` (CORS, origin `null`; measured). Firefox 159 the
   same (the CSS loads, no script runs; measured headless). Safari not measured: it has no headless mode, and driving
   it opens a window on the screen. Also measured: `python3 -m http.server` answers `/remix` with 404, so a page
   addressed by path cannot be refreshed on a plain server.

**One change from §4's table:** the router reads the page from the address after `#` (`index.html#/remix`), not the
History API. Measurement 4 is why: with a path, a refresh on any page but the first is a 404 on every plain static
server, and a folder served from a sub-path breaks too. With `#`, it works anywhere with no server setting. Also:
each component's CSS sits beside its JavaScript (`pages/Read.js`, `pages/Read.css`), so a person who opens the page's
file finds its look next to it; classes are named `<Component>-<node>` because plain CSS has no modules.

**The shape a component has** (`pages/Read.js`): `mountReadPage(element, inputs, before)` makes each element once with
`el(...)`, writes each bound value with `bindText`/`bindStyle` (one `effect` each), mounts a part only while its
Mounted is true with `when(...)`, places a child with its own `mount<Name>` and an effect that calls its `update`, and
returns `{ update, outputs, destroy }`. `lib/dom.js` is 109 lines, `lib/router.js` 46.

**The preflight** (`EXPORT-PREFLIGHT.md`): 21 plan refusals (the same 21 Swift S1 counted), and 12 things the HTML
printer does not print yet, each by node: the logic component, the Variable read, the two For Each, the values a part
sends out, the Text Input's label.

**Cost, so far:** 1 session. The printer is 1,009 lines (`printComponent` 606, `emitHtml` 232, `libJs` 171), plus the
generated `coreJs` constant. Tests: the 165-line spec and two helpers (174 lines). Swift S1 was 1,447. `plan.ts` and
`component.ts` were read, not changed. `scaffold.ts` now exports `tokensCss`, `baseCss` and `moduleStylesheetLinks`,
which the HTML export reuses as they are. The CLI takes `--target html`; the CLI, scaffold, preflight and Swift suites
pass (581 tests).

**For Richard (R4, measured):** a double-clicked `index.html` draws nothing in Chrome or Firefox. Keep "any static
server" (recommended: `python3 -m http.server` is one line and every host is a static server), or also write a
bundled copy of `app.js` that opens by double-click and cannot be read?

