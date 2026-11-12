# RKT-008 — The player menu

🔴 **A player can be created and never changed, while the one setting nobody changes mid-game sits
on every screen.** Findings 5 and 10 — one surface answers both.

## 1. The person sentence

**A child taps their face, fixes their name or changes class or language, and is straight back where
they were — and the language switch stops taking a row of every screen.**

## 2. What was measured (2026-09-13)

| reading | where |
|---|---|
| `Game/Header`: face + name, Home, Switch player, **and an EN/FR choice row**, on every signed-in page | `tpl007Components.ts:704-742` |
| in s1's `07-race-verdict.png` the pill row wraps to a second header row at ≈1100px | the screenshot |
| there is no edit UI; `Profiles/New player form` only creates | `tpl007Components.ts:1040` |
| `Logic/Update settings` writes lang, layout, level, sound, answerMode, look and seed — **not the name** | `tpl007Scripts.ts:907-921` |
| `Logic/Delete profile` shipped with no button | |
| `answerMode` is stored on the profile and offered by no form (TPL-007 §12.7) | |
| the keyboard layout follows the language at creation and is unreachable afterwards | |
| the Profiles page (no player chosen yet) has no language switch, so English is fixed until a profile exists | |

## 3. Design

- Header = **face + name as one button** (it opens the menu), and Home. One row at 360px.
- **Player menu** (a sheet on phones, a popover on wide screens): Edit player · Language · Keyboard
  (AZERTY / QWERTY) · Sound · Answers (type / buttons / auto) · Pad (on / off / auto — RKT-005) ·
  Switch player.
- **Edit player is the New player form in edit mode**, prefilled — one form with two modes, not a
  second form: name, face, class. Delete player at the bottom, with a confirm that names them.
- Profile cards on the Profiles page get an edit affordance too.
- The Profiles page gets a quiet "English · Français" link, not a pill row.
- `Update settings` accepts `name` under Create's rules (trimmed, 24 characters, never empty).

## 4. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | ✅ (s10) Engine gate: Update settings renames under Create's rules; an empty name is refused; sabotage arm. |
| AC2 | ✅ (s10, build 7) Drive: the header bar is one row (its height ≤ one control plus padding) at all five viewports, FR and EN. |
| AC3 | ✅ (s10, build 7) Drive: menu → Edit → rename and change class → save → the header shows the new name and the next question comes from the new level, both still true after a reload. *As driven: "from the new level" = four questions all CM1 or CM2, because the picker offers a level and the one below (§5).* |
| AC4 | ✅ (s10, build 7, `home-lang` through the menu) ~~Drive: switch language from the menu mid-race → the race carries on in the new language.~~ **Replaced by Richard's ruling below:** the language (and Switch player) is offered on Home and before a race, and is absent inside a live race. Drive: from Home, switch language → Home is in the new language, still after a reload, and the next race's pad has that language's decimal point. |
| AC5 | ✅ (s10, build 7) Drive: with two players, delete one → gone from Profiles after a reload, the other intact. |
| AC6 | ✅ (s10, build 7) Answers set to "buttons" from the menu → the next question that allows it shows options. |
| AC7 | ✅ (s10, build 8: (a) kit + engine gates with sabotage arms, (b) `pick` 7/7, (c) `detect` 4/4) **Added from Richard's ruling, 2026-09-13 (below).** The on-screen keyboard follows the child's real keyboard. (a) Kit or engine gate: the first physical keypress decides the layout by its `code`/`key` pair (`KeyQ`→`a` ⇒ AZERTY), stores it on the profile once, and never overrides a layout the child picked; sabotage arm. (b) Drive: a small **FR / UK / US** dropdown sits beside the on-screen keyboard; pick FR → the map redraws AZERTY and the next typing question drills AZERTY's home row, still true after a reload. (c) Drive: an English player on a French keyboard types one key → the map is AZERTY with no menu visit. |

## 5. Record

### Session 10 (2026-09-13)

**RED first, on build 5 (`rocket-h5`, 8776), before any change:**
- **AC1, engine:** the new gate ran against today's `Update settings`. The rename left "Léa" as "Léa", and `Active profile` had no
  `soundMode` (2 failed, on their assertions).
- **AC2, drive** (`drive-rkt008-menu.js --arm row`, a 24-character name, all five viewports × FR/EN): **RED_ROW_EXIT=1, `rowHome` and
  `rowSetup` red in all 10 cells.**
  - The bar is **106 px** tall at 1366, 1280, 1024 and 768 wide, against a tallest control of 44.
  - On the phone it is **158 px on Home and 214 on the race setup**: face and name, then Switch player, then EN/FR.
  - 🔴 **The drive's first RED run graded nothing.** It found the bar from the new ▾, which build 5 does not have, so every clause read
    `bar: null`. The finder now climbs from the name to the face, which both builds share, and the second run above is the real one.

**Build 1 as built (build 6 of the template), and where it differs from §3:**
- **The bar is one row:** the face and name, which open the menu (with a ▾ that takes the keyboard's focus), then Home. It never wraps. The
  name takes what Home leaves and wraps inside that space.
- **The menu:** Edit player, Language (English / Français), Keyboard (FR / UK / US), Sound (on / off), Answers (type / buttons / auto),
  Switch player, and Close.
  - ≠ §3: it opens **under the bar, in the page**, not as a sheet or popover (no overlay pattern exists in the template).
  - ≠ §3: **no Pad row.** Nothing in the profile or the race reads a pad setting (RKT-005 chooses the pad by pointer), so the row would do
    nothing.
- **The menu's scripts live in `Game/Header`,** not on the page, because a page is capped at 32 nodes and Home was at 31. The page hands in
  the store, and writes what comes back. The menu starts **closed**, from a States node whose first state is `closed` (D55).
- **Two `Update settings`, never one:** one writes a setting at once, and one writes the edited player on Save. The form's Variables are
  global by name, so a single script fed by both could write a stale face whenever the language changed.
- **Edit player is the New player form in edit mode.** Fill puts the player's name, face and class in, and the language row steps aside
  (the menu has it). Delete asks, by name ("Delete Sam? Their stars and progress go too."), before it deletes; "No, keep" is the loud
  button.
- **`Update settings`** renames under Create's rules (trimmed, 24 characters, an empty name refused) and takes the sound pills' on/off.
- Not built (≠ §3): an edit affordance on the Profiles page's cards, and the Profiles page's "English · Français" link. The ACs don't
  need them, and each would cost the Profiles page nodes.
- Door refusals on the way, both caught with a fix suggested: a Choice row instance has no Mounted (the language row is now wrapped in a
  Group), and a Function node's script ports are `in-…` / `out-…`.
- **Readings:** GEN_EXIT=0 (only the two warnings the gate allows), gates **264/264** (JEST_EXIT=0), TC_EXIT=0, DEPLOY_EXIT=0. Served on 8777.

**Build 1 driven (template build 6, `rocket-m6`, 8777): MENU_EXIT=1, HOMELANG_EXIT=1, and two faults, both fixed in build 2.**
- **AC2 `row`, all five viewports × FR/EN:** every layout clause green in all 10 cells: `rowHome`, `fitsHome`, `closed`, `opens`, `rowSetup`,
  `fitsSetup`, and `keyboard` (the ▾ plus Enter opens the menu). Only `quiet` was red, from the fault below.
- **AC5 `delete`:** `asks` ("Delete Sam?", and Sam still stored), `kept` (No, keep), `gone` (Profiles, Léa only), `reloaded`: all green.
- **AC6 `answers`:** `control` (Auto asked a typed question), `stored` (answerMode "options"), `buttons` (four of four showed options): all green.
- **AC4 `home-lang`,** adapted to open the menu: 8/9 in both cells, with only `quiet` red.
- **AC3 `edit`:** `renamed` and `kept` were green in both cells (Zoé in CM2, still after a reload). Two clauses were red:
  - 🔴 **`filled`: the form opened with an empty name box. D66.** The form wired `name0 → nfName.text`, and a Text Input has no `text`
    input (its value is `startValue`). The door passed it, the console said "Invalid connection, input doesn't exist" on every page,
    and every cell's `quiet` went red with it. Build 2 wires `startValue`, and Fill pulses Set.
  - **`level` was the drive, not the product.** After CE2 → CM2, the first question was a CM1 skill. The picker offers a player's own level
    and the one below (`tpl007Scripts.ts:681-683`), so a fresh CM2 player draws CM1 or CM2, and a CE2 player can draw neither. The clause
    now takes four questions and wants every one to be CM1 or CM2.

**Build 2 = template build 7 (`rocket-m7`, served on 8778):** KIT_EXIT=0, GEN_EXIT=0 (only the two warnings the gate allows), gates
**268/268** (JEST_EXIT=0), TC_EXIT=0, DEPLOY_EXIT=0.
- **`drive-rkt008-menu.js`: MENU_EXIT=0, ALL PASS across 14 cells.**
  - `row` in all 10 cells (8/8 at 1366×768 with `keyboard`, otherwise 7/7), `quiet` included.
  - `edit` 5/5 in FR 390×844 and EN 1366×768: `filled` (the box holds Léa), `renamed`, `kept`, and `level` (four questions, all CM1/CM2).
  - `delete` 5/5, `answers` 4/4.
- AC2, AC3, AC5 and AC6 are green on build 7.
- **`drive-rkt008-keys.js` on build 7: KEYS_EXIT=1.** `pick` 7/7 (looked at: the map AZERTY, a small "FR" select at its top-right corner).
  But **`detect` was 2/4: after a press of the Q key typing "a", the store read `layout: qwerty, picked: true`**, before any pick.
  - 🔴 **Cause:** the race page fed ONE `Update settings` both the report and the pick. The Dropdown's Value output already held the
    profile's layout from its mount, so every key press ran the script with a "pick" in it. The script marked the layout picked, and
    detection never wrote. The header had taught the same lesson ("two scripts, never one") an hour earlier. The engine gate could not
    see it, because it fed one input at a time.
  - **Build 8 splits it:** `rcKeys` takes only `layoutSeen`, `rcPick` takes only `layout`, and the template gate pins that neither takes
    the other's input.
- **The hangar on build 7** (its header changed): pick 13/13 × 3 (HANGAR_PICK_EXIT=0), screen × 6 (0), reduced (0).
- **The regression set on build 7** (`m7-regress.log`, 19 drives): **18 of 19 exit 0**, home-lang included (**AC4 green**, `quiet` too).
  Red: KEYS_EXIT=1, the stage drive's `--keys` arm, **one round of 20**. EN 1366×768 round 3 (a timeout) read "Next was not focused when
  the verdict arrived", and the other three timeout rounds passed.
  - **Re-run three times on build 7, one at a time, after build 8's chain:** STAGEKEYS_RERUN1_EXIT=0 and RERUN2_EXIT=0, but **RERUN3_EXIT=1,
    the same clause on the same kind of round** (a timeout, on an options question, "Which is bigger: 9,716 or 7,731 ?").
  - 🔴 **Two of four runs failed, so it is intermittent, not a one-off.**
  - **The control, build 5, four runs: 0 red. Build 8, six runs: 2 red**, both on the timeout round.
  - The drive now says what held the focus. Both build 8 reds read **focus on `BODY` at the verdict's first reading, and on `BUTTON Next`
    600 ms later.**
  - **So the product focuses Next, a little after the drive's first look.** `FOCUS_BUTTON_SCRIPT` focuses one frame after the card
    mounts, and the drive reads at the first poll that shows the verdict. The heavier graph since build 7 may widen that gap; the gap
    itself is not timed.
  - Not a child-facing miss: a child reads "Time's up." before pressing Enter. The clause is left as it was, and the choice of what it
    should grade is in the next-session prompt.
- **Build 8 (`rocket-m8`, served on 8779):** GEN_EXIT=0, gates **268/268**, TC_EXIT=0, DEPLOY_EXIT=0. **`drive-rkt008-keys.js`
  KEYS_EXIT=0: `detect` 4/4, `pick` 7/7.** The pad's typing arm: PAD_TYPING_EXIT=0. **AC7 is green.**

**AC7 RED first, on build 6, before any change** (`drive-rkt008-keys.js`, EN 1366×768): RED_KEYS_EXIT=1.
- `detect`: `before` green (the map QWERTY, and the store qwerty), then after a press of the Q key typing "a", **`detected` red (the store
  still qwerty) and `redrawn` red (the map still QWERTY).**
- `pick`: **no dropdown.**

**AC7 (build 2), as built** (the first build 7 run: KIT_EXIT=0, GEN_EXIT=0, then JEST_EXIT=1 at 266/268. The kit gate still listed the
pad's two old outputs, and the door warned that a Static Data array may not arrive in the Dropdown's `optionslist` Items, so the items are
now a Function run on the keyboard's mount):
- **Detect:** the kit's `layoutFromKey(code, key, shift, chord)` reads which keyboard it is from one key press:
  - AZERTY: `KeyQ`→a, `KeyA`→q, `KeyW`→z, `KeyZ`→w, `Semicolon`→m, `KeyM`→",", or an unshifted digit-row key that types & é " ' ( …
  - QWERTY: the same letter keys typing themselves.
  - Nothing: a key both share, Shift on the digit row, or an unshifted digit, because Caps Lock on a French Mac types digits too.
  - The Answer Pad reports it as `Layout` / `Layout Seen`, even while it waits, once per keyboard.
- **Store:** `Update settings` takes `layoutSeen` and writes it only while the child has picked no keyboard, and only when it is a
  different one. A picked `layout` sets `layoutPicked`, so no later key press undoes it.
- **Pick:** a FR / UK / US dropdown (`net.noodl.controls.options`) sits at the keyboard's top-right corner. A pick goes up through
  Race/Round and Race/Play to `rcKeys` on the race page. The menu's Keyboard row is a pick too.
- **UK (the builder's call, recorded):** its own value, `qwerty-uk`, which draws and drills exactly QWERTY's letters. It has its own name
  only so the dropdown still shows UK after a reload. Its punctuation (£, the extra \) is not drawn.
- `navigator.keyboard.getLayoutMap()` is not used. The first key press is the only way it detects.
- Gates: kit (a 15-row table and a character-only sabotage arm), engine (stored once, never over a pick, and a sabotage arm that removes
  the picked check), and template (every wire up to the store, and a report never reaching Layout). Drive: `drive-rkt008-keys.js`
  (`detect` for AC7c, `pick` for AC7b).

## Ruled 2026-09-13 (evening): the keyboard follows the keyboard, not the language

> "I'm on a French keyboard on this Macbook, but the keyboard that is animated on the lesson page is qwerty" … "Either auto detect or
> why don't we have a little dropdown next to the keyboard with like FR, UK, US or something?" — Richard, 2026-09-13

**Cause, read from source (not driven):** a profile's `layout` is set once in `CREATE_PROFILE_SCRIPT` from its language (fr → azerty,
else qwerty). The Profiles page has no language switch, so every new player gets QWERTY. The EN/FR switch writes `lang` only. Build 5
(`rocket-h5`, 8776) has no Keyboard choice anywhere. Richard played build 5 on a French MacBook and saw QWERTY.

**Ruling:** build both. Detect the layout on the first keypress. Put a dropdown right beside the on-screen keyboard as the override,
so the child never has to find it in the menu. The menu's Keyboard row (§3) can stay, but it isn't needed to fix this.
- FR / UK / US are Richard's labels ("or something"). UK and US share every letter and differ in punctuation (`£`, `@`/`"`, `#`, an extra
  `\`). The kit has only `azerty` and `qwerty`. Whether UK gets its own map or shares QWERTY's is the builder's call. Record the choice.
- `navigator.keyboard.getLayoutMap()` is Chromium-only. It can seed the guess before the first keypress, but it can't be the only way.
- Leave the detected language alone: a French child may choose English questions.

## Ruled while waiting (2026-09-13)

Since RKT-003, "Changer de joueur" and EN/FR are shown on Home only, and are hidden during a race. Asked whether that is fine until this task lands, Richard chose **"Fine until RKT-008"**. Nothing goes back into the race header before this task.

🔴 **That premise was false, measured 2026-09-13 (session 6) on RKT-005 build 2.** Home showed **no** EN/FR and **no** Switch player: 0 of each,
at 1366×768, before and after a race. The race setup showed both, and a live race neither. The cause is D55. `Game/Header` mounted the
row from `compact !== true`, and Home never wires Compact, so the Expression never evaluated and the row stayed unmounted. Richard had
created an English player and could not reach French to check RKT-005's `,` key:

> "i can't change the language once set so i'm stuck with decimal points … ah i can change in game but not on the home screen, should be
> home screen too, just not inside a live game" — Richard, 2026-09-13

**Ruling:** switch player and language on **Home** (and before a race, as now), **never inside a live race**. It is built ahead of this task,
because it blocked RKT-005's AC6. The row is now mounted by a States node whose first state is `roomy`, so a header that is never told
Compact shows it. The rest of this task (the menu itself) is unchanged.

**Built and driven 2026-09-13 (session 6), `scripts/devtools/drive-rkt008-home-lang.js`, 1366×768 and 390×844, an English player:**

| | build 2 (RED) | build 3 |
|---|---|---|
| `homeSignal` Home's own words | 2/2 | 2/2 |
| `homeLang` EN + FR on Home | **0/2** (0 and 0) | 2/2 |
| `homeSwitch` Switch player on Home | **0/2** | 2/2 |
| `toFrench` FR on Home turns Home French | **0/2** | 2/2 |
| `kept` still French after a reload | **0/2** | 2/2 |
| `setupLang` race setup offers EN/FR | 2/2 | 2/2 |
| `raceNoLang` no EN, FR or Switch inside the live race | 2/2 | 2/2 |
| `frenchPad` the race's pad has `,` and no `.` | **0/2** (`1234567890.`) | 2/2 |
| `quiet` no console error | 2/2 | 2/2 |

RED_EXIT=1, LANG_EXIT=0. Build 3: GEN_EXIT=0, gates 196/196 (a template gate pins `roomy` as the first state and `hdRoom.more` as the row's only mount),
`typecheck:mcp` 0. Regressions on build 3: wrap 60/60, look 14/14, stage 1366×768 + 390×844 4/4, pad touch FR 390×844 5/5, all exit 0.
🔎 **Changed by RKT-006 (session 7): in a live race the page header is not shown at all.** Restart and Change the race took a row of the
race stage, and the only room for it that kept Next and Got it on screen was the bar's (see RKT-006 §5). So inside a live race there is
no face, no Home and no menu: Home is one tap past Change the race. This task's one-row header (AC2) and the menu apply to Home, the
setup and Profiles. The ruling above (nothing about the player inside a live race) now holds by construction. 🔴 Two tries hid Home's whole bar (builds 3 and 4).
Each wired an Expression straight into the bar's Mounted, and Home never feeds that Expression. Renaming the port changed nothing. The bar
is now mounted by a States node whose first state is `shown`, the pattern this task's ruling used above.

Looked at: [`rkt008-after-390x844-home-fr.png`](rkt-shots/rkt008-after-390x844-home-fr.png): Home in French. 🔴 On a phone the header
stacks into **three rows**: face and name, then Changer de joueur, then EN/FR, about 200px before the first reading. Nothing overflows
(wrap 60/60), but this is finding 10's "waste of space" back on Home, and it is this task's one-row header (AC2) to fix. Also looked at: [`rkt008-after-1366x768-race.png`](rkt-shots/rkt008-after-1366x768-race.png) (the race header is face,
name and Accueil only; the pad shows `,`).
