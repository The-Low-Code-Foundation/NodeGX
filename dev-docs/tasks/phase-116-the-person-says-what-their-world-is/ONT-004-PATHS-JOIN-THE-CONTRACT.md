# ONT-004 — Paths join the contract

**Opened 2026-10-08.** **Depends on R3.** Can start beside ONT-001. **Status: 🟡 built s4 (2026-10-08, Fable 5.1) — AC1, AC3, AC4 ✅; AC2 not met as worded, owed to ONT-008 (§6.4).**

> **Model check, before anything (Richard, 2026-10-08):** this task wants **Fable 5.1 for the operation's semantics and the capability cells; Opus 5.5 for the per-adapter build** — a cell marked supported without proof is the gate hole memory keeps finding; the adapter work is graded by the suite. Your system prompt says which model you are. If it is not the one named here, stop before any work and say so in one line ("this task is marked for Fable 5.1; you are on <model> — switch with /model, or say go"), and wait for Richard's word. Do not start on the wrong model because the check felt like a formality.


## 1. The person sentence

> **I can ask for "the members on my account's companies" and get them, and if a backend cannot answer that, it says
> so before I build on it.**

## 2. Why

README §1 readings 2 and 6. The contract follows one link (`relatedTo`, a Parse shape); Acme's account-holder
permission is four links deep, and its most-used filter is three. A person's question is a path. Today every such
question is answered in application code after fetching too much, which is where Acme's dashboard answers them.

## 3. What to build

1. **The operation.** `traverse(handle, options)` as the fifteenth data method, or a `path` operator in the neutral
   filter model, whichever BCN-001's extraction rule allows (the method was extracted from `cloudstore.js`; this one is
   designed, and the README must say so). Options: a start (a collection and a filter), a list of hops (a Link, a Links
   or a junction, each with an optional filter), a depth bound, and what to return (the end rows, or the paths).
2. **The capability cell.** `traverse` in `capabilities.ts` with the four states; every descriptor gets the cell with
   evidence. The built-in adapters prove it; the others start `conditional`.
3. **The relational answer.** SQLite and Postgres through recursive common table expressions in the built-in backend's
   query builder; depth-bounded; the emitted SQL is not asserted, the rows are (BRG-003 §3.3's rule).
4. **The fixtures.** Acme's four paths from README §1 reading 6 on a synthetic schema of the same shape; the deepest
   is the permission rule, written as a *who can see this record* rule in P104's words.
5. **The person's sentence.** A path has a sentence form ("the members on my account's companies"); the projection
   (ONT-003) compiles a relation chain in the ontology to the operation, and the manager's filter builder gains it as
   one row kind.

## 4. Acceptance criteria

1. The four Acme-shaped paths return the right rows on SQLite and Postgres through the conformance suite, with a
   mutant per path (a hop dropped, a filter dropped, the depth bound ignored) that fails.
2. A backend whose cell is `unsupported` makes the manager's path row disabled with the reason shown, as every other
   gated port.
3. The permission rule at depth four is enforced by the backend, not by the dashboard: a request as the wrong account
   holder gets nothing.
4. The contract README's method count and the capability key count are updated and the hex and TSFixme ratchets are
   unmoved.

## 5. Watch for

- **Count the request, not the node** (memory). One traversal is one request; a fixture that passes by issuing four
  requests is wrong, and the world's BACKEND seam (NSP-014) can see the count.
- **A whitelist gate is blind to a later node class** (memory). The security model's rule vocabulary is `public`,
  `authenticated`, `nobody`, `role:<name>`; a path rule is a new shape and SEE-012 must learn it.
- **Depth without a bound is a denial-of-service shape.** The bound is mandatory in the options type.

## 6. Built

**s4, 2026-10-08, Fable 5.1 (the semantics and the adapters in one session).** The path is a filter operator, not a
fifteenth method. It is proven on SQLite and PostgreSQL by the conformance suite, compiled from a person's sentences by
the world package, and enforced as a permission rule by the backend inside the same SQL as the row ACL.

### 6.1 The decision the task left open: an operator, not a method

§3.1 offered `traverse(handle, options)` as a fifteenth data method, or a `path` operator in the neutral filter model,
"whichever BCN-001's extraction rule allows". The rule: the fourteen methods were *extracted* from `cloudstore.js`,
not designed; the filter model is "the one part of the contract that is genuinely named here rather than transcribed".
A path is therefore an **operator** (`filter.ts` `path`, the 32nd), and the method count stays fourteen. Three
things follow, and each was measured rather than argued:

| consequence | measured by |
|---|---|
| **It composes.** The end rows take sort, limit, `count`, `include` and the row ACL for free; a count agrees with the rows | `paths/composes-with-the-rest-of-the-query` |
| **A rule is the same operator.** "An account holder sees the members on their account" is `{ path }` ANDed into the query's ACL predicate, in one statement — the request is counted once | `tests/ont-004-rule.test.ts` |
| **The gate exists already.** The per-operator capability cell, `filterGateFor`, the translators' refusal — `path` gets all of it with one cell per descriptor | `tests/translators.test.ts` sweep, 6 × 32 |

What was given up: *"what to return (the end rows, or the paths)"* — an operator keeps rows; the route a row was
reached by is a second question. Recorded, not built.

### 6.2 What it is

| piece | where | what it does |
|---|---|---|
| the operator | `nodegx-backend-contract/src/filter.ts` — `PathFilter`, `PathHop`, `MAX_PATH_DEPTH = 8`, `pathProblem()` | A start (a collection and its rows), hops in order, a mandatory bound. A hop is `{ follow }` (a Link, Links or list on the current rows) or `{ from, by }` (the same edge read backwards), each with an optional `where`; one hop may `repeat`. The five semantics in its docblock are the five the suite pins |
| the translators | `src/translators/` — `walk.ts`, `types.ts`, `translate.ts`, the five dialects | `path` is a top-level node; the Parse-wire dialect writes `$path` with nested `where`s translated in the same dialect (`ctx.translate`); the other four refuse by name. The sweep test now covers 6 × 32 |
| the cells | `src/descriptors/*` `filters.path` | nodegx **supported** (evidence: the suite on both engines, ceiling 8); parse, directus, supabase, pocketbase **unsupported** with the sentence a person sees and the BCN-005 measurement (one hop driven, deeper not) that would flip it; custom unsupported (declare it) |
| the engine | `noodl-runtime/src/api/adapters/local-sql/QueryBuilder.ts` `buildPathSelect` | Fixed hops nest as id subqueries; a repeated hop is a `WITH RECURSIVE` with a depth column, bounded by a parameter and deduped by `UNION`. The caller's row ACL (`buildAclPredicate`) is applied at **every hop**. Links go through the junction, lists through `json_each` / `jsonb_array_elements_text` (forwards only — backwards is refused in the kind's words). Both dialects, one text; the rows are asserted, never the SQL (BRG-003 §3.3) |
| the lookup | `LocalSQLAdapter._pathLookup`, `PostgresAdapter._pathLookup` | What a path may learn about another collection: its declared columns (a Pointer's target) and the columns it has. Passed on every read and write builder |
| the suite | `conformance/cases/paths.ts` — area `paths`, 14 cases | The four census paths (depth 1, 2, 4, 5), dedupe, the hop filter, the start filter, a Links both ways, a list forwards only, a tree to its bound, a cycle, **the ACL at every hop**, composition, and seven refusals by name. 78 cases now; green on SQLite and PostgreSQL |
| the mutants | `conformance/mutants.ts` — `path-ignores-the-start-filter`, `path-ignores-hop-filters`, `path-ignores-the-depth-bound` | Each caught on both engines by a different set of cases (12, 2 and 1); none reds the whole suite |
| the rule | `nodegx-backend/src/security/model.ts` — `PathRule`, `ruleNarrowing()`, `AccessDecision.narrow` | `{ "path": { "hops", "maxDepth" } }` is a rule atom beside `role:<name>`, OR-ing with them; allowed on `find`, `get`, `update`, `delete` of a collection and refused by name on `create`, functions, files and signup. A signed-in caller is let in **narrowed** to what the path reaches from their own `_User` row; an anonymous caller is refused |
| the enforcement | `StorageAclOption.only`; `security/state.ts` `aclFor`; `HttpServer.ts` (`ctx.acl(access, collection?)`); `QueryBuilder.buildAclPredicate` | The narrowing rides **inside the ACL option**, scoped to its collection, and is ANDed into the same predicate as the keys — so every read and write that passes the ACL applies it (fetch, query, count, distinct, aggregate, search, update, delete), and `include`d records of other collections are not narrowed by this collection's rule. Routes that declare a collection need no edit; the two that check per item (`/api/_batch`, `/mcp`) name theirs |
| where it cannot apply | `realtime/RealtimeHub.ts`, `realtime/filter.ts` | A subscription on a collection whose `find` rule narrows is **refused with the reason**; `$path` in a subscription filter is refused like `$relatedTo`. The Supabase export refuses a path rule by name (`CANNOT_CROSS`), as it does a role |
| the manager | `admin/app/ruleVocabulary.ts`, `permissionsModel.ts` | A path atom survives the permissions page's read-patch-write verbatim (it used to become the text `[object Object]`, which the backend would then refuse — every save would have failed while one existed) and is named *"Whoever reaches it (through 6 links)"*. The dry run (`POST /admin/permissions/check`) answers `narrow` |
| the sentence | `nodegx-project-contract/world/paths.ts` — `worldPath()`, `worldRule()` | A sentence (a noun to start from, relations along, `back` where the sentence reads a relation from its far end, `all` for a tree) compiles to the operator by reading the projection back: each column now carries the `relation` that made it (`WorldColumn.relation`; left behind by the write). A record of its own is two hops; a Links one; a list forwards only; a kind with no link is refused in words. `worldRule()` prefixes the hop from the login the projection made |
| the fixture | `tests/fixtures/world-membership/` | The membership business's shape in the vocabulary (R6: synthetic): six nouns, nine relations, 26 claims (11 held, each failing on its mutant; 15 measured not held) on both engines through ONT-003's spec |

### 6.3 What it measured

| spec | on | result |
|---|---|---|
| `brg-003-conformance-sqlite`, `brg-005-conformance-postgres` | both | 78/78; 12 mutations each caught by a different set |
| `ont-004-world.test.ts` — the four sentences and the other link shapes, compiled by `worldPath()` | both | 6/6 cases; each of the three path mutants caught |
| `ont-004-rule.test.ts` — the rule on a locked backend over HTTP | SQLite service | 8/8: the holder of two accounts sees `[ann, bob]`, the other holder `[cy]`, a member `[]`, a person on no account `[]`, anonymous 403; `where` and `count` compose (the wrong holder naming bob gets 0); `get` and `update` of a person out of reach are 404; the admin sees everyone; the dry run says `narrow` |
| `nodegx-project-contract` `paths.test.ts` | — | 12/12: the four census paths' hops, every link shape, nine refusals by name, the rule from the login |
| neighbours | — | contract 199/199 (6 × 32 sweep); runtime builder and adapter specs 159/159; backend security, realtime, permissions, manager specs 72/72; ONT-003 claims on three worlds, both engines, 34/34 |

**The rule's depth.** From the person it is four hops (README §1 reading 6); from the login, through the `happened-to`
record that carries `doneBy`, six. `MAX_PATH_DEPTH` is 8, so the deepest real rule on this machine fits with two to spare.

### 6.4 The acceptance criteria

1. ✅ **The four paths on both engines, a mutant per path.** `paths/*` (contract) and `world/*` (from the sentences):
   depth 1, 2, 4 and 5 return the right rows on SQLite and PostgreSQL; the start filter dropped, the hop filters dropped
   and the depth bound ignored each fail, on both.
2. ❌ **Not met as worded — owed to ONT-008.** The gate is built: `filterGateFor(type, 'path')` answers *unsupported*
   with the descriptor's sentence on five of six backends, exactly as for every other operator. The **row** is not: the
   backend manager's filter rows (`admin/app/filters.ts`) and the editor's builder are field-keyed, and a path row
   (a start, hops, a bound) is a different control. P116 names the data manager (ONT-008) the home of "a path has a
   sentence form"; the row is listed there. Until then a person writes `$path` in *Advanced (JSON)*, which the
   manager already keeps verbatim.
3. ✅ **The permission rule is the backend's.** `ont-004-rule.test.ts`: a request as the wrong account holder gets
   nothing, through every read shape and the write shapes, with the narrowing compiled into the same SQL as the ACL.
4. ✅ **Counts and ratchets.** The contract README says fourteen methods (unchanged, and why), 32 operators (was 31),
   27 keys (unchanged — a path is an operator, so its cell is a filter cell); `tsfixme-ratchet.js` and
   `hex-color-ratchet.js` hold the line; `ontology-census:check` green.

### 6.5 Decisions this session made

| left open | decided | why |
|---|---|---|
| method or operator | **operator** | §6.1 |
| the paths, or the rows | **the rows** | an operator keeps rows; the route is a second question |
| the ACL on intermediate hops | **applied at every hop**, the keys only; a rule's narrowing applies to the end rows alone | a row the caller may not read is not there for any purpose; repeating the narrowing on a hop through the same collection would recurse |
| a text field holding ids (every relation in the in-repo corpus) | **followable, with `to` said**; refused without | the adapter cannot guess what a text column names, and must not |
| a list (`many-by-list`) backwards | **refused, in the kind's words** | the kind says "nobody can ask the list the other way round"; the product keeps the kind honest |
| a repeated hop's bound | `maxDepth` minus the fixed hops; **one repeat per path** | one number, mandatory, and a total that cannot be exceeded |
| where the rule's narrowing travels | **inside `StorageAclOption` (`only`)**, scoped to its collection | the one seam every reader already passes; a reader that forgets the ACL is already a breach the suite catches |
| a `_User` start the world does not name | `worldRule()` takes the login hop explicitly | which link is "the person who signs in" is ONT-002's question, not something to guess |
| the `owned-by` kind's `path: true` answer | **unchanged**: a flag, not the chain | the kind records that a chain exists; the chain is a sentence `worldRule()` compiles. ONT-002 asks for it |

### 6.6 Found, for other tasks

- **ONT-008:** AC2's path row (§6.4). The manager's rule words and the dry run's `narrow` are ready for it.
- **ONT-002:** the conversation owes two questions: "which link is the person who signs in?" (for `worldRule`), and,
  when `owned-by` answers `path: true`, "through what?" (the chain as a sentence). **Both built:** `signsIn` (s6) and
  `relations[].through` with `ownerRule()` (s14, ONT-002 §6.7).
- **ONT-005:** `path-ignores-hop-filters` is the mutant of "as holder": a rule written without its narrowing step
  grants a member what a holder should have. It is executable now.
- **Not measured, worth measuring:** an `include`d record is read with the caller's row ACL and never its collection's
  `find` rule — pre-existing, and independent of paths (the narrowing is scoped so as not to make it worse). A finding
  only once a spec shows it; filed nowhere yet.
- **Realtime:** a collection with a path rule cannot be subscribed to. The honest state today; a matcher that follows
  a path on a change frame is a later task.
- **Parse, Directus, Supabase, PocketBase:** each has a native spelling for a path (nested `$inQuery`, deep filters,
  embedded `!inner` chains, dotted filters) measured one hop deep in BCN-005. A translator per backend plus a live
  drive flips the cell; until then the person is told before building.
