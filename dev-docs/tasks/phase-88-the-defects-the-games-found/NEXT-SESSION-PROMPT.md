# Phase 88 — next session

**Read first:** [`README.md`](README.md) §3 (what scoping corrected), §4 (rulings, the ruled table first) and §7 (rules). Then read
the whole task you pick, including its §8.

**The board (2026-09-17, end of session 24), re-derived from the 28 task files' status lines:** **16 🟢 with named remainders,
9 ✅ done, 2 ✅ closed by ruling, 1 ⬜, 0 🟡.** Everything this session touched is committed (`19b3517d3`, `238c455e9`).
- ✅ done, nothing owed: GAM-010, GAM-011, GAM-012, GAM-019, GAM-020 (R24), GAM-021, GAM-022, GAM-023, GAM-024.
  ✅ closed by ruling: GAM-004, GAM-025.
- 🟢 with remainders, each named in its own status line: GAM-001, 002, 003, 005, 006, 007, 008, 009, 013, 014, 015, 016, 017, 018,
  **026** and **027** (the last two built this session). 🔴 Remainders that say "the peer's files/tree" about Rocket School are
  **STALE** — s22 regenerated and committed it, so those halves are drivable.
- ⬜ **GAM-028** (an app knows it is on a touch screen) — nothing built, but **R27 is now ruled**, so it is ready to start.

## What session 24 did (all committed, over `653905d1e`)

- **GAM-026 🟢 — the ring goes on the box a person sees, `19b3517d3`.** The current Checkbox, Radio Button and Dropdown hide their
  focusable element at `opacity: 0` **inside** the wrapper that draws the visible box, so session 23's ring matched
  `:focus-visible`, read `solid`, and painted nothing. Now `.ndl-controls-pointer:has(> …:focus-visible)` rings the wrapper.
  🔴 The Dropdown's `<select>` carries **no control class** (`Select.tsx` passes `props.className` through), so it is matched by
  element; `ndl-controls-select` is the **deprecated** node's.
- **GAM-027 🟢 — a Button can keep the cursor, `238c455e9`.** A `Keeps Focus` port (default off, Button only) cancels `mousedown`,
  composed onto the handler `controlEvents` already built (FH-015: appending after the spread *replaces* it).
- **Three rulings answered by Richard and recorded** — R25 (GAM-026), R26 (GAM-027), R27 (GAM-028). See §4's ruled table.

## Richard's three answers, and the one that was already true

- ✅ **R25 — "yes" to a Modern ring and "yes" to a width token.** 🔴 The first half **needed no change**: Modern's preset file is
  empty *because Modern IS the defaults*, and the defaults declare `--ring: #2563eb`. Measured in a deployed page — a project
  declaring no `--ring` of its own still reads it, because the runtime injects the defaults underneath. GAM-026 §2's "Modern
  declares none" is corrected in place. The width half is built: **`--ring-width`, 3px**, in the shared token vocabulary.
- ✅ **R26 — a `Keeps Focus` port on the Button, default off, Button only.** "A Button never takes the caret from a text field"
  was offered and **declined**, so a click still focuses the button in every app ever built. The other `-2` controls do not get it.
- ✅ **R27 — GAM-028 is a `Device` node with named boolean outputs, and it reports `false` during a server render** (the client
  corrects it on arrival; an output that never arrives is GAM-013 s20's never-quiet render). (b) a general `Media Query` node and
  (c) a port on Text Input were declined. The price — a new built-in node's full surface, GAM-013 §8 counted 14 — is accepted.

## State of the tree (session 24)

- 🔴 **No dev stack is running and nothing is watching `src/external`.** Session 24 launched one at 21:50 and tore it down at
  22:13 (25 processes, nothing left). The bundles **on disk carry both of this session's viewer changes** — verified by reading
  the compiled source, not the mtime. Any further viewer edit needs a rebuild of your own, or a stack.
- ✅ **The editor renderer compiles again.** It did not at 22:13 — a peer's in-flight `ComponentsPanelNew` work failed the
  webpack ts check and the editor mounted nothing — and they fixed it at 22:20 (`tsc -p packages/noodl-editor --noEmit` exit 0):
  `SheetSelector.tsx` and `useSheetManagement.ts` are **deleted** by P93 TVW-001 slice 4, sheets being retired, along with the
  `Sheet` type and `CLOUD_SHEET.displayName` those two were reaching for. Still gate on `npm run cdp -- health` reporting
  `reactMounted: true` and read `.logs/dev.log`: a peer's refactor can break the renderer under you at any time.
- **Left behind by s24:** the throwaway project `NodeGX test projects/gam016-ac3-playful`. Its Home page was swapped for the
  GAM-017 kit fixture before the failed reload, so it is **not** a clean wizard output any more — delete it or remake it rather
  than reading it.
- 🔴 **`:8080` is contended and only one stack can exist.** The dev server's port and `publicPath` are hardcoded in
  `packages/noodl-editor/webpackconfigs/webpack.renderer.dev.js`, so a second stack in this checkout dies with `EADDRINUSE`.
  Two peers wanted it this evening. **Ask before launching, and announce the teardown to whoever you asked.**
- ⚠️ **`npm run dev:debug -- --quiet` prints nothing and exits 0 even when the stack never comes up** (`opennoodl-3e`). Gate on
  the CDP port answering (`127.0.0.1:9222/json/version`), never on the launcher's exit code.
- ✅ **A drive that needs no dev stack at all** (`opennoodl-ba`, s24): run the **packaged** app with its own port and profile —
  `NOODL_REMOTE_DEBUG_PORT=9333` against `/Applications/NodeGX.app` — and no `:8080` is taken, so it never contends.
  🔴 **Its boundary:** it answers for the code **that build carries**, not for the tree. Measured in the asar rather than assumed
  from its date: 0.2.4 (built **Sep 12**) has **no** `keepsFocus`, **no** `ndl-controls-pointer:has` and **no**
  `preset-font-nunito`, so it cannot verify GAM-016, GAM-026 or GAM-027 — driving it would read RED for a build that never
  contained the fix. Right instrument for shipped behaviour, wrong one for a source change.
  ⚠️ `ring-width` *did* match in that asar and is a **pre-existing substring**, not the new token: word-match, never substring,
  when a grep decides what a bundle carries.
- **Deploy with `node packages/nodegx-export/dist/cli.mjs deploy <project> <out> --allow-development-engine`.**
  `scripts/devtools/deploy-from-disk.cjs` deploys a *different app* — see the memory note of that name.
- Uncommitted files in the tree are peers': the staged `library/prefabs/date-picker` font deletions were **already staged at
  20:50**, before this session began, and are neither mine nor `opennoodl-ba`'s. Leave them.

## Do, in order

1. 🔴 **GAM-016: the wizard applies a preset's FONT and not its TOKENS.** Driven s24 (first reading of the wizard route, GAM-016
   §8 s24): a **Playful** project ships `preset-font-nunito` and loads its stylesheet, and the canvas still computes **Inter**
   and `--ring: #2563eb` — Modern's defaults — with Nunito `unloaded` and `metadata.designTokens` **empty**. The pending preset
   id is peeked by `installPresetFonts` (`LocalProjectsModel.ts:321`) and `StyleTokensModel._applyAndClearPendingPreset`
   (`StyleTokensModel.ts:400-405`) never lands it; it is a **one-shot**, so reopening cannot repair the project.
   **Next step is instrumentation, not a guess:** log the order of `ProjectModel.instanceHasChanged` / `importComplete` against
   `setPendingPresetId` for a freshly created project, and find which of the three failures it is (never called / wrong
   ProjectModel / already consumed by an earlier reload). Then a test **over the real sequence** — `installPresetFonts.test.ts:86`
   calls peek and consume in the same test, which is a hole shaped exactly like this defect.
2. **GAM-017 AC4 editor half** — a kit signal prop in the editor canvas with a Button's Click wired in. The fixture is ready:
   session 22's project (with `gam017.SignalProp` and a `Fire` Button already wired to its `play`) is copied to this session's
   scratch at `g17ac4/project`. Parked s24 because the renderer would not build (`reactMounted: false`) on a peer's in-flight
   `ComponentsPanelNew` refactor — **since fixed** (22:20, those two files are deleted by P93 TVW-001 slice 4), so this is now
   only waiting on a free box. Check `reactMounted: true` before counting on the canvas.
3. **GAM-028 — now unblocked (R27).** A `Device` node with named boolean outputs, `false` on the server. GAM-013 §8 is the worked
   example of what a new built-in node owes: 14 surfaces, 15 export floor pins, `ssr.compat` decided on purpose. AC1 is a census
   **before** designing. With it, GAM-011 AC7's answer changes — that is the point of building it.
4. **The two remainders this session named**, both small and both honest to leave:
   - **GAM-026 AC7** — the prefab/template corpus is still an argument from the selector plus one fixture.
     `library/prefabs/form` carries the Checkbox, Radio Button and Dropdown in one project; it has **no page and no router**, so
     it needs wrapping before it can be deployed.
   - **GAM-027 AC6** — the export reports `keepsFocus` as **dropped** (`CONTENT_PARAMS` can express `children`, `attr:` and
     `attr-not:`, not an event handler), so a keypad **exported as React code still steals the caret**. That belongs in P18.
5. **The rest of the remainders:** GAM-013's exported app driven in a browser (and its AC8 Rocket School builds); GAM-015 AC3
   editor canvas; GAM-018 AC6 editor half; GAM-003 AC5 (browser, meter from an Expression); GAM-002 AC4 (editor); GAM-001 AC5
   (blast radius); GAM-014 AC6 (Face wrap); the browser/Rocket School halves of GAM-005/007/008/009. **R28's batched work** (the
   one regeneration pass over `tpl007Components.ts`) is still owed and is described in the session-23 handoff in git history.

## Readings taken in session 24 (2026-09-17, over `653905d1e`)

| reading | result |
|---|---|
| GAM-026 AC1, deployed fixture, HEAD's bundle, Tab round 1366×768 | **3 RED of 5** — checkbox/radio/dropdown `fv=true`, visible box one hop up `outline-style: none`; screenshot: the page does not change |
| GAM-026 AC2, after | **ALL PASS**; `solid 3px rgb(124,58,237)` offset 2px on the wrapper; screenshots looked at |
| GAM-026 AC3, mouse arm + Tab arm, one run | **ALL PASS (10)** |
| GAM-026 AC4 contrast, 5 presets × 7 templates × 5 grounds | every ring **≥ 3:1**; worst Modern `#2563eb` on `--muted`, **4.72** |
| GAM-026 AC5, four arms cut in the deployed engine | 3 / 3 / 2 / 3 red, each where expected |
| GAM-026 AC6, the s23 gate grown | **13/13** (was 9) |
| GAM-026 AC7, at rest, rule present vs neutralised | **byte-identical screenshots** (`sha1 ac75276a…`) |
| GAM-026 AC8, `drive-rkt003-stage.js --keys` EN + FR | **ALL PASS across 2 cells** |
| GAM-027 spec `tests/gam-027-…test.tsx`; reverted arm | **8/8**; the arm reddens **exactly one** row |
| GAM-027 AC2, deployed keypad, 1024×768 **and** 390×844 | **ALL PASS.** Port on: `192`, caret 2, field focused, typed `5` → **`1952`**. Port off, same page: caret 3, focus on the `<button>`, typed `5` **lands nowhere** |
| GAM-027 AC3 census | **185** Buttons ship in templates + prefabs; **0** set the port |
| GAM-027 AC6, `nodegx export` | *"parameter keepsFocus … has no style/content mapping — dropped, reported"*; `export-ledger:check` OK, 177 types |
| viewer `tsc --noEmit`; whole viewer suite | **0**; **122 suites, 1627 ✓, exit 0** |
| editor **`test:main`** | **490 suites, 7867 ✓, exit 0** |
| token-vocabulary readers: MCP ×2, export ×3, editor ×4 | 23 ✓ / 42 ✓ / 43 ✓ |
| `catalog:generate` | my delta was **one 12-line port entry**; committed through a temp index over a peer's own catalog commit |
| GAM-016 AC3, **wizard route, first ever reading** — Playful project, editor canvas | 🔴 **RED**: `--font-sans` **Inter**, `--ring` **#2563eb**, "Hello World!" computes **Inter**, Nunito **unloaded**, project tokens **{}** — while `preset-font-nunito` is shipped and its stylesheet loaded |
| the same, control: name Nunito in the page and re-read | family **Nunito**, face **loaded** — the instrument sees it, so the absence is real |
| GAM-017 AC4 | **parked**: renderer `reactMounted: false`, a peer's `ComponentsPanelNew` refactor fails the ts check |
| editor `test:ci`, whole `noodl-mcp` suite, members-area `Account` | **not run** / **not run** / behind its sign-in, no backend |

**Scratch:** `/private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/3f3493cb-7a19-4a04-beef-8f516360adc2/scratchpad/`
`g26/` (`make-project.js`, `project/` + `project-noring/`, `deploy-{head,fix,noring,rkt,ma}/`, `arm-*/`, `arms.js`, `contrast.js`,
`shots-*`, `head.json`, `fix.json`, `mouse.json`, `viewer-suite.log`, `test-main.log`), `g27/` (`make-keypad.js`, `project/`,
`deploy/`, `export/`, `shots/` + `shots-390/`, `catalog.patch`, `node-catalog.before.json`, `viewer.log`).

## Traps this session added

- 🔴 **A ring read on `document.activeElement` passes when that element is invisible.** Walk up to the first ancestor with real
  opacity and a box, read the outline **there**, and look at the screenshot. Session 23's `outline: auto` trap, one level up.
- 🔴 **v2 `nodes.json` is FLAT**: `children` holds **IDs** and each child carries `parent`. Nested node objects are dropped with
  no diagnostic — the first fixture deployed a Page with nothing in it while the deploy said *"2 of 2 components render"*.
- 🔴 **A project's own tokens sit ON TOP of the shipped defaults in the page**, so "this preset declares no `--ring`" says nothing
  about what the page gets. Read the token in the browser.
- 🔴 **jsdom never moves focus on a pointer press**, so a focus arm there reads the same in both arms and grades nothing. Split
  it: the spec grades the mechanism, the browser grades the consequence.
- 🔴 **A temp-index commit leaves the REAL index behind HEAD**, so files your commit *added* then show as staged **deletions**.
  `git reset -- <your paths>` after every one, or a sibling's pathspec commit sweeps them.
- ⚠️ **`:focus-visible` after a click is the browser's ruling and is not the same for every control.** A clicked `<select>` and a
  clicked text field are focus-visible in Chromium; a clicked button, checkbox and radio are not. An AC that says "a click draws
  no ring" for all of them is written from the intent and loses to the platform.
- ⚠️ A regex literal inside a CDP `Runtime.evaluate` template loses its backslashes — `/\n/g` becomes an invalid regex. Use
  `String.fromCharCode(10)` or `[.]`.
