# ISL-026 — A value of the wrong kind never kills a node

**Status: ✅ s22 (2026-10-06): all 20 rows fixed, AC1–AC4 met. s21 fixed 17 (C3, C4, C8, C10, C16, C18, D8, D15, C24, C44, C54, C57, C61, C62, C63, C65, C70); s22 fixed C6 (`ebeefb060`), C20 (`dbd5b9c90`) and KITTHROWBLANKS (`7abed2878`), and closed C44's graph scenario (`84dab5b7a`). One ruling is owed and stands apart from the task (§10: should built-in nodes get the same boundary?). ✅ AC2: all 19 rulings taken 2026-10-05, all as recommended. Scoped 2026-10-05 at `8292f1d55` by the ledger sweep (Track F).** **Source:** 20 bugs from
the ledger (`dev-docs/bugs/`) that had no task: 4 high · 13 medium · 3 low, **19 awaiting a ruling**. **Side:** runtime (node setters and frame-end callbacks), noodl-viewer-react (control render, kit nodes)

## 1. The person sentence

**A node given a value it did not expect, such as a number where it wanted text, `null`, an object or a list, keeps working. It may say what was wrong, but the node does not die, it does not stop answering, and it never blanks the page.**

## 2. Why these belong together

This is the most fundamental group in the sweep. In every row a wire delivers a value of a kind the node did not
plan for. A setter or a frame-end callback then throws, and the node is dead from then on, or the page's whole React
tree is. Often nothing tells the person (String Format's throw, C3, is swallowed at `nodecontext.ts:472`). The usual shape of the fix is one coercion at
the setter (`String(x ?? '')`, `Array.isArray`, `Number.isFinite`), so the rows are cheap one at a time. The ruling is
what to coerce *to*, and P107 has written that question for most of them. The kit node that blanks the page
(`P109-S17-KITTHROWBLANKS`) is the same sentence one level up: one node's failure must stay inside that node.

## 3. The bugs

Worst first. Each file holds the measurement, the reproduction and, for most of them, the proposed fix and the question
to ask. This table is generated from the ledger headers. **The ledger file is the source**, so read it before you start.

| bug | severity | status | what a person sees |
|---|---|---|---|
| [P107-C3](../../bugs/p107-c3-string-format-dies-for-good-when-format-is-not-text-a-wired.md) | high | ✅ fixed s21 | String Format dies for good when Format is not text (a wired number, null, an object) |
| [P107-C16](../../bugs/p107-c16-date-add-crashes-and-stays-dead-when-unit-is-a-value-it-does.md) | high | ✅ fixed s21 | Date Add crashes and stays dead when Unit is a value it does not know |
| [P107-C65](../../bugs/p107-c65-a-checkbox-label-wired-an-object-crashes-the-render.md) | high | ✅ fixed s21 | A Checkbox whose Label is wired an object or an array crashes the page's render — "Objects are not valid as a React child" |
| [P107-C70](../../bugs/p107-c70-a-dropdowns-items-wired-a-value-that-is-not-a-list-crashes-the-render.md) | high | ✅ fixed s21 | A Dropdown whose Items is wired a value that is not a list — the legacy string form included — or a list holding null crashes the page's render |
| [P107-C4](../../bugs/p107-c4-substring-and-string-mapper-crash-in-the-setter-when-a-wire.md) | medium | ✅ fixed s21 | Substring and String Mapper crash in the setter when a wire sends null |
| [P107-C6](../../bugs/p107-c6-a-number-arriving-on-a-port-that-once-held-a-unit-value-valu.md) | medium | ✅ fixed s22 | A number arriving on a port that once held a unit value ({ value, unit }) is merged into it |
| [P107-C8](../../bugs/p107-c8-http-request-crashes-inside-the-fetch-on-a-non-text-url-head.md) | medium | ✅ fixed s21 | HTTP Request crashes inside the fetch on a non-text URL, Headers, Query or Body Fields, and loses the outcome |
| [P107-C10](../../bugs/p107-c10-array-filter-and-array-map-crash-in-the-setter-when-items-ge.md) | medium | ✅ fixed s21 | Array Filter and Array Map crash in the setter when Items gets a number, boolean or plain object |
| [P107-C18](../../bugs/p107-c18-parse-xml-goes-silent-when-always-array-is-not-text.md) | medium | ✅ fixed s21 | Parse XML goes silent — no Result, no Failure — while Always Array holds anything but text |
| [P107-C20](../../bugs/p107-c20-animate-to-value-waits-forever-on-a-text-or-disconnected-delay.md) | medium | ✅ fixed s22 | Animate To Value waits forever when Delay arrives as text or is disconnected |
| [P107-C24](../../bugs/p107-c24-navigate-to-path-never-answers-when-path-is-not-text.md) | medium | ✅ fixed s21 | Navigate To Path never answers a press when Path is not text (null, a number) — the frame-end callback throws |
| [P107-C44](../../bugs/p107-c44-filter-records-with-null-items-breaks-another-nodes-save.md) | medium | ✅ fixed s21 | A Filter Records holding null on Items crashes inside another node's save of its Class — the saving node's Error gets the message, and a Query Records listening after it misses the save |
| [P107-C54](../../bugs/p107-c54-cloud-function-a-null-success-body-never-answers-the-call.md) | medium | ✅ fixed s21 | Cloud Function — a success whose body is JSON null throws, and the Call is never answered |
| [P107-C61](../../bugs/p107-c61-font-family-wired-a-non-text-value-throws-in-its-setter.md) | medium | ✅ fixed s21 | Font Family wired a truthy value that is not text throws in its setter — the node's update dies there |
| [P107-C62](../../bugs/p107-c62-a-units-typed-style-input-wired-null-throws-in-the-generated-setter.md) | medium | ✅ fixed s21 | A units-typed style input wired null throws in the generated setter — margins, paddings, font size, min / max size, border widths and radii |
| [P107-C63](../../bugs/p107-c63-a-placement-input-wired-undefined-throws.md) | medium | ✅ fixed s21 | A Placement input (Pos X / Pos Y / Rotation / Transform Origin X / Y) wired undefined throws in its setter |
| [P109-S17-KITTHROWBLANKS](../../bugs/p109-s17-kitthrowblanks-a-kit-node-that-throws-at-mount-blanks-the-whole-page.md) | medium | ✅ fixed s22 | A kit node that throws when it mounts blanks the whole page, not just itself |
| [P107-C57](../../bugs/p107-c57-sse-non-text-event-types-or-method-throws-at-connect.md) | low | ✅ fixed s21 | Server-Sent Events — Event Types or Method wired a value that is not text throws when the stream connects |
| [P107-D8](../../bugs/p107-d8-color-blend-renders-nannannan-for-a-non-numeric-blend-value.md) | low | ✅ fixed s21 | Color Blend renders "#NaNNaNNaN" for a non-numeric Blend Value |
| [P107-D15](../../bugs/p107-d15-date-difference-counts-an-unknown-unit-as-years-date-add-cra.md) | low | ✅ fixed s21 | Date Difference counts an unknown Unit as years (Date Add crashes on the same value) |

## 4. Order of work

Worst first: the high rows (String Format C3, Date Add C16, Checkbox C65, Dropdown C70) and the kit error boundary. Then the three setters every visual node shares (C61–C63), because each of those bites every visual node. Then the rest.

## 5. Rules for every row

- **Re-measure first, cheaply.** Every P107 row is a *known row* on the runtime target, and
  `packages/noodl-runtime/test/node-spec/conformance.test.ts:714` asserts each one **still fires** on every run. A row
  that has stopped firing turns that test red. So run the node-spec suite before you start. A row that no longer fires was fixed
  by someone else: close it in the ledger with the commit that fixed it, and do not fix it again.
- **A `needs-ruling` row is asked before it is fixed.** P107's R3 says the runtime wins until Richard rules. Most rows
  already carry the plain-words question and a recommended fix in their evidence section (the NSP task's §6, or the P107
  README §7). Ask the rows of this task **in one batch**, plain words, one decision per question, recommendation first,
  and say what the node is in each question. Ask only when this task is next to build.
- **A fix ships alone and closes its row in the same commit:** drop the known row from the spec's runtime list, bump
  the spec's `version` with a `changes` entry that names the bug's id (P107 NSP-010, P112 OWN-010), set the ledger
  file to `status: fixed` with `commit:`, and add a `regression:` line (the scenario that now passes). `node
  scripts/bugs.js check` fails a fixed kit bug without one.
- **The export is not fixed here.** If the exported app has the same fault, write a row on P18's ledger, as P107 §8 does.
- **Re-measure first.** Each row was measured once, by the session named in its `found:` line. Re-run its
  reproduction at HEAD before building. A row that no longer reproduces is closed in the ledger with the commit that
  fixed it, not fixed again.
- **When a fix lands**, set the ledger file to `status: fixed` with `commit:` (and `regression:` if it has a `kit:`).

## 6. Related work and collisions

- **P107 NSP-023** (live, 2026-10-05) is re-writing the Checkbox, Dropdown, Slider and Radio specs. C65 and C70 are in
  its controls. Fix them after NSP-023 has finished with that control, or agree with that session first.
- **C6 is R7** (P107 README §7: *"Is the unit merge a port rule or a quirk?"*), and it is still unruled. Its fix changes
  `node.ts setInputValue` for every port, so ship it alone and run the whole runtime suite.
- **C16 and D15** are one ruling: Date Add and Date Difference should agree on an unknown Unit.
- Sweep rule: this task was made from the ledger, **not re-measured** when it was written (2026-10-05). The first session
  re-measures each row (§5) and closes the ones already fixed before it asks or builds anything.

## 7. Acceptance criteria

- **AC1** — every row in §3 is re-measured at the session's HEAD. Each one still firing is recorded, and each one that is
  not is closed in the ledger with the commit that fixed it.
- **AC2** — every `needs-ruling` row is asked in plain words and ruled. A row ruled "keep it" becomes `wontfix` with the
  ruling as its `reason:`, or moves to [ISL-033](ISL-033-A-NODES-DESCRIPTION-SAYS-WHAT-IT-DOES.md) when the ruling is
  "describe it, don't change it".
- **AC3** — every row ruled "fix it" is fixed, one commit each (or one per shared mechanism), with its regression
  (`regression:` in the ledger) green and its known row dropped in the same commit.
- **AC4** — `node scripts/bugs.js --from P107` and `--from P109` list none of this task's rows as `open` or `needs-ruling`.

## 8. Rulings (2026-10-05)

Richard ruled every `needs-ruling` row of this task on the [Track F rulings page](https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH). Each card asked one plain-words
question with the options below; the full card is quoted in the bug's ledger file. **Build what is ruled.** A wording-only
ruling is still this task's work: the description changes, the node does not.

| bug | ruled | as recommended | what it means |
|---|---|---|---|
| P107-C3 | Fix both halves | yes | A number on Format is read as its text, and a node that fails once builds again on the next change. Two small changes; the second is the one that stops a dead node. |
| P107-C16 | Use days and warn once | yes | An unknown Unit counts as days, its default, and the node shows a warning once. This matches the earlier ruling for an unknown animation curve. Two small changes, one in each node. |
| P107-C65 | Turn them into text | yes | The page keeps drawing and the label shows the object as text, for example '[object Object]'. That points the person to the mistake. One small change per control. |
| P107-C70 | Read old text, else no options | yes | Text in the old format shows its options, other wrong values show an empty Dropdown, and the page keeps drawing. A small change where Items arrives. |
| P107-C4 | Read it as empty text | yes | The result becomes empty, as a person would expect from an empty input. Four small changes, plus a rewrite of Substring's description. |
| P107-C6 | Only on size inputs | yes | Inputs built for sizes keep the behaviour; every other input receives exactly what was sent. A small change in the core of the runtime, shipped on its own. An app that relied on a generic input keeping the unit would see plain numbers instead. |
| P107-C8 | Fail and say which input | yes | Failure fires with a message naming the bad input, so the person can find it. A small change near the start of the request. |
| P107-C10 | Refuse it with a Failure | yes | The node produces no items and Failure fires with a message saying Items is not a list. A small change in one shared place. |
| P107-C18 | Turn it into text | yes | Parsing carries on, and a list of names wired in works as the person meant. A one-line change. |
| P107-C20 | Read it as a number | yes | "100" waits 100 ms and a missing Delay starts at once. A one-line change. |
| P107-C24 | Treat it as no path | yes | Failure fires with 'No path to navigate to', the same as a missing Path today. A one-line change. |
| P107-C44 | Treat it as holding nothing | yes | The save goes through cleanly and other lists update. A one-line change. |
| P107-C54 | Treat it as empty | yes | Done fires and nothing changes, the same as an empty answer today. A one-line change. |
| P107-C61 | Treat it as no family | yes | The node falls back to its default font and the rest of the update applies. A one-line change in one shared place. |
| P107-C62 | Remove the style | yes | Both kinds of empty value behave the same and the update carries on. A one-line change in one shared place. |
| P107-C63 | Use the default | yes | Position and rotation go back to 0 and the origin to 50, both kinds of empty value included. One small guard in each of the five inputs. |
| P107-C57 | Turn them into text | yes | The node connects as it does for URL. A wrong value then fails as a normal connection error instead of a crash. Two one-line changes. |
| P107-D8 | Keep last colour, warn once | yes | The screen keeps its last good colour and a one-time warning names the problem, as the colour inputs already do. A small change. |
| P107-D15 | Use days and warn once | yes | An unknown Unit counts as days, its default, with a one-time warning on the node. Matches Date Add and the earlier ruling for an unknown animation curve. |

## 9. Session 21 (2026-10-06) — what landed

AC1: the runtime conformance suite for the task's 19 nodes at HEAD (`fae14dff4`, seed 20732): all 19 conform with their
known rows, and every known row of this task still fired. C8, C18, C20, D8 have no known row (their specs model the
runtime's behaviour, R3), so their re-measure is the scenario named in the ledger file.

| bug | commit | what changed | regression |
|---|---|---|---|
| C3 | `350c3ec31` | String Format converts Format on arrival and clears its flag in a `finally` | 2 scenarios, control red |
| C16, D15 | `4626b7c54` | `datemath.ts` `unitOrDays` + one warning (`setDiagnostic`); both specs v2 | 2 scenarios + 3 unit tests, control red |
| C4 | `4851100a2` (+ `f94bc681d`) | Substring and String Mapper read null as `''`; both specs v2; Substring's description and the four generated catalog/docs files | 5 scenarios |
| C61, C62, C63 | `ccda9ef0b` | the three shared visual setters; VISUAL_ROWS gone (Button and Icon have no known rows now) | 13 scenarios in 7 files, control red |
| C65, C70 | `ec48e0680` | `controls/labelText.ts` for 5 renders; `options.ts` `optionItems`; Dropdown spec v4 | 5 new scenarios + 3 renamed, control red |
| C24 | `9af85dee9` | Navigate To Path: a Path that is not text is no path | 1 scenario, control red |
| C57 | `dc72bb806` | SSE: Event Types and Method as text | 2 scenarios, control red |
| C54 | `307bdc69d` | Cloud Function: a null success body is the empty answer | 1 scenario, control red |
| C44 | `3f7c5eeb3` | Filter Records: null Items holds nothing in the store listener | 1 scenario, control red |
| C10 | `06ca94db1` | `data/itemsinput.ts` — Array Filter, Array Map, Filter Records refuse a non-list with `<node>/not-a-list`; specs v4 / v3 / v2 | 3 scenarios, control red (+ 9 / 23 / 24 generated divergences on HEAD) |
| C18 | `685ac731a` | Parse XML: Always Array as text; spec v2 | 1 scenario renamed + 1 new, control red (+ 54 generated) |
| D8 | `8294bb913` | Color Blend keeps the last colour for a NaN Blend Value, warns once; spec v2 | 1 scenario + 2 viewer tests, control red (+ 39 generated); export parity grid lost NaN → `P109-S21-EXPORTBLENDNAN` |
| C8 | `283b46573` | HTTP Request fails naming the first input that is not text (`http/input-not-text`); spec v2; one equivalent mutant declared | 1 scenario renamed + 1 new, control red (+ 41 generated) |

Filed on the way: `P109-S21-EXPORTDATEUNITWIRED` (P18, low), `P109-S21-DROPDOWNEMPTYRESET` (P107's Dropdown spec, low), `P109-S21-EXPORTBLENDNAN` (P18, low).
🔴 The full runtime conformance batch no longer fits its 30-minute `beforeAll` on a loaded box (the Slider alone took
29 minutes at seed 20732): run it with `NSP_ONLY` per group, never whole.

**Left for session 22, in this order:**
1. **C6** (R7, "Only on size inputs"): `node.ts` merges a bare number into a held `{ value, unit }` on EVERY port, in two
   places — `setInputValue` (:416) and the first-update queue (:1255). Merge only where the port's type has `units`.
   Ships alone. Then drop the per-node C6 known rows (Value Changed, Log, HTTP, Variable2, StreamBuffer, Model2) and decide
   `C6_ANY_PORT` by measurement: it may still be absorbing a units port's merge that the specs do not model. Grade with
   grouped `NSP_ONLY` runs (the whole batch outgrows its hook), and run the runtime's whole jest suite.
2. **C20** (Animate To Value's Delay as a number): the spec and its scenarios are stranger-guarded (round 3 —
   `stranger-3/nodes.js` takes Delay raw). Follow C19's precedent (`fec895706`): spec v3 with a plain version note, hashes
   re-recorded, and a fresh agent handed the note alone to bring `stranger-3/nodes.js` up to it (round 3c), all rounds green.
3. **P109-S17-KITTHROWBLANKS** (a kit node that throws at mount blanks the page): an error boundary per kit node, a
   viewer change; re-measure first.

## 10. Session 22 (2026-10-06) — the last three, and what s21's list got wrong

| bug | commit | what changed | regression |
|---|---|---|---|
| KITTHROWBLANKS | `7abed2878` | `viewer.jsx` draws each kit node's component inside an error boundary (`kit-node-boundary.ts`, `forwardRef`); a throw draws nothing and raises `kit-node/render-failed` once on the error bus | `noodl-viewer-react/tests/isl026-a-kit-node-that-throws-stays-inside-itself.test.tsx`: the defect re-measured without the boundary (the page goes), then an effect throw and a render throw contained, a healthy node's ref intact. Control: the two containment rows red |
| C6 | `ebeefb060` | `node.ts` merges into a held `{ value, unit }` only on a size port, in `setInputValue` and the first update's queue; `defineNode` marks such a port `hasUnits` | 6 scenarios unmarked and renamed; `noodl-runtime/test/isl026-c6-unit-merge-only-on-size-ports.test.js` (two controls, each red on its own rows). Control: HEAD's `node.ts` fails exactly the 6 scenarios |
| C44 (graph) | `84dab5b7a` | the graph scenario s21 left marked as row C44; trace re-recorded | runtime graph 87 / 87 |
| C20 | `dbd5b9c90` | Animate To Value reads Delay as `Number(value) \|\| 0`; spec v3 | 2 scenarios rewritten; stranger round 3c (P107 NSP-006 §5.9). Control: both red, plus 3 generated |

**What the handoff did not know.**
- 🔴 **C6's predicate is not `input.type.units`.** A library port's type is not kept on the instance's input
  (`nodedefinition.ts` keeps only colour, text style, array, object and string), so the first build switched the merge
  off on EVERY size port. The 95-spec conformance run did not see it (the specs barely model units); GAM-015 did, in the
  viewer. Fixed with a `hasUnits` mark; the runtime test now grades a library port and a dynamic one.
- **"Decide `C6_ANY_PORT` by measurement" came out: drop it.** Every spec, 17 `NSP_ONLY` groups at seed 20732 without it:
  0 generated divergences anywhere; the known-rows test green in every group. The only red specs are the two
  interpreter-side survivors s21 recorded (Slider `world.place`, Text Input `person.release`).
- **C6 was written into the contract.** `nodegx-core/CONTRACT.md` C10 said a bare number inherits the unit on any port, and
  its graph scenario claimed it; both narrowed to size ports. `node-expression-evaluation.test.js` pinned it on a plain
  `number` port; rewritten as a size-port row and a plain-port row.
- **C44's graph scenario had been red since s21's fix.** s21 graded the conformance file, not `graph.test.ts`.
- **The kit boundary reports on the error bus alone.** The bus already reaches the editor's warning, the console and On
  App Error (`nodecontext.ts`), so a `setDiagnostic` beside it would report the failure twice.
- **The stranger lab needs `nodegx-backend-contract/src` beside the package now** (`query-records.ts` imports its types).

**Reach of C6** (the one change a person could see): a component instance's input port has no type, so a size passed
through a component input now arrives as the bare number when a wire replaces it. In 170 local projects, 4,792 component
instances hold 491 unit-valued parameters, and none of them also has a wire into the same port.

**Readings (2026-10-06):** runtime jest without the conformance file 3156 passed (the 4 red were three stale C6 pins,
since updated, and C44's graph row); runtime graph 87 / 87; spec package graph 119 / 119; batches + catalog parity
444 / 444; stranger rounds 41 passed / 17 skipped, hash gate green; viewer kit and units tests 72 / 72; runtime,
viewer and spec tsc 0. AC4: `node scripts/bugs.js --from P107` / `--from P109` list none of this task's 20 rows open.

**A ruling owed, apart from this task: `P109-S22-BUILTINBOUNDARY`.** Kit nodes now have an error boundary; built-in
nodes do not, so a built-in node's render throw still blanks the page. C65 and C70 were fixed where they threw. The
question: *"Should every node on the page, built-in ones included, be drawn so that one node failing shows nothing in
its place and the page keeps drawing?"* Recommendation: yes. It is the same sentence as this task's, and the boundary
already exists.

