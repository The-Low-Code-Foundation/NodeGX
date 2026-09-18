# Phase 94 — One styles panel

**Scoped:** 2026-09-18, from Richard's ruling at the close of P92 CHR-010, and a code audit taken
the same hour at `cline-dev` HEAD `884881cff`.
**Status: 🟡 BUILDING — the design is ruled and the surface now exists, unlooked-at.** After s5 the
model, the export and the panel are all built; **what is left is measuring them.** Two things gate
everything below: **STY-002 AC7** (`test:main` and `test:ci`, neither run since s4 — the box was
held all of s5 by a peer's cold rebuild and then a 20-minute `test:ci`) and **STY-003 AC5/AC8** (the
treatments read off a rendered element in both themes, and Richard's look). 🔴 **Nothing in this
phase closes on a passing test.**

**Original status: 🟢 RULED — the phase has a design.** STY-001 delivered; Richard ruled its verdict AND the
redesign that came out of it on 2026-09-18 (*"Yep sold"*). 🔴 **Read
[`STY-DESIGN-THE-LOOK-MODEL.md`](./STY-DESIGN-THE-LOOK-MODEL.md) before anything else — it re-scopes
§5 and supersedes R-C.** Nothing is built. **R1–R7 ALL RULED by Richard, 2026-09-18**
(§4), and his general note widened STY-001's mandate — see §4.1. **Prefix: `STY`.**

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
| ✔ | ~~**A Design Tokens panel ALREADY EXISTS in the rail, registered `experimental: true`** … one switch away from visible~~ **WRONG — corrected 2026-09-18 s2, read at HEAD.** The registration sits inside **`if (config.devMode)`** at `router.setup.ts:424`, and `devMode` is declared **only** in `shared/config/config-dev.js`, which nothing in the repo ever loads (`build-editor.ts:20-21` swaps in `config-dist.js`, which does not declare it). The flag is `undefined` in every build, so **that branch has never run and the panel has never reached anyone's rail** — there is no Settings checkbox for it, because a panel must register to get one. `bugtracker.ts:211-230` already documents the identical trap for the same flag. **This was the evidence R3 rested on** | `router.setup.ts:424-441`; `shared/config/config.js`, `config-dev.js:9`; `bugtracker.ts:211-230` |
| ✔ | **Its Colors tab is scaffolding, not a working tab** — 69 LOC, and every row's `ContextMenu` carries placeholder items labelled `Another Action` / `Success` / `Danger` / `With subtitle`, with no handlers. The panel shell is 35 LOC. So the "399 LOC over 4 files" head start is a rail registration that never fires, a tab shell, and a colour list with a fake menu attached | `DesignTokenPanel.tsx` (35), `components/ColorsTab/ColorsTab.tsx` (69) |
| ✔ | **There are TWO parallel systems for "the look of this app", and the pickers manage only one.** `metadata.styles` (`{colors, text}`, driven by `StylesModel`) is what the colour and text-style pickers read and write. `metadata.designTokens` (`{version, customTokens}`, `StyleTokensModel`) is what phase 9 built and what the Design Tokens panel edits | `models/StylesModel.ts:54-127`; `models/StyleTokensModel/` |
| ✔ | 🔴 **Every shipped template has ZERO colour styles, ZERO text styles and ZERO variants** — all seven carry `designTokens.customTokens` instead: **251 tokens across the seven** (34/34/36/41/36/35/35), against 0/0/0. Re-measured 2026-09-18 s2: the string `"variants"` occurs **zero times** in all seven project files (the key is *absent*, not empty) and `"variant"` occurs nowhere under `templates/` at all. So the three things this phase wants in one panel are, in the corpus we ship, entirely unused | `templates/*/nodegx.project.json`, all 7 read |
| ✔ | **How the templates got discipline without variants: tokens, not components.** In `todo-list` (38 components): **26 `net.noodl.controls.button` nodes each carry their own `backgroundColor`/`cornerRadius`**, 8 text inputs and 5 Groups likewise — every one styled individually. But **526 parameters resolve to `var(--token)` and there is not one raw colour literal**. Change a token and all 26 buttons change; change what a button *is* (padding, radius, hover, disabled) and you edit 26 nodes by hand. **That gap is what variants exist to fill, and nothing in the corpus fills it** | `templates/todo-list/components/**/nodes.json`, counted |
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

## 4. Rulings — **ALL SEVEN RULED, Richard, 2026-09-18 10:59**

| # | question | **RULED** | was proposed | task |
|---|---|---|---|---|
| R1 | Does the panel **replace** the in-node pickers, or sit beside them? | 🟢 **BESIDE.** The picker stays for *picking* on a selected node; the panel is for *managing* — create, rename, delete, see what uses it | same (beside) | STY-002 |
| R2 | **Which of the two systems does the panel manage** — `metadata.styles` or `metadata.designTokens`? | 🟢 **BOTH, in one panel, each row badged with which system it came from.** A person does not know we have two systems and should not have to. **But see §4.1** — Richard's note puts the existence of two systems itself in scope for STY-001 | same (both) | STY-001, STY-002 |
| R3 | The existing experimental **Design Tokens panel**: extend it, or start a new Styles panel and retire it? | 🟢 **FRESH PANEL, DELETE THE OLD ONE.** ⚠️ *Overruled the proposal* — and correctly: §2 now shows the old panel never registered in any build and its Colors tab is placeholder scaffolding, so there was far less to extend than the proposal assumed | extend + rename | STY-002 |
| R4 | What lives in the panel in v1 | 🟢 **COLOURS, TEXT STYLES, VARIANTS** — the three he named. Radius, shadow and spacing follow the same shape later | same (three) | STY-002 |
| R5 | Where in the rail | 🟢 **DIRECTLY UNDER COMPONENTS**, above Search: it is a thing about the project, not a tool | same | STY-002 |
| R6 | Should **delete and rename be always visible** on a row, or stay on hover? | 🟢 **A VISIBLE `⋯` MENU ON EVERY ROW.** ⚠️ *Overruled the proposal.* One mark per row instead of two: it says "there are actions here" without putting two bins in your eyeline on every row. The hover-only affordance — the actual complaint — still goes | always visible (two icons) | STY-003 |
| R7 | When you create a colour style from the picker, **which colour does it take** — the wheel, or the port's committed value? | 🟢 **THE ONE IN THE WHEEL.** Fall back to the port if the wheel has nothing; if that is empty too, say so rather than silently creating transparent | same (wheel) | STY-003 |

### 4.1 What Richard's general note added — **STY-001's mandate is now wider than an inventory**

Verbatim, 2026-09-18, answering "anything else before I start":

> "I think mainly just feel free to redesign this properly. It's something that has been a huge
> oversight in the Noodl world since the early days. The Noodl team were of the opinion of 'why not
> just have everything with inline styles, it costs a few KB of HTML text rather than making
> classes, and makes the whole design job faster' and I think we're well beyond that now, with MCP
> and AI help, in view of code export and making production applications using NodeGX. So feel free
> to say 'hold on, this whole style system is dumb, let's review the whole thing'. It must still be
> possible for people to be lazy and just manually style everything, but I'll be making tutorial
> videos specifically advising people to do the style system as they go along, making sure every
> button they put down has the style they like, a variant set, tokens added, hover and disabled
> modes looked at, making sure the colour pallet fits their design vision, etc etc so this will be a
> big boost to 'make your app the right way' mentality and the opinionatedness of NodeGX against the
> original Noodl team's vision."

And on R2, on variants:

> "It seems like we might have to teach the MCP about using Variants though, since you measured that
> none of the tables have them, which is strange because how did they manage button styles and
> stuff? … Variants are like CSS classes for NodeGX nodes, it's worrying that the templates haven't
> used them. … before creating a nodeGX app via MCP, the AI coder should be forcing the user to pass
> through a mockup and design stage, where previsional tokens, styles and variants are proposed, and
> then the build starts and the MCP uses the variants throughout so we have as few manually styled
> things as possible. Visual components with states is another hack to make very specific variants
> of more complex creations … More thinking and research needed here."

**What this changes, ruled by Richard 2026-09-18 s2** (*"Should we start STY-001 to get to where you
audit and propose how you'd fix the whole styles system?"*):

1. 🔴 **STY-001 stops being an inventory and becomes an audit that owes a VERDICT.** It must end
   with a proposal for what the style system *should* be, including the option "the two-system split
   is wrong, here is what replaces it" — not merely a description of what exists. R2's "both,
   badged" stands as the ruling **for the panel**, and is explicitly not a ruling that two systems
   should continue to exist.
2. 🔴 **Two constraints the proposal must satisfy, both from the note:** (a) a person must still be
   able to be lazy and style everything by hand — the opinionated path is a default, never a gate;
   (b) the target is production apps and **code export** (P18), so a style system that cannot export
   as classes is a worse answer than one that can.
3. 🔴 **The MCP authoring side is NAMED here and is NOT a phase-94 task.** Teaching the MCP to
   author variants, and a mockup/design stage before an MCP build, are real work that STY-001's
   verdict must scope — but they belong to their own phase off the back of it.
   ([[a-finding-may-already-be-another-tasks-acceptance-criterion]] — grep before opening it.)
4. **The variants question is now a first-class question of the audit**, not a footnote: §2 shows
   the corpus got colour discipline from tokens and component discipline from nothing.

## 5. The tasks

🔴 **This table is superseded by [`STY-DESIGN-THE-LOOK-MODEL.md`](./STY-DESIGN-THE-LOOK-MODEL.md)
§8**, which re-scoped it after Richard ruled the redesign. It is kept here only so the change is
visible; **build from §8, not from this.**

| id | task | state |
|---|---|---|
| [STY-001](./STY-001-WHAT-A-LOOK-IS-MADE-OF.md) | **The study and the verdict.** Audit in `STY-001-FINDINGS.md`, proposal in `STY-001-VERDICT.md`, ruled design in `STY-DESIGN-THE-LOOK-MODEL.md` | 🟢 **done** |
| [STY-002](./STY-002-THE-LOOK-MODEL.md) | **The Look model** — one concept end to end; `Preset`/`Size` removed | 🟡 **AC2/3/4 model + AC6 green (s4); AC5 and AC1's mechanism closed (s5)** — the `Preset`/`Size` rows and the size axis are deleted, and nothing writes `_variant`/`_size` any more. ⬜ **AC7 is the next session's first job**, and AC1's rename waits on the name |
| [STY-003](./STY-003-THE-PROPERTY-PANEL.md) | **The property panel** — the four rules and three states. The "clear AF" task | 🟡 **built in s5, not yet looked at.** AC1–AC3, AC6 and AC7 are in the tree: every row says where its value came from, an override says what the Look wanted and offers a revert, the menu is design §4's three sections, and the `⋯` is visible. 🔴 **AC5 (read off the rendered element, both themes) and AC8 (Richard's WORTHY) are untouched and are the only things that close it** |
| [STY-004](./STY-004-EXPORT-CARRIES-LOOKS.md) | **Export carries Looks** — scope first; blocking for anything that ships | 🟢 **Part A done (s4)** — a Look, a text style and a colour style all reach the emitted CSS and the report names each. Part B (one shared class per Look) is 1 session and not blocking |
| STY-005 | **The Styles panel in the rail** — colours, text, Looks (R1, R3–R6 as ruled) | ⬜ |
| STY-006 | **Where it's used** | ⬜ |
| STY-007 | **The after picture** — both themes, Richard's WORTHY | ⬜ |

~~The original seven tasks (one panel / colours / text styles / variants / where used / after
picture) were scoped against a model in which presets and variants were separate systems. Richard
ruled that model away.~~

## 6. Out of scope

- The token system itself (phase 9 built it; this phase manages what it holds).
- The property panel's own design — that is P92 CHR-008/CHR-009, closed on Richard's looks.
- Theme authoring for the editor chrome (P92 CHR-013 `obsidian`).
- Any change to how a *node* reads a style at runtime.
