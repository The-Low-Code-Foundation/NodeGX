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

1. **Why:** [DIRECTION.md §0](DIRECTION.md), the three pillars: *the blueprint stays open* (an editor for this app is
   a view over its files), *the knowledge ships with the project* (the seed), *the off-ramp* (React, then Swift). On
   day one a NodeGX app looks like one built without it; the claim is what you can still do on day thirty. A lane row
   that serves none of the three is a row to question.
2. **What:** pick one lane in §2, read its task file and its phase's `NEXT-SESSION-PROMPT.md`. Do not read every phase
   on disk.
3. **Not read:** [`tasks-archive/`](tasks-archive/README.md) holds the phases from the earlier strategies (the editor
   revival, the alpha, the university, the site builder, the games' defect phases). A session opens one only when a
   live task file links into it.

## 2. The version: 0.5.0, the framework

The lanes ship in point releases, then 0.5.0 (set 2026-10-20 with Richard, "it's a good split"). A release is cut when
its row is done, not on a date.

| release | what is in it | state 2026-10-22 |
|---|---|---|
| **0.4.2** | the editor Richard's two jobs | ✅ published 2026-10-20 |
| **0.4.3** a stranger starts from npm | editor + npm kit, P121's zips | ✅ editor 2026-10-20; npm 0.2.4 2026-10-20, **0.2.5 2026-10-22** (`--graph` / `read_graph`, `@nodegx/export`, `create-nodegx --cline`). Left: OWN-014 AC4 |
| **0.4.4** full stack on your own VM | lanes 3 and 4 | open |
| **0.4.5** the comparison, measured | lane 5; P109's six (ISL-008, 022, 024, 025, 037, 046) | open; OWN-026 running |
| **0.4.6** code export you can claim | lane 6, React | open; EXP-021 §101 left |
| **0.5.0** the framework | lane 6, Swift (EXP-022); lane 7 | open; Swift S8 of ≤12 done 2026-10-23 (AC1; the logic and the Functions; the backend through the one client; todo-list driven on the simulator, equal to the React export; S6: add and close work in both exports, all three arms equal; S7: the stores in JavaScriptCore, AC4's line 11 of 85 = React's 11, the same traces on all 14; S8: Richard ruled the reveal's words, live at nodegx.io/one-graph/) |

| # | lane | pillar | now | then |
|---|---|---|---|---|
| 1 | **Apps with npm.** One install; the agent builds; preview and `render_report` from npm. P112 [OWN-011](tasks/phase-112-your-own-nodegx/OWN-011-ONE-INSTALL.md) ✅, [OWN-014](tasks/phase-112-your-own-nodegx/OWN-014-THE-AGENT-SEES-ITS-APP.md), [OWN-025](tasks/phase-112-your-own-nodegx/OWN-025-THE-FIRST-CONVERSATION-IS-LOADED.md) | 2 | **[OWN-025](tasks/phase-112-your-own-nodegx/OWN-025-THE-FIRST-CONVERSATION-IS-LOADED.md), the seed** (thin note, folder shape, skills on trigger, rules as server refusals; first gate: the Gala shell-copy refused). ✅ D4 ruled yes 2026-10-22: ready | OWN-014 AC4: a stranger's app built from the registry (0.2.5 is public) |
| 2 | **Your own editor.** A person's agent builds the editor they want from the kit; a suite says when it is right. P112 [OWN-008](tasks/phase-112-your-own-nodegx/OWN-008-THREE-STRANGERS.md) ✅, [OWN-012](tasks/phase-112-your-own-nodegx/OWN-012-THE-SCREEN-FROM-THE-DESCRIPTIONS.md) ✅ | 1 | a stranger round on the drawer ([own-008/NEXT-SESSION-PROMPT](tasks/phase-112-your-own-nodegx/own-008/NEXT-SESSION-PROMPT.md)). Beside it: [P124](tasks/phase-124-the-mystery-of-the-backend/NEXT-SESSION-PROMPT.md), the backend on one canvas (s3 2026-10-21: what one person can reach, row by row) | OWN-008's open kit rows (EDITGAPS, LIBRARYFIRST, PREVIEWPAGE, NODESPECBARE, CATEGORY, AUDIT); OWN-009 is Richard's |
| 3 | **Full stack, our own backend.** Provisioned from npm; a cloud function keeps the key; the admin panel is one more editor. P112 [OWN-015](tasks/phase-112-your-own-nodegx/OWN-015-THE-BACKEND-FROM-NPM.md); P116 ONT; P104 | 1 | OWN-015's rest: AC4's publish, R11, AC1 re-run from the registry (no longer blocked: 0.2.5 is public) | [P116](tasks/phase-116-the-person-says-what-their-world-is/README.md) ONT-004 onward; P104's unbuilt rows as kit pieces |
| 4 | **Local, then a VM, from the coding tool.** P112 [OWN-016](tasks/phase-112-your-own-nodegx/OWN-016-SHIP-IT.md); P26 [deployment](tasks/phase-26-deployment/PROGRESS.md) | 3 | P26: DEP-001 ✅ 2026-10-22 (a deployed app can be pointed at another backend; every deploy writes `DEPLOY.md`), DEP-002 (the local full-stack bundle) next. OWN-016: AC2 is Richard's phone check | the deploy as a tool the agent calls, graded; a second VM provider; the runbook a stranger follows |
| 5 | **The comparison, measured, on cheaper models.** P112 [OWN-026](tasks/phase-112-your-own-nodegx/own-026/PLAN.md), [OWN-023](tasks/phase-112-your-own-nodegx/OWN-023-ONE-BRIEF-THREE-STRANGERS.md) ✅, [OWN-020](tasks/phase-112-your-own-nodegx/OWN-020-THREE-HARNESSES.md); P120 [LOC-002](tasks/phase-120-building-locally/LOC-002-GLM-ON-THE-SAME-PLAN.md) | all | **OWN-026, the lab, running** (plan of record [`own-026/PLAN.md`](tasks/phase-112-your-own-nodegx/own-026/PLAN.md), pre-registered 2026-10-22): test 1, DeepSeek V4.1 Flash in Cline builds the rocket times-tables app in three arms (plain code / code + a good `AGENTS.md` / NodeGX 0.2.5), ×3. Under way: harness 20 / 22; the code and NodeGX rounds re-run after a lab fault (Chrome could not start inside the fence; PLAN §8, 14:30) | test 2: ten client changes per arm (the number the site can quote); part 3: Sonnet 5.5 in Claude Code hands the two Gala builds over (her own editor, three changes, Richard's five jobs). Then OWN-020's OpenCode AC5, LOC-002, the price table |
| 6 | **The off-ramp: code export from npm, React then Swift.** P18 [EXP-019](tasks/phase-18-code-export-v2/EXP-019-THE-SCRIPT-TRAVELS-AS-WRITTEN.md) → [EXP-020](tasks/phase-18-code-export-v2/EXP-020-THE-NOODL-API-IN-THE-EXPORT.md) → [EXP-021](tasks/phase-18-code-export-v2/EXP-021-A-LOGIC-COMPONENT-IS-A-HOOK.md) → [EXP-022](tasks/phase-18-code-export-v2/EXP-022-THE-SAME-GRAPH-IN-SWIFT.md); [EXP-023](tasks/phase-18-code-export-v2/EXP-023-THE-OFF-RAMP-IS-ON-NPM.md) | 3 | React: scripts travel as written (EXP-019), the Noodl API travels (EXP-020 slices 1–2), a logic component is a hook (EXP-021), driven on todo-list (AC1) and rocket-school (AC4): the exported app shows the same lists and edits as the running one; `@nodegx/export` 0.2.5 on npm. **Now, two sessions:** React, EXP-021 §101, the parent's reads ([P18 NEXT-SESSION-PROMPT](tasks/phase-18-code-export-v2/NEXT-SESSION-PROMPT.md)); **Swift, [EXP-022](tasks/phase-18-code-export-v2/EXP-022-THE-SAME-GRAPH-IN-SWIFT.md), session 8 of at most 12 done** (§9: S1 drew story-engine in the simulator, AC1; S2 the plan's logic in SwiftUI, the Functions in JavaScriptCore; S3 the React export's own backend client in the app; S4 drove todo-list on the iPhone 17 simulator against a real backend beside the running app and the React export: the Swift app reads and sends what the React export does at every step; adding a task and every dialog are refused by the plan in both exports, filed high for the React lane (P18-EXP022-S4-ADDREFUSED, -DIALOGREFUSED); S5 put AC4's line beside React's: 2 of 85 graph scenarios conform on Swift, 5 played, each the very trace React reads; the 9 React has more are the `@nodegx/core` stores §7 cut; cost 5 sessions and 3,575 printer lines against React's ~140 and 24,671, with nine decisions copied from the React printer; S6, ruled by Richard first: adding a task and closing one now work in both exports (the plan's Id in a Done chain, the dialog's empty texts, the dialog drawn over the page), and at every step of S4's drive the running app, the React export and the Swift app read and send the same, 5,361 tests green; S7, ruled: the React export's own stores, `lib/history` and `lib/actions` run in the Swift app's JavaScriptCore, and AC4's line reads 11 of 85 on Swift, the same 11 as React, the same trace on all 14 both play, for +326 printer lines and no change to the plan; the reveal (AC5) is a private page, https://claude.ai/artifact/NPyF9RpBWa2rf2Gi2rwjCk; S8: Richard ruled the words ("the artifact text is fine, rock out"); built as nodegx.io/one-graph/ with a link from /why/ (nodegx-web 28ef4c3), **live 2026-10-23** (Richard ran the push; auto mode refuses it); next slack (On App Error) or stop, his call; [its handoff](tasks/phase-18-code-export-v2/EXP-022-NEXT-SESSION-PROMPT.md)) | EXP-023 AC1 from the registry and AC4 |
| 7 | **Safe and reliable, as numbers.** P111 [SEE-001](tasks/phase-111-you-can-see-what-it-built/SEE-001-THE-HONESTY-NUMBER.md), [SEE-011](tasks/phase-111-you-can-see-what-it-built/SEE-011-YOUR-APP-HAS-TESTS.md), [SEE-012](tasks/phase-111-you-can-see-what-it-built/SEE-012-THE-SECURITY-REPORT.md), [SEE-010](tasks/phase-111-you-can-see-what-it-built/SEE-010-RICHARDS-VERDICT.md), [SEE-009](tasks/phase-111-you-can-see-what-it-built/SEE-009-THE-WORDS-ON-THE-TIN.md) | all | SEE-011, the app's own tests. SEE-001 built and driven (Richard's AC6 read owed); SEE-012 built on branch `l7-security` (`0fc2b00fc`), not on HEAD | SEE-012 landed, then SEE-010 (the control), SEE-009 last: it binds nodegx.io's words to the gates the others build |
| 8 | **Co-construction.** The person watches the app come together in Studio *inside the conversation* and can stop it: a HOLD the server enforces. Claude Desktop first (D7). P125 [README](tasks/phase-125-co-construction/README.md), [CCN-001](tasks/phase-125-co-construction/CCN-001-STUDIO-IN-THE-CONVERSATION.md) | 1 (live) | **CCN-001 ✅ 2026-10-23 (six sessions in one day):** `open_studio` + the `ui://nodegx/studio.html` MCP App (Studio's `/panel`) **rendered inside Claude Desktop's conversation on Richard's run 4**; the hold file holds every tool (reads too, s6) with `held`; a compact inline layout (s6). Runs 1–3 taught: Cowork scripts around the connector; a host draws a panel for the tool IT sees called; Desktop indexes tools once per conversation; Desktop's second server runs on Node 16. Next: Richard's run 5 on the s6 build | CCN-002 the hold everywhere → CCN-003 show before apply → CCN-004 look first → CCN-005 short bursts; CCN-006 a stranger's install; CCN-007 the person test |

**Finishing, not a lane:** P109 is 43 of 52. ISL-010 belongs to lane 5; the rest (ISL-008, 022, 024, 025, 037, 046)
close in one session or go to `dev-docs/bugs/` as rows. No new ISL tasks.

**Side work Richard asks for by name, not lanes:** the templates ([P78](tasks/phase-78-the-templates/NEXT-SESSION-PROMPT.md),
the strangers' corpus and the defect bed; no new template opens as a phase), the Gala prototype ([P122](tasks/phase-122-the-gala/README.md),
live on nodegx.io/gala/; its builds are OWN-026 part 3's material), and the game prototypes in [`parked/`](parked/README.md)
(Threadspace, THREE in nodes). A session takes one only when Richard names it.

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
