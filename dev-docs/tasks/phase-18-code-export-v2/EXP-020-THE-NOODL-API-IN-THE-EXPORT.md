# EXP-020 — The Noodl API in the export

**Scoped:** 2026-10-21 (P18 session 132, BOARD lane 6), under Richard's ruling of 2026-10-21 (see
[EXP-019](EXP-019-THE-SCRIPT-TRAVELS-AS-WRITTEN.md)). **Status: 🟡 s134 — slice 1 built and graded (§6): `Records.query` (plain), `CloudFunctions.run`, `Users.Current`, `Files.sign`, `Variables`; next the members the corpus ranks (`Events`, `Object`/`Objects`, `Array`).** Follows EXP-019.

## 1. The person sentence

> "My Function that does `await Noodl.Records.query('tasks', …)` is in the React app and it queries the same backend."

## 2. What was measured first (s132)

Every `Noodl.<member>` read in every template Function body (`s132-hostgates/noodl-members.txt`):

| member | bodies |
|---|---|
| `Records.query` | 145 |
| `Records.create` | 76 |
| `CloudFunctions.run` | 56 |
| `Records.save` | 41 |
| `Users.Current` | 33 |
| `Records` (other: `delete` 2, `addRelation` 1, `removeRelation` 1, bare 26) | 30 |
| `Files.sign` | 10 |
| `Variables.<name>` (18 names, all `dbt*` / `nb*`) | 77 |
| templates that use any: marketplace 62, digital-bricks-training 47, gram 39, dbt-demo 13, todo-list 11, todo-list-demo 9, nightbook 2 | 183 bodies |

The surface actually used is **eight members**. The export already emits `src/api/` for the Record and Cloud Function
nodes (RECORD-VERBS-TARGET, EXP-011 §62–§72) against the same backend; `Noodl.Variables` already exists as the facade a
Visual Function binds (LOGIC-BUILDER-TARGET §3.4).

## 3. The rule

`src/lib/noodl.ts`, emitted once, earned by the first body that reads `Noodl.`: an object whose members call `src/api`
with the runtime's own signatures (`noodl-runtime/src/api/`: `Records.query(className, {where, sort, limit, skip,
include})` → the query the Query Records node sends; `create`/`save`/`delete` → the record verbs; `CloudFunctions.run`
→ the Cloud Function call; `Users.Current` → the signed-in user the User node reads; `Files.sign` → the files endpoint;
`Variables` → the variables store). The wrapper passes it as the body's third parameter, exactly as the runtime does.
A member outside the eight is a refusal by name ("reads `Noodl.Events` — not in the export's Noodl object"), as today.

## 4. Acceptance criteria

- **AC1** — a desk Function `const rows = await Noodl.Records.query('Task', {where: {done: false}}); Outputs.n = rows.length`
  against a local backend: both arms read the same `n`; `create` then `query` reads one more.
- **AC2** — `Noodl.Variables.x` written in a Function is read by a Variable node `x` in the same app, and the reverse.
- **AC3** — the 183 bodies: 0 refused for `Noodl.*` among the eight members; the rest named by member.
- **AC4** — `Users.Current` is `undefined` signed out and the user record signed in, in both arms.
- **AC5** — a member outside the eight refuses by its name; marketplace / gram / dbt exports typecheck (`tplbuild.ts`).

## 5. Not this task

`Noodl.Events`, `Noodl.Objects` / `Noodl.Arrays` as live stores (the controlled-state slice), `Component.*` (EXP-021).

## 6. Session 134 (2026-10-21): slice 1 — built, graded

[EXP-011 §104](EXP-011-PICKER-COVERAGE.md) is the ledger entry; `s134-noodlapi/` holds the measurements (`bodies.py`,
`census.ts` + `census.json`, `census-gates-open.json`, `EXPECTED.md`, `dispdiff.json`, `dispdiff-corpus.json`,
`tplbuild.json`, `mutants.py` + `mutants.out`, `dd.py`).

🔴 **§2's 183 was the wrong population for this task**: 71 of those bodies are cloud functions (`__cloud__`), which run
on the backend and are not in the React app. The front end has 112; 79 stood at the Noodl gate; with it and the
top-level-`await` gate opened in a scratch copy, 35 exported directly. Every front-end query reads rows `plain`, so the
Model records are not this slice; `Records.create` / `save` / `delete` live only in logic components (EXP-021).

| AC | |
|---|---|
| AC1 | ✅ on the Noodl Desk against a fake Parse backend both arms talk to: the same count, and one more after a Cloud Function stores a Task; the member arm: 71 calls, every outcome and request body equal but the runtime's query after a refused filter (P18-S134-REFUSEDFILTERSENDS, filed) |
| AC2 | ✅ `Noodl.Variables.note` written in a Function is read by a Variable node's Text; a Variable a Set Variable wrote is read by the Function (`kept S1`, `kept S2`) |
| AC3 | the templates: 0 of the front-end bodies refused for a member among those carried; the rest named by member (the corpus: `Noodl.Events` 132, `Noodl.Object` 50, `Noodl` handed on 47, `Noodl.Array` 22) |
| AC4 | ✅ `Users.Current`: the user signed in, undefined signed out, in both arms (page and member) |
| AC5 | ✅ a member outside the carried set refuses by its name; `tplbuild` all 17 at the floor (1 in 1, nightbook STYLENULL) |

The members not carried are refused by name and ranked for the next slice. A project with no backend exports the same
calls, failing as the running app does without one (the exporter's stub rule).
