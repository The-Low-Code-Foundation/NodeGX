# CHR-011 — The after picture

The phase closes on a look, not a suite. This task takes the same pictures CHR-001 took, in the
same way, puts them side by side, re-measures the four numbers, and asks Richard.

## 1. The person sentence

**Richard opens one page, sees before and after for the launcher and the panel in both themes,
and says WORTHY or not — and if not, the page says which region.**

## 2. What exists

- `verdicts/CHR-001/<date>/`: eight PNGs, both themes, `numbers.json`, a manifest with the HEAD
  sha and viewer md5.
- Each task since has its own `verdicts/CHR-00N/<date>/` set with a written verdict.
- P81's protocol (`VIB-001-THE-JUDGE.md` §5): a verdict written without the image in context is
  void; Richard's look supersedes a session's in both directions; not-WORTHY names the seam.
- The audit page's side-by-side layout (`audit/dreamweaver-called.html`, "The gap, side by side")
  is the shape to reuse.

## 3. Scope

1. **The same eight pictures, on the packaged build of HEAD**, not the dev stack — the thing a
   user installs. Build it (`npm run build:editor` / the release script; one heavy job), launch it
   with the CHR-001 recipe on private ports, seed the same fixtures, both themes.
2. **`numbers.json`** re-taken with the same eval; the static counts re-taken.
3. **`verdicts/CHR-011/<date>/index.html`**: before/after pairs, dark and light, for each of the
   eight surfaces; under each pair the two numbers that apply; a verdict slot per surface. Plain
   HTML, images relative, no build.
4. **Richard rules.** Each surface: WORTHY / PASSABLE / SHITTY, in the file, with the region named
   for anything not WORTHY. A not-WORTHY reopens the task that owns the region (CHR-006 or
   CHR-009) with the sentence as its first AC.
5. The README's status line, §5 table and §8 end condition updated from the task files — not from
   the previous handoff ([[write-the-next-session-prompt-every-session]]).

## 4. Acceptance criteria

1. **(person)** Richard has written two verdicts in this file, one per surface, with the images
   open. **Both WORTHY closes the phase.**
2. `numbers.json` after vs before, in the file:

   | number | CHR-001 | CHR-011 | promised by |
   |---|---|---|---|
   | font sizes, Templates tab | 10 | ≤ 5 | CHR-002 |
   | font sizes, Group panel | 10 | 2 | CHR-002, CHR-009 |
   | button styles, Templates tab | 7 | ≤ 3 | CHR-005 |
   | elements / inline-styled, Group panel | 1,125 / 250 | ≤ 600 / ≤ 30 | CHR-008 |
   | `createRoot` files under `propertyeditor/` | 39 | ≤ 3 | CHR-008 |
   | `fa-` uses editor-wide | 32 | 0 | CHR-010 |
   | tests parsing CSS text | 28 | ≤ 4 | CHR-004 |

   Every row moved as promised, or the row names the task that stays open.
3. The pictures are of the **packaged** build — the manifest carries the `.app`/AppImage's version
   and the `app.asar` md5, not a dev-server URL.
4. The ratchets (`type`, `colors`, `icons:css`, `tokens:css`, the CHR-004 gates) all green on the
   commit the pictures were taken from, and that sha is in the manifest.

## 5. Traps

- 🔴 **A packaged build takes the whole box.** Announce it, check for peer suites first, and do
  not run the dev stack beside it ([[do-not-pile-cpu-work-on-a-shared-box]]).
- 🔴 **Compare like with like.** CHR-001 shot the launcher with two seeded projects and a
  reachable shelf showing seven templates. Seed the same two, confirm the shelf row count, or the
  before/after is two different surfaces.
- ⚠️ A WORTHY on dark and a PASSABLE on light is two verdicts, not one. Record both; the phase
  closes on both.
