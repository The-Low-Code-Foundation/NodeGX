# OWN-002 — The spec in a page

**Opened 2026-10-02.** **Depends on nothing.**
**Status: 📋 not started.**

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

*(empty)*
