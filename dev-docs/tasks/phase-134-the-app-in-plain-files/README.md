# Phase 134 — The app in plain files

**Scoped:** 2026-11-03, on Richard's ask ("Let's scope up the HTML export phase please, I think it'll be important").
**State:** 🔵 HTX-001, HTX-002 and HTX-003 done (§10, session 5 of at most 10, 2026-11-04): a checkbox ticked by a person, Checked and Unchecked by a chain or a Function, driven by a wire, mounted by a value and placed, as the runtime's own Checkbox does it, at every step but two cells every export holds (filed); before that, text fields, keyed lists, show and hide leak-free, and Back. Twelve desks read exactly what the runtime reads. HTX-003's Chrome drive is HTX-004's (todo-list's lists are records). **HTX-004 next.** Options wait on the plan: all 39 in the templates are left out of every export (P134-HTX003-OPTIONSWIRED). R1, R2, R3 and R5 ruled 2026-11-03 (§9); R4 measured, the recommendation stands, waiting on Richard. **Lane 4, reopened by Richard for this
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

### Session 2 — HTX-002, state and scripts (2026-11-03, Opus 5.5)

**Result: the plan's logic prints, and three desks read exactly what the runtime's own nodes read, at every step, on the
first run.** The spec is `packages/nodegx-export/tests/html-state-and-scripts.test.ts` (18 rows, about 18 s, jsdom, no
browser). §A drives the Hook Desk's nine presses in the HTML export (`tests/helpers/export-html-arm.ts`) beside
`runtime-mounted-arm.js`, the arm and steps React and Swift were graded with; §C does the same for six more desks.

**How React's model maps** (the printer's header says it too). The plan's rules were measured against React's timing,
so the printer prints React's constructs one for one on `lib/core.js`, as Swift printed them on SwiftUI:

| React | plain JavaScript |
|---|---|
| `useState` (setting the same value changes nothing) | `keep()` in `lib/dom.js`: a `value()` that tells its readers only when it changes |
| `useEffect(fn, [deps])` | `l.watch(() => [deps], fn)`: runs when a listed value is a different one; what `fn` reads does not track |
| `useMemo(() => Fn(inputs))` (a Function with no Run) | `derived(() => Fn(inputs))` |
| `use<Name>(props)`, a logic component | `place(l, mount<Name>, null, fixed, live)`: a component with no element |
| a For Each keyed by index | `list(l, parent, read, mountRow)` in `lib/dom.js` (only `itemsExpr`; Static Data and queries are HTX-003/004) |
| `src/lib/functionRun.ts` | `lib/functionRun.js`: the same source, types out |
| `useStates` over `statesLib.ts` | `statesNode()` over `lib/states.js` and `lib/animate.js`: the same machine, types out, the hooks cut off |
| `src/stores/variables.ts` | `variables.js`, imported as one namespace (`variables.gameText`), so a Variable never clashes with an element's name |

Each Function is its body as written in `functions/<component>/<Name>.js`, inside the EXP-019 wrapper (`Inputs`,
`Outputs` with its signals, `this`, `Component`). An Expression is a function above its component, React's wrapper with
its types out.

**Graded** (predictions were the runtime's, written before any export ran; `s136-hooks/EXPECTED.md` for the Hook Desk):

- **Equal at every reading:** the Hook Desk (10 readings: logic components chained, signals in and out, two placements
  keeping two totals, the delivered count, a run at load that reads the clock, a lifted list into a For Each, a row's
  relayed value), the Set Desk, the Sibling Desk.
- **Equal but for cells pinned by name, every one HTX-003's:** the Signal Desk (two cells, a field's Clear), the Success
  Desk (two cells at its last step, a field's Set), the Arrival Desk (the field's own echo, its typing chain). The Relay
  Desk's rows are a For Each over Static Data, named and not drawn. §C fails on any cell nobody named.
- **Four mutants.** Killed: a run's outputs written without a fresh copy (`keep` sees no change; every §A row red); the
  run at load dropped (A1 red). **Survived, and the reason is a finding:** the one-update delay on a pulse sent with a
  value (P18-S127-SIBLINGVALUE's `delivered`) and the "never twice" guard on a signal input are both redundant in the
  plain page. A value's push and the pulse beside it land in one flush, in the order written; `watch` acts only when the
  count changes. Both are kept, because they cost nothing and keep React's shape; the guard matters once a placement is
  mounted a second time, which no desk does yet.
- **The trap the task named** (a Function's output publishes only when it changes): the HTML export uses React's own
  runner and `keep`'s `Object.is`, which is `useState`'s rule; the killed mutant above is the measurement that the
  difference shows on the Hook Desk.

**todo-list, the work list:** 195 files, all 36 logic components and 59 Function files; its first page runs in jsdom
from its own files with no error and draws its tabs. Unprinted items **368 → 101**. The 101 are the backend (HTX-004:
record writes and verbs, queries, the session, the one body that reads `Noodl`), fields and lists (HTX-003: a field's
Set, Clear and focus, five For Eaches), 14 style ports the React export drops too, and one Did Mount under a value-decided
Mounted. Printed this session besides the table: `state-set`, `jsfun-run` with its pulses, `store-set`, `branch`,
`states-go` and the States listeners, push, sync, Value Changed, signal-input and ticked-run effects, Variable seeds,
Static Data, Did Mount, On Enter, the hover, pointer, focus and blur events, and the three style ports React follows
from a wire.

**Not done in HTX-002:** the Global Store (`store-key-get`, `globalstore-set`, the Store Desk), a Function's late writes
(todo-list's minute clock), a Function that awaits or reads `Noodl` (HTX-004), `Component.Object`.

**The cores (§7, point 1).** No React helper had to move: `functionRun`, the States machine and its run engine are
already framework-free and travel as their own source (types stripped, the hooks cut off) from
`tests/helpers/html-core-js.ts`, and the spec regenerates them and fails when they differ. React's output did not change
by a byte. **Copied instead** (P134-HTX001-PRINTERDECIDES, now eleven): which Functions keep a node, `expandActions`,
the render-run memo, `combinedLifted`, the Did Mount gate, the event table, the sync bodies and the Expression wrapper.

**Cost, so far:** 2 sessions. The printer is 1,771 hand-written lines (HTX-001 1,009): `printComponent` 1,268,
`emitHtml` 254, `libJs` 249, plus three generated constants. Lines moved out of React's helpers: 0. Tests: the 220-line
spec, a 78-line arm, the generator (223 lines, now four constants). Swift at the same point (S2): 2,781. `plan.ts` and
`component.ts` were read, not changed. The CLI, deploy, harness, Swift S2 and both HTML suites pass (8 suites, 153 tests).


### Session 3 — HTX-002 finished: the Global Store, and writes after a run (2026-11-03, Opus 5.5)

**Result: HTX-002 done.** Three more desks read exactly what the runtime's own nodes read, at every step, on the first
run: the Store Desk (nothing stored, and over a stored copy), the Header Desk (three placed writers into one store, three
scenarios), and the Bell (a body that writes and signals from a timer and a promise, after its run has returned). The
spec is `tests/html-state-and-scripts.test.ts` §E and §F (now 23 rows, about 32 s).

**What prints now:**

| React | plain JavaScript |
|---|---|
| `src/stores/desk.ts`: `store('desk', {…})` | `stores/desk.js`: the same call on `lib/core.js`'s `store()`, the same doc comment |
| `src/lib/persistStore.ts` | `lib/persistStore.js`: the same source, types out (`htmlPersistStoreJs()` in the generator; the spec makes it again) |
| `useStore(desk, (s) => s.app)` | `storeKey(l, desk, 'app')` in `lib/dom.js`: one local per key, telling its readers only when that key changes |
| `desk.set({ app: … })` (a Set) | the same line |
| `theBellNode.late = (run) => { … }` | `theBellNode.late = function (run) { … }`: the late row write, then the signal's chain |

A key read inside a chain reads `desk.get().app`, as React's handler does. The browser's storage is in the HTML arm now
(`storage: { keys, seeds }`, the runtime arm's): seeded before load, read at every step.

**Graded** (predictions were the React specs', `s139-persisted-store/EXPECTED.md` and `s141-header-app/EXPECTED.md`):

- **Equal at every reading:** Store, Header, Bell (from its ninth column on; the columns before are the Arrival Desk's,
  graded in §C), and a new variant, **Other key**: the store declares `{"other":"none"}`, a page button writes `other`, Show
  counts its own runs, and a Function beside its own Subscribe counts its runs on `other`. A write to one key runs nothing
  that reads the other, in both arms; the Initial State is saved at load, in both arms.
- **Bad** (the Function pair whose order the plan refuses to guess) reads the React export's readings, not the runtime's:
  the store keeps what it held. The plan's refusal, not the printer's.
- **Mutants.** Killed: Persist's call dropped (every §E row red); a Set writing `undefined`; the late handler dropped (both
  §F rows red). **Survived, a finding like session 2's:** `storeKey`'s own "only when it changes" check. Every reader of a
  key that does something already ignores an unchanged value on its own: a push goes through `watch`, a ticked run
  through `tickedArrival`, and a Function with no Run that is pure gives the same answer. The check is kept: it is
  `useStore`'s rule and the runtime's (a Subscribe of a key fires only when that key changed,
  `globalstoresubscribenode.ts`), and it costs nothing.
- **Found on the way, not a bug:** a Function fed straight by a Subscribe of an *untyped* key is refused by the plan
  ("key … has no statically-typed value", EXP-003), in every export, and the preflight lists it under the plan's
  refusals. The Other-key variant types its key with an Initial State for that reason.

**Measured on the templates:** rocket-school, whose whole app is one persisted store (`/Logic/App store`), 61 → 59
unprinted: the store's read and its write, so every page's `app` now loads, saves and arrives. todo-list stays at 101,
since it has no Global Store. Its minute clock's late write lands now; its `wake` arm tests the session (HTX-004) and is
named, whole, in place of the old "late writes are not carried yet".

**Copied from the React printer** (P134-HTX001-PRINTERDECIDES, now twelve): where a late write lands, which is the row and
the pulse arms its run is printed with, the first the plan holds (`component.ts`, EXP-019 session 133).

**Cost, so far:** 3 sessions. The printer is 1,907 hand-written lines (session 2: 1,771): `printComponent` 1,359,
`emitHtml` 282, `libJs` 266, plus four generated constants. Lines moved out of React's helpers: 0. Tests: the spec 379
lines, the arm 87, the generator 253. `plan.ts`, `component.ts` and `persistStoreLib.ts` were read, not changed. Nine
suites pass (175 tests): both HTML specs, the CLI, harness, deploy CLI, Swift S2, and React's three specs for what was
printed here (the persisted store, the Header, the script on arrival).

### Session 4 — HTX-003, fields and lists (2026-11-03, Opus 5.5)

**Result: a text field does what it is told, a list keeps each row with its item, and nothing keeps running after its
part goes.** The spec is `packages/nodegx-export/tests/html-lists-fields-pages.test.ts` (16 rows, about 15 s, jsdom).
Every graded row passed on its first run against the runtime's own nodes.

**What prints now** (each copied from the React printer, marked with the rule it copies, P134-HTX001-PRINTERDECIDES):

| React | plain JavaScript |
|---|---|
| `fieldWriteCode`: a Set behind `ref.current !== document.activeElement`, a Clear, then the field's change chain with its text | the same, in `printComponent`'s `fieldWrite`; the ref is `{ current }`, set while the field is on the page |
| the Cleared mark and its reset (`draft.subscribe(…)`) | `nameCleared = { current: false }`, `l.add(variables.draft.subscribe(…))` |
| `ref.current?.focus()` | `if (nameFieldRef.current) nameFieldRef.current.focus();` |
| the controlled `onChange`: the row, then `changeHandlers` and the field's Changed | one `input` listener: the row, then the chain, reading `field.value` |
| P18-S116-FIELDMOUNT's once-effect (gated under a value-decided Mounted) | `l.watch` over nothing (once), or over the gates with a once flag |
| a Did Mount under a value-decided Mounted (a gated effect with a ref) | printed at the end of the `when(…)` build, so it runs each time the part is built |
| `renderRepeater` over Static Data: `key={item.id}`, row props, fields no row carries dropped | `list(l, parent, read, keyOf, mountRow)`: keyed by `id`; the same mapping; a relayed value read from its field |
| `contentAttrs`: `defaultValue`, `maxLength`, `inputMode`, `enterKeyHint`, Enabled as `disabled` | the same five; they were silently dropped before |

`lib/dom.js`'s `list` is keyed now: each row sits between two comments, so it moves whole; an item that stays keeps its
row (moved, handed the item again), a new one gets a row, a gone one's row is destroyed. `keyOf` null keeps the old
by-place rule, which React's `key={index}` lists still take.

**Graded** (predictions were the runtime's, `s129-fieldset/EXPECTED.md` and `s126-mounted/EXPECTED.md`):

- **Equal at every reading, first run:** the Field Desk and its three variants (Set over typing, Clear sending its text
  on, Focus, Blur, a focused field taking no Set, a Set after a Clear, a Did Mount Clear and Focus, Enter blurring, a
  signal input's Set and Focus inside a placed Form, a typed-in Value under a wire with nothing written), the Root Desk
  and its two variants (a root and an inner element mounted by a value, a Did Mount each time), and in
  `html-state-and-scripts.test.ts` the Signal, Success and Relay Desks, whose cells HTX-002 had pinned on HTX-003.
- **The Arrival Desk's echo is not HTX-003's.** Session 2 pinned it here; measured, it is the plan's refusal in every
  export (`the-script-runs-on-arrival.test.ts` C3: the echo's ticked input is the field's text, which exists only in the
  field's handler). C5 now pins it as that, beside the plan's own reason in the preflight.
- **`lib/dom.js` alone (§C):** a keyed list, add three, delete the middle one (the field someone is in keeps its focus),
  reorder (the same elements, moved), add one (each row made once); a part with a nested part, a placed component and a
  list in it, shown and hidden a hundred times: the same live effects after as before, and none after the life ends.
- **The cursor (§D):** typing into a field whose text round-trips through state keeps its focus and its caret.
- **Back (§E):** story-engine, Read → Remix → Back, eleven times: the Read page again, with the live effects it had.
- **Four mutants, all killed:** the Set's focus test removed (3 rows red), a gated Did Mount run once at the top (3), the
  `when` not ending its part's life (C2), the keyed list never moving a row (C1).

**Measured on todo-list:** 101 → 88 unprinted. Every field Clear and Focus prints (7 Clears, 5 Focuses), and the
Note dialog's gated Did Mount, and the OK button's wired Enabled. Left: the backend (HTX-004), 14 style ports React drops
too, and **five For Eaches fed by a Function's output**, which the plan refuses in every export (React's report: "items
are fed by a source not statically typed as a list", EXP-003): todo-list's move form, project form, task picker, money
form and next-move question draw in no export. Not new; the loss now says so.

**Across all templates** (1,548 HTML losses, measured for HTX-003's second session): 38 custom nodes, 24 checkboxes
(planning 11, planning-demo 11, gram, nightbook), 21 images, 18 icons, 15 Columns. The runtime arm
(`runtime-mounted-arm.js`) mounts none of these, so grading them against the runtime starts with the arm.

**Pages.** HTX-001 chose the address after `#` (R4); the task's "History API" line is that decision's. Navigate, a
refresh on a page's address, and now Back, all graded.

**Cost, so far:** 4 sessions. The printer is 2,239 hand-written lines (session 3: 1,907): `printComponent` 1,635,
`emitHtml` 282, `libJs` 322. Lines moved out of React's helpers: 0. Tests: the new spec 408 lines. Six suites pass (109
tests): the three HTML specs, the CLI, harness, deploy CLI. React's and Swift's output did not change (no file of theirs
was touched).

### Session 5 — HTX-003 finished: the checkbox (2026-11-04, Opus 5.5)

**Result: a checkbox does what a person and the graph tell it, as the runtime's does.** The runtime arm mounts the
viewer's own Checkbox now (`runtime-mounted-arm.js`: a `boxes` reading, `[name]=on|off` by its label, `#1` unlabelled,
and a `tick:<name>` step that clicks it; `export-html-arm.ts` the same). The HTML printer draws it (`drawCheckbox`,
copied from React, four decisions added to P134-HTX001-PRINTERDECIDES, twenty-four in all).

**The desk** (`tests/helpers/checkbox-desk.ts`) is the five shapes the templates wire their 24 boxes in, measured first
across `templates/`: Done (read out, its Changed counted, Check and Uncheck from presses), Mirror (Checked wired from
Done's), Later (mounted while Done is ticked), a bare box read by a Function on Save (gram, nightbook), a placed Toggle
whose box is its input and its outputs (marketplace), and a placed Days whose Function, run on the component's input,
sends Check and Uncheck (planning's Settings sheet, seven boxes there, eleven in planning).

**Graded** (`html-lists-fields-pages.test.ts` §F, 4 rows): the HTML export reads what the runtime reads at every one of
21 readings, but two cells, and both are every export's, not the HTML printer's (the React export prints them the same):

- **P134-HTX003-TEXTKEEPS:** a Text wired from a Function that has not run shows its own text in the runtime ("Text",
  or what the author typed, measured both) and nothing in every export (React's `?? ''`). 16 template Texts have the
  shape (6 Function-fed).
- **P134-HTX003-BOXREMOUNT:** Later has no state row (only its Changed is wired), so in every export it is a box of its
  own, and comes back unticked when Done mounts it again; the runtime's node keeps the tick.

**Three shapes the plan refuses**, in every export, pinned in F3 to the plan's own words: a box whose label is a
component input (marketplace's WayToggle shape: the box is left out), a box whose Checked only an Expression reads (no
state row, so the Expression is deferred), and a Function **whose body keeps nothing**, run on a Variable's change, sending
Check or Uncheck ("author-signal pulses are not translated in this slice"). Measured beside it: planning's own Function
keeps what it last asked for (`this.`), and the plan carries that one's pulses, so planning's day boxes travel; the desk's
Days copies planning's pattern for that reason.

**Options reach nothing.** All 39 Options in the templates take their items over a wire, which the plan leaves out of
every export (React draws 0 `<select>`). Printing them in the HTML printer waits on the plan: filed as
P134-HTX003-OPTIONSWIRED (medium, the one finding here a person would notice first).

**Mutants, four, all killed, two of them weakly said:** the click not writing the row (4 rows red), the tick not bound
to the row (3), a box's Changed also sent through the generic listener (F3, by the loss it names, not by a double count),
the chain run before the row (F4 only, by the printed text: a chain reads the box from its own element, so the order
shows only when the chain reads something made from the row; behaviourally equivalent on this desk).

**Across all templates:** 1,572 HTML losses (session 4: 1,548) = 24 checkboxes drawn now, plus 48 of their label's
colour and size, which React drops and reports too. No checkbox is left undrawn. todo-list 88 → 87. planning's Settings
sheet prints whole: seven boxes with their rows and the Function's pulses into them.

**Cost, so far:** 5 sessions. The printer is 2,326 hand-written lines (session 4: 2,239): `printComponent` 1,722,
`emitHtml` 282, `libJs` 322. Lines moved out of React's helpers: 0. Tests: the desk 252 lines, §F 110. 106 tests pass in
five suites (the three HTML specs, the Field and Root desks' React specs, which share the runtime arm); React's and
Swift's output did not change.
