# BMG-008 — Triggers: authored here, with a schedule builder and a payload as rows

**Opened 2026-09-24** (README §2 row 3). **Depends on BMG-001.** Builds `ScheduleBuilder` for the kit.
**Status: ✅ built and driven (s8, 2026-09-25) — §6.**

## 1. The person sentence

> **Someone says "every weekday at 9, run the send-digest function" by picking it, sees the
> next five times it will run, and turns it on. For a webhook they get the URL and the secret
> to paste into Stripe. For "when a Pet is created" they tick *created* on *Pets*. Nothing asks
> for a cron string or JSON.**

## 2. What is wrong, measured

- **The page is a list** (`index.html:2063-2142`): Name · Type · Target · Enabled · Overlap ·
  Last fired · Last result; *Enable/Disable* and *Fire now*. No create, edit, delete, rotate.
  The cron string is not shown. The subtitle says authoring is the editor's job (`:2064`).
- **The routes exist** (`admin-triggers.ts:7-14`): `POST /admin/triggers`, `PUT …/:id`,
  `DELETE …/:id`, `POST …/:id/secret` (rotate), `POST …/:id/fire`.
- **The editor's form** (`TriggerFormFields.tsx`) is the only authoring UI: type select
  (*Schedule (cron)* / *Webhook* / *DB change*), target kind + name (a select with *Type a
  name…*), **cron as raw text** (`:177-182`), missed fires, **payload (JSON, optional)**
  (`:198-204`), slug, secret scheme, collection, and an *on* checkbox per action. BMG-012
  deletes it; this task is its replacement, better.
- **The model** (`triggers/registry.ts:80-232`): `schedule {cron, missedFirePolicy, overlapPolicy?,
  payload?}`, `webhook {slug, scheme: hmac-sha256|token, maxBodyBytes}`, `dbChange {collection,
  actions[]}`, `target {kind: function|workflow, name}`, `responseMode`, `responseTimeoutMs`.
- **Cron grammar** (`triggers/cron.ts:1-60`): five fields, `*` `n` `a-b` `/step` lists, month and
  day names, `@hourly`-style presets, local time. The scheduler computes `nextFireAt`; **no route
  previews an unsaved string**.
- `cronGloss` (words for a cron) lives in the editor (`models/triggers/TriggerBackendClient.ts`);
  it must move to the backend package so page and server share it.

## 3. What to build

### 3.1 `ScheduleBuilder` (composer kit)
Mode radios, each with its controls, all emitting one cron string:
- **Every N minutes** (N select: 1 5 10 15 30) → `*/N * * * *`
- **Every hour at** minute → `m * * * *`
- **Every day at** time → `m h * * *`
- **Every week on** day chips (Mon…Sun) **at** time → `m h * * 1,3,5`
- **Every month on** day-of-month **at** time → `m h d * *`
- **Custom** → the cron field with the grammar hint and live validation.
Under all of them: **the sentence** (*"Every Monday, Wednesday and Friday at 09:00"*, from the
shared gloss) and **Next runs** — the next 5 local times, from a new
`POST /admin/triggers/preview {cron}` that uses the scheduler's own `next()` (one source of truth,
no client cron parser). A cron that the modes cannot express opens in *Custom* with its sentence.
Timezone stated once (*server local time, Europe/Paris*).

### 3.2 The trigger drawer (`#/triggers/:id`, `#/triggers/new`)
1. **What runs** — *a function* / *a workflow* → `Picker` (functions from
   `GET /admin/permissions/functions`, workflows from `GET /admin/workflow-defs`); *Type a name…*
   stays for a function not yet deployed, with the drift chip the route reports.
2. **When** — three tiles: **On a schedule** (→ `ScheduleBuilder`; *if a run is missed while the
   backend is off:* skip / run once on start; *if the last run is still going:* skip / queue one
   / run anyway — the words for `missedFirePolicy` and `overlapPolicy`), **When called from
   outside** (webhook: slug with the **full URL shown and copyable**, secret scheme as two
   radios *Signature (GitHub, Stripe)* / *Shared token*, max body size, an example `curl`; the
   secret card on create and on **Rotate**), **When data changes** (`Picker` of collections,
   ☐ created ☐ changed ☐ deleted).
3. **With** — `KeyValueEditor` for the schedule payload (*what each run receives*).
4. **Answer** (workflow targets only) — *the run id* / *the workflow's output, wait up to N s*.
5. Footer: *Enabled* switch, **Save**, **Run now**, danger zone *Delete*.

### 3.3 The list
Name · When (the sentence, or *webhook · /slug*, or *Pets: created, deleted*) · Runs (target) ·
Next run · Last run (chip + relative time; skip shown as today's warn chip with its reason) ·
Enabled switch. Row click opens the drawer. Empty state: *"Nothing runs on its own yet. Schedule a
function →"*.

### 3.4 Shared code
`cronGloss` moves to `packages/nodegx-backend/src/triggers/cronWords.ts` with its spec; the
editor imports it until BMG-012 deletes the editor form. The preview route reuses `scheduler.ts`.

## 4. Acceptance criteria

1. Each mode emits the documented cron and the backend's `parseCron` accepts it (spec, table
   over every mode with two values each); `fromCron` puts a saved cron back into the right mode
   or *Custom* (spec, including `@daily` and `*/15`).
2. *Next runs* equals what `scheduler.next()` yields for the same cron and now (spec on the
   route; drive reads five times and compares to a second call to the route).
3. Create a schedule trigger from the page, *Run now*, and see the run in Runs (drive; the
   execution record names the trigger).
4. Webhook: the URL shown answers a signed `POST` with the secret the card showed (drive with
   HMAC), and after *Rotate* the old secret is refused.
5. Data change: *Pets: created* fires on `POST /api/Pets` (drive; execution recorded).
6. The payload editor round-trips `{limit: 10, dryRun: true, since: <date>}` with types intact.
7. `triggers-http`, `triggers-edit`, `cron` suites stay green; the preview route has its own.
8. 🔴 The cron field is visible only in *Custom*; no JSON textarea exists on the page.

## 5. Watch for

- `registry.ts:45`: the overlap default is `skip` and is a **behaviour change** for old files;
  the drawer shows the effective policy from `effectiveOverlapPolicy`, never a client default.
- A webhook secret is shown once on create (`POST` returns it) and on rotate; `PUT` never
  returns it. The drawer must not pretend to know it.
- `DEFAULT_RESPONSE_TIMEOUT_MS`/`MAX_…` bound the sync answer field; validate in words.
- The Files orphan sweep and Backups schedule (BMG-011) reuse `ScheduleBuilder`; build it
  without trigger-specific state.

## 6. Built (s8, 2026-09-25)

**Where — backend:** `src/triggers/cronWords.ts` (`cronWords`, the one gloss; the editor's `cronGloss` stays
until BMG-012 deletes its form — the editor mirrors this package structurally and never imports it,
`models/workflow/types.ts` says why), `scheduler.ts` `nextFireTimes(cron, after, count)` (the scheduler's own
`next()`, chained), `admin-triggers.ts` `preview()` = **`POST /admin/triggers/preview {cron, count?}`** →
`{valid, error, words, next[], from, timezone}` (registered BEFORE `admin/triggers/:id`; a 200 with `valid:false`
and the parser's sentence, because the page asks on every change; `NOT_AUDITED` as a dry run; in
`READONLY_SAFE_ROUTES`; tally `admin: 92 → 93`). `GET /admin/triggers` decorates a schedule with **`scheduleWords`**
(accepted back on `PUT` like `effectiveOverlapPolicy`; `TRIGGER_KEYS`) and answers **`overlapDefault`**, so a
new trigger's drawer shows the scheduler's default and never a copy of its own.
**Where — app:** `composers/schedule.ts` (the pure model: six modes → one cron, `fromCron` back, `scheduleProblem`
in words), `composers/ScheduleBuilder.tsx` (trigger-free; BMG-011 reuses it as is), `views/triggers.tsx`
(the list, the drawer, the pickers, `WebhookSecretCard`, `draftFrom`/`draftProblem`/`toInput` pure and specced),
`styles.css` `.tiles/.tile`, `.sched-*`, `.when-body`.

**Specs:** `tests/cron-words.test.ts` (31 sentences, every one an expression `parseCron` accepts; the shapes it
refuses to gloss), `tests/admin-app/schedule.test.tsx` (AC1 table: every mode × two values → cron → `parseCron`;
`fromCron` incl. `@daily`, `*/15`, ranges, Sunday-as-7, and the shapes that open in Custom; the builder under
jsdom: AC8, the sentence and five runs from the preview it was handed, a refusal in the parser's words, a week
with no day sends nothing; AC6 the payload round trip; the drawer's model), `tests/bmg-008-triggers.test.ts`
(AC2 over sockets: `next` equals `nextFireTimes(cron, from, 5)`; count clamp; invalid and unreachable; 400/401;
AC7 stores nothing, exempt, read-only may ask; the list's decoration and a `GET → PUT` round trip that reaches the
disk clean). `fed-004-overlap.test.ts`'s header pin moved to the new column set (the Overlap column stayed).
**Drive:** `drives/bmg008/run.sh ac seed` — **41/41 checks, no page errors**; shots `shots/bmg008-*.png`;
readings `drives/bmg008/readings.json`. **Gate:** `npm run typecheck` exit 0 (both configs); full `npx jest --maxWorkers=4`
192 suites PASS, 1 skipped, 2289 tests, exit 0, 394 s.

**What each AC measured:**
1. Every mode's cron in the table is accepted by `parseCron`; `fromCron('*/15 * * * *')` → every 15 minutes,
   `fromCron('@daily')` → every day at 00:00, `0 9 * * 1-5` → the week chips Mon–Fri, `0 */2 * * *` → Custom with
   the text kept. Driven: the saved `0 9 * * 1,3,5` re-opened in the week mode with Monday, Wednesday, Friday
   ticked, 09:00, no cron field, and the payload rows saying number / yes-no / date.
2. The page's five *Next runs* equal a second call to the preview route drawn the same way (`toLocaleString`);
   the zone under them is the route's (`Europe/Paris`); the list's *Next run* for the saved trigger is the first
   of the five. Over sockets the route's `next` equals `nextFireTimes` for its own `from`, each one a Monday,
   Wednesday or Friday at 09:00 local.
3. *Schedule a function* → the drawer; `hello` picked by name; *On a schedule* → *Every day at 09:00*; the week
   mode, two days unticked → *Every Monday, Wednesday and Friday at 09:00*; *Queue one*; Create → `POST`, the
   stored trigger is `function hello`, `0 9 * * 1,3,5`, `queue-one`, enabled, `scheduleWords` decorated.
   Re-opened, *Run now* → an execution whose `metadata.triggerId` is the trigger, `triggerType: manual`; the
   list says *ok · just now*; the Runs page names `hello`.
4. *Stripe payments* → the path suggested `stripe-payments`, the full URL shown as
   `http://127.0.0.1:8697/hooks/bmg8/stripe-payments`, *Signature* on; Create → the card with URL, secret and a
   signed `curl`; a `POST` signed (HMAC-SHA256, `X-Hub-Signature-256`) with the card's secret → 200 and a
   `webhook` execution; a wrong signature → 401. Re-opened: no secret on the page, *Rotate the secret* asks in
   words about every sender, then a new secret once; the old one → 401, the new one → 200.
5. *Pet watch*: collection `Pet` picked, ☑ created; Create → `dbChange {Pet, [create]}`, target workflow `ping`;
   `POST /classes/Pet {name: Rex}` → an execution naming the trigger, `triggerType: db_change` (the execution
   store's own spelling). Switched off from the row (one `POST …/enabled`, no drawer), a second Pet fires nothing.
6. Rows `limit · Number · 10`, `dryRun · Yes/no · ☑`, `since · Date · 01/09/2026 07:00` → stored
   `{limit: 10, dryRun: true, since: "2026-09-01T05:00:00.000Z"}`, number, boolean and ISO string; the same
   bytes in `triggers.json`; re-opened as the same three typed rows.
7. `triggers-http`, `triggers-edit`, `triggers-registry`, `triggers-auth-and-input`, `cron`, `scheduler`,
   `fed-004-overlap`, `ops-audit`, `ops-rate-limit`, `admin-dashboard` green beside the three new suites; the
   preview route has its own.
8. The schedule tile opens with no cron field; *Custom* shows one carrying the cron the controls had made;
   `61 * * * *` is refused live in the parser's words; back in the week mode the field is gone. No `textarea`
   anywhere in `#main` or the drawer; the only free-text inputs are the name, the pickers' search boxes, the hook
   path and the key/value rows.

**Where the task was wrong, measured, and what was done instead:**
- **The list keeps an *Overlap* column.** §3.3's column list dropped it, but FED-004 AC7 pins it in the
  dashboard (`fed-004-overlap.test.ts` renders `OverlapCell` and asserts the header). Columns are
  Name · When · Runs · Next run · Last run · Overlap · Enabled; the skip is ALSO folded into *Last run* as a
  warn chip, as §3.3 asked.
- **`cronGloss` did not move into the editor's import path.** The editor cannot import this package (no path
  alias; `models/workflow/types.ts` records the decision), so the backend's `cronWords` is the canonical gloss
  and the editor keeps its copy until BMG-012 deletes the form with it. The sentences are the task's
  (*Every Monday, Wednesday and Friday at 09:00*), not the editor's (*at 09:00 every Monday*).
- **A new schedule's overlap policy comes from the list route (`overlapDefault`)**, and the drawer sends the
  policy it showed explicitly — so saving an old trigger that had none writes `overlapPolicy: "skip"` to disk,
  which is what the person saw and confirmed.
- **The preview answers `valid:false` as a 200**, not a 400: the builder asks after every change and an
  unfinished expression is an answer.
- **Custom mode opens on the cron the controls had just made** (the task said only that an inexpressible cron
  opens there); switching to Custom loses nothing.
- **The execution store says `db_change`** (`execution-history/types.ts`), the registry says `db-change`; the
  drive reads the store's word.
- **Largest body is a select of sizes** (64 KB … 10 MB) with a *(as saved)* row for a stored value outside it,
  rather than a number field; a wrong size is impossible to type.
- 🔴 **`.drawer-section` is a HEADING style** (uppercase, muted, 12px). Wrapping controls in it uppercased the
  sentence, the URL and the refusal — the first drive read *EVERY DAY AT 09:00*. `.when-body` is the wrapper.
- `PUT /admin/triggers/:id` carries no version tag; `updatedAt` is the token WFA-008 named, and the route does
  not check it. A concurrent edit is last-writer-wins here (BMG-006 gave the permissions document an ETag;
  triggers could take the same).
