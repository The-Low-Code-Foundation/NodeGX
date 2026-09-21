# HLT-011 — verdict, 2026-09-21 (session 7)

> **Clicking a project on the launcher opens that project, and the settings it remembers are its own.**

## THE NUMBER

**Clicking the second of two cards that share one stored identity opens the second project —
driven, with a control on the identical fixture that opens the first one.**

| arm | build | the click | what opened | arms |
|---|---|---|---|---|
| `--arm control` | HEAD `8f0587d0` (the six files reverted to HEAD for the run) | *HLT-011 Beta* | **Alpha** — the other project | 9/9 |
| `--arm fixed` | this commit | *HLT-011 Beta* | **Beta** | 9/9 |

`scripts/devtools/drive-hlt011-identity.js`. Records: [`control.json`](./control.json),
[`fixed.json`](./fixed.json).

**Beside the reading, in the same run, in both arms:** a third row whose id *cannot* collide
(`HLT-011 Gamma`) is clicked first and opens itself. A run where every click opened Alpha, or
where no click opened anything, reads exactly like the defect
([[assert-an-absence-with-a-known-firing-signal-beside-it]]); gamma is what tells those apart,
and the drive refuses to grade THE NUMBER if gamma misroutes.

## §2 measured — TRUE, and the origin was already written down

**Second task file in this phase whose §2 held** (HLT-005 was the first; the other five were each
wrong in a different way). Every claim checked, 2026-09-21, before a line was written:

| §2 said | measured |
|---|---|
| two entries share `692d3658-f11a-10db-e6c8-6b000f774898` | ✅ still there, now 106 entries (was 104) |
| `tut001-drive` carries it on disk, `Puppy test 3` has no `id` field | ✅ both |
| a `Math.random` collision is not credible | ✅ `guid()` is 8×`s4()` — 128 bits |
| `getProjectEntryWithId` is a first-match `.find` | ✅ and **eight** more `.find((p) => p.id === …)` in `ProjectsPage`, plus **ten** id-addressed callbacks in the launcher view |
| per-project local settings and git auth are keyed on it | ✅ `editorSettings.json` holds ONE entry under that key — layout, `previewMode`, `selectedComponentName: /Pages/Landing`, panel widths — shared by both projects |

🔴 **And the thing §2 could only call "copied, not generated" has a name and a date.** P73
`TUT-001`'s own verdict records making it: *"Drove a **copy**; the launcher store entry was
cloned from the real project's (its `id` `692d3658-…` is the one `backend_msjck0y2ukxwv` carries
in `projectIds`)"* — **deliberately**, so the copy would inherit the backend. Measured today:
`~/.noodl/backends/backend_msjck0y2ukxwv/config.json` is named **"Puppy test 3 backend"**,
created 2026-08-07, and its `projectIds` is that one id. So **two projects own one datastore on
this machine right now**, which is README §1B's two-apps-one-datastore defect *with the ownership
check intact and answering honestly about the wrong project*.

**The phase thesis, one turn sharper.** HLT-001…006 found defects that were seen, filed as
observations, and disowned. This one was **created by a session's own instrument**, recorded in
the verdict that created it, and then rediscovered four phases later as a duplicate-key warning.
A drive fixture is a write to the user's machine, and it outlives the session that made it.

## What shipped

**AC2 — the launcher addresses a row by its directory, which is what a row *is*.**
`LocalProjectsModel.getProjectEntryWithDirectory` (over the new pure `findRowByDirectory`) replaces
all **eight** `.find((p) => p.id === projectId)` reads in `ProjectsPage`, and the launcher view
hands back `project.localPath` for all **ten** callbacks — launch, reveal, delete, migrate, share,
read-only, settings. ⚠️ Two of those reads were *open* then *delete*: `removeProject` splices the
first match, so deleting by a shared id would have removed the **other** project's row. That one
now passes the entry's own id, read from the row the directory resolved.

⚠️ **The uniqueness is HLT-003's, and it says so.** A directory is unique only because
`dedupeProjectRowsByDirectory` runs first in `fetch()`. Both halves live in `recentProjectRows.ts`
and are documented as one rule rather than as two modules that happen to agree.

**AC3 — the editor detects the collision and says so; it repairs nothing.**
`findDurableIdCollisions` (same module, after de-duplication), read on every `fetch()`, surfaced
once per editor session as a warning naming both projects and what they share, plus a
`console.warn` per collision. 🔴 **`console.warn`, not `console.error`** — HLT-010's renderer-error
budget counts error events, and a true statement about the user's disk is not an editor fault.

**AC4 — the existing collision is LEFT, deliberately.** Re-minting one of the two ids would move
"Puppy test 3 backend" from under whichever project lost the toss, and `project.id` is the
ownership half of `findReusableBackend`. Nothing in the editor mints a duplicate — `_addProject`
has generated a fresh 128-bit guid since the initial commit — so the writer to defend against is
outside it: a script, a restored backup, a hand-edited file. The editor now **says** it, which is
what lets a person fix it knowingly. **Richard's machine still carries it**, and the repair is his
call, not the launcher's.

## What the fix causes (P99 §5a)

- **A warning toast covers a launcher card for its 6-second life.** Found by the drive's reach arm,
  which hit-tested the third card's centre and got `ToastCard-module__Message`, refusing to grade
  a click that landed on the warning ([[a-rendered-surface-can-be-behind-a-blocker]]). It is the
  toast layer's standard duration and standard position — every toast in the product does this —
  so it is recorded rather than special-cased, and the drive now reads AC3 **first** and clears
  the toast before clicking, instead of letting its own timing decide the verdict.
- **`getProjectEntryWithId` still exists and still returns the first match.** Kept for the two
  callers holding an id that is unique *by construction* (`_addProject` just minted it,
  `bindProject` holds the open project), and its docblock now says which callers may use it.
- **A pinned gate moved, and the property did not.** `hls009RecentProjectsCardinality` pins the
  single writer of the store by `file:line`; the new field, comment and collision read pushed
  `store()` from :100 to :114. Re-pinned with the reason, exactly as HLT-003 did at :88 → :100 —
  the assertion is the **one element** in that array, and the number after the colon is an address.

## Gates — both, and all five

| gate | result |
|---|---|
| `typecheck:editor` | **0** |
| `typecheck:editor-tests` | **0** |
| `test:main` | **531/531 suites, 8467/8467** — green. ⚠️ HEAD was 529/8450; **+1 suite/+12 specs is this task**, the other +1/+5 is a peer's uncommitted `tests-unit/hlt-007/` sitting in the tree. Not mine to claim. |
| `test:ci` | **at the floor — 3036 specs, 8 failures BY NAME** (3 SUB-011, 3 SUB-006, 2 NDA-017), seed 54064, fresh JSON |
| `lint:ci` | **876 vs 3916** baseline |

`typecheck:core-ui` remains red at 45 `TS2307` (pre-existing tsconfig alias condition, no file of
this task named).

## The specs

`packages/noodl-editor/tests-unit/hlt-011/projectIdentity.test.ts` — 12, on the **real** colliding
rows. The first `describe` is a calibration that writes out the OLD rule and requires it to
misroute on this fixture: without it, every assertion below would pass just as happily against a
fixture with no collision in it. Anchored by one that **throws** *"this spec is blind; fix it"* if
`projectRowKey` stops meaning "the directory".

**Mutant run, not argued.** `findRowByDirectory → rows[0]` and `group.length < 2 → < 99` redden
exactly **5** specs across both describes; restored.

## For whoever takes HLT-010

- The collision warning is a **`console.warn` with no `(file.tsx:NNN)` peer** in the log — it is an
  application line, and it is *supposed* to be there on a machine that has a collision. A budget
  that counts warnings will count it.
- `scripts/devtools/drive-hlt011-identity.js` is the first P99 drive whose arms are **two builds**.
  It parks the six changed files, `git show HEAD:<path> > <path>`, drives, and copies them back —
  never `git checkout --`, which on this checkout would take a peer's unstaged work with it.
- It is also the first that drives a **seeded profile** (`NOODL_USER_DATA_DIR`), so the launcher's
  whole world is a fixture and Richard's 106-entry store is never written.
