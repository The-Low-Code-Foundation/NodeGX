---
id: P78-TPL011-TRANSLATION
title: An i18next Translation node keeps showing its last text when its key goes empty or names nothing
status: open
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
