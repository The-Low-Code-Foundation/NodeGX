# The place of NodeGX beside Replit: why a person chooses a wrapped environment over the raw agent, and whether NodeGX sits inside that reason

**Written 2026-10-20 by the session handed `own-023/NEXT-SESSION-PROMPT.md` (Fable 5.1).** A research and positioning
session, no rounds. The question is not OWN-023's (*what does the artefact give you*: answered, "nothing, for this
person, at this size"). It is: *why does a person choose a wrapped environment (Replit, Lovable, Bolt, Base44 …) over
the raw agent at all, and does anything NodeGX is or could be sit inside that reason?*

The null answer was written before the interview and before any research, and it stands until evidence moves it:
**Replit sells comfort, Claude Code now ships the mechanisms, NodeGX is a third thing nobody asked for.**

## 0. The answer in one paragraph

There is a place, and NodeGX does not fill it yet. The place a wrapper holds in 2026 has two parts. The first is
infrastructure. Replit's mechanisms are a database someone else runs and a production copy the agent cannot touch.
Lovable's are a scan at publish and a managed backend the person never sees. Both add a host, a restore and a spend
cap. Claude Code has closed the building fears, including the live loop Richard misses. It has closed none of the
infrastructure ones. NodeGX as shipped does not stand in that part. Its backend arrived open, outside the project
folder and tied to the laptop, with no deploy line. OWN-023 measured it worse than plain code on exactly these points.
The second part is the one Richard described in Q6, and the research found it in strangers (§1.2). A person who builds
with the agent still wants a thing they can hold. An editor they may never open. A report to show the client who asks
how it is secured. A structure underneath that lets them say yes without reading. The wrappers sell that by replacing
Claude Code. Richard wants it inside Claude Code, and so do the Bubble builders at "80% AI, 20% editor". Nobody in
this comparison stands there. NodeGX is built to, and today it offers the feeling ahead of the mechanism. The kit has
no step where a person approves a rule change, a restore or free script. The installer writes no permission rules.
Closing that gap is the work. It is also what makes the feeling safe to sell. §5 lists the gates. The cheapest two are
a day's work.

The null answer written before the research survives in its first two clauses and fails in its third. Replit sells
comfort and ships infrastructure mechanisms. Claude Code has shipped the building mechanisms. But NodeGX is not a
third thing nobody asked for. Its owner asks for it every time he starts an app, and §2.4's builders ask for the same
thing in other words. What is true is that NodeGX has not yet built the thing they ask for.

*Later the same evening, after §9's four rounds, the place got its name: the workbench of the person who vouches, and
the missing half of it is the backend (§9.4, §10).*

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

**Correction by Richard, same evening, after reading the plan built on Q6's "I've never opened the editor":**

> I've opened the editor to do testing on every new build, and I've made changes and I still like the editor, even
> more than I liked the Noodl editor. But I wouldn't use it yet to manage an app, I'd still ask Claude Code to make
> the changes to the NodeGX project and not use the editor

This supersedes Q6 on that point wherever the review repeats it: he opens the editor on every build, to test and to
look, and has edited in it; he does not manage an app through it. The editor is a window he uses, not an escape hatch
he keeps shut.

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
- **The live finding is Richard's own behaviour (Q6, corrected above):** he builds every new app in NodeGX, opens the
  editor on each to test and look but manages them through Claude Code, and names three reasons that are all about the future, not the build: (A) ownership, (B) being able
  to take the development over if Anthropic disappears, (C) a system underneath that Claude cannot override without
  permission, so saying yes without reading does not come back to bite him. Each is a want (§1.2) with a mechanism
  behind it that can be checked against what the kit does (§4). OWN-023 already measured against (C): the agent moved
  the backend's files unasked, and the backend served every user's email anonymously on the dev machine.
- **Scale (Q2) is out of reach for everyone in this comparison**, Richard says, and he includes NodeGX. Bubble's
  "horrors of managing your own server" argument sells managed hosting, which NodeGX does not have.

### 1.2 His words, read as demand (added after Richard's objection that the first draft read them as claims to grade)

The first draft of this review took Q6 apart as three mechanism claims, graded two of them "absent" or "no better
than code" (§4.2), and filed the answer under "feeling without mechanism". Richard: *"It seems like you ignored a lot
of my heart pouring and sharing about my feelings using NodeGX today. I might be an exception that proves the rule,
but what if I'm not?"* He is right that the reading was one-sided. What Q6 describes is what a person who builds with
the agent still wants, and §2.4's research found the same wants in strangers without this review connecting them.
Row by row:

| his words (Q6) | what it asks for | strangers saying the same (§2.4) | what answers it in the kit today |
|---|---|---|---|
| *"JUST IN CASE I need to do something with it like change something, check something, show some moving part to a client, I know I can"* | an escape hatch, kept and not used; insurance | "the only real advantage Bubble has for me is that it still has a visual editor" (Apr 2026); "I'm now around 80% AI / 20% Bubble editor" (May 2026); a freelancer keeping Bubble because "the client is non-technical and wants to own the editor" | the editor and preview exist and open the agent's files. Richard's correction: he opens the editor on every build to test, and has edited in it. That is the P111 use ("the canvas becomes the reason you can trust what was built"), by its owner, on his own apps. No hat in OWN-023 could open it |
| *"'is this finished' or 'how does this actually work' or 'how is this secured' … 'wtf am I actually necessary for in this process??'"* | standing behind the app as its maker | agencies: clients ask who takes this over; security "found too late"; 20i: a third of non-developers name trust or understanding the code as their biggest problem | `render_report` on npm; the security report on a branch; the honesty number in the repo only |
| *"A. More like I own them"* | the app in a form that is mine, not a vendor's | the August agency thread: a client's IT rebuilt off Bubble behind the agency; handover guides: "client owns repo, hosting and DB accounts" | plain files, GPL; the data outside the folder today |
| *"B. Like I in theory could take over the development if Anthropic explodes"* | a tool a person who cannot read code can drive without an agent | "who still understands version 127"; enterprise staying on Bubble for compliance | the editor; the specs strangers built nodes from; a partial export |
| *"C. … a well thought out system underpinning the app that Claude can't just override without permission, so I can sit back and do the 'don't read its output just say yes' lazy developer life"* | enforcement that survives saying yes without reading | Anthropic: 93% of permission prompts approved, "approval fatigue"; Lemkin | absent (§4.1); the deploy interlock only |
| *"blown away by stuff like the star wars editor and the Bubble clone we're making"* | the format becoming my own tool | — | the do-it-yourself kit, in progress (P112) |
| *"Somebody put a lot of thought into the AI Coding Docs and NodeGX which is basically a product of that development architecture"* | the discipline that built the product, inside my app | — | specs and a validated graph, yes; the JavaScript inside nodes, no |

Two things follow, and they pull in different directions. The wants are real and not his alone: the wrappers earn
hundreds of millions a year on them, and the builders in §2.4 keep a second tool open to serve them. And a want met
with a feeling before its mechanism is what Lemkin bought. So Q6 is the demand this review was looking for, the
product owner is its first customer, and the order of work is the mechanism first and the sentence on the site
second. §1.3 says how to find out whether he is the exception.

### 1.3 Is he the exception? A test that costs an hour

Not a round. Richard asks five people who already build with Claude Code and have shipped something to someone
(old clients, Mats, Digital Bricks colleagues) three questions, in his words, and writes the answers down verbatim:

1. The last time a client or colleague asked you how the app works or how it is secured, what did you do?
2. Have you ever needed to change something in an app without the agent? What happened?
3. For your next app, would you start in a folder that comes with an editor and a security report you might never
   open, instead of an empty folder? What would make you say no?

The gate: three of the five describe the shame scene or the escape hatch unprompted in answers 1 or 2. If they do,
§1.2 is a population and §5's items are products. If they do not, it is Richard's, and the kit is for him first,
which is also a result.

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
| **B. "I could take over if Anthropic explodes"** | a person who cannot read code can change the app without an agent | the editor exists and opens the same files. Richard opens it on every build to test and has edited in it (his correction, §1); he does not manage an app through it yet. No hat could run it. | not tested: the inspector and editor were never opened by anyone in the study. The harness arm's code is Next.js and Prisma, which any developer or any other agent can take over; that is the most portable format there is. |
| **C. "A system Claude can't override without permission"** | a step where a person approves a rule change, a restore, a destructive deploy or free script; secure defaults on the dev machine | **absent.** No approval step in the MCP; free JS unbounded; `devOpen` on by default; Bash on and asked for; no permission rules shipped. | **worse than plain Claude Code:** the backend served seven users' emails to an anonymous request and the agent knew and shipped; the agent moved the backend's files into a backup folder unasked; validated writes let through a graph that throws at runtime; 489 lines of free JS inside nodes. |

Richard said this feeling was Replit's too (Q2): "you knew there wasn't going to be a security concern and your concept
was safe in Replit's harness." Lemkin had that feeling on the day the agent deleted his production database. The
feeling is the demand (§1.2), and the mechanism is what a harness has to ship before it sells the feeling. Today
NodeGX gives Richard the feeling ahead of the mechanism. That is the order to fix, and §5's first two items fix it.

On the editor, the first draft was wrong on the fact. Richard opens it on every build, to test and to see what the
agent built, and has edited in it; he manages the app through Claude Code. So the editor is not insurance he never
claims. It is the window he looks through before he ships, which is P111's thesis in use, and the one surface of the
product that no OWN-023 hat could open. The study measured NodeGX minus the part its owner uses.

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
| 0 | **Find out whether Richard is the exception** (§1.3): five people who already build with Claude Code, three questions, answers verbatim. | Every item below is a product only if §1.2's wants belong to more than one person. OWN-023's hats never had to live with an app; these people do. | three of five describe the shame scene or the escape hatch unprompted | an hour of Richard's time |
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
it in an editor on the day you want to change something yourself.* That sentence is §1.2's first row, the escape
hatch, and it is the one want the kit answers today. OWN-023 measured that no reviewer chose it at the size they
built, with no reviewer able to open it; Richard opens it on every build. It can go on the site the day someone other
than Richard is measured doing the same (§8). The wants in §1.2's other rows wait on items 1, 2 and 4.

What the site can say without a gate: what exists (the npm install, the editor, the gallery, the GPL repo) and what
it does not do (no hosting, no managed database, no production deploy today). §8.4 of the message review ("already
have a project? leave it") stands. Mats's backend-as-MCP card (§6 of that review) stands, since P96's key scopes are
enforced and nothing measured against it. Every sentence in DIRECTION §3's four reasons is still bound to a gate by
SEE-009, and none of the four has passed one: restraint not built, testing half, security report not on HEAD, do it
yourself in progress. The first sentence the site could add is the one item 1 or 2 of §5 would earn: *the kit ships
with the rules that make Claude Code ask you before your app's data is opened or restored.*

## 8. The existential question, restated (proposed, not agreed; written after Richard rejected the three-step plan)

Richard on the three-step plan: *"I don't feel like this is the right plan or that it'll really answer the existential
questions we're posing about NodeGX and where it fits."* He is right that §5's items are features with gates, and a
feature passing a gate does not say where the product fits.

**The question, in one sentence:** once the agent writes a codebase and a node graph equally well, what does the graph,
with an editor that shows it, give a person that the codebase does not?

**What is known.** At build time, nothing (OWN-023). After the build, for the one owner anyone has watched: he opens
the editor on every build to test and to see what the agent built, edits in it, and ships from it, while managing the
app through Claude Code. No OWN-023 hat could open the editor, so the study measured the product minus the part its
owner uses, and the hats chose on READMEs. The wrappers' edge is infrastructure (§2.2). The raw agents' new browser
panes show the running app (§2.3); they do not show how it works, because a codebase has no picture of itself that is
also the app. A graph does. That is the one architectural property in this review that a vendor's window on code
cannot copy, and it is P111's thesis: *"the canvas stops being where you build and becomes the reason you can trust
what was built."*

**The fit that follows, as a sentence to test, not a claim:** *NodeGX is for the person who ships what Claude Code
builds to other people and has to answer for it. Claude Code builds the app. NodeGX is how that person sees what was
built and how it works, tests it, and shows it, without reading code.* Richard is that person. §2.4's agencies, whose
clients ask "how does this work" and "who takes it over", may be.

**The only test that answers it** is people, not Claude hats, holding the real editor, on their own app, with their own
name on it. The 0.4.3 editor release is being cut today, which makes it possible for the first time since the kit
shipped, and P113 (the third play test) is the lane that already exists for it.

| | |
|---|---|
| who | three to five people from Richard's network who already build with Claude Code and ship to someone else |
| what they get | the 0.4.3 editor and the kit on their own machine, after §5 items 1 and 2 are done (the kit must not hand them an open user table) |
| what they build | their own next small app, not a brief of ours, with Claude Code inside NodeGX, over two weeks |
| what is recorded | a three-line log per session: did you open the editor, what for (test, look, change), what you would answer if your client asked "how does it work"; and at the end, one question: do you start your next app in it, and why |
| control | each person's own Claude Code habit; they say what they did differently from their last app |
| gate | three of five open the editor on their own app unprompted, for testing or looking; two of five start the next app in it |
| if it fails | NodeGX is Richard's tool, and the site says what it is without a claim about anyone else; the kit stays public |
| cost | their time; the six open defects, which will bite them and are filed as costs; §5 items 1–2 first |

What §5 becomes under this reading: items 1 and 2 are the hygiene that makes the editor safe to hand to a person;
item 0 (the five interviews) is the recruiting conversation for the play test, not a gate of its own; items 3, 4 and
6 wait until the play test says whether anyone but Richard looks through the window.

## 9. Digging into the feelings (Richard's choice of piste, same evening: *"I think they're the best piste à suivre we have right now"*)

Richard, rejecting the play test as the next step:

> I'd rather try to dig into what it is that makes me want to use NodeGX instead of just Claude Coding. I'm even
> really excited about the NodeGX Studio concept and getting back to Bubble style editing, I loved it before. It made
> me feel like I was really useful and in control of what I was building for myself and clients, like I could answer
> any question that came up, there was nothing where I'd have to say 'oh no I'm not a coder I can't answer that' and
> have to delegate to someone else. Feeling useful and valueable.

### 9.1 Round 3, verbatim

**Q9. In your Bubble days, which questions did clients actually ask you, the ones you could always answer?**
Ticked all four: *where is the data and who can see it; why does it do X when I click Y; can you change or add this,
and how long; is it secure, what if we grow.* Added:

> What happens if I want to sell this or get an investor

**Q10. With an app Claude Code built for you in plain code, which of those can you NOT answer today without asking
Claude?** Ticked: *where is the data and who can see it; why does it do X when I click Y.* Then:

> The 'can you change or add' something question is now 'probably in a couple of hours' so that's dead, and actually
> hard to know what to bill a client because often it's 4 hours work where I'm active for like 30 mins of it. Also the
> question of 'why did you chose this particular technology' or 'what happens if we want to move to a different
> technology, launch a mobile app, etc.' aren't easy to answer with just claude code. Though rebuilding something from
> scratch is most people's answer because it's so quick and easy today

**Q11. When you open the NodeGX editor on a fresh build, what do you actually look at or do in there?**
Ticked all four: *the preview, to click through; the data and backend; fix a visual thing myself; the component tree,
to see what it built.* Then:

> I do like looking through the structure, but it's pure curiosity rather than checking anything, the database schema
> I could be interested in checking in case I disagree with any of it or I see something the client didn't ask for.
> Privacy rules, worth testing loggin into the app and seeing if you can hack any user details, but it's something i
> normally ask Claude to simulate for me in a headless browser. With headless browsing, a lot of the 'opening the
> editor to check' actions have been offloaded to headless chrome and Claude screenshots as proof

**Q12. You like the editor but you still ask Claude Code to make changes. Why not do them in the editor?**
Ticked: *Claude is faster and I just say what I want.* Then:

> Though if it's like changing a button label or changing the primary style colour, I'd probably open the editor IF
> it was very quick and easy, which is where my idea of 'an editor inside claude code' came from, so you have the
> preview right there and it's not tempting to just ask claude to do it when you can just click and edit what you
> already see, like with Replit (though replit didn't have an editable preview back then)

### 9.2 What round 3 says (the session's reading, to be corrected by him)

- **The client's questions sort into two kinds.** Ones an agent answers ("can you change it": a couple of hours, dead)
  and ones that need a picture of the system a person can hold: where the data is and who sees it; why it does X; why
  this technology; what if we move, go mobile, sell, take an investor. Bubble gave him the second kind because every
  Bubble app was the same known thing he understood once. Every Claude Code app is a different bespoke stack chosen
  on the evening it was built.
- **The editor's checking job is being taken by Claude's own verification.** His words: "offloaded to headless
  chrome and Claude screenshots as proof." That is the §3 finding (Desktop auto-verify on by default) arriving in his
  own habit. What is left in the editor for him: curiosity about the structure; the schema, for things the client did
  not ask for; and the tiny visual edit, if it were instant.
- **The instant visual edit is the Replit loop again** (Q5), and he names the shape he wants: the preview right there
  in the Claude Code session, click and edit what you see. Studio and P123 are that; so is Claude Code Desktop's
  browser pane for code (§2.3). The window is converging from both sides.
- **The billing line is the feeling, in money.** Four hours of work, thirty minutes active, and not knowing what he
  is selling. Bubble never posed the question because he was the builder. What he sold then was being the person who
  understood the system and could vouch for it to the client. That is the thing Claude Code took, and it is the
  thing the product would have to give back.

### 9.3 Round 4, verbatim

**Q13. When you bill a client four hours and were active for thirty minutes, what do you tell yourself you are
selling them?** Ticked: *the result, however long it took; being reachable when it breaks.* Then:

> It's the reassurance that somebody human is checking the output, any questions in the middle, quality testing the
> end result

**Q14. A client says: "we might sell this or bring in an investor, what do we tell them it's built on?" Which answer
would you be comfortable giving?** No option ticked:

> I'd not talk about NOdeGX, I'd say whatever framework I know the investor will like, then build the bridge between
> NodeGX and that offramp, like we plan to do with the Swift experiment

**Q15. The single moment in your Bubble years when you felt most useful and in control in front of a client?**
Ticked: *catching something they hadn't thought of.* Then:

> or building a feature fast and cheap that they'd been told would cost tens of thousands of euros by traditional
> tech agencies. though now I'm the guy charges hundreds of euros for something they'll probably find can be built
> with a 20 dollar subscription, so I'm the agencies I used to laugh at

**Q16. If Claude Code keeps getting better at building, what do you want your job to be in two years?**
Ticked: *the person who understands and vouches for the system; the teacher.* Then:

> I think my plan is to keep having my hands in the dirt, being able to answer the question of 'does this really
> work?' because I'm doing it every day, staying on the cutting edge of what's possible with AI so anyone who wants to
> try it can get the latest possible methods and capabilities if they come to me for guidance. But in the end I'll
> proabably do less and less of the actual build process and more of the high level conception and be the bridge
> between the human who doesn't know how to tell Claude what they want because they don't even understand what they
> want, and Claude

### 9.4 What the feelings say, put together (the session's reading; his to correct)

1. **What he sells is a human who checks.** Q13 in his words: reassurance that somebody human is checking the output,
   answering questions in the middle, testing the end result. Not hours, not code. Bubble made that role visible: he
   was the builder, so the checking was inside the building. Claude Code made it invisible: the agent builds and the
   agent checks (headless Chrome, screenshots), and the human's part shrinks to thirty minutes nobody can see.
2. **The best moment was catching what the client had not thought of** (Q15), and that is the one job the editor
   still does for him that Claude's screenshots do not (Q11: the schema, "in case I disagree with any of it or I see
   something the client didn't ask for"). A screenshot shows the surface. The schema and the graph show the decisions.
   Catching lives in the decisions.
3. **NodeGX is his workbench, not his brand.** Q14: to an investor he would name whatever framework they like and
   build the bridge to it. So the offramp (P18's export, the Swift experiment) is the client-facing answer, and the
   graph is the private place where he can still see, catch and vouch. That is the opposite of how the site presents
   it (an open-source visual builder, above the fold) and the same as DIRECTION §1 (the editor optional, the format
   the thing).
4. **The feeling called "safer" (Q6) decomposes into: I can still catch things, I can still answer, and I could still
   take it over.** The first is the editor's schema and structure. The second is the client's five questions (Q9),
   two of which only a picture of the system answers. The third is the offramp. None of the three is "Claude can't
   override it", which is the one part the kit does not do (§4.1), and it was the least important of the three to him.
5. **The arbitrage is gone and no product brings it back.** Q15: he was the cheap fast alternative to agencies; now
   he is the agency, at hundreds of euros against a $20 subscription. NodeGX cannot fix that. What survives is the
   role in Q16: hands in the dirt daily so he can say "does this really work" from experience, and the bridge between
   a person who does not know what they want and the agent. That is a consulting and teaching offer, and the
   workbench is what keeps it honest.
6. **So where NodeGX fits, for him:** the workbench of the person who vouches. Claude Code builds. NodeGX is where a
   non-coder can see the decisions, catch what the client did not ask for, answer where the data is and why it does X,
   and keep an exit to the stack the investor wants. Whether anyone but him is that person is §8's play test, with
   the recruiting pool now named: people who sell "a human checked this".

## 10. Where it ends (2026-10-20, late): the reading confirmed, and the next big think

Richard, on §9.4's reading ("the workbench of the person who vouches"): *"Yep."* Then, verbatim:

> And I think the only thing that's missing today, and the thing I'd like to prototype in a new session, is a way to
> make backend workflows and cloud functions and the database itself interactive in a custom way, the same as Noodl
> did by turning visual and logic elements into nodes with connectors, I want the mystery of the backend / cloud
> functions and the database schema and management, privacy etc., to become as cool as the star wars editor or the
> kids block editor we made in a recent session. The big think question, for the next session, is how do you turn
> backend functions and database managers into 'visual coding' standard? We already did a lot of work on this in the
> backend phase of the 'your own editor' pushes, but we never tried to rethink how a user sees and interacts with a
> database. We had ideas, like nodes for tables and connectors for relations, something like a graph DB, but I've not
> seen a prototype yet. Having that DB view FUSED with the backend workflows and functions that make it work would be
> a very interesting thing, and a way to complete the 'I can explain all of this and you can take control' argument.
> no BaaS today really gives the user who's non technical a visual editor to manage their full backend, DB and
> workflows. Things like n8n come close, and our node editor for backend functions and workflows is good, but it's
> not enough. This is the big think for the next session

So the session's answer, in the end: the place is the workbench of the person who vouches; the half of the workbench
that exists is the front end's; the half that is missing is the backend's, and that is where the client's unanswerable
questions live (§9.1). The handoff for that think is `own-023/NEXT-SESSION-PROMPT.md`. §5's items and §8's play test
are parked behind it, waiting on Richard. Nothing changes on nodegx.io.

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
