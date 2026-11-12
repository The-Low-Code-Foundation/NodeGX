# UPG-001 — The break census: what a 0.2.4 project loses in 0.3.0

**Opened 2026-09-22** with the phase. **Status: ✅ EVERY CLASS MEASURED (s6, 2026-09-23) — §4 is empty. Two breaks,
both migrated (3.1 text styles, 3.6a idempotency); everything else is a note or nothing. AC3 (Richard
reads §3) is his.** s6 measured against HEAD `ea7f712dd` over the **217 NodeGX-format projects** on this
machine, both releases' code side by side. First opened against `cline-dev` HEAD `7043fb6e6`, `v0.2.4..HEAD` = **427 commits**.

## 1. The person sentence

> **Someone upgrading from 0.2.4 can read one page and know, before they install, every way their
> existing project will behave differently — and each one either migrates itself or says so out
> loud.**

## 2. 🔴 Why this is the first task, and why it is a census rather than a fix

Three other things read from this table and none of them can be written first:

- **the version number** — §3 of the [board](README.md) claims 0.3.0 on the strength of there being
  at least one real break. One row (§3.1) is enough to carry that, but the notes need all of them.
- **the release notes** (UPG-006) — a break nobody wrote down becomes a support mystery. The
  compatibility policy says exactly that, and calls it the price of the speed it buys.
- **the migrations** (UPG-003 and whatever else R2 rules in) — you cannot write a migration for a
  break you have not named.

**The method, and it is not "read the commit subjects."** 427 subjects will produce a plausible
list that is wrong in both directions: subjects say `fix` for things that changed behaviour, and
say nothing for the change buried in a `feat`'s third bullet. Each row below is measured from the
artefact — the diff, the rule, the model file — and says what was read.
[[measure-the-artefact-before-believing-the-task-file]].

## 3. The rows measured so far

| # | class | verdict | decision |
|---|---|---|---|
| 3.1 | Text styles vanish from the Styles panel — **but stay listable, applicable and CREATABLE from a node** (A2, 2026-09-23) | 🔴 **BREAK — real, ruled on the numbers; narrower and stranger than first recorded** | **R6 ✅ BUILT `62029ab28`** (Create removed), **then ✅ CONVERTED on load — typography tokens (R8), font files too (R9), project copied first (R10): [UPG-003](UPG-003-TEXT-STYLES-BECOME-TOKENS.md), `f6503e521` + `11bb0a390`**. [Board §6.2](README.md) |
| 3.2 | Built-in port renames — **and (s6) ports or types removed, types, defaults, enum options changed, in every node tree** | ✅ **CLEAN this release** — catalog diff: 0 removed of 3,310 ports, 0 changed | none. Do not re-measure |
| 3.3 | New validator rules on existing work — **all five added codes (s6)** | 🟡 **NOISE, not a break** — every one `warning`, 0 error arms added | one line in the notes |
| 3.5 | Existing work newly red — (a) GAM-019's narrowed `nonexistentPort` skip, (b) kit node types now recognised, so their ports are checked | ✅ **NOT A BREAK — 0 real projects** (s6): 6 of 217 NodeGX projects go red, every one a fixture built with a broken kit port; class (a) 0. Nothing gates on a pre-existing error | none; (b) under *what's new* |
| 3.4 | Shipped looks becoming project-owned Looks; the `_variant`/`_size` markers | ✅ **RENDERS IDENTICALLY** (s6) — no runtime, viewer or exporter reads a marker in either release. Lost: the *Preset / Size* picker. 28 nodes / 14 projects | one line in the notes |
| 3.6 | **The backend storage plane** — a 0.2.4 backend holding live data, started on 0.3.0 code | ✅ **CLEAN on every surface but one** (driven 2026-09-23, §3.6) | none, except 3.6a |
| 3.6a | ↳ an idempotency key **completed on 0.2.4 runs a second time** on the first call after the upgrade | 🔴 **BREAK — measured, recoverable** (the 0.2.4 row is still on disk, unread) | ✅ **MIGRATED s3 (`77564e5c2`)** — `persistence/carryLegacyIdempotencyKeys.ts`, once per file, on `ExecutionHistory.open`. Re-driven on a fresh copy of the same 0.2.4 data: `replayed`, the **0.2.4 token**, runs stay **1** (unfixed: `stored`, new token, 2); fresh-key control +1; start log `idempotency.legacy-carried {carried: 1}`. `tests/upg-001-idempotency-carry.test.ts`, each arm killed by its own mutant |
| 3.7 | `/api` (BYOB) and `admin/export` return Booleans as `true`/`false`, not `1`/`0` | 🟡 **WIRE CHANGE, ruled** — P97 R7 / `40140ca71` BRG-007 | **one line in the notes** — a client comparing `=== 1` stops matching. `/classes` already returned real Booleans |
| 3.8 | The code exporter, same project, v0.2.4 vs HEAD | ✅ **MORE COMES ACROSS, NOTHING STOPS** (s6): complete 57→62, refusals 18,272→18,157, 0 nodes newly refused; the 3 projects whose count rose now *report* what v0.2.4 lost silently | none; *what's new*. ⚠️ pre-existing `snapActionList` crash (4 projects, both releases) → P18 |

### 3.1 🔴 Text styles are no longer editable — BREAK

**Read from:** `aa0cd5b13` (P99 / HLT-007 a) and its own measurement, quoted in full on the
[board §4.1](README.md).

**17 of 19 current-format projects on this machine carry text styles.** 39 of 154 legacy-format
ones do, including **16 shipped library prefabs**. After 0.3.0 they still load, still apply at
runtime, and a Text node can still pick one — **and the editor will not list, rename or delete
them.** Converting them to Looks was considered and not built.

🔴 **The removal is ruled ON THESE NUMBERS and is not reopened.** `HLT-007…md:17-24` records all
three askings, and the third *"gave the 17-of-19 figure and named his two projects"*. Richard:
*"Remove it anyway. I don't feel like it's going to cause a massive backlash. **You could argue that
we could convert the existing text styles into Looks in the new styles system, as a compromise.**
Most of them will just be using the default text styles that come baked into the old editor."*

**So do not carry this row to Richard as "the upgrade was never considered" — it was.** The open
question is the compromise **he** raised and P99 left `📋 Not built`: convert them to Looks, or ship
a release note. **R3.** [[ask-richard-a-ruling-in-plain-words]] — an answer carried without its
question drifts into a prohibition, and this row was drafted that way once already.

### 3.2 ✅ Built-in port renames — CLEAN, and this row exists so nobody measures it twice

Renaming a port on a shipped built-in node breaks every project that wired it: no alias, no
migration, no console line, no Problems entry. The signal simply stops firing. This repo has done it
**seven times** and shipped nothing for projects already on disk
([[a-rename-of-a-built-in-port-ships-no-migration]]; P86 D1, still unowned).

**Measured for `v0.2.4..HEAD`:**

```
git diff v0.2.4..HEAD --name-only -- packages/noodl-runtime/src \
  packages/noodl-viewer-react/src/nodes packages/noodl-viewer-cloud/src/nodes   → 57 files
git diff v0.2.4..HEAD -U0 -- <same three trees> | grep -E "^-\s*(name|displayName):"
  → 2 hits, both "-  name: string;" — a TypeScript interface field, not a port
```

**No port was renamed into 0.3.0.** The P86 debt is older than this release and stays out of scope
([board §7](README.md#7-out-of-scope)).

⚠️ **The grep is narrower than the class.** It catches a rename done as an edit to a `name:` line in
those three trees. It would not catch a port deleted and re-added elsewhere in the same diff, a port
removed outright, or a rename in a tree outside the three. §4.2 owns closing that gap; this row
claims only what the two commands measured. [[a-reading-that-fits-is-not-one-that-excludes]]

✅ **§4.2 CLOSED s6 (2026-09-23) — the gap measured from the catalog, not the source trees.** The
committed node catalog (`packages/noodl-types/src/node-catalog.json`) is generated from **every**
node library the runtime registers, so it is the one artefact that sees all trees at once.
`npm run catalog:check` at HEAD → exit 0, *"Committed catalog is up to date"* (180 types), so HEAD's
copy is the runtime's truth. Diffed against `git show v0.2.4:…/node-catalog.json` (176 types), per
type, per plug, per port name:

| what | v0.2.4 → HEAD |
|---|---|
| node types removed | **0** (4 added: `Repeat`, `net.noodl.ParseFeed`, `net.noodl.ParseXML`, `noodl.cloud.modelrequest`) |
| ports removed (inputs or outputs, any type) | **0** — of v0.2.4's 3,310 (HEAD has 3,491) |
| port `type` changed — includes every enum option list | **0** — all 3,310 compared (every port type is an object), 322 carry `enums` |
| port `default` changed | **0** — 1,061 v0.2.4 ports carry one |
| ports added | 11 types gain ports (drag-and-drop on 6 visual types, `blur`/`focus` on 5 controls, …) |

**Control:** the "added" rows are the "removed" arm run the other way round — same code, so the arm
fires. A **stale v0.2.4 catalog** could only list ports that did not exist (they would show here as
removed: none) or miss ports that did (they would show as added: harmless), so the diff cannot hide
a removal. **What it does not see:** a port whose *behaviour* changed under the same name, type and
default — that is every runtime commit, and no diff reads it.

### 3.3 🟡 A new validator rule fires on existing work — NOISE, not a break

`f37698014` (P99 / HLT-014) adds `dialog-without-name`
([`rules/dialogWithoutName.ts:137`](../../../packages/noodl-editor/src/editor/src/validation/rules/dialogWithoutName.ts#L137)).
A project that validated clean on 0.2.4 can show a new entry on 0.3.0 without the author changing
anything — which reads like a regression from the author's chair.

**`severity: 'warning'`** — read from the rule, not from the commit message. It does not fail a
build, a deploy or an export. P99 measured **0 hits across all ten templates**, so our own corpus is
silent and only a hand-built project can see it.

**Decision: one line in the release notes** under what's new rather than under what broke. No
migration. 🔴 **But it is a class, not a row** — any rule added in this window behaves this way, and
§4.3 owes the list.

✅ **§4.3 CLOSED s6 (2026-09-23) — the list, with each severity read from the emitter.**
`git diff v0.2.4..HEAD -- packages/noodl-editor/src/editor/src/validation/diagnostics.ts` adds five
`DiagnosticCode` entries besides this one; each severity below is the literal at the push site, and
for the two that take a `severity` option, the only caller (`authoredCandidate.ts:611`, `:622`)
passes none, so the default holds:

| code | emitted at | severity |
|---|---|---|
| `dialog-without-name` | `rules/dialogWithoutName.ts:137` | `'warning'` |
| `font-face-not-shipped` | `fontFaces.ts:112` | `'warning'` |
| `text-cannot-wrap` | `layoutInertCombination.ts:265` | `'warning'` |
| `variable-in-repeated-component` | `repeatedComponentVariable.ts:202` (default) | `'warning'` |
| `reserved-row-field` | `reservedRowField.ts:139` (default) | `'warning'` |

And `git diff … -- validation/ | grep "^[+-].*'error'"` → **0 lines**: no added or removed error
arm anywhere in the tree. **So no rule added since 0.2.4 can turn clean work red.** The one way an
existing project *can* go red is not a new rule — it is §3.5's class, measured on the corpus there.
⚠️ `repeatedComponentVariable.ts` reads as `Bin` in `git diff --stat` — every grep above used `-a`
([[ugrep-silently-skips-a-source-file-as-binary]]).

### 3.4 🟡 Shipped looks become project-owned Looks — not on the load path

`0ef525aeb` (P94 / STY-002) turns phase 9's `ElementConfig` variants — stamped into a node's
parameters and forgotten — into ordinary Looks the project owns.

**Measured:** `models/Looks/looks.ts` has exactly **two** non-test callers —
`StyleTokensModel/StyleVocabulary.ts:53` and
`propertyeditor/components/VariantStates/PickVariantPopup.tsx:26` (the third hit is
`tests-unit/sty-002/looks.test.ts`). Both are **authoring-time**: the
vocabulary a picker reads, and the picker itself. **Nothing calls it from a project load path**, so
opening a 0.2.4 project does not rewrite its parameters, and a node still wearing `_variant` /
`_size` markers keeps them.

That is the answer to "does it convert on load" — **no** — and it is the good answer. What it does
not answer is whether such a node still *renders* the same, because the same commit also changed
what a shipped look contains (the config's `defaults` **plus** the variant's own properties) and
translated the state names (`active`→`pressed`, `focus`→`focused`, `placeholder` dropped as
unlandable). **A grep cannot answer a rendering question.** §4.1.

✅ **CLOSED s6 (2026-09-23) — renders identically, and the reason makes a drive unnecessary.**
The rendering question only exists if something at render time reads the marker. Nothing does, in
either release:

```
git grep -n "_variant\|_size['\"]" <rev> -- packages/noodl-runtime packages/noodl-viewer-react \
    packages/noodl-viewer-cloud packages/nodegx-export/src ':!*test*'
  v0.2.4 → 2 hits, both `_variantHasInputsWithTypes` (a method name in styles.ts), no marker read
  HEAD   → the same 2 hits
  control: `git grep -c _variant` over models/ElementConfigs → Registry 5, Types 1, ButtonConfig 1, … at both revs (armed)
```

`0ef525aeb` itself touches **six files, none in a runtime, viewer or exporter tree** (`looks.ts`,
`projectmodel.ts`, `projectLevel.ts`, three tests). A `_variant` node draws from the style
parameters stamped into it when the preset was picked; the marker was only ever the editor's memory
of *which* preset that was, and nothing on the load path rewrites the parameters (s1, above).
**What 0.3.0 does take away is an editor affordance, not a look:** the properties panel's
*Preset / Size* picker (`propertyeditor.ts`, STY-002 AC5 — it was the only writer of the markers).
The styles stay, editable as ordinary parameters; making a Look from the node is the new way to
reuse them.

**Reach, measured over the 217 NodeGX-format projects on this machine** (`nodegx.project.json`,
worktrees excluded): **28 nodes in 14 projects** carry `_variant` — Text `body` 17, Button `primary`
6, Checkbox `default` 4, Text Input `default` 1; `_size` **0**. None is shipped content (`git grep
'"_variant"'` outside the editor source and tests → 0). ⚠️ A `UPG-001 Variant Drive` project (mtime
2026-09-23 08:55) already sits in *NodeGX test projects* — an earlier session built the drive's
fixture and recorded nothing; it was not needed.

**Decision: one line in the notes** — *"The Preset picker is gone. Nodes that used a preset keep its
styles; to reuse them, make a Look."* No migration.

### 3.5 ✅ Existing work that newly goes red — two mechanisms, zero real projects

**The question is wider than the rule it was found on.** A project that validated clean on 0.2.4
can show an `error` on 0.3.0 without being touched only if a check **starts running** on a node it
used to skip. There are two ways, and the corpus run below found both:

- **(a) GAM-019** narrowed `nonexistentPort`'s skip from `isDynamicNode` to
  `hasRuntimeDynamicPorts` (`rules/nonexistentPort.ts:126`), so **20** of the 88 dynamic built-in types (counted from the catalog, HEAD; the rule's own docblock says 18) with only
  declared-port-group dynamics are now checked.
- **(b) Kit node types became recognisable.** The v0.2.4 validator could not read a project's own
  node kits and skipped every kit node (`unknown-node-type` → `unknown-type-check-skipped`); HEAD
  reads them, and a kit node's ports are checked for the first time.

**Measured — both validators over the same projects, every rule, error set diffed by
`(code, component, nodeId, type, port, plug)`.** v0.2.4's validator from `git archive v0.2.4` of
`noodl-editor/src`, `noodl-types`, `noodl-mcp/src` into scratch (`@nodegx/kit-catalog` taken from the
checkout: its source is unchanged since the tag, only a test moved). Each project validated through
the CLI's own path (`scripts/validate-project.ts` `validatorFor`: kit overlay merged when readable).

| population | projects | clean on v0.2.4, red on HEAD | new errors | errors gone |
|---|---|---|---|---|
| **NodeGX format** (`nodegx.project.json`, worktrees excluded) | **217** | **6** — every one a fixture built to hold a broken kit port | 6, all class (b) | 0 |
| legacy `project.json` corpus (UPG-003's list, Descript excluded) | 456 | 5 | 2 class (a) + 3 class (b) | 0 |

The six NodeGX-format hits, by name: `nodegx-export/tests/fixtures/kits` (`qa.gauge.Dial`
`retiredOutput`), `…/fixtures/charts` (`BarChart` `barCount`), `noodl-mcp/tests/fixtures/kit-app`
(`demo.kit.Badge` `progres` — a typo, on a component called `/Broken`), and `STY-005 Panel Drive`,
`cn027-drive`, `cn029-drive` (`nodegx.rename.Badge` `caption`, node id `probe-badge`, in drives that
exist to rename a kit port). **Class (a) on the NodeGX population: 0.** Its only two hits anywhere
are one pre-NodeGX Noodl test fixture held in two copies (`big-merge-test-mine`, Text Input
`disabled`) — a waived population.

**Controls.** The instrument fires: 1,034 `nonexistent-port` errors across the legacy corpus, 22
projects red on both versions in the NodeGX set (pre-existing, not upgrade rows). The classifier
fires: 5 legacy + 6 NodeGX hits. The v0.2.4 validator is really v0.2.4's: it emits **0**
`dialog-without-name` against HEAD's 164 on the same 217 (1,546 on the legacy set).

**Consequence if a real project did hit it:** a red row in the Problems panel and a dot in the
Components panel — **no gate refuses anything.** Both authoring gates set pre-existing errors aside
and refuse only new ones (`AiAssistant/authoring/validate.ts:221` `baselineErrorKeys`;
`noodl-mcp/src/validate.ts:316` `newErrors`), and I found no deploy or export path that reads the
validator. And the red row is **true**: a wire into a port the node does not have does nothing, on
0.2.4 as on 0.3.0.

**Decision: no migration, no break note.** Class (b) belongs under *what's new* — *"the Problems
panel now checks the ports of your own node kits"*.

### 3.6 ✅ The backend storage plane — a drive, not a diff read

**Measured 2026-09-23 (P100 s3)** by running both versions, because the diff (59 source files, ~9,400
lines since `v0.2.4`) is too big to read for absence. `v0.2.4` and `HEAD` `7df454df6` were each
`git archive`d to scratch and built there with every `@noodl/*` import aliased to the scratch copy
(one file, `nodegx-project-contract/logic-builder-io.ts`, still resolves from the checkout in both —
identical code on both sides, never exercised by the seed). **No route was removed**: 121 patterns at
`v0.2.4`, 125 at HEAD, `comm -23` empty.

**The drive:** a 0.2.4 backend on an empty data dir was filled over HTTP (64 steps, 0 errors) —
records of every field type incl. Pointer, File and a `_Join` relation, batch writes, two users with
passwords and sessions, a role, collection permissions and a row ACL with `devOpen: false`, a file, an
API key, a secret, email config and templates, GitHub auth, ops, search, a trigger, a workflow def and
six runs, an idempotent call, and a backup archive. 83 reads → `before.json`. Stopped; the data dir
`cp -R`'d; **HEAD started on the copy** → 83 reads → `after.json`. The original was byte-identical at
the end. Control: two back-to-back reads on 0.2.4 differ only in `exportedAt`, error `requestId`s and
the audit log's own growth.

| surface | 0.2.4 → HEAD |
|---|---|
| records (`/classes` + `/api`: filters, sort, `include`, `keys`, `count`, `$relatedTo`, aggregate) | **same values** — except Booleans on `/api`, row 3.7 |
| ACLs and collection permissions | **same** — the private row is 404 to anonymous and to the other user, 200 to its owner |
| users, roles, permissions, function rules, secrets, files (sha256), email, auth, search, triggers, workflow defs, executions, audit | **same**, plus additive fields (`actsAsUserId`, `effectiveOverlapPolicy`, new ops limits) |
| old **password** / **session token** / **API key** / **webhook secret** on HEAD | **all 200**, each beside a failing control (wrong password 404/101, logged-out token 400/209, revoked key 401, bad signature 401) |
| HEAD's startup log on the old data | no migrate / upgrade / warn / error / DISABLED line; `doctor` OK |
| schema | `_ApiKey` + `actsAsUserId`; new `_HttpCache`; new `operational_records`; `idempotency_keys` left in place. `executions.sqlite` keeps `auto_vacuum=none` and `admin/status` offers `POST /admin/executions/compact` |
| a **0.2.4 backup restored by HEAD's `restore`** | exits 0, `integrity_check: ok`; records, users, sessions, ACLs, keys, files, email, triggers **same** — and the gap in §3.6c |

**3.6a 🔴 the one break.** `persistence/SqliteOperationalStore.ts` (BRG-002) moved idempotency claims
from `idempotency_keys` to a new `operational_records` table and says in its own header that completed
claims do not carry. Measured: key `evt_upg_1` called twice on 0.2.4 → one run, one token. The same key
on HEAD → **200, a new token, `idempotency-status: stored`, and the function's run count 1 → 2**. A
second replay on HEAD → `replayed`, still 2. Controls: the key's TTL was 72h; a fresh key on HEAD called
twice adds exactly one run. For a function that charges a card or sends an email, that is one duplicate
per in-flight key, on the boot that upgrades. **The row is still on disk, so R2 says migrate.**

**3.6b — found by the drive, NOT upgrade breaks** (identical on 0.2.4; owed a home, not this phase's):
- `where tags = "fantasy"` on an Array field returns `[]` although three rows carry it — **a wrong
  answer with no error**.
- `where author = {__type:'Pointer',…}` → 500 `cannot translate: __type`; the plain-id form works.
- a create carrying `meta: {}` → 500 `Provided value cannot be bound to SQLite parameter` (0.2.4 only;
  not retried on HEAD).
- `PUT /classes` with `{__op:'AddUnique',…}` stores the operation object literally.
- ten failed credentials from one IP in five minutes lock that IP out of **every** route for five
  minutes, `/health` and valid admin bearer calls included (0.2.4; not retried on HEAD).

**3.6c 🔴 a backup does not hold the whole backend** — older than this release, same on HEAD
(`BackupManager`'s `CONFIG_FILES` list is unchanged). The 0.2.4 archive holds `db/local.db`, file
blobs, `workflows/*.workflow.json` and six config files (`tar tzvf`). Restored, it **loses**
`workflow-defs/` (the trigger survives and its webhook now 404s *"Trigger target workflow not
found"*), `auth.json` (GitHub provider, magic link, redirect allow-list), `search.json`, `files.json`,
`ops.json` (CORS, audit retention, idempotency TTL back to 24h) and all of `executions.sqlite`.
🔴 **Not an upgrade break, but it is the one a person discovers on the worst day they have.**

Evidence (scratch, not committed): `upg/{seed,read,cont,diff}.js`, `before/after/restored.json`,
`diff-before-after.txt`, `serve-{024,030,restored}.log`, `schema-{024,030}-*.sql`.

### 3.8 ✅ The exporter — more comes across, and nothing that came across stops

**Method.** Both exporters built from source the same way (esbuild, CJS, one bundle each, into
scratch): v0.2.4's from `git archive v0.2.4` of `nodegx-export`, `nodegx-project-contract`,
`nodegx-module-inject`, `nodegx-core`, **with `@nodegx/*` aliased to the archived copies** —
`node_modules/@nodegx/*` are links into the checkout, and `project-contract` did change (the
trap s3's old-backend recipe names). Identity control: HEAD's `--ring-width`
token appears in HEAD's bundle (2) and **not** in v0.2.4's (0). ⚠️ The repo's own
`packages/nodegx-export/dist/` is older than its source (built 09-21 20:36, `src` last committed
20:47) and was **not** used. Then `export --dry-run` over the **217 NodeGX-format projects**, and a
real export of every project whose refusal count rose, diffing `EXPORT-REPORT.md` and the emitted
source.

| reading, 217 projects | v0.2.4 | HEAD |
|---|---|---|
| export complete (exit 0) | 57 | **62** — 5 move 4→0, **none** moves 0→4 |
| something left out (exit 4) | 156 | 151 |
| export cannot be prepared (exit 2) | 4 | 4 — the **same** four, the same error (below) |
| refusals, summed | 18,272 | **18,157** — 18 projects fewer, 196 equal, 3 more |
| a refused node HEAD refuses that v0.2.4 did not | — | **0** (parser armed: 348 refused node ids read at HEAD across 98 projects; 1 refused on v0.2.4 is translated now) |

**The three whose count rose — each one a thing v0.2.4 already lost, now reported:**

- *STY-007 After Drive* (+2): `flexGrow` / `flexShrink` on `hdTitle` — v0.2.4's `Header.tsx` and
  `Header.module.css` contain **neither** (grep 0) and its report called the component *"translated
  with nothing left over"*. HEAD's report names them.
- *rocket-school* (+2): the wires `rtIn.burstA/B → rtTrack.burstA/B` (a Component Input signal into a
  kit node's signal). v0.2.4 passed the callback through to a kit prop the kit runtime **could not
  pulse** — `99522fd72` (GAM-017): *"nodegx export dropped the wire for both ways a kit declares a
  signal … the kit runtime had no way to pulse a node"*, its spec 5 red before the fix. GAM-017 fixed
  handler-driven triggers; this route is still not wired, and is now **said**. ⬜ a P18 row, not
  this phase's.
- *members area Richard test* (+1): `parameter _variant … has no style/content mapping — dropped` —
  the inert marker of §3.4, reported by the new Look path (the same export now also resolves the
  node's Look into CSS, which v0.2.4 did not). Loses nothing; ⚠️ noise the exporter could skip
  (`PRESET_MARKERS` in `looks.ts` already names the two markers).

⚠️ **Pre-existing, found on the way, not an upgrade row:** `Cannot access 'snapActionList' before
initialization` stops the export outright on *Landing page test V2* and three copies of it
(*TVW-001 Slice4 Drive*, *UPG-001 TextStyles Drive* and its `.before-0.3`). It reproduces on the
repo's own ESM `dist/cli.mjs`, so it is not my bundling, and on v0.2.4, whose `plan.ts:15351`
declares `snapActionList` as the same `const` HEAD has at `:15450` — **called at `:12613`,
`:12810` and `:13011`, all above it; one of them runs before the `const` is reached.** ⬜ P18's to fix; filed here so nobody re-finds it.

**Decision: no migration, no break note.** *What's new* can say more of a project now exports.

## 4. The remainder — ✅ every class measured (s6, 2026-09-23)

1. ✅ **§3.4's drive → CLOSED without one** (§3.4): the marker is read by nothing at render time in
   either release, so there is no rendering difference for a drive to find. 28 nodes / 14 projects.
2. ✅ **The port class → §3.2** (catalog diff: 0 ports, 0 types, 0 defaults, 0 enum lists removed).
3. ✅ **Validator rules added in this window → §3.3** (5 codes, all `warning`; 0 error arms added).
4. ✅ **MEASURED 2026-09-23 → §3.6.** A 0.2.4 SQLite backend started on HEAD loses no rows; one
   break (3.6a, idempotency) and one ruled wire change (3.7). ⚠️ The **Postgres** path
   (`migrate --to`) is new in 0.3.0 and has no 0.2.4 population to break — it is P97's, not a row.
5. ✅ **The exporter → §3.8.**
6. ✅ **§3.5's corpus count → §3.5** (both validators, 217 + 456 projects: 0 real projects red).

**Evidence (scratch, session-local, not committed):** `full.ts` (both validators, one harness,
`<root>` argument), `diff.js`, `np.ts`, `exp.sh`, `build024.mjs` / `buildhead.mjs`, `v2all.txt` (the
217), `dirs.txt` (the 456), `v2-{head,v024}.json`, `full-{head,v024}.json`, `exp-{head,v024}/`,
`realexp/`. 🔴 **The 217 list is `find … -name nodegx.project.json`; UPG-003's corpus list was built
from `project.json` and holds only 22 of them** — a census of 0.2.x projects must start from the
NodeGX file.

## 5. Acceptance criteria

1. Every class in §4 is measured and lands in §3 with a verdict and a named decision, or is struck
   with the reading that struck it. **No class is left carrying `⬜ never measured`.**
2. Each row says **what was read** — a command, a file and line, or a drive with shots. A row whose
   evidence is a commit subject does not count. 🔴 A row asserting an **absence** carries the
   known-firing control that proves the instrument was armed
   ([[assert-an-absence-with-a-known-firing-signal-beside-it]]).
3. **Person-verifiable:** Richard reads §3 alone and can say, for each row, whether it needs a
   migration, a note, or nothing — without opening the diff.
4. The table is the single source UPG-003 and UPG-006 read from. Neither restates a break in its own
   words; both link to the row.
5. Demonstrated honest by its own method: the census names at least one thing the 427 commit
   subjects do **not** say, and at least one thing they say that turned out not to be a break.
   (**§3.3 already satisfies the second half** — `feat … fails the project validator` reads like a
   break and is a warning.)

## 6. Out of scope

- **Fixing anything.** A row's fix belongs to the task the row creates. This file measures.
- **The P86 port-rename debt** (§3.2) — older than this release.
- **Pre-NodeGX / Noodl 2.x imports.** The compatibility policy waives them and this phase does not
  un-waive them. The population here is **0.2.x NodeGX projects**, which the policy explicitly does
  **not** waive.
