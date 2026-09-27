# TPL-007 — The maths and typing game

**Opened 2026-09-12**, at Richard's request:

> *"I'd like to make a game for my kids using NodeGX as a template we can publish to the nodegx
> homepage (like the others) to show what NodeGX is capable of. My kids need to practise maths and
> typing skills. They're in French school, but the app could be in both English and French for demo
> purposes (Eng by default). … I'm targetting ages 8-12 … It'd be good if the game had like basic
> math reminder explainer things. … research into the most modern pedagogy and research backed
> motivational online game types, structure, progression and support for mistakes and fundamental
> misunderstandings. … profile with a cool stock avatar and save their progress in local storage in a
> way that it doesn't get easily erased. … no backend, front end only please."*

**Status: 🟢 s1 (2026-09-12) — RULED, and the first cut is BUILT, GATED (140/140 across three
suites), DEPLOYED with the production engine and DRIVEN in headless Chrome (17/17 clauses, 0 console
errors).** Profiles, Home and the Rocket Race play end to end. Richard's rulings are in §10; the
session log is §11; what is next is §12. Merge, Hunt, Monster, Teach, Progress and Sets are not yet
pages — the parts and the engine they share are.

---

## 0. The verdict in one paragraph

**Yes, NodeGX can build this, and the shape has already been proven twice on this shelf.**
[TPL-005](TPL-005-THE-PIXEL-GAME.md) is a keyboard-driven game that vendors its own node kit;
[TPL-006](TPL-006-THE-STORY-ENGINE.md) is a whole product held in one `Static Data` array. This
template is those two ideas put together: **one curriculum array, one question engine, and four
thin game wrappers around it**, plus a small vendored node kit (`game-kit`) for the three things the
graph cannot draw or play on its own — sound, an SVG race track, and an on-screen keyboard. The
adaptive learning model is a `Function` node over a persisted `Global Store`. No backend, no
account, no build step. **The kit is the community showcase**: "here is a custom React component,
here is how a template ships one, here is the graph driving it."

The three measured gaps and their routes (from the capability survey, 2026-09-12):

| Gap | Register | Route chosen | Why not the other route |
|---|---|---|---|
| No repeating timer | D40 | **Design out the loop.** Rocket progress = `Animate To Value` per correct answer; the countdown bar = `Animate To Value` 100→0 over the `Delay`'s duration; elapsed time = `Date.now()` at show and at answer. | A vendored `Ticker` reopens D40's two unruled questions. The `Script`+`setInterval` idiom hides the game's clock from the graph. Neither is needed. |
| No audio node | — | `game-kit` logic node **`Sound`**: `Play` signal, `Source` (a short data-URI or a file under the project), `Volume`; teardown via `addDeleteListener`, copied from `keyboard-shortcuts`. | Nothing in the 33 modules plays audio. |
| No SVG / canvas node | — | `game-kit` React node **`Race Track`**: `Path` (an SVG `d`), `Progress A`, `Progress B` (0..1), avatar image ports; positions two sprites with `getPointAtLength()`. And **`Keyboard Map`**: `Layout` (`azerty`/`qwerty`), `Next Key`, `Finger Colours`. | `CSS Definition` + `offset-path` works for one rocket but cannot expose "where is the rocket now" back to the graph, and cannot draw the keyboard. |

🔴 **D41 applies from the first hour**: a kit that registers inside the 33-module library can fail
in a two-module project, and a template *is* a two-module project. The kit is driven in the
template, never beside the full library.

🔴 **D49 applies to every colour**: any `States` node carrying a colour gets `useTransitions: false`
or it publishes nothing. A kids' game is mostly colour.

---

## 1. What the research says, and what it changes here

The full briefing with citations is in [§9](#9-the-research-briefing). The ten findings that
decide something in this design:

1. **Per-item Elo with response time, sampling at ~75% success** is the best-validated child-maths
   model (Math Garden, Klinkenberg 2011). It is a few lines of arithmetic and runs entirely in the
   browser. **That is the engine.** Not Bayesian knowledge tracing, not fixed levels.
2. **Spaced retrieval** beats re-explaining for fact fluency in exactly this age group
   (Ophuis-Cox 2023, Karpicke). Every item carries a half-life; due items come first.
3. **Interleaving** (mixing operations and levels within a session) roughly doubles delayed-test
   scores (Rohrer 2020, d = 0.83), **but drops in-session accuracy**. So: interleave by default, and
   never let the accuracy dip during an interleaved set push the difficulty down.
4. **Timed pressure is contested.** Boaler's anxiety claim is weakly sourced; the fluency
   meta-analyses find timing works *for facts* but **speed without accuracy did worse**. The
   resolution every serious product uses: **untimed practice is the default, timing is an opt-in
   challenge, and a soft "fluent" threshold (~3 s) is tracked silently in practice.** A wrong fast
   answer scores nothing anywhere in this game.
5. **Immediate corrective feedback, with the answer and a one-line strategy**, is the defensible
   default for facts. Every wrong answer shows the right one and *why* ("8×3: c'est 8+8+8, ou le
   double de 4×3").
6. **Faded worked examples** (full → partial → none) are the evidence-backed shape for an
   "explainer". That is what the Teach cards are — not a paragraph of text.
7. **The 230-million error is a known, diagnosable transcoding error** (Frontiers 2021): the child
   maps words to digits without a place-value frame. The diagnostic *is* the exercise: dictate a
   number, inspect which class the zeros land in, and show the class grid (milliards · millions ·
   mille · unités). This is a maths skill *and* a typing skill, so it lives in both games.
8. **Mastery progression with demotion** (Khan's Familiar → Proficient → Mastered) beats points;
   points and badges have small effects (Sailer & Homner 2020). Points exist as garnish only.
9. **Streaks: weak evidence either way, asymmetric downside.** No hard-reset streak. "Days practised
   this week" with a forgiving reset.
10. **Avatar identification and autonomy choices** (which game, which topic, which avatar) are what
    reviewers credit for Prodigy's retention, and what SDT predicts. Rewards must never be gated on
    something the child cannot earn.

**For typing:** AZERTY when the language is French, QWERTY when English, home row first
(`QSDF`/`JKLM` on AZERTY), keys unlocked Keybr-style on **accuracy first, then speed**, one colour
per finger on an on-screen keyboard. Targets around 15/20/25 words per minute at CE2/CM1/CM2, and
these norms are weakly sourced, so they are shown as "your best" not "the standard".

**For content:** pinned to the **programmes 2025** (cycle 2 in force 2025, cycle 3 2026): CE2 to
10 000 and both tables in both directions; CM1 to 999 999 and hundredths; CM2 to 999 999 999 and
thousandths; 6e the milliard, ÷ by numbers under 100, fraction as quotient.

---

## 2. The product

**Working title: "Rocket School"** (placeholder — Richard names it). EN by default, FR one tap away,
the toggle on every screen.

### 2.1 Screens

| Screen | What it is |
|---|---|
| **Profiles** | Up to 6 profiles per browser (siblings share a computer). Each: a name, a stock avatar (12 SVG animals/robots, no upload), a school level (CE2 · CM1 · CM2 · 6e · 5e), a language. Choosing a profile is the only "login". |
| **Home** | The four games as big cards, the "due today" count, the week's practice days, the profile's rank badge. |
| **Play** (one per game) | The game. Same question engine underneath. |
| **Teach** | The explainer cards, reachable from any wrong answer and from Home. |
| **Progress** | Per-skill mastery bars, a "what to work on" line, and the **save code** (§2.5). |

### 2.2 The four games, ranked by what they teach

| # | Game | Pressure | What it drills | Richard's idea it comes from |
|---|---|---|---|---|
| A | **Rocket Race** | opt-in timed | fact fluency (tables, bonds, ×10/100), big-number dictation, typing words | game 1 |
| B | **Make Ten Merge** | none (turn-based) | number bonds, bridging through 10, compensation | game 4, 2048 |
| C | **Number Hunt** | none | "pick 3 that make 20", "pick 2 that multiply to 24" — mental strategies, factor sense | game 2 |
| D | **Monster Gate** | opt-in timed | the same engine as A with hearts instead of a race; the "pressure" the child chooses | game 3 |

**A — Rocket Race.** One player vs the computer, or two players taking turns on one keyboard. A
question shows; the child types the answer (or taps one of four options at CE2). A correct answer
launches the rocket forward by an amount scaled by how fast the answer came *within the fluent
window*; a wrong answer shows the correction and moves nothing. The track is a windy SVG path,
identical length for both. **The CPU rocket is rubber-banded to the child's Elo so the child wins
about three races in four** — winnable, not free. Typing mode swaps the question for a word (or a
dictated number) and lights the next key on the keyboard map.

**B — Make Ten Merge.** Richard's 2048 with one rule change that makes it teach: tiles slide with
the arrow keys and **two tiles merge only when their sum is a multiple of 10** (7+3, 14+6, 25+25);
the merged tile shows the sum. New tiles are drawn from the bonds the profile is weakest on. The
goal is the biggest tile before the grid locks. (In plain 2048 only equal tiles merge, which drills
nothing but doubling; in "any two add" the grid never fills.)

**C — Number Hunt.** A 4×4 grid of numbers and an instruction: "choose 3 numbers that add to 20",
"choose 2 whose product is 36", "choose the two closest to 1 000". Untimed. The grid is generated
so that exactly N solutions exist, and the child is told how many. This is where the strategies
in the Teach cards get *used*.

**D — Monster Gate.** The race engine reskinned: a cutesy blocky monster walks toward the gate
during the question; a correct answer pushes it back, a timeout costs a heart, three fluent answers
in a row restore one. Three hearts. Same questions, same model — it exists because some children
prefer defending to racing, and the choice is theirs (SDT autonomy).

**Build order is A, B, then C, D.** A and B together already exercise the engine, the model, the
profiles, the kit, both languages and both input modes. C and D are each one session on top.

### 2.3 The curriculum is ONE Static Data array

Exactly the TPL-006 move (*"the array IS the story"*). Each entry is a **skill**:

```json
{
  "id": "mult-table-8",
  "level": "CE2",
  "strand": "calcul",
  "generator": "table",
  "params": { "table": 8, "min": 1, "max": 10, "bothWays": true },
  "answer": "typed",
  "fluentMs": 3000,
  "name": { "en": "8 times table", "fr": "Table de 8" },
  "strategy": { "en": "Double, double, double: 8×3 is 3 doubled three times.", "fr": "Double trois fois : 8×3, c'est 3 doublé trois fois." },
  "teach": "card-doubling"
}
```

Generators (each a case in one `Function` node): `table`, `bond` (make N), `bridge` (add/subtract
across a ten), `bigNumber` (dictate a number in words, both languages; the class grid is the
explainer), `decimalCompare` (built to trap whole-number bias: 0.25 vs 0.7), `fractionCompare`,
`multiplyPow10`, `euclid` (division with remainder), `typingWord` (from a word list per language),
`typingKey` (single keys, home row first). **Adding a skill is adding an entry. That sentence is
the template's START-HERE.**

### 2.4 The learner model (front-end only)

One `Function` node, `updateModel(profile, skillId, correct, elapsedMs)`, over a persisted
`Global Store` (`Persist: true`, `Storage Key: rocket-school`). Per profile, per skill:

- `rating` — Elo, starts at the level's prior; K larger for the first ten answers.
- `halfLifeDays` — Duolingo-style; grows on a correct, shrinks on a wrong; `due = last + halfLife`.
- `mastery` — `new → familiar (≥70% last 10) → proficient (5 correct in a row, 3 fluent) →
  mastered (still proficient after a due review)`, **with demotion** on two misses.
- `bestFluentMs`, `wpm` (typing skills).

`nextQuestion(profile, mode)` picks: due reviews first, then an interleaved set from the two or
three skills nearest the profile's rating, sampling difficulty so predicted success is ~75%. The
CPU race speed and the Monster's walk speed are both read off the same rating. **The in-session
accuracy of an interleaved set does not feed the difficulty** (finding 3).

### 2.5 Profiles that are not easily erased

`localStorage` is the store, and it is honestly fragile: Safari drops script-written storage after
seven days without a visit, "clear browsing data" wipes it, and every demo under `nodegx.io` shares
one origin (hence the explicit `Storage Key`). So, three layers, no backend:

1. `Global Store` persisted, written after every answer (not every keystroke).
2. `navigator.storage.persist()` requested once per profile creation (a kit logic node, `Keep
   Storage`, three lines; browsers honour it for sites the user returns to).
3. **A save code.** Progress → a compact string (skill ratings quantised to a byte each, deflated,
   base64), shown on the Progress screen as text *and* as a QR (the `qr-code` module already exists,
   subject to D41). A child copies it into a note, pastes it on another computer, and is back. It is
   the 1990s password-save, and children understand it immediately.

### 2.6 EN / FR

The `Static Data` route, not the i18next module: every string in the game is `{ key, en, fr }` in
one array; a `Variable` holds the language; a `String Mapper`/`Expression` picks the column.
Number words for dictation are generated (a `Function` that spells 0–999 999 999 in both
languages, including *quatre-vingt-dix* and the *cent(s)* rule). The keyboard layout follows the
language and can be overridden on the profile.

### 2.7 What is deliberately NOT in it

- No accounts, no leaderboards, no network of any kind. Two players share one keyboard.
- No hard streaks, no daily-loss mechanic, no reward a child cannot earn by playing.
- No visible clock in practice mode. Fluency is measured, not displayed, until challenge mode.
- No user-uploaded avatars (no storage, no moderation problem).
- No 5e-and-up algebra. The ceiling is 6e number & calculation; the floor is CE2.

---

## 3. What is in the graph and what is in the kit

The claim the community will read is *"built in NodeGX"*, so the ratio matters and is measured.

**Graph (nodes, no JavaScript):** every screen, every card, the profile flow, the race track's
progress values, the countdown bar, the hearts, the 4×4 grids as `For Each` over arrays, the merge
board as `For Each` over rows (TPL-005's board), the arrow keys via `keyboard-shortcuts`, the
language switch, every colour as a design token, every decision a `Condition`.

**`Function` nodes (JavaScript inside the graph, readable in the property panel):** the question
generators, the model update, the number speller, the merge rule, the save-code encode/decode. Each
one *answers a question or transforms a list* — the TPL-005 discipline — and none of them holds a
timer or touches the DOM.

**`game-kit` (vendored `noodl_modules/game-kit`, plain JS, hand-written like
`keyboard-shortcuts`):**

| Node | Kind | Ports | Lines (est.) |
|---|---|---|---|
| `Sound` | logic | `Play`, `Source`, `Volume` → `Ended` | ~60 |
| `Race Track` | react | `Path`, `Progress A`, `Progress B`, `Avatar A`, `Avatar B`, `Width` → `Reached A`, `Reached B` | ~120 |
| `Keyboard Map` | react | `Layout`, `Next Key`, `Pressed Key`, `Show Fingers` | ~150 |
| `Keep Storage` | logic | `Request` → `Granted` | ~15 |

Also vendored: `keyboard-shortcuts` (arrow keys, as TPL-005), and `qr-code` for the save code.
Three modules, so **every kit is driven in a three-module project** (D41).

---

## 4. How it gets built, gated, driven, shipped

The TPL-005/006 recipe, unchanged:

1. **Source of truth** `packages/noodl-mcp/tests/tpl007Template.ts` (+ `tpl007Components.ts`),
   generated through the MCP door by `scripts/generate-maths-template.ts` (`npm run template:maths`)
   into `templates/rocket-school/`. Run the generator twice and `diff -r`.
2. **Gate** `tpl007Template.test.ts`: every instance port pinned **by name** (the door checks
   parameters, not connections), every colour-carrying `States` pinned `useTransitions: false`,
   the curriculum array's shape validated, a **§8-style rebuild with a different curriculum** to
   prove the engine is data-driven, and a sabotage arm per clause.
3. **Kit spec** `game-kit.test.ts` in the kit's own folder: teardown on delete (the
   `keyboard-shortcuts` shape), and registration measured **in the template**, not the library.
4. **Drive** `scripts/devtools/drive-tpl007-game.js`: real CDP key events on the deployed folder —
   create a profile, answer four questions (two right, one wrong, one timeout), see the rocket move
   and the correction card, reload and find the profile still there, switch to FR and read a French
   question, export a save code, wipe storage, import it, find the ratings back. **Every absence
   clause sits beside a known-firing signal** (TPL-006 §9b-i).
5. **Deploy** with the shipped `nodegx-deploy.cjs`, `--base-url /templates/rocket-school/`,
   production viewer, no development-engine flag; `ops/deploy.sh`; drive the **public URL**.
6. **Zip** from the gated artefact; **open it on a machine that never had `keyboard-shortcuts`** —
   the arm TPL-005 still owes.

**Sessions, honestly:** kit + engine + profiles + Rocket Race ≈ 2 sessions; Make Ten Merge ≈ 1;
Number Hunt + Monster Gate ≈ 1; Teach cards + FR pass + drive + publish ≈ 1. **About five.** Richard
plays it after session 2 (Race alone) so the look and the feel get ruled before the wrappers
multiply.

---

## 5. Acceptance criteria (proposed)

| AC | Clause |
|---|---|
| AC1 | The zip opens on a clean machine and plays with no install — every kit it needs travels with it. |
| AC2 | The curriculum is one `Static Data` array; adding an entry adds a skill to every game with no other change (proved by rebuild-and-diff). |
| AC3 | Rocket Race: 1P vs CPU and 2P; a correct answer moves the rocket, a wrong one does not and shows the correction; the CPU wins about 1 in 4 against a steady player. |
| AC4 | Make Ten Merge: arrow keys slide, only sums that are multiples of 10 merge, the game ends when no move exists. |
| AC5 | The model: due reviews come first, difficulty tracks the rating, mastery demotes on misses; all of it survives a reload. |
| AC6 | Profiles: up to 6, avatar and level and language per profile; a save code round-trips a profile byte-identical through wipe-and-import. |
| AC7 | Every string reads in EN and FR; number dictation spells correctly in both to 999 999 999. |
| AC8 | Teach cards: every skill has one, reachable from its wrong answer, faded (full → partial → none). |
| AC9 | Live at `nodegx.io/templates/<slug>/`, driven on the public URL, 0 console errors. |
| AC10 | Richard's look. His kids' verdict is recorded here in their words. |

---

## 6. Questions only Richard can answer

1. **Scope:** all four games, or ship A+B first and publish, then add C+D? (Recommendation: A+B
   first. It is the same engine and the community sees it three sessions sooner.)
2. **Name and avatars:** a name; and whether twelve hand-drawn SVG avatars in the design-system
   palette are enough, or he wants a particular style (Minecraft-blocky was his word for the
   monster).
3. **Typed vs multiple choice:** typed everywhere (drills typing too), options only at CE2, or the
   child chooses?
4. **The friend's problem:** is the big-number dictation the one misconception to build first, or
   does he want the decimal/fraction whole-number-bias items in the first cut too?
5. **The clock in challenge mode:** visible countdown bar (proposed) or hidden until the end?
6. **Publish target:** homepage demo + zip (proven path, no ruling needed) — and does he want the
   in-editor shelf too, which waits on the T3 category ruling (`game` is none of the six slugs)?

---

## 7. What this template will surface (predicted, to be measured)

Templates exist to find product defects; the first three this one will meet:

- **D40 again**, from the other side: a countdown built from `Animate To Value` + `Delay` is the
  idiom a person without a ticker reaches for, and nothing documents it. If it holds, it belongs in
  a node-catalog example; if it drifts (the bar and the timeout disagree), that is the measurement
  D40 needs.
- **A React kit node with a second visual child** (two avatars on one track) — the
  `example-node-kit` shows one `setDOMElement`; nobody has shipped a kit node that *contains*
  graph-provided visuals.
- **`Global Store` persist under a shared origin** — three demos will share `nodegx.io`'s
  `localStorage`; the first collision is one `Storage Key` default away.

---

## 8. Sources the design leans on

Klinkenberg et al. 2011 (Math Garden Elo) · Rohrer et al. 2020 (interleaving RCT) · Ophuis-Cox
2023 and Karpicke (retrieval practice, primary) · Codding 2011 / Methe 2012 (fluency meta-analyses)
· Settles & Meeder 2016 (half-life regression) · Ryan, Rigby & Przybylski 2006 (SDT in games) ·
Sailer & Homner 2020 (gamification meta-analysis) · Frontiers in Education 2021 (number
transcoding) · Durkin & Rittle-Johnson (misconception diagnosis) · programmes 2025 cycle 2 / cycle
3 (BO) · Keybr help (typing unlock model) · QIAT (typing norms, weak) · Fairplay / Common Sense
(Prodigy critique).

## 9. The research briefing

The full briefing with URLs, as delivered 2026-09-12, is kept verbatim in
[`tpl-007-research-briefing.md`](tpl-007-research-briefing.md).


---

## 10. Richard's rulings (2026-09-12)

1. **All four games.** (Build order kept: Race first, then Merge, Hunt, Monster.)
2. **"Rocket School" is fine.** Avatars from an OSS library rather than hand-drawn SVG — DiceBear,
   five collections, bundled into the kit (MIT core; `pixel-art` and `thumbs` MIT, `fun-emoji`,
   `big-smile`, `adventurer` CC BY 4.0 artwork, credited in the kit's README).
3. **Stock lessons CE2 → 6e, AND a person's own question sets** — with a **visual editor**, not
   only pasted JSON (JSON paste stays as the second door). The engine already serves a custom set
   (`mode: custom`, `Logic/Parse question set`, `Logic/Save question set`); the editor page is §12.
4. **As much as possible of what commonly trips kids up.** Eleven trap skills ship (§1's table in
   `tpl007Curriculum.ts`), each with the misconception's own answer on the buttons.
5. **The MCP route: the latest door, the way the component phases taught.** The whole template is
   authored through `create_plan → stage_plan_operation → apply_plan` with every interface declared,
   and graded by phase 85's own instrument — the first template to go through the plan door.

## 11. Session 1 — what was built, and what it measured

**The artefact:** `templates/rocket-school/` — 50 components, 392 nodes, 879 wires, one kit. Built
by `npm run template:rocket` from `packages/noodl-mcp/tests/tpl007{Components,Template,Theme,
Curriculum,Scripts}.ts`; two builds are byte-identical; the checked-in directory is what the
generator writes today (the gate says so).

| | |
|---|---|
| **The kit** | `library/modules/game-kit` — `Sound` (8 synthesised effects, no files), `Keep Storage`, `Avatar`, `Race Track`, `Keyboard Map`. Hand-written `src/kit.js`; `build.mjs` prepends the DiceBear bundle (400 KB) deterministically. Gate: `tpl007GameKit.test.ts` 13/13, run on the BUILT file in a bare `vm`. |
| **The engine** | 23 Function scripts in `tpl007Scripts.ts`, each shipped as a named `Logic/*` component. Elo + half-life + mastery-with-demotion; 52 skills; both spellers (230 000 000 → *deux cent trente millions*); Make Ten merge rule; Number Hunt generator with a known solution count; profiles, settings, question sets, save code. Gate: `tpl007Engine.test.ts` 115/115 — every skill generated 60× in both languages on both layouts, every options question carries its answer, the traps carry the misconception. |
| **The pages** | Profiles (22 nodes), Home (26), Race (30) over 14 `Game/*` parts and 3 `Race/*` sections. Gate: `tpl007Template.test.ts` 12/12 — plan door, determinism, drift, the three phase-85 floors recomputed, every `Logic/*` a named utility, every States `useTransitions:false`, every colour a token, the §8 rebuild-with-one-skill proof. |
| **Phase 85's instrument** | `measure-interfaces.py v2`: **42 components, 95% publish outputs (floor 50), 38% carry a flag (floor 20), 0.19 States per component (floor 0.15)** — PASS ×3. Ledger row added to `STUDIED-APPS.md`. |
| **The drive** | `scripts/devtools/drive-tpl007-rocket.js` on the shipped `nodegx-deploy.cjs` output (production engine, no development flag): make a player, home, race, answer, verdict, next, FR, reload — **17/17, 0 console errors, 0 network errors**. Pictures in `tpl-007-shots/`. |

**🔴 What the drive found that the gates could not — five product defects, filed D53–D57 in
[`DEFECTS-THE-TEMPLATES-FOUND.md`](DEFECTS-THE-TEMPLATES-FOUND.md), all with 0 console errors:**

- **D53** a kit React node as a component's ROOT draws nothing when placed (three parts invisible;
  a Group root fixed all three).
- **D54** an `Expression` makes every identifier an input port — `String(n)` throws.
- **D55** an `Expression` with no delivered input never evaluates — a `m !== false` guard on an
  optional port hides the part.
- **D56** `apply_plan` warns `page-cannot-scroll` about the plan whose `scroll: "page"` it applies.
- **D57** a `Variable` is global by name: two banners on one page opened together; four choice rows
  shared a pick. (And a repeater needs an `id` per row or re-runs pile up.)

**Three traps, transferable:**

1. **An edit script that asserts before writing writes nothing** — twice this session a
   multi-replacement Python script aborted on one mismatched pattern, and the pipeline that followed
   measured the OLD artefact. The pass/fail readings were identical to the run before. Check the
   generator's exit before believing a drive.
2. **A backtick inside a template-literal script is a syntax error two files away** — the comment
   "`id` — a repeater…" inside `MARK_SELECTED_SCRIPT`.
3. **A drive's text clauses cannot see a doubled pill or a second open banner.** Both were in the
   screenshot and in none of the 17 clauses. Look at the picture.

## 12. Next — in order

> 🔴 **2026-09-13 — Richard played it, and [Phase 87](../phase-87-the-first-play-test/README.md) goes FIRST.**
> Ten findings (text that does not wrap, "Show me how" unwired, Shift for digits on AZERTY, the verdict
> below the fold, no profile edit, no restart, a silent clock, one question type, the look, the language
> toggle) became nine `RKT` tasks. Every one lives in a part Merge, Hunt and Monster reuse, so the list
> below waits for them.

1. ✅ **Make Ten Merge** page — built 2026-09-14 at Richard's request ("make the second game type"), §13.
2. ✅ **Number Hunt** page — built 2026-09-14 at Richard's request ("build the next game type"), §14. It went Make Ten's way (one
   Variable is the whole hunt) rather than the s1 plan here; `Check hunt pick` and `Toggle index` stay in the template, unused.
3. **Monster Gate** page: the Race engine with hearts; `Game/Hearts`, `Game/Monster` (CSS pixel
   art via box-shadow), `Pages/Monster`.
4. **Teach** page + wiring `showMe`: `Logic/Teach card` exists; `Game/Teach card` (fading step from
   a per-skill miss count), `Pages/Teach`; the banner's "Show me how" currently does nothing.
5. **Progress** page: skill bars by mastery, the save code (`Logic/Encode/Decode save code` exist;
   `qr-code` module optional, D41 applies), DiceBear credit line.
6. **Sets** page — Richard's ruling 3: a visual editor (`Game/Set row`: question, answer, remove;
   add row; name; save) over `Logic/Parse/Save/List/Delete question set`, plus the JSON paste box;
   and "My questions" as a Race mode.
7. **Answer mode by level**: `Logic/Create profile` takes `answerMode`; the form does not yet offer
   it — CE2 should default to buttons.
8. **Then AC9/AC10**: publish to `nodegx.io/templates/rocket-school/` (`--base-url`, `ops/deploy.sh`,
   drive the public URL), Richard's look, his kids' verdict.

## 13. 2026-09-14 — Make Ten Merge, and the hangar out of the games

> "Can we make the second game type in the maths game template please? And move the hanger to somewhere out of the game type
> menu" — Richard, 2026-09-14

Built over P87's template (RKT-001 to RKT-012, uncommitted), through the plan door like everything else.

### 13.1 What was built

- **The game (§2.2 B):** a 4×4 board. The arrow keys (`keyboard-shortcuts`, now a second required module) or four on-screen arrow
  buttons slide it, and two tiles join only when they make a multiple of ten. The end of a board is Race/Result reused: its take and
  why, New game (focused), Home, and the hangar when a 🎁 was earned.
- **Parts:** `Merge/Tile` (a States node colours a square by kind: empty, a single number, a ten, tens, a hundred and over; its class
  pops a square that joined or grows one that landed), `Merge/Row` (TPL-005's nested repeaters), `Merge/Play`, `Pages/Merge`.
- **Graph shape:** the one slide rule placed four times with its direction as a parameter (TPL-005's move rule). One Variable
  (`mergeGame`) is the whole game: New merge board and every slide write it, and `Logic/Draw merge board` draws the squares, the score
  line and the phase from it. A reactive Condition on "over" runs `Logic/Finish merge` once.
- **Scripts:** `Logic/Slide and merge` carries the whole game (id, totals, joined and landed squares). `Logic/New merge board` runs on a
  signal and picks the pool. `Logic/Draw merge board` and `Logic/Finish merge` are new.
- **Decided by the builder, one constant each (Richard's to change):**
  - `MERGE_POOL_GROUPS` — §2.2's "new tiles are drawn from the bonds the profile is weakest on", made concrete: single numbers always;
    teens from CM1 or once `bond-10` is proficient; fives to 95 from CM2 or once `bond-20` is proficient; the weakest group in play twice
    as often. Every drawn tile has a partner in its pool.
  - `MERGE_STAR_RULE = { join: 1, joinCap: 15, finish: 5 }` — a join is a bond made, capped near a race's answers so a long board does
    not outrun the hangar's curve; finishing pays what landing pays; once per board id; New game abandons a board and pays nothing.
- **Not built:** swipe on a touch screen (the arrow buttons are the tablet's way), sounds per join, the learner model hearing about joins
  (a join is not graded, so ratings do not move).
- **The hangar** left Home's games for the player menu (first item, "🎁 Hangar", on every page but the hangar) and stays on Home's bar
  to the next pick. Recorded in [RKT-011 §5](../phase-87-the-first-play-test/RKT-011-THE-HANGAR.md).

### 13.2 Gates added

- **Engine (162, then in the 283 below):** the pool rule by class and by mastery, weakest twice, no dead tile; a slide carries the game;
  12 boards played to the lock, every joined square a multiple of ten; the drawn rows, kinds, pop classes (swap each move), French
  `1 234`; D64 on the drawn row fields; a board pays once, capped, abandoned pays nothing, the milestone pick, with a sabotage arm
  (drop the id check → pays twice).
- **Template:** five pages and two library modules; Home's game cards are exactly Race, Merge, Hunt, Monster (Merge enabled, the other
  two greyed); the menu's Hangar wires on every page but the hangar; each key and button runs its own slide and no wire carries a
  direction; the Variable is the whole game; only the lock reaches Finish; the end card is brought on screen after Finish; the pop classes
  are stilled for reduced motion.

### 13.3 Readings

- **The first engine run: 159/161.** Both reds were mine: `joined` was added to the game and never recorded by `slideLine`/`slide`.
- **The generator's first run: GEN1_EXIT=1**, nothing written: Game/Header's Component Outputs never declared the new `hangar` port
  (the door named the fix).
- **Build 1** (`merge1`): gates 283/283 (JEST_EXIT=0), TC_EXIT=0, DEPLOY_EXIT=0. `drive-tpl007-merge.js`:
  - home: EN 1366×768 4/4, FR 390×844 5/5 (screenshots looked at: Home's cards are Race then Merge; the menu opens with 🎁 Hangar)
  - screen: all six cells (five FR viewports + EN 1366) `sideways`, `fold`, `tiles44` green
  - play: FR 1024×768 and EN 1366×768 all green; FR 390×844 **9/10, `again` red**
- 🔴 **The phone's red was the probe's tap, and the screenshot showed a product fault behind it:** the end card sits under the board on a
  phone, and New game was at 847–891 on an 844 screen. Race/Result focuses New game one frame after the card mounts, and the card grows
  after that (the stars, the why and the 🎁 lines arrive with Finish), so nothing brought it on screen. A new clause `endInView`
  reproduced it RED on build 1 (CTL_B1_EXIT=1).
- **Build 2** (`merge2`): Merge/Play brings New game on screen 250 ms after Finish. Gates 283/283, TC2_EXIT=0, DEPLOY2_EXIT=0; play
  all three cells green (11/11, 11/11, 10/10), screen all six green.
- 🔴 **Build 2's phone green graded the short card.** That board made 8 joins, crossed no milestone and drew no 🎁 line; build 1's red
  card had one. Its screenshot also showed Home cut off under New game, which the clause (New game only) could not see. The drive now
  seeds 10 ⭐ so every finished board crosses the first milestone (`pickLine`, known-firing), and `endInView` requires every button in
  the card's row on screen. Build 3 brings the whole row on screen.
- **Control on build 2, seeded to the tallest card: `endInView` RED (CTL_B2_EXIT=1)** — New game 792–836, and To the hangar and Home
  848–892 on an 844 screen.
- **Build 3** (`merge3`, the row of ways on brought on screen): GEN4_EXIT=0, gates **283/283** (JEST3_EXIT=0), TC3_EXIT=0,
  DEPLOY3_EXIT=0.
  - `drive-tpl007-merge.js`, every arm (MERGE3_EXIT=0, ALL PASS): home 4/4 and 5/5; play FR 390×844 12/12, FR 1024×768 12/12, EN
    1366×768 11/11 (`pickLine` and `endInView` green on the tallest card, `paid` exact from 10 ⭐); screen all six cells.
  - Screenshot looked at, FR 390×844: the board's lower rows, then the whole card with Nouvelle partie, Au hangar and Accueil on screen.
  - Regression: `drive-rkt011-hangar.js --arm screen` ALL PASS across 6 cells (HANGAR3_EXIT=0; it now opens the hangar from the bar to
    the next pick); `drive-rkt008-menu.js` ALL PASS across 14 cells (MENU3_EXIT=0; the menu gained 🎁 Hangar).
- **Not run:** the rest of P87's 19-drive regression set (race, stage, pad, teach, boost, stars, keys), `test:ci`, `test:main`. Race
  files were not edited; `Game/Header` (menu) and Home were.

### 13.5 Richard's first play: "bloody hard", and a silent full board (2026-09-14)

> "it doesn't say anything when I 'lose' (i.e. when all the squares are filled) so you feel like an anticlimax at the end"
> "I consider myself not very good at maths, but I'm 40 years old … it's bloody hard. Is this a normal amount of squares / Level of
> difficulty? Can we make like an easy and hard mode?" — Richard, 2026-09-14

**Measured before changing anything** (build 3, the one he played):
- A real lock always showed the end card: `drive-tpl007-merge.js --arm play` gained `locked2` (a second board to the lock), ALL PASS on
  all three cells.
- 🔴 **What he hit is a full board with a join still there.** The game is not over then, and nothing said so: 1 of 3 driven boards.
- **The rule as built is hard for anyone.** A scratch simulation (3,000 boards per row, a player who always takes the most joins):

  | pool | new tiles that are a partner | median moves | joins/board | reach 100 | boards with a full-but-not-over moment |
  |---|---|---|---|---|---|
  | CE2 | none (as built) | 21 | 8.4 | 3% | 34% |
  | CE2 | 1 in 4 | 27 | 15.2 | 17% | 40% |
  | CE2 | 1 in 2 | 37 | 27.8 | 48% | 43% |
  | CE2 | 3 in 4 | 67 | 65.9 | 85% | 51% |

  A random player does worse (19 moves, 6 joins, 1% as built). The cause: a single number has exactly one partner in nine.

**✅ Ruled (Richard, 2026-09-14):** "Easy + Hard" and "Hint + bigger end".
- `MERGE_MODES = { easy: { helper: 0.5 }, hard: { helper: 0 } }`: Easy draws half of new tiles as the partner, from the pool, of a single
  number already on the board. Hard is the game as first built. Easy is the default, the pills sit above the board, the choice is kept
  on the player (`mergeMode`), and a tap starts a new board in that mode (the board left pays nothing).
- A full board with a join still there (`fullness: 'full'`) replaces the rule line with a hint on sunshine. When the board locks, it greys
  to 45% as the end card pops in (a 400 ms fade, none under reduced motion).
- Stars are unchanged per mode, so an Easy board usually reaches the 15-join cap (see §13.4).

**Build 4** (`merge4`, served on `http://127.0.0.1:8780/` for Richard): GEN5_EXIT=0, gates **288/288** (JEST4_EXIT=0), TC4_EXIT=0,
DEPLOY4_EXIT=0.
- Engine gates added: helper tiles (helper 1 always lands the partner; known-firing: helper 0 lands 4+ values), Easy ≥ 1.5× Hard's joins
  for the same random player (30 boards each), the full state, the mode kept on the player. Template gate: the mode, hint and dim wires,
  `roomy`/`playing` first, the fade stilled for reduced motion.
- `drive-tpl007-merge.js`: home 4/4 and 5/5; play 15/15 on all three cells (`dimmed`, `locked2`, and `hint` 2/2 full-board moments on EN
  1366×768; the two FR cells drew none and say so); screen all six cells; Easy boards made 14–26 joins where build 3's made 2–13.
- 🔴 **The modes arm read NOT REACHED, then red, and both were the probe.** First, the arm never opened the game (the open was inside
  `arm === 'play' || 'screen'`). Second, the pill colour read "transparent" on both pills while the screenshot showed Difficile in tomato: a
  `\(` written into the drive's page-code template literal became `(`, so the "transparent" regex never matched and the walk stopped at the
  word. A printed ancestor chain showed the tomato `.pressable` one level up. Fixed to plain string comparison: **modes EN 6/6, FR 7/7**
  (`easyDefault`, `hardKept`, `hardAfterReload`).
- Screenshots looked at: the full-board hint on sunshine beside the arrows; the phone's greyed board with the whole end card on screen;
  Difficile chosen and a fresh board after the tap.

### 13.4 For Richard

- The two constants above, and whether a join should pay at all.
- Swipe on a tablet, or the arrow buttons only?
- 🟡 **Older than this work, measured:** a player created in French on the New player form opens the player menu with the Langue row
  showing neither English nor Français selected (Keyboard's FR · AZERTY is). The same drive on P87 build 8 (`rocket-m8`, before this
  session) shows the same empty row; RKT-008 build 7's drive, which picks French in the menu itself, showed Français selected. Cause not
  read. No task yet.

## 14. 2026-09-14 — Number Hunt, the third game

> "Can we build the next game type in the math game template please?" — Richard, 2026-09-14

Built over §13's template (uncommitted), through the plan door. Served for Richard on `http://127.0.0.1:8781/` (build 3, `hunt3` in
session `d1980510`'s scratchpad).

### 14.1 What was built

- **The game (§2.2 C):** five grids of sixteen numbers. Each grid names a target ("Pick 2 numbers that add up to 20", "…multiply to 36",
  "…make 100", or 3 numbers at CE2 and up) and has one to three ways to make it; the child is told how many. Untimed.
  - A tap picks a number (a tap on it again unpicks it). The moment the pick holds enough numbers it is checked and cleared: a right way
    stays teal and pops, a wrong one gets berry edges, shakes, and says what it made ("3 + 8 = 11, not 20. Try again.").
  - A way already found says so and pays nothing.
  - After two misses on a grid, **Show me one** marks a way the child has not found (a teal edge). It pays nothing.
  - Every way found: **Next grid**, with the focus. After the fifth grid, Race/Result: 🏆, "9 ways found · 1 shown", the stars and why,
    the 🎁 line when a milestone was crossed, New game (focused), the hangar, Home.
- **Parts:** `Hunt/Tile` (a Button: a tap, a click or Enter; a States node colours it idle, picked, found, shown or wrong), `Hunt/Row`
  (Make Ten's nested repeaters, passing the tap up with its square), `Hunt/Play`, `Pages/Hunt`. Home's Hunt card is enabled.
- **Graph shape, Make Ten's:** one Variable (`huntGame`) is the whole hunt. The one move rule, `Logic/Hunt move`, is placed three times
  with its action as a parameter (tap, show, next); `Logic/Draw hunt` draws the numbers, the instruction, the progress, the note and the
  phase from the Variable; a reactive Condition on "over" runs `Logic/Finish hunt` once, keyed by the hunt id.
- **Scripts:** `HUNT_RULE` is the grid rule, now shared by `Logic/Build number hunt` and `Logic/New hunt`, and it keeps every way, not a
  count. Two old faults went with the old generator: its fallback grid claimed 3 ways to make 20 and had 6, and a pairs-to-100 grid
  could leave the retry loop with 4 or more.
- **Decided by the builder, one constant each (Richard's to change):** `HUNT_ROUNDS = 5`, `HUNT_HELP_AFTER = 2`,
  `HUNT_STAR_RULE = { way: 1, wayCap: 15, finish: 5 }` (a way found alone is a star, capped like a Make Ten board; a way shown pays nothing).
  The kinds by level are s1's generator's, unchanged.
- **Not built:** a sound per pick (Make Ten has none either), the learner model hearing about picks (ratings do not move), a timed mode.
  `Logic/Check hunt pick` and `Logic/Toggle index` (s1's planned route) stay in the template and nothing places them.
- **Home is at 31 of the 32 nodes a page may hold.** Monster Gate's navigate is the last one that fits.

### 14.2 Gates added

- **Engine (17 new, 178 in the suite):** a new hunt per level, its ways counted again independently; the tap (toggle, right, wrong with
  its sum, again, junk indexes refused beside a square that is taken); Show me one refused at one miss and offered at two, paying nothing;
  Next grid only when every way is found, the totals kept, the last way ending the hunt and nothing moving after; eight hunts played through
  by a finder; the drawn kinds, pop and shake classes (stilled by the next tap, swapping names each move), ids, EN/FR words; D64 on the row
  fields; Finish pays once, capped, a shown way unpaid, the milestone, its own id (a Make Ten id does not block it), a sabotage arm.
- **Template (5 new, 305 across the three suites):** Home's card; each move placed with its action as a parameter and run by its one signal;
  the tap climbing Tile → Row → Play, and the draw script's row fields equal to the tile's inputs; every tile id kept by the door; one
  Variable, named apart from Make Ten's; only "over" reaches Finish; Show me one and Next grid's mounting and focus; the shake stilled for
  reduced motion.
- **Drive:** `scripts/devtools/drive-tpl007-hunt.js`. Every grid is solved from the numbers on screen and the instruction's words (the
  ways counted in the drive, never read from the page), and the page must agree with the count and with every pick.

### 14.3 Readings

- **Engine first run 178/178** (ENG1_EXIT=0; the Hunt tests alone 17 passed beside 161 skipped). GEN1_EXIT=0.
- **Build 1 gates 302/305 (GATES1_EXIT=1), three reds:**
  - Mine: the gate expected the note to have no colour, and `T_BODY` gives it ink. The assertion now expects ink.
  - 🔴 **Mine: every wire in `Hunt/Tile` missing.** They were there, under `htIn-2`, `htKind-2`, `htOut-2`: Hangar/Tile already uses those ids
    and the door renames a clashing one without a word (the register's `emptyState-2` case). The tile's ids are now `hn*`, and the gate
    checks every tile id survives.
  - Not mine: `variable-in-repeated-component` (GAM-005, P88, uncommitted in `diagnostics.ts` at 19:56) on `Profiles/New player form`'s
    `newLook`, `newLevel`, `newLang`, `newSeed`. The P88 session's reading: shared on purpose. Checked in the source before marking it:
    New player resets the draft and Edit player fills it every time the form opens, and only one form is ever on screen (Profiles has no
    header). The four Variables carry GAM-005's "Shared on purpose" comment (`SHARED_DRAFT`). §13.4's empty Langue row is not explained
    by it (the menu's language row is not the form).
- TC1_EXIT=2: two errors, both in `tpl008Components.ts` (a peer, mid-edit at 20:01:37); none in TPL-007's files.
- **Build 2** (`hunt2`): GEN2_EXIT=0, gates 304/305 (only GAM-005's warning), TC2_EXIT=0, DEPLOY2_EXIT=0 (production engine).
  - `drive-tpl007-hunt.js --arm play` ALL PASS (PLAY2_EXIT=0): FR 390×844 17/17, FR 1024×768 17/17, EN 1366×768 (CM1) 16/16.
  - `--arm screen` ALL PASS (SCREEN2_EXIT=0) on all six cells: `sideways`, `fold` (all sixteen numbers above the fold), `tiles44`,
    `noteShown` (a wrong pick's note on screen), `coarse`, `quiet`.
  - Screenshots looked at: the phone's first grid under the instruction; berry edges and "1 + 8 + 8 = 17, pas 38. Essaie encore."; Show
    me one after two misses and the shown way's teal edge beside "That was the last one." and a focused Next grid; the phone's end card
    with Nouvelle partie, Au hangar and Accueil all on screen.
- **Build 3** (`hunt3`, the four comments): GEN3_EXIT=0 with only the two expected warnings, gates **305/305** (GATES3_EXIT=0), TC3_EXIT=0,
  DEPLOY3_EXIT=0. `--arm play` on build 3 ALL PASS (PLAY3_EXIT=0): FR 390×844 17/17, FR 1024×768 16/16 (its grid 2 had one way, so
  `again` did not come up, and the drive says so), EN 1366×768 16/16. The screen arm was not re-run on build 3.
- 🟡 **`def038SettledTemplates.test.ts` 18/19 (DEF038_EXIT=1): the rocket-school control red, and not from Hunt.** The control deletes the
  first `runOnChange-*` key it meets, which is `runOnChange-in-curriculum` on `Logic/Pick next question`'s Function, and the planner
  writes 0 for it — with the Hunt components removed too. The first key on a node that is not a Function (`Game/Game card`'s Condition)
  writes 1. So the artefact is settled and the check is live; the control's pick cannot see it. Not changed here (a probe in the
  session scratchpad, `def038probe.ts`).
- **Not run:** P87's regression drives (the race, the menu, the hangar), `drive-tpl007-merge.js` on this build, `test:ci`, `test:main`.
  Header and Merge were not edited; Home gained one navigate and the Hunt card's target; the New player form gained four comments.

### 14.4 For Richard

- The three constants above: five grids, help after two misses, a star a way.
- Should a shown way count toward "found"? Today a grid can be cleared by Show me one on its last way, and it pays nothing.
- Sounds per pick (right / wrong), and whether a pick should reach the learner model (the bonds and tables behind each kind).

## 15. 2026-09-14 — Published: <https://nodegx.io/templates/rocket-school/>

> "Can you publish to the nodegx homepage what we've got so far please?" — Richard, 2026-09-14

**What is live:** the template as §14 left it (build 3): Profiles, Home, Rocket Race, Make Ten Merge, Number Hunt, the Hangar. Like the
story engine and the todo list, it is a static path under the marketing site (`~/vscode_projects/nodegx-web/site/templates/rocket-school/`,
untracked there like the other demos); `_page.html` has no demo cards, so nothing on the homepage itself changed (its `index.html` md5 is
identical before and after both deploys). Deployed with `ops/deploy.sh 49.12.102.195`; both neighbours on the box answered 200 before
and after, twice.

### 15.1 The first publish broke on reload — D74

- Built with `nodegx-deploy.cjs templates/rocket-school <site>/templates/rocket-school --base-url /templates/rocket-school/`:
  `<base href>` and all six script srcs prefixed, production engine, root renders. Deployed (NODEGXDEPLOY_EXIT=0); the page answered 200.
- 🔴 **`/templates/rocket-school/hunt` answered 404, and so did `/home` and `/merge`** — and the live drive read NOT REACHED: after making a
  player, the reload landed on **`https://nodegx.io/home`**, "HTTP ERROR 404". The router strips `BaseUrl` when it reads a path and never adds
  it when it pushes one; and the host's `file_server` has no fallback either. Filed **D74** (it bites the live todo-list's `sign-in` route
  the same way, measured 404, not driven).
- **The published build navigates by hash instead.** A copy of the project with `settings.navigationPathType: "hash"` (the only
  difference: `diff -rq` names `nodegx.project.json` alone), built with the same `--base-url`. `#`-routes are relative, so a reload stays
  under the base and the plain file server answers it. **`templates/rocket-school/` itself is unchanged** (still `path`; the gates are
  untouched). Driven locally under the path first (a site root stub beside it): Hunt play EN 16/16 (HASHLOCAL2_EXIT=0). Republished
  (NODEGXDEPLOY2_EXIT=0); the live `index-*.js` reads `"navigationPathType":"hash"`.
- ⚠️ **So a republish must repeat the hash copy** until D74 is fixed. The command pair is in §15.3.

### 15.2 Driven on the public URL (`https://nodegx.io --path /templates/rocket-school/`)

Four drives gained a live origin and `--path` (TPL-006's shape): `drive-tpl007-hunt.js`, `drive-tpl007-merge.js`, `drive-rkt003-stage.js`
(and `drive-tpl007-rocket.js` already had it). The first two now read the page URL as `pathname + hash`.

- `drive-tpl007-hunt.js --arm play`: FR 390×844 16/16, EN 1366×768 15/15, ALL PASS (LIVEHUNT2_EXIT=0). (`again` did not come up: both
  cells' grid 2 had one way; the drive says so.)
- `drive-tpl007-merge.js --arm home`: EN 4/4, FR 390×844 5/5 (games, the bar to the next pick, the menu's 🎁 Hangar), ALL PASS; the URL
  read `/templates/rocket-school/#/home`. `--arm play` EN 1366×768 15/15 (18 joins, a full-board hint, the lock, paid, locked2), ALL PASS.
- `drive-rkt003-stage.js` (the race, P87's one-screen-per-question drive), FR and EN × 390×844 and 1366×768: **ALL PASS across 4 cells**
  (LIVESTAGE_EXIT=0), 5 Défi rounds each (right, wrong, timeout, right, wrong): every verdict's prompt, title and Next on one screen,
  nothing scrolled, Next reachable; AC3 on the phone (rocket 40 px, track 218 px) and the laptop (track 230 px of 768).
  - ⚠️ Not graded by it: `foldWorst` was skipped on 10 of the 20 rounds ("worst-case swap skipped (correction false)"), so those rounds
    were graded on the question drawn, not the longest one. And on an options question the drive's aim does not always land (a planned
    wrong read "Fast and correct!" and the reverse); the clauses grade the layout, not the aim.
- `drive-tpl007-rocket.js` (s1's race drive): **14/17 live — and 14/17, the same three clauses, on build 3 served from disk** (LOCALRACE_EXIT=1),
  so not the publish. The three (`the answer was graded and the banner says so`, `the banner offers Next`, `FR switches the interface to
  French`) grade s1's screens: RKT-005 replaced the answer box and Check with the pad, and RKT-008 moved the language into the player
  menu. 🟡 That drive is stale since P87 and was not in P87's regression set; retire or rewrite it.
- Screenshots looked at: the phone's French Home (stats, the bar to the next 🎁, Course de fusées then Fusion des dizaines); the phone's
  Hunt end card ("10 trouvées · 1 montrée", +15 ⭐, the 🎁 line, all three buttons on screen).
- **Not driven live:** the hangar pick, the menu edits, the keyboard layouts, the answer pad (P87's other drives take a folder only).

### 15.3 To republish

```sh
S=<scratch>; rm -rf $S/rs-hash && mkdir -p $S/rs-hash && cp -R templates/rocket-school $S/rs-hash/
python3 -c "import json,sys;p=sys.argv[1];d=json.load(open(p));d['settings']['navigationPathType']='hash';json.dump(d,open(p,'w'),indent=2)" $S/rs-hash/rocket-school/nodegx.project.json
rm -rf ~/vscode_projects/nodegx-web/site/templates/rocket-school
node packages/noodl-preview/dist/nodegx-deploy.cjs $S/rs-hash/rocket-school ~/vscode_projects/nodegx-web/site/templates/rocket-school --base-url /templates/rocket-school/
(cd ~/vscode_projects/nodegx-web && ops/deploy.sh 49.12.102.195)
node scripts/devtools/drive-tpl007-hunt.js https://nodegx.io --path /templates/rocket-school/ --arm play --only 1366x768
```

## 16. 2026-09-14 — Monster Gate, the fourth game

> "Can we build the last game in the math game app please? What is it going to look like? Can we discuss options and mock something
> up first?" — Richard, 2026-09-14

Mocked first, three ways to play it, each playable, with phone mocks and seven calls:
<https://claude.ai/artifact/NkzcsuKFD1KX7JHEn3Q2rB>.

### 16.1 Richard's rulings (2026-09-14)

1. **A and B, both, as a choice** on the setup: *Beat it to the gate* (every question the monster walks; a right answer is a hit) and
   *Push it back* (the race engine run backwards: a right answer pushes it towards its cave, every answer it steps). C (endless) is out.
2. **A wrong answer: it creeps closer.** Only running out of time (or creeping all the way) costs a heart.
3. **The setup opens on Practice.**
4. **Three monsters** to win (four hits each in A).
5. **Three different shapes in three different colours.**
6. **Solo first** (D63 still grades player two into player one's model).
7. **A heart back after three quick answers in a row**, up to three.

### 16.2 What was built

- **The game:** Home's 👾 card opens `Pages/Monster`: a setup, then the game. The setup offers the two ways and the two paces, opens on
  *Beat it to the gate* and *Practice*, writes those once (RKT-006), and says the chosen pair's rule in one line. The game is the race's
  question under a lane: the hearts, "Monster 2 of 3" and its hits left over it; the gate (left), the ground and, in Push it back, the cave
  (right); the monster between them; what just happened under it. Restart and Change the game sit above (the page's bar steps aside, as
  the race's does). Show me how opens the Teach card in the round's place. The end is Race/Result after Next: "The gate held!" or "The
  monster got in!", how many were sent home, the take and why, the 🎁 line, New game (focused), the hangar, Change the game.
- **Rules (`MONSTER` in `tpl007Scripts.ts`, one table):** 3 monsters, 3 hearts, 4 hits; a quick answer hits 2, a slow one 1, and knocks it
  back. A wrong answer creeps it closer by a third (Practice) or a quarter (Challenge); creeping all the way, or running out of time, bangs
  the gate for a heart. Push it back: a right answer pushes by 2 × the race's gain, every answer steps it 1.5 × the computer rocket's
  step (read off the rating), into its cave it is beaten, at the gate a heart and back to the middle. 3 quick in a row: a heart back.
- **The walk is the clock.** In Beat it to the gate with Challenge, the monster walks from where it stands to the gate off the round's own
  countdown bar (`Game/Countdown bar` now publishes `left`, Race/Round passes it out as `clockLeft`), and a monster that crept closer gets
  a shorter clock (`Logic/Pick next question` takes `limitScale`, Race/Round passes it). The race wires neither, so its clock is as it was.
- **The verdict's boost line** says a hit (big / small, meter 100 / 50) or a push in Monster Gate (`Logic/Grade answer` takes `game`); the
  race sends none and keeps "full boost" / "Your rocket stays put".
- **Parts:** `Game/Monster` (one box; the stylesheet draws the monster: `MONSTER_PIXELS`, three 13 × 13 maps — horns in berry, one eye in
  purple, spikes in orange — each ONE box-shadow in tokens), `Monster/Lane` (the mover's width is where it stands; a Function walks it off
  the clock or glides it to rest), `Monster/Setup`, `Monster/Play`, `Pages/Monster`; `Logic/New monster game`, `Logic/Monster move` (placed
  twice, action `answer` on a graded round and `next` on Next), `Logic/Draw monster`, `Logic/Finish monster`.
- **Graph shape, Make Ten's and Hunt's:** one Variable (`monsterGame`) is the whole game; Draw writes the lane from it; a reactive
  Condition on "over" runs Finish once, from the round's latest model. The answers pay stars and move the model as a race's do, under
  the game's id; Finish adds a landing's five, win or lose, once per id (`lastMonsterId`).
- **Home is at 32 of 32 nodes** with the Monster navigate. Every game card is enabled.
- **Not built:** two players (ruling 6), a sound per hit, a best score, a swipe.

### 16.3 Gates, and readings

- **Engine:** 12 new (190 in the suite, ENG1_EXIT=0): the rule table, a new game per way and pace, hits and knock-back, the creep (a third /
  a quarter, and creeping all the way is a heart), the timeout and the clock scale, the heart back (and none when full), win and loss and
  nothing after, the push and the step, whole games at the rating's extremes (a quick child wins in 6 / 15 answers, an always-wrong child
  loses in 9 / 12 / 24), the drawn lane in both languages, the finish (once, win or lose, the card's whole take, its own id, a sabotage arm),
  the grader's hit / push words beside the race's unchanged ones, the picker's scale.
- **Template:** 9 new (326 across the three suites, GATES1_EXIT=0): Home's card; every id the door kept; the round hearing a scale and a
  game while the race wires neither; the move placed twice with its action as a parameter; one Variable; paid only when over, from the
  round's model; the walk off the clock (the Lane's script evaluated); the setup's defaults written once and its rule; the three pixel maps,
  tokens only, every animation stilled for reduced motion. TC1/TC2_EXIT=0 (the typecheck includes `tests/`).
- 🔴 **Build 1 raised `wired-dimension-becomes-grow` on the lane:** the mover's wired % width sat on a ROW's own axis, where a % is
  flex-grow — the monster would never have moved. The lane is a column now. The same build raised `raw-spacing-literal` (two paddings) and
  GAM-005 (`variable-in-repeated-component`) on the Countdown bar's three Variables and the Question box's answer: Race/Round is now on
  two pages. Read in the source before marking them: a page is one route, the clock writes all three at every Start and the box writes its
  answer before Answered, so they carry `SHARED_ROUND`. Build 2: GEN2_EXIT=0, only the two expected warning codes.
- **Deploy** (`monster1`, production engine): DEPLOY1_EXIT=0. **`drive-tpl007-monster.js`, every arm ALL PASS:**
  - gate: FR 390×844 14/14, EN 1366×768 13/13 (opened, defaults, started, creep, bang, hit, runs, won, paid, pickLine, focus, endInView)
  - walk: EN 1366×768 4/4 (walks, timeout) · push: FR 1024×768 6/6 (cave, pushed, stepped) · screen: all six cells (sideways, fold,
    laneFits, verdict)
- **Screenshots looked at:** the setup's pills and rule; the horned monster at the far side and a third closer after a wrong answer;
  "Bang ! … un cœur en moins" with a heart gone; Challenge mid-walk with the bar at about half and the monster about half way, and at 0
  "Time's up." / "No hit"; the cave and a push; the phone's end card "La porte a tenu !", +11 ⭐, the 🎁 line, all three buttons on screen.
- 🟡 **Seen in the pictures, not graded, for Richard:** a fast answer's verdict still shows the race's 🚀 glyph (the line beside it says
  "big hit" / "poussée à fond"); on a laptop the lane is capped at 640 px, narrower than the question card; in Push it back (no hit dots)
  "Monstre 1 sur 3" sits at the right instead of the middle.
- **Race regression on the same build** (Race/Round, the Countdown bar, the picker and the grader were edited): `drive-rkt003-stage.js`
  ALL PASS across 10 cells (STAGE1_EXIT=0); `drive-rkt007-boost.js --arm defi` ALL PASS across 4 cells (BOOST1_EXIT=0).
- **Not run:** P87's other drives, `drive-tpl007-hunt/merge.js`, `test:ci`, `test:main`. Not published (the live site is §15's build).
- **Served for Richard:** <http://127.0.0.1:8782/> (`drive-deployed.js monster1 --hold`, session `b7cd9341`'s scratchpad).
- 🔴 **A peer's commit `9d77c9427` (22:15) swept this work half-done:** `tpl007Scripts.ts` and `tpl007Curriculum.ts` are in it whole, the
  components only partly (its message says "in progress"). The rest of §16 (components, gates, drive, artefact, this section) is uncommitted
  on top, so HEAD alone is a half-built Monster Gate.

### 16.4 For Richard

- Play it: the rule table is one constant (`MONSTER`), so "too hard" or "too easy" is a one-line change.
- The 🚀 on a fast verdict, the lane's 640 px cap on a laptop, and where "Monster 1 of 3" sits in Push it back: change or keep?
- Publish to nodegx.io (§15.3's hash-copy commands, with `drive-tpl007-monster.js https://nodegx.io --path /templates/rocket-school/`)?

### 16.5 Richard's first play: the bob stops after the first question (2026-09-14)

> "The monsters bounced around on my first try as they approached the door, but then after the first question they just slide towards
> the door" — Richard, 2026-09-14

- **Cause, read in the stylesheet:** the bob (`rkt-bob`) was the animation of the monster's box, and a hit, a lunge and an arrival are
  animations of the same box. The first answer's class replaced the bob, and the class stays until the next event, so it never came back.
  No clause graded motion; every screenshot is a still.
- **Reproduced before the fix** on the build he played (`monster1`): the drive gained `bobStart` (known-firing: `rkt-bob` running before any
  answer) and `bobAfter` (still running after a wrong answer and after a hit). EN 1366×768: bobStart ok, **bobAfter RED** — "no running
  rkt-bob after a wrong answer (… rkt-monster-lunge-b)" (BOBCTL1_EXIT=1).
- **Fix:** the bob moves to the pixels (`.rkt-monster::before`), which no event animates; the reduced-motion block stills `::before`
  (🔴 the reduced-motion checker reads a class name, so it could not tell the box from its pixels: a template gate names the selector).
- **Build 3** (`monster2`): GEN3_EXIT=0 with only the two expected warning codes, gates **327/327** (GATES3_EXIT=0, one new template gate),
  DEPLOY2_EXIT=0. `drive-tpl007-monster.js --arm gate` ALL PASS: FR 390×844 16/16, EN 1366×768 15/15 (**bobAfter green** after a wrong
  answer and after a hit); `--arm walk` 4/4. Push and screen arms not re-run (only the stylesheet's bob moved). Served on 8782 again.

### 16.6 Published with Monster Gate (2026-09-15)

> "publish to nodegx homepage please" — Richard

- §15.3's steps, from build 3: a copy of `templates/rocket-school` with `navigationPathType: "hash"` (`diff -rq` names only
  `nodegx.project.json`), built with the shipped `nodegx-deploy.cjs --base-url /templates/rocket-school/` (HASHDEPLOY_EXIT=0, production
  engine, the index reads `navigationPathType":"hash`) into a site-shaped stub, and **driven there first** under the path:
  `drive-tpl007-monster.js --arm gate --only 1366x768` 15/15 (HASHLOCAL_EXIT=0).
- **Before the push:** live Rocket School was §15's build (`index-003f93c…`, the local site's too); homepage md5 `ddb6ed6c…` local = live.
  `ops/deploy.sh` mirrors `site/` with `--delete`, so a dry run (`rsync -n --delete --itemize-changes`, the script's excludes) was read
  first: **no deletions**, attribute differences only.
- **Deployed** (`ops/deploy.sh 49.12.102.195`, OPSDEPLOY_EXIT=0): neighbours 200 before and after, service active, nodegx.io in Caddy's
  config, remote index.html md5 = local; **homepage md5 unchanged** (`ddb6ed6c…` local and live); the live build is `index-7410d1d5…`.
- 🔴 **The first live chain read NOT REACHED in every cell, Hunt included** ("no New player button"; LIVEGATE/WALK/PUSH/HUNT_EXIT=1), and
  its log was written at 07:26, hours after it was started. **Measured before believing it:** the index, script and engine answer 200, and
  one probe in the drive's own Chrome saw "Who is playing? … New player" at 3, 8 and 15 s with 0 console errors. The page renders; the
  chain most likely ran across the laptop sleeping. Re-run with timestamps in the log.
- 🔴 **That reading was wrong, and so was the second chain's cause.** Re-run awake (07:27:44–07:28:20): NOT REACHED again, every cell, in
  36 s. A timed probe saw "New player" 1.7 s after navigating, so not the load either. **The chains passed the path as `$P`
  (`P='--path /templates/rocket-school/'`), and zsh does not split an unquoted variable:** the drive got ONE argument, `arg('--path')` found
  nothing, BASE stayed `/`, and every cell looked for "New player" on the nodegx.io homepage. Measured: `node -e … $P` reads
  `bad option: --path /templates/rocket-school/`. Neither the site nor the drives were at fault; the third chain passes the path literally.
