# OWN-012 — The screen, from the descriptions

**Opened 2026-10-10 (s4), from R4's ruling: *teach both equally*** (README §8). **Depends on OWN-004** (the real app
beside it, `preview.elementsOf`, the trace) **and P107 NSP-016 AC4** (the layout model).
**Status: 🟢 BUILT — all four steps and all four ACs (s3, 2026-10-19, Opus 5.5).** Step 4: Orbit's third pose draws the screen on the 3D phone from the descriptions (a WebGL texture painted with the drawer), the real app one press away; graded the way steps 1–3 were, 8 of 9 boxes at 0 px and the clock named, the no-gap mutant exits 1. AC3: the drawer is used by `orbit.html` and adds 21 KB gzipped to it. AC4: the brief teaches both ways in one table with what each costs. **Not published:** `@nodegx/node-spec/draw` (the drawer has never been on npm; node-spec is 0.1.0 there) and the brief ride lane 1's next npm cut (§6 s3, "For the cut"). Steps 1–3 (s1–s2, 2026-10-18): the drawer in `@nodegx/node-spec`, 316 fixture boxes matched, the todo template's sign-in page graded with 0 layout-model defects, P112-OWN012-FONTDEFAULT filed.
**Model:** **Opus** for step 1 (a measurement with a clear finish line); **Fable** for steps 2–3, a drawer graded
box by box against a browser, where a wrong reading of the layout model becomes every editor's wrong screen. At the
start of a session on this task, and again if the work changes kind, say which model you are running on and whether
this line says Richard should switch (README §0.2). **s3 ran on Opus 5.5:** step 4 put a finished drawer on a texture and AC4 was a
brief change, both with a gate already written; Opus was the right model and no switch was needed.

## 1. The person sentence

> **My home-made editor can draw my app's screen itself, from what each node says it draws — in my own look, on a
> canvas, on a 3D object — and it shows me exactly where its drawing and the real app disagree.**

## 2. Why

R4 was re-asked on 2026-10-10 with Orbit's real app running beside its graph (OWN-004 §6.2). Richard ruled that the
method teaches both ways equally: show the real app (OWN-004, built), or draw the screen from the node descriptions.
Drawing is what an editor needs when an iframe cannot go where the screen goes: Orbit's first phone was a WebGL
texture painted by the page, and an iframe can never be one. It is also what a native editor, or one with its own
look, would do.

What exists to draw from, measured 2026-10-10:

- **18 of the 19 visual nodes have a spec** (P107 NSP-016, 2026-10-09). A visual spec states each port's meaning and
  its class (`portability`: `logic`, `layout-shared`, `look-shared`, `web-only`, …) and, for layout ports, which slot
  of the layout model it fills (`layout: 'align-x'`, `'height'`, …). It says what a person gets, not how a renderer
  gets there (P107 R11): no CSS.
- **A layout model** in `@nodegx/node-spec` (`src/layout.ts`, NSP-016 AC4): children stacked along an axis or laid
  over each other, alignment, gap, padding, sizes that hug, are a length, or fill a share, min / max, resolved the way
  flexbox §9.7 resolves them; `src/layout-map.ts` maps the layout inputs onto it; fixtures in `layout-fixtures/`
  graded against a browser. Its header names what it does not say: wrapping, text whose height depends on its width,
  `fixed` / `sticky`, baseline alignment, a stylesheet's rules.
- **The real boxes to grade against**: `preview.elementsOf(nodeId)` (OWN-004 s4) gives the element each visual node
  draws in the real app, so a drawing can be compared node by node with `getBoundingClientRect()`.

What drawing alone cannot do: run the app. A drawn screen needs the values on its wires, and they come either from
the real app's trace (draw what the real app has) or from a graph runner (OWN-003, R1). Equal teaching means saying
that plainly, not hiding it.

## 3. What to build

1. **Measure first (Opus).** Draw Orbit's nine visual nodes (`prototype/real/orbit/`) from the specs and the layout
   model alone, values from `onTrace`, on a 2D canvas beside the real app. Per node: the drawn box against the real
   one, and every input the drawing needed that no spec or model gave it (fonts and text measurement are the expected
   first two). The FLD-004 trap is a test case the model should already get right: a number wired into the width of a
   child of a row is a share, not a percent (OWN-004 §6.2).
2. **A drawer a home-made editor calls** (Fable): files + values in, boxes and a drawing out, no CSS read or written;
   lives with the layout model or beside the preview (decide in step 1, with the measurement).
3. **The grade**: one command that draws a template's pages and compares every visual node's box with the real app's,
   in px, and names each difference as either a named limit of the layout model or a defect (filed, `kit: node-spec`).
4. **Orbit shows both**: a third pose for the app in `orbit.html` — the screen drawn from the descriptions on the 3D
   phone, the way the first prototype drew it by hand, with the real app one press away.

## 4. Acceptance criteria

1. Orbit's screen is drawn from the descriptions alone (no CSS, no runtime DOM read except to grade), and every visual
   node's box is within 2 px of the real app's, or the difference is named as a limit the layout model states.
2. The todo template's first page is drawn and graded the same way, and every difference is named or filed.
3. The drawer is a function a home-made editor can call, used by `orbit.html`, with the size of what it adds to a page.
4. The brief (OWN-007) teaches this way and the real app side by side, each with what it costs, as R4 ruled.

## 5. Watch for

- **Do not copy the runtime's layout code.** A second copy of `Layout.size` drifts (memory: *a second copy of a palette
  drifts silently*); the layout model is the description, and the grade is what keeps it honest.
- A box that matches is not a screen that matches: colour, text and clipping are look, graded separately if at all.
- The one visual node with no spec yet (NSP-016's remaining one) is named, not guessed.

## 6. Built

### s1 (2026-10-18 night, Opus 5.5): step 1, the measurement

**What was built.** `own-012/draw.ts` takes files and values in and gives boxes out: a component's nodes as the files
store them, the values its wires carry, the viewport, and a caller's measurer for a leaf's content. It's the recursion
over a visual tree that the layout check (`nodegx-node-spec/tests/layout-check.test.ts`) leaves out. That check takes
each parent's size from the browser and grades one level. Here, only the leaves' text comes from outside, and every
other size is the model's own (`layoutOf`, `layoutChildren`, `hugSize`). It reads and writes no CSS and copies none of
the runtime's layout code. `prototype/real/drawn.html` runs Orbit's real app in `@nodegx/preview`, takes the wired
values from its trace, draws the same screen on a 2D canvas beside it, and grades each visual node against
`preview.elementsOf(id)` (read to grade only). `own-012/measure.mjs` drives it headless, one Chrome at a time, and
writes `own-012/measured/`. `own-012/build.sh` bundles the drawer.

**The result, Orbit at 390×844 and 1280×800** (`measured/measure-*.json`, `drawn-*.png`):

| node | Δ from the real app |
|---|---|
| screen, phaseTxt, track, bar, footTxt, btnRow, pauseBtn, skipBtn | **0 px** on x, y, width and height, both viewports |
| timeTxt (the clock) | width −10.4 px (x +5.2 px, the centring of it): **named limit, measured** |

The clock's 10.4 px is the Text spec's *Numerals: tabular-nums*, which a canvas can't apply (it has no font-feature
setting). **Control:** in the real frame, the clock's own font measures "24:59" at 269.09 px with tabular-nums (the
real box exactly) and 258.69 px without it, and the canvas gives 258.68. So it's a limit of measuring text on a
canvas, not of the layout model: the measurer reports it on the node (`limits`), and the grade names it.

**The two arms with teeth:**
- **The FLD-004 trap (`--variant row`)**: Orbit's track is turned into a row in memory, for both sides. The bar's
  wired value (about 0.067 at the moment graded) then draws 21.4 px of 318 at 390 wide and 81.3 px of 1208 at 1280
  wide, the real app's boxes to 0 px: a share of the free space, not a percent. In the column, the same value draws
  0.2 px, as the real app does. The layout model already gets it right.
- **A mutant (`--mutant nogap`)**: the drawer alone loses every gap. 6 of 9 nodes go off at both viewports (phaseTxt
  +32 px, the buttons 14 px across and 32 px up), and `measure.mjs` exits 1.

**A trap found on the way: a moving screen.** Orbit's clock ticks and its bar eases for 800 ms, and the trace is read
every 150 ms. A drawing from the last trace value can be one read behind the box it's graded against. The row
variant measured +3.4, −3.3 and −3.3 px on the 1208 px row over three runs: the sign flipped, so it was timing, not
the model. The page now presses Orbit's own Pause and waits for the ease to finish before it draws (`stilled: true`,
the trace unchanged across 600 ms). `?still=0` grades the moving screen. A drawer fed by a trace draws what was, not
what is. Grading it needs a still screen, and an editor drawing a live app will lag by one read.

**What the drawing needed that no spec or model gave it** (the step's question):
1. **The values on the wires**: the real app's trace. A drawn screen can't run the graph (§2): five of the nine
   nodes show a wired value (three texts, a label and the bar's width).
2. **The text's content size**: the model doesn't measure text, as its header says. A canvas measured it, in the
   font the system resolves `system-ui` to.
3. **Line Height Auto**: the font's own (ascent + descent, read from the font by the canvas). The spec says "follow
   the font" and gives no number. It matched to 0 px on all three texts.
4. **Numerals: tabular-nums**: a canvas can't measure it (above). A DOM measurer could, but that's CSS.
5. **The root's parent**: the app's root element is the viewport's size and stacks down. No node and no spec says
   so. It's an assumption in `draw.ts`, and the grade held it (the screen at 0 px).
6. **Not needed by Orbit, but open in the spec**: the Text spec gives no default Font Size or Font Family (every Orbit
   text sets both). A text that sets neither would be drawn at a guessed 16 px in `system-ui`, and the measurer says
   so as a need.

**Step 2's decision: the drawer lives with the layout model, in `@nodegx/node-spec`.** It needs only the specs and
the layout model, and nothing from the preview. Values come from whoever has them (a trace, or the graph runner),
and text is measured by the caller (a canvas measurer can ship beside it as a helper). **What it adds to a page:**
`draw.ts` is 2,285 bytes minified, and the layout model with its mapping is 11,673. The bundle is 1.27 MB (324 KB
gzipped) because the browser entry brings every node's full spec (1.15 MB, `src/nodes/`): runners, scenarios and
descriptions a drawer never reads. That's P107-SIZE's row. A drawer-only entry, carrying each visual spec's inputs
and layout roles, would be small, and step 2 should measure it.

**Not done in step 1:** Orbit's screen on the 3D phone (step 4), the todo template's first page (AC2), and the
brief (AC4). Look (colour, corner radius, clipping) is drawn roughly and not graded (§5). Rounded corners aren't
drawn at all.

### s2 (2026-10-18, Fable 5.1): steps 2 and 3 — the drawer in the package, and the todo page graded

**Step 2, what was built.** The drawer moved into `@nodegx/node-spec` beside the layout model:
`packages/nodegx-node-spec/src/draw.ts` (`createDrawer(specs)`, the public types, and a header in the style of
`layout.ts` that lists the eight things a drawing needs that no spec gives — wire values, a leaf's content, the
root's parent, the Router and the Page, a placed component, a For Each, text that wraps, a setting outside the
model). It now draws a whole project, not one component: a placed component's visual roots stand in its place (as
the runtime places them), a Router shows the page a caller names (else its start page), a Page and a Router are drawn
by the two rules their runtime elements have (read once, named as assumptions, graded below), and each box carries
a `path` (the placed components' ids, then its own) so a component placed twice gives two boxes and a value can
reach one of them. `src/draw-canvas.ts` is the canvas text measurer, typed without the DOM library, reporting the
same needs and limits `drawn.html`'s `measure()` did and now the Button's paddings and border and the Text Input's
label line. `src/draw-full.ts` binds the drawer to the full spec table and is what `src/browser.ts` exports;
`own-012/draw.ts` is a thin re-export, and `own-012/build.sh` bundles `own-012/entry.ts`.

**The small entry.** `src/draw-only.ts` carries the drawer, the measurer, the layout model and
`src/draw-specs.generated.ts`: for the 17 types whose spec gives an input a layout role, every input's `default`,
`layout` and `portability` — the three fields `layoutOf` and the drawer read — written by
`scripts/gen-draw-specs.mjs` from `src/nodes` and held equal to the live table by `tests/draw-specs.test.ts`
(a spec edit that moves one of those fields fails until the file is regenerated; `--check` exits 1). Not a hand
copy: a derivation with a gate. `scripts/draw-size.mjs` (esbuild, minified, `fast-xml-parser` external):

| entry | minified | gzipped |
|---|---|---|
| `draw-only` (drawer + measurer + model + table) | 82.6 KB (84,551 B) | **12.1 KB** (12,385 B) |
| `draw-full` (the same drawer over the full specs) | 1,210.7 KB | 308.2 KB |
| `browser` (the whole browser entry, P107-SIZE) | 1,391.4 KB | 361.1 KB |

Inside the page's bundle (`drawn.js`, 103,129 B): the table 63.1 KB, the default tokens 17.5 KB, the drawer 6.8 KB,
the layout model 11.6 KB, the measurer 2.8 KB. A page that only draws pays 12 KB gzipped, not 308. The numbers are
on the P107-SIZE row.

**The tests** (`tests/draw.test.ts`, `tests/draw-specs.test.ts`; `nice -n 19 npx jest --runInBand`, exit 0, 20
passed; `tsc --noEmit` exit 0; the sibling `layout-check` and `layout-map` suites 747 passed, exit 0). The
fixtures are graded top-down: the project `layout-measure.js` builds around each fixture (an App Group 100% × 100%,
a Router, the fixture's Page) is drawn from the files with only the leaves' recorded sizes given, and every box
— the Page included — is compared with the recording's `box` at 0.5 px. **316 matched.** KNOWN has 6 rows, all the
one limit the model's header names (flexbox's automatic minimum): `g1` on `min-content-floor` at both viewports, as
the layout check has it, and the Page on `scroll-align` and `scroll-slides` at both, where the content is 1600 /
1200 px tall and the browser keeps the Page at its content while the model shrinks it to the window — every box
inside still matches, a column stacks from the top either way. Two mutant arms go red: the drawer losing every gap
(new mismatches on `column-gap`, `text-row`, `button-row`) and a table whose Group has no cross-align role
(`header-row`, `justify-space-between`); a third shows that without an axis role nothing below the App Group is
drawn. The small table draws the same boxes as the full one on every fixture (asserted). Placed components, a
value by path and by id, a For Each, a missing component, files with `children` lists only, Body Scroll and the
labelled Text Input each have a row.

**Step 3, the grade on the todo template.** `own-012/measure.mjs --project <folder>` drives
`prototype/real/drawn.html?project=…` for any project folder beside `serve.mjs`; the todo template is a copy there
(`todo-list-copy/`, gitignored — `templates/` untouched). The page draws every component by path with the tokens
from the project file and `@nodegx/project-contract/tokens` (not from CSS), follows the page the real Router shows,
matches each box to the real element by path (the runtime's scopes walked once, to grade), and gives each
difference a verdict that follows the cause: `within 2 px`; named by the node's own setting (a limit the model or
the measurer states, or an assumption the drawer names); `holds` a descendant that is off (a hugging parent is its
children); `follows` a parent or an earlier sibling that is off (a stack places what came before); `placed by its
own size` (an end-aligned box); or OFF, a defect counted once at its source. Exit 0 when nothing is OFF.

**What the first page is without a backend.** The start page is `/Pages/Todo`, but its User node finds no session
and the page's own `RouterNavigate` sends the app to `/Pages/Sign in` — so that is what the real app shows and what
is drawn (`pages: {"app_router": "/Pages/Sign in"}`; the preview reported `ok`, no page errors). The Todo page
itself needs a signed-in user: a backend with the todo collections, and a session. Nothing was faked.

**The result, the sign-in page at 390×844 and 1280×800** (`measured/measure-todo-list-copy-*.json`, the two
`drawn-todo-list-copy-*.png`; the same verdicts at both viewports — only x and widths change with the width):

| box (path) | drawn (390×844) | real | Δ x,y w×h | verdict |
|---|---|---|---|---|
| `app_root` Group | 0,0 390×465.5 | 0,0 390×504.5 | 0,0 0×−39 | holds siRoot (the three below) |
| `app_router` Router | 0,0 390×465.5 | 0,0 390×504.5 | 0,0 0×−39 | assumption (no size/axis role); holds |
| `app_router/siPage` Page | 0,0 390×465.5 | 0,0 390×504.5 | 0,0 0×−39 | assumption (no spec yet); holds |
| `siRoot` Group | 0,0 390×465.5 | 0,0 390×504.5 | 0,0 0×−39 | holds siCard, thRoot |
| `siTop` Group | 16,16 358×74 | 16,16 358×75 | 0,0 0×−1 | **within 2 px** |
| `siTheme/thRoot` Group | 318.1,16 55.9×26 | 348.4,16 25.6×27 | −30.2,0 30.2×−1 | holds thToDark; placed by its own size |
| `siTheme/thToDark` Button | 318.1,16 30.2×26 | none (0×0) | — | **named**: `cssClassName` (web-only) is set — the project's CSS Definition hides `.todo-theme-to-dark` in dark mode (R17) |
| `siTheme/thToLight` Button | 348.4,16 25.6×26 | 348.4,16 25.6×27 | 0,0 0×−1 | **within 2 px** |
| `siCard` Group | 16,90 358×311.5 | 16,91 358×349.5 | 0,−1 0×−38 | holds siLead (−34), siEmail, siPassword (−2 each) |
| `siTitle` Text | 41,115 308×27.5 | 41,116 308×27.5 | 0,−1 0×0 | **within 2 px** |
| `siLead` Text | 41,158.5 308×17 | 41,159.5 308×51 | 0,−1 0×−34 | **named limit** (layout.ts header): its content is 715.9 px in a 308 px box — the text wraps to three lines, the model takes one content size per leaf |
| `siEmail` Text Input | 41,191.5 308×59 | 41,226.5 308×61 | 0,−35 0×−2 | size within 2 px; follows siLead |
| `siPassword` Text Input | 41,266.5 308×59 | 41,303.5 308×61 | 0,−37 0×−2 | size within 2 px; follows siLead, siEmail |
| `siButtons` Group | 41,341.5 308×35 | 41,380.5 308×35 | 0,−39 0×0 | size exact; follows the three above (`flexWrap` is set, named, but the row did not wrap) |
| `siSignIn` Button | 41,342.5 77.6×33 | 41,381.5 77.6×33 | 0,−39 0×0 | size exact; follows siButtons |
| `siCreate` Button | 126.6,341.5 137.1×35 | 126.6,380.5 137.1×35 | 0,−39 0×0 | size exact; follows siButtons |
| `siError` Text | not mounted | none | — | absent on both |

Read by cause: **two root causes, both named limits, zero defects of the layout model.** (1) `siLead` wraps: the
one limit the header states for text, 34 px here, and every shift below it (−35, −37, −39) is that 34 plus the two
fields' 2 px. (2) `thToDark` is hidden by a stylesheet rule the file carries as a `web-only` class, so the theme
row is 30.2 px narrower in the real app and its right-aligned box moves by that. Everything whose own size the
model and the measurer could say is within 2 px: both buttons' labels with their paddings exact (77.6×33,
137.1×35), the title, the top row, the theme button, and the two fields at −2 px once the label above the field was
measured (Enable Label, Spacing, the label's font size — all ports of the spec; the 2 px left is the browser's own
line box for an `<input>`, reported as a need). **What the page needed that no spec gave, beyond step 1's six:**
(7) **Body Scroll** — the project's `settings.bodyScroll: true` makes the app's root element `height: auto;
min-height: 100vh` (the deploy page), so the App Group's 100% height is its content (504.5 px at both viewports, not
844 / 800); the drawer takes `bodyScroll` and reports it. Before this the root chain read OFF at +339.5 px. (8) The
**Text Input's label** (above). (9) **Font Family** — nine nodes set a size and no family; the specs give neither
a default, so the measurer assumes the browser's and says so: **filed, P112-OWN012-FONTDEFAULT** (`kit: node-spec`,
low — the pixels matched, the description is incomplete). Look is not graded and shows it: the real app is in dark
mode (headless Chrome's preference, the CSS Definition's media query) while the drawing paints the project's light
tokens.

**Orbit again, through the same page:** 8 of 9 at 0 px at both viewports, the clock named, as in s1
(`measured/measure-390x844.json`, `-1280x800.json` re-recorded). The no-gap mutant on Orbit at 390×844 exits 1:
`phaseTxt` OFF (+32 px) at its source and five boxes reading as its consequences (`follows`), where s1's page
counted six off.

**Gates run:** `tsc -p tsconfig.json --noEmit` exit 0; `jest --runInBand tests/draw.test.ts tests/draw-specs.test.ts`
exit 0 (20 passed); `jest --runInBand tests/layout-check.test.ts tests/layout-map.test.ts` exit 0 (747 passed);
`node scripts/gen-draw-specs.mjs --check` exit 0; `node scripts/draw-size.mjs` exit 0; `node measure.mjs --project
orbit` exit 0; `node measure.mjs --project todo-list-copy` exit 0; `node measure.mjs --project orbit --viewports
390x844 --mutant nogap` exit 1 (as it must); `node scripts/bugs.js check` exit 1 on 99 rows that predate this
session, none of them this one's.

**Not done in s2:** step 4 (the 3D phone pose in `orbit.html`) and AC4 (the brief). The todo page's own screen
(`/Pages/Todo`) is not drawn: it needs a session. A width-aware text measurer would turn the wrap limit into a
measurement (the drawer would hand the measurer the width the box got, a second pass), and is the next thing a
drawer of real pages wants.

### s3 (2026-10-19, Opus 5.5): step 4 — the drawn phone in Orbit — and AC4, the brief

Lane 2, worktree `l2-own012` from `cline-dev` `e7e3e77db`. Re-measured first: s2's grade reproduced exactly on this
checkout (Orbit 8 within 2 px and 1 named at both viewports; the todo sign-in page 3 within, 1 absent, 13 named, 0 OFF,
exit 0 each), with the runtime taken from the primary checkout (`measure.mjs --runtime`, new: a worktree has no
gitignored build output).

**Step 4, what was built.** `prototype/real/orbit.html` has a third pose beside *App in the scene* and *App in a
window*: **Drawn from the descriptions** (`?pose=drawn`). The phone in the scene is a WebGL plane, a child of the same
object the real app is posed with, whose texture the page paints itself: the drawer (`drawn.js`, the drawer-only entry)
turns the project's files and the values the running app's trace sends into boxes, and `draw-page.mjs` paints them in
each node's own colours (background, corner radius, the track's clip, text, button labels) inside an 8 px bezel. The
real app keeps running behind it at opacity 0, unpressable, because it is where the values come from (and which page a
Router shows). One press on *App in the scene* puts it back. In the drawn pose the leader lines point at the drawn
boxes, not the real elements, and pointing at the drawn phone lights the card of the box under the pointer (a raycast
into the drawing, no DOM). Every edit is picked up: the drawing re-reads the files whenever the app is rebuilt from them.

The page's half of the drawer moved out of `drawn.html` into `prototype/real/draw-page.mjs`, which both pages import:
`projectParts` (the files as the drawer takes them), `drawProject`, `realElements` (read to grade and to follow the
Router, never to draw), `gradeDrawing` (s2's verdicts, unchanged) and `paintDrawing`. **Control:** `drawn.html` on it
gives the same grade as before, every row, verdict, drawn box, real box and need equal to the baseline at both viewports
for Orbit and the todo page (`measure.mjs` exit 0 both).

**The grade** (`own-012/measure.mjs --page orbit`, new): orbit.html opens in Orbit with the drawn pose in a 1440×900
window. The phone's screen is the app's own size there, 380×680, so that is the viewport. The page presses Orbit's
Pause in the real app and waits for a still trace (s1's trap). `__orbit.drawn.grade()` then draws once and reads the
real boxes at the same instant, through the same verdicts (`measured/measure-orbit-pose-orbit.json`):

| node | drawn (380×680) | real | Δ x,y w×h | verdict |
|---|---|---|---|---|
| screen | 0,0 380×680 | 0,0 380×680 | 0 | within 2 px |
| phaseTxt | 137.7,180 104.6×26 | the same | 0 | within 2 px |
| timeTxt | 60.2,222 259.6×123 | 55.5,222 269.1×123 | 4.7,0 −9.4×0 | **named**: tabular-nums, which a canvas can't measure (s1's limit; "23:45" here) |
| track | 36,361 308×8 | the same | 0 | within 2 px |
| bar | 36,361 15.4×8 | the same | 0 | within 2 px |
| footTxt | 56.8,385 266.3×23 | the same | 0 | within 2 px |
| btnRow | 56,448 268×52 | the same | 0 | within 2 px |
| pauseBtn | 56,448 120×52 | the same | 0 | within 2 px |
| skipBtn | 204,448 120×52 | the same | 0 | within 2 px |

**8 of 9 at 0 px, the clock named, 0 OFF, exit 0.** The bar's wired width (5 %, at the paused moment) drew 15.4 px of
308 as the app does. **Mutant:** `--mutant nogap` (the drawer alone loses every gap) reads `phaseTxt` OFF at +32 px at
its source, five rows named as its consequences, and exits 1 (`measure-orbit-pose-orbit-mutant-nogap.json`).

**The picture for Richard's read:** `own-012/measured/orbit-drawn-orbit.png` (the drawn phone in Orbit) beside
`own-012/measured/orbit-real-orbit.png` (the same moment, one press later, the real app on the phone). They are hard to
tell apart; the clock's digits are the tell.

**Orbit's own gate** (`prototype/real/check.mjs`) gained a drawn block: the phone is drawn (9 boxes), a real mouse press
on the drawn Pause lands on the picture and not the app, one press on *App in the scene* brings the real app back, and a
press on Pause reaches it. **It found a defect in the new pose on its first run:** the press on the drawn Pause reached
the app (`hit IFRAME; the app received ["Pause@116,474"]`), because three.js's `CSS3DObject` sets `pointer-events: auto`
inline on the element, which beat the pose's class rule. With `!important` the row is green: 46 ok, PASS, exit 0
(`check.mjs --site` against a `serve.mjs --runtime` of this worktree). The red run is the row's mutant.

**AC3, what the drawer adds to orbit.html:** `drawn.js` 103,129 B minified (15,563 B gzipped: the drawer, the measurer,
the layout model, the generated table and the default tokens) and `draw-page.mjs` 14,343 B (5,347 B gzipped): **about
21 KB gzipped**, against the page's existing `specs.js` at 321 KB gzipped. `serve.mjs --out` copies both, so a static
copy (nodegx.io/orbit/) carries the pose once it is rebuilt. `prototype/real/build.sh` now builds `drawn.js` too.

**`@nodegx/node-spec/draw`** (`bdbb88602`): the brief tells a stranger to import the drawer, so the drawer-only entry is
a subpath in the exports map, ESM and CJS, built by `build.mjs` from `src/draw-only.ts`. It imports nothing by bare
name (0 references to `fast-xml-parser` in its bundle, unlike the main entry: NODESPECBARE). `scripts/draw-size.mjs`
today: draw-only 85,646 B minified, **12,778 B gzipped** (s2 measured 12,385 on an older base); the whole browser entry
370,375 B gzipped. `tests/draw-specs.test.ts` holds the map to what `build.mjs` writes and the entry to what a page
needs; renaming the CJS outfile in `build.mjs` turns it red. Not built here (`dist/` is the primary checkout's).

**AC4, the brief** (`cebab5481`, `packages/create-nodegx/profiles/core/skills/nodegx-your-own-editor/SKILL.md`). The
Screen row of the six questions names both ways. The node-spec paragraph no longer says "It doesn't draw the screen …
Show the real app"; it says a visual spec gives each layout port's role, and to show the real app or draw it with the
kit's drawer. A new section, **"The screen: show it or draw it"**, opens with "NodeGX teaches both ways equally" and a
table: what you get, where it can go, what it loads (**about 3.6 MB** of scripts for the real app, from the published
`@nodegx/preview` 0.2.2: in-page bundle 1,704,069 B, engine 1,747,974 B, React 142,586 B; **12.5 KB gzipped** for the
drawer), whether it runs the graph, how exact, whose look. Then when to pick which (Orbit does both), the drawer's call
with the trace as its values, where the tokens come from, the version that has it ("0.1.0 has no drawer"), and what to
know: a drawing can't run the graph and lags one trace batch; every box carries its `needs` and `limits`, to be shown;
the five named limits with their measured sizes; and how to check a drawing against the app (2 px, a reason for every
difference). "What your editor must not do" gains "Show a drawn screen as if it were the app." The prose went through
the content-authoring offline checks (`written`, `closer`, `opener`, `figures`) until `written` flagged nothing; every
figure is from this file. The brief grew from 22,054 to 27,480 bytes; it has no size budget or test of one.
`create-nodegx/test/create.test.js` gained a row for AC4 (the section, the two-way table and its cost row, the import,
the version line, the five limits, the old sentence gone): 26 of 26 pass, exit 0; renaming the table's cost row turns
it red.

**Gates run (s3):** `measure.mjs --page orbit` exit 0; the same with `--mutant nogap` exit 1 (as it must);
`measure.mjs --project orbit` and `--project todo-list-copy` exit 0 (rows equal to the baseline); `check.mjs` exit 1
(the pointer-events defect), then exit 0 (46 ok); `jest --runInBand tests/draw-specs.test.ts tests/draw.test.ts` exit 0
(22 passed; the new entry row red under its mutant); `tsc -p tsconfig.json --noEmit` exit 0; `gen-draw-specs.mjs
--check` exit 0; `draw-size.mjs` exit 0; `create-nodegx` `node --test` exit 0 (26 passed; the AC4 row red under its
mutant). Not run: `test:main` / `test:ci` (nothing the editor imports changed).

**For the cut (lane 1's next npm release):** `@nodegx/node-spec` has never shipped the drawer (npm has 0.1.0). The next
release carries `src/draw*.ts` (s2) and the `./draw` export (`bdbb88602`). `create-nodegx` carries the brief
(`cebab5481`), whose drawer section says "after 0.1.0", so the two should go out together. The public Orbit
(nodegx.io/orbit/) gets the drawn pose when it is rebuilt with `serve.mjs --out` after `build.sh`.

**Not done, and next:** a stranger who builds an editor whose screen has to go where a frame can't, from the published
kit after the cut, would grade AC4 the way OWN-008 graded the brief. A width-aware text measurer (the drawer hands the
measurer the width a box got, in a second pass) would turn the wrap limit into a measurement. The todo template's own
Todo page needs a backend and a session to draw.

