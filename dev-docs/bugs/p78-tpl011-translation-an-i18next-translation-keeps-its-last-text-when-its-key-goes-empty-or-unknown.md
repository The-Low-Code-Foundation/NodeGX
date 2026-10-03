---
id: P78-TPL011-TRANSLATION
title: An i18next Translation node keeps showing its last text when its key goes empty or names nothing
status: fixed
commit: a36d28e90
regression: packages/noodl-runtime/test/isl-007-i18next-module.test.js
severity: medium
area: library / i18next Translation (i18next-translation module)
found: P78 TPL-011 s3 (V1-2), 2026-09-26
evidence: dev-docs/tasks/phase-78-the-templates/TPL-011-THE-EVENING-JOURNAL.md §3c "V1-2 done (s3)", "Found building it" (first bullet)
---

A `Translation` whose `Key` is cleared, or changed to a key the bundle does not hold, keeps showing the text of its
previous key. In Nightbook, *No question tonight* left the last question on screen. Any message an app clears by
emptying its key stays visible.

**Where:** `library/modules/i18next-translation/project/noodl_modules/i18next-noodl/index.js` (minified), the
`Translation` node's `translate()`. It does `if (z.exists(e)) { … this.setOutputs({Translation: t}) }` and has no
else, so a key that does not exist (the empty key included) never updates the output. Read at HEAD on 2026-10-01.

**Reproduce:** a Translation wired to a Text, with Key `a` (present) and then Key `''`. The Text still shows `a`'s
string. Nightbook works around it in `UI/Say`, which draws nothing for no key.

**Proposed:** set `Translation` to `''` when the key is empty, and decide what an unknown key shows (`''`, or the
key with a warning, as i18next itself would). Rebuild the module and bump its version. Small.

**Fixed (P109 s8, 2026-10-03, ISL-007; module 1.1.0 rebuilt from its recovered sources):** an emptied key shows `''`
with no warning; a key no bundle holds shows `''` and the node warns, naming it (`No word "common:x" in fr or its
fallback`). Measured in the runtime spec: the module as imported keeps `the island & <sea>` after its key goes unknown
or empty (both cases red), the rebuilt one shows nothing. Nightbook's `UI/Say` workaround can go when that template
next copies the module (it carries its own copy of 1.0.4).
