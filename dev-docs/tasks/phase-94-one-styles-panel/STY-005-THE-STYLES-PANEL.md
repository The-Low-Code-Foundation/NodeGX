# STY-005 — The Styles panel in the rail

**Phase:** 94 — one styles panel. **Prefix:** `STY`. **State:** 🟢 **CLOSED s10 — AC1–AC7 GREEN and DRIVEN, AC8 RULED WORTHY. (Was: only AC8
— Richard's look — was left.)** `test:main` 510/510 suites / 8,161 tests exit 0, `tsc --noEmit` exit 0,
`tests-unit/sty-005` 38/38, and the drive `scripts/devtools/drive-sty005-panel.js` reports **25/25
graded arms** against a real project in both themes.
🔴 **The shots AC8 closes on: `shots/sty005-panel-{dark,light}.png`. Put them in front of Richard.**
**Depends on:** STY-002 (the Look model exists and is the only concept) — 🟢 done.

> This is the task the phase is named after. Richard's sentence: *"I wish actually there was a styles
> panel in the left menu of the editor to manage colours, font styles, variants and whatnot …
> managing it through the nodes is a nightmare."*

**Close condition: Richard's look** (AC8), as everywhere in this phase. Nothing here closes on a
passing test. ([[correct-and-usable-were-never-the-same-criterion]].)

---

## 1. What is measured at HEAD, this session

Read, not recalled. Every row below was opened.

| | reading | where |
|---|---|---|
| ✔ | **The rail slot is free.** `components` is `order: 1`, `search` is `order: 2`, and nothing sits between them. R5's "directly under Components, above Search" is one number: **1.5** | `router.setup.ts:99-127` |
| ✔ | **The old panel registers only under `config.devMode`**, which no build declares — so retiring it takes nothing off anyone's rail. Confirmed again at HEAD | `router.setup.ts:429-448` |
| ✔ | **`ColorsTab` is 69 LOC of scaffolding** — every row's `ContextMenu` carries `Another Action` / `Success` / `Danger` / `With subtitle`, no handlers. It is deleted outright, not ported | `DesignTokenPanel/components/ColorsTab/ColorsTab.tsx` |
| ✔ | 🔴 **`DesignTokensTab` and `TokenCategorySection` are NOT scaffolding — they are a working, undoable token editor under a live gate.** `tests-unit/fix-015/token-row-editing.test.tsx` imports `TokenCategorySection` **by path**. Deleting or moving that directory blind is exactly [[an-import-added-for-a-feature-can-switch-a-sibling-gate-off]] with the arrow reversed: the file survives the retirement and the gate's import moves with it | `DesignTokensTab.tsx`; `tests-unit/fix-015/token-row-editing.test.tsx:23` |
| ✔ | **`StylesModel` already has the whole CRUD, all undoable**: `getStyles(type)`, `styleExists`, `setStyle`, `deleteStyle`, `changeStyleName` — and `changeStyleName` already rewrites every node and every Look that names the style (`renameStylesOnNodes`). The panel needs no new model | `models/StylesModel.ts:54-215` |
| ✔ | **`ProjectModel` already has the Look CRUD and the wearer count**: `variants`, `createNewVariant`, `deleteVariant`, `renameVariant`, `isVariantUsed`, `variantWearerCounts(typename)` — the last written with a comment about why it sets a flag instead of returning | `projectmodel.ts:1449-1570` |
| ✔ | **`ProjectDesignTokenContextProvider` wraps the whole editor page**, so a new panel can read `staticColors` / `textStyles` / `designTokens` / `styleTokensModel` without mounting a provider of its own | `EditorPage.tsx:403-429` |
| ✔ | **There is no colour wheel in `noodl-core-ui`.** The wheel lives in the legacy `colorstylepicker.jsx`. So this panel does **not** get a wheel in v1 — see §3 | `noodl-core-ui/src/components/inputs/` |
| ✔ | `ContextMenu` takes `menuItems` and draws `DotsThreeHorizontal` — R6's one visible `⋯` is this component with a real `menuItems` array instead of the placeholder one | `popups/ContextMenu/ContextMenu.tsx:10-70` |

---

## 2. What it is

One rail panel, `Styles`, under Components. Four sections, in this order:

1. **Colours** — the project's colour styles (`metadata.styles.colors`).
2. **Text styles** — the project's text styles (`metadata.styles.text`).
3. **Looks** — the project's Looks (`ProjectModel.variants`), the concept STY-002 made the only one.
4. **Tokens** — the phase-9 token editor, **moved here, not rebuilt**.

R4 named the first three. The fourth is here because of R2 and R-A: a person is looking at two
storage layers whether we admit it or not, and putting the token editor in the same panel behind its
own section is what makes the split honest instead of hidden. **Every row carries a badge naming its
layer** (R-D) — that badge is the only thing that keeps `--color-primary` and a colour style called
`primary` from reading as the same kind of thing. (🔴 They are not: `resolveColor` is ONE string with
THREE meanings, styles FIRST, so a style named `--primary` *shadows* the token.)

---

## 3. What it deliberately does not get in v1

- 🔴 **No colour wheel.** R7 (*"the one in the wheel"*) is STY-003's ruling about the **picker**, and
  the picker is where a wheel belongs. This panel edits a colour style's **value** as text — a hex
  or a `var(--token)` — plus the platform's own swatch input. Richard's defect ("adds it
  transparent") cannot occur here at all, because there is no port to read instead of the wheel:
  **the value a person types is the value stored.** If he wants the wheel in the panel too, that is
  a ruling and a second session, not a guess.
- **No "where it's used" navigation.** Counting is AC3; *taking you there* is STY-006.
- **No Look authoring.** Creating a Look still starts from a node (*"save this text's styles as a new
  Look"*, STY-003's menu). This panel renames, deletes and counts them. Authoring a Look from nothing
  is the MCP phase's question and README §4.1 already says so.
- **No states.** [[STY-DESIGN §9]] — the next thing, must not be smuggled in.

---

## 4. Acceptance criteria

| # | criterion | how it is graded |
|---|---|---|
| **AC1** | The panel is in the rail **between Components and Search**, and is **not `experimental`** — so it reaches a default build without a settings flag | a spec reads the registration: `order` strictly between the `components` and `search` orders, `experimental` absent |
| **AC2** | The four sections of §2 exist, in that order, and each names what it holds | a render spec reads the section titles in order |
| **AC3** | **Every row says what layer it is and what uses it.** A colour or text style reports how many nodes reference it; a Look reports its wearer count; a token says it is a token | a spec over a fixture project with a known answer. 🔴 The counter walks `forEachNode` and **must not return a truthy value** — [[foreachnode-stops-on-a-truthy-return]] would make every count 1 |
| **AC4** | **One visible `⋯` on every row** (R6), never hover-revealed, carrying **Rename** and **Delete**; delete says what it would break **before** doing it | a spec reads the menu items off a rendered row, and a control asserts **zero** `.variants-item-icon` on this surface — the class the hover-only defect was made of. (STY-003 AC7 used exactly this pair; it is the clean inverse) |
| **AC5** | **Create works in each of the first three sections**, and a created colour style holds **the value that was typed** | specs on the handlers, plus §3's argument recorded: there is no port to read here |
| **AC6** | **The old Design Tokens panel is retired** (R3): its registration and its shell are gone, `ColorsTab` is deleted, and **`DesignTokensTab` + `TokenCategorySection` survive the move with `tests-unit/fix-015` still green** | `fix-015` runs and passes after the move; a grep proves no `DesignTokenPanel` import remains |
| **AC7** | The panel is **read off the rendered element in both themes** — the rows, the badges, the counts and the `⋯`, not a DOM that merely contains them | a drive, as STY-003 AC5 was driven. 🔴 [[verify-the-consequence-not-just-the-mechanism]] |
| **AC8** | 🔴 **Richard has looked at it and ruled it WORTHY** | 🟢 **RULED WORTHY, s10 (2026-09-19)** — shown `shots/sty005-panel-{dark,light}.png`, both themes: the nine colour rows with their swatch, hex, STYLE badge and usage count, the collapsed `Design tokens (88)`, Text styles, Looks, and each section's `+ New …`. **AC8 CLOSED, and with it STY-005** |

**AC1–AC6 are one session's build. AC7 is a drive. AC8 is Richard.** Nothing here is done until AC8.

---

## 5. Traps this task is walking into, named in advance

- 🔴 **Deleting a file can take a live feature with it.** s5 nearly deleted `ElementStyleSectionHost`,
  the sole mount point of `SuggestionBanner`. §1 already found this task's instance
  (`TokenCategorySection` under the `fix-015` gate). **Grep the reach of every file before deleting
  it** — [[a-gitignored-artifact-makes-tests-vanish]] is the same lesson from the other side.
- 🔴 **A new import in an editor file can switch a sibling gate off** —
  [[an-import-added-for-a-feature-can-switch-a-sibling-gate-off]]. `projectmodel` pulls
  `warningsmodel`, whose module body reads `NodeLibrary.instance.on`, absent under jest. If this
  panel needs `ProjectModel` at module scope in anything a spec imports, it is a **call-time
  `require`**, as `Ports.ts` now does.
- 🔴 **A count read from a walk that stops early is a lie that looks like data** —
  [[foreachnode-stops-on-a-truthy-return]]. AC3 is the whole reason this is written down.
- ⚠️ **`tests/` ≠ jest.** If anything lands in `tests/models/*` it runs only under `test:ci`.
- ⚠️ **`ToastLayer.showActivity` is a sticky spinner**; `showInfo`/`showSuccess` are the one-offs.

---

## 6. Related

[[STY-002]] (the model this reads), [[STY-003]] (the panel that picks; this one manages — R1's
"beside"), [[STY-006]] (where it's used — the navigation this deliberately leaves out),
[[build-the-tasks-do-not-farm-the-defects]].


---

## 7. What the drive measured — s8, `scripts/devtools/drive-sty005-panel.js`

Driven against a **copy** of `cn027-drive` (`STY-005 Panel Drive`), chosen by reading every styles
sidecar on this machine: it is the only project with all three populated at once — **9 colour
styles, 2 text styles, 1 Look** — so a run against it can tell *"the section is empty"* from *"the
section is broken"*. **25/25 graded arms, both themes.**

| | read off the rendered elements |
|---|---|
| ✅ | **AC1.** The rail draws `components@0 styles@1 search@2` — R5, in the rail's **own** order, not `router.setup.ts`'s. The button is `visibility: visible`, `opacity: 1`, 34×38, and `elementFromPoint` returns it. Clicking it opens the panel |
| ✅ | **AC2.** Top-level headings are exactly `Colours | Text styles | Looks | Other tokens`, and the token groups (`Spacing`, `Typography`, `Borders`, `Effects`, `Animation`) are **nested under one of them**, never peers |
| ✅ | **AC3.** 100 rows; **11 Style, 88 Token, 1 Look**, every row's badge equal to its layer. **12 of 100 carry a usage figure** — the 9 colour styles, the 2 text styles and the Look, which is exactly the set that has one. `Grey - 700 = 9×`, `Label Small = 7×`, `S27Variant = unused` |
| ✅ | **AC4.** Every on-screen row's `⋯` is hit-tested where it is drawn and returns itself; all at `opacity: 1`. **CONTROL: zero `.variants-item-icon`** — the class the hover-only defect is made of |
| ✅ | **AC5.** Both create doors are on screen without expanding anything |
| ✅ | **AC6.** `tests-unit/fix-015` ran and passed in the same `test:main` |
| ✅ | **AC7.** All of the above re-read after a theme flip, in **dark and light**, with the shots taken from the panel's own rect |

### 🔴 Two things the SHOT found that every assertion had passed

Both were green in `tests-unit/sty-005` and wrong on screen — the third and fourth time this phase.

1. **The Colours section was 88 token rows long and buried the nine styles.** Text styles and Looks
   were pushed so far below the fold that someone opening the panel to find their Looks scrolled
   past ninety colour swatches. The tokens still belong in that section (R2 — this is the one type
   where the two layers actually collide) but the layer a person came to **manage** is the one that
   should be on screen. They are now behind a **closed** `Design tokens (88)` sub-heading that says
   how many are there.
2. **The token groups were drawn as PEERS of the three ruled sections.** The rendered headings were
   `Colours | Text styles | Looks | Spacing | Borders | Effects | Animation` — seven things, four of
   which a person had no way to know were a different layer. That is the confusion R2's badges exist
   to prevent, reappearing one level up. They now sit under **`Other tokens`**. ⚠️ Fixing it found a
   third thing: `excludeGroups` had been `['Colors', 'Typography']`, and since the Text styles
   section draws no token rows, **the typography tokens were reachable from nowhere at all.**

### 🔴 Two INSTRUMENT faults that read exactly like product defects

Both would have been filed as findings against the panel. Neither was true of it.

1. **`elementFromPoint` returned `IFRAME` for every point on screen**, the rail button included —
   which had been hittable ten minutes earlier. The blocker was
   `webpack-dev-server-client-overlay`, a full-window iframe at `z-index: 2147483647` that the dev
   server injects when **any** file in the package fails to compile. The failing file was
   `VisualCanvas/PreviewChrome.tsx` — **a peer's open edit, mid-flight** (mtime 90 seconds old,
   green again minutes later). [[a-commit-is-not-what-the-compiler-read]], and
   [[a-rendered-surface-can-be-behind-a-blocker]] inverted: a real blocker that is not the app's.
   The drive now strips the overlay and **reports that it did**, so a run can never launder one into
   the other.
2. 🔴 **A RECT IS NOT VISIBILITY.** After the sub-section was collapsed, eight token rows reported
   full-size `getBoundingClientRect`s at coordinates inside the viewport — a collapsed
   `CollapsableSection` is 36px tall with `overflow: hidden`, and the browser lays its children out
   before clipping them. The drive called them visible, hit-tested them, got the section's own
   **title** back, and reported **8 unreachable menus in a panel where nothing was unreachable.**
   The hit test IS the visibility test: a row is on screen iff what is painted at its centre is the
   row. And because that predicate now **excludes** rows, the drive opens the collapsed sub-section
   and re-measures — an exclusion that nothing checks is a place for a defect to live.
