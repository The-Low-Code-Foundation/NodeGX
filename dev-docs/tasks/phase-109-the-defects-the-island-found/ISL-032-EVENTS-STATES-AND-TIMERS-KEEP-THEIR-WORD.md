# ISL-032 — Events, states, timers and parsers keep their word

**Status: ✅ CLOSED s25 (2026-10-06): 15 fixed, each with a control (§9), D4 and D5 closed as ruled (no change) — AC1 by the controls (C9 was the only known row), AC3 one commit per ruling or per node, AC4 no row open. ✅ AC2: all 17 rulings taken 2026-10-05, all as recommended. Scoped 2026-10-05 at `8292f1d55` by the ledger sweep (Track F).** **Source:** 17 bugs from
the ledger (`dev-docs/bugs/`) that had no task: 11 medium · 6 low, **17 awaiting a ruling**. **Side:** runtime (Condition, Send / Receive Event, Action Dispatcher, States, Delay, Create New Array / Object, String Format, Substring, And, Switch, Date To String, Parse Feed)

## 1. The person sentence

**Logic nodes do what their ports say in every case a person can reach: a consumed event stops, a press is answered once per press, and a state change is not overwritten by an older one.**

## 2. Why these belong together

These are the medium and low logic rows. None crashes, and each gives a wrong answer in a case a person can reach.
Consume on Receive Event has never stopped a Global event (C12), and a consumed Children/Siblings event leaks past its
component (C13). Two Do presses in a frame are answered once (C9). States lets an older move overwrite a newer one (C22),
and reads text as 0 in the starting state (D19). Condition's Is True reads live while the wire carries the tested value
(C2). Action Dispatcher says Done for a refused action (C15). Parse Feed's dates depend on the machine's timezone (D16). The
rest are edges (D3, D4, D5, D7, D10, D14, D17, D18, C14).

## 3. The bugs

Worst first. Each file holds the measurement, the reproduction and, for most of them, the proposed fix and the question
to ask. This table is generated from the ledger headers. **The ledger file is the source**, so read it before you start.

| bug | severity | status | what a person sees |
|---|---|---|---|
| [P107-C2](../../bugs/p107-c2-condition-s-is-true-is-false-read-the-input-live-while-the-w.md) | medium | needs-ruling | Condition's Is True / Is False read the input live, while the wire carries the value from the last test |
| [P107-C9](../../bugs/p107-c9-create-new-array-create-new-object-and-set-object-properties.md) | medium | needs-ruling | Create New Array, Create New Object and Set Object Properties answer once for two Do presses in a frame |
| [P107-C12](../../bugs/p107-c12-consume-on-receive-event-has-never-stopped-a-global-event.md) | medium | needs-ruling | Consume on Receive Event has never stopped a Global event |
| [P107-C13](../../bugs/p107-c13-a-consumed-children-or-siblings-event-stops-only-inside-the.md) | medium | needs-ruling | A consumed Children or Siblings event stops only inside the component that consumed it |
| [P107-C15](../../bugs/p107-c15-action-dispatcher-reports-done-when-the-one-action-it-was-ha.md) | medium | needs-ruling | Action Dispatcher reports Done when the one action it was handed was refused |
| [P107-C22](../../bugs/p107-c22-states-a-move-that-animates-nothing-is-overwritten-by-the-move-still-running.md) | medium | needs-ruling | States — a move that animates nothing, made while a move is still running, is overwritten by the old move |
| [P107-D3](../../bugs/p107-d3-string-format-expands-and-friends-inside-a-value.md) | medium | needs-ruling | String Format expands $&, $$ and friends inside a value |
| [P107-D16](../../bugs/p107-d16-parse-feed-dates-depend-on-the-machine-zone-and-cest-reads-as-utc.md) | medium | needs-ruling | Parse Feed's dates depend on where it runs, and a CEST or BST date is published hours wrong |
| [P107-D17](../../bugs/p107-d17-parse-feed-keeps-the-previous-feeds-updated-date.md) | medium | needs-ruling | Parse Feed's Feed Updated keeps the previous feed's date when the next feed has none |
| [P107-D18](../../bugs/p107-d18-parse-feed-count-says-two-for-one-item-when-a-guid-repeats.md) | medium | needs-ruling | Parse Feed shows Count 2 and one item when a feed repeats a guid — and the item is the second one |
| [P107-D19](../../bugs/p107-d19-states-a-text-value-a-state-leaves-empty-reads-0-then-keeps-the-last-state-s-text.md) | medium | needs-ruling | States — a text or true/false value reads 0 in the starting state; a text a state leaves empty keeps the previous state's |
| [P107-C14](../../bugs/p107-c14-action-dispatcher-s-waiting-for-keeps-the-refused-type-after.md) | low | needs-ruling | Action Dispatcher's Waiting For keeps the refused type after the wait expires |
| [P107-D4](../../bugs/p107-d4-and-accepts-any-port-name-starting-with-input-input-alone-al.md) | low | needs-ruling | And accepts any port name starting with "input" (input alone aliases input 0) |
| [P107-D5](../../bugs/p107-d5-switch-keeps-a-field-it-never-reads.md) | low | needs-ruling | Switch keeps a field it never reads |
| [P107-D7](../../bugs/p107-d7-substring-s-end-of-1-runs-to-the-end-only-as-a-number-not-th.md) | low | needs-ruling | Substring's End of -1 runs to the end only as a number, not the text "-1" |
| [P107-D10](../../bugs/p107-d10-delay-reports-unchanged-for-stop-on-a-countdown-started-in-t.md) | low | needs-ruling | Delay reports Unchanged for Stop on a countdown started in the same frame, yet stops it |
| [P107-D14](../../bugs/p107-d14-date-to-string-a-timestamp-or-null-is-invalid-date-without-a.md) | low | needs-ruling | Date To String: a timestamp or null is "Invalid Date" without a Timezone but renders with one |

## 4. Order of work

C12 + C13 (events), C22 + D19 (States), C9, C2, C15, D16, then the low rows. Several low rows may be ruled "describe, don't change", which turns them into ISL-033 work.

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

- D19 shares its root with ISL-002 (the first state's value), which is closed. Re-read `states.ts` after `06e65ab47` before you measure.
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
| P107-C2 | Keep the tested result | yes | The node remembers the value it last tested and both outputs report that. A small change in one node. A person only notices in the rare case above, where two wires now agree. |
| P107-C9 | One Done per press | yes | The work is still done once per frame, but Done fires for every press, as in the similar nodes. A small change in three places. Create New Object still makes one record for two presses, and both Dones name it. |
| P107-C12 | Change the description | yes | The sentence says Consume applies to Parent, Children and Siblings events only. No app changes behaviour, and a person reading the port is no longer misled. |
| P107-C13 | Stop it there | yes | Consume works across components as its description says. A one-line change in each of two places. Only apps that set Consume to Always notice, and they asked for this. |
| P107-C15 | Fire Failure, as described | yes | An action refused straight away no longer counts as accepted, so Done means something ran or was queued. A small change in one place. An app wired to Done for a refused action would stop moving on, which is the point. |
| P107-C22 | Stop the running animation | yes | A move that sets values at once now lands where it says, and Has Reached fires once. A small change, and the node's other way of jumping to a state already does this. Only apps that move during an animation notice. |
| P107-D3 | Insert values exactly | yes | Dollar signs come out as typed. A one-line change. Nobody is likely to rely on the current behaviour. |
| P107-D16 | UTC, and no date if unknown | yes | A date with no timezone is read as UTC everywhere, and an unknown name such as CEST gives no date. A small change in one function. Feeds using CEST or BST lose their dates instead of showing wrong ones. |
| P107-D17 | Send empty text | yes | Feed Updated goes blank, as its siblings do. A one-line change. |
| P107-D18 | Match Count, describe sharing | yes | Count says how many items Items really holds, and the Items description says each item is the shared record of its id. A small change. Nothing else moves. |
| P107-D19 | Send empty text | yes | Moving into A clears the label, as the empty box in the editor suggests. A small change in one place. Apps that relied on an empty state leaving the text alone would see it cleared. |
| P107-C14 | Clear it when the wait ends | yes | The output goes blank as its description says. A one-line change. Nothing else in the node moves. |
| P107-D4 | Leave it, and say so | yes | No change. The odd names stay possible only through a hand-edited file, and the ledger records why it was left. |
| P107-D5 | Remove it with the next change | yes | No change now. It goes the next time Switch is touched for another reason. |
| P107-D7 | Treat it as -1 | yes | End reads the text '-1' as the number, so it runs to the end. A one-line change, and nobody wants the empty result. |
| P107-D10 | Report Done | yes | Stop says it stopped something whenever it did. A small change in one node, and only graphs that start and stop in the same frame notice. |
| P107-D14 | One rule, like the other date nodes | yes | A timestamp renders in both cases and an empty Date is invalid in both. A small change. Apps that showed 1970 for an empty date with a Timezone now show 'Invalid Date' instead. |

## 9. Session 25 (2026-10-06) — all seventeen

**AC1, re-measured:** only C9 was a known row in the runtime's conformance table (three `KNOWN_ROWS` entries); C12, C13 and
C14 were `row` marks in graph scenarios (t04, t05); C15 lived only in t04's recorded outcomes (a claim cannot name an
outcome); the rest were scenarios stating the runtime's reading. D19's first half (the first state's text and false read
as 0) had already been closed by ISL-002 (`06e65ab47`); its second half was still live. Each row was re-measured by its
control: HEAD's runtime file red on exactly the scenarios the fix changes.

| Row | Commit | What changed | Grade |
|---|---|---|---|
| C9 | `86139ddbf` | each Do mints its token before the coalescing guard; one array / object / write, an outcome per press (a Failure raised once) | spec unchanged (it said per press); control red on the three "two Do in one frame" scenarios |
| C12 + C13 | `a7710e300` | the Children and Siblings walks stop at the first consuming receiver (indexed loops, not `forEach`); Consume's sentence says it does not stop a Global event (five copies) | t05: C12 claims the new sentence, C13's mark dropped, a Siblings twin added; control red on the two consume walks |
| C2 | `a598f83e5` | Is True / Is False report the last test's answer (`testedResult`) | graph t13 (new: a wire made after an untested change); control red on it |
| D3 | `2b30bc667` | a function replacement — no `$`-pattern expands; String Format v2 | control red on the D3 scenario; the stranger fixtures moved (below) |
| D7 | `7761b440a` | `Number(end) === -1`; Substring v3 | control red on the D7 scenario |
| C22 + D19 | `9e1d8afa7` | every later move stops the running timer; a text a state leaves empty is `''`; States v3 + v4 | two one-fix controls: each red on exactly the other's scenario |
| D16 + D17 + D18 | `f6700d187` | a zoneless date is UTC, an unknown zone name gives null (V8 reads twelve, measured); Feed Updated `''`; Count = what Items holds, Items says each item is the shared record of its Id; Parse Feed v4 | HEAD's feed.ts red on the two D16 scenarios; HEAD + D17 only red on exactly D18 |
| C14 + C15 | `0dd6bdff5` | `unpark` flags the queue when a wait ends; an action refused inside its own Dispatch call is not admitted | t04 re-recorded (three Dispatches done → failure, Waiting For sent blank); control red on the four moved scenarios, the wait-then-register path unchanged |
| D10 | `375993cb3` | Stop is Done for a running OR queued countdown; Delay (Timer) v2; one drop-set mutant now equivalent, declared | control red on the D10 scenario |
| D14 | `844f8569b` | the Date read through `toDate`, with or without a zone; Date To String v2 | control red on both D14 scenarios |
| D4 | — | already `wontfix` at ruling ("Leave it, and say so") | — |
| D5 | — | `wontfix`, ruled "Remove it with the next change": the field goes when Switch is next changed | — |

Also `25328357c`: the cloud node library was stale at HEAD (s24's HTTP Cancel sentence) — regenerated, its one line.

**What the plan did not know.**
- 🔴 **A peer's pathspec commit swept my open hunk.** `63b7c4e91` (P107's Text v5) committed `conformance.test.ts` whole,
  including my uncommitted removal of the three C9 `KNOWN_ROWS` entries, so HEAD briefly had the rows gone and the runtime
  unfixed. C9 was committed next (`86139ddbf`), and its message says where the other half went.
- 🔴 **A spec fix on a node the strangers were handed moves their fixtures.** String Format is guarded and was built by
  stranger rounds 1 and 2 from v1, which said `$`-patterns apply. v2 turned both rounds red. Each fixture's one line became
  a function, with a comment saying it is not the stranger's line; hashes refreshed; rounds green. Condition's spec
  comment moved its hash too (C2).
- 🔴 **A peer's open edit can make the primary's runtime target unloadable.** Mid-session a peer's Group spec (P107) made
  `node-spec-target.ts` load a viewer scroll plugin jest cannot parse: 80 of 91 graph scenarios red on load. C14, C15,
  D10 and D14 were graded in a worktree at HEAD (`scripts/devtools/make-worktree.sh`), with the files copied in and the
  results copied back.
- **Old tests pinned the defects:** `pilot.test.ts` (D3), `batch.test.ts` (D7), `batch-time.test.ts` (D14).
- **A fix can turn a mutant equivalent.** After D10, Stop's `unchanged` branch runs only with the timer idle, where the
  flags it clears are already false; declared with its reason.
- **The graph test's first scenario times out (5 s) in a cold, parallel full run** and passes in 0.4 s alone: a load
  flake, not a regression (seen twice).

**Gates (2026-10-06):** each fix's specs at seeds 20732 and 13, CONFORM, every mutant killed but the declared equivalents;
runtime jest without the conformance file 3179 passed (one cold-start timeout, 91 / 91 alone); viewer 1775 / 1775;
runtime graph 91 / 91; spec graph 123 / 123; spec catalog parity, schema, world, batch, batch-data, batch-time, pilot and
stranger (rounds re-graded) green; runtime, spec and viewer tsc 0; catalog:check, catalog:merge:check, cloud-library:check
up to date; `bugs.js check` 5 problems, none ISL-032's.

**Handed over:** P18 — `P109-S25-EXPORTSTATESRUN` (C22's shape in `statesLib.ts`) and `P109-S25-EXPORTFEEDZONE` (D16's
reader in `parseLib.ts`), both read, not run. Not checked for the export: D17, D18, D10, D14, C14, C15, C9.
