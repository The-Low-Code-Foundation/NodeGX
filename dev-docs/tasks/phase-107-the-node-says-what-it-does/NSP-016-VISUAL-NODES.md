# NSP-016 — Visual nodes: research first, then layout semantics that are not CSS

**Opened 2026-09-29.** **Depends on NSP-008.**
**Status: 🟡 s53 (2026-10-07): the Shape (`Circle`) and the Image conform on both targets (12 of 19; v1 each — the Text's machinery with no Tag; the Image adds the picture's fetch, a new act `fetched`); the runner can withhold a value a target cannot survive; rows C91 (Custom SVG's span is a drop slot), C92 (a huge Points runs the page out of memory), C93 (an Image adds a sub-path Base URL again at every render — high), C94 (Source Set true at placing fetches "true") (§7.14). s52 (2026-10-07): the Group conforms on both targets at 200 and 10,000 (10 of 19; v1, 1,387 scenarios) — its children as drop slots, the focus tracker, the scroll actions and when a frame's work runs; rows C86–C90 (§7.13). s44 (2026-10-05): the Text v3 — C79 is a known row (R11: the spec says the intent, not React's redraw rules); 162 scenarios; s43's 47 deep-run survivors killed (§7.9). s43 (2026-10-05): drag and drop researched ([RESEARCH-DRAG-DROP.md](RESEARCH-DRAG-DROP.md)) and the Text conforms (9 of 19; rows C77, C78, §7.8) — its drag SOURCE graded on a lone node; the zone side and the file drop are step (b). The face learned the browser's hit test, and the 7 conforming specs it moved say what a browser lets a person do. s42 (2026-10-04): the Radio Button Group and the Radio Button conform on both targets at 200 and 10,000 (8 of 19; rows C76, D37, §7.7) — the visual tree, per node: a node's children are on its PAGE (the spec declares them; the face builds them with the node's own `addChild`; a person `pick`s one) and a node's parent is its WORLD (the GROUP seam). s41 (2026-10-04): Slider and Icon conform on both targets at 200 and 10,000 (6 of 19; rows D36, C73, C74, C75; C63 takes null, §7.6) — the face grew `slide` (jsdom's range sanitization, which it applies to every write, plus the browser's step rule, which jsdom lacks; a reversed range is not played); the 13 left each need infrastructure first (a visual tree with context, drag and drop, geometry, media — §7.6). s39 (2026-10-04): Dropdown conforms on both targets (4 of 19; rows C70, C71, D34 and instances of C65, C66, D30, §7.4) — the face grew `choose` (a keyboard pick: an enabled option the list offers, no `change` for the one already selected); the spec keeps the node's value, the author's Value, the shown value and the browser's selection apart because the component does. s38: Text Input conforms on both targets (3 of 19; rows C68, C69, D31–D33, §7.3) — the face grew `type` and `key`, the format a person patch that resolves deferred outcomes (the viewer's pointer drain). s37: AC3 begun — THE PERSON face (the real React component in a jsdom page; an act is the browser's events) and the format's `act` / `acts` / `person` / `place` / `portability`; Button and Checkbox conform on the runtime (rows C61–C66, D30, §7.2). s36: research done, R10 ruled — build the logic for all 19 with each input's portability class in the spec; geometry grading after NSP-017.**

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
- The guard (page-model.test.ts, seeds 13 and 20731): all 14 visual specs green, the two new ones included. Catalog parity green for
  both. `tsc --noEmit` clean in both packages.
