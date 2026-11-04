---
id: P132-HOSTEDRATELIMIT
title: check:hosted's "Delete type" goes red on the backend's admin rate limit, at HEAD as well
status: open
phase: P132
severity: low
area: nodegx-studio / gates (editor/hosted-check.mjs, the P125-MUDDY-NATIVEDIALOG section)
found: P132 s13 (BWF-010), 2026-11-04, running Studio's gates before a commit
evidence: nodegx-studio editor/hosted-check.mjs "Delete type: asked in Studio's card" (on a red it now prints the toast); s13 runs below
---

`check:hosted` goes red, 1 of 46, on *Delete type: asked in Studio's card, and the type is gone from the project*.
The confirm is asked and answered. The type stays. Studio's toast says why (the gate prints it on a red since s13):

> Not deleted: Rate limit exceeded for admin requests (300/min, burst 100). Retry in 1s.

**Red at HEAD too, so not made by BWF-010; whether BWF-010 makes it likelier is not settled.** Measured 2026-11-04, one run at a time:

| Studio page | Runs | Red |
| --- | --- | --- |
| HEAD `d4c72c0` | 4 | 1 |
| BWF-010 | 6 | 4 |

From BKO-005 up to *Delete type*, the page's own requests were counted with resource timings: 18 on HEAD and 18 on
BWF-010, the same breakdown (triggers 4, workflow-defs 5, step kinds 4, schema 3, executions 2). The rest of the
burst of 100 comes from requests the page cannot see. Those are the gate's own `admin()` calls straight to the backend
(BKO-005, BKO-007's map) and `serve.mjs`'s server-side calls. Which of those spends it is **not measured**. The page
counts were read on two green runs only. 4 of 6 against 1 of 4 is too few runs to call a difference.

The same family as s3's note in the phase memory: adding one backend read to `loadAutoBackend` broke BKO-007 4/46,
"cause unfound". That was most likely this limit too.

**To do:** count the backend's admin requests on its side over one `check:hosted` run (the limiter's key and window),
then either space the gate's sections or give the test backend a higher burst. Lowering Studio's reads is the wrong
fix: a person never makes 100 admin calls in a second.
