# UPG-005 — What ships and what waits: the 32 rows

**Opened 2026-09-22** with the phase, on **R4** (*"I triage all 32 rows first"*, Richard, against a
recommendation to rule the two boards instead — the stated cost was *"roughly a session before
anything ships"*).

**Status: ✅ ANSWERED 2026-09-22, and it did not cost a session — it cost one measurement.**
🔴 **The triage's answer is that there was nothing to triage.**

## 1. The person sentence

> **Nobody waits for a release decision that events already took.**

## 2. What R4 assumed, and why the assumption was reasonable

P83 and P84 both carry `Release: ⬜ NOT RULED` on their boards. Read cold, that says: two phases of
work are sitting in the tree, nobody has said whether it goes out, and a release cannot be cut over
an unanswered question. 32 rows, hence the session R4 was willing to spend.

**The marker is real. What it does not say is *when* it was written.** Both were written before
`v0.2.3` and `v0.2.4` existed.

## 3. The measurement

For each row, the count of commits whose **subject** names it, on `HEAD` and on `v0.2.4`:

```
git log --format='%s' HEAD    | grep -ci "fld-001"      → all 17 rows, then all 15 HLS rows
git log --format='%s' v0.2.4  | grep -ci "fld-001"
```

🔴 **Armed and controlled before it was believed.** The first pass used `seq -w 1 17`, which
produces `01`…`17` against ids that are `FLD-001`…`FLD-017` — **it returned zero for sixteen of
seventeen rows and looked like a finding.** The corrected pass carries a control: `fld-001` → 4
hits, `fld-999` → 0. [[an-instrument-must-be-armed-before-it-measures]],
[[assert-an-absence-with-a-known-firing-signal-beside-it]].

⚠️ **And subject-only is deliberate.** Matching the whole message attributes another phase's commit
to these rows — `--grep='fld-0' --grep='hls-0'` over `v0.2.4..HEAD` returns 13 commits, **every one
of them P88, P92, P94, P99 or P18 work whose body cites a row**. A commit that mentions a row is not
work on it. [[a-url-filtered-capture-attributes-nothing-to-a-producer]]

### 3.1 The result — 32 rows, one column

| phase | rows | rows with subject-named commits | **of those, any landing after `v0.2.4`** |
|---|---|---|---|
| **P83** (`HLS-001`–`015`) | 15 | **15** | **0** |
| **P84** (`FLD-001`–`017`) | 17 | **16** | **0** |

**Every committed row on both boards is already inside `v0.2.4`.** Per-row counts range from 1
(`HLS-007`, `FLD-008`, `FLD-010`, `FLD-015`) to 7 (`FLD-004`), and the `new` column is **zero for
all 32**.

## 4. 🔴 The answer to R4

**Neither phase has anything pending for 0.3.0, so there is no ship-or-wait decision to take.** The
work that exists has been in people's hands since `v0.2.4` (2026-09-12) or earlier — which includes
the community reporters whose issues P84 was scoped from. The two `Release: ⬜ NOT RULED` markers ask
*"does this go out in the next release"*, and **events answered it two releases ago.**

**What the markers should now say:** `Release: ✅ SHIPPED in v0.2.4 (measured, UPG-005 §3.1)`.
Updating them is this row's only remaining act, and it belongs to whoever owns those boards — this
file does not edit another phase's board. [[a-wholesale-write-over-a-shared-file-is-an-unperformed-merge]]

### 4.1 What is genuinely left, and it is not a release question

- **`FLD-014`** — *"The MCP surface stops costing a round trip"* — **has no subject-named commit at
  all.** The only commits mentioning it are two `docs(p84)` board updates and `FLD-011`'s body.
  ⚠️ **That is evidence of absence, not proof of it**: a row can be built under a subject that does
  not name it. It is the one row worth reading before the notes are written.
- **Unbuilt rows on both boards** are **backlog, not a release decision.** An unbuilt row cannot
  "wait for 0.3.1"; it is simply not built, and saying "it waits" dresses an absence as a choice.
- 🔴 **P84's own board says `3 of 17 built`** (as of 2026-09-10). **Sixteen of seventeen have
  subject-named commits inside `v0.2.4`.** The board is stale by a wide margin, and this is the
  second time in this phase that a board's narrative disagreed with the artefacts — the first was
  P84's `WHAT-WAS-BUILT` files existing for `003/004/005/010/011/015` while the status line names
  `001/007/009`. [[build-the-tasks-do-not-farm-the-defects]] says the board comes from the task
  files; **this row says the task files' own headers lose to git.**

## 5. What this does NOT claim

🔴 **"Shipped" here means the work that exists reached users. It does not mean a row is complete.**
A subject-named commit inside `v0.2.4` says where the work landed, not that every acceptance
criterion on that row is met — several carry half-closed criteria in their own files (P83's README
names two person-halves needing a second machine). **Anyone quoting §3.1 as "P83 and P84 are done"
is quoting it wrongly.** [[a-relayed-conclusion-decays-faster-than-a-relayed-measurement]]

## 6. Acceptance criteria

1. ✅ Each of the 32 rows classified against `v0.2.4` from git, with the control shown (§3).
2. ✅ The classification says what it does **not** measure (§5).
3. **Person-verifiable:** Richard reads §4 and knows, in one sentence, that no release decision is
   waiting on him for either phase — without opening either board.
4. ⬜ `FLD-014` read once (§4.1) before UPG-006 writes the notes.
5. ⬜ The two stale `Release:` markers corrected by their boards' owner, with §3.1 cited.
