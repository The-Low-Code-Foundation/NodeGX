# NSP-000 — The census: every picker node, its tier, and where its behaviour is written

**Opened 2026-09-29.** **Depends on nothing.**
**Status: ✅ BUILT s1 (2026-09-30)** — `scripts/node-spec/census.js` → [CENSUS.md](CENSUS.md) + `census.json`, from the hand-kept [tiers.json](tiers.json).

## 1. The person sentence

> **For any node in the picker, anyone can look up which tier it is in, and every place its
> behaviour is currently written down — so the phase can be planned from facts, not from
> memory.**

## 2. Why first

The batches (NSP-011 to NSP-017) list their nodes *provisionally*, from the catalog's categories.
Categories are not tiers: `Unique Id` sits in *String Manipulation* but needs randomness (T2);
`States` sits in *Animation* but is mostly a state machine (T1) with a clock (T2). The census
settles that once, with a script, so the batch plans stop being guesses.

## 3. What to build

A script, `scripts/node-spec/census.js`, that writes `census.json` and `CENSUS.md` in this folder.
**Generated, never hand-typed.**

For each of the **147** picker, non-deprecated node types in `node-catalog.json`:

| column | how it is found |
|---|---|
| `typeName`, `displayName`, `category`, `availableIn` | the catalog |
| **tier** (T1–T6) | a hand-kept `tiers.json` the script reads; the script **fails** if any picker node has no tier, or a tier names a node that is not in the picker |
| **runtime file** | the registration site in `noodl-runtime` / `noodl-viewer-react` / `noodl-viewer-cloud` |
| **export sites** | `plan.ts` line numbers where the type name appears; which `emit/*Lib.ts` it uses; the P18 ledger status |
| **tests that already grade behaviour** | test files that name the type (runtime, export, core), counted, not read |
| **uses the outcome contract** | whether the definition calls `beginOutcome` |
| **has dynamic ports** | from the catalog's `dynamicPorts` |
| **batch** | which NSP task will spec it |

`CENSUS.md` shows the totals by tier and by batch, and the ten nodes with the **most** places their
behaviour is written (the ones most likely to have drifted), which is a useful early order.

## 4. Acceptance criteria

1. `census.json` has exactly one row per picker, non-deprecated node — **cardinality checked
   against the catalog** by the script itself, both directions (no missing, no extra, no duplicate).
2. Every row has a tier and a batch; the script exits 1 otherwise (and a planted gap proves it).
3. The per-tier totals in `CENSUS.md` add up to 147, and the batch totals add up to 147 minus the
   pilot five.
4. The README's §5 batch rows and each batch task's node list are updated from the census, and
   any node that moved batch is named in this file's §6.
5. The census also lists the **33** catalog nodes it excludes (180 − 147), each with the reason
   (deprecated / not in the picker), so an exclusion is visible and not silent.

## 5. Watch for

- **Cloud-only nodes** (the *Cloud* category, 16) run in `noodl-viewer-cloud`, not the browser.
  They are in the population on purpose; their target is the cloud runtime.
- `grep` lies in this repo (memory: `-I` skips `.ts` files ugrep thinks are binary; `-c` counts
  lines, not matches). Count type-name hits with a script that reads the files.
- Type names are not display names (`net.noodl.SSE` vs *Server-Sent Events*). Key on `typeName`.

## 6. Built — s1, 2026-09-30

**What exists.** `scripts/node-spec/census.js` (generator; `--check` refuses a stale `census.json`), the hand-kept
`tiers.json` (147 entries, one per picker node, with a `note` wherever the category would have suggested another
tier), and the two generated files `census.json` / `CENSUS.md`. Runs in ~2 s; reads 1,969 source files and 571 test
files as text — no `grep`.

**Acceptance criteria, measured:**

| AC | reading |
|---|---|
| 1 cardinality | 147 rows for 147 picker nodes; checked on the *output* both ways (missing / extra / duplicate each throw). 180 − 147 = 33 excluded |
| 2 exit 1 on a gap | Planted and restored (backup copied first): **drop Counter** → exit 1 *"no tier for picker node Counter"*; **tier T9 + deprecated REST2 + unknown Nope** → exit 1 with three named problems. `census.json` was untouched by the failed runs (`cmp` equal) |
| 3 totals | tiers 46+11+39+27+19+5 = 147; batches 5 pilot + 13+26+24+41+14+19+5 = 147 (`CENSUS.md` prints both sums) |
| 4 lists updated | README §5 rows carry the census sizes; all seven batch files' node sections are **spliced from `census.json`** by a script, not typed. Moves below |
| 5 exclusions | the 33 listed with a reason: 30 deprecated, 3 in the catalog but not in the picker (`Page`, `net.noodl.ArrayChanged`, `net.noodl.ObjectChanged`) |

Also: `--check` proven — a one-character edit to `census.json` → exit 1 *"STALE"*; regenerate → exit 0.

**What the census corrected in the provisional lists (README §5 / the batch files):**

- **Aggregate Records** (`noodl.cloud.aggregate`) sits in the *Cloud Services* category but is `availableIn: ["cloud"]` only —
  the **17th cloud-only node**. NSP-014 is therefore 24 frontend + 17 cloud-only, not 25 + 16.
- **Filter Records** is **T1**, not T3: `filterdbmodelsnode.ts:42` — *"one subscription, no requests"* — it filters
  client-side over the store. Stays in NSP-014 with the store as a world fake.
- **Open File Picker** is **T2** (a DOM input and a user gesture; no network). Stays in NSP-014.
- **"Visual Function"** is the display name of `Logic Builder` (the Blockly node) — NSP-017's five were right by
  name, wrong by mechanism (it was read as a Function variant).
- **"Repeater Item"** is `For Each Actions`; **"Delay"** is `Timer`; **"Shape"** is `Circle`; **"Component Stack"** is
  `Page Stack`; **"Page Router"** is `Router` — the batch files now carry both names.
- NSP-012 splits **13 T1 / 13 T4**; NSP-013 splits **14 T1 / 10 T2** (the date arithmetic nodes are pure given
  their inputs; only Now / Delay / Repeat / UUID / Unique Id / Random Bytes / Screen Resolution / On App Error /
  States / Animate To Value need the world). No node changed batch.

**Findings worth carrying forward** (in `CENSUS.md` §Phase-level facts):

- **91 / 147** call `beginOutcome` — the outcome contract is the majority case, so the spec format's
  `outcome: true` is the default shape, not an option.
- **68 / 147** have dynamic ports — NSP-001's derived-port design is load-bearing, not a String Format special.
- **99 / 147** are named as a literal in `plan.ts`.
- **9 nodes are named by no test file at all** — all cloud-only (Delete User, HMAC, JWT Sign, JWT Verify, List Users
  In Role, Model Request, Remove User From Role, Update User, Verify Session Token). For them the spec is the first test.
- Every one of the 147 resolves to **exactly one** declaring source file across the three runtimes (the probe first
  matched bundled copies under `noodl-editor/src/external` and `.d.ts` files — both excluded).
- **The "most places written" order is sensitive to how you count.** A loose count (any test file quoting the name)
  puts Text/Group at 91 test files because `'Text'` is a common word in test prose; matching the name only after a
  type-ish key (`type: 'Text'`) gives 55/56 and reorders the ten (Set Variable rises to #3, Unique Id enters at #10
  on 15 `plan.ts` lines). `placesWritten` uses the typed count; both are printed.

**Not done here:** nothing in `tiers.json` is a ruling — tier assignments are this session's reading of each source
file's mechanism, and a batch may move a node with a one-line edit plus a regenerate.
