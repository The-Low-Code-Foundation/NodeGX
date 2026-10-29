# OWN-032 — next session (s2)

Read `../OWN-032-THE-WORKBENCH.md`, then `RESULTS.md` (§2–§4). s1 is committed in `a9564d568`; the pictures (`*.png`)
are on disk only.

## Where it stands

- **Bench** (`bench.mjs`): the hero alone, 1280 + 390, ~2.5 s a turn. The bench project is
  `~/vscode_projects/NodeGX test projects/own-032-bench-puppy` (a copy of G-puppy r4). For bakery, jazz and plumber
  (AC5), make one per brief from that brief's `own-029-G-<brief>-r4` project: `node bench.mjs make <src> <dir>`.
- **Vision:** E4B cannot answer the layout facts from a picture (separation 0.01–0.04; photo cut off 0.47). Each image
  costs it ~70–100 tokens, which looks like Gemma 4's lowest vision budget. The arm feeds the builder the SCRIPT's
  measures (`--look script`). Open lead: raise the budget (560/1120) outside Ollama and re-ask
  (`probe-vision.mjs ask`).
- **Viewer:** `node server.mjs`, then `http://127.0.0.1:8732/?t=runs/<dir>`, adding `&live` while a run writes.
  Timelines: `view-G-puppy-s0` (today's harness), `arm-w1-puppy`, `arm-w2-puppy`, `arm-w3-puppy`.
- **Arm** (`arm.mjs`): E2B at node level loops on "add a Group" and never changes a setting (P(set) 0.03–0.13, 0 sets
  in 3 × 30 turns).

## s2 status (2026-10-29)

- Step 1: Richard was given the viewer links; his changes to what it shows are not in yet.
- Step 2 (surgery from the page) is **built and committed** (`b308c4c83`). RESULTS §5 describes it.
- **No fork has been asked yet**: a peer's `gemma4-e4b-32k` held Ollama through the whole build. The server refuses
  a fork while another model is loaded.
- Next: Richard's pokes (step 3), each recorded in the RESULTS §5 table.

## s2b status (2026-10-29 evening, Opus session opennoodl-9f)

- **The puppy hero is solved at the arm level.** `w6-puppy` is done at turn 24 with every check clean
  (`runs/arm-w6-puppy/t23/`). The `roles` switch made the difference: the checks read what each part IS, plus
  `wrap`, placeholder words as a write fix, and a headline-wraps check fed by line counts from bench.mjs. RESULTS §5c
  has rows t15a, w5, w5-t16a and w6.
- **AC5 has run:** w6-bakery, w6-jazz and w6-plumber were all done by the model in 22–25 turns, measures clean except
  the kit's bakery button contrast. RESULTS §6.
- **Waiting on Richard:** the blind page https://claude.ai/artifact/XoSSP3TPGwqbhnAhu7vcEP. Read his picks with
  ArtifactData `list` on `ac5` and `ac4`, the key is `runs/ac5-w6/blind-key.json`, then grade the pre-registered
  prediction in §6 (the composition wins ≥ 2 of 3, because the arm has no ground, display font or eyebrow).
- **Next, if the prediction holds:** add ground, display font and eyebrow as findings with fixes, and test on running and pottery
  (held out). If AC4 and AC5 pass, OWN-033 stitching. Separately, fold the menu lessons into OWN-031 `build_app`,
  but that is the other session's lane: ask first.
- Goose now starts with `~/.config/goose/start-goose.sh` (own-030/goose/FINDINGS.md, last section).

## s2, as it was planned

1. **Show Richard the viewer first** (build order step 2; he has not seen it yet). He may change what it shows.
2. **Surgery from the page (3c, AC3):**
   - server routes that start `arm.mjs` with `--replay <run> --upto k`, `--override k=…`, `--hint k=…` and
     `--edit <file>`, writing the edit beside the fork;
   - in the viewer, an "edit and re-run from here" control on each builder step (prompt text, answer override, a
     hint), and forks side by side with their end pictures.
   The arm already supports every one of these from the command line.
3. Then Richard pokes. The obvious first pokes, from w1–w3:
   - a finding that names the part that owns a space ("n00 has no padding left and right");
   - a menu that lists only the settings that would fix the findings;
   - words at temperature 0, so forks differ only by the edit (w2 → w3 showed that the 0.7 words move every later
     prompt).

   Record each fork and what it changed in RESULTS §5.

## Traps met in s1

- `render-from-disk.js` builds its page once: a reload serves the first project. `bench.mjs` answers the request over
  CDP `Fetch`.
- Node names must be fixed-width (`n01`): `n1` / `n10` / `n11` tie in the grammar.
- `git add -A -- <dir> ':(exclude)*.png'` staged NOTHING, silently. Use `--pathspec-from-file`, and guard the staged
  count before `commit-tree`.
- 16 GB box: E2B + E4B + a peer's e4b-32k do not fit together. Wait for Ollama to go quiet (no request for 3 min and
  no model loaded) before a probe.
