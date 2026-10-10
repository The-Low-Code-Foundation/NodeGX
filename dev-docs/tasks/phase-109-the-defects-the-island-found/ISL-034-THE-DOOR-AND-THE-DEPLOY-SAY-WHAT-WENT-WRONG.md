# ISL-034 — The door and the deploy say what went wrong

**Status: ✅ closed s39 (2026-10-10): all 6 rows re-measured at `d3fc44f7b` (all six still fired), all 6 fixed, plus one found beside them (§8).** Scoped 2026-10-05 at `8292f1d55` by the ledger sweep (Track F). **Source:** 6 bugs from
the ledger (`dev-docs/bugs/`) that had no task: 4 medium · 2 low. **Side:** noodl-mcp (tool argument parsing, page registration, render harness, strict validation), nodegx deploy CLI

## 1. The person sentence

**An agent that sends a misnamed argument, writes an unreachable page or names a page by its path is told so, in that call. `nodegx deploy` validates against the catalog of the checkout it runs in.**

## 2. Why these belong together

Track D's sentence ("the MCP is the whole authoring path") with the holes its sessions met. A misnamed argument is
silently dropped by zod (S12-CAMELROOTS). A page written into a project with no Router is unreachable, and no tool says
so (S4-UNROUTEDPAGE). A Router with no name answers every URL with its start page after deploy (S18-UNNAMEDROUTER).
`render_report` refuses a page by the path `create_component` used (S15-RENDERPAGENAME). Strict validation reports one
stray type twice (S1-CN004). In a checkout, `nodegx deploy` validates against a stale, gitignored bundle (S5-STALEDEPLOYCLI).

## 3. The bugs

Worst first. Each file holds the measurement, the reproduction and, for most of them, the proposed fix and the question
to ask. This table is generated from the ledger headers. **The ledger file is the source**, so read it before you start.

| bug | severity | status | what a person sees |
|---|---|---|---|
| [P109-S4-UNROUTEDPAGE](../../bugs/p109-s4-unroutedpage-a-page-written-into-a-project-with-no-router-is-unreachable-and-nothing-says-so.md) | medium | fixed `1d7bbf1bf` | A page written through the door into a project with no Router is unreachable, and no tool says so |
| [P109-S5-STALEDEPLOYCLI](../../bugs/p109-s5-staledeploycli-nodegx-deploy-validates-against-a-catalog-bundled-weeks-ago.md) | medium | fixed `d88ae73d6` | In a checkout, `nodegx deploy` validates against the catalog baked into a gitignored bundle, and refuses a valid project when that bundle is stale |
| [P109-S12-CAMELROOTS](../../bugs/p109-s12-camelroots-a-misnamed-argument-is-dropped-without-a-word.md) | medium | fixed `aefa23791` | create_component drops a misnamed argument (visualRoots for visual_roots, a stringified array) without a word |
| [P109-S18-UNNAMEDROUTER](../../bugs/p109-s18-unnamedrouter-a-router-with-no-name-answers-every-url-with-its-start-page.md) | medium | fixed `86d00461a` | A Router written with no `name` is left out of the deployed router index, so every URL opens its start page |
| [P109-S1-CN004](../../bugs/p109-s1-cn004-strict-stray-type-reports-two-unknown-node-type-diagnostics.md) | low | fixed `c6abe20c3` (the spec's fixture) | Under strict validation a stray node type is reported as two unknown-node-type diagnostics, not one |
| [P109-S15-RENDERPAGENAME](../../bugs/p109-s15-renderpagename-render-report-refuses-a-page-by-the-path-create-component-took.md) | low | fixed `bf82671af` | render_report / drive_page refuse a page asked for by the path create_component took ("Pages/Garden") or by its title ("Garden"); only "/Pages/Garden" or its route resolve |

## 4. Order of work

S18-UNNAMEDROUTER and S4-UNROUTEDPAGE first (a deployed site that silently shows the wrong page), then S12-CAMELROOTS (refuse unknown keys with the right name), S5-STALEDEPLOYCLI, S15-RENDERPAGENAME and S1-CN004.

## 5. Rules for every row

- **Re-measure first.** Each row was measured once, by the session named in its `found:` line. Re-run its
  reproduction at HEAD before building. A row that no longer reproduces is closed in the ledger with the commit that
  fixed it, not fixed again.
- **When a fix lands**, set the ledger file to `status: fixed` with `commit:` (and `regression:` if it has a `kit:`).

## 6. Related work and collisions

- The MCP tool surface has an 8,200-token budget gate (memory: *mcp-tool-surface-has-an-8200-token-budget-gate*). A refusal message costs nothing, but a new argument does.
- Sweep rule: this task was made from the ledger, **not re-measured** when it was written (2026-10-05). The first session
  re-measures each row (§5) and closes the ones already fixed before it asks or builds anything.

## 7. Acceptance criteria

- **AC1** — every row in §3 is re-measured at the session's HEAD. Each one still firing is recorded, and each one that is
  not is closed in the ledger with the commit that fixed it.
- **AC2** — every `needs-ruling` row is asked in plain words and ruled. A row ruled "keep it" becomes `wontfix` with the
  ruling as its `reason:`, or moves to [ISL-033](ISL-033-A-NODES-DESCRIPTION-SAYS-WHAT-IT-DOES.md) when the ruling is
  "describe it, don't change it".
- **AC3** — every row ruled "fix it" is fixed, one commit each (or one per shared mechanism), with its regression
  (`regression:` in the ledger) green and its known row dropped in the same commit.
- **AC4** — `node scripts/bugs.js --from P107` and `--from P109` list none of this task's rows as `open` or `needs-ruling`.

## 8. Sessions

### s39 (2026-10-10, P109 session 39, on `cline-dev`, primary tree) — closed

**AC1 — re-measured at `d3fc44f7b` before building. All six still fired**; none had been fixed on the way by ISL-014 or
ISL-018 work:

| row | the reading at HEAD |
|---|---|
| S18-UNNAMEDROUTER | `getRouterIndex` filtered on a truthy name. The Page Router spec (v5) and the runtime grade's target both modelled the filter |
| S4-UNROUTEDPAGE | `resolveRegistration` returned `undefined`; no field, no diagnostic |
| S12-CAMELROOTS | no `.strict()`, no report: zod stripped the key |
| S5-STALEDEPLOYCLI | live the same morning: the engine had been rebuilt at 13:19 by another session *with this session's uncommitted exporter edit in it*; the deploy runtime (09:15) was older than 12 viewer/runtime sources |
| S15-RENDERPAGENAME | the resolver compared against `/Pages/Garden` only, and never read the title |
| S1-CN004 | the full noodl-mcp run read 2 for 1 (s6's reading holds: the fixture's wire, not a duplicate producer) |

**AC2** — no row needed a new ruling. S18 was ruled 2026-10-08 ("treat an unnamed Router as Main"). S12 follows §4
("refuse unknown keys with the right name"). S5's engine half follows Richard's ISL-014 ruling for the same shape ("Build
it automatically"). The others had a single proposal.

**AC3 — one commit each, each with a control:**

| row | commit | what changed | regression · control |
|---|---|---|---|
| S18 | `86d00461a` | the index lists every Router, a blank one as `Main`; `getPagesForRouter` reads a blank name as `Main`; Page Router spec v6 (one new scenario, and one written for a mutant the fix unpinned — below) | `tests-unit/isl-034/router-index.test.ts` 4/4 (HEAD 3 red); runtime 139/139 at 13 and 20732 (HEAD handler: the `''` scenario red; HEAD index: all five UNNAMED red); deployed drive `scripts/devtools/isl034-unnamed-router.ts` 6/6 (old engine copy: `routers: []`, `/olive` shows Robot) |
| S4 | `1d7bbf1bf` | `create_component`, `update_component`, `apply_plan` carry `unroutedPages { pages, summary }` | `pageRegistration.test.ts` 17/17 (HEAD sources: the three door claims red) |
| S12 | `aefa23791` | the SDK's `validateToolInput` overridden on the server instance: an unknown key is refused by name with "did you mean"; the advertised schemas are unchanged | `unknownArguments.test.ts` 5/5 (HEAD server: two red); full noodl-mcp run logged no refusal outside the spec |
| S15 | `bf82671af` | `resolvePageRequest` takes the authoring path and a unique title; a title two pages share names both | `tests-unit/isl-034/resolve-page-request.test.ts` 5/5 (HEAD: three red) |
| S5 | `d88ae73d6` | the engine's esbuild input list beside it, rebuilt automatically when older (0.2 s); the deploy runtime's webpack list, and a warning naming `npm run build:editor:_viewer` | `p109-s5-stale-deploy-engine.test.ts` 11/11; driven on the primary: rebuilt once, then silent; runtime warned, rebuilt, silent |
| S1 | `c6abe20c3` | the fixture's wire runs into Panel's `title` (an input) | `cn004.test.ts` 13/13 |
| **S39-STALECLIBUNDLE** (found here) | `1411841fd` | the `nodegx` bin (`dist/cli.mjs`, dated Oct 5) warns when older than its source | `p109-s39-stale-cli-bundle.test.ts` 5/5 |

**AC4** — `node scripts/bugs.js --from P109` lists none of these rows.

**Found on the way:**
- **A fix unpinned a mutant.** S18's spec change left one interpreter mutant alive at seed 20732: a dropped state set in
  `world.resume` when a reset-built page lands and a queued Reset fails. The old UNNAMED scenarios had not reached it
  either; generated sequence #153 did, with nothing after it to read the state. The way to find it: a scratch probe that
  replays `generateSequence(spec, seed, i)` through `discoverBranches` and prints the first sequence whose branch key
  matches. The new scenario reaches it at every seed (0 survivors at 13 and 20732). Two guessed scenarios had missed it,
  because acts and signals do not end a frame (only a settle does), so two Backs in one step merge into one reset.
- **The shared bundles were rebuilt by other sessions with uncommitted source**, the S5 hazard in the act. A control
  that needs the OLD engine: patch a copy, and put it in `noodl-preview/dist/` (it finds the viewer runtime relative to
  itself), named by `NODEGX_DEPLOY_CLI`.
- `stranger.test.ts`'s hash gate is red on five spec files (animate-to-value, delay, dropdown, repeat, uuid) that are
  P107's open NSP-018 edits. Not this task's.
- The full noodl-mcp run: 16 red suites, every one red without this session's changes or naming files it did not touch
  (TPL-011's untracked Nightbook, the kit `.d.ts` copies in TPL-007, Group's doc at 17,292 tokens over AWP-005's
  16,350, P116's contract types in ISL-023's reach, node-id allocation red with HEAD's server and S4 reverted).

**Owed, not this task's:** the people's MCP door (`noodl-mcp/dist`) carries none of S4/S12 until rebuilt
(P109-S36-STALEMCPDIST). The `nodegx` bin gains its own check at its next build. Neither was rebuilt here, because both
would carry other phases' uncommitted source.

