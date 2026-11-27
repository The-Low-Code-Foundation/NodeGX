---
id: P115-HST014-LOCALORPHAN
title: When `deploy.mjs --local` fails after `wrangler dev` started (step 6), the command exits 1 and leaves wrangler and workerd running, orphaned, holding the port
status: open
severity: low
kind: product
area: nodegx-backend / `cloudflare/deployCloudflare.ts` `--local` branch (the spawned `wrangler dev` child is not killed when `waitFor` or `applyEverything` throws)
found: 2026-11-27, the control run for P115-HST013-UPLOADCODEGEN (old printcode.ts, step 6 refused the functions)
evidence: after the deploy exited 1, `ps` showed wrangler (PPID 1) → its node child → workerd listening on 127.0.0.1:8823, cwd the deployment folder. Killed by PID.
regression: none yet
---

What a person sees: the deploy prints its refusal and returns to the prompt, but the port stays taken. The next
`--local` on that port fails or, worse, reaches the old Worker, which still runs the earlier build.

Why: in the `o.local` branch the child is spawned, then `waitFor(…/health)` and `applyEverything(…)` run. A throw from
either leaves the function without `child.kill()`. Only the success path waits for the child's exit.

Fix (not done): wrap the steps after `spawn` in `try { … } catch (e) { child.kill(); throw e; }`, and say the port is free.
