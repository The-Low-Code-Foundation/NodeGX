# Phase 99 — The ones nobody owned

**Scoped:** 2026-09-20, from Richard driving the editor by hand for 42 minutes and from the log that
drive left behind, read against `cline-dev` HEAD `55dd19523`. **Status: 📋 building — HLT-001 ✅, HLT-002 ✅, HLT-003 ✅, seven to go (plus HLT-011, opened by HLT-003).
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
| 5 | Failed network requests in a normal launch (404 `feed.json`, 401 `profile`, 401 `path`) | **3** | 0, or each one *explained* by a row that says why it is correct |
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
- **P94 ruled the colour picker OUT of scope on purpose** (its R1: *"BESIDE. The picker stays for
  *picking* on a selected node; the panel is for *managing*"*). HLT-006 therefore **needs a ruling
  before it is built**, not a fix — see §6.
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
| [HLT-004](./HLT-004-THE-THREE-FAILED-REQUESTS.md) | 3 requests fail on every launch: `feed.json` **404**, `profile` **401**, `path` **401**. ⚠️ Some may be correct for a signed-out or offline editor — the deliverable is that each one is **either fixed or explained by a committed note**, never left ambiguous | — |

### Track B — the property editor and the styles seam

| id | task | depends on |
|---|---|---|
| [HLT-005](./HLT-005-THE-COMMENT-THAT-OVERFLOWS.md) | The node comment input grows horizontally and overflows right. **One line**: `NodeComment.tsx:145` `flex: '0 0 auto'` inside a **row** flex container (`ScrollArea.module.scss:39`), so it sizes to the max-content width of a `pre-wrap` mirror with no `max-width`. Vertical growth **is** capped at 184px; horizontal has no equivalent. The control is the Properties tab beside it, which uses `flex: 1`. ⚠️ Filed six times in P92 CHR-009's "Left" lists, never once as an acceptance criterion — then CHR-009 closed | — |
| [HLT-006](./HLT-006-THE-PICKER-CANNOT-SEE-A-TOKEN.md) | 🔴 **NEEDS A RULING FIRST (§6 R1).** No property-editor picker enumerates design tokens at all: `colorstylepicker.jsx:81` and `TextStylePicker.jsx:29` read the legacy `project.metadata.styles` layer via `StylesModel.getStyles()`, which is `null` in real projects, plus a scan restricted to ports of `type === 'color'`. Named as FIX-015 gap I in **closed** P66, green-lit into its own phase, and that phase (P94) ruled the picker out of scope and closed | R1 |
| [HLT-007](./HLT-007-THE-TWO-THINGS-P94-DID-NOT-RULE-ON.md) | Two halves nobody ruled on. **(a)** `TextStylesSection.tsx:28` reads `getStyles('text')` — the legacy layer — so the section a person looks in first is empty in every real project, while the token is filed under *Other tokens → Typography*. **(b)** 🔴 `getGroupForToken` (`TokensSection.tsx:144-152`) is a **second copy** of the category→group table returning `null` for unmapped categories, **silently dropping them from the panel** — its own docblock records this happening to `gradient` ([[a-second-copy-of-a-palette-drifts-silently]]) | — |

### Track C — the board, moved here from P93

| id | task | depends on |
|---|---|---|
| [HLT-008](./HLT-008-THE-BOARD-SLICE-3.md) | Richard's six board defects, **ruled into this phase 2026-09-20**. ⚠️ **Their acceptance criteria live in P93 `TVW-008` (AC1, AC3, AC7) and do not move.** This task closes them there; P93 does not close until it does. B1 the `Workbench` heading on the board's own `+` popup and the `Workbench board` menu row; B2 the fill-the-stage default height; B3 no gutter + the canvas becomes unpannable; B4 a press meant as a drag navigates; B5 the slab does not travel with its frame; B6 the drag scrolls the stage the opposite way | P93 TVW-008 §11 |

### Track D — the corpus, and the gate that should have caught all of this

| id | task | depends on |
|---|---|---|
| [HLT-009](./HLT-009-THE-INERT-PARAMETERS.md) | `digital-bricks-training` sets `width` and `sizeMode` on three `dbt-lesson.*` node types that declare neither, on 6 nodes — so the sizing a reader copies does nothing ([[an-inert-parameter-in-a-corpus-example-teaches-a-lie]]). ⚠️ **That template is being built RIGHT NOW in numbered sprints by another stream** (`0a0fd7f0d`, sprints 44–45). Message its owner before touching a file; this may already be its next sprint's work | — |
| [HLT-011](./HLT-011-THE-TWO-PROJECTS-WITH-ONE-IDENTITY.md) | 🔴 **Opened by HLT-003, 2026-09-21 — measured, not speculative.** Two different projects (`tut001-drive`, `Puppy test 3`) carry one `id` in `recently_opened_project.json`. HLT-003 stopped the React warning by keying the grid on the **directory**, the row's real identity — it did **not** touch the id, because `projectmodel.ts` documents `project.id` as the ownership half of `findReusableBackend` and re-minting one silently changes which project owns a backend. Still broken: `getProjectEntryWithId` returns the **first** match, so a click on either colliding card opens **the other project**, and per-project local settings and git auth are keyed on the same id | — |
| [HLT-010](./HLT-010-THE-GATE-THAT-WOULD-HAVE-CAUGHT-IT.md) | 🔴 **The structural fix, and the reason this phase is not just ten bug fixes.** Nothing in CI reads the renderer log, so 264 errors survived a green suite. Build the gate: a driven session that fails on renderer errors above a named, per-class budget, with every current class at **0**. ⚠️ Written **last** — a budget set while the counts are non-zero ships red and gets switched off. Also: fix P94's stale README header. ⚠️ **And it must run `test:main` as well as `test:ci`** — HLT-003 found a gate that only `test:main` runs sitting red for a day behind a green `test:ci`, so a renderer-error budget wired into one of them inherits exactly that blind spot | HLT-001…009, HLT-011 |

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
| **R1** | **Should the colour/text picker on a node offer the project's design tokens?** Today it offers only the old style system, which is empty in every real project — so the picker is effectively blank while the Styles panel has 88 tokens. P94 deliberately decided the picker is for *picking* and the panel is for *managing*, and closed on that. Reversing it is a design change, not a bug fix | Building it without asking overturns a ruling Richard already gave, on a phase he already closed on his own look |

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
