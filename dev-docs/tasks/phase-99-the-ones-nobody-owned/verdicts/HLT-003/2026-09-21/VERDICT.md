# HLT-003 — verdict, 2026-09-21 (session 3)

**All four classes read 0 on a driven session, each on a surface the drive is shown to have
reached, and each beside a control that made the same counter fire.**

| class | §3 said | driven reading | reach proven by | control |
|---|---|---|---|---|
| duplicate key | 10 | **0** | 104 launcher cards rendered | product: a duplicate *directory* → 0 → 1 |
| setState during render | 1 | **0** | board mounted, 2 frames | product: pre-fix board entry logged 1 (`06:00:07Z`) |
| null `value` prop | 1 | **0** | the input rendered, `value=""` | detector: raw `<input value={null}>` → 0 → 1 |
| missing `key` | 1 | **0** | 3 visual-state rows on screen | detector: keyless `<ul>` → 0 → 1 |

`scripts/devtools/drive-hlt003-warnings.js`, `--expect 0` and `--expect firing`, both PASS.
`otherErrors=0` on the fixed arm — the §5a arm, so a repair that traded one class for another
could not have read clean.

**Gates.** `typecheck:editor` 0. `test:main` **526/526 suites, 8418/8418 tests, exit 0**.
⚠️ `typecheck:core-ui` is red at **45 `TS2307`** module-resolution errors, none of them in a file
this task touched — a pre-existing condition of that project's tsconfig, recorded rather than
fixed.

---

## 1. 🔴 Three things the task file said that the artefact contradicted

**(a) "`%s` is literal … the component names are lost" — they were never lost.** `bugtracker.ts`
joined *every* console argument onto the message, so the arguments were in the file all along. The
setState warning in Richard's own session already read `… (`%s`) … VisualCanvas ComponentBoard
ComponentBoard` in plain text. What was missing was the **substitution**, which is a legibility
defect, not a loss — and the first job the task named ("reading them off a live session") was not
needed for that one.

**(b) The genuinely missing name is one React never passes, and no formatting fix recovers it.**
React 19 hands the duplicate-key warning **only the key** (`react-dom-client.development.js:4924`)
and it passes no component stack at all. That is why four phases of logs could not attribute it.
It is reachable only from *inside* the console call, via
`ReactSharedInternals.getCurrentStack`, which `runWithFiberInDEV` sets and restores around the
`console.error`. `bugtracker.ts` now reads it there. Evidence:
`ac3-formatted-log-entries.txt` — `at LauncherCardGrid` / `at LauncherPage` under a duplicate-key
entry, which is the attribution that did not exist before.

**(c) "the repeated key is a project entity id" — it is not, and it is not on the canvas.** The
bursts begin ~2s after launch and ~10s **before** any project opens. All 62 events measured across
two sessions reported one single key. It is the **launcher**.

## 2. What the duplicate key actually was

`recently_opened_project.json`, 104 entries, measured:

- **two different projects share one `id`** — `tut001-drive` and `Puppy test 3`, different
  directories, both `692d3658-f11a-10db-e6c8-6b000f774898`. `Launcher/views/Projects.tsx` keyed the
  grid on that id. A 128-bit random collision across 104 entries is not credible, so the id was
  **copied, not generated**: `projectmodel.ts` documents `project.id` as persisted and read back
  from the file, and this team drives copies of real projects.
- **one directory registered twice** under two ids (`TVW-004 s15 Drive`), which React never
  complained about and a person sees as the same project twice.

🔴 **Neither field was unique, which is why the fix is two halves.** Re-keying on the directory
fixes the measured warning; on its own it **would have started** a new duplicate-key warning on the
double-registered directory. `recentProjectRows.ts` de-duplicates by directory so the key it is
changed to is total. The `--expect firing` product control injects exactly that collision and the
counter goes 0 → 1, which is what proves the new key is load-bearing rather than merely quiet.

**Measured on the real artefact:** the store went **104 → 103** entries on first launch, the
directory collision is gone, and the `id` collision is **deliberately still there** — see §4.

## 3. The other three mechanisms, each named rather than guessed

- **setState during render.** A JS stack captured at the warning:
  `ComponentBoard` render → `buildBoardExport` (a `useMemo`) → `NodeGraphModel.fromJSON` →
  `addRoot` → `Model.notifyListeners` → `usePreviewStrip.ts`'s `GRAPH_EVENTS` listener →
  `setCounter` on `VisualCanvas`. A render-phase call constructs models, construction fires a global
  event, and a sibling hook turns it into a parent's state update. Fixed at the **subscriber**
  (`queueMicrotask`), because that hook is the thing that converts a global event into React state
  and therefore owes React the phase discipline — and any other render-phase producer is covered by
  the same line. ⚠️ React dedupes this warning to **once per renderer session**, so re-entering the
  board is silent either way; the pair had to be taken across a rebuild.
- **null `value` prop.** `GenericInputProperty` guarded a missing value in its initial state
  (`props.value || ''`) and **not** in the effect that syncs it afterwards. One guard in one of two
  places. The consequence is not the log line: a controlled `<input>` handed `null` becomes
  **uncontrolled**, so React stops owning the field. Now `?? ''` in both — nullish, not falsy,
  because the old `|| ''` also blanked a port genuinely set to `0` in a `type="number"` editor.
- **missing `key`.** Two owners across sessions, both recoverable from the log's continuation line
  (which a single-line read hides): `VisualStates` and `ComponentTree`.
  - `VisualStates` mapped its state list with **no key and an
    `// eslint-disable-next-line react/jsx-key` on the line**. The lint had already found this and
    been switched off — the phase's own thesis in one line of code. Keyed on `state.name`, the
    field every transition and stored parameter already uses; the suppression is gone.
  - `ComponentTree` passed a key on every branch, which is the tell: `key={undefined}` is reported
    as a *missing* key. No component in the drive corpus lacks `id`, so that row is **not
    reproducible here** — the key is made total (`id ?? name`) and the sighting is recorded rather
    than claimed cured.

## 4. 🔴 What this task found and did NOT fix — filed, not observed

**Two different projects share one durable project `id`, and the launcher addresses rows by it.**
Beyond the warning, measured from the code:

- `getProjectEntryWithId` returns the **first** match, and the grid's `onClick` passes
  `project.id` — so a click on one of the two colliding cards opens **the other project**. The list
  sorts most-recent-first, so today clicking *Puppy test 3* opens *tut001-drive*.
- `project.id` is documented in `projectmodel.ts` as the ownership half of `findReusableBackend`,
  and `setCurrentGlobalGitAuth(projectEntry.id)` keys git auth on it. Two unrelated projects share
  both.

**Not fixed here on purpose.** Re-minting one of the two would silently change which project owns a
backend, which is a decision, not a repair. It is a row with an owner in the phase README, not a
note in a verdict — §7.

## 5. A sibling regression this task's gates caught

`test:main` was **already red at HEAD** before this session wrote a line: HLT-002's own commit
`32c92b1c3` shipped the user-visible string *"hidden behind the bench or the board"*, and P93's
TVW-009 vocabulary ratchet retired the bare word "bench" on any user-visible string. `test:ci` does
not run that gate, and HLT-002's verdict recorded `test:ci` at the floor — so nothing looked wrong.
Fixed to "Workbench", which `scripts/vocabulary-ratchet.js` names as the replacement itself. Only a
comment and a spec **title** carried the old wording; no assertion did, and the ratchet does not
scan tests.

⚠️ **The reusable part:** a phase that verifies `test:ci` only cannot see a `test:main`-only gate go
red, and HLT-010's budget gate has to run both or it will inherit exactly this blind spot.

## 6. Instrument faults worth carrying forward

- ⚠️ **`timeout` is not installed on this machine.** Every `timeout … grep -r …` command returned
  **nothing, silently**, and that read exactly like "recursive grep is broken here" — it cost
  several wrong turns and nearly produced "the string is absent from the tree".
- ⚠️ **`.logs/dev.log` is the dev launcher's CDP mirror of the raw console args, not bugtracker's
  sink.** It still prints `%s` after this fix, by design. AC3's evidence is in
  `<userData>/debug/log-*.txt`. Reading the wrong channel would read as the fix not working.
- 🔴 **The first windowed read was a 0 on an empty window.** The byte offset was taken *after* the
  launcher had already rendered, so the measured window was 0 bytes and every count was 0. A
  window opened after the event attributes nothing; the reach arm (cards rendered) is what caught it.
- ⚠️ **The ugrep wrapper silently returns 0 for `grep -cF` on this log** (`-F` after its forced
  `-G`). Counts here use `command grep -a`.
