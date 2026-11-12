# The three surfaces: an audit of what each level says about itself and the others

**Written:** 2026-10-27, from Richard's Muddy Paws Shelter run in Claude Desktop (the screenshot, the two agent
replies he pasted, and the video transcript at `~/HiveClip/2026-10-27 09-40-48/02-transcript.json`). **For:** Richard
first, then the sessions that take the rows in §4. **Lane:** 3 (P125, the copilot in the conversation) and nodegx-studio;
lane 7 for the words on the site. **Ledger rows filed with this audit:** `P125-MUDDY-NATIVEDIALOG`,
`P125-MUDDY-OPTSETSUNKNOWN`, `P125-MUDDY-DEADCHIP`, `P125-MUDDY-SURFACESUNSAID` (`node scripts/bugs.js --from P125`).

## 0. The one-paragraph answer

The product has three surfaces a person meets, in order of depth: the **mini editor** in the message, **NodeGX Studio**
in the conversation or its own window, and the **NodeGX editor** they download. Under all three is the floor the site
already sells: the app is a folder of files any editor can open, including one the agent builds. Each surface works on
its own. **None of them knows the others exist**, and the agent knows least of all: the connector's source has no
sentence about what Studio can draw, no word "option set", and nothing that names the full editor or where to get it.
So when Richard asked where a wording lived, the agent had to invent an answer, chose a States node that Studio cannot
show, and told him NodeGX has no option sets while Studio's Data tab has a whole sub-tab for them. The four things he hit
are one defect seen from four sides: the ladder is built, but nobody has written it down where the agent, Studio or the
site reads it. §4 scopes that writing-down as rows, plus the two real Studio bugs (a dead native dialog, a dead chip)
and the Preview button.

## 1. What Richard hit, measured

### 1.1 No Preview button (his point 1)

What exists: the hosted strip's **Window ↗** opens *Studio* in its own window, the desktop app if installed, else the
browser (`nodegx-studio/editor/hosted/hosted.js:113`, `:260–266`, `app.openLink({ url: ORIGIN + '/' })`). Nothing opens
the *app alone*. Studio's app frame is mounted by `NodegxPreview.mountPreview($('app'), { runtimeBase: '/runtime/' })`
(`editor/studio.html:1244`) and written into a blank iframe (`packages/noodl-preview/src/inPage/index.ts:161–168`), so
the running app has no URL of its own.

What a Preview needs is already served by Studio's server (`editor/serve.mjs`): the in-page runtime (`/preview.js`,
line 477, and `/runtime/*`), the project's files (`GET /api/project`, 489) and a change stream (`GET /api/events`, 495)
that fires on Studio's own saves too ("a second Studio window on the same project hears this save as a change made
outside it", 504–540). A Preview is one new route serving a one-page HTML that loads `/preview.js`, fetches the project,
mounts it full-window, and re-mounts on each event. Scoped as **STU-080** in §4.

### 1.2 "Add" in Option sets does nothing (his point 2)

Measured in the source: **New** calls the browser's native `prompt()` (`studio.html:5431`); so do **New attribute**
(5468), **New data type** (4649) and **New style** (5489, 5504). Nine places call native `confirm()` (deletes of a
type, a field, a set, a style, rows and accounts; a type change on the development database; "Make a live database",
4716–5534).

Where Studio ships, neither works. Electron does not implement `window.prompt()` at all (its documented position:
"prompt() is and will not be supported"), and the desktop Studio is Electron. Inside a conversation the panel is an
iframe in Claude Desktop, also Electron, and the fake host we test against grants the panel
`sandbox="allow-scripts allow-same-origin allow-forms"` with no `allow-modals`
(`dev-docs/tasks/phase-125-co-construction/tools-fake-host.mjs:13`), under which `prompt()` returns `null` and
`confirm()` returns `false` without a word. So **New** returns early on the null and nothing happens, and in the hosted
panel every delete silently refuses.

Why the gates are green: `check:editor` and `check:data` stub the dialogs before clicking
(`editor/check.mjs:481,496,499,514`; `editor/data-check.mjs:170`: `window.confirm = () => true; window.prompt = …`).
A gate with a hole shaped like the defect. **Fix:** Studio's own inline name field and confirm card (it already draws
popovers and menus); the gate stops stubbing. Row `P125-MUDDY-NATIVEDIALOG`.

### 1.3 Option sets never reached the agent; the wording is unreachable (his point 3)

**The agent was never told.** `grep -ri 'option set' packages/noodl-mcp/src` finds **0 files**. The bound briefing,
the five guidance sections of `get_project_info` (traps, authoring, interface, design, backend:
`packages/noodl-mcp/src/guidance.ts:21–27`), the seeded `CLAUDE.md`, `CONVENTIONS.md` and `docs/` of a new project
(checked on Muddy Paws Shelter: no "Studio", no "option set") and the node catalogue carry nothing. Studio's shape for
one is settled and small (R6, 2026-10-23, `nodegx-studio/docs/SCOPE.md`: one logic component under `Option sets/<Name>`,
one `Static Data` node holding a JSON array, `Component Outputs` `items` and `count`, and
`metadata.optionSet.attributes`; `studio.html:5428–5441`). The agent did not pick it because it could not: the fact lives
in Studio and nowhere the agent reads. The same hole made `sex` a text field on Dogs (the video, 17:40).

**What it built instead** (`NodeGX test projects/Muddy Paws Shelter`): a `Variable2` named `language`, two `Set Variable`
steps typing `fr` and `en`, a `/Components/T` logic component (`Expression`: `lang === 'fr' && fr ? fr : en`) placed
once per text, then, on Richard's ask for something no-code, a `States` node "Wordings by language" with 18 parameters
in `/Components/Wording`. All valid NodeGX. None of it is a thing Studio draws.

**Why the chip is a dead end.** Studio draws a dynamic value as a chip. Custom states, option sets, page data and
composed expressions get their own chip kinds, some clickable; any other logic source falls through to a plain span,
`"<label>'s <port>"`, with no click handler (`sourceChip`, `studio.html:2975–2982`; `isHelperNode`, 3488). The element
tree lists visual nodes only, so a `/Components/T` instance or a `States` node is on the page, feeds the headline, and
can be reached from nowhere in Studio. Richard read "Headline wording's Text", looked for it, and could not find it.
That is the defect, not the agent's choice of node. Row `P125-MUDDY-DEADCHIP`.

### 1.4 The agent invents Studio's limits (his point 4)

The agent's two replies are honest about method and wrong about the product. "NodeGX has no option-set type" is false
in Studio's terms. "I haven't opened that node in the editor to see how it displays" is the agent saying it does not
know what the person sees. It never offered the one true answer: *this is a States node; Studio cannot draw it; the
NodeGX editor can, here is the download, press Connect Claude and I will walk you to it.*

Nothing in the product gives it those sentences:

| what the agent reads | names the mini editor | names Studio | names the NodeGX editor | says what Studio can draw |
|---|---|---|---|---|
| unbound briefing (`instructions.ts` `BOOTSTRAP_INSTRUCTIONS`) | yes (`show_mini_editor`) | yes (`open_studio`) | no | no |
| bound briefing (`projectInstructions`) | no | no | no | no |
| `get_project_info` guidance sections (5) | no | no | no | no |
| `open_studio` description (`openStudio.ts:170–180`) | no | — | no | no |
| `show_mini_editor` description (`miniEditor.ts:124–136`) | — | "replaces Studio in the conversation" | no | no |
| `open_in_editor` description (`openInEditor.ts:337–343`) | no | no | — (it is the editor tool; it assumes NodeGX is running) | no |
| the seeded project (`CLAUDE.md`, `CONVENTIONS.md`, `docs/`) | no | no | no | no |

The briefing has an 8,200-token budget and cannot take a paragraph; the guidance sections of `get_project_info` are
the channel built for exactly this (a result field, read in parts, with `MUST_KNOW` lines up front). Row
`P125-MUDDY-SURFACESUNSAID`.

## 2. The ladder, as the canon already implies it

DIRECTION §0's tenet: *the person is in the loop, and the server keeps it so*; pillar 1 is the editor a person and an
agent share, live, during the build. The ladder is that pillar at three depths. Nothing new is ruled here; it is
written down so each surface can say it.

| rung | where | who it is for | what it shows | what it refuses to show | when the agent uses it |
|---|---|---|---|---|---|
| **The mini editor** | one part, in the message (CCN-008) | anyone; a decision, not an edit | one part live, the settings the agent chose, Approve / Not that | everything else | a choice before building on it: the look of a button, a hero, a model |
| **NodeGX Studio** | in the conversation, docked, full screen, or its own window | people who think in pages, elements and workflows; "a closed system where I can't break much" | Design, Workflow, Data (types, rows, privacy, option sets, the map, the backend's functions and triggers), the run timeline, Publish | nodes outside its vocabulary (a States node, a Function's body, a custom script); it says so and names the editor | the default while building; every write redraws it |
| **The NodeGX editor** | a download, on the same folder | people who want every node and wire; "nothing is closed off" | every node, every wire, the whole graph, the lessons | nothing | when a person asks to see a thing Studio cannot draw, or asks to go deeper |
| *the floor* | the files, on npm | everyone, on day thirty | the same project in git, VS Code, or an editor the agent builds | — | the off-ramp and the "your own editor" claim already on the site |

**The rule the agent needs, in one sentence:** *build with the parts the person's current surface can draw; when a
thing needs a part it cannot, say which part, say that it is in the NodeGX editor, and offer the download and a
guided look.* The stronger half is a gate, not prose (pillar 2): the server knows which surface is open (`open_studio`
started it; `session_status` reports the hold), so a write that puts a node outside Studio's vocabulary onto a page a
person is watching in Studio can carry a note in its result ("this node is not drawn in Studio; the person will see a
chip they cannot open"). Not a refusal: Richard's ruling in the video is that the model must stay free to use a
Function or a States node when that is the right part.

**Studio's vocabulary has to be a list, not a feeling.** Today "what Studio draws" is spread across `studio.html`
(the step list `ACTIONS` at 4470, the source kinds in `valueSources`, the hidden property groups). The agent cannot
read that. STU-081 in §4 makes it one exported list (`studio-vocabulary.json`, say), served at a route and shipped
with `@nodegx/studio`, so the connector can read it, the gate can check against it, and the site can quote it.

## 3. Coherence, surface by surface

Richard's four questions, answered per surface with what was read. "Evangelises" means: says why staying on the
method pays, in the surface's own words, at the moment a person might leave.

| surface | aware of the others | says its strengths and limits | evangelises the method | coherent with the canon |
|---|---|---|---|---|
| **Mini editor** | Studio, as the thing it replaces in the conversation (tool description). Not the editor. | Strength yes (the controls come from the part's own settings; the homepage's claim). Limits: none said to the person; the panel has no "see this in Studio" | No | Yes: "the list comes with the part" is pillar 1 at micro scale, and the homepage already draws it (the Price list) without naming it |
| **Studio** | The NodeGX editor, in one sentence, on an unsupported filter (`studio.html:3269`: "Edit it in the NodeGX editor; Studio leaves it as it is"). The mini editor: never. The download: never (welcome screen, strip, Publish say nothing) | Strengths yes (every tab's empty state explains itself). Limits: the one sentence above; a chip it cannot open says nothing | Partly: "Connect Claude Code" and "Window ↗" keep the person inside the method; nothing says *why* | Yes in build (files, hold, real app), no in words |
| **The NodeGX editor** | Studio: two source mentions (`agentConfig.ts`, `deploy-skeleton.ts`), nothing a person sees. It need not advertise the shallower rungs; it must know a person may have arrived from Studio and the chat | It is the deepest rung, so "limits" is the off-ramp, which it does not mention | The lessons do; the chrome does not | Yes |
| **The connector / the agent** | Studio and the mini editor by tool name only (§1.4). The editor: only as "the running NodeGX editor" in `open_in_editor`, with no download | Neither; it invents them when asked | No. The video's whole argument (scope first, parts the person can change, leave with React) is in `dev-docs/` and DIRECTION, not in anything the agent says to a person | **No**: it builds parts the person's surface cannot show and does not say so; the one surface the person cannot see is the one that is "closed off", the opposite of the ethos |
| **The site** (`nodegx-web/site`) | Homepage: three ways in, and "Choose how you'll edit it: NodeGX Studio, the professional editor, or an editor Claude builds for your team". `/start` "Choose your editor": the same three, Studio "coming soon". `/studio`: "a second editor for NodeGX apps". **"mini editor" and "full editor" appear on no page**; the mini editor is drawn on the homepage (the Price list) unnamed | Studio's page says "Early, and measured"; the editor's download says "public alpha" | `/why` does this well (three things you can still do later; "NodeGX is not the fastest way to a small app") | Mostly. The site's three are *who edits* (beginner / professional / your team); Richard's three in the video are *how deep* (in the message / in the chat / the whole graph). Both are true; a reader meeting both will count six editors. §4 CPY-001 merges them into one ladder with the floor under it |
| **The docs** (`docs/`) | "Studio" appears in one file (`docs/runtime/YOUR-OWN-SERVER.md`) | — | — | The docs are the editor's; the ladder is absent |
| **The video** (transcript) | Yes, all three, found by accident at 27:00 and named in order at 29:30 | Yes, with the limits said on camera ("that's something I need to change before beta") | Yes: the many-to-many dogs example, the "concrete, not sand" argument, "the story of my life until NodeGX" | Yes. It is the clearest statement of the ladder anywhere, and it is not yet written down |

Two things the video sells that the product does not yet say for itself, and should before the video goes out:

1. **"Claude is not allowed to create anything you can't go in and visually inspect"** (29:50). True of the NodeGX editor,
   false of Studio today, and the agent does not know the difference. STU-081 + CCN-009 make it true at every rung
   by *saying* which rung shows it; the editor remains the rung where it is always true.
2. **"NodeGX Studio … a closed system where I can't fuck things up too much"** (Richard's message). Studio has no words
   for that yet; the empty states explain tabs, not the promise. CPY-002.

## 4. The changes, as rows

In the order a session would take them. Each row names its home; the Studio rows go in `nodegx-studio/docs/SCOPE.md`
by a Studio session (that repo, not this one), the rest here.

| id | home | what | done when |
|---|---|---|---|
| **P125-MUDDY-NATIVEDIALOG** (bug, high) | nodegx-studio | Replace the 5 `prompt()` and 9 `confirm()` calls with Studio's own inline field and confirm card; the gates stop stubbing `window.prompt` / `window.confirm` | New option set, attribute, data type and style work in the desktop app and in the hosted panel (fake host, no `allow-modals`); a delete asks in Studio's own card; `check:editor` / `check:data` drive the real controls |
| **STU-081 Studio says what it draws** | nodegx-studio | One exported vocabulary (node types and step kinds Studio draws, the source kinds it chips, the sub-tabs), served at `/api/vocabulary` and shipped in the package; a chip whose source is outside it opens a small card: the node's label and type, "Studio doesn't draw this. The NodeGX editor does." with **Get the editor** (nodegx.io/start#download) and **Ask the agent to explain it** (writes a note the agent reads via `what_changed_since`) | Richard's chip opens that card; the vocabulary file is read by CCN-009's test |
| **P125-MUDDY-DEADCHIP** (bug, medium) | nodegx-studio | The half of STU-081 that is a defect: a logic source on the page has somewhere to be opened from (a "Logic on this page" list under the element tree, each row the chip's card) | A States node and a placed logic component appear in the list and open their card |
| **STU-080 Preview** | nodegx-studio | **Preview ↗** beside Window ↗: a route serving the app alone, full window, in the browser, re-mounting on `/api/events` | Richard changes a headline in Studio inside Claude Desktop and sees the browser tab change without a reload; the hold does not apply (the person is only looking) |
| **CCN-009 the agent knows the ladder** | P125 | A sixth guidance section `surfaces` in `get_project_info` (`guidance.ts` `SECTION_FIELDS`): the three rungs, when each is used, what Studio draws (read from STU-081's file when Studio is installed, a pinned copy when not), **option sets as the part for a fixed list**, and the sentence to say when a part is outside Studio. One `MUST_KNOW` line: "The person sees the app in Studio unless you showed a mini editor; a fixed list (a language, a status, a sex) is an option set, never typed strings; a part Studio cannot draw is said so, with the editor named." The three surface tools' descriptions name each other and the download in one clause each. `open_in_editor` says what to do when NodeGX is not installed (the download, then Connect Claude). The seeded `CLAUDE.md` gets one paragraph, "Where the person sees this app" | A fresh Sonnet in Claude Desktop, given Muddy Paws' brief, makes `Option sets/Language` and reads it from the header buttons; asked "where is the wording?", answers with the rung and, for a States node, the editor and its download. Driven headless with the fake host, then Richard's run |
| **CCN-010 the vocabulary gate** | P125 | A write that places a node outside Studio's vocabulary on a page while Studio is open returns, with success, a `notDrawnInStudio` note naming the node; `session_status` lists them; never a refusal | The Muddy Paws States write carries the note; the agent's next sentence names the editor |
| **OWN-027 option sets in the kit** | P112 | `get_example('option-set')`: the set, a dropdown fed by it, a Set Variable step choosing one; the authoring doctrine's "Rows are data" line gains "a fixed list is an option set"; `validate_component` suggests one when a `Set Variable` types a literal that another step also types | The example renders; the stranger round's next language switcher uses it |
| **CPY-001 one ladder on the site** | lane 7 | Homepage "Pick your way in" and `/start` "Choose your editor" say the same three rungs by the video's names, with the floor under them (the files; your own editor), and name the mini editor where it is drawn. `/studio` gains "What Studio doesn't show, and where it is". The download block loses "public alpha" the day the editor is cut as Beta | A stranger reading the homepage, `/start` and `/studio` counts three, and can say which one shows a States node |
| **CPY-002 Studio's own words** | nodegx-studio | The welcome screen and the hosted strip carry one line each on what Studio is for and where the editor is; the empty state of Option sets says what one is for in the person's terms (a language, a status) | Read by Richard |
| **the Beta email** | Richard sends | `the-three-surfaces-audit-2026-10-27-assets/brevo-studio-beta-email.md`, claims gated by §5 | Sent after the release is cut |

Order: NATIVEDIALOG and DEADCHIP first (a Beta tester hits both in the first hour), STU-081 with CCN-009 (one is the
list, the other reads it), STU-080, then the copy, then the gate. CCN-009's AC is the measurement the video claims.

## 5. What the video and the email may claim, by the §3a rule

| clause (the video) | today | say it as |
|---|---|---|
| build a full-stack app in the chat, watch it in Studio, hold it | checkable (CCN-001, CCN-005, BKO-006 three briefs) | as is |
| a double-click install for Claude Desktop | built (`.mcpb`, CCN-006), Richard's own double-click not yet run | "one file to open" once his run passes; until then "a short install" |
| three levels, nothing closed off | **true only after CCN-009 and STU-081** | until then: "Studio shows pages, elements, workflows and data; the NodeGX editor shows every node" |
| option sets | after NATIVEDIALOG and CCN-009 | not in the email before |
| deploy to a VM from the chat | checkable (lane 5, `deploy_to_vm`, 0.2.6 driven) | as is, "a Linux server you own, over SSH" |
| export to React | checkable on two templates; Swift bounded | "React, on the apps we have tried; Swift is being built" |
| the editor out of alpha | the BOARD's Beta rule (2026-10-23) is a simple app built in Studio, workflows, DB, privacy, road-tested, deployed; BKO-006's three briefs met most of it headless; Richard's own run is the gate | the email says Beta on the day he says it |
| "no difference in quality between NodeGX and React, DeepSeek and Mistral too" (the video, 8:30) | OWN-026 test 1 measured the other way (code 21 / NodeGX 18 after two fixes); test 2 not run | **cut or soften before publishing**: "the same model builds in NodeGX's files about as well as in code, on what we have measured so far" |

## 6. For Richard to rule, in plain words

1. **The third rung's name.** The video says "the full NodeGX editor"; the site says "the NodeGX editor" and "the
   professional editor". One name on every surface. Suggestion: *the NodeGX editor*, with "the full editor" allowed as
   a description. (CPY-001 waits on this.)
2. **When Studio meets a node it cannot draw, does the card offer the editor's download in Studio, or does it only say
   "ask the agent"?** The audit says both buttons; the download is the one that makes "nothing closed off" true without
   the agent's help.
3. **Does the gate (CCN-010) ever refuse?** The audit says never; a note only. Your video ruling says the model must stay
   free to use a Function or a States node.
4. **The quality claim in the video** (§5, last row): cut, soften, or leave for the edit.

## 7. Next session

Takes NATIVEDIALOG and DEADCHIP in the nodegx-studio repo (its `docs/NEXT-SESSION-PROMPT.md` names the gates and the
one-heavy-job rule), then STU-081 with CCN-009 here. Lane 9's SCHEDULEAUTH ruling and the 0.2.8 publish are not touched
by this audit and stay first on the BOARD; the rows above are lane 3's and come after Richard's fourth brief in Desktop
unless he names them.

## 8. The Beta gate, as rows for the board (asked by Richard, 2026-10-27)

The board's Beta rule stands (Richard, 2026-10-23: someone like him builds a simple app in Studio, edits workflows and
the DB and privacy rules, road-tests it and deploys to a VM for people to try). This section adds what that run must
also meet now that the four defects above are known, and names the rows that make it so. Proposed as a **§2a "The Beta
gate"** block under lane 2 and 3 on the board; nothing here reorders lane 9, which stays first.

**The gate, in one run.** Richard, in Claude Desktop, on a fourth brief no template covers: (1) installs by
double-click; (2) answers the scoping questions, and from then on every look-and-feel decision arrives as a mini
editor, not a text question; (3) watches Studio build, holds once, changes one thing in Studio and the agent carries
on; (4) makes a fixed list (a language, a status) and it is an option set he can see in Data; (5) clicks a dynamic
value and reaches the thing that makes it, or a card that names it and offers the editor; (6) opens Preview in a
browser tab and sees a Studio edit arrive without a reload; (7) deploys to a Linux VM he owns and opens it on his
phone; (8) presses Connect Claude in the NodeGX editor on the same folder and is walked to one node; (9) reads the
site and finds the same three rungs, by the same names, that he met in the run. Then one stranger (CCN-007) takes
steps 1–7 without him in the room. The Beta is cut when both pass; the email goes the day it is cut.

| # | row | home | serves gate step | what "done" is |
|---|---|---|---|---|
| B1 | **P125-MUDDY-NATIVEDIALOG** | nodegx-studio | 4 | no native dialog in Studio; the gates drive the real controls |
| B2 | **STU-082 the sandbox census** | nodegx-studio | 3, 4 | every browser API Studio calls (`prompt`, `confirm`, `alert`, `window.open`, file pickers, clipboard, downloads) listed, each driven once inside the fake host with no `allow-modals`, and each one that dies replaced with Studio's own control; `check:hosted` grows by one check per API |
| B3 | **P125-MUDDY-DEADCHIP + STU-081 Studio says what it draws** | nodegx-studio | 5 | one exported vocabulary file; a chip outside it opens the card (the node, "Studio doesn't draw this", **Get the editor**, **Ask the agent**); "Logic on this page" under the element tree |
| B4 | **STU-080 Preview** | nodegx-studio | 6 | a route serving the app alone, re-mounting on the change stream; the button beside Window ↗ |
| B5 | **CCN-009 the agent knows the ladder** | P125 | 2, 4, 5, 8 | the `surfaces` guidance section and one MUST_KNOW line; the three surface tools and `open_in_editor` name each other and the download; the seeded `CLAUDE.md` paragraph; measured on a fresh Sonnet with the Muddy Paws brief |
| B6 | **CCN-004 look first + CCN-003 show before apply, re-scoped to the non-coder** | P125 | 2 | the agent asks about style, logic and data in text only when a mini editor cannot show it; a style assumption it makes alone is shown once as a mini editor to approve, after the fact, not asked in advance; AC counts text questions about style on the fourth brief against the Muddy Paws run (the video's run is the baseline) |
| B7 | **CCN-010 the vocabulary note** | P125 | 5 | a write placing a node Studio cannot draw, while Studio is open, returns a note; never a refusal |
| B8 | **OWN-027 option sets in the kit** | P112 | 4 | the `option-set` example; "a fixed list is an option set" in the authoring doctrine; the validator's suggestion when two steps type the same literal |
| B9 | **CCN-006 the double-click, Richard's own** | P125 | 1 | the `.mcpb` opened by double-click on his machine, Studio inside it, no checkout on the path |
| B10 | **Lane 9's SCHEDULEAUTH ruling and `@nodegx/mcp` 0.2.8** | P127 | 7 | already first on the board; the gate's VM step runs on 0.2.8 |
| B11 | **CPY-001 one ladder on the site + CPY-002 Studio's own words** | lane 7, nodegx-studio | 9 | homepage, `/start`, `/studio` and Studio's welcome and strip say the same three rungs by the names Richard rules in §6; the download block says Beta on the day |
| B12 | **SEE-009 the words on the tin** | lane 7 | 9 | the site says only the checkable column of §5; the quickstart page is the walk |
| B13 | **The release cut** | Richard | — | `@nodegx/studio` on npm or the `.mcpb` on a download page; the editor's Beta version number; the changelog; the email |
| B14 | **CCN-007 the person test** | P125 | all | one stranger, steps 1–7, no one in the room; what they stopped and what happened next recorded |

**Order.** B1–B3 first (a tester's first hour); B5 and B8 together (one is the list, the other the doctrine that reads
it); B4; B6; B7; then B9 and B10 as the install and the backend the run needs; B11–B12 only after Richard rules §6;
B13 and B14 last. Two sessions can run in parallel from the start: one in nodegx-studio on B1–B4, one here on B5, B8,
B6, B7.

**What is not in the gate, on purpose.** Code export and Swift (lane 4, paused); the play kit (lane 8); a provider that
makes the VM from an API key (lane 5's "a real provider" is Richard's; the gate's step 7 is SSH to a server he already
has, which is what `deploy_to_vm` does today). The email must not promise the API-key path until lane 5 lands it.

## 9. The canon, unified (Richard's note of 2026-10-27, after draft 1 of the email)

Richard's note moves the centre of the story. §2 put the ladder first: three editors at three depths. The note says
the ladder is the mechanism, not the message. The message is two moments:

- **During the build.** Claude builds the whole app. The person who runs a dog shelter does not know what a backend
  is and should not be asked about padding. Today an AI either asks them hundreds of questions they cannot answer, or
  decides for them in silence. NodeGX's answer: the agent makes the small calls and carries on; the decisions that are
  the person's arrive as something to look at (a part in the message, the map for data), with Approve and Hold; the
  questions it does ask are about the person's world (dogs, meetings, staff), never about schemas or shadows.
- **After the build.** An agency gives you its GitHub repo knowing you cannot carry on alone. NodeGX gives you the
  project files and Studio, on your computer, open source, working without Claude: change the heading, the font, the
  button colours, a translation. Come back to Claude when you want a contact form or a members' area, and it picks up
  where it left off, because the files are a blueprint it reads and the build was documented as it went. Ship to a
  server you own from the chat.

The three rungs sit under that: the part in the message and Studio are the two the non-coder meets; the NodeGX editor
is the guarantee that nothing is closed off, named once, for whoever wants it. (The note does not mention the editor
at all. That is the right weight for the non-coder's page; the developer's and the Bubble builder's pages lead with
it.)

### 9.1 What this changes in the audit

| §  | before | after the note |
|---|---|---|
| §2 the ladder | the first thing every surface says | a reference table; the first thing every surface says is the two moments, then "how deep you go is up to you" |
| CCN-009 | a `surfaces` section: the rungs, what Studio draws, option sets, the editor and its download | the same, headed by **who you are building with**: (1) make the small calls alone; (2) show, don't ask, what is theirs: a mini editor for a part, the map for a data question, and only questions the person can answer in their own world's words; (3) when the plan is done, **hand over**: say what they own, what they can change in Studio themselves, and how to come back; (4) a part Studio cannot draw is said so, with the editor named. Rule 3 is new and has no home today: nothing in the kit scripts the end of a build. Proposed as the last step `create_plan` writes, or a `docs/HANDOVER.md` the seed owns (pillar 2) |
| B6 (CCN-004 / CCN-003) | fewer text questions about style | the rule in the note's words: a style question is never text; a data question comes with a picture (BKO-002's map in the conversation already draws it) and is asked in the person's terms; the AC counts text questions by kind on the fourth brief against the video's run |
| CPY-001 | one ladder on the site | the homepage leads with the two moments (its hero already carries the second: *Your AI builds the app. You can still change it without code.*; the first, the copilot, is DIRECTION §0's hook and is not on the homepage as a sentence); the rungs follow under "how deep you go" |
| the email | draft 2 is already written on the note | — |
| the video | praises the scoping questions ("worth the wait", 11:00–16:00) | keep for that channel's audience, and add the distinction the note makes: questions about your world, yes; questions about padding and schemas, no, those are shown or decided. Without that line the video and the email contradict each other |

### 9.2 Where the canon is met today, and what each place says first

| where | who meets it | first sentence today | carries the during half | carries the after half |
|---|---|---|---|---|
| `dev-docs/DIRECTION.md` §0 | sessions | "make your AI coder a true copilot" | yes | yes (pillars 1 and 3) |
| `@nodegx/mcp` briefing (`instructions.ts`) | the agent, every session | "NodeGX is a visual app builder: an app is a graph of nodes stored as plain files" | the mini editor sentence only (CCN-008) | no |
| `get_project_info` guidance (5 sections) | the agent, every project | the order: look, screens, plan | no | no |
| the seeded `CLAUDE.md` / `CONVENTIONS.md` / `docs/` | the agent and the person, in their project | "How to change this app: use the MCP server" | no | no (and it tells the person to use the server, not Studio) |
| `@nodegx/mcp` README | a developer on npm | "exposes NodeGX v2 project directories to external AI agents" | no | no |
| `create-nodegx` README | a developer on npm | "Sets a folder up so your AI agent can build NodeGX apps in it" | no | no |
| the repo README | a developer on GitHub | "a visual, node-based app builder … a fork of Noodl … This is an alpha" | no | no |
| Studio: welcome, strip, empty states | the person | "NodeGX Studio" / "connecting to the conversation…" | the hold | no (nothing says it is theirs and works without the agent) |
| the NodeGX editor: welcome, lessons | the person who downloaded | the lessons | no | no |
| nodegx.io homepage | everyone | "Your AI builds the app. You can still change it without code." | no (the Price list picture shows it, unnamed) | **yes** |
| nodegx.io `/start` | the non-coder | "Build your first app in a chat with Claude" | the hold | partly ("Make it yours") |
| nodegx.io `/why` | the sceptic | "Claude Code can build your app on its own. So why build it on NodeGX?" | no | yes (three things you can still do later) |
| the video | the channel | the copilot | yes | yes |

Nine places, one of them says both halves (the video), one says the after half well (the homepage), and the four the
agent reads say neither. That is the inconsistency Richard is pointing at: the agent, which speaks to the person more
than any page does, holds the least of the canon.

### 9.3 The mechanism: one text, quoted everywhere, with a gate

Prose advises, gates bind (DIRECTION §0). So:

- **One file, `docs/CANON.md`** (or DIRECTION §0 promoted): the two moments in two paragraphs, the three rungs in one,
  the four rules for the agent in §9.1, and the checkable / promised table (§5 here). Richard's own words where he has
  them. Every other place **quotes** it: the briefing's one sentence, the guidance section, the seeded `CLAUDE.md`
  paragraph, the two npm READMEs' first paragraph, the repo README's first paragraph, Studio's welcome line, the
  homepage's two sentences, the email.
- **A check**, `scripts/canon-check.mjs`: each quoting place names the canon sentences it carries; the check fails
  when a quoted sentence is no longer in the canon or a listed place has lost it. SEE-009 already binds the site to
  the hook table; this is the same binding over all nine places. Lane 7's row.

### 9.4 Claims in the note the product cannot make yet

- *"sign up, put in your credit card, grab an API key, Claude handles the rest"*: today `deploy_to_vm` ships to a
  Linux server the person already has, over SSH. A provider that makes the server from a key is lane 5's "a real
  provider" and is not built. The email and the site say the SSH version until it is. Proposed row **DEP-003 a server
  from a key** on lane 5, not in the Beta gate unless Richard puts it there.
- *"Claude will understand the project perfectly no matter how complex it gets"*: the day-thirty number is still owed
  (OWN-026 test 2). Say "picks up where it left off" and show one return visit (the contact form) in the video.
- *"a copy of Studio on your computer forever"*: true of the one-file install (the `.mcpb` bundles Studio) and of the
  npm route once `@nodegx/studio` is published (B9, B13). Said after those land; "works as it is, without Claude" is
  the honest form of "forever".
- *"the new WordPress admin panel"*: a positioning line, true in kind. A reader coming from nothing may not know that
  panel; a reader from Bubble will. Test it on the Bubble segment's page, not the non-coder's.

## 10. Ruled by Richard, 2026-10-27 (the §6 questions)

1. **The name is "the NodeGX editor".** Canon. "The full editor", "the professional editor" and "the original editor"
   go from every surface. CPY-001 and CPY-002 are unblocked.
2. **A Help tab, the same page in Studio and in the agent.** Richard: *"the Studio and the agent can both have a sort of
   'help' tab where you can download the full NodeGX Studio electron app, the NodeGX Editor electron app, or even get
   a guide on how to talk to Claude about building your own editor … a sort of canon lore page of the NodeGX universe
   to make sure every surface the user touches has access to the lore and doesn't misspeak."* So §9.3's one file is
   also a page: **STU-083 Help**, a tab in Studio (desktop and hosted) drawing the canon page with the three downloads
   (Studio's desktop app, the NodeGX editor, the guide to asking Claude for your own editor); and the agent reads the
   same page as the `surfaces` guidance section (CCN-009), so Studio's chip card (B3) opens Help at "what Studio
   doesn't draw" rather than carrying its own words. One text, drawn in one place, read by the other. The draft of
   that text: `the-three-surfaces-audit-2026-10-27-assets/CANON-draft.md`.
3. **Never refuse; be honest; offer the two ways.** Richard's sentence for the agent, verbatim, goes into the canon
   and so into CCN-009: *"but I could make you an editor to tweak that now if you want, or you download the NodeGX
   Editor to get full access and connect me as an MCP so I can guide you. It's easy and I'll walk you through every
   step."* CCN-010 stays a note, never a refusal; the note's text is this sentence's cue.
4. **The quality claim may be made, tentatively.** Richard: DeepSeek and Mistral *"did produce essentially the same app
   in our tests AFTER we fixed some bugs with the harness"*, to be backed by further runs if needed. The measured
   figures behind it, so the sentence stays honest (§5 row 8 is replaced by this): DeepSeek V4.1 Flash, OWN-026 test 1,
   the plain arms code 21 / harness 20, NodeGX 16 then 18 after FIX-01/02; Mistral Large 4 in Vibe 3.0.2, build to c04
   of 95 points, harness 84, NodeGX 78, code 43 (the memory `own-026-mistral-large-4-in-vibe-3`, FINISHED 2026-10-25;
   the series paused at c07 on Vibe's budget, resumes 1 November). The sentence for the video and the site: *on the two
   cheaper models we have measured, the same brief built in NodeGX's files came out about as well as in code, and on
   Mistral better; the measurements continue.* Not "no difference", and not "frontier-independent" until test 2.

## 11. Richard's six changes to the canon draft (2026-10-27), and what they add to the rows

1. **Agent-agnostic, Claude first.** The canon says "your AI coder"; Claude Desktop is named as the first host that
   draws Studio and the mini editor inside the chat, and the intent is stated: every AI coder app that renders MCP Apps
   (an inline HTML frame). Today: Claude Desktop inline (CCN-001); Claude Code and Cline get Studio's URL beside the
   chat (`openStudio.ts` docblock); Mistral Vibe builds with the kit (OWN-026). Kimi Code and Cline's inline support
   are unmeasured and not claimed. Touches CCN-009's text (no "Claude" in the rules), the seeded `CLAUDE.md` (which
   is already written per agent by `agentConfig.ts`), and CPY-001.
2. **"Put them in git" always comes with the other door.** Wherever the files are mentioned to a person, the next
   sentence offers an editor the AI builds to match how they understand the app. In the canon twice; the hand-over
   rule (§9.1 rule 3) now says it.
3. **The wiring underneath: STU-084.** Richard: parts Studio does not edit are *"hidden by default, but not invisible
   and inaccessible … a simple read only node canvas that shows the 'true full detail' of how pages are wired,
   accessible from the Studio but … not an obvious main feature … a logical place to put 'this is read only, if you
   want to edit this, download the NodeGX Editor … learning curve'."* The kit has the drawing already:
   `@nodegx/canvas-look` (the canvas look as data, for an editor that is not the NodeGX editor) and BKO-004's
   read-only graph of a cloud function in Studio. STU-084 draws the current page's whole graph read only with it,
   reached from a quiet "Wiring" link and from the chip card (B3), with the node that feeds the clicked value
   selected, and the Help paragraph on the download and the learning curve beside it. B3's card therefore opens Wiring,
   not a dead end; `isHelperNode`'s fall-through stops being the only path.
4. **Swift is at React's level.** The BOARD's measure: 15 of 85 scenarios on each export, the same 15, Swift's trace
   equal to React's on all 18 both play. The canon and §5 say "React and Swift, the same set of cases on each, on the
   apps we have tried"; "Swift is being built" goes.
5. **The cheaper-model sentence, modest.** Ruling 4 is amended: not "better on Mistral". The sentence: *DeepSeek and
   Mistral produced the same apps as on plain code in our tests, a little slower and at a higher usage cost; that cost
   is the investment in making the app editable and visible from the foundation.* The figures stay in §10 as the
   backing, not the copy.
6. **"Option set" is Bubble's word.** In the NodeGX editor the person meets a `Static Data` node in a component under
   `Option sets/`. Rule 5 of the canon names both; CCN-009 and OWN-027 teach the shape, not the word. Open for Richard:
   whether Studio's Data tab keeps the word "Option sets" (SCOPE forbids Bubble UI wording; this one is in Studio's
   UI already) or says "Lists".

**2026-10-27, later: the canon approved** (Richard: *"It's good"*) and promoted to `docs/CANON.md`; the draft stays
in the assets folder as the record. The quoting places and their rows: §12.

## 12. Implementing the canon everywhere: the quoting places, each with its row

| place | what it quotes from `docs/CANON.md` | row | repo |
|---|---|---|---|
| `@nodegx/mcp` unbound briefing (`src/instructions.ts`) | one sentence, inside the 8,200-token budget: NodeGX is about what happens around the AI's build, and `get_project_info` carries the canon | CCN-009 | OpenNoodl |
| `get_project_info` `surfaces` section (`src/guidance.ts` SECTION_FIELDS + MUST_KNOW, `src/tools/responses.ts`) | the page, read in parts; the five agent rules; the verbatim offer sentence | CCN-009 | OpenNoodl |
| the three surface tools and `open_in_editor` (descriptions) | one clause each naming the other surfaces and the download | CCN-009 | OpenNoodl |
| the seeded `CLAUDE.md` / `AGENTS.md` (`src/project/agentConfig.ts`, the editor's `models/template/agentConfig.ts`) and `docs/CONVENTIONS.md` | "Where the person sees this app" paragraph; rule 5 as a convention line | CCN-009 | OpenNoodl |
| the hand-over at the end of a plan | rule 3, as the last step `apply_plan` reports or a seeded `docs/HANDOVER.md` | CCN-009 (new AC) | OpenNoodl |
| the write note on a part Studio does not edit | rule 4's cue | CCN-010 | OpenNoodl |
| the option-set example and the validator hint | rule 5's shape | OWN-027 | OpenNoodl |
| `packages/noodl-mcp/README.md`, `packages/create-nodegx/README.md`, the repo `README.md` | the first paragraph: what NodeGX is for | CPY-003 (new; lane 7) | OpenNoodl |
| Studio's Help tab, welcome line, hosted strip, the chip card and Wiring's read-only notice | the page drawn whole; one line each on welcome and strip; the Wiring paragraph | STU-083, STU-084, CPY-002 | nodegx-studio |
| the NodeGX editor's welcome | one line: Studio exists, and Connect Claude walks you from it | CPY-003 | OpenNoodl (`noodl-editor`) |
| nodegx.io homepage, `/start`, `/studio`, `/why`, the download block | the two moments, the three ways by their canon names, the "what we can say today" list | CPY-001, SEE-009 | nodegx-web |
| the Beta email, the video's description | draft 2 already quotes it; the video's description links the page | Richard | — |
| `scripts/canon-check.mjs` | each place registers the sentences it carries; the check fails on drift | CPY-004 (new; lane 7) | OpenNoodl |

**2026-10-27, ruled:** *"Keep Option Sets, it's cool"*: Studio's Data tab keeps the word; §11.6's question is closed. The sessions that implement all of this: `dev-docs/tasks/phase-128-the-canon-everywhere/NEXT-SESSION-PROMPT.md` (P128, on the board).
