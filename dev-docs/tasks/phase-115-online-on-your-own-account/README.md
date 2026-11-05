# Phase 115 — Online, on your own account

**Scoped:** 2026-10-07, at HEAD `d8a9f0069`, from a conversation with Richard that started as the story of an
ex-client and ended as a research question. **Status: 🟢 UNPARKED 2026-11-04 by Richard (BOARD lane 10): §12.** Was: 📋 SCOPED AND PARKED. Richard: *"we'll come back to it after
phase 107 and our Swift runtime experiment phase"* (P110). Nothing here is built. **Prefix: `HST`.**
**2026-10-12: HST-005's VM route is taken forward by P112 [OWN-016](../phase-112-your-own-nodegx/OWN-016-SHIP-IT.md)**
(P112 R18), for the npm kit: a deploy folder plus the backend on a VM the person owns. Read OWN-016 before building
HST-005. The rest of this phase stays parked.
Task files: [HST-000](HST-000-THE-HOURS-WRITTEN-DOWN.md) … [HST-015](HST-015-THE-THREE-DURABLE-OBJECT-REDS.md). The board is §6.

> "Now if someone had a system where it just set up the VM, got you the domain name you wanted, connected all the APIs
> and just said 'ok now go ahead and start your conversation with Claude', that would be a big deal."
> — Richard's ex-client, 2026-10-07, after building an eLearning platform and its landing page with Claude alone

> "No lock in to frameworks, no lock in to tools or hosting, just the plumbing locally and OSS to build and deploy a
> project." — Richard, 2026-10-07

> "A lot of people might just have pure frontend apps with some server side workflows but no DB, so the Cloudflare
> workers solution might be quite elegant for a lot of use cases." — Richard, 2026-10-07

## 0. The idea in one paragraph

[DIRECTION.md](../../DIRECTION.md) made the npm install and the person's agent the front door (D1, OWN-011). This
phase is about the back door: **how the thing the agent built on a laptop reaches the person's friends, on an account
the person owns, with the fewest hours of learning in between.** The ex-client's evidence is that Claude can do the
A to Z of a website, and that the hours he lost were not design: they were domain names, DNS, a box, hosting, a
backend, GitHub, API keys. Replit and Lovable remove those hours by owning the result. This phase asks whether an
open-source connector can remove them while the person keeps their own Cloudflare account, their own domain, their
own Claude subscription and their own pace. It is a **research and experiment phase**: it builds the same three
reference apps, puts each online by two routes (Cloudflare Workers with no VM; a VM you own), measures what a person
had to do by hand and what it costs, and ends with a ruling on the default route per shape of app.

## 0.1 Where it came from

Richard's ex-client refurbished his landing page and built an eLearning campus beside it, with Claude Desktop and
Claude Code and nobody else: the logo, the newsletters (Claude writes them and pushes them to Mailchimp), and a
no-password identity trick: a newsletter link carries an id, the page the reader lands on knows who they are, their
interactions are saved against that id and flow back to Mailchimp. Richard: *"The stuff you've built here with Claude
is better than anything I could have done for you."* The client disagreed on one point: it took hours of learning to
get there, and someone who removed those hours would have something.

Three things make this a NodeGX question rather than a Replit question:

1. DIRECTION.md already says the front door is the npm package and the agent. The plumbing after the build has no
   owner since phase 26 was specced for the editor and never started.
2. Phase 107's restraint argument (the agent builds from specced nodes, drift is counted) is the reason to choose
   NodeGX for a vibe-coded site. It is also the reason the site stays deployable: a graph on the interpreter is the
   same artefact on every host.
3. The exit. UNI-008 R7 already rules that a free hosted tier must end in a self-host off-ramp, and ECO-004 that
   users' work must remain theirs and retrievable. This phase builds the off-ramp first and the free tier never.

## 1. What was measured before scoping

Read on 2026-10-07 from the working tree at `d8a9f0069`, and from six web searches the same day (§11).

| # | fact | consequence |
|---|---|---|
| 1 | **Build and see with no editor already exists.** `noodl-mcp` binds an agent to a project folder and writes the graph; `noodl-preview` renders that folder in a browser with no editor process and reloads on change. Neither is on npm; OWN-011 (not started) is the one install command. | The step "the project is built independently of the editor" is real today for anyone with this checkout, and is OWN-011's job to make real for everyone else. This phase does not duplicate it. |
| 2 | **`nodegx deploy` writes a folder you upload**: `index.html`, a hashed export, the component bundles and the NodeGX interpreter (about 14.9 MB), which runs the graph directly. **It is not React.** `nodegx export` is the other artefact: React + Vite source you build yourself. | 🔴 The thing to host is a static folder, which is exactly what Cloudflare Pages serves free. The size of the interpreter is a number to measure on a phone before anyone is told to share a link (HST-003). |
| 3 | **The deploy engine is not in the npm package, on purpose** (`deployEngine.ts`): it needs `ProjectModel`, `NodeLibrary`, the viewer's register and the interpreter, none of which `@nodegx/export` ships. From a bare `npm i -g @nodegx/export`, `nodegx deploy` refuses and says where it looked (register row C72). | 🔴 "Deploy from the npm install" is not true today. Either the engine is published (a P112 R2 question) or the connector drives the checkout. HST-003 names which. |
| 4 | **The backend is a long-lived Node process**: `nodegx-backend` with SQLite or Postgres operational stores, a `LocalDriver` for files, SSE realtime, `nodemailer`. **`@noodl/backend-contract`** is the backend-neutral contract (types and frozen data, no I/O) that adapters register against. | Cloudflare Workers cannot run that process. A Workers backend is a second adapter against the contract, not a rewrite of the nodes (HST-006). SQLite stores are the good news: D1 speaks SQLite. |
| 5 | **Phase 26 specced the whole plumbing in July 2026 and started none of it**: DEP-003 publish to Netlify and Cloudflare Pages by direct upload with no git; DEP-004 deploy targets and secrets outside the project file; DEP-005 SSH deploy with Caddy and automatic TLS; DEP-006 Hetzner provisioning behind a `ServerProvider` interface; DEP-007 a read-only deploy assistant. Every one is written as a token and a button **in the editor**. | The designs are reusable and the surface is wrong for DIRECTION.md. This phase lifts them into the CLI and the MCP, which the editor can also call. It does not re-decide what they decided (where secrets live, Pages direct upload, the four Hetzner calls). |
| 6 | **Cloudflare, read 2026-10-07.** Pages free: unlimited sites, unlimited static bandwidth, 500 builds a month, 20,000 files. Workers free: 100,000 requests a day. Workers Paid: $5 a month, 10 million requests, and **Containers included** (25 GiB-hours memory, 375 vCPU-minutes, scale to zero). **D1 is not in the $5**: it has its own free tier (5 GB) and pay-as-you-go above it. Registrar: `.com` at $10.46 a year, at cost. | 🔴 The person's bill for a front end with workflows is **$0** plus the domain. Full stack with records on Cloudflare is $5 plus D1's free tier. Richard's "insert price here" is answered, with the caveat that the figures are a search, not a contract: HST-008 re-reads them on the day it reports. |
| 7 | **Hetzner, read 2026-10-07.** The CX23 the old task priced at about €4 is quoted between €3.49 and €5.49 by different pages, plus €0.50 for IPv4, and **one page reports the whole cost-optimised tier marked unavailable on 2026-09-07.** | 🔴 DEP-006's "€4/month for a machine that comfortably runs this stack" may not be purchasable. HST-005 re-measures on Hetzner's own console before anything is written against it, and Cloudflare Containers is the third option on the same comparison row. |
| 8 | **Anthropic's connectors directory** lists more than 950 servers, ranks by usage, and submission needs a Team or Enterprise organisation. | Distribution is the whole business of step 2 ("someone tells them to build with NodeGX"), and it is not code. HST-009 measures what the listing needs and what the MCP registry needs instead. |
| 9 | **The credit card loop cannot be automated.** An Anthropic account, a Cloudflare account with a payment method, and on the VM route a Hetzner account with KYC. | The phase's promise is "two sign-ups, then it is done for you", never "just start your conversation". HST-000 counts the human steps as a first-class measurement. |
| 10 | **The client's site in NodeGX terms:** a page reads an id from its URL; interactions are records keyed by that id; a server-side call carries a secret to Mailchimp. Whether the node vocabulary expresses each of those is **unmeasured**. | HST-001 is the proof. If the vocabulary cannot express it, that finding is worth more than the rest of the phase and goes to P107. |

## 2. The person sentences

> **Two sign-ups:** "I made an Anthropic account and a Cloudflare account. Everything after that, the connector did,
> and it told me what it was doing in words I understood."

> **A link for my friends:** "My app is at my own domain, on my own account, and the bill is mine and small. Nobody
> between me and it can switch it off."

> **I can leave:** "If I stop using NodeGX, the site stays up. The files are in my folder, the account is mine, and I
> know what each part is because it was explained as it was built."

> **The right size:** "My app has no database and no server, so it cost nothing. When I add one, it tells me what that
> changes before it spends anything."

## 3. The three shapes of app

The research axis. Each shape is a fixture (HST-002) and a column in the report (HST-008).

| shape | what it is | the client's site has it | front end | server side | records |
|---|---|---|---|---|---|
| **A** | A pure front end: pages, forms that post elsewhere, no secret anywhere. | the landing page | the deploy folder | none | none |
| **B** | A front end with server-side workflows and no database: a call that must carry a secret (Mailchimp, email, a paid API), a scheduled job, a webhook in. | the Mailchimp hook | the deploy folder | a workflow | none |
| **C** | Full stack: records, users, roles, files, realtime. | the interactions table and the id | the deploy folder | the backend | yes |

Richard's expectation, to be tested rather than assumed: most vibe-coded sites are A or B, and B on Workers with no VM
is the elegant case.

## 4. The two routes, and the experiment

| route | front end | shape B | shape C | the person owns | the person maintains |
|---|---|---|---|---|---|
| **Workers** | Pages (free) | a Worker (free tier) | Containers or a D1 adapter ($5 + D1) | a Cloudflare account, a domain | nothing: no patches, no disk, scale to zero |
| **VM** | Pages (free) or Caddy on the box | the backend on the box | the backend on the box | the account, the domain, a box | updates, backups, a disk that fills, a port that is open |

The experiment: for each shape, put the fixture online by each route, through the connector, with Richard or a
stranger at the keyboard. Measure, per run:

1. **Human steps**: every click outside Claude, with a screenshot, and the minutes.
2. **Sign-ups and secrets**: how many accounts, how many tokens, where each token ended up (never in the project file:
   DEP-004).
3. **Cost**: the bill at day 1 and day 30, read from the provider's own console.
4. **Survival**: after 30 days untouched, does it still serve, and what did it need.
5. **The exit**: with NodeGX uninstalled, what still works and what the person has to know.
6. **The size**: the first page on a phone over mobile data, from the deploy folder's interpreter.

The report (HST-008) puts the twelve runs in one table and asks Richard for the default route per shape (R1).

## 5. Depends on

| from | what | state on 2026-10-07 |
|---|---|---|
| P107 | the specs; the honesty number's base; whether a workflow node can run server-side | 🟡 116 of 147 conform; **this phase waits for it** |
| P110 | the Swift runtime experiment; a second runtime says what "the same artefact on every host" costs | 📋 0 of 14; **this phase waits for it** |
| P112 OWN-011 | one install command; this phase's step 3 | 📋 not started |
| P112 R2 | publish the kit at 0.x; without it the deploy engine stays in the checkout (reading 3) | 📋 ruling owed |
| P26 DEP-003/004/005/006 | the designs this phase lifts out of the editor | 📋 specced, 0 of 8 started |
| P104 | the backend's permission model, which a public backend needs switched on before the first deploy (D14, D15 in P26) | ✅ |
| P111 SEE-008 | the companion door: the briefing a vibe coder's agent meets | 📋 not started |

## 6. Tasks

| task | what | kind | depends on |
|---|---|---|---|
| [HST-000](HST-000-THE-HOURS-WRITTEN-DOWN.md) | **The hours, written down.** The ex-client lists the evenings he lost and what he googled; each becomes a row with the task that removes it, or "a sign-up, stays human". The phase's acceptance criteria come from this list. | research | — |
| [HST-001](HST-001-THE-CAMPUS-FLOW-REBUILT.md) | **The campus flow, rebuilt.** The client's id-in-the-link, interactions-by-id, hook-to-Mailchimp flow built through Claude Desktop, the MCP and the preview, no editor. Every node the vocabulary lacks is a finding for P107. | proof | OWN-011 or this checkout |
| [HST-002](HST-002-THREE-FIXTURES.md) | **Three fixtures.** One NodeGX project per shape (A, B, C), small, each with a written list of what it must do online. | fixtures | HST-001 |
| [HST-003](HST-003-PAGES-AS-A-DEPLOY-TARGET.md) | **Cloudflare Pages as a deploy target.** DEP-003's direct upload, lifted into `nodegx deploy` and the MCP; where the engine lives (reading 3) decided; the interpreter's size on a phone measured. | plumbing | DEP-003's design, R2 |
| [HST-004](HST-004-A-WORKFLOW-ON-A-WORKER.md) | **A workflow on a Worker.** Shape B with no VM: which server-side nodes can run on Workers, how the secret stays server-side, how the front end calls it. A spike that ends in a measurement, not a product. | experiment | HST-002, P107 |
| [HST-005](HST-005-A-BOX-YOU-OWN.md) | **A box you own.** DEP-005 and DEP-006 lifted into the CLI and MCP; Hetzner's availability and price re-measured on its console; Cloudflare Containers run as the third row. | plumbing | DEP-004/005/006's designs |
| [HST-006](HST-006-THE-CONTRACT-ON-D1.md) | **The contract on D1.** A spike: which of `@noodl/backend-contract` a Workers + D1 adapter can honour, and which parts (files, realtime, mail) need something else. Ends in a table, not an adapter. | experiment | HST-002, P34's contract |
| [HST-007](HST-007-THE-DOMAIN.md) | **The domain.** Registrar and DNS from the connector: the name the person wanted, bought on their account, pointed at the site, with the human steps named. | plumbing | HST-003 |
| [HST-008](HST-008-THE-COMPARISON.md) | **The comparison.** Twelve runs (three shapes, two routes, two drivers), the six measurements from §4, the vendor numbers re-read on the day, and the ruling asked. | report | HST-003…007 |
| [HST-009](HST-009-THE-WORDS.md) | **The words.** The one sentence a person says to Claude; what the connector says as it works; the directory listing or the registry entry; the exit explained in the person's words. | copy + distribution | HST-008, SEE-008 |
| [HST-010](HST-010-THE-BACKEND-CALLS-ITSELF-IN-PROCESS.md) | **The backend calls itself in-process** (R3, 2026-11-05: build the route here). A cloud function's calls to its own backend go through a transport the host hands in; on a Worker, the in-process handler (LOOPBACK). | product | HST-006 §7 |
| [HST-011](HST-011-THE-DATA-DIR-IN-A-STORE.md) | **The data dir in a store it is handed** (seam 3): rules, keys and secrets survive a restart on a Worker. | product | HST-010 |
| [HST-012](HST-012-FILES-IN-A-BUCKET.md) | **Files in a bucket, and who may upload** (seam 5 + NOFILESRULE). | product | HST-010 |
| [HST-013](HST-013-CODE-NODES-PRINTED-AT-DEPLOY.md) | **Code nodes printed at deploy** (NOCODEGEN). | product | HST-010 |
| [HST-014](HST-014-THE-DEPLOY-COMMAND.md) | **The deploy command**: `nodegx deploy --cloudflare` does what the spike's scripts do by hand, never wiping a live app. | product | HST-010…013 |
| [HST-015](HST-015-THE-THREE-DURABLE-OBJECT-REDS.md) | **The three Durable Object reds** (regex, EXPRDEPTH, NOROLLBACKCASE). | product | HST-006 §6 |

**Order:** HST-000 and HST-001 first and in parallel (both are measurements; neither waits for P107 to close). Then
HST-002. Then HST-003 and HST-005 in parallel (plumbing), HST-004 and HST-006 in parallel (experiments). HST-007 after
HST-003. HST-008 last but one, HST-009 last.

## 7. Acceptance criteria for the phase

1. HST-000's list exists, and every row names the task that removes it or says "stays human".
2. The campus flow runs through the MCP and the preview with no editor opened, or the missing nodes are filed against
   P107 by name.
3. Each of the three fixtures is online by both routes, on an account Richard owns, from the connector.
4. Every human step outside Claude is counted and screenshotted, per run.
5. The twelve-run table exists with all six measurements filled, and the vendor numbers in it carry the date they were
   read.
6. Richard has ruled the default route per shape (R1), and the sentence a person says is written (HST-009).
7. No token or key is in any project file, in any run (DEP-004's rule, graded by a search over the fixtures).

## 8. Rulings

### To ask, when the phase starts

Each is to be asked in plain words, with the recommendation first and its cost in numbers measured on the day.

| # | question | recommendation on 2026-10-07 |
|---|---|---|
| R1 | For each shape of app, which route does the connector choose by default? | A: Pages. B: a Worker. C: a box until HST-006 shows D1 honours enough of the contract, then Cloudflare only. |
| R2 | May the connector spend the person's money (buy a domain, create a box) or only guide them to the page where they do it? | Guide first, with the price shown; spend only behind a confirmation that repeats the monthly figure (DEP-006's gate). |
| R3 | Is the Workers + D1 adapter a product of this phase or a spike for a later one? | A spike here (HST-006). The adapter is its own phase, scoped from the spike's table. |
| R4 | Does Digital Bricks take the Claude Team organisation the directory submission needs, or does NodeGX go through the open MCP registry and a `.mcpb` file? | Measure what each costs in HST-009 before asking. |
| R5 | Is a 14.9 MB interpreter an acceptable first load for a shared link, or does this phase wait for P107's smaller runtime? | Measure first (HST-003). If the first page on a phone is over a few seconds, wait. |

**Ruled 2026-11-04, R6 — one Worker, not Pages plus a Worker.** Richard: *"Sure go for one worker if we can make sure
it's as sure as pages for not getting charged if you have an app with dozens of active users."* The condition, read the
same day: a Free account is never billed (over a limit, Cloudflare refuses the request: 1027 for the day's 100,000,
1102 for CPU; billing starts only on the $5 Paid plan), and page files are free and unlimited in both; Pages
Functions are Worker requests. So "not charged" is the same for both; what a free user can meet is a **refused call**,
and the line that matters is 10 ms CPU a call (HST-004 §8.7–8.8).

**Ruled 2026-11-05, R3 — build it in P115.** Asked after Fixture C passed 8/8 on Richard's phone (one Worker, Free
plan, with spike scripts standing in for six product pieces, estimated 4–6 sessions, realtime not included), with three
choices: its own phase (recommended), build it in P115, or park. Richard chose **build it in P115**: the scripts become
the product here, aiming at the Beta as a nice-to-have, still never ahead of lanes 9, 2 and 3. The build order is in
`NEXT-SESSION-PROMPT.md` §3.

## 9. Not this phase

- **A free hosted tier** (UNI-008). This phase builds the off-ramp UNI-008 R7 promises; the tier stays deliberately last.
- **The Workers + D1 adapter as a product.** HST-006 is a spike. See R3.
- **A second provisioning provider.** DEP-006's rule stands: one that works completely before any that mostly work.
- **GitHub.** DEP-003 argued it out; a NodeGX project is a graph, and the direct-upload route exists so that nobody has
  to learn git to share a site. A person who wants git can have it; the connector does not require it.
- **The editor's Deploy popup.** It can call what this phase builds. It is not where this phase builds it.
- **Fighting React.** The pitch is the exit and the restraint, not the framework. The export to React stays (P18).

## 10. Risks

- **Anthropic ships it first.** A vendor's connector that provisions and deploys is one release away. What it is
  unlikely to ship is a box the person owns, a graph on specced nodes, and an off-ramp. The phase leads with those.
- **The "€4 box" is gone.** Reading 7. If Hetzner's cheapest tier stays unavailable, the VM route's price is higher
  than the old task assumed, and Containers may win shape C on price alone. HST-005 measures before anyone argues.
- **The engine is not published.** Reading 3. Until P112 R2 is ruled, "deploy from the npm install" means "from a
  checkout". The phase can run its experiments from the checkout; it cannot ship the connector without the ruling.
- **The vocabulary gap.** HST-001 may find that the client's site needs nodes that do not exist. That is the best
  possible outcome of the task and the worst for the schedule.
- **The interpreter's size.** 14.9 MB in the deploy folder, measured on a laptop. On a phone it is the first thing a
  friend sees.
- **Hiding the plumbing recreates the lock-in.** The client valued the hours once they were over; he understands his
  stack and can leave. The connector must narrate each step, in his words, and HST-009 grades that it does.
- **Vendor numbers decay.** Every figure in §1 is a search result dated 2026-10-07. HST-008 re-reads each on its own
  day, and no figure goes to Richard for a ruling without that re-read (memory: a third party's number in a scoping
  session is the one most often wrong).

## 11. Sources read on 2026-10-07

Plain text, so they can be copied.

- Cloudflare Pages limits: https://developers.cloudflare.com/pages/platform/limits/
- Cloudflare Pages and Workers free plan summary: https://costbench.com/software/cloud-infrastructure/cloudflare-pages-workers/free-plan/
- Cloudflare Workers pricing: https://makerkit.dev/pricing-calculator/cloudflare and https://spendhound.com/marketplace/cloudflare-pricing
- Cloudflare Containers pricing: https://developers.cloudflare.com/containers/pricing/
- Cloudflare Registrar `.com`: https://www.cloudflare.com/application-services/products/registrar/buy-com-domains and https://domainoffer.net/tld/com/cloudflare
- Hetzner cost-optimised tier and its availability: https://www.bitdoze.com/hetzner-cloud-cost-optimized-plans and https://www.vincentschmalbach.com/hetzner-cheap-cloud-unavailable-price-increases/
- Anthropic connectors directory: https://claude.com/docs/connectors/directory

## 12. Unparked, and the sessions since

**2026-11-04, Richard:** *"Let's kick it off and lift the park. If this can go out with the Beta, it'd be a nice
addition."* The question he asked first: how many sessions to prove a NodeGX full-stack app on Cloudflare Pages and
Workers. The answer given: about 2 for the narrow proof, 6–7 for full stack on D1 + R2. The order since then is
Cloudflare-first (shape B, then C on D1), ahead of the VM rows; the twelve-run comparison (HST-008) waits for both.

| session | date | what | where |
|---|---|---|---|
| 1 | 2026-11-04 | The backend's own workflow engine on workerd, locally: a workflow carrying a secret, a schedule trigger, the cloud-function interpreter, and the HTML export served by the same Worker. Two defects filed (HTTPLOOKUP, WARMRUNNER) | [HST-004 §6](HST-004-A-WORKFLOW-ON-A-WORKER.md#6-session-1--2026-11-04-opus-55-the-backends-own-engine-on-workerd-locally) |
| 2 | 2026-11-04 | Fixture B written by the MCP (a page, a cloud function `subscribe` with a Secret and an HTTP Request, no code node); the page and `/functions/<name>` on the same Worker, measured on workerd: the email and the key reach the stand-in, a missing email is a 400, the cron still fires. The editor's cloud bundler drops the wires into the HTTP Request's body and auth (BUNDLEDROPS, high; shimmed in the spike). The deploy is scripted and waits on Richard's `wrangler login` | [HST-004 §7](HST-004-A-WORKFLOW-ON-A-WORKER.md#7-session-2--2026-11-04-opus-55-a-real-projects-page-and-cloud-function-on-the-same-worker-ready-to-deploy) |
| 3 | 2026-11-04 | Both Workers deployed on Richard's account (`hst-spike-worker` and `hst-stand-in` on `richard-digitalbricks.workers.dev`); the page answers, the function refuses cleanly without its secret, the key is in no uploaded file. HTTPLOOKUP fixed in the product (the step is given a transport; fetch on a Worker) and the spike's shim deleted. AC1 waits on the secret, which the classifier will not let a session set | [HST-004 §8](HST-004-A-WORKFLOW-ON-A-WORKER.md#8-session-3--2026-11-04-opus-55-on-richards-account-and-the-api-steps-transport) |
| 4 | 2026-11-04 | Where a call's CPU goes, measured on the deploy with temporary probe doors: Cloudflare itself costs 0–1 ms (echo, bare fetch, allocation); the spikes over 10 ms are cold isolates (bundle load + first compile), warm calls 1–2 ms (refused) and 2–9 (real). A warm-up at startup (load + run every function, timers and fetch stubbed, restored at the first request) halves the worst call (33 → 17–18) and clears the simple paths; a fresh isolate's real calls still reach 10–18 ms about one in five. 337 calls, 52 over 10 ms, all answered (0 `exceededCpu`) | [HST-004 §9](HST-004-A-WORKFLOW-ON-A-WORKER.md#9-session-4--2026-11-04-opus-55-where-a-function-calls-cpu-goes-and-a-warm-up-at-startup) |
| 4b | 2026-11-04 | The builder is emailed when Cloudflare refuses a call: the emitted client recognises 1102/1027 (as text or Cloudflare's HTML page), tells the visitor in a sentence and reports to the Worker, which emails once a day (Cloudflare's sending with a domain, Resend without, else a log line). Measured: on Free the real cut-off is ~2 s of CPU per call. Live up to the email; the email waits on Richard's Resend key or a domain on Cloudflare | [HST-004 §10](HST-004-A-WORKFLOW-ON-A-WORKER.md#10-session-4-later-the-builder-is-emailed-when-cloudflare-refuses-a-call) |
| 5 | 2026-11-04 | HST-006 started. The backend's record store runs on Cloudflare **unchanged**, in a SQLite Durable Object (not D1: the store is synchronous and D1 is promise-only), through a 127-line engine shim. The contract's own conformance suite inside it passes **99 of 102** on Richard's account, three runs (regex; two five-hop paths over Cloudflare's expression-depth cap of 100). No case grades atomicity (NOROLLBACKCASE). Free-plan cost measured: a create writes 4 rows against 100,000 a day. The exit round trip (export on Cloudflare → reimport into the Node backend) gives the same answers. D1 is on Free now | [HST-006 §6](HST-006-THE-CONTRACT-ON-D1.md#6-session-5--2026-11-04-opus-55-the-record-store-in-a-durable-object-graded-by-the-contracts-own-suite) |
| 6 | 2026-11-04 | Users and sign-in. The WHOLE backend service (`BackendService`, unchanged) boots in one Durable Object (40 ms startup, 1.13 MB gzipped), four seams and no product change. Nine of the backend's own HTTP suites run unchanged against it through a remote stand-in: **67/76 on Richard's account**, the same as locally, 76/76 in Node. All 9 reds are code nodes in cloud functions (NOCODEGEN, 504 after 30 s). Found LOOPBACK (the service calls itself on 127.0.0.1) and fixed STALECENSUS (`816929bcf`). A sign-in costs 62 ms of CPU, a sign-up 74 | [HST-006 §7](HST-006-THE-CONTRACT-ON-D1.md) |
| 7 | 2026-11-05 | **Fixture C** written through the MCP (a reader greeted by the id in their link, an answer saved against it, an owner who signs in to read them all; 56 nodes, 0 code, five phone drives green locally), and **online** on `hst-backend-spike`: the interpreter site with the PRODUCTION viewer (2.93 MB; the plain-HTML export leaves the whole data path out, EXPORTDATAPATH) beside the whole service, and seam 3 made real (the data dir in the object's storage, the service started again by itself: held across two redeploys and an isolate Cloudflare replaced). Every rule read over HTTP live; the phone reading is Richard's. The production viewer's build had been red since 11-04 (VIEWERTS2554, fixed). Then on Richard's phone: STALEROWS found and fixed in the runtime (a refused query kept the previous account's rows); R2 ruled, enabled by him, files through a binding (seam 5). **Fixture C 8/8 MUST lines** | [HST-006 §8](HST-006-THE-CONTRACT-ON-D1.md) |
| 8 | 2026-11-05 | R3 ruled (build the route here); six tickets HST-010…015. **HST-010 built**: the backend calls itself through a transport its host hands in (`loopbackFetch`), graded in Node with a Worker's refusal made (control loses the caller; 4/4 with it; one mutant per caller), on workerd (`p127-no-roles` 5/11 through the option, the spike's global `fetch` patch deleted), and live with Fixture C unchanged (`f1887406`) | [HST-010 §6](HST-010-THE-BACKEND-CALLS-ITSELF-IN-PROCESS.md) |
| 9 | 2026-11-05 | **HST-011 built**: the data dir's own files (rules, secrets, sign-in settings, triggers, deployed functions) go through one seam, `dataDirStore`, which a host may hand in; fifteen writers routed, the rest named in a census that is now a gate. Graded in Node with a wiped data dir (control loses all four settings; with the store all four back and the first admin credential still opens it; one mutant), the whole backend suite (315 pass; 4 reds, none HST-011's, two filed new), on workerd (42/42 of three backend suites; session 7's files moved once into the store), and live: two redeploys of Campus, nothing re-seeded, MUST 1–8 over HTTP, the files byte-identical. Found SITEROUTES (the spike's one-origin router hid `GET /mcp` behind the page) | [HST-011 §5](HST-011-THE-DATA-DIR-IN-A-STORE.md) |
| 10 | 2026-11-05 | **HST-012 built**: files in a bucket the host hands in (`filesBucket`, `BindingDriver`, `kind: 'binding'`, its own key space, the sweep walking it and never listing a non-file object); the spike's `LocalDriver.prototype` patch deleted. Graded with a fake R2 (conformance + whole service, ranged reads asked of the bucket as a slice; 6 mutants killed), on workerd over session 9's state (a `local` row's file moved once, still 200), and live: Campus's 4 files moved and 200, a new upload 201 + 200 signed out. NOFILESRULE fixed: `set_file_permissions` (backend + `nodegx.security.json`); Fixture C set to owner-only upload through its MCP and live: the second account refused with *"you may not upload files to this app"*. Found MCPTSCRUNTIME (noodl-mcp's typecheck red through a P128 test, filed) | [HST-012 §5](HST-012-FILES-IN-A-BUCKET.md) |

**The estimate after session 1:** the narrow proof stays at 2 (session 2 deploys it on Richard's account and puts a
cloud function behind the page's form). Full stack moves to **7–8**: a cloud function's code nodes cannot run on a
Worker (`new Function` is refused) and have to be printed before deploy, about one more session, on top of D1 for
records and users, R2 for files, and Durable Objects if realtime is needed.

**After session 5:** records need no new adapter, only the shim and three fixes (HST-006 §0), so full stack goes
down by about one session, to **6–7**. Users and sign-in, files and realtime are still unmeasured.

**After session 6:** users and sign-in need no new code either: the whole service runs in the object. The adapter
phase is the two product changes the seams stand in for (an in-process transport for the runtime's calls to its own
backend; the data dir's files in the object's storage), code nodes printed at deploy, and session 5's three reds.
Full stack stays at **6–7**, with less unknown in it: what is left unmeasured is files (R2), realtime, email from the
object and Fixture C.

**After session 7:** a full-stack app runs on one Worker on the Free plan with no product change beyond a type fix: the
interpreter site with the production viewer, the whole service in a Durable Object, its files in the object's
storage. Left: files (R2, Richard's go), realtime, email from the object, LOOPBACK and NOCODEGEN as product changes,
the deploy target that does what `site.mjs` + `seed-campus.mjs` do by hand. Full stack stays at **6–7**, of which
sessions 5–7 are the first three.
