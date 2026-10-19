# SEE-000 — The census: what the templates are made of, and what they cost to build

**Opened 2026-10-01.** **Depends on nothing.**
**Status: 📋 not started.** The phase's baseline; every later ratchet reads it.

## 1. The person sentence

> **Anyone can run one command and read, for every template and both training apps, how much of the app is nodes
> whose behaviour is known, how much is script, and what it cost an agent to build through the MCP.**

## 2. What was measured by hand at scoping (README §1)

| app | graph JSON bytes | component files | nodes | connections | Functions | script lines |
|---|---|---|---|---|---|---|
| `templates/digital-bricks-training` | 1,600,184 | 247 | 1,037 | 1,390 | 147 | 7,796 |
| `templates/todo-list` | 614,462 | 163 | 585 | 1,087 | 52 | 2,620 |
| Olive's Island (P109 reading 1) | — | — | — | — | 83 | 2.39 MB, 17 copies of one engine |

The hand script counted a node as any object with `type` and `id`, so it over-counts by the `visual` wrapper entries
(52 in the todo). The task's script must count what the runtime instantiates, the way `scripts/node-spec/census.js`
counts picker nodes, and say which rule it used.

## 3. What to build

1. **`scripts/see/census.js`** over every project under `templates/` and any directory passed on the command line.
   Per project and per component: node count by type, connections, Function / Script / Expression nodes with their
   script line counts, kit nodes (a `noodl_modules` type with no P107 spec), and the **honesty number as SEE-001 will
   define it**, computed here first by hand so SEE-001 has a reference to agree with. Output: `census.json` beside this
   file and a Markdown table in `CENSUS.md`.
2. **The cost side.** For each template whose build has a transcript or a generator (P109 reading 2: every generator is an
   in-process MCP client), count MCP tool calls by name and, where a transcript records them, tokens. Where there is no
   record, say "no record" in the cell. Do not estimate.
3. **A gate**: `tests/see-census.test.ts` fails if any template's node count, Function count or script line count moves
   without `census.json` being regenerated in the same commit, the picker-coverage ratchet's shape.
4. **The code training app** (`vscode_projects/digital-bricks-training`, outside this repo): one row, by hand, naming the
   slice Richard rebuilt in NodeGX (R7) and its file and line counts, so SEE-010 has its control.

## 4. Acceptance criteria

1. `node scripts/see/census.js` prints the §2 table with the runtime's counting rule, and the numbers for the two
   templates agree with §2 within the wrapper over-count, explained.
2. Each template's honesty number is in `census.json` with the rule written beside it; a Function counts as script (R3).
3. The cost table has a row per template; every cell is a number or "no record".
4. The gate goes red when a Function is added to the todo template by hand and green once the census is regenerated.
5. `CENSUS.md` names, for each template, the three largest Functions by lines, with one line each on what they do. That
   list is SEE-004's starting point.

## 5. Watch for

- Memory: *a count gate reddens ⇒ count the artefact, never bump the literal.* The census is the constant.
- Memory: *a project scan must read both project formats.* The templates are v2; a passed directory may not be.
- The MCP generators write some files by hand around the door (P109 reading 2). A tool-call count is the door's share,
  not the whole build. Say so in the column heading.
