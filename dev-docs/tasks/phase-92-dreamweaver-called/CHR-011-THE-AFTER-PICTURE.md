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

## 6. The static half, taken 2026-09-18 (s33) at `f8558113`

The pictures need a **packaged** build (§3.1, AC3) and this session could not honestly take one:
two peers hold uncommitted work in this checkout (P88's backend/mcp/template edits, P93's panel
work), `build-editor.ts` refuses a dirty tree without `--skip-git`, and a build taken with
`--skip-git` would bake their work into the `.app` whose md5 the manifest is supposed to pin. That
is the same isolation problem s32 hit with the dev stack, one step worse — so **CHR-011 wants a
session with a clean tree and the whole box.**

What does NOT need the build is AC2's static half. Taken here, so the picture session only has to
re-take the rendered rows:

| number | CHR-001 | now | target | verdict |
|---|---|---|---|---|
| `fa-` uses editor-wide | 32 | **0** | 0 | ✅ CHR-010; `npm run icons:font` holds it at zero over 3,183 files |
| `createRoot` files under `propertyeditor/` | 39 | **38** (code calls; a plain grep reads **42**, counting prose) | ≤ 3 | ❌ **CHR-008 stays open** — its §3.1 widget conversions are shipped inert, and the ≤3 target is unreachable while popout roots exist (CHR-008 §10.4). 🔴 Report both counts or the next session re-derives the same trap |
| `tests-unit` specs parsing CSS/SCSS text | 28 | **24** | ≤ 4 | ❌ **CHR-004 stays open** — s30 deleted the six colour-pinning specs; the rest is §3.3, which s31 re-priced at ~18 call sites and Richard has not ruled |
| `type` (font-size ratchet) | baseline | **−3 vs baseline**, exit 0 | no regression | ✅ |
| `colors` (hex ratchet) | 16 = 16 | **holding the line**, exit 0 | no regression | ✅ |
| `icons:css` | — | **0 url()-to-SVG**, exit 0 | 0 | ✅ |
| `tokens:css` | — | **every `var(--…)` in 333 stylesheets defined**, exit 0 | green | ✅ |

The four rendered rows — font sizes on the Templates tab and the Group panel, button styles, and
elements/inline-styled on the Group panel — are the ones the packaged build still owes.

⬜ ~~**Also owed, and cheaper:** CHR-004's look gate over the surfaces CHR-010 changed.~~
✅ **Superseded — it WAS run later in s33**, after this section was written: panel GREEN on a Group
both themes (638 readings), exit 1 on an `Icon` node for the `ColorInput` swatch edge, launcher green
after two ruled fixes. Readings in **CHR-004 §8**, which is the artefact to read, not this line.

## 7. s34, 2026-09-18 at `24d2a282c` — Richard ruled the build waits, so everything else is ready

**Richard's ruling, asked in plain words and answered in one click: _wait until the machine is free._**
The alternatives put to him were building a private copy of the repo now (~1 hour of the box) or
packaging the checkout as it stands. He chose to wait, so **no build was taken and no picture is new.**

### 7.1 Why the build could not honestly be taken here

Three sessions disowned the same dirt, so this is now a fact about the checkout rather than one
session's impression:

- The working tree carries **36 modified and 15 untracked paths dated 2026-09-16** — `templates/todo-list*`,
  `library/prefabs/date-picker`, `packages/nodegx-backend/src`, `packages/noodl-mcp/tests`,
  `packages/noodl-runtime/.../local-sql` — plus **staged deletions** of two date-picker Inter fonts.
  P93 and P95 were both asked and both say the paths are not theirs. 🔴 **The pile is unowned and
  only Richard can say what happens to it**; nobody may pathspec-commit another session's unstaged
  edits ([[pathspec-commit-sweeps-a-sibling-edit]]).
- P93 then took the box for several hours — `VisualCanvas/*`, `EditorDocument.tsx`, `main.js`, the
  viewer frame, then jest, `tsc`, `test:ci` and a dev-stack drive on 8680/9444. Those paths are
  **inside the app CHR-011 photographs**, so the tree does not merely stay dirty, it stays dirty
  *in the photographed surfaces*.

🔴 **The worktree escape hatch does not work here, and the reason is worth keeping.**
`make-worktree.sh`'s own header says `lerna exec` resolves the package root to the **primary**
checkout even when launched from a worktree — and `build-editor.ts` is `npx lerna clean --yes`
followed by `npx lerna exec --scope noodl-editor -- npm run build`. So a "clean worktree build"
would clean and build **primary's** tree, peers' dirt and all, while reading as isolated. A
standalone `git clone` *would* be correct (it is a repo of its own, so lerna resolves inside it);
it costs a second full `npm install` and ~1 hour of the same 8 cores. That is the option Richard
declined for now, not one that was never found.

⚠️ Also worth knowing before the next attempt: `build-editor.ts` gates on **`git diff --numstat`**,
which is *unstaged tracked* changes only. Untracked files do not refuse it, and neither do staged
ones. And `build:editor:_editor` does `npx rimraf ./node_modules` + `npm install` at the repo root —
**that is what makes this the whole box**, not the electron-builder step.

### 7.2 The static half re-measured at this HEAD — every number unchanged

Re-taken at `24d2a282c` (§6 was taken at `f8558113`), so AC4's "green on the commit the pictures
were taken from" has a fresh reading to stand on:

| gate | reading at `24d2a282c` | exit |
|---|---|---|
| `npm run type` | −3 raw px vs baseline | 0 |
| `npm run colors` | 16 = 16, holding the line | 0 |
| `npm run icons:css` | 0 url()-to-SVG over 332 stylesheets | 0 |
| `npm run icons:font` | 0 Font Awesome references over 3,187 files | 0 |
| `npm run tokens:css` | every `var(--…)` defined over 333 stylesheets | 0 |

🔴 Gated on the **exit status**, taken without a pipe — a `| tail` would have handed back `tail`'s
code ([[a-pipe-eats-the-exit-code-you-are-gating-on]]).

The two counts that name an open task are also unchanged: `createRoot` under `propertyeditor/` is
**38 files / 46 calls** (42 by plain grep, which counts prose), and **24** `tests-unit` files read
`.css`/`.scss` from disk.

### 7.3 The capture recipe was checked against the source, and one string has moved

Every selector CHR-001's `capture.js` depends on still exists at this HEAD — the launcher nav, the
project card, the Editor-mode toggle, `.sidebar-property-editor`, `.property-type-chip`, the
ScrollArea root, the node-picker input. **One does not:** `applies when Shadow Enabled is on`, which
CHR-001 counted **six** times, is **gone from the source**. CHR-008's R8 slice replaced it with the
single sentence *"Offset X, Offset Y and Color apply once Shadow Enabled is on."*
(`propertyeditor/model/groupGate.ts`).

🔴 That is a **promised move, not a broken capture** — but a script that counts only the old string
reads `0` and looks like a surface that failed to render. The CHR-011 capture counts both.

### 7.4 What is ready to run, so the picture session is short

Written this session, in `verdicts/CHR-011/`:

- **`capture.js`** — CHR-001's flow, changed in exactly three places: it **reads CHR-001's own
  `measure.js`** rather than carrying a copy (a before/after taken with two different evals measures
  nothing), it counts **both** shadow sentences, and it asserts its preconditions loudly — the
  Templates shelf row count (§5's compare-like-with-like), the Group chip, the `Box Shadow` heading,
  and the panel's real box rather than the hidden 0×16 shell the editor never unmounts.
- **`build-page.js`** — writes `<date>/index.html`: the eight before/after pairs, the AC2 tables,
  and a verdict slot per surface. Missing after-shots render as a labelled gap, so the page cannot
  quietly be short of pictures.
- **`2026-09-18/index.html`** — already generated, and it says **0 of 14 after-shots taken** at the
  top. The before column and both number tables are live; open it with
  `open dev-docs/tasks/phase-92-dreamweaver-called/verdicts/CHR-011/2026-09-18/index.html`.

⚠️ **Neither script has met a running renderer.** They were written from the source, which is not the
same thing — expect the first run to find instrument faults before it finds product ones
([[a-new-instruments-first-drive-finds-instrument-faults]]).

### 7.5 The recipe, for the session that gets the box

1. `git status` — the tree must be clean, or the `.app` is not HEAD. Ask the peers, do not assume.
2. `npm run build:editor` (one heavy job; announce it, and announce the teardown to the same list).
3. Install or run the packaged app on private ports with the CHR-001 profile recipe (manifest
   `launch` field), seeded with the **same two projects**, one run per theme.
4. `NOODL_REMOTE_DEBUG_PORT=9333 node verdicts/CHR-011/capture.js <theme> verdicts/CHR-011/<date>`
5. Write `<date>/manifest.json` with the HEAD sha, the app version and the **`app.asar` md5** (AC3),
   then `node verdicts/CHR-011/build-page.js <date>` and `open` the page for Richard.

### 7.6 The blocker moved, later the same session — the tree is no longer the problem

§7.1 says the build was blocked by an unowned pile and by P93's hours. **Half of that is gone.**

Put to Richard in plain words — *fifty files of unfinished work from 16 September, three sessions
have each said it is not theirs, and it is what blocks the screenshot build* — he ruled: **it is
wanted; check it holds together and commit it properly.** Done, in three commits:

| commit | what |
|---|---|
| `ad40fc9cb` | P78/TPL-008 s5–s7b: the `date-picker` prefab rewritten at v2.0.0, `Todo/Date picker` and `Todo/Reminders switch` in both templates, the `todo-digitalbricks/` ops dir, SYN-003's `clientObjectId` |
| `e1352b58a` | the P89 / P90 / P91 scoping READMEs that were loose with it, and the two pointers that redirect to them |
| `ca37d40bd` | §9.2's correction |

🔴 **Nobody recognised it because it predates all three of us and had been LIVE since 09-16** — on
todo.digitalbricks.io and nodegx.io/templates/todo-list/ — while existing only in one working tree.
The intent was never guessed: TPL-008's own s5–s7b notes were in the pile, and they say what was
built, graded and deployed. Graded again here before committing rather than inherited: tpl008 gates
**43/43**, backend **21/21**, runtime adapters **90/90**, the date-picker drift gate and
`library:check` **exit 0**, `typecheck:mcp` / `typecheck:runtime` / backend `tsc` clean.
⚠️ `library:icons:check` is red on `no icon: modules/game-kit` — **P95's**, from `fd7cc4700`,
attributed and not fixed here.

**So the working tree now holds nothing but P93's seven in-flight TVW-002 files.** The moment those
are committed, `build-editor.ts` will run without `--skip-git` and the `.app` this task photographs
will genuinely be HEAD. The remaining cost is the hour of box, which is what Richard ruled to wait
for.
