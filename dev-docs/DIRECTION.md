# NodeGX direction

**Set:** 2026-10-05 by Richard, in a conversation about what phase 107's node specs offer someone who vibe codes.
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

## 5. Rulings

Both ruled by Richard on 2026-10-06 as recommended ("D1: Ok. D2: ok").

| # | Question | Ruling |
|---|---|---|
| D1 | **Where do the three pieces with no owner go?** The one install command, app-level tests and the per-app security report each need a task. | ✅ **Install command: [OWN-011](tasks/phase-112-your-own-nodegx/OWN-011-ONE-INSTALL.md) in phase 112**, since it ships the kit. **App-level tests: [SEE-011](tasks/phase-111-you-can-see-what-it-built/SEE-011-YOUR-APP-HAS-TESTS.md) in phase 111**, beside SEE-003, which already makes P107 traces follow a running app. **Security report: [SEE-012](tasks/phase-111-you-can-see-what-it-built/SEE-012-THE-SECURITY-REPORT.md) in phase 111**, since it is one of the reasons phase 111 puts on the tin. P53 stays the phase for regulated domains (payroll, medical). |
| D2 | **Does a plain React app that uses `@nodegx/nodes-react` count as a NodeGX app?** Phase 111 R6 recommends publishing that package so the honesty number applies to code written outside NodeGX. | ✅ **Publish it, as P111 R6 says, and call it a way in and out.** It gives a React app restraint and node tests. It can't give the editor or do-it-yourself editors, which read the project format. The site says so plainly. |

## 6. Where each phase stands

| phase | its part in this direction |
|---|---|
| [P107](tasks/phase-107-the-node-says-what-it-does/README.md) | The specs and the conformance suite: the testing reason, and the base of the restraint reason. Unchanged. |
| [P111](tasks/phase-111-you-can-see-what-it-built/README.md) | The honesty number, the text form, the companion door for the agent, and the words on nodegx.io. SEE-009's reasons are now the four in §3. |
| [P112](tasks/phase-112-your-own-nodegx/README.md) | The kit and the editor suite: the do-it-yourself reason, and the packages people install. |
| [P18](tasks/phase-18-code-export-v2/README.md) | Leaving with React code. Unchanged. |
| [P104](tasks/phase-104-the-backend-manager/README.md), [P53](tasks/phase-53-trust-and-compliance/README.md) | The permission model a security report would read, and the compliance work for regulated domains. |
