# NodeGX direction

**Set:** 2026-10-05 by Richard, in a conversation about what phase 107's node specs offer someone who vibe codes.
**Revised:** 2026-10-21 by Richard (§0, §3a, §4 items 6–8, §5 D3–D5), after the Gala comparison and the code-export
ruling of the same day: *"I feel like I've been pulling this project in several directions, and this one is the way."*
**Applies to:** every phase from 107 on. Where a phase README disagrees with this page, this page wins until Richard
rules otherwise. A phase that changes course because of it says so in its own README and links here.

> "I'd imagine we still advertise NodeGX but as a sort of framework for the main reasons it's important: forcing the LLM
> to show restraint and holding it to a system we know works, security and testing. The NodeGX editor is a way to view
> your app from vibe coding without opening just the preview in the browser, feeling like you have the ultimate control
> over what's being vibe coded IF you want to exert that control. But someone who's just vibe coding and likes the idea
> of having something more stable at the end can just use the npm package. If one day they realise they need to tweak
> things and not ask the AI to do it, they have the editor at any time."

> "It's only a matter of time before Anthropic bring out some really fancy 'vibe coded app editor' system, because they
> know this is an issue for non technical people. … I honestly think the restraint, testing and security points will
> end up being the most important, and the ability for users to make their own editor / admin interface without relying
> on Anthropic's software or whatever, a real do it yourself solution."
>
> — Richard, 2026-10-05 (two spelling slips corrected)

## 0. Why we do any of this (2026-10-21)

> "We're struggling to justify the point of installing NodeGX before starting a vibe coding project, rather than just
> launching it with Claude. … What you'll get on the first pass on the surface pitting NodeGX vs pure Claude will look
> identical on the surface. But one is built on concrete, the other on sand." — Richard, 2026-10-21

The comparison that prompted this (P112 OWN-023, one brief given to Claude Code bare and through NodeGX) measured what
Richard predicted: at the size of a first version, the two apps look the same, and the judges found "nothing a person
needs at this size". A second round, rebuilding the Gala game, first ended with the stranger copying the original game into a
NodeGX shell and calling it done; told plainly to convert, with a conversion log, a second stranger did (B2: 54
components, 762 nodes, $34.90 in 70 minutes, plays with no errors; the old screen code did not shrink, it split into
nodes plus 1,257 hand-written lines — OWN-023 `ROUND-2-THE-GALA.md` §9.4). Day one cannot show the difference. The difference is what the person can do on day
thirty, and the day-thirty things are these three, in the order of how much evidence each has today:

1. **A blueprint that stays open.** A NodeGX app is a graph of parts in a format built to be read by a program. So an
   editor for *this* app, exposing *these* settings to *these* people, is a view over the same files, not a rewrite:
   Claude Code has built a 3D editor, a children's block editor, a Bubble-shaped editor and a map of a backend from the
   packages, each in under a day. An app written as plain code has no such door. The further that code has gone, the
   more a custom editor costs to cut into it, and the more it breaks (the TrybeUP example). This is the pillar with the
   most evidence (P112 OWN-008, P123, P124 s1–s2).
2. **A knowledge bank that ships with the project.** Between the AI-coding docs, the refactor of the Noodl codebase,
   the templates and games, the play-tests with children, the stranger rounds on four agents and the bug ledger, this
   repo holds an unusual record of how vibe-coded projects succeed and fail: what people need, where they get stuck,
   what they don't think of, where they shoot themselves in the foot. Today that knowledge lives in `dev-docs/` and in
   one session's memory. The ruling is that it ships in the seed (§4 item 6), so the first conversation a person has
   with their agent is already loaded with the method: scope first, play-test before polishing, a ledger for every bug,
   tasks and memory and a roadmap in known places. Richard: *"the LLM basically has no choice but to follow"* — with
   one correction from the stranger rounds, which skipped instructions that were in front of them: **prose advises,
   gates bind.** The seed is a thin note, a folder shape the tools read and write, skills loaded on trigger, and every
   rule that matters as a refusal in the server. Much of this half is copyable as a skill by anyone; it is a moat only
   where it is tied to pillar 1, where the format lets the rule be enforced rather than advised.
3. **A "no framework" framework, with the off-ramp.** The person does not pick Svelte on day one "for fun" and find
   out with real users that React or Swift was the right call. They build on the graph, and leave when they know what
   they need. Claude Code, Mistral and DeepSeek have shown they do not much mind building in NodeGX's files instead of
   code. The off-ramp is ruled (2026-10-21, P18 EXP-019…023): React source from npm, then Swift. Today the React export
   carries every picker node and, since 2026-10-21, the scripts that read the clock, the browser or `this`; it names,
   before writing anything, what it does not carry yet. Since 2026-10-22 a logic component exports as a hook
   (EXP-021), driven on todo-list and rocket-school, and `@nodegx/export` is on npm. Swift is scoped, not built
   (EXP-022, ruled 2026-10-22 as D6: the todo-list with its backend, hard stop at 12 sessions). **For React the pillar is checkable on two templates; for Swift it is a
   promise, and the site says so.**

**The tenet that binds the three (2026-10-23): the person is in the loop, and the server keeps it so.** The stranger
audit of the npm packages (`reviews/npm-stranger-audit-2026-10-23.md`) found one thing code cannot match: a person who
cannot code opening the app and changing it. Everything else — validation, driving, a backend, an export — an agent
writing React also has, cheaper. So the pillars are read through that person. Pillar 1 is not "the agent builds you an
editor" (an admin panel is cheaper in code, Richard's own point); it is the editor a person and an agent share, *live,
during the build*: Studio in the conversation, redrawing on every write, with a HOLD that refuses the agent's next
write until the person releases it (P125). Pillar 2's rule stands — *prose advises, gates bind* — and the hold is its
first gate on behalf of a person rather than a format. Pillar 3 is the way out the person takes when they know what
they need. Richard, 2026-10-23: *"make the 'human in the loop' concept a hardcore tenet of our canon"*, and *"You use
your Claude, we bring the editor and backend management visually for non coders"*: the surface is where people already
are (Claude Desktop first), never a move to ours. The day-thirty test (§4 item 8) gains a measurement nothing else
has: whether the person stopped it, and what happened next (P125 CCN-007).

**The hook (2026-10-23, ruled D8): make your AI coder a true copilot.** After six runs in one day ended with
Studio drawn inside Claude Desktop's conversation, HOLD stopping the agent, and Richard's *"It's fucking perfect"*,
he named the pitch. In his words: *"the thinnest layer possible on top of LLM's existing coding knowledge, building in
tandem inside the chat, no more 45 min vibe coding one shot apps you end up having to give 20 points of review and
redoing, easy to learn nocode editor interface, everything inside your favourite coding agent — nothing extra to
install, offramp to React or Swift (and any major framework once we build the ramps), or just choose to stay in NodeGX
and deploy to a VM (work in progress) and try out your app without thinking about frameworks yet, or just stay in
NodeGX forever and keep using Claude to tweak your app and collaborate on the advancements. You're in the driver's
seat, Claude is your true copilot."* Read against the pillars: the copilot is pillar 1 made live (the editor a person
and an agent share, during the build), the seed is what makes the layer thin for the agent, and the ramps are the way
out. What each clause can claim today, by the §3a rule (checkable / promised):

| clause | today |
|---|---|
| building in tandem inside the chat, a stop button | **checkable** — P125 CCN-001, Claude Desktop, 2026-10-23: the panel, HOLD, "what did you see?" |
| the thinnest layer on the LLM's coding knowledge | **measured the other way so far** — OWN-026 test 1: code 21, NodeGX 18 after two fixes; the day-thirty test (test 2) and the person test (CCN-007) are what would turn this |
| an easy-to-learn no-code editor | **built, not yet tested on a stranger** — Studio 0.2's alpha line; CCN-007 |
| nothing extra to install, inside your favourite agent | **promised** — today: a checkout, an absolute node path in a config file, Studio found on disk. CCN-006 (Studio on npm, a Desktop Extension, `create-nodegx --desktop`) is the gap, and the stranger audit's 17 packaging defects are its other half |
| off-ramp to React, Swift, any major framework | **React checkable on two templates; Swift a bounded promise** (EXP-022, 11 of 85 scenarios); "any framework" is a direction, not a claim |
| deploy to a VM without thinking about frameworks | **work in progress** (lane 3/4) — say so |
| stay forever and keep tweaking with Claude | **checkable in the small** (every run today was that); the day-thirty number is still owed |

The site says the checkable column and names the rest as what is being built.

What this changes about the earlier framing on this page: §1–§3 stand. The four reasons in §3 are *how* the blueprint
is safe to build on (restraint, testing, security, do it yourself); §0 is *why a person would want the blueprint at
all*. The place named on 2026-10-20 ("the workbench of the person who vouches", `reviews/THE-PLACE-NODEGX-BESIDE-REPLIT.md`)
is the same answer from the other side: the person who vouches needs the blueprint, the record of how it was built,
and the way out.

The honest sentence for the site, until a day-thirty test has a number (§4 item 8): *on the first day, an app built with
NodeGX looks like one built without it; what differs is what you can still do with it later, and here is what you can
do today.*

## 1. What NodeGX is

NodeGX is a framework that a person's agent builds apps inside. The agent writes the app as a NodeGX project: a graph
of nodes from a fixed vocabulary, saved as plain files. Each node's behaviour is written down once as a spec. Every
implementation is tested against it (phase 107).

People install the framework from npm. The NodeGX editor is optional. Someone can vibe code an app from start to
finish without ever opening it, and open it on the day they want to change something themselves. The editor works on
the same files the agent wrote. Nothing has to be migrated when that day comes.

## 2. Why

A large vendor will ship a polished editor for vibe-coded apps, because people who don't code need one. Richard expects
Anthropic to be that vendor. The NodeGX editor won't win on polish against it. The plan doesn't ask it to. What lasts
is what such an editor is unlikely to give. The first is building blocks whose behaviour is specced and tested, whichever
agent writes the app. The second is a kit for building your own editor that doesn't depend on any vendor's software.

So NodeGX aims to be a format a good editor could open, including a vendor's, rather than that editor's rival. Phase 107
already ruled that the editor is one client of the spec among several (P107 R6). This page takes that ruling one step
further: the editor is optional for the person as well as for the architecture.

## 3. The four reasons

These are the reasons NodeGX gives for choosing it. Each one may be advertised only once the thing in the third column
exists and can be checked by anyone (P111 SEE-009 binds each sentence on nodegx.io to its gate).

| reason | what it means for the person | what makes it true | state on 2026-10-05 |
|---|---|---|---|
| **Restraint** | The agent builds from nodes whose behaviour is known. Code it writes outside them is counted and named, so drift shows. | The honesty number on by default, in every MCP result and in the editor (P111 SEE-001). | Not built. 115 of 147 picker nodes conform to their spec on the runtime (P107). |
| **Testing** | Every node is tested against its spec, and the app's own behaviour can be recorded once and checked after every change. | P107's conformance suite for the nodes. App-level tests replayed from P107 traces for the app. | Node half built. App half is [SEE-011](tasks/phase-111-you-can-see-what-it-built/SEE-011-YOUR-APP-HAS-TESTS.md), not started. |
| **Security** | The app's data rules, keys and network calls are checked, and the result is a report a person can read. | A per-app security report over the backend's permission model (`public`, `authenticated`, `nobody`, `role:<name>`) and the project's own settings. | [SEE-012](tasks/phase-111-you-can-see-what-it-built/SEE-012-THE-SECURITY-REPORT.md), not started. The permission model exists (P104). P53 (trust and compliance) is specced, not started. P107 found that HTTP Request's auth presets have never sent a credential (row C7). |
| **Do it yourself** | Anyone builds their own editor or admin panel from a published kit, and a suite tells them when it's right. | The kit and the editor suite (P112 OWN-001 to OWN-007). | In progress. Only `@nodegx/core` is on npm. `@nodegx/node-spec` and `@noodl/mcp` are not, and `@nodegx/project-contract` is private. |

### 3a. The three pillars and their evidence (2026-10-21)

Each pillar may be advertised only as far as its third column reaches; the fourth is the work that extends it.

| pillar (§0) | what the person gets | true today, checkable | what extends it |
|---|---|---|---|
| **The blueprint stays open** | an editor for this app, for these people, without a rewrite | four editors built by an agent from the packages (OWN-008's three, P123's Studio, P124's backend map); the packages on npm | P124 (the backend on one canvas); OWN-009 (Richard's own) |
| **The knowledge ships with the project** | the first conversation is loaded with the method | `npm create nodegx` writes the server entry, a note, the editor-building skill; `create_project` writes the brief and the plan; the Vibe kit's first-day and sizing skills | [OWN-025](tasks/phase-112-your-own-nodegx/OWN-025-THE-FIRST-CONVERSATION-IS-LOADED.md) (the seed: folder shape, skills, gates) |
| **The off-ramp** | leave with source, React then Swift | `@nodegx/export` 0.2.5 on npm with its preflight; 130 picker nodes; scripts travel as written (EXP-019), the Noodl API (EXP-020), logic components as hooks (EXP-021), driven on todo-list and rocket-school | EXP-021 §101; EXP-022 (Swift, the bounded cut of its §7) |

Phase 111's four reasons (see it, trust it, steer it, leave or arrive) stay true as features. Seeing and steering are what
the optional editor offers. Leaving with React code (P18) and arriving with your own (P111 SEE-006) are ways in and out.
The reasons above are what NodeGX leads with.

## 4. What changes

1. **The front door is the npm install and the person's agent.** One command sets up a project, the MCP server and the
   preview, with no editor. [OWN-011](tasks/phase-112-your-own-nodegx/OWN-011-ONE-INSTALL.md) builds it (D1). Phase 112 R2 (publish the kit at 0.x) follows from this
   page and no longer needs arguing on its own.
2. **The editor stays the reference client.** It's the best way to see and change an app. It also proves the format is
   complete (P107 NSP-021). Work on it aims at good, clear and trustworthy. Past that, effort goes to the four reasons
   first.
3. **Every project an agent writes must open in the editor and survive an edit there.** "The editor at any time" is a
   promise. Phase 112's editor suite (OWN-006) grades it. Its fixtures include projects written through the MCP, not
   only hand-built ones.
4. **The honesty number is on by default.** With no person watching the graph, it's the only check that notices an app
   turning into code inside Function nodes.
5. **The app lives in the project format.** A plain React app that imports the node specs gets tested building blocks,
   but no graph, no editor and no do-it-yourself editors. The specs as a code library (P111 SEE-005) are a way in and out,
   not a second home for apps.
6. **The seed is the product's first impression** (2026-10-21). `npm create nodegx` fills the folder with what the
   first conversation needs: a thin note with the order of work, a folder shape the tools read and write (brief, plan,
   tasks, bugs, play-tests, memory, learnings), skills loaded on trigger, and every rule that matters as a refusal in
   the server rather than a sentence in a doc. [OWN-025](tasks/phase-112-your-own-nodegx/OWN-025-THE-FIRST-CONVERSATION-IS-LOADED.md).
   The knowledge in `dev-docs/` is the raw material; distilling it is part of the task.
7. **The off-ramp ships from npm, React then Swift** (2026-10-21). Nobody has to open the editor to leave. P18's lane
   order is EXP-019 → 020 → 021 → 022, with EXP-023 on the kit's cut.
8. **The comparison measures day thirty, not day one** (2026-10-21). OWN-023's next round builds the same app both
   ways and then hands each to a fresh stranger with the asks a client makes later: a custom editor for one part, a
   role-gated page, a changed rule. Time, cost and breakage are the number the site can then quote.
   [OWN-026](tasks/phase-112-your-own-nodegx/OWN-026-THE-DAY-THIRTY-TEST.md).

## 5. Rulings

Both ruled by Richard on 2026-10-06 as recommended ("D1: Ok. D2: ok").

| # | Question | Ruling |
|---|---|---|
| D1 | **Where do the three pieces with no owner go?** The one install command, app-level tests and the per-app security report each need a task. | ✅ **Install command: [OWN-011](tasks/phase-112-your-own-nodegx/OWN-011-ONE-INSTALL.md) in phase 112**, since it ships the kit. **App-level tests: [SEE-011](tasks/phase-111-you-can-see-what-it-built/SEE-011-YOUR-APP-HAS-TESTS.md) in phase 111**, beside SEE-003, which already makes P107 traces follow a running app. **Security report: [SEE-012](tasks/phase-111-you-can-see-what-it-built/SEE-012-THE-SECURITY-REPORT.md) in phase 111**, since it is one of the reasons phase 111 puts on the tin. P53 stays the phase for regulated domains (payroll, medical). |
| D3 (2026-10-21) | **Does the homepage lead with §0's honest sentence** ("on the first day it looks the same; what differs is what you can still do later") in place of "A full-stack app, drawn as a graph"? | ✅ **Yes.** Richard, having read it: *"I've read it, you can make it a fully fledged part of the site."* Deployed 2026-10-21 (nodegx-web `469575e`) with /from-code/ in the nav. |
| D4 (2026-10-21) | **Is the seed's shape** (a thin note, a folder shape, skills on trigger, rules as server refusals) **the one to build, with the `dev-docs/` knowledge distilled into it?** | ✅ **Yes, as scoped** (Richard, 2026-10-22). OWN-025 starts; the first gate is the Gala shell-copy (a page that is one HTML blob) refused by the validator, with the thin note. |
| D5 (2026-10-21) | **Does the comparison measure day thirty** (OWN-026) **rather than a third day-one round?** | ✅ **Yes, and the running lab replaces the first draft** (Richard, 2026-10-22). `own-026/PLAN.md` is the plan of record: DeepSeek builds the rocket times-tables app in three arms, then ten changes; Sonnet 5.5 hands the Gala builds over. The task file's three-asks section is kept, marked superseded. The result goes on the site whichever way it comes out. |
| D6 (2026-10-22) | **How far does the Swift off-ramp go, and when?** | ✅ **The bounded cut of EXP-022 §7, with the backend** (Richard, 2026-10-22): the todo-list as it ships (signs in, reads and writes its records) on the same backend the web app uses; scripts verbatim in JavaScriptCore; graded headless; **hard stop at 12 sessions**, an overrun reported on the site as evidence against the claim. **Starts now, in a second lane-6 session beside React's EXP-021 §101**, Xcode builds yielding to any lab grade or full suite. |
| D7 (2026-10-23) | **Is co-construction — Studio inside the conversation, a HOLD the server enforces, the person in the loop as a tenet — the lane to build, Claude Desktop first?** | ✅ **"We can target Claude Desktop to start. Make it so."** (Richard, 2026-10-23). P125 opened; CCN-001 built the same day; its AC5 is his run in Claude Desktop, which decides whether the panel is inside the conversation or beside it (the hold holds either way). |
| D8 (2026-10-23) | **Is "make your AI coder a true copilot" the hook — co-construction inside the person's own agent as the reason to use NodeGX?** | ✅ **Yes** (Richard, 2026-10-23, after run 6: *"It's fucking perfect. Let's commit this and add it to our canon as possibly the way to justify using NodeGX."*). §0's hook paragraph is the statement; its table is what may be said today. Lane 8 is the lane; CCN-006 (nothing extra to install) and CCN-007 (the person test) are what turn the promised rows into checkable ones. |
| D2 | **Does a plain React app that uses `@nodegx/nodes-react` count as a NodeGX app?** Phase 111 R6 recommends publishing that package so the honesty number applies to code written outside NodeGX. | ✅ **Publish it, as P111 R6 says, and call it a way in and out.** It gives a React app restraint and node tests. It can't give the editor or do-it-yourself editors, which read the project format. The site says so plainly. |

## 6. Where each phase stands

| phase | its part in this direction |
|---|---|
| [P107](tasks/phase-107-the-node-says-what-it-does/README.md) | The specs and the conformance suite: the testing reason, and the base of the restraint reason. Unchanged. |
| [P111](tasks/phase-111-you-can-see-what-it-built/README.md) | The honesty number, the text form, the companion door for the agent, and the words on nodegx.io. SEE-009's reasons are now the four in §3. |
| [P112](tasks/phase-112-your-own-nodegx/README.md) | The kit and the editor suite: the do-it-yourself reason, and the packages people install. |
| [P18](tasks/phase-18-code-export-v2/README.md) | The off-ramp (§0 pillar 3): React source from npm, then Swift. Re-ordered 2026-10-21 (EXP-019 → 023). |
| [P104](tasks/phase-104-the-backend-manager/README.md), [P53](tasks-archive/phase-53-trust-and-compliance/README.md) | The permission model a security report would read, and the compliance work for regulated domains. |
