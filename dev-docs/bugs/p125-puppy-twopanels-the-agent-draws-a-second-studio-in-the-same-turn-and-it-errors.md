---
id: P125-PUPPY-TWOPANELS
title: The agent drew a second Studio panel at the end of the same turn, and that second panel showed a port error
status: open
severity: medium
area: mcp / `open_studio` description (`packages/noodl-mcp/src/tools/openStudio.ts`), Studio's panel bridge (nodegx-studio `editor/hosted/`)
found: P125, Richard's puppy run in Claude Desktop (Sonnet 5.5), 2026-10-23
evidence: "Richard's report (the error's own words not yet captured). mcp-server-nodegx.log: one resources/read (15:51:45Z) for the whole run, two servers initialised (claude-ai on proxy 53272, local-agent-mode-nodegx on 55849). The same project served fresh by Studio in headless Chrome (scratchpad puppy/fresh-760.png) loads with no error, so the error is the panel's or the host's, not the app's."
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
