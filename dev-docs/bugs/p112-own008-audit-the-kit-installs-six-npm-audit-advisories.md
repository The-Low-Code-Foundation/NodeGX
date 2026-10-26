---
id: P112-OWN008-AUDIT
title: "Installing the kit reports six npm audit advisories (three high), through `chokidar` in `@nodegx/preview` and `fast-xml-parser` in `@nodegx/node-spec`"
status: open
phase: P112
task: OWN-008
severity: low
area: "`@nodegx/preview` (`chokidar@^3`, which pulls `braces`), `@nodegx/node-spec` (`fast-xml-parser@^4`)"
found: P112 OWN-008, 2026-10-18 (the strangers' reports)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-008/blocks/REPORT.md (question 16)
kit: preview
---

`npm audit` in the blocks stranger's editor folder, with the kit from the registry: 6 advisories (3 moderate, 3
high), all through the kit's dependencies. The editors bind to 127.0.0.1, so none is reachable from outside here. A
person's `npm install` prints them all the same.

**Fix shape:** move `chokidar` to 4 (no `braces`) and `fast-xml-parser` to its current major. Re-run `npm audit` on a
fresh install of the four kit packages.

**Ruled by Richard, 2026-10-26: remove the warnings** — "I want to have as much credibility as possible from the
outset". Asked against the recommendation to stay on fast-xml-parser 4 (the advisory is in `XMLBuilder`, never called).
So: `chokidar` 3 → 4 (latest 6.0.0) and `fast-xml-parser` off 4.x (5.11.2 measured 2026-10-26: six dependencies, 1.3 MB
unpacked), in `nodegx-node-spec`, `noodl-runtime` and `noodl-editor`, and the pin exported apps carry. Before it lands,
measure what 5.x adds to the runtime's **browser bundle** (unpacked size is not that) against P96 R1's budget, and ask
whether `@nodegx/node-spec` needs the parser at all. Done = `npm audit` on a fresh install of the kit packages reads 0.
Lockfile: the Mac-lockfile recipe, in a session that owns it.
