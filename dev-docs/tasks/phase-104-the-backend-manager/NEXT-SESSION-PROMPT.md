# P104 — next session

**Written 2026-09-24 (end of s1, the scoping session).**

## Where it stands

| task | built | driven | committed |
|---|---|---|---|
| BMG-000 the hand-off | ✅ s0 | ✅ headless, 3 drives | ⏳ **no** — five files in the working tree |
| BMG-001 … BMG-012 | — | — | — |
| BMG-013 Richard drives | his | — | — |

Built-but-undriven: 0. Built-but-uncommitted: **1** (BMG-000). That is the phase's only debt.

**Gate readings (2026-09-24, working tree = HEAD `0bc76db28` + BMG-000's uncommitted edits):**
- `packages/nodegx-backend`: `npx jest tests/admin-dashboard.test.ts` → **32/32**, size gate
  39,067 of 48,000 gzip (HEAD alone: 31,541).
- Editor: `LocalBackendCard.tsx` typechecks alone (s0's `tsconfig.card.json`); the whole-editor
  `typecheck` and `test:main` were **not** run on the card change. Run them before committing.

## What this session settled

- **The uncommitted edits are ours, not a peer's.** After the `/clear` this session's own
  earlier context (transcript `cc320161…`, 18:16Z–19:12Z) built BMG-000 at Richard's two asks and
  ended on *"Want me to commit them?"*, unanswered. The patch and copies are in this session's
  scratchpad `s0-backup/`. A `git status` that shows them is not evidence of a peer.
- **The plan is measured, not guessed.** README §2 counts 11 raw-composition prompts on the
  normal path, lists 13 things the routes can do that the page cannot, and 4 things the backend
  cannot do that the tabs need. Line numbers are the working tree's.
- **The research is filed** as `RESEARCH-WHAT-THE-LOVED-ONES-DO.md` (cited, 12 areas, 15
  patterns); README §3 says which six we take and which tab carries each.
- **The seam ruling is reversed by Richard's own words** (R2, 18:16Z): the editor's panels go.
  BAK-005's "the editor keeps its panel" no longer holds; carry the question with the answer.
- **The size gate makes R1 a real ruling**, not a taste: 9 KB of gzip left for ten tabs of
  composers.

## Do this, in order

1. **Ask Richard R1, R3, R4** in plain words (below). R1 gates BMG-001 and therefore the phase.
2. **Commit BMG-000** (its §5): editor `typecheck` + `test:main` (`tests-unit/tut-001`,
   `def-047`, `def-036` by name — read the suite count), then one commit through a temporary
   index of exactly: `packages/nodegx-backend/src/admin/ui/index.html`, `…/styles.css`,
   `…/LocalBackendCard/LocalBackendCard.tsx`, `…/local-backend/BackendManager.js`, and
   `dev-docs/tasks/phase-104-the-backend-manager/`. The real index holds a sibling's staged
   deletions of phase-102 files; do not sweep them.
3. **Build BMG-001** once R1 is ruled. Under (a): the app shell, the nav in §3.2, deep links,
   theme from core-ui's tokens by build step, the seven composers with specs, the fourteen views
   ported as-is, the gates moved onto the bundle. Drive AC2 (per-page text diff against a
   pre-port capture) before touching any tab.
4. Then **BMG-007** (smallest; Richard's example), **BMG-004** (his first complaint; needs R3),
   **BMG-002**, **BMG-005**, **BMG-006**, **BMG-008**, **BMG-003**, **BMG-009**, **BMG-010**,
   **BMG-011** (needs R4), **BMG-012**. One commit per task, a §6 *Built* with what each AC
   measured, shots in `shots/`, drives in `drives/`.
5. Drive against a **throwaway backend on a scratchpad data dir** (BMG-000's `drives/` shows
   the recipe: a second `nodegx-backend serve` + headless Chrome over CDP). Never the project's
   live backend. One heavy job at a time; tear the throwaway down after.

## The rulings, in plain words (for AskUserQuestion)

**R1 — What should the backend manager page be built from?**
Today it is one hand-written 3,000-line web page with no framework. It has a size limit and is
at 39 KB of the 48 KB allowed; the two pages built yesterday cost 7.5 KB. This plan adds about
ten more pages, each with pickers and builders.
- *Rebuild it as a small proper web app* (recommended): same single file a server copies, same
  security, no outside downloads, but the pieces (a search-as-you-type picker, the filter
  rows, the schedule builder) become reusable and testable. Cost: one session to move the
  existing fourteen pages across before any tab improves.
- *Keep the hand-written page and split it into parts*: no rebuild, but every new control is
  hand-rolled and untestable, and the size limit is raised.

**R3 — Should a user be disable-able without deleting them?** Every serious backend can block
someone from signing in and keep their data. Ours cannot; it needs a backend change (a flag
checked at sign-in, sessions ended). Recommended: yes, in the Users work.

**R4 — Should *Restore a backup* be a button in the browser?** It was left out on purpose in
July. Recommended: yes, behind typing the backend's name, with *back up first* ticked.

## Traps met this session

- `grep` in this shell is a function that silently drops matches on some files; use
  `/usr/bin/grep -a`. The agent hit it too.
- `find dev-docs -newer` and `ls --time-style` are not macOS; `stat -f %Sm` is.
- The editor stack `npm run dev:debug` running under this session's pid (started 20:58 local)
  was left up for Richard; the memory rule says tear down after a drive — this was not a drive.
  Stop it (`dev:stop --list` first) if nobody is using it.
