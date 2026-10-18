# TWO-003 — The marketplace, built

**Opened 2026-10-14; rewritten the same day from the builder's answers.** **Depends on TWO-002's yes.** **Status: 🟡 slice 1 built
and driven (s3, 2026-10-14, §6): sellers and the admin, at both sizes; its photos and logos built and driven in s4 (§7).
Slice 2, the catalogue, built and driven in s5 (§8). Slice 3, the basket and the checkout, built and driven in s6
(§9). Slice 4, orders, built and driven in s7 (§10): AC2 met. Slice 5, enquire, built and driven in s8 (§11). Slice 6
(TWO-004) not started.**
Kind: build.
**Model:** Opus.

## 1. The person sentence

> **A buyer in Accra finds a phone made in Nigeria and a juice from Ghana, sees both prices in cedis, puts them in one
> basket and pays the way people in Ghana pay. Each seller sees their own part of the order on their dashboard and
> confirms delivery. The builder, as admin, added both sellers and can change anything they sell.**

## 2. What exists

- The builder's answers (BRIEF.md): many sellers with their own dashboards, managed by him; packaged food and drinks,
  phones, laptops, cars; sold across African countries; every way to pay; delivery undecided.
- TWO-001's world and policy; TWO-002's approved picture.
- P55's storefront brief and worked example for the shop pages.
- Backend file storage and thumbnails; `Upload File`, `Open File Picker`; backend roles.

## 3. What to do

Slices, each usable on its own:

1. **Sellers and the admin:** the admin creates, edits and **stops** sellers (never deletes: the world's rule 1, so old orders still show what was bought; a stop has a reason and can be undone) (name, country, currency, contact, logo,
   story) and gives each a login; a seller's dashboard lists their products; a seller adds, edits and removes their
   own products with photos. The admin can do the same to any seller's products.
2. **Catalogue:** home, categories, search, a seller's page, a product page; products in **buy** or **enquire** mode
   (R10); at both sizes, from seed data across three countries.
3. **Basket and checkout:** a basket across sellers; the buyer picks a country and currency (rates set by the admin);
   the ways to pay the admin has turned on for that country; a basket across two seller countries pays once per country (R8, ruled A 2026-10-14); a buyer checks out without an account and follows the order by a private link (W2); pay on delivery, bank transfer with a reference, order on
   WhatsApp. "The seller confirms delivery and its cost" said plainly at checkout.
4. **Orders:** one order for the buyer, split into one part per seller; each seller sees and moves their part (paid,
   packed, sent, delivered); the buyer sees each part's status; the admin sees all. Each seller's share is paid to them by the provider's split payment (R8, through
   TWO-004).
5. **Enquire:** a message to the seller about one product, in the app, with a WhatsApp link when the seller has a
   number. Buyer and seller settle the sale privately, off the site; the marketplace takes no payment (R10).
6. TWO-004 plugs Paystack (then Flutterwave) in as ways to pay.

Every workaround met goes into P78's defect register the same day.

## 4. Acceptance criteria

1. Each slice driven in the real app at 390 px and 1024×640, 0 console errors, screenshots in this file.
2. A basket with products from two sellers in two countries, ordered by pay on delivery: each seller sees only their
   part, moves it to delivered, the buyer sees both parts move.
3. The policy refuses, when tried: a seller editing another seller's product, a seller creating a seller, a buyer
   reading another buyer's order.
4. A country with WhatsApp turned off doesn't offer it at checkout.
5. Thumbnails for every product photo; the first page's weight written down.
6. Both repo gates green; product findings filed or "none met".

## 5. Not this task

Payment for enquire items (R10). Delivery pricing and logistics partners. Seller self sign-up. Live exchange rates.

## 6. Session 3 (2026-10-14, Opus 5.5): slice 1, sellers and the admin

### 6.1 What was built

The template is generated: `npm run template:marketplace` (`scripts/generate-marketplace-template.ts`) authors it
through the MCP door into `templates/marketplace/`, replacing only what it owns (`components/`,
`nodegx.project.json`). The world, the schema and the policy stay hand-written (TWO-001), and the policy gained its
`functions` block.

| | where | what |
|---|---|---|
| functions | `packages/noodl-mcp/tests/two003Cloud.ts` | `setUpMarketplace` (the first admin, once, against the `MARKETPLACE_SETUP_TOKEN` secret), `whoAmI`, `saveSeller`, `stopSeller` (+ helper `setLoginDisabled`, run per login by Run Tasks), `giveLogin`, `saveProduct`, `takeOffSale` |
| pages | `packages/noodl-mcp/tests/two003Pages.ts` | Sign in, Set up, the admin's Sellers (+ row), Seller form, Give a login, Stop or bring back, a seller's Products (+ row), Product form |
| look | `packages/noodl-mcp/tests/two003Look.ts` | the picture's indigo, saffron and paper as tokens over the `modern` preset; Bricolage Grotesque and Atkinson Hyperlegible |
| gates | `packages/noodl-mcp/tests/two003Template.test.ts` | the template is the generator's output byte for byte; the policy names exactly the functions |
| spec | `packages/nodegx-backend/tests/two-003-sellers.test.ts` | the shipped functions on a locked backend, as admin, staff and stranger |
| drive | `packages/nodegx-backend/tests/two-003-drive.test.ts` | the rendered app, both sizes (§6.3) |

**How the functions are shaped.** A cloud script reaches the store through `Noodl.Records`, as the system, so each
function is Request → one script → Done or Refused, with stock nodes only where a script can't reach (Create User,
Add User To Role, Update User, the secret). Each takes ONE object parameter, so "it has arrived" is a real test.
Each checks the caller's `Person` row for what a role can't say: staff write only for their own seller (taken from
their row, never from what they sent), and nobody, the admin included, writes for a stopped seller.

**Stopping a seller (rule 4), measured, not assumed.** The generic store refuses to write an account's `disabled`
flag; Update User may. So `stopSeller` lists the seller's logins and Run Tasks switches each one off (on again when
it comes back). A stopped seller's staff can't sign in, and the session they already had is refused (400, code 209).

### 6.2 Readings (2026-10-14, working tree on `9599d7348`)

- `two-003-sellers.test.ts`: **25/25**. **19 mutants, 19 red** (each loosens one rule: a seller writing another's
  product or taking it off sale, writing for a stopped seller, a product moving seller, the seller taken from what was
  sent, a country moving, no history, no reason needed, the logins not switched or switched the wrong way, a second
  admin, any setup token, staff allowed to call the admin's three functions, anyone allowed `saveProduct`, the stopped
  reason readable). The first run found two greens; both were holes in the spec (no test moved a product between
  sellers; the stranger test accepted a script's refusal as the policy's) and were closed.
- `two003Template.test.ts`: 2/2. A regeneration is byte-identical (hashed twice).
- The TWO-001 specs: 49/49 with the `functions` block added.
- DEF-038: the marketplace is read now (it has a project file) and passes, with its control; 34/35, the red is
  `templates/nightbook` (P78's, untracked), as in s2.
- The census: `--check` went stale twice (the marketplace's script lines: 2107, then 9245 with the pages);
  regenerated each time, the only change was that count; exit 0. **It goes stale again every time the template's scripts change: rerun `npm run ontology-census`.**
- `npm run template:marketplace`: the template gate green; the door raises no warning but one deliberate one
  (`variable-in-repeated-component`: every product row shares "a product changed", on purpose).

### 6.3 The drive (AC1)

`two-003-drive.test.ts`, **1/1 green (65 s)**: the shipped template rendered headless by the real viewer against a
real backend locked with the template's policy, at **390×800 and 1024×640**. Nothing seeded but two countries and
three shelves. At each size, through the pages only: set up the admin with the token (the tablet pass: a second setup
refused on the page), sign in and land on Sellers, add a seller (Ghana; the tablet picks Nigeria), give it a login,
sign out, sign in as its staff and land on `products/mine`, save a product with no shelf (refused, with the reason),
pick a shelf and save, take it off sale and put it back, open `/admin/sellers` as staff (refused: "This page is the
admin's"), sign in as the admin, stop the seller with a reason (read back from the backend), and the staff sign-in is
refused ("This account is disabled").

- **Console errors: none**, except the three refusals the drive provokes on purpose, which the runtime also logs
  (asserted: only those words, only on those screens).
- **Horizontal overflow: 0 px** on every screen at both sizes.
- 26 screenshots in `shots/two003-{phone,tablet}-*.png` (sign-in, setup, admin-sellers, seller-form, give-login,
  seller-products, product-form, stop-seller, admin-sellers-stopped, staff-refused…).

**What looking at them found, that the drive had passed** (fixed, then driven again): the "Signed in as" band was
drawn under the list on the seller's pages (node order); a product landed on the "Cars" shelf because the dropdown
preselected the first shelf alphabetically (now no shelf until one is picked, and saving without one is refused);
prices read "GHS 45" where the picture says "GH₵ 45". The drive asserts all three now. And the drive itself found one:
a seller's staff opening `/admin/sellers` saw the admin's list and its buttons (every call would have been refused by
the policy, and nothing private showed); the admin's pages now ask `whoAmI` first.

### 6.4 Not built yet in slice 1, and where it differs from the picture

- ~~**Photos**: a product's photos and a seller's logo~~ — built and driven in s4 (§7).
- ~~**The Orders tab** on a seller's dashboard (slice 4) and the admin's **Ways to pay** and **Rates** tabs (slice 3)~~
  — built in s6 (§9) and s7 (§10).
- **"How buyers get it"** is a dropdown, where the picture draws two choice boxes. Gate 4 (TWO-009) to judge.
- The admin's sellers are a list of cards at both sizes; the picture draws a table on the tablet.
- Countries and shelves are seeded by hand (master key) until slice 3's functions set them.

### 6.5 Findings

- Filed `P121-TWO003-CLOUDPOINTSTO`: a `pointsTo` filter is refused in a cloud script ("needs the collection
  schema"); the same filter written as `equalTo` an explicit `{__type: 'Pointer'}` works.
- Filed `P121-TWO003-LOGINSUCCESS` (low): the door's example `user-login-flow` says Log In fires `success`; Log In
  and Log Out answer `done`. The door refused the wire here; an agent copying the sentence meets the same refusal.
- Met, not a product defect: `nodegx-node-spec/dist` was older than its `src` (P107's `settingsDiagnostics`, today),
  so the door failed to load until it was rebuilt (`npm run build` in that package; `dist` is gitignored).

## 7. Session 4 (2026-10-14, Opus 5.5): slice 1's photos and logos, and Upload File shrinks a photo

### 7.1 The product change: Upload File's Shrink Photos (P121-TWO008-UPLOADSHRINK)

Upload File has two new inputs, **Shrink To** (the longer side in pixels; 0, the default, sends every file as picked,
so every existing graph sends what it sent before) and **Photo Quality** (1–100, default 80). The canvas step is
`packages/noodl-viewer-react/src/nodes/std-library/shrinkphoto.ts`: the photo is decoded turned the way the camera
held it, drawn no larger than asked and sent instead of the original. It never enlarges, never re-encodes a photo
already small enough, keeps a PNG or WebP as itself (a logo keeps its transparency), leaves GIF and SVG alone, and
sends the original when the smaller one would weigh more or the browser can't read it: the upload is never lost to
the shrink.

What a new port owed, all paid: the catalog, the merged catalog and the node docs regenerated (twice: the second time
for P107's rules); the editor's row-class snapshot (CHR-007); P107's spec of Upload File (both inputs and their rules
in words, and two declared equivalent mutants, since the spec's world has no image decoder; `equivalent-mutants.ts`).

### 7.2 The template

- **The product form** draws the picture's photo grid: one 96 px tile per photo with **Remove** under it, then a dashed
  **+ Add a photo** tile, and the picture's sentence under them ("Photos are made smaller on your phone before they
  upload…", with "Up to 8."). Add opens the phone's picker, Upload File shrinks to **1600 px** at quality 80, and the
  tile shows the backend's `md` thumbnail. The list is kept on the page's own object while the form is open; a new
  load starts it again, so a photo taken off on a form left unsaved is back when the product is opened again.
- **A seller's product row** shows its first photo (`sm` thumbnail), as the picture draws it.
- **The seller form** has the logo (round, 64 px) and **Choose a logo**, shrunk to **512 px**; the admin's seller cards
  show it (`sm`).
- `/Seller/PhotoTile` is the new component; a tile says which photo goes through a shared variable whose value names
  the photo (the door's `variable-in-repeated-component` warning, deliberate, as for `productsChanged`).
- **`saveProduct`** keeps a product's photos when a change sends none, replaces them when it sends a list (at most 8),
  and keeps web addresses only (`http:`/`https:`). **`saveSeller`** keeps a logo only at a web address. Before s4 an
  edit that sent no photos emptied them.

### 7.3 Readings (2026-10-14, working tree on `9401ed1a3`)

- `noodl-viewer-react`: `shrinkphoto.test.ts` + `uploadfile.test.ts` **28/28**; **13 mutants, 13 red** (the bigger
  result kept, the type always JPEG, enlarging, the bitmap never closed, a decode failure thrown, GIF shrunk, a name
  changed for nothing, the default quality, `lastModified` lost; and in the node: the original sent after shrinking,
  the picked name kept, a PDF shrunk, the off path made asynchronous). The package: **1867/1867**.
- `two-003-sellers.test.ts` with the two TWO-001 specs: **49/49** (two rows new: photos kept, replaced, capped and
  checked; a logo at a script or data address dropped).
- **The drive, `two-003-drive.test.ts`: 1/1 (78 s)**, both sizes, no unexpected console error, 0 px overflow. New:
  the logo picked through the real file input; two photos added, one removed; the product row's thumbnail drawn; an
  unsaved removal not kept. What the backend stored, read back:

  | | picked | stored |
  |---|---|---|
  | product photo (4032×3024 JPEG) | 4,737,572 bytes | **117,834 bytes, 1600×1200 JPEG** (40× lighter) |
  | logo (1200×1200 PNG, transparent corners) | 28,853 bytes | **22,572 bytes, 512×512 PNG** |

  The fixture photo is generated (a colour with grain), so a real camera photo will shrink less in bytes; the size in
  pixels is the same.
- `two003Template.test.ts` **2/2** (regenerated byte-identical). Census regenerated: only the marketplace moved
  (9245 → 10231 lines), `--check` exit 0.
- `nodegx-node-spec`: catalog parity, the spec ledger and the records batch **458/458** after the spec change; the
  whole package 34 of 35 suites passed, and the 35th, `stranger.test.ts`, never finishes, **with or without this
  change** (a control with the two files back at HEAD stalled at the same line): filed **P121-S4-STRANGERSTALL** for P107.
- `noodl-mcp` whole package (run before the template change): **13 failed / 4010 passed**, none about Upload File:
  `templates/nightbook` (×4, untracked, P78), CMP-004 (×4, a shipped `icon.png` no export makes), FLD-013 (ParseCSV now
  translated: P18's uncommitted pile), BAK-002 (an `emailCode` template), two layout drives (DEF-018, SBR-009).
- 🔴 **The drive renders with a viewer bundle built from source, and a stale one hides a change.** The first run
  stored the logo unshrunk: `packages/noodl-editor/src/external/viewer/noodl.viewer.js` (gitignored) was a build from
  12:39 without the new inputs. Rebuilt with `cd packages/noodl-viewer-react && npx webpack --config
  webpack-configs/webpack.viewer.prod.js`.

### 7.4 What looking at the screenshots found

`shots/two003-phone-product-form-photos.png`, `…-seller-products-one.png`, `…-seller-form-logo.png`: the grid, the row
thumbnail and the logo sit where the picture puts them. The dashed Add tile reads faint on the phone. Not yet judged
at gate 4.

### 7.5 Findings

- **Filed P121-TWO003-SCRIPTCOMPILE** (medium): the door wrote `saveSeller` with a script that does not compile
  (a `\/\/` in a TypeScript template literal reached the script as `//`) and raised the same diagnostics as for the good
  one; the drive met it as "That could not be done." The door compiles script files, not a Function's inline script.
- **Filed P121-TWO003-EXPORTSHRINK** (medium, owner P18): an exported Upload File drops Shrink To and Photo Quality
  with no note; measured on `photo-desk`, the export with and without them is identical.
- P121-TWO008-UPLOADSHRINK: built (§7.1); its status goes to `fixed` with the commit.

## 8. Session 5 (2026-10-14, Opus 5.5): slice 2, the catalogue

### 8.1 What was built

A buyer with no account can now browse the shop. The app opens on it (the router's first page is the shop's home page;
it was Sign in).

| | where | what |
|---|---|---|
| pages | `packages/noodl-mcp/tests/two003Shop.ts` | **Home** (`/`): the shelves, the sellers, every product on sale as a card, a search, a currency picker. **A seller** (`seller/{sellerId}`): logo, story, what it has on sale. **A product** (`item/{productId}`): photos, price, seller, description; buy → **Order on WhatsApp**, enquire → "settled off the site" and **Message <seller> on WhatsApp**; no WhatsApp → the phone number |
| leaves | the same file | `/Shop/Top` (the bar and the currency), `/Shop/ShelfChip`, `/Shop/SellerChip`, `/Shop/ProductCard`, `/Shop/GalleryPhoto` |
| look | `two003Look.ts` | the WhatsApp green; the classes for what parameters can't draw: a grid two across on a phone and four on a tablet, square photos, rows that scroll sideways on a phone, shelves beside the products on a tablet, photos swiped one at a time on a phone (720 px is where the tablet layout starts) |
| spec | `packages/noodl-mcp/tests/two003Shop.test.ts` | every page script compiles (slices 1 and 2); the catalogue's rules run on fixtures; 20 mutants |
| drive | `packages/nodegx-backend/tests/two-003-shop-drive.test.ts` | the rendered app as a buyer, both sizes (§8.3) |

**The rules the pages keep.** Off-sale products and stopped sellers (and a stopped seller's products) are left out of
every list and every search; a link to one says it isn't here now. **The policy can't keep this one**: `Product` and
`Seller` are public reads (TWO-001), so anyone calling the API can still read a stopped seller's products. Nothing
private is in them (the payout account and the stopped reason stay the admin's), but "its products leave the
marketplace" is kept by the pages only. A row rule could make it the policy's; not needed for v1, written down for
gate 4.

**Prices.** A price converts through the admin's rates (`Rate`: one unit's worth in the marketplace's own currency):
`price × rate(seller's) ÷ rate(buyer's)`, with the seller's own price beside it when they differ. With no rate for
either, the seller's price shows unconverted and nothing is made up. The buyer's pick is kept on the phone
(`localStorage`, `mk-currency`) and shared by every page through the `currency` variable; with no pick, the
marketplace's own currency (the one worth 1). One currency, or none: no picker.

**Search** needs every word typed, in the product's name, description, seller, shelf or country. It runs on the phone
over what the home page read: every product, seller, country, shelf and rate, **up to 1,000 of each** (slice 1's
`all()`). A shop past 1,000 products needs paging; not this slice.

**Thumbnails.** Cards use the backend's `md` (256 px), the product page `lg` (1,024 px, contained), the seller chips
`sm`.

### 8.2 Readings (2026-10-14, working tree on `3dc9277b6`)

- `two003Shop.test.ts`: **31/31**, with **20 mutants, 20 red** (each loosens one rule in the shipped script: an
  off-sale product listed, a stopped seller's product or the seller listed, oldest first, every shelf offered, the
  shelf ignored, any word enough, search by name only, the rate upside down, a conversion with no rate, the original
  photo on a card, an off-sale or stopped seller's product opening, `md` on the product page, the WhatsApp number kept
  with its spaces, an enquiry worded as an order, a stopped seller's page opening, an off-sale product on a seller's
  page, the phone's currency forgotten, a picker for one currency). The mutants live in the spec, so the reading
  repeats. The first run: one mutant green (any word enough), a hole in the spec (no search had words matching
  different products), closed with "kofi zobo" → nothing; one red, Node printing the shilling as `KES` where Chrome
  prints `KSh`.
- **The drive: 1/1 (35 s)**, §8.3.
- `two003Template.test.ts` **2/2**. The door raises only deliberate `variable-in-repeated-component` warnings: two
  new, `shelf` (one pick for every chip) and `currency` (one for every page's bar). Four other warnings the first
  generation raised were real and fixed (labels never read with Use Label off, a gap that never applied, two heading
  rows with nothing to spread).
- The census: the marketplace's line count 10,231 → 14,593; every other source equal to HEAD's; `--check` exit 0.
- DEF-038 **34/35**, the red `templates/nightbook` (P78's, untracked), as in s2–s4.
- Slice 1 again, after the first page and the stylesheet changed: `two-003-drive.test.ts` **1/1 (83 s)**;
  `two-003-sellers.test.ts` with the two TWO-001 specs **76/76**.

### 8.3 The drive (AC1, AC5)

`two-003-shop-drive.test.ts`, at **390×800 and 1024×640**, against a backend locked with the template's policy.
Seeded with the master key: Ghana, Nigeria and Kenya with rates (cedi 1, naira 0.0091, shilling 0.11), three shelves,
four sellers selling and one stopped, six products: one off sale, one the stopped seller's, one a car to enquire
about, one with no photo. Photos are real files in the backend's store, so every thumbnail is the backend's.

At each size: the app opens on the shop with the four products on sale, newest first, and none of the five things a
buyer must never see (the off-sale gari, the stopped seller, its product, its stopped reason, a payout account);
prices in cedis with the naira and shilling beside; the naira picked re-prices every card, survives a reload, and
cedis come back; the Cars shelf shows the car alone, and the empty Phones shelf isn't offered; "kenya coffee" finds the
coffee and says so, "ghost" and "gari" find nothing; Shito's page shows its two `lg` photos, the seller, the shelf,
**Order on WhatsApp** opening `wa.me/233245550100` with the product named, and who confirms delivery (the phone says
"2 photos: swipe to see them all", the tablet shows both); the seller's page shows its story, logo and only what is on
sale; the car says it isn't bought here and offers **Message Ring Road Motors on WhatsApp**, no order; the zobo's
seller has no WhatsApp and its phone is shown; four links refused in words (off sale, a stopped seller's product, a
stopped seller, no such product); and the shop's **Sign in** reaches `/sign-in`.

- **Console errors: none.** **Horizontal overflow: 0 px** on every screen at both sizes.
- 14 screenshots: `shots/two003-{phone,tablet}-shop-{home,shelf,search,product,seller,enquire,gone}.png`.
- **AC5, the first page's weight** (phone, the browser's resource timing): **15 requests, 2,221,125 bytes**:
  1,938,618 of script (the viewer and the project, as the drive's local server sends them, uncompressed; the viewer
  alone is 1,751,711 bytes, **447,405 gzipped**), 9,750 of data, 677 of stylesheet, and four thumbnails, 4,609 bytes.
  🔴 The thumbnails come from the backend's origin, which sends no `Timing-Allow-Origin`, so the browser reports
  them as 0 bytes; the drive weighs each as served. The fixture photos are flat colours with grain, which shrink to
  almost nothing at 256 px: **a real photo's `md` thumbnail will weigh more, not measured.** Fonts come from Google and
  are not in the count.

**What looking at the screenshots found, that the drive had passed** (fixed, then driven again): initials, a seller's
country and "No photo yet" sat at the left of their box; a price and the seller's own price stacked where the picture
puts them side by side (a text's width is the whole row unless told otherwise); "Selling here? Sign in" split over two
lines; a phone showed one photo and no sign of the others. The drive asserts the last.

### 8.4 Where it differs from the picture (for gate 4)

- No basket, no bottom bar (Home, Shelves, Basket, My order), no quantity or **Add to basket**: slices 3 and 4. A buy
  product's one action is **Order on WhatsApp**, when its seller has a number. 🔴 **Slice 3 must offer it only where
  the seller's country has WhatsApp turned on** (AC4 is about checkout, and this button is the same way to pay).
- The car has no enquiry form (slice 5); WhatsApp, or the seller's phone, instead.
- A phone swipes the photos and says how many, where the picture draws dots.
- Prices read `GH₵45`, the browser's own spacing for the locale, where the picture writes `GH₵ 45`.
- The product's seller line reads "Ghana · Food and drinks"; the picture's "Accra, Ghana · sells food and drinks"
  needs a city, which the world doesn't hold.
- The products' heading is "On sale", where the picture says "Fresh this week" (nothing in the world says what's new
  this week). Shelves with nothing on sale aren't offered.
- A seller with no logo shows its initials on one of five colours from the look, picked from its id.
- A section heading's small words line up on the bottom of the heading box, not its text (P121-TWO003-BASELINE).

### 8.5 Findings

- **Filed P121-TWO003-GROUPKEYBOARD** (medium): a Group (or Text, or Image) whose Click is wired can't be reached from
  the keyboard; no tag choice or port gives it a tab stop. The cards and chips here put the name in a Button styled
  as text, wired to the same navigate, Click Bubbling `never`.
- **Filed P121-TWO003-BASELINE** (low): Group's Align Items has no `baseline`.
- Met, not a defect: the door refused `clickBubbling: false` and named the three values it takes (`auto`, `always`,
  `never`); a good refusal.
- Met, a trap for measuring: resource timing reports a cross-origin image as 0 bytes (§8.3).

## 9. Session 6 (2026-10-14, Opus 5.5): slice 3, the basket and the checkout

### 9.1 The world changed first: the way to pay moved from the order to the order part

The approved picture's checkout asks **"How you'll pay in Ghana"** and **"How you'll pay in Nigeria"**: one way to pay
per seller country, as R8 (ruled A: one payment per seller country) needs, since a Paystack split is one country and one
currency. The world (TWO-001) said "an order is paid one way", which can't hold two. The relation `orderPaidBy` now runs
from the **order part**: "each order part is paid one way, the one the buyer picked for its seller's country".
`WORLD.md` says so in words; `backend/schema.json` is the projection again (`TWO_SCHEMA_WRITE=1`); the policy's frozen
fields moved with it (Order: `number, person, country`; OrderPart: `wayToPay, order, seller`); the TWO-001 spec seeds
the way on each part. TWO-001 **22/22**. Not a ruling Richard was asked for: it is R8-A and the picture he sent on,
written into the world. Gate 4 (TWO-009) can overturn it.

### 9.2 What was built

| | where | what |
|---|---|---|
| functions | `packages/noodl-mcp/tests/two003Checkout.ts` | the admin's `saveCountry`, `saveRates`, `saveShelf`, `saveWayToPay` (`role:admin`); a buyer's `placeOrder` and `followOrder` (**public**, rate-limited: a buyer has no account, W2) |
| buyer's pages | `two003Basket.ts` | **the bottom bar** on every buyer's page (Home, Basket · n, My order); **the basket** (`basket`); **the checkout** (`checkout`); **the order** (`order/{token}`, the private link) |
| the product page | `two003Shop.ts` | how many (1–99), **Add to basket · GH₵90**, "2 in your basket. See your basket →"; **Order on WhatsApp instead** only where WhatsApp is on in the seller's country |
| admin's pages | `two003Admin.ts` | the tabs **Sellers · Ways to pay · Rates · Shelves** on every admin page; **Ways to pay** (`admin/ways-to-pay`: the countries, and each way switched on per country, with its words to buyers); **Rates** (`admin/rates`); **Shelves** (`admin/shelves`) |
| specs | `two003Basket.test.ts` (pages), `nodegx-backend/tests/two-003-checkout.test.ts` (functions on a locked backend), `two-003-checkout-mutants.test.ts` (that spec's mutants, `TWO003_MUTANTS=1`) | §9.3 |
| drive | `nodegx-backend/tests/two-003-checkout-drive.test.ts` | §9.4 |
| harness | `two003Run.ts` | runs a page script against fixture rows (`equalTo`, `containedIn`, `relatedTo`), storage, the page's object and a cloud stub; slice 2's spec uses it too |

**`placeOrder` never takes from the buyer** a price, a seller, a subtotal or a total: it groups the products by their
seller into parts, prices each line at the product's price **now** (rule 2), and checks each seller country's picked way
against the countries the admin turned it on in (a relation, read with `relatedTo`), WhatsApp only where every seller in
that country has a number. The number is the year's next (`MK-2026-00001`; two checkouts at once meet the store's unique
index and the second takes the next); the private link is 24 random bytes from `crypto.getRandomValues`, made in the
function. `followOrder` takes the token alone and refuses a short or unknown one the same way.

**What a way to pay is.** One `WayToPay` row per method (pay on delivery, bank transfer, order on WhatsApp), made the
first time the admin turns it on, never deleted (parts point at it), with a relation to the countries it is on in.
Card and mobile money are TWO-004's: `saveWayToPay` refuses them until their door exists, and the admin's page says so.

**The marketplace's own currency** is the one worth exactly 1: the first rates saved must name it, it stays 1, and no
other currency may be worth exactly 1 (the buyer's pages start in "the one worth 1"). Every rate is checked before any
is written.

**On the phone:** the basket (`mk-basket`) and the orders placed or opened there (`mk-orders`, for **My order**). The
`basket` variable is a stamp every change sets; every page reads the storage again when it moves. A product that stops
being on sale is taken out of the basket the next time it is opened, and the page says which.

### 9.3 Readings (2026-10-14, working tree on `ccfe3e66f`)

- `two-003-checkout.test.ts` **22/22**; its mutants **23 of 23 red** (each loosens one rule in a shipped function's
  script, in a copy of the template: two countries with one name, a currency changed under its sellers, a rename with
  no history, the own currency off 1, a second currency worth 1, a rate of 0, rates with no own currency, card and
  mobile money turned on, a way never turned off, a country that isn't there, the phone's price believed, a way off in
  the country taken, WhatsApp to a seller with no number, an off-sale product, a stopped seller's product, a car
  through the basket, half a product, the second of two lines winning, a subtotal forgetting the quantity, a guessable
  link, a part with no history, any link opening an order, every line under every part). The first run found a real
  bug, not a hole: `text(currency, 3)` cut "cedi" to "CED", which passed the three-letter check; the scripts now read
  the whole value first.
- `two003Basket.test.ts` **40/40**: 14 checks, **26 mutants, 26 red**. The first run: every check green, one mutant
  green (the own currency not sorted first), a hole in the spec (the cedi sorts first by its letters anyway), closed
  with the naira as the own currency.
- `two003Shop.test.ts` **33/33** (slice 2's, on the shared harness, with the product page's AC4 check and its mutant:
  21 of 21 red).
- `two003Template.test.ts` **2/2**; the sellers, checkout and both TWO-001 specs **98/98**; DEF-038 **38/39**, the red
  `templates/nightbook` (P78's, untracked), as in s2–s5.
- **The door raised no warning** on the whole template. The 63 `variable-in-repeated-component` warnings (15 in s5)
  were each a variable shared by design (one basket, one currency, one pick per country); each now says so in its node's
  comment, the rule's own escape ("shared on purpose", GAM-005), from one map in `two003Template.ts`
  (`SHARED_ON_PURPOSE`). A variable shared by accident would still warn.
- The census: one new candidate, `placeOrder.counter@read-aloud` (the order number formatted into text), classified
  **yes** in `kinds.hand.json`; the marketplace's code lines 14,593 → 26,991; nothing else moved; `--check` fresh.
- Slices 1 and 2 again: `two-003-drive.test.ts` **1/1**, `two-003-shop-drive.test.ts` **1/1** (its seed turns WhatsApp
  on in Ghana and Kenya now, since a buy product offers it only there; the button reads "Order on WhatsApp instead").

### 9.4 The drive (AC1, AC4, AC3's buyer half)

`two-003-checkout-drive.test.ts`, **1/1 (81 s)**, at 390×800 and 1024×640, against a backend locked with the
template's policy. Nothing seeded with the master key but the setup secret and the photos' bytes.

- **The admin sets the marketplace up through the pages** (phone pass): `/admin/ways-to-pay` opened with no sign-in is
  refused ("Sign in to see this page."); signed in, the tabs; Ghana (GHS) and Nigeria (typed `ngn`, stored `NGN`)
  added, a second Ghana refused in words; pay on delivery switched on in both, bank transfer in Nigeria, WhatsApp in
  Ghana; the rates typed (GHS 1, NGN 0.0091) and saved; a shelf added. Sellers and products then come through slice
  1's functions.
- **A buyer with no account:** + + − to 2 shito, "Add to basket · GH₵90", "2 in your basket", the bar says
  "Basket · 2"; the zobo (Nigeria, no WhatsApp number) offers no WhatsApp order; the basket shows both sellers, "Ghana ·
  pays in GH₵", "Nigeria · pays in ₦", a total per country, "Two countries, two payments", "About GH₵152 together"; +
  and − on a line move it and the bar; **the checkout offers Ghana pay on delivery and WhatsApp, Nigeria pay on delivery
  and bank transfer, and no WhatsApp in Nigeria** (AC4); placing with no name is refused in words and places nothing;
  placed, the order's page opens at `/order/<48 hex>`: "Order MK-2026-00001", the number to read out, each part
  "Waiting for the seller" with how it will be paid, the bank transfer's reference, "Message Kofi's Kitchen on
  WhatsApp"; the basket is empty; **My order** opens it again from the shop. The store read back: one order, a part per
  seller with the way picked for its country, each line at its price.
- **The tablet pass, AC4's other half:** the admin switches WhatsApp off in Ghana; the shito page stops offering
  "Order on WhatsApp instead" and the checkout's Ghana offers pay on delivery alone; the naira's rate changed to
  0.0095 and saved; the shelf renamed. Order MK-2026-00002 placed and read back the same way.
- **AC3:** a link with a made-up token says "There is no order at this link." and shows nothing of anyone's order.
- An empty basket and an empty checkout say so.
- **Console errors: none**, beside the refusals the drive provokes on purpose (no sign-in, a second Ghana, no name, a
  made-up link), each allowed only on its own screen. **Horizontal overflow: 0 px** everywhere.
- 18 screenshots: `shots/two003-{phone,tablet}-checkout-{admin-refused,admin-ways,admin-rates,admin-shelves,product,basket,checkout,order,gone}.png`.

**What the drive and the runtime found, that the specs had passed:** the admin's country switches were rows with a
field named `on`, which is one of a Noodl Object's own names, so `row.on` never read the data; the runtime said so in
the console (`collection/reserved-field-name`) and the drive's console gate stopped on it. Renamed `isOn`. **What looking
at the screenshots found:** on a phone the step "Confirmed" broke mid-word ("Confirme / d"; now one line, smaller on a
phone); a part paid on WhatsApp named its seller twice in one sentence ("Finish it with them on WhatsApp"); the country
switches drew the control's own 32 px black-bordered box (now 22 px in the look's indigo).

### 9.5 Where it differs from the picture (for gate 4)

- The admin has a fourth tab, **Shelves**, and the countries sit on **Ways to pay**: the picture draws neither page.
  A country can be added, not renamed, from the page (`saveCountry` renames; nothing calls it yet).
- **Ways to pay** is a card per way with a switch per country, where the picture draws a table of toggles; card and
  mobile money is a grey card saying it comes with the payment provider.
- The bottom bar has **Home, Basket, My order**: the picture's fourth, "Shelves", is the home page's own row.
- No basket icon in the top bar (the picture has 🧺 with a count); the count is on the bottom bar.
- The order page shows the bar's steps and words; the picture's "Paid GH₵148 by MTN MoMo" needs a payment, which is
  TWO-004's.
- A pick is a whole box with ◉ or ○ before the way's name.
- "Make an account (optional)" at checkout is not built: a buyer's account and past orders are later (the world allows
  `Order.person`).

### 9.6 Findings

- **None filed.** Met, all good refusals: the door refused a wire to a Function input its script never names
  (`followOrder` has no caller), and a padding on a Text (it has no box); the runtime named a reserved row field; the
  census caught an unclassified read-aloud counter.
- Met, not filed: a Checkbox with no look set draws 32 px with a black border; every control's defaults are the old
  black ones (Button's background too), so it is a known way of the controls, not this template's to file.
- Our own: the world's single way to pay per order (§9.1), and `text(x, 3)` truncating before validating (§9.3).

## 10. Session 7 (2026-10-15, Opus 5.5): slice 4, orders

### 10.1 The world first: paid on delivery has no "paid" step, and a cancel says why

The steps were one list for every way to pay: new, confirmed, **paid**, packed, sent, delivered. For pay on delivery the
money changes hands at the door, so "paid" before "packed" can't be true; the buyer's page would have said "Paid" while
the rider was still on the way. Now **paid on delivery has no paid step: it is paid when it is delivered** (the
seller's last button reads "Delivered and paid"). Bank transfer and WhatsApp keep it, and the seller says when the money
is with them. And **a part can be cancelled until it is delivered, always with why**, which the buyer reads: the world
had `cancelled` as a status and nowhere to keep why, so the order part gained `cancelledReason` (`nouns.json`,
`WORLD.md`; `backend/schema.json` rewritten by `TWO_SCHEMA_WRITE=1`, TWO-001 22/22). Not asked of Richard; gate 4 can
overturn either.

### 10.2 What was built

| | where | what |
|---|---|---|
| function | `packages/noodl-mcp/tests/two003Orders.ts` | **`movePart`** (`role:admin`, `role:staff`): one part, to its NEXT step for its way to pay, or to cancelled with why. Confirming needs the delivery cost in the seller's currency (0 when free; a comma reads as a decimal point) and may say when. Delivered and cancelled are the end. Staff move only their own seller's parts, taken from their Person row; the admin moves any. Each move writes its `OrderPartHistory` row |
| page | the same file | **Orders** (`orders`), for a seller's staff ("Your orders") and the admin ("Every order", each part named with its seller and country): four counts (to confirm, to be paid, to pack and send, on their way), then the parts by what they need (to confirm, waiting for the buyer to pay, to pack, packed to send, on its way, delivered, cancelled), newest first. Each card: the order number and buyer, what is in it, the address and phone, how it is paid (a bank transfer with its reference), the delivery cost and total; a new part's **Delivery cost (GH₵)** and **When it comes** with **Confirm and ask the buyer to pay** (on delivery: **Confirm: they pay when it arrives**); otherwise the one next step; **Cancel this part…** asking why |
| leaves | the same file | `/Seller/Tabs` (Orders · Products), `/Seller/OrderSection`, `/Seller/OrderCard`, `/Seller/Kpi` |
| tabs | `two003Admin.ts`, `two003Pages.ts` | the admin's tabs gain **Orders** (Sellers · Orders · Ways to pay · Rates · Shelves; a phone scrolls them sideways rather than wrap); a seller's Products page carries Orders · Products; **a seller's staff land on Orders** after signing in (the picture's first tab) |
| the buyer's page | `two003Basket.ts`, `two003Checkout.ts` | `followOrder` hands back why a part was cancelled; the order page draws five steps for pay on delivery, owes the money until it is delivered, shows when delivery comes ("Delivery GH₵20 (Thursday)") and why a part was cancelled |
| specs | `two003Orders.test.ts` (the page, 14 mutants), `nodegx-backend/tests/two-003-orders.test.ts` (`movePart` on a locked backend), `two-003-orders-mutants.test.ts` (its 12 mutants, `TWO003_MUTANTS=1`) | §10.3 |
| drive | `nodegx-backend/tests/two-003-orders-drive.test.ts` | §10.4 |

The page reads as the signed-in person and the policy (TWO-001) decides what comes back: staff get their own parts, the
orders those parts are in (name, phone, address; never the private link) and their lines. Up to 1,000 parts; a seller
past that needs paging, and the Delivered list grows forever (gate 4: a "this month" view, as the picture's tablet
counts suggest).

### 10.3 Readings (2026-10-15, working tree on `cdc6ebde9`)

- `two-003-orders.test.ts` **12/12**; its mutants **12 of 12 red** (a seller moving another's part, the seller taken
  from what was sent, a delivered or a cancelled part moving again, a step skipped, a paid step on delivery, a cancel
  with no why, why not kept, confirmed with no cost, a cost below 0, a comma not read, a move with no history). First
  run: one red, a hole in the spec, not the script: a parameter that isn't an object is refused by the Request node
  ("expects object") before the script runs; the spec now expects those words.
- `two003Orders.test.ts` **20/20** (5 checks, 14 mutants, all red); `two003Basket.test.ts` **43/43** (3 new mutants
  for the order page: a paid step on delivery, paid before it arrives, why left out). The order page's fixture had an
  on-delivery part at "paid", which can't happen now; it pays by bank transfer instead.
- `two003Shop.test.ts` 33/33, `two003Template.test.ts` 2/2; `two-003-checkout` + `-sellers` + both TWO-001 specs
  **110/110** with `two-003-orders`.
- The door: it **refused** the first Orders page (`repeated-sibling-subtree`: three hand-made count boxes); now one
  `/Seller/Kpi` in a For Each. Then **no warning** on the template.
- The census: the marketplace's code lines 26,991 → 29,711; every other source equal to HEAD's; no new candidate;
  `--check` fresh.
- DEF-038 **36/37**, the marketplace read and green with its live control; the red is `templates/nightbook` (P78's,
  untracked), as in s2–s6. (37 rows, not s6's 39: the templates on disk differ, none of them this phase's.)
- Slices 1–3 again: `two-003-drive` **1/1** (staff now land on Orders, "No orders yet", then Products),
  `two-003-shop-drive` **1/1**, `two-003-checkout-drive` **1/1**. 🔴 A peer's full jest run overlapped these three.

### 10.4 The drive (AC1, AC2)

`two-003-orders-drive.test.ts`, **1/1 (84 s)**, at 390×800 and 1024×640, against a backend locked with the template's
policy. The marketplace, sellers and logins come through the functions; each pass's order through `placeOrder` as a
buyer with no account (slice 3's drive places one through the pages). Everything after is the pages.

- The buyer's page: both parts "Waiting for the seller".
- **Kofi (Ghana) signs in and lands on `/orders`**: his part only; nothing of Ada's though it's the same order (no
  zobo, no Ada, no ₦6,800). Confirm with no cost is refused in words and the store still says `new`; GH₵20, "Thursday",
  confirmed: straight to **To pack** (pay on delivery). The buyer's page says "Delivery GH₵20 (Thursday), confirmed by
  the seller" while Ada's still waits. Packed, Sent, **Delivered and paid**, each section read. Products and back.
- Phone pass: a second order Kofi cancels: "Cancel it" with no why is refused in words; with "Out of shito until
  November" it sits under Cancelled, and the buyer's page reads "This part was cancelled: Out of shito until November."
- **Ada (Nigeria) signs in**: her part only. Phone: pay on delivery, the same path. Tablet: a bank transfer, so
  confirmed waits under **Waiting for the buyer to pay** with "Bank transfer, reference MK-…" and "1 to be paid"; the
  buyer's page asks for the transfer with the number as reference; **The buyer has paid**, then packed, sent, delivered.
- **AC2: the buyer's page shows both parts delivered**, "Paid: GH₵110" and "Paid: ₦8,300"; the store's history for
  Ada's part reads its five steps (phone) or six (tablet).
- The admin signs in, opens the **Orders** tab: "Every order", each part named "Kofi’s Kitchen · Ghana", "Ada’s Farm
  Drinks · Nigeria"; the five tabs on one line and all on screen. Signed out, `/orders` is refused and shows no order.
- **Console errors: none**, beside the refusals the drive provokes on purpose (no cost, no why, a stranger), each
  allowed only on its own screen. **Horizontal overflow: 0 px.**
- 23 screenshots: `shots/two003-{phone,tablet}-orders-*.png`.

**What looking at the screenshots found, that the drive had passed** (fixed, driven again, the drive asserts the
visible ones): on a phone the admin's fifth tab pushed "Ways to pay" onto two lines; the first fix made each tab as
wide as the screen so only "Sellers" showed, and the drive's check (every tab the same height) passed it, so it now
checks every tab is on screen; a delivered card kept an empty row where its buttons were, and an empty line for an
error; a part waiting for a bank transfer counted in no box (a fourth, "to be paid"); the cost read "(GHS)" where the
picture says "(GH₵)".

### 10.5 Where it differs from the picture (for gate 4)

- Four counts at both sizes; the picture has three on a phone and six on a tablet (delivered this month, money this
  month, enquiries: no "this month" yet, and enquiries are slice 5).
- A section per stage down to Delivered and Cancelled, every part kept; the picture shows To confirm and Paid, to pack.
- The confirm box sits inside each new card; the picture draws one box under the list for the order picked.
- The admin's Orders is the same page with each part's seller named, not a table.
- No way back: a part moved by mistake can only go forward or be cancelled.

### 10.6 Findings

- **None filed.** Met, both good refusals: the door's `repeated-sibling-subtree` (three hand-made boxes, use a
  component), and the backend's Request refusing a parameter of the wrong type before the script ran.
- Met, not a defect: a Button's default width is the whole row; a class that stops it growing must also say
  `width: auto`.

## 11. Session 8 (2026-10-15, Opus 5.5): slice 5, enquire

### 11.1 The world first: an enquiry can be marked answered

The world's `Enquiry` held the buyer's name, a contact and a message, and nothing a seller could work through: every
enquiry ever sent would sit in one list. It gained **`answeredAt`** (a date): the seller marks one answered once they
have talked, and can unmark it (`nouns.json`, `WORLD.md`; `backend/schema.json` rewritten by `TWO_SCHEMA_WRITE=1`,
TWO-001 22/22). The policy's Enquiry rules didn't change: staff read the enquiries about their own seller's products,
the admin reads every one, and nobody writes one directly; two functions do. Not asked of Richard; gate 4 can
overturn it.

### 11.2 What was built

| | where | what |
|---|---|---|
| functions | `packages/noodl-mcp/tests/two003Enquire.ts` | **`sendEnquiry`** (`public`, 5 a minute): a product on sale, sold by enquiry, by a seller who isn't stopped; the buyer's name (120 at most), a number **with its country code** (`+` or `00`, 8 digits or more, 40 characters at most: the seller opens WhatsApp on it, and `wa.me` needs the whole number), and what they ask (2,000 at most). Each is checked whole; too long is refused, never cut. **`answerEnquiry`** (`role:admin`, `role:staff`): marked answered or not answered yet; staff only for their own seller's products, taken from their Person row; writes `answeredAt` and nothing else |
| the product page | `two003Shop.ts` (the form), `two003Enquire.ts` (its scripts) | an enquire product shows **Your name**, **Your phone or WhatsApp, with the country code**, **Your message** and **Send to Ring Road Motors**, under "This one isn't bought here…", with the seller's WhatsApp still beside it. A refusal is said under the button; once sent, the form gives way to "Sent to Ring Road Motors. They'll reach you on +233 24 555 0187, and you agree the rest between you." (the number never breaks across lines). A buy product has no form |
| page | `two003Enquire.ts` | **Enquiries** (`enquiries`), for staff ("Enquiries") and the admin ("Every enquiry", each named with its seller): **To answer (n)** then **Answered (n)**, newest first. Each card: the product, the buyer's name, number and the day it was sent (and answered), what they ask, **WhatsApp Kwame** (opens `wa.me` on their number with "Hello Kwame, about Toyota Corolla 2015: " typed), **Call +233 24 555 0187** (`tel:`), and **Mark answered** (filled) or **Not answered yet** (outline) |
| leaves | the same file | `/Seller/EnquiryCard`, `/Seller/EnquirySection` |
| tabs | `two003Orders.ts`, `two003Admin.ts` | a seller's tabs: Orders · Products · **Enquiries**. The admin's: Sellers · Orders · **Enquiries** · Ways to pay · Rates · Shelves. Six don't fit a phone (the words alone are about 380 px), so there the bar scrolls sideways (s6's `mk-tabs-many`) and **the page's own tab is brought into view** by the tabs' script (P121-TWO003-SCROLLINTOVIEW, §11.5) |
| specs | `two003Enquire.test.ts` (the page scripts, 16 mutants), `nodegx-backend/tests/two-003-enquire.test.ts` (the two functions on a locked backend), `two-003-enquire-mutants.test.ts` (15 mutants, `TWO003_MUTANTS=1`) | §11.3 |
| drive | `nodegx-backend/tests/two-003-enquire-drive.test.ts` | §11.4 |

**Spam.** `sendEnquiry` is open to anyone, held to 5 a minute per caller by the policy's rate limit (not measured: the
specs turn rate limits off, as slice 3's did). Nothing else stops a determined sender; a seller sees each one and
marks it. Gate 4: whether the admin wants a way to hide one.

### 11.3 Readings (2026-10-15, working tree on `38373d895`)

- `two003Enquire.test.ts` **22/22**: every script compiles (5 page, 2 function), 5 checks, **16 mutants, all red**
  (a seller reading every seller's enquiries, oldest first, an answered one left under To answer, the count out of the
  heading, an empty section shown, a `00` number opening the wrong chat, a call without its `+`, when it was answered
  left out, the mark that can't be undone, the admin not told whose, any signed-in person reading the page, the form
  dropping the product, the mark sending the same thing twice, the buyer not told where they'll be reached, the number
  breaking across lines, undoing drawn as the thing to do).
- `two-003-enquire.test.ts` **13/13**; `TWO003_MUTANTS=1 npx jest tests/two-003-enquire-mutants.test.ts` **15 of 15
  red** (a basket product, an off-sale one or a stopped seller's asked about; no name; a long name or message cut to
  fit; a number with no country code or too short; nothing asked; the words untrimmed; another seller's staff marking
  it; the seller taken from what was sent; anything counting as yes; no unmarking; the message changed with the mark).
  The first run had one red, a hole in the spec: the REST read gives `null` for an unset date, not `undefined`.
- With the TWO-001 specs and slices 1, 3 and 4's backend specs: **123/123**.
- `two003Shop.test.ts`, `two003Basket.test.ts`, `two003Orders.test.ts`, `two003Template.test.ts` with
  `two003Enquire.test.ts`: **120/120**.
- The door: **no warning** on the template (`npm run template:marketplace`, 65 components).
- The census: one new candidate, `sendEnquiry.digits@count` (`row-count-near-a-create`): **no**, a phone number's
  digits, not a count of records (`kinds.hand.json`). The marketplace's code lines 29,711 → 32,210; nothing else moved;
  `--check` fresh.
- DEF-038 **36/37**, the marketplace green with its live control; the red is `templates/nightbook` (P78's, untracked),
  as in s2–s7.
- Slices 1–4's drives again, one at a time: `two-003-drive` **1/1** (81 s), `two-003-shop-drive` **1/1**,
  `two-003-checkout-drive` **1/1**, `two-003-orders-drive` **1/1** (its tab check now reads six tabs: all on screen on
  a tablet; on a phone the bar scrolls and Orders is on screen).
- The viewer bundle (Oct 14 19:56) is newer than every file in `noodl-viewer-react/src` and `noodl-runtime/src`.

### 11.4 The drive (AC1)

`two-003-enquire-drive.test.ts`, **1/1 (48 s)**, at 390×800 and 1024×640, against a backend locked with the template's
policy. The marketplace, two sellers (Ring Road Motors with a WhatsApp number; Kofi's Kitchen), a Corolla and a van
to enquire about, a shito to buy, and two logins come through the functions; one enquiry about Kofi's van is sent by
`sendEnquiry` as a stranger. Everything after is the pages.

- The shito's page has no form. The Corolla's: the three fields (read from their labels), **Send to Ring Road
  Motors**, **Message Ring Road Motors on WhatsApp**, no basket.
- Send with nothing typed: "Say who the message is from." A number with no country code (`024 555 0187`): "A number
  the seller can call or WhatsApp, with its country code, like +233 24 555 0187." Nothing reaches the store.
- With `+233 24 555 0187`: sent; the fields are gone and the sentence says who has it and where they'll reach you. The
  store holds the number as typed, not answered.
- **Ring Road Motors' staff** sign in (Orders), open **Enquiries**: "To answer (1)" (the tablet: 2), the card reads
  "Kwame Mensah · +233 24 555 0187 · sent 15 Oct", the message, **WhatsApp Kwame**, **Call +233 24 555 0187**. Nothing
  of Kofi's van. The seller's three tabs, all on screen. **Mark answered**: "Answered (1)", "answered 15 Oct", the
  store's `answeredAt` set; the phone then **Not answered yet**, and it's back under To answer, `answeredAt` cleared.
- **Kofi's staff**: only the van's enquiry (Ama Owusu, "Can it carry 500 kg?"); nothing of the Corolla.
- **The admin** opens **Enquiries** from Sellers: "Every enquiry", each with its seller. Six tabs, one height. The
  tablet shows all six; the phone's bar scrolls, the Enquiries tab on screen. On the Shelves page, the last tab is on
  screen too.
- Signed out, `/enquiries`: "Sign in to see this page.", no enquiry shown.
- **Console errors: none** beyond the drive's own provoked refusals (no name, no country code, the stranger), each
  allowed only on its own screen. **Horizontal overflow: 0 px.**
- 16 screenshots: `shots/two003-{phone,tablet}-enquire-*.png` (product, refused, sent, staff-open, staff-answered,
  admin-enquiries, admin-shelves, stranger).

**What looking at the screenshots found, that the drive had passed** (two fixed and driven again; the third written
down): on a phone the sent sentence broke the number across two lines ("+233 / 24 555 0187"), now kept whole with
no-break spaces (the drive reads it); on an answered card **Not answered yet** was the filled button, so undoing read
as the thing to do, now an outline (a mutant holds it); and a stranger refused on a staff page sees a "Sign out" band
with no name in it. That band is every staff page's, from slice 1 (the shared `shell`). Not changed here, for gate 4
or the next slice that touches the shell.

### 11.5 Where it differs from the picture (for gate 4)

- The picture's tablet counts "1 enquiry" on the Orders page; here the count is on the Enquiries tab's own headings
  ("To answer (1)"), and the Orders page has no enquiry count. Adding one means the Orders page reads enquiries too.
- The picture's message box shows "Is it still for sale? Can I see it on Saturday?" as typed words; here it is the
  placeholder, so a buyer who sends without typing is asked what they'd like to ask.
- The admin's tabs are six, where the picture draws three; a phone scrolls them.
- A seller isn't told an enquiry arrived (no email, no push): they see it when they open the tab. A notification needs
  the backend's mail, not built here.
- No conversation in the app: the seller answers on WhatsApp or by phone, as R10 has the sale settled off the site.

### 11.6 Findings

- **Filed P121-TWO003-SCROLLINTOVIEW** (low): a row that scrolls natively has no way to bring a child into view; Scroll
  To Index and Scroll To Element exist only on the non-native scroller (the one with open layout defects). The
  template's tabs do it with DOM code in a Function.
- Met, a good catch: the census raised the phone number's digit count as a possible row count near a create; one verdict,
  "no".
- Met, a trap for drives: an admin row's name is in an input, so `innerText` doesn't carry it (the Shelves page).
