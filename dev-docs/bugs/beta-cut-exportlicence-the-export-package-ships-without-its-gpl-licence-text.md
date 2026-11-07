---
id: BETA-CUT-EXPORTLICENCE
title: "`@nodegx/export` says `GPL-3.0` and its tarball carries no licence text (0.2.5 on npm, and 0.2.6 as first packed for the Beta cut): its folder has no LICENSE file"
status: fixed
commit: 1abfd814e
severity: low
area: packaging / licences (`packages/nodegx-export`)
found: the Beta cut, 2026-11-07, running `node scripts/own/publishable.js` over every package the cut ships (its default list leaves `@nodegx/export` out, so no earlier cut ran it there)
evidence: "publishable.js packages/nodegx-export: '@nodegx/export is GPL-3.0 and its folder has no LICENSE file: the licence text must ship with it'; `tar -tzf nodegx-export-0.2.5.tgz` (the published one) lists no LICENSE"
---

GPL-3.0 §4 asks that a copy of the licence go with every copy of the program. `@nodegx/mcp`, `@nodegx/preview`,
`create-nodegx` and `@nodegx/backend` each carry the GPL's text as `LICENSE`; `@nodegx/export` names the licence in its
`package.json` and ships no text. npm packs a root `LICENSE` whatever `files` says, so the fix is the file.

`scripts/own/publishable.js`'s default list (`KIT`) does not hold `packages/nodegx-export` or
`packages/nodegx-backend-npm`, so a cut that runs it with no arguments does not see either.

**Fixed in the Beta cut (1abfd814e):** `packages/nodegx-export/LICENSE` (the GPL-3.0 text, as `@nodegx/mcp` ships it);
the 0.2.6 tarball now holds it (53 files; every other file byte-identical to the one graded), and `publishable.js`'s
default list holds `packages/nodegx-export` and `packages/nodegx-backend-npm`. 0.2.5 on npm stays as it is.
