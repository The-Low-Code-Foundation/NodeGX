# Phase 99 — The ones nobody owned

**Scoped:** 2026-09-20, from Richard driving the editor by hand for 42 minutes and from the log that
drive left behind, read against `cline-dev` HEAD `55dd19523`. **Status: 📋 building — HLT-001 ✅, HLT-002 ✅, HLT-003 ✅, HLT-004 ✅, HLT-005 ✅, HLT-006 ✅ (AC5 ruled WORTHY), HLT-011 ✅, HLT-012 ✅ (AC5 awaits Richard), HLT-013 ✅, HLT-008 ✅ (P93 AC7 awaits Richard), HLT-014 ✅ (validator warning left), HLT-015 ✅ (s12; AC7 is the DBT stream's), HLT-010 ✅ (s13 — the gate; CI job not yet seen on Linux), HLT-017 ✅ (s14 — drag and drop; AC9 is phase 78's), HLT-018 ✅ (s15 — AC5 is the DBT stream's), HLT-007 (b) ✅ (s15 — (a) awaits Richard), two to go (HLT-007 (a), 009), plus HLT-015 and HLT-016 (opened 2026-09-21 from the Digital Bricks Training stream).
Prefix: `HLT`.**

> "Let's write a phase with bug fixing tasks to unfuck this fucker."
> — Richard, 2026-09-20, after testing the board

> "A health sweep I think, you'll probably find other fuck ups from other phases […] I bet there's a
> bunch of bugs that have slipped through the net recently."
> — Richard, same conversation, scoping this phase

## 1. The person sentence

> **Someone using the editor for an hour produces a log a maintainer can read — because the errors
> that used to fill it are fixed, and a new one fails a gate instead of waiting four phases for an
> owner.**

## 2. 🔴 Why this phase exists, and it is not "there are bugs"

Richard's bet was that a sweep would turn up bugs that slipped through. **The measurement says
something worse and more useful: almost nothing slipped through. It was seen, named in writing, and
disowned.**

`CanvasView.captureThumbnail`'s unhandled rejection is the specimen. It has been observed and
written down **four times, in four phases, by four sessions**:

| where | what it said | that phase now |
|---|---|---|
| P66 `FIX-019:111` | *"Observation, not this task's defect … ~15 during this drive, predating both fixes. Filed in NEXT-SESSION-PROMPT §3"* | ✅ closed 2026-08-18 — **and that handoff no longer carries the row** |
| P56 `HANDOVER-SESSION-5.md:115` | *"~6 times per session … Pre-existing … no observed consequence — noted so the next driver does not attribute it to their change"* | closed |
| P23 `UIX-006-NOTES.md:47` | documents the pipeline that produces it | ✅ complete |
| P39 `POL-010:84` | same exception class, ruled *"Not a state any user can produce"* | closed |

Four honest notes, each correctly scoped out of the task that found it, and the defect is now at
**116 events in 42 minutes** — roughly a twentyfold increase on P56's reading, and nobody measured
it again because everybody had already filed it.

🔴 **The lesson this phase is built on: "filed as an observation" is not an owner, and a note in a
handoff dies with the phase.** Every row below carries a named owner and a number that has to reach
zero. See [[an-unowned-row-gets-rediscovered-at-full-price]] — this is that memory's worked example,
and the price was four rediscoveries.

## 3. The numbers this phase moves

**Measured 2026-09-20 from `.logs/dev.log`**, one ordinary session: launch 20:28 → quit 21:10,
**42 minutes**, Richard clicking around the board, Layers and the canvas. 3,254 log lines.

| # | number | at HEAD | end |
|---|---|---|---|
| 1 | React *"synchronously unmount a root while React was already rendering"* | **132** | ✅ **0** (HLT-001, 2026-09-20) |
| 2 | `GUEST_VIEW_MANAGER_CALL: UnknownVizError` unhandled rejections | **116** | ✅ **0** (HLT-002, 2026-09-20) |
| 3 | React duplicate-key errors | **10** | ✅ **0** (HLT-003, 2026-09-21) |
| 4 | Other React correctness warnings (null `value` prop, missing key, setState-during-render) | **3** | ✅ **0** (HLT-003, 2026-09-21) |
| 5 | Failed network requests in a normal launch (404 `feed.json`, 401 `profile`, 401 `path`) | **3** | ✅ **the two 401s are 0** on a driven launch, control 1 each (HLT-004, 2026-09-21). 🔴 The 404 is **classified correct** — the whole content origin is unpublished → **HLT-013** |
| | **total renderer error events in 42 minutes** | **264** | **0** |

⚠️ **Number 2 is 116, not 232.** The same event is written to the log on two channels
(`[renderer:error]` and `[renderer:exception]`); both counts are 116 and they are one population.
Counting the lines rather than the events is the first mistake available here
([[ugrep-silently-skips-a-source-file-as-binary]] is the same family — the grep is not the artefact).

⚠️ **These are one session on one machine driving three surfaces.** They are a floor, not a census.
A task that fixes its error must re-measure on **its own** driven session, not subtract from 264.

## 4. What is already true, and must not be re-derived

- **The templates are not the problem.** `npm run validate:project` over all seven shipped templates
  (2026-09-20): **0 errors** across 2,658 nodes and 6,146 endpoints. The only real finding is
  HLT-009's six inert parameters. Richard's "other places too" was a good bet that this measurement
  answers: the corpus is sound and the *editor* is where the rot is.
- **P94 is CLOSED**, all seven STY tasks ruled WORTHY at s10. ⚠️ Its `README.md` status header is
  **stale** and still reads as open; its own task table and `NEXT-SESSION-PROMPT.md:1` say closed.
  Do not read P94's README as an open phase. Fixing that header is HLT-010's smallest job.
- 🔴 **CORRECTED 2026-09-21 (Richard). P94 did NOT rule the colour picker out of scope, and this
  bullet previously said it did.** Read P94's R1 as *asked and answered*: the question was **"does
  the panel REPLACE the in-node pickers, or sit beside them?"** and the answer was **"BESIDE. The
  picker stays for *picking* on a selected node; the panel is for *managing* — create, rename,
  delete, see what uses it"**. That ruling **preserves** the picker as the picking surface and keeps
  *management* out of it. It says nothing about which values the picker may offer. Richard,
  2026-09-21: *"The picker is for picking sure, so why wouldn't I be allowed to pick a design
  token?"* And P94 went further than permitting it: **STY-007, the task that CLOSED the phase,
  fixed "every `var(--…)` swatch in the colour picker painted nothing" — a defect Richard found
  himself.** P94 treated tokens in the picker as belonging there and repaired them. **HLT-006 needs
  no ruling and never did** — this bullet was a paraphrase of a paraphrase
  ([[a-relayed-conclusion-decays-faster-than-a-relayed-measurement]]).
- **The Styles panel's two-level nesting is the ruled design**, not a defect: P94 `STY-005` AC2 and
  AC8, closed on Richard's look. HLT-007 takes only the half nobody ruled on.
- P93's `TVW-008 §11.4` files four of these with *suggested* destinations. Those were suggestions,
  not transfers, and the sweep confirmed **none of the suggested owners has a row**. This phase is
  where they become rows.

## 5. Tasks

**Order is dependency order.** HLT-001 first because it is the largest count and its fix already
exists in the codebase; HLT-010 last because a gate written before the counts are zero is a gate
that ships red and gets switched off ([[a-gate-can-have-a-hole-shaped-like-the-defect]]).

### Track A — the noise the editor makes during ordinary use

| id | task | depends on |
|---|---|---|
| [HLT-001](./HLT-001-THE-SYNCHRONOUS-UNMOUNT.md) | ✅ **BUILT 2026-09-20 — 0 on a driven session, control 1,538.** ⚠️ §3's census was wrong: **78** call sites in 60 files, not 19, and **eleven** already deferred, not one. 🔴 And the first fix **traded** the error for two others (`removeChild` ×8/run, double-`createRoot` ×2/run) that a drive counting only this message called a clean pass — both now 0. [verdict](./verdicts/HLT-001/2026-09-20/VERDICT.md) | — |
| [HLT-002](./HLT-002-THE-THUMBNAIL-NOBODY-CAUGHT.md) | ✅ **BUILT 2026-09-20 — 0 on a 21-minute session, 41 real captures beside it.** 🔴 §2's own thesis, sharper than expected: the task file's *"a webview that is not attached"* is **wrong** — `captureThumbnail` has carried an attachment guard since the initial commit, and at all seven measured failures the webview was attached, DOM-ready and in a visible window. **It is hidden, not detached** (BEN-004 R3), so nothing in this file changed between P56's 6 and Richard's 116 — **the editor changed around it**. ⚠️ And a **second regime emits nothing at all**: with the window occluded `capturePage()` never settles, so every instrument ever pointed at this was blind to it. [verdict](./verdicts/HLT-002/2026-09-20/VERDICT.md) | — |
| [HLT-003](./HLT-003-THE-REACT-CORRECTNESS-WARNINGS.md) | ✅ **BUILT 2026-09-21 — all four at 0 on a driven session, each on a surface the drive PROVES it reached, each beside a control that fired.** 🔴 §2 was wrong three ways and the corrections are the value: the arguments were never *lost* (the old wrapper appended them all — the setState warning already said `VisualCanvas ComponentBoard ComponentBoard` in plain text), the name that IS missing is one **React 19 never passes** and is reachable only from inside the `console.error` via `ReactSharedInternals.getCurrentStack`, and the duplicate key is **the launcher's**, not a project entity's — the bursts start ~10s *before* any project opens. Cause: **two different projects share one stored `id`** and **one directory is registered twice**, so *neither* field was unique. [verdict](./verdicts/HLT-003/2026-09-21/VERDICT.md) | — |
| [HLT-004](./HLT-004-THE-THREE-FAILED-REQUESTS.md) | ✅ **BUILT 2026-09-21 — both 401s at 0 requests and 0 log lines on a driven launch, control 1 of each on the identical build.** 🔴 §2 was wrong a **fifth** time out of five, and in a new way: all three were **already handled** — the log line is **Chromium's network stack**, written before JavaScript sees the response, so no `catch` removes one and only an unmade request does. 🔴 The defect was the one thing nobody owned: **`clearCommunitySession` had exactly ONE caller** (the deliberate sign-out) while **29** modules render `unauthenticated`, so a token the platform had started refusing was re-sent for ever under a card drawing the handle cached beside it — `/api/v1/me` answered `viewer: null` to it on every launch and nothing compared the two. ⚠️ §3's *"Out"* line named the defect. [verdict](./verdicts/HLT-004/2026-09-21/VERDICT.md) | — |

### Track B — the property editor and the styles seam

| id | task | depends on |
|---|---|---|
| [HLT-005](./HLT-005-THE-COMMENT-THAT-OVERFLOWS.md) | ✅ **BUILT 2026-09-21 (`228feddb1` — ⚠️ swept into a sibling's *"DBT template L164"* commit; see the verdict) — 0px of reachable horizontal scroll on a driven session in all four cells (both themes × the panel's min and max docked widths), control 1,253px and 497px on the identical build.** 🔴 **§2 measured TRUE — the first task file in this phase that did**, after five running corrections. The bar rendered **1,489px inside a 224px scrollport**, with the middle of the field out over the canvas. Fixed in two declarations, not one: `flex: 1` closes the basis route, `min-width: 0` closes the automatic-minimum route a 200-character unbroken word takes (1,069px → 0). Moved from an inline style to `propertyeditor.css` deliberately — **an inline style wins the cascade, which is why six "Left" lists could name this defect and none could close it from the file that describes the row**. ⚠️ Three more instrument faults that printed verdicts first: the drive dragged the **nested** FrameDivider and reported two widths about one reading; the fixture **fit** the widest panel at 139 characters so the control scored a failure-to-fire; and `THE NUMBER` passed on a run that measured nothing, because `Math.max(a, undefined \|\| 0)` is 0. [verdict](./verdicts/HLT-005/2026-09-21/VERDICT.md) | — |
| [HLT-006](./HLT-006-THE-PICKER-CANNOT-SEE-A-TOKEN.md) | ✅ **BUILT 2026-09-21 — 25 design tokens offered on a driven session, control 0.** 🔴 §2 was wrong a fourth time out of four, and the correction reconciles this phase with P94: the picker *displays* token rows by **echo** (`getProjectColors` collects values already set on colour ports, and on a token-authored project those ARE `var(--primary)`), while *enumerating* none — so P94's STY-007 and §2 were both true of different lists. The echo **cannot bootstrap**: 13 of 91 colour tokens reachable, 78 unreachable by any path. 🔴 And Richard re-scoped it on the number: *"why TF does one app have 91 colour tokens?"* — it has **25** (16 its own); the other 66 are a shipped ramp it references **not once**. Semantic open, ramp behind one closed row. AC4 **retired as the wrong surface** → HLT-012. ✅ **AC5 RULED WORTHY by Richard 2026-09-21** — *“I’m happy with the colour pallet fix”* — so this row is CLOSED. [verdict](./verdicts/HLT-006/2026-09-21/VERDICT.md) | — |
| [HLT-007](./HLT-007-THE-TWO-THINGS-P94-DID-NOT-RULE-ON.md) | 📋 **(b) ✅ BUILT 2026-09-22 (s15) — AC2–AC4: the panel reads the one table through `groupForTokenCategory`, and a contract category with no entry is a compile error. (a) WAITS ON RICHARD: should *Text styles* show the typography tokens, or say the project has none? AC1/AC5 go with it.** Two halves nobody ruled on. **(a)** `TextStylesSection.tsx:28` reads `getStyles('text')` — the legacy layer — so the section a person looks in first is empty in every real project, while the token is filed under *Other tokens → Typography*. **(b)** 🔴 `getGroupForToken` (`TokensSection.tsx:144-152`) is a **second copy** of the category→group table returning `null` for unmapped categories, **silently dropping them from the panel** — its own docblock records this happening to `gradient` ([[a-second-copy-of-a-palette-drifts-silently]]) | — |

### Track C — the board, moved here from P93

| id | task | depends on |
|---|---|---|
| [HLT-008](./HLT-008-THE-BOARD-SLICE-3.md) | ✅ **BUILT 2026-09-21 (s10) — all six of Richard's board defects closed on a driven session, each gesture performed and read off the surface: 21/21 fixed, 9/20 on the identical drive against HEAD.** 🔴 §2 named six symptoms; three are **one mechanism** — the board draws every frame in ONE `<webview>` sized to their union and painted white, so the gutters were inside the slab (B3 "flush"), the guest ate every wheel and press over it (B3 "cannot pan"), and a one-button frame stood in the 768px estimate (B2). A `clip-path` cut to the frames' **measured** boxes fixes paint and hit-testing both — measured before it was written. 🔴 **And a defect the task never named: the harness gave the root `layout: 'none'`, a port Group does not have** (it is `flexDirection`), so every frame stacked in a column and its content drew up to 262px from its own border — half of B5 — while the spec pinning it read the literal back under a comment warning that exactly this would happen. Now every harness key is graded against the node catalog. 📋 **P93 AC7 (Richard's WORTHY, both themes, `shots/hlt008-fixed-ac7-*`) is the one criterion left, and it closes in P93.** [verdict](./verdicts/HLT-008/2026-09-21/VERDICT.md) | P93 TVW-008 §11 |

### Track D — the corpus, and the gate that should have caught all of this

| id | task | depends on |
|---|---|---|
| [HLT-009](./HLT-009-THE-INERT-PARAMETERS.md) | `digital-bricks-training` sets `width` and `sizeMode` on three `dbt-lesson.*` node types that declare neither, on 6 nodes — so the sizing a reader copies does nothing ([[an-inert-parameter-in-a-corpus-example-teaches-a-lie]]). ⚠️ **That template is being built RIGHT NOW in numbered sprints by another stream** (`0a0fd7f0d`, sprints 44–45). Message its owner before touching a file; this may already be its next sprint's work | — |
| [HLT-011](./HLT-011-THE-TWO-PROJECTS-WITH-ONE-IDENTITY.md) | ✅ **BUILT 2026-09-21 — clicking the second of two cards sharing one identity opens the SECOND project; control on the identical fixture opens the first, 9/9 arms each.** ✅ **§2 measured TRUE — the second in this phase** — and the origin was already written down: P73 `TUT-001`'s verdict records *making* the collision, cloning the store entry of the project it copied *"so the copy would inherit the backend"*. That backend is `backend_msjck0y2ukxwv`, **"Puppy test 3 backend"**, and both projects own it today — README §1B's two-apps-one-datastore with the ownership check intact and answering honestly about the wrong project. 🔴 **The phase thesis one turn sharper: this defect was not disowned, it was MANUFACTURED by a session's own instrument** and rediscovered four phases later as a duplicate-key warning. Fixed by addressing a row with the thing a row IS — its directory — across **eight** `.find(p => p.id === …)` reads and **ten** callbacks (delete was the sharpest: `removeProject` splices the first match). AC3 ships detection, never repair; AC4 leaves the real collision explicitly, because re-minting an id moves a datastore. ⚠️ The fix's own trade, caught by the drive's reach arm: the warning toast covers a card for its 6-second life. [verdict](./verdicts/HLT-011/2026-09-21/VERDICT.md) | — |
| [HLT-012](./HLT-012-THE-NUMERIC-FIELDS-CANNOT-OFFER-A-TOKEN.md) | ✅ **BUILT 2026-09-21 — 13 font sizes offered on a Font Size row and 31 spacings on the padding box, on a driven session; control 0 and 0 on the identical drive against the HEAD build, same 25-row panel, same node.** 🔴 §2 was right about every number it counted and wrong about what it counted: **there are FOUR fields, not three**, and the fourth is not numeric — `fontFamily` is a `font` port, a `PickerTypeView`, carrying `var(--font-mono)` today while `TextConfig` stamps `var(--font-sans)` on every new Text, and §4's *"In"* line excluded it ([[a-tasks-out-of-scope-line-can-contain-the-defect]], the second scope line in this phase to contain the defect). 🔴 And the offer cannot be keyed off *"is it a number field"*: **166** numeric ports in the catalog, **86** that reach a field which can hold a token, **64** that should be offered one — `maxRetries` and `timeout` are number ports, and a spacing ramp on a retry count is HLT-006's 91-row problem one field along. 🔴 **Order is the decision**: written generic-first the rule table is silently wrong on seven ports (`/Spacing$/` takes `letterSpacing`, `/(width|height)$/` takes every `borderWidth`), offering the WRONG scale rather than none — mutant-run, 7 of 9 red. ✅ §6's scrub landmine measured TRUE and shipped closed (a one-pixel drag replaced a token with the port's default, silently); §6's ramp question is answered by measurement — the longest list is 31. ⚠️ Four more instrument faults, one of them in the phase's shared hit-test helper: `at.contains(el)` let a button 568px below the fold report `hit: true`, so the drive pressed the panel background and read a confident **0 tokens offered** on a working build. ⚠️ And a top-level import switched OFF two sibling suites — `tests-unit/rel-014` reported `Tests: 0 total`, 86 specs grading nothing. 📋 AC5 (Richard's WORTHY on four frames) is the one criterion still open. [verdict](./verdicts/HLT-012/2026-09-21/VERDICT.md) | HLT-006 |
| [HLT-013](./HLT-013-THE-CONTENT-ORIGIN-IS-UNPUBLISHED.md) | ✅ **BUILT 2026-09-21 — on a driven session, 70 "Read docs" presses open 70 pages that answer 200 and the 8 entries nobody wrote lose the button; control on the identical drive against HEAD's card: 78 presses, 78 × 404.** 🔴 **§2 was wrong a sixth time and the title with it: the content origin is ALIVE.** Its five probes all 404 on a healthy legacy Pages site (the org root is a *different* 404 — "Site not found"), `library.json` is fetched by nothing, and `docs:verify-origin` exited 0 the whole time. The dead thing was **every library docs link**: `ModuleCard` joined `entry.docs` onto the *content* origin — the one of ALPHA-006 B5's four links LIB-008 never moved, because it is the one that never called `getDocsEndpoint`. And repointing alone fixes nothing: the docs site had no library section. 70 of 78 entries had prose — **38 authored here in `library/` and never published**, 32 only upstream. Richard ruled the upstream prose in on the measured size (**0.6 MB**; ALPHA-006 §5's 413 MB was screenshots and zips), screenshots stripped. 🔴 **And the docs site had stopped building**: Parse XML's `<a href="x"/>` (2026-09-18) became a real anchor under `onBrokenLinks: 'throw'`; 15 of 199 node pages rendered `<tag>` text as markup; the next merge to `main` would have failed `deploy-docs.yml`, and no PR job built the site — now one does. `tutorialsmodel.js` deleted (zero importers, Richard's ruling). ⚠️ Owned, not fixed: the first press after a reload opened twice on 2 of 4 drives, both builds. [verdict](./verdicts/HLT-013/2026-09-21/VERDICT.md) | — |
| [HLT-010](./HLT-010-THE-GATE-THAT-WOULD-HAVE-CAUGHT-IT.md) | ✅ **BUILT 2026-09-22 (s13) — `npm run renderer-errors` launches its own dev stack (throwaway profile, a copy of `landing-pages`), drives launcher → card → 10 components / 52 selections → board → Workbench → app preview → save → reopen, and grades the log against `scripts/renderer-errors/budget.json`.** Fixed build **exit 0** (runs 6, 8); AC3 mutant (HLT-001 synchronous) **exit 1 naming `react/sync-unmount` 2,978 / 0**; 15 preconditions incl. three sentinels, one per log writer, each **1 event** (the uncaught one on 2 lines — dedup measured live). Spec 15/15, sum-not-max mutant 3 red. `pr.yml` job `renderer-errors` — ⚠️ **not yet seen on a Linux runner**. 🔴 **Its first runs found two:** `PropertyPanelCheckbox` rendered `value={null}` (fixed; HLT-003 could not see it — React reports that warning ONCE per session, so fixing the first null unmasks the next), and `NOODLPORT=0` killed the editor at startup (import server bound port 1; fixed). 📋 **Left, unowned:** `NOODLPORT=0` is still broken in the RENDERER (5 sites read the requested port → `ws://localhost:0/` ×28 + 67 `GUEST_VIEW_MANAGER_CALL`); `feed.json` 404 budgeted 2 until an empty feed is published on `nodegx-content` (Richard's call). §6 P94 header ✅. [verdict](./verdicts/HLT-010/2026-09-22/VERDICT.md) | HLT-001…009, HLT-011, HLT-012, HLT-013 |

### Track E — the runtime's own accessibility

| id | task | depends on |
|---|---|---|
| [HLT-014](./HLT-014-THE-POPUP-IS-NOT-A-DIALOG.md) | ✅ **BUILT 2026-09-21 (s11) — a Show Popup is a modal dialog in the preview, a deployed app and an exported app, with nothing to wire: on a driven session Escape closes it (`Cancelled` once, `Closed` 0), Chrome's AX tree names it from its heading, 0 of 20 Tabs reach the page (HEAD: 8), the page is `inert` while open, and focus returns to the opener by every path. HEAD 7/7 fired · fixed 25/25 in both layouts · export 14/14, `role` mutant 11/14 · templates 18/18 (HEAD 9/18).** ✅ §2 measured TRUE. 🔴 **AC7 caught a regression the decided shape would have shipped:** the toast prefab opens its toast through Show Popup, and a modal toast froze the page for three seconds — so Show Popup gained **`Modal`** (default on), which the toast sets off; the image-cropper had no accessible name and now has one. 🔴 Three renderer-error classes found and handed to HLT-010 (every popup raises `Layout is "node"`; the toast's own script throws; both on HEAD). ⚠️ `@noodl/mcp` is red on HEAD at 8, identical with and without this row. 📋 §3.1's validator warning is the one slice left. New tool: `exported-app-harness.js` drives an exported app. [verdict](./verdicts/HLT-014/2026-09-21/VERDICT.md) | — |
| [HLT-015](./HLT-015-THE-LINK-IS-SPENT-BY-A-SCANNER.md) | ✅ **BUILT 2026-09-21 (s12) — opening a magic link spends nothing; only the button on the page it opens does.** On a real socket, 3 `curl` GETs and 1 Chrome load of a fresh link: 200 *"Sign in to …"*, no cookie, no redirect, token row **byte-identical**, **0** sessions. HEAD: the 1st GET answered 302 and signed in, and Chrome, standing in for the person who clicks second, met *"Sign-in link expired"*. The POST redeems; a 2nd POST is expired. ✅ §2 measured TRUE. `peekRow` beside `consumeRow` (which is now peek + save); unknown, expired, spent and empty tokens render one page, byte for byte. 🔴 **The shipped email said it too:** *"Anyone who opens it is signed in"* was in every magic-link mail's text and HTML bodies; now fixed. Backend 166/168 suites; the 2 reds (`tpl008-*-drive`, *"no theme switch is drawn"*) are red with HEAD's auth files too. 📋 **AC7 left to the DBT stream** (its L171), at its request. [verdict](./verdicts/HLT-015/2026-09-21/VERDICT.md) | — |
| [HLT-016](./HLT-016-A-FUNCTION-CANNOT-WRITE-SAFELY-TWICE.md) | 📋 **Opened 2026-09-21 from the DBT stream (sprint 49), at Richard's request — *"Core primitive first."*** A cloud function can reach no transaction, no row lock and no conditional update; the only atomic operations are upsert-on-unique and an unconditional `Increment`. The DBT product lost a learner's facts to exactly this race (its L62). **Recommended shape, to be ruled:** (a) compare-and-swap on `PUT /classes/:c/:id` in SQL, 409 on a miss, both adapters; (b) a transaction scope only if (a) cannot express the invite claim; plus `unique.where` and `check` in index declarations. Blocks the DBT template's first writes (sprint 50) | — |
| [HLT-017](./HLT-017-THERE-IS-NOWHERE-TO-DROP-IT.md) | ✅ **BUILT 2026-09-22 (s14) — a card can be picked up and dropped on another column, or elsewhere in its own, with two checkboxes: `Draggable` on the card, `Accept Drops` on the list. On the shipped kanban example, driven with real mouse, touch and keys: the copy lifts, the column lights up (`Drag Over`), the gap opens where it will land and the column grows around it, and the card lands in Doing at position 3 with `Dropped Value` `card-brief`, `Drop Index` 2 — identical by keyboard (5 announcements) and by a held finger at 390×844. 0 DOM mutations in any column while hovering. HEAD: nothing lifts, nothing moves (5/5); fixed **43/43**.** All three rulings built as ruled (copy · hold ring · make room). 🔴 **§2's *"V1 workaround"* does not exist**: `templates/planner` has 0 `Drag` nodes (blocks move through the Move box), so AC1's second clause measures nothing and AC9 has no arithmetic to remove. ⚠️ And §2 missed `library/modules/drag-to-reorder`, a one-list node this does not replace. 🔴 **The drive caught a dead output** — `cancel()` signalled `'cancelled'` on a port declared `dragCancelled`, silent because `signal` checks `hasOutput` — and two layout faults no count could see: the gap pushed the last card out of its column, and a gap opened at the card's own slot moved every stacked column under a finger. Ratchets moved with attribution: `nodeDocBudget` 14,300→16,200 (**red on HEAD** at 14,315; this row +1,246). 📋 **AC9 (the planner uses it) is phase 78's.** [verdict](./verdicts/HLT-017/2026-09-22/VERDICT.md) | — |
| [HLT-018](./HLT-018-AN-EMPTY-OBJECT-CANNOT-BE-SAVED.md) | ✅ **BUILT 2026-09-22 (s15) — an Object field holding `{}` saves, on create, on update and in an import, and reads back as `{}`.** Real socket: create 201, `PUT` 200, import +2 of 2. HEAD: create **500** (*"cannot be bound to SQLite parameter 5"*), import **rolled back**, and 🔴 **the `PUT` answered 200 and wrote nothing**: `node:sqlite` takes a leading bare object as its named-parameter map, shifts every `?` after it, and matches 0 rows without throwing. §2 missed this. `serializeValue` now tests for a `Date` first and stores every other object as JSON, so it can no longer hand the driver an object at all (pinned over 10 shapes). ⚠️ §2 was wrong twice: PostgreSQL was never affected (`pg` stringifies itself; the new conformance case was green there on HEAD), and the tempting wrong fix stores a quoted ISO string, not `"{}"`. Conformance case `records/an-empty-object-saves-and-reads-back-empty` on both adapters (58/58 each); the wrong-fix mutant fails 2 Date specs. ⚠️ Unowned: without an ACL, `LocalSQLAdapter.save` reports success on 0 changed rows. 📋 **AC5 (`setup-backend.mjs` stops dropping `{}`) is the DBT stream's.** [verdict](./verdicts/HLT-018/2026-09-22/VERDICT.md) | — |

## 5a. 🔴 What HLT-001 changed for every task after it

**Count the errors your fix can CAUSE, not only the one it cures.** HLT-001's drive read a confident
**0** twice while the editor was writing error classes it had never written before, because the
instrument only knew one message. Two iterations of the fix were declared clean that way. Every
task here inherits the rule: the drive grades the class in §3 **and** whatever the repair can
introduce ([[a-recommendation-carries-a-measurement-of-some-property-not-the-right-one]]).

**And the count needs a known-firing control in the same instrument.** `--expect firing` mutates the
seam back and re-drives; a pair is the evidence, not either reading. HLT-001's first drive read 0
while selecting **zero nodes** — the arm that reports what the drive actually reached is the only
reason that was caught.

## 6. Rulings needed before building

| # | question, in plain words | why it cannot be assumed |
|---|---|---|
| **R1** | ~~Should the colour/text picker on a node offer the project's design tokens?~~ ✅ **RULED 2026-09-21 — YES, and no ruling was ever required.** Richard: *"The picker is for picking sure, so why wouldn't I be allowed to pick a design token?"* The blocker was this phase misreading P94's R1, which answered *"does the panel REPLACE the picker?"* (→ beside) and not *"may the picker offer tokens?"*. P94 also shipped a token fix **inside** the colour picker (STY-007, the task that closed the phase). | **The lesson, not the ruling:** a row sat blocked because a phase README paraphrased another phase's ruling instead of carrying the QUESTION it answered. An answer without its question drifts into a general prohibition. 🔴 **And the row it blocked was built in one session once unblocked** — the prohibition cost more than the work did |

Everything else in §5 is a defect with a measured count and needs no ruling.

## 7. Rules every task inherits

- 🔴 **The bar is the count, measured on the artefact** (Richard, 2026-09-20). A task closes when a
  **fresh driven session** produces zero of its error, not when the code looks right. A green suite
  is what let 264 errors accumulate; it cannot be the bar here
  ([[verify-the-consequence-not-just-the-mechanism]]).
- 🔴 **Re-measure your own number.** §3 is one session on three surfaces. Do not subtract from 264,
  and do not inherit another task's reading ([[a-relayed-conclusion-decays-faster-than-a-relayed-measurement]]).
- 🔴 **No row leaves this phase as "an observation".** §2 is what that costs. If a task finds
  something out of its scope, it gets a row here with an owner, or it is not recorded at all.
- 🔴 **Count the events, not the log lines.** §3's warning about the doubled channel.
- 🔴 **Editing editor `src/` full-reloads a peer's editor.** One heavy job at a time; announce a
  launch and announce the teardown to everyone you announced the launch to.
- 🔴 **Drive a copy of a real project** — opening one writes three files into it.
- 🔴 **Run `test:main` as well as `test:ci`, every time. They are different gates and neither is a
  superset.** HLT-002 shipped a user-visible string carrying P93's retired word "bench"
  (`thumbnailCapture.ts`), turning the TVW-009 vocabulary ratchet red. `test:ci` does not run that
  gate, HLT-002's verdict recorded `test:ci` at the floor, and the board read green for a day.
  Found and fixed by HLT-003; the *reason* nobody saw it is the reusable part
  ([[two-gates-covering-the-ends-of-a-chain-read-as-coverage]]).
  **So every verdict here says WHICH gates it ran**, and a task about to write a user-visible
  string owes the vocabulary ratchet a thought before it writes it — the gate reads context, not
  text ([[a-vocabulary-gate-must-read-context-not-text]]). HLT-001's verdict was amended this way
  after the fact: `test:main` is green at `62decf7e1` (526/526, 8,418/8,418), which contains it.
- The hex ratchet, icon-url gate, token check, vocabulary ratchet and the P92 scale gate stay green
  at every commit. The `test:ci` floor is the eight by name (3 SUB-006, 3 SUB-011, 2 NDA-017).

## 8. Collisions

- **P93** owns TVW-008's acceptance criteria. HLT-008 does the work; **P93 closes the ACs**. Neither
  phase may mark the board done alone.
- **P94 is closed.** Its STY-005 AC2/AC8 ruled the panel's nesting. HLT-007 touches only what no AC
  named. Do not reopen a closed ruling to make a fix tidier.
- **P92** owns the editor chrome. HLT-005's defect was in CHR-009's "Left" list six times; CHR-009
  is closed, so the row is this phase's — but the *look* of the property editor remains P92's.
- **P85** is an MCP component-authoring loop with no editor-panel task. It is **not** the owner of
  HLT-006/007, despite P93 §11.4 suggesting it.
- **The Digital Bricks Training stream** is actively committing to the template HLT-009 names.
  ⚠️ Check with it before editing; a peer may be doing this exact task
  ([[a-peer-may-be-doing-your-exact-task]]).
- **P73** owns the tutorial; **P77/P76** own the site builder. Nothing here touches them.

## 9. The end condition

This phase closes when:
- §3's six numbers all read **0**, each re-measured on its own driven session and recorded in
  `verdicts/`;
- HLT-010's gate is committed, green, and would fail on any one of the six if reintroduced —
  proven by reintroducing one, not by argument;
- R1 has been ruled and HLT-006 is either built or **recorded as disproved**;
- P93's TVW-008 AC1, AC3 and AC7 are closed *there* by HLT-008's work;
- every task is built or recorded as disproved, with an owner, and **nothing leaves as an
  observation**.

Not when the suite is green. It was green through all 264 of them.
