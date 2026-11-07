---
id: BETA-S2-GAMEMENUSCLAIM
title: "The kit's first-project skill says NodeGX \"can't yet place a moving world and its menus in one app\"; once @nodegx/export 0.2.6 is out, `--target html --component` puts a NodeGX menu into the world's own plain page"
status: needs-ruling
severity: low
area: kit text (`packages/create-nodegx/profiles/core/skills/nodegx-first-project/SKILL.md`, "Which parts are NodeGX")
found: Beta sprint S2, 2026-11-07, reading the kit for where the off-ramp is named
evidence: "the skill's sentence beside P134 HTX-006 (done 2026-11-04: a NodeGX settings menu exported with `--component` runs inside a three.js page, the page's own files byte-identical before and after a re-export); `--component` measured from the packed 0.2.6 tarball outside the checkout: 9 files and nodegx-export.json written beside a page of the person's own, the page untouched, a second export 0 written, 9 unchanged"
---

The skill tells an agent, for a game whose world moves on its own: "NodeGX can't yet place a moving world and its
menus in one app. If they want to change the menus themselves, tell them so." With `@nodegx/export` 0.2.6 the menus
can be a NodeGX component (where the person changes them) that `npx @nodegx/export export --target html --component
<name> <the app's folder> <the world's folder>` writes into the world's own folder, and the world's page mounts it.
The two still are not one NodeGX app (the world is plain code), so the sentence is not simply wrong; whether the kit
should offer this route, and in which words, is a copy ruling. Not changed here: the 0.2.6 publish comes first, and the
Beta sprint's S3 is editing the kit's skills at the same time.
