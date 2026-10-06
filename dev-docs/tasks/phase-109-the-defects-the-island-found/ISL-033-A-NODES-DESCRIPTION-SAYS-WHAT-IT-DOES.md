# ISL-033 — A node's description says what it does

**Status: ⬜ not started — ✅ AC2: all 5 rulings taken 2026-10-05, all as recommended. Scoped 2026-10-05 at `8292f1d55` by the ledger sweep (Track F).** **Source:** 6 bugs from
the ledger (`dev-docs/bugs/`) that had no task: 6 low, **5 awaiting a ruling**. **Side:** node catalog descriptions, enrichment docs, CONTRACT.md

## 1. The person sentence

**Every port description an agent or a person reads through `get_node_type` or the editor matches what the node does.**

## 2. Why these belong together

Descriptions are what agents read. **P107-D2 has already cost real work:** String Format's description says a repeated
placeholder fills once, and a session filed a false bug from it and wrote a Function instead of using the node
(`P109-S5-STRINGFORMAT`, see `dev-docs/bugs/README.md`). The Function node's `run` doc says wiring Run stops auto-runs,
which stopped being true at NDA-017 (S5-RUNPORTDOC). Every row is a text change with no behaviour change, so this is the
cheapest task in the track. The low-risk rows can be batched in one commit once ruled "fix the words".

## 3. The bugs

Worst first. Each file holds the measurement, the reproduction and, for most of them, the proposed fix and the question
to ask. This table is generated from the ledger headers. **The ledger file is the source**, so read it before you start.

| bug | severity | status | what a person sees |
|---|---|---|---|
| [P107-D1](../../bugs/p107-d1-and-s-description-promises-false-when-nothing-is-connected-i.md) | low | needs-ruling | And's description promises false when nothing is connected; it publishes nothing |
| [P107-D2](../../bugs/p107-d2-string-format-a-placeholder-used-twice-fills-every-time-thou.md) | low | needs-ruling | String Format: a placeholder used twice fills every time, though the description says only the first |
| [P107-D6](../../bugs/p107-d6-boolean-to-string-s-selector-description-says-not-true-count.md) | low | needs-ruling | Boolean To String's Selector description says "not true counts as false"; any truthy value counts as true |
| [P107-D13](../../bugs/p107-d13-array-s-changed-description-still-names-the-rule-from-before.md) | low | needs-ruling | Array's Changed description still names the rule from before the "Array contents" checkbox |
| [P107-G1](../../bugs/p107-g1-a-docs-sentence-claims-no-node-ever-computes-from-a-half-upd.md) | low | needs-ruling | A docs sentence claims no node ever computes from a half-updated upstream; per-write nodes do |
| [P109-S5-RUNPORTDOC](../../bugs/p109-s5-runportdoc-the-function-nodes-run-port-doc-describes-behaviour-the-code-no-longer-has.md) | low | open | The Function node's `run` port doc says wiring Run stops auto-runs; the code decides by the Run On Value Change boxes |

## 4. Order of work

D2 and S5-RUNPORTDOC first (each has misled an agent), then D1, D6, D13 and G1. One commit per node family; the catalog check (`catalog:check`) and the MCP door's description gates must stay green.

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

- P107 NSP-018 ("the spec speaks") will generate descriptions from the spec. If it has landed for a node, fix the spec's sentence, not the catalog.
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
| P107-D1 | Make And start at false | yes | A node wired to And's Result gets false from the start, as Or gives today. A one-line behaviour change shipped alone; an app that relied on And staying silent before its first input would now see false at start-up. |
| P107-D2 | Correct the words | yes | The port description and the code comment say every copy of a placeholder is filled. No app changes; people and agents stop being told the node cannot do something it already does. |
| P107-D6 | Correct the words | yes | The description says false, 0, empty text or no value picks String for false, and anything else picks String for true. No app changes. |
| P107-D13 | Rewrite the description | yes | It says Changed fires when the array gains or loses items, and that unticking Array contents silences it so only Fetch updates the node. Words only; no app changes. |
| P107-G1 | Yes, correct the docs sentence | yes | The page is rewritten to say what is true: the nodes feeding a node update first, but a node that recomputes on each input sees its inputs one at a time and can send a passing result. No app changes; the exported code stays different here, and that difference stays on the export's list. |
