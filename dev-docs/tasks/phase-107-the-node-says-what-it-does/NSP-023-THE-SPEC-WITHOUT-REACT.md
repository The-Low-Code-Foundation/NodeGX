# NSP-023 — The spec without React

**Opened 2026-10-05, from ruling R12 (README §7).** **Depends on NSP-016** (the specs it converts) and the Text v3 (NSP-016 §7.9,
the recipe). **Status: 🟡 steps 1, 2 and 3 done (s45 §8.1, s46 §8.2, §8.3); the Checkbox's and the Dropdown's label rule with step 1; the Dropdown's and the Radio Button's intents ruled (R14) for steps 4 and 5.**

## 1. The person sentence

> **A visual node's spec says what a person sees and what the wire carries, in words any renderer can honour, so the app
> can move off React without the spec teaching the next renderer React's bugs.**

## 2. Why, and why now

R11 (Richard, 2026-10-05): *"let's try to casually avoid React stuff if we can when it comes to the spec, since we're hoping to
one day move the spec away from dependence on React."* R12, the same day, after the audit below: *"Let's plan in 107 to give
these nodes the 'Text' treatment, I'd like us to plan for the future given the amount of work this is costing already."*

**The cost, measured.** The Text was paid for twice in one day: v2 (`b4c997ed9`) copied React's redraw rules into the spec to
reproduce row C79 (203 scenarios, a session), then v3 took them out again (148). A spec that keeps React's mechanics costs that
once to write, again to remove, and a third time in every future target, which has to imitate React to conform.

**The audit (2026-10-05, read-only, `packages/nodegx-node-spec`).**

- **Clean:** every non-visual spec. Each hit was a source path (`noodl-viewer-react/...`), "rendered" meaning formatted text, or
  the SSE spec's own `setState` method. Source cites (`react-component-node.ts :2302`, `because` strings) are provenance and
  stay.
- **One leak in the format:** `WorldHandlers.turn` (spec.ts, s40), whose definition is "React commits a component's own
  `setState`". Only the Text Input uses it.
- **Five conformed specs keep React's state:**

| spec | React-shaped state | rows involved | size (lines / scenarios) |
|---|---|---|---|
| Text Input | `field` / `pending` / `editCaret` (what React has committed yet), `shownType` / `shownMaxLength` (props as last rendered), the `turn` handler | C69, C72 (and C68, D30, D32, D35 to sort) | 920 / 87 |
| Slider | the shown value (`useState`), `props.value` as the last render saw it (the effect's dependency) | D36 | 491 / 48 |
| Dropdown | the shown value, `props.items` as last rendered (list identity matters to the effect) | D34, C71 (C70 is a crash) | 485 / 55 |
| Radio Button Group | `rendered` (the Value at the last paint, the effect's `[props.value]`) | C76 | 222 / 22 |
| Radio Button | `shownValue`, the group's `gRendered` / `gSelected` / `gFromUser`, effect order (a child's effect before its parent's) | D37 | 430 / 152 |

- **Wording only (no behaviour):** Button, Checkbox and Icon ("committed by React" for "on the page"; "React drops `onClick` on a
  disabled button" for what is HTML's rule); Slider's and the Text Input's "an attribute as React writes it"; spec.ts `place`.
- **Text:** done by s44 (v3).
- Every row above already has a bug file in `dev-docs/bugs/` (`p107-c69-…`, `p107-d36-…` and so on).

## 3. The recipe (the Text treatment, NSP-016 §7.9)

For each spec, in this order:

1. **Sort.** Put every state field, reducer rule and known row in one of two piles:
   - **React-made:** it exists only because of how React draws. Examples: a value kept as "last rendered", a `setState`
     waiting for a commit, an effect's dependency list, effect order, a frame end that renders only when asked.
   - **The node's own, or the browser's:** what the node's code decides (a clamp, a conversion, a guard), or what HTML
     decides (a disabled button takes no click; the caret after an input type change).

   When unsure, ask one question: *would a renderer that writes the element directly, at once, still do this?* If yes, it stays.
   Only the React-made pile moves.
2. **Intent.** For each React-made item, the spec states what a person expects. Where the node's published description says
   it, take that (D36: the Slider's description says a Value set from the graph does not fire Changed). Where it does not, ask
   Richard in **one plain-words batch per node**. Never pick an intent silently.
3. **Row.** The React behaviour becomes a **known row on the runtime target only**: a predicate beside `invisibleTakesPointer`
   in `packages/noodl-runtime/test/node-spec/conformance.test.ts`, counted on every run, never hidden. The row's bug file gets
   the new evidence.
4. **Shrink.** Scenarios that only graded React's timing go. Row scenarios stay, and each must still fire on the runtime.
   Re-run the mutants and re-declare the equivalents (v3 needed three more).
5. **Grade.** 200 sequences on two seeds and 10,000, on both targets, with 0 divergences that no row takes. The node keeps
   counting as conforming.

## 4. The work, in order

| step | what | why here |
|---|---|---|
| 1 | **Text Input** | The biggest, and the only user of `turn`. C69 and C72 look React-made; C68, D30, D32 and D35 have to be sorted (D35's caret is partly HTML's type-change steps, which stay). |
| 2 | **Remove `WorldHandlers.turn`** from spec.ts, the interpreter's `advance` and anything the runtime target drives for it | Once step 1 lands nothing uses it. spec.ts is hashed by the stranger suites (NSP-006): refresh the hashes and re-run them. |
| 3 | **Slider** | D36 has its intent in the description already: the cheapest conversion. |
| 4 | **Dropdown** | C71 partly takes the intent already (NSP-016 §7.4); D34 and the items-identity rule move; C70 (a crash) stays a row either way. |
| 5 | **Radio Button Group + Radio Button**, together | They share the group seam (world.ts GROUP); C76 and D37, and the effect-order rule. |
| 6 | **Words**: Button, Checkbox, Icon, and the docblocks above | No behaviour or scenario change. Cheap; can ride along with any step. |
| 7 | **A guard** (AC4) | So it does not come back. |
| 8 | **The proof** (AC5) | A stranger builds a converted control without React. |

**Estimate:** about one session each for step 1, steps 3–4, and step 5; half a session for steps 2, 6 and 7; one for step 8.
That's 4–5 sessions, judged from s37–s44's pace of about one visual node per session. It's an estimate, not a measurement.

## 5. The 10 visual nodes still to write (NSP-016)

They are written under R11 from the first line, so this task never has to visit them:

- Do the §3 sort **before** modelling any divergence. A React-made divergence goes straight to a known row on the runtime.
- **Group, Image, Circle and Video carry C79** (NSP-016 §7.9, its reach). Take the Text v3's rule (an element at Opacity 0,
  hidden, or with Pointer Events off takes no pointer, whatever order the writes came in) and the same runtime row predicate.
  Do not model the redraw rules again.

## 6. Acceptance criteria

1. **Each of the five is converted:** a sort table in §8 (each field and row: React-made or the node's own, with the evidence),
   the intent stated in the spec, its React rows known on the runtime only, and it conforms at 200 on two seeds and at 10,000 on
   both targets.
2. **`WorldHandlers.turn` is gone from the format;** no spec mentions it; the stranger suites' hashes are refreshed and their
   suites are green.
3. **The runtime's conforming count does not fall** (115 of 147 at s44), read from the ledger, never typed.
4. **A guard, measured.** Something that fails when a spec takes React-made state again. Design it in the session, then
   **plant** each shape the sort found (a last-rendered copy, a commit-pending field, a `turn`-like hook) in a copy of a spec:
   each plant must turn it red, and every converted spec must pass. A vocabulary grep alone does not count, because "rendered"
   and `setState` already mean other things in clean specs (§2).
5. **The proof:** a stranger agent (NSP-006's recipe) builds one converted control, the Slider or the Dropdown, on plain DOM
   with no React, from the spec and the suite alone, and it conforms. Anything it had to guess or ask is a finding against the
   spec.
6. **Rulings** asked in plain words and recorded in README §7.

## 7. Watch for

- **R3 (a), "the runtime wins," still holds for the node's own behaviour.** R11 and R12 move only React-made behaviour. Do not
  move a node rule because it is awkward to spec.
- **A hole shaped like the defect.** When a spec drops React state, every scenario that graded the old behaviour has to become
  a row scenario, or the runtime's divergence shows up unexplained. Check each removed scenario against its row.
- **One session per spec file.** These are NSP-016's files, and the visual nodes are being built in parallel. Check
  `git status` and the mtime before editing a spec.

## 8. Built

### 8.1 s45, 2026-10-05 — step 1: the Text Input v2; the label rule (C80) on the Checkbox and the Dropdown too

**Rulings** (Richard, plain words, one batch of four, then one more; README §7 R12): for the Text Input, **each write sees the
last** (C69, C72), **Pointer Down fires** on a mouse press (C68), **Enable Label keeps the keyboard** (a new row, C80), **the
resting cursor is at the end, both kinds of field** (D35). Then, asked because the Checkbox's 10,000 run surfaced the same shape:
the label rule for the Checkbox and the Dropdown too — **"Yes, all three"**.

**The sort (AC1)** — the Text Input, v1 state and rules:

| v1 | pile | evidence | v2 |
|---|---|---|---|
| `field` / `pending`: what React has committed; a graph write waits for the frame's end | React-made | C69, measured s38 | the field takes each write at once; row C69 |
| `shownType` / `shownMaxLength`: the props as React last drew them | React-made | C72, s40 | conversion and an Insert's room read Type and Max length as they stand; the element's own type follows at the paint (`pageType`, a page sync like `pageEnabled`); row C72 |
| `editCaret`: an edit's cursor callback waiting for React's commit | React-made | s40 | the cursor moves at the write |
| `world.turn`: React commits at a turn of the event loop | React-made | s40 | gone from the spec (from the format: step 2) |
| `wantsLabel` / `labelOn`: a label change rebuilds the input | React-made (React reconciles a different tree, TextInput.tsx :233-281) | s38 | gone; row C80 (new) |
| a one-line `<input>`'s press: no Pointer Down, no Pressed, no drain | React-made (one handler per event prop, TextInput.tsx :202-204) | C68, s38 | a press is a press on both kinds; row C68 |
| a fresh `<textarea>`'s cursor at the start | React-made (React writes default content) | D35, s40 | at the end, both kinds; row D35 |
| a type change from Email / Number to Text puts the cursor at the start | HTML's type change steps | jsdom form-controls | stays |
| a value write moves the cursor to the end when what the element shows changed | HTML's value setter | | stays |
| a pointer act drains the frame | the runtime's own (pointerlisteners.ts :173-186) | s38 | stays |
| Will Unmount leaves Focused true (D30) | the browser (no blur for a removed element) and the node | | stays |
| off the page the Value keeps its type (D32); the mount's announcement | the node's own | | stays |
| a Label object crashes the render (C65) | a crash, React's | | stays a row |
| typing: sanitization, the `maxlength` parse | HTML | | stays |

**Scenarios: 87 → 103**, 27 of them row scenarios (C68 15, C69 4, D35 3, C72 2, C80 2, C61 1). Each row scenario still fires on
the runtime; where the runtime would have lost a scenario's grading, a twin it passes sits beside it (14 Text Area twins for C68 —
a Text Area's press was always a press; a frame apart for C69; truncated for D35). Five label-rebuild scenarios went: without the
rebuild they duplicate four that were already there. The 704-segment matrix became three: the one-line field's 276 segments (no
label axis; no enabled press or click; no writing Insert queued behind a Clear on an act that does not drain), the Text Area's 56
press and click segments, and a C69 row matrix of 44. **Two v1 names graded nothing** (read against the traces): "after a Tab or a
key … the Set lands at the frame's end (Value 'x' wins)" — the Set is Unchanged, the Tab put the keyboard on the field; "Set then
writes the empty value (Done)" — Unchanged, the Clear had emptied the output. Both renamed. One new scenario: a Set landing off the
page at the frame's end, then a quiet frame (the interpreter's seed 20731 left that drop alive).

**The runtime's rows** (`packages/noodl-runtime/test/node-spec/conformance.test.ts`): `mousePressOnOneLine` (C68), `staleProps`
(C72), `staleEdit` (C69), `labelTakesKeyboard` (C80), `textAreaRestsAtStart` (D35). **An act's outputs print in its frame's settle
group**: the first C68 matcher looked for the press as the last step before the difference and matched none of the 4 + 8 generated
divergences at 200; it reads the frame now.

**The Checkbox v2 and the Dropdown v2:** the label rebuild out of both (`wantsLabel` / `labelOn`, the Dropdown's fresh selection
with it), C80 in both runtime row lists. Checkbox 39 → 35 scenarios (the five rebuild scenarios to one C80 row scenario, plus a
new one below); Dropdown 55 → 49 (two C80 rows; the matrix 704 → 352 segments without its label axis; "Items or the label or both"
21 → 7). The rebuild equivalents declared in s37 / s38 / s39 are pruned for all three; the deep runs say whether any comes back.
**The Radio Button carries the same rebuild** (it shares the Checkbox's page model): left for step 5, under the same ruling.

**The hit test's 10,000 runs** (s43's debt, the handoff's item 1) — Button and Checkbox at seed 20731, before the above: the
Button 0 divergences, 300 / 307 mutants; the Checkbox 1 divergence, 450 / 463. The survivors: an act whose paint puts a HIDDEN
element back on the page (Mounted on in the act's frame) swapped with the act that mounts nothing — only a read of the page between
the act and the frame's end tells them apart. One scenario each ("hidden and off the page: Mounted on and an act in the same frame
… a Focus action after it", every act): Button 308 / 309 and Checkbox 321 / 322 at 200 on seeds 13 and 20731, every new mutant
killed. The Checkbox's divergence was C66 met by a Blur action (Enable Label on at mount, then off; the Blur cannot take the
keyboard off the lost root): `lostRootAfterLabelOff` reads that too now. The other Checkbox survivors were the rebuild's, gone
with v2.

**The Text Input's first 10,000 run (runtime, seed 20731)** attributed C68 372, C72 15, C69 9, D35 5, C80 1 and left **6
divergences no row took**, all one shape: Block Pointer Events on (any truthy value) and a Set or Insert Text queued, then a release,
touch or lift: the runtime answers the queued write BEFORE the act's own Pointer Up / Pointer Down. Not first-frame, not React:
measured side by side in any frame, and a call-order probe showed the node's own handler still runs first in the PLAIN case. The cause
is the runtime's own (pointerlisteners.ts :113-133): Block Pointer Events gives every pointer event a handler (a blocker where
nothing listened), each wrapped with the drain, and the browser raises `pointerdown` / `pointerup` before the `mousedown` /
`touchstart` / `mouseup` / `touchend` the control listens to — on a disabled control too. R3 (a): the spec models it (`blocksPointer`,
`blockerFirst`; v1 had the same gap — the seed reached it, not the conversion). Two scenarios (release / touch / lift on a one-line
field, press / click on a Text Area; enabled and disabled). The interpreter's own 10,000 left 6 mutant survivors on branches only
10,000 reached (a remounting frame end with an empty Insert; an off-page Set with an empty Insert; a Text Area swap at a release, a
lift or a frame end while the field held the keyboard): four scenarios, each read by a later frame or a Blur action.

**Readings (2026-10-05, seeds as named; load 3–8 with peers):** the Text Input v2 conforms on the interpreter at 200 on seeds 13,
20729, 20730, 20731 (3,379 / 3,382 at 13; 3,700 / 3,702 at 20731 after the last scenarios, the rest declared) and on the runtime at
200 on 13 and 20730 (0 divergences outside the rows; 3,379 / 3,382, 3,372 / 3,373). Its runtime 10,000 runs at 20731: the first, 6
unattributed (Block Pointer Events, above); the second, 0 unattributed, C68 372 · C72 15 · C69 9 · D35 5 · C80 1 attributed, 3 mutant
survivors (a disabled, unfocused field's blocker drain) — one scenario, killed at 200; the third, after it, CONFORMS (0 divergences, 4,119 / 4,125, the rest declared). The Checkbox v2 and the Dropdown
v2 conform on the interpreter and the runtime at 200 on two seeds (321 / 322; 852 / 854, the Dropdown after one scenario for a press
the matrix's closing Focus action masked); at 10,000 each had 3 C80 divergences the first matcher missed (a Focus action earlier in
the frame — its Focused prints in the settle group) and no survivor; re-run with the matcher reading the frame's steps, both CONFORM at 10,000 (0 divergences; C80 attributed 5 and 3; 321 / 326 and 852 / 857, the rest declared). The Button conforms at 10,000 (0 divergences,
322 / 327, the rest declared). The package suite 20 suites / 878 passed; the runtime graph and target suites 102.

### 8.2 s46, 2026-10-05 — step 2: `WorldHandlers.turn` out of the format (AC2)

Nothing used it after s45 (a grep of `src/nodes` for a `turn` handler: none). Taken out of its four places: spec.ts `WorldHandlers`
and the erased `AnyNodeSpec.world`, interpreter.ts (the `turn` inbound kind, `advance`'s push, `handleInbound`'s arm) and
runner/mutants.ts (the handler name and the wrapped copy). `advance`'s first delivery of what already landed stays: it predates the
turn (s34's clock, `23bb0a073`). spec.ts is hashed: `tests/stranger-suite-hashes.json` refreshed (one hash, spec.ts).

**Readings (2026-10-05, `00cd9046a` + this change; load 2.4–4.4 with peers):** `tsc --noEmit` exit 0, no output; the package suite
20 suites, 878 passed, 17 skipped (the stranger rounds' opt-in deep runs); the three stranger rounds green (41 passed: hashes, the
siblings-only rule, each node conforming on the stranger's target, the schema, every mutant disagreeing); the runtime graph and
target suites 102 passed.

### 8.3 s46, 2026-10-05 — step 3: the Slider v2

**Rulings (R14, README §7)** — one batch of four in plain words, one re-asked when its first wording read as "huh?": a Slider
or a Dropdown hidden with Mounted and shown again is **where the person left it**; a Dropdown handed its Items again **keeps the
pick**; **the last word wins** (*"Why would I not let the node show whatever the last value or signal it received was? Whether it
comes from the user or not"*); the Radio Button takes R13's label rule (**"Yes, same rule"**). The first wording of the third
question ("the graph writes 40 then 0 in one frame after a slide") was too abstract — Richard answered with the principle instead,
and it decides C73's intent too: a lone Reset to the author's last Value after a slide moves the handle.

**The sort (AC1)** — the Slider, v1 state and rules:

| v1 | pile | evidence | v2 |
|---|---|---|---|
| `paintedValue`: `props.value` as the last render saw it (the effect's dependency) | React-made | D36, s41 | gone; `pending` — the graph gave the handle a word the page has not drawn yet — drawn at the next paint (a frame's end, or the paint an act makes first) |
| the effect reports the graph's Value through `updateOutputValue`, firing Changed | React-made (the component's effect, Slider.tsx :88-95) | D36 | the paint reports it without Changed (the descriptions of Value and Changed); row D36 |
| a remount takes the author's Value back (`useState(props.value)`) and announces it | React-made | D36 | the handle stays where it was (R14); row D36 |
| a Value equal to the author's last write is dropped (slider.ts :265), and the effect drops a second NaN (`Object.is`) | the node's own (the setter) and React's (the effect) | C73 | every Value write is a word (R14); row C73 |
| `shown`: the component's `useState` | the element's value — renderer-neutral | | stays, kept off the page too |
| Min / Max re-clamp the author's Value only, a word only when it moves it (`!==`) | the node's own | C74 | stays |
| Value Percent `NaN` at Min = Max; the falsy-percent recompute | the node's own | C75 | stays |
| the browser's range sanitization and step rule; a reversed range not played | HTML / the face | | stays |

**The runtime's rows** (`packages/noodl-runtime/test/node-spec/conformance.test.ts`): `changedWithNobodySliding` (D36 — the runtime
fires a Changed the spec does not, or re-reports the author's Value at a remount: a reference frame with Did Mount after an earlier
Will Unmount) and `graphValueDropped` (C73 — the spec reports Value or Value Percent in a frame with a Value write, the runtime
does not, after a slide or with the author's Value NaN).

**Scenarios: 48 → 68**, 32 of them row scenarios (D36 26, C73 4, C62 1, C63 1). Rewritten by a script from the v1 copy (every
hand addition lived in the script, `slider_v2_scenarios.py`, the session's scratchpad); from this commit on the JSON is the source
— edit it by hand. Eighteen v1 scenarios became row scenarios under v2 names; runtime twins sit beside them where the row would have hidden a grade (the
empty values on a fresh slider; a single Value 120, a single '60' — each graded up to its Changed). **The matrix** (704 segments)
reset each segment by a remount, which under v2 keeps the handle and on the runtime takes Value 0 back with Changed: each segment
now starts with a slide to 0 and Value 0 before the remount, which both targets agree on, and it split — 264 segments with no
Value write and no remount after the slide (graded on the runtime) and a D36 row matrix of 440. The two "a person acts on a
painted page" scenarios slide to 0 before 30 (their last remount no longer follows a moved handle), so both stay runtime-graded.
**v1 named one thing nobody sent:** "Max wired [1, 2] … a slide to 150 lands on 1: Value 1 with Changed" — the handle is already
1 there (a NaN is the middle, 0.5, stepped to 1), and neither target ever sent a Value; renamed.

**The mutants.** v1's act-paint branches were killed by WHERE the paint's Changed printed; v2's paint fires none and values print
unordered in the settle group, so the first run left 75 survivors, all one family: an act's paint that draws the graph's word,
dropped or swapped, leaves the drawing to the frame's end and the trace cannot tell. The kill: a Max (or Min) write after the act in
the same frame — the act's paint computed Value Percent against the old one, a frame-end draw against the new (C74's stale percent
makes it visible). An act-paint row matrix (176 segments at first — Value 40 or 0.5, every act, enabled or not, the keyboard on or off,
remounting or not; 528 after §8.4) and a runtime-graded twin for words that move nothing (Value 0 at 0, every act, Min -100 in the act's frame).
**Thirteen declared equivalent** (`NO_WORD_WAITING`): an act's paint or a mount on the page that found no word waiting, handed its
twin's patch — `pending: false` where it is false already, and the handle kept (a swap keeps the page's syncs). Two more kills came
from recorded examples: a slide whose Value Percent does not move was recorded only at 30.5 → 30, where its twin's example agreed
(a scenario at 40.5 → 40); and at seed 20731 the placing's draw swapped with an off-page placing (placed with Min 10, Min 0 before
the first frame: the placing's Value Percent 0 stands).

**The runtime batch found five more branches** (seed 20730, interpreter-side mutants): a word that moves no Value but redraws a
falsy Value Percent against a Min moved since (a C73 row scenario; the C73 matcher reads a Value Percent alone too), the same word
drawn at a remount (the runtime agrees), every act in a remount frame with such a word and Min -100 after it, the same disabled
and hidden, and a Blur act whose paint puts the slider back — a Focus action after it, same frame, reads the page (Done, not
Unchanged). Ten more equivalents of `NO_WORD_WAITING`'s shape (the act paints that bring the slider back): 23 declared in all.

**Readings (2026-10-05, `8203644c3` + this change; load 2–4 with peers):** the Slider v2 conforms on the interpreter at 200 on seeds
13, 20730 and 20731 (0 divergences, 2,926 / 2,950, the rest declared) and on the runtime at 200 on seeds 13 and 20730 (0
divergences outside the rows; D36 attributed 82 and 61, C73 by its scenarios; 2,926 / 2,950; both tests green). The package suite
20 suites, 878 passed (batch-visual 709 s — the Slider file is larger); the runtime graph and target suites 102. The 10,000 runs:
§8.4.

### 8.4 s46, 2026-10-05/06 — the Slider v2 at 10,000

**The first runtime 10,000 (seed 20731, the commit `a19b5600d`) did NOT conform:** 2 divergences no row took, 37 survivors.
- The two divergences: (1) a first-paint Changed (D36) in a sequence where a Placement setter throws LATER (C63) — the divergence
  carries `threw`, and the D36 matcher bailed on any throw; it now takes the runtime's Changed when that IS the difference. (2) The
  author's Value 0 → 40 → 0 inside one frame (a Value write, then a Max of -2 clamping it back): v2 draws the word and recomputes
  Value Percent to -0, the runtime's effect sees the 0 it last drew (0) — C73's shape with the SAME port on both sides; the C73
  matcher takes a same-port, other-value difference now. Read the unshrunk sequence (`generateSequence(spec, 20731, i)` → the
  index whose seed matches): the shrunk replay ended in a plain D36 Changed and named neither.
- The survivors: the act-paint family again, in states the first kill matrix never had — a HIDDEN slider (an act that reaches nothing
  still paints first and draws), the remount frame with a disabled or hidden slider (only a Focus action after the act reads whether
  the paint put it back), and a word that moves Value Percent alone. The matrix became 528 segments: every act × enabled / disabled /
  hidden × the keyboard off / on × remounting or not × four words (Value 40; 0.5; 0 at 0; 0 after Min -100), then a Focus action
  (after an act that cannot take the keyboard itself — after one that can, it masks the act's own focusing), Min -50 and Max 150.
  **Two traps in my own matrix:** Max 50 left 0 at the middle of both ranges (the original and a frame-end draw computed the same
  50 — a coincidence, not an equivalence); and the segment reset left Value Percent truthy, so the "percent alone" word never
  recomputed it (C74's stale percent, in the reset) — the reset now slides to 50 and back to 0. Five more `NO_WORD_WAITING`
  equivalents (a remounting slider the act does not reach, no word waiting): 33 declared in all.

**Readings (2026-10-06, `615bfa049` + this change; load 2–3 with peers):** the Slider v2 **CONFORMS at 10,000 on the interpreter**
(seed 20731: 0 divergences, 5,443 / 5,476, the rest declared, 1,629 s) and **on the runtime** (seed 20731: 0 divergences; D36
attributed 3,796, C73 3, C62 / C63 as before; 5,443 / 5,476; 2,094 s); on the runtime at 200 on seeds 13 and 20730 (both tests
green; 5,379 / 5,408). The package suite 20 suites, 878 passed (1,463 s — batch-visual plays the 68 scenarios).

