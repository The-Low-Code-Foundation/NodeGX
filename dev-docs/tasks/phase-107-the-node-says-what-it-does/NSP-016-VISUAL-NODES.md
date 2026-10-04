# NSP-016 — Visual nodes: research first, then layout semantics that are not CSS

**Opened 2026-09-29.** **Depends on NSP-008.**
**Status: 🟡 s39 (2026-10-04): Dropdown conforms on both targets (4 of 19; rows C70, C71, D34 and instances of C65, C66, D30, §7.4) — the face grew `choose` (a keyboard pick: an enabled option the list offers, no `change` for the one already selected); the spec keeps the node's value, the author's Value, the shown value and the browser's selection apart because the component does. s38: Text Input conforms on both targets (3 of 19; rows C68, C69, D31–D33, §7.3) — the face grew `type` and `key`, the format a person patch that resolves deferred outcomes (the viewer's pointer drain). s37: AC3 begun — THE PERSON face (the real React component in a jsdom page; an act is the browser's events) and the format's `act` / `acts` / `person` / `place` / `portability`; Button and Checkbox conform on the runtime (rows C61–C66, D30, §7.2). s36: research done, R10 ruled — build the logic for all 19 with each input's portability class in the spec; geometry grading after NSP-017.**

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
