# ISL-006 — A Function says what its ports are

**Status: ✅ s20 (2026-10-06): closed. AC2's panel half and AC10 read live in the editor; the editor session found that the shared reader made no port in the editor's preview (ES5 build, `P109-S20-ES5READER`), fixed in `a7914b837`. AC8 handed to P108 IW-010. One small question filed, not blocking: `P109-S20-LISTDEFAULTTYPE` (needs-ruling).** **s19 status:** 🟡 s19 (2026-10-05): slices 1 and 2 built — AC1, AC3, AC4 (D80 closed), AC5, AC6, AC7, AC9 met; AC10 met in its logic (real-project copy) and its `upgradeOnLoad` entry; AC2 met on the door and a deployed page. Owed, one editor session: AC2's panel half and AC10 opened live in the editor (the toast, the save). All three rulings in (1 "List adds, code still mines"; 2 "Not now"; 3 "Fix all three", re-asked once with corrected numbers, plus "fix up old projects"). AC8 handed to P108 IW-010.** **s18 status:** 🟢 ruled, not built — ruling 1 "List adds, code still mines"; census 1,210 Functions, 35 with a list, 4 by variable. **Earlier status:** ⬜ not started — scoped 2026-10-01 at `27d891bf3`
**Re-scoped s8 (2026-10-03), against "Native nodes first" and ISL-007:** its largest consumer goes. `Translate words`
(696 outputs) is replaced by the i18next add-on (ISL-007, built s8) and deleted in [IW-010](../phase-108-the-island-works/IW-010-THE-ISLAND-IN-NATIVE-NODES.md)
AC4. What is left is the general case: a Function whose outputs come from a list (`Outputs[key] = …`) mints none, and a
generator predicts ports with its own copy of the runtime's regex. Still a product defect; no longer the island's
blocker. Priority below the three gaps IW-010 depends on.
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

- **P88 [GAM-002](../../tasks-archive/phase-88-the-defects-the-games-found/GAM-002-STRING-AND-NUMBER-WORK-INSIDE-AN-EXPRESSION.md)** (🟢 built): the
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

🔴 **Rewritten s19 for the rulings** (§8 s19 has them verbatim). Ruling 1 is (a), so the node's ports are its written list
plus what its code names plus any port saved on it; AC1's "`b` is minted as `*`" stays true by design, and AC4 refuses a
wire to a name in none of the three. Ruling 3 "Fix all three" adds AC9 and AC10. The table below is the original; where a
row and this note disagree, the note wins:

- **AC1** stands as written (the RED reading at HEAD), with an input arm beside the output one.
- **AC2** "a wire to a fourth name is refused at write time" = AC4's refusal, read on the door. "The node shows exactly three
  outputs" holds only when the code names nothing else: under (a) the code still adds its own.
- **AC4** refuses (error), not warns: every name it refuses is one the editor's build deletes (§8 s19, measured).
- **AC6** "one grammar": the copies were six, not three (§8 s19). Slice 1 removes one and pins the rest by name, plug and type.
- **AC8** is handed to P108 IW-010, which deletes `Translate words` and rewrites the generator that holds `TYPE` and `portsOf`.
- **AC9 (new, ruling 3).** The reader's three quirks are fixed in every copy: `Outputs.do_it()` is a signal; `Inputs["x"]` is an
  input (and the bracket name stops at its own quote); a name inside a comment makes no port, with a string-, template- and
  regex-aware stripper. The agreement specs gain rows for each, including a `//` inside a URL string.
- **AC10 (new, ruling 3's fix-up).** A project opened in the editor keeps every wired port the old reader made: a wired
  `in-`/`out-` name the old reader mints and the new one does not is written onto that Function's list, once, and saved.
  Graded on a copy of a project that has one (SuntappedX has 12 such Functions), with a control project that has none.

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

### Session 18 (2026-10-05) — re-scoped against shape 1 (ISL-005 closed, `8292f1d55`)

- Shape 1 does not move this task: a script file never makes a port (ISL-005's rule), so a Function's ports still come from
  its own text, and the question in §5 stands as written.
- **Census, re-measured** (templates, library prefabs, library examples): **1,210 Functions; 35 carry a declared
  `scriptInputs`/`scriptOutputs` list; 4 reach a port through a variable** (`Outputs[x]` / `Inputs[x]`): 2 in `planning`
  (*"Is there anything to write?"*, *"What the project editor is showing"*) and the same 2 in `planning-demo`.
- 🔴 The s8 re-scope's *"`Translate words` is deleted in IW-010 AC4"* has not happened yet: it is still in the garden, 31,745
  characters of literal `Outputs.word = …` lines (literal, so the census above does not count it).
- Rulings 1–3 not asked; ask them with these numbers.

### Session 19 (2026-10-05) — slice 1 built; rulings 2 and 3 asked

**What the runtime does with a wire to a port neither the list nor the code makes (D80 said "not measured").** A scratch
runtime probe (graph harness, real `simplejavascript`): the runtime keeps it. `registerInputIfNeeded` /
`registerOutputIfNeeded` register any `in-` / `out-` name when a wire arrives. An unread input still re-runs the Function
(runs 1→3, the same as a read one), and `Outputs[k] = 5` with `k = 'c'` reached a wire from `out-c`. 🔴 So D45's "the port
never existed; the wire targeted nothing" is true of the editor, not of the runtime. The editor's port list is the written
list plus the code's names plus the node's saved `ports` (`NodeGraphNode.getPorts`). Any other wire is painted "Target port
doesn't exist" at `level: 'error'`, and `exportComponent` deletes every error-level wire (DEF-034). The app the editor
builds never has it.

**Corpus** ([`isl006-census.js`](isl006-census.js), the runtime's own `parseAndAddPortsFromScript` sliced from source
and evaluated, both project formats): templates, library and catalog examples hold 205 projects, 1,214 Functions and 9,669
prefixed endpoints. 22 wires name a port neither the list nor the code makes. 17 of them survive through a saved port
(`in-mounted` ×6 in todo-list and its demo, `in-callerId` ×6 and two more in digital-bricks-training, and others in the
training demo). 5 are deleted by the editor's build: `in-conceptId` ×2, `in-field` and `in-value` on the training demo's
stubs (`tools/build-demo.mjs` keeps the wires of the scripts it stubs), and `in-id` on Nightbook's `openEnvelope`.

**Built (AC4, closes P78 D80):** `unknown-function-port` (error) in `functionPorts.ts`. The door refuses a wire to a Function's
`in-` / `out-` name that is on neither list, nowhere in the code (as the runtime mines it) and not saved on the node. The
message names the port, says what the node has, and says the editor leaves the wire out of the build. The suggestion is the
list row and its type parameter, and notes the list is the route for `Outputs[key]` and for an input the code never reads.
`packages/noodl-mcp/tests/isl006FunctionPortList.test.ts`: 6/6. AC1 RED at HEAD (before the branch): both dead wires
accepted, `isError: false`. Known-firing: `out-a` on the list saved `number`, `out-b` from the code `*`. Controls: the input
on the list, the port saved by hand (SB-004), and `Outputs[k]` with `c` on the list all accepted. Sabotage (the check
returns early): exactly the two AC4 rows red; restored by `cp`, `cmp` clean.

**Blast radius, attributed with the check switched off and on:** editor `fix-006`, `fix-007`, `oneWayGate`, `queryBeforeFilter`,
`sb-017` 86/86. `noodl-mcp`: `tpl008`, `tpl010`, `tpl005`, `tpl001`, `tpl003`, `cg003`, `isl005GardenScripts`,
`validateOnDiskPreconditions` and `def011` green. `def038SettledTemplates` has 2 red (DBT demo, Nightbook), red with the check
off too (not this change). **One new red:** P78's uncommitted TPL-011 pile (`tpl011Template.test.ts`, untracked since 09-27),
35/35 → 32/35 on exactly the `openEnvelope` `in-id` wire. A true positive; filed for its owner, generator not touched.
`tsc --noEmit`: editor 0 errors; `noodl-mcp` 10, the same island spec files as s18.

**AC6, one grammar:** the copies were **six**, not three: the runtime, the door's `cloudDynamicPorts.ts`, `functionPorts.ts`
(the check above, missed by §2), the exporter's `jsfun.ts`, the code editor's `noodl-core-ui/.../scriptPorts.ts` (plus its
`notation.ts` hints), and `scripts/library/render-check.js`. `functionPorts.ts` now reads `scriptPortsFromSource` and holds no
copy. 🔴 The two agreement specs compared names only: drifting the door's signal pattern to accept `_` stayed **36/36 green**.
`sb-017` gained a row of the quirk shapes compared by name, plug and type; the same drift now reddens exactly that row.
`nodegx-export/tests/isl-006-mined-ports-agree.test.ts` (new) compares the exporter's `functionMinedPortsOf` with the
runtime's own function, read from source: 12/12, with the `.send()` difference asserted on its own. The exporter's signal
pattern drifted the same way reddens exactly the `do_it` row. `noodl-core-ui` and `render-check.js` are not pinned yet (slice 2).

**AC7:** `javascriptfunction.json` describes the written lists as the way to give a port a type, gives the row shape and the
type parameters, and says when a name belongs on the list (`Outputs[key]`, an input read by nobody that should still
re-run). It also drops two sentences stale since FIX-007 ("accepted by every write path", "survives every validator").
`catalog:merge`, `docs:nodes` regenerated (one page changed, `java-script-function.md`). `catalog:check`, `catalog:merge:check`
and `docs:nodes:check` all exit 0. The copy passed `written.py` after one split (a chained sentence).

**AC2 and AC3 on a deployed page** (`scripts/devtools/isl006-typed-ports.ts`: built through the door, `nodegx deploy` exit 0,
read in Chrome; 8/8, no console errors). One Function, four outputs: `declared` (object, on the list) shows
`{"kind":"declared","n":1}`; **the same object not on the list shows `[object Object]`** (the HEAD behaviour, recorded); `num`
(number) shows 42; `fromKey`, which the code reaches only as `Outputs[k]`, shows "by key" through the list. A wire from
`out-ghost` is refused at write time by name. The editor-panel half of AC2 is not driven (no editor launched this session).

**Rulings asked (one AskUserQuestion, then one correction):**
- **Ruling 2 — ✅ "Not now"** (as recommended): one row per port; a JSON parameter only if a second consumer appears.
- **Ruling 3 — ✅ "Fix all three"** (NOT the recommended "fix 1 and 2, keep comments"). 🔴 **I asked it on a wrong number.** The
  census stripped comments with `//.*`, which eats the rest of a line after a `//` inside a URL string (Stripe's
  `"https://api.stripe.com/v1/subscriptions/" + Inputs.SubscriptionId`). It reported 6 comment-only uses, 5 wired, in Stripe
  and MailGun. With a string-, template- and regex-aware stripper: **1** in our corpus (file-upload `out-Accept`, unwired), and
  in the 252 test and old projects on this machine 147 Functions, **18 with wires on those ports (34 wires) in 3 projects**
  (SuntappedX 12 Functions, a client project 5, Erleah-2 1). Re-asked with the corrected numbers → **"Fix it, fix up old
  projects"** (recommended this time). Quirks 1 and 2 unchanged by the correction: 0 underscore signals anywhere; `Inputs["x"]`
  0 in our corpus and 8 in old projects, where the fix only makes the port a real input.

**Slice 2, built the same session (AC9, AC10):**

- **One reader, in `@nodegx/project-contract/function-ports.ts`** (new): `stripScriptComments` (strings, nested template
  literals and regular expressions kept: a `/` starts a regex after an operator, a bracket or a keyword), the Function's
  `functionScriptPortNames` with ruling 3's fixes, the old reader frozen as `legacyFunctionScriptPortNames`, and the fix-up
  (`plan` / `apply` / `describe`). Imported by the runtime's Function node (`simplejavascript.ts`), the door
  (`cloudDynamicPorts.ts`, and through it `functionPorts.ts`), the exporter (`jsfun.ts`, keeping its `.send()` extra) and the
  code editor's completion for a `JavaScriptFunction` (`scriptPorts.ts` via `unionPorts`, by the open node's `typeName`).
  🔴 **The Function only.** The Script node, Query Records' JavaScript filter, the cloud Aggregate node and the deprecated
  collection node call the same old `parseAndAddPortsFromScript`; none was censused or ruled, so it is unchanged for them.
  `notation.ts` needs nothing: it writes an underscored signal as `Outputs["Done_1"]()`, which both readers mine as a signal.
  `scripts/library/render-check.js` (a render harness's guess at exported signal ports, Function and Script nodes) is left:
  0 underscore signals in the library.
- **Bracket name order:** splitting `'…'` and `"…"` into two patterns first returned `Inputs["a"] + Inputs['b']` as b, a; one
  alternation per bracket form keeps the old order (dot forms first, then brackets as they appear).
- **The fix-up (AC10)** is an entry in the editor's `upgradeOnLoad` (P100 UPG-002's mechanism: backup, toast, saved on open)
  titled "Wired Function ports kept", and runs in memory in the exporter's `parseProject` beside the run-on-value-change settle,
  so an export keeps the wire the editor keeps. A wired `in-`/`out-` name the old reader made and the new one does not, on
  no list and saved on no node, becomes a list row; a signal keeps `outtype-<name>: signal`. Idempotent; v2 `children` id
  strings are skipped.
- **Graded on copies of real projects:** SuntappedX: 2,140 wired Function ends alive under the old reader; the new reader alone
  would lose 21; the fix-up writes 21 names on 12 Functions (3 signals); after it 2,140 alive, 0 lost; a second pass writes 0.
  Control hsseq-test-main (it holds 7 of the `Inputs["x"]` Functions): 492 alive, 0 lost, 0 writes.
- **Specs:** `tests-unit/isl-006/function-ports.test.ts` 30 (the stripper's nine cases and never-throws, the three fixes, the
  frozen reader against the runtime's real parser, the fix-up incl. v2 shape, suffixed ids, sentences, and `upgradeOnLoad`
  with its no-section control). FIX-007 now pins the mapping and that the old and new readers differ on exactly the three
  ruled rows (24). sb-017's row reads the ruling off the runtime's own Function module: `out-do_it:output:signal`,
  `in-first name:input:*`, no `in-commented`, `in-id` past a URL. core-ui `scriptPorts` +4 (a Function vs a Script node).
  The exporter spec compares `functionMinedPortsOf` with the shared reader, `.send()` apart. **Sabotage:** the comment strip
  removed → 8 red across isl-006, fix-007 and sb-017; restored by `cp`, `cmp` clean.
- **Blast radius:** runtime 14 Function suites 181/181; core-ui code-editor 21 suites 392/392 (+4); editor tests-unit sets
  green; `noodl-mcp` 13 suites: the same 5 reds as slice 1 (DEF-038 ×2 pre-existing, TPL-011 ×3 on `in-id`).
  `nodegx-export` full suite: 5 red in 3 suites (`hls006-every-listener`, `hls001-corpus-identity` 52→53 projects and every
  README, `sse` §F ledger floor), the same 5 with my two exporter files reverted to HEAD: not this change. `tsc --noEmit`:
  editor 0, runtime 0, exporter 0, project-contract 0, `noodl-mcp` the same 10, core-ui 45, all in editor files its tsc also
  compiles.
- **Catalog:** `catalog:check` went red on slice 2. `node-catalog.json` now has the bracket input as `plug: "input"` and the
  Run On Value Change port every real input gets. Regenerated (mine, by that diff); the catalog text says the reader skips
  comments. `catalog:check`, `catalog:merge:check`, `docs:nodes:check` exit 0.

**Next:** one editor session: AC2's panel half (three typed outputs declared in the panel, the node shows them) and AC10
opened live on a copy of SuntappedX (the toast reads "Wired Function ports kept", the project saves, the 21 wires stay solid).

### Session 20 (2026-10-06) — the editor session; one regression found and fixed; closed

`npm run dev:debug` on a throwaway profile (`NOODL_USER_DATA_DIR` in the scratchpad with `firstRunLegal.json` and seeded recents;
the 9222 listener's `--user-data-dir` checked before driving). Two COPIES in the scratchpad: SuntappedX and hsseq-test-main.

**AC10, live.** Opening the SuntappedX copy showed one toast with two sections, "Text styles are now typography tokens" and
**"Wired Function ports kept"** (21 ports), and a backup `SuntappedX-copy.before-0.3` was made. The saved `project.json` holds
exactly 21 new list rows on 12 Functions, 3 of them `outtype-…: signal`, and 6,766 wires before and after (0 lost). Each of the 21
names is a port in the editor (`getPorts`) with its one wire. Re-opened: no toast (the fix-up is idempotent). **Control:** the
hsseq copy's toast has the text-styles section only. Function wire ends 584 alive, 0 dead, and 2,959 wires saved of 2,959.

🔴 **Found while reading AC10: the editor showed 1,769 error-level wires on SuntappedX's Functions** ("Source/Target port
doesn't exist"), 461 of 612 Functions with no port from their code. Cause: the viewer bundle compiles
`function-ports.ts` with its own tsconfig (`target: es5`), where `for…of source.matchAll(…)` becomes an index loop over `.length`
(`noodl.viewer.js` line 19619) and runs zero times. The dev log had said `[tsl] TS2802` and "compiled with 1 error" since s19.
The unit specs never saw it because jest compiles the file at ES2015 or later. The deployed page's checks did not depend on it,
because the runtime registers a port when a wire arrives. Which target the deploy bundle uses was not checked. **Fixed in `a7914b837`** with an exec loop. The spec now compiles the file with the viewer's
own options and requires no TS2802, and it runs the ES5-compiled reader against the native one (sabotage: exactly 4 red).
Re-read live after the viewer rebuilt: **0 Function errors, 2,707 wire ends alive, 3 dead**. The 3 dead are wires to `in-project_id`,
`in-org_id` and `in-address` on a cloud Function whose script never names them, so they were dead before ISL-006 too. Ledger:
`P109-S20-ES5READER` (fixed). The memory for viewer-react's ES5 `for…of` existed; this file sits in another package that the viewer
also compiles.

**AC2, the panel half (hsseq copy).** A Function was added with `Outputs.total = 3; Outputs.label = "three"; Outputs.ready = true;`.
Before any list row, its outputs were `out-total`, `out-label` and `out-ready`, all `*`. Three rows were added through the Script
Outputs panel with real clicks, typing and Enter, then Number, String and Boolean were picked in each row's Type select. The
**Ports tab** read: `total number NOW 3`, `label * NOW "three"`, `ready boolean NOW true`. Those are three outputs, with live
values from the preview. A wire from `out-total` into a String node is healthy. A wire from `out-ghost` reads "Source port doesn't
exist." at level `error`. 🔴 `label` reads `*` although the panel said String: a listed output's port falls back to `*` while the
select's default reads String, and re-picking String writes nothing. Filed as `P109-S20-LISTDEFAULTTYPE` (needs-ruling, low,
recommendation: the panel shows "Any" for an output, nothing saved changes).

**The toast's copy (mine, s19) rewritten in the same commit.** It said `a Function in /Offices/Office Settings keeps in-reps.` once
per port. Each line started lowercase and named a port id, and two Functions in one component read as a repeated line. It now
reads `In /Offices/Office Settings, 2 Functions keep the input reps.`, one sentence per place, with names as the node shows them,
six places and then a count. The lead sentence's ", so" was split in two (`written.py` clean). Separately, the long toast grew past
the window's top edge and hid its own title: the toast card has no maximum height and no scroll. Filed as `P109-S20-LONGTOAST`
(open, the toast layer's), not fixed here.

**Gates (2026-10-06, at `a7914b837`):** editor `tests-unit` isl-006 37, fix-007, sb-017 (79 across 4 suites); runtime 10 Function
suites 123/123; core-ui scriptPorts and declaredPorts 38/38; exporter function-ports suite 14/14; `noodl-mcp` `isl006FunctionPortList` 6/6;
`tsc --noEmit`: editor 0, project-contract 0. Stack stopped with `dev:stop` (26 processes).

