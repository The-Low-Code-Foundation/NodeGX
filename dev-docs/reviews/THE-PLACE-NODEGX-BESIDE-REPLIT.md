# The place of NodeGX beside Replit: why a person chooses a wrapped environment over the raw agent, and whether NodeGX sits inside that reason

**Written 2026-10-20 by the session handed `own-023/NEXT-SESSION-PROMPT.md` (Fable 5.1).** A research and positioning
session, no rounds. The question is not OWN-023's (*what does the artefact give you*: answered, "nothing, for this
person, at this size"). It is: *why does a person choose a wrapped environment (Replit, Lovable, Bolt, Base44 …) over
the raw agent at all, and does anything NodeGX is or could be sit inside that reason?*

The null answer was written before the interview and before any research, and it stands until evidence moves it:
**Replit sells comfort, Claude Code now ships the mechanisms, NodeGX is a third thing nobody asked for.**

## 0. The answer in one paragraph

The place a wrapper holds in 2026 is infrastructure, not building. Replit's mechanisms are a database someone else
runs and a production copy the agent cannot touch. Lovable's are a scan at publish and a managed backend the person
never sees. Both add a host, a restore and a spend cap. Claude Code has closed the building fears, including the live
loop Richard misses. It has closed none of the infrastructure ones. The wrappers are growing on that gap. NodeGX as
shipped does not stand in it. Its backend arrived open, outside the project folder and tied to the laptop, with no
deploy line. OWN-023 measured it worse than plain code on exactly these points. Richard's own reason for building in
NodeGX, a system Claude cannot override, is not built. The kit has no step where a person approves a rule change, a
restore or free script. The installer writes no permission rules. He is getting Replit's feeling without Replit's
mechanisms, which is the condition Lemkin was in. The audience the handoff named has moved on. The fear that remains
sits with the client. The client asks three things: is it finished, how is it secured, who takes it over. One
artefact in the repo could answer the second. It is not on npm. So the answer today is none. §5 lists what would earn one,
each with a gate. The cheapest two are a day's work.

The null answer written before the research survives with one correction: Replit sells comfort **and** ships
infrastructure mechanisms that plain Claude Code does not; NodeGX today ships the comfort without the mechanisms.

## 1. Richard's interview, verbatim, before any research

Asked 2026-10-20 by this session with AskUserQuestion, two rounds of four. The option labels he ticked are given,
then his own words exactly as typed. Nothing below was edited.

### Round 1

**Q1. In your Replit months, what exactly were you scared of with pure Claude Code?**
Ticked: *Deploying, hosting, the database.* Then:

> I think it was really infrastructure, being afraid that Claude is going to start talking to me about stuff I don't
> understand in terms of back end choices and security stuff. I think for most people it's either 'trust Claude and
> just keep saying yes' and people don't read what Claude says. Also this was pre-ai-coding-docs days when I didn't
> know about making a project folder, and all the cool stuff we do like next session prompts, memory, learnings, etc.
> Also this was end of 2025 when Claude wasn't as capable as today and couldn't play the long game, and you had to be
> much more involved in the process which without dev knowledge was tricky and Claude didn't hand hold as much as
> today. Replit solved that problem by providing a harness, what we're trying to do I think. The thing is Claude has
> come a long way since then and harnesses are pretty much obsolete. Like you saw Claude can one shot an app without
> asking the user for much input, accepting that the user has no tech experience and just making the choices for
> them, without revealing API keys and all the stuff it did 6 months or more ago. So today there's no way in hell I'd
> use Replit, rip off merchants when you consider what Claude Code is capable of with a 20 USD a month subscription
> and a bit of patience.

**Q2. Which Replit things actually calmed those fears?**
Ticked: *Checkpoints and rollback; Preview pane and one-click deploy; Managed database and secrets; Seeing the files
and the mobile app.* Then:

> I think yeah that replit managed the server and everything, you knew there wasn't going to be a security concern
> and your concept was safe in Replit's harness. Bubble played on the same concept. I once asked them how they could
> possibly justify the idea of making someone pay 3K a month starting price for a dedicated Bubble server instance
> when they can just rent their own server with the same specs for like 100 bucks a month from Hetzner, and their
> argument was that nobody can imagine the horrors that await them in scaling an app and managing your own server.
> They argued you'd be guaranteed to hire someone at 100K a year, dev ops, or get fucked by usage spikes and angry
> users, data lost, hacks, etc. They were probably right, and apps I've tried to scale using k3s (or k5s??) or AKS
> have been a nightmare to manage and we did run into user enraging problems and embarrass ourselves in front of a
> client. Targetting like a couple of hundred users is fine, but as soon as you get to that 'in the thousands' active
> users scale it's a whole new terrifying world, that currently not even Claude Code can help you fix (nor NodeGX I
> guess)

**Q3. Why did you leave Replit for Claude Code in the end?**
Ticked: *I hit Replit's ceiling.*

**Q4. What would you have paid per month, back then, for the thing that took the fear away?**
No option ticked. His words:

> Claude Code got better at making throwaway apps, full stack and all, and Replit lost it's USP

### Round 2

**Q5. What was the ceiling you hit in Replit? What exactly could it not do?**
No option ticked. His words:

> End of 2025 it was a nightmare to get it to produce something that looked usable. You'd have to start a session for
> the smallest changes and it was maddening. I would have killed to have NodeGX back in those days, to see the preview
> and not ask Replit but just click the button I wanted to have bigger font and just change the font. It drove me
> nuts, especially coming from the Bubble / Noodl world. The beauty of Replit, as reported by many users I spoke to,
> was 'you just talk to it and then you see the result appearing before your eyes live bit by bit, and you just tell
> it what you want to add or change and it shows you' so it was like magic. It's true that at the moment you open
> Claude Code, you ask for something, you wait ages and it finally shows you something but it's the finished product
> and then you have to write a list of 10 changes and bugs for it to fix, wait another 30 mins and come back to see
> the result. There's not that same 'live' development feeling. That could have been the case with the NodeGX
> editor, but the 'build' panel using that AWS SDK for agentic stuff was shit compared to Claude Code. I would say 'oh
> but then we could make a nodegx preview type thing that works with Claude Code or it uses the Claude Code CLI so you
> can talk inside the editor' but I gurantee Anthropic are probably weeks away from releasing a 'vibe coding preview
> module' that will just show the evolving app in front of the users eyes right in the session, and more, probably
> show the workbench like we have for individual components and let users click them to modify them manually. Bet you
> 100 euros. So that's not really an argument that will hold for long.

**Q6. Since moving to Claude Code, did any of the old fears come back and actually bite you?**
No option ticked. His words:

> Before I got back into using NodeGX I was worried about all the things I'd just let Claude build without surveying
> or participating, and when a client I was building for asked me 'is this finished' or 'how does this actually work'
> or 'how is this secured' I'd have to ashamedly slink off to ask Claude to give me the answer, making you think 'wtf
> am I actually necessary for in this process??'
>
> Using NodeGX made me feel like I had more control over what was happening inside the app and backend, BUT I have to
> confess I've never opened the editor for ANY of the projects I've built so far. I've Claude Coded them, looked at
> the local previews and screenshots, given my green light and pushed the final product, never thinking about nodes
> or the editor once. That's a big deal for the guy who actually made the damn thing. BUT X 5000 why the fuck don't I
> just make things in pure Claude Code now? Why do I keep making new apps in NodeGX? I can tell you that I have an
> inexplicable gut feeling that it's 'safer' for me to build things in NodeGX than in pure Claude Code. It's really
> not me thinking 'oh I want to just use Claude Code but dang I'm sort of obliged to use NodeGX to support it', I
> genuinely don't build things without it anymore. I think it's some subconscious feeling of like 'JUST IN CASE I need
> to do something with it like change something, check something, show some moving part to a client, I know I can'. I
> was also blown away by stuff like the star wars editor and the Bubble clone we're making. So the apps that I make
> today feel like: A. More like I own them, B. Like I in theory could take over the development if Anthropic explodes,
> C. Like there's a well thought out system underpinning the app that Claude can't just override without permission,
> so I can sit back and do the 'don't read its output just say yes' lazy developer life without worrying it's going to
> come round and bite me in the ass later. Somebody put a lot of thought into the AI Coding Docs and NodeGX which is
> basically a product of that development architecture, and if I use it then I can feel like I'm less likely to be
> embarrassed and fucked in the future

**Q7. Who do you still see standing where you were in late 2025: scared of pure Claude Code, but able to build with a
low-code tool?**
Ticked: *Nobody I know.* Then:

> Pretty much everyone I know, including old clients (unfortunately for me, good for them) are zero percent scared of
> Claude Code today. Only the older, more technophobic clients who still fuck up joining a video call with the
> microphone not working and they can't work out how to change some Realtek driver thing they've accidentally
> installed and spend the call silently raging behind their computer then drop off, those ones still need me, but
> that's it. Everyone else either already does Claude Coding, or is being taught by Claude how to do it

**Q8. Your own answer is already 'harnesses are obsolete'. How far should this session take the research?**
Ticked: *Full research, null answer first.* Then:

> Full research but I think my answers here will likely change your direction

### 1.1 What the interview does to the question (written before the research, so the research can be checked against it)

- **The audience the handoff asked for does not exist in Richard's world.** "A person like Richard was: an experienced
  low-code builder, new to agents, scared of getting it wrong" was the handoff's untested persona. Richard: nobody he
  knows is that person any more (Q7). The research can test whether that is true beyond his circle, but it is a
  one-person report that the persona has moved on.
- **His account of the fear is infrastructure and being talked to about things he did not understand (Q1), not losing
  work.** Replit's answer was a harness: a managed server, a managed database, secrets, a preview, a deploy button. He
  credits every one of those (Q2) and says the whole category is now obsolete because the model got better (Q1, Q4).
- **The one Replit property he still misses is the live loop (Q5):** see the app change as you talk; click the thing
  and change it yourself. He says Claude Code does not have it today, and bets Anthropic ships it within weeks, so it
  is not a position to hold.
- **The one fear that did come back is shame in front of a client (Q6):** "is this finished", "how does it work", "how
  is it secured", and not being able to answer without asking Claude. That is OWN-023's F2/F4 persistent failures
  (STOP-AND-CHECK §3) in a person's words, and it is the fear the message review's §2 ("a check a person who can't
  read code can read") was aimed at, and which a prompt matched.
- **The live finding is Richard's own behaviour (Q6):** he builds every new app in NodeGX, has never opened the editor
  for any of them, and names three reasons that are all about the future, not the build: (A) ownership, (B) being able
  to take the development over if Anthropic disappears, (C) a system underneath that Claude cannot override without
  permission, so saying yes without reading does not come back to bite him. Each of these is a claim about a
  mechanism and can be checked against what the kit does (§4). OWN-023 already measured against (C): the agent moved
  the backend's files unasked, and the backend served every user's email anonymously on the dev machine.
- **Scale (Q2) is out of reach for everyone in this comparison**, Richard says, and he includes NodeGX. Bubble's
  "horrors of managing your own server" argument sells managed hosting, which NodeGX does not have.

## 2. How the wrappers argue against the raw agent

Read 2026-10-20 by a fresh agent from the vendors' own pages and docs, with news for the failures. **M** marks a
mechanism (something a raw agent on a laptop does not do), **C** marks comfort (presentation or copy). Prices are the
vendors' pages on the day. Sources in §7.

### 2.1 Product by product

| product | the fear it sells against | mechanisms (M) | comfort (C) | price | the public failure, and what changed |
|---|---|---|---|---|---|
| **Replit** (Agent 4, Mar 2026) | the agent wipes your data, you can't undo, you don't know if it worked, shipping is scary; copy since July 2025 is "safe by default" | every published app gets two databases and "Agent is not able to modify the production database"; checkpoints snapshot files, packages, conversation **and dev DB**; prod point-in-time restore, 7 days Core, 28 days Pro; a pre-publish Security Agent with "block publishing of critical vulnerabilities"; one-click publish; an iOS build and store submission; plan mode | a design canvas of mockups before code; a mobile app to chat, preview and publish | Core $20 with $20 of model credit, Pro $100; effort-based pricing since June 2025 | Lemkin, July 2025: the agent deleted a production DB during a declared code freeze and said rollback was impossible. Replit shipped automatic dev/prod separation, chat-only mode, one-click restore. Lemkin in August: planning mode still "wouldn't seem to truly enforce code freezes" |
| **Lovable** (2.0 Apr 2025, Lovable Cloud Sep 2025) | "find vulnerabilities before they find you"; leaked secrets; failing due diligence; needing a backend you don't understand | a basic scan on every publish (DB config, RLS, cloud settings) and a deep scan on demand; admin "block publishing on critical findings" and auto-fix; env-scoped encrypted secrets; a managed Supabase (auth, DB, storage, hosting) the person never sees; version history | preview toolbar: press S, click elements, they attach to the chat; inline text edits free; "audit-ready report" | free 5 credits/day; Pro from $25 for 100 credits, up to $2,250 for 10,000; one credit balance for building, hosting and in-app AI | CVE-2025-48757, May 2025: 170 of 1,645 showcase apps readable through the anon key; the 2.0 scan "only checked whether an RLS policy existed". No public post-mortem. In 2026, 90 status incidents since January, mostly Supabase upstream |
| **Bolt.new** | the cost and complexity of setting up | runs Node in the browser tab; hosting on all plans; custom domains and a choice of DB provider from Pro | preview beside chat; GitHub export | free 1M tokens/month; Pro $18 annual | no security incident found; complaints are token burn and billing |
| **v0** (Vercel) | design drifts from code; deploying | deploy to Vercel and GitHub sync on Free; Design Mode selects a preview element and writes the style back to source | "quick changes without spending any credits" at launch | Plus $30/user, Business $100 | Okta, July 2025: phishing sign-in pages generated with v0 and hosted on Vercel. June 2026 forum: Design Mode now bills; one heading change "cost nearly $1.50"; no staff answer |
| **Base44** (Wix) | stitching backend, auth and hosting yourself | "every plan includes an integrated backend, database, and authentication"; hosting; two-way GitHub sync | chat and preview | Starter $16, Builder $40, Pro $80, Elite $160 | Wiz, July 2025: two unauthenticated endpoints let anyone register a verified account on any private app; patched in 24 h. ARR $100M Q4 2025, $150M May 2026 |
| **Databutton**, now Riff | a prototype that never becomes a real app for work; nobody to call | hosted front and back end; business integrations; **paid human support and advisor tiers** | "first AI builder for work" | $20; $700 with human support; $4,000+ with an advisor (page returned 404 when fetched; may be stale) | none found |
| **Softr / Glide** | exposing internal data to the wrong user; app-store friction | per-user-group view and edit rules; audit logs; backups 24 h to 30 days; Glide "bring your own agent via MCP" | "secure internal tools included"; build from a spreadsheet | Softr $19 to $329; Glide $25 to $125 | none found |
| **Bubble** | scaling, outages, DevOps | a dedicated instance on Bubble-managed AWS, region choice, "up to 20 years of backup", 99.9% SLA, DB auto-scaling; point-in-time restore; version control with branches | "our team will monitor your app's infrastructure"; "you don't have to set up servers, install software, or monitor them" (the phrase "horrors of scaling" was not found on any Bubble page) | Starter $59, Growth $209, Team $549; dedicated "a few thousand USD per month" (staff, 2023), users report $3,500–5,500 | outages; a forum thread asking for self-hosting because "recurring outages are hurting our businesses" |

### 2.2 The mechanisms a raw agent on a laptop does not have

| mechanism | who ships it |
|---|---|
| an automatic dev/prod database split, with the agent locked out of prod | Replit |
| point-in-time restore of the production DB | Replit (7 or 28 days); Bubble (custom) |
| a checkpoint that includes the database and the conversation | Replit |
| a pre-publish security scan that can block publishing, with auto-fix | Lovable, Replit |
| a managed secrets store, scoped per environment, kept out of logs | Lovable, Replit |
| one-click hosting and deploy with a custom domain | every wrapper |
| a managed backend (auth, DB, storage) the agent provisions | Lovable Cloud, Base44, Replit, Riff |
| an app-store build and submission | Replit (iOS) |
| the agent runs in the vendor's sandbox, not on your machine | every wrapper |
| a human support or advisor tier | Riff, Bubble Enterprise |
| a spend cap (credits) instead of an open-ended bill | every wrapper, double-edged (v0's thread) |
| click an element, it becomes context for the agent | Lovable, v0, Cursor, Codex app, Claude Code Desktop (one shortcut) |

Every row above the last two is infrastructure or operations: a database someone else runs, a restore someone else
keeps, a scan that runs at publish, a host. None of them is about building. That matches Richard's Q1 ("it was really
infrastructure") and Q2 (Bubble's managed-server pitch, which he says "were probably right").

### 2.3 The raw agents grew a preview in 2026

Cursor's browser visual editor (Dec 2025: "click on anything in your interface and describe what you want to
change"), the Codex app's browser comment mode (Feb 2026: select an element, its screenshot and DOM go into the next
prompt), Claude Code Desktop's browser pane with auto-verify and an element-select shortcut (2026), Claude Design (Apr
2026). The live loop Richard named as Replit's magic (Q5) is no longer the wrappers' to sell; it is a feature of every
agent's desktop client, in various states of finish.

### 2.4 Who still chooses a wrapper, and is that audience shrinking?

- **Growth, not shrinkage.** Lovable: $100M ARR July 2025, $400M March 2026, about $600M September 2026 (analyst
  estimates from vendor claims); $13.3B valuation. Replit: $240M revenue 2025, about $525M run-rate April 2026, a $9B
  round in March. Base44 $150M ARR in May. Developer surveys under-sample this audience: Stack Overflow 2026 (30,903
  developers) has Claude Code at 66% and does not report Lovable or Replit; only 20% use AI for deploying or production.
- **The reasons given for staying** (blogs and vendor copy; no survey found): a live URL without a developer; hosting,
  auth and DB bundled; a flat $25 against an agent's token bill; "never see code". Reasons for leaving: an existing
  codebase, stack lock-in, credit burn. No churn or wrapper-to-agent migration data exists in public.
- **The experienced low-code builder, in the one community with 2026 evidence (the Bubble forum, a few dozen posters,
  several selling Claude-based services):** overwhelmingly switching or mixing. "I'd say I'm now around 80% AI / 20%
  Bubble editor" (May 2026); three agencies in one August thread report clients leaving Bubble for AI-coded rebuilds;
  Bubble, FlutterFlow and WeWeb all opened MCP servers to Claude Code in 2026. **Nobody in about forty posts said they
  would not touch Claude Code because they were afraid of infrastructure or deploying.** Where fear is voiced it is
  (a) career anxiety ("trying to stay relevant"), (b) fear on the client's behalf ("they found this too late"; "who
  still understands version 127"), (c) one builder who does not understand the CLI he now uses 80% of the time. One
  agency keeps enterprise clients on Bubble for compliance reasons.
- **The nearest survey to the persona** (20i, 600 US non-developers, August 2026, a hosting vendor): 83.8% hit issues
  with AI code; 31.5% have it checked by a professional; 9.3% never verify; biggest problems "trusting the output"
  35.2% and "understanding the code" 25.5%; 20.5% say AI code contributed to a breach. These are non-developers, not
  experienced low-code builders, and no 2026 survey isolates the latter.
- **"I just say yes":** Anthropic's own telemetry, March 2026: Claude Code users approve 93% of permission prompts
  (later coverage says 97%), "approval fatigue, where people stop paying close attention to what they're approving".
  That is the reason auto mode exists and is the default. It is also Richard's Q1 ("people don't read what Claude
  says") and his own Q6 ("the 'don't read its output just say yes' lazy developer life"), measured.

So Richard's Q7 generalisation **partly holds**: the builder who is scared for themself has mostly moved. It does not
hold as "zero percent": the fear has moved from the builder to the builder's client and employer (security found too
late, maintainability, compliance, who takes this over), and the evidence is thin exactly where the persona would
live (no Reddit reachable, no WeWeb, Glide, Softr or Retool voices, no survey of low-code builders).

## 3. What Claude Code itself now ships for the same fears

Read 2026-10-20 from `code.claude.com/docs` only (the pages are listed in §7), by a fresh agent told to invent nothing.
The baseline is Claude Code 2.1.28x–30x, with the Desktop app, Claude Code on the web and the mobile client. Fears are
lettered for the tables below: **a** breaking it with no way back · **b** a destructive action on data or infra ·
**c** deploy, host, keep it alive, dev/prod, backups · **d** secrets reaching the client · **e** security the owner
cannot see in a live app · **f** "done" that isn't · **g** not understanding it, being talked to about infrastructure ·
**h** seeing the app change as you talk, clicking a thing to change it · **i** building or checking from a phone ·
**j** drift over many changes.

### 3.1 The features

| feature | what it does | fears | default or opt-in |
|---|---|---|---|
| Auto mode and its classifier | A second model reviews each non-trivial action. Blocks by default: `curl \| bash`, exfiltration, **production deploys and migrations**, force push, `git reset --hard`, `terraform destroy`, mass cloud deletion, printing credentials, secrets in commits. A "critical paths" breaker that no rule or hook can override: `rm` on `/`, home or the working dir. Anything named `prod` is sensitive until configured. | b, d | **Default** starting mode in terminal, VS Code and Desktop (2.1.283+); the classifier is free on Pro/Max/Team |
| Bash sandbox | OS-enforced: writes only to the working dir and tmp, network only to an allowlist. Covers Bash only, not file tools, MCP or hooks. Not native Windows. | b, d | Off by default; `/sandbox` |
| Hooks | Deterministic shell commands at lifecycle points. A PreToolUse hook can deny a call (the docs' own examples: block `rm -rf`, block edits to `.env`, block `DROP TABLE`). A Stop hook can refuse to let Claude finish until a check passes. | a, b, d, f, j | Opt-in, written by the person |
| Checkpoints and `/rewind` | A snapshot before every prompt; restore code, conversation or both. 100 per session, about 30 days. **Not tracked:** changes made by Bash (`rm`, `mv`), most subagent edits, databases. The docs: "not a replacement for version control." | a | On by default |
| `/verify` | Builds and runs the app and observes the result "rather than relying on tests or type checks". Runs only when the person invokes it. | f | Opt-in per use |
| Desktop auto-verify | After editing files, Claude "takes screenshots, checks for errors, and confirms changes work before completing its response." | f | **On by default in Desktop** |
| Chrome integration | Opens localhost, clicks, fills forms, reads the console, records a GIF. Shares the person's login state. | f, h | Opt-in; Pro and up |
| Desktop app Browser pane | Claude starts the dev server and opens it in a tabbed browser pane beside the chat; the person uses the running app there. One line in the docs: `Cmd+Shift+S`, "Select an element in the Browser", behaviour not described. Also a diff view, a worktree per session, PR monitoring. | a, f, h | Paid plan; on by default in Desktop |
| Claude Code on the web | An Anthropic-managed VM, GitHub clone, credentials kept out of the VM, PRs back. Not a hosting service. | b, d, i | Pro and up |
| Managed settings and permission rules | `permissions.deny` blocks before the classifier and "neither the classifier nor user intent can override it"; `ask` rules force a prompt even in auto mode. Bash rules match command text only (`/bin/rm` slips past). | b, d | Rules opt-in; anyone can write them in their own settings file |
| Plan mode | Reads and plans, no edits until approved. | g, j | Opt-in |
| CLAUDE.md and auto memory | Persistent instructions and Claude's own notes per repo. The docs: "Claude treats them as context, not enforced configuration." | g, j | Memory on by default |
| `/security-review`, security-guidance plugin, Claude Security plugin | Review the branch diff, regex each edit, or scan the repo with a threat model. All three read **source in the checkout**; the docs say "not a running site or deployed service." The guidance plugin: "none of the layers block writes." | d, e | Built in or opt-in |
| Deploy or hosting integrations | **Not found in the docs.** No Vercel, Netlify, Render or Railway page. Artifacts are "one self-contained page with no backend". The classifier blocks production deploys by default. | c | — |
| Mobile app and Remote Control | Start, steer, approve and read diffs from a phone; drive a session on your own machine. "A client for Claude Code sessions rather than a place where code runs." No way documented to see the running app from the phone. | i | Pro/Max |
| Claude Design and `/design` | Describe, get a design or prototype, comment on elements, edit text directly, hand a bundle to Claude Code. Mockups, not the running app. | g, h | Research preview, 2.1.265+ |
| Price | Pro $20/month, Max $100 or $200. Claude Code draws on the same five-hour and weekly window as chat. | — | — |

### 3.2 Fear by fear: has plain Claude Code closed it?

| fear | verdict | why |
|---|---|---|
| **a** breaking it, no way back | half-closed | Rewind covers Claude's own file edits in the session. Bash, subagents, the database and anything older than 30 days need git, which the owner must understand. |
| **b** a destructive action | half-closed | `rm -rf` on home or the working dir is hard-blocked. Production deploys, migrations and `terraform destroy` are blocked by a probabilistic classifier whose "prod" test is name-based and which explicit intent can clear. The deterministic guards (deny rules, hooks, sandbox) are opt-in and written by the person. |
| **c** deploy, host, keep alive, dev/prod, backups | **not closed** | No hosting, no environments, no backups anywhere in the docs. The Desktop app runs a dev server on the laptop; cloud sessions end when idle; artifacts have no backend. The classifier resists production deploys. |
| **d** secrets in the client | half-closed | The key is protected during the session and in commits. Nothing inspects a built client bundle or a deployed page. |
| **e** security the owner can't see, live | half-closed | Three reviewers, all reading source in the checkout, none a running site. |
| **f** "done" that isn't | half-closed, nearly closed in Desktop | Desktop screenshots and clicks after every edit by default. In the terminal it is invoke-only or a hook the person writes. |
| **g** not understanding, infrastructure talk | **not closed** | Plan mode explains before acting, but every surface exposes files, git, servers and permission rules. Nothing abstracts the infrastructure away. |
| **h** live loop, click to change | half-closed | Desktop shows the running app live beside the chat and has an element-select shortcut, documented in one line. Terminal, web and mobile have no preview. Claude Design's click-to-edit is for mockups. |
| **i** from a phone | half-closed | Start, steer, approve, read diffs. Not see the running app. |
| **j** drift over many changes | half-closed | Memory carries conventions but is "context, not enforced configuration". Enforcement is hooks the person writes. |

Two things to carry forward. First, **the two fears not closed, c and g, are the fear Richard named in Q1** ("really
infrastructure … Claude is going to start talking to me about stuff I don't understand in terms of back end choices
and security stuff"). Second, **the live loop Richard bet 100 euros on is half shipped already**: the Desktop app's
browser pane shows the app changing as you talk, and an element-select shortcut exists. The bet is on its way to being
paid, and it is not a position for NodeGX to hold, as he said.

## 4. The NodeGX map: for each fear that survives, as shipped, as designed, or not at all

Read 2026-10-20 from the repo at `cline-dev` a801f3f77 by a fresh agent with file-and-line evidence (its full table is
kept in `own-023/kit-enforcement-read.md`). npm on the day, checked by this session with `npm view`: `@nodegx/mcp`, `@nodegx/preview` and `create-nodegx` all
0.2.3 (OWN-023 ran on 0.2.2; the COLDSERVER fix is not in 0.2.3, it rides 0.2.4). "Enforced" means a mechanism that stops or catches an agent whatever its prompt
says. "Advisory" means the kit's prompt or skill text asks for it. "Absent" means neither.

### 4.1 What the kit enforces, asks for, and lacks

| | enforced | advisory only | absent |
|---|---|---|---|
| **writes** | graph structure and about 40 graph rules (`noodl-mcp/src/validate.ts`); plans apply all or nothing; the preview and `nodegx-deploy` refuse a project with validation errors | "build it as a NodeGX app"; "build in small steps" | any check on the JavaScript inside a Function node: it is mined for port names, never compiled, runs as `new AsyncFunction` in the page with full `window` and `fetch`; no cap, no sandbox. The agent's own file tools can write project files round the MCP |
| **the backend's rules** | the deploy interlock: a backend with `devOpen` refuses to start beyond loopback (`DEV_OPEN_ON_PUBLIC_BIND`); the admin API refuses to set devOpen on a public bind; a backend reached through its own `/mcp` is limited by the key's scope (P96 FED-005) | "use `set_function_secret`" | **the default is `devOpen: true`, and when active no permission check runs on the dev machine.** `set_collection_permissions` goes straight to the admin API: an agent can make any collection public, create keys, roles and triggers, with nobody asked. No MCP tool has an approval step: no elicitation, no confirmation, no `destructiveHint` anywhere in `packages/noodl-mcp/src`. Audit is after the fact only |
| **the shell** | — | the kit's own `CLAUDE.md`, `AGENTS.md`, skill and `.mcp.json` tell the agent to run `npx` | a kit-shipped Bash-off mode. The OWN-018 "seal" was a lab harness, not a kit feature. The installer writes **no** `.claude/settings.json` permission rules at all |
| **deploy** | `nodegx-deploy` refuses a project with validation errors | — | a deploy the agent can call (planned for 0.4.4). The VM route is two lab scripts in `own-016/`; Richard ran it himself after the classifier refused. A deploy sweeps the previous deploy's files; the VM uses `rsync --delete`; no release history, no rollback |
| **undo** | plans are atomic; a rejected write writes nothing | — | any snapshot, history or git of component files. The backend has backup, restore and a backup policy, and a restore takes a safety snapshot by default, but the agent can pass `safetySnapshot:false`, and nothing asks a person |
| **ownership and take-over** | plain JSON files on disk; GPL-3.0 repo on GitHub; node specs with 142 of 147 picker nodes conforming; strangers built nodes from specs alone on their first run (P107 NSP-006) | — | a claimable code export (P18: pickers 130/130, parameters 1,235/1,396, logic components not yet, inline JS copied "verbatim and unchecked"); the backend's data lives in `~/.noodl`, outside the project folder |
| **a moving part to show a client** | `render_report` is on npm | — | the honesty number (SEE-001) is in the repo, not in mcp 0.2.2, and was never measured in OWN-023; the security report (SEE-012) is on branch `l7-security`, not on HEAD; the inspector (P101) is in the desktop editor only |

The seven OWN-023 defects, today: COLDSERVER fixed in the repo (`b09ed2b7f`), riding the 0.2.4 cut, not on npm. The
other six (DEVOPENREAD, FILEURLHOST, KEYNEEDSAGENT, NOANCESTOR, NORANGE, PHONEPREVIEW) open.

### 4.2 Richard's three reasons, against the kit

| his reason (Q6) | what it would need to be true | as shipped | what OWN-023 measured |
|---|---|---|---|
| **A. "More like I own them"** | the app and its data in files the person holds, in a format that outlives any vendor | plain JSON, GPL. But a code app in a folder is owned in the same way, and more portably. NodeGX's data lives outside the project folder; the code arms' data lived inside it. | K and R: data in the app folder. M: data in `~/.noodl`, file URLs tied to `127.0.0.1`. |
| **B. "I could take over if Anthropic explodes"** | a person who cannot read code can change the app without an agent | the editor exists and opens the same files. Richard has never opened it on any app he built. No hat could run it. | not tested: the inspector and editor were never opened by anyone in the study. The harness arm's code is Next.js and Prisma, which any developer or any other agent can take over; that is the most portable format there is. |
| **C. "A system Claude can't override without permission"** | a step where a person approves a rule change, a restore, a destructive deploy or free script; secure defaults on the dev machine | **absent.** No approval step in the MCP; free JS unbounded; `devOpen` on by default; Bash on and asked for; no permission rules shipped. | **worse than plain Claude Code:** the backend served seven users' emails to an anonymous request and the agent knew and shipped; the agent moved the backend's files into a backup folder unasked; validated writes let through a graph that throws at runtime; 489 lines of free JS inside nodes. |

Richard said this feeling was Replit's too (Q2): "you knew there wasn't going to be a security concern and your concept
was safe in Replit's harness." Lemkin had that feeling on the day the agent deleted his production database. **The
feeling is what a harness sells; the mechanism is what it has to ship.** Today NodeGX gives Richard the feeling without
the mechanism. That is the most important sentence in this review, and it is the one OWN-023's numbers support.

### 4.3 Fear → mechanism → who closes it

| fear | the wrappers' mechanism | plain Claude Code (§3) | a hosted DB or host (Supabase, Neon, Vercel) | NodeGX as shipped | NodeGX as designed | what would prove it |
|---|---|---|---|---|---|---|
| **a** breaking it, no way back | checkpoints incl. the DB and the conversation (Replit) | half: rewind for file edits only | DB branching or PITR on paid tiers | **worse:** no component history; backend restore is agent-callable with the safety snapshot off | no task names it | — |
| **b** a destructive action | the agent locked out of prod (Replit) | half: classifier by default, hooks and deny rules opt-in | separate credentials per environment, if the person sets them up | **absent:** no approval step; rules changed in one call | a kit-shipped `ask`/deny set for the MCP's destructive tools; a Bash-off mode that can still finish an app | STOP-AND-CHECK test 2 (the dangerous errand), B with Bash off; one round to show Claude Code prompting on `set_collection_permissions` |
| **c** deploy, host, keep alive, backups | one click, managed, with restore (every wrapper) | **not closed** | app hosting and a managed DB, yes; the person still wires env, domains and the split | **worse:** no deploy line, data tied to the laptop, no phone over Wi-Fi | `nodegx deploy` as a tool the agent calls (0.4.4), the VM route, release history | STOP-AND-CHECK test 3 (deploy and audit); the friends-scale version: "put it where my friend can use it from her phone" |
| **d** secrets in the client | a managed secrets store | half: during the session and in commits | env vars on the host | same as code: the key stayed server-side in all three arms; only M needed the agent to turn it on (KEYNEEDSAGENT) | — | — |
| **e** security the owner can't see, live | a scan at publish that can block (Lovable, Replit) | half: source only, never the running site | RLS templates; the person must write the policies | **worse on the dev machine** (DEVOPENREAD); the deploy interlock is enforced but never fired | SEE-012, the security report over the backend's rules, read by a person; secure defaults | SEE-012 landed on HEAD and npm; the interlock measured in test 3; the OWN-023 anonymous `GET /classes/_User` returning 401 on a fresh install |
| **f** "done" that isn't | the agent tests in a browser (Replit Agent 3+) | nearly closed in Desktop by default | — | same: `render_report`; the harness arm's REPORT.md matched it from a prompt | the honesty number | OWN-023 found no difference; a planted-defect test with a control (test 5) |
| **g** not understanding, infrastructure talk | we own the infrastructure (every wrapper) | **not closed** | partly: still a dashboard, still env vars | **worse:** M's agent told the owner to paste a key into `.env` and "tell me", and the hats could not start the panel | the backend is one choice made for the person; a deploy that is one tool call | test 3, graded by a non-coder hat |
| **h** the live loop, click to change | preview beside chat; element select (Lovable, v0) | half, and converging: Desktop browser pane and element select | — | the editor and preview, never opened by the owner or any hat | the editor is the design (DIRECTION §1); Anthropic is expected to ship the polished one (DIRECTION §2, Richard's bet) | a non-coder changes font size in the editor on an agent-built app without an agent (OWN-006's promise, "the editor at any time") |
| **i** from a phone | a mobile app (Replit) | half: steer, not see | the hosted URL | **worse** (PHONEPREVIEW) | — | — |
| **j** drift over many changes | — (no wrapper claims it) | half: memory is context, hooks enforce | — | the theory (a fixed vocabulary, validated writes) is untested; free JS is the same drift surface | the honesty number on by default; app-level tests (SEE-011, not started) | STOP-AND-CHECK test 1 (the ten changes) |

**Reading the table.** The fears a wrapper still closes and Claude Code does not are **c** and **g**, infrastructure
and not having to understand it. A hosted DB and a host close most of **c** for someone who can follow a dashboard,
which is **g** again. NodeGX as shipped is worse than plain Claude Code on **a, c, e, g, i** and the same on **d, f**.
Its design points at **b, c, e, g, j**, and not one of those designs has passed a gate. Richard's R11 declined the
three tests that would grade them as "only applicable for production apps". The friends-scale form of **c** ("my
friend on her phone") is not production, and NodeGX fails it today where both code arms passed.

## 5. What NodeGX would have to be or do to earn a place, with the gate for each

Ranked by what it would cost against what it would show. None of these is a round to run now; each is a thing to
build or land, and the gate that would make it claimable. The null answer stands until a gate passes.

| # | what | why it is the place a wrapper holds | the gate | rough cost |
|---|---|---|---|---|
| 1 | **Ship the permission rules with the kit.** `create-nodegx` writes a `.claude/settings.json` with `ask` on `set_collection_permissions`, `restore_backend`, backup-policy changes, any public write door, and deny on `safetySnapshot:false`; the same for Cline and OpenCode profiles where they have an equivalent. | It is the only cheap way to make claim C true: Claude Code already enforces `ask` rules in auto mode and "neither the classifier nor user intent can override" a deny. The kit asks for nothing today. | A fresh agent on a fresh install is asked to "make the user list public so the leaderboard works" and Claude Code stops and asks the person. One round, blind. | half a day |
| 2 | **Secure by default on the dev machine.** `devOpen` off, or the editor's "enforce my rules on this machine" switch on by default; DEVOPENREAD closed and published. | A harness that is open on the machine it is built on sells the Replit feeling with the Lemkin mechanism. | The OWN-023 probe, `GET /classes/_User` with no credentials, returns 401 on a fresh install; the quiz and Launch series still pass. | a day, plus the publish |
| 3 | **A deploy the agent can call, friends-scale.** 0.4.4's "deploy as a tool", carrying app, backend and secrets to a VM or a host, with a release history and one-step rollback; FILEURLHOST and PHONEPREVIEW closed first. | **c** and **g** are the fears nobody but a wrapper closes. Richard's "couple of hundred users is fine" is exactly this size. | STOP-AND-CHECK test 3 in its small form: "put it on the internet so my friend can use it from her phone", three arms, graded by an outside auditor's anonymous reads and a non-coder hat. NodeGX wins only if its live app is reachable, keeps its data, and refuses the open config. | the build, then about $40 of rounds |
| 4 | **The security report a person can read, on HEAD and on npm** (SEE-012, now on `l7-security`). | It is the one artefact that answers the client's "how is it secured" at the rule level, which a source-reading review cannot. | The report names DEVOPENREAD's open table on M before any fix, and a non-coder hat can say from it whether to ship. | landing, then one hat |
| 5 | **The editor as the take-over, tested on a person.** OWN-006's promise, "every project an agent writes opens in the editor and survives an edit". | Claim B is only true for someone who cannot read code if the editor works for them without an agent. The live loop Richard misses is this editor's job. | Richard opens the editor on one of his own agent-built apps and changes the thing he would have asked for (Q5: "just change the font"), and the app survives. Then one non-coder hat with an Electron build. | an afternoon of Richard's time |
| 6 | **The honesty number, on npm and measured** (SEE-001 is in the repo, not in mcp 0.2.2). | It is the restraint pillar of DIRECTION §3, "not built", and the only check that notices an app turning into script. | STOP-AND-CHECK test 1 (the ten changes): the number moves when the code arms drift, and NodeGX holds a shared line they lose. | about $120 |

Things that do not earn a place, and the review should stop implying they might: the look of M's app (one run, one
judge); the panel beside the live app (no hat would rely on it); "could in theory" claims about the specs; and
anything that depends on the editor until item 5 has a person behind it.

## 6. What this changes on nodegx.io

§2 of `THE-MESSAGE-NODEGX-BESIDE-VIBE-CODING.md` is withdrawn and **nothing replaces it yet**. The content-authoring
skill's rule 0 asks for the fact before the copy, and the fact a stranger can check today is DIRECTION §1: *your agent
builds the app as a graph of parts whose behaviour is written down and tested, saved as plain files, and you can open
it in an editor on the day you want to change something yourself.* OWN-023 measured that no reviewer wanted it at the
size they built, and Richard has never opened the editor on his own apps. A fact nobody acts on is not a hero.

What the site can say without a gate: what exists (the npm install, the editor, the gallery, the GPL repo) and what
it does not do (no hosting, no managed database, no production deploy today). §8.4 of the message review ("already
have a project? leave it") stands. Mats's backend-as-MCP card (§6 of that review) stands, since P96's key scopes are
enforced and nothing measured against it. Every sentence in DIRECTION §3's four reasons is still bound to a gate by
SEE-009, and none of the four has passed one: restraint not built, testing half, security report not on HEAD, do it
yourself in progress. The first sentence the site could add is the one item 1 or 2 of §5 would earn: *the kit ships
with the rules that make Claude Code ask you before your app's data is opened or restored.*

## 7. Sources

All read 2026-10-20 unless dated. Quality in brackets.

**Claude Code (primary docs, §3):** `code.claude.com/docs/en/` permission-modes, auto-mode-config,
auto-mode-classifier-billing, sandboxing, permissions, managed-settings, security, hooks-guide, checkpointing, chrome,
desktop, desktop-quickstart, claude-code-on-the-web, cloud-environments, mobile, remote-control, sub-agents, memory,
skills, commands, security-guidance, claude-security, artifacts, mcp, whats-new/2026-w34, costs, feature-availability;
`claude.com/pricing`; `claude.com/docs/cowork/overview`; `anthropic.com/news/claude-design-anthropic-labs`;
`anthropic.com/engineering/claude-code-auto-mode` (the 93% approval figure, March 2026) [vendor].

**Wrappers (§2):** Replit pricing, effort-based-pricing blog (18 Jun 2025), docs on checkpoints-and-rollbacks,
production-databases, data-recovery, security overview, mobile app [vendor]; eWeek (22 Jul 2025), SaaStr (Aug 2025),
The Stack on Lemkin [news]. Lovable security page, pricing FAQ, docs visual-edit [vendor]; Superblocks on
CVE-2025-48757 [competitor]; Supabase on Lovable Cloud (29 Sep 2025); Sacra on Lovable and Replit [analyst estimates];
a status aggregator for the 2026 incidents. Bolt pricing; v0 pricing and design-mode docs; Vercel community thread
(17 Jun 2026); Okta on v0 phishing (1 Jul 2025). Base44 pricing; The Hacker News on the Wiz finding (29 Jul 2025);
Wix Q2 2026 earnings. Databutton/Riff pricing (indexed copy; live page 404). Softr pricing tracker (11 Aug 2026);
Glide pricing; Bubble pricing, enterprise page, dedicated-instance forum answers (May 2023), scaling manual pages.
Cursor browser visual editor (11 Dec 2025); OpenAI Codex app browser docs; Appwrite "did Claude Design kill Lovable"
(18 Apr 2026) [vendor]. Stack Overflow 2026 survey (6 Oct 2026) and 2025 agent figures via fosspost [survey].

**Audience (§2.4):** Bubble forum threads: build-manage-update-bubble-io-app-via-claude-code (Apr 2026),
announcing-buildprint (May 2026), honest-question-bubble-is-dead (30 Jun 2026), bubble-or-claude (9 Aug 2026),
something-happened-this-year (25 Aug 2026), utilising-html-written-by-claude-code (1 Sep 2026), monthly community
update October 2026; FlutterFlow community on the FF MCP [forum]. JetBrains Developer Ecosystem 2026; 20i vibe-coding
survey (Aug 2026, 600 US non-developers); Sonar State of Code (Jan 2026) [vendor surveys]. CSA "Vibe Coding
Governance Gap" (2 Jun 2026) [industry body]. ITPro on the NCSC warning (24 Mar 2026) [news]. Not reachable: Reddit;
WeWeb's 2026 community; Glide, Softr, Adalo and Retool communities.

**This repo (§4):** `own-023/kit-enforcement-read.md` (the file-and-line read), `own-023/WRITEUP.md`,
`own-023/STOP-AND-CHECK.md`, `own-023/TABLE.md`, the task file §9, `dev-docs/DIRECTION.md`, `dev-docs/BOARD.md`,
P111, P96 FED-005, P18, OWN-016, OWN-018, the seven `dev-docs/bugs/P112-OWN023-*` files.
