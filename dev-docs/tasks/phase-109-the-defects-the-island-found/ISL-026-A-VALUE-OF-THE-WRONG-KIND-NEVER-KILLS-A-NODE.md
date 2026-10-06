# ISL-026 — A value of the wrong kind never kills a node

**Status: ⬜ not started — ✅ AC2: all 19 rulings taken 2026-10-05, all as recommended. Scoped 2026-10-05 at `8292f1d55` by the ledger sweep (Track F).** **Source:** 20 bugs from
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
| [P107-C3](../../bugs/p107-c3-string-format-dies-for-good-when-format-is-not-text-a-wired.md) | high | needs-ruling | String Format dies for good when Format is not text (a wired number, null, an object) |
| [P107-C16](../../bugs/p107-c16-date-add-crashes-and-stays-dead-when-unit-is-a-value-it-does.md) | high | needs-ruling | Date Add crashes and stays dead when Unit is a value it does not know |
| [P107-C65](../../bugs/p107-c65-a-checkbox-label-wired-an-object-crashes-the-render.md) | high | needs-ruling | A Checkbox whose Label is wired an object or an array crashes the page's render — "Objects are not valid as a React child" |
| [P107-C70](../../bugs/p107-c70-a-dropdowns-items-wired-a-value-that-is-not-a-list-crashes-the-render.md) | high | needs-ruling | A Dropdown whose Items is wired a value that is not a list — the legacy string form included — or a list holding null crashes the page's render |
| [P107-C4](../../bugs/p107-c4-substring-and-string-mapper-crash-in-the-setter-when-a-wire.md) | medium | needs-ruling | Substring and String Mapper crash in the setter when a wire sends null |
| [P107-C6](../../bugs/p107-c6-a-number-arriving-on-a-port-that-once-held-a-unit-value-valu.md) | medium | needs-ruling | A number arriving on a port that once held a unit value ({ value, unit }) is merged into it |
| [P107-C8](../../bugs/p107-c8-http-request-crashes-inside-the-fetch-on-a-non-text-url-head.md) | medium | needs-ruling | HTTP Request crashes inside the fetch on a non-text URL, Headers, Query or Body Fields, and loses the outcome |
| [P107-C10](../../bugs/p107-c10-array-filter-and-array-map-crash-in-the-setter-when-items-ge.md) | medium | needs-ruling | Array Filter and Array Map crash in the setter when Items gets a number, boolean or plain object |
| [P107-C18](../../bugs/p107-c18-parse-xml-goes-silent-when-always-array-is-not-text.md) | medium | needs-ruling | Parse XML goes silent — no Result, no Failure — while Always Array holds anything but text |
| [P107-C20](../../bugs/p107-c20-animate-to-value-waits-forever-on-a-text-or-disconnected-delay.md) | medium | needs-ruling | Animate To Value waits forever when Delay arrives as text or is disconnected |
| [P107-C24](../../bugs/p107-c24-navigate-to-path-never-answers-when-path-is-not-text.md) | medium | needs-ruling | Navigate To Path never answers a press when Path is not text (null, a number) — the frame-end callback throws |
| [P107-C44](../../bugs/p107-c44-filter-records-with-null-items-breaks-another-nodes-save.md) | medium | needs-ruling | A Filter Records holding null on Items crashes inside another node's save of its Class — the saving node's Error gets the message, and a Query Records listening after it misses the save |
| [P107-C54](../../bugs/p107-c54-cloud-function-a-null-success-body-never-answers-the-call.md) | medium | needs-ruling | Cloud Function — a success whose body is JSON null throws, and the Call is never answered |
| [P107-C61](../../bugs/p107-c61-font-family-wired-a-non-text-value-throws-in-its-setter.md) | medium | needs-ruling | Font Family wired a truthy value that is not text throws in its setter — the node's update dies there |
| [P107-C62](../../bugs/p107-c62-a-units-typed-style-input-wired-null-throws-in-the-generated-setter.md) | medium | needs-ruling | A units-typed style input wired null throws in the generated setter — margins, paddings, font size, min / max size, border widths and radii |
| [P107-C63](../../bugs/p107-c63-a-placement-input-wired-undefined-throws.md) | medium | needs-ruling | A Placement input (Pos X / Pos Y / Rotation / Transform Origin X / Y) wired undefined throws in its setter |
| [P109-S17-KITTHROWBLANKS](../../bugs/p109-s17-kitthrowblanks-a-kit-node-that-throws-at-mount-blanks-the-whole-page.md) | medium | open | A kit node that throws when it mounts blanks the whole page, not just itself |
| [P107-C57](../../bugs/p107-c57-sse-non-text-event-types-or-method-throws-at-connect.md) | low | needs-ruling | Server-Sent Events — Event Types or Method wired a value that is not text throws when the stream connects |
| [P107-D8](../../bugs/p107-d8-color-blend-renders-nannannan-for-a-non-numeric-blend-value.md) | low | needs-ruling | Color Blend renders "#NaNNaNNaN" for a non-numeric Blend Value |
| [P107-D15](../../bugs/p107-d15-date-difference-counts-an-unknown-unit-as-years-date-add-cra.md) | low | needs-ruling | Date Difference counts an unknown Unit as years (Date Add crashes on the same value) |

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
