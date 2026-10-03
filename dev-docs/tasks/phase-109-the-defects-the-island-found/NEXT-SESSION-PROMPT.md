# Next session — P109 session 12

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 11 (2026-10-03, on `cline-dev`, `b49434fcb`…`1671f7632`):** four rulings asked in one round and answered
in one click each (ISL-007 AC6 "Warn if app translates"; ISL-015 "Grow existing pages", "Advice + exception",
"Phrase check + 1 sample"), both tasks BUILT the same session. **6 of 25 closed** (no new closure: ISL-015 owes AC5,
ISL-007 owes AC4 in IW-010).

## Read first

1. ISL-015 §8 s11 (the gate, the T3 sample run in jsdom with React 19, the two sabotage arms).
2. ISL-007 §8 s11 (the population table, the rule's port set read from the catalog, the census probe's own mistake).
3. ISL-019 §8 s11 (AC7's newline byte: settled by ISL-018's rule, no ruling).
4. Bugs filed s11: `P109-S11-ARIALABELWORDS` (8 island screen-reader names stay English; → IW-010),
   `P109-S11-DBTPAGETITLES` (DBT's tab titles stay English), `P109-S11-NODATAATTRTYPES` (fixed: s6's field never
   reached the kit types; the drift gate had been red since).

## Do, in this order

1. **One worktree, one MCP `dist` build, two agent rounds** (the heavy job; announce it, wait for a peer's suite):
   build `noodl-mcp` dist in a worktree (`make-worktree.sh`; the primary's `src/cloud/bundleEntry.js` carries a
   peer's uncommitted edit), then (a) **ISL-015 AC5**, the stranger round: a fresh `claude -p --strict-mcp-config`
   with only the docs page and `create_node_kit`, asked to wrap a small imperative library with a token theme colour;
   deployed and driven (pixel of the token colour, an edit surviving three re-renders, a sibling outside the root
   unchanged, no wrapper Group); (b) **ISL-019 AC6** (Claude Code rebuilds one component exactly; `git status` clean).
   The same build makes `typed-word-not-translated` live for agents.
2. **ISL-019 AC7** once `packages/noodl-mcp/tests/cg003Components.ts` is committed by its peer (modified on 10-03):
   drop the pins, re-baseline the island's 407 newline bytes in the same commit, name it.
3. **ISL-009's export half**, only when `nodegx-export/src/emit/component.ts` is committed by P18.
4. **Round 3 questions**, mechanism first, plain words with what X is: ISL-016, ISL-017, ISL-021, ISL-008, ISL-010,
   ISL-018's open case, `P109-S8-ARRAYFILTERPATH` (re-read first: `a6f629a2e`, P107, made Array Filter/Map read a plain
   object's own fields — the nested-path half may still be open). Then the ISL-022 follow-ups and the s4 bugs.

## Decisions for Richard (not yours)

- Round 3 above. Pushing `cline-dev` is his call (CI meets `P109-S10-TYPECHECKMCP`, still exactly 8 errors on 10-03).

## Facts measured in session 11 that are not in a task file

- **The editor's `ComponentSaver` writes JSON with no trailing newline** (`:248`, `:359`), like the door. A template
  whose files end in `\n` was written by a pin, not by either.
- **A legacy `project.json` stores connections as `fromId/fromProperty/toId/toProperty`** (Tailr), the same field
  names as v2. A census that maps them to `targetId` reads every port as unwired (221 for 149).
- **React 19 + jsdom 26 resolve from the root `node_modules`** in `nodegx-node-kit-types`' jest (undeclared, hoisted):
  set `window`/`document` globals BEFORE requiring `react-dom/client` (it reads `canUseDOM` at load), and
  `IS_REACT_ACT_ENVIRONMENT`; `React.act` exists in 19.
- **Two of Richard's real projects (hsseq) carry the i18next add-on and place no Translation node.**
- A peer (opennoodl-14, P112) is working in `nodegx-node-spec` (browser entry, `world.ts`, `graph.ts`, `package.json`).
