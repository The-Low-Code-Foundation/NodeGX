# EXP-020 — The Noodl API in the export

**Scoped:** 2026-10-21 (P18 session 132, BOARD lane 6), under Richard's ruling of 2026-10-21 (see
[EXP-019](EXP-019-THE-SCRIPT-TRAVELS-AS-WRITTEN.md)). **Status: ⬜ scoped, not started.** Follows EXP-019.

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
