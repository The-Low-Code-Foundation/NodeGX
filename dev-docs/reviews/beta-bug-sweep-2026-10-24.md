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

1. **Push and release**, as before: 46 rows now on cline-dev (and three spec repairs). LIVEPATH, NORANGE and SIGNUPSWITCH are backend; the
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

## Done, third part (that "Next" list)

| row | commit | built | graded |
|---|---|---|---|
| BETA-S6-CMP004RED (medium) | 3b0ae571a | three causes outside the cases: `export_to_library` now draws the monogram icon with the checkout's own generator (`make-monogram-icon.js`, now requirable) so an export passes `library:verify-dist`; the three parts' `project.json` re-shipped with `componentType: logic` (P112-S7-LOGICTYPE); the round trip asserts P100 UPG-003's tokens instead of the old text-style merge | parts 21/21, round trip + libraryTools 50/50, `library:icons:check` 84/84; `verify-dist` red only on the modules index (an untracked local `library/modules/nightbook-kit` stops the modules build) |
| P112-OWN020-OUTDIRANYWHERE (medium) | 7a2245159 | `screenshotDir`: `out_dir` read against the project, refused by name outside it (real paths; an outward link is outside), both tools, before anything runs | 4/4, all red under HEAD's resolution; FLD-011/OWN-018 moved into the project and their argv pins given `--image-budget` (red since this sweep's RENDER1MB); 25 suites 182/182 |
| BETA-S6-PICKERFLAKE | b63d75a03 | nine waits `until()` what they read; two absence windows kept | instrument (answers +100 ms): HEAD 6/7 red → 7/7 |

## Next

1. **For Richard, a ruling:** P121-TWO004-ADMINNARROW asks whether the admin app owes a phone layout (P104's lane)
   before anything is built. Measured: below 768 px every page runs off the right (308 px at 390).
2. The other open Beta-walk rows are a size up or someone else's lane: P26-SKELSHIP's engine half, P107-S102-
   SIGNUPBACKEND (Sign Up's ports read no backend), P121-S19-SIGNINRACE (template), P116-S17-CRONLEAK (a test leak).
3. **P18-S134-STRINGREJECT** waits for lane 4.
4. The P119 README §2 sentence (trap 7).

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
0cb37c654 (docs), 3b0ae571a, 7a2245159, b63d75a03, and the docs commit after them.

---

# Session 7, 2026-10-25 (next session reads this first)

Took session 6's "Next" list (all but ADMINNARROW, which waits on a ruling, and STRINGREJECT, lane 4), then two Dropdown
rows on the community template's Report form. Six fixed, one half-built. **Not pushed, not released**, as before.

## Done

| row | commit | built | graded |
|---|---|---|---|
| P107-S102-SIGNUPBACKEND | c873955f7 | Sign Up's ports come from `user-ports.ts` as Set User Properties': the active backend's accounts table, the Parse browser list or the REST list. No Backend picker; a saved `backendId` is not read (the sign-up always goes to the active backend), in the contract builder too (`NO_BACKEND_INPUT`). Spec v3 | NSP-020 drive: pins out, (A) red 8 on HEAD → green; a new case names the columns drawn on both synthetic projects; 2 mutants red; conformance (Sign Up v3), node-spec 608/608, mcp drawn ports 5/5 |
| P116-S17-CRONLEAK | 23149f2a0 | the FED-004 drive's teardown waits until the run its boot started is recorded and none is `running` (throws in words at 9 s). `stop()` leaving runs in flight is by design; unchanged | reproduced: HEAD's spec + a 4 s idle spec forced after it (test sequencer) = 8/8 green, three "Cannot log after tests are done", exit 1 → exit 0 |
| P26-SKELSHIP, engine half (row stays open) | d10ca6164 | `nodegx-deploy` reports `skeletonPages`, a sentence in `warnings` and on stderr when every page is create_project's untouched placeholder (`src/skeleton.ts`, the marker a copy held equal by the spec); ship-to-vm.sh prints every engine warning. A warning, as DEPLOYLOOPBACK | built engine: red on HEAD's (`skeletonPages` undefined) → 3/3, two known-firing arms, a mutant red; preview 19 suites 109/109 |
| P121-S19-SIGNINRACE | 8f1c6e8d9 | not Log In (it writes the session before `done`): the page-load `/users/me` check with the OLD token, answering after the new sign-in, wrote the old person back (a 209/401 cleared the new session). Both adapters now drop an answer whose session was replaced while it was out, and tell the caller (`SESSION_MOVED_MESSAGE`) | answers held and released in the race's order: Parse wire via the real UserService red 2/4 on HEAD → 4/4; PocketBase red 2/3 → 3/3; runtime backends 410/410, viewer 906/906, User/Log In/Sign Up conform. **Not driven in Chrome**: the reading fits both symptoms, not measured on s19's run |
| P121-TWO005-DROPDOWNSTALE | 33ae2817f | the placed "Option 1" stays a seed until a Value write or a changing pick; Items that do not offer it clear Value to `''` and send it. Spec v11, two scenarios added, both catalogs | corpus spec red 2/4 → 4/4; conformance 91/91, no survivors. The first build never fired on a page: `Select`'s mount effect calls `valueChanged`; conformance caught it |
| BETA-S7-DROPDOWNFIRSTPICK (filed and fixed) | 483335262 | with the value in no option, `Select` tells the `<select>` `''` (was `undefined`: the browser's reset selected the first option under the placeholder, so it could not be picked); options compared by the browser's value, the face too. Spec v12 | conformance 91/91, red 4 on HEAD's `Select`; face spec red 2/3 → 3/3 |

Filed, not fixed: **BETA-S7-DROPDOWNFOCUSDIVERGE** (Dropdown conformance diverges on today's generated sequence
1530142452: Focused where the spec says Blur's Done; red with 8f1c6e8d9's runtime and spec).

## For Richard

1. **Push and release**, as before; six more rows on cline-dev. SIGNINRACE and SIGNUPBACKEND are runtime (viewer bundle),
   the Dropdown rows are viewer, SKELSHIP is `@nodegx/preview`, CRONLEAK is a test.
2. **P26-SKELSHIP**: should the deploy engine *refuse* a project nobody has built, as `deploy_to_vm` does? Built as a warning.
   And should create_project's placeholder speak to a visitor ("This app is being built.")? Studio's own Deploy to folder
   tab does not run the engine and still says nothing.
3. Standing: ADMINNARROW (does the admin app owe a phone layout?), DEPLOYLOOPBACK (warn or refuse), OWN008-AUDIT.

## Next

1. P107-S86-STOREDWIRE (medium): Set Object Properties' `stored` wires from before ERG-001 register nothing; a load
   migration or an alias (the class: a renamed built-in port ships no migration).
2. BETA-S7-DROPDOWNFOCUSDIVERGE: reproduce with the seed, decide spec or runtime.
3. P18-S109-MOUNTPULSE (Sign In With's Failure at mount reaches no wire): the runtime half is small, but the export
   transcribes the runtime's behaviour (`src/lib/signIn.ts`, pinned in its §C), so it moves lane 4's files: wait for lane 4.
4. The P119 README §2 sentence (session 6 trap 7): a peer still has that file modified.
5. P18-S134-STRINGREJECT waits for lane 4.

## Traps met

1. 🔴 The full node-spec suite does not finish in a session on this box: `stranger.test.ts` alone took 39 minutes niced
   (P121-S4-STRANGERSTALL). Run the files that grade the change (ports, catalog parity, golden, spec ledger, types, schema,
   the batch file) and conformance with `NSP_ONLY`.
2. 🔴 A corpus spec that does not render React cannot see a component's mount effect: the Dropdown's `Select` calls
   `valueChanged(props.value)` on mount, which ended the seed before any Items came. Conformance renders in jsdom and caught it.
3. jest runs a NEW test file first, so an "idle after it" probe ran before the spec it was meant to follow and proved
   nothing. A `--testSequencer` that sorts the probe last made the leak's window.
4. A red case that throws before `adapter.dispose()` leaves RestAuthAdapter's refresh timers alive and jest never exits (a
   300 s hang). Dispose in `afterEach`.
5. `undefined` is never sent (`node.ts sendValue`), and a new wire is seeded with the source's current value: clearing an
   output to `undefined` leaves the old value downstream. Clear to `''`.
6. The node catalogs embed every spec reducer's `says` sentence: changing one makes `catalog:check` stale. `catalog:generate`
   then `catalog:merge`, and diff both (only your sentences should move).
7. `nodegx-project-contract` `verbs.test.ts` is red at HEAD (P107-S101-VERBSPECCED, filed); census/honesty in node-spec are
   red under a peer's uncommitted `census.json` / `honesty-ledger.json` (session 6 trap 6).
8. Killing the first command of a `;`-chained background job lets the next one start: the project-contract suite ran after I
   stopped node-spec. Chain with `&&`, or kill the shell.

## Gates read (2026-10-25)

runtime: NSP-020 drive 8/8, backends + ERG-001 + ISL-029 13 suites 410/410, conformance (User v5, Log In v1, Sign Up v3)
conforms, Dropdown v12 91/91 scenarios (one generated divergence, HEAD's), tsc clean · viewer: user and corpus 66 suites
906/906, Dropdown suites 122/122, tsc clean · node-spec: ports, catalog parity, golden, types, schema, spec ledger, batch
records/visual, runner 608/608 then 497/497, tsc clean · `golden.js --check` fresh (Sign Up, Dropdown) · `catalog:check`,
`catalog:merge:check` up to date · project-contract 363/364 (verbs, HEAD's) · noodl-mcp drawn ports 5/5 · preview 19 suites
109/109 on a rebuilt dist, tsc clean · backend FED-004 drive 8/8 exit 0.

**Commits this session:** c873955f7, 23149f2a0, d10ca6164, 8f1c6e8d9, 33ae2817f, 483335262, and the docs commit after them.

---

# Session 8, 2026-10-25 (next session reads this first)

Opened with Richard's question: how many sessions until the important Beta bugs (with the Claude Desktop integration)
are cleared? Answered: about two fixing sessions and one release session, the release being the real gate. Then took
STOREDWIRE (session 7's first item) and the medium rows a Claude Desktop user meets through the MCP. Five ledger rows
fixed, one filed and fixed, one flake filed.

**Pushed by a peer, mid-session:** `1b1b035dd chore(release): npm 0.2.7` pushed `cline-dev` up to and including
STOREDWIRE (56c37c661) and EXAMPLEINVALID (6f17999c1). Whether the 0.2.7 tarballs carry them depends on the dist each
was built from: not measured. MCPREADME, NESTEDCHROME, PORTTYPEOBJECT and this docs commit are **not pushed**.

## Done

| row | commit | built | graded |
|---|---|---|---|
| P107-S86-STOREDWIRE | 56c37c661 | not one rename but 41 outputs on 39 types (catalog at 7cb235279 vs HEAD). `@nodegx/project-contract/renamed-ports`, read by `NodeScope.addConnection`/`removeConnection` (a wire from a port the node lacks connects to its new name: every running app), editor `applyPatches` (renames on open) and `nonexistentPort` ("It was renamed …"). Reused names (Run Tasks `done`, Global Store Set / Action Dispatcher `completed`) left | runtime corpus red 3/5 → 5/5, mutant red; contract 89/89; editor 6/6; mcp 4/4; runtime 96 suites 1060; viewer corpus 63/63. Census: **367 dead wires in 6 of 54** local test projects, now live |
| NPMAUDIT-EXAMPLEINVALID | 6f17999c1 | 28 examples fixed (String Format, Log `warn`, a Script on a non-existent API and one with no code, String Mapper ports, Aggregate's `agg-` and no count, `prop-title`, `stored`, a foreign For Each row, 8 cloud names outside `#__cloud__`, 58 `{name:"*"}` port types) | `tests/npmauditExampleInvalid.test.ts` writes **every** example dependency-first: 102 accepted, red 25 on HEAD; 12 named as context. `catalog:examples` 114/114, merge:check, `docs:bubble:check` |
| NPMAUDIT-MCPREADME | 27557936d | `create_project` description and note say the server binds; `--help` in `src/usage.ts`, counts from `TOOL_GROUPS`; package README corrected; cmp007's key list takes `icon` (red since s6's CMP004RED) | 3/3 + neighbours 37/37; surface 8,277/8,280 unchanged |
| P112-OWN026-NESTEDCHROME | d7a9106d6 | harness `pageAnswers`: 30 s for Chrome's first page, then an actionable "another sandbox … CHROME_PATH --no-sandbox" error; `spawnRender` kills the harness's process group (SIGTERM, SIGKILL after 3 s) | 6/6 with a fake harness (group cases red on HEAD); real-Chrome render suites 14/14. Not driven under `sandbox-exec` |
| BETA-S8-PORTTYPEOBJECT (filed, fixed) | afcd83169 | `get_component` hands a `{name}`-only port type back as the string the write takes. Left: richer types (enum options, units) | red 2/2 on HEAD → 2/2; get_component callers 190/191 |

Filed, not fixed: **BETA-S8-SEE001TIMEOUT** (low; SEE-001 AC2 ~12 s under load vs jest's 5 s).

## For Richard

1. **Push and release** the three unpushed fixes (MCP: README/description, render timeouts, get_component). The `.mcpb`
   for Claude Desktop needs the next `@nodegx/mcp` and a version bump; check what 0.2.7's tarball was built from.
2. Standing rulings: SKELSHIP (warn or refuse), ADMINNARROW (phone layout?), DEPLOYLOOPBACK (warn or refuse), OWN008-AUDIT.

## Next

1. The editor rows a Beta builder meets: P107-S79-SILENTCACHE (cached dynamic ports trusted, replaced with no diff),
   P112-S7-TEXTDEFAULTS (a picked Text carries defaults the validator calls errors), P112-S11-REFUSALWORDS (a newer
   project refused in another product's name).
2. BETA-S7-DROPDOWNFOCUSDIVERGE (low): reproduce with the seed.
3. P18-S109-MOUNTPULSE and P18-S134-STRINGREJECT wait for lane 4. The exporter does not read `renamed-ports` either.
4. BETA-S8-SEE001TIMEOUT: an explicit timeout, or find where AC2's 12 s go.

## Traps met

1. 🔴 **viewer-react compiles the runtime to ES5 in jest, and ts-jest's TS error reached every case as an EMPTY
   failure** (46 suites, 630 tests, no message). Cause: `[...new Set(...)]` in a module the runtime imports. Runtime and
   viewer `tsc` were clean. A/B with HEAD's file found it; a probe `require` printed the TSError. A module the runtime
   imports: no Set/Map spread or iteration.
2. 🔴 A peer edited `docs/node-catalog/enrichment/newdbmodelproperties.json` mid-session, so `catalog:merge` folded their
   sentence into my enriched catalog. Stripped the one string, verified the diff was examples-only, committed. After
   any `catalog:merge`, `git status docs/node-catalog/enrichment`.
3. The runtime's full jest prints nothing for 20+ minutes (conformance's long setup): run `test/corpus test/nodes
   test/models` and friends, not the whole package.
4. A census over `~/Documents` reads iCloud placeholders (it can download them, and it crawled for 10 minutes). Census
   named project folders only.
5. `get_example` reads the ENRICHED catalog, not `docs/`: an example edit is invisible to MCP tests until `catalog:merge`.
6. `cli.ts` runs `main()` on import: a test cannot read its help text without moving it out (`src/usage.ts`).

## Gates read (2026-10-25)

contract renamed-ports 89/89, tsc clean · runtime corpus/nodes/models 96 suites 1060/1060, tsc clean · viewer corpus 63
suites 893/893, tsc clean · cloud tsc clean · editor p107-s86 6/6, nsp-020 + neighbours 492/492, tsc clean; DEF-007 seam
red at HEAD (P112-OWN008-TESTMAINRED) · mcp: example gate 103/103, MCPREADME 3/3, NESTEDCHROME 6/6, PORTTYPEOBJECT 2/2,
render suites 14/14, toolDisclosure 18/18 (8,277/8,280), get_component callers 190/191 (SEE-001 AC2 load), tsc clean ·
`catalog:examples` 114/114, `catalog:merge:check` up to date (with the peer's enrichment edit uncommitted it will read
stale until they regenerate), `docs:bubble:check` up to date.

**Commits this session:** 56c37c661, 6f17999c1, 27557936d, d7a9106d6, afcd83169, and the docs commit after them.

---

# Session 9, 2026-10-25 (next session reads this first)

Richard asked for the next two sessions in one. Done: session 8's whole "Next" list (the three editor rows,
SEE001TIMEOUT, DROPDOWNFOCUSDIVERGE measured) and then the next rows on the Beta's road. Six rows fixed, three filed
and fixed along the way, two filed open. **Nothing pushed**: `cline-dev` is 12 commits ahead of `origin/cline-dev`.

**The release question, answered:** `@nodegx/mcp@0.2.7` is **not on npm**. The registry's `latest` is 0.2.6 for all
five packages (`@nodegx/mcp`, `create-nodegx`, `-vibe`, `-cline`, `@nodegx/preview`), read from registry.npmjs.org at
23:03. `1b1b035dd` bumped the versions and the changelog; nothing was published. So no tarball was built from a stale
tree. The next publish should be built from a tree that holds everything below.

## Done

| row | commit | built | graded |
|---|---|---|---|
| P112-S7-TEXTDEFAULTS | 81cdeee3d | Measured first: `"auto"` is not a size, so Text's width setter kept 100% and raised `not-a-dimension`; Text has no flex ports. The five layout keys go (no rendering change). Grading every config and variant found the class beside it: TextInput `width`/`height` strings, `cursor` on Button/Checkbox, `borderWidth: '0'` with no style. All removed. The style vocabulary stops teaching agents Text `width: "auto"` | `tests/models/PickerLookValidates.test.ts` 28/28 (red on HEAD's configs), viewer-react `p112-s7-textdefaults-width-auto` 4/4, tests-unit neighbours 151/151, mcp vocabulary files 89/89 |
| P112-S11-REFUSALWORDS | 78f69c4a2 | The modal names NodeGX, both formats, links nodegx.io/download. `projectFromDirectory` hands `{ explained: true }` on every refusal it explained; the launcher's four open paths add their toast only for an unexplained failure; the toast no longer says `project.json` | `tests-unit/p112-s11-refusalwords` red 3/4 on HEAD → 4/4 (real loader, collaborators mocked). Not driven in Electron |
| P107-S79-SILENTCACHE | 352bcdf6e | The first replacement of a node's saved `dynamicports` is diffed (`portsReplaced.ts`), logged, and a wire left on a dropped or retyped port raises `node-ports-replaced`, re-read in `evaluateHealth` so it clears itself. Later replacements (the person's own edits) are not diffed. Trusting the cache before a viewer stays NSP-020's | `tests-unit/p107-s79-silentcache` red 2/9 on HEAD → 9/9 (real `NodeGraphNode`), 20 neighbour suites 724/727 (the 3 red identically on HEAD) |
| BETA-S8-SEE001TIMEOUT | 4df2370f8 | Fixed at the cause, not with a timeout: a CPU profile of the one `update_component` (2.5 s): 1.25 s was `suggestType`'s Levenshtein pass per unknown node (149 nodes, 10 names) — memoised per index; 0.97 s was the next row | AC2 3.1 s → 0.66 s, `create_component` 1.57 s → 0.16 s, same machine and load |
| **BETA-S9-WALKSEEN** (filed, fixed) | 4df2370f8 | A write's project walks read every component through `readComponent`, which snapshots and records SEEN, so after any write `what_changed_since` compared the person's Studio edits against a baseline taken after them and said nothing changed. `ProjectStore.peekComponent` (no snapshot, not seen) for the 13 walks; `read_graph` stays a read | `tests/betaS9WalkSeen` red 2/3 on HEAD → 3/3; the full MCP suite 4,962 passed, its 19 reds identical with every file this session touched put back to 6f74702d1 |
| NPMAUDIT-PREVIEWWARNINGS | 6a766a382 | A good build keeps its validation report: `/__preview/state` answers `state: { kind: 'ok', report }`, and `warnings` adds one line per validation warning | preview 110/110 on a rebuilt dist; the new case red on a dist built from HEAD's two files |
| P112-OWN026-FIX03GOLDEN | bd45bb676 | Button v6, Text Input v9 with `repeatWhileSavingChange` (migration: the `repeatWhileSaving` parameter); DbModel2 and SetDbModelProperties v5 entries (migration none, said why); four goldens written | `golden.js --check`: 125 specs fresh, version rule held (was 8 problems); `catalog:check` and `catalog:merge:check` up to date |
| **BETA-S9-PLANTSTALE** (filed, fixed) | f0fea7a64 | Session 7's Dropdown fixes changed a line `page-model-plants.test.ts` plants on by exact text, so the file stopped loading (Tests: 0) and its 22 guards graded nothing | 22/22 |

Filed, open: **BETA-S9-BUTTONSHADOW** (low, a ruling, below) and **BETA-S9-BUTTONFOCUSSURVIVOR** (low: on today's seed
20751 one Button `person.focus` swap-branch mutant survives; 58/58 scenarios and 200/200 sequences agree; red at HEAD's
v5 too). **BETA-S7-DROPDOWNFOCUSDIVERGE** stays open with a measurement: reproduced exactly; the runtime's
`FocusTracker` checks mounted, never visibility, and jsdom (measured) hands focus to a `<select>` under
`visibility: hidden`, which a browser refuses. Probably a harness gap, not a product one; one CDP drive settles it.

## For Richard

1. **Push, then publish 0.2.7 (or 0.2.8) from this tree.** Twelve commits wait on `cline-dev`: session 8's four
   (MCPREADME, NESTEDCHROME, PORTTYPEOBJECT, docs) and session 9's eight. The MCP ships `StyleVocabulary` and the
   element configs, so TEXTDEFAULTS reaches Claude Desktop agents with it; WALKSEEN and the 4× faster writes too.
2. **New ruling, BETA-S9-BUTTONSHADOW:** *"A button you drag in has no shadow, but the same button built by Claude has
   one. Should both have it, or neither?"* (Left as it is; the test allows that one warning by name.)
3. **Standing rulings:** SKELSHIP (warn or refuse), ADMINNARROW (phone layout?), DEPLOYLOOPBACK (warn or refuse),
   OWN008-AUDIT (stay on fast-xml-parser 4).
4. **P112-OWN026-MCPJSONABSPATH needs one measurement on your machine.** The fix that suggests itself (a relative project
   path in `.mcp.json`) rests on the working directory Claude Code gives a project's stdio server, and Claude Code's MCP
   docs say neither that nor whether `${CLAUDE_PROJECT_DIR}` expands in args (checked 2026-10-25). Measuring it means
   approving a throwaway project server, which writes your real `~/.claude.json`, so it was not done here.

## Next

1. MCPJSONABSPATH, after item 4's measurement: a server that prints `process.cwd()` to a file, in a folder with a
   `.mcp.json`, started once from the folder and once from a subfolder.
2. DROPDOWNFOCUSDIVERGE: one CDP drive (does a hidden Dropdown take a Focus in Chrome?), then a `_canFocus` that reads
   visibility (product) or a target that refuses focus to a hidden element (harness).
3. BUTTONFOCUSSURVIVOR: a hand scenario that focuses a pressed Button as it leaves the page.
4. The rows waiting on rulings: PILLWRAP and FILLGROW (one ruling for both), BUTTONSHADOW.
5. P18-S109-MOUNTPULSE and P18-S134-STRINGREJECT still wait for lane 4.

## Traps met

1. 🔴 **A write's validation walk is a read unless it says otherwise.** `ProjectStore.readComponent` snapshots and records
   SEEN; a walk over the project must use `peekComponent`. Profile before you add a timeout: SEE001TIMEOUT's 12 s was
   product latency (and hid WALKSEEN).
2. 🔴 **The style vocabulary is built from the element configs**, so removing a "dead" key can change what agents build.
   `boxShadow` is never read on a dropped Button but becomes `boxShadowEnabled: 'true'` for an agent's. Diff
   `buildStyleVocabulary()` before and after a config edit.
3. 🔴 **An exact-text plant reddens as "failed to run", not as a failure.** A spec edit owes a run of
   `nodegx-node-spec/tests/page-model-plants.test.ts` (as `function-contract` does for `simplejavascript.ts`).
4. `git diff --name-only` prints repo-root paths even from a package directory: an A/B swap loop that copies by those
   paths from inside the package swaps nothing and reads as "no change" (`--relative` fixes it). Check the swap took.
5. A whole-suite red is graded by putting every touched file back to the session's base and re-running the red files:
   the MCP's 19 reds were the same 19 both ways (peers' uncommitted template work, known rows).
6. `spec-census:check` and `docs:nodes:check` are stale at HEAD from other lanes (the census by the export's counts, 33
   node pages). Regenerating them would sweep other sessions' work into a commit; left alone.
7. editor `tests/editor-suite/electronAdapter.test.ts` runs only under the Electron `test:ci`; plain jest dies at
   `bugtracker`'s platform import.

## Gates read (2026-10-25)

editor: PickerLookValidates 28/28, ElementConfigRegistry, tests-unit def-001/sty-002/def-041/aib-001 151/151,
refusalwords 4/4, own-013 green, silentcache 9/9, 20 NodeGraphNode suites 724/727 (honestyView 3 red on HEAD),
CatalogIndex neighbours 379/379, tsc and `tsconfig.tests.json` clean; DEF-007 seam red at HEAD (P112-OWN008-TESTMAINRED)
· viewer-react textdefaults 4/4, button/icon variants 50/50 · mcp full suite 4,962/4,986 (19 red, identical on the
session's base), walkseen 3/3, see001Honesty 7/7, tsc clean · preview 110/110 on a rebuilt dist, tsc clean ·
node-spec golden --check clean, golden/ports/draw/batch-records/batch-visual 194/194, page-model-plants 22/22, tsc
clean · catalog:check and merge:check up to date, docs:bubble:check up to date, spec-ledger:check holds · runtime
conformance: Text Input v9 conforms; Button v6 one survivor (same at v5); Dropdown reproduces DROPDOWNFOCUSDIVERGE.

**Commits this session:** 81cdeee3d, 78f69c4a2, 352bcdf6e, 4df2370f8, 6a766a382, bd45bb676, f0fea7a64, and the docs
commit after them.

# Session 10, 2026-10-26 (next session reads this first)

Richard ruled all six open questions, every ruling written into its row with the question it answered (a9664e4f7),
and said "Let's rock out". Built: four of them whole and one in part. One is measured and left for its own session.
**Nothing pushed**: `cline-dev` is 28 commits ahead of `origin/cline-dev`, `nodegx-studio` 9 ahead of `origin/main`.

## Done

| row | commits | built | graded |
|---|---|---|---|
| BETA-S9-BUTTONSHADOW (ruled: both have it) | c60cb1d53 | The filled Button looks set `boxShadowEnabled: true` (config values may be booleans), so the picker's drop, the shipped Looks and the vocabulary copy one port. Found on the way: the vocabulary taught `'true'`, which the validator calls an error. The `--shadow-sm` token was built and measured: 4,403 of the vocabulary prompt's 4,400 | PickerLookValidates 53/53 (red 13 on base), mcp style suites 89/89, prompt 4,361 |
| P26-SKELSHIP (ruled: warn loudly everywhere, never refuse) | a27fc8977, Studio 6030a59 | Placeholder reads "Lingo — this app is being built." (the old sentence still recognised); the reading moves to the editor (`deploy-skeleton.ts`); `deploy_to_vm` ships with `warnings` first; editor Deploy to folder and Studio Publish ask "Deploy/Publish anyway"; the engine CLI printed nothing for the new sentence (prefix match) and now prints the one it made | editor 11/11, engine 7/7 on a rebuilt dist, mcp 45/45, Studio check:unbuilt 17/17 |
| P112-OWN023-DEPLOYLOOPBACK (ruled: full stack by default, warn when not) — **part** | Studio 9ac8eaf, 097216d30 | Studio Publish defaults to "A Server of Your Own" when the backend is local; the editor's Deploy to folder asks "Deploy the front end only". Engine CLI default NOT flipped (Studio and `nodegx deploy` call it with no flag; an engine refuses an unknown flag) | editor tests-unit 11/11, Studio 17/17 |
| P112-OWN020-PILLWRAP + FILLGROW (ruled: warn and teach, make sure it works) | ef0e90f79, Studio 8bc0b53 | Two live rules in ALL_RULES (Problems panel + agent writes), guidance in `badge`/`shell`, the in-page preview passes its report on, Studio lists both under the app with a fix button | rules 11/11; 196-project calibration (2 / 33 hits, 0 templates); CGQ1 rendered: pill 2 lines → 1, header 251/296 px → 17; Studio check:layouttips 10/10 round-trips NodeGX's validator |
| P121-TWO004-ADMINNARROW (ruled: not for Beta) | a9664e4f7 | Row stays open, after the Beta | — |

## For Richard

1. **Push and publish**: 28 + 9 commits. Studio's layout tips need the in-page preview from ef0e90f79 (vendor refresh
   after the next `@nodegx/preview`); with an older one they show nothing.
2. **The engine CLI's default** (above): flipping it needs Studio and `nodegx deploy` to pass `--frontend-only` in the
   same release as the engine that knows it. Say if you want that done anyway.
3. **OWN008-AUDIT is one advisory, not six**: a fresh install today reads 3 moderate (the fxp XMLBuilder advisory,
   counted three times); the chokidar highs went by themselves. Removing it means fxp 4.5.7 → 5 in the runtime's XML
   node, its spec and the pin every exported app carries, together.

## Next

1. OWN008-AUDIT: install fxp 5.11.2 in a scratch, run the XML node's spec scenarios against both versions, then move
   runtime + node-spec + `PARSE_DEPENDENCIES` together and measure the runtime bundle growth; the Swift `FXP_JS` holds
   only XMLParser (no advisory) and is lane 4's.
2. DEPLOYLOOPBACK's third-party half (editor + agents only): a live address per Backend Services entry, written into
   `nodegx-config.json` (`deploy-config.ts` already merges `backendServices`), a per-type sentence, a reachability check.
3. Session 9's Next list stands: MCPJSONABSPATH (your machine), DROPDOWNFOCUSDIVERGE (one CDP drive),
   BUTTONFOCUSSURVIVOR.

## Traps met

1. 🔴 **A static layout rule cannot know whether the page is shorter than the screen.** Neither `bodyScroll` nor
   `minHeight` separated the measured bands from the quiet hits. Render before believing a calibration.
2. 🔴 **The validator's layout checks in `layoutInertCombination.ts` reach agents only**; the Problems panel runs
   `ALL_RULES`. A rule a person must see goes there.
3. 🔴 **An engine flag is a contract with every caller**: `nodegx-deploy` refuses an unknown argument, so a new default
   with an opt-out flag breaks whichever caller updates first.
4. The in-page preview's ok result dropped the validation report it had; Studio's problem box showed errors only.
5. Base reds, identical with this session's files swapped back: editor tests-unit 11 suites / 24 tests; mcp 8 / 12
   (P127 peer edits in `noodl-mcp` give tsc errors in nodegx-backend and preview's dep-002 test, not this session's).

# Session 11, 2026-10-26 (next session reads this first)

Session 10's first item (OWN008-AUDIT) done, then four more rows on the Beta's road, and a bug found on the way.
**Nothing pushed**: `cline-dev` is 44 commits ahead of `origin/cline-dev` (a P127 peer committed beside this session).

## Done

| row | commit | built | graded |
|---|---|---|---|
| P112-OWN008-AUDIT (ruled: remove the warnings) | 0d822ff67 | `fast-xml-parser` 4.5.7 → 5.11.2 in all four places at once: runtime, node-spec and editor `^5.11.2`, the export's `PARSE_DEPENDENCIES`, the Swift export's carried parser (regenerated from 5.x's own `lib/fxparser.min.js`: 5.x has no CommonJS `src/` and exports no `./package.json`) | 31 documents × 8 option sets: 240/248 identical, the rest one kind (5.x expands `&hellip;`). Viewer bundle +13.8 KB gzipped (built twice, 4.5.7 aliased in). node-spec packed from this tree + the registry's mcp, preview, project-contract: **npm audit 0** |
| **BETA-S11-ENTITYCAP** (filed, fixed) | 0d822ff67 | 4.5.7 refused any document with more than 1,000 escaped characters (`&amp;`, `&#169;`): a blog feed of about 150 posts read as `xml/parse-failed` | `beta-s11-entitycap` red 2/2 on 4.5.7, green on 5; fed-001 43/43, Parse XML and Parse Feed conform, backend feed suites green |
| P112-OWN021-FEEDFLAKE | e9e48ccca | Not the product: five concurrent `heartPost` calls keep 1 or 2 rows (count by person stays 1, by design), and the spec asserted exactly one | every burst response logged over 13 runs; 8/8 green after; the six heartPost mutants red |
| P123-STU031-COPYBOX | f107a9cb6 | The kit's `elementsOf` follows a copy's `getRoots()` (`src/inPage/drawnElements.ts`) | real component instances (corpus harness): red 2/5 with the roots branch out, 5/5 |
| P107-C98 (HIGH) | 0388d02ca | A Video's Volume is held at 0 or 1, a non-number plays at 1 (`playableVolume`); the C98 row marks, withheld values and known row gone | jsdom's own setter, each refused value shown to throw first, 13/13; Video conformance's two reds identical with HEAD's files (VIDEOEMBEDSEED, C96 below) |
| P123-STU015-BASEURL | 2bb610716 | `base-path.ts`: the base comes off on read and goes on an absolute path on write, path mode only, in the Page Router, Page Stack, Navigate To Path and `navigateToPath`. An app's own path navigations now work in the preview Studio road-tests in | real router methods over a jsdom `location`: red 4/8 on HEAD's files (the base cases only), 8/8; 15 navigation suites 186/186; Router, Page Stack, both navigates conform 11/11 |

Measured, left open: **P107-C96**'s scenario no longer fires on the runtime (its known-rows check is red at HEAD for it).

## For Richard

1. **Push and publish.** 44 commits. 🔴 `@nodegx/node-spec` must be published at a NEW version for the audit to read
   0 for a stranger: the registry's 0.2.0 depends on `^4.5.7`, and project-contract 0.2.1 asks for `^0.2.0`.
2. **A question, P121-TWO003-GROUPKEYBOARD:** *"A card made from a Group that opens something on Click can't be
   reached with the Tab key. Should a Group with Click wired become keyboard-reachable by itself (Tab stops on it,
   Enter or Space clicks it), or should it be a setting the builder turns on?"* (Either one changes the Group, Text
   and Image specs; a warning while building is the cheap first half either way.)
3. Standing: the engine CLI's full-stack default (session 10), MCPJSONABSPATH's measurement on your machine.

## Next

1. GROUPKEYBOARD once ruled.
2. C96: which change made its scenario stop firing; close the row or narrow it.
3. Session 10's list stands: DEPLOYLOOPBACK's third-party half (editor + agents, off the Beta walk),
   DROPDOWNFOCUSDIVERGE (one CDP drive), BUTTONFOCUSSURVIVOR.
4. Open rows still on the walk, not taken: P112-OWN023-PHONEPREVIEW (a phone on the Wi-Fi gets a page whose backend is
   127.0.0.1), P112-OWN023-KEYNEEDSAGENT (measure first whether the preview's backend reads the app's `.env`).

## Traps met

1. 🔴 **The runtime's node-spec target compiles viewer files with the runtime's tsconfig**, where the bare `Noodl`
   global is not declared. A new viewer module that names it fails every spec's setup: EMPTY failures, no TS error
   printed, and a viewer `tsc` that is clean. Read `globalThis.Noodl`, and run `NSP_ONLY=` conformance after any new
   viewer module.
2. 🔴 **Specs cite viewer files by line** (`router.tsx :923`, `Video.tsx :236-305`, the runtime's `xml.ts :146`). Put
   a new helper at the end of the file, use a spare blank line for an import, and compare each cited line against
   `git show HEAD:` before committing. All held this session.
3. 🔴 **`jest -t` is not a rerun of one test in a spec whose tests share state**: it skips the setup tests and reads
   as a different failure (FEEDFLAKE's first reading was that).
4. `grep -rl` skipped `fed-001-feed.test.ts` (it holds a NUL byte) and then `golden.js --help` RAN the writer: there
   is no help flag.
5. `fast-xml-parser` 5 exports no `./package.json`: `require.resolve('fast-xml-parser/package.json')` throws.
6. A dependency bump writes `package-lock.json`, which a peer had open: the commit carries only this session's delta
   (diff against a copy taken before `npm install`, patched onto HEAD's lock, committed through a temporary index).

## Gates read (2026-10-26)

runtime: fed-001 + entitycap 43/43, tsc clean; conformance `NSP_ONLY` ParseXML/ParseFeed green, Video 2 reds identical
on HEAD, Router/Page Stack/both navigates 11/11 · export: the-parsers + Swift s9 54/54, tsc clean · node-spec: golden
--check fresh, golden/runner/draw 107/107; honesty (5 templates) and honesty-ledger red at HEAD from template drift (a
peer has the ledger open); bundle-size over budget before this (P107-SIZE) · backend: cloud-feed-nodes 12/12, feed
suites green but the burst (fixed) · preview: copybox 5/5; tsc's two dep-002 errors are a peer's P127 work · viewer:
c98 13/13, baseurl 8/8, navigation suites 186/186, tsc clean, prod viewer bundle builds.

**Commits this session:** 0d822ff67, 5a2d85a56, e9e48ccca, 656f5e938, f107a9cb6, 9e99e8ae3, 0388d02ca, 4aa8029a2,
2bb610716, f2b0a8754, and the docs commit after them.

## The npm 0.2.7 re-cut (2026-10-26, after session 11)

Richard said "let's push to npm". Release commit 541f6d3e0 (pushed with the 45 before it): `@nodegx/preview` 0.2.7,
`@nodegx/node-spec` 0.2.1, `@nodegx/project-contract` 0.2.2; mcp and the three create-* stay 0.2.7 (never published);
export and canvas-look stay. The 0.2.7 changelog section rewritten for everything since the first cut. Packed in the
worktree `OpenNoodl-worktrees/npm-0.2.7b` at that commit (every build link into primary removed first, primary's dist
untouched), tarballs and `SHASUMS.txt` in `OpenNoodl-worktrees/npm-0.2.7b-tarballs`. Graded from the tarballs, outside
the checkout: fresh install of the four kit packages **npm audit 0**; stranger-kit 16 CJS + 2 ESM entries, types under
node/bundler/node16; stranger-render "DONE — clean"; stranger-backend every step; file lists equal to the first cut's;
the bundles carry no 4.5.7 sentence. create-* tarballs are byte-identical to the first cut's.

**Publish = Richard's terminal (OTP):** `scripts/own/publish-npm.sh ../OpenNoodl-worktrees/npm-0.2.7b-tarballs`. After:
read each version's shasum from the registry's full document against `SHASUMS.txt`, then deploy nodegx-web for the
changelog page. The P127 peer's `@nodegx/backend-map` 0.1.2 is a separate publish, also on his OTP.
