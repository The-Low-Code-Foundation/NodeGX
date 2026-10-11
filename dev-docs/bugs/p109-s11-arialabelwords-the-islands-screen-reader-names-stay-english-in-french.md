---
id: P109-S11-ARIALABELWORDS
title: Eight screen-reader names on Olive's Island stay in English when the page is in French
status: fixed
commit: 822081831
phase: P109
task: ISL-037
severity: medium
area: templates / bot-garden (Olive's Island), kit `label` ports (garden-kit Garden + Divider, garden-3d-kit Garden3D)
regression: packages/noodl-mcp/tests/isl037AriaLabels.test.ts; scripts/devtools/drive-isl007-words.js (ARIA)
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

## s45 (2026-10-11): fixed in the garden's generator

IW-010 has not started (P108 has had no commit since 2026-10-04), so ISL-037 §6 keeps the row here.

Re-measured on a deployed garden at HEAD: `drive-isl007-words.js` gained an **ARIA** clause (each visible world and
divider's `aria-label`, read in EN then FR). Red: all 8 read stayed English ("The island", "The garden", the divider's
sentence, "My robot", and "The robot" on each of the four robot cards).

**Fix** (`cg003Content.ts`, `cg003Components.ts`; `templates/bot-garden` regenerated):
- four words in `IG006_WORDS`: `a11yIsland` (L’île), `a11yGarden` (Le jardin), `a11yMyRobot` (Mon robot),
  `a11yDivider` (Fais glisser pour élargir ou rétrécir les étapes);
- `Translate words` wired into the `label` of the Workshop's two worlds and its divider, My robot's world, and the
  island's two worlds (Island/World gains its own `Translate words` node, fed the words it already had);
- each card's drawing (Robot/Card, Profiles/Card) is named by the robot's own name, which needs no translation and
  says more than "the robot".

After: the ARIA clause green (8 read: L’île; Le jardin and the divider; Mon robot, Pip, Cobble, Poche, Écho).
`isl037AriaLabels.test.ts` reads every kit world and divider in the generator as wired, with an arm (the s45 wires taken
out: 8 typed English again). Two `cg003Template` pins gained the new wire (the island world's inputs, and the
Workshop world's ports, where Garden 3D still takes exactly Garden's wires).
