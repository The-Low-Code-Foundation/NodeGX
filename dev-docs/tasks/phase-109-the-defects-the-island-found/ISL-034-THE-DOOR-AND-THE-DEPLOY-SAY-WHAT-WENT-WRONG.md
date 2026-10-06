# ISL-034 — The door and the deploy say what went wrong

**Status: ⬜ not started. Scoped 2026-10-05 at `8292f1d55` by the ledger sweep (Track F).** **Source:** 6 bugs from
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
| [P109-S4-UNROUTEDPAGE](../../bugs/p109-s4-unroutedpage-a-page-written-into-a-project-with-no-router-is-unreachable-and-nothing-says-so.md) | medium | open | A page written through the door into a project with no Router is unreachable, and no tool says so |
| [P109-S5-STALEDEPLOYCLI](../../bugs/p109-s5-staledeploycli-nodegx-deploy-validates-against-a-catalog-bundled-weeks-ago.md) | medium | open | In a checkout, `nodegx deploy` validates against the catalog baked into a gitignored bundle, and refuses a valid project when that bundle is stale |
| [P109-S12-CAMELROOTS](../../bugs/p109-s12-camelroots-a-misnamed-argument-is-dropped-without-a-word.md) | medium | open | create_component drops a misnamed argument (visualRoots for visual_roots, a stringified array) without a word |
| [P109-S18-UNNAMEDROUTER](../../bugs/p109-s18-unnamedrouter-a-router-with-no-name-answers-every-url-with-its-start-page.md) | medium | open | A Router written with no `name` is left out of the deployed router index, so every URL opens its start page |
| [P109-S1-CN004](../../bugs/p109-s1-cn004-strict-stray-type-reports-two-unknown-node-type-diagnostics.md) | low | open | Under strict validation a stray node type is reported as two unknown-node-type diagnostics, not one |
| [P109-S15-RENDERPAGENAME](../../bugs/p109-s15-renderpagename-render-report-refuses-a-page-by-the-path-create-component-took.md) | low | open | render_report / drive_page refuse a page asked for by the path create_component took ("Pages/Garden") or by its title ("Garden"); only "/Pages/Garden" or its route resolve |

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
