---
id: P109-S15-FLD011ORPHANRACE
title: fld011ParallelTabs' "reaps an orphan" test fails in a full parallel run — another worker's render suite reaps its planted orphan before the precondition is read
status: scheduled
phase: P109
task: ISL-036
severity: low
area: gate / packages/noodl-mcp/tests/fld011ParallelTabs.test.ts:346-351 vs scripts/devtools/render-report.js:1678 (`reapOrphanedRenderProcesses` at every `withRenderedPage` start)
found: P109 s15, 2026-10-05, the closing full `noodl-mcp` run (--maxWorkers=2)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/NEXT-SESSION-PROMPT.md (gate readings)
---

In the full `noodl-mcp` run (`--maxWorkers=2`, 177 suites) the test failed at its own precondition, `:351`
`expect(alive(pid)).toBe(true)`: the orphan it planted (a sleeper whose command line names `RENDER_SCRIPT`, adopted by
init) was already gone 1.5 s later, before the reaper under test ran. Run alone it passes, 11/11, twice.

The mechanism: every `withRenderedPage` call reaps orphaned render processes at its START
(`render-report.js:1677-1678`), and the planted sleeper is exactly what it looks for. Any render-using suite that starts in
the other worker during that 1.5 s window kills it. P109 s15 added two more render tests (`isl021DrivePage` 8 → 10), which
widens the window; s14's full run did not hit it.

It grades the reaper correctly when alone; in a parallel run it reads red for a reason that is not the product. Fix shape:
plant the orphan with a marker only this test's sweep reaps (or run this suite serially via jest `--runInBand` /
a `testSequencer` pin), so another worker's sweep cannot reach it. Until then: a lone red here in a full run is this race —
re-run it alone before believing it.
