# FED-007 — The record reads like a record

## 1. The person sentence

**A run went wrong. You open it, and the thing that went wrong is the thing you see — not line 63
of six hundred. You did not have to know what JSON is.**

## 2. Where this came from

FED-006 AC5 asked Richard to rule the execution record legible. He was shown three screenshots
(`shots/`) and **refused**, 2026-09-20, naming the bar:

> *"Yeah I want to insist here on having readable JSON. The beauty of n8n is exactly its offer of
> breaking down the JSON visually and letting the user isolate the part that errored really
> easily, nice colourful styled JSON explorer that's easy for a non coder to navigate, highlights
> the important bits"*

🔴 **This is not polish.** The phase's own sentence is *"an alternative to tools like Supabase and
n8n"*, and he has named the exact surface people compare on. **FED-006 AC5 closes when this
does**, and not before.

Two more rulings the same day, both recorded in FED-006 §6.4:

- **A run with a failed step must not read `success`.**
- **The cost line rides the explorer as a highlighted part**, with a list column as the fallback.
  ✅ His stated condition — *"you'd have to also give access to the JSON from the successful runs
  too"* — is **already met**: `Detail` is on every row and opens the same record for a successful
  run. Measured at s7 on three runs, all `success`.

## 3. What is there, measured at s7

All of this was found by looking at the page, and none of it by running the suite.

### 3.1 The view had never shown a row (fixed at s7)

`GET /executions` answers a **bare array**; the view read only for an envelope. "Nothing here
yet." at HTTP 200, since BAK-005's first commit. Fixed, and gated — phase register R20.

### 3.2 🔴 The view's status vocabulary disagrees with the store's, three ways

`ExecutionStatus` is **`'running' | 'success' | 'error'`**
(`noodl-viewer-cloud/src/execution-history/types.ts:13`). The Executions view
(`src/admin/ui/index.html`):

| the view does | the store says | consequence |
|---|---|---|
| offers `failed` in the status filter | no such value | filters to nothing, always |
| offers `cancelled` in the status filter | no such value | filters to nothing, always |
| does **not** offer `error` | the only failure value | **the one useful filter is missing** |
| `x.status === 'failed' ? 'bad' : 'warn'` | failures are `error` | **a failed run renders AMBER, never red** |

The filter is passed straight through to the store (`byob-admin.listExecutions`), so these are not
translated anywhere in between. **Invisible until s7 because the table was empty.**

🔴 **And the CAUSE is visible by comparison.** The editor panel's filter
(`ExecutionFilters.tsx:13`) offers exactly `success` / `error` / `running` and is declared
`{ value: ExecutionStatus | ''; label: string }[]` — **so the compiler checks it against the
union.** The dashboard's is a bare string array inside a 94 KB HTML template that **nothing
type-checks**, because the whole document is a `text`-loader string. Same product, same union,
one surface held to it and one not. **Every hand-written vocabulary in `src/admin/ui/index.html`
is unchecked the same way** — which is R21's sweep, and this is the argument for it.

### 3.3 🔴 The status is the HTTP reply, not the work

`WorkflowRunner.ts:779`, one line:

```ts
const success = response.statusCode >= 200 && response.statusCode < 300;
```

That is what ruling 2 is about. FED-006's `pollSources` answers 200 on **both** its Response
nodes, so a poll where a feed was down records `success` — measured, three runs, one of them with
a 403'd source, all green. It is also FED-006 §5.3's first mutant: **removing `upsertOn` left the
gate green** for the same reason.

### 3.4 What the record already carries, and it is a lot

Measured on a real failing run (614 lines, 34 steps):

- `modelCost.line` — `4 model calls · 480 in / 44 out tokens · 25 ms · claude-opus-5`
- a failing fetch's `detail: { url: ".../broken.xml?token=[REDACTED]", status: 403 }`
- `errorMessage: "http/error-status: The server answered 403 Forbidden"`
- 🔴 **a failing `Run Tasks` step's `detail: { template, itemIndex, itemId, item: {…} }`** — so
  **per-item identity already exists on the failing path**. Phase register R17 recorded the data
  as merely reachable; it is in fact already in the record.

**Nothing in this task needs new data. It is entirely about what is done with it.**

### 3.5 🔴 THE FINDING: most of this is already built, on the OTHER surface

**Two surfaces render the same execution records, and the deployed one is the worse of the two.**

`packages/noodl-editor/src/editor/src/views/panels/ExecutionHistoryPanel/` is **1,489 lines of
live React** (registered in `router.setup.ts:421`), and its `useExecutionHistory` reads *"the
editor-local store plus every running `nodegx-backend` child process"* — **the same rows
`/_admin` lists**. Built by WFA-002. What it already does:

| the editor panel | the `/_admin` dashboard |
|---|---|
| each step a ROW: name, type, node id, duration, status chip + dot | one JSON dump for the whole record |
| each step expands to Error / Input / Output, scoped to that step | scroll 614 lines |
| 🔴 **the error routing stated IN WORDS** — *"Error routed to X"*, *"Error not routed — the workflow halted here"*, *"Received the error from Y"*, *"Not reached — no incoming edge was taken"* | nothing |
| `skipped` steps explained rather than shown as a status | nothing |

🔴 **That third row is Richard's "isolate the part that errored really easily", already written,
already shipping — in the editor only.** A person self-hosting a NodeGX backend, which is the
audience the phase's own sentence names, gets the JSON dump.

**What neither surface has** is the explorer for the leaf data: the editor renders `inputData` /
`outputData` as `<pre>{safeStringify(...)}</pre>`, which is still a JSON blob, merely a small one.

### 3.6 What this does to the design

**Do not invent an explorer.** The order is:

1. **Bring `/_admin` up to what the editor already does** — steps as rows, per-step expansion, the
   error routing in words. The design is proven and the vocabulary already exists.
2. **Then add the leaf-data explorer**, which is the genuinely new part, and which **both**
   surfaces need.

⚠️ **Two implementations, and they will drift** — the editor's is React with SCSS modules, the
dashboard's must be vanilla under §4's constraints, so the CODE cannot be shared. **What must not
diverge is the vocabulary**: the same four routing sentences, the same status words, the same
ordering. Write them down once and have a spec read both. This is the trap in
[[a-second-copy-of-a-palette-drifts-silently]] and in the phase's own R20 — a view and its source
of truth disagreeing with nobody looking.

## 4. 🔴 Four constraints, three of them gated, that shape every design here

This dashboard is not an ordinary web app and an explorer written as one will not ship.

1. 🔴 **`default-src 'none'`, no external origins, one self-contained document.** No library, no
   CDN, no asset route. Gated: *"references no external origin"*. **Do not reach for a JSON-viewer
   package** — there is nowhere to load it from.
2. 🔴 **No `innerHTML`, no `insertAdjacentHTML`.** Gated by regex over the whole document:
   `expect(html).not.toMatch(/\.innerHTML\s*=/)`. **Syntax colouring must be built from elements
   and `textContent`**, never from a marked-up string. The reason is in the spec: the page prints
   record contents, and a hostile value in a row would execute.
3. 🔴 **Red is for danger only** (the phase-23 palette law), gated over the stylesheet: any rule
   consuming `var(--danger…)` must have `danger` or `.bad` in its selector. A "nice colourful"
   explorer **cannot** spend red on a string literal or a number.
4. **Every byte ships in the bundle** — the CSS and HTML are inlined by esbuild's text loader.
   FED-001's precedent for a budget on this kind of addition is a measured delta against a stated
   ceiling.

## 5. Design

### 5.1 The status ruling (AC1, AC2) — do this first, it is independent and small

**A run whose record contains an errored step does not read `success`.** The open question the
build must settle, and settle by measuring rather than by choosing:

- Does this become a **third value** (`partial`) or does an errored step simply make the run
  `error`? A third value costs `ExecutionStatus`, the store, the filter, the chip and every
  consumer; reusing `error` costs none of those. 🔴 **Count the consumers before choosing** — the
  type is exported from `noodl-viewer-cloud` and the editor's own execution-history manager reads
  it (`noodl-editor/src/main/src/execution-history/`).
- **Existing rows are not rewritten.** Whatever is chosen is about runs recorded after it.

AC2 is the vocabulary repair in §3.2 and is a few lines, but it is **not** cosmetic: without it a
correctly-recorded failure still renders amber and still cannot be filtered for.

### 5.1a ✅ BUILT (s8) — and the measurement that settled the open question

**The question §5.1 asked to settle by measuring: a third value (`partial`), or reuse `error`?**
**Counted, and it is not close.** `partial` needs a change in each of these; `error` needs none of
them:

| | site |
|---|---|
| 1 | `ExecutionStatus` union, `noodl-viewer-cloud/src/execution-history/types.ts:13` |
| 2 | `ExecutionQuery.status`, same file |
| 3 | `store.ts:616` — the stats SQL counts `success`/`error`/`running` and nothing else, so a fourth value falls out of `successRate` silently |
| 4 | `noodl-editor/src/main/src/execution-history/InMemorySqliteFallback.ts:208–210` — the editor's own copy of those three counts |
| 5 | `ExecutionFilters.tsx:13` — the editor's filter |
| 6 | the editor's chip and dot |
| 7 | `fixRequest.ts:53` — `execution.status !== 'error'` returns early, so a `partial` run would LOSE the "fix this" affordance |
| 8 | `dispatcher.ts:397` — `runResult.status === 'success'` is the trigger's own ok flag |
| 9 | `/_admin`'s filter and chip |
| 10 | `ExecutionStats.successCount` / `errorCount` and every reader of them |

**So: an errored step makes the run `error`.** Three consumers of the union exist outside the
store and all three already handle `error` correctly.

**Where it is built:** `ExecutionLogger.completeExecution` — NOT `WorkflowRunner`. Eight call
sites complete an execution (the cloud-function runner, the workflow engine, the dispatcher
twice, the backup manager twice, the backup subsystem, the file subsystem) and all eight write
through that object, which is the same argument `BoundedExecutionLogger` makes for bounding
there. `completeExecution(success)` is now read as *what the caller observed*: a caller reporting
failure is always believed, and a caller reporting success is overruled by a failed step.

The row borrows the step's message, because the step's is the only one anybody wrote:
`The run answered, but a step failed: <node> — <reason>`. Both halves on purpose — the run DID
answer, and a bare "a step failed" reads as a run that fell over.

**AC2** is the vocabulary repair, and the page now declares `EXECUTION_STATUSES` and
`executionStatusKind()` as named things so a spec can lift them out of the shipped document and
compare them to the union in `types.ts`. That comparison is the closest thing this surface has to
a compiler, which is §3.2's whole argument.

#### What it measured

| | |
|---|---|
| `execution-logger.test.ts` | **35/35** (8 new). Mutant — drop `&& !failedStep` — **1 red**, and its green control stayed green |
| `admin-dashboard.test.ts` | **29/29** (3 new). Mutant — restore `['', 'success', 'failed', 'running', 'cancelled']` and `=== 'failed'` — **3 red** |
| `feed-drive.test.ts` | **32/32** (1 new). 🔴 **AC1 proved on the real record:** the poll with the 403'd source now reads `error`, and the two healthy polls in the same file still read `success` — the control is in the same run |
| `noodl-viewer-cloud` whole | 15 suites / **242 tests**, exit 0 |
| the 19 backend suites that assert on run status | **353 tests, 2 red**, and BOTH reds were the ruling doing its job — see below |
| `typecheck:cloud` · `typecheck:backend-tests` · `nodegx-backend typecheck` | all **exit 0** |

#### 🔴 The two reds, which are the finding

Both were specs asserting `success` on runs that contain a failed step. Neither was a regression.

1. **`def004-execution-steps.test.ts`** had a spec whose TITLE was the old behaviour: *"⚠️ the
   execution is still `success`, and the failed STEP is the only thing that says otherwise"*.
   It is the smallest possible example of the shape Richard was looking at — one failed `Secret`,
   a failure edge, a 200 — so the assertion is inverted rather than deleted.
2. 🔴 **`sbr010-messages-drive.test.ts` — the shipped contact form fails TWO steps on every
   submission, and nothing in the repository could see it.** See register R23 and R24. This is
   the ruling paying for itself on day one, and it is also the first evidence that the ruling has
   a COST: one of those two failures is by design.

### 5.2 The explorer (AC3, AC4, AC5)

What Richard asked for, in the order he said it:

- **breaking down the JSON visually** — a collapsible tree, not a textarea. Default-collapsed at
  the noisy levels (`triggerData` is the first screenful today and is almost never what you want).
- **isolate the part that errored really easily** — the errored steps are reachable without
  scrolling and without knowing where to look. The obvious shape is a summary band at the top
  naming the failures, each one a link into the tree.
- **nice colourful styled** — within constraint 3. Type-coloured leaves (string / number /
  boolean / null) is the usual vocabulary and none of it needs red.
- **easy for a non coder to navigate** — the test is §1's sentence and FED-006 §3.4's: *a person
  who did not build this can say which source produced which items.*
- **highlights the important bits** — the cost line (ruling 3), the failures, the trigger source,
  the duration.

⚠️ **The raw JSON must remain reachable.** It is what people paste to each other, and it is the
only thing that is certainly complete. An explorer that replaces it trades one refusal for another.

### 5.2a ✅ BUILT (s8) — the explorer, and what the real record did to its design

**Four parts, in the order Richard said them.** The record opened as `JSON.stringify(data, null, 2)`
in a readonly textarea; it now opens as:

1. **The band** — status chip, what ran, what triggered it, when, how long, how many steps, and
   the FED-003 cost line as the sentence it already was. AC5.
2. **The failures, first, in red** — each naming the step AND its subject: the URL that was
   refused and its 403, the item index a template choked on. No scrolling, nothing expanded. AC4.
3. **The steps as rows** — number, name, type, duration, status chip — each opening onto its own
   Error / Input / Output through the tree. AC3.
4. **The raw JSON, one click away**, because it is what people paste to each other and the only
   thing that is certainly complete.

**The tree itself** is elements and `textContent` only — no library (there is nowhere to load one
from), no `innerHTML` (gated), and its colours are a green, a violet and a cyan on purpose: red
stays danger-only, so the one red thing on the screen is a step that failed.

#### 🔴 Three things the REAL record changed about the design

None of these came from thinking about it; all three came from running it against FED-006's own
failing poll.

1. 🔴 **One down feed makes FIVE failed steps, not one.** The fetch, the `Parse Feed` handed the
   refusal body, and the enclosing `Run Tasks` reporting *"Task 4 of 4 failed"* — **twice, byte
   for byte**. AC4's first draft asserted one failure, on the strength of the drive's own *"exactly
   one fetch failed"*, and was simply wrong about the record. The band now **folds identical
   reports** (same step, same message, same detail) and shows the rest, because hiding a step
   that really did fail is how a record stops being a record.
2. 🔴 **The cascade's SIZE is not stable run to run.** A version pinning five raw / four folded
   went red once and green on the two runs after it with identical code. The spec now gates what
   is stable and **prints the shape on every run**, so the variation is visible rather than
   inferred. Register R25.
3. **A step's data wants TWO levels open, not one.** A step output is almost always
   `{ outcome, detail }`, and `detail` is the entire reason anyone opened the step; one level
   showed `detail: {2 fields}` and made them click again.

#### What it measured

| | |
|---|---|
| `admin-dashboard.test.ts` | **32/32** (6 new across AC2/AC3/AC6), the three standing gates still green: no external origin, no `innerHTML`, red for danger only |
| `feed-drive.test.ts` | **35/35** — AC4 and AC5 graded by lifting the page's own `recordSummary` out of the shipped document and running it over a record produced by a real poll |
| bundle | **+6.8 KB gzipped** (23.9 → 30.7), against a stated ceiling of 48 KB gzipped on the whole served document. AC6, and the ceiling is a smoke alarm rather than a ratchet — see the spec's note on R8 |
| `typecheck:cloud` · `typecheck:backend-tests` · backend `typecheck` · `eslint` | all **exit 0** |

#### The shots, and the script that takes them

`shots/fed007-*.png`, against a REAL backend: `bin/nodegx-backend.js serve` on the data dir
FED-006's drive left behind, serving the records that drive produced.

🔴 **`scripts/devtools/shoot-admin-dashboard.js` is kept this time.** s7 wrote a shot script,
threw it away, and spent half a handoff explaining how to write it again. With
`FED007_KEEP_DATA=1` on the drive (which prints its data dir), the whole recipe is three commands
and they are in that file's header.

⚠️ **Two traps it cost, both now in the script:** `npm run build` is NOT optional — `bin/` runs
`dist/`, the page is inlined by esbuild's text loader, so an unbuilt change shows the OLD page
while every test passes on the new one. And **a hash is not a navigation** — `Page.navigate` to
`…/_admin#/executions` from `…/_admin` changes `location.hash` and does not reload, so the boot
that reads the seeded token never runs and the page sits on its login screen looking exactly like
a wrong credential.

### 5.3 Deliberately NOT in this task

- **Per-item execution history** (register R17). §3.4 shows the data exists on the failing path,
  and the explorer is the screen it would eventually appear on — which is exactly why it should be
  designed once, on top of a finished explorer, rather than bolted to a half-built one.
- **`MAX_STEPS_PER_RUN`** (register R18). A record that silently stops at 1000 steps is a real
  problem and gets worse the more the explorer shows; it is not this task.
- **The other `/_admin` views** (register R21). Every one of them may read a key its route does
  not answer, exactly as the executions view did. That is a sweep, and it is its own row.

## 6. Acceptance criteria

1. ✅ **AC1 (s8)** — A run with an errored step does not read `success`, and the drive proves it:
   the `pollSources` poll with a 403'd source is not green. A mutant that reverts the change reds.
   §5.1a.
2. ✅ **AC2 (s8)** — The status filter offers exactly the values the store can hold, and a failed
   run renders in the danger affordance rather than the warning one. Both read out of the shipped
   document and compared against the union, so the two cannot drift again in silence. §5.1a.
3. ✅ **AC3 (s8, with §9's narrowing)** — `/_admin` renders a record as STEPS, each opening onto
   its own error, input and output, with the raw JSON still one click away. 🔴 **The error-routing
   sentences are NOT built, and §9 is why:** they are derived from `inputData.previous.error`,
   which only `WorkflowEngine` writes, so on a cloud-function record — which is what FED-006
   produces and what this task exists for — three of the four would be underivable and the fourth
   would be false. What IS held together is the status vocabulary, run and step, read out of both
   surfaces by a spec. §5.2a.
4. ✅ **AC4 (s8)** — On the FED-006 failing run, the failed fetch and the URL it names are
   reachable **without scrolling and without expanding anything**. Graded in `feed-drive.test.ts`
   by lifting the page's own `recordSummary` and feeding it the real record. §5.2a.
5. ✅ **AC5 (s8)** — The cost line is visible on an opened record without reading raw JSON — it
   is the band's second row, and the spec checks it is the record's own line rather than one the
   page composed.
6. ✅ **AC6 (s8)** — the three standing gates are green, and the bundle delta is **+6.8 KB
   gzipped** against a stated ceiling of 48 KB on the served document.
7. 📋 **AC7 — WITH RICHARD.** Four shots in `shots/fed007-*.png`, taken against a real backend
   serving the drive's own records. Put to him at the end of s8, together with §8's ruling.

## 7. How this gets graded, because the last gate had a hole

🔴 **`admin-dashboard.test.ts` grades the DOCUMENT and the AUTH TIERS and never ran a view against
a real payload** — which is why §3.1 and §3.2 survived from BAK-005's first commit. s7 added one
spec that seeds a real execution and asserts the view finds it, **lifting the view's own
extraction out of the shipped HTML rather than restating it**. That is the pattern to extend here:
a spec that restates what the explorer should do will agree with itself forever.

⚠️ **A screenshot is not a gate, and this task will be tempted to rely on one.** The ACs above are
written to be machine-checkable against the real record wherever that is possible; AC7 is the
ruling, not the evidence.

## 8. 🔴 A ruling this task now needs, and the measurement it came from

**Put to Richard at s8, from §5.1a's SBR-010 red.**

The ruling as taken is *"a run with a failed step must not read `success`"*, and it is built that
way. On its first day it found the shipped contact form failing **two** steps on every
submission — and only ONE of them is a fault:

| the failed step | what it is |
|---|---|
| `noodl.cloud.secret#fallback` — *`CONTACT_RECIPIENT_EMAIL` is not provisioned* | 🔴 **BY DESIGN.** The template PROBES for an optional secret: `fallback.completed → pick.run`, and `pick` prefers the SiteSettings row and takes the secret only if there is one. The graph is correct and the run did exactly what it should |
| `noodl.cloud.sendemail#mail` — *"To" is required* | 🔴 **A REAL DEFECT.** The visitor's confirmation email has never been sent, since SB-004 — register R24 |

So the ruling as written **paints a correct graph red for treating an absent optional value as
ordinary control flow** — a shape `Secret`'s own `failure`/`completed` pair exists to support.

**🔴 And the obvious alternative does NOT work — measured, not assumed.** The tempting narrower
rule is *"an UNROUTED failure makes the run `error`; a routed one shows on the step"*, on the
strength of the editor panel already saying *"Error routed to X"*. It fails twice here:

1. **The probe does not wire `failure` at all.** `RECIPIENT_WIRES` runs `fallback.completed →
   pick.run` — `completed` fires whether or not the secret exists, which is exactly why the
   template is written that way. So a routed/unrouted test would call this failure UNROUTED and
   paint the run red anyway.
2. 🔴 **"Routed" is a WORKFLOW-ENGINE concept and does not exist for graph runs.**
   `stepAnnotations.ts` derives all four of its sentences from `inputData.previous.error`, and
   `previous` is written **only** by `WorkflowEngine.ts` (WF-001 step definitions). A cloud
   function's steps come from `WorkflowRunner.createRunContext`'s `beginStep`/`endStep` and carry
   no such field, so every failed step in every graph run would annotate as
   *"Error not routed — the workflow halted here"* — which for the contact form is a flat lie:
   the graph carried on and answered.

So the choices that actually exist are: **(a)** keep it as ruled — a probe that fails reads
`error`, and the record says truthfully which step and why; **(b)** let a node declare its failure
expected (a port or parameter on `Secret`, say), which is a product change with a migration;
**(c)** record which output a failed node actually pulsed, which is new data from the runtime and
would then make (b) derivable rather than declared.

⚠️ **Do not change the built behaviour without the ruling.** It is his call, the question is a
plain one, and the evidence is one screen: the contact form, two red steps, one of them correct.


## 9. 🔴 What §8's second point does to AC3 — read before building the explorer

AC3 says *"the error routing in the same words the editor panel uses"*. **Those words are
computable for WORKFLOW-ENGINE runs only.** §3.5's comparison table read the editor panel and did
not check what its sentences are derived from; they come from `inputData.previous.error`, which
`WorkflowEngine` writes and the cloud-function runner does not.

**FED-006's own records are cloud-function runs.** So on the very record this task exists to make
legible, three of the four sentences are underivable and the fourth would be wrong.

**What AC3 can honestly deliver, and it is still most of the value:**

- Steps as ROWS with name / type / node id / duration / status — true of both kinds, and the
  single biggest change from a 614-line textarea.
- The failing step surfaced without scrolling, with its `detail` (`url`, `status`, `itemIndex`)
  and its `errorMessage` — already in the record, §3.4.
- The routing sentences **where the data exists** — an engine run — and NOTHING where it does
  not, rather than a sentence that is false. A spec should assert the absence on a graph run as
  firmly as the presence on an engine run.

⚠️ The vocabulary-agreement spec AC3 asks for is still right, and is now narrower: it compares
the ENGINE-run sentences between the two surfaces.
