# The message: NodeGX beside vibe coding

**Written:** 2026-10-19 (Fable), at HEAD `7bae9c9c4`, after Richard pasted a conversation with Mats (an original
Noodler) and a Reddit post about an AI that invented analytics numbers for three months, and asked: *"how do we get the
message across that using NodeGX is actually a good thing?"* Carte blanche.
**Companions:** [what NodeGX is for](NODEGX-WHAT-IT-IS-FOR.md) (2026-08-06), [DIRECTION.md](../DIRECTION.md)
(2026-10-05), [SEE-009, the words on the tin](../tasks/phase-111-you-can-see-what-it-built/SEE-009-THE-WORDS-ON-THE-TIN.md).
**Method:** read, not built. Every number below is from a task file, a ledger or a gallery in this checkout, and says
where it came from. Nothing in §8 is on nodegx.io yet.

---

## 0. The answer in one paragraph

The message isn't landing because we're making the argument on the axis the sceptic picked, and on that axis we lose.
Mats's objection is *"an extra abstraction layer, a potential point of failure, a trade-off for the added insight"*.
Measured against React, every layer **is** a cost, and the site's own hero agrees with him: it leads with *"a full-stack
app, drawn as a graph"*, *"an open-source visual builder"* and a screenshot of the editor, which is the exact product he
stopped trusting after the Noodl saga. DIRECTION.md moved the product two weeks ago (a framework from npm, the editor
optional); the front page hasn't moved with it, and the task that would move it (SEE-009) isn't started. Meanwhile the
Reddit post is our argument and we have never made it: an agent said "done" and for three months nobody could check.
The thing NodeGX has that a vibe-coded React app doesn't is **a check a person who can't read code can read**: the agent
builds from parts whose behaviour is written down and tested, opens the app in a browser, and reports line by line
against the person's own words, and a script the agent never saw agrees with it. We have 27 agent-built apps in a
gallery proving the second half. What we have **never run** is the control: the same model, the same brief, the same
harness, no NodeGX. That is Richard's proposed experiment, the lab already holds nine tenths of it (§3), and it is the
only form of the message Mats will believe, because it is his own objection tested. On the "should I move my project"
question, the honest answer for both apps he named is **no** (§4), and saying so plainly is what makes the rest credible.

---

## 1. Why the message isn't landing

Each finding names its evidence. Mats's words are from the pasted conversation of 2026-10-19.

| # | finding | evidence |
|---|---|---|
| 1 | **We argue on the sceptic's axis.** Mats: *"it's an extra abstraction layer (potential point of failure) … it makes it feel like you are making a trade-off for the added insight."* On "layer versus React" the agent already knows React best, so any layer reads as a tax. We have no number that says the tax buys something, only claims. | No control arm in OWN-018, OWN-019 or OWN-020: every graded round is kit-versus-kit (the Vibe kit 12/12 against the plain kit 0/12, same model), never NodeGX-versus-nothing. `grep -i "control arm\|plain react\|without the kit"` over the three task files finds only regression tests. |
| 2 | **The front page sells the product Mats is afraid of.** Hero: *"A full-stack app, drawn as a graph. An open-source visual builder for real web applications."* Then an editor screenshot, then *"Download NodeGX"*. The npm route is the fourth section, badged *"New"*. | `nodegx-web/site/_page.html`, read today. DIRECTION.md §4.1 (2026-10-05): *"The front door is the npm install and the person's agent."* SEE-009: *"📋 not started."* P111: *"0 of 13 done."* |
| 3 | **Mats's fear is the maintainer, not the tool.** *"I am afraid to commit any codebase into nodegx, just because I am still so hurt from the noodl/fluxscape whatever saga."* Richard's answer (*"anyone with an Anthropic subscription could continue maintenance"*) is a claim. We have never shown a stranger fixing one of our own filed bugs. | 150 bugs in `dev-docs/bugs/`, 143 open, each with a file and line (`node scripts/bugs.js`). The stranger method exists and has run against the kit a dozen times (P109 s12, OWN-008, OWN-015 s15). Never against the repo itself. |
| 4 | **The Reddit post is our argument, unmade.** *"We just found out our AI has been making up analytics data for 3 months … I only caught it by accident when someone asked me to double check something."* Mats's gloss: *"process insight via the human eye … seeing where a number comes from with your own eyes."* That sentence describes a wire from a Record node to a Text node. We've never said so in those words. | P101 inspector (the last value on every wire), ruled WORTHY. SEE-001, the honesty number: built, on MCP and in the editor, awaiting Richard's read (s2, 2026-10-19). `honesty-ledger.json`: landing-pages 95.7% known, todo-list 87.9%, digital-bricks-training 67%. |
| 5 | **Our proof grades the app, and we've only shown the graph.** The lab's graders play the running app in headless Chrome at phone size, *"reading only what a person sees"*, pressing with real CDP mouse events and reading colours from pixels. That is proof in the person's terms, and it is sitting in a task folder. | `own-018/grade-quiz.mjs` header; graders proven on mutants (`mutate-quiz.mjs`, `mutate-launch.mjs`, `mutate-pack.mjs`, `mutate-editor.mjs`). The OWN-019 gallery: 27 apps, with brief, model, hour, grade, cost and the grader's screenshots. Served on localhost:4800 only. |
| 6 | **Mats has a point about front ends, and we half-concede it already.** *"Modern frontend happens in a way that's not possible to visualize in this format anymore."* The training template is the biggest thing we've built through the door and it is the least NodeGX of all the templates. | SEE-000 reading 1: 1,037 nodes, of which 147 JavaScriptFunction carrying 7,796 lines; *"the graph is the wiring of a JavaScript app."* Honesty number 67%, the lowest on the ledger. Richard, 2026-10-01: the NodeGX rebuild was *"slower, heavier on his Claude usage and fiddlier to style."* |
| 7 | **Mats names the use case we have and don't advertise.** *"Node-graph like nodegx is the most powerful (& really helpful) when it comes to organizing agents, prompts, workspaces … a pure value add with no downside."* | P96 (the backend carries a feed): workflows, triggers, a model call from a function, the backend as an MCP server. The training template's backend answers as the `dbt-lessons` connector in this very session. Not one sentence on the site. |

The shape of the failure: **we have the measurements and the direction, and the words on the tin are two product
generations old.** Mats isn't wrong about the page he read.

---

## 2. The message

Rule 0 of the content-authoring skill: write the fact before the copy. The fact, in one sentence a stranger can check:

> **When your agent builds with NodeGX it builds from parts whose behaviour is written down and tested, then it opens the
> app in a browser and checks it against the words you used, line by line, before it says it's done. You read that
> report. You don't read code.**

Everything else on the page hangs off that. What it is **not**:

- Not *"vibe coding will never be the same again."* That's a claim about the world, and rule 9 says the reader tests
  it against Google and we lose. Make the claim about ourselves and let the comparison carry it.
- Not *"a visual builder"*, not *"drawn as a graph"*, not an editor screenshot above the fold. The graph is the reason
  you can trust what was built. It isn't where you build (P111 §0 says exactly this, 2026-10-01).
- Not *"React is a mess."* Rule 8: don't mock the alternative. The reader's alternative is Claude Code in an empty
  folder, and it works. Start from that and add.
- Not a promise about the editor or the 3D things. They're in the works and the site says so. They're not the reason.

The frame for the declaration, then, is **keep vibe coding, and add one thing**. The one thing is the check. Three
sub-claims sit under it, each with a gate that exists today:

| claim | what makes it true | gate today |
|---|---|---|
| The parts have written, tested behaviour. | P107: a spec per node, a conformance suite any runtime is graded against. | 142 of 147 picker nodes on the ledger at the board's reading (BOARD.md §1, 2026-10-14). |
| The agent checks the app against your words before it says done. | The kit's checklist step and `drive_page`; the agent's own end-of-run report is compared with a grader it never sees (OWN-019 AC3). | Quiz 12/12 ×3, Launch 19/19 ×3, Pack It 12/12, editor 13/13 on tgz33 (gallery rows T1b–TE1b, 2026-10-15). |
| You can see how much of the app is checked parts and how much is script nobody checked. | SEE-001, the honesty number. | On MCP and in the editor; Richard's read owed (AC6). |

And one sentence for the maintainer fear, which is the one Mats actually has: *"NodeGX is GPL, on npm, and the node
behaviour is written as specs that strangers have built working nodes from on their first run, in plain JavaScript and on a page with no React (P107 NSP-006, NSP-023). If The Low Code
Foundation vanished tomorrow, a person with Claude Code and the repo could carry on."* The last clause is a claim until §5
runs.

---

## 3. The proof: one brief, two strangers

Richard's proposal, and it is the right one. The design, and how much of it already exists.

**The question.** Same model, same harness, same paragraph, same day, same spending cap. Arm A: Claude Code in an empty
folder. Arm B: Claude Code after `npm create nodegx`. Nobody answers questions in either arm (the briefs already say so).
What does each person get, and what can they do with it afterwards?

**What exists.**

- The briefs: quiz, Launch, Pack It, and the editor follow-up (`own-018/sentence-quiz.txt`, `own-019/sentence-launch.txt`,
  `sentence-pack.txt`, `sentence-editor.txt`). The check brief too (`sentence-check-quiz.txt`): *"tell me line by line
  what works and what does not."*
- The graders, proven on mutants, reading only what a person sees. The one change: today they find the app by
  `nodegx.project.json` and start the packed preview (`grade-quiz.mjs:55–67, :94`). Arm A needs them to take a URL.
  The twelve checks don't care what served the page. The audit (node census, `validate_project`) stays NodeGX-only and
  is reported, never scored.
- The lab: `round-claude.mjs` (OWN-015 s15 ran Claude Code on the subscription, no API), the sealed HOME, the cost and
  time readings, the gallery with its index page.

**What is measured, per arm, per brief.**

| row | A: Claude Code alone | B: with NodeGX | why a person cares |
|---|---|---|---|
| grade | the grader's 12 / 19 / 12 | same | does it do what I asked |
| the agent's own report against the grader | `sentence-check-quiz.txt` on arm A's app, with Bash and a browser | OWN-019 AC3 | can I believe "done" |
| cost, wall time, turns | | | what it cost me |
| the second request, a week later, by a **different** stranger | *"Put an Edit quiz button on the start screen…"* (`sentence-editor.txt`) | same | can it be changed without the first agent |
| what a non-coder can change by hand | open the folder: what is there | open the editor: change the colour, the seconds | can **I** change it |
| how much is checked parts | 0% by definition | the honesty number | where the numbers come from |
| the key | where `BREVO_API_KEY` ends up (the Stillnote brief) | `.env`, 0 hits in the browser (OWN-015's search) | am I in the news next month |

**What we publish.** Both apps running side by side in the gallery, the two transcripts, the two grader reports, the
table. One page on nodegx.io: *"What Claude Code built alone, and what it built with NodeGX."* Rule 10: say the smaller
true thing. If arm A is cheaper or faster, the page says so in the first table. The page is worth more with one row we
lose than with none, because Mats will check.

**Risks, named.**

- Arm A will probably win on cost and time for the quiz. The kit's fixed overhead is 8.9k tokens a session before any
  work (VIBE-AND-LARGE4 §6), and a React quiz is a thing Claude has written a thousand times. The rows that should
  separate the arms are the self-report, the second stranger, the hand change and the key. If they don't, that's the
  finding, and the direction needs it more than the page does.
- One model. Run Sonnet or Opus on both arms first (Claude Code is the reader's alternative). Large 4 in Vibe as the
  second pair only if the first pair separates.
- A grader ported to a URL has to be re-proven on its mutants against a React app, or the arm A score is the harness.

**Scoped the same day as [OWN-023, one brief, three strangers](../tasks/phase-112-your-own-nodegx/OWN-023-ONE-BRIEF-THREE-STRANGERS.md)**, on Richard's music-app paragraph instead of the quiz, with a third arm (a stranger-written harness, no NodeGX) so a difference can be told apart from the prompt, four follow-ups and five persona hats run outside the repo. **Its stance is the null hypothesis (Claude Code alone is enough), with twelve written controls against confirmation bias (task §2.1), and "nothing a person needs" is a publishable result that would rewrite §2 of this review.** The paragraph below is the first sketch; the task file is the design.

**Proposed task, as first sketched:** P112 OWN-023, lane 5 (the lab). ACs: the grader takes a URL and passes
its mutants on a React build; three briefs, both arms, one model, one day; the second-stranger round on each; the page
with every row, including the ones we lose. Richard rules on the model and the day.

---

## 4. "I already have a project. Is it worth moving?"

We have answered this twice, with care, and both answers were no. The explainer should say so, because a page that
tells the reader to port everything is the page they stop reading.

**The rule** (the spectrum review, 2026-08-06, which the hostile reviewer reached on his own): *difficulty in plumbing →
NodeGX; difficulty in computation and correctness → code.* Four questions make it usable:

1. **Is it running and earning?** Then keep it. Nobody ports a working codebase for insight.
2. **Who looks after it in a year, and can they read code?** If the answer is "me, and no", the **next** app is where
   NodeGX pays, not this one.
3. **Is the difficulty the plumbing** (forms, records, roles, a feed, a portal, an admin panel) **or the computation**
   (tax rules, pricing engines, a transaction that must not race)?
4. **Is the front end the product** (design-led, animation-heavy, bespoke interaction)? Then React, and Mats is right.

**Communauté Coiffure: no, and we said so in August.** SvelteKit + FastAPI + Postgres 16 + pgvector, 482 commits, a
multi-tenant SaaS with a tax simulator, Stripe and a 24-tool assistant. The in-house review said *"code, not close"*; the
commissioned sceptic said *"code, 95% confidence"*, for a reason the reviewer had missed: the sole maintainer of NodeGX
and the sole author of the app are the same person. Both landed on the same recommendation: keep the stack, and use
NodeGX for *"internal admin/ops tooling, workflow-shaped back-office processes and client portals."* That is the
honest sentence for the explainer, and it's a better advert than a port would be.

**Digital Bricks Training: also no, measured three ways, and worth saying out loud.**

- The port evaluation (2026-09-19) said *"feasible as a capstone, not as a first template"*, and that seventy percent
  maps cleanly while thirty percent waits on six scoped phases.
- The slice was built anyway (sprints 44–49, 19–23 September): the front end over fixtures, then a real backend
  behind it. Richard's verdict on 2026-10-01: *"slower, heavier on his Claude usage and fiddlier to style the second
  time."* That sentence is the origin of P111.
- The artefact: 1,037 nodes, 147 of them JavaScript Functions carrying 7,796 lines. Honesty number 67%, the lowest of
  sixteen templates. *"The graph is the wiring of a JavaScript app."*

What the port **was** worth: its sprints cite eight rows of the P99 register (HLT-014 to HLT-024) and two of P78's, it found that a template can't
carry its schema and that `{}` couldn't be saved, it gave nodegx.io its only backend demo, and it's the reason the
honesty number exists. That is the "templates surface defects" rule working, not a migration paying off. Richard's
own product went the other way the same week: sprint 50, *"your app is Claude"*, a connector. The explainer can say
that too: **the thing that made the training product better was a tight MCP, and that is what the NodeGX backend is.**

So the explainer's two examples are both "don't move it", with the reasons, and a third door for the reader who is
Mats: *"If your front end is the product and you think in React, start the admin panel or the client portal in NodeGX
beside it."* `@nodegx/nodes-react` (DIRECTION D2) and SEE-006 (arrive with your code) are the way in for that reader and
neither is built, so the page doesn't promise them.

---

## 5. The maintainer claim needs its own round

*"Anyone with an Anthropic subscription could continue maintenance of the whole codebase"* is the sentence that answers
Mats's actual fear, and it is unmeasured. It is also the cheapest experiment on this page.

**The round.** A fresh Claude Code, the repo at HEAD, one open bug from `dev-docs/bugs/` picked by its file and line
(the ledger has 143), the ledger's own house rules, and the sentence *"fix this bug, with a test, and open a PR."*
Measured: did it land, did the test grade the fix (reverted arm red), did `test:main` stay green, what it cost, and
how many of the repo's own traps it fell into (the memory index is a list of them). Three bugs, three strangers. Publish the
three transcripts beside the three PRs.

**Proposed task:** P112 OWN-024, *"A stranger fixes a bug."* If one of three lands with a test, the site can say *"a
person with Claude Code and this repo fixed one of our filed bugs in a session, and here is the transcript."* If none
does, the memory index is the finding: the repo's traps are the maintenance cost, and they're ours to pay down.

---

## 6. Mats's use case, in one line

He's describing the backend. A feed a function writes to, a schedule, a model call from a function with the key on the
server, the whole thing reachable as an MCP server from a person's own Claude. P96 built it; sprint 50 of the training
product uses the pattern; this session is connected to one. It gets one card on the site, below the fold, as a thing
that exists: *"Your backend is also an MCP server. Your Claude can read and write your app's data through it."* Not a
pivot. The lane he's pointing at is the one Richard already named in the 0.5.0 quote: *"full stack apps with our own
backend."*

---

## 7. Where the words go

1. **The hero on nodegx.io** moves to the fact in §2, and the editor screenshot moves down to the *"when you want to
   see it"* section. The npm block becomes the first thing under the hero. This is SEE-009's job and DIRECTION.md §4.1
   already rules it; it needs no new decision, it needs a session.
2. **One page: the comparison** (§3), published when the rounds have run, not before. Linked from the hero.
3. **One page: "Already have a project?"** (§4), which can go up now. It's made of two measurements we already took.
4. **One page: "If we disappear"** (§5), after the rounds. GPL, npm, the specs, the strangers' runtime, the export, the
   transcript of a stranger fixing a bug.
5. **The four reasons** (restraint, testing, security, do it yourself) stay as DIRECTION.md §3 has them, each bound to
   its gate, below the fold. Security and do-it-yourself are not built; their rows say *"not yet"* as SEE-009 §3.3
   specifies, and that line is itself part of the message.

Every sentence on those pages goes through the content-authoring skill and its offline checks before Richard reads it
(memory: *copy passes the content-authoring skill*). §8 did.

---

## 8. Draft copy

Written for: someone who already builds with Claude Code or another coding agent, has never used NodeGX, and may have
used Noodl. British written English. Each block says its job first. Several heroes, so Richard picks (rule 14).

### 8.1 The hero. Job: make them read the next block.

**A.**
> **Your agent builds the app. NodeGX checks it.**
> NodeGX is a framework your coding agent builds inside. The parts have written, tested behaviour. Before it says it's
> done, the agent opens the app in a browser and checks it against the words you used, line by line. You read the
> report without reading code.

**B.**
> **Vibe code as you do. Add one check you can read.**
> With NodeGX your agent builds from parts whose behaviour is written down and tested. Then it opens the app in a
> browser and reports, line by line, what works against what you asked for. No code to read.

**C.**
> **See what your agent built, without reading code.**
> NodeGX is a framework your coding agent builds inside. Every part has written, tested behaviour. The agent checks the
> finished app in a browser against your own words before it tells you it's done.

Under any of them:

> `npm create nodegx my-apps` · Claude Code and Mistral Vibe today. Free, GPL-3.0, your files on your disk.

### 8.2 The case. Job: show it working once (rule 5).

> Someone asked for a capital-cities quiz in one paragraph: five questions, a ten-second countdown, a best score that
> survives a reload. Mistral's agent built it, played it on a phone-sized screen, and reported line by line. A script
> the agent never saw played it as well. Twelve checks, twelve passed, three runs in a row.

*(Gallery rows T1b, T2, T3, tgz33, 2026-10-15. Confirmed against `apps.json`.)*

### 8.3 The declaration. Job: say what we are and what we're not, for the reader who's been burned.

> **Keep vibe coding. We're not asking you to stop.**
>
> Claude Code in an empty folder builds working apps. We use it that way every day. What it doesn't give you is a way
> to check the result if you can't read the code. The agent says it's done. You take its word.
>
> NodeGX gives your agent a fixed set of parts to build from. Each part's behaviour is written down and tested, so
> what the agent builds is made of parts known to work. When it finishes, it opens the app in a browser and
> checks each line of what you asked for. You get that report. You can also open the app and see how much of it is
> checked parts and how much is script, by name.
>
> It's a framework on npm, not an editor you have to learn. The editor exists for the day you want to change something
> yourself, and it opens the same files your agent wrote. When you want out, your app exports as a React project.
>
> NodeGX is GPL-3.0. The behaviour of every part is written as a spec that other people have built working parts from.
> If we stopped tomorrow, a person with Claude Code and the repository could carry on.

*(The last sentence stays out until §5 has run. Everything else is true at HEAD.)*

### 8.4 "Already have a project?" Job: give the reader the rule and two real answers.

> **Already have a project? Most of the time, leave it where it is.**
>
> If your app is running and earning, keep it. We said so about two of our own.
>
> Communauté Coiffure is a SaaS for French hairdressers: SvelteKit, FastAPI, Postgres, Stripe, a tax simulator. We asked
> whether to rebuild it in NodeGX, and asked a sceptical reviewer the same question. Both said no. The difficulty in
> that app is the arithmetic. Arithmetic belongs in code.
>
> Digital Bricks Training is a coaching platform, built in Next.js. We rebuilt a slice of it in NodeGX to find out. It
> took longer, cost more of the agent's time and was harder to style. The rebuild found defects in NodeGX, which is
> what it was for.
>
> NodeGX earns its place on the next thing you build. Start the admin panel, the client portal or the internal tool
> in NodeGX, beside what you have.

*(The training sprints 44–55 cite eight rows of the P99 register, HLT-014/015/016/018/019/022/023/024, and two of P78's,
D72 and D75. Some were opened by the port and some only met by it, so the copy carries no number.)*

---

## 9. What I'd do first, in order

1. **Run §3 on the quiz with Sonnet, both arms, this week.** One day, two rounds, a grader that takes a URL. It settles
   whether the message has a number or only a sentence.
2. **Put §8.4 up now.** It's made of measurements already taken, and it's the page that makes a sceptic keep reading.
3. **Move the hero** (SEE-009, with DIRECTION.md already ruling the shape). Richard picks A, B or C, or writes his own.
4. **Run §5 on three bugs.** Cheapest round on the page, and the only answer to the Noodl fear.
5. **Reply to Mats with the §3 page, not with an argument.** He asked for a measurement by describing its absence.

## 10. Sources

- `nodegx-web/site/_page.html` (the live hero, read 2026-10-19); `dev-docs/DIRECTION.md` §3–§4; P111 README §0–§2,
  SEE-001, SEE-009, SEE-010, `honesty-ledger.json`; P112 README, OWN-018, OWN-019 (`VIBE-AND-LARGE4.md` §6), OWN-020;
  `own-018/grade-quiz.mjs`, `own-019/gallery.mjs` and the gallery's `apps.json` (27 rows); `dev-docs/reviews/` (the
  four NodeGX-versus-code reviews and the fitness envelope, 2026-08-06); `digital-bricks-training/dev-docs/research/
  NODEGX-FULL-STACK-PORT-EVALUATION.md` and sprints 44, 49, 50; `comcoi-v2/README.md` and its git log;
  `node scripts/bugs.js` (150, 143 open); the pasted conversation with Mats and the Reddit screenshot, 2026-10-19.
- Not done: no round was run, no page was published, and §8 has not been read by Richard.
