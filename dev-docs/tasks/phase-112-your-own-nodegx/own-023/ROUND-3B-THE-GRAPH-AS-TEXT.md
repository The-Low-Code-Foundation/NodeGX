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

## 6. Next

- The cheap replication: B3-vibe (DeepSeek V4.1 Flash, ~6 ¢) through `round3/round-vibe.mjs` with the same tarball
  and note, against round 3's B-vibe / B-vibe-noserver (15/18, 14/18, P 40 %). A weaker reader is where a page
  should matter most.
- Ship it: the `--graph` flag and `read_graph` ride the next npm cut of `@nodegx/mcp` (0.2.5) with the kit note;
  the note pins the version, so the line is only true once that cut is on the registry.
- The write side (ComfyBench's "reversibly converted"): not started, and not owed by this round.
