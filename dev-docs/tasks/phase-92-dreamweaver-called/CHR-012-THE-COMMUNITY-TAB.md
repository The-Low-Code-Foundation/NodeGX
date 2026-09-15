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

## 4. Rulings to ask before building

| # | question | proposal |
|---|---|---|
| R9 | Does "How the community is doing" stay on the user's screen? | **No** — it is D21's launch-health readout for us. Move it to the platform's admin side or a debug view; the tab shows activity, not targets |
| R10 | Guest banner: a card, or a line in the page head? | **A line** in the head, `Sign in` as the one primary action |

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
