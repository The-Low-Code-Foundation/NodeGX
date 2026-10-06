---
id: P109-S11-ARIALABELWORDS
title: Eight screen-reader names on Olive's Island stay in English when the page is in French
status: scheduled
phase: P109
task: ISL-037
severity: medium
area: templates / bot-garden (Olive's Island), kit `label` ports (garden-kit Garden + Divider, garden-3d-kit Garden3D)
found: P109 ISL-007 s11, 2026-10-03 (classifying the texts that did not switch for AC6's question)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-007-AN-APP-SPEAKS-TWO-LANGUAGES-WITHOUT-A-SCRIPT.md §8 s11
---

A person using a screen reader on the French island hears "The island", "The garden", "My robot", "Her robot",
"The robot" and "Drag to make the steps wider or narrower" in English. Each is typed into a kit node's `label`
parameter with no wire into it, and the kits put `label` into the element's `aria-label` (garden-kit Garden:
`'aria-label': props.label || 'garden'`; Divider: `props.label || 'Drag to resize'`; garden-3d-kit Garden3D: the same
as Garden). Every other word on those nodes is translated, by the kit itself (`word(…, lang, …)`) or by a wire from
`Logic/Translate words`.

**Where, at `a6f629a2e`:** `Island/World` Garden and Garden3D ("The island"), `Workshop/Play` Garden and Garden3D
("The garden") and Divider, `Pages/My robot` Garden, `Profiles/Card` Garden ("Her robot"), `Robot/Card` Garden.

**Why no drive saw it:** `drive-isl007-words.js` (ISL-007 AC1) reads visible text nodes only; an `aria-label` is not
one. Its "288 of 334 change, every unchanged one is a name, a symbol or a band/language button" is true of what it read.

**Reproduce:** the graph census in ISL-007 §8 s11 (43 typed `text`/`label`/`placeholder` literals with a letter, 31 of
them overridden by a wire, 12 not: 4 language names, correct to stay, and these 8). On a deployed page:
`document.querySelector('.gd-world')?.getAttribute('aria-label')` after pressing FR.

**Proposed:** wire each `label` from `Translate words` as the visible words are (8 rows in `Data/Words`), or carry it
into P108 IW-010, the island's rebuild on the translation add-on, which re-does every word anyway.
