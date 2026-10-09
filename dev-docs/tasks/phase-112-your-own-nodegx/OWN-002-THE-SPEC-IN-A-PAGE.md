# OWN-002 — The spec in a page

**Opened 2026-10-02.** **Depends on nothing.**
**Status: 🟢 built, s1 (2026-10-03). Gates in §6.**
**Model:** Built. A follow-up (the size budget, a new spec in the browser check) is Opus work. At the start of a session on this task, and again if the work changes kind, say which model you are running on and whether this line says Richard should switch (README §0.2).

## 1. The person sentence

> **A page imports the node specs and runs a node, with no bundler tricks, and knows how big that is.**

## 2. Why

README §1 reading 2. The prototype reused `@nodegx/node-spec` unchanged but had to bundle from `src/interpreter` and
`src/nodes` directly, alias Node's `crypto` to a stub, and define away `process.env.TZ`, because:

- `src/index.ts` re-exports `graph.ts`, which imports `fs` and `path` (for `loadGraphScenarios`);
- `world.ts` imports Node's `crypto` for `digestBytes` (the Hash node);
- the package's `main` is `src/index.ts`: there is no build, so an outsider needs TypeScript and a bundler set up the
  way this repo has it.

## 3. What to build

1. **Two entries.** `@nodegx/node-spec` (browser-safe: spec, interpreter, world, registry, nodes, canonical, coerce,
   trace) and `@nodegx/node-spec/node` (adds the scenario loaders and the runner's file reading). The split is by what
   touches the file system, nothing else.
2. **Web Crypto for the Hash node.** `world.ts` has a synchronous `digestBytes` (Node's `crypto`) and an asynchronous
   `digest` inside `installWorld`; Web Crypto (`crypto.subtle`) is asynchronous only. Read which one the Hash spec's
   reducers call before choosing; if it is the synchronous one, the spec's world effect has to become a `pending`
   outcome the way HTTP Request's is. The Hash spec's conformance must not move.
3. **A build.** ESM plus type declarations, emitted to `dist/`; `main`/`exports` point there; the source stays the
   source of truth. Memory: *`tsc -p` emits in place*. Emit to `dist/` explicitly and gitignore it.
4. **A size number.** The minified browser entry with every spec, and without `fast-xml-parser` (the three XML and feed
   parsers as a lazy import, if that is cheap). The prototype measured 418 KB with everything.

## 4. Acceptance criteria

1. A page that imports the browser entry, mounts Counter, signals Increase and settles, works in headless Chrome with
   no aliases, no defines and no stubs.
2. The package's own suite and the conformance runs (runtime target, every specced node) are unchanged by name.
3. The size is recorded in the package README and in §6, with what dominates it.
4. The prototype builds against the browser entry, and `src/crypto-stub.js` is deleted.

## 5. Watch for

- `installTimeZone` writes `process.env.TZ` in Node (memory: *jest's `process.env` is a copy*). In a page there is no
  `TZ`; the world's time-zone seam must take the zone from the script, not from the process.
- A peer is adding specs while you work (76 → 78 during scoping). Re-run the conformance gate at the end, not only at
  the start.

## 6. Built

**s1, 2026-10-03, on `fedccd7d0`+.**

1. **Two entries, split by what touches the file system** (§3.1). `src/browser.ts` is `@nodegx/node-spec`: everything
   but the file loaders. `src/index.ts` is `@nodegx/node-spec/node`: `browser` plus `src/graph-files.ts`
   (`loadGraphScenarios`, `GRAPH_SCENARIOS_DIR`) and `src/runner/scenario-files.ts` (`loadScenarios`, `writeReplay`,
   `SCENARIOS_DIR`, `scenarioFile`). The validation halves stayed where they were, as `reviveGraphScenarios(parsed,
   file)` and `reviveScenarios(parsed, type, file)`, so a page can turn fetched JSON into scenarios. `runConformance`
   reads its default scenarios through `scenarioIO`, a two-function registry the Node entry fills on import and the
   browser entry leaves to say "pass `options.scenarios`". **Every in-repo importer is untouched**: they import
   `src/index.ts` by path, which is the Node entry.
2. **No Node `crypto`** (§3.2): `src/sha2.ts`, SHA-256/384/512 with the constants derived from the primes at load
   (nothing typed), graded by `tests/sha2.test.ts` against Node's `crypto` on every length 0–300 and a 100 KB message.
   `digestBytes` is unchanged in shape (synchronous), so the Hash spec and its conformance did not move; the "pending
   outcome" branch of §3.2 was not needed. Also gone: `import { File } from 'buffer'` (two places), which a browser
   bundler resolved to a 20 KB polyfill only because one happened to be installed; `src/host-file.ts` takes the host's
   global (Node ≥ 20; the repo requires 22). `schema.ts`'s `require()` became a JSON import. The browser bundle now has
   **no `node_modules` input at all** (esbuild metafile), `fast-xml-parser` being external.
3. **A build** (§3.3): `build.mjs` (esbuild, the `@nodegx/core` pattern): `dist/index.mjs` + `dist/index.cjs`
   (browser-safe, platform-neutral), `dist/node.cjs` (Node; finds `scenarios/` from `__dirname`), declarations from
   `tsconfig.build.json` into `dist/types/`. `package.json` gained `exports` (`.`, `./node`), `files`, `sideEffects`,
   and the scripts `build`, `size`, `browser-check`; root scripts `build:node-spec`, `size:node-spec`,
   `browser-check:node-spec`. `dist/` is gitignored by the root rule. **The declarations' `rootDir` is `packages/`**
   because the specs import `@noodl/backend-contract`'s translators by relative path (`record-match.ts`,
   `query-records.ts`): the package is not standalone, it carries a 30 KB slice of the contract. Named in the README;
   when R2 publishes, that is a real dependency to declare.
4. **The size** (§3.4, AC3): `scripts/bundle-size.mjs`: **520.2 KB minified / 147.6 KB gzipped** without the parser,
   555.1 / 158.2 with it (2026-10-03, 86 specs). Specs 65% (1.1 KB gzipped each), world 5%, runner 5%, interpreter 4%,
   schema 2%. Budget 240 KB gzipped without the parser, from the arithmetic for the full vocabulary. The lazy import
   of the parser was not done: the XML and feed specs parse synchronously inside a reducer, so it is not cheap.
5. **AC1**: `scripts/browser-check.mjs` bundles the browser entry with no alias, define or stub, mounts Counter
   (Increase → `currentCount` 1) and Hash (`abc` → the standard digest) in headless Chrome: **PASS, 86 specs**.
6. **AC4**: the prototype imports `src/browser.ts`; `build.sh` lost `--alias:crypto` and `--define:process.env.TZ`;
   `src/crypto-stub.js` deleted; rebuilt (`dist/orbit.html`, 621 KB) and re-driven in headless Chrome: `#selftest`
   0 / 3 with the three reasons, `#demo` 3 / 3.
7. **AC2, the gates**: `typecheck:node-spec` clean; the package suite **840 passed, 17 skipped, 1 failed → the
   stranger hash gate on `src/world.ts`**, which guards the strangers' suite against change and fails on any edit to
   that file; its docblock's re-record step was run (the digest moved implementation, not bytes, as sha2.test.ts
   proves). **Runtime side:** `test/node-spec/{graph,runtime-target}.test.ts` 102 passed; `conformance.test.ts` **91 passed, 0 failed (457 s)**, every node CONFORMS, Hash and Open File Picker among them; `nodegx-export` node-spec tests 12 passed. One trap on the way: the runtime compiles this package's SOURCE under its own tsconfig, below ES2020, so the first SHA-2 (BigInt) was a red runtime suite while every package gate was green; sha2.ts is 32-bit for that reason.
