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
