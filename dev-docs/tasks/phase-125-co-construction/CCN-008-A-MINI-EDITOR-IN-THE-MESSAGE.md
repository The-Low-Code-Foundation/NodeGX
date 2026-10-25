# CCN-008 — A mini editor in the message

**State:** s1 built and driven headless (2026-10-25): AC1–AC5 ✅ in a fake host. **AC6 part 1 run by Richard in Claude
Desktop (2026-10-25 08:12, Muddy Paws button): the editor drew live and Approve reached the chat; he found eight things,
all fixed and driven in s2.** AC6's rest (a hero, a 3D model, one answered late) is his next run, on the s2 dist. **Lane:** 3 (P125). **Serves:** CCN-004 (look first) and CCN-003 (show
before apply) as their vehicle; PLY-009 (a model says what you can change) inside Claude Desktop.

> "Right now when Claude builds in Desktop and uses the NodeGX connector, you by default get the full NodeGX Studio
> editor appearing inline in the chat. But what we see on the homepage is the 'your own editor' concept at a micro
> scale - Claude being able to build its own editor to expose the NodeGX node props it needs the user to review and
> change. Is there a way we can add that ability to the connector? Show the full editor when needed, but be able to
> show mini custom editors when a button needs styling or a hero section needs approval?" — Richard, 2026-10-24

> "Let's write it up and kick it off. This is a big deal. We can deal with the studio closing in the old message and
> the mini editor opening in the new message. The user can ask to see the editor again if they want to in a new
> message after having decided about the previous one. But those mini editors should be made available again if the
> user makes a mistake and writes a follow up message asking for more info and then their mini editor to validate
> disappears, it should be stored somewhere to bring it up again. Let's make it possible, and run some tests, but not
> restrict ourselves too much, I'm sure we can find workarounds. I realised this is especially important for
> designing three.js games, so CLaude can show the user model by model what it's building and have the user make
> creative decisions before moving on. Don't cut corners on this one, it's a biggie" — Richard, 2026-10-24

## The idea

Studio in the conversation is the whole editor. Most of what a person has to decide while an agent builds is small: is
this the button, is this the hero, is this the ship. For those moments the agent shows a **mini editor**: the one part,
rendered live, with only the settings the agent chose for the person, a question, and **Approve / Not that**.

The agent does not write the editor's HTML. It names the parts and the settings, and the panel builds the controls from
the settings list every node already declares (the homepage's claim: *the list comes with the part*). The agent's
"custom editor" is the choice of what to show, the labels, the limits and the question. A panel built only from that
list proves the claim every time it appears; HTML written per call would be new, untested code in a sandbox every time.

## Rulings (Richard, 2026-10-24, above)

- **R1. One live panel.** The newest panel in the conversation is the live one, whichever kind it is: a mini editor in a
  new message closes the Studio in the old message, and the person asks for Studio again in a new message when they
  want it. (Same rule as P125-PUPPY2's newest-Studio-is-live, extended to both kinds.)
- **R2. A mini editor is never lost.** Every mini editor is stored in the project with what the person changed and
  decided. One that went quiet before it was answered (the person asked a question first, a newer panel took over) can
  be brought back in a new message, with its state, by asking for it.
- **R3. Not restricted too much.** Build it, test it, and work around the host where it needs it, rather than ruling
  features out in advance.
- **R4. 3D is a first-class use.** In a three.js game built with NodeGX (three-kit), the agent shows the person one model
  at a time and the person makes the creative decisions before the agent moves on.

## The design (as built in s1)

### `show_mini_editor` — the panel

A second MCP Apps tool beside `open_studio`, with its own resource `ui://nodegx/mini-editor.html`
(`packages/noodl-mcp/src/tools/miniEditor.ts`). Arguments:

- `title`, `ask` (the question for the person), `kind`: `approve` (Approve / Not that) or `tweak` (Done).
- `show: { component, node? }`: the part. A node by id or label; no node = the component itself as it is placed.
- `settings` (1–12): `{ port, node?, component?, label?, choices?, min?, max?, step? }`. A setting's node is looked for
  in `show.component`; no node = the part itself. `choices` limits a colour or any value to a list (design tokens
  work: `["var(--display-sm)", "var(--display-md)"]`), `min`/`max` turn a number into a slider.
- `variants` (≤3): named sets of values keyed `"<node>.<port>"` (or the port alone). The person switches between them
  live on the one stage and picks one (PLY-009's lineup, for creative decisions).
- `reopen`: the id of a stored mini editor, drawn again in this message with its state (R2).

The controls are built server-side from the settings list the part already declares (`miniEditor/spec.ts`): the
catalog's ports for a built-in or kit node, the `Component Inputs` ports for a placed component. Text, multi-line text,
number (slider with a range), number with units, choice, on/off and colour (the project's semantic colour tokens, one
swatch per colour painted, plus any other colour). A setting the part does not have is refused with the ones it has;
a signal is refused as not a setting; a node that is not there is refused with the component's nodes.

The result carries the id, a `panelId`/`issuedAt` (the live slot, R1) and a note telling the agent to say what to look
at and **end its turn**. In a host that draws no panels it opens `view.html?id=` in the browser instead (the same page).

### `get_mini_editor` — the answer

Not a UI tool (a call to a UI tool draws a panel; the first name, `read_mini_editor`, was renamed because `find_tools`'
phrase search reveals a tool by the words of its name, and "read" pulled it into "press a button and read a
variable"). With an id: status (`open`, `approved`, `not-that`, `done`), the changes in words ("Button words Meet the
puppies → Book a visit"), the note, the settings as the files hold them. Without one: every stored editor, newest first.

### Where it is stored

`<project>/.nodegx/mini-editors/<id>.json` (`miniEditor/records.ts`): the arguments, the resolved stage and controls,
each change (first `from`, latest `to`), the decision, each time a panel drew it. A deploy already leaves `.nodegx/`
out (`ignore.ts`), so none of it ships with the app.

### The proxy's paths

`/__nodegx/mini/…` on the server's own loopback proxy (`miniEditor/http.ts`, put in front of the forwarding with
`setOwnRoutes`): the panel's code, the MCP Apps SDK from the Studio install, the browser page, the record, the stage's
file tree, and the writes (`set`, `variant`, `decide`, `shown`). A write is refused unless its key is one of the
editor's settings and its value fits the control (a choice from the list, a number in range).

🔴 **The person's change is written through a store of its own** over the folder, never the agent's: the agent's store
remembers what it read, and a write through it would count as the agent having seen it, so `what_changed_since` would
miss exactly the person's change. `component.json` is left alone, so Studio's watcher does not call it the agent's.

### The panel (`miniEditor/panel/mini-editor.js` + `.css`, embedded into `panelSource.ts`)

- **Valid before anything runs** (CCN-001 s7, Desktop prefetches): the resource is the same shell for every call; the
  tool result names the id; the panel reads the record from the proxy. Studio serves `/preview.js` and `/runtime/`
  (the tool starts Studio for that); the stage waits for it and the controls work without it.
- **The stage renders the part's component**, and the panel draws only the part. 🔴 Measured in drive 1: the runtime
  takes `rootNodeId` to choose the root *component* and renders it from its top, so pointing it at the hero inside a
  page drew the whole page, nav first. So the server renders the component holding the part (the page holding a
  placed component's first copy) and names a `target`; the panel hides everything else (`visibility`), lays the app
  out at 1100 px and scales it into the stage: a hero looks like a desktop hero, a button sits at its size in the
  middle. 🔴 A placed copy draws no element of its own (`elementsOf("sec_hero")` is empty; its root `hero_band` is
  the band), so a copy is targeted by its component's visual root.
- **3D:** the Scene's component renders, the Scene fills the stage, the game is paused (`pause(true)`), every object
  outside the model is hidden (the lights stay on), and the scene slides sideways so the model stands at the middle
  of the camera's orbit (the engine keeps its aim to itself), the camera standing back by the model's size; again when
  the size changes.
- **Live:** a control moves the running app with the runtime's own `setParameter` (no rebuild, NodeGX Scene s4); the
  value is written when the person lets go (a slider's release, a choice, 500–600 ms after typing).
- 🔴 **The stage never moves in the DOM.** Moving an iframe (or anything holding one) reloads it, and a reloaded
  preview frame is an empty document: measured in the 3D drive, where re-rendering after a variant wiped the scene.
  The page is built once and refilled around the stage.
- **Approve / Not that / Done** stores the decision and sends it as the person's message (`ui/message`), worded for
  both: `Approved: "The hero" (mini editor me-…). I picked "Calm". I changed: Button words Meet the puppies → Book a
  visit; Headline size display-md → display-lg; Button colour primary → secondary. Looks great.` If the host refuses,
  `ui/update-model-context`, and the panel says to send Claude a line.
- **One live panel (R1):** the panel takes Studio's slot (`POST /api/panel`, the newest `issuedAt` wins) and polls it
  every 3 s instead of holding an event stream (the browser's six-connection cap was PUPPY2-THREEPANELS). Quiet, it is
  one line: answered → its outcome; unanswered → "Not answered yet. Ask Claude to show "…" again, or use it here".

### What the agent is told, where (all result fields, 0 resident tokens)

`create_project`'s note and `open_studio`'s note each end with when to use `show_mini_editor` instead; the tool's own
description says when and that it is the turn's last call. The resident briefing (`instructions.ts`, 3 tokens free)
is untouched.

### Not in s1

- Nodes the person can add or remove: a mini editor changes settings, never structure.
- Handles dragged on a 3D stage, pointing at a part (PLY-009's "nudge" and "point"): after Richard's verdict.
- A project-saved custom editor (the full "your own editor"): the panel could serve one later.

## Acceptance

- **AC1. ✅ s1.** `show_mini_editor` and `get_mini_editor` in the deferred `project` group: the surface gate reads
  **8,277 / 8,280, the same as before** (0 resident tokens); both in the first `tools/list` for a `claude-ai` client
  (drive). Controls from the part's own settings; refusals that name what the part has (`tests/ccn008MiniEditor.test.ts`).
- **AC2. ✅ s1.** Stored, listed, read, reopened with the person's changes kept; a superseded unanswered editor says how
  to bring it back (jest + drive).
- **AC3. ✅ s1.** In the fake host on the puppy project's hero: only the hero is drawn (the nav's button is not), a typed
  label shows in the live part without a rebuild (the same frame object) and is in `nodes.json`, a size token and a
  variant are written as tokens, `what_changed_since` reports the person's label (jest), Approve sends the `ui/message`
  above, `get_mini_editor` reads `approved`.
- **AC4. ✅ s1.** Studio → mini editor: the Studio panel goes quiet (`booted`). Mini editor → Studio: the mini editor goes
  quiet. Reopened in a newer message: live again, and the Studio before it quiet.
- **AC5. ✅ s1.** On the three-in-nodes fixture's Robot (a 3D Group of three meshes): the Scene runs paused in the
  stage, only the robot's objects are drawn, a swatch recolours the body live and in the file, the "Big blue" variant
  scales it ×2 live and in the file, the robot centred and framed (swiftshader).
- **AC6. Part 1 run (s2).** Measured in Desktop: `ui/message` is honoured as a composer prefill under a caution banner
  (the person presses send; P125-CCN008-APPROVEWARN, a ruling); the inline panel took the button editor's full height.
  Still to run: a hero, a 3D model, one answered late.
- **AC6 (as written).** Richard's run in Claude Desktop: a button styled and a hero approved in mini editors, one 3D model approved;
  he answers one editor late (after a question) by asking for it again. Unmeasured: whether Desktop honours
  `ui/message` (the fallback is `ui/update-model-context`), how tall it lets an inline panel be (the hero editor asks
  for ~940 px), and the real-GPU feel of the 3D stage.

## How to run it

- Server: `npx jest --config packages/noodl-mcp/jest.config.js --runInBand tests/ccn008MiniEditor.test.ts` (17).
- Richard's AC6 run replayed (s2), sandbox off: `node tools-mini-editor-drive.mjs buttons <copy of Muddy Paws> <out>`
  with `NODEGX_KNOWN_PROJECTS=<scratch file>` (so the copy is not added to his project list). Studio's Properties
  panel inline, then the button editor: stage, scroll, swatches, looks, style, the message. Its control is the same
  drive from a worktree at a0362a33a with `MINI_DRIVE_CONTROL=1` (the old panel): host scrollY 94 after each click.
- The panel, end to end, sandbox off (Chrome): copy a project with `Sections/Hero` (the puppy re-run) or the
  three-in-nodes fixture with `library/modules/three-kit/project/noodl_modules/three-kit` added, then
  `node tools-mini-editor-drive.mjs 2d|3d <copy> <out-dir>` here. It bundles the server from `src` into `<out-dir>`
  (never `dist/`), connects as `claude-ai` with the MCP Apps extension, starts the real Studio, draws each panel in a
  fake host at a foreign origin, prints one line per check, screenshots into `<out-dir>`, exits 1 on a failure.
- After editing the panel: `node packages/noodl-mcp/scripts/embed-mini-editor.cjs` (the spec fails until you do).

## Sessions

### s1 (2026-10-24 → 25) — written up, built, driven

Richard asked for it after the homepage's "your own editor" micro demo, and ruled R1–R4 the same evening. Built the
server half (spec, records, proxy paths, the two tools, hold-exempt, `call_tool` proxying treated like `open_studio`'s)
and the panel; 17 jest checks; the drive in both modes, **ALL PASS** after four rounds. What the rounds found, each
fixed the same session:

1. Settings' nodes were looked up on the page holding the staged copy instead of in the component named.
2. The whole page drew (the runtime renders `rootNodeId`'s component), and a placed copy has no element: the target.
3. No colour swatches (the token categories are `color-semantic` / `color-palette`), then repeated whites.
4. Re-rendering moved the stage's iframe, which reloads it: the scene vanished after a variant.
5. The robot sat off-screen at the edge: the camera orbits the world's middle, so the scene is slid to the model.

Also measured: a check that passes on a value already there proves nothing (drive 1 typed the label the button already
had: "Meet the puppies"); the drive now types a new one and asserts the old one is gone.

The dist Claude Desktop runs was rebuilt from a clean worktree at 71dca72c7 (2026-10-25 07:54) and smoked as
`claude-ai`; OpenNoodl pushed. AC6 is next.

### s2 (2026-10-25) — Richard's first Desktop run (AC6 part 1), eight findings, all fixed

His Muddy Paws conversation: "options for the buttons" drew the mini editor (MOCKUP's fix seen working), he switched
variants, changed fill, text colour and radius, and approved. What he found, what it was, what changed:

| # | Richard | Measured cause | Fix | Bug |
|---|---|---|---|---|
| 1 | "the chat scroll jumps down every time" | `layout2d` called `scrollIntoView`, which scrolls every box above the part, the frames above it included | `bringToTop` moves only the preview page's own scrollers | SCROLLJUMP |
| 2 | "scroll over the button preview … white screen"; "should be content height and fit snug" | the preview page stayed scrollable; its white page (and the kit's inline `background: white` on the frame) showed beside the part | nothing in the stage scrolls; the page and frame are see-through and the stage paints what the part sits on; the stage is the part + 20 px | STAGESCROLL |
| 3 | "font colour … does nothing" | the three text colours offered all resolve to #ffffff; two drew as empty circles (the swatch list keeps one token per colour) | each choice painted with what it resolves to; the agent warned when two paint the same; a token the project lacks is refused (a guard) | WHITESWATCH |
| 4 | "expected to see the hover and clicked / disabled variants" | the editor drew only the normal look | a "Show it" row (Normal, Hover, Pressed, Disabled) with the runtime's own `setVisualStates`; a setting can be a state's (`state`); a state that overrides a setting is said under it and to the agent | NOSTATES |
| 5 | Approve → described, not shown; "scary warning" | nothing asked to show it; Desktop's banner on `ui/message` | the message ends "Apply it where it belongs, then show me the result in the app."; notes say open_studio in the same turn | NOSHOWBACK, APPROVEWARN (ruling) |
| 6 | the project from another chat not found | list_projects read only the editor's list and the server's folder | every bind remembered in `~/.noodl/known-projects.json`; list_projects reads it | LOSTPROJECT |
| 7 | "did Claude update the button style?" | no: each button got its own values; `nodegx.styles.json` untouched since 2026-10-24 12:06 | `scope: "style"` writes the Button style (Studio's Styles tab) and drops the part's own value; the decision names who keeps their own | NOSTYLE |
| 8 | "hide the props panel" inline | the shell reopened it on every redraw of `#right` | opens on a new pick only; "Hide properties" on the strip; a tab on its edge (studio) | P125-STU-PROPSPIN |

Runtime precedence, read for #4 (`react-component-node.ts` `getParametersForStates`): the style's state value, then the
node's own NORMAL value over it, then the node's own state value over both. So a red hover on the node beats any new
fill; a red hover on the style is hidden by a fill the node sets itself.

Gates: `tests/ccn008MiniEditor.test.ts` 21/21 (four new: WHITESWATCH, the guard, NOSTATES, NOSTYLE),
`tests/p125KnownProjects.test.ts` 3/3, neighbours 148/148 in 13 suites, surface 8,277 / 8,280 unchanged, `tsc --noEmit`
clean. The drive (`buttons`) ALL PASS; its control on the old panel reads 94 px of chat scroll per click, a 400 px
wheel scroll inside the stage and three transparent swatches.

🔴 Learned: a check that cannot fire proves nothing. The first SCROLLJUMP check passed with synthetic clicks; an
imitation of the old `scrollIntoView` injected into the NEW panel did not move the host either (its page no longer
scrolls). Only the old panel itself, run from a worktree, showed the 94 px. And a probe of nested frames showed current
Chrome scrolls the top page from a cross-origin, sandboxed frame with or without a gesture.

Leads, not measured: Studio has seven `scrollIntoView({ block: 'nearest' })` calls (tree pick, back-link, timeline);
inline in a chat each can move the conversation when the element is outside the chat's view. The NavBar and closing
banner buttons in Richard's Muddy Paws now set their own fill, so a Button style change will not reach them until the
agent drops those (the decision message names them).

