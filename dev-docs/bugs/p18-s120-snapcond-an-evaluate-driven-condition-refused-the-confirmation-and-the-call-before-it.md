---
id: P18-S120-SNAPCOND
title: An exported app never showed a confirmation or a refusal made by an Evaluate-driven Condition, and dropped the call in front of it
status: fixed
severity: high
area: export / Condition
found: P18 session 119, 2026-10-16 (named as lane 6's next step); measured and fixed in session 120, EXP-011 §87
evidence: dev-docs/tasks/phase-18-code-export-v2/s120-snapcond/ (condprobe.out, census.ts, the drive's readings.json); packages/nodegx-export/tests/the-condition-remembers-its-answer.test.ts
commit: 71b0891e5
---

The shipped templates show "Thanks, your message has been sent" or "That message could not be sent" with a Condition
whose box is unticked: a call's Done or Failure sends it Evaluate, and its Is True goes into the line's Mounted. The
export refused every such Condition ("its value outputs are snapshots of the last Evaluate"), and with it the Cloud
Function and the Function in front of it. So the Site Builder's contact form, eight members-area pages and todo-list's
Sign in exported with a Send button that did nothing and no confirmation.

**Reach before the fix:** 36 such Conditions in 11 components of the shipped templates, 122 in the corpus.

**Fixed (EXP-011 §87):** each such Mounted or Visible is a boolean cell that starts false (the runtime hands it `null`
before the first Evaluate, over anything authored), and each Evaluate writes its answer in the chain that sends it. Two
Conditions on one element are last-pulse-wins, as in the runtime. 26 template nodes and 115 corpus nodes now export
that did not; none lost. Refused by name: a snapshot into anything but a Mounted or a Visible, an element not drawn,
an element also fed by something that is not such a Condition.

**Left, each a sender's own row:** 18 of the 36 still wait on what sends Evaluate (a Record's or a Log In's Failure
chain, an External Link's Done, a Function whose run is not attached).
