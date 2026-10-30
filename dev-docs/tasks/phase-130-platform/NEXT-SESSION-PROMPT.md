# Next session — Phase 130 (working title PLATFORM)

**Written 2026-10-30, at the end of s2** (cline-dev). Read `README.md` (the rulings and the records), then
[`parked/platform-kit/README.md`](../../parked/platform-kit/README.md) (what the harness is, what was measured),
`THE-TEST.md` §2–5, and the kit's `CLAUDE.md` (what the agent in arm A reads).

## Where it stands

- **s2, the harness, is built and committed** in `dev-docs/parked/platform-kit/`. What is not committed is made by
  `node _make/make.mjs` (three.js vendored, the twelve people fetched and baked; about a minute, outside the sandbox).
- **The people (ruling 9):** twelve Rocketbox people in work clothes, six women and six men, baked ahead in 8.2 s into
  one 4096 × 2048 crowd sheet (walk, idle, work, fix, sit, talk) and twelve real-3D GLBs with 19 expedition clips.
- **The gates, read 2026-10-30:** `node tools/check.mjs --root _make/fixture` → 10 / 10 green. `node _make/gate-proof.mjs`
  → 14 / 14 (each gate red on its own breakage with its own `FAIL n` line; the unbroken copy, a place added alone, and an
  editor with its `keep:` line all green). The fixture's drive at the Surface's window: 20 flat people and one real, 20
  draw calls. Gate 1 on the fixture's first draft: 24 reds of 101 numbers, none misread (the lexer also read 9,335
  numbers across the kit and Threadspace with no misreads).
- **The lab folders exist:** `~/vscode_projects/platform-lab/A` (the packed kit, `CLAUDE.md`, the example, `BRIEF.md`;
  546 files, one commit) and `/B` (three.js, `tools/drive.mjs`, the twelve GLBs, the same `BRIEF.md`; 520 files, one
  commit). Remade by `node _make/lab.mjs`, which refuses a folder that is not empty. A packed copy was checked: nothing in
  it names this repository, NodeGX or a path on this Mac, and its example is 10 / 10 green inside it.

## s2b (2026-10-30, later): the lab was not sealed; now it is

- **Measured:** a plain `claude` started in a lab folder loads **11 MCP servers**, Richard's user scope and his claude.ai
  connectors: `nodegx` (its instructions: *"when the person asks for an app, build it with this server … do not write
  … hand-made HTML and JavaScript"*), `nodegx-puppy-test-3`, `nodegx-observe`, `dbt-lessons`, Claude Docs, Gmail,
  Google Drive, Google Calendar and three more. Both arms would have been told to build the game as a NodeGX project.
  Also his `/next` and `/next-go` commands (they name this repo), and `..` = `~/vscode_projects`: this repo, the other
  arm, and about a hundred projects, several of them games.
- **`_make/arm.mjs A|B`** starts Opus 5.5 in the arm with `--strict-mcp-config` and an empty config,
  `--disable-slash-commands`, and a deny list on Read and Edit for every folder in `~/vscode_projects` but the lab, the
  other arm, `/Users/Shared/nodegx-lab`, and every transcript folder in `~/.claude/projects` but the arm's own (1,557
  folders). The list is written to `_make/.arm-<arm>.settings.json` (gitignored), not in the lab.
- **Proven 2026-10-30** with `--probe` (haiku, a scratch lab, stream-json read): sealed → 0 MCP servers, 0 skills,
  0 commands, and a Read of this repo's README refused by the rule (*"denied by your permission settings"*); the same
  question unsealed → the 11 servers. Bash is not fenced (a rule cannot fence a shell): the reader reports it.
- **`_make/read-lab.mjs`** reads an arm without touching it (its transcripts' `cost-state` line gives the dollars).
  Proven on `~/vscode_projects/flicker-lab`, where it found an earlier session's real edit of this repo's `.env`.

## What s2 settled, and where the plan of record was wrong

- The handoff said "choose about 12 from the zoo's set and Life Sim's converted 12". Life Sim's 12 are everyday clothes
  converted with masks for recolouring; the zoo's are FBX with job outfits. One source is simpler: all twelve are
  Rocketbox FBX through the zoo's loader, nine of the zoo's ten (police out: a flag on the sleeve) plus three women in
  work clothes (builder, paramedic, T-shirt and jeans). Contact sheet read 2026-10-30.
- The Universal Animation Library's `Fixing_Kneeling` is not a kneeling loop: it kneels down in its first second and
  stands in its last. The crowd's `fix` is its 1–4 s, there and back.
- THE-TEST §2 says arm B gets "Life Sim's drive tool": it got the kit's `tools/drive.mjs`, Life Sim's with its
  game-specific steps (`__game.screenOf`) removed and a viewport step added. Same tool for both arms.
- Gate 7 also accepts `asked: <editor> — "…"` (the round that asked for it is still open), beside `keep:`.
- Gate 6 counts an engine change only when the engine existed before it (the first build adds both).

## Do next, in order

1. **Richard runs s3, the build** (we do not sit in), **through the launcher, never a plain `claude`** (s2b below):
   from `dev-docs/parked/platform-kit/`, `node _make/arm.mjs A` in one terminal and `node _make/arm.mjs B` in another,
   then the same first message in each: *"Read BRIEF.md and build the game."* Later sittings: the same command (add
   `-- --continue` to resume). The castle's rounds after that (THE-TEST §3). Record per arm: minutes and dollars to the
   first picture, rounds to "fun", and for A every `check.mjs` red the agent argued with or suppressed.
2. **Ours, when he has a round or more:** `node _make/read-lab.mjs` (add `--gates` for A's own `check.mjs` and
   `what.mjs`: headless Chrome, outside the sandbox) prints per session the time, dollars, owner's prompts, tool calls
   before the first edit, every check run with its reds, every reach outside the arm, then commits and lines. Put that
   and THE-TEST §3's measures into a new `RESULTS.md` in this phase. Do not fix their games.
3. **s4, the heat** (THE-TEST §4–5): Richard's pedantic list, a fresh Opus session per arm, then the measures per ask.
4. **s5:** the verdict into P129 CANON draft 3.

## Needs Richard (separate from the above)

- **Two choices made for him, his to overturn:** (a) `BRIEF.md` in the lab is his game paragraph verbatim and GAME.md
  §6, **without** his first paragraph (it tells the agent it is a test with a pedantic owner) and without "scope up a
  prototype in task docs" (an instruction to us). (b) Arm A carries the fixture as `examples/two-rooms/`: a worked
  example of the shape, which is part of the harness, so B has none.
- **THE-TEST ask 3** (pick every dweller's jumpsuit colour): there is no recolourable crowd any more (ruling 9).
  Recommended: keep it as a deliberately hard ask (the agent must add recolouring itself). The alternative is to swap it
  for another editor-on-demand ask, for example "let me drag dwellers between rooms".
- **Ruling 8**, the title.
- **What the agents can reach:** settled in s2b by `_make/arm.mjs` (no MCP, no skills, file tools fenced); Bash is
  still open, and `read-lab.mjs` reports any use of it outside the arm. Nothing for Richard here.
- Optional: the tablet's `?bench` numbers for PEOPLE.md §4 (200 flat at 30 fps is still unmeasured).

## Traps met or already known

- Headless Chrome draws with SwiftShader: no frame rate from it is a finding. Game time lags wall time there (frames
  over 100 ms are capped), so a drive waits for a state, never a time.
- An exit code is not a reason: the first gate proof read three crashes as three reds (Chrome's profile deleted while
  Chrome still wrote it). The proof now demands the gate's own `FAIL n` line.
- `git log` exits 128 in a repository with no commit: the checker treats that as an empty history.
- `tools/drive.mjs`, `check.mjs`, `what.mjs`, the bake and the gate proof start headless Chrome: run them outside the
  Bash sandbox. One heavy job at a time on this Mac; the gate proof is about two minutes of Chrome in a row.
- Rocketbox FBX: the diffuse colour reads black (white material, the photo as the map); each FBX brings an ambient light
  and a camera (stripped before the GLB export).
- A one-shot clip sampled on a repeating action wraps `setTime(duration)` to 0: bake with LoopOnce, held.
- The probe's server (port 8796) and the kit's (8800, 8801 while making, 8802 for the fixture by hand) were all stopped.

## Product findings

None: nothing in NodeGX was touched. The kit is plain three.js on purpose (THE-TEST arm A).
