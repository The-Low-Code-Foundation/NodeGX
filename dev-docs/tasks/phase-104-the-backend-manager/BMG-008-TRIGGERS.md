# BMG-008 — Triggers: authored here, with a schedule builder and a payload as rows

**Opened 2026-09-24** (README §2 row 3). **Depends on BMG-001.** Builds `ScheduleBuilder` for the kit.
**Status: 📋 not started.**

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
