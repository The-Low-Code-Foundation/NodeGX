# Phase 106 — next session

> ### 📋 2026-09-28 (scoping, no build) — RICHARD RULED "GO 3D AND OPEN WORLD"; NINE TASKS SCOPED — START HERE
>
> - **What happened:** Richard played the packaged "Olive's Island" (P105 s4) and gave seven points and two global
>   asks; each was measured against the source (README §1) and he ruled the same day: *"So if we can go 3D and a
>   bit more 'open world' let's do it. I like your thinking."* R1–R8 are taken as recommended (README §3). The
>   board is IG-000–IG-008 (README §5), each with a task file.
> - **Session 1 (three lanes, worktrees via `scripts/devtools/make-worktree.sh`, the P18 four-lane recipe):**
>   1. **Lane A — [IG-001 the fixes](IG-001-THE-FIXES.md), first job.** Ten measured defects, no ruling needed:
>      order D2, D1, D3, D4 (engine + Runner), D5, D9 (kit), D6, D7, D8, D10 (page glue). Each gets its gate
>      assertion red then green, then the drive clause. Regenerate per group (`npm run template:garden`), then the
>      garden specs, the page drive at both sizes EN+FR, the Olive page drive, the shell's `npm test`.
>   2. **Lane M — [IG-000 the mockup](IG-000-THE-MOCKUP.md).** One HTML artifact: the island in flat-shaded 3D
>      (three.js from cdnjs, primitives only, no shadows), Drive/Teach/Play, My robots, Olive reads; P105's palette,
>      fonts and word table. Richard grades it and opens it on the tablet for the first frame-time reading.
>   3. **Lane D — [IG-007 Garden 3D](IG-007-GARDEN-3D.md), the Workshop scene.** New module `garden-3d-kit`,
>      node `Garden 3D` on `Garden`'s exact ports (in: Map, Things, Robots, Bubble, Step Ms, Celebrate, Label; out:
>      Tile X, Tile Y, Tile Tapped, Ready) plus Camera/Focus in and Frame Ms/Supported out; three.js vendored the
>      maplibre way (`manifest.json` `dependencies`); the 2D node stays the drive renderer and the fallback.
>   The orchestrator merges, regenerates, drives once on the merged tree, writes the handoff.
> - **Sessions 2–4:** README §5 "Order and lanes". IG-004 (the world) waits for IG-002 (the vocabulary) and IG-007
>   (the renderer) and gets its own mockup screen first.
> - **Still owed from P105 s4** (`../phase-105-the-coding-garden/NEXT-SESSION-PROMPT.md`): the Windows run-5 app
>   logs (why win-x64 is ~10× slower than linux-x64), the tablet's Olive timings, the FR read, Richard's hand
>   checks. IG-007's tablet gate (30 fps with an Olive call in flight) needs the tablet anyway: do both trips at once.
> - **Readings at scoping (primary checkout, HEAD `fb9420a63`, 2026-09-28):** garden specs 337/337, page drive
>   161/161, Olive page drive 17/17, shell 89/89 — as P105 s4 left them; nothing re-run this session (no code changed).
> - **Traps to read first:** P105 README §7 (all of it); `a-working-wireframe-is-not-the-mockup`;
>   `a-frame-throttle-never-fires-in-a-hidden-window` (the 3D fallback rule); `a-lockfile-made-on-a-mac-drops-
>   other-platforms-prebuilts` (the Windows build of a new module); a new node type owes `noodl-mcp` and the picker.
> - **End of session:** `/next` — this block rewritten, README §5 statuses from the task files, the memory
>   (`tpl-012-the-coding-garden.md`). Names, ages and the tablet spec stay out of the repo.
