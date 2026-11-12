---
id: P112-OWN008-AUDIT
title: "Installing the kit reports six npm audit advisories (three high), through `chokidar` in `@nodegx/preview` and `fast-xml-parser` in `@nodegx/node-spec`"
status: fixed
commit: 0d822ff67
regression: packages/nodegx-export/tests/the-same-graph-in-swift-s9.test.ts "A1 the constant is the installed package read now, at the version the web export pins: a different package turns this red"
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

**Measured 2026-10-26, a fresh install from the registry** (`npm i @nodegx/mcp @nodegx/preview @nodegx/node-spec
@nodegx/project-contract` = 0.2.6 / 0.2.6 / 0.2.0 / 0.2.1, then `npm audit --json`): **3 moderate, 0 high**, and all
three are ONE advisory, GHSA-gh4j-gqv2-49f6 "fast-xml-parser XMLBuilder: XML Comment and CDATA Injection via Unescaped
Delimiters" (`<5.7.0`), counted at `fast-xml-parser`, `@nodegx/node-spec` and `@nodegx/project-contract`. The `chokidar`
3 → `braces` highs are gone without a change here: a fresh resolve takes a patched `braces`. So the work is
`fast-xml-parser` only. It is pinned to 4.5.7 on purpose in four places that must move together: `noodl-runtime/src/xml.ts`
(the XML node), `nodegx-node-spec/src/nodes/xml.ts` (its spec; scenarios pin the parse shape), `nodegx-export`
`PARSE_DEPENDENCIES` (the pin every exported app's package.json carries, so an exported app's own `npm audit` says the
same), and the Swift export's carried copy (`emit/swift/client.ts` `FXP_JS`, lane 4, paused).

**Fixed 2026-10-26 (the Beta sweep s11): `fast-xml-parser` 4.5.7 → 5.11.2 in all four places together.** Runtime,
node-spec and editor `^5.11.2`; the export's `PARSE_DEPENDENCIES` `5.11.2`; the Swift export's carried copy
regenerated from 5.x's own parser-only build (`lib/fxparser.min.js`: 5.x replaced the loose CommonJS files the old
helper walked with ES modules, and exports no `./package.json`). Measured before moving:
- **Same answers.** Over the runtime's options (both prefixes, trim on and off, Always Array empty and set) and
  31 documents (the spec's examples, the fed-001 feeds and XML fixtures, entity and namespace edge cases), 240 of 248
  results are identical. The 8 that differ are one document kind: 5.x expands `&hellip;`, 4.x left it as written.
- **One bug fixed on the way**, filed as BETA-S11-ENTITYCAP: 4.5.7 refused any document with more than 1,000
  escaped characters, so a feed of about 150 posts.
- **Browser cost**: the prod viewer bundle (webpack, built twice into a scratch folder, 4.5.7 aliased in for the
  second) 449,707 → 463,492 bytes gzipped, +13.8 KB. The parser alone (esbuild) 11 → 21 KB gzipped, inside FED-001
  AC5's 50 KB. node-spec's own size gate was already over before this (P107-SIZE, on the bundle without the parser).
- **Done-condition, measured without publishing:** `@nodegx/node-spec` packed from this tree, installed fresh with
  `@nodegx/mcp@0.2.6`, `@nodegx/preview@0.2.6` and `@nodegx/project-contract@0.2.1` from the registry: `npm audit`
  **found 0 vulnerabilities**. 🔴 It reaches people only once node-spec is published at a NEW version: the
  registry's 0.2.0 still depends on `^4.5.7`, and project-contract 0.2.1 asks for `^0.2.0`.

