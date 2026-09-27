# TPL-006 — The story engine

**Opened 2026-09-11**, at Richard's request, after TPL-005 shipped:

> *"Can you think of another cool template or demo app we could build with our fancy new MCP and
> components and react nodes and whatnot that would blow the pants off people? Like you can build
> anything with Claude Code today, fine, but can you go in and edit it afterwards? I love how with
> the dungeon game you made that you can edit the static JSON file to create new levels. that's the
> ultimate 'ok Claude built you the foundation, now you can scale it up for free' type message"*

**Status: 🟢 BUILT, GATED, DRIVEN AND — 2026-09-12 — PUBLISHED.**
**LIVE: <https://nodegx.io/templates/story-engine/>**, driven against the public URL at 16/16. `templates/story-engine/` — 9 components, 88
nodes, 84 connections, **zero `noodl_modules`**, no backend, 0 validator errors, 62/62 on its gate,
and driven in a real browser with 0 console errors. **AC1–AC6 green. AC7's build half is green too
as of 09-12 (§9) — the shipped deploy carries every wire and the deployed folder plays; what is left
of it is the hosting, which is Richard's. AC8 is with Richard.**

🔴 **The drive found the template's own headline defect in the product, not in the template**: a
`States` node with `useTransitions` on — the DEFAULT — never publishes a colour. Filed as **D49**,
which **replaces D43**. See §6.

Roster **#7, Interactive Fiction** — *"A branching story: passages, choices, and the state the
reader carries between them."* Chosen from four pitches (story engine, a Wordle-shaped daily puzzle,
a level editor feeding TPL-005's dungeon, a card battler) on **one criterion Richard stated in the
ask: how much new product a person gets per line of JSON edited.** He also ruled **the Remix page
is in scope** — *"it's the point"*.

---

## 1. 🔴 The criterion this template is graded against

Not "is it a good game". **The property being sold is that the data file is the whole creative
work.** TPL-005 got that property by accident — the five rooms happen to live in one `Static Data`
node in [`Pages/Play`](../../../templates/pixel-game/components/Pages/Play/nodes.json) — and Richard
named it as the thing he liked. This template engineers it on purpose.

The test of the property is a sentence that must be true when we are done:

> **A person can ship a completely different game by editing one JSON array, and never open the
> node graph once.**

A new dungeon level is *more of the same game*. A new `story.json` is **a detective novel, an
onboarding walkthrough, a D&D one-shot, a language lesson, a sales demo** — a different product,
from the same graph. That is the highest ratio on the eight-template roster and it is why this one
was picked over the other three.

### 🔴 The corollary: the graph must stay an interpreter, not a story

Any passage text, choice label, or story rule hard-coded into a node **breaks the claim**, because
it is content a person has to go into the graph to change. The gate must assert this, not trust it
(see AC6). A `Text` node whose `text` parameter is a literal line of the demo story is a defect in
this template even though it renders identically.

## 2. What was measured before the design was chosen

### 2a. ✅ Interactive fiction is the genre that does not want the missing node

TPL-005's first defect was **D40 — there is no ticker node** ([TPL-005 §2a](TPL-005-THE-PIXEL-GAME.md);
`Timer` is a one-shot delay, filed as
[`nodegx-has-no-ticker-node`](../../../dev-docs/tasks/phase-78-the-templates/TPL-005-THE-PIXEL-GAME.md)).
The dungeon had to become turn-based to survive it, and that was a compromise dressed as a design.

**Interactive fiction is structurally turn-based**: nothing moves until the reader chooses. The
product's sharpest limitation is invisible in this genre rather than worked around, which is a
better demo than the dungeon's.

### 2b. ✅ The Remix page is buildable with a shipped node — no module to carry

`Text Input` takes `type: 'textArea'`
([`text-input.ts:74-90`](../../../packages/noodl-viewer-react/src/nodes/controls/text-input.ts#L74-L90)),
so the paste-JSON-and-play surface needs **nothing installed**. Contrast TPL-005, which had to carry
`keyboard-shortcuts` into the project as a library module ([TPL-005 §2c](TPL-005-THE-PIXEL-GAME.md)).
**This template can ship with zero `noodl_modules`** — a strictly easier artefact to zip, deploy and
open.

### 2c. ⬜ UNMEASURED — how state between passages is held

The reader carries flags and an inventory between passages. Candidates are a `Variable`, an
`Object`, or a `Function` that owns the state. 🔴 **Before choosing, read
[`Function` `Outputs` publishes only on change](../../../dev-docs/tasks/phase-78-the-templates/TPL-005-THE-PIXEL-GAME.md)** —
a mutated-in-place object does not re-publish, which is exactly the shape a naive inventory takes.
**Measure it with a two-passage fixture before building the real thing.**

## 3. What it is

A reader lands on a page of prose with two to four choices under it. Clicking one moves them to
another passage. Some choices are **conditional** — they appear only if the reader is carrying
something or has visited somewhere — and some **give** them something. A sidebar shows what they
carry. There is a restart.

### The data shape — the entire authoring surface

One `Static Data` node holding an array. This is the contract a person edits, and it is the thing
the README teaches:

```json
[
  {
    "id": "start",
    "title": "The lamp-room",
    "text": "Rain on the skylight. The keeper's log is open on the desk.",
    "choices": [
      { "label": "Read the log", "goto": "log", "gives": "the keeper's name" },
      { "label": "Climb to the lantern", "goto": "lantern" },
      { "label": "Say the name aloud", "goto": "ending-true", "requires": "the keeper's name" }
    ]
  }
]
```

Four verbs, and no more: **`goto`** moves, **`requires`** hides a choice until you carry a thing,
**`gives`** hands you one, and an absent `choices` array is an ending. A person who understands
those four words can write a novel. 🔴 **Resist a fifth verb** — every one added is a line of the
README nobody reads and a branch in the interpreter.

### The Remix page — Richard's ruling, and the answer to his jab

*"You can build anything with Claude Code today, fine, but can you go in and edit it afterwards?"*

A `/remix` page with a textArea, a **Play** button, and a **Copy current story** button. Paste an
array, play it immediately. This makes the scaling loop work **without opening the editor at all**,
while the graph sits behind it for the person who wants to change the **rules** rather than the
**content**. Two doors, both open, in the first ten seconds.

🔴 **It must report a bad paste in prose, not fail silently** — the first thing anyone does on that
page is paste something malformed, and a blank screen there kills the whole pitch.

## 3b. The demo story — *The Last Light*

**Written 2026-09-11** with the `story-craft` and `prose-craft` skills Richard supplied, and living as
a real artefact at [`tpl-006-the-last-light.json`](tpl-006-the-last-light.json) so the build can drop
it straight into the `Static Data` node.

You are the relief keeper. The boat put you on the rock an hour ago, the lamp is cold, and Aldis —
the man you came out to relieve — is not in the lighthouse.

🔴 **The reason it is this story and not atmosphere: the mechanic and the theme are the same thing.**

- **Want** (external, concrete, on a deadline): get the light burning before dark.
- **Need** (internal, opposed): read the man before acting on him — and reading costs minutes the
  light does not have. The two pull against each other, which is the only reason there is a story.
- **The crisis is a real dilemma**, not a puzzle with a right answer: a light on the water that
  should not be there, and a shout from the rocks. Light the lamp and four men you never meet go
  home, and Aldis is at the foot of the north stair at six. Go down and you carry him up, and behind
  you the reef takes the boat *because there is no light*. **Neither is wrong. Both cost somebody.**
- **The third way out is gated on `requires: "what Aldis wrote"`** — it exists only for a reader who
  stopped and read the log, because the log is where he recorded that the south stair is rotten and
  where the old oil lamp lives. ⚠️ **Reading is the key.** In a template whose argument is *the
  writing is the product*, that is what the mechanic ought to be about.
- **It does not tidy up.** The ending where nobody drowns is the ending where Aldis will not speak to
  you, and the supply does not come for three days.

⚠️ **The left-hand panel of the proposal's Plate 2 is load-bearing and must stay true in the build:
there is no greyed-out row, no padlock, no hint.** A reader who never opened the log never learns the
third way existed. A future "helpful" affordance that reveals locked choices would break the story,
not just the plate.

## 4. The person sentence

*A writer with no code opens the template, deletes the demo story, pastes their own, and has a
playable branching game — then sends the URL to someone.*

## 5. Success criteria — measured 2026-09-12

🔴 **Every criterion here except AC2, AC4 and AC6 is one a render cannot meet**, so the evidence is
split on purpose: the gate (`tpl006Template.test.ts`, 62/62) grades what is true of the artefact,
and a CDP drive of a real browser grades what happens when somebody clicks. **Neither half is
sufficient**, and the §7 record says which is which.

- 🟢 **AC1 — it plays. Driven in a browser, 0 console errors, every clause of the AC separately.**
  - **A choice moves passages.** `The lamp-room` → `The gallery` on one click.
  - **A `gives` choice puts a thing in the inventory.** After *Read the log*, **What you carry**
    read `what Aldis wrote` and the empty-state line was gone — so both halves of the `Inverter`
    flag pair are wired.
  - 🔴 **A `requires` choice is ABSENT BEFORE and PRESENT AFTER, and both halves were read.** Same
    passage, same session, the only variable being the `gives` choice taken in between:
    at *The gallery* carrying nothing the choice list read
    `["Light the lamp", "Go down to the rocks"]`; carrying `what Aldis wrote` it read those two plus
    `Light the oil lamp first, then take the north stair`. **Present-after alone would have graded
    nothing.**
  - **An ending offers a restart**, the eyebrow reads `AN ENDING`, the note reads *"That is an
    ending. Start again and the other roads are still there."*, and the choice list is empty.
  - **A restart clears the inventory** — back at `The lamp-room` with *"Nothing yet."*
  - ⚠️ **Honest scope:** driven through `render-from-disk`, which serves the prepared artefact
    against the working-tree runtime. **Not yet opened from a zip on a second machine**, and not
    yet through the shipped deploy — see AC7.
- 🟢 **AC2 — the demo story is worth reading.** [`tpl-006-the-last-light.json`](tpl-006-the-last-light.json)
  — *The Last Light*, 7 passages, 3 endings. The gate walks it: unique ids, every `goto` resolves,
  every passage reachable, ≥2 endings, and 🔴 **the gated ending is reachable ONLY through the
  choice that gives its key** — a second walk that refuses every `gives` and every `requires` choice
  cannot reach it. **Subject still Richard's to overturn** (§6); overturning it costs the prose and
  one file.
- 🟢 **AC3 — the Remix page round-trips. Driven.**
  - **The box opens holding the story that is playing** — 3,939 characters of pretty-printed JSON on
    first load.
  - **Paste → play.** A two-passage array typed into the box, *Read this story*, and the reading page
    came up on `Monday, 9.02` with the header reading **`Your story — 2 passages`**. Its `gives`
    choice and its ending both worked.
  - **Round trip.** Back on `/remix` the box held the pasted story — 376 chars, 2 passages,
    first id `desk`.
  - **Four malformed pastes, four readable messages, and it stayed on `/remix` every time**:
    not JSON (*"That is not valid JSON yet: Expected property name…"*), an object rather than a list
    (*"the outermost brackets have to be [ ] rather than { }"*), a dangling `goto`
    (*"A choice in "a" points at "nowhere", and there is no passage with that id."*), and an empty
    box.
  - ⚠️ **DEVIATION FROM THE AC's WORDING, and it is a design decision rather than a shortfall.**
    The AC asks for a **Copy current story** button. There is no button: the box is already full, so
    "copy the current story" is select-all in a box a person is editing anyway. A literal clipboard
    write would have meant carrying `library/modules/clipboard`, which costs AC4 and walks into
    D41's two-module registration failure, to buy an affordance the page already has.
- 🟢 **AC4 — zero `noodl_modules`.** Asserted on the artefact directory, not on the intent:
  `prepareStoryArtefact` **refuses to write** if `noodl_modules/` exists and is non-empty, and the
  gate reads the directory. The first template on the shelf a person can unzip and open with nothing
  installed.
- 🟢 **AC5 — gated and drift-locked, on the TPL-005 recipe.** `tpl006Components.ts` /
  `tpl006Theme.ts` / `tpl006Template.ts` / `tpl006Template.test.ts` in `packages/noodl-mcp/tests/`,
  and `scripts/generate-story-template.ts` (`npm run template:story`) writing
  `templates/story-engine/`. The drift gate runs **the same builder** rather than a twin. **0
  validator errors; one warning, argued with rather than suppressed** (D50) and asserted exactly, so
  a *new* warning reddens.
- 🟢 **AC6 — the no-content-in-the-graph gate, and it is stronger than the AC asked for.**
  - The scan reads **every authored parameter** of every node for **all 20** passage titles, passage
    texts and choice labels, in both the raw and the JSON-escaped spelling, and asserts they occur in
    **exactly one**: `/Story/Source::srStory::json`. ⚠️ Written as *exactly one*, not *none* — the
    story has to live somewhere and that somewhere is the authoring surface.
    🔴 The escaped spelling is not belt-and-braces: checking only the raw form found **13 of 20** and
    would have read seven leaked paragraphs as clean.
  - 🔴 **And §8 proves the claim by doing it.** The template is built a second time with a completely
    different four-passage story and **every component's graph is diffed**: exactly one component
    differs, and inside it exactly one parameter of one node. *A person ships a different product by
    editing one JSON array.*
- 🟢 **AC7 — a demo page on nodegx.io. LIVE at <https://nodegx.io/templates/story-engine/>**,
  published 2026-09-12 on Richard's ask (*"publish it to the template path on the nodegx homepage
  like the other templates"*), beside `pixel-dungeon` and `business-landing-page`. Built by the
  **shipped** engine on the **production** viewer with **no `--allow-development-engine`**, and
  **driven against the public URL — 16/16 clauses, 0 console errors.** §9a/§9e.
- 🟡 **AC8 — Richard's look. SENT 2026-09-12, and from a better instrument than last time.** Four
  screenshots at 1100×1400 were taken on 09-12 and one of them changed the build (see §7), but they
  came from `render-from-disk`, which serves **0 shipped default tokens** — the same path whose
  flatness TPL-004 §10 warns is an artefact of the instrument, not the look. The **four** sent to him
  are of the **deployed** artefact, which carries the real stylesheet. Still ⬜ until he answers.

## 6. Rulings, and the one that was disproved

### 🔴 D43 IS DISPROVED AND REPLACED BY D49. This template is the re-measurement the handoff asked for.

D43 read *"a value wired into a States node's `currentState` never changes its state."* **It does.**
`Story/Passage` is driven by exactly that wire and its `string` value output changed on cue in a
browser — the eyebrow read `You are here`, then `An ending`. Ten components in `library/prefabs` do
the same wire, four of them inside repeated rows.

**What is actually broken is bigger and it is not about `currentState`:** a `States` node with
`useTransitions` **true — the port's DEFAULT** — publishes its `string` and `boolean` values on a
state change and **never publishes its `color` or `number` values at all**. Two arms, identical but
for that parameter, each against a freshly restarted server; and a six-sample time series (0, 60,
150, 320, 700, 1500 ms) showing the string flip at 60 ms while both colours sat unchanged at every
sample. Full row, the table and what it predicts about TPL-005 and TPL-004:
**[D49](DEFECTS-THE-TEMPLATES-FOUND.md)**.

✅ **TPL-006 ships `useTransitions: false` on both its States nodes**, the reason is in the
parameter, and the gate pins it so a later session cannot undo it by tidying.

> **2026-09-14 — the workaround is removed.** [P88 GAM-006](../phase-88-the-defects-the-games-found/GAM-006-A-COLOUR-SWITCHED-BY-STATES-REACHES-THE-SCREEN.md)
> fixed the runtime: a token colour tweened through `#0aNaNNaNNaN` and never arrived. Numbers were never broken; AC1
> measured them gliding. Its §8 session 5 drove this template's `Story/Passage` with `useTransitions: true` in a
> deployed page. The eyebrow colour passed through 19 distinct colours to `--primary`, and the rule through 18. On the
> old runtime both held their first colour. Both States nodes are back at the default and the pinning gate is gone.
> ⚠️ The nodegx.io demo was built before this, with the pin and the old runtime. It is unaffected until it is rebuilt.

### 🙋 Still Richard's, and still open

- 🔴 **The category slug.** `interactive-fiction` is **none of the six ruled slugs** (`starter`,
  `data-app`, `dashboard`, `site`, `form`, `integration`), exactly like `pixel-game`. **This now
  blocks the shelf for two templates** and is phase-78 `T3`. It blocks neither the build, the zip
  nor the demo page.
- 🟡 **The demo story's subject.** He asked for the story straight after reading the lighthouse
  mockups, which is a go in substance, and *The Last Light* is written and shipping. He can still
  take it to the support-desk variant — **that costs the prose and one file**, because
  `STORY_FILE` is the only thing the build reads.

### ✅ §2c is answered: the state is three `Variable`s

The open design question was whether the reader's state should be a `Variable`, an `Object` or a
`Function` that owns it. It is three app-wide `Variable`s — `storyAt`, `storyCarrying`, `storyPasted`
— and the trap under it (`Function` `Outputs` publishes only on change, so a mutated-in-place array
never re-publishes) is handled the way TPL-005 handled it: **every seam that returns a list builds a
fresh array**. A `Function` owning the state was ruled out by the template's own rule that no seam
stores anything, and the gate asserts it.

## 6b. What the build and the drive cost, and the three things only looking found

🔴 **Three of this session's defects were invisible to a green gate**, which is the argument for the
drive restated as history:

1. **A `States` node with transitions on never publishes a colour** (D49). The gate was green, the
   graph is right, and the passage panel never changed colour. Found by reading a computed style.
2. **A dead-end passage was labelled "A passage that is not there."** The `stuck` state mapped onto
   the panel's `lost` state, so two different data mistakes wore one label — and the one it wore
   sent a person looking for the wrong bug. `Story/Passage` grew a fourth state.
3. **`visible` reserves its box.** Two empty lines on the reading page left ~130px of nothing
   between the choices and the inventory. The design doctrine's *"falsiness is free conditional
   rendering"* names `visible`; for a line that must **collapse** the port is `mounted`, which is
   what TPL-005 recorded from the other side. Found in the first screenshot.

### 🔴 And one instrument failure that nearly shipped three false findings

`render-from-disk.js` builds its HTML **once at startup** and serves that snapshot. Three rebuilds
were driven against a stale server and produced three confident, wrong readings — including a
"transitions are not the cause" that was the exact opposite of the truth. Every reading above was
re-taken with the server **restarted between arms**. *An instrument must be armed before it
measures, and a frozen fixture answers a different question once its subject has moved.*

## 6c. Two things the build learned about the doors

- 🔴 **Two pages that link to each other cannot be authored in one pass.** `create_component`
  **refuses** a `RouterNavigate.target` naming a component that does not exist yet
  (`unresolved-navigation`, *"rejected — nothing was written"*), and the pages cannot simply be
  swapped because `nextStartPage` gives home to the **first page registered**. So `Pages/Read` is
  written first, then `Pages/Remix`, and the one door between them arrives as a two-operation
  `update_component` delta (`READ_REMIX_DOOR`). The gate asserts the wire is in the artefact, so a
  delta that silently did nothing would redden rather than ship a button that goes nowhere.
- 🔴 **A `Text` with `sizeMode: 'contentSize'` renders `white-space: pre` and does not wrap**
  (`Text.tsx:79-85`). Every other template in this repo sets `contentSize` on almost every `Text`
  because their strings are short; this one's are paragraphs with blank lines in them, so a
  `contentSize` prose node runs off the right of the screen on a page that otherwise looks perfect.
  `PROSE_NODES` names all six and the gate asserts none of them is content-sized.

## 6d. The artefact, in numbers

| | |
|---|---|
| components | 9 — `App`, `Story/Source`, `Story/Passage`, `Story/Choice`, `Story/Carried`, `Story/Sidebar`, `Story/Paster`, `Pages/Read`, `Pages/Remix` |
| nodes / connections | 88 / 84 |
| `Condition` gates | 5, each with both `eval` and `condition` fed, and **every** `Condition` is a declared gate |
| `Function` seams | 5, and the gate asserts the set is exactly those five |
| library modules | **0** |
| backend | none — no `__cloud__`, no `nodegx.security.json`, no `cloudservices` |
| components publishing outputs | 3 of the 6 non-page components (`Source`, `Choice`, `Paster`) |
| design tokens | 36 project overrides on the `minimal` preset, 18 contrast pairs recomputed by the gate |
| gate | 62/62 · `typecheck:mcp` clean |

⚠️ **`Story/Passage`, `Story/Carried` and `Story/Sidebar` publish nothing, and that is stated rather
than hidden.** CMP-001 asks what a parent can learn from a component and says to answer out loud when
the answer is nothing: they are the prose, the pill and the panel, and what a reader does to them is
read them. There is no fifth verb for dropping a carried thing, so a `dropped` output would be a port
nobody could wire.

## 7. Why not the other three

Recorded so the next reader does not re-derive the comparison:

- **A Wordle-shaped daily puzzle** — cheapest build, loudest instant recognition, photographs best,
  and "swap one JSON array for your niche" is a ten-second demo. **The strongest runner-up, and the
  better pick if 0.2.3 gets close and this one is not done.**
- **A level editor feeding TPL-005** — the only idea that *produces* data rather than consuming it,
  and it demos the realtime hub. Deferred because it improves a shipped template rather than adding
  a new one to an almost-empty shelf.
- **A card battler** — adding a card in six lines of JSON is thrilling, but card effects are
  *behaviour*, so it needs a mini-DSL interpreter in the graph. That either looks brilliant or
  collapses into one `Function` node with a switch statement in it, and the downside is a demo that
  argues *against* the product.
## 9. AC7 re-measured — the deploy, and a drive of the thing a person actually deploys

**2026-09-12.** The handoff named AC7 blocked by D44/D48 and said this template was *more exposed
than TPL-005* because of a `For Each`'s `itemOutput-*` ports, *"the one nothing has measured"*. It is
measured now, and 🔴 **the prediction was right about the ports and wrong about who has the defect.**

### 9a. Two deploy paths, and they disagree by exactly three wires

Both run on `templates/story-engine/` at HEAD. The devtool needs `packages/noodl-editor` as its
working directory — `getAppPath()` resolves to `process.cwd()`, so from anywhere else it throws
`ENOENT … /src/external/deploy/index.json` and that is not a fact about the project.

| path | authored | deployed | dropped |
|---|---|---|---|
| **`nodegx deploy`** — shipped engine, `packages/noodl-preview/dist/nodegx-deploy.cjs` | 84 | **84** | **0** |
| `deploy-from-disk` devtool | 84 | 81 | 3 |
| devtool, `--sabotage` control | 85 | 81 | 4 (the planted one + the same 3) |

All nine components were diffed connection-by-connection in both directions, not totalled —
[`scripts/devtools/deploy-connection-diff.js`](../../../scripts/devtools/deploy-connection-diff.js),
committed because the census counts drops and does not name them, and that gap is the whole cost of
D52: the
shipped arm is `missing 0` on every one of them, and the devtool arm is `missing 0` on eight and
`missing 3` on `/Pages/Read`. The three are the `For Each`'s `itemOutput-goto`, `itemOutput-gives`
and `itemOutputSignal-picked` — **the entire click path of a choice**.

🔴 **The `--sabotage` arm is what makes the clean arm's number mean anything.** A planted wire into a
port that does not exist was dropped (`/Story/Source` 8 → 7), so the health filter was alive when it
also dropped the three. Without that arm, "3 dropped" and "the filter is confused" are the same
reading. Mechanism and the two gates behind it: **[D52](DEFECTS-THE-TEMPLATES-FOUND.md)**.

### 9b. The deployed folder was driven, and it plays

`scripts/devtools/drive-deployed.js` serving the **shipped engine's output** — not
`render-from-disk`'s reconstruction — at 1100×1400, clicks dispatched as real CDP mouse events at
each element's own centre after `elementFromPoint` confirmed nothing was on top of it:

| step | read off the page |
|---|---|
| first load | `The lamp-room`, eyebrow `YOU ARE HERE`, 3 choices, carry *"Nothing yet."* |
| **`requires` ABSENT** — gallery carrying nothing | 2 choices: `Light the lamp`, `Go down to the rocks` |
| the `gives` choice | carry reads **`what Aldis wrote`**, and the empty-state line is gone |
| **`requires` PRESENT** — same passage, carrying it | the same 2 **plus** `Light the oil lamp first, then take the north stair` |
| the gated ending | `The north stair`, eyebrow **`AN ENDING`**, **0** choices, the note renders |
| restart | back at `The lamp-room`, 3 choices, carry back to *"Nothing yet."* |
| `/remix` | the box holds **3,939** characters, opening `[\n  {\n    "id": "start"` |
| — | **0 console errors, 0 network errors** |

🔴 **Both halves of the `requires` pair were read, in the same session, with the `gives` choice as
the only variable** — the second arm reached by a full page navigation, so the app-wide `Variable`s
reset and the run started honest. **Present-after alone would have graded nothing.**

⚠️ **The choice rows are `Group`s with `cssClassName: "story-choice pressable"`, not `<button>`s.**
A first drive selecting `button` found only *Start again* and *Write your own story*, reported
`NOT FOUND` six times, and every screen read identically — **which looks exactly like a template
whose clicks are dead.** The artefact was fine and the selector was wrong. *A drive that finds
nothing has two explanations and the instrument is the likelier one.*

### 9b-i. 🔴 The negative control, which is what makes 16/16 mean anything

The drive is committed as [`scripts/devtools/drive-tpl006-story.js`](../../../scripts/devtools/drive-tpl006-story.js)
and it is a **gate**: 16 clauses, exit 1 if any fails. Run against the **devtool's** build — the same
project, the same script, the only difference being the three missing `For Each` item wires — it
scores **9/16 and exits 1**:

| | shipped engine's build | devtool's build |
|---|---|---|
| a choice moves passages | ✅ | ❌ never leaves the first passage |
| a `gives` choice fills the inventory | ✅ | ❌ carries nothing, ever |
| the `requires` choice appears | ✅ | ❌ never |
| any ending is reachable | ✅ | ❌ none |
| **console errors** | **0** | **0** |

🔴 **Three dropped wires render perfectly and say nothing.** Not one console error, not one network
error, every passage of prose on screen, every button present — and the story cannot be played.
This is the defect class TPL-004's AC8 note names and it is the argument for driving an artefact
rather than reading it.

🔴 **And the control caught a hole in the drive's own ARM A.** *"The `requires` choice is ABSENT
carrying nothing"* **passed on the broken build** — because the reader never reached the gallery, so
the choice was absent for the wrong reason. An absence is evidence only beside a signal known to
fire, and here that signal is ARM B. The pair is the reading; ARM A alone is not. Recorded in the
script's own header so the next reader cannot take one half of it.

### 9c. What this does and does not settle

- ✅ **The three "dropped" wires are alive in the deployed artefact.** They are the three that carry
  a clicked choice into the engine, and the story could not have been played without all three.
- ✅ **The artefact a person deploys is complete** — 84/84, diffed per component.
- 🔴 **It is NOT settled that all 84 are healthy.** The shipped filter is inert (**D48**): it keeps
  every wire whatever its state, so `84 → 84` means *nothing was dropped*, never *nothing is broken*.
  The browser drive is the other half, and neither reading is sufficient alone.
- 🟡 **The zip half of "opened from a zip on a second machine" is done; the second machine is not.**
  `templates/story-engine` zips to **31 KB / 30 files**, unpacks **byte-identical** (`diff -r` clean),
  carries **no absolute path** and no `noodl_modules`, and the unpacked copy — deployed from a
  directory outside the repo entirely — is **84/84 connections and 16/16 clauses**. What that does
  not cover is another machine's Node, another OS, and a checkout that is not this one; it removes
  the project directory as a suspect, not the environment.
- 🟢 **The production viewer is built and the engine ACCEPTS it — §9d.** The publish itself is
  outward-facing and Richard's; he ruled *build it, stop short of publishing*.
### 9d. The production viewer, and a publishable bundle that was not published

**Richard's ruling this session: build the production viewer, stop short of publishing.** Done, and
it retires the last technical unknown on AC7's build half — **nobody had ever deployed this template
on a production runtime.**

`npm run build:editor:_viewer`, exit 0:

| | development build | production build |
|---|---|---|
| `noodl.deploy.js` | 14 MB, **110,799 lines** | **1.5 MB, 1 line** |
| inline source map | 9.43 MB, 66% of the file | — |
| `.LICENSE.txt` sibling | absent | **present** |
| the shipped engine's verdict | 🔴 **REFUSED by name** | ✅ **`ok: true`, no override** |

Then the same two readings, on the production runtime and with **no `--allow-development-engine`**:
**84 of 84 connections**, and the drive gate **16/16 with 0 console errors**. The whole deployable
site is **1.7 MB in 8 files**. The screenshot is pixel-identical to the development-viewer one, so
minification cost the look nothing.

🔴 **EXP-017's refusal was never a blocker — it is the guard doing its job**, and the only reason
this session's earlier deploys needed `--allow-development-engine` is that a census does not care
what it measures and a publish does. **Never carry that flag into a publish**: it is what puts
9.43 MB of base64 viewer source on a host.

⚠️ **THE BUILD OVERWROTE THIS CHECKOUT'S VIEWERS, AND THE CHECKOUT IS SHARED.**
`build-viewer.ts` writes `packages/noodl-editor/src/external/`, and it rewrote **all three** —
`deploy/`, `viewer/` and `ssr/`. They are gitignored, so **`git status` says nothing about it**. The
editor's own preview now runs a minified viewer, which means **no readable stack traces in the
renderer console** — worth knowing before anyone reads a console error off a drive and believes its
frames. ✅ **`npm run dev` restores a development build**: `scripts/start.ts:202` runs the viewer's
`start` (webpack watch) rather than `build` unless `--build-viewer` is passed.

⬜ **The bundle itself is not committed and not published.** It is gitignored build output and a
1.7 MB artefact; what is durable is the expensive half — the viewer build now in the tree — and the
two commands:

    node packages/noodl-preview/dist/nodegx-deploy.cjs templates/story-engine <out>
    node scripts/devtools/drive-tpl006-story.js <out>
### 9e. The publish, and the harness defect that would have graded it wrong

**2026-09-12.** `site/templates/<slug>/` in `~/vscode_projects/nodegx-web`, deployed with
`ops/deploy.sh 49.12.102.195`. Both neighbours on that box (`nexus.digitalbricks.io`,
`digitalbricks.io`) answered **200 before and after**, and `site/index.html` was **byte-identical**
under the deploy's own `build.py`, so the homepage did not move.

🔴 **The base URL is not optional.** The other two demos are built with
`--base-url /templates/<slug>/`, which rewrites `<base href>`, `Noodl.Env['BaseUrl']` and every
script src. The root-relative build driven in §9b would have asked for `/index-<hash>.js` and
**rendered blank** under the subpath. Rebuilt with the flag; `<base href>` verified in the artefact
before pushing.

🔴 **AND THE DRIVE HARNESS PUBLISHED THE HOMEPAGE AS THE TEMPLATE.** `serveFolder` fell back to the
**root** `index.html` for any **directory** request, so serving `site/` and asking for
`/templates/story-engine/` returned **nodegx.io's homepage with a 200**. The gate scored **5/16** —
and ⚠️ **every one of the five that passed was an ABSENCE clause**, each true of a page with no
story on it: *"the `requires` choice is ABSENT"*, *"the empty-state line is gone"*, *"the ending
offers no choices"*, and both error counts. **A blank page passes every absence a drive can make.**
Fixed in `drive-deployed.js` (a directory serves its own index first, root fallback kept after) and
committed.

✅ **The reading that settles it is against the PUBLIC URL, not a local copy:**
`drive-tpl006-story.js https://nodegx.io --path /templates/story-engine/` → **16/16, 0 console
errors, 0 network errors**. `withDeployedSite` grew an `origin` option for exactly this — a local
folder that plays is not evidence the deploy landed; the host's own rewrites, headers and cert are.

⚠️ **`site/templates/` is UNTRACKED in `nodegx-web`, and was before this template** — all three
demos live only on the box and in that working copy. They regenerate from this repo in one command,
so nothing is lost, but **`git status` in the site repo does not describe what is published.** Left
as found: committing three deploy folders is a decision, not a tidy-up.

🙋 **The category slug is still unruled and this publish did not need it.** `interactive-fiction` is
none of the six (`starter`, `data-app`, `dashboard`, `site`, `form`, `integration`). The demo page
is a static path on the marketing site; **the in-editor shelf is the thing T3 still blocks**, for
this template and `pixel-game` both.
