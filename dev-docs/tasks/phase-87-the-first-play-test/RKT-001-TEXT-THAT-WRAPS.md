# RKT-001 — Text that wraps

🔴 **Every Text in Rocket School is content-sized, and a content-sized Text never wraps.** Richard's
finding 1: *"a lot of texts don't wrap."*

## 1. The person sentence

**A sentence that does not fit on its line carries on to the next one — in both languages, at every
width.**

## 2. What was measured (2026-09-13, from source)

| reading | where |
|---|---|
| the template's `text()` helper puts `sizeMode: 'contentSize'` on **every** Text it makes, before the caller's params | `packages/noodl-mcp/tests/tpl007Components.ts:154-156` |
| the runtime renders `contentSize` and `contentWidth` as `white-space: pre`; only the other size modes get `pre-wrap` + `overflow-wrap: anywhere` | `packages/noodl-viewer-react/src/components/visual/Text/Text.tsx:79-84` |
| that runtime rule is deliberate (it respects `\n` and lets a label size to its words) — **the defect is the template's helper** | |
| `packages/noodl-mcp/src` has no hit for `contentSize` beside Text — the MCP door did not teach it | grep |

Everything that is a sentence is affected: the banner's correction and strategy (its
`maxWidth: 560` cannot wrap a `pre` line), the game-card blurbs, the tagline, the stat labels inside a
150px tile, the skill eyebrow — and every French string, which runs roughly a quarter longer.

⚠️ Buttons are not Text nodes. Check the French button labels ("Changer de joueur") separately.

## 3. The fix, and one decision

- `text()` defaults to **`sizeMode: 'contentHeight'`** (width from the parent, height from the
  words). A caller asks for `contentSize` by name, only for a single word, a number or a glyph.
- A centred column (`alignItems: center`) gives a `contentHeight` child its full width;
  `textAlignX: center` then does the centring. Re-check every centred column after the change.
- **Decide**: the question prompt (`46 + 9 = ?`, a 999 999 999 dictation) must not break mid-expression.
  Either non-breaking spaces around the operators with a font size that steps down at narrow width,
  or allow the break for dictation prompts only. Record which and why.

## 4. The product question — answer it, don't assume it

Nothing warned the author. Does `validate_component`, `render_report` or `apply_plan` flag a Text
that carries a sentence with a content-size mode, or a page whose `scrollWidth > clientWidth`?
If none does, file **D58** in [P78's register](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md)
with the reading — the next template, or the next agent, will write the same helper.

## 5. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **Reproduced first:** AC3's clause reads RED on the s1 build at 390×844 FR, recorded here. |
| AC2 | Template gate, by name: no Text whose text (or wired source) can exceed one word carries `contentSize`/`contentWidth`; an allow-list names each exception and why. Sabotage arm: put one back, the gate goes red. |
| AC3 | Drive on Profiles, the New player form, Home, Race setup, a wrong-answer banner and the result banner, **FR and EN**, at the five viewports: `documentElement.scrollWidth <=` **the requested width**, and every `.ndl-visual-text` is **no wider than its parent's content box** (+1px). *(Amended 2026-09-13; see §6 AC1: the original two clauses read GREEN on the broken build.)* |
| AC4 | 390px screenshots of the FR wrong-answer banner and Home, looked at, in `rkt-shots/`. |
| AC5 | §4 answered: which door would have caught it, and D58 filed — or one sentence saying why not. |
| AC6 | Richard: the screen he screenshotted no longer clips. |

**Out:** the race layout (RKT-003); the look (RKT-002).

## 6. Record

- **AC1 ✅ 2026-09-13 — RED on the s1 build, but only once AC3's clauses were corrected.** The drive is
  `scripts/devtools/drive-rkt001-wrap.js`, run on the s1 deploy (6 screens × FR/EN × 5 viewports, both races run to
  "Tu as atteint la planète !"). **AC3 as first written read 60/60 GREEN on the build Richard complained about:**
  - `self` (`scrollWidth <= clientWidth`) cannot fail. A `white-space: pre` Text grows to its words, so it always
    fits itself, and the overflow lands on the parent.
  - `doc` compared the page with `innerWidth`, which mobile emulation stretches to the content (FR Race setup at
    390: 433 / 433).

  With the clauses corrected (text against its parent's content box, page against the requested width), the build
  is RED at 390×844 FR:

  | screen | worst offender | text width vs parent |
  |---|---|---|
  | Home | "jours d’entraînement cette semaine" | 219 in 108 |
  | Home | all four game-card blurbs | up to +51 |
  | wrong-answer banner | "La réponse était 5. Il n’y a que cinq paires : 1+9, 2+8, 3+7, 4+6, 5+5" | 485 in 304, cut at both ends in the screenshot |
  | result banner | "Tu as atteint la planète !" | 320 in 304 |

  Home also fails at all four wider viewports. 🔴 **A second cause:** FR Race setup is 433px wide at 390 with no
  Text wider than its parent, which points to a row that is not a Text. Screenshots are in the session
  scratchpad's `rkt001-s1-shots/`.
- **The fix (2026-09-13).** Three causes, each read from the drive and not guessed:
  1. `text()` now defaults to `contentHeight`. Six Texts keep `contentSize` by name, through `WORD` and
     `CONTENT_SIZED_TEXTS` in `tpl007Components.ts`: a class code, a pill label, two emoji, a first name and a
     number. Four Texts in centred columns gained `textAlignX: center`.
  2. **The choice row's pills (`crRow`)** sized to their content, so their `flexWrap` did nothing. The row now takes
     the control's width. The French race page went from 433 to 421px.
  3. **The header's actions (`hdActions`)** did the same: "Accueil" + "Changer de joueur" + the EN/FR pills. The row
     is now capped at `maxWidth: 100%`, and the page is 390px. It only showed in French, and only on the page that
     shows the Home button.
- **AC2 ✅** — `tpl007Template.test.ts`, *"RKT-001: a Text sizes to its words only when named"*. The artefact's
  content-sized Texts must equal the allow-list exactly, so a stale entry fails too. Its sabotage arm puts the
  banner's correction back to `contentSize` and is caught by name. Gates 142/142, EXIT=0.
- **AC3 ✅** — `drive-rkt001-wrap.js` on the rebuilt deploy: **60/60 cells** (6 screens × FR/EN × 5 viewports) pass
  signal, page ≤ the requested width, and text ≤ its parent. DRIVE_EXIT=0. The same drive read 14 failures on s1,
  and the page-width clause now names the element that is too wide.
- **AC4 ✅** — [`rkt-shots/`](rkt-shots/) holds the 390×844 French wrong-answer banner, Home and Race setup, before
  and after. Looked at:
  - the correction wraps onto two centred lines inside the banner
  - "jours d’entraînement cette semaine" wraps within its tile, and every blurb within its card
  - the pills and the header actions wrap onto rows of their own

  Not measured, but visible: the text is Nunito, because the bundled font module (RKT-002) was in this build.
- **AC6** — waiting on Richard.
- **§3's decision, the question prompt: allowed to wrap, no non-breaking spaces yet.** Across both 390×844 races
  (18 rounds, FR and EN), no prompt overflowed its box. The prompts that are sentences ("Le quotient de 347 ÷ 8 = ?",
  "Écris en chiffres : …") must wrap anyway. Keeping an expression on one line needs an Expression node, and
  that node turns every word in its text into a port (D54), which is risk for a break nobody has seen. RKT-003
  rebuilds the question stage and owns the step-down font size at narrow width, so it re-measures this there.
- **AC5 ✅ 2026-09-13 — no door would have caught it; D58 filed** in P78's register. Text's own default is
  `contentHeight` (`noodl-viewer-react/src/nodes/visual/text.ts:167`), which wraps, and the helper overrode it.
  `validate_component` and the plan tools have no Text-wrapping rule. `render_report` does render at 390×844, but it
  compares boxes with the **viewport**, never an element's `scrollWidth` with its own `clientWidth`, so a line clipped
  inside a card passes. The cheapest door is a validator warning in `validation/layoutInertCombination.ts`.
- **§3's decision revisited, 2026-09-13 (RKT-003):** a break has now been seen, so the decision no longer stands. At 390×844 FR,
  "Lequel est le plus grand : 5 785 ou 8 266 ?" broke inside "8 266". The fix did not need the Expression the decision feared:
  `fmtNum` in `tpl007Scripts.ts` now groups French thousands with U+202F, the narrow no-break space, which is also correct French
  typography. The grader's `normalise` already treats it as a space, and the engine gate proves it.
