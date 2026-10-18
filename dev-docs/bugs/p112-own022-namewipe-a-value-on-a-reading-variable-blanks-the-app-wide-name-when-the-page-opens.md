---
id: P112-OWN022-NAMEWIPE
title: "Large 4 silenced render_report's dead-placeholder warning by giving the Game page's reading `playerName` Variable a `value: \"\"` — which blanks the app-wide name every time the page opens, so the name the player typed never shows; its checklist line had been proven before the change and was never driven again"
status: open
phase: P112
task: OWN-022
severity: medium
area: kit — teaching what a `value` on a Variable node does (it writes the app-wide variable when the component mounts), and re-driving a proven line after a later change to the nodes it read
found: P112 OWN-022 s1 2026-10-18 (HB1, Mistral Large 4 in Vibe on npm 0.2.2, building Le Chonk's Fish Heist)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-022-LE-CHONK-PLAYS.md §7; own-022/verify-rig.mjs (the name is missing above the board until rig-heist.mjs drops the parameter, then shows)
kit: core
---

Home wires the name field's `onTextChanged` into a `playerName` Variable — correct, and Large 4's drive read
`playerName = "Ada"` there. Pages/Game reads the same app-wide variable through its own Variable node (`playerNameVar`)
into the name Text. Later in the sitting, render_report flagged `dead-placeholder-text` (opened directly at /game, the name
Text shows the default "Text" because `playerName` is undefined); Large 4 fixed it with
`update_node playerNameVar parameters.value = ""`. A `value` on a Variable node is a write: when Pages/Game mounts it sets
`playerName` to "", so every player's name is wiped on the way into the game. The checklist's "the name shows above the
board" had been proven before the change, and nothing re-drove it.

Measured 2026-10-18 on the built copy and a copy with only that parameter removed (`rig-heist.mjs --fair`): before, the
page reads "Moves: 0 Won 0 · Lost 0" with no name; after, "Tester Moves: 0 …". OWN-022's graph cheat reads the name, so the
lab copies all carry the one-parameter fix (recorded as the lab fix in rig-heist.mjs).

Two lessons owed: (1) the node's own description, or the dead-placeholder diagnostic's suggestion, should say that a
reading Variable must not carry a `value` (give the Text a fallback instead); (2) the kit's checklist step: a line proven
before a later change to a node it read is re-driven before "# Done".
