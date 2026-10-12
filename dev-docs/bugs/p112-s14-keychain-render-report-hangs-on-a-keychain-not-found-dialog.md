---
id: P112-S14-KEYCHAIN
title: "render_report's headless Chrome opens the macOS login keychain; with none where HOME points, a \"Keychain Not Found\" dialog appears on the person's screen and the render hangs until it is killed at 240 s"
status: fixed
severity: high
area: mcp / render harness (`scripts/devtools/render-report.js` `withRenderedPage`'s Chrome flags; shipped in `@nodegx/mcp` `dist/render-harness`)
found: P112 OWN-014/015 s14, 2026-10-12
commit: (this session's commit)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-015-THE-BACKEND-FROM-NPM.md §7 (round 2)
---

OWN-015's second stranger round ran the 0.2.0 MCP with `HOME` pointed at an empty folder. Every `render_report` (4 of
4) failed with *"The render did not finish within 240s and was killed"*, so the agent never saw its app. Running the
harness by hand: the same project rendered in 2 s with the real `HOME` and hung with the round's `HOME`; a bare
headless Chrome on the same page answered normally. Meanwhile Richard's screen kept showing macOS's **"Keychain Not
Found — A keychain cannot be found to store "Chrome"" (Cancel / Reset To Defaults)**, once per Chrome launched.

**Cause:** a page that uses storage makes Chrome on macOS open the login keychain ("Chrome Safe Storage"). Chrome
looks for it under `HOME`, so with an empty `HOME` there's none, the OS asks the person, and Chrome blocks until they
answer. Headless, nobody answers in time. The harness's profile is a throwaway temp folder, so it never needed the
real keychain.

**Who meets it:** anyone whose `HOME` has no login keychain (CI users, containers on a Mac, a sandboxed agent, our
own stranger rounds). A person with a normal login can still get the "Chrome wants to use your confidential
information" prompt, and the render waits on it in the same way.

**Fix:** `--use-mock-keychain` in the harness's Chrome flags. ⚠️ "Reset To Defaults" on that dialog can replace the
person's real login keychain, so it must never appear because of us. The other nine headless launchers
(`drive-page.js`, `drive-deployed.js`, `exported-app-harness.js`, the preview's two checks, node-spec's browser
check, two export drives, `shoot-admin-dashboard.js`) are dev-only and run with the real `HOME`; they take the
same flag when next touched.
