---
id: P125-PUPPY-TWOPANELS
title: The agent drew a second Studio panel at the end of the same turn, and that second panel showed a port error
status: fixed
commit: 58f973f95
severity: medium
area: mcp / `open_studio` description (`packages/noodl-mcp/src/tools/openStudio.ts`), Studio's panel bridge (nodegx-studio `editor/hosted/`)
found: P125, Richard's puppy run in Claude Desktop (Sonnet 5.5), 2026-10-23
evidence: "Richard's report (no words or screenshot: s12 asked). s12: claude.ai-web.log shows THREE panel mounts (oncalltool handler replaced 17:51:48, 17:52:21, 17:55:01 = tools/call 7, 13, 30); three fake-host reproductions with two panels came out clean (see s12 below). mcp-server-nodegx.log: one resources/read (15:51:45Z) for the whole run, two servers initialised (claude-ai on proxy 53272, local-agent-mode-nodegx on 55849). The same project served fresh by Studio in headless Chrome (scratchpad puppy/fresh-760.png) loads with no error, so the error is the panel's or the host's, not the app's."
---

Richard: *"When done, Sonnet loaded ANOTHER editor window below its reasoning and output, which threw a port error, so
in the end in the same output there were TWO studio instances, the top one it made at the very start, working fine,
and the bottom one after the output, editor open but app throwing a port error."*

Two defects:

1. **Two panels in one turn.** `open_studio`'s description (s8) says *"call it again, first, in every later turn in
   which you change the app"*. Sonnet called it again at the end of the same turn. One panel per answer is the intent;
   the description does not say "once per turn", and a repeat call's result does not say "already on screen above".
2. **The second panel errored** while the first kept working against the same Studio. Not reproduced yet: the
   error's text is needed (Richard's screenshot). Candidates to measure: the second panel's bridge reaching the proxy
   after the first holds the SSE client; Desktop's message port for a second app instance of the same resource.

Fix for 1 (small): the description says once per turn, at its start, never at the end; a repeat call within the same
minute answers "Studio is already on screen in this answer". Fix for 2: measure with the error's text.

## s12 (2026-10-24): part 2 measured, not reproduced

Richard has neither the error's words nor a screenshot. What the logs say, and three reproductions that all came
out clean (scratchpad `twopanels/`: an MCP driver playing Desktop as `claude-ai` with the ui extension, reading
`ui://nodegx/studio.html` and calling `open_studio` on the rebuilt dist; a fake host drawing that resource in TWO
iframes, each answered by its own `ev.source`; squirm's `drive.mjs` in headless Chrome):

- **Three panels mounted, not two.** Desktop's `claude.ai-web.log` says `[MCP Apps] oncalltool handler replaced` at
  17:51:48, 17:52:21 and 17:55:01, matching `tools/call` ids 7, 13 and 30 in `mcp-server-nodegx.log`. Studio's bridge
  never calls server tools, so the line marks a panel mounting. Richard saw two (the first two may have been one place).
- **One server, not two.** `mcp-server-nodegx.log` carries only the `claude-ai` server's JSON-RPC (proxy 53272); the
  `local-agent-mode-nodegx` server (55849) shows only its stderr. The one `resources/read` (id 8) and every
  `tools/call` went to the same server, so "a panel built against one server's proxy while the other answers" does
  not fit this run.
- **The last panel mounted two seconds before the big write.** Every section and leaf was born at 17:55:03 (the
  folders' birth times); PuppyCard, StepItem and FeaturedPuppies were rewritten at 17:55:20–26. Panel 2 (17:55:01)
  was still booting when the apply landed.
- Reproductions, each with no exception, no console error, and both panels drawing the site: (1) two panels on the
  finished project; (2) the timeline replayed: panel 1 boots on the empty project, panel 2 joins at 30 s, the apply
  lands at 32 s (while panel 2 boots), the leaves are rewritten at 50 s; (3) a connection reading a Component
  Inputs port that does not exist written at 20 s, panel 2 joining at 25 s on the broken file, fixed at 40 s.

Not reachable here: Desktop's own sandbox frame (its origin, its CSP from the resource's `_meta`, its message
channel). The runtime's only "port" error is `Node <x> doesn't have a port named <y>` (`noodl-runtime/src/node.ts`,
`getOutput`), which a write the agent later corrected could have raised in a panel that boots on it; (3)'s broken
wire raised nothing at all (a Component Inputs node takes any port name), so that candidate is untested, not
excluded: the intermediate writes are gone. **Still open:** the words, if it happens again. Part 1 (the second
call) is what s11 answered; the re-run on the 2026-10-24 dist says whether one panel per turn holds.

## Fixed (part 1) — seen in Desktop 2026-10-24

Re-run on the 00:12 dist: `claude.ai-web.log` shows ONE `oncalltool handler replaced` (08:47:17), right after the
one `open_studio` (08:46:53); one `resources/read` (06:47:16.706Z, 12 ms after that call). One panel for the whole
build, so the second panel, and with it the port error, never happened. Part 2 stays unexplained (no words, three
clean reproductions, s12 above): if a second panel ever errors again, reopen this with its words.
