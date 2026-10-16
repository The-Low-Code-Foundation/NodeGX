# Phase 123 — Open Bubble

**Scoped and built:** 2026-10-16 (s1, Fable), from one message of Richard's: *"What if we made an 'Open Bubble' clone of
Bubble, the nocode builder … Let's just take a run at it."* **This is a prototype phase in the shape Phase 118 set:
four files and a handoff, no task files, no gate suite beyond its own `check.mjs`, no defect rows until it takes a
lane.** It is a lane-2 artefact (P112, *your own NodeGX*: an editor built from the kit), not a lane of its own; the
board lists it in §4 until Richard says otherwise.
**Status: 🟡 s1 — built and gated (`editor/check.mjs` **PASS 17/17** on a copy of `templates/todo-list` with an
ephemeral backend); driven by hand on a copy of Puppy test 3 (look/); waits for Richard's sitting (PLAYTEST.md).
s1b (the same day): Richard rebuilt the runtime, the preview bundle and Orbit's spec module and ran the gate: 8/10, the
Workflow tab empty — the spec module was stale (§3, P123-S1-SPECENTRY); fixed, gate 17/17 again on his bundles.**
**s2 (2026-10-16, the same day, Fable): Richard's second ask — six things from real Bubble and a design pass. All six
built and gated: `check.mjs` **PASS 37/37** (s1's 17 rows, their selectors updated, plus 20). Found and fixed one kit
defect on the way, P123-S2-VARIANTLOST (§5): the kit's preview exported every node without its variant, so no Look
was ever drawn outside the official editor. BRIEF.md §s2 has his words; LOOK.md §s2 the mapping and the pictures.**
**Prefix: `OBB`.**

> "In theory it should be easy given what we've already got, just separating the logic into the 'workflows' concept
> from Bubble, and having a visual element picker on the left of the preview. The most challenging part would be with
> Bubble you can drag and move and resize elements directly in the preview live. There's also the question of the
> database tab, but that should be easy too?" — Richard, 2026-10-16

## 1. What it is, in a paragraph

A NodeGX editor that looks like Bubble: **Design** (an element palette and the page's element tree on the left, the
real app in the middle, a property editor on the right; click an element to select it, drag it to reorder it or move
it into another container, pull a handle to resize it), **Workflow** (*When Submit inquiry button: Click → Step 1
Navigate, Step 2 Create Record*; a step's settings as fields; a value pulled from an input by a wire; add and delete a
step), **Data** (data types and their fields from the project file; the rows on the bound backend, with new entry,
inline edit and delete). It is 1,000 lines of one HTML page and a 120-line server, and it uses only what the kit gives
a home-made editor: the format's store for every edit (the same eight edits the editor suite grades), the real app in
the page through `@nodegx/preview` (with `elementsOf` to point from a node to what it draws), the runtime's node library
and `@nodegx/node-spec` for ports. It draws no element and runs no node. BRIEF.md has Richard's words and the
assumptions; LOOK.md the pictures and the Bubble → NodeGX mapping.

## 2. The five gates, as the board

| gate | what | file | state |
|---|---|---|---|
| 1 | the brief in the person's words | [BRIEF.md](BRIEF.md) | ✅ verbatim; five assumptions written for him to overturn |
| 2 | the route | BRIEF.md | ✅ a prototype phase; lane 2's shape (an editor from the kit) |
| 3 | a picture the person said yes to | [LOOK.md](LOOK.md) | 🟡 the built screens, four screenshots; Richard's words owed — this phase took the run first, as asked, so the picture is the build |
| 4 | the build held to the picture | LOOK.md §built; `editor/check.mjs` | ✅ 17/17 headless; §3 below |
| 5 | the person it is for uses it | [PLAYTEST.md](PLAYTEST.md) | ⬜ |

## 3. What was built (s1) and how it was measured

`editor/open-bubble.html` (the editor), `editor/serve.mjs` (the server: the deploy runtime, the preview bundle, the
project's files from disk, saves back under the project folder, a proxy to the bound backend), `editor/cdp.mjs` (a
small headless-Chrome driver, no dependency), `editor/check.mjs` (the gate). Nothing is installed: plain `node`.

| Bubble | here | measured by |
|---|---|---|
| click an element on the page | the deepest visual node whose element is under the pointer (`elementsOf` → element → node map); hover outline, selection box with a size tag | the gate: clicking "App name" shows it in the property editor |
| the property editor | the node's input ports from the runtime's library (static and conditional, the condition mini-language evaluated), the node's own dynamic ports, the spec's; grouped in the editor's own group order; text, number + unit, enum, colour (with the project's tokens as suggestions), boolean | typing in Text is in `nodes.json` on disk and the app shows it (gate) |
| resize | east, south and corner handles; live on the element, then written as `width` / `height` (the unit kept: 100% → 62.5%, px → px) and `sizeMode` only when it has to change | before 350 px, after 219 px, `{62.5, %}` on disk (gate) |
| drag to move | a drop line between the siblings of the container under the pointer, by its flex direction; drop = `add_child` (reparent + index); a `position: absolute` element moves by its margins | the card's children reorder on disk (gate); hero lead above hero title (look/) |
| the element palette | Group, Text, Button, Text Input, Image, Checkbox, Dropdown, Icon, Columns, and the project's own components; click one, click where it goes | a Button lands in the card on disk and in the app (gate) |
| Delete, undo | `remove_node` (the reference's cascade); 60 snapshots of the files | gate |
| events | every signal output of a visual node that has a wire, plus a logic node that fires unprompted; **+ New event** lists every element's signal outputs | the sign-in page lists Click ×2, On Enter, Did Mount (gate) |
| steps | the signal chain: the node a wire reaches, then its Done (or first wired signal output), and so on; other wired outputs as *on Failure →* branches; literal settings and wired values listed on the card | the Sign in click's chain is Log In → Condition → Navigate (gate) |
| a step's settings | the same field controls as Design; a value *from…* another node's output (`connect`), *unwire* (`disconnect`); wire-only ports (a record's id) shown as such | Create Record: pick Puppy → its six fields appear; name wired from Name input (drive on puppies) |
| add an action | a list of Bubble-named actions over NodeGX types (Go to page, Create a new record, Make changes…, Log the user in…), then every logic type; added at the end of the chain, wired from the step before | a Navigate on disk wired from the Log In (gate) |
| data types and fields | `metadata.dbCollections` in the project file (what the official editor reads, and R12 installs at backend start); `backend/schema.json` tables shown read-only | a new type and a new field on disk (gate) |
| app data | the bound backend's `/classes/:c` through the server (the runtime's `X-Parse-Application-Id`); new entry, inline edit (typed by the field's type), delete | a row created on the backend; a cell edit read back (gate; drive) |
| the page selector | the Router's start page first; the running app's own redirects followed and said (Admin → Admin Login without a login; Todo → Sign in) | gate |
| the issue checker | when the preview refuses the project, a banner over the page lists every error with its component and node; a node with no `type` gets *Delete that node* (`remove_node` through the store), and the app appears (s1c, after Richard opened the raw Puppy test 3 and saw a blank page with the reason cut off in the status line) | the raw copy: banner → one click → "App on screen", the node gone from disk |
| placing while "Use the app" is on | picking an element in the palette turns *Use the app* off, so the placing click reaches the editor (s1c: his click "did nothing") | the raw copy drive |

**Where a Navigate's Target Page and a record's Class and columns come from** (corrected s1b, after Richard's run):
the runtime's library never lists them, and s1 first believed no kit package had them and wrote `synthPorts()` as a
third copy. Wrong: since P107 NSP-020 the spec package draws them — `drawnPorts(spec, params, context)` over a
`PortContext` that `@nodegx/project-contract/port-context` builds from the files with no viewer (`portProjectFromStore`,
`portContextFor`: the routers and their pages, the backends, the schema's classes and columns, each component's
interface). The editor now reads those first; `synthPorts()` stays only for what the spec does not draw yet (a
Navigate's `router`, a variable's `name`). What hid it: Orbit's `prototype/real/specs-entry.ts` called a spec's
derived ports with params alone, which the (params, context) signature of 2026-10-11 breaks on every record node
("Cannot read properties of undefined (reading 'backends')"); s1's gate passed on a `specs.js` built before that
change, and Richard's rebuild on 2026-10-16 exposed it (gate 8/10, the Workflow tab empty). Fixed in that entry
(a context argument, `drawnPorts` and the context builder re-exported) and in the page (a spec that throws is one
node's missing ports, never a dead tab).

### 3b. What s2 built, and how it was measured (`check.mjs`, rows 10–37)

| Bubble | here | measured by |
|---|---|---|
| the red distance lines on hover, padding / margin | the live element's `getComputedStyle` and its rect against its parent's content box: four red lines with px values for the selected element, green padding and orange margin bands on hover (the inspector's colours) | the gate reads the four numbers off the overlay and computes the same from the frame's own geometry: equal |
| custom states on an element (type, name, default, list) | a `Variable2` node named `<element>.<state>` with `metadata.customState = { of, name, type, list }`; its default is the Variable's `value` parameter; a state row in the tree; deleted with its element | *New state* on the card writes that node on disk; its default is the parameter |
| the expression composer: chips, pure JS, or both | one `Expression` node per composed field (`metadata.composedFor = { node, port }`): its text is JavaScript, each chip a free name wired from the value it stands for (`expressionPorts` from the spec package says which names are ports), `result` wired into the field; three views over the same text — Composer (chips, operators, literals), Both (chips as islands in editable text), JavaScript (the text); operators as buttons (is, is not, and, or, + − × ÷ > <, not, contains, ? :) | the title's Text composed as *[Sign-in card's state] + " world"*: the chip is a wire from the state's value into the Expression's input of that name, the result into the Text; the JS view shows the same text; **the app shows "Hello world"** (the state's default through the expression) |
| **a branch** (FlutterFlow's conditional step) | *Add a branch* appends a `Condition` (`eval` triggered by the step before); its `ontrue` and `onfalse` are two chains drawn as Yes and No columns that never rejoin, each with its own *Add an action* / *Add a branch*; the condition is any value or a composed expression; deleting the branch deletes both chains and their expressions | a branch on the card's Did Mount is a Condition wired into `eval`; an action in the No column is a Navigate wired from `onfalse` while Yes stays empty; *Set a custom state* in Yes is a `Set Variable` from `ontrue` with `name` the state's; the condition `1 > 2` is an Expression wired into `condition`, read back on the card |
| option sets | a logic component `Option sets/<Name>`: one `Static Data` node (`type: json`) wired to `Component Outputs` (All options, Count), the attributes in `component.json` `metadata.optionSet`; the Data tab's *Option sets* sub-tab edits attributes and options as a table; a page reads it as *Name · all options* in the sources (an instance placed once per page, `items` wired) | *Priorities* with an attribute *rank* and options High, Low: the component is on disk and in the registry, the Static Data's JSON holds both rows, the app validates with it |
| global styles | the format's `variants` in `nodegx.styles.json` (`{ name, typename, parameters }`), worn by a node's `variant`; *Save as a style* on an element writes one from its non-content parameters and clears them on the element (a node's own value wins over its variant's, so a styled element has no overrides, as in Bubble); the Styles tab lists variants by element type, shows the properties as chips, the elements wearing it, and edits the variant's parameters with the same fields | *Primary* saved from the Sign in button: the variant on disk with 10 properties, the button keeps its colour (`rgb(138, 169, 242)`); picked on Create account: its `variant` on disk, its background goes from transparent to the same colour |
| the chrome | Inter, an icon rail (Design / Workflow / Data / Styles, undo at the foot), a breadcrumb header with a width segment and a *Use the app* switch, panels with hairlines, popovers with a search box and grouped headings, chips for every dynamic value (blue element, cyan state, yellow option set, purple expression), a status dot | the four screenshots in LOOK.md §s2 built |

## 4. Where it stops (known, by design or by this session's hour)

- **The composer has no `:filtered` / `:sorted` operators**; a list operation is JavaScript in the JS view (`items.filter(...)`).
  A custom state marked *list* is stored but the composer does not index into it yet.
- **No free-drag canvas.** Bubble's old absolute engine is not what this does; a Fixed container is `position:
  absolute` and moves by margins (BRIEF.md's first assumption).
- **One page at a time, and the page the app is on.** A page behind a login is edited after logging in through *Use
  the app*.
- **No privacy rules, no plugins, no reusable-element editing** (a component is placed, not opened); a style has no
  *Set as default* (NodeGX has no default variant) and no Mobile / Web split; an element has no Conditional tab (NodeGX
  state parameters would be it; a ruling first).
- **A step is appended, never inserted** between two steps. A branch is added and read; a chain never rejoins after one.
- **The project file is written with `JSON.stringify(…, null, 2)`**, not the format's serializer (the bundle does not
  export it); the official editor reads it unchanged, the diff is whitespace at most.
- **The stale-write guard is the store's** (`ifRevision`) but the page holds the files in memory: an agent writing the
  folder meanwhile is not seen until the page reloads (OWN-017's lesson, half-applied).

## 5. Findings (rows, not tasks, until the phase takes a lane)

| id | what | state |
|---|---|---|
| P123-S1-SPECENTRY | Orbit's `prototype/real/specs-entry.ts` (P112) drew derived ports with no context; after NSP-020's (params, context) signature every record node's spec threw, so the Workflow tab listed nothing on a fresh `specs.js` | fixed s1b in that file (a context argument; `drawnPorts`, `portProjectFromStore`, `portContextFor` re-exported); `orbit.html` still calls the one-argument form, which now gets an empty context |
| P123-S1-BRIEFCONTEXT | the kit's brief (`nodegx-your-own-editor` skill) says "visual nodes have no spec" and names `specFor` only; it never mentions `drawnPorts` or `port-context`, so a home-made editor re-invents the editor-side ports, as s1 did | open; input for OWN-007 |
| P123-S1-STALEBIND | "Puppy test 3"'s project file binds `localhost:8581`, which another backend now holds (port reuse across sessions); a foreign class answers `[]` with no error | open; a liveness check on open would say so ([[liveness-is-the-socket-never-the-file-a-token-outlives-its-process]]) |
| P123-S2-VARIANTLOST | the kit's in-page preview and the headless render exported every node with `variant: undefined`: `exportNode` read it through `NodeLibrary.findVariant`, which asks registered modules, and only `ProjectModel.instance` is one; 18 projects on this machine wear a variant and none was ever drawn outside the official editor | **fixed** (the exporter falls back to the node's own `variantName`); `dev-docs/bugs/p123-s2-variantlost-…`; regression `packages/noodl-preview/tests/p123-s2-variant-exported.test.ts` |
| P123-S2-STALEMENU | this editor's own: a popover's outside-click listener outlived the popover and closed whatever opened after it (the composer vanished on its first click) | fixed in the page (`dismissOnOutside` checks `isConnected`); found by the gate |
| P123-S2-VARIANTWINS | a node's own parameter wins over its variant's, so "wear a style" must clear the element's values for what the style sets; the official editor leaves them, which is why a Look applied there can look like nothing happened | the page clears them; a note for the official editor's variant picker (P81 territory) |
| P123-S1-MALFORMED | "Puppy test 3" holds a node with no `type` in Admin Login; the preview refuses the whole project (`malformed-node`) | the copy was fixed; the real project is Richard's |

## 6. Rulings asked of Richard

| # | question | ruling |
|---|---|---|
| R1 | Responsive-engine drag (reorder / move into a container) or the old free-drag canvas? | — |
| R2 | Is "a value from…" (a wire picked from a list) the right first form of Bubble's dynamic data, or must the composer come first? | — |
| R3 | Does this take a lane-2 slot (as an OWN-008 stranger built by us), or stay a prototype until his sitting? | — |
| R4 | A branch never rejoins (FlutterFlow's shape). Is a rejoin wanted (both chains into one next step), or is Bubble's "Only when" per step wanted beside it? | — |
| R5 | A custom state is a page Variable with the element's name in it. Should it live inside a reusable component's own graph when the element is one (so every instance has its own)? | — |
| R6 | An option set is a component with a Static Data node. Is the Data tab the right home, or should it sit with Styles as app-wide data? | — |

## 7. s3 (2026-10-16, the same day) — a Bubble export becomes a NodeGX project

Richard's third message: can the JSON export a paid Bubble app can download be turned, 90% programmatically, into a
NodeGX project, so a Bubble user leaves Bubble without leaving its editor? **[import/IMPORT.md](import/IMPORT.md)** is
the answer: a 500-line converter (`import/bubble2nodegx.mjs`, no dependencies) over his 2023 test export
(`digital-bricks/bubbleExporter`, private) converts 22/22 elements, 3/3 actions, 7/7 expressions, 32/40 styles and
2/2 data types; the project validates with 0 errors, renders with 0 runtime errors, and **opens in this editor** —
tree, property editor, *When Button A: Click → Create Record*, both data types, 32 styles, the button in Bubble's own
primary blue through Bubble's own token names (`look/import-*.png`). The dictionary (§3 there) is the deliverable;
§4 says why 90% is the right expectation and where the AI 10% is; §5 is the ask: two or three real exports, because the
test app never used *Do a search for*, option sets, reusables, custom states, backend workflows or plugins.
Found on the way: the `nodegx` MCP's `render_report` still drops every variant (its `dist/` predates the s2 exporter
fix: rebuild `noodl-mcp`); `net.noodl.user.ResetPassword` is retired with no replacement, which a Bubble reset page
needs; and the kit has no DateInput, FileInput, Slider, Video, Map, HTML or PictureInput element for Bubble's defaults.

**s3b (the same evening):** Richard's `static.js` from his six-year TrybeUP app was not the tree but led to it: a
Bubble page in run mode loads `dynamic.js`, which carries the whole app definition and that page's elements and
workflows in abbreviated keys — no paid plan needed. `import/bubble-run-bundle-to-export.mjs` expands them; the
converter then took the live TrybeUP (18 of 22 pages fetched, 3,941 elements, 637 workflows, 1,285 actions, 4,871
expressions, 33 reusables, 45 option sets, 235 searches, 40 data types) to a project that validates with **0 errors**
over 11,556 nodes and **opens in this editor** (`look/import-trybeup-*.png`; IMPORT.md §7 has the numbers, the rows
the real app added, and what the report still lists). Two kit facts it cost: a hidden element is `mounted: false`
(`visible` keeps the space), and "Do when condition is true" must be edge-triggered through `Value Changed` or it
loops and freezes the page. One editor finding: opening a step's settings on a 3,100-node page hangs for minutes
(P123-S3-STEPSETTINGS). `static.js` and bundles are gitignored: they carry keys.

**s4 (the same evening):** the converted TrybeUP measured in a headless browser was not flickering but pegged
(~1,550 console errors/s: converter rows and 89 backend-less queries; IMPORT.md §8); Richard held it and made a
boilerplate Bubble landing page instead, to be matched section by section before any data. That page now converts
188/188 with 0 errors and renders the same as his five screenshots (`look/import-template-nodegx.png`): eleven
dictionary rows, the biggest being Google Fonts and Material Icons linked through `settings.headCode`, Bubble's
"Align to parent" layout, and a boxed Text (IMPORT.md §9). Left: Bubble's row width-distribution rule, Links to a URL.
