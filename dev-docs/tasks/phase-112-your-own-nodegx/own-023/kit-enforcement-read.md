# What the kit enforces, asks for, and lacks — a fresh agent's read of the repo, 2026-10-20

Read for `dev-docs/reviews/THE-PLACE-NODEGX-BESIDE-REPLIT.md` §4 by an Explore agent given only the owner's three
claims (A ownership, B take-over, C "a system Claude can't override without permission") and told to be blunt. Repo at
`cline-dev` a801f3f77. npm on the day: `@nodegx/mcp` 0.2.2; `@nodegx/preview` 0.2.3 (published 2026-10-20 15:26);
in the repo mcp, preview and create-nodegx are at 0.2.3. Kept verbatim as the record; the review condenses it.

## Bottom line

The kit does enforce some things. It rejects badly structured graphs. The preview and deploy gate refuse a project
with validation errors. The backend refuses to start an open backend beyond loopback. Plans are all-or-nothing. A
backend reached through its own `/mcp` is limited by the API key's scope.

None of that stops an agent that has permission and a reason. Claim C is mostly **absent**:

- There is no human-approval step anywhere in the MCP. `grep -i "elicit|destructiveHint|confirmation"` over
  `packages/noodl-mcp/src` finds nothing.
- Free JavaScript is unbounded.
- The agent can open data rules with one tool call.
- Bash is on, and the kit's own instructions tell the agent to use `npx`.
- OWN-023 found NodeGX worse than plain Claude Code on dev-machine security (DEVOPENREAD) and found validated writes
  letting through a graph that throws at runtime (NOANCESTOR).

## Table

| # | Claim / item | Verdict | Evidence | Counter-evidence (OWN-023 etc.) |
|---|---|---|---|---|
| A | "Feels like I own it" | Enforced in part (plain files, GPL), advisory for the rest | Plain JSON on disk (`components/`, `nodegx.project.json`). Repo licence GPL-3.0 (`LICENSE`); mcp/preview/create-nodegx `GPL-3.0-only`; node-spec and backend MIT. | Backend data in `~/.noodl`, outside the folder a person would back up (`STOP-AND-CHECK.md:68`). File URLs stored as `http://127.0.0.1:8584/…` (FILEURLHOST, open). |
| B | "Could take over if Anthropic vanished" | Mostly real, partly designed only | Public GPL repo. The editor works on the same files (`DIRECTION.md` §1). Specs plus conformance 142/147 (`BOARD.md:18`). Strangers built nodes from specs alone, 7/7 and 5/5 on run 1 (P107 README:133, NSP-006). | Code export not claimable yet (`BOARD.md:49`, the 0.4.6 milestone). Full-stack-on-your-own-VM tooling not shipped (`BOARD.md:47`). |
| C | "A system Claude can't override without permission" | **Absent as stated** | No elicitation or confirmation in the MCP. `set_collection_permissions` (`tools/backendTools.ts:590-616`) goes straight to the admin API. Audit after the fact only (`query_backend_audit`, :492). | WRITEUP first line. STOP-AND-CHECK:69-71: F2 "no difference", F3 "never tested", F4 "NodeGX was worse". |
| 1 | Validated writes | Enforced for structure and graph rules. Free JS unchecked and unbounded | `validateCandidate` (`noodl-mcp/src/validate.ts:341-412`): schema (:312-330), semantic validator, ~40 precondition checks (`noodl-editor/src/editor/src/validation/authoredCandidate.ts:568+`). Inline Function `functionScript` only mined for port names (`functionPorts.ts:258`), never compiled at write time. Script files get a compile check and a 512 KB cap (`tools/scriptTools.ts:89-110, 46, 159`). Runtime: `new AsyncFunction` in the page with full `window`/`fetch` (`noodl-runtime/src/nodes/std-library/simplejavascript.ts:872`), no sandbox. Pre-existing errors forgiven (`validate.ts:372-399`). | NOANCESTOR: "written by the agent through validated writes, not caught by them". 489 lines of free JS inside nodes (STOP-AND-CHECK:70). |
| 1b | Writes outside the MCP | Partly caught | Nothing stops the agent's own Write tool on project files; `guarded()` re-reads kit files "a file tool" wrote (`tools/util.ts:52`). Preview gate renders only error-free snapshots (`noodl-preview/src/validate.ts:1-15`); `nodegx-deploy` refuses on validation errors (`deploy-cli.ts:44,70`). | Warnings never block. |
| 2 | Backend rules | Interlock enforced at deploy. Locally open by default. Agent can rewrite rules unasked | Rules in `security.json` / `nodegx.security.json`. Default `devOpen: true` (`nodegx-backend/src/security/model.ts:752-755`). `devOpenActive = devOpen && loopback` (`security/state.ts:439-440`); when active no permission check runs (:614). Interlock: start refused with `DEV_OPEN_ON_PUBLIC_BIND` (:367-377); undeclared functions refused on a public bind (:379-394). PUT `/admin/permissions` refuses devOpen beyond loopback (`server/admin-security.ts:178-179`). No MCP tool toggles devOpen. Agents can set any collection `public` (`backendTools.ts:590`), create keys, roles, triggers, nobody asked. CORS `*` when configured (`ops/headers.ts:66-69`). | **DEVOPENREAD open.** Anonymous `GET /classes/_User` returned 7 users' emails with `ACAO: *`. The agent knew and shipped. The interlock never fired. The editor has "Enforce my rules on this machine" (bb34e8206, P109); default unchanged. |
| 3 | The shell | Bash needed in practice; the kit asks for npx; no shipped Bash-off mode | `create-nodegx` writes `CLAUDE.md`/`AGENTS.md` telling the agent to run `npx @nodegx/preview … --open` (`create-nodegx/bin/create-nodegx.js:43`); the skill too (`profiles/core/skills/nodegx-your-own-editor/SKILL.md:127`); `.mcp.json` launches via `npx -y @nodegx/mcp@… --allow-writes` (:340-345). The installer writes **no** `.claude/settings.json` permissions; only Vibe allowlists (:170, 211). | The "seal" was a lab harness: `own-018/round-kit.mjs` / `round-claude.mjs` with `--strict-mcp-config`, empty HOME, shell/web denied, reads outside denied, a path audit (OWN-018 md:40, 176-182, 357). Sonnet built the quiz 12/12 through MCP writes only. OWN-023 switched Bash on. M's agent used Bash 34× in F2 and moved the backend's files unasked. |
| 4 | Deploy | Static folder from npm. The VM route is a lab script. No rollback | `nodegx-deploy` (bin in `@nodegx/preview`) writes a static site, excluding `.mcp.json` and `CLAUDE.md` (OWN-016 md:59-75). Exit 11 belongs to `@nodegx/export`'s `nodegx deploy` (unpublished 0.0.1): refuses a DEVELOPMENT viewer build (`nodegx-export/src/cli/exitCodes.ts:110-123`, `args.ts:418`). VM route: `own-016/ship-to-vm.sh` + `provision-app.sh`: site, `--no-admin` backend under systemd, `workflows/`, secrets via ssh stdin into `/etc/<app>/secrets.env` 640 (OWN-016 md:101-109). Richard ran it himself after the classifier refused (:111). A deploy into a folder sweeps the previous deploy (`deploy.ts:459-469`); the VM uses `rsync --delete` (`provision-app.sh:60`). No release history or rollback. | "Deploy as a tool the agent calls" planned for 0.4.4 (`BOARD.md:47`). OWN-016 still owes the phone check and publish (md:8). |
| 5 | Ownership / take-over | Export real but partial | P18: picker 130/130, parameters 1,235/1,396 (`BOARD.md:63`). Logic components (EXP-003 Tier B) do not export. MCP `export_react` since 2026-09-10 (`tools/exportReact.ts`, b06ce9e6e). `@nodegx/core` 0.1.0 on npm; `@nodegx/export` not; `@nodegx/node-spec` on npm (MIT). | P18 README "In progress". Inline JS copied "verbatim and unchecked" (README:131, EXP-011 §52). |
| 6 | Editor/preview a client could see | Mixed; most not on npm | `render_report` on npm (2026-08-08, a4d204b94; in mcp 0.2.2). Inspector P101 in the desktop editor (INS-004 left), not npm. Honesty number SEE-001 repo only: 23f3279db/d75977deb (2026-10-19) not in v0.4.2 or mcp 0.2.2; "built and driven; Richard's read owed". Security report SEE-012 on branch `l7-security` (0fc2b00fc), not on HEAD (`git merge-base`); task file "not started"; `DIRECTION.md:51` agrees; `BOARD.md:50` "built, not landed". | The honesty number "was not measured at all" in OWN-023. |
| 7 | Checkpoints / undo | Components: none beyond atomic plans. Backend: backups exist, agent-controllable | `apply_plan` all-or-nothing; nothing touches disk until apply (`tools/planTools.ts:9, 939`). A rejected write writes nothing (`tools/author.ts:432`). No snapshot, history or git of component files. Backend: `run_backend_backup`, `set_backend_backup_policy`, `list_backend_backups`, `restore_backend` (BAK-007; `backendTools.ts:1346-1570`). Restore takes a safety snapshot by default; the agent can pass `safetySnapshot:false` (:1562). A destructive schema apply forces a pre-apply backup (:1531-1538). | Backups are only as safe as an agent that can also call restore. Nothing asks a person first. |
| 8a | DIRECTION.md | — | "NodeGX is a framework that a person's agent builds apps inside… People install the framework from npm. The NodeGX editor is optional." Pillars: restraint, testing, security. Its own table: restraint "Not built", security report "not started" (:49, :51). | |
| 8b | P111 | — | "The canvas stops being where you build and becomes the reason you can trust what was built." (README §0). "0 of 13 done; SEE-000 and SEE-001 built in part" (:7). | |
| 8c | P96 / backend as MCP | — | "I want people to see NodeGX as an alternative to tools like Supabase and n8n as well as a front end builder." (Richard, P96 README). FED-005: paste the backend's `/mcp` URL and a key; the agent can do only what the key's scope allows. **Enforced** by key scopes (FED-005 §2, `security/state.ts:282-330`). | |

## The seven OWN-023 kit defects, today

All filed 2026-10-20. Six open. COLDSERVER fixed in `b09ed2b7f` (91 unused dependencies dropped), not on npm, riding
the 0.2.4 cut (04ab06d03).

1. **COLDSERVER** — a first `npx @nodegx/mcp@0.2.2` took about 28 s against Claude Code's 30 s MCP start limit. Fixed, unpublished.
2. **DEVOPENREAD** — the local backend serves every user's email anonymously (`devOpen: true` + CORS `*`). High. Open.
3. **FILEURLHOST** — uploaded files' URLs stored as absolute `127.0.0.1:8584` URLs. Open.
4. **KEYNEEDSAGENT** — a key pasted into `.env` reaches the backend only through the agent. Open.
5. **NOANCESTOR** — a runtime "No ancestor component has a Component Object node" after a change; validated writes did not catch it. Low; not yet reproduced. Open.
6. **NORANGE** — the file server ignores HTTP Range; no seeking; Safari/iOS playback needs Range. Open.
7. **PHONEPREVIEW** — a phone on the same Wi-Fi still gets `127.0.0.1` for the backend. Open.

## Blunt summary

- **Enforced:** graph structure and rules; preview and deploy refusing a project with validation errors; the
  open-backend interlock at deploy time; all-or-nothing plans; key scopes on a backend's own `/mcp`.
- **Asked for in prompt text only:** "build it as a NodeGX app"; "use `set_function_secret`"; "build in small
  steps"; running `npx`.
- **Absent:** any step where a person approves a rule change, a restore or free JS; a sandbox for free JS; a
  kit-shipped Bash-off mode; rollback of components or deploys; security on by default on the dev machine; a security
  report on HEAD or on npm.

Saying yes without reading is exactly the case the kit does not guard against.
