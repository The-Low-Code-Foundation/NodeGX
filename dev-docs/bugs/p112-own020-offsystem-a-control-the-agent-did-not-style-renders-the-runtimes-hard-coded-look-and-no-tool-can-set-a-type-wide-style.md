---
id: P112-OWN020-OFFSYSTEM
title: "A control the agent didn't style renders the runtime's hard-coded look (Radio Button: 32 px, 2 px black ring, black dot, default-font label) beside a token-styled page, and no MCP tool can set a type-wide style — Mistral (SP1) and DeepSeek (OpenTune) both shipped a 'weird mix' this way"
status: open
phase: P112
task: OWN-020
severity: medium
area: kit + mcp + runtime — `noodl-viewer-react/src/nodes/controls/radiobutton.ts` (defaults 32/32, no token); `noodl-editor/.../ElementConfigs/configs` (4 element configs: Button, Checkbox, Text, TextInput); `noodl-mcp` (only `planCreationDefaults` on create — `author.ts:178,187,396`, `planTools.ts:854` — never `ElementConfigRegistry.applyDefaults`; no variant-writing tool; `get_style_vocabulary` and `install_prefab` drop unnamed variants, `styleTools.ts:184-186`, `libraryTools.ts:683-690`); `nodegx-project-contract` (`V2ProjectStore` reads `nodegx.styles.json` but has no writer, `format/store.ts:36,189`; `schemas/styles.schema.json:58-66` requires a non-empty variant `name`, so a type-wide variant fails it)
found: P112 OWN-020, 2026-10-19 (Richard on UI-2's Browse at phone width: "a weird mix of elegant, smaller fonts and elements, and some chunky weird ones like the 'Sort By' choice circles and font")
regression: packages/noodl-mcp/tests/own020ElementStyles.test.ts
kit: mcp
evidence: UI-2's `components/Pages/Browse/nodes.json`: the three `net.noodl.controls.radiobutton` nodes carry only `label`, `value`, `useLabel`, `marginRight`; the page's text input, buttons and chips are all `var(--…)`. dev-docs/tasks/phase-112-your-own-nodegx/OWN-020-THREE-HARNESSES.md §12
---

**Why it happens.** An agent styles what it thinks about (cards, buttons, text) and places a control like a Radio
Button in passing. A node with no style parameters renders its runtime defaults, which aren't tokens. Tokens only
reach a node where a parameter says `var(--x)` (plus one `body { font-family; color }` rule, `TokenResolver.ts:165-172`),
and the global control sheet (`noodl-viewer-react/src/assets/style.css`) has no rule for a radio or checkbox label.
The kit's style vocabulary lists on-system defaults for 4 element types only, and the MCP never stamps even those,
so the agent has to copy them by hand, and for a Radio Button, Dropdown, Slider or Switch there is nothing to copy.
The same kit gave Mistral (SP1) and DeepSeek (OpenTune) the same gap, so they produced the same result.

**What already exists:** exactly the "global style" layer Richard described. A variant with no name dresses every
node of its type (`graphmodel.ts:422-423`, applied `nodescope.ts:158-162`; precedence variant < node params), v2
persists variants in `nodegx.styles.json`, and both the preview and the editor's importer load them
(`ProjectImporter.ts:451-476`, `noodl-preview/src/readProject.ts:97`). Only the writing side is missing.

**For a ruling (options, not exclusive):** (A) token-based runtime defaults for controls (small, reaches every app,
changes how existing projects look); (B) type-wide variants as the project's element styles: a tool that writes
unnamed variants, `set_style_preset` setting one for every control type, the store writer, the schema and the
vocabulary accepting them; (C) kit words: "set element styles first; don't style controls per node"; (D) a
`render_report` check naming a control whose computed size or font is off the project's token scale.

**Ruled 2026-10-19 (Richard: "Rock out and do option 4 too if you think it'll really help"). Built, uncommitted:**
- (B) `set_element_style` (deferred `theme`, 0 resident tokens; display names resolve to the LIVE type — the deprecated
  controls are type-named "Radio Button" / "Checkbox", caught by the first test run); `ProjectStore` / `V2ProjectStore
  .writeStyles`; the schema and type allow a nameless variant (an empty name still fails); `get_style_vocabulary`
  reports `elementStyles`; `set_style_preset` adds the missing ones and keeps the project's.
- (4, as the safe form) a new project's `nodegx.styles.json` carries an element style for Button, Checkbox, Radio
  Button, Text Input, Dropdown and Slider: look only (no width, flex or margin), all token references. NOT the
  runtime's own defaults: the shipped tokens are injected into every project's page, so a token default would restyle
  every existing app's controls on upgrade.
- (C) the design doctrine's step 1 ("Controls are styled once, for the whole app"); the own-editor skill's file table.
- (D) `control-off-scale` in `@nodegx/render-measure` (warning, once per app): a radio/checkbox box > 1.5x its label,
  or control text off the `--text-*` scale. Fake-DOM spec with a reverted arm (`tests/controlOffScale.test.js`).
- Proved on OpenTune's Browse with the kit's own preview: Sort-by radios 32x32 / 2px black / 16px label → 16x16 /
  1px `--border-control` / 14px with no node touched; render_report names them before and is silent after (which
  needed P112-OWN020-RENDERNOVARIANTS fixed first).

**2026-10-20: (B) without the stamp, (C) and (D) committed; (4) parked (Richard, on the measured plan).** The
server's whole suite with the stamp in: 10 of the 16 red files were caused by it, 8 of them templates. Every template
generator builds through `create_project`, so a creation stamp is a restyle of the shipped templates: a census of
`templates/*/components` found ~700 controls in 13 templates leaving at least one starter parameter unset (Rocket
School's and Star Class's 61 buttons set every look parameter themselves), many of them the SIZE parameters. The
starters were not "look only": padding and width/height move controls (the D28 drive's contentSize buttons stopped
overlapping). With both stamps off, all 8 template files pass. And the uncommitted stamp leaked: the TPL-005 / TPL-006
suites rebuild `templates/pixel-game` and `templates/story-engine` IN PLACE, and a run on 2026-10-20 wrote a
`nodegx.styles.json` into each (removed; nothing else differed).
- Committed: `set_element_style` with `starter: true` (the on-system look for one type, parameters on top, refused
  for a type with no starter), the writer, schema and type, the vocabulary report (its "none" line names the call),
  the doctrine sentence (call `set_element_style({ type, starter: true })` before placing the first control of a
  type), `control-off-scale`, and the skill's file table. `create_project` and `set_style_preset` write no element
  style, pinned by `own020ElementStyles` ("option 4 is parked").
- Parked: `dev-docs/tasks/phase-112-your-own-nodegx/own-020/option4-stamp.patch` (applies to the committed tree).
- **Still open**, so this stays open: a control an agent places without calling `set_element_style` still draws the
  runtime's look. The plan (OWN-020 §12, "option 4"): one "adopt, keeping what's there" routine (copy each existing
  control's current look onto it, then add the element styles; a before/after render must find no computed-style
  change), used by blank projects at creation, by each template generator by explicit per-template choice, and by
  existing apps only on request; restyling a template's own controls stays a by-eye ruling per template.
