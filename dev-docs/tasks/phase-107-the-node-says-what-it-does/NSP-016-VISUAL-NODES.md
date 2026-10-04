# NSP-016 — Visual nodes: research first, then layout semantics that are not CSS

**Opened 2026-09-29.** **Depends on NSP-008.**
**Status: 🟡 s37 (2026-10-03): AC3 begun — THE PERSON face (the real React component in a jsdom page; an act is the browser's events) and the format's `act` / `acts` / `person` / `place` / `portability`; Button and Checkbox conform on the runtime (2 of 19; rows C61–C66, D30, §7.2). s36: research done, R10 ruled — build the logic for all 19 with each input's portability class in the spec; geometry grading after NSP-017.**

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
