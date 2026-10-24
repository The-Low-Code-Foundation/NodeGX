# PLY-001 — The skill a stranger's Claude Code reads

**Phase:** [126](README.md). **Depends on:** nothing. This is the base version: *"at the very least making a base
version that would help a stranger's Claude Code is a good idea."*

## What

A Claude Code skill (`SKILL.md` and a few reference files) that a stranger installs with one command and that loads
when they ask for a game or a 3D scene. It carries three things:

1. **The procedure.** The castle canon's one-screen procedure (`../phase-118-the-castle-holds/CANON.md`, "The procedure,
   on one screen"), rewritten for someone who is not Richard. One-exchange intake with R5's play questions. Two
   playable sketches before one game. The toy in rounds, each round's list kept verbatim. Copy the genre for every
   solved mechanic. Drive at the person's device. No automatic camera motion. A list of the choices made, which the
   person can overturn.
2. **The trap list.** Every 3D and game trap measured in this repo, one line each, with the symptom a person would see
   and the fix. Gathered from: Threadspace README and memory (SHELLFACE, light pool, dt clamp, ray frames,
   `Box3.setFromObject`, `see()` returning `null`, `replaceChildren(null)`), the three-in-nodes s1–s5 traps (React runs a
   child's effects first, a wired input never reads its typed value, For Each rows share an id, `--disable-gpu` alone =
   no WebGL headless), the Gala (synthesised music, not recordings, at sped-up counts; headless dt cap and fastForward),
   Squirm (headless rAF starves, an fps from a clamped dt), the castle (Retina buffer at `inset: 0`), and the viewer
   (`for…of` over a Map runs zero times). Each line names how it was measured, never a task id (the NPMAUDIT lesson:
   task ids in published text are a defect).
3. **The harness recipe.** How to drive the game headless with software WebGL, screenshot every view, gate on a
   centre-ray read and on game state rather than wall-clock, and exit 1. It must work without PLY-002's starter, for a
   stranger who already has a game.

## How it ships

Inside `@nodegx/play` as `npx @nodegx/play skill`, which writes `.claude/skills/play/` into the current project, and
as a Claude Code plugin if that route is simpler for a stranger by the time this is built (check what Claude Code
offers then; do not guess from memory).

## Acceptance

- **AC1.** A fresh Claude Code with no access to this repo, given only the skill, answers "make me a game like X" by
  asking the intake questions in one exchange, then producing two playable sketches, not a spec.
- **AC2.** The trap list has every trap named above, and each is phrased as symptom → cause → fix. A grep of the
  published files for `P\d+-|OWN-|TPL-|CCN-|ISL-` returns 0.
- **AC3.** The harness recipe, followed on a three.js page it has never seen (Squirm's `dist/play.html`), produces
  screenshots and a failing exit when one check is deliberately broken. Run the broken check against the old code once.
- **AC4.** Licence stated in the files (R2).
