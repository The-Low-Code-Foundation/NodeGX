---
id: P123-STU008-APPCHECKPUBLISH
title: Studio's app gate stops at Publish, which never answers, so check:app reads 26/30 at HEAD
status: fixed
commit: nodegx-studio d0d16b2 (not reproduced; see the last section)
severity: medium
area: nodegx-studio `app/check.mjs` step 3b (STU-008 Publish through the header button)
found: STU-071 (opennoodl-d7), 2026-10-23 22:40, running check:app before committing
evidence: nodegx-studio `npm run check:app` at HEAD f1cc559 in a clean worktree (no peer edits, without STU-071): "FAIL clicking it publishes the open app to the folder chosen — {}", then the next two rows and "the gate ran to the end — ENOENT … published-sites.json"; the same with STU-071 (twice in the primary, once in a clean worktree)
---

`check:app` step 3b reopens the todo copy (its backend running), clicks the header's Publish and waits 120 s for
`window.__ob.published`. It never comes, so the page's `publishApp` saw the desktop call reject or never return,
and the gate stops at 26/30 (it read 54/54 on the s22–s24 trees the same day). Every run measured it:
HEAD f1cc559 alone, HEAD + STU-071 in a clean worktree, and twice in the primary with a peer's `studio.html` edits.

Not the flow itself, as far as measured: driving the same folder Publish directly (a hidden window, a todo copy
opened by argument, `window.__ob.publish()`) publishes 11 files, asks the backend warning first, and says the
`/sign-in` sentence. What differs in the gate: the project reopened from the welcome screen, and its backend running
under the gate's own backends folder. A lead, not a finding: a peer's stuck `editor/check.mjs` (and its Chrome) had
just been killed before the first run.

Next: run 3b with the app's stdout shown (the gate keeps `running.log()`), and read why `studio:publish` rejects.

## 2026-10-24: not reproduced on the 0.2.6 pins (opennoodl-d7)

`check:app` **54/54** at nodegx-studio d0d16b2 (pins @nodegx/mcp 0.2.6, @nodegx/preview 0.2.5, vendor/ at NodeGX
2cac89c05), run alone under HEAVY.lock with nothing else on the box. The pins are the only change from the 26/30
trees; the cause was not identified. If 3b stops at Publish again, reopen this with the app's stdout.
