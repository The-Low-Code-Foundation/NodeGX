# ISL-006 — A Function says what its ports are

**Status:** ⬜ not started — scoped 2026-10-01 at `27d891bf3`
**Source:** [audit F09](AUDIT-2026-10-01.md) · `Logic/Translate words` (696 outputs) and the generator's 120-entry name→type table · related register rows [P78 D45 and D80](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) (a wire to a port the script never mentions)
**Side:** product (runtime `Function` node and its port parser, the editor's port panel, the MCP door, catalog docs)

A `Function` node's ports are found by reading its script for `Inputs.x` and `Outputs.y`. That is friendly for five ports.
For a list of names it fails: `Outputs[key] = …` in a loop mints nothing. So the island's word list became a generated
script of 695 literal lines, and the generator grew its own copy of the runtime's regex to predict which ports would exist.

## 1. The person sentence

**An author gives a Function a list of the ports it has, with a type for each, in one place, and can see the list on the
node. A wire to a port that is not on the list is refused before the app runs.**

## 2. What was measured

HEAD `27d891bf3`, 2026-10-01. Every row was re-read by this task's author at HEAD unless it says otherwise.

| reading | where |
|---|---|
| `Logic/Translate words` at HEAD: its Function has **698 saved ports, all typed `*`** (3 inputs, 695 outputs). The Component Outputs beside it has **696** (691 `*`, 2 boolean, 1 number, 1 string, 1 signal `ran`). The script is 28,551 bytes, and 695 distinct `Outputs.<name>` are mined from it. Re-read at HEAD | `templates/bot-garden/components/Logic/Translate words/nodes.json` (parse) |
| The generator writes that script one line per word: `${WORD_KEYS.map((key) => \`Outputs.${key} = map.${key} \|\| '';\`)…}`, with the comment *"`Outputs[key]` in a loop mints no port"*. Re-read at HEAD | [`cg002Scripts.ts:26-30, 2310-2324`](../../../packages/noodl-mcp/tests/cg002Scripts.ts) |
| The generator mirrors the runtime's parser with `portsOf` (`/Inputs\.([A-Za-z_$][\w$]*)/g`, `/Outputs\.([A-Za-z_$][\w$]*)/g`). It types the **wrapper component's** ports with a 120-odd-entry `TYPE` table keyed by port name (`world: 'object'`, `lang: 'string'` …). Anything else is `*`. Re-read at HEAD | `cg002Scripts.ts:2384-2390`; [`cg003Components.ts:360-399, 427-429`](../../../packages/noodl-mcp/tests/cg003Components.ts) |
| 🔴 **"Ports are untyped" does not hold as a product fact.** The Function node already has two author-edited proplists, `scriptInputs` and `scriptOutputs`, each row with a Type enum (`intype-<label>` / `outtype-<label>`: string, boolean, number, object, date, array, color, plus signal for outputs). The runtime registers a typed output from them (NDA-014), and the door's `scriptPortsForNode` honours them (DEF-011). The template **never used them**: 0 `scriptOutputs` / `outtype-` parameters in Translate words. Re-read at HEAD | [`simplejavascript.ts:216-237, 721-741, 828-886`](../../../packages/noodl-runtime/src/nodes/std-library/simplejavascript.ts); [`cloudDynamicPorts.ts:217-246`](../../../packages/noodl-editor/src/editor/src/models/nodelibrary/cloudDynamicPorts.ts); `editor-deps.ts:713-721` |
| The catalog tells authors and agents **not** to use that route: `scriptInputs` / `scriptOutputs` are *"Editor-managed list … — not authored directly"*. Re-read at HEAD | `docs/node-catalog/enrichment/javascriptfunction.json:9-10` |
| What does hold: a declared list is still one row per name. 695 words would be 695 proplist rows. There is no way to declare ports **from data** (a list input, a table, a JSON shape). Read from source, at HEAD | as above |
| Source-predicted quirks of the miner, **not run**: (1) the signal regex is `Outputs\.([A-Za-z0-9]+)\s*\(\s*\)` with no `_`, so `Outputs.do_it()` mints no signal and the value regex mints a `*` port `do_it` instead; (2) the `Inputs["x"]` form pushes a port with `plug: 'inputs'` (plural), which is not an input; (3) `(.*)` in the bracket form is greedy across one line; (4) comments are not stripped (the strip line is commented out), so a name in a comment mints a port. The generator's mirror regex accepts `$` and `_` and so already disagrees with (1) | [`javascriptnodeparser.js:294-388`](../../../packages/noodl-runtime/src/javascriptnodeparser.js) |
| **An existing route for computed ports:** the Script node (`Javascript2`) *runs* its code in the editor and takes ports from `define({ inputs, outputs })` with types (`getPorts`), so a loop-built `outputs` object would mint ports. Predicted from source, not run. The exporter reads a Script node's ports **from disk only**, *"the set the editor persisted after running the code"*, and the door's port derivation covers `JavaScriptFunction` only. So a door-built Script node would have no ports until the editor opened it | [`javascriptnodeparser.js:10-55, 390-428`](../../../packages/noodl-runtime/src/javascriptnodeparser.js); [`javascript.ts:694-701, 839`](../../../packages/noodl-viewer-react/src/nodes/std-library/javascript.ts); [`script.ts:20-28`](../../../packages/nodegx-export/src/analyze/script.ts) |
| The exporter's gate clones the runtime's mining regexes *"verbatim … so the two must not drift"*. That makes a third copy of the grammar, after the runtime's and the door's `cloudDynamicPorts.ts` (pinned by `tests-unit/sb-017/cloud-ports-agree-with-the-runtime.test.ts`). Re-read at HEAD | [`jsfun.ts:1-10`](../../../packages/nodegx-export/src/analyze/jsfun.ts) |
| P78 **D80** (owner NONE): the door accepts a wire into `in-<name>` that the script never reads, and only the deploy's wire check says so. **D45**: the same, found by the harness inventing the port. As recorded in the register (2026-09-11, 09-23); not re-driven here | register lines 2147-2165, 3179-3200 |

## 3. Where it bites a person

- Any Function that publishes many named values: a translation table (ISL-007), a settings object split into fields, a
  parsed record's columns. Each needs a literal line per name, or a hand-made proplist row per name.
- Everything is `*` unless the author finds the proplist, which the docs tell them not to touch. A `*` output wired to a Text
  does not get the object-to-JSON cast NDA-014 built for typed outputs.
- An agent cannot know a Function's ports without running the same regex. The garden's generator carries a copy that already
  disagrees on `_` in signal names.

## 4. Related work and collisions

- **P88 [GAM-002](../phase-88-the-defects-the-games-found/GAM-002-STRING-AND-NUMBER-WORK-INSIDE-AN-EXPRESSION.md)** (🟢 built): the
  *Expression* node's identifier miner, replaced by a lexer. That is the same family of defect, but a different node and
  parser (`expression.ts parsePorts`), so there is no code collision. Its lexer is a precedent if ruling 2 picks (b).
- **P30 NDA-014** (typed Function outputs) and **NDA-017 §2** (run-on-value-change per input) built the proplist typing this task
  would promote. Do not break `runOnChange-in-*` labels derived from the assembled list (`simplejavascript.ts:906-925`).
- **P78 D45 / D80** (owner NONE): the wire-to-an-unmined-port check. D80 names the cheapest door: *"the validator already parses
  the script … a wire into `in-<name>` that the parse did not produce is a warning"*. AC4 here closes D80; record it in the register.
- **P76 DEF-011 / SB-017:** `scriptPortsForNode` and its agreement test. Any parser change moves three copies together.
- **ISL-005** (shared code): a shared module must not mint ports; **ISL-007** (translation) removes the largest consumer of
  generated output lines.
- Owner grep: `grep -rn -i "scriptOutputs\|outtype-\|ports from data\|declare.*ports\|Outputs\[key\]" dev-docs/tasks --include='*.md'` →
  NDA-014/NDA-017 (built), DEF-011 (built), no open owner for declared-from-data ports or for D80.

## 5. Design — 🔒 rulings first

1. 🔒 **What is the source of truth for a Function's ports?**
   (a) **The declared list** (the existing `scriptInputs` / `scriptOutputs` proplists, promoted from "editor-managed" to the
   primary route, with types). Mining stays as a convenience that *adds* untyped ports.
   (b) **The declared list only,** once a node has one. Mining is off for that node, so a stray `Outputs.typo` is an error, not a
   new port.
   (c) **Mining only** (today), with docs fixed.
   *Recommendation: (b), per node and opt-in.* A node with no declared list mines as today, so no project changes. A node with
   a list is exact. That is what makes a refused wire possible (the person sentence).
2. 🔒 **Can a list of ports come from data?**
   (a) No: one row per port, and ISL-007 removes the main reason to want it.
   (b) Yes, from a parameter: a JSON array of `{ name, type }` (or a Static Data shape) that the editor and the door both read
   without running code.
   (c) Yes, by running code (the Script node's model).
   *Recommendation: (a) now, (b) only if a second consumer appears after ISL-007.* (c) cannot be read by the door or the
   exporter without executing author code.
3. 🔒 **Fix the miner's quirks** (underscore signals, plural `inputs`, comments) **or freeze them?** Fixing changes ports on saved
   projects. *Recommendation: census first (AC5), then fix the ones the census shows nobody relies on.*

Constraints: one grammar, shared by the runtime, the door and the exporter (today there are three copies pinned by tests).
`run`, `done`, `success`, `failure` and the other static ports stay unprefixed. Every changed port name needs a migration
(memory: "RENAME⇒NO mig").

## 6. Acceptance criteria (apply after the rulings are recorded in §8)

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8.** A spec writes, through the door, a Function with a declared output list `{ a: number }` whose script also writes `Outputs.b`, plus a wire from `out-c`. At HEAD it records: `b` is minted as `*`, the wire to `c` is accepted, and the catalog calls the list "not authored directly". Known-firing beside it: a wire to `out-a` is accepted and typed `number` (the proplist route works). |
| AC2 | **The person sentence, in the editor and a browser.** An author declares three typed outputs in the panel and wires them. The node shows exactly three outputs with their types. A wire to a fourth name is refused at write time with the name. The deployed page shows the three values. |
| AC3 | **Typed reaches the screen.** A declared `object` output wired to a Text shows JSON (NDA-014's contract). The same output undeclared shows what it shows at HEAD, recorded. |
| AC4 | **D80 closed.** The door warns or refuses (as ruled) on a wire into `in-<name>` that neither the declared list nor the script produces. **Sabotage arm:** remove the check and the spec goes red on exactly that wire. Record D80 as fixed in the register. |
| AC5 | **Census before any parser change.** Every `functionScript` under `library/`, `templates/` and the P86 corpus is counted for: an underscore signal, `Inputs["…"]`, a port name that appears only in a comment. Record the counts. A quirk is fixed only where its count is 0 or a migration covers it. |
| AC6 | **One grammar.** The runtime, `cloudDynamicPorts.ts` and `jsfun.ts` import one implementation, or the agreement test covers every quirk AC5 found. A reverted arm (one copy drifts on `_`) goes red. |
| AC7 | **Docs and catalog.** `javascriptfunction.json` describes the declared list as the way to type a port (not "editor-managed"). The docs page says the same, and `catalog:check` is green. |
| AC8 | **The template.** `Logic/Translate words` (or ISL-007's replacement) carries typed ports, and the generator's `TYPE` table and `portsOf` mirror are deleted or reduced to what is still needed, with the count recorded. |

## 7. Traps

- **The proplist is not new.** The fix is mostly promotion, docs and the door. Building a second declaration mechanism beside
  `scriptInputs`/`scriptOutputs` would leave three.
- **`*` hides type errors in both directions.** Grade AC3 on the screen, not on the port list.
- **Changing the miner changes saved projects.** A port that disappears takes its wires with it silently (the D45 shape).
  AC5 comes before code.
- **The harness invents ports** (D45: `render-from-disk` lifts ports off connections). Grade AC2 and AC4 on a deploy or the door,
  never on the render harness alone.

## 8. Session log

None yet.
