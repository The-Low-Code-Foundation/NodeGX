# FIX-01 — after t1-nodegx-1: the database a stranger builds on must keep users apart by itself

**Written 2026-10-22 ~17:15 CEST by the lab session.** Read `README.md` here first (the loop, the gate, the rules).
**Gates:** the next NodeGX round (t1-nodegx-2) waits for items A–C.

## What happened

DeepSeek V4.1 Flash in Cline, kit 0.2.5 from the registry, built an app where several households sign in and each must
see only its own records. Plain-code arms given the same request scored 21 and 20 of 22; the NodeGX arm scored **16**.
The grader's findings and DeepSeek's own reasoning (timeline:
`/Users/Shared/nodegx-lab/own026/t1-nodegx-1/sittings/1/agent.jsonl`; grade:
`/Users/Shared/nodegx-lab/own026-grades/t1-nodegx-1/grade.json`; lab notes: `../PLAN.md` §8, `LEARNINGS.md` #1):

1. **It couldn't learn how to filter a Query Records on the server** → it fetched every household's rows and dropped
   the others in a Function node. Filed: `dev-docs/bugs/p112-own026-queryfiltershape-…md` (the real shape is
   `visualFilter` + `qp-*` ports, used in `templates/nightbook`; `get_node_type` answers notFound, no example).
2. **It saw the local backend was open and had no way to close it.** Its words: *"`devOpen: true`, `enforced: false` …
   That's concerning … Is there a tool to enable enforcement?"* There isn't (`P112-OWN023-NOENFORCETOOL`). It planned
   `set_collection_permissions` (creatorOwns + authenticated) and never called it. With devOpen on, the grader read and
   changed every household's rows with another user's token, and with none (`P112-OWN023-DEVOPENREAD`).
3. **Shared progress was written back from the page.** The page held the whole progress object and wrote it back
   after every answer, so two open tabs overwrote each other, and a double press answered the next question too.
   The plain-code arms changed progress on the server, once per answer, checked against the question it answered.
   (The fourth miss, a `.slice(0, 10)` that keeps the oldest ten, is DeepSeek's own JavaScript: no kit fix.)

## A. Users are kept apart without the agent having to remember (gates)

The goal: an agent that builds with the kit's backend gets per-user separation **enforced on its local backend from
the first record**, the same rules that hold when deployed, so what it tests is what ships.

- Decide and build the smallest change that gets there. Candidates, to measure, not to assume: `provision_backend`
  (and the kit's other backend-creating paths) write `"devOpen": false` with the existing defaults (`authenticated` +
  `creatorOwns: true`), and/or a tool that turns enforcement on (NOENFORCETOOL's own fix). Read DEVOPENREAD,
  NOENFORCETOOL and `packages/nodegx-backend/src/security/` first. devOpen exists for a reason (the editor? the admin
  dashboard? seeding?), so find out what turning it off breaks before you turn it off, and fix that too or say why not.
- **Proof:** a fresh backend from the packed kit: an anonymous `GET /classes/<c>` is refused; user B's token can't read
  or change rows user A created; A's own app still signs up, creates, queries and updates its rows.

## B. The server-side filter is learnable (gates)

QUERYFILTERSHAPE's fix list: `get_node_type` (and the catalogue) describe Query Records' `visualFilter` (rules,
operators, the `qp-<name>` port each `input` makes), and `validate_component` refuses a made-up shape (e.g.
`querySettings.filter`) with the real one in its suggestion. Add an example of a signed-in user's own records filtered
on the server by a wired value. Mark QUERYFILTERSHAPE fixed with the commit.

## C. Change shared state on the server, once (gates; generic guidance, measured capabilities)

The kit should teach, where an agent reads it on the way to building, two lessons every multi-device app needs:

1. **A value several devices change (a count, a score, a balance) is changed on the server, by the amount of the
   change, never written back from what one page holds.** First find what the backend actually offers (an increment
   operation? `Update Record`'s `onlyIfUnchanged`? a cloud function?), then teach the real one, with an example that
   runs.
2. **A press that saves is taken once:** the control ignores presses until the save it started has answered (and the
   answer belongs to the question or item it was given for).

Put them where the trace shows DeepSeek looks: `get_project_info`'s guidance, the example library (`list_examples`
queries it ran: "filter the query on the server owner isolation"), and/or the node descriptions of Update/Create Record.
Keep each to a few lines. Generic words only (README rule 3).

## Not now (own sessions, don't gate)

- `P112-OWN026-NESTEDCHROME`: a render that can't start Chrome's sandbox hangs 240 s and leaves its server running.
- `P112-OWN023-CATALOGDIG`, `P107-S79-ADAPTERLABEL`: related catalogue honesty, if B doesn't already cover them.

## Done

**2026-10-22, fixer session opennoodl-54.** Commits `f2afd62b0` (A + C backend/doctrine), `0b9becca8` (B + C
example/catalogue), `ddd876378` (bug ledger). **Kit:** `/Users/Shared/nodegx-lab/kits/FIX-01-ddd876378/`
(`nodegx-mcp-0.2.5.tgz` sha1 `db87ff4c8471c780fa79e0f5a8184a5cc009c0d9`; `create-nodegx-0.2.5.tgz` is byte-identical to
the registry's, sha1 `cee60bdc…`, because nothing in it changed), packed under HEAVY.lock in the clean worktree
`OpenNoodl-worktrees/own026-fix01-pack` at `ddd876378` (`git status` empty after).

**A — users kept apart, enforced from the first record.** The backend takes `--enforce-rules`: a first start with
no `security.json` (and no project policy) mints the existing defaults (`authenticated` + `creatorOwns`) with
`devOpen: false`. `provision_backend` passes it (so does `@nodegx/preview`, which only matters once preview is
re-published), and answers `rules: { enforced, note }` read back off the backend. New tool `set_backend_enforcement`
(backend group; resident surface unchanged at 8274/8280) for a backend made dev-open before. What turning devOpen off
breaks, measured: nothing the kit itself does — its backend tools use the admin credential (seeding, schema,
permissions all work), deploying and calling cloud functions passes (hls013), and rows the tools seed have no owner, so
every signed-in user reads them. What it changes for an app, by design: a page that reads before sign-in gets 403
until that collection's find/get is "public", and a collection users share needs `creatorOwns: false`; the note says
both. The editor's own spawner is untouched and still mints dev-open (its decision, not this kit's).
**Proof, from the tarball, empty HOME, over stdio:** `create-nodegx --cline` writes AGENTS.md, the skill and
`~/.cline/…/cline_mcp_settings.json`; `provision_backend` → `rules.enforced: true`; anonymous `/classes/Note` and
`/classes/_User` 403; user B finds 0 of A's rows, B's PUT 404; A creates, finds, updates (200);
`set_backend_enforcement` false → anonymous 200, true → 403.

**B — the server filter is learnable.** `get_node_type DbCollection2` names `visualFilter` (rule shape, operators,
`input` → `qp-<name>`, literal `value`, nested groups), `visualSort`, limit/skip/count, and the fetch-at-build trap
with its fix; `ports:["querySettings"]` answers with the shape. New error rule `query-records-shape` on every write
and validate refuses `querySettings`/`filter`/`where`/unknown operators/a `qp-` no rule reads, with the real shape
and the example attached. Example `cloud-query-own-rows`. QUERYFILTERSHAPE fixed; ADAPTERLABEL fixed for this type
only. **Proof from the tarball:** the node type names `visualFilter` and `qp-`; a `querySettings` write is refused
with `query-records-shape` and the shape; `list_examples` "filter the query on the server owner" and "only my
records" → `cloud-query-own-rows` (after `find_tools({group:"explore"})`, as an agent opens that group).

**C — shared state changed on the server, once.** What the backend offers, measured: Parse's `Increment` op
(`Noodl.Records.increment` in a Function node) and Update Record's `onlyIfUnchanged` (HLT-016). `Increment` on a field
no record had set answered 404 "Object not found" — fixed in both SQL adapters (P112-OWN026-INCREMENTNEWFIELD); from
the tarball it now answers 200 with the amount. Taught in three places an agent reads: `get_project_info`'s
`backendDoctrine` (new section "Users, and values more than one device changes": the backend keeps users apart; change
a shared value by the amount; a saving press taken once, applied to the item it was for), `provision_backend`'s rules
note, and Update Record's antiPatterns; example `cloud-shared-counter` (increment on press, `idle` → Button
`enabled`, id read once, `runOnChange-in-recordId` off), found by "a count several devices change" and "increment".
Validated strict; **not driven in a browser** — its wire request is the one measured above.

**Not done / not changed, and why:**
- `@nodegx/preview`'s flag is not in this kit (a command the agent types resolves to the registry). It does not
  gate: preview restarts the data dir `provision_backend` made, whose `security.json` is already enforced.
- FilterDBModels (`fp-` ports) got no matching check or catalogue text (ADAPTERLABEL stays open for it and Router).
- CORS `*` unchanged: on an enforced backend an anonymous cross-site read is refused like any other.
- Found on the way, not FIX-01's: `sbr009ThemeEditorDrive` red (P112-OWN026-SBR009HOME, open; red with the new rule
  removed too), and a stale email-template list in `backendTools.test.ts` (fixed, -EMAILCODESTALE).
- Not run: the full noodl-mcp and backend suites (run: the touched specs, every provision/backend spec — 107 MCP and
  247 backend tests — the template suites that write Query Records graphs, `catalog:examples` 112/112, the surface gate).
