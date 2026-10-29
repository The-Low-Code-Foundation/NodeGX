---
id: P123-STU-HIDDENPILL
title: Studio drew header pills it had hidden ("Import report" on an app never imported), and check:app passed on the attribute
status: fixed
commit: nodegx-studio dfa84e7
severity: low
area: nodegx-studio `editor/studio.html` header CSS (`header .status { display: flex }` after `button[hidden]`); `app/check.mjs`
found: STU-090, building Swapshop in Studio (opennoodl-33), 2026-10-29
evidence: a blank app showed "● Import report" in the header; in the page `#reportpill.hidden === true` and its computed display was `flex`
---

`header .status` and `button[hidden]` have the same specificity and the status rule comes later, so `display: flex`
won over `hidden` for every status pill. `check:app` asserted "a project with no import report shows … no button" by
reading `.hidden`, which was true while the button was on screen: a gate on the attribute, not on what is drawn. Fixed
with `header .status[hidden] { display: none }`, and the gate now reads the computed display too.
