# GAM-020 — A sentence that will never wrap is flagged before a person sees it clipped

**Status: ⬜ not started. ✅ R18 ruled s19 (§5): buildable.** **Source:** [P78 D58](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) · found by TPL-007 / P87 [RKT-001](../phase-87-the-first-play-test/RKT-001-TEXT-THAT-WRAPS.md), 2026-09-13 · **Side:** product (validator + `render_report`)

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

Not started.
