# Phase 78 — next session

> ### ⬜ 2026-09-21 — TPL-010-M THE PLANNER'S MONEY: WRITTEN, NOT BUILT — START HERE FOR THE PLANNER
>
> Read [TPL-010-M](TPL-010-MONEY.md) first. Richard wants money out of Settings and into its own modal (€ in the app bar):
> every money number is a money item (partner, household, tax, each client's bills) that happens once or repeats weekly /
> monthly / quarterly / yearly with a start and an end; each repeat can be changed alone and is **ticked by hand** when it
> happens (unticked + past = late, listed first); hoped money carries a likelihood; the bottom of the week says break-even,
> target, how far off, what might come and the lowest point. **He overruled deriving client bills from project terms** —
> the person types each bill; the project's payment terms only pre-fill the due date (M5).
> - **First:** get Richard's yes on the proposed rulings **M10–M16** (data shape, balance readings, smoothed target,
>   the three lines on the week, late money as the drawer's first concern, move → hoped money).
> - **Then step 0, a mockup** in `nodegx-template-crm/mockups/money.html` (invented data), rendered at 1280×900, 1423×680
>   and 390×844 and looked at, **approved by Richard before any graph**.
> - It absorbs R2.2 and R2.5's money section ([R2](TPL-010-R2-FIRST-USE.md) s3). Board order: R2.3 (✅ built and driven 2026-09-21, R2 s4), then M, then R2.5.
> - Build against `packages/noodl-mcp/src/server` (working tree), apply the four sheet traps up front (M §5.8), demo key v3.
> - Local demo: `npm run template:planner`, then `node packages/noodl-preview/dist/nodegx-deploy.cjs templates/planner-demo
>   <site>/templates/planner --base-url /templates/planner/ --allow-development-engine` (the dev viewer is refused
>   otherwise; fine locally, never for publishing) and serve `<site>` statically.

> ### 🟢 2026-09-15 — T3 RULED AND DONE: FOUR TEMPLATES ARE ON THE COMMUNITY SHELF
>
> Richard wanted a visitor who likes a demo on nodegx.io to download NodeGX and find it in the launcher's **Templates** tab. Ruled:
> the community shelf (not zips — the launcher cannot import one), a new category **`game`**, and the **backend** todo list.
> - **nodegx-community `ade0d28`** — `0028` widens the shelf's AND the submissions queue's category constraint; deployed, migration
>   applied, neighbours 200 before/after. **Editor `85b59aaff`** labels it "Game" (0.2.4 draws the raw slug).
> - **`3206e12e5`** pins `useTransitions: false` again in Story engine and Pixel dungeon, with a gate in each spec: the shelf installs
>   into v0.2.4, which lacks GAM-006, and `1cf0a81d2` had removed the workaround. tpl005 + tpl006 119/119.
> - **Committed on Richard's word:** P88 session 11 as one commit `89e533625` (GAM-001/002/003; the per-task hunk split was NOT done)
>   and Monster Gate `b91b0a0a5`. Gates re-run first: 21 + 28 + 80 + 283. Pushed. `library/prefabs/form-fields` left uncommitted.
> - **Published** with `publish-templates-to-shelf.sh` (`ca5c98770`), drafts first: `rocket-school`, `pixel-dungeon`, `story-engine`
>   (game), `todo-list` (data-app). **Verified on the live shelf:** 5 rows, right categories and file counts, and every bundle
>   downloaded and diffed against `templates/<dir>` — 0 missing, 0 extra, 0 differing.
> - ⚠️ **Not driven in a real 0.2.4 install.** The 0.2.4 compatibility reading is from code and git (and the live Monster Gate demo ran
>   on an engine without GAM-001/003). And 0.2.4's community route does NOT carry `needsBackend`, so the todo list installs without the
>   automatic backend setup — a product defect worth filing.
> - 🔴 **After ANY change to these four templates, republish** (the script refuses a moved file count — update its expected counts in
>   the same commit), or the shelf drifts from the demos. The nodegx.io homepage now says every demo is a template.
>
> ### 🟢 2026-09-14 (night, session b7cd9341) — TPL-007 MONSTER GATE, THE FOURTH GAME: BUILT, GATED 326/326, DRIVEN ALL PASS
>
> Richard asked for options first: a playable mockup of three versions (<https://claude.ai/artifact/NkzcsuKFD1KX7JHEn3Q2rB>), then ruled
> ([TPL-007 §16.1](TPL-007-THE-MATHS-AND-TYPING-GAME.md)): A *and* B as a setup choice, a wrong answer creeps closer, opens on Practice,
> 3 monsters in 3 shapes × 3 colours, solo, a heart back after 3 quick answers. Built through the plan door (§16.2); every rule is `MONSTER`.
> Gates: engine 190, three suites **326/326**, typecheck 0. `drive-tpl007-monster.js` (new) gate/walk/push/screen **ALL PASS**; race
> regression `drive-rkt003-stage.js` 10 cells + `drive-rkt007-boost.js --arm defi` 4 cells **ALL PASS**. Served on 8782.
> 🔴 The door's `wired-dimension-becomes-grow` caught a lane whose monster would never have moved (a wired % width on a row's axis).
> 🔴 **Peer commit `9d77c9427` swept §16 half-done** (scripts + words whole, components partly); the rest is **uncommitted**.
> Richard's first play: the bob stopped after the first question (an event animation replaced it on the same box). Reproduced RED
> (`bobAfter`), moved to `::before`, build 3 `monster2` gates 327/327, gate + walk arms ALL PASS (§16.5).
> **NEXT:** Richard plays it (§16.4: three look questions, and whether to publish). Not run: the other P87 drives, hunt/merge drives, `test:ci`.

> ### 🟢 2026-09-14 (s4) — TPL-008 TODO LIST: LIGHT/DARK BUILT (R10) AND REPUBLISHED — gates 24/24 + 18/18, drives 14/14 + 10/10 + theme 9/9, live 16/16
>
> **s4:** follows the system, a moon/sun at the top right overrides it, the choice is remembered ([§3b](TPL-008-THE-TODO-LIST.md)).
> A `CSS Definition` on `App` overrides the colour tokens on two selectors more specific than the token block; CSS also picks
> which icon shows. Theme drive sabotaged (the sun's hide rules gone → exactly §0 and §2 red). Built with the SAME Sep 11
> `nodegx-deploy.cjs`, 16/16 on the folder, `ops/deploy.sh` (neighbours 200, homepage md5 unchanged), **16/16 live**.
> 🔴 **R11: the backend stays local** — sign-in from other devices and hosting are a later phase, not owed here.
> ⚠️ **Richard's own copy does NOT have dark mode yet**: `rsync --delete` into it was denied by the classifier. **Uncommitted** — s4's paths are listed in §7.
>
> Richard's own template: one list ordered only by what you do next, nothing deleted, every change kept as history; stored
> in the NodeGX backend. Rulings R1–R11 in [TPL-008 §1](TPL-008-THE-TODO-LIST.md); s1–s4 record in §7.
>
> **s3 built R9's demo** as `templates/todo-list-demo/`, written by the same `npm run template:todo` run. It is a **transform
> of the template's components** (`tpl008Demo.ts`): all 15 record writes become `localStorage` Functions at the same node
> ids, `Logic/Todo data` reads the same store (query shapes read off the backend nodes) and seeds an example list, sign-in is
> gone, Sign out is **Reset demo**. `tpl008Demo.test.ts` **18/18** grades it in step wire-for-wire (sabotaged: an unconverted
> write reddens exactly 3 rules). `tpl008-todo-demo-drive.test.ts` **10/10**, 0 console errors, no backend request beside a
> control that sees one; reload keeps it. 🔴 **Reset had to forget `todoLastHistory`** — with constant example ids a move
> after reset otherwise saves no line (sabotaged: drive §7 red). The template's drive is **14/14: reopen and untick driven**.
>
> 🔴 **GAM-005's uncommitted `variable-in-repeated-component` rule warned 54× per build** (4 pairs, all app-wide on purpose);
> fixed with "Shared on purpose:" node comments, 0 warnings again. Two pictures in the session's scratchpad for Richard.
>
> ✅ **Richard looked ("Looks great") and asked for it on the site: PUBLISHED at <https://nodegx.io/templates/todo-list/>.**
> Shipped `nodegx deploy` on the production engine with `--base-url /templates/todo-list/`, then `ops/deploy.sh
> 49.12.102.195` (neighbours 200 before/after, homepage md5 unchanged, host held exactly the local `site/` before `--delete`).
> `scripts/devtools/drive-tpl008-demo.js` **12/12 on the local folder and 12/12 against the public URL**.
>
> **NEXT:** nothing is owed on TPL-008 but Richard's: AC8 (a week of real use) and R4a (is a note on every tick too much) —
> plus, if he says so, putting dark mode into his own copy and committing s4.
> After any template change: `npm run template:todo`, the five suites, the deploy + `drive-tpl008-demo.js` (16 clauses), `ops/deploy.sh`.
> `test:ci` / `test:main` not run this session.

> ### 🟢 2026-09-12 (s4) — TPL-007 ROCKET SCHOOL: first cut BUILT, GATED, DEPLOYED, DRIVEN 17/17
>
> Richard ruled (all four games; "Rocket School"; DiceBear faces; stock lessons CE2→6e PLUS a visual
> editor for a person's own question sets; every misconception we can find; **the latest MCP door,
> the component way**). Built through **`create_plan → stage → apply_plan`** — the first template
> through the plan door — and graded by phase 85's own instrument: **42 components, 95% / 38% / 0.19,
> PASS ×3**. `npm run template:rocket` → `templates/rocket-school/` (50 components, one kit,
> byte-identical builds). Gates: `tpl007GameKit` 13, `tpl007Engine` 115, `tpl007Template` 12 — 140/140.
> Deployed with the production engine and driven: `scripts/devtools/drive-tpl007-rocket.js` **17/17,
> 0 console errors**. Profiles, Home and the Rocket Race PLAY. Pictures: `tpl-007-shots/`.
>
> 🔴 **Five product defects filed, D53–D57, ALL with 0 console errors** — a kit React node as a
> component ROOT draws nothing (wrap it in a Group); an `Expression` makes every identifier an input
> (`String(n)` throws — write `'' + n`); an `Expression` with no delivered input never evaluates (do
> not guard an optional `mounted` with one); `apply_plan` warns about the scroll setting it is about
> to write; **a `Variable` is GLOBAL by name** — two banners on one page opened together (a States
> node for local state; a repeater row needs an `id`).
>
> **NEXT, in order (TPL-007 §12):** Make Ten Merge page → Number Hunt page → Monster Gate → Teach
> page + `showMe` → Progress + save code → the question-set editor (Richard's ruling 3) → answer
> mode by level → publish to nodegx.io + Richard's look. Every Logic/ script the next pages need
> already exists and is gated. 🔴 Nothing is committed: 20 new paths, listed in the task file's §11.

> ### 🟢 2026-09-12 (s3) — TPL-006 IS **PUBLISHED**: <https://nodegx.io/templates/story-engine/>
>
> Richard played it, said *"it works, it's awesome"*, and asked for a zip and a publish to the
> template path *"like the other templates"*. Both done. **AC7 IS GREEN** — the first AC7 closed on
> any template in this phase. It sits beside `pixel-dungeon` and `business-landing-page` in
> `~/vscode_projects/nodegx-web/site/templates/`, shipped by the **shipped engine on the production
> viewer with NO `--allow-development-engine`**, and **driven against the PUBLIC URL: 16/16 clauses,
> 0 console errors.** `ops/deploy.sh 49.12.102.195`; both neighbours 200 before and after;
> `site/index.html` byte-identical under the deploy's own `build.py`. Commit **`92c9b1a2e`**.
>
> 🔴 **THE HARNESS PUBLISHED THE HOMEPAGE AS THE TEMPLATE, AND THE ABSENCE CLAUSES COVERED FOR IT.**
> `serveFolder` fell back to the **root** `index.html` for any **directory** request, so serving
> `site/` and asking for `/templates/story-engine/` returned **nodegx.io's homepage, with a 200**.
> The gate scored **5/16** — and ⚠️ **every one of the five that passed was an ABSENCE clause**,
> each true of a page with no story on it. **A blank page passes every absence a drive can make.**
> ✅ Fixed: a directory serves its own index first, root fallback kept after it for client-side
> routes. This is the second time in two sessions that absence assertions went green on a page that
> had simply never loaded — see §9b-i.
>
> 🔴 **`--base-url /templates/<slug>/` IS NOT OPTIONAL** and the other two demos carry it: it
> rewrites `<base href>`, `Noodl.Env['BaseUrl']` and every script src. The root-relative build would
> have asked for `/index-<hash>.js` under the subpath and **rendered blank**.
>
> ✅ **`withDeployedSite` now takes `origin`** — drive a site that is already served.
> `drive-tpl006-story.js https://nodegx.io --path /templates/story-engine/`. **A local folder that
> plays is not evidence the deploy landed.**
>
> ⚠️ **`site/templates/` is UNTRACKED in `nodegx-web`, and was before this template.** All three
> demos live only on the box and in that working copy; `git status` there does not describe what is
> published. They regenerate from this repo in one command. **Left as found** — committing three
> deploy folders is a decision, not a tidy-up.
>
> 🙋 **T3 still blocks the IN-EDITOR shelf, and this publish did not need it.**
> `interactive-fiction` is none of the six ruled slugs. The demo page is a static path on the
> marketing site; the shelf is the thing still waiting, for this template and `pixel-game` both.
>
> ⬜ **AC8 is the only thing left on TPL-006** — Richard has the four deployed-artefact shots and
> has said the template works; he has not ruled on the look itself.

> ### 🟢 2026-09-12 (s2) — TPL-006: **AC7's BLOCKER RE-MEASURED AND IT DOES NOT HOLD. THE DEPLOY CARRIES EVERY WIRE AND THE DEPLOYED FOLDER PLAYS.**
>
> The handoff below named AC7 blocked by **D44/D48** and predicted this template was the more exposed
> one because of a `For Each`'s `itemOutput-*` ports — *"the one nothing has measured"*.
> 🔴 **The prediction was right about the ports and wrong about who has the defect.**
>
> | path | authored | deployed | dropped |
> |---|---|---|---|
> | **`nodegx deploy`** — shipped engine | 84 | **84** | **0** |
> | `deploy-from-disk` devtool | 84 | 81 | 3 |
> | devtool `--sabotage` control | 85 | 81 | 4 (the planted one + the same 3) |
>
> The three are one `For Each`'s `itemOutput-goto`, `itemOutput-gives` and `itemOutputSignal-picked`
> — **the entire click path of a choice** — and they are a gap in **that instrument**, filed as
> **[D52](DEFECTS-THE-TEMPLATES-FOUND.md)**. Then the deployed folder was **driven**: real CDP mouse
> events, **16/16 clauses, 0 console errors**. Commits **`50876627b`** and **`46f483f37`**.
> Full record: **[TPL-006 §9](TPL-006-THE-STORY-ENGINE.md)**.
>
> 🔴 **THE NEGATIVE CONTROL IS THE POINT, AND IT IS THE SESSION'S ONE TRANSFERABLE FINDING.**
> The same drive against the **devtool's** build — same project, same script, the only difference
> being those three wires — scores **9/16 and exits 1**. The reader never leaves the first passage,
> carries nothing ever, sees no `requires` choice and reaches no ending.
> ⚠️ **And both builds report ZERO console errors.** Three dropped wires render perfectly, every
> paragraph of prose on screen, every button present, and the story cannot be played.
>
> 🔴 **The control also caught a hole in MY OWN drive's ARM A.** *"The `requires` choice is ABSENT
> carrying nothing"* **passed on the broken build**, because the reader never reached the gallery —
> absent for the wrong reason. **An absence is evidence only beside a signal known to fire**, and
> here that signal is ARM B. The pair is the reading. Pinned in the script's header.
>
> ### Two instruments are committed, because the census counts drops and does not name them
>
> - **[`scripts/devtools/deploy-connection-diff.js`](../../../scripts/devtools/deploy-connection-diff.js)**
>   — authored vs deployed, per component, with each end's node type. The gap between *"3 dropped"*
>   and *"which 3"* is the whole cost of D52. 🔴 The two sides spell a connection differently
>   (`fromId`/`fromProperty` vs `sourceId`/`sourcePort`); keying one against the other reports
>   **every** connection as dropped, which is a very convincing catastrophe that is not there.
> - **[`scripts/devtools/drive-tpl006-story.js`](../../../scripts/devtools/drive-tpl006-story.js)**
>   — 16 clauses, **exits 1**. 🔴 The choice rows are `Group`s with `cssClassName: "story-choice"`,
>   **not `<button>`s**: a first drive selecting `button` reported `NOT FOUND` six times and read
>   every screen as identical, which is indistinguishable from a template whose clicks are dead.
>   *A drive that finds nothing has two explanations and the instrument is the likelier one.*
>
> ### 🔴 D52 — the devtool's probe misses a BUILT-IN, and it is TWO gates not one
>
> D44's correction recorded the remaining drops as `keyboard-shortcuts` — *a **module** type, and the
> headless library holds built-ins only*. **That is not the whole cause.** `For Each` is a built-in
> and is missed too, because:
> 1. it subscribes to `nodeAdded.For Each` **only inside an `editorImportComplete` handler**
>    ([`foreach.tsx:1099-1107`](../../../packages/noodl-viewer-react/src/nodes/std-library/data/foreach.tsx#L1099-L1107))
>    which the probe never emits — so **it never appears in the census's own list of lazy types**,
>    and *"that family never subscribed"* and *"that family found nothing"* print identically;
> 2. its ports come from **another component's** `outputPorts`, and the probe's `graphModel` has no
>    components in it.
>
> **Either gate alone reads as a fix and changes nothing.** Owner `NONE`. Blocks no template.
>
> ### What is now true of TPL-006, and what is not
>
> - 🟢 **AC1–AC6** green (62/62 gate, `typecheck:mcp` clean, re-run at HEAD this session).
> - 🟢 **AC7's build half.** 84/84 diffed per component; the deployed folder plays 16/16.
> - 🟡 **The zip round-trip is done and it clears the PROJECT DIRECTORY, not the environment.**
>   31 KB / 30 files, **byte-identical** after unpack (`diff -r`), no absolute path, no
>   `noodl_modules` — and the unpacked copy, deployed from **outside the repo**, is 84/84 and 16/16.
>   ⬜ Another machine's Node, another OS and a different checkout are still untested.
> - 🟡 **AC8 — the look was SENT to Richard**, and from a better instrument than last time: the
>   earlier four came from `render-from-disk`, which serves **0 shipped default tokens** (TPL-004 §10
>   warns that flatness is the instrument). The **four** sent are off the **deployed** artefact.
>   ⬜ Still open until he answers.
> - ⬜ **AC7's hosting is Richard's**, and he ruled this session: **build the production viewer,
>   stop short of publishing.**
>
> 🔴 **`nodegx deploy` REFUSES this checkout's development viewer BY NAME, and that is EXP-017
> working, not a blocker:** *"9.43 MB inline source map, 66% of the file… uploading the folder puts
> that source on your host"*. Every deploy reading above used `--allow-development-engine`, which is
> honest for a census and **wrong for a publish**.
>
> ⚠️ **`deploy-from-disk.cjs` throws `ENOENT … /src/external/deploy/index.json` from anywhere but
> `packages/noodl-editor`** — `getAppPath()` resolves to `process.cwd()`. That is a fact about the
> working directory and **not** about the project, and it reads exactly like a broken template.
>
> ### 🟢 THE PRODUCTION VIEWER IS BUILT, AND THE ENGINE ACCEPTS IT WITH NO OVERRIDE
>
> Richard ruled it this session: **build it, stop short of publishing.** `npm run build:editor:_viewer`
> exit 0 — **14 MB / 110,799 lines → 1.5 MB / 1 line**, a `.LICENSE.txt` sibling appears, and the
> shipped engine goes from **refusing by name** to `ok: true`. On that runtime, with no flag:
> **84/84 connections and 16/16 clauses, 0 console errors**, whole site **1.7 MB in 8 files**, and
> the screenshot is pixel-identical to the development-viewer one. **AC7's build half is finished.**
>
> 🔴 **THAT BUILD OVERWROTE THIS SHARED CHECKOUT'S VIEWERS AND `git status` SAYS NOTHING.**
> `build-viewer.ts` rewrote **all three** of `packages/noodl-editor/src/external/{deploy,viewer,ssr}`;
> they are gitignored. The editor's preview now runs a **minified** viewer — **no readable stack
> traces in the renderer console**, which matters before anyone reads frames off a drive.
> ✅ **`npm run dev` restores a development build** (`scripts/start.ts:202` runs the viewer's `start`,
> not `build`). The old 14 MB development bundle was backed up **to a session scratchpad only**,
> which is gone with the session — `npm run dev` is the recovery, not that copy.
>
> ⚠️ **Never carry `--allow-development-engine` into a publish.** Every census in §9a used it,
> honestly, because a census does not care what it measures. A publish does: the flag is what puts
> 9.43 MB of base64 viewer source on a host.
>
> ### 🔴 THE FIRST JOB IS UNCHANGED FROM THE ENTRY BELOW, AND IT IS STILL UNMEASURED
>
> **D49's two-word fix on TPL-005 and TPL-004**, and **TPL-004's AC8 click-drive**. This session did
> not touch either. 🔴 **And §9b-i is the argument for doing the drive rather than reading the
> graph**: a build with three dead wires renders perfectly, reports **0 console errors**, and cannot
> be played. TPL-004's pages are wired, statically valid, and **nobody has clicked any of them**.
> ⬜ Also still unmeasured: **a `to-<state>` SIGNAL with transitions on** — one `to-` wire and one
> colour value. Do not read D49 as having tested it.

> ### 🟢 2026-09-12 — TPL-006, THE STORY ENGINE: **BUILT, GATED, DRIVEN AND COMMITTED.**
>
> `templates/story-engine/` — 9 components, 88 nodes, 84 connections, **zero `noodl_modules`**, no
> backend, **0 validator errors**, **62/62** on its own gate, `typecheck:mcp` clean, and **driven in a
> real browser with 0 console errors**. Two commits: **`84ca286e7`** (TPL-005's build, which the
> previous session left untracked and recorded as owed) and **`a2b53f9c0`** (TPL-006).
> Full record: **[TPL-006](TPL-006-THE-STORY-ENGINE.md)**.
>
> **What it is:** a branching story where the whole creative work is one `Static Data` array in
> `Story/Source`, and a `/remix` page whose box **opens holding the story that is playing** — paste
> your own, press Read this story, it plays. Four verbs and no fifth: `goto`, `gives`, `requires`,
> and an absent `choices` array is an ending.
>
> 🔴 **AC6 is the one that grades the pitch, and §8 proves it by DOING it.** The template is rebuilt
> with a completely different story and every component's graph is diffed: **exactly one component
> differs, and inside it exactly one parameter of one node.** All 20 passage titles, texts and choice
> labels occur in exactly one parameter — checked in both the raw and JSON-escaped spelling, because
> checking only the raw form found **13 of 20** and would have read seven leaked paragraphs as clean.
>
> ---
>
> ## 🔴 THE FIRST JOB IS ONE OF TWO THINGS, AND BOTH ARE CHEAP. DECIDE, DO NOT INHERIT.
>
> **(a) D49's two-word fix on TPL-005 and TPL-004, which nobody has driven.**
> **(b) TPL-004's AC8 click-drive**, which has been the banner below since 09-11.
> They are the same job by another name — see the prediction. Do (a) first; it is smaller and it
> tells you what (b) will find.
>
> ### 🔴 D43 IS DISPROVED. D49 REPLACES IT, AND IT IS BIGGER THAN D43 WAS.
>
> D43 read *"a value wired into `States.currentState` never changes its state."* **It does** —
> measured in a browser on `Story/Passage`, whose `string` value output changed on cue. Ten shipped
> `library/prefabs` components do that wire, four of them inside repeated rows.
>
> **What is actually broken:** a `States` node with **`useTransitions` true — the port's DEFAULT** —
> publishes its `string` and `boolean` values on a state change and **never publishes a `color` or a
> `number` at all.** Two arms, identical but for that parameter, each against a **freshly restarted**
> render server:
>
> | `useTransitions` | eyebrow (`string`) | ink (`color`) | rule (`color`) |
> |---|---|---|---|
> | `true` (default) | changed | **unchanged** | **unchanged** |
> | `false` | changed | changed | changed |
>
> Sampled at 0, 60, 150, 320, 700 and 1500 ms: the string flipped at 60 ms and both colours read
> their previous value at **every** sample. Nothing animates and nothing lands.
> Full row: **[D49](DEFECTS-THE-TEMPLATES-FOUND.md)**.
>
> 🔴 **IT PREDICTS TWO BROKEN TEMPLATES AND NEITHER PREDICTION IS MEASURED:**
> 1. **TPL-005** — `plBoardStates` and `plBannerStates` set no `useTransitions`, so it is `true`.
>    Their strings and boolean work; their **colours (`edge`, `tone`) should be dead**. Consistent
>    with Richard seeing the banner text and asking *"you also don't see any 'died' animation."*
> 2. **TPL-003/TPL-004** — `Site/FilterPill` sets `useTransitions: true` and drives **three colours**
>    from `Expression → currentState`. Predicted: **the selected pill's look never changes.**
>    TPL-004's AC8 drive has never been done, so nobody has looked.
>
> ⬜ **NOT measured by this session: a `to-<state>` SIGNAL with transitions on.** TPL-006's own
> signal-driven States node carries only strings, so it is not a control for that arm. **Do not read
> D49 as having tested it.** Measuring it is one `to-` wire and one colour value.
>
> ---
>
> ## 🔴 THE INSTRUMENT TRAP THAT NEARLY SHIPPED THREE FALSE FINDINGS
>
> **`render-from-disk.js` builds its HTML ONCE AT STARTUP** (`buildHtml` is called outside the
> request handler, line 525) **and serves that snapshot for the life of the process.** Three rebuilds
> were driven against a stale server and produced three confident, wrong readings — including a
> "transitions are not the cause" that was the exact opposite of the truth.
> 🔴 **RESTART THE SERVER BETWEEN ARMS.** `goto` is not enough; neither is a hard reload.
>
> ⚠️ And `drive-page.js eval` takes a **statement body**, not an expression: it wraps the argument in
> `(() => { … })()`, so `document.title` returns `{}` and you need `return document.title`. Four
> silent empty results before that was spotted.
>
> ---
>
> ## What is left on TPL-006, and what is NOT claimed
>
> - 🔴 **AC7 — the demo page. BLOCKED, and it is the inherited D44/D48 pair, not a new blocker.**
>   **This template is more exposed than TPL-005**: its engine is `Expression`, `Set Variable`,
>   `String Format`, `States` and — the one nothing has measured — a `For Each`'s `itemOutput-*` /
>   `itemOutputSignal-*` ports, every one minted in a `setup()` guarded on the editor connection.
>   **Do not publish a build whose own census says it dropped wires.**
> - ⬜ **AC8 — Richard's look.** Four screenshots were taken at 1100×1400 and one of them changed the
>   build (see below); he has not seen any of them.
> - ⬜ **Not opened from a zip on a second machine**, and not run through the shipped `nodegx deploy`.
>   The drive was `render-from-disk` against the prepared artefact.
> - 🙋 **The category slug is still Richard's and now blocks the shelf for TWO templates.**
>   `interactive-fiction` and `pixel-game` are both outside the six ruled slugs. Phase-78 `T3`.
> - 🙋 **The demo story's subject is still overturnable** — *The Last Light* ships, and switching to
>   the support-desk variant costs the prose and **one file** (`STORY_FILE`), nothing structural.
>
> ## Three defects this build found, all filed with measurements
>
> - **[D49](DEFECTS-THE-TEMPLATES-FOUND.md)** — above. Replaces D43. Owner `NONE`.
> - **[D50](DEFECTS-THE-TEMPLATES-FOUND.md)** — `uncollapsible-multi-column` Arm B lacks Arm A's
>   content-size exclusion, so a wrapped row of **content-sized** pills is warned about and the
>   suggested `Columns autoFit` would give every two-word tag a 300px column. The shipped library's
>   `/Tags`, `/Multi Select/Pills` and `/Multi Select/Dropdown` escape it **only by setting no gap**,
>   which is what the design doctrine tells authors not to do. TPL-006's gate asserts **exactly this
>   one warning on exactly this one component**, so a new one reddens. Owner `NONE`.
> - **[D51](DEFECTS-THE-TEMPLATES-FOUND.md)** — ✅ fixed. `typecheck:mcp` had been red for a day on
>   `tpl005Components.ts`; jest transpiles with babel and never type-checks, so nothing said so.
>   🔴 **A green jest run is not a typecheck.**
>
> ## Two things the DOORS taught this build
>
> - 🔴 **Two pages that link to each other cannot be authored in one pass.** `create_component`
>   **refuses** a `RouterNavigate.target` naming a component that does not exist yet
>   (`unresolved-navigation` → *"rejected — nothing was written"*), and the order cannot be swapped
>   because `nextStartPage` gives home to the **first page registered**. TPL-006 writes `Pages/Read`,
>   then `Pages/Remix`, then adds the one door as a two-operation `update_component` delta
>   (`READ_REMIX_DOOR`). The gate asserts the wire is in the artefact.
> - 🔴 **A `Text` with `sizeMode: 'contentSize'` renders `white-space: pre` and DOES NOT WRAP**
>   (`Text.tsx:79-85`). Every other template in this repo sets `contentSize` on almost every `Text`
>   because their strings are short. Prose nodes must be `contentHeight`. `PROSE_NODES` names all six
>   and the gate checks them.
>
> ## 🔴 Three defects only LOOKING found, on a green gate
>
> 1. **D49** — the gate was green and the panel never changed colour.
> 2. **A dead-end passage was labelled "A passage that is not there."** Two different data mistakes
>    wearing one label sends a person looking for the wrong bug. `Story/Passage` grew a fourth state.
> 3. **`visible` reserves its box.** Two empty lines left ~130px of hole on the reading page. The
>    design doctrine's *"falsiness is free conditional rendering"* names `visible`; for a line that
>    must **collapse** the port is `mounted` — which is what TPL-005 recorded from the other side.
>
> ## The suite, honestly
>
> `packages/noodl-mcp`: **1738/1745, 5 suites red, exit 1.** `tpl006Template.test.ts` is **62/62**
> and `typecheck:mcp` is clean. The five red are `tpl001Template`, `cmp001InterfaceDoctrine`,
> `cmp004Parts`, `nodeDocBudget`, `provision` — **none of them imports anything from tpl005* or
> tpl006***, checked. Three were named as already-red at HEAD by the previous session;
> `cmp004Parts` and `provision` were **not**, and ⚠️ **this session did not bisect them.**
> 🔴 `cmp004Parts` asserts a byte-for-byte re-export from committed prefab source, and
> **`library/prefabs/form-fields/project/project.json` is modified in the working tree with an mtime
> of 09-11 14:50** — before this session and before TPL-005's. It is **left uncommitted on purpose**:
> it is nobody-here's and re-exporting it is a decision, not a tidy-up.
>
> ⚠️ **HEAD moved during this session** — the peer landed `7a769f0f1` (LIB-008), `548a21d05` and
> `9245e3c22` (EXP-018) and **`c4986ece7` `chore(release): v0.2.4`**. **TPL-005 and TPL-006 are NOT
> in 0.2.4.**
>
> ## 🔴 THE LINT GATE IS A RATCHET, AND A TEMPLATE GATE WALKS STRAIGHT INTO IT
>
> `npm run tsfixme` counts `any` / `TSFixme` / `@ts-ignore` per population and **fails if any count
> rises above the committed baseline**. Both phase-78 template gates tripped it the moment they
> landed (+34 and +14 `any`), which turned the required Lint check red on `cline-dev` and **blocked
> the v0.2.4 release merge** until it was fixed. A peer session caught it and said so.
>
> 🔴 **Run `npm run tsfixme` before you commit a new gate.** `typecheck:mcp` and a green jest run
> both pass with a file full of `any`; this is the only thing that does not.
>
> ✅ **Fixed by typing, not by raising the baseline** (`7d82b3b01` for TPL-006; the peer took
> `tpl005Template.test.ts`). The whole debt was one root cause: reading `built.project` untyped. The
> types already exist and are precise — `LegacyProject.components` → `LegacyComponent[]`,
> `graph.roots` → `LegacyNode[]`, `graph.connections` → `LegacyConnection[]`, all exported from
> `io/ProjectExporter`. **Type `nodesOf`/`connectionsOf` once and twenty call sites stop needing a
> cast.** The one thing genuinely untyped is `LegacyNode.ports` (`unknown[]`, honestly so).
>
> ✅ **RESOLVED — the gate is GREEN at `4fcb39157`, with NO baseline raise.** The `+8 TSFixme` in
> `scripts/devtools/deploy-from-disk.entry.ts` are typed. `npm run tsfixme` exits 0 and the baseline
> is back at its original `src TSFixme: 563`.
>
> 🔴 **And the "PEER IS MID-FLIGHT ON IT / half-typed underneath, twice" above was two sessions
> editing one file at the same time, each seeing the other's unfinished work.** It ended the way that
> always ends: `23c23e4a1` is a `git commit <pathspec>` that **swept the other session's uncommitted
> typing into itself**, under a message that claims those 8 were deliberately left and justifies a
> baseline raise for them. The raise was real and then unearned within minutes. `4fcb39157` drops it
> and corrects the record rather than rewriting a commit already on the branch.
> ⚠️ **A pathspec commit scopes by PATH, not by authorship** — it is not a safe way to commit "only
> my files" on a shared checkout while a peer is live in the same path. The thing that caught it was
> re-measuring *after* committing: the ratchet said *"8 fewer markers than the baseline"*, which is
> only possible if the tree moved under the measurement the message was written from.
> **Typing credit for those 8 belongs to the peer session, not to `23c23e4a1`'s author.**
>
> 🔴 **`23c23e4a1`'s message contains a FALSE REASON, corrected here.** It says *"Nothing typechecks
> `scripts/devtools/`: it is in no tsconfig's include"*. **It is included** — `scripts/tsconfig.json`
> extends the root config and includes `./**/*.ts`. That claim came from grepping tsconfig files for
> the string `"scripts`, which can never find a config that lives *inside* `scripts/` and uses a
> relative include.
> ⚠️ **But the conclusion stands for a different and worse reason: that config cannot run.**
> `npx tsc -p scripts/tsconfig.json --noEmit` exits **134** with a V8 stack dump and **0 `error TS`
> lines** — measured independently in two sessions, and OOMing even at an 8 GB heap. **A log like
> that reads as green to anything counting error lines.** Gate on the exit status.
> ✅ **To verify one file there, use a scoped config**: `extends` the root tsconfig with
> `files: ["devtools/<file>.ts"]`. The peer session did this for the deploy entry and got 39 errors,
> all in transitively-imported editor sources (`router.tsx`, `nodegrapheditor.ts`, `EditorPage.tsx`)
> and **0 in the target file** — so the 8 types do compile.
> 🔴 **That scoped config is DELIBERATELY NOT COMMITTED, and the reason is this section's own
> principle.** It exits 2 with 39 errors that are artifacts of forcing `module: CommonJS` onto that
> import graph, not defects. Committed as a `tsconfig.json` it would *read* as a gate, and the next
> reader finds it red on arrival and either "fixes" 39 non-problems or learns that a red config is
> normal — which is how a team stops believing its own gates. **A recipe whose output is "0 in the
> target, 39 elsewhere, and you must check which" is a diagnostic, not a gate, and belongs in prose
> where the caveat travels with it.** Rebuild it when you need the reading; do not enshrine it.
>
> ⬜ **The finding underneath is unowned and is Richard's call:** `scripts/` is *nominally* covered by
> `scripts/tsconfig.json` and *verified by nothing*, because the only command that would check it
> cannot complete. **Token-counting (`npm run tsfixme`) is the only thing that actually runs over that
> tree.** Not opened as a task mid-release.
>
> ⚠️ **And `library/prefabs/form-fields/project/project.json` is still modified and uncommitted**
> (mtime 09-11 14:50, predating both sessions). It reddens `cmp004Parts`, which asserts a
> byte-for-byte re-export from committed prefab source. Nobody currently working owns it; somebody
> has to decide re-export or revert.
>
> ## How to run it
>
>     npm run template:story                 # regenerate templates/story-engine/
>     cd packages/noodl-mcp && npx jest --runTestsByPath tests/tpl006Template.test.ts
>     node scripts/devtools/render-from-disk.js templates/story-engine --port 8593
>     node scripts/devtools/drive-page.js start http://127.0.0.1:8593/ --width 1100 --height 1400
>
> 🔴 Restart the render server after every regenerate. See the instrument trap above.

> ### 🟡 2026-09-11 — TPL-004: AC1–AC7 BUILT AND GATED. **AC8 — THE CLICK-DRIVE — IS THE JOB.**
>
> Richard: *"improving the default landing page template we ship with the editor"*. He ruled
> **upgrade all three pages** and **keep the placeholders**, and that is what shipped:
> `embedded://landing-pages` now has a stylesheet on `App`, a sticky nav that scrolls by class name,
> a form that refuses Send until it can, the freelancer's work as a filterable `Static Data` list
> with a case study popup behind each card, disclosures on the services / the offer / the questions,
> a stepping quote carousel on two pages and a monthly-yearly price toggle.
> **21 → 28 components, 375 → 494 nodes, gate 40 → 50, 0 validator errors, all committed.**
> Full record, including what the render is and is NOT evidence of:
> [TPL-004](TPL-004-THE-LANDING-PAGES-STOP-BEING-A-FLYER.md).
>
> 🔴 **The next session's FIRST job is the drive, and it is one job.** A copy is already prepared at
> `NodeGX test projects/tpl004-render-drive`. Open it, start the preview, and on each of the three
> pages press: a nav link, a service card, a filter pill, a work card, the popup's Close, the
> carousel's Back and Next **at both ends**, an FAQ row, the plan toggle, and Send with the fields
> empty and then filled. **Record what did nothing.** Everything on those pages is wired and
> statically valid and **nobody has clicked any of it** — and the one defect class this build is most
> exposed to (a popup fed nine parameters under the wrong names) renders perfectly and says nothing.
>
> ⚠️ **Do NOT read the render's `flat-type-scale` / `no-display-type` findings as a verdict on the
> look.** That path stamps `0 shipped defaults + 34 project override(s)` — the ~200 product default
> tokens are absent, so every `var(--text-*)` and `--space-*` resolves to nothing. The control (the
> template at `192cf8d21^`, same instrument, same directory) measures identically flat. §10.
>
> ⚠️ **Five suites in `packages/noodl-mcp` were ALREADY RED at HEAD and are not TPL-004's**:
> `cmp001InterfaceDoctrine` (33 vs 37 — HEAD's own commit message names the rounding rule),
> `tpl001Template` (the byte-for-byte regeneration, the same key-order staleness landing-pages had),
> `nodeDocBudget`, `def018-def020-layout-drive`, `sbr009ThemeEditorDrive`. None of them import
> anything TPL-004 touched. **Re-measure before inheriting any of them.**

> ### 🟢 2026-09-05 — TPL-003, THE LANDING PAGES: BUILT, GATED, PHOTOGRAPHED, DRIVEN
>
> Richard asked for a third template for 0.2.2 and s4's *"the next template is blocked on the first
> one being published"* was overridden by the person who made it. `templates/landing-pages/`, three
> pages, no backend, a working `mailto:` form. Ruled in the same day and then **EMBEDDED** on his
> ask (`embedded://landing-pages`, beside the site builder — no publish). Full record and an
> eight-row register: [TPL-003](TPL-003-THE-LANDING-PAGES.md). Rides 0.2.2 as P82's **REL-017**.
> **Nothing committed** — pathspecs under REL-017 in P82's `TASKS.md`.
> ⚠️ `templatePins.ts` is the new shared home of the pinning; `tpl001Template.ts` still has its copy
> (register L8) — adopt it the next time the members' area regenerates, with its gate.

## Where it stands

> 🔴 **CORRECTED 2026-08-31 (phase 82, session 1): `T6` IS DONE.** The line below said it was the
> only buildable work left; measured in `templates/members-area/` at HEAD, **all three fixes are in
> the artefact** — they rode in with the TPL-002 / DEF-011 work rather than as a task called T6. See
> the table under item 2. **`T5` (publication) is now the only open item here, and it is unblocked.**
> ✅ *A handoff naming "the only work left" is a claim about an artefact — go read the artefact.*
>
> ⚠️ **T5 is being driven from phase 82** as `REL-001`, sequenced behind the template's look
> (`REL-002a/b/c`). Do not publish from this phase — see
> [`../phase-82-0.2.2-the-first-row-on-the-shelf/TASKS.md`](../phase-82-0.2.2-the-first-row-on-the-shelf/TASKS.md).

**Everything buildable is built except `T6`, three template fixes owed before publication. The
register has no unowned rows left.**

s16 said the phase was finished bar Richard. s17 took that at its word, then re-read the two claims
holding it up. **Both were wrong, in the direction that loses work**: one closed row was owned by a
phase that is closing, and eleven open rows were parked on a sweep that nobody had ever agreed to.

| | after s16 | after s17 |
|---|---|---|
| register rows with a table line | D1–D39 | D1–D39 (unchanged) |
| rows whose owner is `NONE` | *stated* 10, *enumerated* 11 | **0** — 8 to phase 80, 3 to `T6` |
| rows owned by a phase name | 1 (D10 → "phase 78") | **0** |
| rows owned by an unfiled task | 3 (D18, D19, D20) | **0** |
| D10 | 🔴 open | ✅ **FIXED — re-measured** |

⚠️ **No suite was run, and none is implicated: s17 touched no `.ts`, `.tsx` or `.json` — only
markdown in `dev-docs/`.** The last readings stand as recorded: noodl-mcp 959/959, `tpl001Template`
72/72, `typecheck:mcp` clean (s16); the tpl001/tpl002 backend drives 130/130 and 22/22 (s15).

## ✅ What s17 settled

- ✅ **D10 is closed — the generators no longer bypass the design system.** Re-measured on
  `templates/members-area/`, not read off a task file. **0 colour parameters → 555; 2 design tokens
  → 1,197 references across 39 distinct; `metadata.designTokens` absent → present.** The fix has a
  named home, [`tpl001Theme.ts`](../../../packages/noodl-mcp/tests/tpl001Theme.ts), whose header
  quotes D10's own measurement back as the defect it exists to end (`e5922d21` → `e337325c`).
  **D10's own open question is answered too**: it asked whether a preset alone would show, or
  whether nodes must also reference `var(--token)`. It was the sweep, not the one call.
- ✅ **D18, D19 → DEF-017. D20 → DEF-006.** All three were flipped by re-running the test *this
  register itself wrote down* — D20's cell literally said *"grep DEF-006 for `D20` and it is
  absent"*. It is no longer absent. Three greps; they had sat unowned for a day after the work had
  a home.
- ✅ **All eleven previously-unowned rows now have an owner**, on Richard's instruction (*"We need
  to add the defects to phase 80 please"*). They had been named in **zero** files outside the
  register. **Eight are product-surface → phase 80 as `DEF-018`–`DEF-025`**, carried by reference.
  **Three are template-side → `T6` here**, because phase 80 is scoped to the product surface and
  three template edits would have gone behind a product phase's dependencies.

## 🔴 The finding, in one paragraph

**"Phase 80 owns the register sweep" was never true, and it was built out of a sentence about the
past.** s16's prompt parked eleven rows on it. That sentence exists in exactly one place — s16's
prompt. What phase 80 actually records is *"Phase created from the three-register sweep"*: a
**completed** act on 08-29 that produced DEF-001–DEF-017. A phase created *by* a sweep does not
thereby own the *next* one. The rows that sweep did not pick up were left exactly where they were,
and a phase name written in prose above them read like a plan for a day. 🔴 **This is the same
failure as D10's owner cell reading "phase 78"** — a phase name is not an owner once that phase is
closing; it is `NONE` wearing something that parses like a task id.

## Then, in order

1. ⬜ **T5 / publishing. Richard drives it first.** Unchanged since s4. AC1 of TPL-001 is
   ungradeable until the template is on the shelf. **Still the only thing between phase 78 and
   done.**
2. ✅ **`T6` — DONE. Measured at HEAD 2026-08-31**, not relayed:

   | row | claimed defect | at HEAD |
   |---|---|---|
   | D22 | founder's **email address as their name**, every install | `Pages/Setup` asks **"Your name"**; `moderatorName` required at the door — the email fallback carries a comment saying the door makes it **dead** |
   | D23 | two pages both headed "Members" | `Pages/Directory` heads **"Who belongs"**; `Pages/Members` heads "Announcements" |
   | D24 | Approve and Decline touching | `Members/RequestRow` sets `columnGap: var(--space-3)` |

   🔴 **This row read `open` for two days after the artefact was fixed.** The fixes landed under
   TPL-002 / DEF-011 commit messages, so no commit ever said "T6" and nothing re-derived the row.
3. ⬜ **T3, the category question.** Needs Richard. Its constant lives in `ProjectTemplate.ts` —
   ✅ **checked 08-29: clean in the tree, and P77's last commit there (`2cb89446`, SBR-003) has
   landed.** Confirm P77 is done with it before starting, not just that Richard has ruled.

🔴 **Do not start new template behaviour work to fill the gap.** s4's ruling stands: the next
template is blocked on the first one being published and looked at by the person who will publish it.

## ⚠️ Two things about the phase-80 hand-off

- **Nothing was re-authored there.** `DEF-018`–`DEF-025` are a carry table pointing back at this
  register, the same pattern phase 80 already uses for phase 76 — *a second copy of a task drifts
  from the first*. A session picking one up must read the row here.
- **DEF-018/DEF-020 and DEF-022/DEF-023 look like two pairs sharing a cause** (the layout system
  failing silently; a cloud function's model of its own world). Left **unmerged on purpose**:
  nobody has read either pair against each other at the source, and a wrong merge costs more to
  unpick than a right one costs to make later.

## 🔴 Traps this session paid for

- 🔴 **A phase name in an owner cell is `NONE` in disguise, and it survives every check the word
  `NONE` would fail.** Both errors this session were this shape. A sweep grepping for unowned rows
  finds "phase 78" and moves on.
- 🔴 **A scan of the form "from this heading until pattern P" attributes the NEXT row's P to any row
  that simply lacks it.** Reading the eleven rows' `Side:` lines this way reported D22–D24 as
  `product` — they have no such line at all, and the scan ran on into a later section. It had been
  about to send three template fixes into a product-only phase. ✅ **The table was right and the
  clever reading was wrong**; and the failure direction is *looking complete*.
- 🔴 **A relayed conclusion decays into an assignment.** "Phase 80 was created by a register sweep"
  → "phase 80 owns the register sweep" → eleven rows parked. Nothing reddens, because the owner is
  asserted in one file and would have to be honoured in another.
- 🔴 **Derive counts with a command and paste the output.** Three counting errors in this table's
  short life: s15's *"twelve"* (from the sections), the *"eight"* the table would have given, s16's
  *"ten"* beside a list of eleven. The command is now in the register, and it runs.
- 🔴 **A checker that reads a field's history as its value overcounts exactly the rows just fixed.**
  The first run returned **14**, matching the *"(was `NONE`, s17)"* annotations the flips had just
  added. Match the owner cell's **first token**.
- 🔴 **Looking for one delivery path's evidence in the other's artefact finds nothing, and the
  nothing looks like the bug.** s17 read `site-builder.content.json`'s missing `metadata.designTokens`
  as D10 surviving in the second template. It is **correct**: the site builder is **embedded**, so
  `site-builder.template.ts:105` puts the tokens on the `ProjectTemplate` record and
  `EmbeddedTemplateProvider.install` writes them at install. The members' area is **curated**, so
  its palette must be *in* the directory. ✅ **Name the mechanism for each half before reading
  either one's absence as a finding.**
- ⚠️ **Measuring parameters is not grading appearance.** D10 is closed on 555 colour parameters and
  1,197 token references — evidence the generator goes *through* the design system, which is all
  the row alleged. It is **not** evidence the result looks good. That judgement is Richard's and
  the instrument is a screenshot.

## The two harnesses, and when to run them

**The drive** — a gate, runs in the suite:

    npx jest --config packages/nodegx-backend/jest.config.js \
      --runTestsByPath packages/nodegx-backend/tests/tpl002-account-drive.test.ts

**The look** — asserts almost nothing, writes pictures. `.look.ts` so no suite runs it. Run it
whenever you touch the account page, the unsubscribe page or `BAND_NAV`:

    npx jest --config packages/nodegx-backend/jest.config.js \
      --testMatch '**/tests/**/*.look.ts' --runTestsByPath \
      packages/nodegx-backend/tests/tpl002-account.look.ts

`TPL002_OUT=` chooses the directory (default `/tmp/tpl002-look`). It writes a PNG, the page text and
`<label>-<w>.band.txt` — every nav button's rect grouped by its top edge, which is what says how many
rows there are and whether anything is clipped. ✅ **The band was looked at in s15 and is right**: at
1280 five across with "Your account" alone on row two, nothing clipped; 2×3 at 390.

`tpl001-rows.look.ts` is still the only way to see the **lists** with content in them, and is
unchanged. 🔴 **It is also the instrument D10's closure does not have** — see the last trap above.

⚠️ **A member's band has THREE items, not six.** Three of the six are `moderatorOnly` and ship
`mounted: false`. A look taken only as a member measures the wrong screen.

## Richard's rulings, still standing

- **Appearance is an acceptance criterion, graded BEFORE the behaviour work, by looking at it.**
- **D39, 2026-08-29: the unsubscribe page stays one sentence.** Named nothing, links nowhere.
  ✅ Pinned in `tpl001Template.test.ts` §5, so a later session cannot undo it by agreeing with it.
- **Seeding, 2026-08-29: close the delete gap, seed nothing.** AC6's designed empty state stands.
- **Opt-in, never opt-out** — UK and EU charities and congregations.
- **Scope: A + B + all of C, with C done by phase 80.**
- **Templates exist to surface product defects** — findings go in the register **as work with an
  owner**, never as notes. 🔴 *A finding is not filed until it has a line in the table* — and
  🔴 *an owner that names a phase rather than a task is not an owner.*
- **Privacy**: `requestAccess` keeps the non-answer. **Publishing**: not yet. He drives it first.
