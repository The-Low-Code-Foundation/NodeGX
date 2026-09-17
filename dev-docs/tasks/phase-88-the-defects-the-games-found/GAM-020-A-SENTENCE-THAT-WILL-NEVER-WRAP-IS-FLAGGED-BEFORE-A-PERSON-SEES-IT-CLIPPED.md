# GAM-020 — A sentence that will never wrap is flagged before a person sees it clipped

**Status: 🟢 built s19 (2026-09-17), both doors. AC1–AC5, AC7, AC8 met. AC6 (s23): the render door names Rocket School's clipped title at the moment it exists; the generator's door cannot, because every Rocket School sentence is wired — Richard's question. ✅ R18 ruled s19.** **Source:** [P78 D58](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) · found by TPL-007 / P87 [RKT-001](../phase-87-the-first-play-test/RKT-001-TEXT-THAT-WRAPS.md), 2026-09-13 · **Side:** product (validator + `render_report`)

Rocket School's Text helper gave every Text `sizeMode: contentSize`. Every sentence then ran off its card: *"a lot of texts
don't wrap"*. The validator, the plan tools and `render_report` all stayed quiet.

## 1. The person sentence

**An agent that writes a sentence into a content-sized Text is told that it cannot wrap, and `render_report` names any text
that is wider than the box it sits in.**

## 2. What was measured

Re-read at HEAD `eb12ebe99` on 2026-09-14 unless marked otherwise.

| reading | where |
|---|---|
| `contentSize` and `contentWidth` render as `white-space: pre`. The other size modes render `pre-wrap` + `overflow-wrap: anywhere`. The branch runs only when `textOverflow` is not `ellipsis`/`clip` (DEF-031) | `noodl-viewer-react/src/components/visual/Text/Text.tsx:66-86` (`pre` at `:81`) |
| Text's own default is `contentHeight`, which wraps. The author overrode a correct default | `nodes/visual/text.ts:166-169` |
| The only `contentSize` rule in the layout module is D28's `columns-child-keeps-own-width`, for a child of a `Columns` | `validation/layoutInertCombination.ts:445-469` |
| The sizeMode port description says the element *"sizes itself to fit its contents"* and says nothing about wrapping | `node-shared-port-definitions.ts:1149` |
| `render_report` renders at 1280×900 and 390×844. Its overflow findings compare with the **viewport**: `minimum-layout-width` (`layoutWidth > requested`), `horizontal-overflow`, and `elements-overflowing` (`width > vw + 1`). Nothing compares an element with its parent | `nodegx-render-measure/src/index.js:48-51`, `:165-170`, `:939-976` |
| `visible`, the population every rule is built on, now excludes `opacity: 0` and `visibility: hidden` (FLD-012) | `index.js:156-163` |
| 🔴 **Why the naive clauses read 60/60 GREEN on the broken build.** `scrollWidth <= clientWidth` on the text itself cannot fail, because a `pre` Text grows to its words and pushes the overflow onto its parent. And `documentElement` against `innerWidth` is stretched by mobile emulation (FR Race setup at 390: 433/433). The clauses that went RED: text box against its **parent's content box**, and page against the **requested** width | as recorded 2026-09-13, [RKT-001 §6](../phase-87-the-first-play-test/RKT-001-TEXT-THAT-WRAPS.md) |
| Census of the shipped corpus, 2026-09-14, no fix: templates hold **286** Texts, **40** `contentSize`/`contentWidth`, **7** of those with a literal space. Templates plus prefabs: **456 / 112 / 24**. Examples: `pixel-game` `plTitle` "Pixel Dungeon", `crud-screen` "Click New to create the first record.", `story-engine` `sbHead` "What you carry" | read with `node` over `templates/*/components/**/nodes.json` and `library/prefabs/*/project/project.json` |

⚠️ The register's cheapest door is *"literal text holds a space"*. Of the 24 corpus hits, some are headings that fit at
every width anyone has measured. Firing on all 24 makes a claim about wrapping that is true and a claim about clipping that
is unmeasured. §5's ruling is about exactly that difference.

## 3. Where it bites a person

Every template and every agent that writes a Text helper, every label inside a fixed-width card or tile, and every
translated string (French in Rocket School ran about a quarter longer). The page loads with zero console errors and the
sentence is cut off at both ends.

## 4. Related work and collisions

- P80 [DEF-031](../phase-80-the-defects-the-templates-found/DEF-031-A-TEXT-CANNOT-BE-ELLIPSIZED.md) ✅: added `textOverflow`
  and the truncation arm in `Text.tsx`. A Text with `textOverflow: ellipsis|clip` asks for one line. **The new warning must
  abstain on it.**
- P80 [DEF-037](../phase-80-the-defects-the-templates-found/DEF-037-A-STYLE-PORT-THAT-NEEDS-A-SIBLING-IS-INERT-LIVE.md) ✅:
  the live update of the `white-space` siblings. No overlap in behaviour, but read it before touching `Text.tsx`.
- P80 DEF-018 (P78 D28) ✅, row in [TASKS.md](../phase-80-the-defects-the-templates-found/TASKS.md): `columns-child-keeps-own-width`
  lives in the same module. A content-sized Text inside a `Columns` would get both warnings. Decide the cardinality.
- P84 [FLD-012](../phase-84-the-defects-the-field-report-found/FLD-012-THE-EMPTY-BOX-WARNING-STOPS-CRYING-WOLF.md) ✅: owns
  `visible`. The new render rule inherits it, which is correct. Do not fork a second population.
- P87 [RKT-001](../phase-87-the-first-play-test/RKT-001-TEXT-THAT-WRAPS.md) ✅ AC2-AC5: fixed the template and pins its
  allow-list (`tpl007Template.test.ts`, *"RKT-001: a Text sizes to its words only when named"*). This task fixes the doors.
- Grep run: `grep -rlan "white-space: pre\|never wraps\|does not wrap\|scrollWidth > clientWidth\|parent's content box" dev-docs/tasks`.
  No task owns a warning or a render finding for this.

## 5. Design

**Two doors, landing in this order:**

1. **Validator warning** (`text-cannot-wrap`, name open) in `layoutInertCombination.ts`, which feeds `validate_component`,
   `validate_project` and every plan tool. It fires on a `Text` whose resolved `sizeMode` is `contentSize`/`contentWidth`,
   whose `textOverflow` is not `ellipsis`/`clip`, and whose literal `text` holds whitespace between two non-space characters.
   It abstains when `text`, `sizeMode` or `textOverflow` is wired, following the module's existing "unknowable abstains" rule.
   Exit in the message: `sizeMode: "contentHeight"`.
2. **Render finding** (`text-wider-than-its-box`, name open) in `nodegx-render-measure`. It fires on a visible
   `.ndl-visual-text` whose border box is wider than its `parentElement`'s content box (client width minus padding) + 1px,
   per viewport, and names the text. The page-width half already exists (`minimum-layout-width`). Do not add a second one.

🔒 **Ruling for Richard: is a short multi-word heading in a content-sized Text a finding?** "Pixel Dungeon" cannot wrap and
has never been seen to clip.
- Option **warn on any multi-word literal.** Cheap, and it catches the helper before a render. It fires on about 24 corpus
  Texts, some of them fine.
- Option **warn only above a length threshold**, with the threshold measured from the corpus. Fewer false alarms, and a
  number to defend.
- Option **info in the validator, and warning only from the render finding.** Quietest, but the agent learns only if it renders.

**Do not** change `Text.tsx`'s `pre` rule. RKT-001 §2 records it as deliberate: it respects `\n` and lets a label size to its
words.

> 🔒 **R18** **Ruled (2026-09-17, s19, asked in plain words): warn above a length threshold**, the threshold measured from the corpus (§5 option 2), plus the render finding.

## 6. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8:** a spec validates a component with a content-sized Text holding "La réponse était 5. Il n'y a que cinq paires" inside a 304px Group, and gets no wrapping diagnostic. A `render_report` run on the same component at 390×844 reports none either. Beside both, a known-firing finding in the same run (for example D28's warning on a content-sized Button in a `Columns`). |
| AC2 | The validator warning fires on the AC1 Text. It does **not** fire on the same Text at `contentHeight`, on one with `textOverflow: ellipsis`, on a single word, or on a wired `text`. One spec, all arms. |
| AC3 | The render finding fires on AC1's page and not on the same page with `contentHeight`. The clause is RKT-001's corrected one, **text against its parent's content box**, not `scrollWidth <= clientWidth` on the text itself. |
| AC4 | 🔴 **Reverted arms:** delete the predicate and AC2's firing arm goes red. Replace the parent comparison with the text's own `scrollWidth > clientWidth` and AC3's firing arm goes red. The second arm is the one that proves RKT-001's trap stays closed. |
| AC5 | **False-positive census before landing** over templates and prefabs, per the ruling. Record the count and every firing, and read each one. |
| AC6 | **The person's door:** regenerate Rocket School with the pre-RKT-001 helper (`text()` defaulting to `contentSize`). The generator's diagnostics name the banner correction. `render_report` on the s1-shaped page at 390×844 FR names it with its width and its parent's. |
| AC7 | Cardinality: a content-sized Text inside a `Columns` gets the number of diagnostics you decided, asserted. |
| AC8 | Pins updated: the TPL-006 and TPL-007 gates each assert an exact list of warning codes. If the new warning fires on a shipped template, update that gate's list in the same change, with the reason. |

## 7. Traps

- 🔴 **The self-comparison cannot fail.** A `pre` text is always as wide as its own content, and that is what made AC3 read
  60/60 green on the build Richard complained about.
- 🔴 **Mobile emulation stretches `innerWidth`** to the content. Use the requested width, which the report already carries.
- ⚠️ `offsetWidth` of an inline parent is not a content box. Use the computed padding.
- ⚠️ Whitespace inside a `var(--token)` or a template string is not a sentence. Only literal strings count.

## 8. Record

### Session 19 (2026-09-17, over `f25a643b2`; HEAD at write `1de18171f`)

**The threshold (R18), measured, not chosen:** **26 characters** of the longest literal line. RKT-001 §6 measured *"Tu as atteint
la planète !"* (26) at 320px in a 304px banner: the shortest line seen clipping. The corpus census (templates + prefabs, 545 Texts, 123
content-sized, 27 with a multi-word literal) puts every heading at **20 or under** ("An interactive story") and every sentence at 25 or
over. `SENTENCE_MIN_CHARS` in `layoutInertCombination.ts`. A newline is honoured (`pre` respects it): the longest *line* is measured.

**Door 1, the validator:** `text-cannot-wrap` (warning, advisory) in `layoutInertCombination.ts`, reached through
`authoredPreconditionDiagnostics`. Port `sizeMode`, suggestion `sizeMode: "contentHeight"`. Abstains on a wired `text`/`sizeMode`/
`textOverflow`, on `textOverflow` ellipsis/clip, on a single word, on a `var(` token. **AC7 cardinality decided: one diagnostic.** A
Columns child gets D28's `columns-child-keeps-own-width` only (same node, same exit).

**Door 2, the render:** `text-wider-than-its-box` (warning) in `nodegx-render-measure`: a visible `.ndl-visual-text` whose border box is
wider than its parent's content box (`clientWidth` minus padding) + 1px, per viewport, naming the text, its width and the box. An inline
parent (`clientWidth` 0) is skipped.

| AC | reading |
|---|---|
| AC1 | Validator: spec `tests-unit/gam-020/textCannotWrap.test.ts` before the rule: the 5 firing arms red, 7 silent arms green (DiagnosticCode added first, so the red is not a compile failure). Render: pixel-game (not the synthetic banner; ⚠️ deviation) at 390×844 with HEAD's measure: `minimum-layout-width` (410px) and `no-imagery` fire, **nothing names a text** ✅ RED, known-firing beside it |
| AC2 | Spec 12/12: fires on the French sentence at contentSize and contentWidth, and at 26 chars; silent at contentHeight, bare Text, ellipsis, clip, one word, headings ≤ 25, a newline-split sentence, each wired port, a token |
| AC3 | Real Chrome (`measure-from-disk`, phone): pixel-game **before** names *"The five rooms are one Static Data node — open it and add a sixth."* **429px in a 358px box**; **after** the template fix: no text finding, and `minimum-layout-width` is gone too (it was this Text). Screenshots `scratchpad/gam020/shots/b1-phone.png` (cut at both ends) vs `a1-phone.png` (wraps, centred); desktop unchanged. Story-engine Remix: no render finding before or after (its eyebrow heading fits at 390) |
| AC4 | Validator mutants (sha-restored): no call 5 red; threshold 27 → 1 (the 26-char arm); 21 → 1 (headings); no Columns skip → 1 (AC7); no wired abstention → 2; no ellipsis → 1; whole text not longest line → 1. Render: the self clause (`scrollWidth > clientWidth`) in real Chrome on the clipped build names **nothing**; pinned as the reverted arm of `nodegx-render-measure/tests/textWiderThanItsBox.test.js` (4/4) |
| AC5 | Census through the real validator (`npm run calibrate:layout -- templates library/prefabs/*/project`, GAM-020 section added): **6 firings**, all sentences, 0 headings: pixel-game `plFoot` (66), story-engine `rxHelpHead` (33), crud-screen empty hint (37), settings-page ×3 section blurbs (28–32). Python's 7th (settings-page, 44) has `text` **wired**: correct abstention |
| AC6 | **s23: half.** Render ✅ ("Tu as atteint la planète !" 353px in 312 at 390 FR, old helper; silent on current). Generator diagnostics ❌: 59/60 Rocket School Texts are wired, the rule abstains by design. §8 s23 |
| AC7 | Decided one diagnostic, asserted in the spec, mutant-graded |
| AC8 | TPL-005 and TPL-006 gates went red on the new warning. **The templates were fixed, not the pins**: `plFoot` → `contentHeight` + `textAlignX: center`, `rxHelpHead` → `contentHeight` (left-aligned column), regenerated (`template:pixel`, `template:story`; one-line diffs). Gates 119/119. TPL-007 and TPL-008 read no new warning |

**Suites:** editor `tests-unit/validation` + `gam-020` 152/152; `nodegx-render-measure` 17/17; `noodl-mcp` `renderReportModule` 41/41,
tpl003/005/006/008 green. **Red, not ours:** tpl001 (members-area regen differs, red with this module reverted too) and tpl007 (Rocket
School's untracked `.gitignore`/`.mcp.json`/`CLAUDE.md`, s17). **Not run:** `typecheck:editor` (a peer's editor was starting; `ts-jest`
type-checked both changed modules), editor `test:ci`, the whole `noodl-mcp` suite. The prefab hits (crud-screen, settings-page) are left
as findings, not edited. The installed app and `noodl-mcp`'s bundle carry neither door until rebuilt.


### Session 23 (2026-09-17, over `0e7105bca`) — AC6, the person's door

**The old helper, today.** `text()` in `tpl007Components.ts` swapped for one run (`cp` snapshot, `cmp`-restored) and the generator
pointed at scratch (`prepareRocketArtefact` refuses a folder not named `rocket-school`). The literal pre-RKT-001 helper
(`contentSize` everywhere) **no longer stages**: `Game/Header`'s name Text now carries a `width`, and the door refuses it
(`inert-dimension`). The arm therefore reverts every Text that has no `width`/`maxWidth`/`height` of its own: **51 Texts** went
`contentSize` (current build: 13), `fbTitle` among them.

**Half 1 — "the generator's diagnostics name the banner correction": ❌ not met, and cannot be by this door.** Both builds raise the
same diagnostics (156 `dynamic-port-skipped`, 58 `unknown-type-check-skipped`, 4 `uncollapsible-multi-column`), **0
`text-cannot-wrap`**. Measured why: **59 of Rocket School's 60 Texts have a wired `text`** (every string is bilingual, fed from the
word table), and the rule abstains on a wired `text` by design (AC2). The one literal is "Rocket School" (13 chars, under R18's 26).
A game whose words are all wired is invisible to the static door; the sentence exists only at run time.

**Half 2 — "render_report names it with its width and its parent's": ✅ met, at the moment the sentence exists.** A load-time
`measure-from-disk` at 390×844 reports no text on either build (7 pages; the banner and the result card are not on screen at load).
`drive-rkt003-stage.js --measure-text` runs `@nodegx/render-measure`'s own `measureExpression` + `summarise` in the page at every
verdict (`textFits`) and on the result screen (`textFitsEnd`), each with a measured-texts count as its known-firing signal.

| build (deployed with `nodegx deploy --allow-development-engine`), 390×844 FR, `--reward --measure-text` | result |
|---|---|
| old helper | **"Tu as atteint la planète !" is 353px in a 312px box** (`textFitsEnd`, 11 texts measured); verdict prompts "Écris en chiffres : mille soixante-dix-sept" 566 in 304, "Arrondis 6 761 à la dizaine" 369 in 304. Screenshot: the title runs past both edges of the card |
| current | ALL PASS, 10 rounds + the end: `textFitsEnd`, `resultFold`, `resultFocus`, `landing`, `againPlays` |
| 5-round plan, no reward, both | ALL PASS on both: "Pas tout à fait." fits at 390 even at `contentSize` (silence is the true reading there) |

**Instrument defects found (not product, not fixed):**
- 🔴 `scripts/devtools/deploy-from-disk.cjs` (checked in, built 2026-09-12) deploys HEAD's Rocket School as **12 bundles whose "New
  player" skips the profile form** and lands on Home; `nodegx deploy` of the same folder writes 8 bundles with the form. The drive read
  that as "no Let's go! button". A fresh build (`build-deploy-from-disk.mjs` to scratch) **throws at load**: `EditorSettings` reads
  `StorageWeb.get` in a static initialiser ("Method not implemented."). Use `nodegx deploy`.
- The drive waited a fixed 1.2 s for the first screen; a heavier build on a busy machine read "no New player" with the button on
  screen at 6 s. It now waits for the button (up to 15 s).

Scratch: session `b19df43b…/scratchpad/g20/` (`old/`, `current/` builds, `gen-*.log`, `census.py`, `measure-*.json`, `deploy-*`,
`drive-end-*.log`, `shots-end-*`).
