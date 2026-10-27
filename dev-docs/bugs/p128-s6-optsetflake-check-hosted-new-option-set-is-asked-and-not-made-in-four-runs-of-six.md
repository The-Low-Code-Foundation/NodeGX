---
id: P128-S6-OPTSETFLAKE
title: check:hosted's "New option set" (P125-MUDDY-NATIVEDIALOG's own check) read {"asked":true,"made":false} in four runs of six on one tree, with and without this session's change, and passed in the other two
status: fixed
severity: low
area: "nodegx-studio `editor/hosted-check.mjs` (the NATIVEDIALOG section: `answer('Priorities')`, then `until(#optmain .bar button, 8000)` and Static Data on disk); `editor/studio.html` `askName` and `#newoptset`"
found: Beta sweep s22 (P128 S6), 2026-10-27, running check:hosted after STU-084
evidence: "MEASURED on nodegx-studio b6d0331 + the STU-084 working tree, load average 3–6: run 1 PASS 25/25; runs 2–5 FAIL at New option set {asked:true, made:false} (its two follow-on checks skipped), two of them with the fake host's new `message` capability removed (so not that); run 6 PASS 27/27. Every other hosted check green in every run. Two instrumented copies of the gate died earlier still (a null `.click` after the map section), as did HEAD's gate run from a `git archive` copy: copies of this repo are not a clean control. Not read: whether the field closed before Enter (askName's `gone` observer, a click outside) or the create ran and the 8 s wait missed it."
owner: P128 Beta round, Track A (fixed in the gate, nodegx-studio decabe3)
---

What a person sees: nothing measured. The name field was shown each time (`asked: true`); the set was not made within
the gate's 8 seconds. It may be the gate's wait on a loaded machine, or `askName` closing itself before Enter inside
the sandboxed frame. The next session that runs check:hosted reads the toast and the registry at that step (an
instrumented line beside the `ok`) before calling it either.

**Measured and fixed, P128 Beta round Track A (2026-10-27).** The gate now records what the panel showed when the
check misses. It missed in two of five runs on 62dd153's tree; the miss (`hosted-5`) read: the field closed, the toast
*"Priorities is an option set: a component the page loads as plain JSON"*, the list *"Priorities · 0 option(s)"*, the
set's own page drawn. So the set was made every time and Studio said so; the gate read
`components/Option sets/Priorities/nodes.json` the moment the page drew, before Studio's save (`persist()`, after the
draw) had landed. Not a product defect. The gate now waits for the file (up to 8 s, as `check:app` 2c already did:
*"the panel draws before the save lands"*). `check:hosted` 32/32 on the next run (nodegx-studio decabe3). One green run
after the fix is one; the next session that sees it red reads the `seen` line first.
