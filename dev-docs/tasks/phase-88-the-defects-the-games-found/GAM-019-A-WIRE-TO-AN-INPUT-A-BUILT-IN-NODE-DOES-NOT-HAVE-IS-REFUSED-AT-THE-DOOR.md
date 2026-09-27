# GAM-019 — A wire to an input a built-in node does not have is refused at the door

**Status: ✅ built 2026-09-14 (session 1), committed `4bb438165`. Owed: the Electron `test:ci` run, a look at the panel, and the MCP bundle rebuild (§8).** **Source:** [P78 D66](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) · found by TPL-007 / P87 [RKT-008](../phase-87-the-first-play-test/RKT-008-THE-PLAYER-MENU.md) build 1, 2026-09-13 · **Side:** product (validator, `rules/nonexistentPort`)

An agent wired `nfIn.name0 → nfName.text` on a Text Input. A Text Input has no `text` input; its value is `startValue`. The
plan door said nothing, not even an info. The page rendered, the name box opened empty, and only the browser console said
`Invalid connection, input doesn't exist`.

## 1. The person sentence

**When a wire names an input or output a built-in node does not have, the door refuses it by name and lists the ports
that do exist, whether or not that node type ever republishes a port at runtime.**

## 2. What was measured

All rows re-read at HEAD `eb12ebe99` on 2026-09-14 unless marked otherwise.

| reading | where |
|---|---|
| The door has three checks for unknown connection ports, and **none of them looks at a built-in node's static ports**: `checkConnectionTargets` keeps only component instances; `checkDerivedPortTargets` keeps only `CloudFunction2` and `RouterNavigate`; `checkFunctionNodePorts` (FIX-007) keeps only Function nodes | `validation/connectionTargets.ts:128-132`, `validation/derivedPortTargets.ts:278-282`, `authoredCandidate.ts` (the `checkFunctionNodePorts` line) |
| The built-in case belongs to `rules/nonexistentPort`, which errors only on a type that is "fully static". **Any** type with a `dynamicPorts` entry in the catalog takes the skip path | `validation/rules/nonexistentPort.ts:94-118` |
| `isDynamicNode` is `!!dynamicPorts`, whatever the mechanism. The catalog already sorts mechanisms into runtime-unbounded ones and `declared-port-groups`, but the port rule does not use that split. `hasRuntimeDynamicPorts` exists and has one caller, `parameterValues.ts:916` | `validation/CatalogIndex.ts:36-41`, `:143-152` |
| The header explains why the skip is total: *"a handful of legacy/adapter port names (e.g. Text Input's `disabled`) are reachable on such nodes without appearing in either list"*. That is the false-positive risk this task has to measure, not assume | `CatalogIndex.ts:26-33` |
| The shipped catalog marks **88 of 176** types dynamic. **18 are `declared-port-groups` only**: Group, Text, Image, Button, Circle, Label, Video, Form, and others. For every one of them a wire to a nonexistent port is skipped | `packages/noodl-types/src/node-catalog.json`, read with `node` |
| Text Input is `declared-port-groups + runtime-discovered`, although its own catalog description says *"this node mints no ports"*. `runtime-discovered` comes from FB-026's `setup()`, which republishes the two ports it already declares (`startValue`, `onTextChanged`) with a narrower type. `net.noodl.controls.options` is the only other type described that way | `text-input.ts:449-491`; `scripts/node-catalog/lib/build-catalog.js:117-118` |
| Text Input's catalog inputs: 105, including `startValue` and not `text` | catalog |
| The info that says the check was skipped (`dynamic-port-skipped`) is emitted only under `emitDynamicPortInfo`. Nothing in `noodl-mcp/src` sets that option, so the generator's 154 diagnostic lines had no line for this wire | `nonexistentPort.ts:99`; `noodl-mcp/src/validate.ts:341-357` |
| The same run refused `connection-unknown-instance-port` and `unprefixed-function-port`, so the door was alive on both of its connection checks | as recorded 2026-09-13 (D66), not re-run |

**Why DEF-002's check misses D66's shape, which is the heart of this task:** DEF-002 closed D1's three sabotages by adding
checks next to `nonexistentPort` for three families of port that rule cannot see. It never touched `nonexistentPort`'s own skip.
A built-in type with a conditional port group, or with a setup that only narrows port types, is in none of the three
families. It is skipped as "dynamic", and after the skip nothing else checks it. DEF-002's §4 trap, *"ask what a diagnostic
is about before trusting it to cover a neighbouring class"*, is exactly this.

## 3. Where it bites a person

Any wire, from an agent or typed by hand, that names a control's input by what the panel shows ("text", "label", "value")
instead of its id. It also bites any mistyped port on Group, Text, Image or Button, the most-used visual nodes in every
template. The artefact validates, the page renders, and the value never arrives. Only a console listener or a person sees it.

## 4. Related work and collisions

- P80 [DEF-002](../phase-80-the-defects-the-templates-found/DEF-002-THE-DOOR-DOES-NOT-CHECK-CONNECTIONS.md) ✅: the three
  neighbouring checks. Closed. This task covers the class it did not.
- P66 [FIX-007](../phase-66-0.1.7-bug-fixes/FIX-007-THE-CONNECTOR-THE-AI-CANNOT-DRAW.md) ✅: `unprefixed-function-port`, the
  same hole for Function nodes, closed by a type-specific check rather than by changing the skip.
- P13 [SUB-004](../phase-13-format-ai-substrate/SUB-004-NODE-CATALOG.md): where the blanket skip and its
  "zero false positives" corpus preview come from.
- P75 [FB-026](../phase-75-0.2.1-the-feedback/FB-026-THE-FIELD-THAT-IS-NOT-ALWAYS-TEXT.md) ✅: the type-narrowing setup that
  gave Text Input its `runtime-discovered` mechanism.
- Grep run: `grep -rlan "dynamic-port-skipped\|isDynamicNode" dev-docs/tasks` found DEF-002, DEF-003, DEF-006, TPL-001,
  SB-004, SB-005, EXP-011 and AAQ-001. None of them owns the skip on built-in static ports. **No owner found.**

## 5. Design

- **(a) Split the skip by mechanism.** `nonexistentPort` skips only when `hasRuntimeDynamicPorts(type)` is true. A
  `declared-port-groups`-only type gets the static error. The helper and the mechanism set already exist. This does **not**
  reach Text Input, which carries `runtime-discovered`.
- **(b) Say in the catalog that a setup republishes only declared ports.** Either a new mechanism (for example
  `runtime-narrowed`) in `detectDynamism`, or a flag the node definition declares, so Text Input and Options stop reading as
  runtime-unbounded. D66 needs this half.
  ⚠️ `build-catalog.js:24-36` records that the detector reads the esbuild bundle and has already lost Text Input's mechanism
  once, to a helper renamed by the bundler. **A flag declared on the node definition is safer than another regex.**
- **(c) Keep the "did you mean".** `suggestPort` is Levenshtein distance over port **names** (`CatalogIndex.ts:336-338`).
  "text" is nowhere near `startValue`, and it does not match the display name "Value" either. So the repair has to come
  from `alternatives`, which already lists the inputs. A display-name matcher would not have caught D66. Do not add one on
  the strength of this row.
- Severity: `error`, like the existing static branch. If the corpus census (AC5) finds real legacy hits, use DEF-002 rule 3's
  split instead: `warning`, plus membership of `AUTHORED_BLOCKING_WARNINGS`.
- **Do not** remove the skip for `runtime-discovered`, `numbered-inputs`, `component-ports` or `editor-adapter` types. Those
  ports really are unbounded.

## 6. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8:** a spec validates a component holding `Component Inputs.name0 → Text Input.text`, and the diagnostics contain no entry naming that connection. The same spec includes a sibling wire to a fully static type's missing port and asserts `nonexistent-port` **does** fire, so the check is shown to be alive. |
| AC2 | After the fix, the D66 wire is refused as `nonexistent-port`, with `startValue` in `alternatives`. The same wire with `startValue` is accepted. Both arms. |
| AC3 | The same pair of arms on a `declared-port-groups`-only type (Group `widthXX` refused, `width` accepted) and on `net.noodl.controls.options`. |
| AC4 | 🔴 **Reverted arm:** restore `isDynamicNode` as the skip predicate, and AC2 and AC3 go red while AC1's static sibling stays green. |
| AC5 | **False-positive census before landing.** Over `library/prefabs` and `templates/`, record endpoints checked and refusals. Baseline measured 2026-09-14 without the fix: **1,315** endpoints on the 20 "mints nothing" types (525 in templates, 790 in prefabs, 100 of them on Text Input) and **0** to an undeclared port. Then run DEF-002's `calibrate:preconditions` corpus, where the `disabled` case lives, and read every refusal. |
| AC6 | A `runtime-discovered` type (Expression, States) still skips a port it cannot see. The known-firing signal beside it is AC2's refusal in the same run. |
| AC7 | **The person's door:** regenerate Rocket School with `name0 → nfName.text` restored. The generator exits non-zero and names the wire and `startValue`. Revert the fix and it exits 0 with no line about the wire. |
| AC8 | `validate_component` and `validate_project` both carry the finding, asserted once each (DEF-002 AC6: a check in a second pipeline is a duplicate first). |

## 7. Traps

- 🔴 **`0 undeclared` in AC5 is only a finding beside the 1,315 endpoints it checked.** A census that reads no connections
  prints the same zero. The first run of this census read the prefabs with the wrong legacy keys and checked none of them.
- 🔴 The comment at `CatalogIndex.ts:26-33` names a real class: ports reachable but not listed. Treat any refusal in AC5 as a
  question about the catalog before treating it as a wrong graph.
- ⚠️ A spec that asserts "no diagnostic" for the accepted arm passes on a validator that ran nothing. Assert the refusal
  and the acceptance in the same run.
- ⚠️ The catalog JSON is generated. A hand edit to `node-catalog.json` is lost on the next regeneration. Change the
  generator or the node definition.

## 8. Record

### Session 1 — 2026-09-14, over HEAD `eb12ebe99` (committed as `4bb438165`)

**What scoping got wrong, measured before building.**
- 🔴 **There are two Text Inputs.** The catalog type named `Text Input` is the **deprecated** node, and it is
  `declared-port-groups` only. D66's node is `net.noodl.controls.textinput` (`TEXT_INPUT_NODE` in `tpl007Components.ts:106`),
  which is `declared-port-groups + runtime-discovered`, as §2 says.
- 🔴 **The legacy case that justified the blanket skip is dead.** `CatalogIndex.ts`'s header and
  `tests/validation/dynamic-ports.test.ts` both kept it for *"Text Input's `disabled`"*. The deprecated node's `disabled` input
  is **commented out** (`nodes-deprecated/controls/text-input.tsx:194`), so that wire reaches nothing at runtime. The spec was
  pinning a false negative.
- 🔴 **§5 (c) was not enough: the repair was never in `alternatives`.** Alternatives are capped at 24, with signals first and
  then alphabetical order. `startValue` ranked **87 of 105** on Text Input, and Options' `value` ranked **95 of 100**. So even
  a refusal would have listed 24 styling ports and not the one the author meant.
- ✅ **§5 (b) already had a verified source.** FB-026's `RETYPES_DECLARED_PORTS` (`derive-encoding.js`) lists exactly Text
  Input and Options, and `retypesEncoding` drives each setup headlessly and **throws** if it publishes a name not in the
  static list. It runs by type name, before any mechanism check. So no new flag on the node definition was needed. A first draft
  added one (`republishesOnlyDeclaredPorts`), and it was reverted: it was unverified, and `ReactNodeModule` does not type it.

**AC1 — RED at HEAD** (`tests-unit/gam-019/builtinPortDoor.test.ts`, `npx jest tests-unit/gam-019`, exit 1, 4 of 8 failed):
D66's `name0 → text`, Group `widthXX` and a made-up Options input were **not refused**. In the same runs the static sibling
(`Boolean.nope`) **was refused**, so the rule ran, and Expression's free variable was skipped.

**What was built**
- (a) `rules/nonexistentPort.ts` skips on `hasRuntimeDynamicPorts`, not `isDynamicNode`. That is the predicate
  `parameterValues.ts:916` has used for the parameter half since CN-004.
- (b) `build-catalog.js` records a `RETYPES_DECLARED_PORTS` type as the new mechanism **`runtime-narrowed`**. It stays
  `runtime-discovered` if anything other than its setup mints. The union is in `generate.js`, and a sentence was added to MCP
  `PARTIAL_PORT_LIST_REASONS`. Regenerated to `--out-dir` first and diffed: **exactly 2 of 176 nodes changed**, only
  `dynamicPorts.mechanisms`, and the encoding counts were identical. Then installed. `catalog:merge` was diffed against HEAD's enriched
  catalog: the same 2 nodes, and `catalog:merge:check` exits 0.
- (c) `availableAlternatives` ranks signals first, then value/behaviour ports, then `allowVisualStates` styling ports.
  Text Input's 4 signals + 20 non-styling ports put `startValue` inside the 24.
- The comments at `CatalogIndex.ts` and in `derive-encoding.js` say what changed. The jasmine case in `dynamic-ports.test.ts` is flipped
  to a refusal with an `enabled` contrast, and mirrored in the jest spec, because the jasmine suite runs only under Electron
  `test:ci`. ⚠️ **That jasmine file has not been run.**

**AC2, AC3, AC6 — GREEN** (exit 0, 9 of 9): D66's wire is refused as `error` with the connection and `startValue` in
`alternatives`; `startValue` is accepted; Group `widthXX` is refused and `width` accepted; Options is refused and `value` accepted;
deprecated Text Input `disabled` is refused and `enabled` accepted; Expression's free variable is still skipped, in the same run as D66's refusal.

**AC4 — reverted arms, on a snapshot of the rule file, restored and `cmp`-identical:**
| sabotage | red | green |
|---|---|---|
| `isDynamicNode` restored as the skip | D66 refusal, Group, Options, deprecated `disabled`, AC6's same-run refusal (5) | premises, static sibling, `startValue` accepted (4) |
| alphabetical alternatives restored | D66's "`startValue` is offered" (1) | the other 8 |

**AC5 — census, first half, measured at HEAD's catalog:** a scratch script counted every connection endpoint on the 20
affected types (18 declared-port-groups-only types + Text Input + Options) that names neither a catalog port nor an
instance port.
| population | projects | connections | affected endpoints | Text Input endpoints | would be refused |
|---|---|---|---|---|---|
| `templates/` | 5 | 2,378 | 525 | 39 | **0** |
| `library/prefabs` | 46 | 2,063 | 790 | 100 | **0** |
| `project-examples` | 1 | 111 | 86 | 8 | **0** |
| NodeGX test projects | 126 | 14,543 | 5,859 | 1,048 | **0** |

The templates and prefabs rows match scoping's baseline (525 / 790) exactly. That is the known-firing check that the census read
the right keys. ⚠️ A first census read legacy `targetId`/`targetPort` where the files say `toId`/`toProperty`, and printed `{}`
over zero wires. Severity therefore stays `error`. **Still owed:** the second half, the real validator over DEF-002's
`calibrate:preconditions` corpus after the change, reading every refusal.

**AC7 — the person's door, GREEN with a reverted arm.** Scratch runner `gam019-ac7-rocket.ts` builds through
`buildRocketTemplateProject` into a temp dir. It swaps `nfIn.name0 → nfName.startValue` back to `text` in memory, so neither
`tpl007Components.ts` nor `templates/` is touched.
| arm | result |
|---|---|
| fix, D66's wire | **refused** at `stage_plan_operation Profiles/New player form`, nothing staged, exit 3: `ERROR [nonexistent-port] … node nfName "The name box" (net.noodl.controls.textinput) › input "text"`, with `startValue` in `available` |
| `isDynamicNode` restored, D66's wire | **built**, 62 components, **154 diagnostics, 0 about the wire**, exit 0. That is D66 exactly as the register recorded it (*"the generator's 154 diagnostic lines had no line for this wire"*) |
| fix, the shipped graph (no swap) | built, 62 components, 154 diagnostics, exit 0. No new refusal from the fix |

⚠️ **Found by AC7 and not fixed: the first hint is wrong.** The refusal says *"did you mean `set`?"* before the list.
`suggestPort` is edit distance over names, "text" → "set" is 2, and the threshold for a 4-letter name is 2. `set` is a
**signal** input, so an agent that follows the first hint wires a string into a signal. It is not D66, and the task's person
sentence (refuse by name, list what exists) holds. It is registered here as a follow-up for Richard, not built.

**AC8 — GREEN with a reverted arm** (`noodl-mcp/tests/gam019BuiltinPortDoor.test.ts`, in-process server from `src`, so not a stale
`dist/`): `validate_component` (`{ path }`) refuses `text` as `error` with `startValue` in `alternatives` and accepts
`startValue`; `validate_project` carries the same refusal and not the good wire. 2 of 2 green. With `isDynamicNode` restored: 2 of 2
red. Asserted once per tool. ⚠️ A first run passed `{ component }` to `validate_component`, and it read no finding. That was my
argument, not the tool.

**🔴 The parameter half moved too, and it found a pre-existing defect that blocks landing.**
`parameterValues.ts:916` skips its unknown-parameter check on the same `hasRuntimeDynamicPorts`. `runtime-narrowed`
therefore switches that check **on** for Text Input and Options. Census of their saved parameters (4 populations: 661 nodes,
3,215 parameters): exactly one name names no catalog port, **`runOnChange-startValue`, on 11 Text Inputs** (1 in Rocket School's
`Profiles/New player form#nfName`, 10 in NodeGX test projects). The spec arm measured it: under the fix,
`checkParameterValues` warns `unknown-parameter` on it (1 red, 10 green), and a made-up `nosuchparam` warns on both types.
- **The parameter is real, read from source:** `text-input.ts:50` declares `runOnValueChange: { controlSignal: 'set', inputs: ['startValue'] }`
  (NDA-017 §2, `b6dc078a3`), and `:195` reads it through `shouldRunOnValueChange('startValue')`. `defineNode` wraps every node's
  `registerInputIfNeeded` to claim `runOnChange-…` names (`nodedefinition.ts:~480-495`), so a saved parameter registers the
  checkbox at runtime. Not driven.
- **The defect:** `createNodeFromReactComponent` (`react-component-node.ts:902`) hands `defineNode` an explicit options literal
  with no `runOnValueChange`. So the `runOnChange-startValue` port `defineNode` would synthesise (`nodedefinition.ts:372-395`) never
  exists as a declared port. It is absent from the catalog (14 types carry `runOnChange-*` ports; Text Input is not one of
  them) and, by the same path, from the property panel. That contradicts the comment at `text-input.ts:46-49`. Parent Component
  Object also declares `runOnValueChange`, uses `defineNode` directly, and its port is in the catalog.
- The shipped Rocket School still built with 154 diagnostics under the fix. That fits "no new warning" and does not exclude a
  same-count swap, because the runner prints counts, not the diagnostics. The spec arm is the measurement.

Put to Richard on 2026-09-14, with three options: forward the key; exempt `runOnChange-<declared input>` in the validator; or
land wires only and keep the parameter check off for these two types.

> 🔒 **Ruled, 2026-09-14: forward the key.** `createNodeFromReactComponent` passes `runOnValueChange` to `defineNode`, so Text
> Input's Run On Value Change checkbox is a declared port: in the catalog, in the panel, and accepted by the parameter check.
> — Richard, choosing it over the validator exemption and wires-only

**The forward, built.** `react-component-node.ts` passes `runOnValueChange: def.runOnValueChange` to `defineNode`.
- The catalog was regenerated to `--out-dir` and diffed: **1 of 176 nodes changed**. Text Input gained `runOnChange-startValue`
  (group "Run On Value Change", label "Value", `default: true`) and nothing else moved. `defineNode` did not throw, so `startValue`
  is in the options when it runs. After install, the enriched catalog against HEAD changes exactly 2 nodes: Text Input (inputs +
  mechanism) and Options (mechanism). `catalog:check` 0, `catalog:merge:check` 0.
- `nodegx-project-contract/run-on-value-change-migration.ts`'s "this family's checkbox port does **not** exist" note is
  corrected. Read in full, it agreed with the source reading: a saved untick lands through `defineNode`'s wrapper. So
  runtime behaviour for saved projects is unchanged, and what is new is the declared port (catalog, panel, parameter check).
- The parameter arm is green: `runOnChange-startValue` draws no `unknown-parameter`, and `nosuchparam` still warns on Text Input and Options.

**AC5, second half — the real validator over the corpus, HEAD against the fix.** `scripts/validate-project.ts --json` over all
178 projects, once with HEAD's rule file and catalog put in place (checked: the old skip present, `runtime-narrowed` absent,
restored by `trap`, `cmp`-identical), once with the fix:
| | targets | errored | diagnostics |
|---|---|---|---|
| HEAD | 178 | 0 | 2,883 |
| fix | 178 | 0 | 2,883 |

**0 added, 0 removed**, across every rule in `ALL_RULES`, `signalDrivenStaleInput` among them (Text Input is now a
run-on-value-change family). Positive control for the diff script: one diagnostic injected into a copy of the fix run reads
`added: 1`. The `nodegx-richtext` kit-load errors in stderr are identical in both runs (GAM-018's territory).

**Regression, all green:** editor `tests-unit` (gam-019, cn-010, def-002, validation, d-13, cn-003, lib-006, phase-54): 24
suites, 323 tests. MCP `tools`, `validateOnDiskPreconditions`, `kitOverlay`, `gam019BuiltinPortDoor`: 4 suites, 52 tests.
MCP `toolDisclosure` (byte budgets), run alone because the combined run silently skipped it: 18 tests. Viewer Text Input specs
(FB-026, ERG-001 visual outcomes, NDA-012 Clear): 3 suites, 36 tests. Export `controlled-state`: 26. Rocket School's gate
`tpl007Template.test.ts`: 72.

### Verdict

**AC1–AC8 met.** The person sentence holds at the door an agent uses (the plan tools, `validate_component`,
`validate_project`), with reverted arms at each.

**Owed, and not claimed:**
- 🔴 **The jasmine `tests/validation/dynamic-ports.test.ts` (flipped case + contrast) has not run.** It runs only under the
  editor's Electron `test:ci`. Its assertion is mirrored and green in jest.
- **The Text Input panel has not been looked at** in a running editor. The catalog says the checkbox is there, and nobody has
  seen it.
- **The bundled MCP server (`packages/noodl-mcp/dist/noodl-mcp.cjs`) is not rebuilt.** Agents on an installed or bundled server
  still get the old skip until it is rebuilt.
- **Follow-up, ruled and built 2026-09-14 (session 2), `15f7bf720`:** the refusal's first hint was "did you mean `set`?", which offers a signal for a value wire.
  > 🔒 **Match the wire's kind.** The hint never suggests a signal input for a value wire, nor a value input for a signal
  > wire. The short-name threshold is **not** tightened. `startValue` stays in `alternatives`. — Richard, choosing it over
  > tightening the threshold, both, or leaving it

### Session 2 — 2026-09-14, the hint, over `4bb438165`

**What the ruling's framing got wrong, found before building.** The option was put to Richard as *"the rule already knows the
source port"*. It knows the **name**. D66's source, `Component Inputs.name0`, is an instance port, and `NormNode.instancePorts`
kept names only, so its kind was unknowable. A literal build would have left D66's `set` in place. The saved file does record it:
Rocket School's `nfIn` ports are `{name: "name0", plug: "output", type: "string"}`, and `reset`/`fill` are `signal`.

**Built.**
- `NormNode.instancePortTypes?` holds each instance port's declared type name. `normalize.ts` fills it on both node shapes
  (`fromLegacyProject`'s flatten and `normalizeV2Component`), and a node whose ports record no type carries no key.
- `CatalogIndex.suggestPort(type, plug, name, kind?)` drops candidates of the other kind. `portKind` reads a catalog port:
  `isSignal` gives signal, `*` gives no kind, and anything else is a value. A no-kind candidate is never dropped.
- `nonexistentPort` passes the kind of the wire's **other** end: a catalog port first, then `instancePortTypes`. A `*` end, an
  untyped instance port, a component instance and a dangling end filter nothing.
- 🔴 **Measured, not assumed:** the live Text Input's `startValue` and `onTextChanged` are both declared `*`
  (`node-catalog.json` :51940, :52445). So a wire from `onTextChanged` has no kind and still gets `set`. The MCP spec's
  original D66 wire was that shape, not a signal.

**Graded.**
| arm | result |
|---|---|
| editor `tests-unit/gam-019` (4 new arms: premises, D66 string wire vs signal wire, Group `widht` → `width`, catalog signal `onFocus` / `*` / untyped / string in one run) | 15 of 15, exit 0 |
| 🔴 reverted: rule passes no kind | exactly the 2 arms asserting "a string wire is filtered" red; premises, `widht`, and all 11 earlier arms green; restored `cmp`-identical |
| MCP `gam019BuiltinPortDoor` (new: a typed `Component Inputs.name0` → Text Input `text` through `validate_component`, beside the `*` wire that keeps `set`) | 3 of 3, exit 0 |
| 🔴 reverted: `normalizeV2Component` carries no types | exactly the hint test red, 2 green; restored `cmp`-identical |
| **the plan door** (session 1's `gam019-ac7-rocket.ts`, re-run) | refused, exit 3, `startValue` offered, **no "did you mean" line** |
| 🔴 reverted at the plan door: `normalizeV2Component` carries no types | refused, exit 3, **`→ did you mean \`set\`?` is back** |

⚠️ **A reverted arm that graded nothing, and what it changed.** A first draft also carried the types through
`graphComponentFromFiles` → `toNormComponent` (`plan.ts`, `validate.ts`, `explain/graph.ts`, `explain/types.ts`), believing
that was the plan door. Removing it at AC7 left the hint unchanged. `toNormComponent` normalises only the **other** components of
the graph (`validate.ts:186`, `:327`); the staged candidate goes through `normalizeV2Component` (`planTools.ts:239`). Those four
edits were reverted, so every kept line has a reverted arm. **Known gap:** a refusal inside a neighbouring component reached
through `toNormComponent` still gets the unfiltered hint, as before.

**Regression, all green.** `tsc --noEmit -p packages/noodl-editor` 0 errors (taken with the four reverted edits in place; the
kept files have not changed since). Editor `tests-unit` gam-019, cn-010, def-002, validation, d-13, cn-003, lib-006, phase-54:
24 spec files, 24 PASS lines, 327 tests (session 1's 323 + 4). MCP `tools`, `validateOnDiskPreconditions`, `kitOverlay`,
`gam019BuiltinPortDoor`: 4 of 4 PASS lines, 53 tests. `toolDisclosure` alone: 18.
- Committed as `4bb438165` (Richard, 2026-09-14, register included).

### 2026-09-14, P88 session 5 — the refusal turned `test:main` red, and nobody had run it

`npm run test:main` (a PR CI gate) read **7,498 of 7,500**. One red was
`tests-unit/cn-002/unknown-type-check-skipped.test.ts` › *leaves error and warning counts exactly where they were*:
expected 2 errors, received 1. CN-002 compares a `Text` target with a kit target over the same wire,
`src.text → dst.label`. A `Text` has no `label` input, so this rule now refuses the wire on the resolvable twin. The kit
twin's port check is skipped, so its error count stayed where it was.
- **Measured by a throwaway probe spec, deleted after.** The `Text` twin's errors: `Text has no output named "text"`
  and `Text has no input named "label"`. The kit twin's: the first only.
- **The fix is in the fixture, not the rule.** The control wire now targets `text`, an input a `Text` has. CN-002 is
  12/12. The red run with `label` is the reverted arm. Committed `8af0c943d`.
- The other red, `tests-unit/tpl-003/landing-template.test.ts` (21 components expected, 28 installed), is not this
  task's. The embedded `landing-pages.content.json` grew with P78 TPL-004's commits on 2026-09-11, and the spec's
  literal was last set on 09-06. It is owed to P78.
- ⚠️ Session 1's regression list named 24 editor spec files. CN-002 was not among them, and `test:main` is where it lives.
