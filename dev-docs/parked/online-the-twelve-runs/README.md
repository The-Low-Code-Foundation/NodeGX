# Online: the twelve runs (parked from P115)

**Parked 2026-11-07 at P115's close, by Richard's ruling R7 (2026-11-06).** The October research plan of
[Phase 115](../../tasks/phase-115-online-on-your-own-account/README.md), which closed on the Cloudflare work and a
domain instead. Nothing here was started. "README §n" inside these task files means P115's README, which stays where
it was: §1 its readings of 2026-10-07, §4 the six measurements, §9 what it was never going to do.

> "Now if someone had a system where it just set up the VM, got you the domain name you wanted, connected all the APIs
> and just said 'ok now go ahead and start your conversation with Claude', that would be a big deal."
> — Richard's ex-client, 2026-10-07

## The idea in one paragraph

Put three reference apps (A: a pure front end; B: a front end with server-side workflows; C: full stack) online by two
routes each (Cloudflare with no VM; a box the person owns), with Richard and then a stranger at the keyboard. Twelve
runs. Per run: every human step outside Claude, counted and screenshotted; the sign-ups and where each token ended up;
the bill on day 1 and day 30; whether it still serves after 30 days untouched; what works with NodeGX uninstalled; the
first page on a phone. Then Richard rules the default route per shape (R1), and the one sentence a person says to
Claude is written.

## What P115 already answered, so a session that unparks this starts further on

- **The Cloudflare route exists as a product** (P115 HST-010 … HST-018): one command (`deploy.mjs`) puts a full-stack
  NodeGX app on one Worker on the Free plan, the whole backend in a Durable Object, files in R2, schedules on the
  object's alarm, a refusal said in words and emailed, a custom domain, and Claude buying that domain on a word-for-word
  yes. Shapes B and C on Cloudflare are built; shape A is a subset of C.
- **R6** (one Worker, not Pages plus a Worker), **R2** (Claude may buy a domain on a word-for-word yes to a fresh
  check) and **R8** (catch, say, email) are ruled. **R1** (the default route per shape), **R4** (directory or registry)
  and **R5** (the interpreter's size) are not.
- The VM route is P112 [OWN-016](../../tasks/phase-112-your-own-nodegx/OWN-016-SHIP-IT.md)'s (P112 R18).
- Registering NodeGX's own Cloudflare OAuth client, so that a person needs no terminal, is the phase that followed
  P115 ("Online from Claude Desktop"), not this one.

## The tasks

| task | what |
|---|---|
| [HST-000](HST-000-THE-HOURS-WRITTEN-DOWN.md) | The ex-client's lost hours, one row each, with the task that removes it or "stays human" |
| [HST-001](HST-001-THE-CAMPUS-FLOW-REBUILT.md) | The client's id-in-the-link flow built through Claude Desktop and the MCP, no editor (P115's Fixture C is most of it, built through the MCP from Claude Code) |
| [HST-003](HST-003-PAGES-AS-A-DEPLOY-TARGET.md) | Cloudflare Pages as a deploy target (R6 chose one Worker instead: re-scope before starting) |
| [HST-005](HST-005-A-BOX-YOU-OWN.md) | A box you own: Hetzner re-measured on its console, Cloudflare Containers as the third row |
| HST-007 §1–§5 | The rest of [the domain task](../../tasks/phase-115-online-on-your-own-account/HST-007-THE-DOMAIN.md): other registrars, the human steps counted per run. Its §9 (Cloudflare's registrar and a Worker's custom domain) was P115's and stays there |
| [HST-008](HST-008-THE-COMPARISON.md) | The comparison: twelve runs, six measurements, vendor numbers re-read on the day, R1 asked |
| [HST-009](HST-009-THE-WORDS.md) | The words: the sentence a person says, what the connector says as it works, the listing |

## Acceptance criteria (P115's §7, 3–6, carried here by R7)

3. Each of the three fixtures is online by both routes, on an account Richard owns, from the connector.
4. Every human step outside Claude is counted and screenshotted, per run.
5. The twelve-run table exists with all six measurements filled, and the vendor numbers in it carry the date they were
   read.
6. Richard has ruled the default route per shape (R1), and the sentence a person says is written (HST-009).

## What it would need

A stranger at the keyboard for the timed runs, a box on Richard's card for the VM rows, and a month: the survival
reading is 30 days untouched. About 8–10 sessions plus the month (estimated 2026-11-06, R7). Every vendor figure in
P115's §1 is from 2026-10-07 and is re-read on the day this is unparked.
