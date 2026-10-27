# The board

**Set:** 2026-10-14 by Richard. **Trimmed:** 2026-10-22 (housekeeping on Richard's ask: every file a session reads
first points at the lanes that are open and agreed). **Applies to:** every session. A session picks a lane from §2 and
nowhere else. Where a phase README disagrees with this page about *whether* its work is current, this page wins; the
README stays right about *what* the work is. The running log each lane cell carried until the trim is
`git show 0274a3f8b:dev-docs/BOARD.md`; the task files hold the same history in their own sections.

> "Make sure that the next version of NodeGX we're working on focusses on the ability to create nodegx apps with npm,
> make your own editor, full stack apps with our own backend, local development that can be pushed to a VM using a
> coding software, Mistral testing and integration for cheaper development possibilities, code export (any last
> coverage we need to properly lay claim to code export and maybe lining it up with node specs more). I want NodeGX
> to become a framework for safe and reliable LLM driven development." — Richard, 2026-10-14

> "If you add code export and deployment as npm things, such that nobody would ever have to use the original Noodl /
> NodeGX editor, I say make it so. I want that offramp promise fulfilled in React and Swift." — Richard, 2026-10-21

## 1. Start here

1. **Why:** [DIRECTION.md §0](DIRECTION.md) — the hook, ruled D8 2026-10-23: *make your AI coder a true copilot*
   (co-construction inside the person's own agent; Studio in the conversation, a HOLD the server keeps; lane 3) —
   and under it the three pillars: *the blueprint stays open* (an editor for this app is
   a view over its files), *the knowledge ships with the project* (the seed), *the off-ramp* (React, then Swift). On
   day one a NodeGX app looks like one built without it; the claim is what you can still do on day thirty. A lane row
   that serves none of the three is a row to question.
2. **What:** pick one lane in §2, read its task file and its phase's `NEXT-SESSION-PROMPT.md`. Do not read every phase
   on disk.
3. **Not read:** [`tasks-archive/`](tasks-archive/README.md) holds the phases from the earlier strategies (the editor
   revival, the alpha, the university, the site builder, the games' defect phases). A session opens one only when a
   live task file links into it.

## 2. The version: 0.5.0, the community push

**Set 2026-10-23 by Richard, after D8** (*"make sure this is 100% our goal for the next community push"*). The push is
one release, 0.5.0, and it is done when a stranger can take **the walk** below without one of us in the room. The
lanes are the walk's steps; a lane row that is not a step of the walk is a row to question. A release is cut when the
walk is done, not on a date.

**The walk (the release gate).** A person who does not code: (1) installs NodeGX into the agent they already use —
Claude Desktop first — by double-click or by pasting one JSON block; (2) says what they want and watches the app come
together in Studio inside the conversation, stops it once, changes one thing themselves in Studio, and the agent
carries on from their change; (3) opens the same app in Studio on its own and in a browser; (4) leaves with React or
Swift source that builds and runs the same app, or (5) pushes it to a Linux VM they own over SSH and opens it there;
and (6) at every step the site's words are the ones the gates earned. Lane 1 makes the agent's half of the walk work
on a cheap model, not only on Claude.

**Beta, ruled by Richard 2026-10-23** (verbatim): *"I think Beta should be someone like me building a simple app in
Studio, editing workflows and the DB, privacy rules, road testing it and deploying to a VM for people to try. If all of
that works, we can say we're in Beta"*. Same day: *"we can stop the code export work for now and focus on the other
lanes to get our NodeGX Studio 'the true copilot' concept out and in Beta rather than Alpha"* — lane 4 is paused. The
lanes that carry Beta: **2** (Studio: build, workflows, Data and Privacy, the run timeline for road testing), **5** (the
VM push, which Studio's Publish then points at: R10), **6** (the backend it runs on), with **3** (the copilot in the
conversation) as the 'true copilot' half.

**First, ruled by Richard 2026-10-26: lane 9, the backend in the open** (*"We need to focus on this before the
launch … I don't want to launch a Beta app that can only make a couple of template app types. I want people to be able
to play with it to make whatever they want"*). Backend workflows and triggers move into the project's files, and the
map, functions and automations are drawn in Studio inside the conversation for any app. Only then the full-stack run
(BKO-006), which replaces "a simple app" in the Beta test with three briefs no template covers.

| release | what is in it | state 2026-10-23 |
|---|---|---|
| **0.4.2** | the editor Richard's two jobs | ✅ published 2026-10-20 |
| **0.4.3** a stranger starts from npm | editor + npm kit, P121's zips | ✅ 0.2.5 on npm 2026-10-22 |
| **0.4.4** full stack on your own VM | lanes 5 and 6 below | open |
| **0.4.5** the comparison, measured | lane 1's measurement (OWN-026 test 2) | open; test 1 done |
| **0.4.6** code export you can claim | lane 4, React | open; EXP-021 §101 left |
| **0.5.0** the community push | the walk, every step | open; step 2 works in Claude Desktop since 2026-10-23 (P125) |

| # | lane | step of the walk | now | then (done = the walk's step holds for a stranger) |
|---|---|---|---|---|
| 1 | **The kit on npm, thin for any LLM.** The published packages, and the layer an agent works through made as thin as a cheap model needs. P112 [OWN-026](tasks/phase-112-your-own-nodegx/own-026/PLAN.md) (DeepSeek V4.1 Flash, the FIX loop: every fix generic), [OWN-025](tasks/phase-112-your-own-nodegx/OWN-025-THE-FIRST-CONVERSATION-IS-LOADED.md) (the seed), [OWN-020](tasks/phase-112-your-own-nodegx/OWN-020-THREE-HARNESSES.md); the stranger audit's 17 packaging defects (`node scripts/bugs.js --from NPMAUDIT`: a local path in a published bundle, task ids in npm descriptions and generated code, six node counts, licences unstated) | 1, 2 | **OWN-026 running in another session**: test 1 done (code 21 / harness 20 / NodeGX 16 → 18 over FIX-01/02), test 2 (ten client changes, three chains side by side) next, FIX-03 in the loop; the seed ruled (D4). NPMAUDIT-LOCALPATH (a worktree build leaked `../../../../OpenNoodl/…` too; both `prepack`s now refuse a machine path) and -MAINTS fixed 2026-10-23 | test 2's number on the site; **Mistral on the same plan after DeepSeek** (OWN-020 / [LOC-002](tasks/phase-120-building-locally/LOC-002-GLM-ON-THE-SAME-PLAN.md)); the NPMAUDIT high rows fixed and 0.2.5 deprecated for the path leak; 0.3.0 published with the names, counts and licences a stranger reads |
| 2 | **NodeGX Studio V1, tested and working.** The no-code editor a person uses beside the agent: Design, Workflow, Data, Styles, the run timeline, publish; on npm so the kit can find it. nodegx-studio [`docs/SCOPE.md`](../../nodegx-studio/docs/SCOPE.md) (the alpha line, STU ids; `check` 172 / 78 / 43 / 50 / 39 green) | 2, 3 | 0.2's line (someone who is not Richard downloads, opens or imports, changes, publishes) built to STU-008 Publish and STU-040; `/panel`, the hold, the compact inline layout (STU-070, 2026-10-23). **2026-10-24: notarised** (the secrets on the repo; CI run 40075070236 says *Notarized Developer ID*); **on the 0.2.6 release** (pins and vendor/ at 2cac89c05, every gate green; `check:app` 54/54, so APPCHECKPUBLISH no longer reproduces); in a conversation Data → Map opens the map in a window instead of a blank frame | **V1 = the alpha line walked by a stranger** (CCN-007 is that stranger), Studio published to npm as `@nodegx/studio` so `open_studio` finds it by `require.resolve` (CCN-006's first half), the timeline's screen checked inside Claude (a srcdoc frame, expected to draw; the map's is done), the DMG on a download page |
| 3 | **Co-construction inside the person's own agent — nothing extra to install.** Studio in the conversation, a HOLD the server keeps, the agent building in short bursts and showing before it applies; and the install a non-coder is not scared of. P125 [README](tasks/phase-125-co-construction/README.md): [CCN-001](tasks/phase-125-co-construction/CCN-001-STUDIO-IN-THE-CONVERSATION.md) ✅, [CCN-002](tasks/phase-125-co-construction/CCN-002-THE-HOLD-IS-A-TENET.md), [CCN-003](tasks/phase-125-co-construction/CCN-003-SHOW-BEFORE-APPLY.md), [CCN-004](tasks/phase-125-co-construction/CCN-004-LOOK-FIRST.md), [CCN-005](tasks/phase-125-co-construction/CCN-005-SHORT-BURSTS.md), [CCN-006](tasks/phase-125-co-construction/CCN-006-ONE-CLICK.md), [CCN-007](tasks/phase-125-co-construction/CCN-007-THE-PERSON-TEST.md) | 1, 2 | **CCN-001 ✅ 2026-10-23, eight sessions in one day:** the panel renders inside Claude Desktop, HOLD holds every tool, the resource survives the host's prefetch (a proxy in the server), the compact inline layout, Dock if the host offers `pip`. Eight runs taught what a stranger's install must survive (CCN-001 §s2–s8). **CCN-002 built 2026-10-23:** `session_status` reports the hold, an old hold is said, `what_changed_since` lists what the person changed in Studio, the hold file is gitignored, Studio names the agent in a clash; the `noodl-mcp` dist rebuilt the same evening. **CCN-005 ✅ seen in Desktop 2026-10-24:** Richard's puppy re-run arrived in five bursts in one panel (s11 had one write after 3 min, and a second panel) | **CCN-008, a mini editor in the message, built 2026-10-25** (one part live with the settings the agent chose, Approve / Not that, stored and reopenable, 2D and 3D; AC6 = Richard's Desktop run) → CCN-004 (look first, through it) → CCN-003 (show before apply); **CCN-006: the `.mcpb` Desktop Extension is built** (nodegx-studio `npm run mcpb`: the server and Studio in one 24.7 MB file, driven headless from the unpacked bundle 2026-10-24); **Richard's double-click in Claude Desktop is next**; then `create-nodegx --desktop` and `@nodegx/studio` on npm for anyone who prefers to paste; CCN-007, the person test, last |
| 4 | **The off-ramp: React and Swift source anyone can take.** P18 [EXP-021](tasks/phase-18-code-export-v2/EXP-021-A-LOGIC-COMPONENT-IS-A-HOOK.md) → [EXP-022](tasks/phase-18-code-export-v2/EXP-022-THE-SAME-GRAPH-IN-SWIFT.md) (S9 of ≤12) → [EXP-023](tasks/phase-18-code-export-v2/EXP-023-THE-OFF-RAMP-IS-ON-NPM.md); the NPMAUDIT export rows (the canonical counter exports dead, a query's field mapping dropped, task ids in generated code) | 4 | React: `@nodegx/export` 0.2.5 on npm, driven on todo-list and rocket-school; EXP-021 §101 (the parent's reads) left. Swift: S9 done 2026-10-23, On App Error and the parsers carried, and P18-S106-PARSERAISE fixed in both exports: 15 of 85 on each, the same 15, Swift's trace equal to React's on all 18 both play, nothing left outside on the Swift printer; the reveal live at nodegx.io/one-graph/ (says S7's 11, not in the nav); **PAUSED by Richard 2026-10-23** (*"we can stop the code export work for now and focus on the other lanes"*): no session opens on lane 4 until he names it; the page's numbers are being replaced by plain words ([handoff](tasks/phase-18-code-export-v2/EXP-022-NEXT-SESSION-PROMPT.md)) | **basic export a stranger runs from npm and builds**: the three NPMAUDIT export rows fixed, EXP-023 AC1/AC4 from the registry, Swift to its hard stop (S12) and the site saying how far it got; "any major framework" stays a direction, not a claim |
| 5 | **Easy SSH push to any Linux VM.** The app, its backend and its data on a machine the person owns, from the agent, with a runbook a stranger follows. P112 [OWN-016](tasks/phase-112-your-own-nodegx/OWN-016-SHIP-IT.md); P26 [deployment](tasks/phase-26-deployment/PROGRESS.md) (DEP-001 ✅: a deployed app points at another backend, every deploy writes `DEPLOY.md`); P104 [the backend manager](tasks/phase-104-the-backend-manager/README.md) | 5 | **`deploy_to_vm` built 2026-10-23 (DEP-002 s4): the agent ships the app, its backend, functions, rules and secrets to a server over ssh in one call**, driven 5/5 through the MCP client against a throwaway VM (refused login names `ssh-copy-id`; sign-up and a task; https via Caddy; a reship keeps rules and data; a port clash refused in the box's words). Under it: s1 `--serve-app`, s2 `--full-stack` folder, s3 `ship-to-vm.sh` + `provision-app.sh`. **0.2.6 published (Richard, 2026-10-23 night), and the stranger's path driven 2026-10-24**: `@nodegx/mcp@0.2.6` from npm, no checkout, ships the todo app to the throwaway VM via npx (29 s; sign-up, a task, a visitor refused; a reship with a domain keeps the data, https 200). Studio's Publish to a server shipped too, after a fix for the desktop app's PATH (P123-STU071-NONPX). Later the same evening: **Studio's Publish offers a server of your own and calls `deploy_to_vm`** (nodegx-studio STU-071, `check:server` 16/16; a real ship waits on the release), **the runbook** written ([docs/runtime/YOUR-OWN-SERVER.md](../docs/runtime/YOUR-OWN-SERVER.md)), a fresh Caddy's refusal says the line to add (P26-CADDYIMPORT), an unbuilt project is refused (P26-SKELSHIP, `allow_empty` for lingo). Next: a real provider by Richard with the runbook; `nodegx deploy --full-stack`; the popup. OWN-016 AC2 is Richard's phone check | **`deploy_to_vm` as a tool the agent calls** — SSH to a host the person names, the bundle and the backend installed as services, the URL back — graded headless against a throwaway VM; a second provider; the runbook; and Studio's Publish pointing at the same path |
| 6 | **Full stack, our own backend.** Provisioned from npm, keys kept by cloud functions, the admin panel one more editor; what lane 5 pushes. P112 [OWN-015](tasks/phase-112-your-own-nodegx/OWN-015-THE-BACKEND-FROM-NPM.md); P116 [ONT](tasks/phase-116-the-person-says-what-their-world-is/README.md); [P124](tasks/phase-124-the-mystery-of-the-backend/NEXT-SESSION-PROMPT.md); the NPMAUDIT backend-map rows | 2, 5 | OWN-015's rest (AC4's publish, R11, AC1 from the registry); P124 s3; the backend ships only inside `@nodegx/mcp`, licence unstated (NPMAUDIT); NPMAUDIT-BACKENDMAPCHECK fixed 2026-10-23 (with rules off the map says so first; `@nodegx/backend-map` 0.1.1 to publish) | the backend published on its own with its licence stated; backend-map generic (its screens from Query nodes, its personas from the project), honest about dev-open; P116 ONT-004 onward |
| 7 | **The words on the tin, and the numbers behind them.** P111 [SEE-009](tasks/phase-111-you-can-see-what-it-built/SEE-009-THE-WORDS-ON-THE-TIN.md), [SEE-001](tasks/phase-111-you-can-see-what-it-built/SEE-001-THE-HONESTY-NUMBER.md), [SEE-011](tasks/phase-111-you-can-see-what-it-built/SEE-011-YOUR-APP-HAS-TESTS.md), [SEE-012](tasks/phase-111-you-can-see-what-it-built/SEE-012-THE-SECURITY-REPORT.md), [SEE-010](tasks/phase-111-you-can-see-what-it-built/SEE-010-RICHARDS-VERDICT.md); DIRECTION §0's hook table | 6 | SEE-001 built and driven; SEE-012 on branch `l7-security`; the hook's checkable / promised table written 2026-10-23 | SEE-012 landed; SEE-010; **SEE-009 last, binding nodegx.io to the walk: the site says the checkable column of the hook table and names the rest as being built**; a quickstart page that IS the walk, step by step, with the JSON block |
| 8 | **The play kit: our games' learnings for anyone's Claude Code.** Opened 2026-10-24 by Richard, **below lanes 2 and 3** (*"less priority than the Claude NodeGX Studio integration and publishing"*): no session opens here while one is on lane 2 or 3, unless he names it. P126 [README](tasks/phase-126-the-play-kit/README.md): the skill (procedure, traps, harness), the starter, a shelf of objects that look good (ours are all code, none files), vetted open packs, a community shelf, and the panel as a NodeGX app. Claim as ruled: faster = no trial-and-error phase before first fun play; NodeGX = the menus a person tweaks later, not speed; and [PLY-009](tasks/phase-126-the-play-kit/PLY-009-A-MODEL-SAYS-WHAT-YOU-CAN-CHANGE.md): every model declares its parts and settings like a node's ports, and a 3D Studio builds the person's controls from that declaration | — (not a step of the walk) | scoped, nothing built; ruled 2026-10-24: `@nodegx/play`, the shelf code relicensed MIT (the repo is GPL-3.0-only), the shelf a GitHub repo with a catalog in the package. [PLY-008](tasks/phase-126-the-play-kit/PLY-008-THE-GAME-IN-STUDIO-IN-THE-CONVERSATION.md)'s probe (does a three-kit game draw and take keys in Studio inside Claude Desktop, and does a write reset it?) is "Later" by Richard; raise it again before Studio V1 freezes, and its rows go to lane 2 | PLY-001 (the skill) → 002 (starter) → 003 (our shelf) = the base version a stranger uses; PLY-007 measures first play with and without the kit before the site says anything |
| 9 | **The backend in the open: any full-stack app, every part in its files and drawn.** Opened 2026-10-26 by Richard, **first in line** before the full-stack run. P127 [README](tasks/phase-127-the-backend-in-the-open/README.md): [BKO-001](tasks/phase-127-the-backend-in-the-open/BKO-001-WORKFLOWS-AND-TRIGGERS-LIVE-IN-THE-PROJECT.md) workflows and triggers in the project's files (R1: the files are the truth), [BKO-002](tasks/phase-127-the-backend-in-the-open/BKO-002-THE-MAP-DRAWS-IN-THE-CONVERSATION.md) the map and Privacy draw in the conversation, [BKO-003](tasks/phase-127-the-backend-in-the-open/BKO-003-THE-MAP-READS-ANY-APP.md) the map reads any app (lane 6's "backend-map generic"), [BKO-004](tasks/phase-127-the-backend-in-the-open/BKO-004-A-CLOUD-FUNCTION-OPENS-AS-ITS-GRAPH.md) a cloud function opens as its graph, [BKO-005](tasks/phase-127-the-backend-in-the-open/BKO-005-WORKFLOWS-AND-TRIGGERS-DRAWN.md) workflows and triggers drawn, [BKO-006](tasks/phase-127-the-backend-in-the-open/BKO-006-BRIEFS-NOT-TEMPLATES.md) three briefs no template covers, then Richard's Desktop run | 2, 3, 5 | scoped 2026-10-26 from two read-only audits: workflows and triggers live only in the backend's data dir; the map is a framed page Desktop will not frame and sends no CORS; a dozen training-app assumptions; functions, workflows and triggers drawn nowhere. **BKO-001 built 2026-10-26** (the agent's rules, workflows and triggers land in `nodegx.security.json` / `nodegx.automations.json`, a backend starts from them, the deploy carries them; AC5 VM drive open; not in Desktop until the dist is rebuilt). **s2 2026-10-26:** BKO-001 AC6 built (`get_project_info` / `session_status` say the drift, noodl-mcp `837b4ece8`); **BKO-002 built in the fake host** (Privacy was broken in a conversation, measured and fixed: P127-BKO002-HOSTEDPRIVACY; the map draws in a src-less frame; Studio `f50fb31`, `check:hosted` 9/9); its AC2, the Desktop run, waits on Richard. **s3 2026-10-26: BKO-003 built in the package** (the map read the training app's LearnerProfile on every app, and that read MADE the table in the person's backend: P127-BKO003-PROFILEWRITE, fixed; people and groups read from the app's own schema and rules file; tables not on the backend drawn; one failed source leaves the map up; `test/any-app.test.mjs` 38/38 on the todo template, Muddy Paws and a Pointer-and-group backend; the training copy unchanged). 0.1.2 published, Studio pins it (`3931ddf`; check:hosted 9/9, check:data 80/80). **BKO-003 done.** **s4 2026-10-26: BKO-004 built**: a cloud function opens as its graph on Workflow → On the backend (from the list, a step that runs it, a helper it places, the map's panel with backend-map 0.1.3), with what it reads and writes and its last run; read only (Studio `check:functions` 695/695 + 46/46, `check:hosted` 16/16, every Studio gate green; P127-BKO004-FNSTEPS filed). **s5 2026-10-27: BKO-005 built**: Workflow → On the backend lists the app's triggers and workflows from `nodegx.automations.json` in a person's words ("Every day at 09:00", "When a Task is created"); a trigger opens as a flow into what it starts, a workflow as its steps left to right with its last run lit (drawn failing at step 2); a trigger turned off or moved to 10:00 in Studio changes the backend and the file together, and the agent's `what_changed_since` says it (Studio `4dc3310`: `check:automations` 29/29 + 31/31, `check:hosted` 19/19, every Studio gate green; noodl-mcp spec 14/14; P127-BKO005-QUIETHOVER fixed). Left in BKO-005: triggers on the map (a map change and a publish). **s6 2026-10-27: BKO-006's three briefs run** ([log](tasks/phase-127-the-backend-in-the-open/BKO-006-BRIEFS-NOT-TEMPLATES.md#s6-2026-10-27-the-round-built-the-three-briefs-run-and-graded-the-defects-they-met-fixed)): Opus strangers from `npm create nodegx@0.2.7` built a book club, a repair shop's job board and shared expenses (~$6 each); all three work, draw inside the conversation and ship to a VM with every rule, function, trigger and workflow; "open" missed only the tables, fixed (P127-BKO006-TABLESNOTINFILES). Fixed on the way: a creator-only table that 500'd before its first row (OWNERCOLUMN), user exports carrying password hashes (EXPORTHASHES), triggers naming unserved functions, Studio pinned to a backend that refused the kit's rules (STUDIOPIN: Studio now on 0.2.7 / 0.1.3). **s7 2026-10-27: SCHEDULEAUTH ruled and built** (Richard: a run the app starts itself counts as the app — a schedule, a row change and Studio's run-now pass a signed-in-only function with nobody signed in; a webhook stays a visitor; `3e86bd685`, Request spec v4). CLOUDUSERNODE fixed (a User node inside a function answered "Not found: GET /users/<id>"; the backend now serves it as the `_User` record read). NOROLESFAILS does not reproduce at HEAD (measured, row says what would). Next: **`@nodegx/mcp` 0.2.8 and the backend bundle to publish** (carries s6's and s7's fixes), Richard's fourth brief in Desktop (with BKO-002 AC2, BKO-004 AC3, BKO-005 AC1) | a stranger's agent builds three un-templated full-stack apps whose every table, rule, function, workflow and trigger is in the project's files, drawn in Studio inside the conversation, and carried to a VM |

**Folded into the lanes above (not dropped):** *Your own editor* (OWN-008's kit rows → lane 2: Studio is the editor the kit proves; OWN-009 is Richard's); *the comparison on cheaper models* → lane 1; *local, then a VM* → lane 5.

**Finishing, not a lane:** P109 is 43 of 52. ISL-010 belongs to lane 5; the rest (ISL-008, 022, 024, 025, 037, 046)
close in one session or go to `dev-docs/bugs/` as rows. No new ISL tasks.

**Side work Richard asks for by name, not lanes:** the templates ([P78](tasks/phase-78-the-templates/NEXT-SESSION-PROMPT.md),
the strangers' corpus and the defect bed; no new template opens as a phase), the Gala prototype ([P122](tasks/phase-122-the-gala/README.md),
live on nodegx.io/gala/; its builds are OWN-026 part 3's material), and the game prototypes in [`parked/`](parked/README.md)
(Threadspace, THREE in nodes). A session takes one only when Richard names it. Their learnings and objects (not
their roadmaps) are lane 8's material.

## 3. Waits on Richard

No session opens on these. They close the day he drives them and rules.

| what | his part |
|---|---|
| npm publishes | his terminal (2FA), each cut |
| SEE-001 AC6, SEE-012 AC4 | his read of the honesty header and the security report |
| OWN-016 AC2 | the shipped app on his phone |
| P112 [OWN-009](tasks/phase-112-your-own-nodegx/OWN-009-RICHARDS-OWN.md) | asks his own Claude Code for the editor he wants |
| [P95](tasks/phase-95-the-second-play-test/README.md), [P113](tasks/phase-113-the-third-play-test/README.md), [P108](tasks/phase-108-the-island-works/README.md), [P105](tasks/phase-105-the-coding-garden/README.md) / [P106](tasks/phase-106-the-island-grows/README.md) | the children's sittings: the replay, the kids' session, the tablet and the French read, the Windows build in a child's hands |
| [P101](tasks/phase-101-the-inspector/README.md), [P103](tasks/phase-103-the-composer-grows/README.md), [P97](tasks/phase-97-the-way-out-is-the-reason-to-stay/README.md), [P119](tasks/phase-119-learn-with-simple-rick/README.md) | the inspector as built; CMG-011's touch points; AC8; SRK-000's three measurements |

## 4. Parked

Not read, not re-scoped, until a lane closes and Richard names what takes its slot. A parked README may be stale; it is
re-measured on the day it is unparked.

| phase | why | unparks when |
|---|---|---|
| [P110](tasks/phase-110-the-app-in-your-pocket/README.md) the app in your pocket | became lane 6's EXP-022 (an emitter, not a Swift runtime); its R1–R7 carry | — |
| [P114](tasks/phase-114-the-groovebox/README.md), [P118](tasks/phase-118-the-castle-holds/README.md), [P121](tasks/phase-121-a-marketplace-and-a-community/README.md) | apps built with the kit: lane 2's strangers, run under OWN-008 | — |
| [P115](tasks/phase-115-online-on-your-own-account/README.md) | HST-005 is in lane 4; the rest is research | lane 4 closes |
| [P116](tasks/phase-116-the-person-says-what-their-world-is/README.md) beyond lane 3, [P120](tasks/phase-120-building-locally/README.md) beyond LOC-002, [P104](tasks/phase-104-the-backend-manager/README.md) beyond lane 3 | the lanes take what they need; the rest waits | — |
| [P117](tasks/phase-117-tchac-boum/README.md) | shelved by Richard 2026-10-11 | he asks |
| [P123](tasks/phase-123-open-bubble/README.md) Open Bubble | carried on in the `nodegx-studio` repo | — |

## 5. Closed, and the archive

**In `tasks/` though closed**, because a test, a script, a `.gitignore` rule or a peer's open edit reads their files:
P15, P16, P23, P30, P66, P77, P81, P83, P85, P92, P93, P94, [P107](tasks/phase-107-the-node-says-what-it-does/CLOSING.md)
(closed 2026-10-14; the ratchet in CI is the phase now), P99 (closes at its item in hand), P91 and P102 (a peer's open
edit, 2026-10-22). Their READMEs are the record; none is a lane.

**[`tasks-archive/`](tasks-archive/README.md)**: 94 folders and three old indexes moved on 2026-10-22 (`8221de470`):
every phase before P100 that no row on this page names, plus P100 and the two release folders. Same folder depth as
`tasks/`, so their links still resolve. Code comments that name one of them keep the old path; the folder name is
unchanged.

## 6. Rules

1. **A session picks a lane.** It reads that lane's task file and the phase README, not every phase on disk.
2. **A new idea is one page in [`dev-docs/parked/`](parked/)**: the quote, the idea in a paragraph, what it would need.
   It becomes a phase only when it takes a slot in §2 and Richard says so.
3. **A phase closes with a `CLOSING.md`**: the numbers it is judged on, what it gave, what it did not, where every
   leftover went. Then it moves to `tasks-archive/` unless something reads its files.
4. **One heavy job on the box** (memory: *do not pile CPU work on a shared box*), and the working tree is not a shelf:
   a session commits its own files with pathspecs before it ends, or hands the pile to a named owner in its handoff.
5. **This page is re-derived from the task files**, never the other way round. When a lane's "now" is done, the
   session that did it moves "then" up and writes the next "then" from the task file. A cell says where the lane is,
   in a sentence or two; the history goes in the task file.
