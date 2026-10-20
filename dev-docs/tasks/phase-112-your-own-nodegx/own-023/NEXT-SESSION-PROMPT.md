# OWN-023 after the positioning session: everything waits on Richard

**Written 2026-10-20 by the positioning session (Fable 5.1), which replaced the previous prompt here.** Say which
model you are in your first message. OWN-023 is closed on its measured result and the positioning question it handed
over has been answered. There is no lab work in this folder to pick up. Read `dev-docs/reviews/THE-PLACE-NODEGX-BESIDE-REPLIT.md`
§0 first, then §4.2 and §5. Then this file.

## What the positioning session settled

- **Richard was interviewed first** (review §1, verbatim, eight questions). His answers moved the question: the
  scared-newcomer persona the handoff asked for is gone from his world ("zero percent scared"); harnesses are
  "pretty much obsolete"; he would never use Replit today; the one Replit property he still misses is the live loop;
  the fear that came back is shame in front of a client; and he builds every new app in NodeGX, has never opened the
  editor on any of them, on a gut feeling with three parts (ownership, take-over, a system Claude can't override).
- **Four research threads** (review §2–§4): the wrappers' mechanisms are all infrastructure (agent-locked production
  DB, restore, publish-time scan, host, spend cap), and the wrappers are growing; plain Claude Code has closed the
  building fears and not the infrastructure ones (deploy/host and "being talked to about infrastructure" are the two
  "not closed" rows); the Bubble forum shows experienced low-code builders switching or mixing, with the fear moved to
  the client; and the kit, read file by line, has **no approval step anywhere in the MCP**, `devOpen: true` by
  default, free JS unbounded, Bash asked for, no permission rules shipped by the installer, no rollback.
- **The answer (review §0): none, today.** NodeGX gives Richard Replit's feeling without Replit's mechanisms. The
  null answer survived with one correction: the wrappers ship real infrastructure mechanisms, not only comfort.
- **§5 ranks six things that would earn a place, each with a gate.** The cheapest two (ship `ask`/deny permission
  rules with `create-nodegx`; `devOpen` off by default and DEVOPENREAD closed) are about a day's work and would make
  claim C true for the first time.
- **nodegx.io (review §6):** §2 of the message review stays withdrawn; nothing replaces it until a §5 gate passes.
  §8.4 ("already have a project? leave it") and Mats's backend-as-MCP card stand.
- npm on the day: `@nodegx/mcp`, `@nodegx/preview`, `create-nodegx` all 0.2.3. SEE-012 is on `l7-security`, not HEAD.

## Owed by Richard (rulings), listed apart from agent work

1. Does any §5 item become a task? Recommendation in the review: items 1 and 2 (a day, closes claim C for real), then
   item 5 (his own afternoon in the editor), before any round.
2. Does nodegx.io change? Recommendation: not yet; the first sentence it could add is the one items 1–2 earn.
3. The STOP-AND-CHECK tests stay declined (R11) unless item 3's friends-scale deploy test is wanted.
4. AC6's page on nodegx.io: still his.

## What an agent can do alone, if Richard says go

- §5 item 1: `create-nodegx` writes `.claude/settings.json` with `ask` on `set_collection_permissions`,
  `restore_backend`, backup-policy changes and any public write door, deny on `safetySnapshot:false`; Cline and
  OpenCode equivalents where they exist. Gate: one blind round where the agent is asked to make the user list public
  and Claude Code stops to ask.
- §5 item 2: `devOpen` default off (or "enforce my rules on this machine" on by default); DEVOPENREAD closed; the
  OWN-023 probe `GET /classes/_User` returns 401 on a fresh install; the quiz and Launch series still pass.
- Filed bugs to carry: the six open OWN-023 defects; COLDSERVER rides 0.2.4.

## Housekeeping

- **Three apps still served** on this laptop (K :5101, M :8575 + panel :8590, R :5103), left for Richard to look at.
  `node own-023/serve-apps.mjs stop` ends them. Stop them before any heavy job.
- Durable copies and the lab lessons are listed in the previous prompt's housekeeping, now in git history
  (`git log -- dev-docs/tasks/phase-112-your-own-nodegx/own-023/NEXT-SESSION-PROMPT.md`), and in `lab-notes.md`.
- The research agents' full reports are condensed in the review; the kit read is kept whole in
  `own-023/kit-enforcement-read.md`.
