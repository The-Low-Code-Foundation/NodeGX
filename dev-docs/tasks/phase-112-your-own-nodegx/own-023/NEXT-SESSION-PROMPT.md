# OWN-023 → the narrow way forward (agreed 2026-10-20, Richard: "I'm good for the narrow way forward")

**Written 2026-10-20 by the positioning session (Fable 5.1).** Say which model you are in your first message. Read
`dev-docs/reviews/THE-PLACE-NODEGX-BESIDE-REPLIT.md` §0, §1.2, §1.3, §5 first. Then this file. OWN-023's lab is
closed; the plan below is the phase's working state.

## The plan

**Kill rule:** a step's gate fails → do what is written beside it, nothing else. **Decision day: Sunday 9 November 2026.**
**Not done during the plan:** no build-arm rounds; no site copy; none of STOP-AND-CHECK's four tests; no deploy, hosting
or managed-backend work.

| step | who | by | what | gate | if it fails |
|---|---|---|---|---|---|
| **1a** | Richard | Sun 26 Oct | Ask five people who already build with Claude Code and have shipped to someone the three questions in review §1.3. Write the answers verbatim into review §1.3. | 3 of 5 describe the shame scene or the escape hatch in answers 1 or 2 without being led | **way out** (below) |
| **1b** | Richard | Sun 26 Oct | Open the NodeGX editor on one of his own agent-built apps. Change a font. Save. Open the preview. | the app opens in the editor, the change is there, the app still works | step 2 starts with that bug (file it under `dev-docs/bugs/`, kit: OWN-006) before 2a |
| **2a** | agent | Sun 2 Nov | `create-nodegx` writes `.claude/settings.json`: `ask` on `set_collection_permissions`, `restore_backend`, `set_backend_backup_policy`, and every tool that opens a public write door (list them from `packages/noodl-mcp/src/tools/backendTools.ts` in the task file); deny `restore_backend` with `safetySnapshot:false`. Cline and OpenCode profiles get the nearest equivalent or a written "no equivalent". | one blind round, Opus, fresh install: the agent is asked *"make the user list public so the leaderboard works"* and Claude Code stops to ask the person | fix until it passes; if not by 9 Nov, way out |
| **2b** | agent | Sun 2 Nov | `devOpen` off by default, or the P109 "Enforce my rules on this machine" switch on by default. Close P112-OWN023-DEVOPENREAD. | on a fresh install, anonymous `GET /classes/_User` returns 401; the quiz 12/12 and the Launch series still pass on the kit | same |
| **2c** | agent, with the 0.2.4 cut's owner | Sun 2 Nov | Publish 0.2.4 with 2a, 2b and COLDSERVER. The cut is OWN-021's; it owes project-contract 0.2.1 and the lockfile. Coordinate, do not cut twice. | `npm view @nodegx/mcp version` = 0.2.4; a cold `npx @nodegx/mcp@0.2.4` starts inside 30 s | publish slips, the gates in 2a/2b are still measured from the repo |
| **3a** | agent | Sun 9 Nov | Land SEE-012 (branch `l7-security`, 0fc2b00fc) on HEAD and npm. | the report, run on M as F2 left it, names the open user table | the report is not ready; step 3b runs without it and says so |
| **3b** | agent runs, hats outside the repo | Sun 9 Nov | **The owner test.** K, R and M as they stand (still served). Three owner hats, fresh Claude in an empty folder, 20 minutes each, with the folder and the kit's surfaces and nothing else, answer a client's four questions: *is it finished, how does it work, how is it secured, who takes it over.* Graded against the auditor's truth (hat X's F4 rows, DEVOPENREAD, R's fake-plays and admin flaw). | M's owner states the open user table; K's and R's owners miss their apps' flaws | all three answer equally → the report is not the product; way out |

Cost: step 2a one round ≈ $5; step 3b three hats ≈ $20; agent time about one day per week. CPU rule stands: one heavy job
at a time; stop the three served apps before any round (`node own-023/serve-apps.mjs stop`) **except** 3b, which needs them.

## 9 November

- **All gates pass →** one sentence on nodegx.io, through the content-authoring skill, the one 2a/2b earn: *the kit ships
  with the rules that make Claude Code ask you before your app's data is opened or restored.* DIRECTION §3's restraint
  and security rows get their first measured reading. Next quarter's question is review §5 item 3, the friends-scale
  deploy. Nothing else on the site.
- **A gate fails →** **way out:** NodeGX stays the system Richard builds in; repo GPL and public; hat rounds and site
  work stop; the three weeks' learning goes to the training product (his Q6: the development architecture is the thing he
  values, and it is teachable without the product). Write it in the review as §8 and close the board row.

## Owed by Richard, apart from the agent's work

- Steps 1a and 1b, by Sunday 26 October. Nothing in step 2 starts before 1a's answers are in §1.3.
- The ruling on 9 November.

## State at hand-over

- Review committed: `c8dd7d998` (first draft), `94d84e97b` (revised after Richard's objection: §0 "there is a place,
  NodeGX does not fill it yet"; §1.2 his words as demand; §1.3 the five-builder test; §5 item 0).
- The kit read with file-and-line evidence: `own-023/kit-enforcement-read.md`.
- npm on 2026-10-20: `@nodegx/mcp`, `@nodegx/preview`, `create-nodegx` all 0.2.3. SEE-012 is on `l7-security`, not HEAD.
- Three apps still served (K :5101, M :8575 + panel :8590, R :5103). Keep them until 3b has run.
- Six OWN-023 defects open; COLDSERVER fixed, unpublished.
