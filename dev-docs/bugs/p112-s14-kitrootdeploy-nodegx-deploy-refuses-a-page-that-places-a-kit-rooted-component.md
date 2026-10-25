---
id: P112-S14-KITROOTDEPLOY
title: "nodegx deploy refuses a page that places a kit-rooted component — \"draws nothing and cannot sit in the visual tree\" — since the one hierarchy rule (9da5979f9); GAM-014's spec is 5/5 red"
status: fixed
commit: (this session, the Beta sweep s5)
severity: high
area: editor / validation (`packages/noodl-editor/src/editor/src/validation/rules/invalidHierarchy.ts`, P107 NSP-021 s89 `9da5979f9`) as `nodegx deploy` runs it (`packages/noodl-preview/src/deploy.ts`)
found: P112 OWN-015 s14, 2026-10-12
regression: packages/noodl-preview/tests/gam-014-a-kit-node-draws-when-it-is-the-whole-component.test.ts
evidence: this file
---

`npx jest tests/gam-014-a-kit-node-draws-when-it-is-the-whole-component.test.ts` in `packages/noodl-preview`, after
`npm run build` there (the spec runs `dist/nodegx-deploy.cjs`, so a stale `dist/` hides this): **5 failed of 5**,
alone and in the full suite. The deploy refuses at its validation stage:

> `/#__page__/Home › placedFace: "/Kit/Face" (/Kit/Face) is inside "Home", but it draws nothing and cannot sit in the
> visual tree. Make it a root of the component (no parent).`

`/Kit/Face`'s only node is a kit node (`game-kit.*`) recorded as its visual root, which is the GAM-014 person
sentence: a kit node at the root of a component draws, and the component draws with it. The rule from `9da5979f9`
(*"where a node may sit in the tree has one rule"*, 2026-10-12 07:58) decides the component draws nothing,
presumably because the kit's node isn't in the library the validator sees, so it reads as not visual. The
instance-root half (P78-TPL011-INSTANCEROOT, `dad3a9c33`) fails in the same `beforeAll`, so the spec can't grade it either.

**Who it reaches:** any project whose pages place a component built on a kit node. That covers the game templates'
kits, and the OWN-015 playback node an agent writes with `create_node_kit`, if it's wrapped in a component. They
can't be deployed with `nodegx deploy`.

Not touched here: it's P107's rule. Found while checking that P112-S14-NOBACKEND's preview change left the suite as
it was. That change doesn't touch the deploy path, and the other 8 suites (63 specs) pass.

**Fixed (Beta sweep s5, 2026-10-25).** Re-measured first: still 5/5 red at HEAD on a fresh dist. The rule's typer
derived a component from the roots it could resolve, so a component whose one root is a kit node (never in the
validator's catalog, in deploy or in the editor's Problems panel) read as "draws nothing". It now answers such a root
the way the export does (`NodeGraphModel.isVisualRoot`, GAM-014): visual when the file's recorded `visualRoots` lists
it. `NormComponent.visualRoots` is carried by both loaders (`normalizeV2Component`, `fromLegacyProject`), only when a
list was recorded. A module's logic node, recorded nowhere, still draws nothing: nightbook's `Translation`-rooted
`/Data/Keep` and `/Data/Recent` keep the running editor's 26 + 26. (Treating every unresolved root as unknown was
tried first and lost 3 of them.)

**Graded.** GAM-014 5/5 (red 5/5 before), preview suite 16 suites 101/101 on a rebuilt dist. `tests-unit/nsp-021`
11/11 with two new cases (a recorded kit root inside a Group passes, an unrecorded module root beside it is still
refused; both loaders carry the list); the mutant without the fallback is red. Every editor spec reading the
validator, 19 suites 184/184; `noodl-mcp` tsc clean, its hierarchy/visualRoots specs 86/87 (the one red is
`own020CallToolStrip`'s wording, red at HEAD since 328f1dd1d, on OWN-026 FIX-05's list).
