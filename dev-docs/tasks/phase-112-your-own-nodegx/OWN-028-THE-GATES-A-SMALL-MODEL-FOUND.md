# OWN-028 — The gates a small model found

**Opened 2026-10-28** (Richard, after OWN-027: "Let's scope all those bugs into a new session").
**Status: ✅ done 2026-10-28 (s1, Opus) — code `a475b0683`; all six bugs `fixed`. Results §7.**
**Model:** Opus. **Depends on** nothing shipped. Starts from `cline-dev` at or after `111f40f18`.

## 1. The person sentence

> **Whoever builds the page — Opus, a 2B model on a laptop, or a person in Studio — the system says so when a section
> runs to the window edge, when the page has five headlines, when a photo band spills over its neighbour, and when a
> refusal is a refusal; and a puppy page has more than one dog to show.**

## 2. Why

OWN-027 put Gemma 4 E2B, E4B and LFM3-1.7B through the MCP with a question harness (`own-027/TABLE.md`). Every miss
that survived to the screenshot was either a model slip or **a rule the vocabulary states in prose and nothing
enforces**. The harness ended up enforcing four of them itself as script rules (R19 one headline, R20 a shell per
band, V10 the photo band's height, V9 an item component), which proves each gate is cheap and makes the page better
for every builder. They belong in the product: "prose advises, gates bind" (DIRECTION §0 pillar 2). Cline and Vibe
strangers hit the same gaps (OWN-020's PILLWRAP, OWN-023's shell copy).

## 3. The six bugs, in order of work

| # | Bug | Status | Where | Size |
|---|---|---|---|---|
| 1 | [`P112-OWN027-WARNBLOCKS`](../../bugs/p112-own027-warnblocks-a-staging-refusal-labels-its-only-reason-warn.md) — a staging refusal labels its only reason `WARN` | open | `packages/noodl-mcp/src/tools/planTools.ts` `validateStaged` → `errors: [...errors.map(formatDiagnosticLine), …]` (:539) and the two `readable: validation.errors` (:931, :1055); `AUTHORED_BLOCKING_WARNINGS` in `src/validate.ts:713` | S |
| 2 | [`P112-OWN027-IMAGEGROUNDSPILL`](../../bugs/p112-own027-imagegroundspill-an-image-ground-band-with-more-than-a-headline-spills-up-over-the-band-above.md) — a full `imageGround` band spills up over the band above | open | the composition: `packages/noodl-editor/src/editor/src/models/StyleTokensModel/StyleCompositions.ts:540` (`sizeMode explicit`, `height 520`, `justifyContent flex-end`); the measure: `packages/nodegx-render-measure/src/index.js` (`RenderFinding`, :879–921; `summarise`, :1070) | S + M |
| 3 | [`P112-OWN027-NOSHELLGATE`](../../bugs/p112-own027-noshellgate-a-band-with-no-shell-runs-its-text-to-the-window-edge-and-no-gate-says-so.md) — a band with no shell runs to the window edge, no gate says so | open | render: `nodegx-render-measure` beside `text-against-edge` (:626, :1461) — a new `text-at-viewport-edge`; validator: a new rule in `packages/noodl-editor/src/editor/src/validation/rules/` (pattern: `repeatedSiblingSubtree.ts`, `layoutFillTraps.ts`) — `band-without-shell` | M |
| 4 | [`P112-OWN027-MANYHEADLINES`](../../bugs/p112-own027-manyheadlines-five-display-size-headlines-on-one-page-pass-every-gate.md) — five display-size headlines pass every gate | open | `nodegx-render-measure/src/index.js` — `text.fontSizes` is already counted per viewport (:253–275, :771); a finding in `summarise` | S |
| 5 | [`P112-OWN027-GLYPHSAMPLE`](../../bugs/p112-own027-glyphsample-a-client-that-picks-from-a-list-only-gets-icons-a-to-c.md) — a list-picking client only gets icons a–c | **needs-ruling** | `packages/noodl-mcp/src/iconSets.ts:123` (`set.icons.slice(0, GLYPH_SAMPLE)`) | XS once ruled |
| 6 | [`P112-OWN027-ONEDOG`](../../bugs/p112-own027-onedog-the-starter-imagery-has-one-dog-so-a-puppy-page-shows-the-same-photo-four-times.md) — one dog in the starter imagery | **needs-ruling** | `packages/noodl-editor/src/assets/starter-project/noodl_modules/starter-imagery/` + its `LICENCES.json`; read by `packages/noodl-mcp/src/imagery.ts` | S (assets + licence rows) or XS (a sentence) |

**Ask Richard the two rulings first, in plain words, with the screenshot open**
(`own-027/runs/C/shots/pages-home-desktop.png`: the one dog four times):
- **R1 (ONEDOG):** add 2–3 more dog/puppy photos (and a person with a dog) to the starter imagery, or keep one photo
  per subject and have the vocabulary say "don't repeat a subject's photo across a card row"?
- **R2 (GLYPHSAMPLE):** choose the 36 sample glyphs by use (heart, home, star, check, arrow-right, mail, phone,
  map-pin, users, calendar …) instead of the first 36 alphabetically, or add a `glyphs: "all"` / `list_glyphs` route?

**Ruled 2026-10-28 (asked with the one-dog screenshot open):**
- **R1 — Q:** *"The hero and all three cards show the same dog … add 3–4 dog photos (~150–250 KB, contact sheet first), or
  keep one dog and add a sentence?"* → **A: "Keep one dog, add a sentence."** The imagery description says one photo
  per subject; don't repeat it across a card row — icons on the cards instead.
- **R2 — Q:** *"36 of 215 icon names, alphabetical … pick the 36 by usefulness, add a way to get all of them, or both?"*
  → **A (verbatim):** *"Add a way to get both of them? Maybe a list of X at a time that the model can handle, either it
  outputs the name of the one it wants, or 'false' or whatever and then it shows the next page until it gets one it
  likes, or it loops around again?"* Read as: **both** — the default 36 chosen by use, plus a PAGED route (page n of
  size X, wrapping at the end) so an enum-picking client can show a page, take a name or "next", and loop.

## 4. Acceptance criteria

- **AC1 (WARNBLOCKS)** — a staging refusal's readable lines say `BLOCKS` (or `ERROR (blocks staging)`) for every
  diagnostic that blocked, `WARN` only for what did not; `details.blocking` lists them. A planTools test stages three
  identical sibling subtrees and asserts the word and the outcome agree. `kit: mcp`, `regression:` that test.
- **AC2 (IMAGEGROUNDSPILL)** — `imageGround` is `sizeMode contentHeight` + `minHeight 520px` (keeps
  `justifyContent flex-end`); its description updated; every recipe/example that uses it still validates and renders
  (`ui-image-scrim-band`, `ui-landing-page`). render_report has `overlapping-sections` (a section box overlapping its
  previous sibling at any viewport, > 8 px). **Proof:** render `own-027-T-v2b-e4b` (built before V10 existed) — the
  finding fires; render it after the composition change re-applied by hand to that copy — it does not.
- **AC3 (NOSHELLGATE)** — render_report `text-at-viewport-edge`: at desktop width, a visible Text whose box starts
  within 8 px of the viewport's left (or ends within 8 px of its right) edge, outside a full-bleed image ground.
  Validator warning `band-without-shell`: a full-width section Group (the band parameter signature) whose children are
  not exactly one Group with a `maxWidth`. **Proof:** both fire on `own-027-T-r2` (no shell in 7 sections); neither
  fires on `own-027-C`.
- **AC4 (MANYHEADLINES)** — render_report warning `competing-headlines` when more than one text on a page renders at
  ≥ 56 px on desktop (or uses `--display-*`). **Proof:** fires on `own-027-T-r2` (5), silent on `own-027-C` (1).
- **AC5 / AC6** — as ruled (R1, R2); a test on `get_style_vocabulary` for whichever list changed.
- **AC7 — the control that matters:** re-run OWN-027's harness with its own script gates switched OFF
  (`--no-script-gates`: drop R19, R20, V10 — add the flag) on E2B, v2: the page's render_report now NAMES what the
  script used to fix silently. A gate that only fires on a hand-made fixture has a hole shaped like the defect.
- Every bug: `status: fixed`, `commit:`, `kit: mcp`, `regression:` per `dev-docs/bugs/README.md`; `node scripts/bugs.js check` clean for these six.

## 5. Traps already known

- **One heavy job.** render_report and the OWN-027 harness are the heavy jobs; the suites (`test:main`, the
  render-measure tests) after, never beside. `nice -n 19 … --runInBand`.
- **`bin/` runs `dist/`** — rebuild `packages/noodl-mcp` (`npm run build`) before any MCP drive, or the drive grades the
  old code.
- **A new finding can downgrade an existing one** — run render_report on `own-027-C` (clean today) after each new
  finding; it must stay clean.
- **The editor bundle** carries `StyleCompositions.ts` too: the composition change reaches the MCP through
  `editor-deps`; check the MCP's `get_style_vocabulary` answers the new params, not the stale bundle.

## 6. Session prompt

> Read `dev-docs/tasks/phase-112-your-own-nodegx/OWN-028-THE-GATES-A-SMALL-MODEL-FOUND.md` and run it: ask Richard R1
> and R2 in plain words first (screenshot open), then fix AC1→AC4 in order, each with its test and a render proof on
> the OWN-027 projects named, then AC5/AC6 as ruled, then AC7 (the harness with its script gates off). Check
> `git status` and peers before any render; one heavy job at a time. Close every bug in `dev-docs/bugs/` with
> `commit:` and `regression:`, then hand off.

## 7. Results (s1, 2026-10-28)

Rulings R1/R2 asked first with the one-dog screenshot open; recorded verbatim under §3.

| AC | What shipped | Proof |
|---|---|---|
| AC1 | `formatRefusalLine` (`noodl-mcp/src/validate.ts`): a warning that refused prints `BLOCKS [code]`, on staging, apply and the direct doors; `details.blocking` on staging/apply refusals | `stagingDiagnostics.test.ts` "a staging refusal says BLOCKS …" (both doors) |
| AC2 | `imageGround` = `contentHeight` + `minHeight 520px`; `ui-image-scrim-band` the same (`catalog:merge` run); TPL-001/003 pin their shipped bytes (both byte-checks green). render_report `overlapping-sections`: each band's DRAWN ink (text, media, painted boxes) against its neighbours' boxes, 8 px slack | v2b-e4b: fires at desktop (gallery 891 px up over the hero) and phone; the same copy with the composition applied by hand: silent, and the screenshot shows the gallery under its heading. own-027-C clean |
| AC3 | validator `band-without-shell` (`rules/bandWithoutShell.ts`); render_report `text-at-viewport-edge` (desktop, words' ink within 8 px of the window edge) | rule: r2 7/7, r1 6/6, C 0, 17 templates 0, 34 local projects 22 hits (all no-shell bands). render: r2 12 texts at x = 0; C silent |
| AC4 | render_report `competing-headlines` (> 1 text ≥ 56 px on desktop) | r2: 5 at 94 px; C: 1, silent |
| AC5 | `IMAGERY_RULE` in both forms of `get_style_vocabulary` (`imagery.rule`) | `styleTools.test.ts` "says one photo per page …" |
| AC6 | `sampleGlyphs`: heart, home, star … first; `get_style_vocabulary({ glyphs_page, glyphs_per_page })` pages every name, `next` wraps to 1 | same test: 11 pages × 20 = all 215 once; page 12 = page 1 |
| AC7 | `--no-script-gates` in `own-027/harness.mjs` (R19, R20, V10 off; stamped `scriptGates` in the ledger) | **v1 E2B** (`runs/T/own028-nogates-e2b-v1`): validator `band-without-shell` ×5 at staging, render `text-at-viewport-edge` (9), `competing-headlines` (6). **v2 E2B** (`runs/T/own028-nogates-e2b`): `competing-headlines` (5); v2 builds a shell per band by construction (V1, not R20), and E2B picked no imageGround, so V10 was not exercised — moot now the composition carries the floor |

**Found and fixed on the way:** the first `overlapping-sections` counted every descendant box; a Columns container pulls
itself up by `-marginY` (`Columns.tsx:640`) and fired 16 px on the v1 gates-off run at 390 px with nothing drawn there.
It now counts what draws (fixture in `own028Gates.test.js`). A regex written with single backslashes inside the
measure's template literal reached the page as a different pattern — the file's own warning, met again.

**Budgets now FULL:** the resident tool surface reads **8,280 / 8,280** (`toolDisclosure`; the two paging inputs were
paid for by folding `detail`'s duplicate describe text into the description, and bare `z.number()` schemas); the
prompt form of `get_style_vocabulary` reads **4,399 / 4,400**. The next addition to either must free room first.

**Not mine, left red:** editor `tests-unit` 10 suites (EL-009, SEE-001, EXP-013 ×2, DEF-007, HLS-003, HLS-009, CHR-007,
VFN-011, HLT-012, HLT-013) — none imports a file this task changed; DEF-007/HLS-003 name peers' `noodl-preview` and
`scriptTools.ts` files. `tsc --noEmit` on noodl-mcp: 2 errors in a peer's `p128OptionSet.test.ts`.

**Not done:** Lucide's manifest has no paw or dog glyph; the `own-027/harness.mjs` flag lives in the untracked
`own-027/` folder (OWN-027's to commit). Board row not touched (`BOARD.md` carries a peer's uncommitted edit).
