# Phase 123 — Open Bubble

**Scoped and built:** 2026-10-16 (s1, Fable), from one message of Richard's: *"What if we made an 'Open Bubble' clone of
Bubble, the nocode builder … Let's just take a run at it."* **This is a prototype phase in the shape Phase 118 set:
four files and a handoff, no task files, no gate suite beyond its own `check.mjs`, no defect rows until it takes a
lane.** It is a lane-2 artefact (P112, *your own NodeGX*: an editor built from the kit), not a lane of its own; the
board lists it in §4 until Richard says otherwise.
**Status: 🟡 s1 — built and gated (`editor/check.mjs` **PASS 17/17** on a copy of `templates/todo-list` with an
ephemeral backend); driven by hand on a copy of Puppy test 3 (look/); waits for Richard's sitting (PLAYTEST.md).**
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

**What the kit did not give, and the editor had to invent** (input for OWN-007's brief): the official editor's own
dynamic ports — a Navigate's Router and Target Page, a record node's collection and its `prop-<column>` inputs, a
variable's name — are in no library and no spec; a node the official editor saved carries a snapshot in its
`dynamicports`, a node made elsewhere has nothing. `synthPorts()` in the page is the third copy of that knowledge.

## 4. Where it stops (known, by design or by this session's hour)

- **No expression composer.** Bubble's `Input Name's value :plus 1` is a wire plus a Function node here; the editor
  wires but does not compose.
- **No free-drag canvas.** Bubble's old absolute engine is not what this does; a Fixed container is `position:
  absolute` and moves by margins (BRIEF.md's first assumption).
- **One page at a time, and the page the app is on.** A page behind a login is edited after logging in through *Use
  the app*.
- **No privacy rules, no option sets, no styles tab, no plugins, no reusable-element editing** (a component is placed,
  not opened).
- **A step is appended, never inserted** between two steps; branches are read, not added.
- **The project file is written with `JSON.stringify(…, null, 2)`**, not the format's serializer (the bundle does not
  export it); the official editor reads it unchanged, the diff is whitespace at most.
- **The stale-write guard is the store's** (`ifRevision`) but the page holds the files in memory: an agent writing the
  folder meanwhile is not seen until the page reloads (OWN-017's lesson, half-applied).

## 5. Findings (rows, not tasks, until the phase takes a lane)

| id | what | state |
|---|---|---|
| P123-S1-EDITORPORTS | the editor-side dynamic ports (Navigate's target, a record's collection and `prop-*`) exist in no kit package; every home-made editor re-invents them | open; input for OWN-007 and OWN-012 |
| P123-S1-STALEBIND | "Puppy test 3"'s project file binds `localhost:8581`, which another backend now holds (port reuse across sessions); a foreign class answers `[]` with no error | open; a liveness check on open would say so ([[liveness-is-the-socket-never-the-file-a-token-outlives-its-process]]) |
| P123-S1-MALFORMED | "Puppy test 3" holds a node with no `type` in Admin Login; the preview refuses the whole project (`malformed-node`) | the copy was fixed; the real project is Richard's |

## 6. Rulings asked of Richard

| # | question | ruling |
|---|---|---|
| R1 | Responsive-engine drag (reorder / move into a container) or the old free-drag canvas? | — |
| R2 | Is "a value from…" (a wire picked from a list) the right first form of Bubble's dynamic data, or must the composer come first? | — |
| R3 | Does this take a lane-2 slot (as an OWN-008 stranger built by us), or stay a prototype until his sitting? | — |
