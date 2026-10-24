---
id: P125-PUPPY2-THREEPANELS
title: With three Studio panels in a conversation, every panel stops showing the app ("Timed out after 20000 ms waiting for the app to start") and HOLD's request queues — each panel holds two event streams to the one proxy origin, and Chromium allows six connections per host
status: open
severity: high
area: nodegx-studio panel (`editor/hosted/hosted.js` second EventSource, `editor/studio.html` /api/events), noodl-mcp Studio proxy (one origin for every panel)
found: P125, Richard's Muddy Paws run in Claude Desktop (Sonnet 5.5), 2026-10-24 12:03–12:15
evidence: "claude.ai-web.log: panels mounted (oncalltool handler replaced) 12:03:45, 12:08:44, 12:09:06; set_project_tokens (blue) 12:09:09; the project on disk is blue (nodegx.project.json --primary #1d4ed8) while every panel shows the orange site with the timeout banner. Reproduced headless (dev-docs/tasks/phase-125-co-construction/tools-panels-repro.mjs on a copy of the project): 1 and 2 panels take an outside write; 3 panels all show the banner and keep the old colour (twice); fetch('/api/hold') from a panel STALLED 5 s while curl answered; removing one panel's iframe, the next write reached both others (#9333ea)."
---

Richard: *"The first editor worked fine … Then I started again asking for a colour change. A second editor opened … then
they both said 'Timeout after 20000 ms' at the top of the preview like they weren't connected to the app anymore. I
tried a third message, third inline editor, third one with the same timeout error … Then I tried to open in 'full
screen' but it was the same."* And the agent's last answer said the app was blue, while no panel showed blue.

**What happens.** Each panel is Studio, talking to the MCP server's proxy (`http://127.0.0.1:<sticky port>`) and
holding **two** server-sent-event streams open for as long as it lives: Studio's own `/api/events` (`studio.html`, the
outside-write follow) and a second one in `hosted.js` (to follow the hold). Desktop keeps every earlier panel alive in the
conversation. All panels share one browser connection pool, and Chromium allows **6 HTTP/1.1 connections per host**:
three panels hold all six. Any other request to that host then waits for a free connection. That includes the preview's
runtime and kit scripts (so a rebuild's frame never starts and `@nodegx/preview` gives up after 20 s), the outside-write
events, and **HOLD's `/api/hold` POST**. The hold is the tenet, and its button stops working exactly when the person
has the most panels open. Full screen is the same panel, so it cannot help.

The page the agent built is fine: blue on disk, as the answer said. The panels could not fetch it.

**Measured** (headless Chrome, one host page drawing N iframes of Studio's `/panel`, the agent's write played as an
outside edit of `nodegx.project.json`):

| panels | after the outside write |
|---|---|
| 1 | new colour drawn |
| 2 | new colour drawn in both |
| 3 | all three: "Timed out after 20000 ms waiting for the app to start.", old colour (two runs) |
| 3, then one removed | the next write drawn in the two left |

**This probably explains P125-PUPPY-TWOPANELS part 2.** That run mounted three panels, and its reproductions used
two, which come out clean.

**Fix directions (Lane 3's call):**
1. One stream per panel: `hosted.js` reads the hold from Studio's own `/api/events` (a window event) instead of opening
   a second one. This only buys three more panels.
2. **Only the newest panel is live.** When a panel mounts, the older ones close their streams and show a quiet card,
   "Studio is live in the newest answer below", with a button to take it back. This also matches Richard's s8 ask:
   the panel belongs in the new output.
3. Or no held connection at all: a WebSocket (its limit is separate, 255 per host) or short polling. The proxy
   must then forward `upgrade` for a WebSocket.
4. HOLD must never queue behind the app: whatever is chosen, a gate test with three panels open that presses HOLD.

The banner's words are misleading too: "waiting for the app to start" points at the project, when the cause is the
connection. Not closed by the "once per turn" description (58f973f95): three turns that change the app make three panels.
