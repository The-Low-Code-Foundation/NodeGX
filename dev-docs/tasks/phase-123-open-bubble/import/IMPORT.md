# P123 s3 — a Bubble export becomes a NodeGX project (the importer spike)

> **Credits.** Part of the converter's Bubble knowledge comes from Rico Trevisan's
> [bubble_ex](https://github.com/ricotrevisan/bubble_ex) (MIT License, Copyright (c) 2026 Rico Trevisan; read at commit
> `5f1c480`), an Elixir toolkit that reads Bubble apps and rebuilds them on Phoenix/Ash: the nonant reading order
> (§9), and 22 expression operators in `OPS` (the list operators `specific_item`, `is_contained_by_list`,
> `is_not_contained_by_list`, `not_contains`, `convert_to_list`, `unique`, `minus_list`, `intersect_with`,
> `plus_element`, `minus_element`, `divide`, `defaulting_to`, and the text and number operators `trim`,
> `capitalized_words`, `number_of_characters`, `format_json_encode`, `format_url_encode`, `is_email`,
> `absolute_value`, `rounded`, `as_text`, `convert_to_number`). His 19 frozen fidelity cases (a run-mode payload
> beside Bubble's own screenshots and element measurements) are the converter's natural next gate.

**Written 2026-10-16 by Fable 5.1, s3 of P123**, from Richard's message after the Open Bubble sessions: *"people who
want to leave Bubble for an open source system, but don't want to stop using the Bubble editor, who might actually like
our Open Bubble project … Turning Bubble JSON programmatically into NodeGX JSON, with some AI assistance but with the
size of the JSON exports we'd need it to be 90% programmatic if it's to be at all possible."*

**The spike's answer: yes, and it is more than 90% programmatic on the subset this corpus covers.** A 500-line
converter with no dependencies (`bubble2nodegx.mjs`, beside this file) takes Richard's 2023 test app
(`digital-bricks/bubbleExporter`, `v6/v6.json`: three pages, 22 elements, 40 styles, two workflows, an API Connector
call, a repeating group, two data types) and writes a NodeGX v2 project that the kit validates with **0 errors**,
`render_report` draws with **0 runtime errors**, and **Open Bubble opens as if it had been built there**: the element
tree, the property editor with the button wearing *Primary Button*, the Workflow tab showing *When Button A: Click →
Create Record (Message, text = Input A's value)*, the Data tab's two types, the Styles tab's 32 styles with their
properties and wearers, and the button painted Bubble's own primary `rgb(2, 5, 211)` through Bubble's own token name.

## 1. What was measured

| what | count | converted |
|---|---|---|
| pages | 3 | 3 |
| elements | 22 | 22 (every type in this app has a mapping) |
| element conditions ("states") | 7 | 5 as code (hover/focus → NodeGX states; the rest → an Expression per property); 2 skipped (*this input isn't valid*: no NodeGX state) |
| styles → `nodegx.styles.json` variants | 40 | 32 (8 skipped: HTML, Video, GoogleMap, SliderInput ×2, FileInput, DateInput, PictureInput — no NodeGX element yet) |
| workflows | 2 | 2 (Button clicked ×2; the Page-loaded family is in the table too) |
| actions | 3 | 3 (Create a thing, Reset password, Go to page) |
| dynamic expressions | 7 | 7 compiled to JavaScript Expression nodes with chips, **0 unknown operators** |
| data types → `dbCollections` | 2 | 2 |
| colour and font tokens | 9 | 17 custom tokens (`--color_primary_default`, `--color_primary_default_rgb`, …, `--font_default`), so Bubble's `var(--color_…)` strings pass through **unchanged** and resolve |
| findings written to `docs/IMPORT-REPORT.md` | 17 | 16 "the dictionary" (a style or state with no mapping yet), 1 "a person or an AI" (the User type's privacy rules) |

Gates run on the output: `validate_project` 0 errors / 58 warnings (all raw-px and raw-colour lint, by design: the
import keeps Bubble's numbers); `render_report` three pages, 0 console errors; `drive-open-bubble.mjs` opens it in the
P123 editor and reads the button's computed background as `rgb(2, 5, 211)`. Pictures: `../look/import-design.png`,
`../look/import-workflow.png`, `../look/import-styles.png`.

**A trap met on the way (not the converter's):** the `nodegx` MCP's `render_report` painted every styled button black.
Its `dist/` is from 2026-10-14 and the P123-S2-VARIANTLOST fix in the exporter is from 2026-10-16 15:12, so that
render drops every variant until `noodl-mcp` is rebuilt ([[the-on-disk-editor-bundle-is-not-the-one-running]]). The
Open Bubble drive uses the rebuilt preview bundle and shows the variant.

## 2. How to run it

```sh
# the converter: a .bubble / JSON export in, a NodeGX v2 project folder out (the folder is replaced)
node dev-docs/tasks/phase-123-open-bubble/import/bubble2nodegx.mjs /path/to/app.bubble.json /path/to/out
cat /path/to/out/docs/IMPORT-REPORT.md          # counts + every finding, with where and what
# open it in Open Bubble (needs the runtime, the preview bundle and Orbit's modules: NEXT-SESSION-PROMPT.md)
node dev-docs/tasks/phase-123-open-bubble/editor/serve.mjs /path/to/out --port 47900
# or headless, four screenshots
node dev-docs/tasks/phase-123-open-bubble/import/drive-open-bubble.mjs /path/to/out /tmp/shots
```

The test export lives in Richard's private `digital-bricks/bubbleExporter` repo (`v0`…`v6`, one Bubble change per
version, with his 2023 analysis notes); it is not copied into this repo.

## 3. The dictionary, as built (Bubble → NodeGX)

| Bubble | NodeGX | how |
|---|---|---|
| a page (`type: Page`) | `/Pages/<name>`: a `Page` node (title, urlPath; `index` → `""`) over a root `Group` | the page's own `container_layout`, gaps, padding, backdrop colour on the root Group |
| Group, Shape, Popup, FloatingGroup, GroupFocus, Alert | `Group` (Popup/GroupFocus start `visible: false`) | |
| Text, Link | `Text` (a Link's destination is a finding) | |
| Button | `net.noodl.controls.button` (`label`, `useLabel`) | |
| Input, MultiLineInput | `net.noodl.controls.textinput` (`placeholder`; `content_format` password/email/number → `type`) | |
| Checkbox | `net.noodl.controls.checkbox` | |
| Dropdown, RadioButtons, AutocompleteDropdown | `net.noodl.controls.options` | |
| Image, Icon | `Image` (`src`), `net.noodl.visual.icon` | |
| RepeatingGroup | a `Group` holding a `For Each` whose template is a row component `/Rows/<page> <name>`; the cell's elements inside it; a `Component Inputs` node gets one port per field the cell reads | `data_source` compiled → `items` |
| HTML, Video, GoogleMap, SliderInput, DateInput, FileInput, PictureInput, any plugin element | a labelled `Group` placeholder + a finding | the next dictionary rows, or a kit node each |
| **responsive engine**: `container_layout` row/column, `row_gap`/`column_gap` (`use_gap`), `container_*_alignment` | `flexDirection`, `rowGap`/`columnGap`, `alignItems`/`justifyContent` | |
| `single_width`/`single_height` (fixed), `fit_width`/`fit_height`, `min_/max_width_css`, `horiz_alignment` | `width`/`height` px, `sizeMode` (explicit / contentHeight / contentWidth / contentSize), `minWidth`/`maxWidth`, `alignX`; *stretch* → width 100% | |
| a *fixed* container, or a page/group with no `container_layout` (the old engine) | children `position: absolute` placed by `marginLeft`/`marginTop` from `left`/`top`, the parent `position: relative` | faithful, not idiomatic; an AI re-flow pass is the upgrade |
| `bgcolor`, `background_style` gradient/none, `border_*`, `border_roundness`, `boxshadow_*`, `font_*`, `line_height`, `letter_spacing`, `font_alignment`, `padding_*`, `margin_*`, `opacity` | `backgroundColor`, `backgroundGradient`, `borderStyle/Width/Color`, `borderRadius`, `boxShadow*`, `color`/`fontSize`/`fontWeight`/`fontFamily`, `lineHeight`, `letterSpacing`, `textAlignX`, `padding*`, `margin*`, `opacity` | `var(--font_default)` resolves to the font token's face |
| `settings.client_safe.color_tokens` / `font_tokens` | `metadata.designTokens.customTokens` with Bubble's own names, plus `_rgb` triples | Bubble's `rgba(var(--color_x_rgb), 0.8)` works as is |
| a style (`styles.<id>`) | a variant `{ name, typename, parameters, stateParameters }` in `nodegx.styles.json`; the element wears it (`variant`) and drops the parameters the variant already sets | |
| a style's or element's state *this element is hovered / focused / pressed* | `stateParameters.hover` / `focused` / `pressed`; transitions → `stateTransitions` | |
| any other element condition | one `Expression` per changed property: `(<condition>) ? <state value> : <base value>` → the parameter; `is_visible` → `!(<condition>)` → `visible` | the Current Page Width rule became a `Screen Resolution` chip |
| **expressions** (the `Message` chain, `next`/`args`) | one JavaScript `Expression` node; each root a chip (a port wired from the value it names), operators from a table | `GetElement` → the element's value port; `CurrentUser` → a `net.noodl.user.User` node (`logged_in` → `authenticated`); `GetParamFromUrl` → `PageInputs` (`pm-<name>`); `PageData` width → `Screen Resolution`; `GetDataFromAPI` → an `net.noodl.HTTP` node's `response`; `ElementParent` in a cell → the row's `Component Inputs`; `TextExpression` → string concatenation |
| operators in the table today | `get_data`, `is_empty`, `is_not_empty`, `contains`, `equals`/`isnt`, `and_`/`or_`/`not`, `<`/`<=`/`>`/`>=`, `+ − × ÷`, `count`, `first_item`/`last_item`/`item_from`, `append`, `lowercase`/`uppercase`/`trimmed`, `converted_to_number`, `logged_in`; `_api_c2_<field>` → the path from the API Connector's parsed `types`; `<field>_<type>` → the field's display name | an unknown operator becomes `__bubble("name", …)` + a finding, so the page still opens |
| a workflow event | `ButtonClicked`/`ElementClicked` → the element's `onClick`; `PageLoaded` → the Page's `didMount`; `InputValueChanged` → `onTextChanged`; `CustomEvent` → `Event Receiver` | |
| the action chain | each action a node; the event → the first action's trigger; each action's done → the next's trigger; an action's *Only when* → a `Condition` between them (the Open Bubble branch shape) | |
| `NewThing` / `MakeChanges` / `DeleteThing` | `NewDbModelProperties` / `SetDbModelProperties` / `DeleteDbModelProperties` with `collectionName`; each initial value → `prop-<field>` (a bare *Input X's value* is a direct wire, anything else an Expression) | |
| `ChangePage` | `RouterNavigate` → `/Pages/<name>` (parameters: a finding) | |
| `LogIn` / `SignUp` / `LogOut` / `ResetPassword` | `net.noodl.user.LogIn` / `SignUp` / `LogOut` / `ResetPassword` (`token` from `PageInputs`) | ResetPassword is a retired node with no replacement: a kit gap for a Bubble migrant |
| `SetCustomState`, `ShowElement`/`HideElement`, `TriggerCustomEvent` | `Set Variable` (P123's custom-state naming), a `Variable2` wired to `visible`, `Send Event` | |
| any other action | an `Expression` placeholder carrying the action's JSON in a comment, chained so the workflow stays whole, + a finding | |
| `user_types` | `metadata.dbCollections` (text/number/boolean/date/list./custom. → String/Number/Boolean/Date/Array/Pointer) | |
| privacy rules | a finding for a person or an AI (`nodegx.security.json`) | the conditions are the same expression language, so this is one more table row |
| the API Connector | one `net.noodl.HTTP` node per call used on a page (url, method), fetched on `didMount`; the parsed `types` give the field paths | auth headers and private keys: a finding |
| `_index`, `element_definitions`, `comments`, `closest_ancestor_snapshots`, `uid_counter` | ignored (Bubble's own indexes) | |

## 4. Why "90% programmatic" is the right expectation, and where the other 10% is

The export is an AST (Bubble's own 2018 "Trees in the clouds" posts, linked from Richard's README): every element,
style, workflow and expression is a node with a `type` or a `Message` `name`, and there are finitely many of them —
a few dozen element types, under a hundred action types, a few hundred expression operators. **Each one is a row in a
table, written once, and then every app that uses it converts for free.** That is why the sample converted 100% of its
elements and actions with no AI in the loop: the table covers what it uses. The work is the table, not the apps.

What is not a table row, and where an AI pass earns its place:

1. **Plugin elements and plugin actions.** Their code is not in the export. Each is a port to a kit node or a
   placeholder. AI can draft the kit node from the plugin's public source; a person signs it.
2. **The old absolute layout** (pages and groups with no `container_layout`, the pre-2021 engine): converted
   faithfully as absolute boxes, which renders right and edits badly. Re-flowing it into rows and columns is a
   judgement, and an AI with the screenshot is good at it.
3. **Naming.** Bubble apps are full of *Group D* ×6. The import keeps them; an AI pass that names components and
   rows from their contents is cheap and makes the project pleasant.
4. **Privacy rules → `nodegx.security.json`** and **backend (API) workflows → cloud functions**: both are the same
   action and expression language and will go in the table; until then a person decides.
5. **The long tail of operators** (`:formatted as` with locales, `:extract` with regex flavours, date arithmetic). A
   table row each, but the right time to write one is when a real app shows it.

So the honest number is: **100% of what the table covers, and the table covers what the corpus has shown it.** Across
real apps, elements and workflows should sit well above 90%; plugin-heavy apps lower.

## 5. What this corpus cannot tell us (the ask of Richard)

The 2023 test app never used: *Do a search for* (with constraints, sorts, `:filtered`), option sets, reusable
elements, custom states, popups and *Show element*, *Make changes to a thing*, lists of things, backend workflows and
*Schedule API workflow*, custom events, the Table element, Bubble's 2024+ style variables and global expressions,
plugin elements. **Every one of those needs one real export to pin its JSON.** The dictionary cannot be written from
memory: the sample proved that a key as basic as `background_style` is simply absent from a button style (s3's one
real converter bug: the buttons painted black until the rule accepted the absent key).

**The ask:** two or three real exports (Settings → General → *Export application* on a paid plan: a 2026 guide puts it
at Growth and up; older `.bubble` files from the 2023 era on disk are just as good) plus the Data tab's CSV export of a
couple of types, into the private `bubbleExporter` repo. The converter's report lists what each one needs, and each
need is one table row.

## 6. Where it goes next, if Richard says so

1. **Grow the table against real exports** until each app's IMPORT-REPORT has 0 "the dictionary" rows. The report
   is the gate; `drive-open-bubble.mjs` is the picture.
2. **"Import a .bubble file" in Open Bubble**: a button on the project picker; `serve.mjs` already writes files under
   a project folder. The story on nodegx.io is then one sentence: *export your Bubble app, open it here, keep editing
   the way you always did, own the files, deploy anywhere, export to React (P18).*
3. **Data**: a CSV-per-type importer into the bound backend's Parse-wire classes (the collections are already
   declared by the import).
4. **A kit `ResetPassword` replacement**, and kit nodes for the eight element types this app's default styles name
   (DateInput, FileInput, SliderInput, Video, GoogleMap, HTML, PictureInput).
5. Later, `nodegx import bubble <file>` in the CLI.

Prior art measured 2026-10-16: no maintained open-source converter exists; Richard's `bubbleExporter` repo is the one
the Bubble forum cites; `bubbletocode.com` sells a manual rebuild; Bubble's manual says apps "can only be run on the
Bubble platform" and that they "can help you export the design". The JSON export is still offered on paid plans.

---

## 7. s3b (2026-10-16, later the same day) — no export plan needed: the app tree is in the run-mode bundles

Richard: *"the clever buggers at Bubble have made it so you can only export when you take their 260 dollar a month
plan … I'm sure they load the jsonbase into the front end somewhere same as noodl does. i added
import/static.js from an enormous app i created years ago but i'm not sure that's the right file."*

**He is right, and `static.js` is not the file — `dynamic.js` is.** A Bubble page in run mode loads three
app-specific bundles from `/package/…`: `static.js` (the runtime's app-level part: every plugin's definition **and
code**, a 1,000-entry element property cache, and derived tables: pages, reusables, data types with fields, backend
workflow names), `dynamic.js` (**the app definition**: `const app = JSON.parse('…')` with settings, `user_types`,
`option_sets`, `styles` and the reusables, then `app['%p3']['<page>'] = …` with **that page's whole element tree and
workflows**, then the `id_to_path` index of every page), and an XHR to `/api/1.1/init/data` for the data. Every page's
`dynamic.js` carries the app part plus its own tree, so one fetch per page is the whole app. The keys are abbreviated
(`%p` properties, `%x` type, `%el` elements, `%wf` workflows, `%ed` reusables, `%p3` pages, `%h/%w/%l/%t` …): the
same AST the paid export writes with long names, which is why the 2023 export's `id_to_path` already read
`%p3.AAX.%el.bTGlI`. **`bubble-run-bundle-to-export.mjs`** (beside this file) turns a folder of `dynamic.js` files
into one export-shaped JSON through a 90-entry key dictionary (unknown keys are kept as-is and listed), and the
converter reads it unchanged. Nothing is executed: the JS string literals are decoded as text and parsed as JSON.

### How to get the bundles (TrybeUP is still live on bubbleapps.io in test mode, so this was measured on it)

```sh
# one HTML per page gives that page's dynamic.js URL (the hash is per page); login-gated pages serve the index page
# again — their bundles come from DevTools (Network → dynamic.js → Save) after logging in.
for p in index faqs reset_pw; do
  curl -sL -A "Mozilla/5.0 Chrome/130.0" -o "$p.html" "https://<app>.bubbleapps.io/version-test/$p"
  d=$(grep -o '/package/dynamic_js/[^"]*dynamic.js' "$p.html" | head -1)
  curl -sL -A "Mozilla/5.0 Chrome/130.0" -o "$p.dynamic.js" "https://<app>.bubbleapps.io$d"
done
cp static.js .   # optional: plugin names for the report
node import/bubble-run-bundle-to-export.mjs <folder> app.export.json
node import/bubble2nodegx.mjs app.export.json <outdir>
```

Put bundles under `import/exports/` or beside `static.js`: **`.gitignore` now ignores both**, because `static.js`
carries keys (this one holds a Stripe test secret, two Google keys, two webhook secrets and 13 "private" plugin
values). Never commit a bundle.

### What the real app measured (TrybeUP, 22 pages, Bubble version 28, six years of work)

| what | count | converted |
|---|---|---|
| pages with a tree in the fetched bundles | 18 of 22 (4 are login-gated: admin_dashboard, condition_report, user_dashboard_mobile, claim_details) | 18 |
| elements | 3,941 | 3,803 (96%); the rest are plugin elements (ionic icons, FileInput, HTML, Air date pickers …) placed as labelled placeholders |
| workflows | 637 | 637 |
| actions | 1,285 | 1,040 (81%); the rest are plugin actions (AirAlert toasts, TabOpener), server-side mail, *Schedule API workflow* |
| expressions | 4,871 | 4,871 compiled; 10 unknown operators left, 191 field reads guessed by name |
| reusable elements | 33 (of 41; the others live on the gated pages) | 33 components, placed as instances |
| option sets | 45 | 45 components (a Static Data node each) |
| custom states | 93 | 93 Variables |
| *Do a search for* | 235 | 235 query nodes with their constraints as a filter |
| data types | 40 | 40 collections |
| styles | 118 | 110 variants |
| `validate_project` | 11,556 nodes, 22,895 endpoints | **0 errors**, 5,237 warnings (raw px and colours, by design) |
| Open Bubble | all 18 pages | **opens**: tree, properties, 40 workflows on index alone (*When Button SAVE 1 equip: Click · 18 steps*), 40 data types, 110 styles with their wearers; the index page draws in 2.5 s |
| findings in `IMPORT-REPORT-trybeup.md` | 1,198 (from 3,448 on the first run) | 596 for the dictionary, 602 for a person or an AI |

Pictures: `../look/import-trybeup-{design,workflow,data,styles}.png`, and `import-trybeup-live-bubble.png` is the
live Bubble page for comparison (its red banner: *"This application is at its limit … Please upgrade"*).

**Honest state of the Design canvas:** the Workflow, Data and Styles tabs are convincing; the canvas is not yet. The
header renders as a 290-px dark band (an instance's width is the component root's, not the Bubble instance's), fonts
are Bubble's Google fonts that NodeGX will not link, hero background images map but the section's dynamic texts read
"Text" until their inputs arrive, and the first run had every hidden section visible (52,474 px tall). Each of those
was a measured fix or is a known next row; none is a wall.

### The dictionary rows this app added (all in `bubble2nodegx.mjs`)

- **A hidden element is `mounted: false`, not `visible: false`**: NodeGX's `visible` keeps the space (the Group docs
  say so); Bubble collapses by default. Measured by an experiment of seven groups: every `visible: false`, however
  wired, still took 40 px. A Bubble "collapse when hidden = off" element is the only one that wants `visible`.
- **An element's base `is_visible`** (never mapped before: the 2023 app had none); conditional visibility goes to
  the same port.
- **Bubble's "not fixed width"** is width 0 in the file: it means *grow between min and max*, so `width: 100%` plus
  `minWidth`/`maxWidth`; a 0-px Text was 7,821 px tall.
- **"Do when condition is true" is edge-triggered**: Expression → `Value Changed` → `Condition` (eval) → actions.
  Wired straight from `isTrueEv` it fires on every truthy evaluation; an action that changes what the condition reads
  re-fires it forever, and the page froze (CDP never returned). Found by bisecting the two things that each made it
  load again.
- **A Group's data source** is an Expression the children read as "Parent group's thing" (climbing the ancestors);
  a workflow's "Parent group's thing" climbs from the workflow's element; a workflow whose element lives in a
  repeating-group cell is converted into that row component, where "Current cell's thing" is its Component Input.
- **Every element is pre-indexed** before anything converts, so forward references resolve, and a reference across
  components is an AI finding (a Component Output is the NodeGX form), not a dangling wire. Reusables are placed by
  their definition's id, which differs from their key.
- Record nodes take the id on `modelId` with `idSource: explicit`; Delete fires on `store`; Set Variable's value
  port is `value` with `setWith: *`; a text input's value output is `onTextChanged`; an icon source is an object
  `{ class, code, codeAsClass }`; a Bubble Icon is clickable so it becomes a Group holding the glyph; a Text takes
  no padding, background or border; a checkbox takes no % width; `alignItems` has no space-between.
- Expressions evaluate at load (an input that never arrives reads as undefined); field reads resolve by the data
  types' field keys (`isseller__boolean` → `isSeller`), and an unknown no-argument operator is read as a field;
  dates (`plus_days`, `change_hours`, `extract_from_date`, ranges), text and list operators; `OneOptionValue` is a
  literal; `PreviousStep` reads the step node's output by its type; Bubble's rich-text BBCode is stripped
  (`[b]`, `[color=]`, `[ul]` …: a rich-text Text is a kit gap); background images map with `cover`.

### What the report still lists (the next rows, by count)

216 "Parent group's thing" with no ancestor holding data (a reusable's own data source: a Component Input), 72
`:filtered`/`:sorted` (the composer's JS view), 60 + 20 toast and new-tab plugin actions, 54 reads across a reusable's
boundary, 39 conditional data sources, 35 + 35 `TerminateWorkflow`/`ResetInputs`, 34 backend workflows (cloud
functions), 28 Stripe-plugin API reads, 26 date-range constraints (no range column type), 26 server-side emails, the
plugin elements. All known shapes; each is a row or a kit node.

### Found in the kit and the editor on the way

- **Opening a step's settings on the index page (3,100 nodes) hangs the Open Bubble editor** for minutes: the drive
  timed out there every run after the app was on screen (P123-S3-STEPSETTINGS; the port context is probably rebuilt
  per click).
- The `nodegx` MCP's `render_report` on this project returned no pages at all from the stale `dist/` (the same
  rebuild as §1's trap); `validate-project.mjs` beside this file talks to that server over stdio and works.
- There is no `timeout` on macOS; `perl -e 'alarm N; exec @ARGV'` is the hard stop the drive needs.

### What this changes about §5's ask

No paid plan, no export: **any Bubble app a person can open in run mode gives up its whole definition** (the pages
they can reach; a login gives the rest). The corpus question is answered by Richard's own live app, and every row the
report lists is now written against a six-year app, not a toy. The ask of Richard shrinks to: the four gated pages'
`dynamic.js` from DevTools after logging in, and the Data tab's CSV export of a type or two for the data importer.

## 8. s4 (2026-10-16, evening) — TrybeUP measured in the browser; held; the template next

Richard: *"flickering between components all the time on a mostly blank page and very little is rendering … we bit
off more than we could chew … I'll make a basic template in Bubble, simple boilerplate with no backend calls, and
we'll start there trying to get them to look the same."* Held before any fix. What the headless probe measured on
the converted TrybeUP (`/tmp/trybeup-open-bubble`, `preview-solo.mjs` on :47902, CDP on a fresh Chrome), so the next
session does not pay for it again:

- **The page is not flickering in the DOM; the main thread is pegged.** Once drawn (4.2 s), the frame held 243
  elements and the same text hash for 11 s. But the runtime logged **37,038 console errors in 14 s** and kept at
  ~1,550/s at rest; one `Runtime.evaluate` took 290–650 ms. That saturation is what reads as flicker and blankness.
- **Of 3,481 nodes on `index`, 243 DOM elements render**: 133 nodes are `mounted:false` at rest, and most Bubble
  content is behind conditions whose Expressions read undefined (queries failed, inputs never arrive).
- **Top steady-state errors, by kind** (3-second window, per node id — the loop members):
  `DbCollection2` "no backend configured" (89 query nodes on `index`, all fetched from `Page.didMount`; the same
  node ids fail 129–175× in 3 s, so something re-fires them); `Group/Text/button "Width" was sent
  {"value":"100%","unit":"%"}, which is not a size` (129×/3 s per node — the FILE holds `{"value":100,"unit":"%"}`
  on 762 nodes, so the string `"100%"` is made in the runtime/exporter path or by an Expression such as
  `(pageWidth <= 1000) ? "100%" : 1300`, which the converter writes for Bubble's responsive width conditions);
  `Node /Reusable/dropdown_calendar doesn't have a port named this` (the converter's `elementValuePort` fallback
  `'this'` for an element type with no such port); `Invalid connection … Variable2 value → /Reusable/Popup … input
  mounted` (a component INSTANCE has no `mounted` input, so every Show/Hide of a reusable popup is a dead wire);
  `Expression threw: __bubble is not a function` (the placeholder the converter emits for unmapped operators is
  never defined — define it as a no-op that logs once, or emit `undefined`); `SetDbModelProperties: Missing Record
  Id`; `externallink: No link to open`.
- **`navigateToPath('/privacy_policy')` lands on `/trybeup`**: the app's own logic redirects (the header's 37
  `RouterNavigate → /Pages/index` and a `/Pages/?` target); the 14-node "dataless" privacy page still places
  `desktop_header` (358 nodes, 6 record nodes) and `desktop_footer`, so no page in this app is free of queries.
- **The 40 collections are declared with columns in `metadata.dbCollections`** (one `columns` list each), so
  `provision_backend` could seed them empty and turn 6,141 "no backend" errors into 89 empty lists. That removes
  the error flood, not the width/`this`/`mounted`/`__bubble` rows above, which are converter work.

**Decision (Richard):** stop on TrybeUP. Start from his boilerplate Bubble template (a landing page by Top Shelf
Templates: header, hero, stats band, benefits, pricing, CTA, footer; `template-screens/` has five screenshots) and
make the NodeGX render match it, section by section, before any data. `template-static.js` was added but, as §7
says, `static.js` carries no tree — it names one page (`index`) and no app URL; the page's `dynamic.js` (or the
app's run-mode URL) is the input the converter needs.

## 9. s4 — the template: one Bubble page made to look the same, section by section

Richard's boilerplate (a Top Shelf Templates landing page, free plan, `https://test112-14324.bubbleapps.io/version-test`):
one page, 188 elements, 14 workflows, 0 data. `exports/template/` (gitignored) holds its `index.dynamic.js`; his five
screenshots of the Bubble original are in `template-screens/`; the NodeGX render before and after this round is
`../look/import-template-nodegx-before.png` and `../look/import-template-nodegx.png` (preview-solo, 1440 wide, 0
console errors, 0 validation errors, 188/188 elements mapped). The rows this page added to `bubble2nodegx.mjs`:

| Bubble | NodeGX | why it showed |
|---|---|---|
| `font_family` / `font_face: "Inter:::600"` | `fontFamily` + `fontWeight`, and **`settings.headCode`** carrying one Google Fonts `<link>` for every non-built-in family and the weights it uses | the whole page drew in Times: NodeGX never links a web font; `HtmlProcessor` applies `headCode` in both the deploy and the in-page preview (measured: `document.fonts` lists Inter 400–900) |
| `materialicons-Materialicon` (`icon`, `icon_color`) | a Group holding an Icon with `iconIconSource {class: 'material-icons', code: '<name>'}`, Material Icons added to the same `<link>` | every check mark and benefit tile was a plain square placeholder taking `width: 100%`, which pushed the pricing texts to the right edge |
| Image `src` (a TextExpression, protocol-relative `//s3…`) | `src` with `https:`; `objectFit: contain`; a fixed-width image with `use_aspect_ratio` takes its height from the ratio | the converter read `image`, Bubble writes `src`: every photo and logo was an empty bordered box |
| `container_layout: "relative"` (Align to parent) with `nonant_alignment "<v><h>"` (a/b/c = start/center/end) | the **biggest child stays in flow** (`position: relative`, its zIndex kept) and the container aligns it with `justifyContent`/`alignItems`; every other child is `position: absolute` with `alignX`/`alignY` from the nonant and its margins as offsets | the decorative rectangles stacked below the photos instead of behind them; a first try with all children absolute lost the containers' height and the mockups and pricing cards overflowed into the next band |
| a Text with `background_style: bgcolor` or a border | a Group carrying the box (background, radius, border, padding, width, margins, `justifyContent: center` for `vertical_centering`) around a Text with the text and font | a Text takes no box in NodeGX; the MOST POPULAR pill was white text on nothing |
| `[sup]…[/sup]`, `[sub]` | stripped with the other BBCode | `[sup]$[/sup]29` was printed literally |
| row children's `vert_alignment` | `alignY` (top/center/bottom) | the CTA button sat at the top of its band |
| a conditional size in % | the Expression returns `{value, unit}` | the runtime refused the string `"100%"` ("not a size") — 6 errors here, 10,000+ on TrybeUP |
| a Link with no text (icon-only) | `text: ''` | four "Text" words in the footer |
| `rotation_angle` | `transformRotation` | the light-blue shapes behind the mockups are rotated 12° in Bubble |
| `fixed_width: true` | ignored on a new-engine page (`single_width` is the flag) | a first try honoured it and crammed the nav buttons to 60 px |

Unverified: the nonant letter order (`<v><h>` is a guess; every element here is `aa` or `bb`, which read the same
either way). **Settled 2026-10-17: it is `<h><v>`** (horizontal first: `ba` = top centre), as Rico Trevisan's bubble_ex
reads it; his graded case `bpgwgmpz` has an `ac` element with left and bottom margins and a `ca` with top and right.
The converter now reads it that way; see Credits at the top.

**What still differs, in order of size:** (1) column widths in a row: both hero columns are "not fixed" with
min widths 240 and 320, Bubble gives the text column about 610 px of 960 and NodeGX gives both the same share, so
the hero paragraph wraps earlier and the purple shape peeks out above the photo instead of to its left; Bubble's
distribution rule is not known yet (the next measurement: a two-column test page with known min/max widths);
(2) 12 `Link` findings: a Link to a URL becomes a Text with no destination (an External Link node is the row);
(3) `Shape` keeps its box but Bubble's shape "type" (ellipse, triangle) is not read. The nav items' pitch, the
section max width (960) and the header height (80) measured the same as Bubble's.

## 10. s5b (2026-10-17) — backend workflows → cloud functions, from the editor's `c5r6j` request

Richard: *"I found the network request in browser devtools that calls the backend workflows when you open a bubble
project editor. It's consistently called c5r6j"* — `GET https://bubble.io/appeditor/load_single_path/<app>/<version>/<hash>/c5r6j`,
answering `{ last_change, data }` with one entry per backend workflow, abbreviated like the run-mode bundles. He added
every kind of backend workflow to the template app (`test112-14324`), one of every built-in action into
*someThingIsModified*, and then filled every field with nonsense so each key shows
(`backend-workflows/example-c5r6j.json`, `example-c5r6j filled.json`).

**Why this request matters: the run-mode bundles never carry backend workflows.** Measured: the template's
`index.dynamic.js` and `static.js` refetched after he added the five are byte-identical to s4's (252,017 and 335,287
bytes). The editor's `c5r6j` is the only source short of the paid export. It needs the person signed in to the Bubble
editor: DevTools → Network → filter `c5r6j` → Response → save it as `<anything>c5r6j<anything>.json` beside the
`*.dynamic.js` files, and `bubble-run-bundle-to-export.mjs` puts it under `api` (the paid export's own key is
unmeasured; the converter reads `api` or `backend_workflows`).

| Bubble | NodeGX | measured on |
|---|---|---|
| API workflow (`APIEvent`: `wf_name`, `parameters[{%k, %v type, is_list, optional}]`, `auth_unecessary`, `expose`) | `/#__cloud__/<wf_name>`: a Request with each parameter (`ptype-` from the type, `array` for a list; `preq-` from *optional*; Allow Unauthenticated from *can run without authentication*), the steps from Received, a Response at the end. `call` proposed `public`/`authenticated` | someApiWorkflow |
| "Only when" on a backend workflow, with *return 200 if condition not met* | a Condition after Received; its false branch answers (a 200, or a failure when the box is off) | recurringEvent1 |
| database trigger (`DatabaseTriggerEvent`, `data_trigger_type`) | `/#__cloud__/<name>` with Request params `record, action, collection, id` (the db-change payload) + a **db-change trigger** on that collection (`user` → `_User`), create/update/delete, in `backend/triggers.bubble.json` | someThingIsModified |
| recurring event (`RecurringEvent`, `custom_event_data_type`) | `/#__cloud__/<name>` with a `thing` param + a **schedule trigger written disabled** (daily midnight): Bubble's frequency is chosen per thing where it is scheduled, NodeGX's cron is per function — a person chooses | recurringEvent1 |
| backend custom event (`CustomEvent`: `parameters[{param_name, btype_id}]`, `return_types[{%d}]`) | `/#__cloud__/shared/<name>`: Component Inputs (`run` + each parameter), Component Outputs (`done` + each return value); *Trigger a custom event* is an instance of it, its `arguments[{param_id, arg_value}]` wired by the parameter's name | someCustomEvent |
| `APIEventParameter` / `CurrentWorkflowItem` (a custom event's parameter) / `CurrentDataItem` ("This thing now") | the Request's `pm-<name>` / the Component Inputs port / the Request's `pm-record` (or `pm-thing`) | all three |
| `OldDataItem` ("Thing before change") | **no counterpart**: NodeGX's db-change `ChangeEvent.record` is the record after the write; read as empty, a finding each time | someThingIsModified |
| Current User in a backend workflow | the Request's User Id (its fields need a query; a finding) | someThingIsModified |
| `action_disabled: true` (*Disable this step*) | skipped, the next step wires to the previous (was converted as live: P123-S5B-DISABLEDSTEP) | someApiWorkflow's Log In |
| a step that can fail | its Failure → one "A step failed" Response, so the caller is answered (the kit's `failure-reaches-nothing` named all 10) | all |
| *Return data from API* (`parameters_actions[{%k, %v type, %c1 value, list}]`) / *Terminate this workflow* | a Response carrying each key / a Response; the chain stops there | someThingIsModified |
| Sign up / Create an account for someone else (`%em`, `%pw`, `%cs` fields, `return_user_if_already_exists`) | Create User (`username` = `email`, `properties` + `prop-<field>`); Unchanged continues when *return the user if it exists* is ticked, else answers a failure | both |
| Make changes to current user / Update credentials / Change the email for another user | Update User (the caller's User Id, or the `user` expression) with `properties` + `prop-<field>`, `password` | all three |
| Send email (`to`, `%su`, `%b3`) / Send password reset / Send confirmation email | Send Email (to, subject, text) / Send Email with the `passwordReset` / `verifyEmail` template; cc, bcc, reply-to, sender name, attachments are findings | all three |
| Schedule API workflow **on a page** | a Cloud Function call (`CloudFunction2`, `function` = the target's `wf_name`); a date other than *Current date/time* is a finding | — (the template's pages schedule none) |
| Log in / Log out / Log out other sessions / Check password / Assign a temp password / Send magic link / Send ICS email / lists of things (change, delete, copy) / Set slug / Upload CSV / Delete uploaded file / Schedule API workflow **from a backend workflow** | a labelled placeholder that keeps the chain, and one finding each naming the NodeGX way | someThingIsModified |

**Measured** on the template plus each example: 4 backend workflows → 4 cloud components, 2 triggers proposed, 0
crashes; `validate_project` **0 errors**, 331 nodes checked (265 without the backend part); the only cloud warning
left is `public-write-door-unlimited` on *someThingIsModified*, which is the real point: a function a trigger runs
must accept a call with no session (the dispatcher sends none — `dispatcher.ts` `runner.run(name, { body, headers: {} })`),
so it is also a public door until `nodegx.security.json` says `"call": "nobody"` for it. `triggers.bubble.json`
proposes exactly that; unmeasured is that a trigger's run skips the call rule (`runner.run` does not consult it; the
`/functions/:name` route does). The page side is byte-identical to s4's output apart from timestamps and the two new
report rows.

**Not done, in order:** (1) the converter's own gate — it now has three fixtures in the repo
(`backend-workflows/*.json`) and could assert 0 errors, 4 cloud components, no Log In in someApiWorkflow, and
`rootNodeId` (P123-S5-NOHOME); (2) applying `triggers.bubble.json` to a bound backend and firing *someThingIsModified*
by editing a User (the trigger has never run); (3) the parameters a *Schedule API workflow* sends — the filled example
schedules one with none, so the key is unknown; (4) a NodeGX "record before the change" on the db-change payload, if
Bubble apps lean on *Thing before change* (most database triggers compare before and now).

## 11. s5c (2026-10-17) — option sets, from the editor's `dxr78ubfdtfq6tbmec` request

Richard saved the Bubble editor's option-set request (`…/load_single_path/<app>/<version>/<hash>/dxr78ubfdtfq6tbmec`,
`{ last_change, data }`) after making three sets in the template app: one with no values, one with a text attribute,
and one with an attribute of every type (`option-sets/example-dxr78ubfdtfq6tbmec.json`). Saved beside the
`*.dynamic.js` files as `<anything>dxr78ubfdtfq6tbmec<anything>.json`, `bubble-run-bundle-to-export.mjs` puts its
sets into `option_sets`, replacing a bundle's set of the same key (the bundles carry option sets too, TrybeUP's 45
with their attribute values; the editor's copy is the one the person is editing). The suffix looks like the editor's
encoding of the path, so it should be the same in every app (`c5r6j` is `api`); unmeasured on a second app.

| Bubble | NodeGX | measured on |
|---|---|---|
| an option set (`%d` name, `values`, `attributes{key: {%d, %v type}}`) | `/Option sets/<name>`: one Static Data node (JSON rows) → Component Outputs `items`, `count`; the attributes in `component.json` `metadata.optionSet.attributes` (`display` first, Open Bubble's types: text, number, yes / no, date; the Bubble type kept as `bubbleType`) | all three |
| a value (`%d`, `db_value`, `sort_factor`, one key per attribute) | a row `{ value: db_value, display, <attribute key>: … }` in sort order. **`value` is the db_value**, not the value's key: TrybeUP's expressions name a db_value that is not the key in 131 of 291 references, which the converter used to miss (those 104 expressions now read the row, e.g. `support's phone` = `1.888.202.9986` where it read `"support"?.phone`) | someOptionSet2, TrybeUP |
| attribute types | date (epoch ms) → ISO string; image, file (`//…cdn.bubble.io/…`) → `https:` URL; a list (`list.option.x`, stored `{"0": …, "1": …}`) → an array of db_values; geographic address → the object as stored; date interval → the number as stored | someOptionSet2 |
| `deleted: true` on a set, a value or an attribute | skipped (TrybeUP: 5 of 45 sets); an *All options of* a deleted set is a finding | TrybeUP |
| a reference to one option (`OneOptionValue`, `option_value`) | that row as a JSON literal, found by db_value then by key | TrybeUP |

**Measured:** the template + the example: 3 option-set components, `validate_project` 0 errors (271 nodes). TrybeUP
before and after: the only graph changes are those 104 Expression texts; 40 option-set components (5 deleted ones gone).

**Open:** the example's date attribute holds `60000` (1 January 1970, 00:01) — whether Bubble stores an option
set's date as epoch ms like a thing's date is assumed from the type, not measured with a date Richard chose; a date
interval's unit is unknown (the example holds `1`). A field of a data type whose type is an option set is still a
plain String column holding the db_value (`database-schema/` is the next request, still empty).

## 12. s5c — data types: the schema, from the bundle or the editor's `entpawjzehwq0tbk` request

Richard saved the editor's data-type request (`…/load_single_path/…/entpawjzehwq0tbk`,
`database-schema/example-entpawjzehwq0tbk.json`) and a fresh run-mode bundle of a template with a field of every type
(`exports/template/dynamic-with-schema.js`, gitignored with the other bundles). **The bundle already carries the
whole schema** under `user_types` (`%f3` fields: `%d` name, `%v` type, `default_val`), byte-for-byte the same
collections as the editor file once converted; the editor file adds only the deleted type (`zezd`, `%del: true`).
So the editor request is optional; the bundler takes it like the other two (`entpawjzehwq0tbk` → `user_types`).

| Bubble field type | NodeGX column (`metadata.dbCollections[].columns`, the backend import's shape) |
|---|---|
| text, number, yes/no, date | String, Number, Boolean, Date |
| image, file | String (the URL, `https:` added to Bubble's `//cdn` links) |
| geographic address | Object (as stored: lat, lng, address, placeId, components) |
| number range, date range | Object (stored shape unmeasured: the example has no value) |
| date interval | Number (unit unmeasured) |
| an option set (`option.x`) | String holding the option's db_value (see §11) |
| a thing (`custom.x`) / a User (`user`) | Pointer with `targetClass` (`_User` for a User) |
| a list of anything (`list.…`) | Array |
| `default_val` | `defaultValue`, cleaned by type (a date `-3600000` = 1 Jan 1970 00:00 Paris time: dates are epoch ms) |
| a deleted type or field (`%del`) | skipped (TrybeUP: 46 of 386 fields) |
| the User type | the built-in `_User` collection; **every collection name** a Record node writes for a User is now `_User` (TrybeUP: 74 nodes said `User`, a class that does not exist); labels still say "User" |
| hidden built-ins Created Date, Modified Date, Created By | not declared; reads compile to `createdAt`, `updatedAt`, `createdBy` (nothing fills `createdBy` yet) |
| `privacy_role` | not converted (a finding per type, as before) |

**Measured:** the new template, bundle alone / bundle + both editor files / schema file alone: the same 3 collections
(`_User`, someDataType, someOtherDataType with 14 columns, 8 defaults, 1 Pointer); `validate_project` 0 errors.
TrybeUP against §11's output: only the 74 `collectionName`s change; 40 collections, 340 columns, 68 Pointers.

## 13. s5c — the data: Bubble's Data tab exports → the backend's import files

Richard exported the template's three tables from Bubble's Data tab as JSON (`database-export/`, one sample row each,
plus three empty rows of someOtherDataType; some fields can only be filled by a workflow, so they are empty).
`bubble-data-to-nodegx.mjs <export.json> <data folder> <project> [--tz <zone>]` reads them against the app's types
and writes `<project>/backend/data/<collection>.json` in the backend's own collection format (`nodegx-collection` v1:
`schema.columns` + `records`), with `IMPORT-DATA.md` listing the `nodegx-backend import` commands and every value it
could not read. File → type by Bubble's name for it (`export_All-<Type>s_<date>`); CSV or JSON.

What the export looks like, measured: keys are field **display names**; the built-ins are `Creation Date`,
`Modified Date` (→ `createdAt`/`updatedAt`, which the import keeps verbatim), `Slug` (kept as a String column),
`Creator` (`(App admin)` for a thing made in the editor; a unique id → `createdBy`). Booleans are `yes`/empty; a date
is text in the exporting browser's zone **to the minute** (`Oct 17, 2026 3:05 pm` = 13:05Z in Paris; `Jan 1, 1970 1:01
am` = 60000 ms, the epoch-ms reading of §11–12 again); a date interval is text (`0 seconds` → ms); a range is a JSON
pair (`["",""]` = empty); a link is the thing's unique id (`1792241441972x125425336514852770`), a list of them is
assumed joined by `, `; an option is its display (looked up to its db_value). Users: `email` → `email` and
`username` (the converter's sign-up uses the email as username); no password is ever exported.

🔴 **The JSON export carries no unique id of the row itself.** someOtherDataType's link names someDataType's row by
id, but someDataType's export does not say which row has it. Imported, every row gets a new `objectId` and every link
dangles (the report says so per table). Measured on the built backend CLI (`packages/nodegx-backend`, fresh
`--data-dir`): all three files import (6 created, 0 rejected, types and the `targetClass` Pointer as declared); with
a `unique id` key added to the row, the backend keeps `1792241441972x125425336514852770` as the `objectId` and a
second import updates instead of duplicating, so links survive **if the export has the ids**. The ask: an export
with the unique id column (CSV may carry it; unmeasured).

Unmeasured: a filled list (its separator), a filled geographic address or range (their text form), a Creator that
is a user, and whether an imported `_User` row can be signed in to after a password reset.

**Later the same session.** The CSV export has no unique id either (same columns; converts to byte-identical
records). The Data API, enabled on `test111-40009` with every type ticked and the tables made public, answers
**401 "This application does not expose an API. Please upgrade your Bubble subscription"** on `version-test` and
live, with a key, with a fresh key, with `api_token=` and with none: the free plan's "test for free" is configuring
only. Workaround documented in bubbleExporter's `docs/GETTING-YOUR-APP.md`: a `bubbleId` text field filled by
*Make changes to a list of things* = *This thing's unique id* before the export (unmeasured on Bubble; the script and
the converter honour it). `test111-40009_jwk.pem` is the app's public JWT key, of no use for reading data.

**Ids recovered (Richard's hint).** A Bubble id is `<creation time in ms>x<random>`: `1792241441972` = 12:50:41.972Z,
and someDataType's export says *Oct 17, 2026 2:50 pm* (Paris). `bubble-data-to-nodegx.mjs` now gives every id another
table links to (and every Creator) to the one row of that type created in that minute, restoring `createdAt` to the
millisecond. Measured: 1 recovered on the samples; imported into a fresh backend, someOtherDataType's Pointer resolves
to someDataType's row. Control: `--tz UTC` recovers 0 and the report names `--tz`. Two rows of a type in one minute
are reported, not guessed; the `bubbleId` field covers them.

**The ids, for real (Richard's method).** The Data tab exports what its VIEW shows; a new view with *Select all*
fields carries `unique id` (and every field, filled: `export_ids_*.json`). Such a file is named after the view, so
the script now types a file by its columns. Learned from it: a link to a User exports as the user's **email**
(`someUserList: "user1@user.com"`) and is resolved to the user's id; a geographic address exports as its text only
(no lat/lng); an empty number range is `[]`, an empty date range `["",""]`; the Users view adds an empty `null`
column. Measured: imported into a fresh backend, the single link, the list link and the user list all resolve, and
all six records keep Bubble's ids (creation times exact from the id).

## 14. s6 (2026-10-17, evening) — who may read, who may write: `nodegx.security.json` from the privacy rules and the app's own writes

Richard's first "next task" after *what's left for a full export?*. The converter now writes `nodegx.security.json`
beside the project file — the shape `packages/nodegx-backend/src/security/model.ts` validates (SB-015: provisioning
applies it to a fresh backend) — and the report gained a **Security** section: the rule table, every privacy rule it
read and what it became, and every step that creates, changes or deletes a thing, with the condition it ran under.
The backend's own `validateSecurityConfig` accepts the file on every corpus (the editor fixtures, the template, TrybeUP,
the 2023 paid export); `validate_project` stays at 0 errors.

### Reads: Bubble's privacy rules

A privacy rule is `{ display, condition, permissions }` per type (`user_types.<t>.privacy_role`, in the run bundle
and in the editor's `entpawjzehwq0tbk` request alike; the bundle's keys are expanded by the bundler). Its condition
becomes one NodeGX rule atom, or none:

| Bubble condition | NodeGX rule |
|---|---|
| none (`everyone`) | `public` |
| *Current User is logged in* | `authenticated` |
| *Current User is logged out* | `public` (no "strangers only" rule; said in a finding) |
| *Current User's \<field\> …* (a role, a flag) | `authenticated` + a finding: make it `role:<name>` if the field names one |
| *This User is Current User* | the own row — `_User` has a fixed posture, see below |
| *This thing's Creator is Current User* | `creatorOwns` (only when no wider read grants the type; else a finding) |
| *This thing's \<user field\> is Current User* | `{ path: { hops: [{ from: <coll>, by: <field> }], maxDepth: 1 } }` (ONT-004) |
| *This thing's \<X\> is Current User's \<X\>* | `{ path }` with two hops: follow the user's link, then back by the field |
| *This thing's \<list of users\> contains Current User* | none (a list field cannot be read back; a finding) |
| `and_` | the stricter side; a side no rule says is dropped and said |
| `or_` | the wider side |
| anything else | none: the rule's grants are **not** written (fail closed) and a finding names them |

Permissions: `search_for` → `find`; `view_all` / `view_fields` / `auto_binding` → `get`; `view_fields` without
`view_all` → `fields: { <column>: { read } }` for every column the rule leaves out (ONT-012; `createdAt` / `updatedAt`
cannot be hidden and are skipped); `view_attachments` → `files.read` (global in NodeGX: the OR over every type);
`auto_binding` → an `update` grant plus a finding that an update rule covers every field, not `binding_fields`;
`create_api` / `modify_api` / `delete_api` (Bubble's Data API door) and `non_filterable_fields` → findings only. A type
with no rules reads `public`, as it did in Bubble; an app with none anywhere gets one finding, not one per type.

**`_User` is fixed.** The backend refuses a `_`-collection entry and reads `_User` as `nobody` on the data routes
(`model.ts` `effectiveRule`): a signed-in user reads and changes their own row through the User nodes. So Bubble's
User rules are listed and explained, not written, and the report counts the steps that change *another* user
(TrybeUP: 0 of 52; a cloud function running as `system`, or a Profile collection, is the way).

### Writes: the app's own steps

Bubble's privacy rules never guard a page workflow's *Create / Make changes / Delete* — those ran on Bubble's server
behind the workflow's own *Only when*. A converted Record node writes from the browser behind the collection's
`create` / `update` / `delete` rule, so the converter derives each rule from **every page write it read**
(`noteWrite`, in the NewThing / MakeChanges / ChangeThing / DeleteThing / …ListOfThings cases): the workflow's
condition AND the step's, classified as above, the stricter of the two; a condition no rule says is `authenticated`
when it reads the current user (a stranger has no fields) and `public` otherwise (anyone the page lets through could
run it). The op's rule is the **widest** floor over its writes; no write → `nobody`; every write creator-only →
`authenticated` with a finding (P123-S6-CREATOREDITS: there is no "only the creator" atom, and `creatorOwns` would hide
the row from every other reader). A backend workflow that writes gets `runAs: "system"` — Bubble's shape kept (the
server writes, behind the function's own condition) — and its reads then skip the collection rules, as Bubble's
*ignore privacy rules* does; a shared custom event that writes is a finding naming the function that must run as
system. `signup` is `public` when any Sign up step exists, `files.upload` `authenticated` when an uploader element does,
`devOpen` false, the defaults `nobody`.

### The type of the thing a step changes (P123-S6-THINGTYPE, fixed)

The census needs the collection each step writes, and most *Make changes* steps carry no `thing_type`: the thing is
an expression. The converter read `thing_to_change.next.type`, which is the next operator's node kind (`Message`),
never a data type. `thingTypeOf` now infers it (the row's type for *Parent group's item*, the nearest typed ancestor
Group's, a reusable's *Type of content*, the record *Result of step N* wrote, an element's `group_type` or data
source, the workflow's thing, a parameter's declared type, a Search's type, a field read's type from the schema or from
the key it spells). TrybeUP: 111 of 216 writes went to `Message` / `thing`; now 4 (an element not in the export).

### Measured

| corpus | privacy rules read | rules written | writes read |
|---|---|---|---|
| the editor fixtures (`database-schema/example-privacy-rule-entpawjzehwq0tbk.json` + backend workflows + option sets) | User: everyone, somePrivacyRule (logged in), User's own data (self); someDataType / someOtherDataType: everyone + New rule (logged in) | both custom types `find` / `get` public, writes `nobody`; `someApiWorkflow` call authenticated + runAs system, the trigger's and recurring functions call `nobody` (the trigger's runs as system: it writes); signup public | 5, all in backend workflows (4 to a deleted type, listed) |
| Richard's template (`exports/template/dynamic-with-schema.js`) | User: everyone (nothing), User's own data | 2 collections public; `files.read` authenticated | none |
| TrybeUP, live, 17 pages (bundles in the scratchpad only) | none on 40 types | 39 collections `find` / `get` public; 13 with page writes — `File` create/delete, `Booking` and `Listing` create/update/delete, `claims`, `Refund Request`, `Payment`, `Reviews`, `Delivery`, `Conversation` …; every floor `public` but `Conversation.create` (`authenticated`: both its writes run behind *Current User is logged in*) | 216 (52 change the current user) |
| the 2023 paid export (v6, `bubbleExporter/examples/paid-export`) | User's own data | `Message` create public | 1 |

The template bundle lesson: `dynamic-with-schema.js` was never read by the bundler, which takes `*dynamic.js` only —
s5c's §12 measurement of it was by hand. Rename a saved bundle to `<page>.dynamic.js`.

### The gate — `check.mjs` (PASS 32/32)

`node check.mjs` from `import/`: the editor fixtures through bundler and converter (P123-S5-NOHOME, P123-S5B-DISABLEDSTEP,
§10's four cloud components and two triggers, §12's three collections, every s6 rule above, `validateSecurityConfig`,
`validate_project` 0 errors), a synthetic page for P123-S6-THINGTYPE, and the template when `exports/template/` holds a
bundle (188/188 elements, the Google Fonts link, 0 errors). The backend validator needs `packages/nodegx-backend/dist`
and `validate_project` needs `packages/noodl-mcp/dist`; each is skipped by name when unbuilt.

### Not done

Richard's own tests of the rules on a bound backend (provision the converted template with its
`nodegx.security.json`, sign in, read and write as a stranger and as a user); the ruling on P123-S6-CREATOREDITS; a
Profile collection for apps that show users to users; `This thing's <list of users> contains Current User`;
`role:` atoms from a Bubble role field (a person names the field); the 4 TrybeUP steps that read an element not in the
export; and firing the db-change trigger with the function running as system (§10 "Not done" 2).
