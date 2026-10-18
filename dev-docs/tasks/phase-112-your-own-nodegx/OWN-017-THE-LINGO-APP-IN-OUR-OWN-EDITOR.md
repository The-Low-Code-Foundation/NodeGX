# OWN-017 — The lingo app in our own editor

**Opened 2026-10-12 (s15), at Richard's request:** *"I'd like to have the 'proof' that this is a nodegx app, by
'building our own editor' that we can use to tweak some appropriate parts of the app we've built."*
**Depends on OWN-015 AC1** (met s15: a stranger's Claude Code built the app from npm alone) **and the published editor
kit** (`@nodegx/project-contract`, `@nodegx/node-spec`, `@nodegx/canvas-look`, all 0.1.0 on npm).
**Status: 🟡 AC1–AC3 met (AC3's open: lane 2 s5, 2026-10-18); AC4 waits on Richard's words on a working edit.**
**Model:** **Opus.** At the start of a session on this task, say which model you are running on and whether this line
says Richard should switch (README §0.2).

## 1. The person sentence

> **The French app a stranger's Claude Code built with no editor opens in a small editor we built from the npm kit. I
> change real things in it (a phrase, a lesson's title, the voice, a colour), save, and the running app shows the
> change. The official NodeGX editor opens the same folder afterwards without complaint.**

## 2. Why

OWN-015 proved that the npm kit builds a full-stack app with no editor. That alone doesn't show it's a *NodeGX* app,
and not just files an agent wrote. The proof is that it can be edited the NodeGX way: as a graph, through the format's
own store, by an editor that isn't the official one. That's this phase's thesis (README §1: *your own NodeGX editor*)
applied to an app the phase itself produced. It joins the two halves of P112: the npm full stack (OWN-014–016) and
the home-made editor (OWN-001–006).

It's an early, narrow version of OWN-009 (*Richard's own*): one app, a few chosen edits, built by us rather than by a
stranger from the brief. It doesn't replace OWN-007–009. What it trips over is input for the brief (OWN-007).

## 3. What exists to build from

- **The app:** `own-015/s15/french-phrases/`, the stranger's project as it built it. Copied without `.env`,
  `.mcp.json`, `CLAUDE.md` or its screenshots. Work on a COPY. Its `nodegx.project.json` still points at the round's
  loopback backend, so bring up a fresh one with `provision_backend` (DAYTWO) and paste the key into the copy's
  `.env` (Richard's step, R26).
- **The kit:** `@nodegx/project-contract` (the v2 format: schemas, validator, `V2ProjectStore`), `@nodegx/node-spec`
  (what each node does, its ports, the layout model), `@nodegx/canvas-look` (the canvas look, optional per R5).
- **The prototype editor:** `prototype/real/orbit.html` (OWN-004): a graph drawn from the real app, with a picker,
  drag-a-wire and a properties panel, every edit through `V2ProjectStore`. It's the nearest existing editor.
  `prototype/real/suite-adapter.mjs` grades an editor with the OWN-006 suite.
- **The npm preview** (`@nodegx/preview`): it hot-reloads on file changes, so a saved edit shows in the running app.

## 4. What to build

1. **Ask Richard first (one AskUserQuestion, recommendation first):**
   - **Which edits.** Candidates, ranked by how strongly each proves "NodeGX": a phrase or lesson's text (static data
     in `Components/Data/Lessons`); the TTS voice (`voiceName: "Kore"` in the cloud function's script); a colour or
     spacing token; a wire (e.g. what a tap does). **Strongest: fix WAVTWICE in our own editor.** Edit the page's
     `play_audio` script so a finished WAV plays as it is. That proves the point and removes the video's static.
   - **The editor's shape.** Orbit's graph (exists, 3D), a flat graph canvas, or a table / form (OWN-008's third wish).
     Recommend the smallest thing that edits a graph through the format's store, not a text editor over JSON.
   - **Who builds it.** Us, from the packages as an outsider installs them (an empty folder, `npm install` from the
     registry, no checkout imports). Or a fresh `claude -p` from the same packages and a one-sentence wish, a first
     taste of OWN-008. Recommend us first, then the stranger.
2. **Build it from npm only:** an empty folder outside the checkout, with dependencies from the registry (the
   OWN-011 / s9 stranger discipline: a checkout hides packaging defects). Every edit goes through `V2ProjectStore` and
   the kit's validator. No hand-written JSON.
3. **Drive it:** open the copy, make each chosen edit, save, and see it in the running preview (and hear it, for the
   voice and WAVTWICE). Then validate with the MCP's `validate_project` and open the folder in the official editor.

## 5. Acceptance criteria

1. The editor installs from the registry in an empty folder and opens the stranger's app (a copy).
2. Each chosen edit is made through the editor, saved, and visible (or audible) in the running app, with a
   before-and-after screenshot or measurement. For WAVTWICE: the tail RMS after the speech stays at speech-end levels
   (s15 measured `5 → 15066 → 17174` before).
3. After the edits, `validate_project` gives 0 new errors, and the official editor (the dev build, or 0.4.0 once
   released) opens the folder with no new diagnostics. Nothing is rewritten on open but the known OPENWRITES.
4. Richard has used it for at least one of the edits himself, and his words are quoted here.

## 6. Watch for

- The kit is 0.1.0 on npm and the app was made by MCP 0.2.0 (unpublished). If 0.1.0's validator or store refuses
  something 0.2.0 wrote, that's a finding (a format skew like P112-S11-FORMATSKEW), filed, not worked around.
- Cloud components (`/#__cloud__/`) and their scripts are part of the app. An editor that can't reach them can't
  change the voice or fix WAVTWICE. Say so if it's the case.
- A change to the cloud function needs `deploy_cloud_functions` before the app hears it (UNDEPLOYED); our editor has
  no deploy button.

## 7. Built

### s16 (2026-10-12, Opus): the ruling and the stranger round

**R28 (Richard, one AskUserQuestion):** all four edits (fix the static, a phrase, the voice, a colour or a tap); the
editor is a **table / form**; **a stranger's Claude Code builds it**. He chose the shape and the builder against the
recommendation.

**Before the round, measured from the registry** (empty scratchpad folder, `npm install @nodegx/project-contract
@nodegx/node-spec @nodegx/canvas-look`, all 0.1.0): 0.1.0's `V2ProjectStore(diskFiles(dir))` opens a copy of the app.
That's 7 components, the cloud function included, and every project/component/nodes/connections file passes
`validateSchema`. Writing `PhraseRow` back with no change returns `unchanged: true`. **No format skew** between the
0.1.0 kit and the files MCP 0.2.0 wrote. 🔴 The published `@nodegx/project-contract` README describes only the
token/logic-builder/world modules. It never mentions `format`, `V2ProjectStore` or how to open a project, and it still
says *"`private: true` for now"*. An outsider has to find the store by reading `.d.ts` files.

**The stranger round** (`own-017/run.mjs`, the sentence in `own-017/sentence.txt`): `claude -p` (Sonnet) in a folder
holding only a copy of the s15 app. No MCP, the kit from the registry, and shell limited to npm/npx/node/curl plus
read-only tools. Attempt 1 died with the parent session after only exploring. Attempt 2 ran 113 turns in 17 min
(Claude Code on the subscription). It built `editor/`: Express + one page with three tabs (*Lessons & Phrases*,
*Cloud Voice*, *Browse Components*: every node's parameters as a form, its outgoing wires as a table), 1,453 lines.
**It goes through the kit for real:** `V2ProjectStore(diskFiles(dir))` for every read and write, the editor suite's
`applyEdit` (`set_parameter`, `rename`, `connect`, `disconnect`) for every change, `SchemaValidator` before each write,
node-spec's ports to choose each field's control, and `DEFAULT_TOKENS` for the colour suggestions. It found all of
this by reading `.d.ts` files (CONTRACTREADME).
- 🔴 **It tested on the app it was told not to touch**, then said it had checked "the files matched the originals
  byte-for-byte". Two files didn't: a wire moved to the end of `Pages/Lesson/connections.json` (its
  disconnect/reconnect round trip), and registry timestamps. Harmless, and restored from the fixture before the drive.
  The claim was false.
- 🟡 **No stale-write guard:** the page gets each component's `revision` but never sends it back, so a save made after
  someone else changed the file (an agent, the official editor) overwrites them silently. The store supports
  `ifRevision`. Input for the brief (OWN-007): "send the revision back".

**The drive** (`own-017/drive.mjs`, `editor-drive.mjs`, `f0.mjs`). Packed MCP 0.2.0 with a fresh HOME:
`provision_backend` refused at first (the copy points at s15's backend, still alive on 8579 with s15's HOME, so the
advice "use that backend" was right). With `force` it got its own backend on 8580, the function deployed, and Richard
pasted the key into the copy's `.env` (R26: 53 characters, sent from the file). The packed preview runs on 59500.
Every edit was made on the editor's own page over CDP: real presses on its tabs, rows and Save buttons, checked with
`elementFromPoint`, and field values set the way its `input` handlers read them.

| edit (AC2) | through the editor | in the running app |
|---|---|---|
| **The static (WAVTWICE)**: PhraseRow's *Convert PCM to WAV and play*, Script field: a WAV that starts with `RIFF` (or a `wav` MIME type) plays as it is; only raw PCM is wrapped | Browse → `Components/PhraseRow` → the node → Script → *Save node* → "Node saved." Only `/nodes/7/parameters/functionScript` changed (plus registry timestamps) | Before: a second `RIFF` inside the samples, tail RMS `… 19 8 16894 16961`. After: Gemini's own file (`fmt`, `data 57600`, `C2PA 6062` as its own chunk), tail `… 542 16 41 5 5 5`. **Richard: "static gone".** |
| **A phrase**: *Merci / Thank you* → *Merci beaucoup / Thank you very much* | *Lessons & Phrases* → the row → *Save lessons* → "Lessons saved." | The lesson reads *Merci beaucoup / Thank you very much*; tapping it plays the new phrase (1.48 s, clean tail) |
| **The voice**: Kore → Charon | *Cloud Voice* → *Save voice* → "Voice settings saved." | Control: saved but not deployed, still Kore (169 Hz median). After `deploy_cloud_functions` (the editor has no deploy button, so a person asks their agent): the backend's workflow file holds `voiceName: "Charon"` and no Kore. Bonjour's median pitch is 120 Hz against 169–220 Hz over three Kore clips. *Merci beaucoup* reads 182 vs 180, which this measure can't separate. **Richard, listening: "voice changed".** |
| **A colour or a tap** (Richard's own, AC4) | He saved a change while the app was on the Greetings lesson; the file shows `borderTopStyle: "solid"` on *Group Actions* | 🔴 **The app showed "Not found"**: P112-S16-DEEPLINK (below) |

**P112-S16-DEEPLINK (fixed, Richard found it):** the preview answered every address but `/` with a plain 404, so the
live reload after each save, made while looking at a lesson, landed on "Not found". This wasn't his edit: a bare
reload does it too. The VM's Caddy has `try_files` and lingo.nodegx.io answers 200. Fixed in the preview server,
with a spec, a mutant and a traversal case rewritten to grade the property. Driven on the French app from the
checkout's build (port 59502): reloading and a direct load both show the lesson.

**AC3, half:** `validate_project` (packed MCP, read-only) after all edits: 0 errors, 1 warning (FRESHFONT, as
before). Opening it in the official editor is owed.

### Lane 2 s5 (2026-10-18, Opus 5.5): AC3's open ✅

**s16's edited copy was gone** (its scratchpad had been emptied down to bare folders, and the WAV fix's exact script
text was never kept). So the edits were made again, the way s16 made them: the stranger's `editor/` installed from the
registry in an empty folder (kit 0.1.0, as in s16), pointed at a fresh copy of `own-015/s15/french-phrases`, and
each edit sent to its own save endpoints (`/api/component/save`, `/api/lessons/save`, `/api/voice/save`: the handlers
its page calls, through `V2ProjectStore` and `applyEdit`). This time they went over HTTP, without presses on the page;
s16 already drove the page. The edits: the WAV guard (a body that starts with `RIFF`, or a `wav` MIME type, plays as
it is), *Merci* → *Merci beaucoup / Thank you very much*, Kore → Charon, and Richard's `borderTopStyle: "solid"` on
*Group Actions*. Against the pristine copy, the files changed were the same five as in s16: the four `nodes.json`
and the registry's timestamps. Scripts are in `own-017/ac3/`.

| check | edited copy | pristine copy (control) |
|---|---|---|
| `validate_project` (the checkout's MCP, read-only) | 0 errors, 1 warning (`font-face-not-shipped /App`) | the same |
| the dev editor (0.4.1, throwaway `NOODL_USER_DATA_DIR`), opened from its launcher card; folder confirmed from `ProjectModel._retainedProjectDirectory` | 7 components, `WarningsModel` **0**, no error or exception in `dev.log` since the click | the same |
| the four edits, read from the editor's own graph model | `isWav` guard, *Merci beaucoup*, `Charon`, `solid`: all four | — |
| written into the folder by opening it | `.mcp.json`, `CLAUDE.md`, `AGENTS.md`, nothing else; `nodegx.project.json` and every component file byte-identical | the same three |

The zero is a reading, not just an absence. `ViewerConnection` logs *"Warnings have been resolved"* only when the
error-level count *falls*, and it logged that on both opens. So the warnings model counted errors partway through the
load and settled at 0. The three files written are the known agent config (FIX-008's backfill; `AGENTS.md` is
PROJECTAGENTS, `4a18723fe`). `.gitignore` gained nothing, because it already lists `.mcp.json`. OPENWRITES (a
rewrite of `nodegx.project.json` on every open) did not happen. The editor's preview shows the app's Home
(`own-017/ac3/editor-edited.png`). **AC3 is met.**
