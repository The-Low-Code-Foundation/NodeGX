# EXP-020 — The Noodl API in the export

**Scoped:** 2026-10-21 (P18 session 132, BOARD lane 6), under Richard's ruling of 2026-10-21 (see
[EXP-019](EXP-019-THE-SCRIPT-TRAVELS-AS-WRITTEN.md)). **Status: 🟡 s135 — slice 1 built and graded (§6): `Records.query` (plain), `CloudFunctions.run`, `Users.Current`, `Files.sign`, `Variables`; slice 2 built and graded (§7): `Component.Object`, the component's record. Next: the scope's other members, then `Events` / `Object` behind them (§7.4).** Follows EXP-019.

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
**s135: `Component.Object` came back here** (§7): EXP-021 §5 sent it on to the controlled-state slice, so nobody owned it.

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

## 7. Session 135 (2026-10-21): slice 2 — the component's record — built, graded

[EXP-011 §105](EXP-011-PICKER-COVERAGE.md) is the ledger entry; `s135-componentrecord/` holds the measurements (its
README says how the slice was chosen).

### 7.1 Measured first: the corpus ranked copies

§6's ranking (`Noodl.Events` 132, `Object` 50, `Noodl` handed on 47, `Array` 22) counted rows. By distinct body: 6, 4,
3 and 1, from the Filters and Multi Select prefabs installed in one project copied about 22 times, the Site Builder
template, and one scratch body. Every front-end prefab body that reads `Noodl.Events` (13 of 13) also reads `Component.*`,
so `Events` alone gains nothing. The templates had one body refused for a Noodl member (`Noodl.Users`); what ranked first
there was the Component scope: **gram's ten page loaders and marketplace's two, refused for `Component.Object` alone**,
every one the instance's private record (`var keep = Component.Object; … keep.get('links') … keep.set('links', links)`),
in a component with no Component Object node.

### 7.2 The runtime, read

`javascriptnodeparser.js` `getComponentScopeForNode`: one scope per component instance (cached by its instance id),
handed to every Function in it; `Object` is `Model.get('componentState' + instanceId)`, booting empty; `ParentObject` the
nearest ancestor's record; `RepeaterObject` a getter for the row's item. `model.ts`: the record behind `_modelProxyHandler`
(a method reads bound; `id`, `data`, `listeners` read as themselves; any other name reads `get(name)`; a write is
`set(name, value)`, but `id`, read-only, which warns). A Parent pair reaches only an ancestor that owns a Component Object
or Component State node (`componentwalk.ts`; a named target without one is a miss that writes nothing). A page is deleted
on leaving and built fresh unless its Page node ticks Keep When Leaving (`router.tsx`).

### 7.3 The rule, built

- `jsComponentUseOf` (`jsfun.ts`): `Component.Object` read any way the record is, handed on included; any other member,
  a computed one, the scope handed on, or an assignment to a member of the scope is refused by name ("reads
  \`Component.RepeaterObject\` — the export's Component scope carries Component.Object, this component's record (EXP-020)").
  A host trait for a Function ("reads its component's record (Component.Object)"), so the body is kept; still a gate for an
  Expression.
- The plan: `JsFunctionPlan.component`; refused beside a Component Object, Component State or Set Component Object
  Properties node in the same component (that record is `useComponentObject`'s, EXP-011 §60, not yet the script's).
- `src/lib/componentScope.ts` (`componentScopeLib.ts`): the Model's methods and proxy, transcribed; the id spelled
  `componentState__$ndl_componentInstaceId<n>` as the runtime spells it. The component keeps one scope per mount
  (`useState(createComponentScope)`), each kept node carries it (`functionNode(signals, componentScope)`), `runFunction`
  hands it to the body fourth (`_self` holds the third place where the body keeps nothing on `this`).

| AC (this slice) | |
|---|---|
| the record | ✅ the Component Desk on both arms: boots empty, `id` read-only, Read reads what Add wrote (`get`, a property read, a property written, its keys), two placements two records, through an `await` |
| reach | ✅ templates **51 gained, 0 lost** (gram 48: its pages' loaders, their navigations, Page Inputs, Cloud Functions; marketplace 3); corpus 0 / 0 / 160 re-worded, each naming its member |
| refusal by name | ✅ the scope's other members; a family node beside the body; an Expression keeps its gate |
| builds | ✅ `tplbuild` all 17 at the floor (1 in 1, nightbook STYLENULL) |

### 7.4 What this leaves

- **P18-S135-HIDDENINSTANCE** (filed, low, template reach 0): a placement under a Mounted condition is unmounted by the
  export; its kept nodes, their outputs and now its record start over when it is shown again. The runtime keeps the
  instance. Pinned by name on the desk (A6).
- The scope's other members, which the Filters prefab shares across its Functions (`Component.UpdateCondition` 88 rows,
  `UpdateValue` 44, `UpdateFilter` 22): the scope is per instance now, so a member set by one Function and called by
  another is the next small step; then `Noodl.Events` and `Noodl.Object.create` (the same bodies), then
  `Component.RepeaterObject` (the row's item) and the record beside a Component Object node (one record with
  `useComponentObject`).
- gram's next blocker after the record: For Each fed by a Function's output ("items are fed by a source not statically
  typed as a list"), the Feed's cards among them; and the Upload File pulse (3 bodies).
