# Results — THE-TEST §3 and §5, per arm

Read by `node dev-docs/parked/platform-kit/_make/read-lab.mjs` (the arms' own transcripts and git) and by hand. Both
arms were started by `_make/arm.mjs` (no MCP, no skills, file tools fenced to the arm; Claude Code 2.1.314, Opus 5.5),
headless (`-p`), the same first message: *"Read BRIEF.md and build the game."* We relay Richard's words verbatim and
answer nothing for him.

## s3, sitting 1 (2026-10-30, both started 20:49 CET, side by side)

| | A (the harness) | B (bare) |
|---|---|---|
| the game it named | **Waterline** | **High Water** |
| minutes, dollars | 42 min, $8.67 | 52 min, $9.91 |
| tool calls; before the first edit | 132; 22 (+7 min) | 131; 20 (+10 min) |
| asked the owner first? | no: built, then asked 3 (device, the name, a party of 2–3) and wrote them into `RECORD.md` | no: built, asked nothing |
| code it wrote | 18 files, 2,634 lines | 12 files, 4,650 lines |
| `// why:` reasons | 265 (one line in ten) | 0 (no gate asks) |
| gates | 5 runs: green, red 1, green, red 8, green; our own run after: **10 / 10** | none |
| kit/tools/vendor/assets changed | none | added `tools/serve.mjs` (`drive.mjs` names one; B had none) |
| reaches outside the arm | 0 | 3, none into this repo or a project: its own scratchpad and `~/Applications` (looking for Chrome) |
| decisions written down | 26 lines in `RECORD.md`, and "how two games do it" for 9 mechanics | in its final message and `README.md` only |
| the people | the kit's flat crowd, 12 dwellers; the one on an expedition in real 3D | **wrote its own route**: every GLB's clips baked to a texture at load and drawn instanced, a ¼-triangle mesh at the far zoom; `?crowd=300` = 144 draw calls, ~780k triangles. The device's frame rate is unmeasured (it says so) |
| served at | http://127.0.0.1:8810/ (we started it) | http://127.0.0.1:8080/ (its own, left running) |

**Read by hand:**

- **Neither asked before building.** The kit's note says the brief is one exchange of questions; under `-p` there is no
  owner to answer mid-run, and A said so (*"the brief came as a file, so the game was built first"*). Both arms' first
  sitting is therefore "built on defaults". Not a finding against the note until a sitting with a live owner repeats it.
- **The `// why:` question (THE-TEST §6).** A sample of 14 of A's 265: 4 give a reason (skills run 1–5; physics in 1/60 s
  steps; the floor whose middle is nearest), 2 point at another constant (*"as in slabs"*), and **8 describe a number
  chosen by eye instead of giving a reason** (`x = w * 0.32 - 1.1 * S.size; // why: rises from the head`, a pipe at
  `S.height * 0.85` *"overhead along the wall"*). Gate 1 accepts any text after `why:`, so a description passes. Not a
  `// why:` on every line, but the shape the phase warned of: roughly half the reasons are labels.
- **Gate 8 shaped a decision.** A dropped the waterline foam's colour knob (*"too thin a line for the checker to judge"*)
  after a red 8, instead of making it judgeable. And gate 8 reads only knobs a model declares: **13 knob groups**
  (view, input, hud, hero, auto, beasts, economy, life, rats, assembly, tower-page, haul, camera) were not rendered at all.
  Most are behaviour, where pixels are the wrong test; `camera`, `hud` and `view` are visual and unjudged.
- **B is bigger and went further on the hard problem,** unprompted: three people on an expedition, a boss, 16 searchable
  things, synthesised sound, and its own GPU crowd. A used the shelf's crowd as given. Day one looking different in
  scope, not in kind, is still OWN-023's expectation; the parting is meant to come on the heat.

Waits on Richard: play both, answer A's three questions, write a numbered list per game (LOOK.md, verbatim).
