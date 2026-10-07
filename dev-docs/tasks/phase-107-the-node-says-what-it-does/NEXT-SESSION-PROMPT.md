# P107 — next session

**Written 2026-10-07 (s54).** Read the [README](README.md) §2–§7 (R16 is the newest ruling). s54's record is
[NSP-016 §7.15](NSP-016-VISUAL-NODES.md) (the Video); s53's is §7.14 (the Shape and the Image).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2, the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18) | s1 … s44 |
| **NSP-016 the visual nodes** | 🟡 **13 of 19 conform. The Video v1 (s54)** on both targets at 200 and 10,000. The other 6 need infrastructure (§7.6). AC4 waits for NSP-017 | `aa8abb06f` … s54 |
| NSP-023 the spec without React | ✅ all six ACs (s50) | s45 … s50 |
| NSP-006 the stranger | ✅ rounds 1–4 | `649e6864d` |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

**119 of 147 conform on the runtime (81.0%)**: T5 13/19. The census was not regenerated (it does not count conformance).

## What s54 settled

1. **The Video** ([video.ts](../../../packages/nodegx-node-spec/src/nodes/video.ts), 1,573 scenarios). It is the Image's machinery plus
   the browser's media element. A video file draws a `<video>`; a YouTube or Vimeo link draws an embed (`<iframe>`), and what lands on
   an embed goes there. Four new acts make up the browser's side: `loaded`, `failed`, `progress` and `ended`. It also has the autoplay
   rule (muted, or after a person's activation), and Play, Pause, Restart and Reset wait while the Video is off the page. DOM Element is
   a trace tag local to video.ts (`OWN_ELEMENT`), so the stranger's hashes stand.
2. **The face** (node-spec-target.ts THE MEDIA ELEMENT) gives jsdom a media engine. A person's act waits for the media work queued
   before it (`mediaWork`); with no media element on the page nothing changes, so no other spec's timing moves (measured below).
3. **Write the whole painted state on every path, FIRST.** Every act paints first, so every act's branch split by what its paint did:
   nothing, a load, the `src` taken away, an embed swap, a mount. Killer matrices reached each split and each brought its own survivors
   (43 → 79 → 115 per seed, 5,101 mutants, 6 minutes a seed). The cure was `painted` writing the element and its media as they stand
   (`heldElement`), and every action writing the playback (`heldPlayback`) on any element, not only a `<video>`. That gave 3,764
   mutants and 2 minutes a seed. **Do this first for Drag and the rest.**
4. **Two probe traps.**
   - *A skipped paint heals at the next one.* A reader must sit between the act and the next paint: an action, or an input write
     followed by an act in the same frame.
   - *A branch reached only where its change shows nothing is no kill.* Print the plays that reach it (`zz-mut`).
5. **A matcher must read the input held when the person ACTED.** A frame reports its outputs after all its steps, so a Source switched
   to an embed later in the same frame made C100's matcher, which read the Source last held, miss a release on a video file. The 10,000
   found it. The matcher now reads the Source at the last act before the difference.
6. **Rows, all open, all P109's under R16:**
   - **C96** (medium): Source Object on an embed throws.
   - **C97** (low): Play or Restart after a file switched to an embed throws.
   - **C98** (**high**): a Volume outside 0 to 1 (50, from a Slider's default range) blanks the page. It is withheld from the runtime's
     sequences.
   - **C99** (low): a Source Object that is not a stream throws. It is withheld.
   - **C100** (medium): a video file fires no pointer output and takes no file drop. 1,186 of the 1,573 scenarios carry it, so on the
     runtime the Video is graded thinly until it is fixed. **Ask P109 to fix C100 next.** Its fix brings C79 back on five scenarios;
     the ledger says how.
7. **The guard** (`page-model.test.ts`) had been red at HEAD since P109's Group v3 (3364b47f6): `stampOn` now changes with the Tag
   too. It is fixed in s54's commit, and P109 was told.

**Readings (2026-10-07).**
- **Interpreter:** at 200 on seeds 13, 20729, 20730 and 7 (3,740 / 3,764 killed, the rest declared) and at 10,000 on seed 20731
  (4,044 / 4,065): CONFORMS, 0 divergences.
- **Runtime:** at 200 on seed 13 and at 10,000 on seed 20733: CONFORMS, 0 unattributed. At 10,000: C96 ×126, C100 ×1,662, C97–C99
  0 (C98 and C99 are withheld). The known-rows test is green.
- **Package suite** (before the guard fix): 22 suites, 939 passed, 18 skipped, 1 failed (the guard's Group, fixed). After the fix:
  the guard and its plants 37 / 37.
- **Stranger:** no hashed file changed.
- **Shared changes:** the runtime's graph and target suites 106 / 106; the 85 non-visual specs and the Text v5 on the runtime at seed
  13 all CONFORM.

## What s55 does

1. **Check P109's progress on C96–C100** (and anything left of C81–C95). When one is fixed, its scenarios' `row`, its KNOWN_ROWS entry
   (or `WITHHELD` entry) and, for C100, C79's row on the five Video scenarios go in the same commit. Read the commit before trusting
   that a row is still open.
2. **Drag** (`visual/drag.ts`): read it first, because it may need geometry (NSP-017). If it doesn't, write the painted state on every
   path from the start (point 3 above).
3. **Cost to watch:** the Video adds about 2 minutes per seed to `batch-visual` and about 4.5 minutes to a runtime run at 200. Its
   10,000 takes about 5 minutes on the interpreter and 11 on the runtime.

**Human decisions outstanding.** Ask in plain words (README §7 holds the earlier ones):
- None new.
- **R7, R8, R4's confirmation and G1**, and NSP-017's question about the templates' CSS sheets, as before.

**Known face choices, written down (not gaps):** as s53's, plus the Video's: the browser's own controls are not an act; a load that
has loaded never fails afterwards; End Time's stop is not an act; an element unmuted with no activation plays on (Chromium pauses
it); a `<video>` with its controls drawn takes the keyboard only with a tabindex.

## Before you start

- **R11 / R12:** keep React out of the spec. React's mechanics go in the runtime target and its face, never in a spec's state or rules.
- **Shared checkout.** Commit through a temporary index with `BASE` pinned **in the same Bash call** as `read-tree`; never `git add -A`,
  never `git stash`; one heavy job at a time, with `uptime` first. **The `/next` state file belongs to P109; do not overwrite it.**
- **After a `/clear`, a running suite or an uncommitted pile may be your own pre-clear session's.** s54's was: same Claude process
  (`ps -o ppid`), a different session id. Read the old `.jsonl` tail.
- **Row scenarios are labels**: a scenario with a `row` counts as known on ANY divergence. Label by playing it on the runtime twice, as
  it is and with the defect fixed in memory (`zz-side`'s `ZZ_FIX100` pattern); only those that agree behind the fix get the row.
- **The runtime conformance test's `beforeAll` plays every listed spec before any test, under a 30-minute hook limit:** always set
  `NSP_ONLY`. `NSP_DEEP` runs at the DAY's seed (not `NSP_SEED`).
- **A declared row only covers mutants no play kills**, so it cannot hide a twin a scenario catches. Check a new row's strings
  against the survivor lines before a 15-minute run (s54's first two rows matched nothing: a mount that runs an action writes
  `timeOut`).
- **s54's probes** (all deleted): `zz-conf` (`NSP_ONLY`, `NSP_SEEDS`, `NSP_N`); `zz-mut` (`ZZ_M` = reducer||kind||branch-substring[||twin-substring],
  `NSP_SEED`, `NSP_N`; prints only the mutants no reached play kills, with their examples; `ZZ_SHOW=i,j` prints every reducer's shape
  in those plays; `ZZ_TRACE=1` prints the reference and mutant traces); `zz-side` (both targets, `ZZ_ONLY`, `ZZ_OUT`, `ZZ_FILE`,
  `ZZ_FIX100`); `zz-replay` (the unshrunk generated sequence with sequence seed `ZZ_SEQ` at run seed `NSP_SEED`, with the runtime
  test's withheld values, written to `ZZ_FILE` for `zz-side`); `zz-rows` (which survivor lines of `ZZ_FILE` the declared rows match).
  Each takes a few minutes to rebuild; the JSON is the source.
- The census reads the WORKING TREE; `tiers.json` is hand-kept; a spec behaviour change is a version; an ADDITIVE format change needs
  the stranger hashes refreshed and all four rounds green.
- An ABSENCE scenario needs a firing control beside it. JSON has no `undefined` (`{ "set": "<port>" }`). A new ACT kind goes in the
  face and the spec's `acts`.
- Catalog parity compares descriptions VERBATIM, and defaults. Deep-run every new spec before its handoff.
