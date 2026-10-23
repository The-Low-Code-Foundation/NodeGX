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
