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
