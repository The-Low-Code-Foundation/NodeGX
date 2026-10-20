# TWO-007 — Two tutorials

**Opened 2026-10-14.** **Depends on TWO-003 and TWO-005 (written alongside them).** **Status: 📋 not started; s17 (2026-10-15) measured what a tutorial would stand on and stopped (§6); s18 (same day) built two of the four missing grounds after Richard ruled them (§7).** Kind: copy.
**Model:** Opus.

## 1. The person sentence

> **The builder opens the shop's tutorial, follows it, and by the end understands how the shop works and has made it his:
> his products, his currency, his WhatsApp number, his colours, online. The same for the community app.**

## 2. What exists

- The builder asked for a tutorial or a template he can review and adapt.
- The content-authoring skill (every sentence a person outside the project reads goes through it).
- The templates' own `docs/world/` (TWO-001), readable in plain words.

## 3. What to do

For each template, one tutorial in the template folder:

1. **How it's made:** the world in plain words, the pages, where the data lives, how an order (or a post) travels.
2. **Make it yours:** adding sellers and giving them logins, countries, currencies and rates, the ways to pay per
   country, the WhatsApp number, the Paystack and Flutterwave keys (where they go and where they must never go); for
   the community app, admins, the community rules, importing and writing devotionals, colours and logo.
3. **Put it online:** the hosting route chosen in README §5, step by step, with what it costs.
4. **What it doesn't do yet** (slice 2 items), so he knows where the edges are.

Written for a builder who knows no-code tools but not NodeGX, reading on a laptop. Each step says what he should see.

## 4. Acceptance criteria

1. Both tutorials pass the content-authoring skill's checks.
2. A fresh session (or a stranger agent) follows each tutorial on a copy and ends with a customised template, steps
   that failed fixed in the tutorial.
3. The builder's words on them, in TWO-009.

## 5. Not this task

Video. Translations.

## 6. What a tutorial stands on (s17, 2026-10-15, measured by reading)

s17 took this task as the phase's one unblocked task, then measured each step a builder would follow before writing any. Four
steps have no ground under them yet. The tutorials wait for these, not for the writing.

1. **The schema never reaches his backend** (filed **P121-TWO007-SCHEMANOWAY**, high, needs a ruling). Opening a
   template and starting a backend installs its policy and deploys its functions. Nothing applies `backend/schema.json`,
   so R11's unique index on a payment's reference never exists. Two other templates carry a terminal script
   (`tools/setup-backend.mjs`). Ruling: the editor applies it at start, or each template carries the script.
2. **The marketplace's name is written into about 15 nodes** ("The marketplace": three places in the sources, `shell`
   in `two003Pages.ts`, `/Shop/Top` and Home's title in `two003Shop.ts`, copied into every staff page). The gram asks
   for its name at setup and keeps it in a `Community` row; the marketplace should do the same (a `Marketplace` noun,
   `setUpMarketplace` taking the name, one loader that shows it). s17 started that world change. The auto-mode
   classifier refused the edit to `templates/marketplace/nodegx.security.json` ("Modify Shared Resources"), so the
   noun was taken back out, byte for byte, and nothing changed. Needs Richard to allow the policy edit or make it.
   No shop logo slot either (logos are per seller).
3. **No build he can download runs either template.** Photos, live updates, the Paystack hook and the upload changes are
   product code that isn't committed, so no release has them (the editor is 0.4.1, tagged 2026-10-14). Committing and
   releasing are Richard's.
4. **Putting it online has no route for a non-developer.** OWN-016's `ship-to-vm.sh` is a terminal and SSH runbook, and
   installs no policy, no schema and no backups. With `--no-admin`, the gram's email and sign-in setup would go through
   a tunnel. The Training template's route is nexus-1 specific. TWO-011 (Coolify) is not started.

What is solid: opening a copy of the folder ("Open project…" opens it in place and writes `.mcp.json`, `CLAUDE.md` and a
`.gitignore` block into it); Backend Services → + → Run one on this computer → Create → Start backend → Set active;
"Manage data & settings ↗" for the admin app (Secrets, Email, Sign-in); the colours as design tokens in
`nodegx.project.json` (`--primary`, `--secondary`, `--whatsapp`), no raw hex in a component; WhatsApp numbers per seller;
the own currency as the one worth 1 on the Rates tab (WORLD.md's "set once when the marketplace is set up" should say
that). The gram's `docs/SETTING-UP.md` already covers its in-app setup.

## 7. Two of the four built (s18, 2026-10-15)

Richard ruled both the same evening (README §4, R12 and R13).

1. **The schema reaches the backend (R12, built).** When the editor starts a backend for a project, it creates each
   collection the project's `backend/schema.json` declares that the backend doesn't have, and never changes one that
   exists (`noodl-editor/src/main/src/local-backend/project-schema.js`, called from `BackendManager.startBackend`).
   All four templates that ship a schema land whole; R11's rule now holds on a builder's backend. Measured on a real
   backend: without it, a second payment with the same reference was kept and a provider the world doesn't name was
   accepted. Detail and readings: bug P121-TWO007-SCHEMANOWAY. **Driven in the running editor in s19** (§8).
2. **The marketplace's name is its own (R13, built).** The world has a `Marketplace` (one row: its name, with a
   history), the policy lets anyone read it and nobody write it, `setUpMarketplace` takes the name (60 characters at
   most, refused rather than cut) and the set-up page asks for it. Every page's bar shows it: `/UI/Brand` in the staff
   bar, `/Shop/Top` in the shop's, and the shop's browser tab, all from one app-wide variable that a page reads on
   mount. **s19 built the admin's rename** (§9).
   Specs: MCP `two003Name.test.ts`; backend `two-003-sellers` (two R13 checks) and TWO-001's policy spec; drives
   `two-003-drive` (set-up through the page, the name in the bar) and `two-003-shop-drive` (the bar and the tab).
3. **Still missing:** a release carrying this phase's product code (Richard's) and a hosting route for a non-developer
   (TWO-011). The tutorials still wait on those two.

## 8. R12 driven in the editor, and what a builder would have met first (s19, 2026-10-16)

The tutorial's first steps, walked in the dev editor with a throwaway profile on a copy of the marketplace:

1. **Open the template.** The preview said "No HOME component selected" (P121-S19-NOHOME): neither of this phase's
   generators named the home. Fixed in both and regenerated; the copy then opened on the shop's home page.
2. **Backend Services → + → Built-in → Run one on this computer → a name → Create → Start backend.** R12 added all
   21 collections (unique index on a payment's reference built), pushed the 19 functions, installed the policy; the
   preview read the shop from it. A second payment with the same reference was refused (409). Restarting added
   nothing and kept the row. Detail in bug P121-TWO007-SCHEMANOWAY.
3. What the tutorial will have to say, because a builder meets it: opening shows "This project was updated for
   NodeGX 0.4" and a `….before-0.4` folder appears beside the project (every template's, not ours); the badge reads
   26 warnings on the marketplace while the door raised none on it; what they are was not read (next session).

Also met: HEAD's editor dev build couldn't start Electron (P121-S19-PLACEHOLDERTYPE, P18's line; fixed in the
working tree). Left for the tutorials: the release and the hosting route (§7.3).

## 9. The admin renames the marketplace (s19, 2026-10-16)

- **`nameMarketplace`** (`role:admin`; `two003Cloud.ts`, `RENAME_MARKETPLACE_SCRIPT`): saves the one `Marketplace`
  row and writes its history (from, to, who). The same name again changes nothing and writes no history. Empty or
  over 60 characters is refused in words, never cut, as at set-up; the name is trimmed.
- **The page** `/Pages/Admin/Name` at `admin/name` (`two003Pages.ts`, `NAME_PAGE`): reached by **Rename the
  marketplace** on the admin's Sellers page, not a seventh tab. The admin's only (`NAME_PAGE_LOAD`); the field starts
  with the name in the bar; on Save the bar takes the new name at once through the shared variable, and every other
  page reads it on its next mount. An old refusal goes when Save is pressed again (the shots showed it under
  "Saved.", fixed).
- **Settled here, not asked:** the world says the name is given "when it is set up" (R13) and says nothing of a
  rename, so the world files are unchanged. Gate 4 (TWO-009) or Richard can overturn it.
- **Readings:** MCP `two003Name` 18/18 (6 page checks, 9 mutants red, 4 of them new), with the marketplace's other
  MCP specs and the budget gate **173/173**; backend `two-003-sellers` **33/33** (4 new: renamed with history, same
  name no history, refused in words, a stranger and a seller's staff refused), with the marketplace's other backend
  specs and R12's **129/129**; `TWO003_MUTANTS=1 npx jest tests/two-003-name-mutants.test.ts` **8 of 8 red** (seven on
  the script, one on the policy rule); drives `two-003-drive` 1/1 (phone renames through the page, a too-long name
  refused, the tablet's browser reads the new name; the check that the old refusal is gone was red before the fix),
  then shop, checkout, orders, enquire and Paystack **1/1** each; `tsc --noEmit` 0 in `noodl-mcp` and the backend's
  tests; census only the marketplace moved (35,273 code lines), `--check` fresh. Shots looked at: one fixed.
- **Met on the way:** the admin's sign-in after a staff member's landed once on the staff's Orders page (one red run
  of three; filed P121-S19-SIGNINRACE, not investigated).
