# Phase 125 — next session (lane 3 on the BOARD)

Read `README.md` here, then the task you take.

## FIRST: finish the puppy-run fixes (s11, 2026-10-23 late)

Richard's puppy landing page in Claude Desktop (Sonnet 5.5) found six things. Built and committed, NOT pushed, NOT in
his Desktop yet:
- **OpenNoodl 58f973f95** — `create_plan` refuses > `STUDIO_BURST` (3) component ops while `studioFor(dir)` is up, and
  says the order (page shell first, then one section created AND placed per apply); `open_studio` says once per turn,
  first, never to finish it. Gate `packages/noodl-mcp/tests/p125PuppyBursts.test.ts` 7/7. Bugs P125-PUPPY-ONEAPPLY,
  P125-PUPPY-TWOPANELS (both open until seen in Desktop). CCN-005 has the s11 section.
- **nodegx-studio 2185e9c** — hover inside copies, a reusable edited ON its page (`host`), the tree unfolded in place,
  the header's "⋯". `check:editor` 203/203 (control on f1cc559 also 203/203). SCOPE.md "Changed (P125 …)" under STU-015.
  Bugs P123-STU-REUSABLENAV and -TOPBAROVERFLOW fixed (OpenNoodl b21eeb342); P123-STU031-COPYBOX worked around in
  Studio, the kit's `elementsOf` fix still open.

To finish, in order:
1. **Rebuild the `noodl-mcp` dist from a clean worktree** at the current HEAD (recipe below; never the primary tree),
   copy `kit-extract.cjs`, and tell Richard to fully quit/reopen Claude Desktop and start a NEW conversation.
2. **Ask Richard before pushing** OpenNoodl and nodegx-studio.
3. **P125-PUPPY-TWOPANELS part 2, the "port error" in the second panel:** not reproduced (the project loads clean in a
   browser; Desktop's logs say nothing). Get his words or screenshot. Then reproduce with two panels at once: the fake
   host (`tools-fake-host.mjs`) with two iframes on the same proxy/Studio. Note s11 saw TWO servers start in Desktop
   (`claude-ai` proxy 53272, `local-agent-mode-nodegx` 55849) and ONE `resources/read` — a panel built against one
   server's proxy port while the other server answers is a candidate.
4. **Richard's re-run** (his sitting): the puppy page again. Read `~/Library/Logs/Claude/mcp-server-nodegx.log` and
   the project's file mtimes after: writes should arrive section by section, one panel per turn. If the model fights
   the refusal or stages 3-op plans that never place anything, that is CCN-005's next cut.
5. Small leftovers: after Esc up to a For Each (a copy's rows), nothing is boxed (the For Each draws no element of its
   own — box its rows); `create_component` calls are not budgeted; Studio's `check:editor` step "Set a custom state in a
   reusable" can fail under load and then the gate HANGS in `rebuilt(n0)` with no timeout (a gate defect: give it one).

Then the lane's order: CCN-003 (show before apply) → CCN-004 → CCN-007.

## State before s11 (2026-10-23 evening)

- **CCN-001 ✅** (eight sessions in one day; Studio renders inside Claude Desktop, the hold holds every tool).
- **CCN-006 s9 built** (the desktop app offered when the agent's server goes; OpenNoodl 9fcd69f0f, studio 65b1623);
  the `.mcpb` Desktop Extension and `create-nodegx --desktop` are the rest of it.
- **CCN-002 built** (the hold everywhere): see its Done section. `what_changed_since` is new; `session_status`
  reports the hold; a hold over a day old is said; `.nodegx-hold.json` is gitignored by the shared merge; Studio names
  the agent in a clash and in the "redrawn" toast.

**The `noodl-mcp` dist was rebuilt 2026-10-23 17:35 from a clean worktree at 5eab4d7be** (Richard: "Rebuild: yes"),
so his Claude Desktop runs CCN-006 s9 and CCN-002 from its next restart. 🔴 Build from a clean worktree, never from the
primary tree: the bundle takes `noodl-editor` validation and `nodegx-backend` sources, which other sessions often have
open edits in. `scripts/devtools/make-worktree.sh <name> <sha>`; its `dist/` entries are links to the primary's, so
the build lands there (except `kit-extract.cjs`, written as a real file: copy it). Both repos pushed the same evening.

🔴 **CCN-002 found the drift rule weaker than the tasks assumed.** `update_component` re-reads before it applies, so
an agent's write after the person's Studio edit lands ON that edit (kept, but the same setting overwritten), and is
refused only with `if_revision`. CCN-003 (show before apply) should not lean on "the drift rule refuses".

Next, in the board's order: **CCN-003** (show before apply) → CCN-004 (look first) → CCN-005 (short bursts); CCN-006's
`.mcpb` can go in parallel; CCN-007 (the person test) last.

Local gates: `packages/noodl-mcp`: `npx jest tests/ccn002HoldEverywhere.test.ts tests/toolDisclosure.test.ts --runInBand`
(the surface read 8,277 / 8,280 after CCN-002: 3 tokens free, so a new tool goes in an existing deferred group whose
"(N tools)" keeps its length). Studio: `npm run check:editor` in nodegx-studio (Node 22, `nice -n 19`, the HEAVY.lock).
The fake host: `node tools-fake-host.mjs 47612 http://127.0.0.1:<studio>/panel`, then squirm's `tools/drive.mjs` on
`tools-fake-host-steps.json`. After any run in Claude Desktop, read `~/Library/Logs/Claude/mcp-server-nodegx.log` first:
it says whether the host called a tool at all.

`noodl-mcp`'s `tsc --noEmit` is red on two lines of the Swift emitter (P125-CCN002-SWIFTARGSNEVER, lane 4's file,
filed not fixed): nothing of this phase's.
