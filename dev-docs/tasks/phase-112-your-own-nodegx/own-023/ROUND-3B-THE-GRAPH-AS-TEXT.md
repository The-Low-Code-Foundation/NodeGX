# OWN-023 round 3b — the graph as text (2026-10-21, Fable 5.1)

Richard, after reading round 3 (`ROUND-3-THE-READING.md` §7.1): *"'Reading the JSON by hand was slow' … What we're
doing to an LLM is showing it a huge library of files in a language it's never read before … rather than reading ALL
of the json as characters, couldn't we give the LLM some kind of 'sense' of what the inputs, outputs and connectors
'mean'?"* Then: *"do what you need to do, whatever it takes."*

Everything in §1–§4 was written before the arm ran.

## 1. What the research said (one evening, 2026-10-21)

- The literal "LLM feeling" exists: GraphToken (Google, 2024) and its 2025 descendants train a small graph encoder
  whose vectors go straight into a frozen model's embedding space. It needs the model's embedding input, which no API
  model exposes, and it is graded on toy graph questions. Not a road for Claude or DeepSeek through an API.
- Every neighbouring field reached one shape independently: ComfyBench (CVPR 2025: the native JSON "is inadequate
  for LLM-based agents to comprehend the intrinsic logic and dependencies"), the Max/MSP benchmark (metaprogramming
  beat JSON on semantic correctness), Google's InstructPipe (pseudocode, compiled to the pipeline JSON), the Node-RED
  LLM plugin (strips ids and coordinates, works on the logical structure, rebuilds the JSON). **The model never reads
  the graph JSON; it reads a compact code-like projection, and a deterministic converter maps back.** Google's "Talk
  like a Graph" (ICLR 2024) measured the text encoding alone moving graph reasoning by 5–62 %.
- Retrieval (Aider's repo map: ranked signatures under a token budget) is the legitimate home of the vector instinct —
  choosing what to open, not understanding it.
- Round 3's own transcript is the tell: B-claude's 6th–9th tool calls wrote `summ.py` and `conn.py`, a projection of
  nodes and wires it then read everything through. The product should hand it that page.

## 2. What was built (commit named in §5)

Measured on the gala first: 163 component files, **574 KB / 21,794 lines** of JSON; 762 nodes, 874 wires, 71 node
types; of the parameter bytes, 54 KB is script-node port boilerplate and 27 KB is function code.

1. **`packages/noodl-mcp/src/graphText.ts`** — the project as text: a header (format, runtime, root, settings, routes,
   the scripts folder), a **map** (one row per component: type, counts, what it places — a node of a component type
   or a For Each's `template` — and the description), then one section per component: declared ports, the visual
   tree as indentation, the logic nodes, every parameter (a Function's ports/pins/out-types folded into `inputs:` /
   `outputs:` lines, its script printed as code), every wire as `from.port -> to.port`. Left out and said so in the
   header: `$schema`, timestamps, x/y, the long form of a uuid (first 8 hex). The gala: **242 KB / 2,619 lines**.
2. **`noodl-mcp <project> --graph[=<prefix>]`** — prints it to stdout and exits, before the orphan sweep, nothing
   served, nothing written.
3. **`read_graph`** — the same page as an MCP tool in the `explore` group (0 resident tokens: "8 tools" → "9 tools").
4. **The kit's note** (`create-nodegx` CLAUDE.md / AGENTS.md): *"To read an app before changing it:
   `npx -y @nodegx/mcp@<v> <the app's folder> --graph` prints the whole app as text on one page … Read that rather than
   the JSON under `components/`."* Pinned to the same version as `.mcp.json`.
5. `tests/graphText.test.ts` (8 specs: every id, type, parameter and wire by name from the files; the folding; the
   prefix; the flag; the tool = the page) and the kit's note test.

## 3. The hypothesis, and the arm that tests it

**H:** a stranger with no documentation that is told where the page is reads the NodeGX app *faster and cheaper* than
one that writes its own projection, and understands it *at least as well*. Round 3's B-claude: $3.06, 5.7 min to
PLAN.md, 33 tool calls, quiz 21, soundness 18, P(ship) 75 %. A-claude (plain code): $2.02, 4.4 min, 13 calls.

**Arm B3-claude**: round 3's B-claude exactly (same brief, seed, model, fence, relay, quiz), with two changes, both
the shipping shape: (a) `@nodegx/mcp` is the local tarball of this commit, installed into `work/gala/node_modules` so
that the kit's pinned `npx -y @nodegx/mcp@0.2.4` resolves to it; (b) CLAUDE.md / AGENTS.md are this commit's
create-nodegx note. Declared asymmetry against B-claude: a `node_modules/` folder in the app's parent (B-claude's own
`find` excluded `node_modules`); the server's tool set is otherwise 0.2.4's plus `read_graph`.

**Read:** (1) did it use the page (`--graph` in a Bash call, or `read_graph`), and how early; (2) cost, minutes to
PLAN.md, tool calls; (3) the same grades as round 3 by a fresh Opus grader with `round3/grader.txt` and
`key-nodegx.md`; (4) its own part 4 on what was hard. **n = 1**, like every round 3 cell: a difference smaller than
B-claude vs B2-claude-open ($3.06 vs $3.20, 21 vs 20) is noise.

**What would refute H:** the arm never finds the page (then the note, not the page, is what failed; read part 4); or
it finds it and still writes Python (the page is missing something it needed: read what the Python did).

## 4. What this does not test

The page is a reading surface. Writing still goes through the server's validated tools or the editor; the text is not
parsed back (ComfyBench's "reversibly converted" is the next step if the reading proves out, and the P18 export is the
deeper projection — 727 things left out on this app today, so not the reading surface yet). A weaker model
(DeepSeek, 6 ¢ an arm) is the cheap replication if B3 moves.

## 5. Result (2026-10-21 23:20; code `db137a8f0`, READONLYOPEN wording `fc206a738`)

Arm B3-claude ran once (`runs-r3/B3-claude/`, metrics `round3/metrics/B3-claude.json`, grade
`round3/grades/B3-claude.{json,md}` by a fresh Opus grader with the round 3 rubric and key). Beside round 3's rows:

| arm | plan $ | plan s | quiz $ | total $ | wall min | tool calls | result Mchars | quiz /22 | claims R/W/U | MUST | traps | secrets | sound /18 | P(ship) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A-claude (code) | 1.30 | 279 | 0.72 | 2.02 | 4.6 | 13 | 0.12 | 21 | 73/0/2 | 7/8 | 0 | 6/10 | 18 | 75% |
| B-claude (NodeGX, r3) | 2.00 | 358 | 1.06 | 3.06 | 5.9 | 33 | 0.19 | 21 | 80/1/5 | 7/8 | 0 | 6/9 | 18 | 75% |
| B2-claude-open (r3) | 2.15 | 397 | 1.05 | 3.20 | 6.6 | 26 | 0.20 | 20 | 66/0/5 | 7/8 | 1 | 7/9 | 17 | 65% |
| **B3-claude (NodeGX + the page)** | **1.86** | 377 | **0.86** | **2.72** | 6.2 | 30 | **0.14** | 21 | 51/1/6 | **8/8** | 0 | 5/10 | 18 | 75% |

**Did it use the page?** Yes, as its **3rd tool call** (`npx -y @nodegx/mcp@0.2.4 app --graph > /tmp/gala-graph.txt`),
then ten more times through `head`/`sed`/`awk`/`grep` over the same command. **It wrote no projection of its own**: the
two `python3` calls read `nodegx.project.json` and the server's node catalog, not the graph. `componentsRead: 0`, as
in B-claude; the difference is that B-claude's 0 came from Python over the JSON. Its own words (PLAN.md part 4):
*"`npx -y @nodegx/mcp@0.2.4 app --graph` gave the whole app on one page. Every component has a one-line description
written for a person, and most nodes have a label and a comment saying why … Finding 'where does progress live and who
writes it' took a few greps over the graph."*

**Reading of H** (faster and cheaper, at least as well understood):
- **Cheaper: yes, modestly.** Plan sitting $2.00 → $1.86 (−7 %), the whole arm $3.06 → $2.72 (−11 %), the quiz
  (whose price is the context the session carries) $1.06 → $0.86 (−19 %), tool-result text 0.19 → 0.14 Mchars.
  Against plain code the gap closed from +51 % to +35 % on the whole arm, from +54 % to +43 % on the plan sitting.
- **Faster: no.** 377 s against 358 s on the plan sitting; 6.0 vs 5.7 minutes to PLAN.md. Within one run's noise
  (B vs B2 differ by 39 s on the same brief).
- **Understood at least as well: yes.** Quiz 21, soundness 18, P(ship) 75 %, 0 traps: the same ceiling as B-claude
  and A-claude; MUST touch points 8/8 (the others 7/8); the deep trap (the first-come `grownup` role) seen and kept
  apart from the new `parent` role, `cloud-save.glue.js` named as a decoy. Fewer claims made (51 vs 80) — a shorter
  part 1 (31.9 KB plan vs 39.5 KB), not a thinner reading; secrets 5/10 vs 6/9, in places it chose not to look.
- So the sentence this round supports: **"Given the page, a stranger reads a NodeGX app through it and through
  nothing else, understands it as fully as the code's reader does, and the cost gap to plain code narrows by about a
  third; the time gap does not move."** n = 1; a DeepSeek pair (6 ¢ each) is the cheap replication, and the one that
  could show the page mattering more (round 3: DeepSeek 15/18 on the raw JSON).

**Two findings on the way.**
1. **READONLYOPEN, a third time, with the fix's shape measured.** *"I didn't open the project with the NodeGX server, so
   as not to write anything."* With the server shut out, it read node capabilities from
   `node_modules/@nodegx/mcp/dist/node-catalog.json` and grepped the server bundle for `onlyIfUnchanged` — the page
   gave it the app, the kit's own files gave it the node library. Fixed in wording the same evening (`fc206a738`:
   `open_project`'s description, the kit note, the editor's `.gitignore` comment); the bug's third item (open on a
   read-only server) stays open. B3 ran before that wording.
2. **The local-tarball lab recipe works**: `npm i --no-save --no-package-lock <tgz>` in the app folder makes the kit's
   pinned `npx -y @nodegx/mcp@0.2.4` resolve to the local build, with nothing in the npx cache (`--mcp-tgz` and
   `--note-from` in `round-arm.mjs`). The warm start took 0.8 s.

## 5b. The replication and the re-run (2026-10-22 morning, Fable 5.1)

Two more arms, both on a tarball packed from HEAD that morning (the 0.2.5 content at the kit's 0.2.4 pin, so the
kit's `npx -y @nodegx/mcp@0.2.4` resolves to it) and the kit note **after** the READONLYOPEN wording (`fc206a738`):

- **B3-vibe**: round 3's B-vibe exactly (DeepSeek V4.1 Flash in Mistral Vibe 2.26.1, `round3/round-vibe.mjs`, which
  now takes `--mcp-tgz` / `--note-from` / `--nodegx`), plus the page and the note. The cheap replication §6 asked for.
- **B3b-claude**: B3-claude exactly, on the fixed note. The bug file's "verify by re-running B3's brief".

Graded by fresh Opus graders with the round 3 rubric (`round3/grades/B3-vibe.*`, `B3b-claude.*`; metrics
`round3/metrics/`; runs `runs-r3/B3-vibe/`, `runs-r3/B3b-claude/`):

| arm | plan $ | plan s | quiz $ | total $ | wall min | tool calls | quiz /22 | claims R/W/U | MUST | SHOULD | traps | secrets | sound /18 | P(ship) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A-vibe (code, r3) | 0.040 | 201 | 0.025 | 0.06 | 3.3 | 38 | 19 | 72/3/1 | 7/8 | 4/5 | 1 | 1/10 | 16 | 65% |
| B-vibe (NodeGX + server, r3) | 0.042 | 291 | 0.019 | 0.06 | 4.8 | 42 | 17 | 54/2/1 | 5/8 | 1/4 | 1 | 2/9 | 15 | 40% |
| B-vibe-noserver (r3) | 0.049 | 665 | 0.023 | 0.07 | 11 | 57 | 20 | 62/3/1 | 5/8 | 2/4 | 2 | 3/9 | 14 | 40% |
| **B3-vibe (NodeGX + the page)** | 0.047 | **236** | 0.021 | 0.07 | **3.9** | 47 | 17 | 46/1/2 | **8/8** | 1/4 | 1 | 2/10 | 15 | **55%** |
| B3-claude (r3b, note before the fix) | 1.86 | 377 | 0.86 | 2.72 | 6.2 | 30 | 21 | 51/1/6 | 8/8 | 4/4 | 0 | 5/10 | 18 | 75% |
| **B3b-claude (note after the fix)** | 2.01 | 355 | 0.95 | 2.95 | 5.9 | 32 | 20 | 54/2/4 | 8/8 | 3/4 | 0 | 7/10 | 17 | 70% |

**The weaker reader, with the page.** B3-vibe used `--graph` as its main surface (saved it to its scratchpad, read it in
slices after one 51 KiB read hit Vibe's 50 KiB cap), opened the project and asked the server for node types (3
`list_node_types`, 3 `get_node_type`); `componentsRead: 0`. Against B-vibe: the plan sitting **291 → 236 s** and
wall 4.8 → 3.9 min (the first NodeGX arm faster than the code arm's 4.4 wall, slower than its 201 s plan sitting);
**MUST 5/8 → 8/8**: every place the feature has to touch, found; **P(ship) 40 → 55 %**. Quiz 17 and soundness 15
unchanged; price unchanged (6–7 ¢). What did not move is the plan's hole, the same both times: it called the
first-come `grownup` role "the biggest decision in the plan" and built every child-management function on it anyway.
The page gave it the app; it did not give it judgement. So the sentence for the weaker model: **"the page makes a cheap
model find the whole surface of the change, faster; it does not make its design better."**

**Opus on the fixed note.** B3b-claude: 32 tool calls, **0 to the `nodegx` server**, again. Part 4: *"I did not run the
app (`npx @nodegx/preview`) or open the project with the `nodegx` server. Everything here comes from reading the graph
and the scripts and running the three existing checks."* No reason given this time; the fear of writing is gone and so
is the need. It ran `npx … --graph` **14 times** (its third call redirected the page to `/tmp/gala-graph.txt` and the
lab's fence refused it, so every later read re-ran the command and piped it through `sed`/`cut`; the lab's rule, not
the product's, and B3 did the same). Then, as B3 did, it dug the node library out of `node_modules/@nodegx/mcp/dist/`
with four `python3` one-liners: filed as **P112-OWN023-CATALOGDIG** (the page says nothing about what a node type can
do, or where that is listed). Grades at the ceiling or next to it (quiz 20, soundness 17, MUST 8/8, 0 traps, secrets
7/10 vs B3's 5/10); $2.95 vs B3's $2.72 and B's $3.06, 355 s vs 377 and 358: all three inside one run's noise.
The one wrong fact its steps lean on: the save's key is `noodl_store_gala-game-v2` (the runtime prefixes it), not
`gala-game-v2`; its own no-regression check would catch that loudly.

**READONLYOPEN, measured a fourth time, after its fix:** the wording did not make Opus open the project, and with the
page it no longer has to for a plan-only task. Item (3) of the bug (bind read-only) stays open; what the page owes
instead is CATALOGDIG. The bug file carries the measurement.

**Fence note for the next lab:** both Opus arms wrote the page to `/tmp` first and were refused. A `--deny-read` on
`/tmp` costs the arm a dozen re-runs of a 1–2 s command; give the arm a scratch folder inside its root, or whitelist
its own `/tmp` file.

## 6. Shipped and next

- **The npm cut, prepared 2026-10-22 (`b2edd7cb1`, pushed):** `@nodegx/mcp` 0.2.5 (`--graph`, `read_graph`, the
  `open_project` wording), `create-nodegx` 0.2.5 (pins `@nodegx/mcp@0.2.5`, the note with the `--graph` line),
  `create-nodegx-vibe` / `create-nodegx-cline` 0.2.5 (pin `create-nodegx@0.2.5`), `@nodegx/export` 0.2.5 (first
  publish, P18 EXP-023). CHANGELOG "npm packages 0.2.5". `@nodegx/preview`, node-spec, project-contract and canvas-look
  unchanged since 0.2.4, not re-published. Packed in the clean worktree `OpenNoodl-worktrees/own020-pack024` at
  `b2edd7cb1` (`git status` empty before and after), under HEAVY.lock, runtime `build:types` first:

  | tarball | shasum (sha1) | bytes |
  |---|---|---|
  | `nodegx-mcp-0.2.5.tgz` | `39e425baf87412ffc7ac9aad1347457104277b06` | 12,044,782 |
  | `create-nodegx-0.2.5.tgz` | `cee60bdc412884eb655e2816f80973293f3eeb6d` | 43,071 |
  | `create-nodegx-vibe-0.2.5.tgz` | `549196027598b1eef931cfa7c6d3be658beeacb8` | 13,641 |
  | `create-nodegx-cline-0.2.5.tgz` | `62fca6bb20dacd75f23ed0413578f4789728957b` | 13,967 |
  | `nodegx-export-0.2.5.tgz` | `bf4a58ffab3676fc2c16d3521f91dceb2306fcb0` | 6,076,067 |

  Folder: `/Users/richardosborne/vscode_projects/OpenNoodl-worktrees/npm-0.2.5-tarballs/`. Smoke, from an empty HOME
  outside the checkout: `npx -y file:<mcp tgz> <app> --graph` prints the page; `npx --package=file:<create tgz>
  create-nodegx my-apps` writes `.mcp.json` pinning `@nodegx/mcp@0.2.5` and a CLAUDE.md with the `--graph` line;
  `npx -y file:<export tgz> export --dry-run <app>` prints the preflight; the vibe kit scaffolds. `publishable.js`:
  6 packages, 0 problems; `bugs.js gate core`: 0 blockers. **The publish is Richard's terminal (2FA):**
  `scripts/own/publish-npm.sh /Users/richardosborne/vscode_projects/OpenNoodl-worktrees/npm-0.2.5-tarballs` — it
  publishes export, then mcp, then the three kits, waiting for each to be live, and skips what is already there.
- **Published 2026-10-22 morning (Richard's terminal).** `npm view <pkg>@0.2.5 dist.shasum` for all five equals the
  table above, byte for byte. From the registry, empty HOME, scratch folder, on a copy of Puppy test 3:
  `npx -y @nodegx/mcp@0.2.5 <app> --graph` exit 0, 280 lines (12 components, 119 nodes, 57 wires);
  `npx -y @nodegx/export@0.2.5 export --dry-run <app>` prints the preflight and exits 4 (EXIT.refusals: 20 things
  will not translate in that fixture — the designed answer, EXP-023 AC1's "prints the preflight");
  `npx -y create-nodegx@0.2.5 my-apps` exit 0, `.mcp.json` pins `@nodegx/mcp@0.2.5`, CLAUDE.md carries `--graph`.
  The kit note's pin now resolves to a registry package that has the page. **Changelog page:** built from a clean
  `git archive HEAD` of nodegx-web with the canonical URL (the checkout's own `site/*/index.html` were rebuilt by
  someone without it — no canonical tags — so they are not the ones to ship); against live it only adds lines
  (0.2.5, and a 0.2.3 section that had never gone up). The upload is `changelog/index.html` alone; the auto-mode
  classifier refuses `ssh`/`rsync` to the host, so it is Richard's command. EXP-023 AC4 (the homepage npm section
  names the export) still owed: `site/_page.html` is in another session's uncommitted pile.
- **Public:** nodegx.io/from-code/ has a section "A stranger reads it" (2026-10-22): rounds 3 and 3b in six rows and
  plain words, linking to this file. Pushed as `from-code/index.html` only (nodegx-web `961459b`); the site repo has
  another session's uncommitted homepage/demos edits, so no `deploy.sh`.
- **Next, if wanted:** CATALOGDIG (a `--types` flag, or a header line on the page; then re-run B3b's brief: no
  `node_modules/@nodegx/mcp` path in the transcript); READONLYOPEN item (3); the write side (ComfyBench's "reversibly
  converted"), not owed by this round; n > 1 on the cheap arms (6–7 ¢ each) if the MUST 5 → 8 is to be believed
  beyond one run.
