# Phase 121 — A marketplace and a community

**Scoped:** 2026-10-14, at HEAD `1817f4d7e`, from the reply of the builder whose first message opened [Phase 120](../phase-120-building-locally/README.md).
Two templates for him: **a marketplace for products made in Africa** and **an Instagram-like community app for a
church ministry**, each with a tutorial he can follow to review and adapt it. **None of the builder's messages are in
this repo (R1)**; the verbatim brief is in `~/vscode_projects/nodegx-private/builder-briefs/`. **Status: 📋 SCOPED; gate 1 answered 2026-10-14** (the builder's answers in BRIEF.md: many sellers, sold across
Africa, every way to pay, an offline Bible and notes, the blog is down). Slices 1 (sellers and the admin, s3–s4) and 2 (the catalogue a buyer browses, s5) of the shop built and driven; the community app not started. **Prefix: `TWO`.** Route: the P116 path with P118's five gates,
npm packages only, no editor MCP, like P118 and P119.

> "He hasn't given a lot of detail, but from our research and leaving it flexible I think we can build him something
> nice." — Richard, 2026-10-14

## 0. The idea in one paragraph

The builder builds for African businesses with tools he can't afford. NodeGX is free, so the first thing this phase gives
him is two apps worth starting from. **The shop** is a marketplace for things made in Africa, sold across African
countries: many sellers, each with a dashboard for their own products, and the builder managing the sellers. Photos load
on a slow connection, prices show in the buyer's currency, and each country offers the ways people there really pay.
**The community app** is the ministry's own place for the daily devotional and the people around it. It looks like Instagram: a
feed, a grid on every profile, a heart, a comment. Each morning's devotional comes from the ministry's own archive,
prayer requests are a kind of post, and the Bible and a member's notes work without a connection.
Each template ships with a tutorial written for a builder who knows no-code tools but not NodeGX. Both start generic
on the shelf; the builder's are those templates with his names, colours and content.

## 0.1 Which model

P112's rule (its README §0.2): each task file has a **Model** line; a session's first message names the model it runs
on, the one the line recommends and, if they differ, why to switch.

## The five gates, per app, as the board

| gate | what | the shop | The community app |
|---|---|---|---|
| 1 | the brief in the person's words | ✅ [BRIEF.md](BRIEF.md): the builder's requests and answers in our words (R1), 2026-10-14; delivery owed (his logistics talks) | ✅ BRIEF.md; the logo and the devotional files owed |
| 2 | the route | ✅ full lane: a backend, payments | ✅ full lane: a backend, uploads, a schedule, moderation |
| 3 | a picture the person said yes to | ✅ [LOOK.md](LOOK.md): round 1, 2026-10-14 (the builder: no notes) | ✅ LOOK.md, round 1, 2026-10-14 |
| 4 | the build held to the picture | ⬜ slices 1–5 driven against it (TWO-003 §6.3, §8.3, §9.4, §10.4, §11.4; differences listed §6.4, §8.4, §9.5, §10.5, §11.5), and paying by card (TWO-004 §8.3–8.4) | ⬜ |
| 5 | the person it's for uses it, words written down (privately, R1) | ⬜ the builder | ⬜ the builder and a few of the ministry's members |

## 1. What was read before scoping (2026-10-14)

| # | fact | source | consequence |
|---|---|---|---|
| 1 | **Parse Feed exists and is driven:** `HTTP Request` → `Parse Feed` turns RSS 2.0, Atom or RDF into one item shape (title, link, date, author, HTML body), and schedules run without tripping over themselves. FED-001…006 closed. | [P96](../phase-96-the-backend-carries-a-feed/README.md) | The daily devotional is composition, not new product: a scheduled cloud function reads the static blog's feed. |
| 2 | **The backend stores files and resizes images:** local or S3 drivers, signed URLs, `?thumb=` transforms through `sharp` (optional; a 501 with a reason when it's missing, never a silent fallback). | `nodegx-backend/src/storage/` (BAK-006) | Photos for both apps, served as thumbnails for slow connections. Check `sharp` installs on the target host. |
| 3 | **Upload and picker nodes exist:** `Upload File`, `Open File Picker`, `Cloud File`, `Sign File URL`. | `noodl-viewer-react/src/nodes/std-library/`, `noodl-runtime/.../data/` | Posting a photo is wiring, not a new node. |
| 4 | **Realtime, cron, db-change and webhook triggers exist.** Webhooks verify `hmac-sha256` or a token, nothing else. | `nodegx-backend/src/triggers/registry.ts:71` | 🔴 **Paystack signs webhooks with HMAC-SHA512.** Either the trigger gains a scheme (a product change, TWO-004) or v1 verifies each payment by calling Paystack's verify endpoint after the redirect. **s10: the scheme is built (TWO-004 §9.1).** |
| 5 | **No Paystack, no Flutterwave** anywhere in the repo. | grep, 2026-10-14 | TWO-004 is the first African payment door; it should be reusable, not buried in one template. |
| 6 | **TPL-001, the members' area, is built:** a landing page, logins, members-only content curated by moderators, for charities, associations and churches. | [TPL-001](../phase-78-the-templates/TPL-001-THE-MEMBERS-AREA.md), `templates/members-area` | The community app's roles, approval and moderation start from it. |
| 7 | **The storefront brief and its worked example exist** (Kiln & Co., a shop home page). | P55 `STOREFRONT-BRIEF.md`, `best-practices/05-WORKED-EXAMPLE-STOREFRONT.md` | The shop's page structure has a reference answer; the basket, checkout and orders don't. |
| 8 | **Sign-in today is a magic link** (BAK-004), plus password, OIDC and GitHub; P119 SRK-001's six-digit email code has its backend half built (s1, 2026-10-12; the client side is owed in SRK-005), because a link from a phone's mail app opens the browser, not the installed app. | P119 README §1 fact 2 | The community app as an installed app wants the code. Take it from SRK-001, don't build a second one. |
| 9 | **A PWA (manifest, service worker, install prompt, push) is being built inside P119** (SRK-005); P110 has 0 of 14 built. | P119 README §1 fact 3 | The community app reuses SRK-005's pieces when they land. |
| 10 | **Two repo gates scan every `templates/` folder:** the ontology census and DEF-038. A new template trips both. | P119 memory, s2 | Budget a session for them in each build task. |

## 2. What each app holds (from the builder's answers, 2026-10-14)

### The shop (generic name on the shelf: *the marketplace*)

- **Sellers:** many, each with a dashboard where they add, edit and remove their own products and see their orders.
  **The builder (admin) creates, edits and deletes sellers and any of their products.** Sellers don't sign themselves up.
  (Built as **stop**, not delete: TWO-001's world, rule 1, keeps old orders whole. A stopped seller's products leave
  the shop and its logins stop; the admin can bring it back. The picture he said yes to draws it that way.)
- **Products:** packaged food and drinks, phones, laptops, cars. Each product has a seller, a category, photos, a price
  and a mode: **buy** (basket and checkout) or **enquire** (a message to the seller, for a car or anything priced by
  conversation; R10).
- **Across Africa:** each seller has a country and a currency; buyers see prices in a currency they pick, from rates
  the admin sets (no live exchange-rate service in v1).
- **Payment, per country:** the admin turns ways to pay on or off for each country. v1 builds pay on delivery, bank
  transfer with a reference, order on WhatsApp, and Paystack (card, and whatever else Paystack offers in that country).
  Flutterwave (wider coverage, mobile money) is the second door (TWO-004). A multi-seller basket's money is split to
  each seller by the provider (R8, a split-payment system like Stripe Connect), if one is available in his countries.
  Enquire items are settled between buyer and seller off the site (R10).
- **Delivery:** undecided (he'll talk to logistics firms). v1: the seller confirms delivery and its cost after the
  order; the checkout says so. Delivery is a slot a logistics partner can fill later.
- **Built for slow connections and small screens:** thumbnails from the backend, one column on a phone, usable at
  1024×640 on a tablet.

### The community app (generic name on the shelf: *the gram*)

- **Joining:** members sign up and an admin approves them (the builder's answer). Open sign-up is a later decision.
- **Admins:** the builder is the admin; he can make volunteers admins (approve members, hide posts, block) later.
- **The feed:** posts with photos and a caption, newest first; a heart and comments; the day's devotional pinned at
  the top.
- **Profiles:** a photo grid, a short bio, the member's posts. Following people is slice 2.
- **Prayer requests:** a kind of post with a "🙏 I prayed" count. Testimonies and events as kinds too, if the picture
  shows they're needed.
- **The devotional:** the ministry's archive of HTML files imported once into the community app; each morning the day's
  devotional is released and pinned; the builder (or his father) can write new ones in the community app. The devotional page can be
  public, so it can be shared outside (TWO-006).
- **The Bible, offline:** a public-domain translation (R9) stored on the phone, with books, chapters and search,
  readable with no connection (TWO-010).
- **Notes, offline:** a member's private notes, linked to a verse or a devotional if they like, written offline and
  saved to their account when back online (TWO-010).
- **Moderation:** report, hide, block; a community rules page; the admins' queue.
- **Installable on a phone** (PWA, from P119's SRK-005), which the offline parts need.

## 3. Tasks

| task | what | kind | depends on |
|---|---|---|---|
| [TWO-000](TWO-000-THE-BUILDERS-ANSWERS.md) | **The builder's answers.** ✅ asked and answered 2026-10-14 (BRIEF.md). | research | — |
| [TWO-001](TWO-001-THE-TWO-WORLDS.md) | ✅ s2: both worlds projected to `backend/schema.json` (byte-gated) and `nodegx.security.json`; 27 + 22 policy tests, 32 mutants all red; census green. Filed P121-TWO001-MEMBERSPHOTO (built s12, TWO-005 §7.1). **The two worlds.** The P116 step for each app: the things, who does what, the rules, projected to a backend schema and a security policy. | design | TWO-000 (can start on the proposal) |
| [TWO-002](TWO-002-TWO-PICTURES.md) | ✅ gate 3 passed on round 1, 2026-10-14 (the builder: no notes). **Two pictures.** A clickable mockup for each app at phone and tablet size; Richard's yes, then the builder's. Gate 3. | design | TWO-001 |
| [TWO-003](TWO-003-THE-SHOP.md) | 🟡 s3–s4: slice 1 (sellers and the admin) built, specced and driven at 390 and 1024×640, with its photos and logos (s4: Upload File shrinks a photo on the phone, 4.7 MB → 118 KB at 1600 px). s5: slice 2, the catalogue (home, shelves, search, a seller, a product, buy on WhatsApp or enquire, prices in the buyer's currency), driven at both sizes; the app opens on the shop. s6: slice 3, the basket and the checkout (a way to pay per seller country, R8-A; the order's private link; the admin's countries, ways to pay, rates and shelves), driven at both sizes; the world's way to pay moved to the order part. s7: slice 4, orders (a seller's Orders tab, the admin's; each part moved one step at a time or cancelled with why; paid on delivery has no paid step), driven at both sizes: **AC2 met**. s8: slice 5, enquire (a buyer messages the seller from the product page with no account; the seller's Enquiries tab, marked answered; the admin reads every one), driven at both sizes; the world's enquiry gained `answeredAt`. Slice 6 is TWO-004. **The marketplace, built.** Sellers managed by the admin, a dashboard per seller; catalogue across countries; buy or enquire; basket and checkout with the ways to pay each country allows; orders per seller; delivery confirmed by the seller. | build | TWO-002 |
| [TWO-004](TWO-004-PAYSTACK.md) | 🟡 step 1 ✅ (R8 ruled A); half of step 3's shape came with TWO-003 slice 3 (s6). s9: step 2 ✅ (the docs read: one Paystack business per country, so one key per currency); step 3 built, specced (10/10, 21 mutants red) and driven against a stand-in for Paystack: `startPayment`, `checkPayment`, the order page's Pay box and the way back. **s10: step 5 for Paystack built and specced: the webhook trigger's `hmac-sha512` scheme (a product change, P121-TWO008-WEBHOOKSHA512) and `paystackEvent` (the same check as `checkPayment`; the page and the webhook racing move the parts once).** **s11: the admin app's Paystack hook driven from the setup page's steps at 1024×640 and 1440×900 (TWO-004 §10); its test command made visible, a refused run now says why.** Step 4 waits for Richard's test keys. **Payment doors anyone can use: Paystack, then Flutterwave.** Ways to pay set per country; a cloud function starts a payment and verifies it; webhooks verified (Paystack signs with SHA-512); written so another template can take them. | product | TWO-003 slice 3 ✅ |
| [TWO-005](TWO-005-THE-COMMUNITY-APP.md) | 🟡 **s11: slice 1 built, specced (8/8, 22 mutants red) and driven at both sizes**: ask to join (13 or older), sign in by an emailed link, wait; the admins' queue lets people in (they're emailed) or says No (blocked, never deleted); make admin. `npm run template:gram`; the builder's `templates/gram/docs/SETTING-UP.md` (TWO-005 §6). **s12: P121-TWO001-MEMBERSPHOTO built (Readers on Upload File, `Noodl.Files.sign`), then slice 2 built, specced (14/14 + 37/37; 23 + 22 mutants red) and driven in two browsers: posts with members-only photos, hearts, comments; counts move with no reload (AC2 met; it took fixing P121-TWO005-LIVEANON)** (TWO-005 §7). **s13: slice 3 built, specced (8/8 + 34/34; 19 + 21 mutants red) and driven in two browsers: profiles with a members-only photo, a bio and the grid of posts; Edit profile; names open profiles** (TWO-005 §8). **s14: slice 4 built, specced (7/7 + 43/43; 19 + 29 mutants red) and driven in two browsers: prayer requests (words only), 🙏 I prayed with the count kept on the request, who prayed shown only to the person who asked (W4); the Prayer page; the sections, a bottom bar on a phone and a rail on a tablet; the world's post gained `prayedCount`** (TWO-005 §9). **s15: slice 5 built, specced (8/8 + 70/70; 36 + 44 mutants red) and driven in two browsers: report a post or a comment (the world's reasons, the child's first in the queue), take your own down, an admin's Look (hide with why, bring back), block with why and let back from a profile, the rules written by an admin; hiding and blocking write the row ACL TWO-001 asked for (AC3 and AC4 met); filed DROPDOWNSTALE and ACLNULL** (TWO-005 §10). **s16: slice 4b built, specced (6/6 + 46/46; 12 + 33 mutants red) and driven in two browsers in two time zones: testimonies (words first, hearts) and events (a day from the library's Date picker, a start time, shown in each reader's own time, "was" once passed); New post's four chips; a profile counts testimonies; any card with no photo leads with its words; filed NOTIME** (TWO-005 §11). Next: slice 6 waits on SRK-005. **The community app, built.** Feed, posts with photos, hearts, comments, profiles with a grid, prayer requests, approval and moderation, installable. | build | TWO-002, SRK-001 code sign-in |
| [TWO-006](TWO-006-THE-DAILY-DEVOTIONAL.md) | **The daily devotional.** The ministry's HTML archive imported into the community app; the day's devotional released and pinned each morning; new ones written in the community app; readable offline. | build | TWO-005 slice 2, the HTML files |
| [TWO-007](TWO-007-TWO-TUTORIALS.md) | **Two tutorials.** For each template: how it's made, how to make it yours (products, currency, colours, the WhatsApp number, the Paystack keys, the blog address), how to put it online. | copy | TWO-003, TWO-005 |
| [TWO-008](TWO-008-WHAT-WAPPLER-DOES.md) | ✅ s1. **What Wappler does.** the builder's suggestion: read what Wappler does well for apps like these two, and file what NodeGX lacks. | research | — |
| [TWO-010](TWO-010-THE-BIBLE-AND-NOTES.md) | **The Bible and notes, offline.** A public-domain translation stored on the phone, with search; private notes written offline and saved to the account when back online. | build | TWO-005 slice 1, SRK-005 (PWA), R9 |
| [TWO-011](TWO-011-COOLIFY.md) | **Coolify, for a home lab.** the builder's question: can a non-programmer put these apps online with Coolify? A spike on an old PC: the backend and the app deployed through Coolify, reached from outside through a tunnel. | experiment | TWO-003 or TWO-005 slice 1, OWN-016 |
| [TWO-009](TWO-009-THE-BUILDER-USES-THEM.md) | **The builder uses them.** Gate 4 (the build held to the picture) and gate 5 (the builder, and a few members for the community app, use it; their words written down); then the generic versions go to the shelf. | proof | all above |

**Order:** TWO-001, TWO-008 and **TWO-004 step 1** now (the worlds, a reading, and R8's check: can Paystack or
Flutterwave split a payment between sellers in his countries? If neither can, stop and ask Richard). TWO-002 next; nothing is built before its yes. Then
the shop (TWO-003, TWO-004) and the community app (TWO-005, TWO-006, TWO-010) as two lanes. TWO-007 alongside each build.
TWO-011 once one app runs. TWO-009 last.

## 4. Rulings

### To ask, when the phase starts

| # | question | recommendation on 2026-10-14 |
|---|---|---|
| R1 | What of the builder's messages may go into this public repo? | ✅ **Richard, 2026-10-14: none of them.** No quotes, no names (his, his family's, the ministry's, the app's), no addresses. Requirements in our words only. Verbatim messages, his answers and his reactions at gates 3 and 5 live in `~/vscode_projects/nodegx-private/builder-briefs/`. |
| R2 | Generic templates on the shelf, with the builder's versions as branded copies? | ✅ **Richard, 2026-10-14: yes.** *The marketplace* and *the gram* on the shelf; the builder's names, colours and content as his own copies, not in the shelf version. |
| R3 | The shop v1: curated, or many sellers? | ✅ **Answered by the builder, 2026-10-14:** many sellers, each with a dashboard; the builder creates, edits and deletes sellers and their products. |
| R4 | Which ways to pay in v1? | ✅ **The builder: as many as possible, because they vary by country.** So: ways to pay set per country; v1 builds pay on delivery, bank transfer, WhatsApp and Paystack; Flutterwave next (TWO-004). |
| R5 | The community app: who can join? | ✅ **The builder: approved members for now.** The devotional page public, so it can be shared outside. |
| R6 | Who builds the templates: Claude Code on the P116 path, or the Vibe kit (P120)? | Claude Code, so the templates are as good as we can make them. P120 LOC-008 then rebuilds them through the Vibe kit and compares. |
| R7 | "Look like Instagram": how close? | The layout people know (feed, grid, heart, comment, bottom bar). Not Instagram's logo, gradient or name. |
| R8 | A basket with products from three sellers: who receives the money? | ✅ **Richard, 2026-10-14: split payments, like Stripe Connect, if one is available to him; otherwise it may block the scope.** Paystack and Flutterwave both advertise split payments to sellers' subaccounts. **TWO-004 step 1 checks which countries and conditions each allows, before TWO-002's pictures are shown**; if neither covers his case, the phase stops and Richard rules. **Checked s1, 2026-10-14 ([TWO-004 §6](TWO-004-PAYSTACK.md)): within one country both split; across two countries Paystack can't and Flutterwave isn't proven. Stopped for Richard (ways A–D). **Richard, 2026-10-14: A, one payment per seller country,** each split by the provider.** |
| R9 | Which Bible translation offline? | ✅ **The builder, via Richard, 2026-10-14: the King James Bible.** It's public domain outside the UK (Crown copyright there), so it ships in the builder's the community app. The generic shelf version (R2) can ship it too, with the UK caveat in its README, or the World English Bible; decide at TWO-009. |
| R10 | Cars and other big items: through the basket? | ✅ **Richard, 2026-10-14: yes, enquire.** The buyer messages the seller and they settle the sale privately, off the site; the marketplace takes no payment and no part in it. |
| R11 | The buyer's page and Paystack's webhook check one payment at the same instant: one row or two? | ✅ **Richard, 2026-10-15: one; a payment's reference is one payment** (asked for a recommendation, took it). The marketplace's `docs/world/rules.json`, a unique index on `Payment.reference` (TWO-004 §9.5). |
| R12 | A template's `backend/schema.json` reaches no backend (P121-TWO007-SCHEMANOWAY): the editor installs it at start, or each template carries a terminal script? | ✅ **Richard, 2026-10-15: the editor adds them.** When the editor starts the project's bound backend, it creates each collection in `backend/schema.json` the backend doesn't have yet, and never changes or deletes one that exists. |
| R13 | The marketplace's name is written into about 15 nodes: may the world and the policy gain a stored name, as the gram's `Community` has? | ✅ **Richard, 2026-10-15: yes, edit the policy** (`templates/marketplace/nodegx.security.json`), same pattern as the gram. |

## 5. Depends on

- **P119 SRK-001** (six-digit sign-in code) and **SRK-005** (the PWA) for the community app. If they're late, the community app ships with
  the magic link and as a web app, and says so.
- **P120:** LOC-006's beginner's editor is where the builder tweaks these later; LOC-008 rebuilds them through the Vibe kit.
- **Hosting:** P112 OWN-016 (ship it) or the DBT template's route (a VM, Caddy, a nightly backup), whichever is ready.
  The builder wants the apps working first and a home lab later; TWO-011 tries Coolify for that, and P115 HST-005 (a box
  you own) is the related research.
- **P78's defect register:** every product finding met while building goes there the day it's met.

## 6. Not this phase

Live exchange rates. Payment for enquire items (settled off the site, R10). Delivery pricing and logistics partners (after
The builder's talks). Seller self sign-up. Following people, stories, direct messages and video on the community app (slice 2 or
later). Open sign-up on the community app. Native app-store apps (P110). A bank's app. Bringing the static blog tool's blog back online (a
note to the builder, not a task: TWO-006 makes the community app the devotionals' home).

## 7. Risks

- **Moderation is the product.** A social app for a ministry that left Facebook over flags will meet abuse, spam and
  disagreements. Moderation tools and rules ship in slice 1, not later.
- **Children.** A church community will have young members. Who can see whose profile, and photos of children, need a
  rule in TWO-001's world before the build.
- **Payment risk.** Test keys only in this phase; live keys are the builder's, set by him, never in a project file.
- **Hosting cost and care.** A social app with photos needs storage and backups. The builder plans a home lab: a home
  connection, power cuts and one machine are a fragile host for a community; TWO-011 says so with numbers.
- **Offline is a real feature, not a setting.** The Bible, notes and devotionals offline need the PWA (SRK-005),
  storage on the phone and syncing notes without losing them. TWO-010 is sized for that.
- **Many sellers, many countries.** Seller accounts, per-country payments and currencies multiply the cases to test.
  The world (TWO-001) has to hold them before the picture.
- **The brief is still thin on delivery.** v1 leaves it to the seller; the checkout must say so plainly.

## 8. Sources read on 2026-10-14

- Coolify (for TWO-011): [installation](https://coolify.io/docs/get-started/installation) ·
  [requirements guide](https://n6cloud.com/?p=13547)
