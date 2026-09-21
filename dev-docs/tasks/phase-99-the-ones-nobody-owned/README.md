# Phase 99 — The ones nobody owned

**Scoped:** 2026-09-20, from Richard driving the editor by hand for 42 minutes and from the log that
drive left behind, read against `cline-dev` HEAD `55dd19523`. **Status: 📋 building — HLT-001 ✅, HLT-002 ✅, HLT-003 ✅, HLT-004 ✅, HLT-005 ✅, HLT-006 ✅ (AC5 ruled WORTHY), HLT-011 ✅, six to go (HLT-007, 008, 009, 012, 013, then HLT-010 last).
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
| [HLT-007](./HLT-007-THE-TWO-THINGS-P94-DID-NOT-RULE-ON.md) | Two halves nobody ruled on. **(a)** `TextStylesSection.tsx:28` reads `getStyles('text')` — the legacy layer — so the section a person looks in first is empty in every real project, while the token is filed under *Other tokens → Typography*. **(b)** 🔴 `getGroupForToken` (`TokensSection.tsx:144-152`) is a **second copy** of the category→group table returning `null` for unmapped categories, **silently dropping them from the panel** — its own docblock records this happening to `gradient` ([[a-second-copy-of-a-palette-drifts-silently]]) | — |

### Track C — the board, moved here from P93

| id | task | depends on |
|---|---|---|
| [HLT-008](./HLT-008-THE-BOARD-SLICE-3.md) | Richard's six board defects, **ruled into this phase 2026-09-20**. ⚠️ **Their acceptance criteria live in P93 `TVW-008` (AC1, AC3, AC7) and do not move.** This task closes them there; P93 does not close until it does. B1 the `Workbench` heading on the board's own `+` popup and the `Workbench board` menu row; B2 the fill-the-stage default height; B3 no gutter + the canvas becomes unpannable; B4 a press meant as a drag navigates; B5 the slab does not travel with its frame; B6 the drag scrolls the stage the opposite way | P93 TVW-008 §11 |

### Track D — the corpus, and the gate that should have caught all of this

| id | task | depends on |
|---|---|---|
| [HLT-009](./HLT-009-THE-INERT-PARAMETERS.md) | `digital-bricks-training` sets `width` and `sizeMode` on three `dbt-lesson.*` node types that declare neither, on 6 nodes — so the sizing a reader copies does nothing ([[an-inert-parameter-in-a-corpus-example-teaches-a-lie]]). ⚠️ **That template is being built RIGHT NOW in numbered sprints by another stream** (`0a0fd7f0d`, sprints 44–45). Message its owner before touching a file; this may already be its next sprint's work | — |
| [HLT-011](./HLT-011-THE-TWO-PROJECTS-WITH-ONE-IDENTITY.md) | ✅ **BUILT 2026-09-21 — clicking the second of two cards sharing one identity opens the SECOND project; control on the identical fixture opens the first, 9/9 arms each.** ✅ **§2 measured TRUE — the second in this phase** — and the origin was already written down: P73 `TUT-001`'s verdict records *making* the collision, cloning the store entry of the project it copied *"so the copy would inherit the backend"*. That backend is `backend_msjck0y2ukxwv`, **"Puppy test 3 backend"**, and both projects own it today — README §1B's two-apps-one-datastore with the ownership check intact and answering honestly about the wrong project. 🔴 **The phase thesis one turn sharper: this defect was not disowned, it was MANUFACTURED by a session's own instrument** and rediscovered four phases later as a duplicate-key warning. Fixed by addressing a row with the thing a row IS — its directory — across **eight** `.find(p => p.id === …)` reads and **ten** callbacks (delete was the sharpest: `removeProject` splices the first match). AC3 ships detection, never repair; AC4 leaves the real collision explicitly, because re-minting an id moves a datastore. ⚠️ The fix's own trade, caught by the drive's reach arm: the warning toast covers a card for its 6-second life. [verdict](./verdicts/HLT-011/2026-09-21/VERDICT.md) | — |
| [HLT-012](./HLT-012-THE-NUMERIC-FIELDS-CANNOT-OFFER-A-TOKEN.md) | ✅ **BUILT 2026-09-21 — 13 font sizes offered on a Font Size row and 31 spacings on the padding box, on a driven session; control 0 and 0 on the identical drive against the HEAD build, same 25-row panel, same node.** 🔴 §2 was right about every number it counted and wrong about what it counted: **there are FOUR fields, not three**, and the fourth is not numeric — `fontFamily` is a `font` port, a `PickerTypeView`, carrying `var(--font-mono)` today while `TextConfig` stamps `var(--font-sans)` on every new Text, and §4's *"In"* line excluded it ([[a-tasks-out-of-scope-line-can-contain-the-defect]], the second scope line in this phase to contain the defect). 🔴 And the offer cannot be keyed off *"is it a number field"*: **166** numeric ports in the catalog, **86** that reach a field which can hold a token, **64** that should be offered one — `maxRetries` and `timeout` are number ports, and a spacing ramp on a retry count is HLT-006's 91-row problem one field along. 🔴 **Order is the decision**: written generic-first the rule table is silently wrong on seven ports (`/Spacing$/` takes `letterSpacing`, `/(width|height)$/` takes every `borderWidth`), offering the WRONG scale rather than none — mutant-run, 7 of 9 red. ✅ §6's scrub landmine measured TRUE and shipped closed (a one-pixel drag replaced a token with the port's default, silently); §6's ramp question is answered by measurement — the longest list is 31. ⚠️ Four more instrument faults, one of them in the phase's shared hit-test helper: `at.contains(el)` let a button 568px below the fold report `hit: true`, so the drive pressed the panel background and read a confident **0 tokens offered** on a working build. ⚠️ And a top-level import switched OFF two sibling suites — `tests-unit/rel-014` reported `Tests: 0 total`, 86 specs grading nothing. 📋 AC5 (Richard's WORTHY on four frames) is the one criterion still open. [verdict](./verdicts/HLT-012/2026-09-21/VERDICT.md) | HLT-006 |
| [HLT-013](./HLT-013-THE-CONTENT-ORIGIN-IS-UNPUBLISHED.md) | 🔴 **Opened by HLT-004, 2026-09-21 — measured, not speculative.** Not a missing feed file: **`https://the-low-code-foundation.github.io/` answers 404 for the whole Pages site**, so all **six** payloads `getContentEndpoint()` serves — library index, lessons, project templates, tutorials, what's-new — are dead. ⚠️ The cause has been written down **correctly, inside the file that has the defect, since 2026-08-13** (ALPHA-006 B5: a repo rename Pages does not redirect, a repoint nobody made, *"the Library panel has been erroring ever since"*) — §2 of this board, again. ⚠️ A dead site 404s at every path, so the `/static` suffix **cannot be graded from a 404**: measure what is published first | — |
| [HLT-010](./HLT-010-THE-GATE-THAT-WOULD-HAVE-CAUGHT-IT.md) | 🔴 **The structural fix, and the reason this phase is not just ten bug fixes.** Nothing in CI reads the renderer log, so 264 errors survived a green suite. Build the gate: a driven session that fails on renderer errors above a named, per-class budget, with every current class at **0**. ⚠️ Written **last** — a budget set while the counts are non-zero ships red and gets switched off. Also: fix P94's stale README header. ⚠️ **And it must run `test:main` as well as `test:ci`** — HLT-003 found a gate that only `test:main` runs sitting red for a day behind a green `test:ci`, so a renderer-error budget wired into one of them inherits exactly that blind spot | HLT-001…009, HLT-011, HLT-012, HLT-013 |

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
