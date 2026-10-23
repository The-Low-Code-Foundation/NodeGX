# FIX-04 — make the layer thinner: the same app, for less reading, writing and retrying

**Written 2026-10-23 ~13:40 CEST by the lab session (`opennoodl-8c`).** Read `README.md` here first, then PLAN §8's
12:30 entry (Richard's goal). **Gates: none.** Richard ruled it runs in a parallel session. **The test-2 NodeGX chain
stays on FIX-03 to the end** (one kit for the whole ten-change curve).

## 🔴 Different from FIX-01 to FIX-03: do NOT write `KIT`, do NOT touch `HOLD-nodegx`

A new `KIT` would stall the running chain: it waits until `KIT-PROVEN` names the same folder as `KIT`. Pack the kit into
`/Users/Shared/nodegx-lab/kits/FIX-04-<short commit>/` as usual and **message the lab with the folder** (`SendMessage`
to `opennoodl-8c`). The lab then re-runs changes on it in a separate rounds folder and compares the overhead.

## The goal, in Richard's words

*"Not to make NodeGX 'better' than coding pure: … the thinnest layer of additional context possible, to be easily as
good as a coded app in your LLM vibe coding engine without much extra cost or work for the LLM, such that even
DeepSeek can do it."* The payoff is the Studio in the chat (DIRECTION D8). **This FIX is graded by overhead, not
by checks:** the same checks, for fewer dollars, turns and tokens.

## Where it stands (test 2, kit FIX-03, `node measure.mjs compare`)

| change | checks code / harness / NodeGX | NodeGX ÷ code: $ | min | turns | tokens read fresh | tokens written |
|---|---|---|---|---|---|---|
| c01 division | 14/15 · 14/15 · 14/15 | 1.5× | 1.7× | 1.3× | 1.6× | 1.2× |
| c02 number pad | 15/17 · 15/17 · 15/17 | 1.7× | 1.5× | 1.3× | 2.1× | 1.0× |
| c03 race | 17/19 · 17/19 · 17/19 | 2.5× | 2.4× | 1.6× | 1.6× | 2.4× |

Quality is level; the cost isn't. Rounds: `/Users/Shared/nodegx-lab/own026/t2-nodegx-c0{1,2,3}/` and the plain-code ones
beside them, read-only to you (`sittings/1/agent.jsonl`; request sizes in `<round>-tap/tap.log`). LEARNINGS #4–#6.

## A. Writing: a feature costs ~1.6× the characters as graph operations as it does as code (candidate; measure first)

c03 (a new page, 174 nodes): **142k characters** of `update_component` (25 calls) + `create_component` (9) inputs;
the code arm wrote the same feature in **90k** of code edits. About 800 characters per node. The model writes JSON
operations: ids, full parameter objects, `connections` with four keys each. A reading surface already exists
(`read_graph` / `--graph`, the graph as text; memory `the-graph-as-text-is-the-reading-surface`). Find the
cheapest write form a cheap model gets right first time. For example:
- operations that take the text surface's own shorthand (a wire as one line, `from.port -> to.port`);
- defaults left out (a node's default parameters, auto-placed x/y);
- one call for a component's nodes and wires.

Measure on c03's own operations: characters before and after for the same graph. **Don't** change what the graph
can say. A compact form must round-trip to the same files.

## B. Reading: screenshots are 1280×900 PNGs, and each one opened stays in every later request (candidate)

c02: 2.9M of 3.5M characters of tool results were the agent's own screenshots, opened with `read_files`. Requests
reached 3.7M characters. c03: 58 screenshots (13 MB) saved; 17 `read_files`, mostly PNGs. A shot is 1280×900, about
420 KB. DeepSeek does see them (*"⌫ renders as a real backspace glyph"*), so they aren't useless. **The kit already
says it in `drive_page`'s answer** (*"Each image you open stays in your conversation … a read step answers most
questions without one"*), and the model opened them anyway. Advice again (FIX-03 C, LEARNINGS #4). So make an opened
image cheap, not discouraged: for example, a model-sized copy beside each shot (half the width, JPEG), named so it's
the one an agent opens. Measure: bytes per shot, and `chars=` in the tap log over a c02-like drive.

## C. Retrying: one tool's argument shape is 11 of 26 refusals (small)

Refused calls, c01–c03, by the server's own message (26 in all, leaving out `drive_page` verdicts):
- `get_node_type` **11 times**: `typeName` ×3, `node_type` ×3, `nodeType` ×1, and a string where `type_names` takes
  an array ×4. `didYouMean` names the right one, but each slip is a turn. Accept these aliases, and a lone string,
  as the same call.
- `update_component` given the wrong schema, or create's `connections`, ×4 (c03). FIX-02 C's hint answers it and
  the next call is right.
- `drive_page` `wait_for: { text_contains }` ×2.
- Graph validation rejections (a port that doesn't exist, …): real errors, which the validator should keep refusing.

(`drive_page` answers with `verdict: failed` are the app's own checks failing, not refusals. Leave them.)

## D. Reading the kit: the biggest answers (look, maybe trim)

c03's largest server answers: `get_node_type` 9 calls = 225k characters; `update_component` 25 = 212k (each write's
answer); `render_report` 2 = 105k; `get_project_info` 5 = 77k; `list_examples` 1 = 65k. c02: `get_style_vocabulary`
3 = 68k. A write's answer that repeats the component back is reading the model didn't ask for. Measure what's in
them before cutting. FIX-02's `readFirst` placement (the 8,000-character cut) must survive.

## How the lab will measure it

When you message the kit: a separate rounds folder (`own026-fix04/`), the same seeds (t1-nodegx-3, then its own chain),
changes c01–c03 at least, graded like test 2. Compared with the FIX-03 rows above: **the same checks** (any lost check
is a regression of the fix), and the overhead ratios. A $0 mock round first, as for every kit.

## Not now

- T6, F6: request readings, every arm (LEARNINGS #5).
- `P112-OWN026-MCPJSONABSPATH` (a moved project's `.mcp.json`), `-CONFIGFOUROHFOUR`: filed, not overhead.
- The off-ramp, the Studio in chat: other lanes.

## Done (2026-10-23, fixer `opennoodl-0d`)

**Commit `eee0d410a` on cline-dev.** The kit is packed from **FIX-03's commit plus this one only**: branch
`own026-fix04-pack` = `cb7e0d6e4` + `4f55b0cca` (the same change, cherry-picked clean). Cline-dev's head also has the
P125 commits since FIX-03 (among them `open_studio` asking to be called first in every turn that changes the app), and
they would have changed the overhead being measured. `nodegx-export` and the runtime types were built from that source
in the worktree, not taken from primary's newer `dist`. `git status` was empty after packing, and HEAVY.lock was held
while packing. (The lock had been held since 13:42 with no owner file and nothing running in a worktree; Richard said to
take it.)

**Kit:** `/Users/Shared/nodegx-lab/kits/FIX-04-eee0d410a/`

| tarball | shasum (sha1) |
|---|---|
| `nodegx-mcp-0.2.5.tgz` | `c400bcdb40568393e36126629621842fa3db59d6` (**the only new one**) |
| `nodegx-preview-0.2.4.tgz` | `95932ec27cae5ca593a087417137ce58e0e5626a` (FIX-03's, copied: nothing in the runtime changed) |
| `create-nodegx-0.2.5.tgz` | `cee60bdc412884eb655e2816f80973293f3eeb6d` (the registry's, unchanged) |

Nothing lives in a registry-only command: everything below is in the server.

### Measured first (t2-nodegx-c01…c03, scripts in the fixer's scratchpad)

Where c03's billed input went: 138 requests × ~267k tokens = 36.9M, against code's 86 × 118k = 10.2M. Each tool
result was weighted by its tokens × the requests that carried it. Write answers (`update_component` +
`create_component`) were 20.8%, the writes themselves 9.5%, `get_node_type` 9.3%, and `read_files` 13% (in c03 that
is mostly text, not images). Cline's cut caps any answer past ~12k characters at ~3–4k tokens, so a cut pays where an
answer drops below it.

### What changed

- **A. A wire is one line** (`P112-OWN026-WIREWRITECOST`). `create_component`, `update_component` (`set` and
  `operations`) and `stage_plan_operation` take a connection as `"fromId.port -> toId.port"`, the line `read_graph`
  prints. A bare line in `operations` is an `add_connection`. The handler gets the same four fields. Measured:
  - wires were 61k of c03's 152k written characters (41%); defaults were 479 characters and x/y 0, so the model
    already left those out;
  - **c03's 34 writes as lines: 152,263 → 113,103 characters (−25.7%)**.

  Replayed through the kit on a copy of c03's seed (`t2-nodegx-c02/work`), the 34 calls as recorded gave the same
  28 ok / 6 refused as the round. **The FIX-03 kit with objects, the FIX-04 kit with objects and the FIX-04 kit with
  lines wrote identical files**: 85 of 85, differing only in timestamps.
- **D. A write says once that checks did not run** (`P112-OWN026-SKIPNOTEREPEAT`). Two or more `dynamic-port-skipped`
  / `unknown-type-check-skipped` notes become one line per code: the count, then each node with the parameters left
  unchecked, so a misspelt name on a dynamic-port node is still named. A single note stays as it was, and findings
  come first. This applies to a write's answer, a rejection's `allDiagnostics` and a staged plan's diagnostics;
  `validate_project` already left these notes out. Measured:
  - write answers in c01–c03: −71% to −73%;
  - **the replay's 34 answers: 214,500 → 92,010 characters (−57%)**, the six writes the round answered with the same
    13.5k block (FIX-04 D) among them;
  - 19 Set Variables in one create: 1,136 characters.
- **C. A spelling whose meaning is not in doubt is the call it means** (`P112-OWN026-ALIASREFUSALS`), on both doors
  (`validateToolInput` and `call_tool`'s own parse):
  - `get_node_type`:
    - `typeName`, `typeNames`, `type_name`, `node_type`, `nodeType`, `node_types`, `nodeTypes`, `types`, `type`,
      `names` and `name` all mean `type_names`;
    - a string is taken as a list (`"Group, Text"` too);
    - `detail` `brief`/`short`/`compact`/`ports` means `summary`, and `complete`/`all`/`verbose`/`long`/`detailed`
      means `full`;
    - `ports: true` is dropped (the default answer already lists every port);
    - past 8 names, the first 8 are answered and the rest named in `notAnswered`, instead of a refusal.
  - `drive_page` `wait_for.text_contains` means `text`, which already matches part of the page.
  - `search_project` `query` means `text`.

  A call sending the real name and an alias is still refused for the extra key. By the refused answers in the three
  transcripts, these are **15 of the 27 refusals** (`get_node_type` 11, `drive_page` 3, `search_project` 1). The rest
  are graph validation, broken JSON, the `/tmp` fence, a nested `call_tool` and a backend start.
- **B. Screenshots: measured, not changed.** An opened 1280×900 shot is 200–490k base64 characters in the request
  but **≤ ~1k billed tokens**. Images were 0.9% / 2.1% / 0.0% of c01 / c02 / c03's input (an upper bound), and
  requests over 1.5M characters were not slower in c03 (12.5 s against 15.3 s). The tap log's `chars=` is base64, not
  billing. A smaller copy of each shot would cut bytes and next to nothing of cost.
- **The resident surface paid for it.** The wire line costs ~80 tokens on every request: two sentences, plus a string
  alternative in four schema places. AWP-006's gate is 8,280. A node's `comment` is now one zod instance, so
  `update_component` renders it once and `$ref`s it (AWP-006's own recommended fix, −25). `get_node_type`'s
  description no longer says what its answer says in-band when it happens (nearest-match suggestion, `summarized`).
  **8,277 of 8,280: 3 tokens of margin**, reported on every passing run.

### Proof from the tarballs (empty HOME)

- `npx --package=<create tgz> create-nodegx --cline my-apps` exit 0: it wrote `my-apps/AGENTS.md` and
  `home/.cline/data/settings/cline_mcp_settings.json`.
- The server ran exactly as the Cline entry runs it (`npx -y --package=<mcp tgz> noodl-mcp --allow-writes
  --screenshots-to-files`), with no project bound, then `open_project` on a copy of the seed, everything through
  `call_tool`. **15/15 checks:**
  - get_node_type's six spellings, and ten names (8 answered + `notAnswered`);
  - `search_project { query }`;
  - create with connections as lines, and a bare line in `operations` (the `applied` row and both wires on disk as
    the four fields);
  - a garbled line refused by name;
  - 19 Set Variables answered with one folded line;
  - **`drive_page` `wait_for: { text_contains }` PASSED in a real headless browser.**

### Suites

- `tests/own026Thinner.test.ts` 22/22.
- noodl-mcp: 251 suites, 4,759 tests, **16 red, none from this change**. The same set as FIX-03's list (SBR-009,
  DEF-018, the Nightbook/DEF-038 template, CMP-004 ×4, CMP-001, `own020CallToolStrip`, FLD-013 ×3), except that
  `projectBinding` is green now and BST-006 is red: the P125 briefing (`131914e73`) against its golden file.
- `vocabularyParity`, `toolDisclosure` (the surface), `stagingDiagnostics`, `rejectionExamples`, `unknownArguments`,
  `tools`, `cn004` and `own026GuidanceCut`: green.
- `tsc` on noodl-mcp: clean apart from `nodegx-export/src/emit/swift/modifiers.ts`, which reads a peer's uncommitted
  Swift files.

### Not done, and why

- **A short id in a line.** `read_graph` prints a uuid id as 8 hex characters, and a line copied from it names a node
  the write doesn't know, so it is refused, not miswired. It is 1 of 513 ids in this app (the model chooses its own
  ids), so it was not resolved here.
- **Reading side of A.** `get_component` and the rest still answer connections as objects (c03: `get_component` 3
  calls, 20k). The `applied` echo lists every operation, up to 4.7k on a 68-op batch.
- **A malformed object or garbled line in `operations`** is refused with zod's `invalid_union` around the real
  reason ("is not a wire", "toProperty Required"). It is noisier than before, though still the reason.
- **`get_node_type` full detail for several types** (31–57k, all 9 calls in c03 asked `full`) still reaches Cline as
  its start and end. The server cannot know a client's cut. The candidate is answering `full` past ~8k as the first
  type full and the rest as summaries; that changes a documented answer, so it waits for the lab's numbers on this
  kit.
- **Screenshots (B)**: see above.
- **The resident surface has 3 tokens left.** The next field is a renegotiation. The honest one is per-tool `$ref`s
  for the node schema, which `create_component`, `update_component` and `stage_plan_operation` each inline (~550
  tokens each).
