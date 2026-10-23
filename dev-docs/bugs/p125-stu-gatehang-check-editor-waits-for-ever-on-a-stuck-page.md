---
id: P125-STU-GATEHANG
title: Studio's check:editor can wait for ever in rebuilt(n0) — its CDP calls had no timeout, so a stuck page hung the gate instead of failing it
status: fixed
commit: nodegx-studio 2f9b321
severity: medium
area: nodegx-studio / `editor/cdp.mjs` (`send`), the gate `editor/check.mjs`
found: P125 s11, 2026-10-23 (the step "Set a custom state in a reusable" failed under load, then the gate never ended); fixed s12, 2026-10-24
evidence: "s12: a page running `setTimeout(() => { while (true) {} })`, then `b.until(…, 30000)`: before, `until` awaited Runtime.evaluate with no answer and never returned; after, it rejects at 60 s with 'CDP Runtime.evaluate had no answer in 60 s: the page's main thread is stuck (on …)'. check:editor 203/203 after."
---

`rebuilt(n0)` is `b.until(expr, 30000)`, and `until` checks its limit only between answers. `send` (every CDP call)
was a promise with no timer, so when the page's main thread stopped answering, the first `Runtime.evaluate` waited
for ever, `until`'s 30 s was never read, and `check:editor` sat there with Chrome and Studio running. A gate that
hangs is worse than one that fails: nobody reads a result, and the next heavy job waits behind it.

Fix: `send` rejects after 60 s (twice the longest wait the gate asks for), naming the method and the expression. The
gate's own `catch` then reports "the gate itself: CDP Runtime.evaluate had no answer …" and the run ends with FAIL.
