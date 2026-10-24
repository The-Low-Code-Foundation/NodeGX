# Phase 125 — Co-construction: the person watches the app come together, and can stop it

**Opened:** 2026-10-23, by Richard: *"Make it so."* **Target:** Claude Desktop first. **Lane:** 8 on the board.

> "Claude building an app in pure code will never be able to offer an editor during the build process … But sitting
> and waiting for 45 minutes for a prototype of your app to come out, only to realise the whole thing needs visually
> changing, colours, fonts, sizes, buttons, etc. all wrong in terms of what you had in your head, is one of my biggest
> pet peeves even here doing templates with you in nodegx. What if we turned our efforts towards a truly collaborative,
> step by step system that does short bursts and shows what it's working on in the editor attached to the
> conversation … with a big stop button to say 'HOLD THE FRONT DOOR, you just changed the background colour, wtf' and
> make the 'human in the loop' concept a hardcore tenet of our canon." — Richard, 2026-10-23

> "What I don't want to do is say 'forget the Claude Desktop app you've been using and love, move over to our app'.
> I'd rather integrate with what people already use and trust. You use your Claude, we bring the editor and backend
> management visually for non coders." — Richard, 2026-10-23

## The hook (D8, 2026-10-23)

After run 6: *"It's fucking perfect. Let's commit this and add it to our canon as possibly the way to justify using
NodeGX … You're in the driver's seat, Claude is your true copilot. Make your AI Coder a true Copilot."* DIRECTION §0
carries the statement and the table of what each clause may claim today; this phase is the lane that makes the
promised rows checkable (CCN-006: nothing extra to install; CCN-007: the person test).

## Why this phase, and why now

The stranger audit of the npm packages (`dev-docs/reviews/npm-stranger-audit-2026-10-23.md`, three agents with no
history) ended on one sentence each: for an agent, a plain React app is more portable, more standard and better
tooled; the one thing code cannot match is *a person who cannot code opening the app and changing it*. OWN-026 test 1
measured the same from the other side: code 21/21/21, NodeGX 16 → 18 after two fixes. On the axis "a better target for
an agent", code wins by construction, and every lane so far has been measuring on that axis.

Co-construction is the axis where the graph has a reason. The project is files with a drift rule, so a visual editor
and an agent can write the same app at the same time; a visual edit to a React app would have to be round-tripped into
JSX. This phase makes that a property of the *build*, not only of the end result, and makes "the person is in the
loop" something the server enforces rather than something the model is asked to remember (OWN-026: delivered advice
gets argued away; a refusal does not).

## What exists on day one (CCN-001, built 2026-10-23)

- **`open_studio`**, a tool in `@nodegx/mcp` (project group, 0 resident tokens): starts NodeGX Studio for the open
  project on a loopback port and returns its URL. It carries `_meta.ui.resourceUri`, and the resource
  `ui://nodegx/studio.html` (MCP Apps, `text/html;profile=mcp-app`) is Studio's `/panel`: the editor rewritten to run
  at a host's sandbox origin, with CSP naming Studio's origin. Claude Desktop renders it inside the conversation when
  the person clicks Allow; any other host gets the URL to open beside it. One Studio per project; it dies with the server.
- **The hold.** `.nodegx-hold.json` in the project folder. Studio's strip has **HOLD** (with a note) and **Release**;
  while the file is there, every tool registered inside the server's write gate is refused with code `held` and a
  message that quotes the note and tells the model to stop and ask. Reads, renders and `open_studio` still answer.
  The strip also tells the model through `ui/update-model-context` the moment the hold changes.
- **Studio's `/panel`** (nodegx-studio `editor/serve.mjs`, `editor/hosted/`): CORS on every answer, `OPTIONS` 204,
  `GET/POST /api/hold`, the bridge `hosted.js` (routes the page's root-relative requests to Studio, completes the MCP
  Apps handshake, draws the strip, Full screen, Open in a window), the SDK's browser bundle vendored as `mcp-app.js`.

Measured: in a fake host at a foreign origin, headless Chrome, the panel completed `ui/initialize`, reported its size,
and drew the whole of Studio with the running app (`shots/01-panel-in-fake-host.png`); over JSON-RPC against the built
server, `open_studio` returns the URL, `resources/read` returns the panel with the CSP meta, `set_project_settings` and
`create_component` return `held` while the file exists and work when it is gone; `tests/toolDisclosure.test.ts` 18/18.

**Not measured, and the one thing only Richard's Claude Desktop can answer:** whether Claude's sandbox honours a
`csp.connectDomains` / `resourceDomains` entry for `http://127.0.0.1:<port>`. If it does, Studio is inside the
conversation. If it does not, the strip still works (it needs no network) and **Open in a window** is the route: the
same Studio beside the conversation. Either way the hold holds.

## The tenet, in rules the server keeps

1. **The person can always stop it.** A hold is a file; every write is refused while it is there; the model is told
   why and what to do. Built (CCN-001).
2. **The person sees it as it is built.** Studio is on screen from the first write, redrawing on every file.
   Built for Claude Desktop (CCN-001); packaging for a stranger is CCN-006.
3. **The look is settled with the person before a page is written.** Tokens, a sample card and button, accepted in
   Studio; a page write before that is refused (CCN-004).
4. **Nothing lands unseen.** Staged plan operations render in Studio before `apply_plan`; the person accepts
   (CCN-003).
5. **The person's edits are real.** A write to a component the person changed in Studio is refused as drift, and the
   model can ask what changed since it last read (CCN-002).
6. **Short bursts.** One component per turn, each one rendered; the server's result budgets enforce the size
   (CCN-005).

## Tasks

| id | task | state |
|---|---|---|
| [CCN-001](CCN-001-STUDIO-IN-THE-CONVERSATION.md) | Studio in the conversation, with HOLD | built 2026-10-23; **waits on Richard's run in Claude Desktop** |
| [CCN-002](CCN-002-THE-HOLD-IS-A-TENET.md) | The hold everywhere: gitignored in created projects, reported by `session_status` and `get_project_info`, `what_changed_since`, Studio's drift answer names the agent | built 2026-10-23 |
| [CCN-003](CCN-003-SHOW-BEFORE-APPLY.md) | Staged plan operations render in Studio; the person accepts before `apply_plan` | open |
| [CCN-004](CCN-004-LOOK-FIRST.md) | No page until the look is accepted in Studio: tokens, sample card, sample button; refused by the server | open |
| [CCN-005](CCN-005-SHORT-BURSTS.md) | One component per turn, rendered; budgets in the server, not advice | ✅ seen in Desktop 2026-10-24: the puppy page in five bursts, one panel (s11 plan cap, s12 `create_component` cap) |
| [CCN-006](CCN-006-ONE-CLICK.md) | A stranger's install: Studio on npm, a `.mcpb` Desktop Extension, `create-nodegx --desktop` | open |
| [CCN-007](CCN-007-THE-PERSON-TEST.md) | The test that settles the canon: a non-coder watches two builds (React agent / NodeGX + Studio) and stops one | open; needs Richard |

## Decisions taken in CCN-001 (not ruled, state them)

- **The hold is a file, not a host feature.** So it works in Claude Code, Cline and Vibe too, survives a crashed
  Studio, and `touch .nodegx-hold.json` is a hold from any editor.
- **The panel is Studio itself, not a frame around it.** Claude restricts `frameDomains` pending security review;
  the page is rewritten to a foreign origin instead (`/panel`). Studio's two internal iframes (the backend map,
  the timeline's screen) will be blank inside Claude for the same reason; the tabs themselves work.
- **Registered in both modes.** A read-only server is exactly a watching person's server.
- **Studio is found, not installed.** `NODEGX_STUDIO` or the sibling checkout. Studio on npm is CCN-006.

## Out of scope here

Claude Code's own panel (its Artifact tool is not MCP Apps; the URL route covers it), mobile hosts, a second person
on the same app, and anything that asks the person to leave Claude.
