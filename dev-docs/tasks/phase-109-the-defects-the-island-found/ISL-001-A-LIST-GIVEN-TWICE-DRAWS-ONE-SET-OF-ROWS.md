# ISL-001 — A list given twice while it is still building draws one set of rows

**Status: 🟡 fix landed 2026-10-01 (session 1, from `22303a534`) — AC1–AC4 and AC8 green; AC5–AC7 owed (each a heavy drive, and the island's rows wait on a P108 merge point).** Scoped 2026-10-01 at `27d891bf3`. **Source:** [audit](AUDIT-2026-10-01.md) F01 (and F06 as a
"measure alongside" note) · [P78 D85](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) (table line 64, section
line 3277; owner `NONE` until now — **this task takes D85**) · met three times: TPL-011 s5 (09-27), P108 IW-001 §6 and
IW-008 §5 · **Side:** product (runtime, the `For Each` / Repeater node)

A page's list is given a value as it mounts, then a better one a moment later: a Variable that already held last time's
list, then the load; a request's allowed keys, then the drawer's palette. The Repeater keeps rows from both, and nothing
says so. Three templates met it, and each hid it with a different workaround.

## 1. The person sentence

**Someone feeds a list into a Repeater, and the list changes while the rows are still being drawn. The page shows one row
per item in the latest list, and never a row for an item that has gone.**

## 2. What was measured

| reading | where |
|---|---|
| `scheduleRefresh` queues `() => { this.refresh(); }`. The arrow has a block body, so it returns `undefined`, not `refresh()`'s promise. *Re-read at HEAD* | `packages/noodl-viewer-react/src/nodes/std-library/data/foreach.tsx:451-461` (the op is `:456-458`) |
| The queue runner awaits each op (`await op()`, `:821` and `:837`), so it awaits `undefined`. It drains, sets `runningOperations = false` (`:827`, `:840`), and fires `Items Rendered` while `refresh()` is still running. *Re-read at HEAD* | `foreach.tsx:798-843` |
| `refresh()` is `async`. After a synchronous `collection.set`, the queue trim and the teardown, it loops `for (i < internal.collection.size())` and does `await this.addItem(...)` per row. The loop reads the **live** private collection on every pass. *Re-read at HEAD* | `foreach.tsx:716-793` (loop `:784-788`) |
| `addItem` awaits `nodeScope.createNode(...)` (`:569`) before it attaches the row (`:648-649`), so every row is a point where other work can run. *Re-read at HEAD* | `foreach.tsx:549-650` |
| A new `Items` value calls `bindCollection` → `scheduleCopyItems` → `collection.set(items)`. `set` emits `add`/`remove` per record, and the listeners queue `addItem`/`removeItem` ops. With the queue already drained, those ops run **beside** the refresh loop, not after it. *Re-read at HEAD* | `foreach.tsx:238-252`, `:299-317`, `:469-478`, `:878-904` |
| So there is a predicted path to a doubled row: refresh's loop reaches a record the second list added, and the queued `add` op for the same record also builds it. ⚠️ **Predicted from source, not isolated.** No spec has reproduced it | inference over the five rows above |
| F50's comment in `Collection.set` already names the shape: *"`refresh()` iterates this collection across `await`s while a coalesced `scheduleCopyItems` sets it again… rows get drawn twice"*. F50 fixed only the **same array set twice** (a per-collection identity cache). *Re-read at HEAD* | `packages/noodl-runtime/src/collection.ts:503-519` |
| The F50 spec covers plain rows, a Refresh during the first bind, and an equal array **after** a settle. None of them sets a **different** list before the first build has drained. *Re-read at HEAD* | `packages/noodl-viewer-react/tests/corpus/f50-repeater-plain-array.test.ts:122-174` |
| D85, TPL-011: on a reopened book the Variable already held `[g1, g7, g4]`, and the load set the same three again. Four rows were drawn (cosy twice). The stale row stayed through every later change. Giving each row an id of its word did **not** stop it. *As recorded 2026-09-27, not re-driven* | register `:3277-3296` |
| IW-001 §6: the pad drew ten keys for five, each under its twin. The keys arrive two or three times as a request opens. *As recorded 2026-09-29, not re-driven* | `phase-108…/IW-001-THE-WORKSHOP-FIXES.md:83-88` |
| IW-008 §5: My robots drew 14 cards for 9, with every copy's card twice. A kind's card, whose id is the kind, was never doubled. *As recorded in session 4 (2026-09-30 → 10-01), not re-driven* | `phase-108…/IW-008-THE-CREW-AND-MORE-LAND.md:81-83` |
| The workaround is in three components: a Timer of `PAD_SETTLE_MS` (120 ms) restarted on every new list, and a `Logic/Latch` Function (`Outputs.value = Inputs.value`) that passes the list on only when the Timer ends. *Re-read at HEAD* | `packages/noodl-mcp/tests/cg003Components.ts:47`, `:633-656` (pad), `:1717` (crew), `:2805-2809` (cards); `cg003Scripts.ts:1311-1314`; `templates/bot-garden/components/{Workshop/Pad,Island/World,Pages/My robot}/nodes.json` |
| **F06, measure alongside.** A Teach pad press was lost in 2 of 8 drive runs (one `left` missing, then 2 blocks for 3 presses). The cause was not measured. The pad's own comment says a doubled key set meant *"mamie-note's read twice, so no press landed"*. *As recorded, not re-driven* | `phase-106…/IG-005-ROBOTS-FOR-THE-JOB.md:239-242`; `cg003Components.ts:637-638` |

## 3. Where it bites a person

- **Any list that is given a value as the page opens and another a moment later.** This includes a saved value and then a
  fresh load, a filter applied on mount, and a Function that answers once per input as its inputs arrive. The second
  value is the normal case, not the odd one.
- **The wrong screen is silent.** There is no error and no diagnostic. `Items Rendered` fires, and it can fire early
  (§2 row 2). The extra row is real DOM, and a press on it can go to a record that is no longer in the list.
- **The "give every row an id" advice does not cure it** (D85, IW-001). So the one fix an author might know fails, and
  nothing tells them why.
- **The workaround costs a person 120 ms on every list**, and it has to be found first. Three templates found it the
  hard way.

## 4. Related work and collisions

- **D85** is taken here. It had no owner. P108 README `:166-170` says "Owner: the runtime (P99)", but P99's README has
  no For Each row: `grep -c -i "for each\|foreach\|repeater"` returns **0** (re-run at HEAD). This task's first commit
  writes "ISL-001" into D85's owner cell.
- **[GAM-005](../phase-88-the-defects-the-games-found/GAM-005-TWO-COPIES-OF-A-COMPONENT-KEEP-THEIR-OWN-STATE.md) AC7**
  is still owed. It asks for id-less rows emitted twice into a For Each, with the rendered rows counted. D57's
  "doubled pills" note (register `:2598-2601`) is very likely this defect. Grade AC7 inside this task's AC1 and tell
  GAM-005 the result. Do not build it twice.
- **F50** (`collection.ts:503`, its spec) is the neighbouring fix. Its three tests must stay green.
- **NDA-013** (`refresh()` resyncs and trims the queue, `foreach.tsx:747-765`), **NDA-004 §3** (`Items Rendered`) and
  **ERG-001 §4** (Refresh outcomes) all live in the code this task changes. Their specs are in
  `packages/noodl-viewer-react/tests/corpus/` (`nda-013-repeater-refresh`, `repeater-items-rendered`,
  `erg-001-repeater-outcomes`, `nda-012-repeater-clears`, `nda-015-repeater-item-binding`).
- **P107 NSP-012** lists Repeater Item (`For Each Actions`) as a T4 node that has not been started. If it starts, its
  scenarios will read the same queue.
- **Export:** `packages/nodegx-export/src/analyze/plan.ts` translates For Each. Record whether the exported list can
  show the same doubling. Its owner is P18 EXP-011.
- Owner grep: `grep -rn "D85" dev-docs/tasks --include='*.md'` returns only the register, P78's handoff and TPL-011.
  `grep -rln -i "scheduleRefresh\|fed twice\|keeps both" dev-docs/tasks` returns no owning task. All of its hits are
  noise or the three sources above.

## 5. Design

**No ruling is needed for the fix.** The person sentence is the existing contract: one row per item. If AC1 shows a
second cause, ask then.

🔒 **One question for Richard, after AC2 is green:** "Should Olive's Island drop its 120 ms wait in front of the three
lists, now that the Repeater no longer needs it?" (a) Yes: drop it in P108's next template session and drive it.
(b) Keep it, because it also steadies a list that changes several times. **Recommendation: (a).** The wait was added only
for this defect, and every template that copies the pattern pays the 120 ms.

Design constraints:
- **Make the queue honest.** The op that runs `refresh()` returns the promise, so nothing else in the queue runs until
  the rebuild has finished. That one line may be the whole fix. AC1 decides whether it is.
- **Iterate a snapshot, not the live collection** (D85's "cheapest door"). The snapshot is taken before the first
  `await`. A list that changes during the rebuild then queues its own ops after it, which diff against what was really
  built.
- **`Items Rendered` fires when the rows on screen match the latest list,** not when the queue first goes empty.
- **Do not turn Refresh into a diff.** NDA-013 kept the full teardown on purpose (`foreach.tsx:767-771`).
- **Keep `repeaterCreateComponentsAsync`'s chunking** (`:812-832`). Its `setTimeout` continuation is a second
  interleaving point, and it must be covered too.

## 6. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8, before any change.** A corpus spec (F50's harness: `createCorpusGraph`, the Container module, a template whose creation yields) binds list A (3 rows), and **without a settle** binds list B (5 rows, with ids where A's had none, or the reverse). After a settle the row count is 5, and every row's record is in B. It is expected RED. **Known-firing beside it:** the same spec with a settle between A and B gives 5, which is F50's third test shape. Run it under both `repeaterCreateComponentsAsync` settings and record both. If it is GREEN at HEAD, the source prediction is wrong: record that and go to the browser for AC1 (D85's reopen sequence) before building anything. |
| AC2 | The fix lands and AC1 is green in both settings. F50's three tests and every repeater corpus spec named in §4 stay green. **Sabotage arms**, each restored with `cmp`: (i) put back the block-bodied op; (ii) iterate the live collection. Each one alone turns AC1 RED. If neither does, the fix is not where AC1 says it is. |
| AC3 | **The stale-row form (D85's).** List A, then list B that drops one record of A, mid-build. No row remains for the dropped record, and it stays gone through three later changes. Read from the item nodes and from `target.getChildren()`. |
| AC4 | **`Items Rendered` is honest.** In AC1's sequence it fires after the last row of B is attached, and only then. A spec counts the signals and the attached rows at the moment each signal fires. |
| AC5 | **The person sentence, in a real browser.** A minimal project built through the door: a Variable seeded on mount, then a Function that replaces it 0–30 ms later, feeding a Repeater. It is deployed with `nodegx deploy` (exit 0), and the DOM row count is read at 500 ms and at 2 s over 20 loads. Every read equals the latest list. **Control arm:** the same project deployed over HEAD's runtime shows a wrong count in at least one of the 20 loads. Otherwise the drive cannot see the defect and says so. |
| AC6 | **Olive's Island without the wait.** If the §5 ruling is (a), a local build of the template with the three Timers set to 0 ms passes the pad, crew and My robots clauses of the page drive (ten keys → five, 14 cards → 9). If the ruling is (b), record the ruling. |
| AC7 | **F06, measured alongside.** Run the IG-005 Teach-pad drive 8 times, before and after the fix. Record the lost presses in each run. This task does not own F06's fix. It owns the measurement and a sentence saying whether the defect went with this one. |
| AC8 | **GAM-005 AC7 answered.** Fresh id-less rows emitted twice: the count before and after, written into GAM-005 §8 by its owner, or handed over in a peer message. |

## 7. Traps

- 🔴 **The harness may not yield where the browser does.** If the corpus `createNode` resolves without a real turn, AC1
  can be green at HEAD for the wrong reason. Check that the template creation actually suspends (count the turns), or
  add a yielding template, before you believe a green.
- 🔴 **A settle between the two lists hides it.** That is F50's third test, and it is exactly why that spec never saw
  this.
- **Ids do not cure it, so a fixture with ids is not a control.** D85 measured exactly that. Run AC1 with and without
  ids.
- **The template's latch hides the defect from every garden drive.** A green page drive of Olive's Island today says
  nothing about the Repeater. AC6 is the only garden reading that counts.
- **TPL-011's workaround removed the For Each entirely** (three fixed slots). Its drive cannot grade this either.
- **`Items Rendered` firing early can look like a fix.** A drive that waits for the signal and then counts can read the
  right number before the late duplicate attaches. Read the count again after 2 s, as AC5 does.
- 🔴 **One heavy job.** AC5's 20 loads and AC7's 16 drives are each one heavy job, alone on the box.

## 8. Session log

### Session 1 — 2026-10-01, P109 s1, on `cline-dev` from `22303a534`

**AC1, RED at HEAD, recorded before any change.** New corpus spec
`packages/noodl-viewer-react/tests/corpus/isl-001-repeater-list-given-twice.test.ts` (F50's harness and Container; the
`/Item` template is an empty component). The sequence: `items` ← A (`a1 a2 a3`), then B (`a1 a2 b4 b5 b6`) handed to the
Repeater from a `scheduleAfterUpdate` callback in the **same update pass** — `updateDirtyNodes` runs callbacks appended
during its own loop (`nodecontext.ts:453-493`), so a node later in the pass can set `Items` after the rebuild has started
and suspended at its first `createNode`. Run under both `repeaterCreateComponentsAsync` settings:

| arm | at HEAD | after the fix |
|---|---|---|
| trap check: rows attached when the synchronous pass ends (must be 0, then 3 after the microtasks) | 0 → 3 ✓ (the harness suspends where the browser does) | same |
| known-firing control: A, settle, B | 5 = B ✓ | 5 ✓ |
| **AC1 with ids** | **8 rows for 5** ✕ | 5 = B ✓ |
| **AC1 id-less plain objects** (GAM-005 AC7's shape) | **10 rows for 5** ✕ — the island's "ten keys for five" | 5 ✓ |
| **AC3 stale row**: `a3` dropped by B, then three later lists | `a3` gone, but `b4 b5 b6` doubled and the doubles survive every later change (`[a1,b4,b5]` drew `a1 b4 b4 b5 b5 b6`) ✕ | each later list exact ✓ |
| **AC4 `Items Rendered`**: rows on screen at each firing | fired with `a1 a2 b4 b4 b5 b5 b6` ✕ | every firing sees exactly B ✓ |

Both settings read identically (12 clauses: 4 green, 8 red at HEAD; 12 green after). So the source prediction held: the
cause is where §2 said, and no browser run was needed to isolate it.

**The fix** (`foreach.tsx`, two places, each with its comment):
1. `scheduleRefresh` queues `() => this.refresh()` — the op RETURNS the rebuild's promise, so the queue waits for it.
2. `refresh()` iterates a snapshot of `internal.collection` taken before the first `await`, not the live collection.

Refresh stays a full teardown (NDA-013); the NDA-013 trim of the ops `set()` appends during the resync is unchanged;
`repeaterCreateComponentsAsync`'s chunking is unchanged (it now awaits the whole rebuild as one op, which is what it did
for every other op).

**AC2 sabotage arms** (restored from a `cp` snapshot, `cmp`-identical): (i) block-bodied op back, snapshot kept →
**8 failed / 4 passed**; (ii) live collection iterated, promise kept → **8 failed / 4 passed**; fixed → 12/12. Each arm
alone reddens AC1, so the fix is where AC1 says it is, and both halves are needed.

**Neighbours.** F50 (3), NDA-013 (3), NDA-012 clears, NDA-015 item binding, OBS-003, NDA-001 columns: all green. Two
specs pinned the OLD order of signals and were updated, each with its reason in a comment: ERG-001's corpus row
*"(filed, not fixed) fires Items Rendered before a Refresh's items exist"* now pins `done, completed, itemsRendered`
(each with 1 row) — that row had filed this very defect's mechanism and named the one-character fix; NDA-004's
`tests/repeater-items-rendered.test.ts` "fires again after a Refresh rebuild" now pins
`itemsRendered, done, completed, itemsRendered`. **Full `noodl-viewer-react` jest: 126 suites, 1,663 tests, all
green after those two updates** (22 s, `--maxWorkers=3` beside a peer's drive).

**AC8 (GAM-005 AC7) answered** in GAM-005 §8: the row count grows with ids (8 for 5) as well as without (10 for 5), so
the P87 "give every row an id" sentence is not a cure for this; it is F50's identity point. Written there directly
because P88 is not a live phase.

**Export (§4):** `nodegx-export` emits a For Each as `items.map()` with `key={item.id}` (`emit/component.ts:10-11`), a
declarative render of the latest value with no operation queue, so the exported list cannot show this doubling. No
EXP-011 row is owed.

**Register:** D85's owner cell set to `ISL-001` and its status to 🟡 — in the working tree only, because the whole D85
row lives in a peer's uncommitted hunk of `DEFECTS-THE-TEMPLATES-FOUND.md` (since 09-27); it rides with that commit.
The bug ledger `dev-docs/bugs/p78-d85-…md` is the committed record (`status: fixed`).

**Owed, with why:**
- **AC5** (20 browser loads over the fixed runtime, plus the control over HEAD's): one heavy job; a peer's
  `drive-all.sh` held the box this session. 🔴 The deploy bundle and the editor's viewer bundle are build outputs —
  rebuild `noodl-viewer-react` before the drive or it grades the old Repeater.
- **AC6** (the island without its 120 ms waits): needs the §5 ruling, and edits `cg003Components.ts`, which P108 s7 had
  dirty all session — a P108 merge point, with ISL-025 W3.
  **s2 (2026-10-02):** the merge point came (P108 s7 committed `c051ca68d`; ISL-025's slice 0 landed in `cg003Components.ts`
  this session), so AC6 now waits on ruling 1 alone — W3's three waits are still in (`pdSettle`, `iwCrewSettle`, `rbSettle`;
  the census spec `isl025Census.test.ts` pins W3 as present).
- **AC7** (the IG-005 Teach-pad drive 8× before and after): heavy; same box constraint.

🔒 **Ruling to ask (§5):** *"The Repeater no longer needs the 120 ms wait in front of a list it is given twice. Should
Olive's Island drop its three waits (pad, crew, My robots)?"* Recommended: yes, as ISL-025 W3, driven once.

**AC6, built (2026-10-02, ruling 1 — Richard: "Sure"):** the island's waits are gone (ISL-025 W3: the pad, the crew, My
robots, and her land's blueprints — four copies, not three). Each list goes straight to its For Each. The drive readings
are in ISL-025 §8 (the pages drive's pad clauses, `drive-ig005-robots.js`, `drive-iw008-crew.js`, `drive-iw007-build.js`).
AC5 and AC7 are still owed (the 20 loads and the 8× Teach-pad drive, after a `noodl-viewer-react` rebuild).
**The browser reading AC6 asked for, with its control (2026-10-02):** the island with its waits gone, on the deployed
page — **the Sept-24 deploy bundle (no fix): My robots 14 cards for 9; the bundle rebuilt from HEAD (the fix): 9, crew
drive 39/39** at 1368, 1024 and 390, and the pad, robots, build and island drives green. Details in ISL-025 §8. The deploy
bundle in `src/external/deploy` is now HEAD's, so AC5 (20 loads) and AC7 (8× Teach pad) can run without a rebuild.

