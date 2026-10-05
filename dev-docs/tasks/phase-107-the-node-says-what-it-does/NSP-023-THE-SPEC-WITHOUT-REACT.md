# NSP-023 — The spec without React

**Opened 2026-10-05, from ruling R12 (README §7).** **Depends on NSP-016** (the specs it converts) and the Text v3 (NSP-016 §7.9,
the recipe). **Status: 📋 not started.**

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

Nothing yet.
