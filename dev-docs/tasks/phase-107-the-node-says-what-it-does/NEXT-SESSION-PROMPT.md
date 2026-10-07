# P107 — next session

**Written 2026-10-07 (s55).** Read the [README](README.md) §2–§7 (R16 is the newest ruling). s55's record is
[NSP-016 §7.16](NSP-016-VISUAL-NODES.md) (the Drag); s54's is §7.15 (the Video).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2, the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18) | s1 … s44 |
| **NSP-016 the visual nodes** | 🟡 **14 of 19 conform. The Drag v1 (s55)** on both targets. Left: Repeater (`For Each`), Component Stack, Page Router, Component Children (a component boundary or a stack each), Columns (geometry). AC4 waits for NSP-017 | `aa8abb06f` … s55 |
| NSP-023 the spec without React | ✅ all six ACs (s50) | s45 … s50 |
| NSP-006 the stranger | ✅ rounds 1–4 | `649e6864d` |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

**120 of 147 conform on the runtime (81.6%)**: T5 14/19. The census was not regenerated (it does not count conformance).

## What s55 settled

1. **The handoff was wrong about the Drag's machinery.** The Drag node is not drag-drop.ts: it wraps `react-draggable` 4.5.0 around
   its FIRST child. It needs no geometry except **Constrain to parent**, which in jsdom silently clamps nothing (no `offsetLeft`, the
   bounds come out NaN and the library skips them). The face's choice: the parent has no box.
2. **The face's pointer has a POSITION** (node-spec-target.ts `positionedAct`): `pressAt` (`{ x, y, by?, button? }`), `moveTo`,
   `releaseAt`. A mouse's move and release are dispatched at the document; a finger's go to the element it went down on (`touchAt`).
   The Drag's page holds one real Group child. No other spec moved (new act names; only the Drag gets the child).
3. **The library's rules are modelled, not React's**: a press during a drag reports the movement since the last point; a drag hears
   only the pointer kind that started it; the child's own `onTouchEnd` ends a drag and sets the module-wide `dragEventFor`.
4. **The drain** (found by the runtime's 10,000): the child's pointer handlers — the library's `onMouseDown` / `onTouchEnd`, the
   Group's `onTouchStart` — drain the graph after they run (pointerlisteners.ts :170-186), so a Do sent earlier in the frame runs at a
   press or a finger's lift, before React commits that handler's `setState`. Modelled (`drain`). And the wire keeps the last DEFINED
   value within a frame: a spec whose frame is one patch must apply that itself (`join`). The 12 shrunk divergences all looked like
   C102; the unshrunk ones were 9 drains, 2 wire rules, 3 C102 — judge the unshrunk sequence.
5. **Every path writes the whole state from the start** (`toPatch` with `HELD`): 1,500 mutants → 141, survivors 30 → 0.
6. **Rows, all open, all P109's under R16** (P109 was told about all six):
   - **C101 (high)**: on a touch screen nothing inside a Drag can be tapped — react-draggable cancels `touchstart`, and Chrome then
     sends no click and no focus (measured: jsdom on the real component, plus headless Chrome 154 with touch emulation). The Site
     Builder's `/Admin/SectionRow` puts its buttons and fields inside a Drag. The fix: a `cancel` selector in Drag.tsx.
   - **C102** (medium): a locked Axis reports the pointer's movement (known row; the spec says the intent).
   - **C103** (medium): a Drag draws only its first child; the catalog example `vis-drag-snap-back` loses its readout.
   - **C104** (low): CSS Class / CSS Style on a Drag reach nothing.
   - **C105** (low): a Snap Do that waited for the mount runs from 0 (known row).
   - **C106** (medium): a Start Drag X / Y of NaN blanks the page (withheld + known row).
7. **Withdrawn after measuring**: "Scale divides twice" — it divides once.
8. **Copied, not rowed (R3)**: a text Start Drag X joins the movement as text ("50" moved 10 is "5010"). Ask Richard if he wants it
   read as a number (it would be a row like C102).

**Readings (2026-10-07, at the commit's 20 scenarios; detail in NSP-016 §7.16).** Interpreter at 200 on seeds 13, 20729, 20730, 7 and
at 10,000 on 20731 and 20733: CONFORMS, 0 survivors. Runtime at 200 on 20733 and 13 and at 10,000 on 20733: CONFORMS, 0 unattributed
divergences (C102 ×1,042 and C105 ×4 at 10,000), every mutant killed but the declared one. The runtime's target and graph suites
106 / 106.

## What s56 does

1. **Check P109's progress on C96–C106** (and anything left of C81–C95). When one is fixed, its scenarios' `row`, its KNOWN_ROWS or
   `WITHHELD` entry go in the same commit (C100's ledger says how C79 comes back on the Video; C106's says how its withheld values go).
   Read the commit before trusting that a row is still open.
2. **Text Input v6 leaves a mutant at seed 20733** (`person.press` swap-branch on the willUnmount + onBlur branch: a press whose paint
   takes the field off the page). It is the same on the interpreter, so it is the spec's scenarios, not a target: P109's D30 branch
   (32e1856b0). P109 was told; if it has not added the killer, do (a reader between the act and the next paint — s54's trap).
3. **The next visual node.** Component Children, Repeater (`For Each`), Component Stack and Page Router each need a component boundary
   (the graph format has none yet; NSP-015 s18 / s19 built STACK and ROUTE seams for the navigation nodes — read those first). Read the
   four and pick the one the existing seams reach; Columns waits for geometry. Write the whole state on every path from the start.
4. **Cost to watch:** the Drag is cheap (200 sequences in ~4 s on the runtime, 10,000 in about 3 minutes).

**Human decisions outstanding.** Ask in plain words (README §7 holds the earlier ones):
- **New, optional:** should a Drag's Start Drag X that arrives as text ("50") be read as a number? Today it joins the drag's
  movement as text.
- **R7, R8, R4's confirmation and G1**, and NSP-017's question about the templates' CSS sheets, as before.

**Known face choices, written down (not gaps):** as s54's, plus the Drag's: no geometry (Constrain to parent constrains nothing); a
mouse's move and release land on the document; a touch is identifier 0; one pointer at a time; a press raises no hover, leave or click.

## Before you start

- **R11 / R12:** keep React out of the spec. React's mechanics go in the runtime target and its face, never in a spec's state or rules.
- **Shared checkout.** Commit through a temporary index with `BASE` pinned **in the same Bash call** as `read-tree`, then `git reset -q
  -- <your paths>` so the shared index matches; never `git add -A`, never `git stash`; one heavy job at a time, with `uptime` and `ps`
  first. **P109 runs `conformance.test.ts` back to back from its worktree (`p109-c83`)**: there is no gap to wait for, so ask it for a
  window, and wait on its PID (never `pgrep -f` in your own loop: it matches the loop). **The `/next` state file belongs to P109; do
  not overwrite it.**
- **After a `/clear`, a running suite or an uncommitted pile may be your own pre-clear session's.** Read the old `.jsonl` tail.
- **Row scenarios are labels**: a scenario with a `row` counts as known on ANY divergence. Label one only after playing it on the runtime.
- **The runtime conformance test's `beforeAll` plays every listed spec before any test:** always set `NSP_ONLY`. `NSP_DEEP` runs at the
  DAY's seed.
- **A known-row matcher should look at both sides of the difference**: a frame's values are sorted, so at C102's first difference the
  reference holds Drag X while the runtime holds Delta Y (the locked axis). C102's and C105's matchers read both.
- **s55's probes** (deleted): `zz-drag-probe` (viewer-react: the real Drag component in jsdom, mouse and touch with coordinates);
  `zz-drag` (runtime: `ZZ_INTERP=1` + `ZZ_MUT=1` the interpreter with mutants, else the runtime; `NSP_N`, `NSP_SEED`; `ZZ_SHOW=i,j`
  prints the runtime trace of scenarios i, j); the headless-Chrome touch check (a page whose box cancels `touchstart`, CDP touch taps,
  `--remote-debugging-port` off 9222).
- The census reads the WORKING TREE; `tiers.json` is hand-kept; a spec behaviour change is a version; an ADDITIVE format change needs
  the stranger hashes refreshed and all four rounds green.
- An ABSENCE scenario needs a firing control beside it. JSON has no `undefined` (`{ "set": "<port>" }`). A new ACT kind goes in the
  face and the spec's `acts`.
- Catalog parity compares descriptions VERBATIM, and defaults. Deep-run every new spec before its handoff.
