# ISL-033 — A node's description says what it does

**Status: ✅ CLOSED s26 (2026-10-06): 6 of 6 fixed in 3 commits (§9) — D1 a behaviour change with a control, D2 / D6 / D13 / S5-RUNPORTDOC words (plus Expression's twin), G1 the CONTRACT.md sentence with a control; AC1 none had been fixed elsewhere, AC4 no row open. ✅ AC2: all 5 rulings taken 2026-10-05, all as recommended. Scoped 2026-10-05 at `8292f1d55` by the ledger sweep (Track F).** **Source:** 6 bugs from
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
| [P107-D1](../../bugs/p107-d1-and-s-description-promises-false-when-nothing-is-connected-i.md) | low | fixed `770b01405` | And's description promises false when nothing is connected; it publishes nothing |
| [P107-D2](../../bugs/p107-d2-string-format-a-placeholder-used-twice-fills-every-time-thou.md) | low | fixed `8f31517cc` | String Format: a placeholder used twice fills every time, though the description says only the first |
| [P107-D6](../../bugs/p107-d6-boolean-to-string-s-selector-description-says-not-true-count.md) | low | fixed `8f31517cc` | Boolean To String's Selector description says "not true counts as false"; any truthy value counts as true |
| [P107-D13](../../bugs/p107-d13-array-s-changed-description-still-names-the-rule-from-before.md) | low | fixed `8f31517cc` | Array's Changed description still names the rule from before the "Array contents" checkbox |
| [P107-G1](../../bugs/p107-g1-a-docs-sentence-claims-no-node-ever-computes-from-a-half-upd.md) | low | fixed `8a177580d` | A docs sentence claims no node ever computes from a half-updated upstream; per-write nodes do |
| [P109-S5-RUNPORTDOC](../../bugs/p109-s5-runportdoc-the-function-nodes-run-port-doc-describes-behaviour-the-code-no-longer-has.md) | low | fixed `8f31517cc` | The Function node's `run` port doc says wiring Run stops auto-runs; the code decides by the Run On Value Change boxes |

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

## 9. Session 26 (2026-10-06) — all six

**AC1, re-measured:** none of the six was a `KNOWN_ROWS` entry in the runtime's conformance table; D2 and D6 were
scenarios named for the old sentence, D1 a scenario stating the runtime's silence, G1 a graph `row` mark (c06), D13 and
S5-RUNPORTDOC ungraded words. None had been fixed elsewhere. S5-RUNPORTDOC was measured before it was rewritten, on the
runtime: with Run unwired a Function runs at load and on an input (1, 2); wired, not at load but still on the input (0,
1). So the old sentence was wrong about the inputs, but "connecting Run takes nothing away" (the enrichment's own
description) was wrong too: it takes away the run at load and on a code or file change. Expression's `ports.run`
carried the same false sentence (measured: unwired Result 1 at load, wired null; 6 after the input in both) and was
corrected with it.

| Row | Commit | What changed | Grade |
|---|---|---|---|
| D2, D6, D13, S5-RUNPORTDOC (+ Expression) | `8f31517cc` | the sentences, in every copy (runtime, spec, docs pages, both catalogs, cloud library — by the generators); String Format's code comment | words only, no spec version (NSP-010: a version is a behaviour change); D2 / D6 scenarios renamed; D13 graded by the existing "Array contents unticked" scenario |
| D1 | `770b01405` | And's `result` starts false — a wire reads false before any input, as Or's does | And v2; control (HEAD's and.ts) red on exactly the renamed scenario + 3 sequences; stranger rounds 1–2 moved ("not the stranger's line") |
| G1 | `8a177580d` | CONTRACT.md C6: upstream updates first, but a per-input node takes its inputs one at a time and can send a passing result; the export differs and stays on its list | c06 claims the new sentence (Value Changed ×2, Counter 3), `row` dropped; control (HEAD's claims, no mark) red on exactly it |

**Met on the way:** s25's D10 commit (`375993cb3`) changed `delay.ts` and `Timer.json`, two files the third stranger
round is handed, without refreshing `stranger-suite-hashes.json`, and round 3's own Timer still reported Unchanged for a
queued Stop — `stranger.test.ts` was red at HEAD. Fixed `1d1496929`. `docs:nodes:check` was red at HEAD (s24's HTTP
Cancel and s25's Consume sentences never reached their docs pages) — `b29f9b951`.

**Gates:** the six touched specs conform at seeds 20732 and 13 (every mutant killed but Timer's declared equivalent);
runtime graph 91 / 91, spec graph 123 / 123; spec pilot, catalog parity, stranger (rounds 1–4), schema, world, batch,
batch-data, batch-time, batch-records, batch-navigation, types, runner, reach, canonical, adapter, coerce, counter, sha2
green; runtime and spec tsc 0; catalog:check, catalog:merge:check, docs:nodes:check, cloud-library:check up to date;
noodl-mcp nodeDocBudget, cn010, cmp006, phase85 green (cmp001's one red is `P109-S9-CMP001RATE`, filed); `bugs.js check` 5
problems, none of these rows. **The export:** And is written as an expression over its inputs (no "nothing yet" state)
and G1's difference is already on the export's list — read, not run; no P18 row.

