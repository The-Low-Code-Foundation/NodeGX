# Report: a 3D map editor built from the NodeGX kit

For the people who made the kit (`nodegx-your-own-editor`, `@nodegx/project-contract` 0.1.0,
`@nodegx/node-spec` 0.1.0, `@nodegx/preview` 0.2.2, `@nodegx/canvas-look` 0.1.0). Written
into this file instead of an issue, as asked.

## What was built

`./editor` is a NodeGX editor that shows an app as a 3D map you can fly through (three.js). Each
component is a plate in its folder's district. Each node is a card at its file x/y, coloured from
`@nodegx/canvas-look`. Each wire is an arc in the kit's signal or data colour. Purple arcs join a
component to the places it is used. The real app runs in a corner through the in-page
`@nodegx/preview`, and its trace sends a bead along each wire as values travel through the running
app.

In the panel you can rewire (connect, cut), rename, set or unset parameters, move a card (drag it, or
type x and y), put a node inside another, add any node type or component, remove a node, and undo.
Save writes only the changed components, through `V2ProjectStore` with `ifRevision`, after
validating them. A component someone else changed is refused, with a choice to load theirs. After
each save the kit's structural validator reads the whole project.

`npm start` in `./editor` installs the kit on first run and opens `../todo-list`.

**Time:** about 25 minutes from reading the skill to this report. That was 23 minutes of building
and testing (timestamped at the start and the end), plus writing this.

## The suite's output

On a copy of `todo-list`, with a 17-edit script (`editor/suite/edits.json`). It uses every one of
the eight kinds, across two components, including a subtree removal and the editor's own minted
ids:

```
$ node node_modules/@nodegx/project-contract/editor-suite-node.js suite/adapter.mjs <copy> suite/edits.json
PASS — NodeGX map editor on suite (77 ms)
```

The control (`suite/adapter-broken.mjs`, the same adapter writing one number as a string):

```
$ node node_modules/@nodegx/project-contract/editor-suite-node.js suite/adapter-broken.mjs <copy> suite/edits.json
FAIL — NodeGX map editor (broken on purpose) on suite (76 ms): 1 difference(s)
1. node "hdTitle" in components/Todo/Header/nodes.json: "parameters.fontSize" is "28"; the official editor saves 28.
```

The adapter calls the same `ProjectModel` methods the panel's buttons call, and saves through the
same `commit()` the Save button uses. It has no graph runner, so the suite graded files only (see
question 10).

## The other checks

- **A real session in the page** (headless Chrome over CDP, clicking cards and buttons as a person
  would) on a second copy. It added a wire, cut a wire, renamed a node, set a parameter, dragged a
  card, added a node, and saved. A diff against the original shows exactly those changes, plus the
  registry's counts and `lastUpdated`. **241 other files were byte-identical.**
- **`validate_project`** (nodegx MCP 0.2.2) on that saved copy: **0 errors**, 1 warning, 28 infos.
  The warning was correct and mine: the session added a Text with no parent, which is outside the
  visual tree and never drawn. The editor now says so on such a node, and "Add a node…" puts a new
  node inside the selected visual node by default. The infos are the app's own (`gate-starts-shown`,
  `oversized-page`).
- **`render_report`** on the saved copy: 0 errors, no console errors, and the sign-in screen
  rendered. Its warnings are about the app's look, not the edits.
- **A second session:** put inside, add as a child, remove and undo (the wire came back), and a
  conflict. Another writer renamed a node in a component with unsaved changes. The banner warned,
  Save was refused, and "load theirs" recovered. After that, Cmd+S saved the remaining change.
- **`./todo-list` is untouched:** all 244 files are byte-identical to the copy taken before any
  test, and no file in it is newer than the kit's install.
- I could not open the saved copy in the official NodeGX editor. It is not something I can run from
  here; please open `/tmp/nodegx-map-copies/ui` in it if you have it.

## Questions the page and the kit didn't answer (where I guessed)

1. **Format version.** The page says the version is `5` and to write what you read. `todo-list` is
   `"version": "4"`. The store's header says the nodegx server adds run-on-value-change pins for
   projects older than 5, in `writeComponent`'s `prepare` hook. Should a stranger's editor do that
   too? The reference adapter doesn't, so neither does mine, and the suite can't tell. Is a v4
   project saved without the pins what the official editor would write?
2. **Visual nodes do have specs.** The page says "Visual nodes have no spec". In node-spec 0.1.0,
   `specFor('Group')`, `Text`, `net.noodl.controls.button` and `textinput` all return specs (92, 66,
   88 and 101 ports). I used node-spec first and the runtime's `nodeLibrary` only for types it lacks
   (`Page`, `CSS Definition`, `Component Inputs/Outputs`). Which source is right for visual ports?
3. **Node type → canvas-look category.** `nodeScheme(category)` needs `visual`, `data`, `logic`,
   `javascript` or `component`. Nothing in the kit maps a node type to one, and specs carry no
   category. I mapped the runtime library's categories (`Visual`, `Data`, `Cloud Services`,
   `CustomCode`…) and fell back to name patterns. Two editors will colour the same node differently.
4. **The PortContext builder.** node-spec's `PortContext` says "a project-model builder
   (`@nodegx/project-contract`) makes one from a project". I found no such export. I built `wired`,
   `wiredOutputs`, `instancePorts` and `components` myself. I guessed that `components` is keyed by
   legacy name (`/Todo/Header`), and left `routers`, `stacks`, `schema` and `siblings` empty.
5. **`npx @nodegx/preview` fails.** The package has two bins (`noodl-preview`, `nodegx-deploy`) and
   none named `preview`, so `npm exec @nodegx/preview` answers "could not determine executable to
   run" (tried on 0.2.2, installed locally). This folder's CLAUDE.md and the package README both
   give that command. The editor's `npm run preview` calls `noodl-preview` instead.
6. **The in-page preview isn't documented.** The README covers the CLI only. I read `mountPreview`'s
   options (`runtimeBase`, `traceIntervalMs`, `frameTimeoutMs`), `update()`'s
   `{ status, warnings | message }` and the trace batch `{ dictionary?, events }` from the bundle.
   The batch's events are `{ seq, t, fromNode, fromPort, toNode, toPort, value, kind }`, and
   `dictionary.nodes[id].component` is the legacy name. These worked, but they were read from
   minified code.
7. **The shape of `nodeLibrary`** is undocumented. I read `nodetypes[]` with
   `name/category/ports[{name, plug, type}]`. I didn't check every field.
8. **Visual roots.** The edit vocabulary can't add a node to `visualRoots`. `add_child` doesn't take
   a former root out of `visualRoots` either. So an editor that matches the reference can make a
   node that is never drawn (question 9), and can't make a new root. Is that intended?
9. **A child's position.** The page says a child has no position. The reference keeps `x`/`y` when
   `add_child` makes a node a child, and every child in `todo-list` carries `x`/`y`. I matched the
   reference: I keep what is there, and write none for a new child.
10. **"The report says so"** for a files-only adapter: it doesn't. The PASS line is the same with or
    without a graph half, and only names the graph when there is one. My editor runs logic only
    through the whole app in the preview, so it offers no `graphTarget()`. A line like "files only:
    the adapter has no runner" in the PASS would make that visible.
11. **Component interfaces.** No edit adds or removes a port on a Component Inputs/Outputs node
    (`ports`). So an editor that stays within the eight edits can't let a person rewire across
    components by adding a port. I said so in the editor's message when a wire is refused across
    components.
12. **The preview frame isn't sandboxed.** It shares the editor's origin, so the running app shares
    `localStorage` with the editor page. That was harmless here. Is it intended?
13. **Store behaviour I relied on but didn't find documented:** `writeComponent` didn't change
    `component.json` (or its `modified`) when only `nodes.json` and `connections.json` changed. The
    registry entry's `modified` and `lastUpdated` did change. I treated that as right because the
    reference does the same.

## Second round: fixes after the person used it

The person played with the map and asked for four fixes. This round took about 18 minutes
(timestamped).

### What changed

1. **Flying forward and back.** W/S (and ↑/↓) used to move along the line of sight. Looking down at
   the map, that is a dive, which reads as a zoom. They now fly level, the way you're facing, at the
   same height. E/Q still go up and down, and the wheel stays the zoom. The map also takes the
   keyboard back when you click it, because keys typed into the app's preview frame never reach the
   map. Arrows and Space no longer scroll the page.
2. **Wires into their ports.** Cards now have a row for each wired port, as on a NodeGX card: header,
   then inputs, then outputs, at the kit's `card.propertyConnectionHeight`. Each port has a dot on
   the card's edge, inputs west and outputs east. Each wire is a NodeGX-style bezier on the ground
   plane: it runs straight out of its output and into its input for half the gap, more when it runs
   backwards. It is lifted into an arc by sin², which has zero slope at both ends, so it leaves its
   output dot level and comes down level into its input dot. A card's x/y is its top-left corner,
   as on the canvas. Moving, dropping and placing a new card now allow for its depth.
3. **The preview highlights what you hover.** Hovering a card outlines what that node draws in the
   running app, with a labelled box over the app (the app's own styles are not touched). Hovering a
   wire outlines both of its ends. A node that draws nothing on the current screen is said in the
   preview's header. The box follows the app every 800 ms, so it is right after a navigation,
   scroll or rebuild. It also scrolls the app to the element once, when you hover something new.
   The cause of "doesn't highlight": it only highlighted the *selected* node, not the hovered one.
   It also never looked again after the app moved on: this app starts on `/` and redirects to
   `/sign-in`, so a node checked during that moment stayed "nothing drawn".
4. **Hovered wires glow and show their direction.** Hovering a wire picks it (raycast on the line,
   with a tolerance that grows with height), and a card in front wins over a wire just above it. The
   wire is drawn in its kit `highlighted` colour with an additive halo, and both port dots glow. A
   glowing ball fires from the output to the input every 320 ms at a steady speed, so the direction
   reads at a glance. A tooltip names both ends. Hovering a card does the same for all of its wires.
   The live-trace beads from the running app now use the same glowing ball.

### How it was tested (all on fresh copies of `todo-list`)

- `editor/tests/hover.json`, in headless Chrome:
  - All 21 wires on the Sign in plate start and end exactly on their port dots and are level there
    (slope < 0.1).
  - Hovering the Password card lit its 3 wires and fired balls.
  - Hovering the Password → Sign in wire lit that one wire and named it in the tooltip. Once the app
    was on `/sign-in`, the preview showed the highlight boxes and no note.
  - W moved the camera forward with its height unchanged.
- The case that failed before: I hovered while the app was still on its start screen, and the note
  said nothing was drawn, which was true then. 26 s later, on `/sign-in`, the box was there and the
  note had cleared, with no new hover.
- `editor/tests/edit-session.json` (the first round's session, now kept in the editor), on the
  taller cards:
  - Wiring `listLabel → text` gave `hdTitle` a `text` port row.
  - Cut, rename, set parameter, drag, add and save all went through.
  - The diff against the original shows only those changes: 241 other files byte-identical, 0
    validator problems.
- The editor suite on a fresh copy:

  ```
  $ node tools/run-suite.mjs suite/adapter.mjs <copy> suite/edits.json
  PASS — NodeGX map editor on suite (243 ms)
  $ node tools/run-suite.mjs suite/adapter-broken.mjs <copy> suite/edits.json
  FAIL — NodeGX map editor (broken on purpose) on suite (296 ms): 1 difference(s)
  1. node "hdTitle" in components/Todo/Header/nodes.json: "parameters.fontSize" is "28"; the official editor saves 28.
  ```

- `./todo-list`: no file in it is newer than the kit's install.
- Not re-run this round: the nodegx server's `validate_project` and `render_report`. The server had
  disconnected from this session. The structural validator and the suite were run instead.

### More questions for the kit (found this round)

14. **The suite command can't load an `.mjs` adapter before Node 22.** This machine is now on Node
    20.11.1. `editor-suite-node.js` loads the adapter with `require()`, so `suite/adapter.mjs` (the
    form the guide shows, `my-adapter.mjs`) fails with "require() of ES Module … not supported".
    `tools/run-suite.mjs` calls the same `readProjectTree`, `runSuite`, `graphGraderFromNodeSpec`
    and `formatReport`, but loads the adapter with `import()`. The kit's `loadAdapter` could do the
    same, since its own source already says `import()`.
15. **The preview has no "the app moved" signal.** `elementsOf(id)` answers for the screen as it is,
    and the app navigates by itself (here `/` → `/sign-in`). Nothing tells the editor when the frame
    navigates or redraws, so a highlight goes stale. I poll every 800 ms. An `onNavigate` or
    `onDraw` callback beside `onTrace` would remove the guess.
16. **The preview's boot time** in headless Chrome was 15–30 s before `update()` resolved, and
    `preview` is null until then. That is fine for a person, but a test has to wait for it. Is that
    the expected time?
17. **What the canvas look doesn't say about ports.** `card.propertyConnectionHeight` (20) looks like
    the port row's height, but nothing says so. Nothing gives the port dot's size or where it sits,
    the order of the rows (I used inputs, then outputs), or how far a wire's bezier runs straight
    out of a port (I used half the horizontal gap, at least 25 px). "In the NodeGX canvas, wires are
    drawn under the cards" is said, but the curve itself isn't. These would make a home-made wire
    match the editor's.
18. **The `pulsing` wire colour** is `#ffffff` in the dark theme and `#18212b` in the light one,
    which is the same in both kinds. I tinted it with each kind's `normal` colour, so a ball says
    signal or value. Is `pulsing` meant for something else, such as the wire line itself?

## Third round: the map as a space battle

The person asked for the map as a Star Wars space battle. This round took about 19 minutes
(timestamped). None of it touches the format, the store or the save path: it is all scenery around
the decks the nodes already sat on.

### What changed

- **Components are capital ships; nodes are the blocks on their decks.** Every plate is now the deck
  of a ship built from blocks (Minecraft-style, on a 1.5-unit grid, so slopes come out as stairs).
  The hull is built around and under the deck, so the cards, port dots, wires and every interaction
  work exactly as before. Clicking a hull picks its component, like clicking the deck.
- **Two fleets, three sizes each** (`public/ships.mjs`). Each folder is a squadron; each squadron
  joins the side with fewer ships, biggest first. A ship's class comes from its component's node
  count against the project's terciles. Its size also follows its deck, so a bigger component is a
  bigger ship.
  - Empire: a light cruiser (plain wedge), a Victory-style destroyer (wedge and low tower), and a
    Star Destroyer (double wedge, stepped superstructure, bridge tower, two block shield domes,
    three big and four small engines).
  - Rebels: a Corellian corvette (hammerhead bow, a wall of red engines), a Nebulon-B frigate (front
    hull, stepped neck, engine block, hanging pod, red stripe), and a Mon Calamari cruiser (rounded
    lumpy hull, lit portholes, a ring of blue engines).

  Each design is seeded by the component's key, so the same app always gets the same fleet. In
  `todo-list` that is 44 Imperial and 36 Rebel ships, with every class on both sides.
- **One speed, uneven spacing, glowing engines.** Both fleets fly ahead in formation. Each squadron
  is a few columns of ships, one behind another, with random (seeded) gaps. The ships stay still
  relative to each other, so editing a deck is unchanged. The motion is shown by space dust
  streaming astern past the camera, and by flickering engine glows.
- **Space** (`public/space.mjs`): a painted nebula sky, 5,000 tinted stars, and a ringed gas giant
  with its own sun. They move with the camera, so they never get nearer. The ground grid is gone.
- **The battle** (`public/battle.mjs`):
  - The capital ships near the camera fire turret bolts (green for the Empire, red for the Rebels)
    at one of the three nearest enemy ships, aimed at the side of its hull facing them. Hits burst
    into a flash, a fireball and flying blocks. No capital ship is destroyed.
  - Nine TIE fighters and nine X-wings are kept alive. Half arrive near where you're looking, with
    a hyperspace flash. Each chases the nearest enemy fighter, fires when it is close and dead
    ahead, and about one shot in six kills. The target then explodes, and a replacement arrives a
    few seconds later.
  - **Battle** (B) clears all of it and pauses it, for when it gets in the way of editing.
- **Music** (`public/music.mjs`): an original march in G minor, played the way a 90s console would.
  It has a square-wave lead, a triangle bass, a noise snare and a kick, made with Web Audio. It
  starts on the first click or key, because browsers wait for one, and **♪** (M) turns it off.
  - **I did not reproduce John Williams' Imperial March.** Its melody is copyrighted, and a
    chiptune transcription is still a copy of it. So the built-in march is mine.
  - Any audio file put in `editor/music/` (the server lists it at `/api/music`) plays on a loop
    instead, so the person can use a track they own.
- **Draw calls.** A labelled card is now two draw calls (its face, its sides), down from six, and a
  far card is one with a shared material. On `todo-list`, draw calls went from 6,619 to 2,146.

### How it was tested (fresh copies of `todo-list`, headless Chrome)

- `tests/fleet.json`:
  - 80 ships: 9 large, 9 medium and 26 small Imperial; 17 large, 2 medium and 17 small Rebel.
  - Every deck sits inside its hull's footprint.
  - The battle builds up: after 30 s, 17 fighters, 6 kills, and bolts and hull bursts in flight.
  - After the first click, the music is playing (`AudioContext` running).
- `tests/rebels.json`: close-ups of each Rebel class. **Battle** off cleared every bolt, burst and
  fighter.
- `tests/battle.json`: from inside the lane (411 units wide), bolts cross between the fleets, and
  fighters and a hull hit are on screen.
- `tests/edit-session.json` on the ships: wire, cut, rename, set parameter, drag (410 → 550, as
  before), add, save. The diff against the original shows only those edits: 241 other files
  byte-identical, 0 validator problems.
- `tests/hover.json`: all 21 wires on their port dots and level; hover glow and balls; the preview
  highlights both ends once the app is on `/sign-in`; W flies level.
- The editor suite: `PASS — NodeGX map editor on suite (94 ms)`. The control:
  `FAIL … 1. node "hdTitle" … "parameters.fontSize" is "28"; the official editor saves 28.`
- `./todo-list`: no file newer than the kit's install.
- **Not measured: speed on a real graphics card.** Headless Chrome renders on the CPU (SwiftShader)
  at about 3 frames a second, with or without the battle. The script per frame (space, battle,
  engines) is 0.03 ms. Hiding the ships cut a software frame from about 430 to 300 ms; the rest is
  the map as it was (cards, about 67,000 wire segments, labels) and the running app. The scene is
  2,146 draw calls and about 840,000 triangles, which a graphics card should handle, but I couldn't
  check that here.

### Two things I got wrong on the way, and fixed

- **My tests clicked the top bar by coordinates.** The two new buttons moved the bar along, so a
  click meant for **Fly to a component…** landed on **Whole map**. The camera then stayed far out,
  and a test drag moved a card 2,300 px. The tests now click by selector, and they wait for a
  `ready` flag the page sets when the map is drawn, instead of a fixed time.
- **The X-wing's wings**, first mirrored with a negative scale, would have shown inside out. They
  are now built at their mirrored coordinates instead.

### Nothing new for the kit

This round used no kit API beyond what the first two rounds did (`@nodegx/canvas-look` colours and
fonts for the decks, cards and wires). The questions above still stand.

## Fourth round: less silly, more Star Wars

The person liked the battle and the wire animations but found the block ships silly, and asked for
everything to be more Star Wars. This round took about 14 minutes (timestamped). Again nothing
touches the format, the store or saving.

### What changed

- **The ships, rebuilt** (`public/ships.mjs`). Smooth, shaped hulls replace the stair-stepped blocks.
  - Each ship is a handful of merged meshes in shared materials: a hull plating texture (painted
    once on a canvas, tinted per material, mapped from position so the panels are one size on every
    ship), with lit windows, turbolaser turrets with twin barrels, and engine nozzles with glowing
    faces.
  - **Each class keeps its proportions.** The hull grows until the deck fits, rather than stretching
    around it. That was what made the old ships silly: a long component made a long thin brick.
  - **Empire:** daggers, each with a flat top the deck sits on, a sharp equator with a dark trim
    line, a narrower keel and a trench ahead of the deck.
    - Astern of the deck sits a stepped superstructure with rows of lit windows.
    - The Victory and the Star Destroyer add a bridge tower with its wide bridge; the Star Destroyer
      adds two shield domes on stalks.
    - Blue engines: three big ones and smaller side engines.
    - A component more than about 3 times longer than it is wide becomes a long, thin **Super Star
      Destroyer**; there are 6 in `todo-list`.
  - **Rebels:**
    - The **Mon Calamari cruiser** is a smooth ellipsoid with organic bulges, flank pods, a dorsal
      ridge, bands of windows and a ring of blue engines. Its top is sliced flat so the deck's
      corners just meet the edge of the slice.
    - The **Nebulon-B** has a front hull with a sloping prow and a command tower, red stripes, a
      thin spar climbing aft to a tall engine block (two big and three small orange engines), and the
      pod hanging below on its strut.
    - The **Corellian corvette** has the long body with its red band, the hammerhead cockpit on its
      neck, and the wide engine block with eleven red engines in two banks.
  - Hovering a hull names the ship (for example "Todo/Header — Mon Calamari cruiser · 14 nodes").
- **Fighters.**
  - The TIE fighter has a ball cockpit with its round framed window, two pylons, and hexagonal wings
    with a frame and six spokes.
  - The X-wing has a tapering square nose, a canopy, a blue astromech dome, and four S-foils in
    attack position, each with its engine, red markings and wingtip cannon.
  - Both bank into their turns.
  - They fire twin bolts from their own guns: a TIE from both cannons, an X-wing alternating
    diagonal pairs.
  - They arrive with a hyperspace streak along their line of flight. Twelve a side.
- **Explosions:** a white flash, a fireball going from orange to red, smoke, sparks that streak
  outward, and tumbling debris. A fighter's death adds the expanding shockwave ring.
- **Sound effects** (`public/sfx.mjs`, the new **FX** button), synthesised with Web Audio:
  - an X-wing's blaster "pew", a TIE's warbling cannon, a deeper turbolaser crack, and an explosion's
    rumble and thump;
  - fainter with distance, silent out of earshot, and at most two or three of a kind at once.
- **Space** (`public/space.mjs`):
  - the nebula is faded to near black, as Star Wars space is;
  - the ringed gas giant is replaced by a green **forest moon** with clouds and a thin blue
    atmosphere, and a **battle station** with its equatorial trench, lines of latitude, city lights
    and its superlaser dish turned towards the fleet.
- **The opening crawl** (`public/crawl.mjs`).
  - "A long time ago in a galaxy far, far away...." in blue, then the project's name receding into
    the stars in outlined yellow, then a yellow crawl in perspective.
  - **The crawl's words are my own**, written from the project: "Episode LXXX" (the number of
    components in Roman numerals), the node and wire counts, and which squadrons fly for which side.
  - I didn't use the film's crawl text, which is copyrighted. Only the famous opening line is
    quoted.
  - It plays once a browser session; any key or click skips it; clicking the project's name
    replays it; `?nocrawl` turns it off.
- Engine glows are about half the size they were, and the plating is calmer (bigger, lower-contrast
  panels).

### How it was tested (fresh copies of `todo-list`, headless Chrome)

- `tests/fleet.json`:
  - 80 ships: 26 Imperial light cruisers, 9 Victory-class, 3 Imperial Star Destroyers, 6 Super Star
    Destroyers, 17 Corellian corvettes, 2 Nebulon-B frigates and 17 Mon Calamari cruisers.
  - **Every deck sits on its own hull.** The deck is inside the hull's footprint, and a new check
    casts a ray straight down from each of the deck's four corners: all 320 rays hit the ship's own
    hull, so no deck overhangs empty space.
  - After 30 s: 22 fighters, 9 kills. The music plays after the first click.
- `tests/rebels.json`: close-ups of a corvette, a Nebulon-B, a Mon Calamari cruiser, an X-wing, a TIE
  fighter and an explosion with its shockwave ring. The **Battle** toggle clears everything.
- `tests/crawl.json`: the crawl shows, with its text written from the project (quoted above), any
  key skips it, and clicking the project's name plays it again.
- `tests/edit-session.json` on the new ships: wire, cut, rename, set parameter, drag (410 → 550),
  add, save. The diff against the original shows only those edits: 241 other files byte-identical,
  0 validator problems.
- `tests/hover.json`: all 21 wires on their port dots and level; hover glow and balls; the preview
  highlights the wire's ends; W flies level.
- `tests/battle.json`: turbolaser bolts and hull bursts in the lane.
- The editor suite: `PASS — NodeGX map editor on suite (77 ms)`, and the control still FAILs with
  the one sentence about `fontSize`.
- `./todo-list`: no file newer than the kit's install.

### One thing my tests got wrong, and fixed

The headless browser renders more slowly with the new ships, and one test clicked a card while the
camera was still flying to it, so the click landed on the wrong spot and the first rewire was
skipped. A probe showed that every card picks correctly once the camera has stopped. The tests now
wait for the flight to end (`waitFor: "!__map.map.flight"`) before clicking.

### Not checked

- **The sound effects were not tested.** No test checks that they play; only the music's audio was
  checked as running. Nobody listened to either here.
- As before, speed on a real graphics card wasn't measured.

## Fifth round: fly an X-wing

*This round was not built by the stranger. Richard asked (2026-10-19): "Any chance for the 'todo list'
Star Wars editor that we can make an 'Xwing' from 1993 game style view where you can fly one of the Xwings
and dog fight with the tie fighters? To give builders a fun break when they get bored." The OpenNoodl
session (Claude Fable 5.1) built it directly in this folder, the same way the stranger worked: on copies,
checked over CDP, written up here. The kit is not touched by it; the cockpit is scenery over the battle.*

### What changed

- **`public/pilot.mjs`, the cockpit.** The **Fly an X-wing** button (or X) saves the map's camera and
  puts you in a fighter: on the first sortie where the camera was, if that is over the fleet, otherwise
  behind the fleet flying its way, with a hyperspace streak. The camera becomes the cockpit (72° view,
  the eye above the hull, a lean into each turn). Esc, the button, or the browser giving the pointer back
  leaves it, and the map's camera flies back to exactly where it was.
- **Flying.** A click takes the pointer (pointer lock); the mouse is then a self-centring stick. The
  arrows do the same; A / D roll; W / S or the wheel set the throttle (28–115 m/s; the fighters fly
  55–80). The ship cannot leave the battle: the edge of the fleet's box, plus 350 m, holds it and
  the HUD says to turn back. A key tapped between two frames still counts on the next one.
- **Cannons.** Space or the button held fires the four cannons in diagonal pairs, 0.14 s apart,
  converging 320 m ahead, at 430 m/s to 700 m; each shot costs laser energy that recharges. Every bolt
  is the battle's own `fire()` with a new `hits(at, from)` step test: the segment a bolt moved this
  frame is checked against every TIE (4.5 m) and every capital hull. A TIE hit is `battle.kill` (the
  same fireball and ring, the same respawn); a hull hit bursts on the plating.
- **The TIEs fight back.** The battle has a `setPlayer` seat: when a TIE picks a target, it takes you
  instead with a chance that grows as you come closer (40 % inside 250 m, 20 % inside 700 m). Their
  shots and hits are the rules the fighters already play by (dead ahead, inside 170 m, 18 % a volley);
  a hit on you is 20 shield points, a red wash, a burst on the canopy and a thud. At zero the ship
  explodes, "SHIP LOST", and a new one arrives 2.8 s later; kills and losses are kept. All fighters'
  aimed shots now lead their target by its speed over the bolt's flight (they used to aim at where it was).
- **The HUD** (a 2D canvas over the map, `#cockpit`): the canopy struts, the reticle, the target's
  bracket with its distance (amber in range), the diamond where to lead it, an edge arrow when it is
  off the view or behind, the FORE and AFT scopes with every fighter as a dot (TIEs red, X-wings green),
  the targeting computer with the TIE's wireframe, SHIELDS, LASERS, THROTTLE, SPEED, KILLS and LOST,
  and the key help. The running app's box hides while you fly, since the console sits where it does.
- A `hit` sound in `sfx.mjs`. `map3d.mjs` hands the camera and the controls to the pilot while it is
  active (`frame` is now `steer` + `render`); `__map.pilot` is on the page for the console and tests.

### How it was tested (fresh copies of `todo-list`, headless Chrome on software GL)

`tests/pilot.json`, four drives while building, the last one clean:

- The button: active, the HUD up, the camera 1 m from the ship, 72°, the running app's box hidden,
  the button reads "Back to the map", the battle on.
- ArrowLeft held: the heading turned (7–20°, by how many frames the hold caught). W: the throttle rose.
  Space: shots counted, bolts in the battle.
- **The aimed shot:** a TIE held 60 m dead ahead, Space: `kills` 0 → 1, the battle's effects up (the
  fireball). This is the gate for the cannons' hit test.
- The assist (R2 steering) for 20 s: the TIEs hit back (shields 100 → 82 → 88, `hitsTaken` 1). In an
  earlier drive it was shot down and came back (`deaths` 1, shields 0 → 100). In two earlier drives
  it scored 1–2 kills by itself.
- `dirtyCount` 0 and 80 plates throughout: nothing reached the model. The copy of the app is
  byte-identical to the template after every drive.
- Esc: out, the HUD down, 60°, the map's camera back **0 m** from where it was, the app's box back;
  X in and out again.
- The earlier tests still pass: `hover.json` (21 wires level, balls, W flies level) and `battle.json`.

**Why the kill is not gated on the assist:** on software GL this page draws about one frame a second,
and the frame step is capped at 0.1 s, so 20 s of wall clock is 4 s of game (`pilot.time`); whether
the assist scores in that time is luck. The aimed shot is the deterministic check.

### Not checked

- **The mouse stick.** Headless Chrome does not grant pointer lock, so no drive flew with the mouse; the
  arrows flew every drive. Richard's hand on it is the check.
- Speed on a real graphics card, as before; the sounds, as before (nobody listened).
- The balance (how hard the TIEs are) was set by reasoning, not play: 20 a hit, 5 a second back.
