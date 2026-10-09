# NSP-016 — Visual nodes: research first, then layout semantics that are not CSS

**Opened 2026-09-29.** **Depends on NSP-008.**
**Status: ✅ s71 (2026-10-09): all four ACs met — AC4's layout check grades 156 boxes on twenty fixtures, six of them the templates' most-used shapes; its two mismatches are row C154 and the model's named min-content limit (§8.3). s68 (2026-10-09): AC4 ruled R18 "Build the layout check" — the neutral layout model, measured in a real browser with a tolerance; the build order is §8 (nothing built yet). s66 (2026-10-09): the Repeater's two unpinned hop counts settled — the no-Items Refresh pinned by a scenario, the queued copy's count shown unobservable (§7.25). s63 (2026-10-08): the Repeater v2 complete — Try Remove graded on both targets (two more row templates hold a Repeater Item, its Try Remove wired and not; a row on its way out stays the parent's child: a person taps it, an addition counts it, a rebuild leaves it); the rows' signals (Added, Leaving, Tapped) heard where a drain updates the row, one report per pass — measured with the runtime's update loop logged; 291 scenarios; rows C142 (a Repeater reports several rows' signals in one update as one), C143 (a row added beside one on its way out lands one place early); Component Children exempt (`exemptions.json`, read by the census): **19 of 19 handled — 18 conform, 1 exempt** (§7.24). s62 (2026-10-08): the Repeater v2 — a registry array as Items, its own changes heard (a new world seam: REGISTRY writes made elsewhere, at a time on the clock), and the input mapping graded on both targets (237 scenarios); every row now holds its inputs (a value given that is `undefined` is never sent on, so a cleared field leaves the row as it was — v1 read the record live); a 10,000 survivor killed by a scenario; rows C140 (an input mapping that throws for a record stops the Repeater for good), C141 (one that throws on a record's change throws into the writer); left of the v2: Try Remove (§7.23). s61 (2026-10-08): the Repeater v2 — Script graded on both targets (Template Type Dynamic runs it per record; the spec compiles and runs the same code); the Drag's seed-20732 survivor killed by a scenario; rows C135 (a Script whose component is not text stops the Repeater for good), C136 (a compiled Script lets a Refresh with no Template report Done), C137 (a Refresh pulsed while a rebuild runs is never answered — a v1 hole the new draws found); left of the v2: Items as a heard registry array (needs a seam), the input mapping, Try Remove (§7.22). s60 (2026-10-08): the Columns conforms on both targets (18 of 19; v1 — the band it reports is read from one width the world lays its container out at: the act `resize`; the column geometry waits for NSP-017); Component Children is not a node (the runtime makes none) — proposed exempt, its placement a graph rule; rows C132 (a number on Medium / Small Below is refused until a size is typed there), C133 (high: a breakpoint layout that is not a string blanks the page), C134 (Auto Fit with Min Column Width + Horizontal Gap = 0 divides by zero and blanks the page — the deep run) (§7.21). s59 (2026-10-08): the Repeater conforms on both targets (17 of 19; v1 — its rows are its parent's children, and a person sees them there: the act `tapRow`; the play's project has two row templates; its list is the registry's array, so ids and draws are the runtime's; its queue lands at the yield, and what does not build frees it act boundaries later); rows C128 (high: a Template the project does not have, or a `null` in a rebuilt list, stops the Repeater for good), C129–C131 (§7.20). s58 (2026-10-08): the Component Stack v2 — Use Routes (the URL read at every reset, the top page's URL pushed; the person's Back and Forward, `traverse`); rows C119–C127 (C119: the browser's Back resets every Component Stack, Use Routes or not; C120: a Pop pushes a new history entry) (§7.19). s57 (2026-10-08): the Page Router conforms on both targets (16 of 19; v1 — the world's LOCATION is on a play's page now; two acts, `navigate` and `traverse` (Back / Forward); the router's answers and the parameters it hands its page in the `answer` event); rows C115–C118 (C117: after a Navigate, Back to the same page with other parameters keeps the old ones) (§7.18). s56 (2026-10-08): the Component Stack conforms on both targets (15 of 19; v1 — the callers' requests as three acts and one new trace event, `answer`; one request at a time, landing at the yield (`resume`); the transition is the only clock; Use Routes is v2); rows C107–C114 (§7.17). s55 (2026-10-07): the Drag conforms on both targets (14 of 19; v1 — react-draggable, not drag-drop.ts; the face's pointer WITH A POSITION: `pressAt` / `moveTo` / `releaseAt`; the snaps are Animate To Value's timer; only Constrain to parent needs geometry and waits); rows C101 (high: on a touch screen nothing inside a Drag can be tapped — measured in headless Chrome), C102–C106 (§7.16). s54 (2026-10-07): the Video conforms on both targets at 200 and 10,000 (13 of 19; v1 — the Image's machinery, the browser's media element with four new acts, the autoplay rule, the four actions); every paint writes the element and its media as they stand, every action the playback; rows C96–C100 (C98 high: a Volume outside 0 to 1 blanks the page) (§7.15). s53 (2026-10-07): the Shape (`Circle`) and the Image conform on both targets (12 of 19; v1 each — the Text's machinery with no Tag; the Image adds the picture's fetch, a new act `fetched`); the runner can withhold a value a target cannot survive; rows C91 (Custom SVG's span is a drop slot), C92 (a huge Points runs the page out of memory), C93 (an Image adds a sub-path Base URL again at every render — high), C94 (Source Set true at placing fetches "true"); the Group v2 (R16: a Focus off the page reports Unchanged; row C95) (§7.14). s52 (2026-10-07): the Group conforms on both targets at 200 and 10,000 (10 of 19; v1, 1,387 scenarios) — its children as drop slots, the focus tracker, the scroll actions and when a frame's work runs; rows C86–C90 (§7.13). s44 (2026-10-05): the Text v3 — C79 is a known row (R11: the spec says the intent, not React's redraw rules); 162 scenarios; s43's 47 deep-run survivors killed (§7.9). s43 (2026-10-05): drag and drop researched ([RESEARCH-DRAG-DROP.md](RESEARCH-DRAG-DROP.md)) and the Text conforms (9 of 19; rows C77, C78, §7.8) — its drag SOURCE graded on a lone node; the zone side and the file drop are step (b). The face learned the browser's hit test, and the 7 conforming specs it moved say what a browser lets a person do. s42 (2026-10-04): the Radio Button Group and the Radio Button conform on both targets at 200 and 10,000 (8 of 19; rows C76, D37, §7.7) — the visual tree, per node: a node's children are on its PAGE (the spec declares them; the face builds them with the node's own `addChild`; a person `pick`s one) and a node's parent is its WORLD (the GROUP seam). s41 (2026-10-04): Slider and Icon conform on both targets at 200 and 10,000 (6 of 19; rows D36, C73, C74, C75; C63 takes null, §7.6) — the face grew `slide` (jsdom's range sanitization, which it applies to every write, plus the browser's step rule, which jsdom lacks; a reversed range is not played); the 13 left each need infrastructure first (a visual tree with context, drag and drop, geometry, media — §7.6). s39 (2026-10-04): Dropdown conforms on both targets (4 of 19; rows C70, C71, D34 and instances of C65, C66, D30, §7.4) — the face grew `choose` (a keyboard pick: an enabled option the list offers, no `change` for the one already selected); the spec keeps the node's value, the author's Value, the shown value and the browser's selection apart because the component does. s38: Text Input conforms on both targets (3 of 19; rows C68, C69, D31–D33, §7.3) — the face grew `type` and `key`, the format a person patch that resolves deferred outcomes (the viewer's pointer drain). s37: AC3 begun — THE PERSON face (the real React component in a jsdom page; an act is the browser's events) and the format's `act` / `acts` / `person` / `place` / `portability`; Button and Checkbox conform on the runtime (rows C61–C66, D30, §7.2). s36: research done, R10 ruled — build the logic for all 19 with each input's portability class in the spec; geometry grading after NSP-017.**

## 1. The person sentence

> **What a visual node draws — its size, position, what it contains, what it responds to — is
> written down in terms a native toolkit could implement, not only as the CSS the web happens to
> use, and it is checked by measuring what was drawn.**

## 2. Why this is last and different

The logic of a visual node (a Button's *Click* signal, a Text Input's *Text* output, a Checkbox's
*Checked*) is ordinary T1 and can be specced like any other node. Its **look and layout** cannot:
today they are CSS — a Group is a `div`, layout is flexbox, the style vocabulary is CSS properties,
design tokens are CSS variables. A spec that says "`flex-direction: column`" ties every future
target to CSS forever.

This is also the part of NodeGX most exposed to the platform changing under it (the conversation
of 2026-09-29: native targets, and whatever browsers become). Separating *what the layout means*
from *how CSS says it* is the same work native targets would force anyway.

## 3. What to do

### 3.1 Research (one session)
- How do cross-platform toolkits describe layout neutrally? (Yoga/React Native's flexbox subset,
  SwiftUI stacks, Compose rows/columns, Flutter.) What subset do all of them share?
- Census NodeGX's visual parameters against that subset: which map cleanly, which are CSS-only
  (and how often they are used — rank by the product surface: the templates and the picker's
  defaults, not an old corpus).
- Write the result as `RESEARCH-LAYOUT-SEMANTICS.md` in this folder.

### 3.2 Ruling (asked in plain words, with the census numbers)
Spec visual nodes as (a) **logic only**, with look/layout graded by `render_report` geometry as
today; (b) logic plus a **neutral layout model** covering the shared subset, with CSS-only
parameters marked as web-only; (c) stop at research.

### 3.3 Build (per the ruling)
Logic specs for all 19 visual nodes regardless (the logic is T1). Layout per the ruling.

## 4. The nodes (from the census)

**19**, from the census ([CENSUS.md](CENSUS.md), NSP-000, generated 2026-09-30). Regenerate the census; do not edit this list by hand.

- **T5 visual (19):** Shape (`Circle`) · Component Children · Drag · Repeater (`For Each`) · Group · Image · Button (`net.noodl.controls.button`) · Checkbox (`net.noodl.controls.checkbox`) · Dropdown (`net.noodl.controls.options`) · Radio Button (`net.noodl.controls.radiobutton`) · Slider (`net.noodl.controls.range`) · Text Input (`net.noodl.controls.textinput`) · Columns (`net.noodl.visual.columns`) · Icon (`net.noodl.visual.icon`) · Component Stack (`Page Stack`) · Radio Button Group · Page Router (`Router`) · Text · Video

Census notes:
- **Component Children** — providedBy noodl-editor in the catalog

## 5. Acceptance criteria

1. The research note exists with the parameter census (counts, not impressions).
2. The ruling is asked and recorded in the README's §7.
3. Every visual node's **logic** is specced (the ledger's definition) or exempt with a reason.
4. If (b): geometry assertions for the neutral subset, graded with a tolerance, on the runtime
   through `render_report`.

## 6. Watch for

- Memory: *a rect is not visibility; a rendered surface can be behind a blocker; an invisible
  element still animates.* Geometry is not "what a person sees". Assert what the spec says, and
  say which of those it is.
- Memory: *a ring must be read on the element a person sees* — focus and interaction states have
  the same trap.

## 7. Built

### 7.1 s36, 2026-10-03 — the research (AC1) and the ruling (AC2)

[RESEARCH-LAYOUT-SEMANTICS.md](RESEARCH-LAYOUT-SEMANTICS.md) holds it. In brief:
- **The toolkits.** A table of what Yoga, SwiftUI, Compose and Flutter share, can express, and cannot.
- **The census.** `node scripts/node-spec/visual-census.js` reads the catalog, the hand-kept classes in
  [visual-params.json](visual-params.json) and the product surface: 10 shelf templates, Site Builder, and 109 examples.
  It writes [visual-census.json](visual-census.json); `--check` fails on an input with no class. 274 inputs: 65 logic, 55
  layout, 141 look, 13 web-only. Of 11,041 layout settings on templates, 96.6% are shared, 0.9% expressible, 2.4% not
  shared (`flexWrap: wrap` on rows, 173). Sizes are `%` / `px` (98%), and colours and fonts are tokens (92.5%).
- **The finding.** 9 of the 10 shelf templates carry a hand-written stylesheet (`CSS Definition`, or a Function that
  injects a `<style>`): about 1,084 rules, 185 KB, `!important` 445 times. 17% of their visual nodes take a class from it.
  A parameter-level spec cannot see what those sheets change.

**R10 (Richard, 2026-10-03): "Logic + record each setting's portability".** The README §7 has the question as asked.
The build:
- (1) logic specs for all 19, the 65 behaviour inputs plus outputs and signals, through a visual-node seam in the runtime
  target (the corpus harness already makes these nodes without React; the events a person causes need a world face);
- (2) each layout and look input's class from `visual-params.json` written into the spec's port metadata;
- (3) no geometry until NSP-017 has said what a `CSS Definition` sheet is.

AC4 waits on (3).

### 7.2 s37, 2026-10-03 — AC3 begins: THE PERSON face, Button and Checkbox conform (108 of 147)

**The seam, first.** A visual node's logic is what a PERSON does to it and what three inputs do to it; its component
holds rules of its own (a disabled `<button>` takes no click; a Keeps Focus button cancels the mousedown that would
take the keyboard). Standing in for the component would copy those rules instead of grading them, so the runtime target
renders the REAL component — react-dom's `createRoot` inside React's `act`, into a jsdom document (the page) — and a
person's act is the DOM events a browser raises for it on the element a person sees (`node-spec-target.ts` PERSON):

- **The format** (guarded files changed additively; hash refresh named `spec.ts`, `trace.ts`, `adapter.ts`,
  `trace.schema.json`; the three stranger rounds green): a scenario step `{ "act": "click" }` (`Step`,
  `TargetAdapter.act`), the trace event `{ t: 'act', act, value? }` (a stimulus), a spec's `acts` (the acts a person
  can do to this node, with the values a sequence draws) and `person` reducers (one per act), a `WorldNeed` `person`,
  a `WorldHandlers.place` (the node is PLACED on the page after its params — the first render; `mount` runs before the
  params and Sign In With relies on that), `PortMeta.portability` (R10: every look and layout input carries its class
  from `visual-params.json`), and `SELF_REFERENCE` (a visual node's `This` is the node; both targets record `{ "$node":
  "self" }`). The generator draws acts among the steps at a signal's rate and a classed spec's logic ports three times
  in four (81 of the Button's 92 inputs are look and layout); every spec without acts or classes draws what it drew.
- **The face is the browser's rules, never the component's.** A `press` is `mousedown` and then the browser's default
  action — the keyboard onto a focusable target — unless the handler cancelled it; a `click` is the press, `mouseup`,
  `click`; `focus` / `blur` are `element.focus()` / `.blur()`, answered by jsdom's focusing steps (a disabled control is
  not a focusable area); `hover` / `leave` are `mouseover` / `mouseout`; `touch` / `lift` the touch events. A **disabled
  form control is dispatched no click, mousedown or mouseup** (HTML withholds the user's clicks; Chromium the mouse
  pair too; hover and touch go through) — jsdom has no user interaction task source and would even run a checkbox's
  toggle on a dispatched click, so the face withholds them. An act happens on a **painted** page: the holder re-renders
  before the events are dispatched, as a browser paints before a person can act. What the page gives the app beside the
  component is stood in as the app gives it: the viewer's real `FocusTracker` on the context (viewer.jsx :207-214), its
  root's click capture, a holder for the lone node (what `getVisualParentNode` reads: a column layout, `style.
  flexDirection`, and a frame-end `forceUpdate` a Mounted change asks of it), `Noodl.deployed`, `getTextStyle`,
  `scrollIntoView` as a no-op. The page's globals are on the host only while a page node is mounted (`installWorld`
  reads whether there is a window at `install`; a `viewport` play must still find none).
- **The page model in the spec** (button.ts, checkbox.ts): the node WANTS (`mounted`, `enabled`, `focused` as it
  reports them) and the page HAS (`onPage`, `pageEnabled`, `elementFocused`), the page following the node at each
  paint — `place`, every frame's end (`afterInputs`), and inside every act (`onPainted`). Three runtime readings forced
  that split, each a divergence first: a Focus pulsed in the same frame as Mounted off still finds the element; Enabled
  off and a Focus in the same frame still takes the keyboard (the `disabled` attribute is painted at the frame's end);
  and an element that leaves the page takes the keyboard with it while the node's Focused stays true (D30).

**Button** (`net.noodl.controls.button`, 92 inputs — 11 logic, 81 classed — 23 outputs, 9 acts): 30 scenarios (one marked `row`, C61); the
runtime 29 / 30 + 1 known and 0 divergences at seeds 20729 and 13; the interpreter at 13, 20729, 20730 and 7; mutants 267 / 272
killed and 5 declared (below). **Checkbox** (`net.noodl.controls.checkbox`, 88 inputs — 14 logic — 23 outputs, the same
9 acts; its tick: a click toggles the input and `checkedChanged` reports it, Check / Uncheck are the ERG-001 register):
35 scenarios (three marked `row`: C65, C66, C67); the runtime 32 / 35 + 3 known, 0 divergences at both seeds; the interpreter at four seeds; mutants
378 / 391, 13 declared. Of the Button's 200 generated runs at the day's seed, **83 are known rows** (59 C61, 20 C62,
4 C63); of the Checkbox's, 75 (+1 C65 at seed 13) — the three throwing setters every visual node shares reach almost
half of every run, which is what their rows weigh. Deep runs: see the gate readings below.

**Rows** (each filed in the ledger, `node scripts/bugs.js --from P107`; known-row predicates in
`conformance.test.ts` `VISUAL_ROWS`, counted on every visual node's run):
- **C61** — Font Family wired a truthy non-string throws `family.split` (node-shared-port-definitions.ts :2439);
  every node with a text style. ([P107-C61](../../bugs/p107-c61-font-family-wired-a-non-text-value-throws-in-its-setter.md))
- **C62** — a units-typed `inputCss` port wired `null` throws reading `.value` (react-component-node.ts :2368
  `typeof null === 'object'`); 28 ports on the Button, Checkbox's `label*` and box `width` / `height` too.
  ([P107-C62](../../bugs/p107-c62-a-units-typed-style-input-wired-null-throws-in-the-generated-setter.md))
- **C63** — Pos X / Y, Rotation, Transform Origin X / Y wired `undefined` throw `value.value` (:582, :600, :618).
  ([P107-C63](../../bugs/p107-c63-a-placement-input-wired-undefined-throws.md))
- **C64** — a disabled control still reports Pressed / Pointer Down / Pointer Up for a finger and Hover for the
  pointer; Enabled says it "ignores clicks, touches and typing" (utils.ts handlers never read `enabled`; only the
  visual state is gated). ([P107-C64](../../bugs/p107-c64-a-disabled-control-still-reports-a-finger-and-a-hover.md))
- **C65** (high) — a Checkbox Label wired an object or array crashes React's render ("Objects are not valid as a React
  child"; Checkbox.tsx :205 renders `{props.label}`, the Button `String(props.label)`).
  ([P107-C65](../../bugs/p107-c65-a-checkbox-label-wired-an-object-crashes-the-render.md))
- **C67** — a Check / Uncheck reverting a person's click in the same frame leaves the box drawn as the click left it (the
  component's effect keys on React's last-rendered `props.checked`, which the click never changed); known row.
  ([P107-C67](../../bugs/p107-c67-an-action-reverting-a-click-in-the-same-frame-does-not-redraw-the-checkbox.md))
- **C66** — Enable Label on then off: the Checkbox loses its root element (Checkbox.tsx :167 and :199 put the SAME
  root ref on the box and the wrapper; the removed one nulls it), so Focus reports Unchanged and Scroll Into View
  "not mounted" with the box on the page. Scenario marked `row`.
  ([P107-C66](../../bugs/p107-c66-a-checkbox-loses-its-element-when-enable-label-changes.md))
- **D30** — Focused (and Hover, Pressed) stay as they were after Mounted off; the element that comes back holds no
  keyboard while Focused reads true, and a Focus fires Focused again with no Blurred between.
  ([P107-D30](../../bugs/p107-d30-focused-stays-true-after-a-control-leaves-the-page.md))
- Observed, not a row: the catalog's Children Count is on the Button (allowChildren) and not on the Checkbox — the
  catalog and the runtime agree (this session first copied the Button's outputs; the parity gate caught it). A click
  on the LABEL TEXT of a disabled Checkbox would fire the wrapper's pointer events (the wrapper is not a form control);
  the face's `click` targets the box, so that is not graded yet — an act on the label is a later act.

**Synced keys, not declared twins.** The page's keys (`pageEnabled`, the Checkbox's `labelOn`) are set beside every act's real
work, and the first attempt graded them as branches: 113 swap twins differing only in a sync, each declared by exact shape from four
seeds' survivor lists — and the first "paint-in-act is the frame-end paint brought forward" declaration was WRONG (a Focus pulsed after
the act kills it; the painted-page scenarios now pulse one after every act, both ways, matched and crossed toggles). The format now
says it once: `NodeDecl.synced` names the state keys the page syncs, a branch key (`shapeOf`) leaves them out, and a swap keeps THIS
branch's syncs (a sibling recorded with the element disabled must not disable it here — measured: that stale value made a swap on a
Checkbox's blur invisible to the Blur action that would have told it apart). Mutants per node fell from ~800 to under 100 and a run
from 9 s to 1.5 s. What is still declared, with its reason beside it: a placing or a pointer act on a node OFF the page (its set holds
only syncs; nothing reads them before the frame end), and a press or release on a DISABLED box during an Enable Label rebuild (the
rebuild unfocuses an element no action can read while disabled; the frame end that paints Enabled paints the rebuild too — the
runner's own mutant and the original trace the scenario identically).

**The Checkbox's label rebuild.** Enable Label changing rebuilds the tree around a NEW input (Checkbox.tsx :167-210, either way): the
keyboard leaves with the old one and no blur fires (D30 again); the spec holds `wantsLabel` beside the painted `labelOn`. **C67** came out
of the deep run: a Check / Uncheck (or a Checked write) that reverts a person's click in the same frame does not redraw the box — `checkedChanged` writes
`props.checked` (FB-020) but React's last-rendered value is the one before the click, so the component's `useEffect([props.checked])` sees
no change and the input stays as the click left it; the next click reports the opposite of what the node holds. Known row, Checkbox only.

**Gate readings (2026-10-03/04, load 3–6).** Interpreter: Button and Checkbox CONFORM at 200 on seeds 13, 20729, 7 and 20730, and at
10,000 (seed 20729; 0 divergences; Button mutants 267 / 272 killed, the 5 declared). Runtime (`NODE_OPTIONS=--max-old-space-size=8192` —
the 10,000-sequence run of a page node needs it; 4 GB died in V8's heap twice): Button CONFORMS at 200 on 20729 and 13 and at 10,000 — 0
divergences, 4,188 of 10,000 runs known rows (C61 2,612 · C62 1,131 · C63 445), mutants 267 / 272 (159 s). Checkbox CONFORMS at 200 on both
seeds (its three row scenarios known) and at 10,000 — 0 divergences, 4,013 of 10,000 runs known rows (C61 2,716 · C62 753 · C63 481 · C65 57 ·
C66 3 · C67 3), mutants 379 / 391 (319 s). Package `nodegx-node-spec`: 20
suites, 848 passed. Runtime: the whole jest suite, 183 suites, every spec CONFORMS; `tsc --noEmit` exit 0 in both packages; three
stranger rounds green on the refreshed hashes; `node scripts/bugs.js check` every header valid; `node scripts/node-spec/census.js`
regenerated.

**Lessons.** (1) A face encodes the BROWSER (focusing steps, which events a disabled control gets, paint before a
person acts) and nothing of the component — write that line down before the first act, or jsdom's gaps (no activation
rule for disabled, no `scrollIntoView`) read as product defects. (2) The node's reported state and the page's state are
two things; a divergence that says "the element is still there" or "the keyboard went with the element" is the page
talking. (3) A flag synced at every paint is not a branch — say so in the format (`synced`) rather than declaring its twins one by one; and a
swap must keep the branch's own syncs, or a sibling's stale value hides the difference a pulse would read.
(4) Assembling a spec from a sibling's tail copies the sibling's ports; the parity gate is what caught it.

**Left (AC3):** 17 visual nodes, in the handoff's order; the same face carries Text Input (acts `type`, `key` with
values), Dropdown (`choose`), Slider (`slide`), Radio Button (+ Group); Group / Text / Image / Circle / Icon / Columns /
Video need the pointer, drop and scroll acts; Drag; then Repeater, Component Stack, Page Router, Component Children
(a boundary or a stack each). AC4 waits for NSP-017.

### 7.3 s38, 2026-10-04 — Text Input conforms (109 of 147)

**Text Input** (`net.noodl.controls.textinput`, 117 inputs — 22 logic (incl. `runOnChange-startValue`), 95 classed — 24 outputs, 11 acts:
the Button's nine plus **`type`** (a text, typed one key at a time) and **`key`** (`Enter`)): 68 scenarios (one marked `row`, C61 — one of them THE MATRIX, below);
**the runtime 67 / 68 + 1 known and 0 divergences at seeds 20730 and 13; the interpreter at 13, 20729, 20730; mutants 3,051 / 3,061 killed
at 20730, 10 declared** (`equivalent-mutants.ts`: the placing and the four pointer acts off the page, an empty frame end, a Clear off the
page that finds everything empty, a press / release / click / Tab / typing / key on a disabled field during an Enable Label or Type rebuild —
the frame's end redoes the rebuild — and, found by the first 10,000 run, a pointer act whose drain LANDED a Set swapped with its rebuild
twin: the Set landing means no keyboard on the field, so the twin's `elementFocused: false` writes what is there). Deep runs: see the gate readings below. Ports generated from the catalog by the new
`scripts/node-spec/gen-ports.js <typeName>` (the handoff asked for it; the Checkbox's copied port was the lesson) — logic ports listed for
hand-writing, look and layout ports emitted with their class.

**The text, three times over.** The spec keeps what the runtime keeps: the AUTHOR'S VALUE (`_internal.text`, what Value last wrote — null
is the field's empty value, undefined ignored, a repeat ignored), the START VALUE (`props.startValue`, written by every Value / Set / Clear /
Insert / Backspace AND every keystroke, what the next mount starts from), the FIELD (the component's `state.value`, raw text) and the
VALUE OUTPUT (`outwardValueForFieldType`: the text, or a Number field's parsed number / null). A write through the component sends the output
and fires Value Changed on EVERY call; a write while off the page sets the output alone and the next mount announces what was not announced
(`_announcedValueIs`). Type's six values each paint a different element (`<textarea>` for Text Area; the `type` attribute otherwise) and the
spec runs HTML's value sanitization on what the element SHOWS (a Number field shows nothing for text that is not a number; Email / URL trim
their ends) — typing appends to what the element shows, not to what the component holds.

**Two rules the runtime taught the spec, both measured side by side before they were written:**
- **A write from the graph is a `setState` React commits at the frame's end; a person's keystroke is a browser event React commits at once.**
  `edit` (Insert Text, Backspace) reads `this.state.value` — the text React last COMMITTED — so an edit in the same frame as another write
  works on stale text and React's last `setState` wins: Value `abc` then Backspace → Unchanged; two Backspaces → one character; **Clear then
  Backspace → the field holds `ab`** (row C69, high). The spec holds `field` (committed) beside `pending` (written), the paint commits.
- **A pointer act drains the frame.** Every pointer handler the control installs runs the graph's dirty nodes after its own work
  (pointerlisteners.ts :173-186 — "that is what makes a click update the graph in the same frame"), so a Set or Insert Text queued for the
  frame's end runs AT a hover, leave, release, click, touch or lift, in the order pressed, its `setState` committed with the event; an
  Insert, a touch, then a Clear leaves the field empty where the same without the touch leaves the inserted text. Inputs themselves apply
  at once (a Clear reports in its own step); only the node's scheduled callbacks wait. The format grew **`PersonPatch`**: a person's act may
  resolve invocations `deferred` to the frame's end (spec.ts, interpreter.ts `act` → `resolveOpen`; hashes refreshed, three stranger rounds
  green). A Text Area's press drains too — inside the handler, BEFORE the mousedown's default puts the keyboard on it (a Set landing at the
  press is Done, not absorbed); an `<input>`'s press does not (C68). A Tab, a key and typing drain nothing (not pointer handlers).

**The face grew two acts** (`node-spec-target.ts` PERSON `typeKey`): `type` puts the keyboard on the field first (the focusing steps, as a
Tab's — a disabled field takes nothing), then one key at a time through the element's PROTOTYPE value setter (past React's tracker on the
instance, as a keystroke is) and an `input` event; the browser's rules written down: a key past the element's `maxlength` is refused (text-like
inputs and a textarea; never a Number field), a Number field refuses every key but a digit (a sign, point or exponent mid-entry is a state
jsdom and a browser disagree on — jsdom drops it, a browser keeps it on screen with an empty value — not graded), and Enter's default action
in a `<textarea>` writes a newline. `key` dispatches `keydown` / `keyup` with the key.

**Rows** (ledger `node scripts/bugs.js --from P107`; the three shared setters C61–C63 reach 117 of the 200 runs at 20730):
- **C68** — a mouse press on a Text Input fires no Pointer Down and never sets Pressed: TextInput.tsx :204 puts the component's own
  `onMouseDown` after the spread of the control's; the release still fires Pointer Up, a finger and a Text Area fire all of them; the
  press skips the pointer drain too. ([P107-C68](../../bugs/p107-c68-a-mouse-press-on-a-text-input-fires-no-pointer-down.md))
- **C69** (high) — Insert Text and Backspace read the field as React last drew it (above). ([P107-C69](../../bugs/p107-c69-insert-text-and-backspace-read-the-field-as-react-last-drew-it.md))
- **D31** — Set fires Value Changed and reports Done with the Value already in the field ("fires whenever the Value output changes").
  ([P107-D31](../../bugs/p107-d31-set-fires-value-changed-with-nothing-changed.md))
- **D32** — a text field given the number 5 publishes `'5'` on the page and `5` off it (text-input.ts :535 hands the raw value to
  `outwardValueForFieldType`). ([P107-D32](../../bugs/p107-d32-a-text-fields-value-output-keeps-the-type-it-was-given-while-off-the-page.md))
- **D33** — Clear on a Number field says Unchanged while it empties text the field held (`wasEmpty` reads the author's Value and the output,
  not the field). ([P107-D33](../../bugs/p107-d33-clear-on-a-number-field-reports-unchanged-while-it-empties-the-field.md))
- Second instances filed on existing rows: **C65** (TextInput.tsx :274 renders `{props.label}` raw — 3 of 200 runs at 20730, known row),
  **C66** (two divs carry the root ref when the label is on; not on this node's wire — its Focus goes through the inner component),
  **D30** (Focused survives Mounted off, an Enable Label change and a Type change between Text Area and the rest — each a new element).
- The catalog marks this node `runtime-narrowed` (`startValue` / `onTextChanged` republished as `number` or `string` per Type) and derives
  one string input per Data Attributes name: the spec's `derived` carries the data-attribute ports (the first visual spec to need one); the
  narrowing is a sentence, a declared port cannot be re-derived. The parity gate now probes a derived rule with the name its own
  `accept.example` gives (`data-testid`), not the bare `probe` the rule would refuse.

**Mutants: what the shapes taught.** The first spec computed its `set` by diffing states — NaN keys and fresh objects read as changes on
every patch and bred 70 survivors a seed; the patches now name the keys the runtime WRITES (a Clear writes the author's Value and the start
value whether or not they move), and the off-page Clear writes the output regardless (one branch, not two twins). `field` / `pending`
(React's commit) join the page's synced keys. The painted-page scenarios run every act under the four Mounted / Enabled toggles as the
Button's do, plus: the rebuild (Enable Label toggling with every act, focused and disabled), the drain (every pointer act with a Set and an
empty Insert queued and a Clear after; each write alone, keyboard off and on; inside a rebuild, with a Focus action after), the remount's
announce inside an act, the stale read (two Sets and an Insert in one frame; Max
length 3), the remount's announce, and a Focus before the first frame. **The first two 10,000 runs each left ~30 swap survivors on
combinations no single-axis scenario reached (a disabled field remounted inside a release; a rebuild with one write queued; a touch
during a rebuild with an empty Insert queued), so one GENERATED scenario — the matrix — now plays every act × enabled / disabled × the
keyboard off / on × rebuild or not × remounting in the frame or not × nothing / a Set / an empty Insert / a writing Insert queued, each
segment ending with a Clear (orders the drain) and a Focus action (reads the page): 704 segments, 10,913 steps, 0 divergences on the
runtime (170 s a run), mutants ~3,000 and none surviving at 200 on three seeds.**

**Gate readings (2026-10-04, load 1.5–2.6).** Interpreter: CONFORMS at 200 on 13, 20729, 20730 (3,018 / 3,029 · 3,105 / 3,115 · 3,051 / 3,061
killed; `tests/batch-visual.test.ts` now pins seed 13 for every `person` spec). Runtime: CONFORMS at 200 on 20730 (0
divergences, 120 of 200 known rows — C61 89 · C62 21 · C63 7 · C65 3) and on 13; Button and Checkbox re-run on both seeds, unmoved. Deep
runs (s39 read them: s38 launched the third and cleared): the interpreter at 10,000 (seed 20729, the matrix in the suite, 2,358 s) — 68 / 68
scenarios, 0 divergences, 4,197 / 4,215 mutants killed, **8 swap twins left** (a hover or leave whose drain found both queued jobs Unchanged,
swapped with the act that drained nothing; a release or key inside a remount that announced the Value, swapped with the bare act or the
rebuild's reset — each on a disabled or already-focused field, to kill with a scenario or declare next); the runtime at 10,000 (s39 ran it):
10 divergences no row takes and 12 survivors — §7.4's gate readings and [TEXT-INPUT-DEEP-RUN-2026-10-04.md](TEXT-INPUT-DEEP-RUN-2026-10-04.md). Catalog parity 267 / 267; three stranger rounds green on the refreshed hashes; `node scripts/bugs.js check` — the
two problems it lists are a peer's P109 files; census regenerated (`T5 3/19`).

**Lessons.** (1) **Measure the ORDER, not just the values**: two writes and an act in one frame told the drain apart from the paint only in
a side-by-side trace; a single-step probe would have shown both targets agreeing. (2) **A component method the node calls reads React's
committed state**, which inside the runtime's frame is the previous one — look for `this.state` reads behind a node's actions. (3) A patch's
`set` names what the code WRITES, never what changed (a diff turns every NaN into a branch). (4) A derived-port rule with an `accept`
pattern needs the gate to probe with a name it accepts.

**Left (AC3):** 16 visual nodes: Dropdown (`choose`), Slider (`slide`), Radio Button (+ Group) through the same face; Group / Text / Image /
Circle / Icon / Columns / Video need the pointer, drop and scroll acts; Drag; then Repeater, Component Stack, Page Router, Component
Children (a boundary or a stack each). Every control with `addControlEventsAndStates` is a candidate for C68's shape (a component handler
after the spread) and for the drain's ordering. AC4 waits for NSP-017.

### 7.4 s39, 2026-10-04 — Dropdown conforms (110 of 147)

**Dropdown** (`net.noodl.controls.options`, 107 inputs — 12 logic, 95 classed — 23 outputs, 10 acts: the Checkbox's nine plus **`choose`** (an
option's value)): 48 scenarios (three marked `row`: C71, C65, C66 — one of them a 704-segment matrix); **the runtime 45 / 48 + 3 known and 0
divergences at seeds 13 and 20730; the interpreter at 13, 20729, 20730; mutants 1,290 / 1,296 killed at 13 (1,290 / 1,297 at 20729), 6 declared**
(`equivalent-mutants.ts`: the placing and the four pointer acts off the page, and a press / release / click / Tab / pick on a disabled element
during an Enable Label rebuild — the Checkbox's reasons). Ports from `gen-ports.js` (its classed block repeats `mounted`, which the logic block
declares — one line to drop). `src/nodes/dropdown.ts`, `scenarios/net.noodl.controls.options.json`, the face's `choose`, an `optionslist` pool in
`generate.ts` (a list, an option with no Value, items that are not options, nothing, and the legacy string form).

**The choice, four times over.** The spec keeps what the runtime keeps: the NODE'S VALUE (`_internal.value`, the output — a pick and the Value
input write it), the AUTHOR'S VALUE (`props.value` — the Value input writes it changed or not; the component's effect keys on it), the SHOWN
VALUE (the component's `useState` — a pick writes it at once; the effect writes it to the author's at the mount and at a render that saw a new
Items ARRAY by identity) and WHAT THE BROWSER SELECTS (`domSelected` — React controls the `<select>` while the shown value names an option;
otherwise the browser keeps what it had: a fresh element selects the hidden empty option, an option that left the list hands the selection to
the first enabled one — HTML's reset, written down and measured). The mount's and the array's effect end in `valueChanged(props.value)`: after a
pick the node takes the author's Value back, sends it and fires Changed with nobody picking (row D34). The runner's `set` hands the SAME
example array to both targets (the interpreter marks a set value external and never freezes it), so identity on the wire is one fact.

**The face's `choose`** (`node-spec-target.ts` PERSON): a keyboard pick — a disabled element takes none; only an enabled option the list offers
can be picked (the hidden empty option is disabled); the keyboard goes onto the element first (the focusing steps); picking the option already
selected raises no `change`; else the value through the element's PROTOTYPE setter, then `input` and `change`. A mouse pick is a press, a
choose and a release in a scenario.

**Two rules measured before they were written** (`zz` probes playing both targets, traces aligned, then the face instrumented to print
`el.value`, `selectedIndex` and the span):
- **The effect compares with the last RENDER, and a Value write that changes nothing never renders.** Placed on 'Option 2': pick 'Option 1',
  write Value 'Option 1' (no change — no render), write Value 'Option 2' (a change — a render whose `props.value` equals the last rendered
  'Option 2'): the effect does not run, the `<select>` and the span keep 'Option 1' while the output says 'Option 2', even with a frame between
  the writes (probe Pa). Row **C71**; the spec writes the shown value on every Value write that changes the node's value (the intent) and the
  runner knows the row (`pickWriteBackPick`: a pick of V, a Value write, a pick of V again, the difference on Value or Changed). A one-frame
  scenario of mine was C71-laden by construction (a pick and a write to the pick's value); it now goes through a third option.
- **The pre-act paint re-renders the node** (the holder's `forceUpdate` reaches the component, so an Items array written in the act's frame runs
  the effect before the act — the matrix's picked + Items segments agree on both targets), and the frame's end renders only what scheduled a
  render (the Value setter does not when the node's value stood).

**Rows** (ledger `node scripts/bugs.js --from P107`; the three shared setters C61–C63 reach 121 of the 200 runs at 13):
- **C70** (high) — Items wired a truthy value that is not a list (the legacy stored form is a string; a Text node or a backend field wired in
  delivers one), or a list holding null: Select.tsx :60 / :118 / :119 throw in the render; the whole page. 3 of 200 runs at 13 (`items: "x"`).
  ([P107-C70](../../bugs/p107-c70-a-dropdowns-items-wired-a-value-that-is-not-a-list-crashes-the-render.md))
- **C71** — a Value written back to the value React last rendered, after a pick, leaves the pick on the screen (above).
  ([P107-C71](../../bugs/p107-c71-a-dropdowns-value-written-back-after-a-pick-leaves-the-pick-on-the-screen.md))
- **D34** — a remount, or Items written again after a pick, takes the author's Value back and fires Changed with nobody picking; a Dropdown fed
  by a live list cannot keep a person's choice across a refresh.
  ([P107-D34](../../bugs/p107-d34-a-dropdown-fires-changed-with-nobody-picking-after-a-remount-or-an-items-write.md))
- Instances on existing rows: **C65** third and fourth (Select.tsx :245 renders `{props.label}` raw, :182 `{props.placeholder}` raw — 2 + 1 of 200
  runs at 13; `objectPlaceholder` joins the known rows), **C66** third — ON THE WIRE here (Select.tsx :188 and :235 share the root ref; label
  on → off nulls it and the Dropdown's Focus / Blur go through the root: Focus reports Unchanged with the dropdown on the page; scenario marked
  `row`, `lostRootAfterLabelOff` known for the Dropdown), **D30** (Mounted off, Enable Label changing — a new `<select>` each time).
- Not a row: a `<select>`'s pointer handlers are the control's (`Utils.controlEvents` spread last, Select.tsx :211) — no C68 shape; the
  component's own handler is `onChange` only. No Click output (`addControlEventsAndStates` adds none here); a click opens the list and picks
  nothing.

**Mutants: the matrix and the lost root.** The first runtime run left 14 swap twins differing by the rebuild's `elementFocused` reset on a
disabled element — killed on the interpreter by the C66 scenario, which the runtime excludes as a known row. Two hand scenarios now read the
keyboard through a Blur action after re-enabling (every act on a disabled element; Items rewritten, Enable Label turned on, or both, with the
act), which kills them on both. The matrix at first toggled the label on and off across segments, so after the first off every Focus action in
it read C66's lost root: **every segment now starts from a remount with the label off, and a rebuild in a segment is always off → on** (704
segments, 11,617 steps, ~60 s on the runtime). Killers the first interpreter run asked for: a Value written to the pick's value then Items
(the author's Value brought up to the pick — no Changed), Items written undefined (no opinion), and three acts inside a remount or an Items
write WITHOUT the trailing Focus action (the action hides a focus the act failed to take).

**Gate readings (2026-10-04, load 2–3).** Interpreter: CONFORMS at 200 on 13, 20729, 20730 (1,290 / 1,296 · 1,290 / 1,297 · 1,290 / 1,296 killed; 77–79 s each);
`tests/batch-visual.test.ts` lists the Dropdown. Runtime: CONFORMS at 200 on 13 (0 divergences, 124 of 200 known rows — C61 91 · C62 21 ·
C63 9 · C65 3 · C70 3, mutants 1,290 / 1,296, 102 s) and on 20730 (0 divergences, 132 of 200 known rows — C61 98 · C62 26 · C63 4 · C65 2 · C70 2, mutants 1,290 / 1,296, 103 s). Deep runs: the interpreter at 10,000 (seed 20729, 176 s) CONFORMS — 48 / 48, 0 divergences, 1,290 / 1,300 killed, the 10 reached beyond
the 200-run all declared, no survivor; the runtime at 10,000 (the day's seed, 348 s): 45 / 48 + 3 known, 10,000 run, 6,284 of them known rows (C61 4,534 · C62 1,130 ·
C63 300 · C65 49 on Label + 103 on Placeholder · C66 3 · C70 165), mutants 1,290 / 1,300 (the 10 declared), and ONE divergence the matchers
did not take: a `transformX` written undefined, shrunk to that one step — C63's throw (`undefined.value`), which `throwsOnSet`'s window
("the difference no later than the step after the set") misses in the unshrunk sequence; a matcher gap on a known row, not a Dropdown
finding — s40 widens the window to the next settle after measuring the unshrunk shape. **The Text Input's runtime 10,000** (s38's pending
step, run here): 67 / 68 + 1 known, 10,000 run, **10 divergences no row takes** (typed text landing before the field's text — `aabc` vs
`abca`, `false0` vs `fals0`; a Number field showing `""` where the spec says `42`; `null` vs `""` on the output; a Backspace Unchanged where
the spec pulses Text Changed) and **12 surviving mutants** beside the 10 declared — the shrunk sequences and the survivors are kept in
[TEXT-INPUT-DEEP-RUN-2026-10-04.md](TEXT-INPUT-DEEP-RUN-2026-10-04.md) so s40 need not re-run the hour. The Text Input conforms at 200 on
two seeds and not yet at 10,000. Catalog parity 270 / 270; package `nodegx-node-spec` 20 suites, 858 passed; `tsc --noEmit` exit 0 in
both packages; `node scripts/bugs.js check` — the three problems it lists are a peer's P109 files; census regenerated (`T5 4/19`). **The
runtime's full node-spec batch outgrew its ten-minute hook** (90 of 110 specs in 760 s, then every test red): the hook is thirty minutes
now; the 20 the cut batch never reached were run by name at 20730 and conform (States alone 134 s). Two specs do NOT conform at today's
seed 20730 and do at 20729 — NavigationClosePopup (one `afterInputs` drop-set surviving) and DbModel2 (two `modelId` swaps surviving):
seed-dependent kills no scenario pins, older than this session; left for s40.

**Lessons.** (1) **Instrument the face when two targets disagree on a pick**: three probes and one print of `el.value` / the span found C71's
general form in minutes where reasoning about React's effect deps had gone round twice. (2) **A known row of one scenario hides the kills it
made**: a scenario the runtime knows as a row is excluded from mutant grading, so a twin the interpreter kills there survives on the runtime —
kill it with a scenario the runtime passes. (3) **A generated matrix must not cross a known row's state**: C66's lost root after label off
would have read as a hundred divergences; start every segment from a state the row cannot reach. (4) **The parallel-Bash cwd trap again, twice**
(a runtime run executed in the wrong package; a ledger read failed): one Bash call per run, absolute paths, never two heavy calls at once.

**Left (AC3):** 15 visual nodes: Slider (`slide`; the browser clamps and steps a range input's value — write that rule in the face), Radio Button
(+ Group, a graph scenario — the group owns the value) through the same face; Group / Text / Image / Circle / Icon / Columns / Video need the
pointer, drop and scroll acts; Drag; then Repeater, Component Stack, Page Router, Component Children (a boundary or a stack each). Every control
whose component keeps the value in `useState` and follows the node through an effect (Checkbox, Dropdown — the Slider and Radio Button are to be
read for it) is a candidate for C67 / C71's shape. AC4 waits for NSP-017.

### 7.5 s40, 2026-10-04 — the Text Input at 10,000: six rules, two rows, the caret and the turn

**The ten divergences the runtime's 10,000 run left (§7.4, [TEXT-INPUT-DEEP-RUN-2026-10-04.md](TEXT-INPUT-DEEP-RUN-2026-10-04.md)), each
replayed on both targets with the traces aligned (a `zz` test playing the shrunk sequence on the interpreter and the runtime, printing the two
traces side by side), fall into six rules — none a face gap, one the SPEC's own mistake:**

1. **`maxlength="-0.5"` is a limit of 0.** HTML's rules for parsing a non-negative integer take the sign, then the leading digits; `-0` is not
   negative, so the attribute reads 0 and every key is refused — jsdom reflects it so and a browser types nothing. The spec's parse had refused
   the sign and read "no limit" (three of the ten). The face was right; `maxLengthAttribute` now follows HTML (`-1` is still no limit). Measured
   with a bare jsdom before the spec was touched.
2. **The component converts and measures with the props it LAST RENDERED** — row **C72** (low). `TextInput.setText` converts the published
   value with `this.props.type` (:94) and `edit` measures an Insert Text's room with `this.props.maxLength` (:346); the holder's render hands the
   component the node's props at the frame's end, so a Type turned Number with a Clear or a Backspace in the same frame publishes `''` where the
   next frame says `null`, and a Max length written with an Insert Text is measured next frame. The spec keeps `shownType` / `shownMaxLength`
   (synced at each paint; `shownType` replaces `areaOn`). The C69 family — the component reads React's last commit, here its props.
3. **React commits a graph write at the frame's end — or at the next turn of the event loop.** The runtime target's `advance` yields to the
   event loop before the clock moves, and React commits the component's own `setState` there (a Backspace, `advance 0`, then an Insert Text at
   the frame's end found the shortened text — two of the ten); the node's props still wait for the holder's render. **New world-handler kind
   `turn`** (spec.ts `WorldHandlers.turn`, the four places: the erased `AnyNodeSpec.world`, interpreter.ts `Inbound` / `handleInbound` /
   `advance` — pushed to every listening instance after what the world already delivered and before the clock moves — and
   runner/mutants.ts `reducerNames` / `wrapReducers`). The Text Input's `turn` commits `pending` through the same `committed` helper the paint
   uses. A `settle` is one task with the frame's end inside it: nothing turns there.
4. **The caret is HTML's, and the face must type at it.** Measured through jsdom, which follows the spec: a fresh `<input>` has its text entry
   cursor at the END (React assigns `node.value`; the setter moves the cursor to the end when the API value changed); a fresh `<textarea>` at the
   START (React writes its default content, then sets the same text, which moves nothing); a type change from a type WITHOUT the selection API
   (email, number) to one with it (text, url, password) puts it at the start (HTML's type change steps — the run's `abca`); a keystroke leaves it
   after the key; a committed graph write moves it to the end of the new value when the API value changed; an `edit`'s callback then sets it
   after what was written if the field has the keyboard (:359-369). The component's `edit` reads the selection only once the field has held
   focus (`hadCaret`, :319 — set by the element's `onFocus`, a Focus ACTION included) and only on a type that has one. **Row D35** (low): a Text
   Area given a Focus action and then an Insert Text writes at the START of its text; a field whose Type moved from Email or Number to Text
   inserts at the start too — the browser's rule faithfully applied, the question being whether a Focus action should count as a caret the person
   placed. The spec keeps `caret`, `hadCaret`, `editCaret` (the first two synced); **the face's `typeKey` now writes each key at
   `selectionStart` / `selectionEnd` on a type with the API (appending on email and number) and puts the cursor back after the key**, as a
   keystroke leaves it — the face had typed at the end whatever the cursor said (probe P4: a focused fresh Text Area typed at the end on both
   targets, both wrong against a browser).
5. **The wire keeps the last DEFINED value while the getter reads undefined** ([[last-sent-value]], s4's rule met inside ONE patch): off the page,
   an Insert Text then a Set with no Value ever written (`setText(undefined)`) in one frame — the Insert's `'0'` is sent at its flag, the Set's
   `undefined` never is, and the interpreter's observation reads the state at the END of the drain's patch. State `wire` beside `out` (every
   writer writes both; `wire` keeps its value on an undefined write); the Value output reads `wire`, the Done / Unchanged comparisons read `out`.
6. (The tenth, `[object Object]0`, is rule 4's Text Area.)

**Scenarios:** nine hand scenarios added (77 now): the `-0.5` / `-1` / `0` limits; C72's Type and Max length in the same frame; the turn
(Backspace, `advance 0`, Insert; Clear, a turn, Backspace); the Text Area's start cursor through Insert, typing, Backspace and a Blur; the
`<input>`'s end cursor through a Value write and a label rebuild; the Email → Text and Text → Text Area cursors; the off-page wire; and a
Blur-reading one (focused, disabled, Enabled on with each act and a Blur action in the same frame) that kills the `person.key` drop-set the
deep run and seed 13 both left (an Enter on a focused field whose paint re-enabled it: its own set is empty, so only an action reading the
paint's syncs can tell the drop). The Clear's declared equivalent now names `wire` (the shape grew the key).

**The two seed-dependent survivors from §7.4** (the full runtime batch at 20730, not 20729) reproduced on the interpreter in a second
(the mutants are graded there), and are pinned: **NavigationClosePopup** — Close and two actions in one frame, then a quiet frame and a
later action (a frame end that kept its `pending` would close again); **DbModel2** — the two `modelId` swap twins. The second needed the
mechanism read: a swap hands the sibling branch's RECORDED EXAMPLE, and the `{"set":["modelId"]}` shape holds two code paths (the passive
write, `send: ['id']`; and a bind whose `bound` did not move, `send: []`) — the example was the second's, `modelId: null` with no send, which
the Id output (bound first) never shows. A Fetch reads `modelId` itself (`null` is neither undefined nor empty: it is called for; `''` fails
with the missing-Id message) and tells them apart; a passive Id then a repeat after a different path tells the other twin. Both conform at
13, 20729 and 20730 now. (A shape that holds two code paths with different `send`s is a bucket worth splitting — noted, not done.)

**Gate readings (2026-10-04, load 2–3).** Interpreter: CONFORMS at 200 on 13 (77 / 77, 3,074 / 3,086 killed, 12 declared), 20729 (3,147 /
3,160) and 20730 (3,107 / 3,117); the 10,000 run below. Runtime: CONFORMS at 200 on 13 (76 / 77 + 1 known, 0 divergences, 3,074 / 3,086, 189 s)
and on 20730 (76 / 77 + 1 known, 0 divergences, 3,107 / 3,117, 184 s). `tsc --noEmit` exit 0 in `nodegx-node-spec` and `nodegx-export`;
stranger hashes refreshed (spec.ts is guarded) and `tests/stranger.test.ts` green (41 passed, the 17 skipped are the rounds' optional
re-grades); the package suite green (20 suites, 858 passed, zz probes excluded). Rows C72 and D35 filed (`node scripts/bugs.js check`: 221 valid).
Committed `11a831b26`.

**Deep runs.** The interpreter at 10,000 (seed 20729, the matrix in, 2,296 s): 77 / 77, **0 divergences**, 4,198 / 4,217 killed — **10 swap twins**
of s38's two families: a hover, leave, click or release whose drain answered a Set (absorbed: the field had the keyboard) and an empty Insert Text
both Unchanged, swapped with the act that drained nothing (the frame's end would answer them — after a Clear pressed in between, where the
drain answers them before it); and a release or an Enter on a DISABLED field whose paint remounted it, swapped with the bare act (a Focus
action after it in the same frame finds the element on the page, Done — or, with no remount yet, Unchanged). Two scenarios written for them
(79 now; both every act); at 200 on 20729 they reach the branches (3,555 / 3,568 killed, from 3,147 / 3,160 before them) and nothing survives;
the 10,000 re-run (chain C, 1,645 s): 79 / 79, 0 divergences, 4,398 / 4,409 killed, **the ten down to two** — a release whose drain landed a
Set AND a writing Insert Text (both Done), swapped with the bare release or its rebuild twin; no scenario had queued both writes with text, so
nothing ordered them against a Clear. An 81st scenario does (every pointer act; an `<input>`'s press drains nothing, C68): at 200 with the 81
the interpreter CONFORMS at 20729 (81 / 81, 3,946 / 3,959 killed — the two branches reached and killed), 13 (3,906 / 3,918) and 20730
(3,945 / 3,955), and the runtime at 20730 (80 / 81 + 1 known, 3,945 / 3,955, 300 s) (chain E); the third 10,000 is owed to s41 if it wants the
number. **The runtime at 10,000** (the day's
seed 20730 — the deep describe takes no `NSP_SEED`; 3,003 s, heap 8192): 76 / 77 + 1 known, 10,000 run, **0 divergences** (the examples it
prints are the known rows' — C61, C62, C63, C65 and a unit object on Value, C6), 4,365 / 4,378 killed and **three `afterInputs` drop-sets
alive**: a frame end that answers a queued press AND mounts or unmounts the element (a Set Unchanged off the page then Did Mount; an empty
Insert then Will Unmount; a Set Done and an empty Insert then Will Unmount) — dropped, the queue is kept and the next frame answers the press
again, which only a second frame can read, and the generated sequences ended there. One scenario with the three segments and a quiet frame
after each (80 now) — graded at 200: the interpreter at 13 (3,605 / 3,617) and 20730 (3,642 / 3,652) CONFORMS with the 80 (chain C); the
runtime at 13 (80 / 81 + 1 known, 3,906 / 3,918, 286 s) and 20730 (80 / 81 + 1 known, 3,945 / 3,955, 298 s) CONFORMS with all 81 (chain D —
scenario 81 was in by then). The ten divergences of s39's run are gone: **the Text Input conforms at 10,000 on the runtime.**

**Lessons.** (1) **Measure the attribute's parse, not the runner's first explanation**: the `-0.5` divergence read as "the face refuses what the
browser allows" until a bare jsdom printed `maxLength` 0 and HTML's parse agreed — the spec was the one wrong, and the face would have been
"fixed" into a lie. (2) **A cursor is state the spec must carry once a face types at it**: the face's "the end, here" was a choice that read as
a rule for two sessions; HTML names where the cursor is in every case met, and jsdom follows it — nothing here is a jsdom gap. (3) **A swap hands
an EXAMPLE, and a shape can hold two code paths**: a twin that "cannot be killed" may be carrying the other path's values; print the branch
examples (`discoverBranches` after the scenarios) before declaring. (4) **An event-loop turn is not a frame**: the runtime target's `advance`
commits React and runs no frame end; the format needed the distinction (`turn`), not a wider `afterInputs`.

### 7.6 s41, 2026-10-04 — Slider and Icon conform (112 of 147)

**The Slider** (`net.noodl.controls.range`, [slider.ts](../../../packages/nodegx-node-spec/src/nodes/slider.ts), 45 scenarios) — read from
`nodes/controls/slider.ts`, `components/controls/Slider/Slider.tsx` and `react-component-node.ts` (`initialize`, `defineRegularInputProp`).
The Dropdown's page model and control ports; what differs is the slide, and four copies of the value the spec keeps apart because the runtime
does: **the author's Value** (`props.value`: Min at the making, then what the Value input writes — empty abstains, not-a-number abstains with a
runtime error, else `Math.max(Min, Math.min(Max, n))` over the props AS WRITTEN, kept when `!==`; Min and Max re-clamp it in their `onChange`),
**the node's value** (`_internal.outputValue`, 0 at the making — what the Value output reads; `updateOutputValue(v)` sends it and FIRES CHANGED
on any `!==`, whoever calls it), **the shown value** (the component's `useState`; a slide writes it, the effect `[props.value]` writes it to the
author's at the mount and at a render whose author's Value differs by `Object.is`, then calls `updateOutputValue`), and **what the browser
holds** (the shown value sanitized by the browser's range rules against the rendered attributes — read only by the slide's no-change rule).
No `world.turn`: the component's own `setState` calls happen inside React events and the effect, which the paint commits.

**The face's new act, `slide`** ([node-spec-target.ts](../../../packages/noodl-runtime/test/helpers/node-spec-target.ts) `personActs`,
`browserRangeValue`): a keyboard slide — a disabled element takes none; the keyboard goes onto the element first; the value lands as the
BROWSER sanitizes it; a slide to the value already held raises nothing; else the prototype setter, `input`, `change`. **jsdom clamps a range
input's value but never rounds it to the step** (form-controls.js, the `range` case), so the face writes HTML's step-mismatch rule itself
(Chromium `StepRange::ClampValue`: round from the step base — `min`, else the `value` attribute, else 0 — a tie upwards, step back inside when
the rounding leaves the range; a `step` that is not a positive number is the default 1; `max` below `min` is `min`) and reads the held value the
same way. Number arithmetic, exact for the dyadic steps the scenarios use (a browser uses decimal). Probe: Value 33.5 with Step 1 — a slide to
34 raises nothing (the browser already shows 34; jsdom alone would have said `"33.5"` → `"34"` and fired Changed).

**Measured side by side before any scenario** (a `zz` probe playing sixteen cases on both targets, traces aligned): all sixteen identical on
the first run, so the traces were printed and read — real slides, real effects, the step rule exercised. Then the conformance runs found ONE
more rule: **the runtime STORES a recomputed Value Percent whatever `!==` says** (`this._internal.valuePercent = valuePercent` before the
`changed && flagOutputDirty`), so a `-0` (Min `"1e3"` above Max `"5"`: `Math.floor(0 / -995 * 100)`) replaces a `0` unsent and is read by the
next send — the spec now keeps it by `Object.is` and sends it by `!==` (five of seed 13's divergences, all `valuePercent: 0` vs `-0`).

**Rows (the spec models today's behaviour in all four — the runtime is self-consistent in each, unlike C71, so no `row` scenario):**
- **D36** (medium): **Changed fires with nobody sliding** — a Value written from the graph (the description says it does not), a Min or Max
  that clamps the value, a slider placed with Min 10, a remount after a slide (the mount's effect takes the author's Value back), and every
  report while Value Percent is NaN. The effect calls the same `updateOutputValue` a slide does. The Dropdown's D34, wider.
- **C73** (medium): **a Value written back after a slide does nothing** when it equals the last Value the author wrote — the slide never moved
  `props.value`, so a Reset to the default leaves the handle at the person's 70. C71's shape on the Slider (here the output does not move either).
- **C74** (low): **the Value output disagrees with the handle** — a slid 80 survives Max lowered to 60 (the browser draws 60; sliding to 60 or 70
  raises nothing); Value 33.5 with Step 1 reads 33.5 while the browser shows 34; Value Percent keeps its figure when Min or Max moves.
- **C75** (low): **Min equal to Max reports Value Percent NaN** (`0 / 0`), re-flagged on every report; a Min written undefined makes the author's
  Value NaN.

**Mutants.** Seed 13 left three: the placing off the page (declared, the Button's PLACED_OFF_PAGE) and two swaps between a remount with a
Tab / slide on an enabled element and on a disabled one — the matrix closes every segment with a Focus action in the same frame, and a frame's
signals are grouped, so the act's Focused and the action's cannot be told apart; the Dropdown's "remount and a Tab in one frame" scenarios
(no action after) kill them, and had not been carried over. Seed 20729 left two the generated sequences alone reached: **a press on a focused
element was only ever reached with the button already held** — the matrix's reset released nothing, so every later press found Pressed true
(the reset now ends with a `leave`); and a remount whose effect changes the Value but not the Value Percent (30.5 → 30) under a Tab away —
one scenario runs that remount under every act. 1,140 / 1,141 at 13 and 20729, 1,172 / 1,173 at 20730.

**Catalog parity** says the Slider derives no ports (its catalog entry lists only `declared-port-groups`, though its `parameterEncoding`
names the Data Attributes pattern) — so no `derived`, the Button's and the Checkbox's way. **Known rows:** C62 and C63 only (no label, no
text style — C61 cannot fire, and the "each row still fires" gate said so); two hand `row` scenarios (Margin Top null, Pos X undefined).

**Gate readings (2026-10-04, load 2–4).** Interpreter: CONFORMS at 200 on 13 (41 / 41, 1,140 / 1,141), 20729 (1,140 / 1,141) and 20730
(1,172 / 1,173) with 41 scenarios. Runtime: CONFORMS at 200 on 13 (39 / 41 + 2 known, 0 divergences, 26 throws attributed to C62 / C63,
68 s) and 20730 (39 / 41 + 2 known, 0 divergences, 71 s). The package suite green (20 suites, 862 passed, zz excluded; the visual batch's
list grew the Slider); `tsc --noEmit` exit 0; `node scripts/bugs.js check` every header valid. Committed `d7ef6a87a`.

**The runtime at 10,000 (the day's seed 20730, 1,264 s): 10 divergences, one rule — the face read the attributes as Chromium does and jsdom
reads them as HTML does.** Every one shrank to Max wired an ARRAY (`[1, 2]`) and a slide: React writes the attribute `"1,2"`; the face's
strict parse (Chromium's `ParseToDoubleForNumberType` reads the whole string) called it no number — Max 100 — while jsdom's conversion is HTML's
rules for parsing floating-point number values, a PREFIX parse (`parseFloatingPointNumber`: ASCII whitespace, `parseFloat`, finite), so Max 1;
the face wrote 100 and jsdom re-sanitized it to 1, which is what React's `onChange` read. **jsdom re-sanitizes whatever the face writes, so the
face cannot play a rule jsdom does not share**: the face and the spec now read `min` / `max` / `step` as jsdom does (lenient; the VALUE itself
strictly, as jsdom checks it), and apply jsdom's clamp (not a valid number → the middle; below Min → Min; else above Max → Max) plus the one
browser rule jsdom lacks, the step. Replaying the ten and twelve more shapes on both targets found the second half: **a REVERSED range (Max below
Min — `"1,2"` under Min 3, or Min `"1e3"` over Max `"5"`) does not settle under jsdom** (a value at or above Min becomes Max, below Min becomes
Min, so what the element holds depends on the history of React's re-writes) where HTML clamps no overflow on a reversed range and Chromium
raises Max to Min. Recorded as a face choice beside the Number field's sign mid-entry: **a slide on a reversed range is not played** (no
keyboard, no value), in the face and in the spec. Two scenarios pin it (Max `[1, 2]`; Min 50 over Max 10 — 43 now). The interpreter's 10,000
run that had begun on the old rule was stopped (by its parent pid) and both reruns are below.

**The second deep runs (the jsdom rule in).** The runtime at 10,000 (20730, 1,198 s): **0 divergences**, the C62 / C63 throws attributed
(589, 706), 1,497 / 1,505 killed and seven alive; the interpreter at 10,000 (20729, 713 s): 0 divergences, 1,522 / 1,528, five alive. Three
families: (1) a leave, lift or touch on a node OFF the page (its set holds only the page syncs) — the Dropdown's declared ACT_OFF_PAGE twin,
declared here too; (2) a remount on a DISABLED element under a click, a press or a Focus — the every-act remount scenario had enabled
segments only; it now runs each act disabled as well; (3) swaps differing only in `percent` — the branch examples printed (`discoverBranches`
over the scenarios and the 20730 run) showed the release sibling storing a silent `-0` (visible only through the FIRST frame's report: a
release before the first frame kills it) and the press sibling a NaN case (a press whose paint runs the effect with the Value moving and the
percent not — Value 30.25 after a slide to 30.5, Step 0.5 — kills it, with every other act). The new scenarios at first closed each segment
with a Focus action and so masked the act's own Focused again (§7.6 above); enabled segments now close with a Blur action (it gives up a
keyboard the act took), disabled ones with a Focus action (Done only on the page). 45 scenarios: the interpreter CONFORMS at 200 on 13
(1,612 / 1,613), 20729 (1,644 / 1,645) and 20730 (1,612 / 1,613); the runtime at 13 and 20730 (43 / 45 + 2 known, 0 divergences, 93 s).

**The Icon's 10,000** (the same runtime run, 104 s): 0 survivors and ONE divergence — unshrunk (a `zz` replay of the generated sequence from
its seed), Transform Origin X held an OBJECT (`{}`) and was then written `null`: node.ts :416 merges a bare value into the port's held unit
object only while that object HAS a `unit`, so the null reached the Placement setter raw and `null.value` threw. C63's defect (the unguarded
Placement setters) — its matcher took only `undefined`; widened to `null` with its own message, and the row says so. (The shrinker had
reduced it to an undefined, which C63 would take; attribution reads the original.) The interpreter's 10,000 for the Icon CONFORMS (4 s).

**The third deep runs (45 scenarios, C63 widened).** The runtime at 10,000 (20730, 711 s for both nodes): **the Slider 0 divergences**,
1,704 / 1,709 killed — four declared (the placing and three acts off the page) and ONE alive: the release swap into the sibling whose recorded
example stores Value Percent `-0` unsent. The release-before-the-first-frame scenario reaches the original branch and does not kill it: the
first frame's report is taken before an act's patch can show, and a `-0` stored where `0` was is read by nothing (`!percent` reads both as
falsy; `p !== percent` calls them equal; the output is read only when a recompute has just stored the value it sends) — declared, exact
shapes (`SILENT_NEGATIVE_ZERO`). **The Icon CONFORMS at 10,000** (0 divergences — the null shape now C63's, 649 attributed — 105 / 105).
**The interpreter at 10,000 (20729, 186 s): the Slider CONFORMS** — 45 / 45, 0 divergences, 1,696 / 1,700 killed, 4 declared. The package
suite green after the declaration (20 suites, 866 passed, zz probes deleted).

**The Icon** (`net.noodl.visual.icon`, [icon.ts](../../../packages/nodegx-node-spec/src/nodes/icon.ts), 10 scenarios) — the smallest visual:
no output of its own, no handler, a `<div>` that takes no keyboard; 34 inputs, of which Mounted and Scroll Into View are logic. The spec is the
page — Did Mount at the paint that puts it on, Will Unmount at the paint that takes it off, at a person's act or at the frame's end — and nine
acts that raise nothing but that paint. Seed 13 left 17 survivors, one family: an act's paint (mount or unmount) swapped for nothing, which
the frame's end repaints identically; only a Mounted write AFTER the act in the same frame tells them apart (off, act, on → Will Unmount and
Did Mount; from off, on, act, off → Did Mount and Will Unmount) — one scenario, every act. Then 105 / 105 at 13, 20729 and 20730; the runtime
CONFORMS at 13 and 20730 (8 / 10 + 2 known — C62, C63 — 0 divergences, 2.6 s), traces printed (Will Unmount at the hover's paint, Did Mount at
the frame's end).

**Left after s41 — every remaining visual needs a piece of infrastructure first:** a VISUAL TREE with context (Radio Button reads its Radio
Button Group through React context, `radiobuttoncontext.ts`; Component Children, Repeater and the stacks place children) — the graph format
has no `act` step and no parent–child edge, and the interpreter no context; DRAG AND DROP (Text, Image, Circle and Group carry
`addDragDropPorts` / `addFileDropPorts` — drag-drop.ts, 967 lines, drop zones, hold timers, file drops); GEOMETRY (Columns picks its breakpoint
from its CONTAINER's width, which jsdom measures as 0 — a spec would be grading jsdom); MEDIA (Video). Recommended order: the tree (four or
five nodes), then drag and drop (four), then geometry with NSP-017.

**Lessons.** (1) **A first-run green is a reason to print the traces, not to stop**: all sixteen probe cases agreed, and reading them showed
the face's step rule really exercised — a run that compared two empty traces would also have agreed. (2) **A matrix's reset owes every state
a person can leave behind** — Pressed survives a remount, so a reset without a release made "press on a focused element" a branch only a
random sequence could reach. (3) **A store and a flag can read different comparisons**: the runtime stores whatever it computed and flags by
`!==`; a spec that sets only on change loses the `-0` the next send reads. (4) **jsdom is not the browser for a range input** — it clamps and
never steps; the face writes the browser's rule, as the memory says the face must — (5) **but only a rule jsdom will keep**: jsdom
re-sanitizes every value the face writes, so where jsdom and a browser disagree on a rule jsdom applies (the attribute parse, a reversed
range), the face reads as jsdom and the disagreement is written down as a face choice, not played.

### 7.7 s42, 2026-10-04 — the Radio Button Group and the Radio Button conform (114 of 147): the visual tree, per node

**The design (not a ruling — an engineering choice, recorded).** s41 recommended a graph-format change (parent–child edges, an `act`
step, a context hook) for the visual tree. Read against what "conforms" counts, it was the wrong first move: a graph scenario is graded
against a RECORDED runtime trace (graph.ts WHO IS THE REFERENCE — there is no graph interpreter), so it would add tests, not specs, and
every one of the 112 is a per-node spec with a generator, mutants and a 10,000 run. A parent's context is, from the node's side, its
WORLD — the ROUTE seam already models "the Router whose page a Page Inputs sits in" that way. So:
- **a node with children** carries them on its PAGE: the spec declares them (here `PAGE_VALUES`, the Values of the four Radio Buttons the
  group holds — `'a'`, `'b'`, the number 1, and one with no Value), the target builds them when it puts the node on the page (real nodes,
  added through the node's own `addChild`, not subjects), and a person acts on a child through an act of the PARENT's (`pick`, a click on
  the child whose Value is the act's — no value: the child with none). No format change: `acts.pick.values` is the page, and an act value
  of `undefined` is already "no value" in the generator and the JSON.
- **a node inside a parent** (the Radio Button, next) gets the parent as a world seam: GROUP — present or not, its Value at load, the graph
  writing its Value at a time on the clock — and its siblings on the page for the same `pick`.

**The Radio Button Group** (`Radio Button Group`, [radiobuttongroup.ts](../../../packages/nodegx-node-spec/src/nodes/radiobuttongroup.ts),
21 scenarios) — read from `radiobuttongroup.ts`, `RadioButtonGroup.tsx`, `RadioButton.tsx` and `react-component-node.ts`. A pick moves
the Value and fires Changed exactly when the picked button's Value is not the one the group holds (a click on a selected radio raises no
`change`); the Value input converts by `toString` and ignores null / undefined, and never fires Changed; a STRICT compare decides which
button is selected — the number 1 is not `"1"`, and while the group's Value has never been written the button with NO Value is the
selected one; Children Count (4) is sent in the first frame whether or not the group is mounted (each `addChild` schedules it). The
spec keeps three values apart because the component does: the node's Value, the Value its last PAINT rendered, and the selection
(`useState`, synced by an effect on `props.value`) — `rendered` and `selected` are `synced` (the Slider's `shown`).

**The face** ([node-spec-target.ts](../../../packages/noodl-runtime/test/helpers/node-spec-target.ts)): `putOnPage` builds a Radio Button
Group's buttons (one `net.noodl.controls.radiobutton` per `acts.pick.values`, its Value set, `addChild` before the first render) and
`takeOffPage` deletes them; `pick` is a `click` on the picked child's control (`pickedElement`; a Value no child carries, or a child off
the page, is nothing). `VIEWER_VISUAL_NODES` gained `controls/radiobuttongroup` and `controls/radiobutton`.

**Row C76** (medium, [the ledger](../../bugs/p107-c76-a-radio-groups-value-written-back-in-the-pick-frame-leaves-the-pick-selected.md)) —
**a Value written back in the same frame as a pick leaves the picked button selected** under a Value that names another: each render of
the node hands React a fresh COPY of the props (react-component-node.ts :1076-1103) and the component's own re-render after a pick reuses
the last paint's copy, so the effect `[props.value]` compares with what the last paint rendered; the write-back equals it and the effect
never runs. Picking that button again raises nothing; picking the one the Value names selects it and fires NO Changed. Found by the
side-by-side probe on the scenarios' first run (the runtime held the pick). The family of C71 (Dropdown) and C67 (Checkbox). The spec
models it (both targets agree), two scenarios name it.

**Lessons.** (1) **A person reducer is `(state, inputs, value, world)`** — written `(s, v)` the act read the INPUTS as its value, `pick`
did nothing on the interpreter, and the interpreter's own conformance was green at three seeds (it grades the spec against itself;
28 / 28 mutants, because the dead branch had none). The side-by-side probe showed the runtime picking and the interpreter not; fixed,
the mutants went 28 → 36. A green interpreter run says the spec is self-consistent, never that it does anything. (2) **A pre-act paint's
sync is equivalent to the frame end's** when the synced state is a function of what the paint compares — five swap / drop survivors of
the pick's paint branch went when `rendered` / `selected` were declared `synced`, the Slider's precedent. (3) The 10,000 run reached an
act whose paint MOUNTS and which picks nothing (placed off, Mounted on, a pick of no button, Mounted off) — 200 sequences never did; one
scenario.

**Gate readings (2026-10-04, load 3–5).** Interpreter: CONFORMS at 200 on 13, 20729 and 20730 (21 / 21, 48 / 48 mutants each) and at
10,000 on 20729 (0 divergences, 48 / 48). Runtime: CONFORMS at 200 on 13 (19 / 21 + 2 known — C62, C63 — 0 divergences, 48 / 48) and
20730 (18 / 20 + 2 known before the 21st scenario; 0 divergences), and at 10,000 on 20730 (140 s, 0 divergences, 1,159 throws attributed
to C62 and 640 to C63, 48 / 48). The side-by-side probe (every scenario on both targets, traces printed): identical but the two known
rows. The package suite green (20 suites, 870 passed, zz excluded; the visual batch's list grew the group); `tsc --noEmit` exit 0 on
both packages; `node scripts/bugs.js check` 227 headers valid.

**The GROUP seam (world.ts GROUP, an additive format change).** The Radio Button reads its group through React context and has no
port naming it, so the group is its WORLD: `WorldScript.group` — `none: true` (no group), `value` (the group's Value parameter at
load, raw), `writes` (the graph writing the group's Value input, each `at` ≥ 1 ms, raw). Four places, as `turn`'s were: spec.ts (the
`group` need, `WorldView.group()`, `WorldHandlers.group` and the erased handler, `WorldPool.groups`), interpreter.ts (the writes
scheduled on the clock after `place`, the inbound kind), runner/mutants.ts (`world.group` named and wrapped), runner/generate.ts (the
default pool: none, one never written, one with a Value at load, one written three times). The runtime target holds a REAL group
(`putOnPage`: the group made in the node's scope, its Value set at load, the node then its siblings added with `addChild`, the writes
scheduled on the world's clock, the page rendering the group) and two face rules: **a paint on a group's page drops the group's
memoised children** (`cachedChildren`) so the node renders from what it holds — as the frame's end would — and not from the element
the group last built; **the element a person sees of the node is its OWN control** — by the `id` its input renders — never "the first
control in the container" (with the button unmounted that was a SIBLING's: the first side-by-side run clicked the sibling).

**The Radio Button** (`net.noodl.controls.radiobutton`, [radiobutton.ts](../../../packages/nodegx-node-spec/src/nodes/radiobutton.ts),
147 scenarios, 10 acts) — the Checkbox's page model with the tick replaced by the group's: selected when the group's selection `===` the
Value the button last RENDERED (a strict compare; no group, never); the node's Checked follows through the component's effect, which
fires Changed when the GROUP's last selection was a person's. The spec keeps what the components keep: the button's Value as written
and as rendered; the group's Value, the Value its last paint rendered, its selection and whether a person made it. In one paint React
renders both and runs the BUTTON's effect first, then the group's (which moves the selection to a newly rendered Value, nobody's) and
the button's again. A click hands the group the Value the button last rendered; a `pick` (a sibling, `SIBLINGS` = `'a'`, `'b'`) first
moves the keyboard (the mousedown — Blurred, if this button held it). 26 scenarios are the Checkbox's page model carried over (the
ones not about its tick), reworded.

**Row D37** (medium, [the ledger](../../bugs/p107-d37-a-radio-button-fires-changed-for-a-selection-it-did-not-get.md)) — **Changed
fires for a change of Checked nobody made to this button**: the flag the effect reads is the group's last SELECTION's, not this
button's change — a sibling carrying the same Value picked (both selected, both fire), this button's Value written in the frame of a
pick (its effect runs before the group's clears the flag), a remount in C76's state. **C76 seen from a button**: a pick and a
write-back in one frame leave the selection a person's across frames — the button stays Checked under a group Value naming another.

**Mutants.** The act's pre-paint does the frame end's work early — the group's effect and the button's second effect — so every act
minted twin branches that differ only in WHEN Checked and the selection moved (589 mutants, 30 alive at first). Two scenario families
killed what is readable (a person's pick, a graph write, an act, this button's Value written away — all in one frame; the same with the
button unmounted around the act), and the rest were declared what they are: `checked`, `gSelected` and `gFromUser` are `synced` (the
Slider's `shown` precedent — the node's Checked here mirrors the page through the component's effect; Changed stays in every shape).
The Checkbox's three equivalence declarations carry over, the rebuild family gaining `click` (a click on a disabled button meets
nothing, as a press does). **The 10,000 run then reached every pre-paint of a pick** (none, unmount, mount, an Enable Label rebuild,
the keyboard moving away) crossed with its three selections (the group takes the Value; C76's state — it holds it already; the sibling
already selected) and with whether this button carries the Value: 26 swaps alive. A GRID answers it — 60 scenarios, each read a frame
later by this button's Value written to or away from the pick (whether the selection is still a person's), mirrored with the two
siblings exchanged (a swap hands a recorded example — s40 — and every first-grid pick was of `'a'`, so the swapped patch was the
original's), a Focus action after the pick where its paint mounts or unmounts the button, a Blur action where a rebuild took the
keyboard. One declared: a pick that moves only Checked, handed a sibling's example that also sets `elementFocused` — every pick
sets it false, and here it is false already.

**Lessons.** (4) **Nothing grades a scenario's NAME** — the interpreter plays the spec against itself and the runtime against the
interpreter, so a scenario named for a state its steps never reach passes everywhere. Two "C76 seen from a button" scenarios had a frame
between the pick and the write-back (the group's effect ran in it) and one remount scenario claimed a Changed the pick's frame end had
already prevented; printing each named scenario's trace (`zz-one`) caught all three. (5) **A face fallback is a claim about the page**:
"the first control in the node's container" was right for a node alone on its page and wrong the day the page held its siblings.

**The Radio Button's gate readings (2026-10-04, load 2–5, the final 147 scenarios).** Interpreter: CONFORMS at 200 on 13 (755 / 763
mutants, 8 declared), 20729 (741 / 744) and 20730 (741 / 745), and at 10,000 on 20729 (788 / 798) and 20730 (862 / 872; 0 divergences
on both). Runtime: CONFORMS at 200 on 13 and 20730 (143 / 147 + 4 known — C62, C63, C65, C66 — 0 divergences; 80 and 77 throws
attributed to C61 / C62 / C63 / C65); at 10,000 on 20730 (1,081 s, an earlier 84-scenario set): 0 divergences, 3,913 throws attributed
(C61 2,646, C62 739, C63 465, C65 59, C66 4). The Radio Button Group re-run at 13 and 20730 after the face's rewrite: CONFORMS, 0
divergences, 48 / 48; at 10,000 on 20730 again 0 divergences. The side-by-side probe: every scenario identical but the four known rows.
Stranger hashes refreshed (exactly spec.ts and world.ts), the three rounds green (41 passed). The package suite green (20 suites, 874
passed); the runtime's graph and target suites green (102 passed); `tsc --noEmit` exit 0 on both packages; `node scripts/bugs.js check`
valid.

### 7.8 s43, 2026-10-05 — drag and drop researched, the Text conforms (115 of 147), and the face learns the browser's hit test

**The research** ([RESEARCH-DRAG-DROP.md](RESEARCH-DRAG-DROP.md)). It covers what a drag and a file drop are (drag-drop.ts, the two
port groups), what jsdom can play, what the real Text node does in the runtime target's page, and what a spec can grade. The product
surface barely uses the ports so far: the 13 shelf templates hold 1,153 Text and 1,653 Group nodes, none of which sets a drag or drop
port, plus one catalog example (the kanban) and one Site Builder file drop. The keyboard drag can be played with no geometry. A
pointer drag needs `elementFromPoint`, which jsdom lacks. Drop Index from a pointer is geometry and waits for NSP-017.

**Two rows, both modelled and both in the Text's scenarios:**
- **C77** (medium, [the ledger](../../bugs/p107-c77-a-draggable-element-loses-its-keyboard-pickup-when-its-element-is-replaced.md)):
  a Draggable element can no longer be picked up from the keyboard once its element is replaced. This happens after Mounted goes off
  and on, after a new Tag, or when it mounts more than 60 frames after Draggable was set. drag-drop.ts adds `tabindex` once, to the
  element it finds.
- **C78** (low, [the ledger](../../bugs/p107-c78-a-keyboard-drag-drops-an-element-on-itself.md)): an element that is both Draggable
  and a drop zone, picked up with the keyboard, starts inside itself, and Enter drops it on itself (`keyboardLift`'s `list[0]`
  fallback). The pointer can never do this.

**The face: eight fixes, every one measured before it was made** (node-spec-target.ts; RESEARCH-DRAG-DROP.md §5):
1. A node a person acts on is made with the page installed, so `window` and `document` exist while its params are set. Draggable set
   at the placing had never armed.
2. `requestAnimationFrame` is the world's frame clock, on the host and on jsdom's `window`. jsdom's own runs on wall-clock time, and
   the first probe gave different answers from one run to the next.
3. The page's globals come off after the node's teardown, so a gesture cannot outlive its play.
4. **The browser's hit test.** A pointer act lands on the element under the pointer. An element with `pointer-events: none` or
   `visibility: hidden` is never that element, and `focus()` refuses a hidden one (Chromium `IsFocusableStyle`). jsdom had
   delivered both. **All 8 conforming visuals had been graded on a page where a hidden control could be clicked and focused.**
5. Pointer events (`pointerdown` / `pointerup`, with `pointerType` and `pointerId`), sent before the compatibility events.
6. `elementFromPoint`, which returns the element the last pointer act landed on.
7. `getComputedStyle` and `DOMRect` as globals (drag-drop calls them bare).
8. Every window listener a play adds comes off with its page. A drop's click swallow, left on the shared window because the world's
   clock never turned past its `setTimeout(0)`, **ate a Click in a later play**.

**The 7 specs the hit test moved** (Button, Checkbox, Text Input, Dropdown, Slider, Radio Button, Radio Button Group; the Icon's acts
raise nothing, so it was unaffected). Visible is page state now, painted at each frame end like Enabled. A hidden control takes no
pointer act and no keyboard. A control that held the keyboard before it was hidden keeps it, because jsdom has no focus fixup (the
disabled case's written choice), so typing, choosing and sliding still land, and a blur still works. The Focus action on a hidden
control is Done with nothing. The Text Input also takes no pointer at Opacity exactly 0 (TextInput.tsx :118-120). A hidden group's
buttons inherit the visibility, so a pick reaches none of them. A sibling's pick still selects while the Radio Button itself is hidden.
Each spec stays version 1: the runtime did not change, and the spec now says what a browser lets a person do (the s40 and s41
precedent). New scenarios, all identical on both targets: two "Visible off" ones per control, one for a field kept after it is hidden,
the Text Input's opacity, and "hidden, holding the keyboard": every pointer act, then the node's own Blur action reading whether the
keyboard is still there, with and without an Enable Label rebuild. That last pair kills the survivors the rule made (an act that
now meets nothing but whose paint rebuilds the control).

**The Text** (`Text`, [text.ts](../../../packages/nodegx-node-spec/src/nodes/text.ts), 54 scenarios, 10 acts) is step (a) of the
research's recommendation. Covered: the page (Mounted, Tag), the pointer outputs (Hover Start then Pointer Enter, Hover End, Pointer
Down, Pointer Up, Click), the hit test (Visible, Opacity exactly the number 0, Pointer Events Enabled, and Mode `inherit` removing the
style), and the drag source in full on a lone node. That means the keyboard lift and its four endings, the hold (a finger, or a mouse
with Hold always; Hold Time read at the press), a drop over nothing (Cancelled), the click swallow (one click, until the clock turns),
and C77 and C78. The zone side and the file drop are stored; their acts come in step (b). The spec keeps WHICH element is on the page (a
remount or a new Tag makes a new one) and the element the module's `tabindex` is on. `whenMounted`'s 60-frame budget is spent at two
frame starts per settle (the runtime target's frame and its drain), and **both come before the settle's paint commits**, because the
settle runs inside React's `act`. This was measured: an element mounted by a Mounted write is found at the NEXT settle. The first
model checked after the paint and was one frame early at the 60-frame edge.

**Mutants.** The first run left 26–32 alive. Almost all were state that no scenario read later: whether the element holds the keyboard
(read by hiding it and pressing Space), whether a gesture ended (read by a second hold), a pointer of another kind (a mouse release
during a finger drag), and an act's paint moving the element (a Mounted write after every act, the Icon's precedent). Seven are
declared equivalent, each a patch that writes a value the state already holds, or a click that starts and ends a pending gesture
(idle before and after).

**Lessons.** (1) **A face rule that jsdom does not apply is invisible until a node depends on it.** Eight visuals conformed with a
hidden button clickable, because no scenario crossed Visible with an act, and the generator crossed it only as noise that both
targets agreed on. (2) **A play's page is shared state.** The window, the module-level gesture and the click swallow all outlive a
play unless the face takes them down. The symptom was a Click lost in one scenario out of fifty, and only when the whole file ran in
one process. (3) **Inside React's `act`, a render commits when the act closes.** "The frame start after the paint" is therefore the
next settle, not the drain.

**Gate readings (2026-10-05, load 2–4).** The side-by-side probe: every scenario of all 9 visuals identical on both targets (rows
excepted), each file run whole in one process. Interpreter, the Text: CONFORMS at 200 on 13, 20729 and 20730 (538–539 / 544, the rest
declared). Runtime at 200 on seed 13 (all 9, one run, 13 min): **every one CONFORMS with 0 divergences** — Button 31/32 + known,
268/269; Checkbox 36/39 + known, 397/398; Text Input 86/87 + known, 4,071/4,087; Dropdown 52/55 + known, 1,362/1,366; Slider 46/48 +
known, 1,613/1,614; Icon 8/10 + known, 105/105; **Text 54/54, 539/544**; Radio Button Group 20/22 + known, 49/50; Radio Button 148/152
+ known, 818/822 (unkilled ones all declared). The package suite green (20 suites, 878 passed, the visual batch now 9 nodes with
every mutant killed or declared at seed 13); the runtime's graph and target suites green (102); `tsc --noEmit` exit 0; `node
scripts/bugs.js check` 230 headers valid. No stranger-hashed file changed. Committed `803f6cccf` (research, C77, three face fixes)
and `05368548f` (the rest).

**The second seed and the deep run.** Runtime at 200 on seed 20730 (all 9, one run): **every one CONFORMS, 0 divergences** (Text
538/544; the others as at 13). **The Text at 10,000 on the runtime (seed 20731, 806 s) does NOT conform yet**: 1 divergence and 47
survivors, written up in [TEXT-DEEP-RUN-2026-10-05.md](TEXT-DEEP-RUN-2026-10-05.md). The divergence is a product defect, **row C79**
(medium, [the ledger](../../bugs/p107-c79-an-invisible-element-catches-clicks-after-a-pointer-events-write.md)): `setStyle` writes Pointer
Events straight onto the DOM and React re-writes a style key only when its own rendered value changes, so a Text DRAWN at Opacity 0 that
is then given Pointer Events Enabled (or Mode) catches clicks while invisible. The same rule sits in Group, Image, Circle, Text Input
and Video. Modelling it needs the element's own `pointer-events` beside React's last render, and an account of which inputs force a
render. That is s44's first job. The 115 count stands on the 200-sequence gates (the s39 precedent: the Text Input counted at 200, and
its 10,000 findings were s40's).

### 7.9 s44, 2026-10-05 — the Text at 10,000: row C79 measured, modelled, then withdrawn from the spec (R11) — Text v3

**Measured.** s43's deep run left one divergence (row C79) and 47 survivors. A side-by-side probe played 22 hand cases on both targets,
and a second probe set each of the Text's inputs on a page and counted the redraws each one asks for. What the runtime does, which is
now the evidence in [C79's ledger entry](../../bugs/p107-c79-an-invisible-element-catches-clicks-after-a-pointer-events-write.md):
1. **Two writers set the element's `pointer-events`.** The Pointer Events inputs write it straight onto the element (`setStyle` /
   `removeStyle`; Mode `inherit` writes `''`, which is not `none`). A redraw writes Text.tsx :88-90's value (`none` at Opacity
   exactly 0), but only when that value differs from what the previous redraw wrote. So once the element has been drawn with `none`, a
   Pointer Events write in ANY later frame lets the invisible element take the pointer. Only a write in the same frame as the opacity
   change is safe. **C79 is wider than s43 wrote.**
2. **A frame end redraws only when an input asked.** The list was measured one input at a time (§7.9's first commit, `b4c997ed9`, has
   it in the spec). Opacity asks only when it crosses zero against the element's stored opacity.
3. **C79's reach** is the five nodes with both the opacity rule and the Pointer Events inputs: Text, Group, Image, Circle, Video. The
   Text Input has the rule but no Pointer Events inputs.

**Modelled, then withdrawn (R11).** Text v2 (`b4c997ed9`) reproduced C79 by copying the renderer's redraw rules into the spec: the
element's own value beside the last-drawn value, and which inputs ask for a redraw. It conformed at 10,000 on both targets. Richard
then ruled R11: *"let's try to casually avoid React stuff if we can when it comes to the spec, since we're hoping to one day move the
spec away from dependence on React."* Asked how the Text should take it, he chose **"say the intent"**. **Text v3** states v1's rule
(an element at Opacity 0, hidden, or with Pointer Events off takes no pointer, whatever order the writes came in). C79 is a **known
row on the runtime target** (`invisibleTakesPointer` in conformance.test.ts: the first difference is a pointer output on the runtime's
side, the last Opacity written is the number 0, and a Pointer Events input was written before it). It is counted on every run, never
hidden. A future target conforms by doing what a person expects, not by copying a renderer's bug. Kept from v2, as they are not React:
Mounted written the value it holds does nothing (:2285), and the Mounted cites corrected (:2276-2295).

**Scenarios: 54 → 162.** Four are C79 `row` scenarios (Enabled after drawing at Opacity 0; Mode Explicit then Inherit; Opacity 0
then Enabled a frame later; Enabled off and on, then Opacity 0), plus the same-frame case, which both targets agree on. The
scenarios that only graded the redraw rules went with v2. 100 are C77's and C78's, written to kill s43's 47 deep-run survivors:
- **An act's paint that makes the element** (a remount, a new Tag) is read by a Draggable write in the same frame, which puts the
  tabindex on whichever element is there. Each act has a version with Draggable written after it: with and without a gesture, under
  Tag `span` and Tag `h1`, and with Pointer Events off (an act that meets nothing still makes, keeps or replaces the element). The `h1` versions exist
  because a swap hands over its twin's recorded example, which holds element 2 with Tag `span`, and a play sitting on exactly that
  cannot tell the difference.
- **A replacing act during a keyboard drag** starts no gesture: Escape after it still cancels the keyboard drag.
- **The hold timer after a replacing press or touch** (Hold To Drag always).
- **A cancel that does or does not take the keyboard back**, read by hiding the element and pressing Space (a hidden element keeps the
  keyboard it holds, and takes none it does not).
- **The `whenMounted` chain**: an unmount in the frame the chain finds the element, Draggable written while off the page, five
  remounts in a row, and the chain's frame also making a new element (read with and without Draggable written again).

The last three scenarios carry the shared known rows C61–C63. The Text had never carried them, so "the known rows are still open" had
been red for it since s43.

**Mutants.** Three more are declared equivalent (s43 declared seven), each a twin that writes what the state already holds:
- a plain unmount, handed the twin that put the attributes on element 1 with the chain at 0 (a plain unmount's chain is already 0,
  and element 1 is always leaving or gone; the five-remount scenario kills any other element number);
- a Space lift into its own zone by an element that already holds the keyboard;
- a cancel outside any zone that takes the keyboard back, handed the twin that also left a zone (Drag Over false over false).

**Gate readings, Text v3 (2026-10-05, load 3–4).** The side-by-side probe: all 162 scenarios identical on both targets in one process,
the seven `row` scenarios excepted (C79 ×4, C61–C63). Interpreter at 200: CONFORMS on seeds 13, 20729, 20730, 20731, 20732, 20733 and 7
(1,156–1,157 killed, 0 survivors, 0 unreached); at 10,000 (seed 20731) CONFORMS. Runtime at 200: **CONFORMS on seeds 13 and 20730**.
Runtime at 10,000 (seed 20731): **CONFORMS — 10,000 / 10,000, 0 divergences, C79 attributed once, 1,156 / 1,165 mutants, the rest
declared (217 s)**. One earlier attempt in the chained gate run failed in 852 ms with an empty message and did not reproduce when run
alone. Its cause is unknown; the reading above is the solo run. The package suite is green (20 suites, 878 passed), and the runtime's
graph and target suites are green (102). `node scripts/bugs.js check`: 233 headers valid. No stranger-hashed file changed. Withdrawing
v2 re-opened 14 survivors that its scenarios had killed (acts that make or keep the element while meeting nothing). Each is now killed
by a Pointer Events-off scenario that reads the element through a Draggable write.

**Lessons.** (1) **R11: a spec that copies a renderer's mechanics makes every future target copy its bugs.** The redraw rules were
real, and modelling them was exact; it was the wrong place for them. The measurement belongs in the row's evidence, and the spec says
what a person gets. (2) **A name is graded by nothing**: the first "control from 0.5" played Pointer Down on BOTH targets. Reading
the traces against the names caught it, as in s35. (3) **A twin's recorded example can be the play's own values.** The swapped-in
example held element 2 with Tag `span`, so every scenario sitting on element 2 with `span` let the swap through, and which ones did
depended on the seed. A scenario written at a value the example does not hold (Tag `h1`) kills it on every seed.

### 7.10 s45, 2026-10-05 — the Text Input, the Checkbox and the Dropdown move to v2 (NSP-023)

Recorded in [NSP-023 §8.1](NSP-023-THE-SPEC-WITHOUT-REACT.md). What §7.2–§7.5 describe as the Text Input's `field` / `pending`, the
props as last rendered, the `turn`, the `<input>`'s missing Pointer Down and a fresh `<textarea>`'s cursor at the start is v1: v2 states
the intent Richard ruled and each of those is a known row on the runtime (C69, C72, C68, D35). The label rebuild (§7.2's Checkbox,
§7.3, §7.4's Dropdown) is gone from all three specs: row C80. The Button's and the Checkbox's 10,000 runs (the hit test's debt from
§7.8) are there too.

### 7.11 s50, 2026-10-06 — the Text v4: the file drop and the pointer's move (step (b), first half)

RESEARCH-DRAG-DROP.md §8's step (b) has three parts: the face's `move`, the file acts, and a Draggable sibling on the page for
the zone side. s50 built the first two. **The zone side (a sibling on the page) is left.**

**The format (additive).** An `act` step's value is now resolved like a `set` step's, and when it is a list, each item is
resolved (adapter.ts `play`). A drag from the desktop carries a list of `{ "$file": … }`, and each target makes those files
its own way. spec.ts names the four new acts. Both files are hashed for the stranger, so the hashes were refreshed and the
stranger file re-run (readings below).

**Text v4** ([text.ts](../../../packages/nodegx-node-spec/src/nodes/text.ts), 162 → 201 scenarios, 10 → 14 acts):
- **`move`** (`mouse` or `touch`): the pointer that is down moves across the element, past both slops. A pending press (a
  mouse, or a finger under Hold To Drag `never`) lifts: Is Lifted, then Picked Up. A held finger is scrolling, so it cancels
  quietly and the timer then lifts nothing. A lifted drag finds no zone, because a zone inside the source never takes it
  (drag-drop.ts :460). So **a pointer drag never drops on itself, where Space from the keyboard does (C78)**. The move is
  the pointer's own: a finger's move does not lift a mouse press. A keyboard gesture (`pointerId` -1) hears no move.
- **`fileEnter` (a list of files; none = a drag of text), `fileLeave`, `fileDrop`.** These are the node's own logic
  (node-shared-port-definitions.ts :956-1137): armed only while Accept File Drops is on and the drag carries files, asked
  at each event. The count of enters less leaves drives Is Dragging Over, sent only when it changes. A drop sets the count
  to 0, filters the files by Accepted file types (trimmed and lower-cased; `.ext` on the name, `type/*` on the MIME type's
  start, else the whole MIME type; blank takes all), and flags the five values, then Files Dropped or Files Rejected. **Where
  the drag is, is the browser's:** at each act the target moves first (a leave at the element it was over, an enter at the
  one under the pointer, under the hit test), then a `dragover`. A let go is a drop only when that `dragover` was cancelled
  (armed), and a leave otherwise. A leave at an element no longer on the page reaches nothing. The spec holds the drag in two
  keys, `fileCarry` (its files) and `fileOn` (the element it is over). The page model classes them as `held` under a new
  `keeps`: *a drag from outside the page*.
- **Face choices, written down:** the move is 10 px from where every act's pointer is (0, 0), over the element the act
  names, and raises no hover or leave. A file act raises no events between acts, so an element hidden under a drag is left
  at the next act, not at once (the s43 choice for the pointer). `fileEnter` during a drag keeps the drag's files.

**Findings.**
- **C79 reaches the file drag** ([the ledger](../../bugs/p107-c79-an-invisible-element-catches-clicks-after-a-pointer-events-write.md)):
  an invisible Text that catches clicks also lights up for a file and takes the drop. The first runtime run diverged on a
  scenario that mixed the intent with C79. It is now split: Pointer Events off, Opacity 0 with Pointer Events never written,
  and a fifth C79 `row` scenario. The `invisibleTakesPointer` matcher counts the file drop's signals, Is Dragging Over going
  true and the dropped file's values.
- **P107-C81** (medium, new, [the ledger](../../bugs/p107-c81-a-file-drop-zone-stays-lit-after-the-drag-leaves.md)): a file
  drop zone stays lit after the drag has left. This happens when its element was replaced under the drag (Mounted off and on,
  a new Tag), because the old element's leave reaches nothing and the count never returns to 0. It also happens when Accept
  File Drops is switched off during the drag. The spec models what the runtime does, so both targets agree. A Group whose
  label is swapped while a file hovers should hit the same thing; that is the Group spec's to measure.
- **P107-C82** (medium, new, [the ledger](../../bugs/p107-c82-a-file-drop-is-lost-when-accepted-file-types-is-not-text.md)),
  found by the runtime's 10,000 run (seed 20732; two divergences, both shrunk to three steps): when Accepted file types holds
  a truthy value that is not text, `(accept || '').split` throws in the drop handler. Is Dragging Over has already gone false,
  and then the drop dies: no File, no Files Dropped, no Files Rejected. The spec reads the value as text (the proposed one-line
  fix), so C82 is a known row on the runtime: `nonTextFileTypes` in conformance.test.ts, and a row scenario with its control
  (false, 0 and the empty text are blank and take every file).

**Mutants.** The first run left 10 alive. Seven were killed by scenarios that read what the survivor would leave wrong:
- a drag that came in while the node was switched off, let go after it was switched on (it drops);
- a stuck Is Dragging Over (an unheard leave), then a leave and a let go with no drag, then a full drag;
- an enter while switched off and a leave after switching on, counted at the leave;
- a drag that came in hidden, made visible, entered again;
- a drag carrying a PDF that moves onto the element again (it keeps the PDF);
- a drag of text that enters and leaves;
- a finger that scrolled, then a mouse press and move.

Three are declared equivalent, each writing what the state holds. Two are a leave or a let go with no drag under way (no
files and no target, written again). One is a drop with Is Dragging Over already false, handed the twin that sends it false
(an unchanged value is not recorded, adapter.ts :26-48). **A transient is invisible:** an enter and a drop in one act
send Is Dragging Over true and then false, and the settle records neither. A mutant that skips only the enter survives that
path. Another path (the drag entered again before a leave) kills it.

**The 10,000 runs found more survivors** (the interpreter at seed 20731: 33; the runtime at seed 20732: 28). 0 divergences on
the interpreter. Nearly all were acts whose paint makes or removes the element: each of the four new acts in a frame where
Mounted goes off, comes back, or Tag changes. s44's recipe kills them. A Draggable write in the same frame reads which element
is there, and focus and Space read whether the attributes went to the new element, each with and without a drag from the
desktop under way, and with a trailing let go that reads whether the drag went on (35 scenarios). Then 17 were left. Seven
more scenarios read the keyboard straight after a file act whose twin repaints, plus a renumbering twin (a mount paint's
example holds element 1, which is visible only when element 1 still carries the attributes, C77). Six were declared
equivalent: a leave with no drag (no files over none); a leave of a drag over nothing (no target over none); a leave or let go
with no drag whose paint unmounts (both); and a click on the element its paint makes, with or without a pending gesture
started and ended (idle before and after; s43's pair, with the paint).

### 7.12 s51, 2026-10-06 — the Text v5: the zone side (step (b), second half)

**The page.** The Text's spec now names three cards (`CARDS` in text.ts, the values of the new `grab` and `pickUp` acts). Each
card is a Drag Value with a Drag Kind: `card-1` of kind `card`, `7` of kind ` task ` (trimmed when read), and `loose` with no
kind. The runtime face builds each one as a real Text in the node's scope, in its own container after the node's, armed
(Draggable, then its Drag Value and Drag Kind) after its first render. That way its element has drag-drop.ts's tabindex
before the first step. Arming a card is the card's own spec, not this one's, so this is written down as a face choice. No
format change: an act's values were already resolved item by item (s50), and the cards are plain objects. Nothing hashed
moved, so the stranger was not re-run.

**Three new acts, and the old ones carry the rest.**
- **`grab`** (a card): the mouse goes down on the card, which takes the keyboard, then moves past the mouse's slop. With no
  gesture under way, the card lifts at once, over itself, where no zone is.
- **`pickUp`** (a card): the keyboard goes onto the card, then Space. With no gesture under way, the card lifts from the
  keyboard into the first zone that takes it: the Text, when Accept Drops is on, its element is on the page, and its Accept
  Kind takes the card's kind. Drag Over goes true at once.
- **`away`** (`mouse` or `touch`): the pointer that is down moves onto nothing.

The module has ONE gesture. So once a card is carried, the Text's existing acts are that gesture's:
- `move` over the Text enters it when the hit test finds the Text and the Text takes the card. Drag Over goes true.
- `away`, or a `move` over a Text the pointer passes through (hidden, Opacity 0), leaves it. Drag Over goes false.
- `release` and `click` track the pointer where the mouse came up, then drop: Dropped Value is the card's, Drop Index is 0
  (a Text's element has no element children), then Dropped and Drag Over false. Over anything else it is a cancel. Either
  way the swallow eats the next click (exactly one).
- `key`: Enter or Space drops a keyboard carry, Escape or Tab cancels it, and an arrow enters the Text when the Text takes
  the card now. Escape cancels a mouse carry too.

The other way round also holds. While a card is carried, the Text's own press starts nothing. While the Text's own press is
pending, a card's press starts nothing, and its move is the Text's own pointer moving: the Text lifts. The cards' own
signals (Picked Up, Landed, Cancelled) belong to the cards' spec. Two state keys hold the card's gesture, `carry` (which card)
and `carryBy` (the mouse or the keyboard). The page model classes them as node keys, beside `phase` and `input`.

**Two more rules, found by the deep run's matrix and modelled (R3: the runtime wins).**
- **The keyboard can be on a card.** A card takes the keyboard at its press and at a pick-up. The Text takes it back when it can.
  A key the Text cannot take (it is hidden, or its element is new and has no tabindex, C77) goes to whatever holds the
  keyboard. So a Space then is a Space on the card, and lifts the card. State: `cardFocused`, the card that holds it.
- **The Text's own pointer drag can drop it on itself once its element is replaced.** `zoneAt` skips a zone inside the element
  the press STARTED on (`g.sourceEl`). A new element (Mounted off and on, a new Tag) is not inside the old one. So a move over
  it, the let go over it, or the hold timer's lift with the pointer last over it finds the Text as its own zone, and it drops on
  itself: Dropped with its own Drag Value, then Landed. That is row **C78**'s pointer route, added to its ledger. The keyboard
  route was already known, and the fix proposed there (compare the zone's node, not its element) covers both. State:
  `sourceElem` (the element the press started on), and `pointerAt` (the element the last pointer act landed on, which is
  what the face's `elementFromPoint` answers). `pointerAt` is declared `synced`: it follows every pointer act, as a page sync,
  and is not the work of any branch.

**Findings.**
- **P107-C83** (low, new, [the ledger](../../bugs/p107-c83-a-card-carried-from-the-keyboard-drops-into-a-zone-that-has-left-the-page.md)):
  a card carried from the keyboard drops into a zone that has left the page. A zone is left only when it is deleted, when
  Accept Drops goes off, or when the pointer finds another zone. Mounted off is none of these. A keyboard drop takes the
  gesture's zone without checking it again, so Dropped fires on a Text that is not on the page, and its Drag Over stays true
  while it is gone. A mouse drag does not have this problem, because its next move tracks the pointer again. The spec models
  what the runtime does (as for C81), so both targets agree.
- **C78 reaches the pointer** (above; [the ledger](../../bugs/p107-c78-a-keyboard-drag-drops-an-element-on-itself.md)).
- **P107-C84** (medium, new, [the ledger](../../bugs/p107-c84-a-drag-dies-at-a-zone-whose-accept-kind-is-not-text.md)) and
  **P107-C85** (medium, new, [the ledger](../../bugs/p107-c85-a-drop-never-ends-on-a-zone-whose-zone-name-is-not-text.md)),
  found by the runtime's 10,000 run (seed 20732), both C82's shape: drag-drop.ts reads Accept Kind (`kindsOf`) and Zone Name
  (`zoneName`) with `(value || '').split` / `.trim()`, so a truthy value that is not text throws inside the controller. With
  Accept Kind, a pointer let go dies before its swallow and its drop, so the gesture never ends and no later drag can start,
  and a keyboard pick-up starts in no zone. With Zone Name, a drop fires Dropped and Landed and then never finishes: the zone
  stays lit and the gesture is stuck, so the next let go drops the same card again. The spec reads both as text (the intent),
  so they are known rows on the runtime (`nonTextAcceptKind`, `nonTextZoneName` in conformance.test.ts). Each has a row
  scenario named for the intent and a twin the runtime passes.
- Also modelled, with no row: a keyboard drop does not re-check the kind either. A zone whose Accept Kind changed after the
  card started in it still takes the drop.

**Scenarios: 248 → 1,203.** The first 23 hand scenarios played identically on both targets on the first run. Reading their
traces showed four false names, fixed: (1) a let go with no move first enters and drops in one act, and Drag Over's true then
false is not on the wire; (2) a finger's acts during a mouse carry still fire Pointer Down and Up; (3) a second card's move
leaves the zone, and the let go then drops the FIRST card; (4) "a card grabbed takes the keyboard" graded nothing, because the
`key` act puts the keyboard back on the Text first. (4) was rebuilt on a hidden Text, with a twin without the grab. Eleven
more hand scenarios killed the 200 run's first survivors (a no-op key or another pointer's `away` during a carry; a carry
ended outside a zone; the swallow eats exactly one click; a grab during a keyboard carry or the Text's own held finger).

**The deep run.** The interpreter at 10,000 (seed 20731), on the 280 hand scenarios: 0 divergences, but 84 survivors. They were
the new acts in states no hand scenario reached. So the session built a matrix: each gesture that can be under way (none,
the Text's own press, held finger or keyboard lift, a card carried by mouse or keyboard, in the zone or refused, a card that
took the keyboard and was put down) × the keyboard on the Text or not × a paint in the act's frame (none, Mounted off, mounted
again, a new Tag) × each of 23 acts, each read by one observer (Space on the Text hidden, Escape, a move and a let go, the
hold, then Space after a new Tag: who holds the keyboard, the carry, the zone, the timer). The first matrix diverged on the
runtime in 62 of 400 plays. Those were the two rules above, not face faults. Modelled, all 758 matrix plays agree.

**Mutants: what made them converge.** Adding the matrix first raised the 200 run's survivors to 345, then 137 (5,161 mutants),
because every write made only when the value changed doubled the branch shapes. The fix was in the spec, not in more
scenarios: an act that always does a thing now always writes it. A press that takes the keyboard always takes it off any
card, a grab or a pick-up always puts it on the card, and a press always records its source. With that, 44 survivors were
left (3,174 mutants, 309 s). Then:
- **Declared equivalent (seven new rows).** A click whose press starts the Text's own pending gesture and whose release ends it leaves
  `phase`, `input` and the zone as they were, and the source it records is written again by the next press before anything
  reads it. The other case is a key that ends a card's carry outside a zone, handed the twin that also left it. The earlier
  rows whose shapes moved (a Space lift of an element that holds the keyboard, the clicks that start and end a pending
  press) were re-pointed at the new shapes, with their reasons unchanged.
- **Killed by seven scenarios:** a click that cannot take the keyboard (C77's new element, or not Draggable) beside a twin
  that would; an eaten click during a keyboard gesture (the Text's own, or a card's) beside a twin that ends it.
- **The `away` paint family** (an `away` whose paint mounts, unmounts or retags, swapped with one that does not) needed s44's
  recipe plus one change. The gesture has to be ENDED (a release, a finger lift, Escape) before Space reads the keyboard. A
  card's mouse carry, still under way, swallowed the Space that was meant to read it. Then the "mounted again" case needed
  the read inside the act's own frame: the mutant's 60-frame chain catches up at the next frame start (108 scenarios).

The interpreter's 10,000 then left 8 survivors (a click that lets a card go while the pointer passes through the Text, and a
pick-up whose paint retags). Six more scenarios killed them, and s50's two paint-click rows were re-pointed at the shapes with
the source element.

**C79 reaches the drag** ([the ledger](../../bugs/p107-c79-an-invisible-element-catches-clicks-after-a-pointer-events-write.md)):
the runtime's 10,000 found an invisible Text taking the press that starts its own drag (sequence 5059 of seed 20732). The
matcher now counts a drag starting and a zone lighting.

**Readings (2026-10-06, load 3–6, a peer's suites running beside).**
- The interpreter at 200 (seed 13), 1,203 scenarios: CONFORMS, 0 divergences, 3,228 / 3,254 killed, 26 declared, 0 survivors
  (244 s).
- The interpreter at 10,000 (seed 20731), 1,201 scenarios: CONFORMS, 0 divergences, 3,274 / 3,302 killed, 28 declared, 0
  survivors (451 s).
- The runtime at 200: CONFORMS on seeds 13 (550 s) and 20730 (526 s) with 1,191 scenarios, and on seed 20732 with 1,203
  (565 s; C85 attributed once). The known-rows test is green: C79, C82, C84 and C85 each still fire.
- The runtime at 10,000 (seed 20732): the first run had 10 of 11 divergences known (C79 ×3, C82, C84 ×5, C85) and one C79 the
  matcher missed. With the matcher widened: CONFORMS, 0 unattributed divergences (C79 ×4, C82, C84 ×5, C85), 1,516 s.

### 7.13 s52, 2026-10-07 — the Group conforms (10 of 19): children, the focus tracker, the scroll actions

**The spec** ([group.ts](../../../packages/nodegx-node-spec/src/nodes/group.ts), v1, 1,387 scenarios, 19 acts). The Group
runs the Text's machinery word for word (the pointer and its hit test, Mounted, Tag, the keyboard, the drag source, the zone
side with the cards, the drag from the desktop), because it shares the ports and `drag-drop.ts`. What it adds:

- **Children.** The page puts three Texts inside it with the Group's own `addChild` before the first render (`CHILDREN`, the
  values of the new act `tap`): `one`, `two` at Position Absolute, `three`. Children Count is 3 in the first frame.
- **Drop Index counts the slots** (`slots`: laid-out children, Position Absolute left out, so two). A card picked up from the
  keyboard starts after both slots (every slot comes before it on the page), the Group's own keyboard lift at 0, ArrowDown and
  ArrowUp move one place between 0 and 2, and ArrowRight into the Group starts at 0. A pointer drop's index is geometry; every act's
  pointer is at (0, 0), so it is 0 here (a face choice, written down; graded after NSP-017).
- **The focus tracker** (`focus-tracker.ts`). A Group is not focusable, so Focused and Focus Lost come from the viewer's list. The
  Focus action lists it (Focused unless listed) and reports Done, on the page or not. A click on the Group or a child lists it, a
  click elsewhere drops it (`clickAway`, a new act: a click on the page beside it), and leaving the page drops it silently. A
  click the drag module swallows reaches neither the list nor Click.
- **Scroll To Index and Scroll To Element**, run after the frame's inputs, on the component when there is one, else waiting for it
  (at most 16; the 17th pushes the oldest out with Failure). Scroll To Index is Done when the element has a child at Index as an
  HTMLCollection reads it (a canonical array index below 3: `"1"` and `-0` are Done, `1.5` and `null` fail). Scroll To Element is
  Done for nothing on Element, else Failure (a reference to another node is not yet a trace value).
- **When the frame's work runs.** Every pointer handler on the page drains every dirty node (`pointerlisteners.ts`), and so does the
  drag module's `flush`. An act that reaches the Group's handler, a child's or a card's, or that moves the drag, runs the frame's
  scrolls at the act; any other act leaves them for the frame's end. Block Pointer Events adds blockers on every pointer event, so a
  move drains too. The spec holds what an act resolves (`ran`) and reports it first at the frame's end, because the trace prints a
  frame's outcomes together in the order they were resolved. A Focus that comes after waits behind it.

**The face** (node-spec-target.ts):
- the Group's children are built from `acts.tap.values`;
- `tap` and `clickAway` use the browser's focusing rule: a press focuses the nearest focusable ancestor, else the page. jsdom's
  `blur()` does nothing on an element that has lost its tabindex, so the face lends it one for the blur;
- an outcome begun inside a callback that a signal's rising edge scheduled is that signal's invocation. Without this, Scroll To
  Index's outcome had no port (`''`);
- the popup's stand-in `Group` is registered under its own name and handed only to the popup's one `createPrimitiveNode('Group')`.
  Before this, every play with a world was given the stand-in in place of the real Group;
- a placing that throws (C87) now tears down what it made, as a dispose does. The play gets no handle to dispose, so the node
  stayed in the drag module's registries, and a later play's card met its dead zone (found by one of the 200 at seed 20730 that
  diverged only after sequence 52);
- the runtime package's jest transforms the viewer's ES-module `.js` files (the Group's three better-scroll plugins).

**Findings.**
- **P107-C86** (low, [the ledger](../../bugs/p107-c86-a-click-on-a-group-after-a-tag-change-counts-as-a-click-elsewhere.md)): after
  a Tag change, a click on the Group counts as a click elsewhere (Focus Lost, never Focused) until it remounts. The component puts
  the node on the element only in `componentDidMount`. Modelled (`stampOn`), as C77 is.
- **P107-C87** (medium, [the ledger](../../bugs/p107-c87-a-group-whose-tag-is-empty-crashes-its-render.md)): a Tag of `""`, null, 0
  or false makes React throw drawing the Group (`const { as = 'div' }` covers only undefined). The spec draws a `div`, as the Text
  does; a known row on the runtime (`emptyTag`), with a row scenario and its twin. Found by the first side-by-side run, from a Text
  scenario carried over.
- **P107-C88** (medium, [the ledger](../../bugs/p107-c88-a-scrolling-group-counts-its-scroller-as-its-only-child-for-drop-index.md)):
  with Enable Scroll on and Native platform scroll off (what the Scroll To actions' description asks for), the children sit in the
  scroller's wrapper, so Drop Index counts one slot: a card dropped from the keyboard lands at 0 or 1 whatever the Group holds.
  Measured: Enter after a keyboard pick-up drops at 1 with the scroller, at 2 without it. The spec counts the children (the port's
  words); a known row (`scrollerWrapsChildren`).
- **P107-C89** (low, [the ledger](../../bugs/p107-c89-native-platform-scroll-wired-a-value-that-is-not-true-starts-the-scroller-on-unwrapped-children.md)):
  Native platform scroll wired a truthy value that is not `true` (1, "false") — `render` reads it as native, `componentDidMount`
  as not (`!== true`) — so the scroller runs on unwrapped children: Scroll To Index fails for every child, and the scroller takes
  clicks. Found by the runtime's 200 (five sequences bisected to these two ports). A known row (`nativeScrollNotBoolean`).
- **P107-C90** (medium, [the ledger](../../bugs/p107-c90-a-scrolling-group-with-block-pointer-events-fires-no-click.md)): the
  JavaScript scroller and Block Pointer Events together: a click on the Group or a child fires no Click (Focused still does).
  Found by the runtime's 10,000 (seed 20733, seven sequences), then measured with controls: either alone keeps Click. A known row
  (`scrollerBlocksClick`).
- **The Text's rows reach the Group**, as the C79 ledger said: C79, C82, C84 and C85 are known rows for the Group too.

**How the mutants converged** (worth knowing for Image and Circle, which run the same machinery):
1. The Text's 1,202 scenarios, carried over (`Text` → `Group` in their names; the one `text` write became Clip Content), killed
   the shared machinery's mutants. The Text's 30 equivalent rows hold on the Group's shapes (`onGroup` in equivalent-mutants.ts adds
   the keys the Group writes beside them), plus their twins for a click that lists the Group (Focused) or drops it (Focus Lost).
2. **A drain inside an act doubled every act's shapes**, because a branch's shape includes its outcomes: 131 survivors, and 51
   minutes on the interpreter at 200. Holding what an act resolves for the frame's end (`ran`; the trace cannot tell the
   difference) and writing the scroll lists in every act took it to 25 survivors and 2 minutes. **Lesson: an outcome resolved
   inside an act multiplies that act's branches. If the trace prints it with the frame anyway, resolve it at the frame's end.**
3. **The runner now tries first the plays that killed the reducer's last mutants** (conformance.ts). The verdicts are the same,
   because a mutant is killed exactly when some play tells it apart. The Group's killers sat at the end of its file.
4. The matrices are joined plays (the s45 recipe): the drain (8 gestures × 2 paints × 2 directions, 22 acts per play), who holds
   the keyboard after a press (24 plays), and the frame end's outcomes together (7 kinds of frame × 44 combinations of Focus and
   the two scrolls, each read by who can take the keyboard, a Draggable write before any act — s44's recipe for a paint left to the
   next act — the Group back on the page, a click and the next frame). The deep runs then found single shapes the matrices missed
   (a mount that spends `whenMounted`'s last two frame starts; a held Focus with a failing scroll after a Tag change), each killed by
   a play of its own.
5. Declared equivalent, beyond the Text's: an act that moved nothing writes the lists it found; the frame end's drop-set when it
   reports outcomes (States' and Pop Component Stack's reason: only the next settle shows it); a card's carry ended outside a zone by
   a tap or a click beside it (the Text's reason); a click beside it nothing ate, handed the eaten twin; a mount with no chain, handed
   the twin whose mount spent the chain (its example writes 0); and the Text's click row for a tap.

**Readings.** 2026-10-07, load 3–6, one heavy job at a time; a peer's suite ran beside the first ones.
- The interpreter at 200: CONFORMS on seeds 13, 20729, 20730 and 7 (1,387 scenarios, 0 divergences, 9,679 / 9,713 mutants killed
  at seed 13, 34 declared, 0 survivors; 170 s each).
- The interpreter at 10,000 (seed 20731): CONFORMS, 0 divergences, 10,301 / 10,324 killed, the rest declared (394 s).
- The runtime at 200: CONFORMS on seeds 13 (9,679 / 9,713) and 20730 (9,678 / 9,713), 0 unattributed divergences; the known-rows test
  is green (330 s each).
- The runtime at 10,000 (seed 20733): CONFORMS, 0 unattributed divergences; known C84 ×6, C85 ×1, C87 ×582, C89 ×87, C90 ×8;
  10,452 / 10,480 killed, the rest declared (820 s). (C87 so often because the generator draws an empty Tag often.)
- The side-by-side probe: all 1,387 scenarios identical on both targets, the 16 row scenarios excepted.
- The shared changes (the runner's order, the face): every non-visual spec on the runtime at seed 13 (86, all conform, 190 s); the
  graph and target suites 106 / 106; each other visual spec on the runtime at seed 13, one run each, all conform (the Text 141 s,
  was 550 s; the Slider 610 s, was about 29 minutes — the killer-first order); the package suite 22 suites, 925 passed, 18 skipped
  (828 s, the Group in `batch-visual`); `tsc --noEmit` clean. The stranger file was not run: no file it hashes changed.

### 7.14 s53, 2026-10-07 — the Shape and the Image conform (12 of 19): the Text's machinery with no Tag, and the picture's fetch

**The Shape** ([circle.ts](../../../packages/nodegx-node-spec/src/nodes/circle.ts), `Circle`, v1, 1,223 scenarios, 17 acts). It is the
Text v5's machinery with no Tag: the element is always a `<div>`, so only a mount makes a new element. Its own inputs (the outline,
Points, the fill, the stroke, Size, the angles, Custom SVG's source) are look (R10). A Shape takes no children, so Drop Index is 0.

**The Image** ([image.ts](../../../packages/nodegx-node-spec/src/nodes/image.ts), v1, 1,235 scenarios, 18 acts). The Shape's machinery
(no Tag; an `<img>` has no children), and the picture's outcome:
- **Source** becomes the element's `src` as `resolveMediaSource` and `getAbsoluteUrl` make it: none for null, nothing, or anything
  empty as text (`""`, `[]`); otherwise the value as text, after the app's base URL `/` unless it is already absolute, a URL or a
  data URL. (The runtime's 10,000 found the `[]` case: `getAbsoluteUrl` returns an empty text as it is, and the spec had put `/`.)
- **Source Set** goes onto the element as written. A boolean is no `srcset` (React 19 warns that it is not a value here), apart
  from row C94 below.
- **The browser's fetch** is a new act, `fetched` (`load` or `error`). The browser fetches only for an element on the page with a
  `src` or a non-empty `srcset`; with neither, the act is nothing. A load fires On Load. A failure sets Error ("The image could not be
  loaded: " and the `src`, or "— no Source was set" when only Source Set named one), then fires On Error. The fetch is not the
  pointer's: hidden, Opacity 0 and Pointer Events off do not stop it.

**How it was built** (the Group's way, carried over). Both specs are copies of text.ts with the Tag taken out. The Text's 1,203
scenarios were converted (scratchpad `convert.py`): a Tag write to a new element type becomes a remount while the node is mounted
(Mounted off, a settle, Mounted on), and is dropped otherwise; writes to ports the node lacks are dropped; "Text" becomes the node in
names, except where the name means a string ("read as text"). 189 converted scenarios were duplicates and went. The Text's
equivalent rows hold with `shownTag` taken out of each shape (`onCircle`).

**What the Tag's twins had been doing.** The first interpreter run left 12 survivors, all on a file-drag act whose own paint mounts
the element. For the Text, the Tag twin (a new element without a mount) had killed these swaps. Without it, the swap's sibling
example carries its own element number, and nothing read the number afterwards. Two remount matrices kill them (in both scenario
files): a drag from the desktop in the frame a remount makes element 2 or 3 (with the attributes on element 1 or 2), read by Space
(which element has the tabindex), a leave, a new drag and a let go. The second matrix adds a Draggable write right after the act,
and Opacity 0 as a second way to keep the drag off the element. Its Space comes before the next frame, so it reads whether the act's
own paint made the element (the Text's recipe). The Image's 10,000 run then found one more: a fetch in the frame Mounted goes off,
handed the twin that does nothing. Its killer needs a settle between the remount and the Space, because the chain puts the
attributes on the next element only at the next frame's start.

**The face** (node-spec-target.ts):
- the Shape and the Image are registered;
- `Noodl.Env` is `{}`, as the viewer's JavaScript API makes it (noodl-js-api.ts :48). Image.tsx reads `Noodl.Env['BaseUrl']` for
  every source that starts with `/`, which is nearly every source;
- `fetched` dispatches the `load` or `error` event on the `<img>`, which React hears there. jsdom fetches nothing, so the face is
  the browser. Face choice, written down: only an element with a `src` or a non-empty `srcset` has a fetch to finish.

**The runner: `withheld`** (generate.ts, conformance.ts). A known row that takes the whole process down can be neither played nor
counted. The runtime target now withholds named values from one port's pool, per spec, with the row that is the reason, and every
report prints a `withheld:` line. Without the option every pool is what it was, so every other spec draws exactly what it drew.

**Findings.**
- **P107-C91** (low, [the ledger](../../bugs/p107-c91-a-custom-svg-shape-counts-its-own-drawing-as-a-child-for-drop-index.md)): with
  Shape Custom SVG, the `<span>` holding the drawing counts as a child, so a card dropped from the keyboard lands at 1. drag-drop.ts
  `slots` keeps HTML elements only: an `<svg>` is not one, so every drawn shape gives 0 (measured, the twin scenarios). A known row on
  the runtime (`svgShapeIsASlot`), with three row scenarios and two twins.
- **P107-C92** (medium, [the ledger](../../bugs/p107-c92-a-polygon-or-star-with-a-huge-points-value-runs-the-page-out-of-memory.md)): a
  Polygon or Star builds `Math.round(Points)` vertices with no upper bound, so 1e9, 2^53 or Infinity runs the heap out. Found by the
  runtime's first 200 run, which died after 56 s in `Array.from`. Then measured with the heap capped at 700 MB: Points 7 and a Star of
  100,000 play, and Points 1e9 dies in 7 s. The runtime run withholds the three values from Points (`WITHHELD`).
- **P107-C93** (**high**, [the ledger](../../bugs/p107-c93-an-image-adds-the-base-url-again-at-every-render.md)): Image.tsx :57-62 puts
  a project Base URL in front of the source by writing into the node's own props. A sub-path Base URL still starts with `/`, so every
  render adds it again. Measured with `Noodl.Env.BaseUrl = '/x/'`: Error named `/x/x/x/a.png` after the first frame, then 5 copies,
  then 7. Controls: no Base URL gives `/a.png`, and `https://cdn.example/` gives one prefix that stays. Every app deployed under a
  sub-path is exposed. The face has no project Base URL, so the spec does not reach it.
- **P107-C94** (low, [the ledger](../../bugs/p107-c94-an-image-placed-with-source-set-true-fetches-a-picture-called-true.md)): an Image
  placed with Source Set `true` fetches a picture called "true". React 19.0 writes `srcset="true"` on an `<img>` it creates with `true`,
  and removes the attribute when an update sets it to `true` (measured with React alone in jsdom). Found by the runtime's 10,000 (seed
  20733: 7 of its 23 divergences; the other 16 were the spec's `[]` error). The spec says the intent (R11); a known row on the runtime
  (`booleanSrcSetAtMount`), with a row scenario and two twins.
- **The Text's rows reach both**: C79, C82, C84 and C85 are known rows for the Shape and the Image.

**The Group v2 (R16).** Richard ruled on the question s52 left: a Focus on a Group that is not on the page reports **Unchanged** and
lists nothing, as a field's does (R13). (Asked first as "fail like a field"; my wording had said Failure where the field reports
Unchanged, so it was asked again.) group.ts v2: the Focus action off the page (`onPage` false, so Mounted turned on in the same frame
counts as off) reports Unchanged, or holds it behind the outcomes the frame has already resolved (`ran`). The guard's element calls
gain `onPage` for `on.focus`. The runtime lists the Group and reports Done: row **P107-C95** (low,
[the ledger](../../bugs/p107-c95-a-focus-on-a-group-off-the-page-reports-done-and-fires-focused.md)), a known row on the runtime
(`groupFocusOffPage`: the difference is in a settle's group whose reference holds the Focus action's Unchanged). Scenarios: s52's
"Focus on a group that is not on the page: Focused and Done all the same" became a C95 row scenario; four new (three rows, two twins);
the two frame-end matrices with a Focus in the frame Mounted comes back are now C95 rows, each with a twin without its Focus steps,
graded on both targets. 1,394 scenarios. Readings: the interpreter at 200 on seeds 13, 20729, 20730 and 7 CONFORMS (9,844 / 9,877
killed at seed 13, the rest declared; about 200 s each) and at 10,000 (seed 20731, 573 s, 10,467 / 10,489); the runtime at 200 on seeds
13 (441 s; C87 ×17, C89 ×3, C95 ×12) and 20730 (402 s; C79 ×1, C87 ×12, C89 ×3, C95 ×7) CONFORMS, 0 unattributed. The side-by-side probe:
the newly differing scenarios were exactly the C95 rows; the two twins agree on both targets. The runtime at 10,000 (seed 20733,
1,091 s): CONFORMS, 0 unattributed (C95 ×418, C87 ×582, C89 ×119, C90 ×8, C84 ×6, C85 ×1; 10,620 / 10,647 killed).

**Readings.** 2026-10-07, load 3–5, one heavy job at a time (a peer's Slider run went first).
- The interpreter, Shape: CONFORMS at 200 on seeds 13, 20729, 20730 and 7 (2,369 / 2,395 mutants killed, the rest declared, 0
  survivors; about 40 s each) and at 10,000 (seed 20731, 136 s).
- The interpreter, Image (1,239 scenarios, after its last fix): CONFORMS at 200 on seeds 13, 20729, 20730 and 7 (2,398 / 2,424 killed,
  the rest declared; about 57 s each) and at 10,000 (seed 20731, 244 s, 2,410 / 2,436).
- The side-by-side probe: every Shape scenario identical on both targets except its 12 row scenarios, and every Image scenario except
  its 9. The fetch traces printed on both sides (On Load, Error, On Error).
- The runtime, Shape: CONFORMS at 200 on seeds 13 and 20730 (122 s each, 0 divergences) and at 10,000 (seed 20733, 532 s; C79 ×1,
  C82 ×1, C84 ×2, C85 ×1; the three Points values withheld).
- The runtime, Image: CONFORMS at 200 on seeds 13 (129 s) and 20730 (143 s; C84 ×1), and at 10,000 (seed 20733, 461 s; C79 ×5, C84 ×2,
  C85 ×2, C94 ×7; 2,428 / 2,454 killed). Its first 10,000 had 23 unattributed divergences: 16 the spec's `[]` error, 7 row C94.
- The shared changes (the face's `Noodl.Env`, the runner's `withheld`), on the runtime at seed 13: the other 9 visual specs (with P109's
  committed C64 control specs) and all 86 non-visual specs conform; the runner's own tests and the pinned digest pass.
- The guard (page-model.test.ts, seeds 13 and 20731): all 14 visual specs green, the two new ones and the Group v2 included. Catalog
  parity green for both. `tsc --noEmit` clean in both packages.
- After both commits (HEAD 99d0d2353): the package suite 22 suites, 935 passed, 18 skipped (568 s; the Shape, the Image and the Group v2
  in `batch-visual`); the runtime's graph and target suites 106 / 106. The stranger file was not run: no file it hashes changed.

### 7.15 s54, 2026-10-07 — the Video conforms (13 of 19): the browser's media element, the four actions, and five rows

**The Video** ([video.ts](../../../packages/nodegx-node-spec/src/nodes/video.ts), `Video`, v1, 21 acts). It is the Image's machinery (the
pointer, the keyboard, the drag, the zone side, the drag from the desktop), and:
- **The element a Source draws.** Source is resolved as the Image's is. A Source naming a YouTube or Vimeo video (video-embed.ts's
  patterns) draws an EMBED, an `<iframe>`; any other draws a `<video>` whose `src` carries Start Time and End Time as `#t=` (`#t=0.01`
  with neither). A Source that moves between the two makes a new element without a mount, as the Text's Tag does. **DOM Element** is a
  new trace tag, `OWN_ELEMENT` (`{ "$element": "own" }`, video.ts, not trace.ts, so the stranger's hashes stand): the `<video>` while
  one is on the page, `null` once it goes; an embed never sets it.
- **The browser's media element** (THE MEDIA ELEMENT, written once in the face and once in the spec). A `<video>` loads its source when
  made with one and again whenever its `src` changes (removing the `src` loads nothing, as HTML says). A load pauses it without a word,
  puts it back to 0 (Playback Position 0 when it had moved) and starts over. Four new acts are the browser's side: `loaded` (On Can
  Play, Video Width and Height; the pending plays resolve; Autoplay starts a paused element that may play), `failed` (Error and Playback
  Failure; each pending play then fails too), and, while it plays, `progress` and `ended` (Loop on goes back to 0 and plays on; else
  Playback Position 60 and On Pause). On Play fires whenever a paused `<video>` starts.
- **The autoplay policy** (Chromium's): a `<video>` may play while muted, or once the page has had a person's activation — a press, a
  click, a lifted finger, a key other than Escape, a press or Space on a card beside it. Else the node's Play is refused: Error "The
  browser blocked playback…", Playback Failure, and the action still reports Done.
- **The four actions** run on the component when it exists, else wait for it with Source Object's writes (at most 16; the 17th pushes
  the oldest out, which fails when it is an action), and run in order at the mount, each Done then. Play wants the video to play and plays
  it when the component has seen it load (`canPlay`, kept across a change of Source — so a Play just after a Source change starts the
  new one at once, before its load); a new component at each mount starts without it.
- **An embed is another page inside this one**: a pointer act or a key that lands on it goes there, and nothing here hears it. A press
  there still moves the keyboard onto the `<iframe>`, and what a person does there still counts as this page's activation.
- **Source Object**: no scenario can hold a stream, so it is graded on what is not one. Null changes nothing; nothing (`undefined`) is
  null to the browser, and the node writes it — the `<video>` loads again and the component forgets its load; anything else the browser
  refuses.

**The face** (node-spec-target.ts THE MEDIA ELEMENT): jsdom has no media engine (`play()` and `pause()` only report "not implemented";
no `srcObject`), so the face gives the browser's: the load on a `src` set, `play()`'s promise and its three rejections, `pause()`,
seeking, `srcObject`'s WebIDL check, `videoWidth` / `videoHeight`, and the activation listeners. A media element's events are tasks
(microtasks here); a person's act now waits for the media work queued before it (`mediaWork`, only then, so no other spec's timing
moves). An embed takes what lands on it. Face choices, written down: the browser's own controls are not an act; a load that has loaded
never fails afterwards; End Time's stop is not an act; an element unmuted with no activation plays on (Chromium pauses it); a `<video>`
with its controls drawn takes the keyboard only with a tabindex, as jsdom says.

**How it was built.** Measured first, on the runtime: a probe mounted the real Video in jsdom and played Play, Pause, a YouTube switch,
an unmount, Volume and Source Object — four of the five rows below came from that hour. The Image's 1,239 scenarios were converted (the
21 about its own Source, Source Set, Alternate text and fetch dropped; "Image" read as the node in names, "image" as the dragged PNG), and
the Video's own written (80, then killers and the act matrices: 1,573 scenarios in all). The side-by-side probe gained an in-memory fix of C100 (CachedVideo handed the
pointer props, never on disk): behind C100 every converted scenario agrees on both targets but the five C79 rows.

**Branch shapes.** The first interpreter run took 17 minutes and left 282 survivors: every paint wrote the `<video>`'s three flags only
on some paths, so every act's branch split in two. s51's lesson again — what the paint always does, it always writes — and the same for
`activated` (an act that can give one writes it on every path), the waiting list at a mount, Autoplay's chance at a Pause or a Reset and
at a load (after a load nothing reads it until the next load gives it back). The Text's equivalent rows hold on the Video's shapes
(`onVideo`: what every paint writes and `ran` on every act and frame end, `activated` on the acts that give it, a mount's component).

**Every act paints first, so every act's branch split by what its paint did.** A paint does nothing, loads a new Source, takes the
`src` away, puts an embed in the `<video>`'s place, mounts or unmounts. Killer matrices over the 19 acts (a Play and the load in one
frame after a new Source; a Play and a progress after nothing new; the same hidden; the Source cleared and given back; the Source
switched to an embed, read by a Play) each reached a new split and each brought its own survivors: 43 → 79 → 3 → 28 on three new seeds
→ 115 on each seed, 5,101 mutants, 6 minutes a seed. Two traps showed in the one-mutant probe:
- **A skipped paint heals at the next one.** A mutant that drops an act's reload (or its src removal, or its embed swap) is caught up
  by the NEXT act's paint, which compares the Source with the element again. A reader must act between them without painting: an action
  (Play, Pause), or an input write followed by an act in the same frame.
- **A branch reached only where its change shows nothing is no kill.** The Reset that seeks to 0 was reached only at 0; the press on an
  embed that takes the keyboard from a card was reached only by a play whose Escape had already moved the keyboard there.

The fix was the paint, not more scenarios: **every paint now writes the element and its media as they stand (`heldElement`), then what
it changes**, so the branch no longer says what the paint did. 3,409 mutants, every one killed or declared on four seeds, 116 s a seed.
The matrices stay: each kills the paint's mutants on the merged branches. **Do this first for any spec whose acts paint: write the
whole painted state on every path.**

The 10,000 run found the same split in the **actions**: a seek or a pause written only when it moved something split each action by
where the video was (and a mount's frame end too, which runs the actions that waited). The actions now write the playback as it stands
(`heldPlayback`: Position, at the end, Playback Position, paused, the pending plays), then what they change — on an embed as well: the
first try wrote it on a `<video>` only, and split every action by the element instead (17 survivors). The last six were a progress or an
ended inside a mount's or an unmount's paint (the Text's mount matrix, for the media's own acts), the chain of frame starts running out
in the frame a waiting Reset or Play mounts the Video (scenario 17's 29 frames, with an action waiting — 28 left the chain alive, and the
first killer's name said the opposite of its trace), and a click passing through a hidden video that ends a card's carry (read by Space
on the element the attributes went on). One is declared: a mount that runs a waiting Reset with no chain, handed the twin that spent the
chain — chain 0 where it is 0, and a fresh element nothing reads before the next paint.

**The runtime's 10,000 (seed 20733)** found one unattributed divergence. Shrunk, it was a release on a video with no Source (C100), but
the matchers judge the UNSHRUNK play: a release on a video file, then the Source switched to a YouTube link in the same frame. The frame
reports its outputs after all its steps, so C100's matcher, reading the Source LAST held, saw an embed. It now reads the Source held at
the last act before the difference (the element the act landed on). The same run's survivors were acts whose paint MOUNTS the Video and
runs an action that waited (a grab, a drag from the desktop entering): the mount matrix now covers every person act (17 scenarios, a
grab naming a real card), with a waiting Reset for the grab, the focus and the drag. Two rows are declared, narrow, and each only for
twins no play tells apart (a declared row never hides a killed mutant): a drag entering in the frame the Video mounts, handed a twin
that does not mount (the frame's end mounts it and runs what waited, reporting at the same frame end; the element is numbered one more,
so the twin's file bookkeeping names an element no longer there — the traces are identical); and a card grabbed in that frame, handed a
twin that grabs the SAME card without mounting (a twin with another card is killed: the card let go over the Video is the one
dropped). **Trap: a mount that runs an action writes the held playback, `timeOut` included — the first rows missed that key and
matched nothing; check a new row against the survivor lines before a 15-minute run.**

**Findings** (all open; under R16, P109's to fix):
- **P107-C96** (medium, [the ledger](../../bugs/p107-c96-a-video-showing-a-youtube-link-throws-on-source-object.md)): Source Object on a
  Video showing an embed throws (`this.video` is not set); before the first draw it throws inside React's commit and the page goes blank.
- **P107-C97** (low, [the ledger](../../bugs/p107-c97-play-on-a-video-switched-to-a-youtube-link-throws.md)): Play or Restart after a file
  loaded and the Source moved to an embed throws (`canPlay` outlives the `<video>`); neither Done nor Failure.
- **P107-C98** (**high**, [the ledger](../../bugs/p107-c98-a-video-volume-outside-0-to-1-blanks-the-page.md)): a Volume outside 0 to 1 —
  50, from a Slider's default range — or not a number throws in `componentDidUpdate` and blanks the page; a Video placed with it throws at
  its first frame (it renders twice when placed). Withheld from the runtime's generated sequences.
- **P107-C99** (low, [the ledger](../../bugs/p107-c99-a-video-source-object-that-is-not-a-stream-throws.md)): a Source Object that is not
  a stream throws (the browser's setter refuses it). Withheld from the runtime's generated sequences.
- **P107-C100** (medium, [the ledger](../../bugs/p107-c100-a-video-file-fires-no-click-hover-pointer-or-file-drop.md)): on a video file
  the Video fires no Click, Hover, Pointer Down, Up or Enter and takes no file drop — `CachedVideo` is handed no `pointer` prop. 1,186 of
  the scenarios carry its row (1,573); behind it they agree (the in-memory fix above).
- **C79 is not a known row for the Video while C100 stands**: no pointer reaches a video file at all, so an invisible one cannot take it
  either, and the five "row C79" scenarios agree with the runtime for that reason (the known-rows test caught the row not firing). With
  C100 fixed in memory they diverge as on the Image; C100's ledger says to carry C79's row back in the same commit.

**Readings (2026-10-07).** Interpreter: the Video at 200 on seeds 13, 20729, 20730 and 7 (3,740 / 3,764 killed, the rest declared;
3,794 / 3,819 at 20729) and at 10,000 on seed 20731 (4,044 / 4,065): CONFORMS, 0 divergences, 0 survivors. Runtime: at 200 on seed 13
and at 10,000 on seed 20733: CONFORMS, 0 unattributed divergences (at 10,000: C96 ×126, C100 ×1,662; C98 and C99 withheld; C97 fires
by its 20 scenarios); the known-rows test green. The shared changes (the face's media element, `mediaWork`; the guard): the runtime's
graph and target suites 106 / 106; the 85 non-visual specs on the runtime at seed 13 all CONFORM; the Text v5 on the runtime at seed 13
CONFORMS; the guard and its plants 37 / 37 (after the Group's `stampOn` fix: it had been red at HEAD since P109's Group v3, 3364b47f6);
the package suite 22 suites, 939 passed, 18 skipped, the one failure the guard's Group (602 s). No file the stranger hashes changed.


### 7.16 s55, 2026-10-07 — the Drag conforms (14 of 19): read and measured, a pointer with a position, six rows

**What the Drag is.** It is not drag-drop.ts. The Drag node (`nodes/visual/drag.ts`, `components/visual/Drag/Drag.tsx`) wraps the
`react-draggable` library (4.5.0) around its FIRST child and moves that child's element with a CSS `translate`. It has no element of its
own (`noDataAttributes`). Its outputs come from the library's callbacks: Drag Started at the press, Drag Moved and Drag X / Y and Delta
X / Y at every move, Drag X / Y and Drag Ended at the release. Start Drag X / Y set the position from the graph (and send Drag X / Y
and Delta X / Y). Snap To Position X / Y animate the position with one scheduler timer per axis (`createTimer`, Ease Out), which is
Animate To Value's machinery (animate-to-value.ts already models it); a press stops both timers.

**What the face can play, measured on the real component in jsdom** (a throwaway probe, deleted):
- A mouse drag: `mousedown` on the child's element, `mousemove` and `mouseup` on the document, with `clientX` / `clientY`. The
  position is pure arithmetic: the library reads the pointer against `document.body` (jsdom has no `offsetParent`), so a move of
  (dx, dy) moves the element by (dx, dy) / Scale (Scale 2: 100 px → 50; 0.5: → 200 — **correct, divided once**). A second drag
  starts where the first stopped. A right-button press starts nothing; Enabled off starts nothing; a press and release with no move
  fires Drag Started and Drag Ended and no Drag Moved.
- **Constrain to parent is geometry, and jsdom silently skips it**: the bounds are `offsetLeft`, `clientWidth` and the paddings; jsdom
  has no `offsetLeft`, the bounds come out NaN and the library's `isNum` drops them, so the element moves freely (40, 40 with the
  constraint on). A spec would be grading jsdom. Face choice, to be written down: **the face lays nothing out, so Constrain to parent
  constrains nothing**; its clamp (and the slack the library keeps past an edge) waits for geometry, with Columns.
- A finger: the library reads `targetTouches` / `changedTouches` with an `identifier`, which the face's `touch` act does not carry. A
  touch drag needs those on the event.

**The face needs a pointer with a position**: every act so far has its pointer at (0, 0) and `move` is a fixed 10 px. The Drag needs
a press at a point, moves to points and a release at a point, each its own act so graph writes can land between them.

**Reach.** One product use: the Site Builder's `/Admin/SectionRow` wraps each section's row in a Drag (Axis Y, Constrain to parent
off) to reorder sections; Drag Ended runs a Function that measures the row against its siblings and snaps it back. One catalog
example (`vis-drag-snap-back`). No shelf template.

**Findings** (all open; P109's under R16):
- **P107-C101** (**high**, [the ledger](../../bugs/p107-c101-nothing-inside-a-drag-can-be-tapped-on-a-touch-screen.md)): on a touch
  screen nothing inside a Drag can be tapped. The library cancels every `touchstart` on the dragged element (`defaultPrevented: true`
  for a touch on a button inside; a `mousedown` is not cancelled), and **headless Chrome 154 with touch emulation** sends no `click`
  and no focus for a tap inside a box whose `touchstart` is cancelled (both work in the same box uncancelled). The Site Builder's
  section row holds its Save, Delete, Move and image buttons and four text fields inside its Drag.
- **P107-C102** (medium, [the ledger](../../bugs/p107-c102-a-drag-locked-to-one-axis-reports-movement-on-the-other.md)): Axis X still
  reports Drag Y and Delta Y (50, then 80, while the element is drawn at `translate(30px,0px)`); the next drag starts by sending Drag
  Y 0. The library documents that `axis` only controls the drawing; Drag.tsx forwards both axes.
- **P107-C103** (medium, [the ledger](../../bugs/p107-c103-a-drag-draws-only-its-first-child.md)): a Drag draws only its first child;
  the rest are silently absent. The catalog example `vis-drag-snap-back` puts its "Offset readout" Text second, so it never appears.
- **P107-C104** (low, [the ledger](../../bugs/p107-c104-css-class-and-css-style-on-a-drag-do-nothing.md)): CSS Class and CSS Style on
  a Drag reach no element.

**Withdrawn after measuring:** "Scale divides twice". `offsetXYFromParent` takes a `scale`, but `Draggable` keeps its own `scale` prop
and the core is left at 1.

**The build** ([drag.ts](../../../packages/nodegx-node-spec/src/nodes/drag.ts), `Drag`, v1, 19 scenarios, three acts).
- **The face** (node-spec-target.ts): the Drag's page holds one real Group as its child (a Drag draws only its first, C103), and three
  new acts carry a POSITION — `pressAt` (`{ x, y, by?, button? }`: a mouse button, or a finger with `by: "touch"`), `moveTo` and
  `releaseAt` (`{ x, y }`). A mouse's move and release are dispatched at the document (where react-draggable listens; the face has no
  geometry); a finger's go to the element it went down on (`touchAt`), so once that element has left the page the document hears
  neither. One pointer at a time: a mouse press ends what a finger was doing, for the face. Every other spec is untouched: the acts are
  new names, and the Drag is the only node whose page holds a Group child.
- **The spec** reads the library's own arithmetic: the pointer against the page, `x + deltaX / scale`, the slack Constrain to parent
  keeps (with no layout the bounds are unreadable and clamp nothing, but a text position joins the slack as text — "50" moved 10 is
  "5010", or "50100" with the constraint on; the runtime does exactly that, a scenario grades it), the controlled position the library
  returns to at a let go, and `getDerivedStateFromProps` taking a changed (`!==`) position. The snaps are Animate To Value's timer
  (Ease Out, joined at the frame's timer pass and run at 0 at once), started at the frame's end from where the element is; Done when
  run, or at the mount for a Do that waited (16 wait; the 17th pushes the oldest out as Failure).
- **Three runtime rules the first 200 found, modelled** (the library's, not React's): a press during a drag is not a fresh start — the
  core still holds its last point, so the start reports the movement since it (`createCoreData`); the drag hears only the kind of
  pointer that started it (its document listeners), a core started by a finger reads only a touch (a mouse event is ignored, so a mouse
  release leaves the finger's drag going) and one started by a mouse reads a touch as NaN; the child's own `onTouchEnd` ends a drag too,
  and sets the module's pointer kind (`dragEventFor`, shared by every Drag) to touch, which decides which listeners a stop takes off.
- **The drain, found by the runtime's 10,000** (12 divergences, none a row): every pointer handler on the child's element is wrapped
  to drain the graph after it runs (pointerlisteners.ts :170-186) — the library's own `onMouseDown` and `onTouchEnd`, which win over
  the Group's, and the Group's `onTouchStart`. So a Do sent earlier in the frame runs AT a press or at a finger's lift on the child, not
  at the frame's end — after the library's handler, before React commits that handler's `setState`: a Do drained at a lift snaps from
  where the element was before the drag ended. A mouse's release lands on the document and drains nothing. Modelled (`drain`), with
  two scenarios grading it; 9 of the 12 were it. Two were the wire's rule — within a frame the wire keeps the last DEFINED value (the
  timer pass's Drag Y, then a paint's `undefined`), which a spec must apply inside its own one-patch frame (`join`). The last three were
  C102, reached through a press the generator had shrunk away. **Judge the unshrunk sequence** (s54's lesson 4, again: every one of the
  12 printed shrunk looked like C102).
- **Write the whole state on every path, first** (s54's lesson, done from the start this time): every reducer's patch writes the held
  state as it stands (`toPatch`). The first build, without it: 1,500 mutants, 30 survivors; with it: 141, then 4, then 0.
- **Two probe traps met again.** *A skipped paint heals at the next one*: a killer for an act that does nothing must write Start Drag X
  again between two such acts in one frame, so the second paint's Delta X reads what the first recorded. *A reader must sit between*: an
  act whose paint takes the Drag off the page is told from its twin only by a Do after it in the same frame (the Do's callback runs
  before the frame's paint, on no component: it waits).

**More findings** (open; P109's under R16):
- **P107-C105** (low, [the ledger](../../bugs/p107-c105-a-snap-that-waited-for-the-drag-to-mount-starts-from-0.md)): a Snap Do that waited
  for the Drag to mount runs from 0, not from where the element starts (it reads the constructor's state before `componentDidMount`'s
  write lands) — the element jumps to the edge and animates from there. A known row; the spec says the intent.
- **P107-C106** (medium, [the ledger](../../bugs/p107-c106-a-start-drag-x-of-nan-blanks-the-page.md)): a Start Drag X or Y of NaN blanks
  the page — `componentDidUpdate` compares NaN with itself and sets state until React throws. Withheld from the runtime's sequences
  (conformance.test.ts `WITHHELD`), graded by its scenario as a known row.
- C102 is a known row on the runtime (the spec says the intent: on a locked axis Drag X / Y say where the element is, Delta 0).

**Face choices, written down:** no geometry — Constrain to parent constrains nothing (§ above); a mouse's move and release land on the
document; a touch is identifier 0; one pointer at a time; a press raises no hover, leave or click. **Copied, not rowed (R3):** a text
Start Drag X joins the movement as text.

**Readings (2026-10-07, the final 20 scenarios).** Interpreter: at 200 on seeds 13, 20729, 20730 and 7, and at 10,000 on seeds 20731
(before the drain: 336 / 337) and 20733 (312 / 313): CONFORMS, 0 divergences, 0 survivors (the one left each time declared: a placing
off the page). Runtime: at 200 on seed 20733 (the day's; C102 ×24, C105 and C106 by their scenarios, NaN withheld on both start ports;
127 / 128) and on seed 13 (C102 ×18, C105 ×1; 175 / 176), and at 10,000 on seed 20733 (C102 ×1,042, C105 ×4; 312 / 313): CONFORMS,
0 unattributed divergences. Shared changes (the face's child, the three acts, the Drag registered): the runtime's target and graph
suites 106 / 106; at 200 on seed 20733 the Button, Icon, Text, Group, Circle, Image and Radio Button Group CONFORM. The Text Input v6
agrees on every scenario and sequence but leaves one mutant at that seed (`person.press` swap-branch on its willUnmount + onBlur
branch) — the same survivor on the INTERPRETER, which never touches the face, so not this session's change: the branch is P109's D30
fix (32e1856b0), and the day's seed rotation found its gap. Told P109.

### 7.17 s56, 2026-10-08 — the Component Stack conforms (15 of 19): the callers, one request at a time, seven rows

**Why this one.** Of the four left that place children (Component Children, Repeater, Component Stack, Page Router), the Component
Stack is the one the existing seams reach: NSP-015 s18's STACK already spells its protocol from the caller's side (a push or a replace
`{ target, params, transition }`, answered done, unchanged or a failure; a Pop's back callback), and s15's DEFINITIONS build a component
by name. Component Children has no ports at all; the Repeater needs collections, per-item ports and its own async creation; the
Page Router reads the URL.

**The reading** (navigation-stack.tsx, navigation-handler.ts, transitions/*.ts, async-queue.ts, navigate.ts, navigate-back.ts), then
fifty probe cases recorded on the runtime before a rule was written:
- **A request arrives by name** (`NavigationHandler`): a blank name is `Main`; a name no stack holds waits in the handler and is
  replayed when a stack registers under it (a waiting push resets the stack first). A stack registers at its mount, and again at every
  Name write — even the same name — and **registering resets it** (row C113). Mounted off deregisters; on again rebuilds the start page.
- **One request at a time** (`ASyncQueue`). A reset, a push and a replace each run their checks at once — a refusal is answered there
  (no components; still animating; no such page; already showing) — then build the page (`await createNode`), which lands at the next
  yield to the event loop. A back is not queued.
- **The transition** is the only clock: None (or a Push / Popup with no time) ends at once; a timed one ends at the first frame past
  start + Duration + Delay (a `requestAnimationFrame` chain), and while it runs the stack refuses pushes, replaces and backs. A
  reset does not stop it, and a back's end pops the LAST entry, whatever it is by then (row C110).
- **Children Count** is the page containers: two while a push plays (the page below leaves at the end), and while a back plays.

**THE CALLERS — the format's one addition** (trace.ts, schema.ts, schema/trace.schema.json; additive; stranger hashes refreshed): an
`answer` observation event, in the LOCATION group in the order made — `{ op: push | replace | back, value: done | unchanged | failure,
error?: <code> }`, or `{ op: 'returned', action?, results }` (what a popped page hands the node that pushed it). A spec says it with a
patch's `answers`. The requests are three acts — `push`, `replace`, `back` — with what a Push Component To Stack and a Pop hand.

**Two more format pieces, both additive.** `resume` (spec.ts `Patch.resume`, `WorldHandlers.resume`; the interpreter's inbox): a node
awaits a promise its own code makes; it lands at the next yield — a settle's, after the frame's end, or an advance's, before the clock
moves. A transition that starts there starts at that clock (measured: a push, then an advance of 200, then 101 — the push's animation
ends at 301, so it started at 0). `undriven` (spec.ts `ValueInputDecl`): a declared port the generator does not drive yet, with why —
Use Routes, v2. The mutant runner knows both (`drop-answers`, `drop-resume`); an await is not part of a branch's shape (it split every
branch by whether the queue started there, and each split needed its own scenario — four seeds, four new survivors).

**When a request reaches the stack — measured, then made the face's rule.** A Push Component To Stack and a Pop both hand their request
at THEIR frame's end (`scheduleNavigate` → `scheduleAfterInputsHaveUpdated`), synchronously with the frame's other callbacks. The face's
first version called the handler at the act, and the play's `await` between steps let microtasks run between two requests: a request
behind a refused one ran one act later, behind a throw two acts later, and a page build landed about seven acts later (a push and forty
Pops in one frame: the seventh Pop popped it). That is the runner's `await`, not the app. Now the face schedules every caller's request
on the stack's own frame-end list, in step order with the stack's scheduled Reset — as in the app. What still starts outside a frame (a
register at a Name write, or at an act's paint) counts act boundaries in the spec (`hops`): a check that returns frees the queue one
boundary later, a throw two (async-queue.ts `.then`, then `.catch`); a build waits for the yield.

**Face choices, written down:** the play's project has three components — `Home`, `Detail`, `Settings` — each holding one Pop
Component Stack and nothing else; any other name is one the project does not have. A request goes through the play's real
`NavigationHandler`, past its own recording (that is the caller's `stack` event). A Pop is the one in the top page as the person sees it
at the act; a page deleted by the frame's end asks nothing. A request that throws while it builds rejects a promise nothing awaits — in a
browser a console line; the face takes it. The stack gets a real `NodeScope` (a lone node's stand-in had no `createNode`), real Groups
for its pages (the popup stand-in now replaces only the popup root's), and the world's clock in `window.performance.now` (jsdom's runs
on the wall clock). **And one the generator found at once:** the face's React is the DEVELOPMENT build, which freezes the style object a
component hands a DOM element; the stack hands its div the node's own, so its next Background Color or Clip Content write threw — in the
face only (the app ships `react.production.min.js`). Before a write the face gives a frozen style back as a copy.

**Use Routes is v2.** The URL is the world's LOCATION, and a page in a play does not have it: the world's `window` is replaced by the
page's jsdom one, whose URL is `about:blank`, and a Component Stack reads the bare `location` (undefined there: the reset throws). v2 puts
the world's location and history on the page's window.

**Rows** (all open, all ledger; the spec copies each, R3):
- **P107-C107** (medium, [ledger](../../bugs/p107-c107-a-push-to-a-component-the-project-does-not-have-is-never-answered.md)): a
  push, replace or Reset to a page whose component the project does not have is never answered.
- **P107-C108** (low, [ledger](../../bugs/p107-c108-a-push-with-a-transition-the-stack-does-not-know-is-never-answered.md)): a push
  with a transition the stack does not know is never answered (a replace falls back to no animation).
- **P107-C109** (low, [ledger](../../bugs/p107-c109-a-components-value-that-is-not-a-list-blanks-the-stack.md)): Components that is not
  a list blanks the stack and its Reset is never answered; a page found by its label with no component throws the same way.
- **P107-C110** (medium, [ledger](../../bugs/p107-c110-a-reset-during-a-backs-animation-empties-the-stack.md)): a Reset during a back's
  animation empties the stack, and every push after is never answered.
- **P107-C111** (low, [ledger](../../bugs/p107-c111-a-back-whose-page-below-left-components-never-pops.md)): a Pop whose page below left
  the Components list hands the results back but never pops.
- **P107-C112** (low, [ledger](../../bugs/p107-c112-a-reset-that-finds-no-components-keeps-naming-the-old-page.md)): a reset that finds
  no components leaves Top Component Name and Stack Depth naming the page that went.
- **P107-C113** (low, [ledger](../../bugs/p107-c113-writing-a-stacks-name-rebuilds-it.md)): writing Name, even the same one, rebuilds
  the stack at its start page.
- **P107-C114** (low, [ledger](../../bugs/p107-c114-children-count-lags-a-frame-after-a-remount.md)): a stack mounted again at a
  frame sends no Children Count in that frame — the page it builds is counted a frame late (measured, not read to the line; found by
  the runtime on a scenario the interpreter had written from the reading).

**The build** ([component-stack.ts](../../../packages/nodegx-node-spec/src/nodes/component-stack.ts), `Page Stack`, v1, 98 scenarios,
three acts). Every reducer works on a draft of the whole state and returns it whole (s54, s55), and the runtime's lookups that throw on
a value they do not expect (`_findPage`, `pages[0].id`, the handler's names) run as the same expressions on the same values. **THE
MATRIX** (s51's lesson): every frame-end shape — no paint, an unmount, a remount × a refused push, a refused replace, a push, a replace,
an Unchanged push, a Reset — each followed by a frame that shows the queue is free; plus one scenario per queue state a yield can leave
(a refusal, a throw, a build behind it).

**The mutants, and what they taught.** Each new seed found one more frame-end combination (a paint × a refused request) with a mutant
nothing killed; the matrix ended that. Three runner lessons: an await (`resume`) is not part of a branch's shape; a `resume` asked for
by a request the act boundary frees is always redundant (one is already waiting since the queue started working — so only a queue
going from idle to working asks); and a killer for "a request replayed at the second act after a Name write" needs the act's own
request told apart from the replayed one (another op, or a page the stack does not have) — under `drop-set` the replayed one re-runs
at the yield and answers exactly what the lost one would have. A waiting REPLACE replays with no reset, so it runs at the Name write.

**Readings (2026-10-08, 98 scenarios, three acts).** Interpreter, every mutant killed or declared (one: a placing with Mounted off):
at 200 on seeds 13, 20733, 20729, 7 and 20734–20746, and at 10,000 on 20733 (796 mutants). Runtime: CONFORMS at 200 on 13 and 20733
and at 10,000 on 20733 — 0 divergences; the runtime conformance test (`NSP_ONLY="Page Stack"`) CONFORMS, 643 / 644 mutants (the
declared one). Cost: 200 sequences in ~3.5 s on the runtime, 10,000 in ~90 s; the interpreter with mutants at 10,000 in ~30 s.

### 7.18 s57, 2026-10-08 — the Page Router conforms (16 of 19): the location on the page, two acts, four rows

**Why this one.** The handoff offered the Page Router or the Repeater. The Router shares the Component Stack's machinery (an
`ASyncQueue`, a page built by name, requests answered), and what it lacked — the world's LOCATION on a play's page — is also what the
stack's Use Routes v2 needs. So the seam first, then the node.

**The reading** (router.tsx, router-handler.ts, router-navigate.ts, page.ts, page-inputs.ts, async-queue.ts, and the editor's
exporter `utils/exporter/router.ts`), then fifteen probe cases recorded on the runtime before a rule was trusted:
- **The page index is the project's** (`graphModel.routerIndex`): one entry per Page node (`path`, `title`, `component`) and the
  Routers — **only those whose saved Name is truthy** (`getRouterIndex` filters on it). An unnamed Router matches no URL and shows its
  start page whatever the address says: P109-S18 from the runtime's side. The Router's own Pages input names its routes and start page.
- **The URL.** The hash (`navigationPathType` unset or `hash`) or the path (`path`), and the query, which is decoded with
  `decodeURIComponent` and THROWS on a malformed escape (row C115); the path's segments are decoded once and never throw (NDA-012 D1).
  The page whose pattern differs least in length wins, the first on a tie; no match is the start page.
- **The callers.** A Navigate hands its request at its frame's end; the handler hands it on 1 ms later, to the one registered router
  whatever name it carries when exactly one is registered, else by the name as handed or into a queue — which a router registering as
  `name || 'Main'` replays only when the queued name is `===` that (row C118). Answers: Failure (no target, a component with no page),
  Done after a new tab (`window.open`), Unchanged for the page shown with `===` parameters, else a build: the Page Inputs handed the
  parameters, the page on, the URL pushed, Done. A navigate builds a component whatever its Page nodes; only a reset refuses one.
- **A reset** (the mount, Reset, a Pages edit, `popstate`) reads the URL and never pushes one. The page it shows with other parameters
  is Done — and the parameters go to `_internal.currentPageComponent`, which only a reset writes: after a Navigate it is a page already
  deleted, and the page on screen keeps the old parameters (row C117 — Back from product 2 to product 1 shows product 2).

**THE LOCATION ON THE PAGE** (the seam; world.ts LOCATION, the face's `installPage`). A visual play's window is jsdom's, whose URL is
`about:blank`. In a play whose world has a location, the page's window now IS that browser: its `history.pushState`, `open`, a
`popstate` / `hashchange` dispatched on it and the listeners for them are the world's (`window.location` itself is jsdom's and cannot
be replaced — it is [Unforgeable]; a page's bare `location`, `history` and `dispatchEvent` were the world's already). The person's
Back and Forward is the world's new `traverse`: the href moves on the same origin, nothing is recorded (the node made no call), the
`popstate` listeners run, then `hashchange` when the hash moved. The Component Stack's Use Routes v2 can stand on this.

**The format, additively** (spec.ts, trace.ts, schema.ts, schema/trace.schema.json, interpreter.ts, world.ts, generate.ts; stranger
hashes refreshed, rounds 1–4 green): `answer` gains `navigate` (a router's answer to a Navigate) and `page` (the parameters handed to
a Page Inputs, a new `params` field); an `AnswerCall` may also be a `history` or an `open` call, recorded in its place among the answers
— several builds can land at one yield, each making page → push → answer in turn, which one `push` slot per patch could not order;
`WorldView.href()`; a patch's `traverse`; a pool's `locations` (drawn only when the pool names some, so no other spec's sequences move).

**Face choices, written down:** the play's project has four page components — `Home` at `/`, `Product` at `/product/{id}` (a Page and
a Page Inputs each), `About` at `/about` (a Page), `Twice` at `/twice` (two Pages; the index lists it once — the lookup takes the first
of its twin entries). The index's router is the node by the Name it was PLACED with (a wired Name never moves the saved index) and its
Pages as they are now (edit-only; the editor resends the index with every edit). `Noodl.SEO.setTitle` (the tab's title — the same
string as Current Page Title) and `Noodl.Events.emit('NoodlApp_Navigated')` are taken by the face, not traced. No page is kept
(ISL-004's Keep When Leaving is off on every page of the play).

**What the runtime showed that the reading had not:** (1) a frame whose paint mounts the router counts Children Count late ONLY for
what the mount starts — it runs in React's commit, after the frame's last update pass; what the frame's callbacks started before it
(a Reset's build) lands before that pass and is counted at once (C114's frame, made precise: `early` in the spec). (2) Two builds landing
at one yield flag Current Page Component "About" then `undefined`: the wire keeps "About" (C3), so the spec sends each output at its
flag (`view.send`), not at the reducer's end. (3) The placing mounts — its reset reads the params as placed, before any step's write.

**The build** ([page-router.ts](../../../packages/nodegx-node-spec/src/nodes/page-router.ts), `Router`, v1, 136 scenarios, two acts).
The queue machinery is the Component Stack's; the URL code runs the runtime's own expressions on the same values (the match, the
decode, `_trimUrlPart`, the query's throw). THE MATRIX first (s51, s56): nine requests (a Reset, a navigate, an Unchanged, a refused and
a new-tab navigate, a Back, a malformed Back, a Name write, a Pages write) × no paint / Mounted off before or after / Mounted on before or
after / after a Name write, each followed by an observer (a Reset, a navigate, a Reset). Each new seed then found one more frame-end
combination; four scenarios closed them, and the 10,000 one more (a Reset answered Unchanged in the frame the router comes back).
Equivalent mutants declared (counted): a placing off the page, and three refusals at the handler's millisecond (their hops are freed
at the advance's yield, which the same patch asks for, with nothing in between).

**Rows** (all open, ledger; the spec copies each, R3):
- **P107-C115** (medium, [ledger](../../bugs/p107-c115-a-malformed-escape-in-the-query-blanks-every-page-router.md)): a link whose
  query has a malformed escape blanks every Page Router, and its Reset is never answered.
- **P107-C116** (low, [ledger](../../bugs/p107-c116-a-url-path-of-null-blanks-the-page-router.md)): Url path null — every reset
  throws; a Navigate shows the page but never pushes its URL or answers.
- **P107-C117** (medium, [ledger](../../bugs/p107-c117-back-to-the-same-page-with-new-parameters-after-a-navigate-keeps-the-old-ones.md)):
  after a Navigate, Back or Forward to the same page with other parameters keeps the old ones.
- **P107-C118** (low, [ledger](../../bugs/p107-c118-a-navigate-with-no-router-name-made-before-the-router-is-on-the-page-is-never-answered.md)):
  a Navigate with no Router name, pressed while no router is on the page, waits for good.

**And the Button** (not this node, the day's seed): seed 20734 left one Button mutant — `person.leave` swap-branch on a focused button
held with no hover, Mounted off and a leave in one frame (P109's D30 branch, the Text Input's s56 twin). Two scenarios: the unhovered
pointer acts with a Focus and a Blur after each (the Blur is the reader: a button still on the page with the keyboard would give it
up), and the held twin (a finger, a press). Conforms at 20734, 20733, 13, 20735 on the interpreter and at 20734 on the runtime.

**Readings (2026-10-08, 136 scenarios, two acts).** Interpreter with mutants (136 scenarios): at 200 on seeds 20734, 20733, 13, 20729,
20735, 20736, 20741, 20742, 20745 — CONFORMS, every mutant killed or declared (4 declared) — and at 10,000 on 20733 and 20734 (369 /
373, 393 / 397). Runtime: the 136 scenarios side by side with the interpreter, identical; CONFORMS at 200 on 20734 and 13 and at 10,000
on 20734 (0 divergences, 105 s); the runtime conformance test (`NSP_ONLY` = Router, Page Stack, RouterNavigate, PageInputs,
PageStackNavigateToPath, External Link, Show Popup, Button, Drag; seed 20734) all CONFORM — Router 349 / 353, Button 690 / 698 (the
declared); runtime target + graph 106 / 106; the node-spec package suite 22 suites, 955 passed (stranger rounds 1–4, catalog parity,
page model, visual batch); both packages' tsc clean. Cost: 200 sequences in ~4.5 s on the runtime, 10,000 in
~105 s; the interpreter with mutants at 10,000 in ~15 s.

### 7.19 s58, 2026-10-08 — the Component Stack v2: Use Routes, the person's Back and Forward, eight rows

**Why this one.** The handoff offered the Repeater or the Component Stack's Use Routes. s57 put the world's LOCATION on a play's page,
which is all Use Routes lacked, so it was the smaller step. The visual batch was run first on top of P109's C81 fix (52fdaf088: Text
v7, Shape v3, Image v3, Group v5, Video v3): 35 / 35 with the page model.

**The reading** (navigation-stack.tsx `didMount`, `resetAsync`, `matchPageFromUrl`, `getRelativeURL`, `getNavigationAbsoluteURL`,
`_getLocationPath`, `_getSearchParams`, `_updateUrlWithTopPage`, the three callers of the last), then 29 probe cases recorded on the
runtime before the spec was written, each claimed defect beside a control:
- **Writing the URL.** A push and a replace push the top page's URL after naming it and before the transition; a back pushes the page
  below's at its transition's end. Always `history.pushState`: a pop and a replace each add an entry (row C120). The page's URL is its
  Path, else its label lowercased and dashed — found by the entry's page id with `==`, so a page asked for by its LABEL has none and the
  URL is `#` (row C123). `{name}` parts are encoded; the query is not (row C122). Hash mode writes `?query#/path`, and with no query only
  `#/path`, which leaves the old query in the address (row C121).
- **Reading the URL.** Every reset with Use Routes on reads it — the mount, a Reset, a Components edit, a Name write, `popstate`: the
  first page in Components order whose pattern matches the URL's parts from the start (a longer URL matches; unlike the Router's
  closest-length rule), its `{name}` parts and the whole query decoded with `decodeURIComponent`, which throws on a malformed escape —
  the reset has already deleted every page (row C124; C115's twin, and the stack's path parts throw too). A Path wired null throws when
  the loop reaches it (row C125; C116's twin). So a Reset shows the page in the URL, not the start page its port describes (row C126).
- **The browser's Back and Forward.** The stack listens for `popstate` from its mount to its unmount whatever Use Routes says, and
  resets at the frame's end: a stack with Use Routes off goes back to its start page too (row C119).

**The build** ([component-stack.ts](../../../packages/nodegx-node-spec/src/nodes/component-stack.ts), `Page Stack` v2, 145 scenarios,
four acts). Use Routes is driven (no longer `undriven`); `pagePath-<id>` is a derived input with Use Routes on (`=== true`, as the
editor draws it); the spec needs `location` and `project` and its pool a viewport, six locations and both path types; a new act,
`traverse` (the Router's). A stack entry carries the found page's path; a reset's entry carries the URL's parameters, which
`_isAlreadyShowing` then compares (a push of the reset's page is Unchanged only with `===` values — the URL's are text). The URL code
runs the runtime's expressions on the same values. No format change. THE MATRIX: 47 `ROUTES:` scenarios — the URL read at a placing
(hash, path, query, path parameters, a prefix, no match, malformed, null Path, Use Routes off), the URL written by each request (with
and without parameters, by label, a timed pop, Use Routes turned on later, Unchanged and refused pushes writing nothing), and the
person's Back × no paint / Mounted off before and after / Mounted on / a push before and after in the frame / a running transition /
twice with a Reset / after a Name write / no components / path mode, each followed by an observer.

**Rows** (all open, ledger; the spec copies each, R3):
- **P107-C119** (medium, [ledger](../../bugs/p107-c119-the-browsers-back-resets-a-component-stack-without-use-routes.md)): the browser's
  Back or Forward sends every Component Stack back to its start page, Use Routes or not.
- **P107-C120** (medium, [ledger](../../bugs/p107-c120-a-component-stacks-pop-pushes-a-new-history-entry.md)): a Pop pushes a new
  history entry, so the browser's Back shows the popped page alone, with a Pop that does nothing; a Replace adds an entry too.
- **P107-C121** (low, [ledger](../../bugs/p107-c121-a-component-stack-keeps-the-last-pages-query-in-the-address.md)): a page with no
  parameters keeps the previous page's query in the address.
- **P107-C122** (medium, [ledger](../../bugs/p107-c122-a-component-stack-writes-its-query-parameters-unencoded.md)): query parameters
  are written unencoded; a `%` empties the stack at the next reset.
- **P107-C123** (low, [ledger](../../bugs/p107-c123-a-page-pushed-by-its-label-has-no-url.md)): a page pushed or started by its label
  gets the URL `#`.
- **P107-C124** (medium, [ledger](../../bugs/p107-c124-a-malformed-escape-in-the-url-empties-a-component-stack.md)): a malformed
  escape in the query or a path part empties the stack; its Reset is never answered.
- **P107-C125** (low, [ledger](../../bugs/p107-c125-a-page-path-of-null-empties-a-component-stack.md)): a Path wired null empties the
  stack at every reset that reaches it.
- **P107-C126** (low, [ledger](../../bugs/p107-c126-a-component-stacks-reset-shows-the-url-page-not-the-start-page.md)): with Use
  Routes, Reset rebuilds the page in the URL, not the start page (a ruling: the port's description or the code).

**And one outside the runtime:** **P107-C127** (low, [ledger](../../bugs/p107-c127-the-catalog-does-not-know-a-component-stack-page-has-a-path.md)):
the catalog lists `pageComp-<pageId>` for the Component Stack but no `pagePath-<pageId>` (its probe never ticks Use Routes), so the MCP
cannot give a page a Path.

**Readings (2026-10-08, 145 scenarios, four acts).** Before the build: the visual batch and the page model, 35 / 35, on P109's C81 fix.
Interpreter with mutants: CONFORMS at 200 on seeds 13, 20734, 20733, 20729, 20735, 20736, 20741, 20742, 20745, 7 — every mutant
killed but the one declared (a placing with Mounted off) — and at 10,000 on 20734 (801 / 802) and 20733 (840 / 841). Runtime: the 47
new scenarios side by side with the interpreter, identical; `NSP_ONLY="Page Stack"` CONFORMS at 200 on 20734, 13, 20733, 20729, 7 and
20735, 0 divergences each, and at 10,000 on 20734 (0 divergences, 110 s). The runtime conformance test (`NSP_ONLY` = Page Stack, PageStackNavigate, PageStackNavigateBack, PageStackNavigateToPath, Router, RouterNavigate, PageInputs; seed 20734) all CONFORM — Page Stack 791 / 792, Router 349 / 353, Pop 1184 / 1193 (the declared); runtime target + graph 106 / 106; the node-spec package suite 22 suites, 955 passed (stranger rounds 1–4, catalog parity, page model, visual batch; `-w 2`); both packages' tsc clean. Cost: 200 sequences in ~6.5 s on the runtime,
10,000 in ~110 s; the interpreter with mutants at 10,000 in ~12 s.

### 7.20 s59, 2026-10-08 — the Repeater conforms (17 of 19): rows a person clicks, the registry's list, the queue's act boundaries, four rows

**Why this one.** The handoff named it: the last of the three that place children with ports (Component Children has none; Columns
waits for geometry). P109's C77–C79, Router v2–v5 and C101 had not landed on `cline-dev` at the start (they were in its worktrees), so
the visual batch was not re-run first; nothing here builds on those specs.

**The reading** (foreach.tsx, collection.ts `set`, model.ts, nodescope.ts and nodecontext.ts `createNode` / `getComponentModel`,
componentinstance.ts, node.ts `update`, the viewer's guid.ts), then probe cases recorded on the runtime before a rule was trusted:
- **The rows are the parent's.** A Repeater draws nothing (`ForEachComponent` renders `null`); each item's component is added to its
  PARENT after itself. A Repeater with no parent builds nothing. A loaded project names the parent before the parameters
  (`setNodeModel` → `updateTarget`, which asks for a rebuild), and adds the Repeater to it after.
- **The list is a Collection.** Items is copied into the Repeater's own anonymous array with `set` (ten draws for the array): plain
  rows become records by id (one record per id; an anonymous one, ten draws, for a row with none, unless the list has seen that very
  object), and every removal and addition is one operation on the queue. **A `null` item throws** (`Model.instanceOf(null)` reads
  `.target`). The registry's array (registry.ts) is the same diff, so the spec uses it — ids, anonymous ids and their draws matched the
  runtime on the first probe.
- **The queue.** One operation at a time; an addition draws the row node's id (eight draws, guid.ts) and awaits `createNode`, which
  resolves eleven microtasks later — or THROWS for a component the project does not have, and the runner, which catches nothing, stops
  with `runningOperations` true for good (row C128). A throw inside a node's frame-end callbacks drops the rest of them for the frame
  (node.ts :759-763), which strands `hasScheduledRefresh` (row C130).
- **A click drains the graph** (pointerlisteners.ts): the Repeater's frame-end work waiting from earlier steps runs inside the click,
  before the row's click is delivered — a row the work removes delivers nothing. So the queue can start at an act, not only at a
  frame's end, and act boundaries matter. **Measured** (an act is one awaited microtask; a set or a signal none): a removal frees the
  queue one act later; an addition with no component two; a rebuild that fails, or builds nothing, one plus one per record it looked
  at; a build lands only at the yield (eleven microtasks — a play never has that many acts in a row); Items Rendered when the queue
  empties, after every run of it (row C129).

**THE PLAY'S PROJECT** (repeater.ts `REPEATER_TEMPLATES`, registered by the face as the app's project registers a component): `Row`
(inputs `id`, `label`; outputs `Id`, `Label`, `Tapped` — a Text showing `label`, its Click wired to `Tapped`) and `Card` (`title` →
`Label`). What a person does is click a row (`tapRow`, by its place in the parent): Item Id, the item outputs the Repeater has (the
PLACED Template's — the editor's dynamic ports), then `itemOutputSignal-Tapped`. **No format change**: the act is new, the rest is the
s56 machinery (`resume`, `answer` unused) plus one rule the format already had — an input's reducer cannot resolve another
invocation, so a Refresh answered at an act boundary inside a step is held in the state and handed over by the next frame end, act or
yield (the same settle, the same report order).

**Face choices, written down** (node-spec-target.ts): the Repeater sits in a real Group made in its own real scope, named its target
before its parameters are set and given it as a child after (a loaded project's order); `performance.now` is the world's clock, which
does not move while the node works, so chunked creation (`repeaterCreateComponentsAsync`) is one run — in the pool, graded as that. What
throws in the queue rejects a promise nothing hears (a console line in a browser); with chunked creation it is `runOps`'s, which jest
fails the suite on, so the face takes it at its source: the build of a component the project does not have, and a rebuild whose Items
hold a `null`, hand back a promise that never settles — the runner stops at the same `await`. Every other build is the runtime's own
promise, untouched (its microtasks are the spec's act boundaries).

**The build** ([repeater.ts](../../../packages/nodegx-node-spec/src/nodes/repeater.ts), `For Each`, v1, 81 scenarios, one act). Script
and the input mapping are JavaScript: `undriven`, v2 (Template Type other than Explicit therefore builds no row). THE MATRIX first
(s51, s56, s57, s58): fifteen requests (a new list, emptied, with a `null`, rows with no id, Template Card / Missing / empty, Template
Type dynamic, Refresh, a Refresh with a list before or after it, a `null` list with a Refresh, a rebuild that fails or builds nothing
behind builds, a list then `null`) × four frame ends (a settle; a click before it; two clicks; a click, a list, two clicks), each
followed by an observer (a click on each row, a Refresh, a click). The page model (G1–G8) passes; its G5 replay now runs only when an
attribute can be preset — with none it compared a frame end with itself, and the Repeater's writes the registry and draws, so the
second run was noise (a guard change, no spec moved).

**Rows** (all open, ledger; the spec copies each, R3):
- **P107-C128** (high, [ledger](../../bugs/p107-c128-a-repeater-that-meets-something-it-cannot-build-never-draws-again.md)): a
  Template the project does not have, or Items holding a `null` when the Repeater rebuilds, stops it for good — no later Items, Template
  or Refresh is drawn or answered, Items Rendered never fires again. Its own `template-component-not-found` report is dead code.
- **P107-C129** (low, [ledger](../../bugs/p107-c129-items-rendered-fires-when-the-repeater-built-nothing.md)): Items Rendered fires
  after every run of the queue, including one that built nothing — at load before any Items, after a failed Refresh.
- **P107-C130** (medium, [ledger](../../bugs/p107-c130-a-list-with-a-null-keeps-the-old-rows-and-loses-the-repeaters-rebuilds.md)):
  Items holding a `null` keep the old rows, and a Refresh, Template or Template Type change after it in the frame is lost — with every
  later Refresh, never answered again.
- **P107-C131** (low, [ledger](../../bugs/p107-c131-a-repeated-id-draws-its-row-after-the-next-and-rebuilds-it-at-every-copy.md)): a
  list whose items repeat an id draws that row after the next one, and every later copy of the same list rebuilds it.

**Readings (2026-10-08, 81 scenarios, one act).** Interpreter with mutants (81 scenarios): CONFORMS at 200 on seeds 13, 20734, 20733, 20729, 20735, 20736, 20741, 20742, 20745 and 7 — 81 / 81 mutants killed, none declared — and at 10,000 on 20734 (94 / 94) and 20733 (81 / 81). Runtime: the probe cases side by side with the interpreter, identical (anonymous ids included); `NSP_ONLY="For Each"` CONFORMS at 200 on 20734, 13, 20733, 20729, 7 and 20735 — 81 / 81 scenarios, 0 divergences, 81 / 81 mutants each — and at 10,000 on 20734 (0 divergences, 94 / 94, 100 s; a first 10,000 taken before the scenarios existed also read 0). The specs sharing the face, at 20734: Button 690 / 698, Group 9537 / 9567, Drag 127 / 128, Page Stack 791 / 792, Router 349 / 353, Pop 1184 / 1193 (each the declared), all CONFORM; runtime target + graph 106 / 106; the node-spec package suite 22 suites, 960 passed (stranger rounds 1–4, catalog parity, page model, visual batch; `-w 2`); the node-spec tsc clean. Cost: 200 sequences in ~4 s on the runtime, 10,000 in ~100 s.

### 7.21 s60, 2026-10-08 — the Columns conforms (18 of 19): the band, read from one width the world lays out; two rows

**Why this one.** Two visual nodes were left, and s59 asked for both to be read first. **Component Children is not a node**: the
runtime never makes one (nodescope.ts `createNodeFromModel` :216-222 returns before `createNode`, after telling the component that
owns it which node is its child root, `setChildRoot`; componentinstance.ts :249-282, :284-301). It has no ports, no state and nothing on
the wire; what it does is where a component instance's children are placed — a graph-level rule (NSP-015's boundary), not a node's.
Proposed: AC3's "exempt with a reason", the placement graded as a graph scenario when the graph runner can place children (a question
for Richard, README §7). **The Columns' logic needs no geometry**: what it reports — Breakpoint, At Medium, At Small — is picked from
ONE number, the width its container is laid out at. So the spec takes that number from the world, as the Drag takes a pointer's
position, and lays nothing out; the column widths, autofold and masonry wait for NSP-017. P109's C77–C79, Router v2–v5 and C101 had
not landed on `cline-dev` (their worktrees only), so the visual batch was not re-run for them first; nothing here builds on them.

**The reading** (columns.ts, Columns.tsx, react-component-node.ts `defineRegularInputProp`, node.ts `setInputValue`, nodedefinition.ts
`initializeDefaultValues`, kit-node-boundary.ts), then twenty probe cases recorded on the runtime before a rule was trusted — every one
identical on the interpreter once the spec was written:
- **The band** is picked at every render from the props and the measured width (`pickBreakpointLayout`): Small when Small Below > 0,
  Small Layout truthy and the width below it; else Medium the same way; else Default — and Default with no measurement, under Auto
  Fit, and when the Layout String cannot be read (the children are then drawn bare, with no container to measure).
- **The measurement** is a `ResizeObserver` made with the container element and again with a new Horizontal Gap (its effect's
  dependencies), reporting the width less the gap it was made with, clamped at 0.
- **Breakpoint and the pulses** come from an effect keyed on the band: a new component publishes its first band (always Default — it
  has not been measured) and every change after. So entering a band from "not measured" counts: a Columns that mounts narrow fires
  At Small in its first frame, and again after Mounted off and on, a Layout String emptied and restored, or Auto Fit turned off.
- **What reaches the props.** Horizontal Gap, Medium Below and Small Below are size ports. A number merges into the size the port
  holds — Horizontal Gap holds `16px` from its default, Medium and Small Below hold nothing until a size is set (row C132). A
  `var(--token)` is kept and reads as 0. A `{ value }` with no unit is `value + undefined`: `NaN` for a number, so the breakpoint is
  silently inert.

**THE LAYOUT on the face** (node-spec-target.ts): a Columns page holds two real Groups and stands in the browser's `ResizeObserver`
(jsdom has none) for one number — the page is 1024 wide before any `resize`, the container's `offsetWidth` is the page's width, an
observation reports when it starts and whenever the width is not the one it last reported, and a report is delivered at the browser's
next rendering step: the end of a settle (after the frame's commit), or the `resize` act. Face choices, written down: the container
has no height in the face, so "it reports when it starts" is the browser's rule for a container with content.

**The build** ([columns.ts](../../../packages/nodegx-node-spec/src/nodes/columns.ts), `net.noodl.visual.columns`, v1, 48 scenarios,
one act — `resize`, the page laid out at a width). No format change: the act is new, the rest is Icon's paint plus a report at the
paint. The seven inputs the band reads are `logic` (R10: an output reads them). THE MATRIX first: eight requests (a width across a
band, a breakpoint as a size / a bare number / a token / null, a breakpoint layout truthy or not, the Layout String readable or not,
Column Sizing, Horizontal Gap, Mounted) × four frame ends (a settle; a resize; two resizes; a set and a resize before the frame) ×
an observer (a resize after it, or the next frame). The page model: the band, the measurement and the container are the node's own
frame-end work and At Medium / At Small its frame pulses; the page's width is held by the layout (`Keeps` gains `'the layout'`).

**Rows** (all open, ledger):
- **P107-C132** (medium, [ledger](../../bugs/p107-c132-a-number-wired-into-medium-below-or-small-below-is-refused-until-a-size-is-typed-there.md)):
  a number wired into Medium Below or Small Below is refused unless a size was typed there first; and on any size port, a number after
  a `var(--token)` is refused. The spec copies it (R3).
- **P107-C133** (high, [ledger](../../bugs/p107-c133-a-medium-or-small-layout-that-is-not-a-string-blanks-the-page.md)): a Medium or
  Small Layout that is truthy and not a string (a number from a wire) blanks the page when the container narrows into its band —
  `parseLayout` calls `.split` on it in render, and no boundary holds a built-in node. R11: the spec says the band applies; a known row
  on the runtime target (`threwWith 'columnLayout.split is not a function'`), and the generated sequences withhold those values.
- **P107-C134** (medium, [ledger](../../bugs/p107-c134-auto-fit-with-min-column-width-equal-to-minus-the-gap-blanks-the-page.md)): found by
  the runtime's deep run (10,000 at seed 20734; one step once shrunk — Auto Fit, Min Column Width 1, Horizontal Gap −1): `calcAutoFit`
  divides by `min + gap`, `Infinity` at 0, and `new Array(Infinity)` throws in render — the page goes blank. R11: Auto Fit is Default;
  a known row on the runtime target (`threwWith 'Invalid array length'`). Min Column Width is a layout port, drawn a quarter as often,
  which is why 200 sequences at six seeds never met it.

**Readings (2026-10-08, 48 scenarios, one act).** Interpreter with mutants (48 scenarios): CONFORMS at 200 on seeds 13, 20734, 20733, 20729, 20735, 20736, 20741, 20742, 20745 and 7 — every mutant killed (70–94 per seed), none declared — and at 10,000 on 20734 and 20733 (94 / 94). Runtime: twenty probe cases side by side with the interpreter, identical; `NSP_ONLY="net.noodl.visual.columns"` CONFORMS at 200 on 20734, 13, 20733, 20729, 7 and 20735 (47 scenarios then; 20734 and 13 again with 48) — 0 divergences, every mutant killed, C133's (and C134's) scenario counted as its known row, the known rows still firing — and at 10,000 on 20734: a first run found C134 (one divergence, shrunk to one step), the second CONFORMS (0 unattributed divergences, 1 attributed to C134, 94 / 94, 110 s). The page model (G1–G8) passes for every visual spec; the node-spec package suite 22 suites, 965 passed (`-w 2`); runtime target + graph 106 / 106; the node-spec tsc clean. The specs sharing the face at 20734 (Button 690 / 698, Icon 105 / 105, Drag 127 / 128, Page Stack 791 / 792, Router 349 / 353, Pop 1184 / 1193, For Each 81 / 81) CONFORM; Text and Group were read across P109's landing of C78 / C79 / C101 / C115–C118 (7496d93f0..ddf76bce5) — the run loaded the old spec versions and Group's five C79 scenarios failed — so that reading is void. Re-run on the post-landing tree (HEAD 5ef61dcfa + s60's files) at 20734: Text v8 1212 / 1212 scenarios, Group v6 1406 / 1406, Drag v1 17 / 20 (its known rows C102, C105, C106), Router v5 137 / 137 — 200 / 200 each, 0 unattributed divergences, mutants 2710 / 2717, 8944 / 8966, 127 / 128, 445 / 449 (the rest declared): all CONFORM.

### 7.22 s61, 2026-10-08 — the Repeater v2: Script, graded; a Refresh dropped mid-rebuild (C137); the Drag's 20732 survivor; three rows

**Why this one.** The handoff offered the Repeater v2 (Script and the input mapping as JavaScript; `For Each Actions`' Try Remove
handshake; Items as a registry array whose own changes the Repeater hears) or NSP-013 AC2. NSP-013's AC2 is the export half, which
has no reach here (§6.4 there), and its deep run is a box-quiet job, not a build — so the Repeater. Of its four parts, **Script** was
built: it needs no new seam, and Array Map (`array-map.ts`) already set the rule — the spec compiles and runs the same code on the same
record. The other three are named below with what each needs first.

**First, the handoff's two checks.**
- **P109's landed specs:** Shape (`Circle`) v4, Image v4 and Video v4 on the runtime at 20734 (HEAD 0c62957c9): Circle 1232 / 1232
  scenarios, mutants 1821 / 1830; Image 1247 / 1247, 1862 / 1871; Video 365 / 1581 (the rest its known rows C96–C100), 3120 / 3130 —
  200 / 200 each, 0 divergences, the rest of the mutants declared: all CONFORM. (s60 had run Text, Group, Drag and Router.)
- **The Drag survivor at seed 20732** (P109's report): reproduced on HEAD's scenarios with the interpreter probe — the one survivor is
  `afterInputs` drop-set on the shape emit `[willUnmount]`, outcomes `[snapToPositionX.do: done]`: a LONE Do and Mounted off in one
  frame. The scenario "both Dos and Mounted off in one frame" reaches a different shape (two outcomes), so only a generated sequence
  ever reached this one, and at most seeds as its last step. New scenario (21): one Do and Mounted off in one frame on each axis, then
  the next frame, Mounted on, the clock — the dropped state leaves the Drag on the page with the Do still scheduled, so the next frame
  answers it again and unmounts again. Killed at 20732, 13, 20734, 20733 and 7 (the one mutant left at each is the declared one).

**The reading** (foreach.tsx `templateScript` :348-378, `getTemplateForModel` :501-537, `addItem` :556-590, `refresh` :723-810),
then sixteen probe cases on the runtime before a rule was trusted:
- **Compiled as it arrives**: `new Function('item', 'var component;' + code + ';return component;')`. Code that does not compile leaves
  NO function (the one before is dropped — NDA-012 D1); the declared default is never compiled (a default never runs its setter); a
  rebuild is asked for either way. `item` is the record (the registry's Proxy reads `item.label` through to `get`, as the runtime's does).
- **Per record**, on Template Type anything but Explicit (or unset — `null` and `'xyz'` included): no function, a throw (raised,
  caught) or nothing set is no component — no row, that record's act boundaries as before. A component that is not text throws at
  `template.startsWith('./')` (:524), OUTSIDE the catch: the queue stops for good (row C135, C128's mechanism by another line).
- **A rebuild needs `template || templateFunction`** (:745), whichever Template Type uses — so a compiled Script lets a Refresh with
  Template Type Explicit and no Template report Done and draw nothing (row C136).
- **Not graded:** a name starting `./` or `../` is read against the Repeater's own component's name (:523-533) — the play's Repeater
  sits in no named component, so the face reads `this.model` of nothing and stops. Kept out of the examples, written in the spec.

**The build** ([repeater.ts](../../../packages/nodegx-node-spec/src/nodes/repeater.ts), `For Each` v2, 145 scenarios, one act). Script
is driven (examples: names outright, picks per record and by id, names nothing for some, throws for some, does not compile, empty,
`'Missing'`, `7`); `templateFor` runs it per record. THE MATRIX first: thirteen Script requests × v1's four frame ends × v1's observer
(52), plus six named Script scenarios, four for row C137 and two for the deep run's survivor (below) — 64 new, on v1's 81.

**What the runtime's generated sequences found that the probes had not — row C137, a v1 hole.** At seed 13 the new draws reached a
Refresh, a click that starts its rebuild, and a second Refresh before the yield: the interpreter answered both, the runtime only the
first. Not the Script: the same on Template Type Explicit (E1–E3). `refresh` takes the waiting Refreshes at its start, and at its end
`settle` ASSIGNS them back to `pendingRefreshOutcomes` before answering — overwriting any pulsed while it ran. Their rebuild still runs
(Items Rendered twice); they are never answered. The spec copies it (R3): the rebuild's end empties the tokens. **When** a rebuild that
builds nothing ends was then measured (N records × a Refresh after K acts, N 1–6, K 0–7): dropped while K < N − 1, kept from N − 1 —
it settles after N of its N + 1 act boundaries, one left (`settling`, `settleRebuild`). A first model (two left) was off by one on five
probe cases; corrected, all 81 probe cases are identical on both targets.

**The interpreter's 10,000 found one survivor — killed by a scenario, not declared.** `person.tapRow` drop-resume on a click whose
drain runs a Refresh that fails at once (no Template): it looked equivalent (a failed rebuild builds nothing, and the next step's act
boundary frees the queue before anything new is queued), but the copy's ADDITIONS can wait behind the failed Refresh in the same drain,
and each reads Template when it starts — Template written back before the queue reaches the last makes it build, and only the yield the
click asked for lands it. The first scenario ("a Refresh that fails in a click's drain, with additions queued behind it…") matched the
runtime and did NOT kill it: its click also hands Tapped, so it reached the sibling shape (`emit` the Tapped pulse). The survivor's shape
has no emit — a Repeater with no Tapped output (placed with no Template, so the editor drew none). The second scenario is the same on
such a Repeater: killed, and identical on the runtime. **A scenario written to kill a survivor is graded on the survivor's SHAPE, not its
story — read the shape's emit and outcomes before writing it.**

**The face (node-spec-target.ts), one change.** C135's throw, with chunked creation drawn (`repeaterCreateComponentsAsync`), rejects
`runOps`'s promise, which nothing hears — jest failed the suite at three of six seeds though every report read CONFORMS (the exit
status, not the report, is the gate). The face takes it at its source as it does C128's: before `addItem`, it asks
`getTemplateForModel` the same synchronous question on the same record and, when that throws, hands back a promise that never settles —
the queue stops at the same `await`. Every other `addItem` runs untouched (no extra microtask: the act-boundary counts are unchanged).

**Rows** (all open, ledger; the spec copies each, R3):
- **P107-C135** (medium, [ledger](../../bugs/p107-c135-a-repeater-script-whose-component-is-not-text-stops-the-repeater-for-good.md)):
  a Script whose `component` is not text (a number, an object) stops the Repeater for good — `startsWith` outside the catch.
- **P107-C136** (low, [ledger](../../bugs/p107-c136-a-compiled-script-lets-a-refresh-with-no-template-report-done.md)): on Explicit with
  no Template, a Refresh reports Done once any Script has compiled; without one it fails `repeater/no-template`.
- **P107-C137** (medium, [ledger](../../bugs/p107-c137-a-refresh-pulsed-while-the-repeater-rebuilds-is-never-answered.md)): a Refresh
  pulsed while a rebuild runs is never answered — `settle` overwrites the list it was pushed to.

**Left of the Repeater v2, each with what it needs first.**
- **Items as a registry array whose own changes the Repeater hears.** A lone node's play has no way to change a registry array after
  placing — no step kind and no world script writes one (Array Map's `world.change` is graded only in graph scenarios). So either a
  graph scenario (another node writes the array) or a world seam (scripted registry writes at a time, as GROUP's `writes`). Decide the
  seam, then the node: `bindCollection` subscribes, and a change is a QUEUED operation (`collection.set(items)`), not a frame-end copy.
- **The input mapping** (`inputMappingScript`, a dynamic input drawn with a Template): `new Function('map', 'object', code)` like Array
  Map's, but the row's inputs then come from the mapping — and `id` is no longer set — so the spec needs each row's inputs as STATE
  (built at the landing, re-mapped at each record change by the CURRENT function), where v1 reads the record live.
- **Try Remove** (`For Each Actions`): a third row template holding a `For Each Actions` node, its Try Remove wired out and Remove
  Completed wired in from the row's click — the removal waits for the person; unwired, the removal moves to the item's frame end
  (`scheduleAfterInputsHaveUpdated`).

**Readings (2026-10-08).** Interpreter with mutants (145 scenarios): CONFORMS at 200 on seeds 13, 20734, 20733, 20729, 20735, 20736, 20741, 20742, 20745 and 7 — 108 / 108 mutants killed, none declared — and at 10,000 on 20734 (109 / 109) and 20733 (108 / 108), no survivor (a first 10,000 on 144 scenarios left `tapRow` drop-resume — above). Runtime: 82 probe cases side by side with the interpreter, identical (sixteen Script, the N × K table, C137's E1–E3 and H1–H2, the seed-13 sequence and its variants, the survivor's two); `NSP_ONLY="For Each,Drag"` at 200 on 20734, 13, 20733, 20729, 7 and 20735, each exit 0: For Each v2 145 / 145 scenarios, 0 divergences, 108 / 108 mutants; Drag v1 18 / 21 (its known rows C102, C105, C106), 0 divergences, 167 / 168 – 198 / 199 (the one left declared) — all CONFORM; at 10,000 on 20734: For Each CONFORMS, 0 divergences, 109 / 109, 104 s. P109's Circle v4, Image v4, Video v4 at 20734: CONFORM (above). The node-spec package suite (`-w 2`, 585 s): 21 of 22 suites passed, the page model failed on the three new state keys unclassified (G1) — classified (`script`, `compiles` the node's; `settling` frame-end work) and re-run: 20 / 20; 965 tests in all. Runtime target + graph 106 / 106; the node-spec tsc clean.

### 7.23 s62, 2026-10-08 — the Repeater v2: a registry array heard, the input mapping, rows that hold their inputs; the world's REGISTRY writes; two rows

**Why this one.** The handoff's order: Items as a registry array whose own changes the Repeater hears (a seam first), then the input
mapping, then Try Remove. The first two were built; Try Remove is left (below).

**The seam: REGISTRY writes made elsewhere** (world.ts REGISTRY, registry.ts `RegistryWrite` / `performRegistryWrite`). A lone node's
play had no way to change a registry array after placing — no step kind writes one, and Array Map's `world.change` was graded only by
graph scenarios. Chosen: a world seam rather than a graph scenario, because generated sequences and mutants reach a seam and only hand
scenarios reach a graph. A world script's `registry.writes` is the app writing the registry elsewhere — an array's members (`set` the
diff to the records named, `add` one, at `index` when given, `remove` one) or one key of a record — each at its `at` ≥ 1 ms, world timers
scheduled before any node's, like the backend's store events (s24). A target performs each through the verbs a node would call: the
interpreter on its registry with no instance the writer (every watcher hears it — `hearRegistryWrites`, after the inbox is delivered,
as s26's), the runtime face on the real `Model` / `Collection`. Not a trace event. The export has no world, so it is outside.

**The heard array** (foreach.tsx `bindCollection` :476-485, `onItemsCollectionChanged` :257-269), then 28 probe cases on both targets
before a rule was trusted — every one identical: written to Items, a registry array is LISTENED to (the one before is not); its own
`change` QUEUES a copy — an operation like any other, copying Items as it is when the operation runs, its additions and removals queued
behind what waits; it costs one act boundary, as a removal does. A `set` that moves nothing tells nothing. `repeaterDisabledWhenUnmounted`
would hold the copies back while the Repeater is off the page; a play's Repeater is on it from its placing, so the setting defers nothing
(measured — now drawn, `{ repeaterDisabledWhenUnmounted: true }`, to keep it so). The spec: `items` watches / unwatches; `world.change`
enqueues `{ kind: 'copy' }`, run in a new `world` mode (no act boundary is owed: an `advance` lands what was owed first).

**The input mapping** (`setInputMappingScript` :968-1000, `addItem` :592-629, `_mapInputs` :538-555), 19 probe cases, then 6:
- **Compiled as it arrives** when it is text that is not empty (`new Function('map', 'object', code)`); what does not compile leaves
  none; a rebuild is asked for either way. Registered on any write (`registerInputIfNeeded`), so the spec declares it with `discover`.
- **The landing decides**: with no mapping the row is DIRECT (`id` the record's id, each other input the field of that name, then each
  field the record changes); with one it is MAPPED — each key the row HAS as an input, from a field by name or a function of the record,
  any other value passed over, `id` only if mapped — and each change of the record maps it again by the mapping AS IT IS THEN (none:
  nothing). So rows whose rebuild failed keep what the old mapping gave them until their record changes (M9: `nA2` beside `mB`).
- **A row keeps the last value it was given.** The matrix's first runtime run failed two scenarios at every seed: a re-map to a field the
  record lacks left the runtime's row showing its old `mA`. A value given that is `undefined` is never sent on (the graph's rule, C3), so
  an input keeps its last value — in DIRECT rows too (V1: a field cleared elsewhere leaves the row as it was). v1 read the record live;
  the two differ only once a field is cleared, which nothing could do before the REGISTRY writes. So every row now HOLDS its inputs, and
  hears its record whoever writes it: the app elsewhere (`watch`, `world.change` with the field) or the Repeater's own copy writing a
  record by its id (`hearingRecords`: the record's `change` events during the copy, heard in the order told). The probe that first looked
  identical (U1, U2) was so by coincidence: the trace does not repeat an unchanged value, so "kept" and "none" read alike until another
  row's value is sent between — the scenarios tap another row between (memory: a reading that fits is not one that excludes).
- **Throws.** A mapping that throws at a row's landing leaves `addItem` before the row is added: the queue stops for good (row C140,
  C128's mechanism). One that throws at a record's change throws into whoever wrote the record (row C141): in a lone play that is the
  world's own write, so the play itself fails — not drawn (the examples never throw), filed from the probe (M16).

**The interpreter's 10,000 found one survivor — killed by a scenario.** At 20733, `person.tapRow` drop-resume on the shape outcomes
`[refresh: done]`, no emit. Read from the shape (s61's lesson): a click whose drain rebuilds an EMPTY list (the rebuild settles at once,
the clicked row gone) and leaves the queue one act boundary from running on — dropping the resume matters only if work is queued behind
before that boundary, and only a heard change does that (`world` mode takes no boundary). The scenario: Items moved to an empty array
with a Refresh, a click, then that array written at 1 ms — identical on the runtime, and the survivor killed (118 / 118 at 20733).

**The build** ([repeater.ts](../../../packages/nodegx-node-spec/src/nodes/repeater.ts), `For Each` v2 — the rest of v2 — 237
scenarios). Items draws `{ $array: 'list' }` and `{ $array: 'other' }`; the Repeater's own registries (three records, two arrays, two
scripts of writes made elsewhere, one clearing a field); nine example mappings. THE MATRICES first: the heard array (seven writes × five
moments the write lands, 35) and the mapping (nine mappings × four ways it meets the rows, 36), then 21 named scenarios. New state:
`mapping`, `mapCompiles` (the node's, page model); a row is `{ rec, template, mapped, inputs }`.

**Rows** (open, ledger; the spec copies each, R3):
- **P107-C140** (medium, [ledger](../../bugs/p107-c140-a-repeater-input-mapping-that-throws-for-a-record-stops-the-repeater-for-good.md)):
  an input mapping that throws for a record stops the Repeater for good.
- **P107-C141** (medium, [ledger](../../bugs/p107-c141-a-repeater-input-mapping-that-throws-on-a-record-change-throws-into-the-writer.md)):
  one that throws when a record changes throws into whatever wrote the record.

**Left of the Repeater v2: Try Remove** (`For Each Actions`, foreachactions.ts :133-147; foreach.tsx `removeItem`). A row whose
component holds a `For Each Actions` node is removed through it: with Try Remove WIRED, the row is marked removing
(`_forEachRemoveInProgress`, so `findChild` skips it), Try Remove fires, and `_deleteItem` waits for Remove Completed (that input's
outcome: Done, or Unchanged with nothing waiting); UNWIRED, the delete moves to the item's frame end (`scheduleAfterInputsHaveUpdated`).
Either way `itemNodes` drops it at once. Needs: a third row template holding a `For Each Actions` node (its Added on landing,
`signalAdded`), with Try Remove wired to something the play can answer (a person's act, or a world write) — the seam first.

**Readings (2026-10-08).** The heard array (commit `08bea833f`): interpreter with mutants (190 scenarios) CONFORMS at 200 on the ten
seeds (110 / 110) and at 10,000 on 20734 and 20733; runtime `NSP_ONLY="For Each"` CONFORMS at 200 on 20734, 13, 20733, 20729, 7, 20735
(190 / 190, 0 divergences, 110 / 110, each exit 0) and at 10,000 on 20734 (0 divergences, 159 s). Stranger rounds re-graded with world.ts
changed and the hashes refreshed (exit 0), world tests (+3 for the seam), runtime target + graph 106 / 106, schema + runner 51 / 51. The
mapping (237 scenarios): interpreter CONFORMS at 200 on the ten seeds (113 / 113, no survivor) and at 10,000 on 20734 (113 / 113) and
20733 (118 / 118); runtime CONFORMS at 200 on the six seeds (237 / 237, 0 divergences, 113 / 113, each exit 0) and at 10,000 on 20734
(0 divergences, 166 s). Probe cases side by side: 59, all identical but M16 (C141's throw, not gradable alone).

### 7.24 s63, 2026-10-08 — the Repeater v2 complete: Try Remove, a row on its way out, the rows' signals; two rows

**Why this one.** The last of the Repeater v2 (§7.23 "Left of the Repeater v2"). The seam first, then 28 probe cases on both targets
before any rule was written — the runtime's context update loop logged in memory (signals sent, after-update callbacks, drains) when the
traces alone could not say why.

**The seam: two more row templates** (`REPEATER_TEMPLATES`, data only — the face builds every template from its `nodes` and `wires`).
`Leaving` and `Quiet` show their `label` and hold a `For Each Actions` (the Repeater Item): its Added wired to the row's `Added`, and a
click on the row wired to both the row's `Tapped` and the Repeater Item's Remove Completed. `Leaving` wires Try Remove to the row's
`Leaving`; `Quiet` leaves it unwired. So a person's tap is what completes a removal, and the Repeater forwards `Added`, `Leaving` and
`Tapped` when it was placed with one of these. No format change.

**A row on its way out** (`removeItem` :658-685, foreachactions.ts `tryRemove` :133-147). With a Repeater Item, a removed row is not
deleted: Try Remove WIRED marks it (`findChild` skips it), raises Try Remove, and keeps it until its Remove Completed; UNWIRED moves the
delete to the Repeater Item's frame end — the next drain. Either way it leaves `itemNodes` at once, and stays the PARENT's child:
- a person sees it and taps it — a tap on a wired one is its `Tapped` (forwarded, with its outputs) and then it goes; a tap on an unwired
  one removed outside a drain lands on a row the press's drain deletes, so it delivers nothing (probe Q1);
- an addition counts it — the `add` handler places a row at the Repeater's index + 1 + the list index among the parent's children, so a
  row added beside one on its way out lands one place early, and stays there (**row C143**, probe L3);
- a rebuild leaves it (`_deleteAllItemNodes` walks `itemNodes`) and lands its rows from the Repeater's place, so it moves to the end (L4).

**The rows' signals** (`itemOutputSignalTriggered` :922-947; nodecontext.ts `updateDirtyNodes` :453-490). A row's signal reaches the
Repeater only when it has the output (the PLACED Template's) and only where the row's graph updates — in a drain. A drain is passes: in
each, the waiting nodes update, then the callbacks asked for after it. `itemOutputSignalTriggered` writes Item Id at once and schedules
ONE after-update per pass, holding the FIRST call's row and sending the LAST call's signal: every row heard in one pass is one report —
the last row's Item Id, the first row's outputs, the last signal (**row C142**). Measured, with the loop logged:
- a signal raised OUTSIDE a drain (a landing at a yield, a removal at an act boundary, a write made elsewhere during an `advance`) waits
  for the next drain; all waiting are heard in its first pass, in the order the ROWS WERE MADE — not the order they spoke (T4, T4b, T4c,
  T5: four cases, including two against the speaking order). Why the dirty list keeps that order was not found; the rule is recorded as
  measured, and the generated sequences and the deep runs test it.
- those raised before the Repeater had an input since the last drain are heard before its frame-end work; those raised after it, after
  — and a row its rebuild just deleted says nothing (R2 against R3: the same Added heard, or lost, by whether the Refresh came first);
- one raised BY the frame-end work (the copy's first removal — the queue's next operation waits an act boundary) is heard alone, in the
  next pass (Q3: three rows leave at once — the first in its own report, the other two together: two `Leaving`);
- the drains: a settle's frame, and a second after its yield (node-spec-target `settle`: frame, yield, drain); a press before its click
  lands (the pointer-down handler's drain, pointerlisteners.ts :173-186); the click's own. An `advance` does not drain.
The spec models this as `pending` (raised outside a drain, with `late` = the Repeater was waiting to update), `dirty`, `afterFrame` (a
yield right after a frame is the settle's, so the settle drains again) and a row's `born`; `drain` / `raise` / `report` in repeater.ts.

**The build** ([repeater.ts](../../../packages/nodegx-node-spec/src/nodes/repeater.ts), `For Each` v2 — complete — 291 scenarios).
Template draws `Leaving` and `Quiet`; one Script picks them. THE WAY-OUT MATRIX first (each way a row leaves × Try Remove wired, unwired,
no Repeater Item, a Repeater that lacks the row's signals — 32, each followed by a click on every place), then 20 named scenarios from
the probes, then two read off mutant survivors: the runtime's seed-20734 `person.tapRow` drop-resume (a removal and an addition in the
clicked row's drain — only work queued behind shows the lost resume), and the interpreter's 10,000 at 20733 `templateScript` drop-set (a
Script written right after a click whose queue still owes an act boundary). New state: `pending`, `dirty`, `afterFrame`, `made` (page
model); a row is `{ rec, template, mapped, inputs, born, leaving? }`.

**Rows** (open, ledger; the spec copies each, R3):
- **P107-C142** (medium, [ledger](../../bugs/p107-c142-a-repeater-reports-two-rows-signals-in-one-update-as-one.md)): a Repeater
  reports the signals of rows that fire in one update as one — every row's Added after the first is lost, and a Leaving can be reported
  as another row's Added.
- **P107-C143** (medium, [ledger](../../bugs/p107-c143-a-repeater-row-added-beside-a-row-on-its-way-out-lands-one-place-early.md)):
  a row added beside a row on its way out lands one place early and stays there; a Refresh moves the leaving row to the end.

**Component Children — exempt** (Richard, 2026-10-08: "count it as done, with the reason written down"). `exemptions.json` beside
`tiers.json` (NSP-009 §2): name → reason, ruling, what grades it later. The census reads it — an entry that names no picker node, or has
no reason, fails it as an untiered node does — writes `exempt` on the row and `totals.exempt`, prints each exemption in CENSUS.md and on
its own line. Re-measured before writing the reason: nodescope.ts `createNodeFromModel` :216-222 still returns before `createNode`.
NSP-016 is **19 of 19 handled: 18 conform, 1 exempt**.

**Readings (2026-10-08).** Probe cases side by side: 28, all identical once the rules were in. Interpreter with mutants (291 scenarios):
CONFORMS at 200 on seeds 13, 20734, 20733, 20729, 20735, 20736, 20741, 20742, 20745, 7 (228 / 228; 229 / 229 at 20735) and at 10,000 on
20734 (246 / 246) and 20733 (250 / 250 once the survivor's scenario was in). Runtime `NSP_ONLY="For Each"`: CONFORMS at 200 on 20734, 13,
20733, 20729, 7, 20735 (290 / 290 scenarios, 0 divergences, every mutant killed, each exit 0; 291 / 291 at 20734 after the last scenario)
and at 10,000 on 20734 (0 divergences, 246 / 246, 226 s). Page model for `For Each`: passes. The node-spec package suite (`-w 2`): 22 / 22 suites, 968 passed,
exit 0; runtime target + graph 106 / 106.

### 7.25 s66, 2026-10-09 — the Repeater's two hop counts: one pinned, one unobservable

P109 found two of the Repeater spec's act-boundary counts (`hops`) unpinned at s64: any value one off passed every scenario. Each was
planted at 0 and at 2 in an IN-MEMORY copy of `src/nodes/repeater.ts` (the spec — a spec plant is graded against the runtime; the
interpreter against itself grades nothing) and played on the runtime, 296 scenarios plus 200 generated sequences on seeds 20735 and 13:

- **A Refresh with no Items** (`refresh()`, `st.hops = 1`; foreach.tsx :792-795 answers Failure and returns, and the runner that awaited
  it goes on one act boundary later). Survived every scenario and sequence at 0 and at 2. **Pinned** by a new scenario, *"a Refresh with
  no Items, then a removal queued behind it"*: the Refresh is pulsed BEFORE Items is cleared, so the frame-end work starts the rebuild
  first and the copy's removals wait behind it; four clicks with no settle between count the boundaries — red at 0 (the queue stalls
  until the yield) and at 2 (the removal lands a click late), green at 1. 297 scenarios.
- **The queued copy** (`start()`'s `copy`, `w.st.hops = 1`). **Unobservable**, and now commented so in the spec: a copy is queued only by
  the world's hand-off (a write to the bound array elsewhere), which never takes a hop, and an `advance` lands the yield after its world
  writes (adapter.ts — land what was owed, move the clock, land what the move delivered) — so the queue runs to its end before any act
  can count a boundary. 0 and 2 conform on every scenario and 400 sequences. Not a scenario: no play can tell them apart.

For Each on the runtime after the scenario: 297 / 297, 300 / 300 mutants (seed 20735).


## 8. AC4 — the layout check (R18, 2026-10-09)

**Ruled R18: "Build the layout check"** — option (b) of [RESEARCH-LAYOUT-SEMANTICS.md](RESEARCH-LAYOUT-SEMANTICS.md) §5. Asked in plain
words with "close without it" recommended (R10 had left the measuring for later; R17 leaves the CSS Definition sheets ungraded either
way). The stylesheets stay out: a node a sheet styles is NAMED in the result, not graded. Several sessions; every browser run is heavy
and waits for a quiet box (one at a time, torn down after).

**What exists (measured s68, not built yet):** the 274 inputs are classed (`visual-params.json`: 55 layout, of which 96.6% of template
settings are in the shared subset) and every visual spec carries its inputs' `portability` (R10). `render_report` /
`@nodegx/render-measure` measure PAGE findings (overflow, unreachable content, clipped text) — there is no rectangle per node, and the
viewer stamps no node id on its elements. A node's element is reachable through the runtime: `getDOMElement()` on a visual node
(react-component-node.ts :299), which is how the editor's highlight finds it.

**The build, in order** (each step graded before the next):

1. **The model** — `layout.ts` in the spec package: the neutral vocabulary for the shared subset (axis; main and cross alignment; gap;
   padding; size as hug / fill / fixed / percent with min and max; overlay; z-order; clip; scroll) as data, and a pure function from a
   parent's model and its children's sizes to each child's box. No CSS in it (R11 / R12: the page model's rule — keep React and CSS out
   of the spec). Its tests are tables.
2. **The mapping** — each of the 55 layout inputs onto the model, from `visual-params.json`'s classes, carried in the spec's port
   metadata beside `portability`; a `--check` that fails an unmapped `shared` input. `not-shared` and `web-only` inputs are listed,
   never mapped.
3. **The measurement** — a geometry reader on a REAL browser (headless Chrome, `render-from-disk.js` serving a fixture project): each
   placed visual node's box through the runtime's node instance (`getDOMElement().getBoundingClientRect()`), keyed by node id, at each
   viewport. Memory's traps apply: a rect is not visibility, a blocker can sit on a rendered surface, an `opacity: 0` element still lays
   out — the reader states which it measured.
4. **The fixtures** — small projects, each one layout rule (a column with a gap; fill beside fixed; percent of a padded parent; min /
   max clamping; an overlay; a scroll container), and the templates' most-used combinations (rank by the product surface: the shelf
   templates, the picker's defaults). A node a stylesheet class reaches is reported as such and skipped.
5. **AC4 itself** — the model's boxes asserted against the measured ones with a tolerance (sub-pixel rounding, a font's metrics), on the
   runtime through `render_report`'s browser. A mismatch is a row like any other (R16: the runtime's fix is P109's).

**Not in AC4:** what a stylesheet changes (R17); look (colours, fonts, shadows — they are classed, not laid out); hover / press / focus
styles (RESEARCH §7: not in `inputs`); animation.

### 8.1 s69, 2026-10-09 — steps 1 and 2: the model and the mapping

**Step 1, the model** (`packages/nodegx-node-spec/src/layout.ts`, exported from the browser entry). The vocabulary is
§8's list as types: an axis (`column`, `row`, `overlay`); main alignment (start, center, end, space-between, -around,
-evenly); cross alignment (start, center, end, stretch); a gap; padding and border; a size per axis (`hug`, a `length` of px
plus a percent of the parent, or `fill` with a weight and a basis); min and max; margins; spacers; an overlay placement;
z; clip; scroll; a transform (translate, rotate, scale, origin). `layoutChildren(parent, children)` gives each child's
layout box, what is drawn after its transform, what a clipping parent lets through, the paint order and the extent.
`hugSize` gives a parent the size of its children. No CSS in it: no property names, no strings, px and percent only.

- **The main axis is flexbox's §9.7 on one line** (Yoga is flexbox): bases; the free space grows the `fill` children by
  weight, or shrinks them in proportion to weight × basis; a min or max freezes a child and the rest is shared again;
  weights summing under 1 take that share. Only a `fill` grows or shrinks, the runtime's rule too (`flexShrink: 0` on
  every node, 1 on a percent it turned into a grow).
- **The runtime's percent is a `fill` with that percent as both basis and weight** on the parent's stacking axis
  (`Layout.size` :84-108), so 30% + 30% in a 400 px row are 200 each, and 100% beside a 100 px sibling shrinks to 300.
  Across the axis it is `calc(p% − margins)`: a `length` of `{ percent: p, px: −m }` — and that is not p% of what the
  margins leave (a table row says so).
- **Alignment fallbacks** follow Flexbox §8.2: space-between with one child or no room is start; space-around / -evenly
  are center. A spacer takes the free space first, and while there is any the parent's alignment does nothing — the
  runtime's Align X / Y on the stacking axis is an automatic margin, which behaves exactly so.
- **An overlay is placed in the parent's PADDING box** (an absolute child's containing block): padding does not inset it.
- **A scrolling parent is unbounded on its axis:** nothing grows, a percent there is the content, the children start at
  the start. That is the neutral reading (a ScrollView in all four toolkits) and the runtime's iScroll wrapper (a hugging
  inner box); the native-scroll path (`overflow: auto` on the Group itself) may differ — step 5 will say.
- **Named limits** (each reported by step 5, not guessed): wrapping; text whose height depends on its width (a hug
  child's content size is one pair); flexbox's automatic minimum (min-content — here a shrinking `fill` stops at its
  `floor`, 0 unless given); `fixed` / `sticky`; baseline alignment; a stylesheet (R17).

`tests/layout.test.ts`: 69 rows worked by hand from the rules. One row I worked wrong first (three spacers share 80 px,
not two); the model was right.

**Step 2, the mapping** (`src/layout-map.ts`). `PortMeta.layout` (spec.ts) is a role naming the model field a setting
feeds; `LAYOUT_ROLES` is the table by port name the specs were stamped from (the runtime's shared port definitions name a
setting the same on every visual node), and `gen-ports.js` now emits it. **392 ports carry a role** across the 17 visual
spec files, every changed line differing from HEAD only by the role. The look ports for the border carry roles too (a
side's width counts only while its style is not None: the model's border inset). Two roles say a setting moves no box of
its own: `content` (a label's spacing, an icon's side, text alignment, how a picture fits — shapes the content size the
model takes as given) and `drawn-only` (Show Scrollbar).

`layoutOf(spec, params, { parentAxis, viewport, token })` reads a placed node through its spec's roles as
`Layout.size` / `align` and the Group read it: Size Mode decides which of Width / Height is assigned; a percent along the
stacking axis is a `fill` unless marked fixed (`isFixed`), across it less the margins, with no parent layout a plain
percent; Align X / Y on the stacking axis is a spacer on the side whose margin is not set (0 counts as not set: the
runtime's `style.marginRight ? … : 'auto'`), across it the node's own alignment; Position Absolute and Layout None are an
overlay, top-left by default; the gap is Row Gap in a column and Column Gap in a row; padding, gaps and borders read
design tokens through `token`. **Its `outside` list** names what it cannot model on that node: a `layout-not-shared` or
`web-only` input that is set (a wrapping row, a `cssClassName`, `content-box`), a unit it does not have (`em`, `vh`
without a viewport, a percent margin), a token with no value, `fixed` / `sticky`. Step 5 reports such a node instead of
grading it — §8 step 4's "a node a stylesheet class reaches is reported as such and skipped" is this list.

**The check is a test, not a `--check` script** (`tests/layout-map.test.ts`, run by `test:packages` in CI): every
`layout-shared` port has a role (216 rows), no `layout-not-shared` or `web-only` port has one (75), every role is the
table's, and each of the 55 layout inputs the census classed is mapped or left out by name — the six expressible ones
left out are Scroll Snap's two (where a scroll comes to rest) and the Columns' four breakpoints (the Columns lays out by
its own `layoutString`, not shared). A script outside CI goes unrun: this session found the package's size check over
its budget that way (P107-SIZE, below). **Planted:** a role dropped from the Group's Pad Left and one given to its
Multi Line Wrap — 7 reds, then restored.

**Mounted:** the research classes it `layout-shared`; the specs carry it as `logic` (it is behaviour, graded). It has the
role `present`; the check is satisfied either way.

**Found on the way — P107-SIZE** (low, P112's to decide): the browser entry is 268.7 KB gzipped against OWN-002's 240 KB
budget. `layout.ts` is 2.8 KB of it; the entry was about 266 KB before. `npm run size:node-spec` is in no CI workflow.

**Gates (2026-10-09):** layout 69 / 69, layout-map 739 / 739 (the plants above red first), stranger (hashes rewritten
for `src/spec.ts` and `src/nodes/dropdown.ts`) + catalog-parity + page-model + types + schema + spec-ledger 443 passed,
18 skipped (the stranger's seed-0 rows, by design), batch-visual 19 / 19, `tsc --noEmit` clean, `browser-check` PASS.

**Step 3 next** (heavy: a real browser, one run at a time, when the box is quiet). Done in s70, below.

### 8.2 s70, 2026-10-09 — steps 3–5: the measurement, the first fixtures, the check

**Step 3, the measurement** (`scripts/node-spec/layout-measure.js`). It reuses `render-report.js`'s `withRenderedPage`: one
headless Chrome, torn down after each project. **Node to element without a viewer change:** every visual node renders inside a
`NoodlReactComponent` whose props carry the node (`props.noodlNode`, react-component-node.ts :977). The reader walks React's
fibers from the page's elements to those wrappers and asks each node `getDOMElement()`. A node's parent is the nearest OTHER
node above it in the fiber tree. Its own inner component carries the node too, so the first version named every node as its
own parent. **What it measured** is stated per field in the script's header: `box` is `getBoundingClientRect()` (border box
after transforms); `size` is `offsetWidth/Height`; `inParent` is the box in the parent's padding box (the model's
coordinates); `hit` is `elementFromPoint` at the centre landing inside the element (a rect is not visibility); `opacity` is
the product up the tree; `transformed`. A fixture is nested nodes placed on a Page at `/`. **Graded first by hand:** a
400 × 300 column, padding 20, gap 10, children at (20, 20) and (20, 80). Then a planted control (gap 30, `b` 300 wide) moved
`b` to (20, 100), 300 wide, at both viewports.

**Step 4, the fixtures** (`packages/nodegx-node-spec/layout-fixtures/`, 11, one rule each): column-gap, row-fill-beside-fixed,
percent-of-padded-parent, min-max, overlay, scroll-native, scroll-iscroll, align-spacers, justify-space-between, hug,
transform. **Recorded, as a scenario is:** `layout-measure.js --record <dir> [--only a,b]` writes `measured/<name>.json` (the
fixture's own nodes at 1280×800 and 390×844). The comparison then runs in CI with no browser.

**Step 5, the check** (`tests/layout-check.test.ts`). For every fixture node with children: `layoutChildren` over `layoutOf` of
it and its children. Its outer size and each child's `content` come from the measurement (the model does not measure text). Each
child's layout box (drawn box when transformed) is compared with `inParent` and the measured size, tolerance 0.5 px. A node with
anything in `outside` is reported, not graded. Mismatches must equal `KNOWN` both ways. `hugSize` is graded on the hug fixture.
**Result: 62 boxes match, no mismatch, 2 reported** (scroll-iscroll at both viewports: Native platform scroll is `web-only`).
**Planted twice, because a first-run green proves nothing:** the model's gap set to 0 reddened exactly the rows with a gap
(column-gap `b`, hug `h2`, scroll-native s2–s4). The mapping's left margin set to 0 reddened exactly `half`, the one node with
a margin. Both restored.

**Found — two rows on the path the check does not grade** (Native platform scroll off, the better-scroll path):
- **P107-C152** (medium): the gap is dropped. The inner `scroll-wrapper-internal` copies the direction, not the gap. Children
  at 0 / 100 / 200, natively 0 / 110 / 220.
- **P107-C153** (medium): nothing clips. Overflow is set only for Clip Content or the native path. The third child, below the
  200 px scroller, is drawn and takes a press; natively it is hidden.
Both are pinned in the check as still firing, each beside the native path's opposite reading (R16: the fix is P109's).

**Seen, not yet a row:** a percent height inside a scrolling column (scroll-native `s4`, 50%) measures 0 high on both paths.
The model says "a percent there is the content", and the content IS the measurement, so the check cannot tell. A fixture whose
percent child has content of its own would.

**Left for AC4:** the templates' most-used combinations (rank by the product surface: the shelf templates, the picker's
defaults). Text and other content nodes as children, where the hug size comes from the browser's text. A percent in a scroll
with real content (above).

### 8.3 s71, 2026-10-09 — the rest of AC4: the templates' shapes, content children, a hole closed, and AC4 met

**The templates' shapes, ranked by the product surface.** A probe ran `layoutOf` over every visual parent in the shelf templates
(`templates/*` but the `-demo` copies): **1,207 parents, 385 distinct shapes**. The children are mostly Texts and Groups at 100%
wide and their own height in a column (668 and 602 placements), Buttons hugging in a row (246), and a Group filling a row (80).
The parents that come first: a centred row with a gap of hugging Buttons (49 parents, 6 templates), a padded column with a gap
of Texts (46, 8), a padded centred column holding a 100% Group with a max width that centres itself (34), a 100% × 100% column
with space-between (13), a centred row of a fixed avatar, a filling Group and a hugging Text, and a space-between row of a Text
and a Button. **Eight fixtures** cover them and the handoff's other items (`layout-fixtures/`): `button-row`, `text-column`,
`text-row`, `centred-shell` (the max clamps at 1280 and not at 390), `page-shell`, `header-row`, `scroll-percent-content`,
`min-content-floor`; and `tags` (below). Content children are Texts and Buttons: their hug size is the browser's, their place the
model's.

**A hole in the check, shaped like the defect it was there to find.** s70's check gave every child its MEASURED box as its
content. A child the model sizes from its content (a percent in a scroll) then matched whatever the browser drew. With content
of its own, `scroll-percent-content`'s percent child measured 140 high round 40 px of content, and matched. Now a child with
children of its own gets its content from them (`hugSize`, recursively); only a leaf's content is its measured box. Planted back,
the check went red (C154 stopped mismatching).

**The Tag moves no box.** 285 of the templates' Texts and 98 Groups set Tag (`as`, `web-only`), so every parent holding one was
reported, not graded. Measured (`tags`): an h1, h2 or p Text sits flush with its siblings, because the runtime's sheet resets a
Text's margins (`.ndl-visual-text { margin: 0 }`, noodl-viewer-react/src/assets/style.css :1-4). A Group tagged section, nav or
span lays out as its div does. A heading changes only the browser's font (an h1 Text is 39 px high, a div 20): content, which
the model takes as given. `layout-map.ts` `BOX_NEUTRAL` names it with that evidence. It keeps no role and stays `web-only`.
**Template parents the check can grade went from 498 to 623 of 1,207** (most of the rest set a `cssClassName` — R17 — or wrap).

**Result: 156 boxes match; 6 mismatch, all in `KNOWN`:**
- **P107-C154** (low, filed; reach on the shelf: none): with Native platform scroll on (the default), a percent child of a
  scrolling column grows into the 200 px the scroller shows (140 high, the next child pushed to 150). With it off, the same
  child is its content (40 high), which is the model's reading and the native toolkits'. The two settings of one checkbox lay
  out the same page differently. Which reading is the product's is the fix's first question. Pinned in the check beside C152 and C153.
- **The min-content floor** (the model's named limit since s69, now measured): a 100% Group in a 300 px row beside a 200 px
  sibling, holding a 150 px child, stops at 150. The model shrinks it to 100 (its `floor` is 0). A Text there shrinks as the
  model says, since the runtime lets it break anywhere (`overflow-wrap: anywhere`). This is CSS flexbox's automatic minimum.
  Whether the other three toolkits share it was not checked, so it stays the model's named limit, not a row.

**Planted:** the mapping's cross-axis `center` read as `start` reddened exactly the rows whose children differ in height
(text-row's label and button, header-row's hugging Texts, justify-space-between), and left rows of equal-height buttons green;
the old content rule reddened the check. Both restored by `cp` and checked with `cmp`.

**AC4 met.** The model's boxes are asserted against the runtime's, measured through `render_report`'s browser with a 0.5 px
tolerance, on twenty fixtures in CI. Every mismatch is a filed row or a named limit. **Gates (2026-10-09, s71):** the node-spec
package suite 31 / 31 suites, 1,836 passed, 18 skipped (the stranger's seed-0 rows), exit 0; `tsc --noEmit` clean;
`browser-check` PASS.

### 8.4 s73, 2026-10-09 — the model learns the scroll ruling (P109-S37-SCROLLROOM)

Richard ruled C154 on 2026-10-09: *"inside a scrolling Group the room is the visible window, unless the content is longer"*.
P109 ISL-052 (`0859bbbde`, `afac7de50`) made the runtime do it on both scroll paths, added four fixtures (`scroll-align`,
`-fill`, `-slides`, `-centre-long`) and listed 30 boxes KNOWN as ROOM, where the model still read a scroll axis as
unbounded. `src/layout.ts` now gives a scroll axis three rules:
- **Room:** the window is the room and the reference, so a percentage is of the window and a `fill` shares what the window leaves.
- **Floor:** along the scroll a `fill` never shrinks below its content, so a long one pushes the rest on and the parent scrolls.
- **Alignment:** the main-axis alignment applies while the children fit; once they're longer they start at the start (`safe`).

The ROOM rows are out of KNOWN. The only KNOWN rows left are the model's min-content floor (2). **Plants:** the old
`layout.ts` back → the check red on exactly the 30 ROOM boxes, and `tests/layout.test.ts`'s three new scroll rows red
(the checkout's fill, the slides' percentages, the safe centre). Restored by `cp`, `cmp`-identical. The old unit row (a
long scrolling column, every fill at its content) still holds under the new rule and is renamed for what it shows. Gates:
the three layout suites 819 / 819, `tsc --noEmit` clean.
