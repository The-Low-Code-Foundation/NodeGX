---
id: P112-OWN032-BLANKSHOT
title: The OWN-032 bench sometimes measures a page before it draws, and a blank shot can end an arm run "clean"
status: fixed
commit: b3a553ac4 (retry + endGate guard, behind blankRetry); tightened to words === 0 in the 8b commit
severity: medium
area: dev tooling / OWN-032 bench (bench.mjs) and arm (arm.mjs endGate)
found: P112 OWN-032 s4, 2026-10-29
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-032/RESULTS.md §8a
---

`bench.mjs` reloads the hero page, waits `settleMs` (700 ms), and measures. Now and then the measure runs before
the page has drawn anything: `checks.blank: true`, 0 words, no blocks, and the screenshot is 120 px tall with only
the top of the headline in it.

**How often:** 11 of 1003 arm shots (runs w1–w11) have one width blank while the other width has words. The hits
cluster late in a run (t12–t23, five of them at t21). w10s-plumber and w11s-plumber went blank at the same turn with
the same history, so the cause depends on the run (time open, memory with a model loaded), not on chance alone.

**It is not reproduced idle:** the w11m-jazz t21 tree, shot 50 times on one bench with no model loaded, never went
blank.

**Why it matters:** a blank shot has no findings. With `endGate`, the run ends once every part is there and no
finding has a fix, so w11m-jazz ended at t21 on a picture with nothing in it. Its control (w10m-jazz) measured the
same tree clean, so that end happened to be right, but it was not measured.

**Fix (s4, behind the `blankRetry` switch, off by default so old runs replay unchanged):**
- `openBench(dir, { retryBlank: true })` measures a blank page again, up to 3 times, `settleMs` apart, and records
  `retries`;
- a shot still blank after that, with words in the tree, is ledgered as `blank` and cannot end the run.

**Seen working (8b):** w12m-bakery t13's desktop shot read 0 words, and one retry later read 21. No w12 shot stayed
blank with words in the tree. The retry and the guard ask for `words === 0`: look.mjs's own `blank` means fewer than
5 words, which every early turn with a placeholder trips.
