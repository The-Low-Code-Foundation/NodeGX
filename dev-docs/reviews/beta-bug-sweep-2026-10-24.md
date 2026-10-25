# The Beta bug sweep, 2026-10-24 (next session reads this)

Richard asked for the outstanding bugs worth fixing before the Beta (his definition, 2026-10-23: someone like him
builds a simple app in Studio, edits workflows and the DB, privacy rules, road tests it, deploys to a VM). The ledger
had 219 open rows; about 20 sit on that walk. This session fixed 10 and ruled one (Richard: P123-S6-CREATOREDITS (a)).

## Done: built, and how far driven

| row | commit | built | driven |
|---|---|---|---|
| P123-S6-CREATOREDITS (ruled (a)) | e67148acd, studio ba52c0f | `"creator"` rule value (find/get/update/delete), agent wording, the map's and Studio's "Only the person who made it" | backend on a real server (12 tests, mutant 6 red); Studio Privacy only through `check:data` with the OLD pinned map (the new choice appears once `@nodegx/backend-map` and the backend are released) |
| P125-PUPPY2-RENDER1MB | 2d0fe7534 | harness image budget; `render_report` passes 600,000 | on copies: Muddy Paws 1,514,102 → 266,044 bytes, Puppy Rerun 1,048,018 → 225,498; NOT in Claude Desktop yet (needs a `noodl-mcp` dist rebuild from a clean worktree, and the `.mcpb` pins 0.2.6) |
| P125-CCN002-SWIFTARGSNEVER | 2d0fe7534 | `args: string[]` | `noodl-mcp` and `nodegx-export` tsc clean |
| P107-S83-SENDFORM | e61dbbf6a | `Outputs.x.send()` is a signal (both reader copies); Function spec v3 | spec golden + parity; runtime conformance green but see trap 1 |
| P121-TWO003-LOGINSUCCESS | 6cf8857ae | example text + enriched catalog | `catalog:merge:check` up to date |
| P112-S13-SECRETPATH | 3adf25bf3 | Error names the Secrets page and env var, path to the log | backend tests 16/16 |
| P121-TWO005-ACLNULL | 3f806139e | `ACL: null` on a row with an ACL is a 400 in words | backend tests 4/4 + 52 neighbours |
| P125-CCN006-AGENTPILL | studio ba52c0f | pill reads `/__nodegx/status` first | headless drive, direct vs a stand-in proxy; `check:editor` 204/204 |
| P112-S11-FORMATSKEW | b2ba0320a (closed by release) | regression `noodl-mcp/tests/p112FormatSkew.test.ts` | — |
| P112-OWN026-CONFIGFOUROHFOUR | 8e41f673f | preview answers `{}` | preview tests 35/35 on a rebuilt dist |

Filed while fixing: **P123-S6-PATHNOTABLE** (a path rule through a collection with no table throws in the SQL and logs
a save error; still refuses), **P112-OWN026-FIX03GOLDEN** (`golden.js --check` red on four specs at HEAD).

**Not pushed:** OpenNoodl (cline-dev) and nodegx-studio (ba52c0f). Ask Richard. **Not released:** everything above
reaches a stranger only with the next `@nodegx/mcp`, `@nodegx/preview`, `@nodegx/backend-map` and the backend.

## Next, in order (the Beta list, not yet touched)

1. **P124-S1-DOORREFUSALUNSEEN** — a privacy-rule refusal leaves no run and no audit row: road testing rules sees nothing.
2. **P116-S17-DOTTEDFILTER** — a filter on a linked record's field returns no rows, no error (runtime QueryBuilder).
3. **P121-TWO003-SCRIPTCOMPILE**, **P121-TWO005-NEVERRUNS** — the door writes a Function that cannot compile / never runs, silently.
4. **P112-OWN023-FILEURLHOST** — uploaded file URLs stored as `127.0.0.1`: break on a VM. Then **P112-OWN024-DEPLOYNOSHARP**, **P112-S14-MOVEDDEPLOY**.
5. **P123-STU030-SIGNALCAUSE** (the run timeline's cause is 0), **NPMAUDIT-BACKENDMAPSCREENS**.
6. Cheap: **P112-OWN008-AUDIT** (npm audit highs on install). **NPMAUDIT-SERVERINFO** is a build decision: the
   editor's version is stamped in on purpose (`__NODEGX_APP_VERSION__`); `@nodegx/mcp` needs its own at prepack.
   `server.ts` had a peer's open edits (CCN-008 mini editor) this session.
7. **P26-SKELSHIP stays open on purpose**: `deploy_to_vm` refuses (b6e1c2d66); `nodegx deploy`, Studio's Publish and
   the visitor wording are left (the row says so).

## Traps met (read before repeating them)

1. 🔴 **The runtime's node-spec conformance does not grade the runtime's own Function port reader.** Its target seeds
   the model's ports from the SPEC package's copy, so a mutant in `@nodegx/project-contract/function-ports.ts` alone
   stays green there. The parity test (`nodegx-node-spec/tests/function-ports-parity.test.ts`) is what holds it.
2. `golden.js --diff` matches scenarios by name: a renamed scenario reads "No golden trace moved" though its trace did.
   Read the golden file's diff.
3. Plain `grep` skips `nodegx-backend/src/server/HttpServer.ts` as binary: `grep -a`.
4. A ledger `regression:` is a path, then an optional `"quoted name"`; parentheses after the path break `bugs.js check`.
5. A render test page must set `settings.bodyScroll: true`, or the page is clipped at one screen and nothing is tall.
6. The harness's first Chrome inside jest once failed "never opened a debugging port" and passed on the rerun (load).

## Gates read (2026-10-24, cline-dev after 8e41f673f)

nodegx-backend: 14 security suites 261/261, creator 12/12, ACL null 4/4, secrets 16/16, tsc clean · noodl-mcp:
toolDisclosure + backendTools + own026GroupWrite 58/58, render suites 88/88, p125Render1mb 6/6 (Chrome), tsc clean ·
node-spec: golden + parity 24/24; `golden.js --check` 8 problems, all P112-OWN026-FIX03GOLDEN's · noodl-preview 35/35 ·
backend-map `rule-change.test.mjs` all passed · Studio `check:data` 80/80, `check:editor` 204/204.

---

# Session 2, 2026-10-25 (next session reads this first)

Picked up "Next, in order" above. Six rows fixed, two new rows filed, one stale test repaired; items 4 and 6 need
Richard. **Not pushed, not released**, same as session 1.

## Done

| row | commit | built | graded |
|---|---|---|---|
| P124-S1-DOORREFUSALUNSEEN | f4be95651 | audit action `access.denied` on every RULE 403 at the door (collection, function call rule / key scope, files, signup): principal, actor, address, target, op, rule, reason, request id; 20 per caller per minute, `notRecordedBefore` after a capped minute | `tests/p124-s1-door-refusal.test.ts` 6/6 (red 5/6 first; cap mutant red) |
| P116-S17-DOTTEDFILTER | 6f070eed6 | `link.field` compiles to a one-hop `$path` (`QueryBuilder.dottedAsPath`); the facade asks the linked collection's `find` rule and hidden fields; not-a-link / two hops = 400 in words (`isFilterRefusal`); realtime refuses it at subscribe | `tests/p116-s17-dotted-filter.test.ts` 12/12 SQLite + PostgreSQL (red 10/12 hop off; facade mutant red) |
| P121-TWO003-SCRIPTCOMPILE | 12fad4b2a | rule `function-script-not-compiled` (runtime's own compile + line via `vm`), blocking for authored writes | `tests-unit/p121/function-script-and-reruns.test.ts` 6/6 (red unregistered) |
| P121-TWO005-NEVERRUNS | 12fad4b2a | rule `function-never-reruns` (warning): Run unwired, every wired input's box unticked | same file; templates corpus: 2 hits → filed **BETA-TPLNEVERERUNS** (not driven) |
| P123-STU030-SIGNALCAUSE | 7f27ccaf9 | `src/tracecause.ts`: deferred callbacks, outcome tokens and a Function's script signals carry the cause | `test/corpus/p123-signal-cause.test.ts` 4/4 (red 3/4); NOT re-measured in Studio |
| NPMAUDIT-BACKENDMAPSCREENS | b5495303d | `analyseProject` reads a page's own record nodes into `uses`; screen → table wires, screen panel lines, the person view asks the rule check per use; "A signed-in person"; README generic | `test/screens-from-pages.test.mjs` (todo template: `screens: []` → `['Pages/Todo']`, 28 uses); package `npm test` all parts but `ui.test.mjs`'s lens note, red at HEAD too → filed **P124-UILENSNOTE** |
| (P107-C162 leftover) | ce4758a1c | `fed-001-feed.test.ts` asserted the old `'KB'`, red at HEAD since dccaa77e0 | 56/56 |

## Item 4 — FILEURLHOST RULED 2026-10-25: "the backend fills the address in" (option a below); NOT built — next

- **P112-OWN023-FILEURLHOST.** Measured: the upload answers `url: <baseUrl>/files/<name>` (`server/files.ts:223`,
  base = the listen URL, `127.0.0.1:<port>` locally), and a File field is stored as JSON WITH that url
  (`QueryBuilder` File branch) and read back verbatim; nothing rewrites it on read or at deploy. So both a text
  column holding the url (arm B) and a proper File field break on a VM. Choices: (a) the backend keeps the file's
  NAME and fills in the address from wherever it is running each time a File field is read (Parse Server's way;
  fixes File fields, old rows included; a text column still breaks, so the kit says "store the file"); (b) the deploy
  rewrites `http://127.0.0.1:<port>/files/` in the copied data to the VM's address (fixes text columns too, once,
  only on that road; whether deploy copies data at all is NOT measured); (c) both.
- **P112-OWN024-DEPLOYNOSHARP, P112-S14-MOVEDDEPLOY** not touched. MOVEDDEPLOY's shape (no product choice in it):
  name the bundle by project id, carry the id in the bundle, and let a deploy replace the bundle the same project
  deployed under its old path-hash name (old bundles have no id: match by the `safeName-` prefix plus overlapping
  `#__cloud__` names). Push/replace must be one swap on the backend, or a failed push leaves nothing deployed.

## Item 6 — not cheap after all

- **P112-OWN008-AUDIT:** `fast-xml-parser` has no patched 4.x (4.5.7 is the last); 5.x is the 6-dependency 1.3 MB
  version P96 R1 ruled out for the browser budget (`noodl-runtime/src/xml.ts` header) — a ruling. `chokidar` 3 → 4
  (6.0 is latest) fits the preview's watcher (regex `ignored`, no globs), but regenerating `package-lock.json` on a
  Mac drops other platforms' prebuilts (memory: a lockfile made on a Mac) — do it with that recipe, not `npm i`.
- **NPMAUDIT-SERVERINFO**, **P26-SKELSHIP**: as in session 1.

## Traps met

1. 🔴 Backend full suite in my sandbox: split it — 252 plain files sandboxed, 49 Chrome files (`*drive*` + anything
   importing the drive helpers) with the sandbox off. Plain half: only `bmg-002-filters` "due within past7" red =
   P109-S41-SUNDAYWEEK (any Sunday). Chrome half: `rel002b` + `sbr015` (6 tests) = the known base reds.
2. Runtime `conformance.test.ts` (all specs) overruns its 30-min `beforeAll` under load and reports ~130 failures;
   grade the touched nodes with `NSP_ONLY=JavaScriptFunction,Condition` instead (green).
3. `function-contract.test.ts` plants mutants by EXACT source lines of `simplejavascript.ts`: edit a send line there,
   update its plant.
4. A `vm` SyntaxError under jest comes from another realm: read `.stack` by shape, not `instanceof Error`.
5. Editor `test:main` 11 red files are census drift (HLS-003, DEF-007, HLT-012, SEE-001, EXP-013, HLS-009, CHR-007,
   EL-009, HLT-013, HLT-021, VFN-011) — VFN-011 checked red with my runtime change made inert. Not filed this session.

## Gates read (2026-10-25)

backend plain 239/240 suites (the Sunday row) · backend Chrome 46/48 (base reds) · runtime 204/207 suites before
the two fixes, then both green; conformance by node green · editor 598/609 (census drift above) ·
`catalog:examples` 114/114 · templates `--only` the two new rules: 0 + 2 · backend map `npm test` all but P124-UILENSNOTE.

**Commits this session:** 12fad4b2a, 7f27ccaf9, ce4758a1c, f4be95651, 6f070eed6, b5495303d, and the docs commit after them.

---

# Session 3, 2026-10-25 (next session reads this first)

Built item 4 as ruled, and MOVEDDEPLOY. DEPLOYNOSHARP needs a ruling. **Not pushed, not released**, as before.

## Done

| row | commit | built | graded |
|---|---|---|---|
| P112-OWN023-FILEURLHOST (ruled a) | d10742b23 | each request carries its own address (`requestOrigin`, `AsyncLocalStorage`, `src/storage/fileAddress.ts`); `toWire` answers a File's url from its name there; upload + signed urls use it; realtime uses the LISTENER's address; a File stored elsewhere (CDN) and a url in a text field are left alone. `deploy/nginx.conf`: `Host $http_host` (keeps a port), passes an outer `X-Forwarded-Proto` on. Kit: an Upload File anti-pattern and Cloud File's `url` port. SELF-HOSTING.md: what an outside proxy must pass | `tests/p112-own023-file-url-host.test.ts` 6/6 (4 red before; 3 mutants red); `deploy-assets.test.ts` header check (red on HEAD's conf; old vs new conf measured in `nginx:1.29-alpine` with a header echo); backend plain half 226/227 (the Sunday row); `catalog:merge:check` up to date |
| P112-S14-MOVEDDEPLOY | 94d344dc8 | no rename: both doors push `projectId` with the bundle (outside its fingerprint); `WorkflowRunner.loadWorkflow` replaces in the same swap a bundle that is this project's (same id, or no id + same name before the hash + a shared component) and removes its file; any other clash is a 409 naming the bundle | `tests/p112-s14-moved-deploy.test.ts` 5/5 (all red before; 3 mutants red); `hls-013/cloudDeployCore` 15/15; backend workflow/deploy suites 34/34; MCP deploy suites 5/5. Driven: scratchpad MCP bundler + `deployCloudBundle` + a backend from source on `d40-wizard-drive` and a copy; renamed copy: the id replaced it, the no-id control refused |

## For Richard: P112-OWN024-DEPLOYNOSHARP is on the Beta's road too

Read, not driven: `deploy_to_vm`'s folder ships `backend/cli.js` with no `sharp`, and `provision-app.sh` installs
nothing, so thumbnails answer 501 on a VM (marketplace photos broken). Either (a) the provision script installs
`sharp@0.33.5` on the box at each ship (needs npm and network there), or (b) every folder carries Linux prebuilds
(33 MB for x64 + arm64, measured from npm). The row has both.

## Next

1. The DEPLOYNOSHARP ruling, then build it.
2. MOVEDDEPLOY leftover: the MCP tool's result does not say what was replaced (the backend answers `replaced`).
3. FILEURLHOST leftover: a File nested in an Object or Array column keeps its stored url.
4. Items 6 and 7 from session 2 stand (OWN008-AUDIT ruling, SERVERINFO build decision, SKELSHIP engine half).
5. None of the 18 rows reaches Desktop or npm until a dist rebuild from a clean worktree and a release.

## Traps met

1. 🔴 zsh does not split `$L` holding a list of test files: jest got one pattern and ran **0** suites with exit 1.
   Use `${=L}` (command substitution `$(…)` does split).
2. `nginx` `$host` drops the port; `$http_host` keeps it. `X-Forwarded-Proto $scheme` overwrites an outer proxy's `https`.
3. An esbuild bundle of backend source needs `--loader:.html=text` (the admin UI is `require`d) and, run from the
   scratchpad, `NODE_PATH=<repo>/node_modules` for its externals.
4. `hls013-deploy-cloud-functions` runs against the BUILT `dist/cloud-bundle.cjs` and the backend's `dist/cli.js`:
   green there says nothing about source. Build the bundler into the scratchpad (`node build-cloud-bundle.mjs <out>`).

---

# Session 4, 2026-10-25 (next session reads this first)

Richard ruled DEPLOYNOSHARP (the server fetches sharp once), and it is built and driven. Then the session-3
leftovers and four of the sweep's filed rows. **Not pushed, not released**, as before.

## Done

| row | commit | built | graded |
|---|---|---|---|
| P112-OWN024-DEPLOYNOSHARP (ruled) | 5490a6677 | `provision-app.sh` fetches sharp 0.33.5 (the lockfile's) with npm into `/opt/nodegx-native/sharp-0.33.5/` once per server, keeps it only if it loads, unit `NODE_PATH`; no npm / offline / does not load → the ship carries on and says `photos: NOT AVAILABLE` with npm's reason. `Dockerfile.backend` installs it into `/app`. `docs/runtime/BACKEND-FILES.md` | `tests/p112-own024-deploy-sharp.test.ts` 7/7 (the script's own block run under `set -euo pipefail` with a stand-in npm), 5 mutants red. Driven in the DEP-002 throwaway VM: `?thumb=md` 501 → 200 at 256 px; reship and a second app fetch nothing; offline and no-npm exit 0 and 501. Image built, 200 (501 with its modules hidden) |
| P112-S14-MOVEDDEPLOY leftover | a069d61f2 | `CloudDeployResult.replaced` through the core and both transports; `deploy_cloud_functions` leads `next` with what it replaced | `p112S14ReplacedNote` 3/3, `hls-013/cloudDeployCore` 18/18, 3 mutants red |
| P112-OWN023-FILEURLHOST leftover | 3b70b7c57 | `addressFile` walks Arrays and Objects (copy on write, 32 deep), reads and live updates | `p112-own023-file-url-host` 7/7 (red 2/7), 2 mutants red, file + realtime 13 suites |
| P123-S6-PATHNOTABLE | ec886ad3d | a rule's narrowing compiles a path through a collection with no table to an empty select (params taken back); a person's own `$path` still refused by name. Measured worse than filed: lists were **500**, the maker's too | `p123-s6-path-no-table` 8/8 SQLite + PostgreSQL (red 3/4), 3 mutants red, 18 security/path suites 233, conformance 34/34 |
| NPMAUDIT-SERVERINFO | fc3c5cba8 | `build-common.mjs` `reportedVersion()`: a `prepack` build stamps `@nodegx/mcp`'s own version, any other the editor's | bundles built to the scratchpad: `initialize` → 0.2.6 / 0.4.3; `npmauditServerInfo` 4/4 |
| BETA-TPLNEVERERUNS | 036c2ea20 | members-area `firstLine` re-runs on body; the training demo's builder drops `sr_fail` and `ls_finish_failed` (no stand-in can start them), demo regenerated (control: HEAD's builder reproduced it byte for byte) | `function-never-reruns` over every template 0 (2 before); each template's warnings drop by the target only; `check-demo` OK. Not rendered |
| P124-UILENSNOTE | 9e520abe1 | the map drive waits for the measured "not signed in" lens and asserts the measured sentence | `ui.test.mjs` all passed; map `npm test` "Everything passed" |

## For Richard

1. **Push and release.** 23 rows across the four sessions are on cline-dev (+ studio ba52c0f), none on npm or in
   Desktop. They reach a person only with a dist rebuild from a clean worktree and the next `@nodegx/mcp`,
   `@nodegx/preview`, `@nodegx/backend-map` and backend.
2. **P112-OWN008-AUDIT, measured:** the only advisory against `fast-xml-parser` 4.x is in `XMLBuilder` (the XML
   writer); nothing in the repo calls it, only `XMLParser`. Moving to 5.x is 1.3 MB / 6 packages and changes the pin
   every exported app carries (`nodegx-export` `PARSE_DEPENDENCIES`). Recommend: stay on 4 and say why in the row.
   The `chokidar` 3 → 4 half is mechanical but regenerates the shared `package-lock.json`: the Mac-lockfile recipe,
   in a session that owns the lockfile.

## Next

1. The two items above.
2. P26-SKELSHIP's engine half (`nodegx deploy`, Studio's Publish, the visitor wording) stands.
3. P112-OWN026-FIX03GOLDEN belongs to the OWN-026 lane (its Mistral run was live this session), not this sweep.

## Traps met

1. 🔴 Thumbnails are cached by content hash (`<data>/files/thumbs/<hash>`): a probe that uploads the same image
   every time reads 200 after sharp is gone. Upload a fresh image per probe.
2. 🔴 `var=$(… | grep …)` under `set -euo pipefail` EXITS when grep matches nothing. Every such substitution in a
   provisioning script needs `|| true`, and a test that runs the block under the script's own flags.
3. The first `docker cp` into a freshly booted systemd container lost files twice (`lchown … no such file`,
   MANIFEST missing); the second copy is fine. An instrument fault: the script refused correctly.
4. macOS has no `timeout`; a test that runs the provision block stubs it.
5. `addressFile` is called on every Object/Array field of every read now; a pathological value is bounded at 32.

---

# Session 5, 2026-10-25 (next session reads this first)

Session 4's list was down to items that wait on Richard, so this session took the next Beta-walk rows from the ledger
(`node scripts/bugs.js`): deploy, workflows, the DB from a function, bound keys. Seven fixed, two filed. **Not pushed,
not released**, as before.

## Done

| row | commit | built | graded |
|---|---|---|---|
| P112-S14-KITROOTDEPLOY (high) | 8d97498cd | the hierarchy rule answers a root its catalog cannot resolve (a kit's node) from the file's recorded `visualRoots`, as the export does (GAM-014); `NormComponent.visualRoots` from both loaders. A module's logic node, recorded nowhere, still refused | GAM-014 5/5 (red 5/5 at HEAD on a fresh dist), preview 101/101, nsp-021 11/11 (mutant red; nightbook keeps 26 + 26 — "every unresolved root is unknown" was tried first and lost 3), validator specs 184/184 |
| P121-TWO003-CLOUDPOINTSTO | 2a692b8e0 | `_noodl_cloudservices.collections()` (live `exportSchemas`); `queryutils.schemaFor` asks it only in the cloud runtime and only when its own metadata lacks the collection | `p121-two003-cloud-points-to` 3/3 (red 2/3 in the row's words; service mutant red), function specs 39 suites 454/454 |
| P18-S134-REFUSEDFILTERSENDS | d086cfe1d | `records.js` `whereFor`: a refused filter rejects and the store is not asked (query, count, distinct, aggregate) | runtime spec 8/8 (red 4/4); the export spec's pins moved (A7, B2's mask gone, B3) 35/35 |
| P124-S1-WRITESRECORDSJS | eaf767388 | `graphWritesRecords` reads a script's writing `Records` call; the editor door reads the same list (a copy, held by the DEF-009 parity spec) and names the call | DEF-009 16/16 (a public script writer gets 60/min burst 30; mutant red 2), door 14/14; training template 0 → 8 of 27 write |
| P124-S2-ACTSASHTTP | 98785a116 | `server/actingSession.ts`: one `sessionForActingKey` for `/mcp` and `POST /functions/<name>`; a bound key's function runs as its person on both | fed-005-mcp-acts-as 13/13 (two mutants red), 44 suites 566/566; `BACKEND-ACCESS-CONTROL.md` says so |
| P107-S97-NULLBODY | 3bf2a53a5 | where a contract runs, a body that is not an object names no fields: Required → the 400, none → runs. No contract: untouched | CWF-014 59/59 (mutant red); spec v2 + `changes`, scenario renamed + a Required twin, golden read by hand; conformance on the cloud target green |
| P112-OWN023-DEPLOYLOOPBACK | 469b14e03 | static deploy: `localBackend` in the outcome, the sentence in `warnings`, a stderr line; full-stack untouched | 3/3 on a rebuilt dist (mutant rebuilt, red 2/3), preview 104/104 |

Filed: **P18-S134-STRINGREJECT** (a refused Records filter rejects with a bare string on both arms, so `e.message` is
undefined in a script; the export matches it on purpose, lane 4 paused), **P124-S1-WRITESHELPER** (four training
functions write only through `/#__cloud__/shared/Thread`; none public, so the default is unaffected).

## For Richard

1. **Push and release**, as session 4 said: 30 rows now. The preview's `dist/` was rebuilt here (KITROOTDEPLOY,
   DEPLOYLOOPBACK); Desktop and npm still have neither.
2. **DEPLOYLOOPBACK: warn or refuse?** Built as a warning (the deploy still answers `ok`). Refusing unless
   `--backend-url` or `--full-stack` is the row's other option; it changes what a working command does. The shipped
   training template names `127.0.0.1:8577`, so a static deploy of it now warns.
3. OWN008-AUDIT's recommendation (stay on fast-xml-parser 4) stands from session 4.

## Next (the Beta walk's remaining rows, measured order)

1. **P119-S2-LIVEPATH** (medium): live updates refused on a collection read through a path rule, so a two-person chat
   refetches. Size: the hub's matcher (the SQL path's JS twin, as `canReadRecord` is for ACLs) + a property test.
2. **P121-TWO005-SIGNUPSWITCH**, **P121-TWO004-DETAILFILTER**: the admin app's words lie / a filter drops (small).
3. **P112-OWN023-NORANGE** (audio seeking on Safari), **P112-OWN024-SCHEMAFIRSTSTART** (a collection lost at start).
4. **P107-S97-USERIDBOOLEAN** needs a census of saved `userId →` wires first (R22 refuses a dead wire at both doors).
5. **P124-S1-WRITESHELPER**, **P18-S134-STRINGREJECT** (filed above).

## Traps met

1. 🔴 The editor's validator layer **must not import** `@noodl/backend-contract` (it would pull the runtime's
   dependencies in, `queryFilterShape.ts`). A shared list lives as two copies held equal by a spec that reads the other
   file. I built a shared module there first and took it back.
2. 🔴 `NoodlRuntime.instance` is whichever runtime was constructed last: a failed candidate deploy in `WorkflowRunner`
   leaves it pointing at a discarded runtime. Anything reading metadata through it inside the backend is exposed;
   CLOUDPOINTSTO went through `_noodl_cloudservices` for that reason. Not filed (no measured symptom yet).
3. `golden.js --diff` said "No golden trace moved" for a renamed scenario again (session 1's trap 2). Read the file diff.
4. `noodl-mcp` `own020CallToolStrip` is red at HEAD since 328f1dd1d (OWN-026 FIX-02's wording); on FIX-05's list.
5. Plain `grep -c` on `HttpServer.ts` prints nothing (binary): verify a restore with `grep -a`.

## Gates read (2026-10-25)

noodl-preview 17 suites 104/104 (dist rebuilt) · editor validator 31 suites 371/371, nsp-021 11/11, def-009 14/14 ·
backend: functions/MCP/keys 44 suites 566/566, DEF-009 16/16, tsc clean · runtime filters 96/96, records 14/14, tsc
clean · cloud runtime request 135/135, tsc clean · node-spec golden 22/22, catalog parity 375/375, `golden.js --check
--type noodl.cloud.request` fresh · nodegx-export the-noodl-api-travels 35/35 · `noodl-mcp` tsc clean.

**Commits this session:** 8d97498cd, 2a692b8e0, d086cfe1d, eaf767388, 98785a116, 3bf2a53a5, 469b14e03, and the docs
commit after them.

---

# Session 6, 2026-10-25 (next session reads this first)

Took session 5's "Next" list, all but STRINGREJECT (lane 4, paused; the export matches it on purpose). Seven fixed.
**Not pushed, not released**, as before.

## Done

| row | commit | built | graded |
|---|---|---|---|
| P119-S2-LIVEPATH (medium) | 3cd182bda | a narrowed subscription (path or `creator` rule) is accepted; each create/update is confirmed by the subscriber's own narrowed query (`HubOptions.confirm` → `facade.rawQuery` with `aclFor(…, only)`, the same SQL as `/classes`); a delete is read through the rule's last `{ from, by }` link from the record as it was, `creator` from `owner`; anything else, or a failed check, sends `resync` `"unconfirmed"`; frames keep change order. `REALTIME.md` | `p119-s2-live-path` 10/10 (5 over HTTP on a locked backend, red 5/5; 5 on the hub), 7 mutants red; realtime/ONT-004/ONT-012/FED-005/creator suites 224/224 |
| P121-TWO004-DETAILFILTER | bf3405090 | `navigateWith`: Detail and Close keep the route's query | `runs-view` (mounted as the App mounts it) red → green, 2 mutants red; admin app 204/204 |
| P121-TWO005-SIGNUPSWITCH | 981b44515 | `GET /admin/auth` answers `signup: { open, rule }`; closed → the magic-link and provider sign-up switches read off, disabled, "Sign-up is closed on the Permissions page …"; the stored choice is kept | 3 jsdom + 1 real-server case, red 2/3, 2 mutants red; 253/253 |
| P112-OWN023-NORANGE (medium) | e79a81884 | one `bytes=` range → 206 + `Content-Range`; past the end 416; `Accept-Ranges`; several/malformed/stale `If-Range` → whole file; `createReadStream(key, range?)` on both drivers (S3 signs `Range`). `BACKEND-FILES.md` §Seeking | `p112-own023-no-range` 6/6 (red 6/6), 4 mutants red; file suites 76 (MinIO half skipped). Not on a real iPhone |
| P112-OWN024-SCHEMAFIRSTSTART | b3e259642 | a push with no answer is retried twice (250 ms, 1 s), looking first whether it landed; a refusal in words is not; what is missing is `schemaProblem` on `backend:status` and a notice on the backend card | tests-main 4 new, red 3/4 on HEAD's source, 2 mutants red; 117/117, editor tsc. Card notice not rendered (the card cannot load under jest) |
| P124-S1-WRITESHELPER | 16ca9cca2 | both predicates follow a placed `/#__cloud__/` component, each once, never into itself: backend from its bundle, the door from `views` | backend DEF-009 18/18, door 16/16, 5 mutants red (both cycle guards: RangeError); training template 8 → 12 of 27, exactly the row's four |
| P107-S97-USERIDBOOLEAN | 58c980d43 | census first: 106 saved `userId` wires in 13,839 project files, none into a signal; then `string` in the runtime, spec v3, both catalogs, golden (only `version` moved) | `p107-s97-userid-string` red 2/3 → 3/3; golden --check fresh; conformance on the cloud target; catalogs up to date; 114/114 examples |

## For Richard

1. **Push and release**, as before: 43 rows now on cline-dev. LIVEPATH, NORANGE and SIGNUPSWITCH are backend; the
   admin-app rows ship in its bundle; SCHEMAFIRSTSTART needs an editor build.
2. Session 5's DEPLOYLOOPBACK (warn or refuse?) and OWN008-AUDIT (stay on fast-xml-parser 4) stand.

## Done, second half (the list this section first named)

| row | commit | built | graded |
|---|---|---|---|
| P109-S41-SUNDAYWEEK | 255ca3eca, 5683ca35e | a `{$gte,$lt}` range reads back as a window only when exactly one window has it; a tie (Sunday: week = past7; the 30th of a 30-day month: month = past30) reads back as `between` | red at HEAD today (a Sunday) in the row's words; spec round-trips on a fixed Wednesday and pins both ties and the day after; 45/45. The backend plain suite's Sunday base red is gone |
| P112-OWN021-EMAILNOTE | edf459d17 | `emailNotReadyLine`: the Email page says each reason in its own words ("Nothing is sent yet. Choose who sends your mail below, then save."); the API sentence is unchanged | red 2/2 → green |
| P116-S23-STORAGEFLAKE + filed BETA-S6-MOVEWORDSFLAKE | 4cd97b06d, 24a1e30ce | `tests/admin-app/dom.ts` `until(ready, what)`; the two Storage cases wait for what they read | instrument: every mocked fetch delayed 50 ms — HEAD's waits red, `until` green |
| P121-TWO004-TOASTOVERSAVE | ad34964ab | `toastLift()`: the stack sits 8 px above the highest open `.drawer-foot` / `.modal .foot`, read when it draws | red 2/3 → 3/3 (rect stubbed in jsdom; not driven in a browser) |
| P112-S13-DEPLOYBADJSON | 0aad876bb | the project reader names the file in a parse error and marks it (`projectFile`); the deploy engine files it under `project` | built dist: red 2/2 (`stage: write`) → green; preview 106/106 |
| P112-OWN026-DELETELEAVESBYTES (medium) | 22ab9c73c | `secure_delete = ON` at connect; `wal_checkpoint(TRUNCATE)` after each committed delete (post-commit tap, once per transaction) | real backend, every file of the data folder: red 3/3 (`local.db-wal`: 6) → green, control beside; each half alone red (`local.db` 2 / WAL 4); 54 suites 758/758 |

Filed, not fixed: **BETA-S6-PICKERFLAKE** (the Picker spec red once in ten admin-app runs, not caught again; eleven
fixed `settle(220)`s), **BETA-S6-CMP004RED** (four parts-shelf round-trip cases red at HEAD, with or without this
session: an icon missing from the re-export, `install_prefab` refusing, a part's port gone).

## Next (the Beta walk's next rows)

1. **BETA-S6-CMP004RED** (medium, red at HEAD) — someone should own it; it is the agent's parts shelf.
2. **P121-TWO004-ADMINNARROW** — the admin app has no narrow layout (below 768 px every page runs off the right).
3. **P112-OWN020-OUTDIRANYWHERE** — `render_report`'s `out_dir` writes anywhere; every other project-server write stays
   inside the project.
4. **BETA-S6-PICKERFLAKE** — needs an instrument that reddens one of its steps first.
5. **P18-S134-STRINGREJECT** waits for lane 4.

## Traps met

1. 🔴 `Tests: 0 total` from jest is a suite that did not compile (a TS error under ts-jest), not a red: the editor's
   first "red" for the door was this. Read the tail before calling anything red.
2. 🔴 The admin app's modal store is global: a jsdom spec that leaves a dialog open hands the next spec its Close
   button. `closeAllModals()` first.
3. 🔴 The DEF-009 fixture's arms share the `functions`/`public` class bucket (burst 200): a seventh 40-call arm reddened
   the opt-out arm at HEAD for the wrong reason. The fixture now writes `ops.json` with room.
4. macOS has no `timeout`: a mutant run behind it silently did not run (`command not found` swallowed by grep).
5. `golden.js --check` wants `changes` in rising version order; `--diff` said "No golden trace moved" for a port type
   change while `--check` said stale (only `version` moved). Read the golden file diff.
6. The honesty-ledger control in node-spec is red at HEAD under an uncommitted edit of `honesty-ledger.json` (four
   templates rose); not this session's, and identical with this session's changes undone.
7. `dev-docs/tasks/phase-119-learn-with-simple-rick/README.md` §2 still says live updates refuse the path rule; a peer
   had that file open, so it was left. One sentence to change when it is free.
8. 🔴 A jest run piped into `grep` inside an `&&` chain does not gate the commit after it: EMAILNOTE was committed past
   a red `where-cards` (a flake, as it turned out). Read the count before the commit, or gate on jest's own exit.
9. A flake is graded by an instrument, not by reruns: delaying every mocked fetch by 50 ms turned the Storage cases red
   on HEAD every time, which is what `until()` was then measured against.
10. The deploy engine exits 0 whenever it said something; `stage` in its JSON is the contract (`deploy-cli.ts` header).

## Gates read (2026-10-25)

backend: live-path 10/10, realtime + rule suites 224/224, files 76 (7 MinIO skips), DEF-009 18/18, declarations
81/81, admin app 20 suites 253/253, tsc clean · editor: tests-main local-backend + panel 117/117, validator 19 suites
263/263, Request-node specs 178/178, tsc clean · node-spec 478/478, tsc clean · cloud request 102/102, tsc clean ·
runtime conformance (Request) green · `catalog:check`, `catalog:merge:check` up to date, `catalog:examples` 114/114 ·
noodl-mcp tsc clean. Second half: admin app 18 suites 212/212 (four reruns: one Picker flake, filed) ·
`bmg-002-filters` 45/45 · preview 18 suites 106/106 on a rebuilt dist · runtime SQL adapter 129/129 · backend suites that
delete or back up 54 suites 758/758 · runtime, preview, noodl-mcp, admin tsc clean.

**Commits this session:** 3cd182bda, bf3405090, 981b44515, e79a81884, b3e259642, 16ca9cca2, 58c980d43, 3d0abda16
(docs), 255ca3eca, 5683ca35e, edf459d17, 4cd97b06d, 24a1e30ce, 65cb0bd5a, ad34964ab, ffa6ad30e, 0aad876bb, 22ab9c73c,
and the docs commit after them.
