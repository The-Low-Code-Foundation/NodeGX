# Phase 121 — next session prompt

**Written 2026-10-15 by Opus 5.5, after s10 (TWO-004 step 5 for Paystack: the webhook; then R11 and the builder's
setup page); s11 drove the admin hook (TWO-004 §10) and built TWO-005 slice 1 (TWO-005 §6); s12 built
P121-TWO001-MEMBERSPHOTO and TWO-005 slice 2, the feed (TWO-005 §7); s13 built slice 3, profiles (TWO-005 §8); s14
built slice 4, prayer requests and the sections (TWO-005 §9); s15 built slice 5, moderation (TWO-005 §10); s16 built
slice 4b, testimonies and events (TWO-005 §11); s17 measured TWO-007 and stopped; s18 built R12 (the editor adds a
project's schema) and R13 (the marketplace's own name), TWO-007 §7; **s19 (2026-10-16) drove R12 in the running
editor, fixed both templates' missing home, and built the admin's rename, TWO-007 §8–§9**, see §1/§2/§2b/§3/§5/§6.**
HEAD was `2f9b16402`; nothing of this phase is committed (§5). Read BRIEF.md, the README (§2 what each app holds, §3 the tasks, §4 the
rulings), LOOK.md, then TWO-003 §6–§11, **TWO-004 §7–§9** (what s3–s10 built and measured) and the task you take.

**R1 first: none of the builder's messages go into this repo** (no quotes, no names, no addresses: not his, not the
ministry's, not its app's). Requirements in our words only. Verbatim material lives in
`~/vscode_projects/nodegx-private/builder-briefs/`.

## 1. Built vs driven, per task

| task | state | note |
|---|---|---|
| TWO-000 | ✅ | the builder's answers, 2026-10-14 |
| TWO-001 | ✅ | both worlds → `templates/{gram,marketplace}/backend/schema.json` (byte-gated) + `nodegx.security.json`. s6 moved the way to pay to the order part (TWO-003 §9.1); s7 gave the order part `cancelledReason`, and paid on delivery no paid step (§10.1); **s8 gave the enquiry `answeredAt`** (§11.1); **s14 gave the gram's post `prayedCount`** (TWO-005 §9.1); **s18 gave the marketplace a `Marketplace` (its name, R13)** |
| TWO-002 | ✅ | gate 3 passed round 1 for both (2026-10-14) |
| TWO-003 | 🟡 | **slices 1–5 built AND driven** (s3–s8): sellers and the admin; the catalogue; the basket and the checkout; orders (AC2 met); **enquire: a buyer's message from the product page, a seller's Enquiries tab, marked answered, the admin reads every one**. Slice 6 is TWO-004. AC3–AC6 are met slice by slice; gate 4 (TWO-009) is what's left beside slice 6 |
| TWO-004 | 🟡 | step 1 done (R8 ruled A); s9: step 2 done (§7: one Paystack business per country), step 3 built, specced and driven against a stand-in (§8). **s10: step 5 for Paystack built and specced (§9): the webhook trigger's `hmac-sha512` scheme (a product change) and `paystackEvent`; the drive's stand-in now sends the webhook too.** **s11: the admin app's hook driven (§10)**. Step 4 needs Richard's test keys (§8.6); step 5's Flutterwave half waits for step 6; steps 6–8 not started |
| TWO-008 | ✅ | the Wappler comparison |
| TWO-005 | 🟡 | **s11: slice 1 built, specced and driven** (TWO-005 §6): join (13 or older), sign in by emailed link, wait; the admins' queue: Let in (emailed) or No (blocked); make admin. **s12: MEMBERSPHOTO built, then slice 2 built, specced and driven in two browsers** (TWO-005 §7): posts with members-only photos, hearts, comments, counts live (AC2 met). **s13: slice 3 built, specced and driven in two browsers** (TWO-005 §8): profiles (members-only photo, bio, the grid), Edit profile, names open profiles. **s14: slice 4 built, specced and driven in two browsers** (TWO-005 §9): prayer requests, 🙏 I prayed, who prayed for the asker only (W4), the Prayer page, the sections (bar / rail). **s15: slice 5 built, specced and driven in two browsers** (TWO-005 §10): report a post or a comment, take your own down, the admins' Reported / Hidden / Blocked, Look (hide with why, bring back), Block / Let them back on a profile, the rules written by an admin; AC3 and AC4 met. **s16: slice 4b built, specced and driven in two browsers in two time zones** (TWO-005 §11): testimonies, events with a day and a start time, four chips, three profile counts. Next: slice 6 waits on SRK-005 |
| TWO-007 | 📋 | not written. s17 found four missing grounds; s18 built two (R12 the schema reaches the backend, R13 the marketplace's name), TWO-007 §7; **s19 drove R12 in the editor (§8; the templates opened on no home: fixed) and built the admin's rename (§9)**. Left: a release with this phase's product code (Richard's), a hosting route (TWO-011) |
| the rest | 📋 | TWO-006, TWO-009, TWO-010 (its TWO-005 slice 1 dependency is met), TWO-011 |

**Built-but-undriven: none.** s11 drove the admin app's Paystack hook (`nodegx-backend/tests/two-004-admin-hook-drive.test.ts`,
TWO-004 §10) at 1024×640 and 1440×900, not 390: the admin app has no narrow layout (P121-TWO004-ADMINNARROW). The
admin bundle is built by jest's global setup. Everything else slices 1–5 have, paying by card and the webhook, was
driven in the rendered app at both sizes. **Paying by card is driven against a stand-in for Paystack, never Paystack
itself**: step 4 is that.

## 2. How the marketplace is made now (read before changing it)

- `npm run template:marketplace` regenerates `templates/marketplace/` through the MCP door. It owns ONLY
  `components/` and `nodegx.project.json`; `docs/`, `backend/schema.json` and `nodegx.security.json` are hand-written
  and survive. Sources, all in `packages/noodl-mcp/tests/`: `two003Cloud.ts` (slice 1's functions, `scripted()`),
  `two003Checkout.ts` (slice 3's functions), `two003Pages.ts` (slice 1's pages and the shared helpers),
  `two003Shop.ts` (slice 2's buyer pages and the `SHOP` prelude; **the product page's enquiry form is placed here**),
  `two003Basket.ts` (slice 3's buyer pages), `two003Admin.ts` (slice 3's admin tabs and pages), `two003Orders.ts`
  (slice 4: `movePart`, the Orders page, a seller's tabs, `STEPS` and `PAID_AT_THE_DOOR`), **`two003Enquire.ts`
  (slice 5: `sendEnquiry`, `answerEnquiry`, the form's scripts, the Enquiries page)**, **`two004Paystack.ts`
  (`startPayment`, `checkPayment`, their keys; the order page's Pay box is placed in `two003Basket.ts`)**, `two003Look.ts`,
  `two003Template.ts` (the assembler: function list, `FUNCTION_RULES`, page order, `SHARED_ON_PURPOSE`).
- **The router opens on the first page the plan registers**: the shop's home page. Keep it first.
- **The marketplace's name is its `Marketplace` row (R13, s18)**, never words in a page. `setUpMarketplace` takes
  `marketplace` (60 at most, refused not cut): every spec or drive that sets one up passes `marketplace: 'Market
  Square'`. Pages show it through the app-wide variable `NAME_VARIABLE` (`marketplaceName`, in `SHARED_ON_PURPOSE`),
  read by `NAME_LOAD` in `/UI/Brand` (the staff `shell`'s bar) and `/Shop/Top`; Home's Page title is wired to it.
  `nameNodes`/`nameWires` in `two003Pages.ts` for any new bar. A seeding drive makes the row with the master key.
- **The admin renames it** (s19): `nameMarketplace` (`role:admin`, `RENAME_MARKETPLACE_SCRIPT` in `two003Cloud.ts`)
  and `/Pages/Admin/Name` (`NAME_PAGE`, `NAME_PAGE_LOAD`, `NAME_GATHER` in `two003Pages.ts`), reached by "Rename the
  marketplace" on the Sellers page (no seventh tab). Mutants: backend `two-003-name-mutants.test.ts` (8).
- 🔴 **Both generators call `set_project_settings { home: 'App' }`** after the plan (s19, P121-S19-NOHOME): the
  editor opens a project on `rootNodeId` only. Each template spec checks it. The render harness picks the page itself,
  so no drive can see a missing home: only the editor does.
- **After sign-in, the admin lands on Sellers and a seller's staff on Orders.**
- **The steps live in one place**: `STEPS` and `PAID_AT_THE_DOOR` in `two003Orders.ts`. Paid on delivery skips `paid`.
- **Never edit `templates/marketplace/components/` by hand**: `two003Template.test.ts` compares it with a fresh build.
- A new function needs its `call` rule in the policy's `functions` block AND in its slice's `*_FUNCTION_RULES` (the
  gate compares the policy with `FUNCTION_RULES`). A buyer's function is `scripted(…, open = true)` and `public` with a
  rate limit.
- **The admin has six tabs now.** A phone scrolls the bar sideways (`mk-tabs-many`); `TABS_LOOK` brings the page's tab
  into view with DOM code (P121-TWO003-SCROLLINTOVIEW). A seventh tab makes it worse; think before adding one.
- **The door refuses hand-copied siblings** (`repeated-sibling-subtree`): alike boxes become one leaf in a For Each.
- **A tab or button that must not stretch needs `width: auto`** as well as `flex: none`. Check what is ON SCREEN.
- **The door refuses a wire to a Function input the script never names.**
- **A row field must not be one of a Noodl Object's own names** (`on` was).
- **An app-wide variable shared by design goes in `SHARED_ON_PURPOSE`** (s8 added `enquiriesChanged`). The door raised
  **no warning** on the template after s8; a new warning is news.
- After any change to the template's scripts, **rerun `npm run ontology-census`** and check only the marketplace moved
  (32,210 code lines after s8). A new detector candidate needs its verdict in `phase-116…/kinds.hand.json` first (s8:
  `sendEnquiry.digits@count`, no).
- **A new script goes into a spec that compiles it** (slice 5's in `two003Enquire.test.ts`). **No backslashes in a
  script**: it is a template literal (s8 wrote a no-break space as `String.fromCharCode(160)`).
- **`text(x, n)` cuts before you check**: validate the whole value, then cut. Slice 5 refuses what is too long instead.
- **Through REST an unset date reads `null`**, not missing (s8's first spec run).
- The recipe and its traps are in memory `tpl-fn` and TWO-003 §6.1.
- **Paystack's keys are per currency**: `PAYSTACK_SECRET_KEY_GHS`, `…_NGN` (a Paystack business charges only its own
  country's currency). `PAYSTACK_API_URL` (a secret) points both functions at the stand-in
  (`nodegx-backend/tests/helpers/fake-paystack.ts`, which also serves a checkout page a drive can click). **The amount
  is always the store's**: a part's subtotal plus delivery, ×100.
- **A card payment is marked paid only by `checkPayment`**: `movePart` refuses it, the seller's page offers no button.
- **A page script never reads its own `Outputs` back** (the harness answers a read with a function; s9's first run).

- **Paystack's webhook is a trigger, not a template file** (no template carries `triggers.json`): per business, a
  webhook trigger → `paystackEvent`, scheme `hmac-sha512`, its secret that business's key, slug `paystack-ghs`; the URL
  goes into Paystack's dashboard. The specs and the drive create them through `/admin/triggers`.
- **`paystackEvent` is `call: nobody`**: a trigger fire doesn't pass the `/functions` gate, HTTP callers do.
- **`checkPayment` and `paystackEvent` are one script** (`checkPaymentScript(param, pick, webhook)`): change one,
  change both. **A payment's reference is one payment (R11)**: the world's first `rules.json` makes it a unique index;
  a check whose row the store refused answers from the row that won and moves nothing.
- **The builder's setup page is `templates/marketplace/docs/PAYING-BY-CARD.md`** (hand-written, survives regeneration).
  Change it when the setup changes; it went through the content-authoring skill's offline checks.
- **The stand-in can order a race**: `fake.hold(ref)` / `held` / `release(ref, 'first'|'last'|'all')`, `verifies(ref)`
  counts asks, `webhookTo(key, url)` makes Pay post Paystack's signed event. 🔴 A race test where one side always
  arrives first proves one ordering only (s10: the page always beat the hook until the stand-in held both).
- 🔴 **A spec that runs the backend in-process must never `execFileSync` at it** (curl, bash): it deadlocks. Async.

## 2b. How the community app is made (s11)

- `npm run template:gram` regenerates `templates/gram/` through the door (`two005Template.ts`, the marketplace's
  generator pointed at the gram). It owns `components/` and `nodegx.project.json`; `docs/` (the world and
  `SETTING-UP.md`), `backend/schema.json` and `nodegx.security.json` are hand-written. Sources in
  `packages/noodl-mcp/tests/`: `two005Cloud.ts`, `two005Pages.ts`, `two005Look.ts`. Specs: `two005Template.test.ts`
  (drift, policy = functions, every script compiles, routing and queue against fixtures); backend
  `two-005-join{,-mutants,-drive}.test.ts`.
- **Welcome is the router's start** (first page registered). A refused sign-in link comes back to it with the
  backend's words, shown through a Sign In With node.
- **Members sign in by an emailed link** (Request Magic Link, `redirect` = the app's origin; the backend's allow-list
  must hold it). The drive catches the mail with `service.getMailerForTesting().setTransportForTesting`, opens the
  link on the backend's "Sign in to <backend name>" page and presses Sign in.
- 🔴 **`Noodl.Users.Current` decides "signed in?" before asking `whoAmI`**: a stranger's page must not make a request
  the backend refuses (a red console line for every visitor). The script harness (`two003Run.ts`) has a `current`
  option for it.
- The door raised **no warning** on the gram after s12; a new one is news. Shared on purpose: `membersChanged`,
  `membersNote`, `feedChanged`, `postPhotoRemoved`.
- **Slice 2 (s12):** functions `two005Feed.ts` (`sharePost`, `heartPost`, `commentOn`; `PHOTO_READERS`, the limits),
  pages `two005FeedPages.ts` (Feed, New post, `/post/{postId}`, `/Feed/{PostCard,Photo,NewPhoto,CommentRow}`; the
  slice-1 placeholder feed is gone). Specs: MCP `two005Feed.test.ts` (checks by name + 22 page mutants); backend
  `two-005-feed{,-mutants,-drive}.test.ts`; the mutant copy is `tests/helpers/gram-mutant.ts` (both mutants files).
- 🔴 **Every photo is uploaded with Readers `role:member, role:admin`** and shown through `Noodl.Files.sign` (links
  kept on the page in `Component.Object` until a minute before they run out). `sharePost` reads each photo's `_Files`
  row (`owner`, `readers`, `contentType`): **a record read never carries a row's ACL**, hence the `readers` column.
- 🔴 **`Noodl.Records` takes one key per filter**: combine with `{ and: [ … ] }` (s12's first heart run).
- 🔴 **After changing `noodl-viewer-react/src` or `noodl-runtime/src`, rebuild the viewer bundle** before a drive:
  `cd packages/noodl-viewer-react && npx webpack --config webpack-configs/webpack.viewer.prod.js` (s12 did three times).
- **Slice 3 (s13):** function `two005Profile.ts` (`editProfile`; `MOST_NAME`, `MOST_BIO`), pages
  `two005ProfilePages.ts` (`/Pages/Member` at `member/{memberId}`, `/Pages/EditProfile`, `/Profile/Tile`); faces on
  cards and comments (`faceNodes`/`faceWires`, `faceOf` in `FEED_READ`); the feed's Your profile. Specs: MCP
  `two005Profile.test.ts`; backend `two-005-profile{,-mutants,-drive}.test.ts`.
- 🔴 **W1's photo check is ONE function, `photoProblem`, in the feed's prelude**: `sharePost` and `editProfile` both
  call it. Change it once; both mutant files grade it.
- 🔴 **`fn(…, quietIns)`'s fifth argument unticks Run On Value Change**: only for a script a button runs. A script
  with no Run wire and every input quiet never runs, and the door says nothing (P121-TWO005-NEVERRUNS, s13).
- **A tile is a Button laid over its photo** (`.gm-tile-hit`): a photo has no name to put in a Button
  (GROUPKEYBOARD).
- **Two people in a drive = two nested `withRenderedPage`** (two Chromes, two origins, two sessions; `openTab` shares
  one profile, so one sign-in). Put both origins on the magic-link allow-list. The reaper only kills orphans.
- **Slice 4 (s14):** function `two005Prayer.ts` (`prayFor`), `sharePost`'s `kind` (`SHARED_KINDS` in `two005Feed.ts`),
  pages `two005PrayerPages.ts` (`/Pages/Prayer`, `/UI/Nav`, `NAV_TABS`); the card's prayer half lives in `cardsOf` and
  `/Feed/PostCard` (`two005FeedPages.ts`), New post's chips there too (`NEW_POST_KIND`, `?kind=prayer`). Specs: MCP
  `two005Prayer.test.ts`; backend `two-005-prayer{,-mutants,-drive}.test.ts`.
- 🔴 **The world's Post has `prayedCount`**, written by `prayFor` only when it moves (W4 hides the rows from every other
  member, so nobody else can count). `Prayed` reads: your own, the rows on your own requests, an admin all.
- **The sections:** `gramShell(…, nav)` places `/UI/Nav`; the page wires `out-meId` → `meId` and `out-inside` → `show`
  (`navWires`). A new page that has them must set `Outputs.inside` once the reader is in. The feed's "Your profile" is
  gone: drives press `◯\nProfile` on a phone, `◯ Profile` on a tablet (the label is mark, newline, word).
- 🔴 **A card's look per kind is a wired class** (`kindClass` → `pcRoot.cssClassName`). One card for every kind.
- **Slice 5 (s15):** functions `two005Moderate.ts` (`report`, `hide`, `block`, `writeRules`; `POST_REASONS`,
  `COMMENT_REASONS`, `TAKEN_DOWN`, `ADMINS_ONLY`, `POLICY_READS`), pages `two005ModeratePages.ts` (`/Pages/Report`,
  `/Pages/Admin/Look`, `/Admin/QueueRow`, `/Admin/ReportLine`, and **the queue and the rules page, moved here from
  `two005Pages.ts`**; `QUEUE_LOAD` stays there, slice 1's spec grades it); a post's page and each comment carry Report /
  Take down / Reports and hiding (`two005FeedPages.ts`, `REPORT_PAGE`, `LOOK_PAGE`); Block and Let them back on a
  profile (`two005ProfilePages.ts`). Specs: MCP `two005Moderate.test.ts`; backend `two-005-moderate{,-mutants,-drive}.test.ts`.
- 🔴 **Hidden = the row's ACL** (`{"role:admin": {"read": true}}`), written by `hide` and by `block` on all a member
  wrote; brought back = `{"*": {"read": true}}` (the policy still decides). **A row's ACL can't be cleared**: `acl:
  null` is dropped and answers 200 (P121-TWO005-ACLNULL). A page that hands a member a hidden row is impossible, so a
  page mutant that "shows a hidden post to a member" is equivalent: the backend spec grades the ACL.
- 🔴 **A Dropdown with wired Items needs `value: ''`** or its Value says "Option 1" until someone picks
  (P121-TWO005-DROPDOWNSTALE). Its own `placeholder` is the "Choose…" line; don't add an item for it.
- **A Text Input's `cssClassName` lands on the `<input>`/`<textarea>` itself**: style `textarea.gm-x`, not `.gm-x textarea`.
- **An admin opens a hidden post on its page** (told why); members get "isn't in the feed". The queue reads the newest
  thousand posts, comments and reports.
- **Slice 4b (s16):** `sharePost` takes the world's four kinds (`SHARED_KINDS`, `WORDS_NEEDED`, `MOST_EVENT_AHEAD_DAYS`
  in `two005Feed.ts`); an event's `eventOn` is an ISO date-time string, kept as a UTC Date, from now to 366 days on.
  Pages in `two005FeedPages.ts`: `KIND_NAMES` (the pill), `NEW_POST_SAYS` (each kind's words), `EVENT_TIMES`, the
  four chips, **`/UI/DatePicker`** (the library's, `datePicker.ts`, ids `gdp…`); the profile's counts are
  `/Profile/Count` in a For Each (`two005ProfilePages.ts`). Specs: MCP `two005Kinds.test.ts`; backend
  `two-005-kinds{,-mutants,-drive}.test.ts`.
- 🔴 **A card leads with its words when it's a prayer request, a testimony, or has no photo** (`wordsFirst`). A post
  with photos keeps the picture's order.
- 🔴 **An event's time is an instant shown in the reader's zone**: the drive sets Ann to Lagos and Bob to Accra with
  `Emulation.setTimezoneOverride` (the shot client's `send`). The MCP spec pins `process.env.TZ = 'Africa/Lagos'`.
- 🔴 **A Function's ports must be named in its code**: `Outputs[k + 'Ink']` is refused by the door. Write each.
- The census's count candidate is "a `.length > N` near a create": moving code apart can drop one and leave its hand
  verdict naming nothing (`--check` red). Remove the verdict, regenerate, diff.

## 3. Readings

**s19 (2026-10-16, working tree on `2f9b16402`)**, detail in TWO-007 §8–§9 and bugs P121-TWO007-SCHEMANOWAY,
P121-S19-NOHOME: **R12 driven in the dev editor** on a copy of the marketplace (throwaway profile): Backend Services →
Built-in → Run one on this computer → Start: "21 added, 0 already there", Payment's unique index built, a second
payment with one reference refused 409, restart "0 added, 21 already there", 19 functions pushed, the preview read the
shop. Template specs (both, with the new home check: red before regeneration) **13/13**; MCP marketplace specs and
budget gate **173/173**; backend marketplace specs with R12's **129/129**; rename mutants **8 of 8 red**; DEF-038
**38/39** (nightbook); drives `two-003` (with the rename), shop, checkout, orders, enquire, Paystack **1/1** each
(`two-003` once red at the admin's sign-in after the staff's, P121-S19-SIGNINRACE, then green); `tsc --noEmit` 0 in
`noodl-mcp` and the backend tests; census only the marketplace moved, `--check` fresh. **Not run: the gram's backend
specs and drives (its only change is `rootNodeId`); the editor's typecheck and test suites; the full conformance suite.**

**s18, R12 and R13 (2026-10-15, working tree on `8ca7aef05`)**, detail in bug P121-TWO007-SCHEMANOWAY and TWO-007 §7:
backend `p121-r12-project-schema` **12/12** (a real backend, the supervisor's real `request`; with its control),
editor `tests-main/local-backend` **63/63** (the new wiring spec 6/6); hand mutants on the schema step 4 of 4 red (the
call dropped: 5 of 6 tests red), on `setUpMarketplace` 4 of 5 red and the fifth equivalent (its guard removed); the
marketplace's backend specs with R12's **125/125**; its four mutant suites **78 of 78 red**; MCP budget gate, Paystack,
shop, basket, orders, enquire, template, `two003Name` (new) and DEF-038 **204/205** (nightbook); drives `two-003`,
`two-003-shop`, checkout, orders, enquire, Paystack **1/1** each, shots looked at (the name in every bar and in the
shop's tab); census: the marketplace moved (34,339 lines, one history collection, its verdict carried) and the gram's
17 lines from s16's last regeneration, `--check` fresh; `tsc` 0 in `noodl-mcp` and the backend tests. **Not run: the
editor's typecheck (main is JS); the editor itself (R12 not driven in the running app); the full conformance suite.**

**s16, TWO-005 slice 4b (2026-10-15, working tree on `3f4c5f959`)**, detail in TWO-005 §11.4: MCP `two005Kinds`
**46/46** (33 page mutants red), with prayer, feed, profile, moderate, template, budget gate and DEF-038 **295/296**
(nightbook); backend `two-005-kinds` **6/6**, with the gram's six others **81/81**; mutants kinds + prayer + feed
**54 of 54 red**; drives kinds, join, feed, profile, prayer, moderate **1/1** each (0 px overflow); `tsc` 0 in
`noodl-mcp` and the backend tests; census only `gram` moved, one verdict removed, `--check` fresh. Shots looked at: one
fixed (TWO-005 §11.5). **Not run: the editor's typecheck; the full conformance suite.**

**s15, TWO-005 slice 5 (2026-10-15, working tree on `1f588e529`)**, detail in TWO-005 §10.4: backend `two-005-moderate`
**8/8**, with join, feed, profile, prayer and TWO-001's gram policy **75/75**; moderate mutants **36 of 36 red**; MCP
`two005Moderate` **70/70** (44 page mutants red), with feed, profile, prayer, template, budget gate and DEF-038
**249/250** (nightbook); drives moderate, join, feed, profile, prayer **1/1** each (0 console errors, 0 px overflow);
`tsc` 0 in `noodl-mcp` and the backend tests; census one verdict added, `--check` fresh. Shots looked at: four fixed.
**Not run: the editor's typecheck; the full conformance suite.**

**s14, TWO-005 slice 4 (2026-10-15, working tree on `24adf7fd4`)**, detail in TWO-005 §9.4: backend `two-005-prayer`
**7/7**, with join, feed, profile and TWO-001's gram policy **67/67**; prayer mutants **19 of 19 red**, feed + profile
+ join again **64 of 64**; MCP `two005Prayer` **43/43** (29 page mutants red), with feed, profile, template, budget
gate and DEF-038 **179/180** (nightbook); drives prayer, profile, feed, join **1/1** each (0 console errors, 0 px
overflow); `tsc` 0 in `noodl-mcp` and the backend tests; census only `gram` moved, `--check` fresh. Shots looked at:
three fixed. **Not run: the editor's typecheck; the full conformance suite.**

**s13, TWO-005 slice 3 (2026-10-15, working tree on `116dc7445`)**, detail in TWO-005 §8.3: backend `two-005-profile`
**8/8**, with join, feed and TWO-001's gram policy **60/60**; mutants feed + profile **42 of 42 red**; MCP
`two005Profile` **34/34** (21 page mutants red), with feed, template, budget gate and DEF-038 **136/137** (nightbook);
drives `two-005-profile-drive`, `two-005-feed-drive`, `two-005-join-drive` **1/1** each (0 console errors, 0 px
overflow); `tsc --noEmit` 0 in the backend tests and `noodl-mcp`; census one verdict added, `--check` fresh. Shots
looked at: two fixed. **Not run: the editor's typecheck; the full conformance suite.**

**s12, MEMBERSPHOTO and TWO-005 slice 2 (2026-10-15, working tree on `b06dbc76a`)**, detail in TWO-005 §7.4: backend
173/173 (files ×6, TWO-001 ×2, `two-005-join`, **`two-005-feed` 14/14**, preflight, realtime ×2, rate-limit tally);
feed mutants **23 of 23 red**; file-change hand mutants 6 of 6; runtime 155/155 (`realtime-transports` 92); conformance
for Subscribe To Changes and Upload File green (and red with Readers dropped); viewer 14 + 5; node spec 547/547;
CHR-007 8/8; MCP **238/239** (the red DEF-038's `templates/nightbook`); `two005Feed` 37/37 (22 page mutants red);
drives `two-005-feed-drive` and `two-005-join-drive` 1/1 each; census only `gram` moved (12,679 lines), one verdict
added, `--check` fresh; `tsc` 0 in backend (src + tests), contract, runtime, viewer, node spec. **Not run: the
editor's typecheck; the full conformance suite.**

**s11, TWO-005 slice 1 (2026-10-15)**, detail in TWO-005 §6.3: `two-005-join` **8/8**; mutants **22 of 22 red**;
`two005Template` **9/9**; the marketplace's MCP specs and budget gate **154/154**; TWO-001 policies **49/49**; the drive
**1/1** (0 px overflow, only the provoked console lines); DEF-038 38/39 (nightbook); census `gram` 8,428 lines, nothing
else moved, fresh; backend tests `tsc` 0.

**s11, the admin hook (2026-10-15)**, detail in TWO-004 §10.3: the drive **1/1** at 1024×640 and 1440×900;
`schedule` + `runs-view` 48/48; `triggers-http` + `webhook-verify` 26/26; admin app and backend tests `tsc` 0.

**s10 (2026-10-15, working tree on `d65a0b88a`)**, detail in TWO-004 §9.3:

- **The product change**, `nodegx-backend`: `webhook-verify`, `triggers-http`, `admin-app/schedule`, `triggers-registry`,
  `triggers-edit` **80/80** (the curl example really run: bash + OpenSSL 3.6.4 → 200). A hand mutant (the SHA-512
  scheme computing SHA-256) turned 4 of `webhook-verify`'s 16 red. `tsc --noEmit`: backend, admin app, MCP **0**;
  the backend's test project **0** (it was 5, all in s3–s7's drive and orders specs: types only, fixed).
- `two-004-paystack.test.ts` **15/15** (5 new: nobody calls it over HTTP; the webhook marks paid by the same check and
  refuses three wrong signatures; other events left alone; one finishing while the other asks; the same instant ×8,
  which kept two rows in 7, then 8, of 8). Mutants: `TWO003_MUTANTS=1 npx jest tests/two-004-paystack-mutants.test.ts
  tests/two-003-checkout-mutants.test.ts tests/two-003-orders-mutants.test.ts` **62 of 63 red**; the green, "asked
  twice, kept twice", had turned equivalent behind the new `meanwhile` check: the spec now counts Paystack's verifies
  (asked again, no new ask), and it and a twin on `paystackEvent` went red: **64 of 64**. Hand mutant, policy
  `paystackEvent` made `public`: red.
- The marketplace's backend specs (TWO-001 ×2, sellers, checkout, orders, enquire, Paystack) **138/138**.
- `noodl-mcp`: `toolDisclosure` (the budget gate) and the Paystack, shop, basket, orders, enquire and template specs
  **154/154**; regenerated twice, the door raised **no warning**; the template spec matches a fresh build.
- Drives, one at a time, all **1/1**: `two-004-paystack-drive` (25 s; the stand-in's Pay now posts Paystack's signed
  webhook, which answered 200 every time; one row per reference agreeing, the parts' paid step once; 14 shots retaken,
  the two paid ones looked at: unchanged), then slices 1–5's five drives. The viewer bundle (Oct 14 19:56) is newer than
  `noodl-viewer-react/src` and `noodl-runtime/src`.
- Census: only the marketplace moved (33,512 → 33,984 code lines read), no new candidate, `--check` fresh. DEF-038
  **36/37** (the red `templates/nightbook`, P78's, as before).
- Not run: the editor's `tests/workflow/workflowtriggernodes.test.ts` (the editor bundle suite) after the canvas
  node's new wording; the admin drawer in a browser (§1 of the handoff).
- 🔴 Peers' jest ran beside some of these (`nodegx-export --ci`, P78's `tpl007*`); the backend specs and every drive
  waited for them to finish.

**Readings after R11 (2026-10-15, working tree on `d65a0b88a`):** backend specs (the marketplace's seven, `webhook-verify`,
`triggers-http`, `admin-app/schedule`) **196/196**; `noodl-mcp` (budget gate, Paystack, shop, basket, orders, enquire,
template, DEF-038) **190/191**, the red DEF-038's `templates/nightbook` as always; the three mutant files **63 of 63
red** (the five on the retired guards and `followOrder`'s filter gone, four on the refusal's handling added); drives
`two-004-paystack` (now exactly one row per payment), `two-003-checkout`, `two-003-orders` **1/1** each; census: only
the marketplace moved (33,990 code lines), `--check` fresh.

**s9 (2026-10-15, working tree on `38373d895`)**, detail in TWO-004 §8.2–8.3:

- `nodegx-backend`: `two-004-paystack.test.ts` **10/10**; `TWO003_MUTANTS=1 npx jest tests/two-004-paystack-mutants.test.ts
  tests/two-003-checkout-mutants.test.ts tests/two-003-orders-mutants.test.ts` **56 of 56 red**; the marketplace's seven
  backend specs **133/133**.
- `noodl-mcp`: `two004Paystack.test.ts` **16/16**; with the shop, basket, orders, enquire and template specs **136/136**.
- Drives one at a time, all **1/1**: `two-004-paystack-drive` (23 s, 14 shots looked at: two fixed, one noted) and
  slices 1–5's five again. Door: no warning. Census: marketplace 33,512 code lines, nothing else moved. DEF-038 36/37.
- 🔴 A peer's jest (`tpl013Edition`, `tpl007*`) ran beside two of these; check `pgrep -fl "node .*jest"` first.

**s8 (2026-10-15, working tree on `38373d895`)**, detail in TWO-003 §11.3–11.4:

- `two003Enquire.test.ts` **22/22** (16 mutants red); with the shop, basket, orders and template specs **120/120**.
- `two-003-enquire.test.ts` **13/13**; `TWO003_MUTANTS=1 npx jest tests/two-003-enquire-mutants.test.ts` **15 of 15
  red** (in `packages/nodegx-backend`). With TWO-001 ×2, sellers, checkout and orders: **123/123**.
- Drives, one at a time, all **1/1**: `two-003-enquire-drive` (48 s, 16 new screenshots, looked at: two fixed, one
  written down), `two-003-drive`, `two-003-shop-drive`, `two-003-checkout-drive`, `two-003-orders-drive` (its tab check
  reads six tabs). No console error beyond each screen's provoked refusals; 0 px overflow.
- DEF-038 **36/37** (the red is `templates/nightbook`, P78's); census `--check` fresh.
- 🔴 **Before driving, check the viewer bundle is newer than `noodl-viewer-react/src`** (s8: Oct 14 19:56, fresh), and
  `pgrep -fl "node .*jest"` right before each drive.

s3–s7's readings are in TWO-003 §6.2, §7.3, §8.2, §9.3, §10.3.

## 4. What this session settled

**s10 (TWO-004 §9), none asked of Richard; gate 4 can overturn them:** an `hmac-sha512` hook's secret is supplied,
never made up, never handed back, never rotated (refused in words); the webhook re-asks Paystack rather than trusting
the event; any event but a `charge.success` for one of ours is answered 200 and left alone; unfinished or unreachable
is refused so Paystack retries. **Where the handoff was wrong or short:** "the world should say a reference is one
payment" couldn't be done by an agent (a world rule needs a person as its source): asked, **Richard ruled R11 the same
day and it's built** (TWO-004 §9.5); and the admin app had no way to paste a secret at all, which a Paystack hook
needs (built).

**s9 (TWO-004 §8.4), none asked of Richard; gate 4 can overturn them:** a country is paid once all its sellers have
confirmed, in one payment; each seller's share is their whole part, fees shared in proportion (the marketplace takes
nothing); a payment for the wrong amount is kept as failed and nothing moves; paying by card needs an email; XOF waits
(Paystack's subunit for it is in no doc).

**s8:**

- **An enquiry can be marked answered, and unmarked** (`answeredAt`). The seller works through "To answer", then
  "Answered".
- **A buyer leaves a number with its country code** (`+` or `00`): the seller opens WhatsApp on it, and `wa.me` needs
  the whole number. A local number is refused in words.
- **What is too long is refused, not cut** (a name over 120, a message over 2,000).
- **The admin reads every enquiry** on the same page, each named with its seller, and may mark any.
- **No conversation in the app, no notification**: the seller answers on WhatsApp or by phone (R10); they see a new
  enquiry when they open the tab.
- None of these was asked of Richard; gate 4 (TWO-009) can overturn them. s6–s7's settlements stand (TWO-003 §9, §10).

## 5. Where to start

**s19 (2026-10-16):** R12 is driven in the editor; both templates now open on their home; the admin can rename the
marketplace. Next for an agent: read the **26 warnings** the editor's badge shows on the marketplace (the door raises
none: what does a builder see?); measure P121-S19-SIGNINRACE; the small items in 5 below; then TWO-007 can be written
for a build from source, or waits for a release.

**s18 (2026-10-15): Richard ruled R12 and R13 at the start, and both are built** (TWO-007 §7). Next for an agent:
drive R12 in the running editor (open a copy of the marketplace, start its backend, read the collections in the admin
app; rebuild the editor's main bundle first), then a rename for the marketplace's admin (small), then TWO-007 can be
written for what runs from source, or wait for a release.

**s17 (2026-10-15) took TWO-007, the tutorials, and stopped before writing** (TWO-007 §6): the schema never reaches a
builder's backend (**P121-TWO007-SCHEMANOWAY**, a ruling), the marketplace's name is written into about 15 nodes (the
fix is the gram's `Community` pattern; the classifier refused the policy edit it needs), no release carries this
phase's product code, and no hosting route is written for a non-developer. Nothing else changed.

**An agent can do alone, in order:**

1. ✅ s11: the admin app's Paystack hook, driven (TWO-004 §10).
2. ✅ s12: MEMBERSPHOTO and TWO-005 slice 2 (TWO-005 §7).
3. ✅ s13: TWO-005 slice 3, profiles (TWO-005 §8).
4. ✅ s14: TWO-005 slice 4, prayer requests and the sections (TWO-005 §9).
4b. ✅ s15: TWO-005 slice 5, moderation (TWO-005 §10).
4c. ✅ s16: testimonies and events (TWO-005 §11). Next: TWO-006 (needs the builder's HTML files) or TWO-010 (needs
   SRK-005); slice 6 waits on SRK-005. Small, any time: an event's profile tile could say its day (TWO-005 §11.5).
5. Small, any time: the "Sign out" band a stranger sees on a refused staff page (TWO-003 §11.4, every staff page's
   shared `shell`); back from a declined try the page says it twice (TWO-004 §8.3).
6. Keep filing what the templates find (`dev-docs/bugs/`, one file per bug).
7. Not until Richard answers: TWO-004 step 4 (real test keys), step 7 (split with real subaccounts), then step 6
   (Flutterwave, incl. its `verif-hash` webhook check) and step 8 (package the doors).

**Needs a human (Richard):**

- **TWO-005 §6.5, how members sign in**: built by an emailed link (members) and a password (the first admin), the
  README's plan until P119's code. Nobody but the admin signs in until the backend sends email. The other way is
  TPL-001's: a password for everyone, the link as "forgot".

- **Sending the template to the builder** (Richard, 2026-10-15: he may send it and let the builder's feedback, and
  the builder's own Paystack keys, do step 4). `docs/PAYING-BY-CARD.md` is the setup he needs. What he'd still meet:
  the admin app's Paystack hook needs a NodeGX build with this session's backend change in it.
- **Committing.** Nothing of this phase is committed. s10 adds/changes: **product** `nodegx-backend/src/triggers/{webhook,registry}.ts`,
  `src/server/admin-triggers.ts`, `src/index.ts`, `src/admin/app/views/triggers.tsx`, `noodl-mcp/src/tools/backendTools.ts`,
  `noodl-editor/.../triggers/TriggerBackendClient.ts`, `.../workflow/workflowTriggerNodes.ts`; **their tests**
  `nodegx-backend/tests/{webhook-verify,triggers-http}.test.ts`, `tests/admin-app/schedule.test.tsx`; **the template**
  `two004Paystack{,.test}.ts`, `two003Checkout.ts` (followOrder), the policy (`paystackEvent`), regenerated components;
  `nodegx-backend/tests/two-004-paystack{,-mutants,-drive}.test.ts`, `tests/helpers/fake-paystack.ts`, type fixes in
  `two-003-{drive,shop-drive,orders}.test.ts`; 14 retaken screenshots; the census; the bug file; the phase's docs; **R11**: `templates/marketplace/docs/world/rules.json`,
  `docs/WORLD.md`, `docs/PAYING-BY-CARD.md`, the regenerated `backend/schema.json`, `two-001-marketplace-policy.test.ts`. The
  product change could go as its own commit (it stands alone: P121-TWO008-WEBHOOKSHA512). s3–s9's piles are listed in
  TWO-003 §6–§11, TWO-004 §8 and earlier handoffs (git history of this file). **s11 adds:** `nodegx-backend/src/admin/app/views/{triggers,runs}.tsx`,
  `tests/admin-app/{schedule,runs-view}.test.tsx`, `tests/two-004-admin-hook-drive.test.ts`, `templates/marketplace/docs/PAYING-BY-CARD.md`
  (step 6), 14 `shots/two004-hook-*.png` + the narrow one, four `dev-docs/bugs/p121-two004-*.md`, TWO-004 §10, this file, the README.
  **s11, TWO-005 slice 1 adds:** `packages/noodl-mcp/tests/two005{Cloud,Pages,Look,Template}.ts`, `two005Template.test.ts`,
  `two003Run.ts` (`current`), `scripts/generate-gram-template.ts`, `package.json` (`template:gram`; the line above it,
  `template:marketplace`, is this phase's too), `templates/gram/` (untracked: generated `components/`,
  `nodegx.project.json`, the policy's functions, `docs/SETTING-UP.md`), `nodegx-backend/tests/two-005-join{,-mutants,-drive}.test.ts`,
  20 `shots/two005-*.png`, `dev-docs/bugs/p121-two005-signupswitch-*.md`, the census (`kinds.json`, `KINDS.md`), TWO-005 §6.
  **s12 adds — product:** `nodegx-backend/src/server/files.ts`, `src/storage/MetadataStore.ts` (`readers`, the
  `_Files` column), `src/ops/headers.ts` (CORS); `nodegx-backend-contract/src/data.ts` (`readers`),
  `src/descriptors/nodegx.ts` (the `files.private` note); `noodl-runtime/src/api/backends/ParseWireAdapter.ts`
  (`uploadHeaders`), `src/api/backends/realtime/RealtimeSubscription.ts` + `SseTransport.ts` (LIVEANON);
  `noodl-viewer-react/src/nodes/std-library/uploadfile.ts` (Readers), `src/api/files.ts` (`sign`),
  `static/viewer/global.d.ts.keep`; `nodegx-node-spec/src/nodes/upload-file.ts`; both node catalogues,
  `docs-site/docs/nodes/cloud-services/upload-file.md`, the CHR-007 snapshot. **Their tests:** `files-http`,
  `files-table-upgrade` (new), `sbr007-auth-preflight`, `two-001-gram-policy` (the photo table);
  `noodl-runtime/test/cloudstore-files`, `test/backends/realtime-transports`; `noodl-viewer-react/tests/uploadfile`,
  `tests/files-api-sign` (new). **The template:** `noodl-mcp/tests/two005{Feed,FeedPages,Feed.test}.ts` (new),
  `two005{Pages,Template,Look}.ts`, `two003Run.ts` (`sign`); `templates/gram/` regenerated, its policy's three
  functions, `docs/SETTING-UP.md` §6; backend `two-005-feed{,-mutants,-drive}.test.ts` (new),
  `helpers/gram-mutant.ts` (new), `two-005-join-mutants` (uses it), `two-005-join-drive` (its feed line); 12
  `shots/two005-feed-*.png` + slice 1's retaken; bugs MEMBERSPHOTO (scheduled), LIVEANON (new, scheduled),
  EXPORTREADERS (new, open); the census + `kinds.hand.json`; TWO-005 §7, TWO-001, the README, this file. The file
  change could go as its own commit with MEMBERSPHOTO, and LIVEANON as another. Commit with pathspecs; peers share
  this checkout.
  **s13 adds (template only, no product code):** `noodl-mcp/tests/two005{Profile,ProfilePages,Profile.test}.ts` (new),
  `two005Feed.ts` (`photoProblem`), `two005FeedPages.ts` (faces, names to profiles, Your profile), `two005Look.ts`,
  `two005Template.ts`, `two005Feed.test.ts` (one mutant re-pointed); `templates/gram/` regenerated, its policy's
  `editProfile`, `docs/SETTING-UP.md` §7; backend `two-005-profile{,-mutants,-drive}.test.ts` (new),
  `two-005-feed-mutants.test.ts` (four re-pointed); 11 `shots/two005-profile-*.png` + the feed's retaken; bug
  NEVERRUNS (new), GROUPKEYBOARD (evidence), MEMBERSPHOTO and LIVEANON (headers); `kinds.hand.json` + the census;
  TWO-005 §8, the README, this file.
  **s14 adds (template only, no product code):** `noodl-mcp/tests/two005{Prayer,PrayerPages,Prayer.test}.ts` (new),
  `two005Feed.ts` (`kind`), `two005FeedPages.ts` (the prayer card, New post's chips, `navWires`), `two005ProfilePages.ts`
  (two counts), `two005Pages.ts` (`gramShell`'s nav), `two005Look.ts`, `two005Template.ts`, `two005Feed.test.ts` (two
  lines); `templates/gram/` regenerated, `docs/world/nouns.json` + `docs/WORLD.md` (`prayedCount`), `backend/schema.json`,
  the policy's `prayFor`, `docs/SETTING-UP.md` §7–§9; backend `two-005-prayer{,-mutants,-drive}.test.ts` (new),
  `two-005-profile-drive.test.ts` (Profile from the sections); 9 `shots/two005-prayer-*.png` + the feed's, profile's and
  join's retaken; bug TABMARK (new); the census; TWO-005 §9, the README, this file.
  **s15 adds (template only, no product code):** `noodl-mcp/tests/two005{Moderate,ModeratePages,Moderate.test}.ts` (new),
  `two005Pages.ts` (queue and rules moved out, `GM_BAD_LINE`, `QUEUE_LOAD`'s `hasRows`), `two005FeedPages.ts` (Report /
  Take down / Reports and hiding, an admin opens a hidden post), `two005ProfilePages.ts` (Block, Let them back, an admin
  sees a blocked profile), `two005Look.ts` (pills, `.gm-box`, `.gm-lines`, `textarea.gm-tall`), `two005Template.ts`,
  `two005Profile.test.ts` (two mutants re-pointed); `templates/gram/` regenerated, the policy's four functions,
  `docs/SETTING-UP.md` §10–§11; backend `two-005-moderate{,-mutants,-drive}.test.ts` (new); 14
  `shots/two005-moderate-*.png` + the others' retaken; bugs DROPDOWNSTALE and ACLNULL (new); `kinds.hand.json` + the
  census; TWO-005 §10, the README, this file.
  **s16 adds (template only, no product code):** `noodl-mcp/tests/two005Kinds.test.ts` (new), `two005Feed.ts`
  (four kinds, `WORDS_NEEDED`, the event's day), `two005FeedPages.ts` (pills, `wordsFirst`, `eventWhen`, four chips,
  `/UI/DatePicker`, the day and time), `two005ProfilePages.ts` (`/Profile/Count`, testimonies), `two005Prayer.test.ts`
  (seven mutants re-pointed, one expectation), `two005Feed.test.ts` (one expectation); `templates/gram/` regenerated,
  `docs/SETTING-UP.md` §8 and §12; backend `two-005-kinds{,-mutants,-drive}.test.ts` (new), `two-005-prayer.test.ts`
  and `-mutants` (the kinds), `two-005-prayer-drive.test.ts` (three counts); 10 `shots/two005-kinds-*.png` + the
  others' retaken; bug NOTIME (new); `kinds.hand.json` (one verdict removed) + the census; TWO-005 §11, the README,
  this file.
  **s18 adds — product (R12):** `noodl-editor/src/main/src/local-backend/project-schema.js` (new), `BackendManager.js`
  (the call in `startBackend`); specs `noodl-editor/tests-main/local-backend/backend-manager-project-schema.test.js`,
  `nodegx-backend/tests/p121-r12-project-schema.test.ts` (both new). Could go as its own commit with the bug file.
  **s18 adds — the template (R13):** `templates/marketplace/docs/world/nouns.json`, `docs/WORLD.md`, the regenerated
  `backend/schema.json`, `nodegx.security.json` (`Marketplace`, `MarketplaceHistory`), regenerated `components/`;
  `noodl-mcp/tests/two003{Cloud,Pages,Shop,Template}.ts`, `two003Name.test.ts` (new); backend
  `two-001-marketplace-policy`, `two-003-sellers` and every marketplace spec and drive that sets one up (the name);
  retaken `shots/two003-*`; the census; README §4 (R12, R13), TWO-007 §7, the bug file, this file.
  **s19 adds — product:** `nodegx-export/src/emit/style.ts` (one line, P121-S19-PLACEHOLDERTYPE: HEAD's editor dev
  build refused to start Electron; P18's file, could go as its own commit). **The templates:** `two003Template.ts`,
  `two005Template.ts` (the home), both template specs (its check), both templates' regenerated `nodegx.project.json`
  (P121-S19-NOHOME); the rename: `two003Cloud.ts`, `two003Pages.ts`, `two003Name.test.ts`, the policy's
  `nameMarketplace`, regenerated `components/`, backend `two-003-sellers.test.ts`, `two-003-drive.test.ts`,
  `two-003-name-mutants.test.ts` (new); retaken `shots/two003-*`, three `shots/two007-r12-*.png` (new); the census;
  three bug files (PLACEHOLDERTYPE, NOHOME, SIGNINRACE) and SCHEMANOWAY's drive; TWO-007 §8–§9, this file.
- The app's name in pushed history (`e170c0b10` on `origin/release/0.4.0`): his call whether it matters.
- **Paystack test keys** (TWO-004 §8.6; or the builder's, once he has the template), and for the builder: can his marketplace hold a Paystack business in each
  country it sells in? If not, R8-A on Paystack is one country per marketplace, or Flutterwave.
- Still owed by the builder: the logo, the devotional HTML files.
- Gate 4 (TWO-009) judges the differences in TWO-003 §6.4, §8.4, §9.5, §10.5 and §11.5, TWO-004 §8.4 and §9.4,
  TWO-005 §6.2, §7.3, §8.2, §9.3, §10.3 and §11.3, and the world changes in TWO-003 §9.1, §10.1 and §11.1, TWO-004 §9.5 (R11's rule)
  and TWO-005 §9.1.

## 6. Product findings

s19: **filed P121-S19-PLACEHOLDERTYPE** (high, fixed in the tree): a committed line in the export broke the editor's
dev build, which the export package's own `tsc` passes. **Filed P121-S19-NOHOME** (high, ours, fixed): the
marketplace and the gram opened in the editor on "No HOME component selected"; 13 drives never saw it. **Filed
P121-S19-SIGNINRACE** (medium, open). Met, good: R12 on a real builder's path; the store refused a payment breaking
the world's checks before reaching the unique index.

s18: **P121-TWO007-SCHEMANOWAY built** (R12; `scheduled` until committed). Measured on the way: with no schema, the
backend makes a collection on its first write and keeps none of the world's rules (two payments with one reference,
a provider outside the world's two). Ours: an unreachable "already named?" guard found by its mutant (removed).

s16: **filed P121-TWO005-NOTIME** (low, `kit: core`): no node picks a time of day, so an event's start is a 33-item
Dropdown. Met, good: the door refused computed Function ports and hand-copied count boxes; the library's Date picker
went into a third template unchanged. Ours: four spec reds, one from the shots (TWO-005 §11.5).

s15: **filed P121-TWO005-DROPDOWNSTALE** (medium, `kit: core`): a Dropdown with wired Items says "Option 1" until
someone picks, while showing its placeholder; the Report page sent a reason nobody chose. **Filed
P121-TWO005-ACLNULL** (low, `kit: core`): `ACL: null` on a write answers 200 and keeps the ACL. Ours: a fixture tie
that hid a mutant; a duplicate "Choose why"; four from the shots (TWO-005 §10.5).

s14: **filed P121-TWO005-TABMARK** (low, `kit: core`): a Button's icon goes left or right only, so a bottom bar's mark
over its word is a newline label plus `::first-line` CSS. Met, good: the door refused a background on a Text and an
unprefixed Function output. Ours: a fixture with no race's second row; the post's placeholder on a prayer request
(found in the shots).

s13: **filed P121-TWO005-NEVERRUNS** (medium, `kit: mcp`): a Function with Run unwired and every input quiet never
runs, and the door writes it silently. **GROUPKEYBOARD met again** (a photo tile has no name; evidence added). Ours:
the quiet-inputs slip that found NEVERRUNS; a fixture whose first row was the person signed in hid a mutant.

s12: **P121-TWO001-MEMBERSPHOTO built**; **filed and fixed P121-TWO005-LIVEANON** (high: no signed-in member on the
built-in backend could subscribe to a collection that isn't public, two defects in a row); **filed
P121-TWO001-EXPORTREADERS** (high, P18's: the export drops Readers and uploads the photo public). Met, good:
`Noodl.Records`' one-key filter refusal names the fix; the template gate; the census.

s11 (TWO-005 slice 1): **filed P121-TWO005-SIGNUPSWITCH** (low): the Sign-in page's open sign-up switch reads on while
the policy refuses every new account (measured: the policy wins).

s11: **P121-TWO004-RUNWHY built** (a run refused before its first step now says why; `scheduled` until committed).
Filed, P104's lane, all low: **P121-TWO004-ADMINNARROW** (no narrow layout; ruling wanted on whether the admin app owes
a phone), **P121-TWO004-TOASTOVERSAVE**, **P121-TWO004-DETAILFILTER**. Ours: s10's SHA-512 example was unreachable on
screen (fixed). Met, harness: `helpers/http.ts` re-encodes a string body unless `raw: true`.

s10: **P121-TWO008-WEBHOOKSHA512 built** (stays `scheduled` until committed, then `fixed` with the commit). Met, ours:
a synchronous child against an in-process backend hangs the spec (memory filed). Met, good: the trigger records every
refused signature in Runs; the door raised no warning on the new function.

s9: none filed. Ours: a page script read its own `Outputs` back (TWO-004 §8.5).

s8: **filed P121-TWO003-SCROLLINTOVIEW** (low): a row that scrolls natively can't bring a child into view; Scroll To
Index / Element exist only on the non-native scroller. Met, good: the census caught a phone number's digit count as a
possible row count.

s7: none filed (the door's `repeated-sibling-subtree`, the Request refusing a wrong-typed parameter: good refusals).
s6: none filed. Filed in s5: P121-TWO003-GROUPKEYBOARD (medium), P121-TWO003-BASELINE (low). Filed in s4:
P121-TWO003-SCRIPTCOMPILE (medium), P121-TWO003-EXPORTSHRINK (medium, P18's), P121-S4-STRANGERSTALL (P107's).
P121-TWO008-UPLOADSHRINK is built, `fixed` once committed. Filed in s3: P121-TWO003-CLOUDPOINTSTO (medium),
P121-TWO003-LOGINSUCCESS (low). Earlier: P121-TWO008-WEBHOOKSHA512 (owner TWO-004), P121-TWO001-MEMBERSPHOTO (high,
owner NONE). Written, not filed: an order can't be `calledBy` its read-aloud number (TWO-001 §6.2).
