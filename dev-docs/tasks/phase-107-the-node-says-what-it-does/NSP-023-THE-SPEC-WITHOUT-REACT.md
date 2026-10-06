# NSP-023 — The spec without React

**Opened 2026-10-05, from ruling R12 (README §7).** **Depends on NSP-016** (the specs it converts) and the Text v3 (NSP-016 §7.9,
the recipe). **Status: ✅ (s50) — steps 1–7 done (s45 §8.1, s46 §8.2–§8.4, s47 §8.5 the Dropdown v3 and §8.6 the radio pair, s48 §8.7 the words and §8.8 the guard, s49 §8.9 the proof); the Checkbox's and the Dropdown's label rule with step 1. All eight steps built; AC1–AC5 met (§8.9 adds AC5 and AC1's last reading); AC6 met s50 (Richard confirmed the radio remount, README §7 R15). ✅ All six ACs met.**

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
   spec. ✅ s49: the Dropdown v4, at 200 and 10,000 (§8.9, NSP-006 §5.10).
6. **Rulings** asked in plain words and recorded in README §7. ✅ s50: the last one, the radio remount, confirmed by Richard (R15: no Changed).

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

### 8.5 s47, 2026-10-06 — step 4: the Dropdown v3

**No new ruling.** R14 had ruled both intents in s46: a Dropdown hidden with Mounted and shown again is where the person left
it, and one handed its Items again keeps the pick. The last word wins, and C71's intent was already the spec's. The spec
is now `version: 3` (v2 was s45's label rule).

**The sort (AC1).** The Dropdown, v2 state and rules:

| v2 | pile | evidence | v3 |
|---|---|---|---|
| `authorValue`: `props.value`, what the Value input last wrote, changed or not (options.ts :194) | React-made: only the component's `useState` and effect read it | D34, C71 | gone |
| `shown`: the component's `useState` (Select.tsx :42), a copy of the choice that the effect re-syncs | React-made | D34, C71 | gone. The node's value is what the element is told to select (in v3 the two never differ) |
| `paintedItems`: `props.items` as the last render saw it, the effect's dependency (by identity) | React-made | D34 | gone. Items is drawn at the next paint, whatever its identity |
| the effect at a mount and at a new Items array takes the author's Value back, sends it and fires Changed | React-made | D34 | gone. A remount and a new list keep the pick, with nothing on the wire (R14); row D34 |
| a Value written back to the value React last rendered leaves the pick on the screen | React-made (v1's intent already said the selection follows) | C71 | unchanged; row C71 |
| the Value setter: `null` ignored, anything else made text, a change sends Value and never Changed | the node's own | | stays (the "equal" branch no longer records an author's Value) |
| `domSelected`: the element selects the node's value while it names an option; otherwise the browser keeps its selection, a fresh element selects the empty option, and a removed option hands the selection to the first enabled one | HTML / the element | | stays, read from the node's value |
| Items that is not a list crashes the render | the node's own | C70 | stays a row |
| Enable Label keeps the `<select>` | ruled s45 | C80 | stays a row |

**The runtime's row** (`conformance.test.ts`), `changedWithNobodyPicking` (D34): after a person's pick, the RUNTIME prints Value or
Changed where the spec prints something else. It must happen in the settle group of a frame that holds an Items write, or
of a frame whose reference prints Did Mount after an earlier Will Unmount.

**Scenarios: 50 → 57.**
- **Six D34 row scenarios**, renamed to the intent. Each has a **twin** that the runtime passes. The twin's trick is
  new: *the graph confirms each pick.* The frame after each pick opens with a Value write equal to the node's value. The
  spec does nothing with it. The runtime's setter records it as the author's Value (options.ts :194), so neither its
  remount nor a new list has anything to take back.
- **Five scenarios became twins in place**, because D34 was only incidental to them: the two act-on-a-painted-page grids
  that remount, the 704-segment matrix, the matrix of a disabled Items rewrite, and the option-value fallback. Their
  interpreter traces are unchanged, so they kill the same mutants and are now graded on the runtime too.
- **One kill scenario** (below).

The rewrite script (`zz-rewrite`, scratchpad, deleted) checked that every one of its 267 confirms is a no-op in the spec:
each twin's trace equals its source's with only the writes added. From this commit the JSON is the source, so edit it by
hand.

**v2 named two things wrongly:**
- "Items written with the current Value absent … a pick from the new list: Value 's', Changed" was false. The new list
  had already handed the selection to 's', its first option, so that pick raised only Focused, and no pick ever preceded
  the second Items write. D34 was never graded there. The scenario now picks 'l' too.
- "a pick, then Value written to the picked value …" listed its steps out of order.

**A trap in my own transform:** it first read the node's value AT each settle event. A frame's outputs print after that
event, in its group, so every confirm wrote the value from before the pick. That is a write-back, C71's setup, and one
segment of the matrix diverged on it. The transform now reads the value once the group has printed.

**The mutants.** One survivor, on seeds 13 and 20730: the Items setter's "undefined is no opinion" branch, swapped with
its sibling, whose recorded example is the default list. The only undefined write in the scenarios fell on the default
list. v2 had killed that swap through the effect's Items identity, which v3 dropped. The kill is a new scenario: Items
written undefined over a list of its own, then a pick of 'l'. **No new equivalents.** The Slider's trap (an act's paint
against a frame-end draw, §8.3) cannot arise: the Dropdown v3's paint sends nothing, and its only page work, the
selection, is read by the next pick.

**Readings (2026-10-06, `0ea207e52` + this change; load 2–8, a peer driving the editor):** on the interpreter at 200, seeds
13, 20730 and 20731: 0 divergences, 0 survivors. On the runtime at 200, seeds 13 and 20730: CONFORMS (0 divergences,
11 row scenarios known, 345 of 346 mutants killed, the last one declared), and both tests are green. D34 had 0 generated
hits on both seeds (200 sequences held no pick followed by a remount or an Items write); its six scenarios carry it.

**The 10,000 (2026-10-06).** The first runtime run at today's seed, **20732** (305 s), did NOT conform: 2 divergences and 1 survivor.
- **A pick and an Items write in the same frame.** Here it was the first frame, whose act paint also mounts the dropdown. The
  D34 matcher had looked for a pick in an *earlier* frame. It now takes a pick anywhere before the Items write.
- **C80 after a labelled placing.** The node was placed with the label on, given a Focus before the first frame, then had its
  label written off. On the runtime the placing is already a paint, the Focus waits for the element it drew, and the label-off
  rebuild drops the keyboard. A four-way control confirmed it: the divergence needs both the placed label and the later
  change. `labelTakesKeyboard` now starts from the placing's label. This shape predates v3; v2's 10,000 at 20731 never drew it.
- **The survivor:** the paint of a *leave* on a hidden dropdown in its remount frame. The act's paint puts the element back
  (Did Mount), and a frame-end mount prints the same. This is the Slider's §8.4 trap (the remount frame with a hidden
  control). The kill is a new grid: every act on a hidden dropdown brought back with Mounted in the act's frame, then a Focus
  action, which is Done if the paint put it back and Unchanged if not.

**Readings after the fixes (2026-10-06):**
- **On the runtime, 10,000 at seed 20732: CONFORMS.** 0 divergences; D34 attributed 3, C80 5, C70 193; 385 of 390 mutants
  killed, the other 5 declared; 185 s.
- **On the interpreter, 10,000 at seed 20731: CONFORMS.** 0 divergences, 0 survivors; 65 s.
- **On the runtime, 200 at seeds 13 and 20730: CONFORMS** (47 of 58 scenarios pass, the 11 others are known rows; 385 of 387
  and 385 of 386 mutants killed); both tests are green.
- The package's catalog-parity, reach, types and schema suites: 337 passed. `batch-visual`'s Dropdown test is the interpreter
  run at seed 13 above. `tsc --noEmit` is clean.

The Dropdown is a cheap spec to grade (16 s for 200 on the runtime). A step that runs the 10,000 straight after the 200s
loses nothing.

### 8.6 s47, 2026-10-06 — step 5: the radio pair (the Radio Button Group v2, the Radio Button v2)

**No new question.** Both intents were ruled on P109's Track F page (2026-10-05) and are recorded as **R15** (README §7):
- C76: **"Show what Value says"**.
- D37: **"Fire from the click"**.

One case neither answer names is a button that is *off the page* (Mounted off) when a sibling's click takes its selection.
It was read from D37's measured cases, which call a remount's Changed a defect, and from scenario [11]: the runtime is quiet
when such a button comes back. So the button shows the group's choice when it returns, with no Changed. That is s47's
reading, open to Richard.

**The sort (AC1) — the Radio Button Group, v1 state and rules:**

| v1 | pile | evidence | v2 |
|---|---|---|---|
| `rendered`: the Value the last paint rendered (the effect's dependency) | React-made | C76 | gone |
| `selected`: the component's copy of the selection (`useState`) | React-made | C76 | gone. The selection is the node's Value |
| a pick where `selected === v` raises nothing, and one where `value === v` selects without Changed | the browser, plus React's copy | C76 | a pick of the button the Value names raises nothing; any other sends Value and fires Changed |
| the Value input's conversion; Visible, Mounted, Children Count | the node's own | | stay |

**The Radio Button, v1 state and rules:**

| v1 | pile | evidence | v2 |
|---|---|---|---|
| `shownValue`: the button's Value as last rendered | React-made (the props React last drew). Every reader came after a paint, so it never differed from `value` where it was read | | gone |
| `gRendered`, `gSelected`: the group's copy and its effect | React-made | C76 | gone. The button reads `gValue` |
| `gFromUser`: the group's "a person made this selection" flag, read at every Checked change | React-made | D37 | gone. Changed fires from this button's click, and for a loss to a sibling's click while it is on the page |
| effect order (the button's effect runs before the group's) | React-made | D37 | gone |
| `wantsLabel` / `labelOn`: the tree rebuilt around a new input | React-made | C80 | gone. The label leaves the input and its keyboard (R14) |
| Checked follows the group's Value at each paint while on the page | the node's page (the frame's paint, as every control's) | | stays, never with Changed |
| a click on a selected radio raises nothing; a click on any other selects it | the browser | | stays |

**The runtime's rows** (`conformance.test.ts`):
- On the group, `groupPickWrittenBack` (C76): the spec reports Value or Changed where the runtime does not, after a frame in
  which a pick was followed by a Value write.
- On the button, `labelTakesKeyboard` (C80, the shared matcher).
- On the button, `buttonPickWrittenBack` (C76 seen from a button): Checked or Changed differ, after a frame in which a pick or
  a click was followed by an `advance` (that is where the play delivers the group's write).
- On the button, `changedWithNobodyClicking` (D37): the runtime fires a Changed where the spec prints something else.

**Scenarios.**
- **The group: 22 → 23.** The C76 scenario became a row named for the intent. Its "other half" was renamed: it agrees on both
  targets, but for different reasons (in v2 the button the Value names is the selected one; on the runtime the node
  already holds that Value). The new twin puts a frame between the pick and the write-back.
- **The Radio Button: 152 → 65.** 89 were dropped as React's timing only (§3 step 4):
  - the effect-order family "a click, then X, then this button's Value written away" (10);
  - "a sibling carrying this button's Value picked … then X" (19);
  - the "read a frame later" matrix and its "already selected" companion (60). Half of these still agreed on both targets,
    but every one was named for the group's flag;
  - one duplicate.
- **21 are rows:** C80 10, D37 4, C76 3, and C62, C63, C65, C66 as before. 13 more were renamed where v2 changed the claim
  or the wording was React's. 3 kills are new.

**v1 named one thing falsely:** "a write and an advance with no frame between: the selection waits for the frame's end — a
click on the still-selected button in between raises the pointer events alone". The click's own paint shows the write
first, so it meets an unselected button and selects it again, with Changed, on both targets. v1's `because` already said
"an act paints the page first".

**The mutants.** After the drop, the button had three survivors:
- the paint of a pick that changes nothing, which a Focus action reads in an Enabled-off or Visible-off frame;
- the same pick in a Mounted-off frame (seed 20731);
- a pick that changes nothing, swapped for one that moves the group to 'a'. My first kill missed it at the wrong value:
  a swap keeps the page's Checked, so only a button carrying 'a' itself reads the move.

The group had two, both declared: a frame end or a pick whose only write is the painted visibility, whose one reader is a
pick that paints first. Now 0 survivors on both specs at seeds 13, 20730 and 20731 on the interpreter.

**Readings (2026-10-06, `523ade4a4` + this change):** on the runtime at 200, seeds 13 and 20730, both specs CONFORM:
- the group: 20 of 23 scenarios pass (3 known); 47 of 50 mutants killed, 3 declared;
- the button: 44 of 65 scenarios pass (21 known); 357 of 357 mutants killed. D37 had 1 generated hit at 20730 and C80 2 at 13.

**The 10,000 (2026-10-06, seed 20732).**
- **The group CONFORMED at the first run:** 0 divergences, C76 attributed 1; 47 of 50 mutants killed, 3 declared; 149 s.
- **The button did not, at first:** 2 divergences and 6 survivors.
  - Both divergences were C80 after a labelled placing, missed for a reason the Dropdown's fix did not cover. **A settle group
    prints a frame's outputs after all its steps**, so a Blurred from a Blur signal sent BEFORE the label's paint printed
    after the act, and the matcher read it as "the keyboard was given up". Read on the UNSHRUNK sequences (found by their
    seeds); the shrunk replays named neither cause. `labelTakesKeyboard` now lets only a Blurred or Will Unmount from a
    LATER frame cancel the loss.
  - The six survivors were all picks in a frame that also mounts or unmounts the button, swapped among three shapes (no-op;
    moves the group; unmounts). The kill is a remount-frame pick grid: Mounted off, or on after off, in the pick's frame;
    the pick a no-op or moving the group; this button carrying 'a', 'b' or 'c'; then a Focus action, a remount and a click.
    The 'c' half is graded on both targets; the 'a'/'b' half is a D37 row, because a same-Value sibling's pick fires the
    runtime's Changed.
- **After the fixes, the button CONFORMS at 10,000:** 0 divergences; C80 attributed 12, C76 7, D37 12; 451 of 455 mutants
  killed, 4 declared; 207 s. On the interpreter at 10,000 (seed 20732): 0 survivors.
- **The five specs that share the C80 matcher CONFORM at 200 on seed 13 after the change:** the Checkbox, the Text Input, the
  Dropdown and both radios, with the known-rows test green. Both radios conform at 200 on 20730 too (the button: 45 of 67
  scenarios pass, 22 known; 433 of 433 mutants killed).

### 8.7 s48, 2026-10-06 — step 6: the words

No behaviour change, and no scenario added or removed. Every line in `src/nodes` and the format files that matched
`/react|useState|effect|forceUpdate|render|commit|rebuil/i` was read. **Source citations stay** (`react-component-node.ts :2302`,
`NoodlReactComponent :982`, `react-dom setValueForAttribute`): they are provenance. So does any sentence that credits a React
mechanism to **the runtime** to explain a known row ("the runtime's effect takes the author's Value back", row D34). That is
what R11 allows. The rest now say what a person or the browser sees:

| file | was | now |
|---|---|---|
| button.ts | "React drops `onClick` / `onMouseDown` / `onMouseUp` on a disabled control" | HTML: a disabled form control gets no click; no press or release reaches it either (browsers have differed on those two); Hover Start / End and a touch still fire |
| button.ts | `onPage`: "committed by React"; "the first render"; "the commit"; "is committed" | on the page; the first paint; the element added or removed; is added |
| checkbox.ts | "React drops it"; v1 "rebuilt the box … as React does" | HTML: a disabled form control gets no click, so the box does not toggle; "as the runtime does" |
| icon.ts | "the first render" | the first paint |
| text.ts | "React makes a NEW element"; "an element React makes later"; "the frame end's render commits when the settle's React `act` closes" | a new element is made when the tag changes (an element's type cannot change); an element made later; the paint lands when the runtime target's settle closes |
| text-input.ts | `maxlength`: "React puts `'' + value` on the attribute" | the attribute carries Max Length as text and is absent for null, undefined or a boolean (the runtime's renderer cited) |
| spec.ts | `place`: "a loaded app renders"; `group`: "renders it"; THE PERSON: "the node's REAL React component" | first draws; shows it; the node's REAL component, a React one today |
| world.ts GROUP | "renders alone; no context reaches it"; "the first render"; "renders it"; "the page renders the group" | is drawn alone, no group reaches it; the first paint; shows it; draws |

**Scenario names, each renamed only after reading its trace on both targets** (`zz-side`, `ZZ_PRINT=1`):
- The Checkbox's [19] and the Dropdown's [35] said "the element is rebuilt without the label". Since v2 neither spec rebuilds
  anything; the traces show the hover, then the leave ending it. Renamed: "the label goes, the box (the dropdown) stays where it
  is". The Checkbox's name also gained "(after a Check)", a step the old name left out.
- The Icon's [6]: "commits the first" became "paints the first".
- Every other React word in a visual spec's scenario names credits the runtime with a row (the Dropdown 13, the Slider 4, the
  Text Input 2, the Checkbox 1), and they stay.

spec.ts and world.ts are hashed by the stranger suites, so the hashes were refreshed and the three rounds re-run: green.

**Readings (2026-10-06):** `tsc --noEmit` is clean. The package's stranger, catalog-parity, schema, types and reach suites:
378 passed, with the 17 opt-in deep runs skipped. On the runtime at 200, the Button, Checkbox, Text Input, Dropdown, Icon and
Text all CONFORM on seeds 13 and 20730.

### 8.8 s48, 2026-10-06 — step 7: the guard (AC4)

**What it is.** `packages/nodegx-node-spec/tests/page-model.helper.ts` holds a **page model** for every visual spec (one with
`acts` or a `world.place`), kept by hand like `tiers.json`. It puts each state key in one class:

- **node**: what the node's code holds.
- **attr**: what the paint writes onto the element from the node, with its projection (`pageEnabled` follows `enabled`).
- **element**: which element is on the page (the Text's `elem`).
- **held**: what the browser holds and a person moves. Each one either **shows** a node value (the Slider's handle shows its
  Value; the Dropdown's selection shows its Value wherever the list offers it; a text field shows its Value), or **keeps**
  one of three things only a browser has (the keyboard, the caret, what a module put on the element).

`tests/page-model.test.ts` plays each visual spec on the interpreter, wrapped, over its scenarios and 200 generated sequences
on seeds 13 and 20731, and checks eight rules. "The paint" means what runs at a frame's end (`afterInputs`) and at the
placing (`world.place`).

| rule | what fails | the React shape it stops |
|---|---|---|
| G1 | a state key not classified exactly once; a visual spec with no model | a new key nobody sorted |
| G2 | the paint writes a node key outside the spec's `frameEnd` list (the node's own frame-end work, each with its line) | a copy "as last rendered" or a commit, kept as node state |
| G3 | an input, a signal or a world event depends on a page key (found by perturbing the key and comparing the reducer's patch), outside the spec's `elementCalls` (Focus / Blur meet the element; Clear, Backspace and Start Value write the field) | a write that reads what React committed |
| G4 | after a paint, an attr off its projection, a held key off what it `shows`, an element key changing alone | a component's own copy of a value the node holds |
| G5 | the paint, run on the state with every attr already drawn, leaves different node keys, sends or pulses (Did Mount and Will Unmount aside) | an effect keyed on what it last rendered: a paint with memory |
| G6 | a held key that only a paint ever moves | a copy passed off as the browser's |
| G7 | the paint fires anything but Did Mount, Will Unmount and the spec's own frame-end pulses | "who made it", read at a paint |
| G8 | a world handler the format lacks, or a format kind not in the pinned list (read from spec.ts's `WorldHandlers` text) | a `turn`-like hook |

**The converted specs pass, all nine visual ones**: Button, Checkbox, Icon, Text, Text Input, Slider, Dropdown, Radio Button
Group and Radio Button. The first run failed three of them, all on model mistakes, not on React state:
- the radio's placing hands it its group (`inGroup` and `gValue` joined its `frameEnd` list, citing world.ts GROUP);
- `onPage` is never preset: an element appearing is a lifecycle event, and the Text Input announces itself and the Text's
  `whenMounted` stops counting;
- the Text Input's Clear, Backspace and Start Value write the field at once, so they are element calls;
- `pageType` follows the Type only while the field is on the page.

Measured before writing the shows rules, over about 66,000 paints on the page: the handle equals the Slider's Value output
(0 misses), the selection equals the Dropdown's Value whenever the list offers it (0), and the text equals the Value (0, Number
fields aside).

**The measurement: each shape planted** (`tests/page-model-plants.test.ts`). Each plant is a copy of a converted spec, edited
as text and compiled in memory; the real file is never touched. Each must turn the guard red however the planted key is
classified: left out, called the node's, called an attr that follows its source, or called held and showing its source.

| shape (from §8.1–§8.6) | plant | red by |
|---|---|---|
| a last-rendered copy | the Slider: `paintedValue`; a word equal to it is dropped (C73's React shape) | G1 · G2 · G5 · G4 + G6 |
| a component's copy of a value the node holds | the Dropdown: `selected`, copied from Value when the element is made and moved only by a pick | G1 · G2 · G4 · G4 (the real `domSelected` stops showing the Value too) |
| a "who made it" flag read at a paint | the Radio Button: `byPerson`, set by the click; the paint fires Changed (D37's React shape) | G1 · G2 + G7 · G5 + G7 + G4 · G7 + G4 |
| a commit-pending field | the Text Input: `committed`, the field as the last paint left it, read by an edit (C69's React shape) | G1 · G2 · G3 + G5 · G3 |
| a `turn`-like hook | a `turn` world handler in the Slider; a `turn?:` kind added to a copy of spec.ts's text | G8 · G8 |

**20 of 20 cells red**, plus both hook plants. The first version had one hole, in the Dropdown's held cell: a component copy
called "held" passed every rule. That is what the `shows` / `keeps` split closes.

**The residual, written down:** a held key that falsely claims to **keep** the keyboard, the caret or a module's attributes.
The guard cannot catch it. It does make the claim a line someone writes and a reviewer reads, from a list of three.

**Why the model lives beside the test, not in the spec.** The format already has `synced` (page keys a mutant may skip), but that
only shapes mutants. Declaring the page model in the format would change spec.ts and every visual spec for something only the
guard reads. A stranger's target does not need it. If a stranger round ever wants it, it can move.

**Also already guarding, and worth knowing:** on the runtime, a spec that copies React's behaviour on a row turns that row's
scenario green, and a passing row scenario turns the known-rows test red (`conformance.test.ts`, "the known rows are still
open"). That covers behaviour with a row; this guard covers React-made state with no row, and needs no runtime.

**Readings (2026-10-06):** the guard 11 / 11 (each visual spec's run 0.3–8 s); the plants 22 / 22; `tsc --noEmit` clean.

### 8.9 s49, 2026-10-06 — step 8: the proof (AC5)

**A stranger built the Dropdown v4 on a plain DOM page, with no React, from the spec and the suite alone, and it conforms**
at 200 (62 / 62, 0 divergences, 386 / 386 mutants caught; green on its first run) and at 10,000 (seed 20732, 0
divergences). The full record is NSP-006 §5.10. The round's brief is [NSP-006-BRIEF-4.md](NSP-006-BRIEF-4.md), its target
`packages/nodegx-node-spec/stranger-4/`.

**How "no React" is graded, not just claimed.** The harness owns the person (`tests/stranger-page.js`: a jsdom page and
the acts as DOM events). The target only draws elements and listens to them. A new test deafens each act in turn, and the
target must then disagree with the spec. A control target that answers acts from the spec's own reducers conforms at 200
with every mutant caught, and is red on all ten acts. So conformance alone could not have told the two apart.

**Why the Dropdown and not the Slider.** It is the cheaper control (no range rules, no sanitization the face has to copy),
and its spec had the most React shapes taken out at step 4 (D34, C71).

**What it found against the spec**, each now closed:
- **Two format gaps** (a value input with no reducer sends nothing; a param's write at mount is a sample, only the initial
  state is not). Both are invisible at 200. Now they are sentences in spec.ts rule 4 and adapter.ts, and two hand scenarios
  (62 → 64). Each scenario catches the stranger's wrong guess put back in a copy; the runtime passes both.
- **One React shadow in the words.** dropdown.ts called the `<select>`'s selection the browser's. That is true only for a
  target that keeps the option elements still offered, which React's keyed list does. A plain-DOM target that rebuilds the
  list must assign the selection itself, and the stranger did. The docblock now says the outcome is what is graded.
- **One unstated order:** the Focus and Blur actions meet the page as last painted; a person's act paints first. Now in
  the docblock.

No behaviour moved: the Dropdown stays v4, and it conforms on the runtime as before (CONFORMS at 200, 0 divergences;
54 / 64 scenarios pass, the other 10 its known rows). The stranger hashes now guard dropdown.ts, its scenarios,
text-input.ts and the page, so **a change to any of them needs the hashes refreshed and round 4 re-run**
(`node -e "require('./tests/stranger-suite-hashes.helper.js').write()"`, then `npx jest tests/stranger.test.ts`, about a
minute).

**Readings (2026-10-06):** the whole stranger file 46 passed, 18 skipped (the deep runs), exit 0, hash gate green; the
page-model guard 11 / 11; `tsc --noEmit` clean; the runtime's Dropdown at 200 (seed 20732) CONFORMS, 385 / 387 killed.

**AC1's last reading, taken here.** §8.6 records the Radio Button Group at 10,000 on the runtime, but not on the
interpreter. Run now (seed 20732): CONFORMS, 23 / 23 scenarios, 10,000 / 10,000 with 0 divergences, 47 / 50 mutants
killed and 3 declared; 11 s. All five converted specs now have 10,000 on both targets.
