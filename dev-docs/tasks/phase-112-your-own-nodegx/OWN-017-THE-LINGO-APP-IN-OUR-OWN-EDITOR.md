# OWN-017 — The lingo app in our own editor

**Opened 2026-10-12 (s15), at Richard's request:** *"I'd like to have the 'proof' that this is a nodegx app, by
'building our own editor' that we can use to tweak some appropriate parts of the app we've built."*
**Depends on OWN-015 AC1** (met s15: a stranger's Claude Code built the app from npm alone) **and the published editor
kit** (`@nodegx/project-contract`, `@nodegx/node-spec`, `@nodegx/canvas-look`, all 0.1.0 on npm).
**Status: 📋 not started.**
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
