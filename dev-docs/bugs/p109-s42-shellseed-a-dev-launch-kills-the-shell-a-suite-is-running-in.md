---
id: P109-S42-SHELLSEED
title: A dev launch's sweep kills the shell a suite is running in when that shell cd'd into a package the sweep names
status: fixed
commit: d20dd013f
phase: P109
task: ISL-047
severity: medium
area: devtools / dev stack sweep (`scripts/devtools/dev-processes.js` `protectedProcesses`)
found: P109 s42, 2026-10-11, while building P78-DBT-DEVSWEEP — `dev:stop -- --list` listed the shell wrapping this session's own full nodegx-backend run as a target
regression: packages/noodl-editor/tests-unit/dev-tools/a-sweep-spares-a-hand-started-backend.test.ts "a launch sweep spares the shell a suite is running in"
---

An agent runs a suite as `zsh -c "… cd <checkout>/packages/nodegx-backend && npx jest …"`. That shell's command
line holds the checkout path and `nodegx-backend`, so rule 1 makes it a seed. The suite under it is shielded
(`NEVER_SWEEP` matches `npm exec jest`), but the shield climbs upwards only through launcher names
(`launcherAncestors`), so the shell itself stayed a target. A peer's `npm run dev` would SIGTERM it: the suite
carries on, and whatever the shell was to do after it is lost (its exit line, a summary, a `--json` reader).

**Measured:** at s42 `dev:stop -- --list` named pid 54116, the zsh around this session's own
`npm exec jest -w 3 … --outputFile …/full2.json`. The spec's shell arm is red with HEAD's sweep.

**Fixed:** the immediate parent of every protected process is shielded with it. One level only: the parent owns the
suite's reading, and a further climb would reach the session itself.
