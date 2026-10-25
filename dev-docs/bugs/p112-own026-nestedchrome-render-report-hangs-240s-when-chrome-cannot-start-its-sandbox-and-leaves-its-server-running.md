---
id: P112-OWN026-NESTEDCHROME
title: "Inside a macOS sandbox (sandbox-exec, as agent harnesses run commands), `render_report` and `drive_page` hang for the full 240 s and answer only \"did not finish … and was killed\": Chrome starts but its own sandbox can't, so its renderer crashes and the harness waits forever; the render server it started keeps running after the kill"
status: fixed
commit: PENDING
severity: medium
area: "`@nodegx/mcp` 0.2.5 render harness: `dist/render-harness/measure-from-disk.js` (the Chrome launch: `--headless=new --remote-debugging-port … --disable-gpu`, no `--no-sandbox`, no check that a page target ever answers), `src/render.ts` `spawnRender` (SIGKILLs the harness only, not the `render-from-disk` server or Chrome it started)"
kit: core
regression: packages/noodl-mcp/tests/p112NestedChrome.test.ts "the process the harness started is gone with it"
found: P112 OWN-026 test 1, round t1-nodegx-1, 2026-10-22
evidence: "dev-docs/tasks/phase-112-your-own-nodegx/own-026/PLAN.md §8 (2026-10-22 14:30); round /Users/Shared/nodegx-lab/own026/t1-nodegx-1.lab-broken-chrome (sittings/1/agent.jsonl: two render_report results 12:05:50 and 12:10:07 UTC, `io-error` \"The render did not finish within 240s and was killed.\"; three `render-from-disk.js` processes 8–17 min old at 12:14 UTC)"
---

A DeepSeek round of the OWN-026 lab ran Cline under `sandbox-exec` (the lab's fence). Every `render_report` hung for
240 s and came back as `io-error` "The render did not finish within 240s and was killed." — nothing about why. Then
the agent tried `drive_page`, which hung the same way. Three `render-from-disk.js` servers from the killed renders
were still running 8–17 minutes later.

Measured on a copy of the same project, the same day:
- Outside the sandbox: `measure-from-disk.js <proj> --json --screenshot full` finishes in 8 s, every page drawn.
- Inside the round's sandbox: no output at all, still running when stopped at 280 s.
- Chrome alone inside it: `sandbox initialization failed: Operation not permitted`, then `GPU process exited
  unexpectedly`, `Network service crashed`. Chrome's own sandbox can't be set up inside another macOS sandbox, so
  its child processes die while the browser process (and its debugging port) stays up. The harness waits for a page
  that never arrives.
- With Chrome started through a two-line wrapper that adds `--no-sandbox` (`CHROME_PATH`, which the harness
  honours), the same render inside the sandbox finishes in 8.9 s.

Why it matters beyond the lab: agent harnesses run commands in exactly this kind of sandbox (Codex CLI uses
seatbelt on macOS; other harnesses use containers). There the kit's "verify by looking" step costs four minutes per
try, says nothing useful, and leaves processes behind, so the agent gives up on looking.

Fix, small, either or both:
1. The harness checks that a page target answers (a `Runtime.evaluate` of `1`) within ~15 s of Chrome's port opening.
   If it doesn't, it fails fast with a clear message: "Chrome started but its pages crash — this usually means it is
   running inside another sandbox; set CHROME_PATH to a Chrome started with --no-sandbox, or run outside it." It can
   also retry once with `--no-sandbox`.
2. `spawnRender`'s timeout kills the harness's whole process group (start it `detached` and kill `-pid`), not only the
   harness, so the render server and Chrome go with it.

Workaround: set `CHROME_PATH` to a wrapper that runs Chrome with `--no-sandbox`.

**Fixed (the Beta sweep s8, 2026-10-25), both halves of the small fix.**
1. `scripts/devtools/render-report.js` `pageAnswers`: once Chrome's port is open, its first page gets `PAGE_ANSWER_MS`
   (30 s; `NODEGX_RENDER_PAGE_ANSWER_MS` overrides) to attach and answer `1`. If it does not, or refuses the socket, or
   there is no page target, the render fails as an actionable error: "Chrome started (its debugging port opened) but its
   page never answered within 30 s. That is what Chrome does inside another sandbox … set CHROME_PATH to a script that
   starts <chrome> with --no-sandbox." No automatic `--no-sandbox` retry: that is a security choice, left to the person.
2. `src/render.ts` `spawnRender`: the harness leads its own process group (not on Windows); a timeout sends the group
   SIGTERM (the harness's own cleanup runs, the server and Chrome stop) and SIGKILL 3 s later, or as soon as the harness
   has gone, for anything left.
Graded: `tests/p112NestedChrome.test.ts` 6/6 without a real Chrome (a fake harness that starts a child and hangs; the
two group cases red on HEAD's `render.ts`, the child surviving); real-Chrome render suites (p125Render1mb, renderTools)
14/14; mcp tsc clean. Not driven inside `sandbox-exec`. Reaches a stranger with the next `@nodegx/mcp` (the harness ships
in its `dist/render-harness`).
