# STY-002 — The Look model

**Phase:** 94 — one styles panel. **Prefix:** `STY`. **State:** ⬜ not started.
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
| ⬜ | **NOT measured: `_variant`/`_size` across the 90 real projects.** STY-001 §4b counted Looks, text styles and colour styles over that population but not the preset markers. **Count before deleting** — the templates being empty does not make a user's project empty | owed by this task |

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
| **AC1** | **One word, one meaning.** `_variant`/`_size` parameters and the `ElementConfig` "variant"/"size" vocabulary are gone from the product. Nothing named "variant" remains except the one concept, under whatever name AC6 settles | ⬜ |
| **AC2** | **The shipped Look library exists and is ordinary.** The 23 ElementConfig variants are available as Looks; choosing one **copies it into the project** as a Look the person owns, identical in every respect to one they made, and it does not change under them on an update (design §1.1, rule 4) | ⬜ |
| **AC3** | 🔴 **The library's state data is carried, not discarded.** The 8 configs with `StateStyles` land in `VariantModel.stateParameters`. **Carried, deliberately not rendered** — see §4 | ⬜ |
| **AC4** | **"Save this node's styles as a new Look"** creates a Look from a node's current parameters and puts the node in it. This is the entry point the 90-project scan says nobody has ever found (4 Looks across 90 projects, every one a test artefact) | ⬜ |
| **AC5** | **`Preset` and `Size` rows are removed from the property panel**, and a project carrying `_variant`/`_size` markers still opens and renders exactly as before — they become inert parameters, not errors | ⬜ |
| **AC6** | **`get_style_vocabulary` reports the project's Looks plus the shipped library**, and no longer teaches the sentence at `StyleVocabulary.ts:18-22`, which is false for the surviving concept | ⬜ |
| **AC7** | **Nothing that exists breaks.** All seven templates and the export corpus render and export unchanged (design §7). 🔴 Graded with the counts, not with a claim — STY-004 §4a is the worked example of separating an inherited red from a caused one | ⬜ |

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
