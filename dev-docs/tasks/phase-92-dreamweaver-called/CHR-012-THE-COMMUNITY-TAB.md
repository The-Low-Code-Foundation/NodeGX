# CHR-012 — The Community tab

Scoped 2026-09-15 at the end of s6, from Richard's look at CHR-005's shots.

> "005 and 003 are fine but the community tab still looks like shit, the font change is nice."
> — Richard, 2026-09-15

## 1. The person sentence

**Someone who opens the launcher's Community tab sees a place where people are talking — the questions,
the people, the next call — laid out like the Templates tab beside it, not an admin readout of a
launch target.**

## 2. What the screen shows (measured off `verdicts/CHR-005/2026-09-15/launcher-community-1368x900-dark.png`)

Read with the picture open. ✔ = read off the shot or re-read at HEAD `c4fbcde10`. · = not yet re-read.

| | reading | where |
|---|---|---|
| ✔ | **Two thirds of the 1368×900 window is empty ground.** The content ends at y≈590; the page is a banner, a tab strip, a sentence, one card holding one question, and one stats card | the shot |
| ✔ | The top is a full-width **guest banner card** ("Reading as a guest", `Sign in` / `Refresh` / `Open community.nodegx.io`) — three buttons in **three styles**, none of them `PrimaryButton` | `views/Community.tsx:509-540` — `css['PrimaryButton']`, `css['GhostButton']`, `css['OutlineButton']` from `components/community/Community.module.scss` (CHR-005 §6.5 left this second button vocabulary alone) |
| ✔ | The Bench filter is **a second chip style**: small boxed `Solved 1` / `Waiting for an answer 1 ✓`, not CHR-005's `Chip variant=Filter` that Templates and Learning draw | `components/community/CommunityFilterPill.tsx`, `CommunityBenchView.tsx:101` |
| ✔ | **"How the community is doing"** shows three tiles — `2 of 30 threads`, `0 of 3 consecutive weeks with a call`, `no replies yet (n=0, 2 unreplied), target under 24h`. That is the D21 launch-health readout: a target written for us, with `n=` notation, shown to every user | `views/Community.tsx:727-760`; the comment at `:735` says the wording is "graded" by D21's readout |
| ✔ | Every section is a **card inside the page**, with its own `SectionHead` / `SectionTitle`, so the tab reads as a settings form rather than a feed | `views/Community.tsx:575-760` (`Section`, `SectionCard`) |
| ✔ | The column, title position and tab strip are already CHR-005's (`LauncherPage`, `TabStrip`) — the frame is right, the contents are not | `views/Community.tsx:80-81` |
| · | Font sizes, radii and fills inside `Community.module.scss` | not counted |

## 3. Scope (proposed — the look decides)

1. **One button vocabulary:** the head's three buttons become `PrimaryButton` (`Default` / `Text` / `Muted`, `Small`), and `Community.module.scss` loses `.PrimaryButton`, `.GhostButton`, `.OutlineButton`.
2. **One chip:** the Bench's filter becomes `Chip variant=Filter` (keep `CommunityFilterPill`'s accessibility rule — a named group, the ✓ hidden from the accessible name).
3. **The guest banner shrinks to a line** in the page head (`LauncherPage` `actions`), not a card: who you are, and `Sign in`.
4. **The health readout leaves the user's screen** (R9 below) — or, if Richard keeps it, it is re-worded for a reader ("2 questions asked", "next call Thursday") with no `n=` and no target.
5. **Content, not containers:** the Bench list, Chat, Tutorials, Replays and People draw as the launcher's cards/rows on the page ground; section cards go.
6. **An empty tab is designed**, not a small card at the top of a tall page: what the community is, the next thing to do, one picture if one exists.

Out: the community platform's own web pages; what the Bench/Chat data is.

## 4. Rulings

✅ **Both ruled by Richard on 2026-09-15 (s7), as proposed.**

| # | question | ruling |
|---|---|---|
| R9 | Does "How the community is doing" stay on the user's screen? | ✅ **No.** It is D21's launch-health readout for us, not user content. The tab shows activity only. ⚠️ This reverses D21's *"keeps it visible rather than behind a click"* (`views/Community.tsx:724-725`) for the launcher; the reading is still computed (`mirrorview.healthFrom`) and where we read it instead is not built here |
| R10 | Guest banner: a card, or a line in the page head? | ✅ **A line** in the page head (`LauncherPage` `actions`), `Sign in` as the one primary action; Refresh and the browser door become quiet text buttons |

## 5. Acceptance criteria

1. **(person)** Richard looks at the tab at 1368×900 and 700×500, both themes, signed out and with a seeded signed-in view, and rules it **WORTHY**. Shots into `verdicts/CHR-012/<date>/`.
2. On the tab: `PrimaryButton` is the only button component and `Chip` the only chip (by kind, CHR-005 §6.3's instrument); visible text-bearing font sizes ≤ 6 (R1).
3. No text on the tab states a target or uses `n=` notation (unless R9 rules otherwise).
4. The existing community specs keep every behavioural assertion (sign-in, refresh, the Bench filter's counts, D15's absent state); class-name pins are re-pointed per R3, not deleted.
5. `test:ci` at the floor by name.

## 6. Traps

- 🔴 **The tab's contents are the platform's answers.** Signed out and signed in are different screens, and production has few rows — drive against a local platform seeded **lopsided** ([[drive-the-editor-against-a-local-community-platform]] — its three seeding traps) so a layout is judged with real density, then once against production.
- 🔴 `views/Community.tsx:735` records that the health wording is graded by D21's readout — find that grader before changing a word (R9).
- 🔴 Anything the tab's body renders under `tests-unit` must be hook-free, and a spec reaching `PrimaryButton` needs FLD-017's `Icon` `jest.mock`.
- ⚠️ P86 and P72 own what the community surfaces *do*; this task owns how they look.

## 7. Built — s7 (2026-09-15), uncommitted

### 7.1 What changed

- **Head (R10):** the `bg-2` identity card is gone. `views/Community.tsx` hands `LauncherPage` an `actions` group
  (`.Who`, still `data-test="community-head"`): Refresh and "Open community.nodegx.io" as `PrimaryButton` `Text`
  `Small` (the door carries an inline external glyph), a hairline, a 24px avatar, the handle or "Reading as a guest"
  with points · badges beside it, and — for a guest with a wired door — `Sign in` as `PrimaryButton` `Small`.
  `.PrimaryButton` / `.GhostButton`-in-the-head / `.OutlineButton` / `.HeadIdentity` / `.HeadActions` deleted
  (`.GhostButton` survives: `CommunityChatView` still uses it, P75 surface).
- **Tab strip:** moved into `LauncherPage`'s `toolbar` (the slot Templates' chips use); `.Tabs` wrapper deleted.
- **Health readout (R9):** not rendered. `health` stays on `CommunityMirrorView` and `mirrorview.healthFrom` still
  computes it — ⚠️ nothing reads it now; where we read it instead is not built. `.Health*` rules deleted.
- **One chip:** `CommunityFilterPill` is an adapter over `Chip variant=Filter` (Bench, People, Chat — both
  densities). `.FilterPill` / `.FilterCount` / `.FilterPillMark` deleted. `Chip`'s ✓ is now `aria-hidden`
  (FB-002's rule, which `Chip` did not carry — Templates and Learning gain it too).
- **Content, not containers:** `SectionCard` deleted from the tab and from `CommunitySection`. On the page density
  rows are ruled lines (`border-default` under each, the list bleeds one 12px gutter so text aligns with the lead),
  hover `bg-1`; the loading / empty / unreachable states sit in a dashed well; controls lose the card gutter.
  ⚠️ The **rail** (`Panel` density) is touched by exactly two things: the pill is now `Chip` (28px tall, not the old
  18px box) and `.ChipRow[role='group']` sets `gap 8px; margin 0 0 12px` in both densities. Not driven yet.
- Not changed: the thread / chat-thread / profile panes (`.Thread.is-density-page` is still a card).

### 7.2 Specs re-pointed (R3) — every behavioural assertion kept

- `rel-019/community-head-render` — head assertions unchanged; **new** AC2 row (every head button carries
  `is-size-small`, 3 signed out / 2 signed in); the "readout as tiles" block became **R9's absence** (seven readout
  phrases absent, with and without a median, beside a Bench row and the handle that drew).
- `nat-005/launcher-community-render` — the health block became R9's absence with the thread title as control;
  "the two page buttons" found by label inside `community-head` instead of `.GhostButton`/`.OutlineButton`.
- `fb-006/launcher-community-tabs-render` — `SectionCard === 2` → one `Section` and zero `SectionCard` per room;
  "4 of 30 threads" dropped from the chrome row.
- `fb-002/bench-filter-render`, `nat-008/people-render` — `FilterPill` class → `is-variant-filter`.
- `fb-002/filter-pill-state` — rewritten against `Chip.module.scss`: the selected edge ≥ 3:1 against BOTH real
  grounds (launcher `.ContentArea`, rail `BasePanel .Root`) and against its own wash **composited** over each.
  🔴 First run graded `primary-bg` (an `rgba` wash) as opaque and scored the edge 1:1 against itself — an instrument
  artefact, not a chip defect (`themeTokens.parseColorAlpha` names exactly this).
- `nat-001/palette-contrast` — the launcher Community rows re-grounded `bg-1`→`bg-0`, hover `bg-2`→`bg-1`, three
  rows removed with what they graded, two added (`PrimaryButton` Text at rest / hover). `DISTINCT_PAIRINGS` 48 → 51,
  counted off the table at HEAD and after (+4 −1, named at the constant).
- `Icon` stub (FLD-017) added to five specs that import the tab: `rel-019`, `nat-005`, `fb-006`, `nat-008`,
  `nat-007/thread-render`.

### 7.3 Readings (2026-09-15, tree `675f12f9d` + this change)

- jest over the 32 suites importing a changed module: first run **4 red** (2 failed to run on `Icon`, the pairing
  count, the opaque-wash artefact) → **32 / 32 suites, 887 / 887, EXIT=0**.
- `tsc -p packages/noodl-editor --noEmit` **EXIT=0**; `type` / `colors` / `tokens:css` / `icons:css` **all EXIT=0**.
- `type:baseline` lowered: `noodl-core-ui` 127 → **124**, the only moved entry `Community.module.scss` 7 → 4.

### 7.4 The drive — `verdicts/CHR-012/2026-09-15/` (dev stack, production community, SIGNED OUT)

Stack: `npm run start` with `NOODLPORT=8674 NOODL_REMOTE_DEBUG_PORT=9333 NOODL_USER_DATA_DIR=<scratch>/profile`
(`firstRunLegal.json` only), bundle confirmed carrying the change before each drive. Instrument `drive.js`: every
room × window size × theme; controls **by kind**; visible text-bearing font sizes (page and content area); the R9
words; CHR-005's rendered-contrast pass unchanged.

**Pass 1 — `prod-signed-out/`, 20 shots (5 rooms × 1368×900, 700×500 × dark, light), EXIT=0:**
- Title at **x120 y84** (1368) and **x20 y137** (700) — CHR-005's positions on every other tab. Sideways scroll
  `false` and past-the-right-edge **0** in all 20.
- **AC3:** R9's words (`How the community is doing`, `of 30 threads`, `consecutive weeks`, `median first reply`,
  `n=`, `target under`) found **0** times in all 20.
- **AC2 sizes:** visible text-bearing sizes on the page **5** (11, 12, 13, 15, 26), inside the content **3–4**.
- **AC2 controls:** `PrimaryButton` 3 controls / 2 styles (Text ×2, CTA); filter chip 2 styles (resting / selected);
  segmented room tabs 2. 🔴 **Two findings, both fixed in pass 2:** Chat's river still drew `.GhostButton`
  ("Open — no replies yet", one "other" control, and 9px right of the text column); and the row rules ran
  **108 → 1252** against a **120 → 1240** column (the list bled its hover gutter into its lines).
- Contrast: `boundaryUnder3` **1** in every shot = the segmented room strip's active fill (1.17); `textUnder45`
  **5 in dark, 0 in light** = the same strip read by the button's own `color` rather than its `Text` child. Both are
  CHR-005 §6.3's pre-existing / instrument rows, not this task's.

**Pass 2 — `prod-signed-out-v2/`, 6 shots (Bench, Chat, Replays × 1368×900 × both themes), EXIT=0:**
- Row and message rules are pseudo-elements inset by the gutter; the hover fill still bleeds. Shot: rules **120 → 1240**.
- Chat's verb is `.LinkButton` (the retry link's style, `.GhostButton` deleted — its last user), on the text column,
  text **5.45:1** light. The drive still counts it as "other" because its classifier names only `RetryButton` as a
  link — classification, not a second style.
- jest after pass 2 (`fb-013`, `nat-005`, `fb-002`, `rel-019`, `nat-001`): **14 / 14 suites, 480 / 480**, EXIT=0.

### 7.5 Owed (as written at the end of s7 — see §7.6 for what s8 did with it)

1. **Richard's look** at `prod-signed-out-v2/` (and pass 1 at 700×500) — the close.
2. **AC1's signed-in view**, against a local platform seeded lopsided. Prepared, not run: scratch DB
   `chr012_community` created (not seeded); `<scratch>/profile-signed-in` holds `firstRunLegal.json` and
   `nodegx.community.session.json` = `{"token":"dev-session-ada","handle":"ada-builds"}` — ✅ `scripts/seed.mjs`
   inserts that session hash itself, so nothing needs minting. Production's `COMMUNITY_URL` backed up before any swap.
   The seed gives the Bench 3 threads (1 solved, 2 waiting) and **no chat** — the genuinely empty room.
3. **700×500 after pass 2**, and **the rail panel** — the chip there is now 28px tall and `.ChipRow[role='group']`
   spaces it; not driven.
4. `test:ci` at the floor by name (AC5) — not run this session.
5. Not this task, recorded: the segmented room strip's active fill (1.17 / 1.10) is CHR-004/CHR-005's pre-existing
   row; `health` is computed and read by nothing (R9 — where we read it is unbuilt); the thread / profile panes are
   still cards.

### 7.6 s8 (2026-09-15) — the signed-in view, what it found, pass 3, the rail

**The signed-in drive found what two signed-out passes could not.** Local platform (`nodegx-community` `f39d20f`,
`next dev -p 3399`, scratch DB `chr012_community` re-seeded, EXIT=0), `COMMUNITY_URL` swapped to `localhost:3399`
(bundle confirmed carrying it), editor on a copy of `profile-signed-in` — head read `@ada-builds · 105 points ·
2 badges`, platform log `GET /api/v1/me 200`.

- `local-signed-in/` — 20 shots, EXIT=0. Title x120 y84 (1368) / x20 y137 (700) as signed out; 0 past the right
  edge; R9 words 0; page sizes **5** (11, 12, 13, 15, 26). 🔴 **Two bespoke buttons, both invisible to a guest:**
  Chat's composer verb `Say something` (`.ReplySubmit`) and People's `Take me off /people` (`.AcceptButton`) —
  outlined 3px boxes, "other" 1/1 in Chat and People. AC2 was false for every signed-in person.

**Pass 3 — one button vocabulary on the write surfaces too.** Every `.ReplySubmit`, `.AcceptButton` and
`.PostEditQuiet` in `components/community` is now `PrimaryButton` `Small`: the verbs (`Say something`, `Reply`,
`Post answer`, `List me on /people`) `Cta`; `Take me off /people`, `Accept this answer`, the edit's `Save` `Muted`;
`Edit`, `Remove`, `Cancel` `Text`. 12 sites in `CommunityChatView`, `CommunityListingCard`, `CommunityThreadView`;
the three rules deleted from `Community.module.scss` (0 left). `data-test`: `community-reply-submit`,
`community-accept`, `community-post-save|cancel|edit|remove`, `community-listing-ask|withdraw`.
Still raw `<button>`s, recorded not built: `LinkButton`, `PullButton`, the row buttons, `CommunityProfileView`'s four.

- Specs re-pointed per R3, every behavioural assertion kept: `fb-013/chat-composer-render` and
  `nat-007/thread-write-render` find the verb by `byTestId` (new, `support/renderElements.ts`) and read its words with
  `text()` — `PrimaryButton` puts the label in a child `<span>`, so `ownText` on the `<button>` is `''`;
  `rel-015/listing-render` reads `text(b)` (6 sites). 🔴 `PrimaryButton` imports `Icon` ⇒ FLD-017's stub added to
  **15** specs that reach the community package (`fb-002`×2, `fb-013`×2, `nat-007`×4, `nat-008`×2, `rel-015`×2,
  `tut-004`, `fb-007/capture-upload`, `nat-009/rfpboardview`) — the last two through `models/community/threadview`,
  found only by the full `tests-unit` run.
- `local-signed-in-v3/` (Chat, People × 2 sizes × 2 themes) — 8 shots, EXIT=0: **"other" 0/0 in all 8**;
  `PrimaryButton` 3 controls / 2 styles (the head's two `Text` + the room's verb).
- `local-signed-out/` (same platform, session file parked, head `Reading as a guest · Sign in`) — 20 shots, EXIT=0:
  "other" 0/0 in all 20; `PrimaryButton` 3 / 2; sizes page 5, content 3–4; R9 words 0.
- `rail/` (`rail.js`, the rail's Community panel on an open project copy, signed in) — 2 shots, EXIT=0: panel 378 wide;
  **chip 28px, both chips on one 300px row, no overflow, 0 past the panel edge**; sizes 11/12/13; `PrimaryButton` 2/1;
  "other" 5/1 = the panel header's `IconButton`s (mode controls + refresh), not a text button. The rail's section
  bands (`Discussions`, `Tutorials`) are the `Panel` density's own and were not touched.
- `COMMUNITY_URL` reverted: `git diff` on `communityorigin.ts` **0 lines**.

**Readings (2026-09-15, tree `2c5c31fa2` + this change):** full `tests-unit` **442 / 442 suites, 7,310 tests**
(first run 440 + 2 failed-to-run on `Icon`, fixed, re-run 2/2 58/58); `tsc -p packages/noodl-editor --noEmit`
**EXIT=0**; `type` / `colors` / `tokens:css` / `icons:css` **EXIT=0**; `type:baseline` core-ui **124 → 123**
(`Community.module.scss` 4 → 3; the two uncommitted stylesheets it absorbed are both this session's, by mtime).
`test:ci` (seed 39393, `.webpack-cache` cleared, no stack): **`2984 specs, 8 failures`** — the recorded floor's eight by
full name (SUB-006 ×3, SUB-011 ×3, NDA-017 ×2), 0 new; tree also carried the P88 peer's uncommitted `noodl-mcp` /
`nodegx-backend` / `noodl-runtime` / `validation/*.ts`.

### 7.7 Owed now

1. **Richard's look** — `local-signed-in-v3/`, `local-signed-out/`, `rail/`, beside `prod-signed-out-v2/`. The close.
2. `test:ci` at the floor by name.
3. Recorded, not this task: the thread and profile panes' remaining raw buttons (§7.6); the segmented room strip's
   active fill (CHR-004); `health` read by nothing (R9).
