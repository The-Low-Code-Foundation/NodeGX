---
id: P112-OWN008-NPXPREVIEW
title: "`npx @nodegx/preview <app> --open`, the command every page gives a person to see their app, has answered \"could not determine executable to run\" since 0.2.0"
status: fixed
phase: P112
task: OWN-008
severity: high
area: "packaging / `@nodegx/preview` `package.json` `bin` (two bins since `2016dd48d`, OWN-016's `nodegx-deploy`); the command is printed by `create-nodegx` (its closing lines, README, `vibe/README.md`), the folder's CLAUDE.md / AGENTS.md, the editor skill, and this package's README"
found: P112 OWN-008, 2026-10-18 (the map stranger's question 5, then measured from the registry)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-008/map/REPORT.md (question 5); packages/noodl-preview/tests/own008-npx-runs-the-preview.test.ts
kit: preview
---

npx runs a package's only bin, or else the bin named after the package without its scope (`preview`).
`@nodegx/preview@0.1.0` had one bin (`noodl-preview`). 0.2.0 (2026-10-14) added `nodegx-deploy` for OWN-016, and
from then on npx couldn't choose:

```
$ npx -y @nodegx/preview@0.2.2 --help
npm error could not determine executable to run
```

(Measured 2026-10-18 in an empty folder; the registry's bin maps: 0.1.0 one bin, 0.2.0 / 0.2.1 / 0.2.2 two.) Every
person who ran `npm create nodegx` since 0.2.0 was told to see their app this way. The agents in OWN-019 and OWN-020
reached the preview through the server's tools, so no round showed it. The OWN-008 map stranger found it because
its editor needed the preview itself. It worked round it with the package's own `noodl-preview` bin.

**Fixed in the repo (2026-10-18):** a third bin, `preview`, runs the same file as `noodl-preview`. Graded on npm
itself (`tests/own008-npx-runs-the-preview.test.ts`): a stand-in package carrying the real bin map is packed and
run through `npx file:<tarball>`, and runs the preview. Its control, the same map without `preview` (0.2.2's),
answers "could not determine executable to run". **People get it on the next `@nodegx/preview` publish** (Richard,
R11). Until then the working command is `npx -p @nodegx/preview noodl-preview <app> --open`. The root
`package-lock.json` still lists two bins for the workspace. That doesn't affect `npm ci`, and it can follow at the
next lock refresh.
