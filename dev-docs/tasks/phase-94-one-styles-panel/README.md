# Phase 94 — One styles panel

**Scoped:** 2026-09-18, from Richard's ruling at the close of P92 CHR-010, and a code audit taken
the same hour at `cline-dev` HEAD `884881cff`.
**Status: ⬜ SCOPED, NOT STARTED.** Nothing here is built. **R1–R7 are proposals, none ruled.**
**Prefix: `STY`.**

> "When you add a new colour to the colour style picker, no matter what colour you choose it adds it
> transparent and you have to set it again once it's in the list. Also how TF do you delete colours?
> I wish actually there was a styles panel in the left menu of the editor to manage colours, font
> styles, variants and whatnot. … do a full styles, colour picker, variants, font styles, whatever
> review in hopes of putting it in one left styles panel, because managing it through the nodes is a
> nightmare." — Richard, 2026-09-18

## 1. The person sentences

> **Someone who wants to change the look of their app opens one panel in the left rail and sees
> everything that decides it — the colours, the text styles, the variants — creates, renames and
> deletes them there, and never has to find a node first.**

> **A colour they create is the colour they picked.**

**The close condition is Richard's look**, as in P92: a surface closes when he has seen a screenshot
and ruled it WORTHY. ([[correct-and-usable-were-never-the-same-criterion]] — sixth repeat.)

## 2. What the audit measured (2026-09-18)

**✔** = read at HEAD by the scoping session. **·** = reported by one grep, not re-read — **re-read
before building on it.**

| | reading | where |
|---|---|---|
| ✔ | **A Design Tokens panel ALREADY EXISTS in the rail, registered `experimental: true`** — `id: 'design-tokens'`, order 20, `IconName.Palette`, with a **Colors tab** and a **Design Tokens tab**, 399 LOC over 4 files. Experimental panels are per-panel checkboxes in Settings → Editor settings, so it is one switch away from visible | `router.setup.ts:434-441`; `views/panels/DesignTokenPanel/**`; `SettingsPanel/EditorSettingsTab.tsx:36-57` |
| ✔ | **There are TWO parallel systems for "the look of this app", and the pickers manage only one.** `metadata.styles` (`{colors, text}`, driven by `StylesModel`) is what the colour and text-style pickers read and write. `metadata.designTokens` (`{version, customTokens}`, `StyleTokensModel`) is what phase 9 built and what the Design Tokens panel edits | `models/StylesModel.ts:54-127`; `models/StyleTokensModel/` |
| ✔ | 🔴 **Every shipped template has ZERO colour styles, ZERO text styles and ZERO variants** — all seven carry `designTokens.customTokens` instead. So the three things this phase wants in one panel are, in the corpus we ship, entirely unused, and the system people actually meet is the other one | `templates/*/nodegx.project.json`, all 7 read |
| ✔ | **Richard's defect, and its mechanism: a new colour style is created from the PORT's committed value, not from the colour the person picked.** `<CreateNewStyle color={props.inputValue} …>`, then `resolveColor(props.color)` at create time. An unset colour port resolves to transparent, so "no matter what colour you choose it adds it transparent" | `DataTypes/ColorPicker/colorstylepicker.jsx:162, 330-352` |
| ✔ | **Delete and rename DO exist on a colour style, and are invisible until hover.** Each row draws a pencil and a trash in `.variants-item-icon`, which is `visibility: hidden` and revealed only by `.variants-pick-variant-item:hover`. Delete even counts what it would break first ("used by N nodes and M variants", a confirm modal). The capability is there; the affordance is not | `colorstylepicker.jsx:289-298`; `styles/propertyeditor/variantseditor.css:220-233` |
| ✔ | 🔴 **Creating a variant leaves the project unable to save.** After the panel's `Create new variant`, `ProjectModel.instance.variants[0]` is a **plain object** with the serialised shape, not a `VariantModel`, so `toJSON()`'s `variants.map(v => v.toJSON())` throws `v.toJSON is not a function` on every `doWriteProjectToDisk` — twice in one session's log. The model path is innocent: calling `ProjectModel.createNewVariant()` directly stored a real `VariantModel` in the same session. Lead, not diagnosis: `services/ProjectStructure/projectLevel.ts:179` does `target.variants = slice.variants ?? []` | measured live, P92 CHR-010 §8 |
| ✔ | The three management surfaces are reachable **only through a node**: the colour picker from a colour port's field, the text style picker from `TextStyleType`'s port, the variants popup from the panel head's `Variant` row. None has an entry point that does not start with "select a node" | `colorstylepicker.jsx`; `DataTypes/TextStyleType.ts:143`; `VariantStates/PickVariantPopup.tsx` |
| ✔ | Sizes: `StylesModel` 211 LOC (`getStyles / styleExists / setStyle / deleteStyle / changeStyleName / store`, all with undo), `VariantModel` 522, `colorstylepicker.jsx` 398, `TextStylePicker.jsx` 333, the three `VariantStates` files 490 | as listed |
| ✔ | The rail a person sees today is 12 items (components, search, explain, problems, project docs, version control, community, backend services, execution history, workflows, provenance, settings) — experimental ones do not appear | measured live over CDP, 2026-09-18 |
| · | Phase 9 (`phase-9-styles-overhaul/`) is **substantially complete and wired** — tokens, element configs, presets, property-panel section, suggestions. This phase is not a second run at the token system; it is the **management surface** phase 9 never built | `phase-9-styles-overhaul/PROGRESS.md` (2026-07-23 truth pass) |
| · | `LocalChangesDiff.tsx:118` calls `deleteStyle` too — version control can remove a style, so any new panel is not the only writer | `VersionControlPanel/components/LocalChangesDiff.tsx` |

## 3. The three defects this phase inherits

1. **A created colour style is transparent** (Richard, seen). Mechanism above — it reads the port,
   not the picker.
2. **Delete is hover-only** (Richard: *"how TF do you delete colours?"*). The capability exists.
3. **A created variant breaks saving** (found by the CHR-010 drive, not by a person yet). Richard,
   2026-09-18: *"I reckon this will be part of the new phase I asked to have made."*

🔴 **Do not open this phase by fixing them one at a time.** Defect 1 and 2 both live in a picker
that R1 may decide should stop being the place you manage styles at all, and a fix inside it could
be thrown away by the panel. Take STY-001 first, ask the rulings, then build.

## 4. Rulings to ask — **none of these is ruled**

| # | question | proposal | task |
|---|---|---|---|
| R1 | Does the panel **replace** the in-node pickers, or sit beside them? | **Beside.** The picker stays for *picking* on a selected node (it is the right place to choose); the panel is for *managing* — create, rename, delete, see what uses it. Replacing the picker means a person picking a colour has to leave the node | STY-002 |
| R2 | **Which of the two systems does the panel manage** — `metadata.styles` (colours + text styles, what the pickers write) or `metadata.designTokens` (what phase 9 built and every template carries)? | **Both, in one panel, honestly labelled** — the panel Richard asked for is "everything that decides the look", and a person does not know which of our two systems a colour came from. Needs its own slice; it is the biggest open question here | STY-001, STY-002 |
| R3 | The existing experimental **Design Tokens panel**: extend it, or start a new Styles panel and retire it? | **Extend it and rename it `Styles`.** It already has the rail registration, an icon, a tab shell and a Colors tab; starting again spends that twice | STY-002 |
| R4 | What lives in the panel in v1 | **Colours, text styles, variants** — the three Richard named. Fonts and spacing follow the same shape later if he wants them | STY-002 |
| R5 | Where in the rail | **Directly under Components**, above Search: it is a thing about the project, not a tool | STY-002 |
| R6 | Should **delete and rename be always visible** on a row, or stay on hover? | **Always visible**, at the panel's size — hover-only is what produced "how TF do you delete colours?". In the narrow picker popout they may stay on hover | STY-003 |
| R7 | When you create a colour style from the picker, **which colour does it take** — the one in the wheel, or the port's committed value? | **The one in the wheel.** That is what a person means by "create a style from this colour". If the wheel has nothing, the port's value is the sensible fallback, and if that is empty the field should say so rather than silently creating transparent | STY-003 |

## 5. The tasks

| id | task | state |
|---|---|---|
| [STY-001](./STY-001-WHAT-A-LOOK-IS-MADE-OF.md) | **The study.** One measured inventory of everything that decides an app's look today — the two systems, who writes each, what a project file carries, which surfaces reach them, what a person cannot do at all. Ends in a page Richard reads and the R1–R7 rulings | ⬜ |
| STY-002 | **One panel in the rail.** The shell: `Styles` in the left rail (R3/R5), sections for colours, text styles and variants (R4), reachable with nothing selected | ⬜ blocked on R1–R5 |
| STY-003 | **Colours.** Create with the colour you picked (R7), delete and rename visible (R6), and what a style is used by before you delete it | ⬜ blocked on R6/R7 |
| STY-004 | **Text styles.** The same list and the same affordances; `TextStylePicker` already has delete and rename — this is mostly moving them where they can be found | ⬜ |
| STY-005 | **Variants.** The list, rename, delete — and the save defect (§3.3), which must be fixed before anyone is invited to create variants from a panel | ⬜ |
| STY-006 | **Where it is used.** A style or variant names the nodes and components using it, and takes you there. The delete modal already counts them, so the data exists | ⬜ |
| STY-007 | **The after picture.** Before/after of every surface this phase touched, both themes, and Richard's WORTHY | ⬜ |

## 6. Out of scope

- The token system itself (phase 9 built it; this phase manages what it holds).
- The property panel's own design — that is P92 CHR-008/CHR-009, closed on Richard's looks.
- Theme authoring for the editor chrome (P92 CHR-013 `obsidian`).
- Any change to how a *node* reads a style at runtime.
