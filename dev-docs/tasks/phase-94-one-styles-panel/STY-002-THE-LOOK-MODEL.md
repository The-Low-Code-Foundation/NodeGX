# STY-002 — The Look model

**Phase:** 94 — one styles panel. **Prefix:** `STY`. **State:** 🟡 **the model is built and gated
(s4); the second styling mechanism is now gone (s5).** AC2, AC3 and AC4's model half are green in
`tests-unit/sty-002/`, the reload defect that made a Look unsavable is fixed, and **AC5 is closed in
the tree** — the `Preset` and `Size` rows are deleted along with the only two writers of
`_variant`/`_size` in the product. **AC1 is half closed** (the mechanism; the naming waits on the
name), and **AC7 is open and is the thing to run next**.
**Design:** [`STY-DESIGN-THE-LOOK-MODEL.md`](./STY-DESIGN-THE-LOOK-MODEL.md) §1, §5 — **ruled by
Richard, 2026-09-18** (*"Yep sold"*). This task file adds the measurements the design did not have;
it re-argues none of its decisions.

> **One concept: a Look.** A node either wears one, or its styles are its own. There is no third
> state and no second mechanism that also sets styles.

🔴 **Build with [STY-003](./STY-003-THE-PROPERTY-PANEL.md).** They are one design in two pieces —
this one is the data and the vocabulary, that one is the surface. Landing this alone ships a model
nobody can see.

---

## 1. What is already true, measured at HEAD (s3)

**read** = read at HEAD this session · **counted** = counted this session.

| | reading | where |
|---|---|---|
| ✔ | **The Look mechanism already works end to end.** `VariantModel` 522 LOC; a node's `variant` field is a live reference; the runtime resolves it (`nodescope.ts:158` → `Variants.getVariant`) and applies it as `mergeDeep(variant.parameters)` then `mergeDeep(model.parameters)` | `models/VariantModel.ts`; `noodl-runtime/src/variants.ts`; `react-component-node.ts:1811-1838` |
| ✔ | ✅ **And it now survives export** — STY-004 Part A, this session. A Look, a text style and a colour style all reach the emitted CSS, and the report names each one | [STY-004](./STY-004-EXPORT-CARRIES-LOOKS.md) |
| ✔ | 🔴 **"Variant" is TWO storages that share a word, and one is stored inside the other's carrier.** `NodeGraphNode._variant` (line 78-98) is the live Look — `variantName` resolved through `NodeLibrary.findVariant`. `model.parameters['_variant']` is something else entirely: a **parameter** holding the *ElementConfig* variant's name, a stamp marker. A node can carry both at once | `NodeGraphNode.ts:78-98, 1273`; `propertyeditor.ts:127-128, 164, 193` |
| ✔ | 🔴 **The codebase's own documentation states the opposite of what the runtime does**, because of that collision: *"variants are stamped into concrete params at author time (the viewer does not expand them)"*. True of the ElementConfig sense; **false of `VariantModel`**, which the viewer expands on every node. This sentence is what `get_style_vocabulary` teaches an agent | `StyleVocabulary.ts:18-22` |
| ✔ | **The "shipped Look library" the design names is four node types, 23 variants and 4 sizes** — `Button` (6 variants, 4 sizes), `Text` (14), `TextInput` (2), `Checkbox` (1). Smaller than "a library" suggests, and worth knowing before promising one | `models/ElementConfigs/configs/`, all 4 read |
| ✔ | 🔴 **8 of those 23 already carry `hover` / `active` / `focus` / `disabled` / `placeholder`** — `ElementConfig`'s `StateStyles`. So the shipped library has state data *today*, and `VariantModel.stateParameters` is the field shaped to hold it | `ElementConfigTypes.ts:11-29`; 5 in `ButtonConfig`, 2 in `TextInputConfig`, 1 in `CheckboxConfig` |
| · | **Nothing migrates, and now that is measured for presets too:** `"_variant"` and `"_size"` occur **zero times across all seven shipped templates** — the same zero STY-001 found for Looks, colour styles and text styles. Removing `Preset`/`Size` takes nothing away from anything we ship | `grep -rho '"_variant"\|"_size"' templates/*/components` → 0 |
| ✔ | ✅ **MEASURED (s4), and it is not zero: `_variant` occurs 21 times across 12 projects; `_size` occurs 0 times in every one.** Population: every directory named in any editor's `recently_opened_project.json` that still exists and holds a project file — **105 at the first count and 106 twenty minutes later**, because the population moves as projects are opened, and it is a wider net than STY-001 §4b's 90 (it unions every editor's recents, not one). ⚠️ So the denominator drifts and the *numerators did not*: 21 / 12 / 0 both times. Wearers: `net.noodl.controls.button` 7, `Text` 6, `net.noodl.controls.checkbox` 3, `net.noodl.controls.textinput` 1, in `members area Richard test` (4), `ai-test` (4), `def041-drag-drive`, `Visual Function test`, `Tutorial project` (2 each) and seven others with one. 🔴 **So AC5's "still opens and renders exactly as before" is about a marker a dozen real projects carry**, not a hypothetical. And `_size`'s zero is why the shipped library ships variants only | `scripts/devtools/sty002-preset-census.js` |
| ✔ | 🔴 **The shipped library is 22 Looks, not 23 — and `Text` declares 13, not 14.** Counted off the four configs by the spec itself (`tests-unit/sty-002/looks.test.ts`), because a number quoted in a task file is not a measurement: Button 6, Text 13, TextInput 2, Checkbox 1 | the configs, via the spec |
| ✔ | 🔴 **AC3 needed a translation, not a copy, and this is the sharpest thing s4 found.** `ElementConfig.StateStyles` spells its states `hover / active / focus / disabled / placeholder`. The runtime's are a node type's `visualStates`: `neutral, hover, pressed, focused, disabled` for the controls (+`checked` on a Checkbox), and **only `neutral, hover` for a `Text` or a `Group`**. So copying the keys across writes `active`, `focus` and `placeholder` — three names the runtime never asks for — and **passes any test that only checks the data was carried** ([[verify-the-consequence-not-just-the-mechanism]]). `active`→`pressed`, `focus`→`focused`; `placeholder` is a pseudo-element with no visual state at all, and a `disabled` block on a Text can never be entered, so both are **reported** rather than dropped or faked | `nodes/controls/utils.ts:76-86`, `nodes/visual/text.ts:9`, `nodes/visual/group.ts:26`; `react-component-node.ts:1859` |

## 2. 🔴 The hazard this phase has already tripped twice

**The styles sidecar's three keys are `colors`, `textStyles` and `variants`, and the legacy
`metadata.styles` shape spells the second one `text`.** STY-001 read the wrong key twice in one
session and reported a populated project as empty both times
([[measure-the-artefact-before-believing-the-task-file]]).

Anything new that reads this file must accept **both** spellings. STY-004's `parseStyles` already
does (`v2?.textStyles ?? legacy?.text`) and is the worked example.

---

## 3. Acceptance criteria

| # | criterion | state |
|---|---|---|
| **AC1** | **One word, one meaning.** `_variant`/`_size` parameters and the `ElementConfig` "variant"/"size" vocabulary are gone from the product. Nothing named "variant" remains except the one concept, under whatever name AC6 settles | 🟡 **the mechanism half is closed (s5)** — see §3c. `_variant` and `_size` are **no longer written anywhere in the product**, and the size axis is deleted outright. ⬜ Left: **the rename**, which is deliberately not done — `VariantModel`, `applyVariant` and the `variant` input port still carry the word, and renaming them now would pick the name before Richard does (design §9 leaves it open; AC6 is where it lands). Doing it speculatively would be a second large rename if he chooses differently |
| **AC2** | **The shipped Look library exists and is ordinary.** The **22** (not 23 — §1) ElementConfig variants are available as Looks; choosing one **copies it into the project** as a Look the person owns, identical in every respect to one they made, and it does not change under them on an update (design §1.1, rule 4) | 🟡 **model green (s4)** — `shippedLook`/`shippedLooksFor` build a self-contained Look (config `defaults` **plus** the variant, because a node wearing a Look may carry nothing of its own) that **never aliases the shipped config**, so editing your copy cannot change the library. 14 assertions. ⬜ Left: the editor action that puts the copy in the project, which is STY-003's menu row |
| **AC3** | 🔴 **The library's state data is carried, not discarded.** The 8 configs with `StateStyles` land in `VariantModel.stateParameters`. **Carried, deliberately not rendered** — see §4 | ✅ **green (s4), and it needed a translation rather than a copy** (§1): `active`→`pressed`, `focus`→`focused`, and the two that cannot land (`placeholder` anywhere, `disabled` on a `Text`) are **reported**, with the control that shows a naive copy would have passed. 6 assertions, and the 8 is asserted as 8 |
| **AC4** | **"Save this node's styles as a new Look"** creates a Look from a node's current parameters and puts the node in it. This is the entry point the 90-project scan says nobody has ever found (4 Looks across 90 projects, every one a test artefact) | 🟡 **model green (s4)** — `lookFromNode` copies a node's styles minus the preset markers and without aliasing it, pinned against **the shape a real project already holds** (`members area Richard test`'s Look carries `"_variant": "heading-1"`). ⬜ Left: the menu row and wiring the node into the new Look |
| **AC5** | **`Preset` and `Size` rows are removed from the property panel**, and a project carrying `_variant`/`_size` markers still opens and renders exactly as before — they become inert parameters, not errors | 🟡 **removed (s5); the "still opens" half is AC7's drive.** `renderElementStyleSection`, `onElementVariantChange` and `onElementSizeChange` are gone from `propertyeditor.ts`. The markers are now read by **nothing** — the census's 21 markers in 12 real projects become parameters no port matches and the runtime already drops, which is what makes them inert rather than broken. ⚠️ **That last clause is reasoned, not driven**, and a dozen real projects carry it, so it is AC7's first arm |
| **AC6** | **`get_style_vocabulary` reports the project's Looks plus the shipped library**, and no longer teaches the sentence at `StyleVocabulary.ts:18-22`, which is false for the surviving concept | ✅ **green (s4)** — the false sentence is replaced by what the two things actually do, `projectLooks` is reported (read from the sidecar, **both** spellings of the state key), the block is `SHIPPED LOOKS` with no sizes half, and `styleLint`'s pointer to a heading that no longer exists is fixed. 3 new specs. **Three budget gates held rather than being raised** (§3b) |
| **AC7** | **Nothing that exists breaks.** All seven templates and the export corpus render and export unchanged (design §7). 🔴 Graded with the counts, not with a claim — STY-004 §4a is the worked example of separating an inherited red from a caused one | ⬜ **and it is now the first job.** s5 changed what a newly created node carries and removed a panel section; `tsc` on both configs is clean and `tests-unit/sty-003` is 30 green, but **`test:main` and `test:ci` have not been run** — the box was at load 24.8 under a peer's cold webpack rebuild all session and a second heavy job is against the standing rule. **Run these before building anything further**, and one of the arms is opening a real project that carries `_variant` (the census names twelve; `members area Richard test` has 4) |

## 3a. What s4 built, and the defect it had to fix first

**Commit `0ef525ae`.** `models/Looks/looks.ts` — deliberately **pure** (plain data in, plain data out,
no `ProjectModel`, no `NodeGraphNode`, no registry singleton), which is what lets `tests-unit/` grade
it without a renderer and what makes the state translation provable rather than asserted.
`tests-unit/sty-002/looks.test.ts` — **21 tests green**.

🔴 **The reload path that made a Look unsavable is fixed, and it had to be: AC2 writes onto exactly
that path.** `applyProjectLevelSlice` did `target.variants = slice.variants ?? []` — plain JSON onto a
field whose elements `ProjectModel.toJSON()` calls `.toJSON()` on — so after adopting a
`nodegx.styles.json` from disk, **every `doWriteProjectToDisk` threw
`TypeError: v.toJSON is not a function`**. That is README §3's third inherited defect, the one P92
CHR-010 filed as *"creating a variant leaves the project unable to save"* and STY-001's drive
re-attributed to the reload rather than the create path. `ProjectModel.fromJSON` had it right all
along (`json.variants.map(VariantModel.fromJSON)`); this one path did not.

The hydrator is now a **required** parameter of `applyProjectLevelSlice`, not an optional one
defaulting to identity — there is no unit-testable seam on `ProjectModel` to pin the call, so the
type system holds the half a spec cannot reach. `tests-unit/sty-002/lookSurvivesReload.test.ts` —
**6 tests green, including the control that reproduces the original `TypeError`**, and one that pins
the legacy `stateParamaters` (sic) spelling the importer deliberately reverses to: a hydrator
expecting the v2 spelling would silently empty every Look's states on the next save. **This phase has
now met that key-spelling hazard three times** (§2).

⚠️ **What is NOT claimed:** that the save path is healthy end to end. These are the pure function and
a `toJSON` round trip over a real `VariantModel` — the reason the throw was possible, not a
screenshot of it being gone. The Jasmine suite and a drive own that half, and the editor stack was
held by a peer.

**Gates:** editor `test:main` **500 suites / 7988 tests**, exit 0. `tsc -p tsconfig.json` and
`tsc -p tsconfig.tests.json` both clean — the second matters because it is the only thing that
typechecks `tests/`, where this changes a Jasmine spec's call, and `test:ci` could not run.

## 3b. AC6, and the three budgets that shaped it

**What an agent was being taught, verbatim, until s4:** *"the `_variant`/`_size` markers store the
bare name, but variants are stamped into concrete params at author time (the viewer does not expand
them)"*. 🔴 **False of the concept that survives** — a Look IS expanded, on every node, every render
(`react-component-node.ts:1811-1838`) — and true only of the preset markers this phase removes. It is
replaced by both statements, each with its reference, plus the fact that keeps an agent honest: the
`variant` input port is `allowConnectionsOnly` and **no MCP tool writes a node's Look**, so copying
parameters is still all an agent can do.

**`get_style_vocabulary` now leads with the project's own Looks**, before the shipped library, for the
same reason it leads with tokens: a Look somebody already made is the house style, and an agent that
meets the library first invents a second one beside it.

🔴 **Three gates pushed back, and none of them was answered by moving a number:**

| gate | what it said | what changed instead |
|---|---|---|
| `styleTools` wire budget | **5,023 / 15,741** against 4,400 / 14,400 — over both | Each Look was being emitted complete, repeating its type's `defaults` 6× for a Button and 13× for a Text. Reporting `defaults` **once per element type** and each Look as the delta it actually is: **4,224 / 14,253** |
| `toolDisclosure` resident surface | **8,285 of 8,280** — 5 over, and PASSING at HEAD with 5 to spare (the revert arm measured both) | The tool description says the new thing in **fewer** characters than the old line: 8,274, one token better than HEAD |
| `aib-001/styleVocabularyPorts` | 4 orphans: `Text.flexGrow`, `Text.flexShrink`, `Button.cursor`, `Checkbox.cursor` | `KNOWN_ORPHANS` stayed **empty**, as its own comment demands — the claim was removed (`NO_SUCH_PORT`) |

⚠️ **That last one is a product defect this task deliberately did not fix, and it needs a row.**
Widening the port gate to the type `defaults` — which it had never seen, because the defaults used to
reach a node only through the editor's stamp — found that `applyDefaults` writes `cursor`,
`flexGrow` and `flexShrink` onto every `Button`, `Checkbox` and `Text` created on canvas, and **no
node type declares a port for any of them**: neither word appears in `nodes/visual/text.ts` and there
is no `cursor` input on either control. They reach real project files (`members area Richard test`
carries both in `nodes.json`), where the runtime drops them. TextConfig labels its pair *"BUG FIX:
Proper flex participation"* — a fix that has never once applied. **Removing them from the configs
changes what a newly created node carries and wants a drive**, so s4 stopped the *teaching* of them
and filed the rest here. ⚠️ **And there are two doors, not one** — relayed by the P93 session, which
was editing that function the same day: `NodeOperations.createNewNode` is where the stamp comes from,
and the **Layers drop path is a second caller** to check alongside the canvas one
([[a-check-in-a-second-pipeline-is-a-duplicate-first]]).

## 4. Out of scope

- 🔴 **Rendering states.** AC3 carries the data; it does not draw it. Design §9 names states as *"the
  obvious next thing after this lands"* and *"should not be smuggled in"*. **STY-004 already
  established the honest pattern for exactly this:** the exporter carries `stateParameters` and the
  report says out loud that hover/pressed/disabled were not drawn. Do the same here — carry, and say
  so.
- The name. "Look" is a working name and design §9 leaves it free. If Richard picks another, AC1 and
  AC6 are where it lands.
- **Whether a Look can extend another Look.** Design §9: not needed for v1, *"do not build it
  speculatively."*
- The property panel's appearance — that is [STY-003](./STY-003-THE-PROPERTY-PANEL.md).
- The rail panel — [STY-005](./STY-005). Design §8: it depends on this task existing.
- Migrating existing projects' inline values into Looks. Design §7: *"a later offer, not a chore,
  and not part of this phase."*


## 3c. s5 — the second mechanism, removed

**Commit `6e822e45c`.** The `Preset` / `Size` picker is the thing design rule 1 was written about,
and it is gone rather than restyled: *"one row decides it"* is a claim about there being no second
control, so leaving a tidier version of the second control would have failed the rule while looking
like it passed.

| removed | what it was | what replaced it |
|---|---|---|
| `renderElementStyleSection`, `onElementVariantChange`, `onElementSizeChange` | the panel's `Preset` and `Size` rows, and **the only two writers of `_variant`/`_size` anywhere in the product** — counted across `packages/*/src` before removal, not assumed | nothing. The Look row is the one row |
| `ElementStyleSection` (noodl-core-ui) and its `Host` | the picker itself | 🔴 **the host survives as `StyleSuggestionHost`**, because it was the **sole mount point of `SuggestionBanner` in the editor**. Deleting the file with the picker would have taken a live token-suggestion feature out alongside a retired preset one and nothing in the tree would have said so |
| `applySize`, `getSizeNames`, `ButtonConfig.sizes`, `SizePresets` | the size axis | nothing. `_size` is **0 uses across ~105 real projects**, so there was nothing to migrate — and a second axis cannot survive rule 1 whatever its usage had been |
| the `_variant` stamp in `applyDefaults` / `applyVariant` | a marker written onto every Button, Text, Checkbox and TextInput created on canvas | nothing. **The styles are still stamped** — a new Button looks identical — and they are the node's **own**, which is the model's other legal state |

🔴 **The registry tests pin BOTH halves of that last row, and the pairing is the point.** A test
asserting only `_variant` is `undefined` passes just as well against a function that had stopped
stamping anything at all ([[a-rule-reading-zero-in-both-arms-grades-nothing]]), so each case asserts
the styles are still exactly what they were **and** the marker is absent, plus one case that the
node is not empty — so the two absences cannot be vacuous.

⚠️ **What AC1 deliberately did NOT do: the rename.** `VariantModel`, `applyVariant`, `variantName`
and the `variant` input port still carry the word. The name is not ruled (design §9), and renaming
a model, a port and forty call sites to "Look" before Richard picks it would have to be done twice
if he picks something else. The *collision* AC1 is really about — two storages sharing one word —
is what s5 removed: there is now only one of them.
