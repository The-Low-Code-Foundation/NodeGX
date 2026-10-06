# ISL-027 — Every Changed signal the editor offers fires, and only when something changed

**Status: ⬜ not started — ✅ AC2: all 6 rulings taken 2026-10-05, all as recommended. Scoped 2026-10-05 at `8292f1d55` by the ledger sweep (Track F).** **Source:** 6 bugs from
the ledger (`dev-docs/bugs/`) that had no task: 2 high · 1 medium · 3 low, **6 awaiting a ruling**. **Side:** runtime (Object, Record, User, Variables, Value Changed), viewer user service

## 1. The person sentence

**When the editor offers a node a "Changed" output, it fires when that value changes, and only then.**

## 2. Why these belong together

Three node families offer a `<field> Changed` signal in the editor that **has never fired**: Object (C11), Record
(C37) and User (C48). The editor draws the port, but `registerOutputIfNeeded` never registers it, so the pulse's
`hasOutput` guard drops it. A person wires it, and nothing happens, ever (for Object, the wire itself is dropped). The opposite fault is here too: a User with Roles pulses Changed on
every session read (C49). The Variables ignore a first value of 0 (C5), and Value Changed's "the first time it arrives"
skips `undefined` (D9). Same sentence: a change signal must match the change.

## 3. The bugs

Worst first. Each file holds the measurement, the reproduction and, for most of them, the proposed fix and the question
to ask. This table is generated from the ledger headers. **The ledger file is the source**, so read it before you start.

| bug | severity | status | what a person sees |
|---|---|---|---|
| [P107-C11](../../bugs/p107-c11-the-object-node-s-property-changed-signals-have-never-fired.md) | high | needs-ruling | The Object node's "<property> Changed" signals have never fired |
| [P107-C37](../../bugs/p107-c37-the-record-node-s-field-changed-signals-have-never-fired.md) | high | needs-ruling | The Record node's "<field> Changed" signals have never fired |
| [P107-C5](../../bugs/p107-c5-boolean-number-string-and-color-variables-ignore-a-first-val.md) | medium | needs-ruling | Boolean, Number, String and Color variables ignore a first Value of 0 |
| [P107-C48](../../bugs/p107-c48-a-user-nodes-field-changed-signals-never-fire.md) | low | needs-ruling | A User node's `<field> Changed` signals never fire — the editor offers them, nothing registers them (C11 / C37's twin) |
| [P107-C49](../../bugs/p107-c49-a-user-with-roles-pulses-changed-on-every-session-read.md) | low | needs-ruling | A signed-in user with Roles makes every User node pulse Changed on every session read — three times per Fetch — when nothing changed |
| [P107-D9](../../bugs/p107-d9-value-changed-s-including-the-first-time-it-arrives-is-false.md) | low | needs-ruling | Value Changed's "including the first time it arrives" is false for undefined |

## 4. Order of work

C11, C37 and C48 first, as one fix in one shape (register the output when it is asked for). Then C49, C5 and D9.

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

## 6. Related work and collisions

- C11 / C37 / C48 are one mechanism. Rule them together ("make them fire" vs "remove the port from the editor").
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
| P107-C11 | Make them fire | yes | Each 'name Changed' pulses when that value changes. A one-line change to the Object node. Apps that already have such a wire will start running whatever it leads to, which is what their builders meant. |
| P107-C37 | Make them fire | yes | Each 'title Changed' pulses when that value changes. A one-line change to the Record node. Apps that already have such a wire will start running whatever it leads to, which is what their builders meant. |
| P107-C5 | Start with no remembered value | yes | A first 0 is stored and fires Changed like any other value. Set before any value reports that nothing changed. A one-line change, and an app that relied on Set storing the hidden 0 would see the Variable keep its starting value instead. |
| P107-C48 | Make them fire | yes | Each 'nick Changed' pulses when that value changes. A one-line change to the User node. Apps that already have such a wire will start running whatever it leads to, which is what their builders meant. |
| P107-C49 | Compare the list's contents | yes | Changed fires only when the roles, or any other list on a record, really differ. A small change where the app loads a record from the backend, so Record nodes that hold a list get the same treatment. An app that used Changed as a sign that a Fetch finished stops getting it for users with roles. |
| P107-D9 | Reword the description | yes | The sentence says 'including the first time a value arrives'. No behaviour changes and nothing can break. |
