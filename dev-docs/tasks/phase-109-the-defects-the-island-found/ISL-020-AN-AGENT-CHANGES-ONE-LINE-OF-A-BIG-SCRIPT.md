# ISL-020 — An agent changes one line of a big script

**Status: ⬜ not started — scoped 2026-10-01 at `27d891bf3`.** **Source:** [AUDIT F27](AUDIT-2026-10-01.md) · sized by
F08 (17 copies of one engine) · **Side:** product (MCP door, `noodl-mcp`)

To fix one line in a Function's script through the door, an agent reads the whole component and sends the whole script
back. On the garden that is up to 146,000 characters out and the same back, for one line, and 17 times over for an engine
fix. The tools an agent already uses on source files (find a string, replace it, check the count) do not exist for the text
inside a node.

## 1. The person sentence

**An agent fixes one line in a 2,000-line Function by sending that line, not the script, and is told if the line it meant
was not there, or was there twice.**

## 2. What was measured

All rows **re-read by me at HEAD `27d891bf3` on 2026-10-01**, from source and by parsing `templates/bot-garden` with
`node`/`stat`. The door was not run.

| reading | where |
|---|---|
| `update_component` takes either `set` (the whole graph) or `operations`. The finest operation is `update_node`, whose `parameters` are **shallow-merged**: a parameter's value is replaced whole | `packages/noodl-mcp/src/tools/author.ts:603-625` (schema), `:74-125` (operations; `parameters` at `:107`) |
| `get_component` returns every node with every parameter in full. Nothing truncates or elides a long string. (The audit cited `read.ts:68`; that line is the `list_components` description rule, which says the opposite tool returns descriptions in full. The graph read is the one below) | `src/tools/read.ts:264-307` |
| `search_project` finds nodes by type or by text, matched against labels **and string parameter values**, and returns locations (`parameter:<name>`), capped at 200. It is deferred, in the `explore` group | `read.ts:314-365`; `src/toolGroups.ts:293-329` |
| The garden: 127 components, `nodes.json` totalling 3,560,841 B; **21 over 50 KB**; the largest `Logic/Translate words` at 221,722 B (330,415 B with its connections and component file) | `stat` over `templates/bot-garden/components/**` |
| 39 string parameters longer than 20,000 characters: 36 `functionScript` on `JavaScriptFunction`, 2 `Static Data.json`, 1 `CSS Definition.style`; the longest **145,870** characters, 2,079 lines (`Logic/Shop card`); `Logic/Step`'s is 91,790 characters, 1,308 lines, and holds an engine copy | `node` parse, this session |
| `var BLOCKING_TILES = { W: 1` is in **17** `nodes.json` (the engine copy count the audit gives) | `grep -l`, this session |
| The audit's estimates, not re-derived: about 90k tokens to read the largest component, about 1.1M tokens to emit the whole template through tool calls | AUDIT F27 |

## 3. Where it bites

- **An agent maintaining an app with real logic.** A one-line fix costs a full read and a full write of the script, and a
  long resend is where a model drops or rewrites a line it did not mean to touch. Nothing tells it that happened.
- **An engine fix in the garden** is 17 such round trips, or a regeneration from TypeScript outside the project (F08).
- **The resident budget is not the issue here; the per-call payload is.** `get_component` on the largest component is a
  tool result many MCP hosts cap (the README's own limitation note for `get_node_type`, `packages/noodl-mcp/README.md:277`).

## 4. Related work and collisions

- **ISL-005** (two Functions share one piece of code) removes most of the bulk: 17 copies become one. It does not remove
  the problem: one shared module is still the largest text in the project. Rule both together (README §9).
- **ISL-006** (a Function says what its ports are): today a Function's ports are mined from its script text, so a text edit
  can add or remove a port. The edit path must re-derive ports exactly as a full write does.
- **ISL-019**: an edit is a write; it takes its `modified` from the same clock.
- **P55 LEG-001** (the `comment` field on `update_node`): precedent for adding one field to the operations door, and for the
  strict schema that refuses an unknown key (`author.ts:93-106`).
- Owner grep: `grep -rlai "patch_parameter\|string patch\|text_patch\|replace_in_parameter\|range read\|get_component.*truncat" dev-docs/tasks --include='*.md'`
  → only this phase's audit. **No owner.**

## 5. Design — 🔒 rulings first

1. 🔒 **The shape of the edit.** (a) A new operation on the resident `update_component`: `{ op: "edit_text", id,
   parameter, find, replace, count }`. (b) A new **deferred** tool, `edit_node_text`, with the same arguments plus
   `if_revision`. (c) A line-range replace (`from_line`, `to_line`, `text`). **Recommendation: (b), find-and-replace with an
   expected count.** (a) costs resident tokens on every turn (see the budget below). (c) is fragile: a line number read
   earlier is wrong after any other edit, and an agent already knows the find/replace contract from editing files: refuse
   on 0 matches, refuse on more than `count`, say how many were found.
2. 🔒 **The read half.** (a) `get_component` elides any string parameter over a threshold (say 4,000 characters) by
   default, returning its length, a hash, its first lines and the sentence "read it with `read_node_text`". (b) Leave
   `get_component` whole, and add a deferred `read_node_text` (a parameter, an optional line range, with line numbers).
   **Recommendation: (a) and (b) together.** Elision changes no schema (the note is in the response), so it costs 0
   resident tokens, and it is the change that stops the 90k-token read. It is also a behaviour change for every agent: an
   agent that round-trips `get_component` into `set` would write the elided text back. 🔴 So `set` and `update_node` must
   refuse a value that is an elision marker, by name.

Constraints:

- 🔴 **The resident surface is full**: `SURFACE_TOKEN_BUDGET = 8280` (`tests/toolDisclosure.test.ts:83`), last recorded at
  8,275, **5 tokens of headroom** (`src/toolGroups.ts:425-430`). `update_component` and `get_component` are resident; a new
  operation in `operationSchema` is billed on every turn of every session and is not available. New tools go in a
  **deferred** group, appended (measured three times at **0** resident tokens): the `explore` group, beside `search_project`,
  which is the find half of the same task. Add `edit`, `script`, `replace`, `line` to its `keywords` (never sent, cost 0).
- A new tool owes registration (`edit_node_text` under `--allow-writes`, in `WRITE_ONLY_TOOLS`), a `TOOL_GROUPS` home (guard
  at `toolDisclosure.test.ts:141`), a README §Tools row, and a spec that reaches it through `find_tools`.
- **The edit is a write like any other.** It runs the same validation as `update_component` (rejects on new errors, writes
  nothing), honours `if_revision`, and re-derives a Function's ports from the edited text.
- A multi-node form (`edits: [{ component, id, parameter, find, replace, count }]`, all or nothing) covers the 17-copy
  engine fix in one call; `search_project` supplies the locations.

## 6. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8.** A spec on a copy of `templates/bot-garden` changes one line inside `Logic/Step`'s `functionScript` through the in-process door, the only way the door allows: `get_component`, then `update_node` with the whole new script. It records the characters read and sent (each over 100,000 on the largest copies) and that `find_tools` offers no text-edit tool. **Known-firing control beside it:** the same spec changes a short `Text.text` with the same `update_node` and sends under 100 characters, so the instrument reads small edits as small. |
| AC2 | After: `edit_node_text` makes AC1's change by sending the old line and the new line; the characters sent are recorded and are under 1% of AC1's. 0 matches and 2 matches are each refused with the count found, and nothing is written. |
| AC3 | An edit that adds `Outputs.newPort = …` to a Function's script reports the new port, exactly as `update_node` with the full script does on the same node (ports compared, not assumed). |
| AC4 | 🔴 **Reverted arm:** make the tool replace every match regardless of `count`, and AC2's two-match refusal goes red. |
| AC5 | Elision (ruling 2(a)): `get_component` on `Logic/Translate words` returns under 20,000 characters; feeding that response back as `set` is refused by name, and `read_node_text` with a line range returns the lines asked for. |
| AC6 | **The person's door, over the real protocol.** Claude Code (stdio server from `dist/noodl-mcp.cjs` under a project-local `--mcp-config`) on a copy of the garden is asked to change one named constant in every copy of the engine. Its transcript shows `search_project` then `edit_node_text` (or the multi-node form), no `get_component` of a component over 50 KB, and the 17 copies changed and nothing else (a tree diff). |
| AC7 | **The generator's matching step.** The generator has no raw-fs step for this: it rebuilds every script from TypeScript on each run, which is the workaround. So the AC is an incremental path that must agree with it: apply one engine edit to the checked-in garden through `edit_node_text` (all 17 copies), and separately make the same edit in `cg002Scripts.ts` and regenerate. The two trees are **byte-identical** (after ISL-019's reproducible mode, or with its pins). |

## 7. Traps

- 🔴 **The elision marker is a value an agent can send back.** Without the refusal in ruling 2, a read-modify-write of a
  component silently replaces its scripts with their summaries, and validation passes because a string is a string.
- 🔴 A `find` string that contains the edit's own `replace` text matches again after the edit. Count matches once, before
  replacing.
- ⚠️ Script text in a template literal: a backtick or `${` in `replace` is fine for the door and fatal for a generator that
  later writes it back into a `.ts` source (F33). AC7's TypeScript arm meets this.
- ⚠️ Line endings: scripts written on Windows carry `\r\n`. A find string with `\n` must match or say why not.
- ⚠️ An AC that reads only "the file changed" passes on a script rewritten whole. AC6's tree diff is what shows that only the
  one value moved.

## 8. Record

None yet.
