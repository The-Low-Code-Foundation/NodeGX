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
