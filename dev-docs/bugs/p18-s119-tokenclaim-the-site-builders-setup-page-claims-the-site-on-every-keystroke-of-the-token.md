---
id: P18-S119-TOKENCLAIM
title: The Site Builder's Setup page sends a claimSite request on every keystroke of the setup token, before the account exists
status: open
severity: high
area: templates / site-builder `/Pages/Setup` (run-on-value-change, NDA-017)
found: P18 session 119, 2026-10-16, measuring the Function-chain gap (lane 6)
evidence: dev-docs/tasks/phase-18-code-export-v2/s119-fnchain-measure/tokenprobe.js and tokenprobe.out (the runtime's own Function node, the template's body and box, in a corpus graph); packages/noodl-mcp/tests/sb005Components.ts `hold` (the body and its comment); site-builder.content.json `"runOnChange-in-token": true` (added by e4b86fe9d, DEF-007's settling)
---

`/Pages/Setup`'s Function "Hold the token until the account exists" is run by Sign Up's Done and fed by the
Setup token field. Its comment in `sb005Components.ts` says what it is for: *"The token is typed long before the
account is created, but an empty token must not be sent as a claim attempt … a request nobody meant to make is still
a request against the one door that mints an admin."* Its `go` signal calls the `claimSite` cloud function.

The shipped template ticks the token input's Run On Value Change box (`"runOnChange-in-token": true`, settled by
DEF-007 in e4b86fe9d). Since NDA-017 a ticked box re-runs a Function whether or not Run is wired
(`simplejavascript.ts`: *"Every value input is governed by its own checkbox now"*). So each keystroke runs the body,
the token is defined, and `go` calls `claimSite` with the token typed so far, before Sign Up has created the account.

**Measured on the runtime's own Function** (`tokenprobe.js`: the template's body, its box, a field typing "s", "se",
"set", then Sign Up's Done):

| box | claimSite calls |
|---|---|
| `true` (the template) | 4: "s", "se", "set", then "set" at Done |
| `false` | 1: "set" at Done |
| absent | 4 (absent means ticked) |

**What it should be:** the box unticked, so the Function runs only when Sign Up says the account exists. Check that
DEF-007's settling gate (`def038SettledTemplates.test.ts`) accepts the change: the settled value is what the
template states, and the template now states the opposite of its comment.

**Reach:** the shipped templates have 13 Functions that are Run-wired, fire a signal of their own, and also run on a
ticked input (`tickedrun.ts` over the 2 content templates and `templates/`). This is the only one fed by a typed
field into a cloud call. Two to read, not graded: members-area `Members/Standing` (run by a Cloud Function's Done and
ticked on that function's own output, so it may run twice per answer and fire its Member/Moderator signal twice);
marketplace `Admin/RateRow` "Keep what was typed" (run by the field's Text Changed and ticked on its Text, so it may
run twice per keystroke). The other ten re-read an id when the route changes, which looks deliberate.
