# Next session — session 114 (2026-10-16, BOARD lane 6) fixed **P18-S113-IDBINDREAD** and drove it: a Record whose Fetch is unwired binds to the app's copy of its record, as the running app's does; it no longer reads the backend on every Id change.

## ✅ Session 114: the Id binds, it does not read

Read EXP-011 §81 for the whole record; in short:

| what | where |
|---|---|
| The bind: `useEffect(() => { … return subscribeRecord<T>(id, setRow); }, [id])`; unticked, `subscribeRecord(…)()` (the copy once at the bind). No request, no Error, no Done; an empty or unheld Id leaves the row as it was | `component.ts` `recordBinds` |
| A Done or Failure wired with Fetch unwired is refused by name (0 of 83 in the corpus); shared with `recordWillFire` | `plan.ts` `recordBindRefusal` |
| No `fetch<Type>ById` (and no "Source:") for a binding Record; no empty `import {  } from './client'`; held records ship wherever a Record binds | `emitApp.ts`, `RecordReadPlan.binds` |
| A `record-out` render read earns its row in both walkers (the read action had been the only earner) | `component.ts` |
| Spec: `record.test.ts` §B, eight rows; re-pinned rows in file-record, relation-pair, variable-seed, the-live-record | |
| Driven, three arms, `EXPECTED.md` first: runtime == fixed on every title in seven steps, 2 PUTs and no GET in both; HEAD made six GETs | `s114-idbind-drive/` |

- 🔴 **A mutant that does not compile grades nothing, again.** Arm B (`kind !== 'never'`) was a TS2367 and every suite
  "failed to run" with 0 tests. s113 recorded the same trap. Re-shaped as `(… || true)`. Shape a mutant so it compiles.
- 🔴 **A peer can be in your package.** `src/emit/style.ts` changed under this session (07:26, a narrowing fix in the
  Placeholder-opacity code): not ours, left out of the commit. The mutant arms ran in a copy (`packages/.nx-mut-s114`,
  `node_modules` symlinked, removed after) so no peer's run ever saw a mutant.
- **Re-measure a relayed sentence.** §43.3 says "outputs read undefined the moment a new Id arrives"; the runtime flags
  only the keys the new record holds, so outputs keep the old values (D5 measured it).

Readings: `record.test.ts` 34 / 34; `the-live-record` 21 / 21; HLS-001 4 / 4 after regenerating (8 hashes moved, as
predicted; with HEAD's three sources back, 4 / 4 on the old golden); package `tsc` 0; twelve mutant arms, each killing
rows (B and F only after the fixes above). Whole export package (`nice -n 19 --runInBand`, 430 s): **128 / 130 suites,
4,378 passed, 4 failed, 3 skipped**. Two failures were this change's: `relation-verbs` §17's two Record rows pinned
`fetchPuppyById` on a Fetch-unwired Record; re-pinned to the bind, that suite is 24 / 24 (the whole package was not
re-run after it). The other red is `parameter-coverage` on the P121 peer's three uncommitted Upload File ports
(`photoQuality`, `readers`, `shrinkTo`; total 1,399 vs 1,396), as in sessions 110 to 113.

**Next (BOARD lane 6):**
1. **P18-S113-LISTLIVE**: the store's create / save / delete events in the exported client (`bindStoreEvents`), with the
   query's filter and sort applied in the browser (`QueryUtils.matchesQuery` / `compareObjects`). Drive it with a runtime
   arm (`s114-idbind-drive/` is the newest harness).
2. P18-S112-NATIVESELECT; when P121 commits Upload File's three ports, classify them; the two `unexamined` ports.
3. Then the backlog: P18-S109-MOUNTPULSE, §77.5, the graph line, the 112 unprobed ports, the four low rows.

---

# Next session — session 113 (2026-10-15, BOARD lane 6) closed **EXP-008's last gap port, P18-S111-RECORDLIVE**, driven: reaching **1,233 → 1,234 of 1,396, 0 gap ports**. Found two rows of the same family on the way.

## ✅ Session 113: a Record shows the app's one copy of its record

Read EXP-011 §80 for the whole record; in short:

| what | where |
|---|---|
| The exported client holds one copy of each record, keyed by the id alone (`Model.get(id)`): `fetchOne` / `query` / `create` merge into it field by field (`_fromJSON`); `update` writes before the save, merges the answer, and puts back on failure (P107-C34). Shipped only where a live Record is | `emitApp.ts` `HELD_RECORDS_SOURCE`, `HELD_UPDATE_SOURCE` |
| A Record with "Record properties" ticked subscribes its row: `useEffect(() => … subscribeRecord(row.id, setRow), [row?.id])` | `component.ts` `liveRecordRows`; `plan.ts` `RecordReadPlan.live` |
| Spec, 21 rows (§C runs the emitted client against a scripted wire in the runtime's order); eight mutant arms, each killing its own rows | `tests/the-live-record.test.ts`, `tests/fixtures/record-desk` |
| Driven, three arms (runtime, HEAD-equivalent control, fixed) on a real backend: runtime == fixed on every title in every step | `s113-recordlive-drive/` |
| Fixed beside it: P18-S113-IDREADTWICE (an Update Record whose Id is a Variable read twice did not typecheck) | `component.ts` `api-call` |

**Found, filed (open):** **P18-S113-IDBINDREAD** (medium): §43's effect form (Fetch unwired) reads the backend on
every Id change; the runtime only binds to the copy it holds. Measured in the drive's run 1, and the published doc says
so. **P18-S113-LISTLIVE** (medium): an exported Query Records list never sees a create / save / delete made elsewhere;
the runtime's follows them (`bindStoreEvents`).

- 🔴 **An export drive owes a runtime arm.** §43's effect form passed its own 72-cell drive in s71, graded against a
  sheet written from the same misreading of `runOnValueChange: { controlSignal: 'fetch' }`. Only the runtime arm showed
  that the running app never reads on an Id change. The control signal governs whether the Id *rebinds*.
- 🔴 **A mutant that breaks a narrowing fails to compile and kills nothing.** Arm G first read 0: `cond` → `false` lost
  the narrowing that typed `action.errorState`. Change the leaf test, never the guard.
- 🔴 **The parser settles a box the way the editor does.** A wired Fetch with "Record properties" unstated is settled
  unticked (NDA-017's migration, `settleComponent`), so page-desk's wired Record is correctly not live. To drive a live
  wired Record, tick the box by hand (record-desk's Shown does).

Readings: `the-live-record` 21 / 21; HLS-001 4 / 4 (8 hashes moved, exactly `client.ts` + `Home.tsx` in the four
effect-form projects, plus record-desk); package `tsc` 0. Whole export package (`nice -n 19 --runInBand`, 382 s):
**129 / 130 suites, 4,375 passed, 3 skipped**; the one red is `parameter-coverage` on the P121 peer's three uncommitted
Upload File ports (`photoQuality`, `readers`, `shrinkTo`; total 1,399 vs 1,396), as in sessions 110 to 112. The first
whole-package run (on a source without the backend gate) was red in exactly the no-backend rows; see EXP-011 §80.3.

**Next (BOARD lane 6):**
1. **P18-S113-IDBINDREAD**: the effect form becomes a bind (the row is the held copy for the Id via `subscribeRecord`:
   no request, no Error, no Done). Moves the four effect-form fixtures (due/gallery/link/page-desk) and re-grades
   `record.test.ts`'s effect rows and §43.6. Drive it with the runtime arm (`s113-recordlive-drive/` is the harness).
2. **P18-S113-LISTLIVE**: the store's create / save / delete in the exported client, with the query's filter and sort
   applied in the browser (`QueryUtils.matchesQuery` / `compareObjects`).
3. P18-S112-NATIVESELECT; when P121 commits Upload File's three ports, classify them (P121-TWO001-EXPORTREADERS /
   -TWO003-EXPORTSHRINK); the two `unexamined` ports (Radio Button icon colour and size).
4. Then the backlog: P18-S109-MOUNTPULSE, §77.5, the graph line, the 112 unprobed ports, the four low rows.

---

# Next session — session 112 (2026-10-15, BOARD lane 6) closed **nine of the ten gap ports**: reaching **1,225 → 1,233 of 1,396**; one gap port left, **P18-S111-RECORDLIVE**. Found three new rows on the way.

## ✅ Session 112: the last silent parameters, each one rendered or measured first

Read EXP-008 § *Session 111* onward for the whole record; in short:

| row | commit | what |
|---|---|---|
| EVALATLOAD | `52318ee89` | An exported Expression holds what the editor's Result holds at load; unticked, still refused by name |
| NOWRAP | `d0c50d483` | **Rendered first** (`s112-nowrap-render/`): every exported Text wears the runtime's `white-space` arm by size mode, Text Overflow is carried, and `jsxText` keeps a typed line break (JSX turned it into a space). HLS-001: 103 CSS modules moved, 0 TSX |
| ROUTERSELF | `8ca7aef05` | **Counted first**: 1 Router of 227 authors any of the six. Url Path carried into the routes and every `navigate(…)`; Mounted and the Router's own Background / Clip / CSS Class / CSS Style **said** by name (`routerNotes`). No wrapper element (it would move every page's layout) |
| PLACEHOLDEROPACITY | (s112, see `git log`) | **Rendered first** (`s112-placeholder-render/`): fade 0.5 / 1 / 0.3 in the runtime, 1 / 1 / 1 at HEAD, 0.5 / 1 / 0.3 patched. A `:has(> option[hidden]:checked)` rule mixes the select's text colour toward transparent. The port is `gated`, not reaching: no probe context sets a placeholder |

**Found, filed:** P18-S112-FLEXELLIPSIS (runtime, medium: a Text set to Ellipsis never draws its "…", because the
runtime's Text is `display: flex`); P18-S112-BLANKURLPATH (runtime, low, measured on the real `matchPageFromUrl`:
a cleared Url Path `''` pushes `#/home` and matches nothing); P18-S112-NATIVESELECT (export, low: the exported
Dropdown is the native select, so its box is ~22 px not 32, the chevron is native, and its text is `FieldText` not
`--foreground`).

- 🔴 **A probe that sees nothing may be right.** The placeholder carry is real and rendered, and the probe still reads
  the port silent, because the rule only exists with a placeholder and no probe context sets one. That is `gated` by
  the ledger's own taxonomy; do not raise the floor for it, and do not build a probe context just to move a number.
- 🔴 **Read a node's own ports at emit time, not from a parse-time summary.** `RouterIR` is built once at parse; the
  probe and every spec vary the node's parameters. A carry that read `RouterIR` would have looked fixed to nothing.
- 🔴 **After `/clear`, the "peer" on your lane can be you.** This session found uncommitted lane-6 work three minutes
  old and a jest run under way, and treated it as a live peer, until a background task's notification arrived for a
  tool-use id in the pre-clear transcript. Check that before standing down.

Readings: the whole export package, run after each fix (`nice -n 19 --runInBand`): the only red each time is
`parameter-coverage` on the P121 peer's three uncommitted Upload File ports (`photoQuality`, `readers`, `shrinkTo`;
total 1,399 vs 1,396), as in sessions 110–111. NOWRAP's run also turned two hand-written targets red (PuppyCard,
sty004 AC4.7), which pinned a Text's exact CSS; both re-pinned to the arm each Text's size mode gives.

**Next (BOARD lane 6):**
1. **P18-S111-RECORDLIVE**, the last gap port: Record's "Record properties" box defaults ticked, and the exported client
   has no shared record cache, so a write elsewhere never reaches a Record. Sized as an EXP-011 section, not a cheap close.
2. **P18-S112-NATIVESELECT**: `color: inherit` beside `base.css`'s `font: inherit` closes the text colour (it moves every
   project's `base.css`); the box and chevron want `appearance: none` and the runtime's padding, rendered against the runtime.
3. When P121 commits Upload File's three ports, classify them (their rows P121-TWO001-EXPORTREADERS / -TWO003-EXPORTSHRINK).
4. Then the backlog: P18-S109-MOUNTPULSE, §77.5, the graph line, the 112 unprobed ports, the four low rows.

---

# Next session — session 111 (2026-10-15, BOARD lane 6) closed **seven rows** (six of the per-parameter check's ten gap rows, and -STORENOTES): reaching **1,215 → 1,225 of 1,396**, gap ports **21 → 10**. Next: the last ten, which are not cheap.

## ✅ Session 111: the silent parameters, cheapest first

Read EXP-008 § *Session 111* for the whole record; in short:

- **Refused by name** (each setter's own emptiness rule, each twin's sentence shape): Object / Record / Array Filter /
  Variable with an unticked Run On Value Change box (P18-S110-RUNONCHANGE, 6 ports; Record's only with Fetch unwired);
  Create Record's Upsert On; Set Record Properties' Only If Unchanged; a For Each whose Template Type is dynamic.
- **Carried:** Navigate's Open In New Tab → the runtime's own bare `window.open(url, '_blank')`; no `useNavigate`
  in a file that has no in-place navigate.
- **Said:** a Global Store declarer's notes reach the app notes and the report (`StoreNote`, routed in `emitApp`);
  a Run Tasks whose template declares its error output gets a per-node note that the value is dropped.
- **Reclassified, not reaching** (by construction, recorded): `For Each.templateScript` → `refused-with`,
  `RunTasks.taskErrorOutput` → `gated`. **Split out:** Record's "Record properties" box is a gap on its *ticked*
  default side, so no refusal closes it: **P18-S111-RECORDLIVE** (a shared record cache in the exported client).
- 🔴 **A probe that varies a box can only see the side it flips to.** Record's box defaults ticked and the export
  already behaves as if it were unticked, so varying it to `false` never moves the export: the gap is on the side
  the probe starts from. Read every remaining gap for which side holds the defect before refusing anything.
- 🔴 **Two rows are wider on the default side:** no exported Text has a `white-space` rule at all (P18-S110-NOWRAP),
  and a Dropdown placeholder's default opacity is 0.5 (P18-S110-PLACEHOLDEROPACITY). Both are written into the rows.

Readings: `tests/silent-parameters-closed.test.ts` 18 / 18 (mutant controls: weakening each fix turns exactly its own
cases red, 2 and then 3). `parameter-coverage` red on exactly the P121 peer's three uncommitted Upload File ports
(`photoQuality`, `readers`, `shrinkTo`; total 1,399 vs 1,396), as in session 110. At HEAD's catalog the ledger is exact:
silent 59, floor 1,225. Package `tsc` 0, and the specs typecheck. Whole export package (`nice -n 19 --runInBand`, 446 s):
**124 / 125 suites, 4,168 passed, 3 skipped**. The one red is that same gate on those three ports.

**Next (BOARD lane 6):**
1. **P18-S110-EVALATLOAD**: read `plan.ts` ~:6055's old refusal first (the row says it predates GAM-001 and also
   drops a value at the default).
2. **The Text `white-space` rule** (NOWRAP, widened): one rule per arm in `emit/style.ts`, then regenerate HLS-001
   and count the diff. Render one Text with a typed line break on both sides first: the row's default-side claim is
   from reading, not yet from a render.
3. **Dropdown placeholder opacity**: carry it (module CSS on the empty option being checked, text only) or note it on
   every placeholder Dropdown. A ruling for Richard only if the carry turns out to cost visual fidelity elsewhere.
4. **-ROUTERSELF** (6 ports, a Router's own box), **P18-S111-RECORDLIVE** (sized as an EXP-011 section).
5. When P121 commits Upload File's three ports, the gate asks for their classification (their rows
   P121-TWO001-EXPORTREADERS / -TWO003-EXPORTSHRINK are the `gap` rows to cite). Then the 112 unprobed ports, and the
   backlog session 110 listed (MOUNTPULSE, §77.5, the graph line, the four low rows).

---

# Next session — session 110 (2026-10-15, BOARD lane 6) built **EXP-008's per-parameter check**: **1,215 of 1,396 parameters reach the export (87.0%)**, 21 real silent drops filed as 10 rows. Next: close the gaps, cheapest first.

## ✅ Session 110: the per-parameter check

Read EXP-008 § *The per-parameter check* for the whole record; in short:

- **`tests/helpers/parameter-probe.ts`** varies every non-signal input of every translated picker node, re-runs `emitApp`,
  and reads whether the files or notes moved (a refusal sentence counts — silence is what it forbids); a silent port is
  retried under each boolean / enum sibling and under its whole panel group switched on. Contexts: alone on `cheer`'s
  Home, then fully wired, then every placed instance in the 57 fixtures.
- **`parameter-ledger.json`** holds the 69 silent ports, each adjudicated against the runtime (gap 21, gated 21,
  refused-with 23, inert 2, unexamined 2), and the 112 unprobed ports with their types. **`tests/parameter-coverage.test.ts`**
  (9 specs, ~40 s) holds both lists to the measurement BY NAME in both directions and the reaching count to
  `parameterCoverageFloor` exactly; a mutant emitter that drops Font Size is its control.
- 🔴 **The instrument had three traps of its own, each a false defect** (found because every silence was read against the
  runtime before filing): `indexPageStacks` caches per IR object (fresh shallow copy per emit now), a childless Drag never
  draws, a Router added after parse is not in `ir.project.routers`.
- **Filed** (all open, `node scripts/bugs.js --from "P18 EXP-008"`): P18-S110-ROUTERSELF (6 ports), -RUNONCHANGE (7),
  -NEWTAB, -EVALATLOAD, -DYNAMICTEMPLATE, -ONLYIFUNCHANGED, -UPSERTON, -TASKERROR, -NOWRAP, -PLACEHOLDEROPACITY; beside
  them -STORENOTES (a store plan's notes have no reader), -BREAKPOINTS, -VALUECHANGED.

Readings: the new spec on this checkout **7 / 9, red on exactly the predicted rows** — a P121 peer's uncommitted catalog
edit adds Upload File's `photoQuality`, `readers`, `shrinkTo` (all silent; total 1,399 vs 1,396). The ledger was measured
against HEAD's catalog, so it is green at HEAD; **when that peer commits the three ports the gate asks them to classify
them** (their own rows P121-TWO001-EXPORTREADERS / -TWO003-EXPORTSHRINK are the `gap` rows to cite). Package `tsc
--noEmit` 0. `bugs.js check`: 0 problems in the 13 new rows (90 pre-existing elsewhere). Whole-package export jest
(`nice -n 19 --runInBand`, 439 s): **123 / 124 suites, 4,150 passed, 3 skipped** — the one red is the new spec on exactly
those three peer ports.

**Next (BOARD lane 6):**
1. **Close the gaps, cheapest first.** Each closed or refused-by-name row leaves `silent` and raises the floor by the
   count §A prints. Cheapest: -RUNONCHANGE (the twins' refusal, four call sites), -NEWTAB (External Link's shape one node
   over), -ONLYIFUNCHANGED and -UPSERTON (refuse by name, or carry the option), -STORENOTES (route the notes).
2. The 112 unprobed ports: a probe value per structured type (array, object, component, stringlist…).
3. P18-S109-MOUNTPULSE; the Dispatcher's built-ins (§77.5); raising the graph line; rows P18-S106-PARSERAISE,
   -S104-FEEDCOUNT, -S105-KITHEAD (low), -S104-PACKRUNTIMENPX.

---

# Next session — session 109 (2026-10-15, BOARD lane 6) built **EXP-011 §79: Sign In With export** — picker **130 / 130**, the last row. Next: the per-parameter check before anyone quotes 100%.

## ✅ Session 109: §79, Sign In With

Read EXP-011 §79 for the whole record; in short:

- **The exported client gained the sign-in return leg** (`emitApp.ts` `authReturnLegSource`): ParseAuthAdapter's
  handover and `consumeAuthReturn`, run once when `src/api/client.ts` is evaluated, shipped where a Sign In With or a
  Request Magic Link can start a sign-in. The exchange is its own request, read as `_makeRequest` reads (not `request()`).
- **`src/lib/signIn.ts`** (`src/emit/signInLib.ts`, from session 109 scratchpad `signinlib/signIn.ts` + `gen.js`):
  the launcher and the receiver; **table row 14**. A return read at mount sets values and raises but calls no listener,
  because the runtime reports it before `nodescope` attaches the wires.
- **Graded:** `tests/the-sign-in-with.test.ts` (§B 36 page loads against the runtime's own adapter; §C 18 scripts against
  the runtime's own node in a `NodeContext`; mutants). **Driven** against the real backend through a real OIDC issuer
  (the backend suite's FakeOidcProvider plus a consent route), both arms: the control lands with the code unexchanged;
  the fixed arm signs in, Done fires, the session is stored, a deny shows the reason with no Failure pulse.
- **Found:** an exported magic link never signed anyone in (P18-S109-MAGICRETURN, fixed); in the runtime, a cancelled
  provider sign-in never fires Failure (P18-S109-MOUNTPULSE, open). The alpha sentence reads "All 130 nodes you can
  place export today." at a complete picker.

Readings: `the-sign-in-with` 72 / 72; HLS-001 red on exactly the predicted paths (the 56 projects' README for the alpha sentence, account-desk's `src/api/client.ts`, signin-desk's 21 new entries), golden regenerated and its diff counted (57 out, 80 in), green after; 20 floor pins moved; the eight re-pointed specs and the magic-link spec green. Whole-package export jest **123 / 123 suites, exit 0** (4,143 passed, 3 skipped; `nice -n 19 --runInBand`, 497 s). `export-ledger:check` OK (137 translated); `export-ledger:picker --check` holds at **130 / 130**; package `tsc` 0; editor `tsc --noEmit` 0 (empty log).

🔴 Run a whole-package suite as `nice -n 19 npx jest --runInBand`.

**Next (BOARD lane 6):**
1. **The per-parameter check (EXP-008's open question, §75.5 #3 / §79.6 #2).** 130 / 130 counts nodes; four parameter
   gaps were found green behind a `translated` row. One session: a per-parameter ledger check, so the number can be
   quoted.
2. P18-S109-MOUNTPULSE, if a runtime session takes it: the fix is in `signinwith.ts`'s `initialize`, and the export's
   mount read (`applyReturn(s, current, false)`) moves with it.
3. The Dispatcher's built-ins (§77.5); raising the graph line (t01's three, the harness clock, the one-component limit).
4. Rows: P18-S106-PARSERAISE, P18-S104-FEEDCOUNT, P18-S105-KITHEAD (low), P18-S104-PACKRUNTIMENPX. P121's sessions
   filed export rows of their own on 2026-10-15 (`node scripts/bugs.js --from P121`), uncommitted at this hand-off.

---

# Next session — session 108 (2026-10-15, BOARD lane 6) built **EXP-011 §78 part 2: Optimistic Update export** — picker **129 / 130**, graph line **10 of 85 conform, 17 played**. Next: §79 Sign In With, the last picker row.

## ✅ Session 108: §78 part 2, Optimistic Update

Read EXP-011 §78.6–§78.10 for the whole record; in short:

- **`src/lib/history.ts` grew the patches and the fourth node** (plain source: session 108 scratchpad
  `historylib/history.ts`, same `gen.js`, round trip byte-exact, 1,211 → 1,689 lines). `globalstore.ts`'s
  apply / commit / rollback / getOpenPatches over §78's seam (`ABSENT` kept apart; a rollback under a newer open patch
  hands it the value), then `optimisticupdatenode.ts`'s shell (supersession, oldest-open, the deadline, When Removed).
- **Table row 13**: Optimistic Value is the data port carried by Apply; Key / Error Message / Transaction Id / Timeout /
  When Removed are config; Store Name is the store module. No new refusal sentence.
- **Graded:** `tests/the-optimistic-update.test.ts` 18 / 18. The differential drives the **runtime's own node** in a
  `NodeContext` over its own `globalstore.ts` (300 scripts × 42 steps, 0 differ; 0 of 1,000 one-off), a reach control,
  three mutants caught. Fixture `optimistic-desk`. NSP-008: **t03's two clock-free scenarios play and pass.**
- **Found:** the export graph target drew `Math.random` from the real generator; it now installs the world's seeded one,
  as the runtime target does (the line moved by exactly the two). **One recorded difference**, pinned on both sides in
  §D: after an Apply with no Optimistic Value, a delete of the key supersedes the update in the runtime only.

Readings: whole-package export jest **122 / 122 suites, exit 0** (`nice -n 19 --runInBand`, 1,261 s); HLS-001 red on
exactly the predicted 77 paths, golden regenerated and its diff counted (56 out, 79 in), 4 / 4 after; 19 floor pins
moved; `export-ledger:check` OK (136 translated); `export-ledger:picker --check` holds at 129 / 130; package `tsc` 0;
editor `tsc --noEmit` 0.

🔴 **Run a whole-package suite as `nice -n 19 npx jest --runInBand`.** Richard (2026-10-15): `--maxWorkers=4` was
"murdering my CPU".

**Next (BOARD lane 6):**
1. **§79 Sign In With**, the last picker row. EXP-011 §45.6 / §75.5 #2: the exported client needs the return leg first
   (the runtime client's constructor consumes it, `_consumeAuthReturn`), then the node is a launcher plus a mount-time
   receiver. The backend has a GitHub provider (`auth/github.ts`); a drive of the redirect's return leg against the real
   backend is the grade. If a provider needs credentials Richard holds, that is a ruling to ask for in plain words.
2. The Dispatcher's built-ins (§77.5).
3. Raising the line: t01's three are the store translation itself; the harness clock's advance (t04 ×2, t03 ×1); the
   one-component limit (17).
4. Rows: P18-S106-PARSERAISE, P18-S104-FEEDCOUNT, P18-S105-KITHEAD (all low), P18-S104-PACKRUNTIMENPX.

---

# Next session — session 107 (2026-10-15, BOARD lane 6) built **EXP-011 §78: State History, Undo / Redo and State Snapshot export** — picker **128 / 130**, graph line **8 of 85 conform, 15 played**. Next: Optimistic Update (§78 part 2), then §79 Sign In With.

## ✅ Session 107: §78, the history family's three (`b629c2953`)

Read EXP-011 §78 for the whole record; in short:

- **`src/lib/history.ts`** (from `src/emit/historyLib.ts`): a **store seam** over `@nodegx/core`'s `store()` that gives
  the history what `globalstore.ts` gives the runtime's (changed keys, a write that changed nothing is no commit, a key
  filter, a deep snapshot with its by-reference keys, a full replace that deletes, the runtime's key order); then
  `statehistory.ts`'s manager near-verbatim over it; then the three node shells and their hooks. A deleted key is
  written as `undefined`. Generated from session scratchpad `historylib/history.ts` + `gen.js` (round trip byte-exact).
- **Store Name is the store module**: the hook is handed `store: app` and the component imports `../stores/app`;
  `appState.ts` counts the three as naming their store (`historians`). Refused by name: a wired Store Name; a store that
  defers as a whole. Target Index rides Jump To; Snapshot Name rides Save and Restore.
- **Graded:** `tests/the-state-history.test.ts` 20 / 20, including a differential against the runtime's own
  `statehistory.ts` over its own `globalstore.ts` and `model.ts` (300 seeded scripts × 30 steps, a reach control, two
  mutants it must catch). NSP-008: **t02's four scenarios play and pass** on the export.
- **Found:** the store's key order leaks into By-Reference Keys and a restore's Changed description (26 / 300 differed
  until the seam kept the runtime's order); the graph harness could not load `../stores/<name>` and had no clock — it
  now serves store modules over a cleared registry and installs the world's clock (no advance).

Readings: whole-package export jest 119 / 121 on the full run, the two reds counted and fixed: `streaming-trio`'s
table invariant caught Store Name missing from the row (now `StreamNodeSpec.store`; 60 / 60), and HLS-001 moved on
exactly the 54 README coverage sentences and history-desk's 20 files (golden regenerated, diff counted, 4 / 4).
`export-ledger:check` OK, 135 translated; picker 128 / 130; package and editor `tsc` 0.

**Next (BOARD lane 6):**
1. **§78 part 2, Optimistic Update** (`optimisticupdatenode.ts`, 822 lines, over `globalstore.ts`'s `applyPatch` /
   `commitPatch` / `rollbackPatch`). Build the patches on `history.ts`'s seam (a patch is a `writeKeys` with the values
   each key held before; overlapping patches hand values to each other). t03's two clock-free scenarios will grade it;
   its third needs the harness clock to advance. Same recipe: plain-source lib, a differential against the runtime's own
   `globalstore.ts` patches, the fixture, refusals by sentence, ledger + floor + the 19 floor pins + HLS-001 (55 → 56).
2. §79 Sign In With; the Dispatcher's built-ins (§77.5).
3. Raising the line: t01's three are the store translation itself (Global Store outputs not lifted; a number write to a
   number-typed key refused); the harness clock's advance (t04 ×2, t03 ×1); the one-component limit (17).
4. Rows: P18-S106-PARSERAISE, P18-S104-FEEDCOUNT, P18-S105-KITHEAD (all low), P18-S104-PACKRUNTIMENPX.

---

# Session 106's handoff (2026-10-15, BOARD lane 6) put the graph-scenario ledger line on P18's README, then built **EXP-011 §77: Action Dispatcher and Action Handler export** — picker **125 / 130**, graph line **4 of 85 conform, 11 played**.

## ✅ Session 106, part 2: §77 (`7c2a9ed1a`)

Read EXP-011 §77 for the whole record; in short:

- **`src/lib/actions.ts`** (from `src/emit/actionsLib.ts`): the runtime's registry and queue near-verbatim, both nodes'
  setters / values-before-signals / outcome contract / delete listeners, and `useActionDispatcher` /
  `useActionHandler`. One module-level registry, so the two meet across components by channel name. The lib was
  generated from a plain `.ts` (session scratchpad `actionslib/actions.ts` + `gen.js`); the array round-trips byte-exact.
- **Plan:** two STREAM_NODES rows. Refused by name: built-ins enabled or Enabled Built-ins wired, and a wired Result
  with Auto Complete on.
- **Found:** a streaming node nothing pulses whose own chain reads its own value read as "its trigger chain is cyclic"
  (§54's trap); the trigger-side loop now registers it. The graph harness now loads a lib's `./errors`.
- **Graded:** `tests/the-action-bus.test.ts` 24 / 24, including a seeded differential against the runtime's own
  `action-dispatcher.ts` (8 option rows × 60 scripts). NSP-008: t04's two Dispatcher scenarios **pass** on the export.

Readings: **whole-package export jest 120 / 120** (the full run read 119 / 120, HLS-001 red on exactly the corpus count
and 53 README coverage sentences; golden regenerated and its diff counted: 53 README lines out and in, action-desk's 19
added; HLS-001 4 / 4 after). `export-ledger:check` OK, 132 translated; `export-ledger:picker --check` holds at 125 / 130;
package and editor `tsc` 0.

🔴 **A peer's uncommitted edit sits in `packages/noodl-types/src/node-catalog*.json`** (Upload File's photo ports,
2026-10-14 20:17). It is not this phase's and was not committed; the HLS-001 run showed it moves no emitted byte.

## ✅ Session 106 (2026-10-15, BOARD lane 6): the second ledger line, pinned (`d2773e022`)

Session 103's report said "CONFORM" with 81 of 85 outside, and 67 of the 81 were the **harness's** limits, not the
exporter's. Three of them are lifted in `tests/helpers/node-spec-target.ts`:

| limit | now |
|---|---|
| a `set` step "is not drivable" | the set input is a Component Inputs port `<id>_<port>` wired into the node; `set` re-renders with the prop moved |
| any `world` puts a scenario outside | an **empty** world (`{}`) is admitted: it seeds nothing (25 scenarios declared `{}`); a seeding world is still outside |
| a node with no reducer spec is outside | the probe is built from the exporter's catalog ports (`graphPorts`) |

A scenario the exporter emits but whose observed outputs it will not lift is outside **in the exporter's words**, not
refused. The line is a pinned test in `tests/node-spec-graph.test.ts`, and it prints:

> P18 ledger: 2 of 85 graph scenarios conform on the export — 9 played (2 conform, 3 differ as declared, 0 known rows,
> 4 fail on filed rows); 30 outside on the exporter's verdict, 46 on this harness's limits

C10 now plays and passes. t07's four On App Error scenarios play and **fail**: the export's parsers never raise on the
app error channel. That is **P18-S106-PARSERAISE** (low, reach 0), and the four are pinned to it by name (`FAILING_ROWS`).
Of the 30 exporter-verdict scenarios, **9 are EXP-011's seven** (Action Dispatcher 3, State History 3, State Snapshot 1,
Optimistic Update 2), plus 3 more of theirs that need a world clock. The 46 harness limits: 23 seed a world, 17 need
more than one component (NSP-015 AC2), 3 advance a clock, 3 make a wire after mount.

Readings: node-spec-graph 7 / 7 exit 0; node-spec-conformance 6 passed, 2 skipped; package `tsc --noEmit` 0; editor
`tsc --noEmit` 0. The whole-package export jest was **not** run (only the helper and its two suites changed).

**Next (BOARD lane 6):**
1. **EXP-011 §78, the history family**: State History, Undo / Redo, State Snapshot, Optimistic Update (runtime
   `statehistory.ts`, `undonode.ts`, `statesnapshotnode.ts`, `outcome.ts`). They work on a Global Store, so the store
   module (`src/stores/<name>.ts` over `@nodegx/core`'s `store()`, which has no delete) is the seam. 6 graph scenarios
   (t02 ×4 incl. Snapshot, t03 ×2) sit outside on the exporter's verdict and will grade it; t03's third needs the
   harness clock. Same recipe as §77: measure the table fit, a plain-source lib graded by a differential, the fixture,
   refusals by sentence, ledger + floor + the 17 pins + HLS-001's count (54 → 55) in one commit.
2. §79 Sign In With; the Dispatcher's built-ins (§77.5).
3. Raising the line: the harness clock (t04 ×2, t03 ×1 and others) or the one-component limit (17).
4. Rows: P18-S106-PARSERAISE, P18-S104-FEEDCOUNT, P18-S105-KITHEAD (all low), P18-S104-PACKRUNTIMENPX.

---

# Session 105's handoff (2026-10-15, BOARD lane 6) CLOSED ISL-043 and ISL-035 and fixed RESPONSETYPE: five ledger rows, one commit each, export jest **119 / 119**.

## ✅ Session 105 (2026-10-15, BOARD lane 6): ISL-043 closed (8 / 8), RESPONSETYPE fixed, ISL-035 closed (2 / 2)

| row | commit | what it was, and how it was graded |
|---|---|---|
| P109-S21-EXPORTBLENDNAN | `aeb49e430` | A wired Blend Value prints `blendColorKept(<ref>, …)` over a per-node `useRef`, recorded by both walkers. 🔴 **The ledger's design was wrong about `undefined`:** `Node.sendValue` drops it, so an unset source delivers nothing and the runtime keeps blending with the blend it last *received*. The ref holds the last blend and the last colour; a NaN keeps the colour, and before any blend the colour is the colours at blend 0. Graded step by step against one `colorblend.ts` instance; NaN back in the parity grid; each walker red alone. Golden: 6 lines predicted, 6 counted |
| P18-S104-RESPONSETYPE | `86fca0a03` | The plan reads `responseType` (`value \|\| 'auto'`, unknown reads as Auto) and `httpFunction` emits the matching arm; JSON's bad-body sentence is read out of `httpnode.ts` by the test. Run against a stub `fetch` over every type. Golden 0 |
| P109-S15-ARRAYFILTERPATHEXPORT | `4c1800cb0` | A dotted filter key prints `rowField(row, "owner.id")`, the runtime's `fieldOf` appended as a hoisted function; graded against `fieldOf` cut out of `filtercollectionnode.ts`. Sort stays flat (the runtime's `sorter` is). Golden 0 |
| P109-S17-EXPORTKITDEPS (high) | `90ee40009` | `parseProject` asks the deploy injector itself (`toInjectModules`) for the dependency list; `index.html` gets a classic `<script>` per entry before the app. Graded against `buildInjectionTags` over the same project on disk. Golden 0. **Not done: a built, served export with the library seen running** |

ISL-043 and ISL-035 are closed in their task files (AC4: `node scripts/bugs.js --from P109` lists none of their rows).
Filed on the way: **P18-S105-KITHEAD** (low, reach 0 of 2001 manifests: `browser.head` / `browser.styles` dropped).
Checked and *not* a defect: HTTP Request's `conditional` (If-None-Match) is not exported, and the runtime's own port
description says the browser ignores it too.

Readings: export jest `Test Suites: 119 passed, 119` (exit 0, ~6 min) after the last fix; editor `tsc --noEmit` 0 after
each. **Any red in this package from here on is new.**

**Next (BOARD lane 6), in order:**
1. **The ledger line "N graph scenarios conform on the export".** 81 of 85 are *outside* today (session 103 below), and
   outside must not count as conforming. Read the outside reasons (`npx jest tests/node-spec-graph.test.ts`, the console
   block); most are the harness's limits (no world, one component, no `set`). Make more playable, then put the line on
   P18's ledger with played, conforming and declared-different counted apart.
2. **EXP-011's seven** (§77 Action Dispatcher / Handler first; then Optimistic Update, State History, State Snapshot,
   Undo / Redo, Sign In With).
3. Open P18 rows when a session has room: P18-S104-FEEDCOUNT (low), P18-S105-KITHEAD (low, reach 0),
   P18-S104-PACKRUNTIMENPX (noodl-preview's, the D82 mechanism).

---

## ✅ Session 104 (2026-10-14, BOARD lane 6): all four P18-S102 rows fixed, then 7 of ISL-043's 8. Export jest 118 / 118

| row | commit | what it was |
|---|---|---|
| NAVENCODE | `e767962a1` | The exported Navigate To Path transcribed the pre-D21 node. The query half is now encoded and a null is left out; the path half stays as written (D20). §15.7 reads the url back with `URLSearchParams` and runs the wired loop. |
| DATEHARNESS | `42d0f5530` | 🔴 **The stub hid a real defect.** With a real `require`, the export blanked a timestamp the app renders (ISL-032 / D14). The emitted `dateToString` now reads through `toDate`. Golden: 2 lines predicted, 2 counted. |
| CATALOGNAME | `3b02233b0` | The P109-S5 spec's stand-in file wore the real catalog's name. AC4's count is unchanged. |
| NOEXPORTCI | `1300fdbd2` | 🔴 **The premise was wrong.** CI does run this suite (`test:packages` scopes `@nodegx/export`). Nx **bailed** at `@nodegx/project-contract`, the first package and red on VERBSPECCED, and listed the other 19 "not run". The fix is `--no-bail`. It also found `@nodegx/node-kit-types` red (P18-S104-KITTYPESDRIFT, filed, P107's). |

Readings: whole-package export jest `Test Suites: 115 passed, 115` (exit 0, 543 s), package `tsc --noEmit` 0.
**Any red in this package from here on is new.** CI's `test:packages` job is still red (VERBSPECCED, KITTYPESDRIFT),
but each package's result can now be read in it.

**Then ISL-043, in the same session: 7 of its 8 rows fixed.** All eight still fired at HEAD (AC1).

| row | commit | note |
|---|---|---|
| SNAP | `0b313f736` | **Two** TDZs: the snapshot helpers became hoisted `function`s, and `chainSnapshots` / `chainSnapshotFor` moved above `statesPlanOf`. *Landing page test V2* and its 3 copies export; the shipped CLI's dry-run now exits 4 (it ran, with things left out), not 2 |
| D82 | `272fda402` | Reproduced off Windows with `env PATH=/nonexistent node build.mjs` (`spawnSync npx ENOENT`). tsc now runs via `process.execPath` |
| EXPORTBADBODY | `7ace943da` | Graded by running the emitted `fetchQuote` against a stub `fetch` |
| EXPORTDATEUNITWIRED | `86b7a744b` | `unitOrDays` in the emitted lib also fixes a *literal* unknown unit |
| VARIANT | `101041369` | An export-side `PRESET_MARKERS`, held equal to the editor's by a text-reading spec |
| EXPORTFEEDZONE | `5ae68f683` | D16 dates, plus D17. The differential's runtime side was a hand copy of the OLD node, so the drift was invisible |
| EXPORTSTATESRUN | `e4504cb99` | C22, plus D19 (which *did* reach the export) |

Filed on the way: **P18-S104-RESPONSETYPE** (medium: the export ignores Response Type entirely), **-FEEDCOUNT** (D18:
Items and Count de-duplicated by guid), **-PACKRUNTIMENPX** (the D82 mechanism in noodl-preview), **-KITTYPESDRIFT**
(P107's). Final readings: export jest **118 / 118**, editor `tsc` 0.

**Next (BOARD lane 6), in order:**
1. **EXPORTBLENDNAN**, the last ISL-043 row. The design is in its ledger file: a per-node `useRef`, recorded by
   **both** walkers (`collectExprUse` and `hookExprSources`). Then ISL-043 AC4 (`node scripts/bugs.js` lists none of its
   rows), and close ISL-043.
2. **P18-S104-RESPONSETYPE**, the one medium finding: an HTTP Request's Response Type is silently dropped.
3. ISL-035 (ISL-043's sibling).
4. For the ledger line "N graph scenarios conform on the export": 81 of 85 are *outside* today, and outside must not
   count as conforming (s103 below).
5. Then EXP-011's seven (§77 Action Dispatcher / Handler first).

---

## ✅ Session 103 (2026-10-14, BOARD lane 6): `P18-S102-GRAPHNOSPEC` fixed (`b01053e2b`). NSP-008 runs on the export again

**The cause was in the shared runner, not the export.** The export's `canPlay` already puts an unspecced node outside.
But `74a73de91` (P112 s8, 2026-10-11) made `runGraphScenarios` ask `graphReach` eagerly, beside `canPlay`. The
export's `graphReach` builds the graph, so it threw on the scenarios `canPlay` had excluded, and the run ended there.
Fixed in `nodegx-node-spec/src/runner/graph.ts` by putting the order back. A regression is in the node-spec kit
(`tests/graph.test.ts`, "a scenario canPlay puts outside is never asked its reach"): red on the eager line, green on
the fix.

**Under the throw, G1 was stale** from `8a177580d` (ISL-033 corrected C6; the export's atomic And was never declared).
It is declared now: c06 `divergence.export`, CONTRACT.md Part 2 C6 ⚠️ partial, and the node-spec gate's set is
C6/C7/C8.

Readings: the export graph runs 6/6 (**CONFORM: 1 passed, 3 diverged as declared, 81 outside, 0 failed of 85**).
That is ISL-043's instrument, working. Node-spec graph 129/129, runtime graph 102/102. **The whole-package export
jest reads `Test Suites: 3 failed, 112 passed, 115`**, and the three by name are `hls001-catalog-cardinality`
(CATALOGNAME), `date-family` (DATEHARNESS) and `navigate-to-path` (NAVENCODE). Any fourth red is new.

**Next, in order:** `P18-S102-NAVENCODE`, then `-DATEHARNESS`, then `-CATALOGNAME` / `-NOEXPORTCI`, then ISL-043.
For ISL-043, note that 81 of 85 graph scenarios are *outside* on the export, so only 4 are graded today (1 passed,
3 declared differences). "CONFORM" counts outside as conforming; the ledger line must not. The outside
reasons are all in the report (`npx jest tests/node-spec-graph.test.ts`, the console block). Most are the harness's
own limits (no world, one component, no `set`), not the exporter's.

---

## ✅ Session 102 (2026-10-14, BOARD lane 6): the owed gates are read and session 101's pile is COMMITTED

Everything below this section that says "uncommitted" or "owed gates" is history now: both gates ran. The
whole-package jest had 6 suites red. Two were the pile's (the 16th floor pin, and the HLS-001 golden that did not
know `pattern-desk`), and both are fixed in the same commit. Four are red at HEAD without the pile, each from
another phase. `test:ci` passed 3017 / 0. The record is in EXP-011 §76.5.

**Next, in order (BOARD lane 6):**
1. `P18-S102-GRAPHNOSPEC`: NSP-008 on the export throws on a node it has no spec for. This is ISL-043's instrument.
2. `P18-S102-NAVENCODE`: the exported Navigate To Path sends Query values unencoded. The runtime has encoded them
   since D21.
3. `P18-S102-DATEHARNESS`: date-family's runtime harness stubs `require`, so the export has gone ungraded since ISL-032.
4. `P18-S102-CATALOGNAME`, `P18-S102-NOEXPORTCI`: small.
5. Then ISL-043, and §77–§79 below.

`node scripts/bugs.js --from P18` lists them. The whole-package suite should read `Test Suites: 4 failed` (those
four, by name) until they are fixed. Any fifth red is new.

---

**(Session 101's hand-off, kept as written.)** Session 101's work was uncommitted at hand-off. Session 102 committed it.

## 🔴 Read this first — Richard, 2026-09-02: *"Stop fucking up the CPU."*

One heavy job at a time on this 16 GB box. Session 101 ran individual specs only (`the-pattern-extractor.test.ts`
39/39, the nine re-pointed no-rule specs 353/353, `browser-utilities.test.ts` 55/55 after the crypto verbs'
signatures changed, package `tsc --noEmit` 0, `export-ledger:check`/`--picker` both green) and the editor's
`tsc -p tsconfig.json --noEmit` (exit 0, empty log — the gate the §75 handoff owed). **It did NOT run the
whole-package `nodegx-export` jest (101+ files) or the editor's `test:ci`** — a peer session held the box for
the whole drive and no slot opened before this session closed. Session closed on the user's own instruction
("Close out here, just update docs") rather than push through a busy box.

## 🔴 The next session's FIRST job: the two owed gates, before building anything else

1. `cd packages/nodegx-export && npx jest` — whole package, once. Expect green: nothing under `src/` was
   touched after the individual specs above went green, and the fifteen `pickerCoverageFloor` pin comments
   were moved by the same session that moved the ledger's own number (never by hand). If it is NOT clean,
   that is this session's own miss — read the failing file's own reasoning before assuming a peer's collision.
2. `cd packages/noodl-editor && npx webpack-cli --config=webpackconfigs/webpack.test-ci.js && node scripts/run-electron-tests.js --ci` (`npm run test:ci`) — the editor's own gate, which typechecks this package's tests
   under a different tsconfig dialect (`the-editor-test-ci-webpack-typechecks-a-sibling-packages-tests`).
   The plain editor `tsc --noEmit` already ran clean this session; `test:ci` is the one that has not.

Only after both read clean should the next session move to building a further row — building on top of an
unread gate is exactly the trap `a-read-before-pointer-is-a-precondition-not-a-label` and
`a-run-list-is-not-a-log` name.

## The board, re-derived from the task files

| task | status |
|---|---|
| EXP-001 `@nodegx/core` | ✅ Published `0.1.0` (4 `0.1.1` rows carried) |
| EXP-002 / 003 / 005 / 006 / 007 | unchanged |
| EXP-004 | 🟡 built + driven; drill-down panel + the comprehension test remain (Richard's); §69.4 #1 |
| EXP-008 | ✅ `export-ledger:check` OK — **180 types, 130 translated, 32 deferred, 1 stubbed, 17 backend-only**. 🔴 Open: no per-parameter coverage (§75.5 #3 / §76.4 #4 restate it — do not quote 100% without it) |
| EXP-009 / EXP-010 / EXP-012 / EXP-013 | 🟢 |
| EXP-011 picker coverage | 🟡 **123/130 (94.6%)** — §76 built `Pattern Extractor`. **7 left**: Action Dispatcher, Action Handler, State Snapshot, State History, Undo / Redo, Optimistic Update, Sign In With |
| EXP-014 / 015 / 016 / 017 | 🟢 |

## What session 101 did (EXP-011 §76 — read it; this is the summary)

1. **Measured `Pattern Extractor` against `Hash`'s shape (§59) before writing anything.** Both are
   `crypto-call`: an action port, an outcome pair, a raise on Failure. The extractor differs in degree, not kind:
   SEVEN value outputs where Hash has one (each SEEDED by `initialize`, unlike Hash's row, which boots
   undefined), and a third signal pair — `Found`/`Not Found` — sent *before* `reportOutcome('done')`, so two
   more chain arms compile off one Extract. `CryptoNodeKind` widened to `'hash' | 'random-bytes' | 'pattern'`;
   `CryptoCallAction` gained `foundThen`/`notFoundThen` and `materializeByPort`.
2. **`src/emit/patternLib.ts` → emitted `src/lib/pattern.ts`**: one verb, `tryExtract`, transcribed from
   `stream-parsers.ts`'s `extractPattern` plus the node's own setters/getters. Generated from a real `.ts` file,
   typechecked strict with no ambient types, graded by a 5,280-cell differential against the runtime before
   being turned into the string-array form.
3. 🔴 **Found writing the differential, not by reading: every crypto-family call needed optional arguments.**
   The emitter already drops trailing `undefined`s (`tryHash()` for an unconfigured Hash), but `tryHash`/
   `tryRandomBytes`'s own signatures still *required* every parameter — so that printed call was one the
   exported app's own strict `tsc` refused. No existing gate caught it (`browser-utilities.test.ts` E2 asserts
   the printed text, never typechecks it). Fixed in the same session: both verbs' signatures now take optional
   arguments, with the reason at the call site.
4. **The fold whitelist's hazard, in the opposite direction from every prior instance.** §37/§59/§75 each found
   a row that NEEDED the `?? ''` fold and silently didn't get one. The extractor's rows are all seeded — never
   undefined — and the first emit printed `{percentError ?? ''}` anyway: a fold that was never needed, applied
   because `outcome-error`'s existing rule read `viaState !== undefined` with no way to say "and this one is
   seeded". Fixed with a `seeded` marker on the expression, read in both `plan.ts` and `component.ts`.
5. **Nine tests across the package had borrowed `net.noodl.Hash` or `net.noodl.PatternExtractor` as their
   "node with no rule" example** (§59 and prior sessions re-pointed some of these already, moving the target as
   each phase translated the previous one). Re-pointed to `net.noodl.user.SignInWith` — the next untranslated
   row down the §75.5/§76.4 order — and re-run 353/353.
6. **`tests/the-pattern-extractor.test.ts` 39 rows**: §A the fixture whole (17 files, pattern lib shipped,
   crypto lib absent, app typechecks, every row prints bare), §B the differential (11×12×8×5 grid, 5,280
   cells), §C nine wire-shape variations, §D nine refusals by exact sentence, §E the two findings pinned, §F
   the ledger and earned-not-shipped controls. Ledger: one row → translated, fifteen pins moved, floor 122 →
   123.

## Uncommitted at hand-off

**Everything from session 101 is uncommitted.** `git status --short` in the repo root shows, under
`packages/nodegx-export/`:
- Modified: `coverage-ledger.json`, `src/analyze/plan.ts`, `src/emit/component.ts`, `src/emit/cryptoLib.ts`,
  `src/emit/emitApp.ts`, and fifteen `tests/*.test.ts` files (the floor-pin moves and the nine re-pointed specs).
- New: `src/emit/patternLib.ts`, `tests/the-pattern-extractor.test.ts`, `tests/fixtures/pattern-desk/` (the
  fixture directory, incl. a `Components/MatchRow` template).

Also under `dev-docs/tasks/phase-18-code-export-v2/`: this file, `README.md` (headline number + the §3
strike-through), and `EXP-011-PICKER-COVERAGE.md` (§76 appended, §3's list amended).

PEERS' work, untouched and heavy, is also sitting uncommitted in the same working tree (unrelated to this
phase): `dev-docs/tasks/phase-78-the-templates/**`, `packages/nodegx-backend/tests/**`,
`packages/noodl-mcp/tests/**`, `package.json`/`package-lock.json`, and others outside `nodegx-export` and this
phase's docs. 🔴 **Commit through a temporary index with pathspecs that name only this session's files**;
never `git add -A` or a plain `git commit` on this tree (`commit-your-delta-through-a-temporary-index`,
`a-pathspec-commit-skips-untracked-files` — the new files above need explicit paths, not just the modified
ones).

## 🔴 Do this next (BUILD) — after the two owed gates in §76.3/above

1. **§77 `Action Dispatcher` / `Action Handler`** (`agent/action-dispatcher.ts` 963 + `actiondispatchernode.ts`
   673 lines) — an in-app bus; read `Send Event`/`Receive Event`'s translation first, it is the nearest shape.
2. **§78 the history family** — `State Snapshot`, `State History`, `Undo / Redo`, `Optimistic Update`
   (`statesnapshotnode.ts`, `statehistory.ts`, `undonode.ts`, `outcome.ts`). Two sessions; stateful.
3. **§79 `Sign In With`** — the §48 reason ("waits on a provider decision") is STALE: `nodegx-backend/src/
   auth/github.ts` exists and `RestAuthAdapter.signInWithProvider` is implemented. Needs a drive of the
   redirect's return leg (`_consumeAuthReturn`) against the real backend, not a spec alone.
4. **Before anyone quotes 100%:** EXP-008's per-parameter coverage question (§75.5 #3 / §76.4 #4) — one
   session on a per-parameter ledger check.
5. Still queued from earlier sessions: §74.5 #1 (the `unknown`-into-a-typed-store-key sink), §69.4 #1 (the
   cascade sentence), §71.5 (Richard's ruling).
6. **No drive was run this session** (§76.4 #6) — the built `pattern-desk` export has not been served/driven
   headless. Not blocking (the differential + emitted-app typecheck graded it), but owed before the row is
   called fully proved the way §59's utility-desk was.

## Earlier hand-off (session 100), kept for the record

# Next session — session 100 (2026-09-26) BUILT §75: the four parsers (`Parse CSV`, `To CSV`, `Parse XML`, `Parse Feed`) — picker **118 → 122 of 130 (93.8%)**, the first move on the headline number since GAM-013. Richard's ruling this session: *"Can we not finish the code export nodes? If we had 100% coverage that would be a big deal"* — **every remaining picker row is a target now**; §50.3's exclusion list is reversed (EXP-011 §3 and §50.3 amended, §75.0).

**Session 100's commit: `fcf68a1c7`** (feature); this handoff's own commit follows it.

## 🔴 Read this first — Richard, 2026-09-02: *"Stop fucking up the CPU."*

One heavy job at a time on this 16 GB box. Session 100 ran single specs, ONE whole-package jest (13 files red, all pins/goldens this
section moves, each counted first), a 14-file rerun, package tsc, the ledger gates and the dist build — and did NOT run the editor
tsc or `test:ci`, because a peer's headless Chrome drive held the box at load 16–22 for the whole gate window. **The next session owes
those two before it builds** (the editor's webpack typechecks this package's tests: `the-editor-test-ci-webpack-typechecks-a-sibling-packages-tests`).

## The board, re-derived from the task files

| task | status |
|---|---|
| EXP-001 `@nodegx/core` | ✅ Published `0.1.0` (4 `0.1.1` rows carried) |
| EXP-002 / 003 / 005 / 006 / 007 | unchanged |
| EXP-004 | 🟡 built + driven; drill-down panel + the comprehension test remain (Richard's); §69.4 #1 |
| EXP-008 | ✅ `export-ledger:check` OK — **180 types, 129 translated, 33 deferred, 1 stubbed, 17 backend-only**. 🔴 Open: no per-parameter coverage (§75.5 #3 restates it — do not quote 100% without it) |
| EXP-009 / EXP-010 / EXP-012 / EXP-013 | 🟢 |
| EXP-011 picker coverage | 🟡 **122/130 (93.8%)** — §75 built the four parsers. **8 left, ALL targets by the 2026-09-26 ruling**: Pattern Extractor, Action Dispatcher, Action Handler, State Snapshot, State History, Undo / Redo, Optimistic Update, Sign In With |
| EXP-014 / 015 / 016 / 017 | 🟢 |

## What session 100 did (EXP-011 §75 — read it; this is the summary)

1. **Measured the shape first.** The four parsers re-parse on every arrival and hold nothing else — Tier 2.7's `util-call`, with
   SEVERAL value outputs each, so `UTIL_NODES` gained a trailing-selector field (`select: true`, `DATE_NODES`' idea) rather than the
   export gaining a kind. `Pattern Extractor` is NOT this shape (outcome-token action with `Found`/`Not Found` — `Hash`'s family, §59)
   and was deliberately left for its own section.
2. **`src/emit/parseLib.ts` → emitted `src/lib/parse.ts`**: `csv.ts`, `xml.ts`, `feed.ts` and the four node files transcribed; one
   helper per node answering the output named by its last argument; a one-entry memo per helper; typed overloads (`any[] | undefined`
   for a list, `number` for a count, `unknown` where it can be undefined). Generated from a real `.ts` file (typechecked strict, graded by
   the differential) into the string-array shape.
3. **The dependency decision the `Parse XML` ledger row said to take first — taken (§75.2):** the exported `package.json` earns
   `fast-xml-parser: 4.5.7` (the interpreter's exact pin) when a component calls `parseXml`/`parseFeed`. First third-party dependency an
   emitted lib has declared. `typecheckApp.ts` resolves it for real. Richard can overrule; the reasons are in §75.2.
4. **Plan/emitter clauses:** selector appended; `Changed`/`Failure` defer with the date family's recomputation sentence; `required`
   port unwired+unauthored defers with `dateReadExpr`'s sentence; a parser's code-editor text (`script` param) read as the literal it
   is; `To CSV` admitted as a named array's list reader; a parser's list output kept OUT of Pass 4c's `LOGIC_VALUE_OUTPUTS` so Pass 5 §4e
   binds it to a For Each; `listExprFields` knows a feed's twelve fields; the util import split by module; `withDependencies`.
5. **The one divergence, reported where it can happen:** on a failed parse the interpreter keeps the previous answer beside the Error,
   the pure call cannot — noted at a parser whose text is WIRED, never at a literal.
6. 🔴 **Found by the differential, not by reading: `feed.ts:365` hashes with a NUL byte** (a literal U+0000 between the quotes, drawn as a
   space). The emitted module writes `'\u0000'`; §A pins the runtime byte. Registered §75.5 #1, owner NONE, product side — **tell Richard**:
   a "fix the odd character" edit in the runtime silently re-mints every hash-rung feed id FED-002's index keys on.
7. **`tests/the-parsers.test.ts` 25 rows** (§A differential over 120 CSV cells, 16 To CSV shapes, every runtime XML/feed fixture × 3;
   §B translation rows and five refusals by sentence; §C `tests/fixtures/sheet-desk` typechecked whole). Ledger: 4 rows → translated,
   floor 118 → 122, twelve pins moved, subscribe-to-changes F2 rewritten (no scheduled row remains — pinned empty), relation-verbs'
   untranslated-feeder example is now `Pattern Extractor`, HLS-001 golden regenerated (49 README hashes + the new project, counted first).

## Uncommitted at hand-off

Nothing of session 100's after its commits (see `git log`). PEERS' work, untouched and heavy: `dev-docs/tasks/phase-78-the-templates/**`
(TPL-011 nightbook, a 600-file pile incl. `templates/planner-demo` deletions), `packages/nodegx-backend/tests/**`, `packages/noodl-mcp/tests/**`,
`scripts/devtools/drive-*.js`, `package.json`/`package-lock.json`. 🔴 Commit through a temporary index with pathspecs; never plain `git commit`.

## 🔴 Do this next (BUILD) — the order is by what a refusal silences and by runtime size

0. **Owed gates first:** editor `tsc -p tsconfig.json --noEmit` and editor `test:ci` on this tree (see the CPU rule above).
1. **§76 `Pattern Extractor`** — `Hash`'s shape (§59 `CRYPTO_NODES` / `crypto-call` / `crypto-out`), generalised: seven value outputs
   (`match`, `matches`, `groups`, `firstGroup`, `namedGroups`, `matchCount`, `error`), the outcome pair (`done`/`failure`, code
   `pattern-extractor/extract-failed`), PLUS `found`/`notFound` — two result pulses off one Do. Runtime: `agent/pattern-extractor.ts` +
   `agent/stream-parsers.ts` (`extractPattern`). One session; the crypto table's `node` union and single `output` are what have to widen.
2. **§77 `Action Dispatcher` / `Action Handler`** (`agent/action-dispatcher.ts` 963 + `actiondispatchernode.ts` 673 lines) — an in-app
   bus; read `Send Event`/`Receive Event`'s translation first, it is the nearest shape.
3. **§78 the history family** — `State Snapshot`, `State History`, `Undo / Redo`, `Optimistic Update` (`statesnapshotnode.ts`,
   `statehistory.ts`, `undonode.ts`, `outcome.ts`). Two sessions; stateful.
4. **§79 `Sign In With`** — the §48 reason ("waits on a provider decision") is STALE: `nodegx-backend/src/auth/github.ts` exists and
   `RestAuthAdapter.signInWithProvider` is implemented. Needs a drive of the redirect's return leg (`_consumeAuthReturn`) against the
   real backend, not a spec alone.
5. **Before anyone quotes 100%:** EXP-008's per-parameter coverage question (§75.5 #3) — one session on a per-parameter ledger check.
6. Still queued from s99: §74.5 #1 (the `unknown`-into-a-typed-store-key sink), §69.4 #1 (the cascade sentence), §71.5 (Richard's ruling).

---

