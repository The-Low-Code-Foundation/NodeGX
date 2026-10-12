---
id: P109-S8-I18NESCAPE
title: The i18next add-on shows a name with "&" or "<" in it as "&amp;" / "&lt;", and never says a word or a variable is missing
status: fixed
commit: a36d28e90
severity: medium
area: library / i18next Translation (library/modules/i18next-translation)
found: P78 TPL-011 s3 (the escaping, recorded there as a caveat); measured on a deployed page P109 s8, 2026-10-03
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-007-AN-APP-SPEAKS-TWO-LANGUAGES-WITHOUT-A-SCRIPT.md §8 s8
regression: packages/noodl-runtime/test/isl-007-i18next-module.test.js
---

A person types `Tom & <Jerry>` into a name field; a `Translation` of `Hello {{name}}` shows
**`Hello Tom &amp; &lt;Jerry&gt;`** on the deployed page, in both languages (measured with the module as imported,
v1.0.4, `drive-isl007-two-languages.js --control`). i18next escapes interpolated values for HTML by default, and a
Noodl Text renders text, so the escape is a double encoding. A `{{name}}` with nothing wired in became an empty string
with no warning, and `<html lang>` stayed `en` in French.

**Fix (module 1.1.0, rebuilt from its recovered sources):** `interpolation: { escapeValue: false }`; a variable with no
value and a word in no bundle each put a warning on the node naming the word (and the variable); `<html lang>` follows
the language. Spec: 5 cases, the imported module fails 4 of them. Drive: 16/16 on a deployed new project, control 5/5.
