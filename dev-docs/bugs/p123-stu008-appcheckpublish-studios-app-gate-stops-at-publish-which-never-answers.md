---
id: P123-STU008-APPCHECKPUBLISH
title: Studio's app gate stops at Publish, which never answers, so check:app reads 26/30 at HEAD
status: fixed
commit: nodegx-studio fcb1b81 (the gate names a locked screen)
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

## Seen again, 2026-10-30 (STU-090, opennoodl-33)

`check:app` 36/40 on the STU-090 tree, the same four rows: "clicking it publishes the open app to the folder chosen —
{}", the next two, and "the gate ran to the end — ENOENT … user-data/published-sites.json". STU-090 does not touch
Publish (its diff names publish only in package.json's script names). Load average 16–20 during the run (peers' work).
Not re-measured at the base commit in a clean worktree, so whether it is load or a defect is still open.

## Passes alone, 2026-10-30 08:19 (opennoodl, the session after STU-090)

`check:app` **67/67** on nodegx-studio dfa84e7 + the P123-STU-CHOICENOTENFORCED fix (`lib/backend.mjs` provisionFor,
which 3b does not call), every Publish row green ("clicking it publishes the open app to the folder chosen — {site: …}"),
run alone under HEAVY.lock at load average ~2, no jest/vitest on the box. The 36/40 of the night before was on the same
STU-090 tree at load 16–20. So far it has failed only under heavy load and passed every time it ran alone (10-24, 10-30),
which fits a 120 s wait for `__ob.published` timing out on a starved box, but does not exclude anything: the cause was
never read from the app's stdout. Next time it stops, keep `running.log()` and read why `studio:publish` did not answer.

## Seen again, then passing at load 16.7, 2026-10-30 (the session after STU-090)

- **09:16, failed (36/40):** `check:app` stopped at the same four rows. It ran in one chain straight after `check:data`
  and `check:timeline` (both start backends and a Chrome), at moderate load (~3–4).
- **The 3b detail:** `pub` was undefined while "the button is ready again" passed, so Publish finished without setting
  `__ob.published`. `asking()` in `app/main.cjs` never rejects (a failure comes back as `{ error }`, which the gate
  prints), so the result never reached this page. Either the invoke itself rejected, or the page was reloaded and `__ob`
  replaced while Publish ran. The app's stdout said nothing.
- **10:27, passed (67/67):** the same tree, alone, at load **16.7**. Load alone does not explain it. Running straight
  after other gates in the same chain fits every run so far, but nothing excludes other causes.
- **Instrumented (nodegx-studio a3a02fd):** when no answer comes, 3b now reports whether the page that pressed Publish
  is still there (`samePage`), whether it ever showed "Publishing…" (`busy`), and the page's last errors (`problems`).
  The next stop names which of the two it is.

## 2026-10-30 13:04 and 13:10: Publish passes alone, twice (after the Studio sweep's commits)

`check:app` on nodegx-studio be3a9c5, run alone under HEAVY.lock (load 3.2–4.9): every Publish row green both times.
The first run failed one other line, "Close puts it away" (the import report's Close, clicked by position, left the
panel up); the second run 67/67. Once, not chased: if it comes back, read what sits over `#reportclose` at the click.

## 2026-11-01: green in the chain, closed as not reproduced

`check:app` **67/67** at nodegx-studio bd4fff1, run in one chain straight after `check:data`, `check:timeline`, `check:hosted`, the functions and automations gates and the importer (the condition the 10-30 notes said fitted every stop), each step niced, load 3–5. Every Publish row green. Closed as `wontfix` (not reproduced). The instrumentation from a3a02fd stays: if 3b stops again it reports `samePage`, `busy` and the page's errors, and the row should be reopened with them.

## 2026-11-02 00:00–00:40: REOPENED. It reproduces every time, and the press is the part that fails

The closure above lasted one gate run. From 23:53 on 2026-11-01, `check:app` stopped at 3b **seven times in seven runs**
(36/40; 63/67 once the gate calls Publish directly, below), each run alone, niced, load about 2. The bisect shows it is
not tonight's code: it fails the same way with s35's committed `studio.html` (bd4fff1), with the previous
`vendor/backend.cjs`, and with the previous `vendor/specs.js`. The only green run was the first chain at about 23:30.

The new instrumentation (nodegx-studio `app/check.mjs` 3b, uncommitted at the time of writing) says:
- **the press lands on the button.** It presses only where `elementFromPoint` is `#publishbtn`
  (`point {1392,22}`, `landed: "publishbtn"`).
- **the button is ready.** It is wired (`onclick` set, `window.studio.publish` present), not disabled, and reads
  "Publish". The page is still the one that pressed it.
- **nothing starts.** It never reads "Publishing…" and `__ob.published` never arrives (120 s). `publishApp` sets that
  text synchronously, so the click handler did not run.
- **Publish itself works.** `window.__ob.publish()` called from the page right after answers in full: 16 files, the
  backend question asked, every sentence said.
- **the preview is down in the same runs.** Studio's status reads "The app is not shown: Timed out after 20000 ms
  waiting for the app to draw." The gate never read the status in the green runs, so it is not known whether this is new.

So the CDP mouse press at the button's centre does not become a click on it, while a script call works. Next: log
`pointerdown`/`mousedown`/`click` on `document` (capture) around the press, to see which event stops and where. Then
check the preview timeout against a green run. Whether a person's real click is affected is **not measured**.

## Cause found 2026-11-02 00:45: the Mac's screen was locked

`ioreg -n Root -d1` read `IOConsoleLocked = true`. On a locked console every window is occluded: Electron draws no frames (hence "Timed out … waiting for the app to draw") and a CDP mouse press reaches no element. A capture listener on `document` logged **no** pointerdown, mousedown or click for the press, while scripts still ran (the direct `__ob.publish()` answered in full). That explains each observation above. The earlier stops read as "load" or "after other gates" fit runs made while the screen was locked; the green ones fit an unlocked screen. Not a Studio defect: nobody can press a locked screen. **Fixed in the gate:** `app/check.mjs` reads `IOConsoleLocked` first and stops with that reason (`STUDIO_CHECK_LOCKED_OK=1` overrides), and 3b keeps its press diagnostics. To confirm: `check:app` with the screen unlocked (not possible tonight).
