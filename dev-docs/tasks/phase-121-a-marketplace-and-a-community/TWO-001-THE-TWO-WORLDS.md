# TWO-001 — The two worlds

**Opened 2026-10-14.** **Depends on TWO-000 (can start from README §2's proposal).** **Status: ✅ s2 (2026-10-14): AC1–AC3 met (§7). Schemas byte-gated, both policies tested by breaking each rule; the census green; DEF-038 skips both until a `nodegx.project.json` exists.** Rulings W1, W2 and R8 answered 2026-10-14. Kind: design.
**Model:** Fable (the worlds decide every collection, role and rule; wrong here is expensive later).

## 1. The person sentence

> **Before anything is drawn or built, each app's world is written down in plain words: the things in it, who can do
> what to them, and the rules. The backend schema and the security policy are projected from that, never written by
> hand.**

## 2. What exists

- The P116 path, as P118 and P119 used it: `docs/world/` → `backend/schema.json` (byte-gated) and the policy in
  `nodegx.security.json`. Read P119 README §1b and §2 as the most recent worked example.
- TPL-001's members' area: roles, approval, moderators, restricted content (`templates/members-area`,
  `members-area.security.json`).
- The two repo gates that scan `templates/`: the ontology census (P116 `kinds.hand.json` + regen) and DEF-038.

## 3. What to do

1. **The shop's world** (from the builder's answers): admin, seller (country, currency, contact), seller's login, product
   (mode: buy or enquire), category, photo, buyer, basket, order, order part (one per seller), enquiry, country, way to
   pay (turned on per country), payment (provider, status), currency rate. Who does what: the admin creates, edits and
   deletes sellers and any product; a seller manages only their own products and order parts; products are public; an
   order belongs to its buyer, its sellers (their parts) and the admin.
2. **The community app's world:** member (pending, approved, blocked), admin (the builder, then volunteers he names), profile, post
   (photos, caption, kind: post, prayer, devotional), heart, prayed, comment, report, devotional (title, date,
   scripture, body, source: archive or written), note (private, optionally on a verse or a devotional), Bible
   (translation, book, chapter, verse). Who sees what: approved members see the feed; a devotional's public page needs
   no account (R5); a hidden post is seen by admins only; a note by its writer only.
3. **Children (README §7):** a rule for young members and photos of children, written before the build. Ask Richard
   if the rule needs a ruling.
4. Project both worlds to schema and policy; both repo gates green.

## 4. Acceptance criteria

1. Two `docs/world/` folders, each readable by the builder (plain words, no field types in the prose).
2. Schema and policy projected from them, byte-gated, policy tests that sabotage each rule and see it refuse.
3. The ontology census and DEF-038 green with both templates present.

## 5. Not this task

Pages, components, styles.

## 6. Session 1 (2026-10-14, Opus 5.5; the Model line says Fable)

### 6.1 What was written

| | the gram | the marketplace |
|---|---|---|
| the world | `templates/gram/docs/world/` | `templates/marketplace/docs/world/` |
| in plain words | [`templates/gram/docs/WORLD.md`](../../../templates/gram/docs/WORLD.md) | [`templates/marketplace/docs/WORLD.md`](../../../templates/marketplace/docs/WORLD.md) |
| nouns | 6: member (signs in), post, comment, devotional, note, the community (only one) | 11: person (signs in), seller, country, rate, category, product, way to pay, order, order part, order line, enquiry |
| relations | 14: 5 belongs-to, 4 happened-to (heart, I prayed, two reports), 3 ends (block, hide ×2), 1 owned-by (a note) | 17: 12 belongs-to, 1 together (a way to pay on in a country), 1 happened-to (a payment), 2 ends (off sale, seller stopped) |
| `projectWorld` | 13 collections, 50 claims, 9 not kept by the store | 19 collections, 73 claims, 7 not kept |
| `nextQuestions` | 57 asked at first; `enough: true` after the defaults | `enough: true` (written with its answers) |

Every sentence in the worlds is ours (R1): none of the builder's words. A P116 world wants "what the person said";
here that is the requirement in our words, and the builder's own answers stay in the private folder.

**How the 57 were answered.** The same per-link pattern P119 met (bug P119-S2-WORLDPERLINK): five belongs-to links
asked four questions each, three "ends" asked six, four "happened-to" asked five. They were answered from BRIEF.md,
or as a default, and the defaults that matter are §6.3's questions, to overturn. What the not-kept claims are:
histories written by a function, not the store (as P119); a detail that matters only for one kind (an event's date,
an archive devotional's file); "there is only one community"; "only its member sees a note" (a path rule the policy
carries, ONT-004).

**Shapes chosen, and why.** A heart and an "I prayed" are records that happened (`happened-to`, undo removes the
record), not a list on the post: `together` projects a field named after the target, so two `together` links from a
post to a member would both be called `member`. Hiding and blocking are `ends` (nothing deleted, it can come back).
An order's number is read aloud (`MK-{YYYY}-{#####}`, starting again each year, gaps allowed).

### 6.2 Findings

- **An order can't be called by its own number.** `calledBy: "number"` is refused ("not a detail of order") although
  `readAloud` projects a `number` field: the one name a shop uses for an order. Low; written here, not filed until it
  bites a view (the order list shows the buyer's name instead).
- Both repo gates green with the two folders present: the census `--check` exits 0 (it reads only a template with a
  `nodegx.security.json`), DEF-038 skips a folder with no `nodegx.project.json` (read, `def038SettledTemplates.test.ts:99`).
  They trip when the policy and the project file arrive; budget that then.

### 6.3 For Richard (the defaults most worth overturning)

| # | question | default written |
|---|---|---|
| W1 | **Children:** members 13 and over; nothing a member posts is public; the rules forbid a child's photo without a parent's yes, and that is a report reason of its own? | yes, as written in the gram's WORLD.md |
| W2 | **Buyers without an account:** a buyer checks out with a name, phone and address, and follows the order by a private link; an account is optional? | yes (fewer steps on a slow phone) |
| W3 | **A note edited on two phones offline:** keep both, the later as the note and the earlier beside it? | yes (no words lost) |
| W4 | **Who sees who hearted:** every member (as on Instagram), and only the person who asked sees who prayed for them? | yes |
| W5 | **A member's own post:** they take it down (hidden, an admin can still see it), never delete it? | yes |

**Richard, 2026-10-14: W1 yes, as proposed. W2 yes, an account optional. R8: A, one payment per seller country**
(TWO-004 §6.4); in the world, a payment carries its currency and the sellers it pays, and an order can have one per
country. W3–W5 stand as defaults until someone overturns them.

### 6.4 Owed (AC2, AC3)

1. `backend/schema.json` for each, `schemaPushes(projectWorld(…))`, byte-gated by a test in the SRK-003 pattern.
2. Each `nodegx.security.json`, and the tests that break each rule and see it refused: the gram's approved-only feed,
   hidden-for-members, a note its writer's alone, reports admin-only, a devotional public once its day has come; the
   marketplace's seller-only products and order parts (a path from the login through `staffOf`), a buyer's own order,
   the admin over everything.
3. The census and DEF-038 run again once those files exist.

## 7. Session 2 (2026-10-14, Opus 5.5; the Model line says Fable)

### 7.1 What was written

| | the gram | the marketplace |
|---|---|---|
| schema | `templates/gram/backend/schema.json`, 13 tables | `templates/marketplace/backend/schema.json`, 19 tables |
| policy | `templates/gram/nodegx.security.json` | `templates/marketplace/nodegx.security.json` |
| spec | `packages/nodegx-backend/tests/two-001-gram-policy.test.ts`, 27 tests | `…/two-001-marketplace-policy.test.ts`, 22 tests |
| mutants | 16, all red | 16, all red |

Each spec holds the schema byte for byte against `schemaPushes(projectWorld(docs/world))` (`TWO_SCHEMA_WRITE=1`
rewrites it), checks that the policy names every collection and carries every `onlyWhile` the world projects, then
seeds a locked `BackendService` and tries every rule as each kind of person. `TWO_GRAM_SECURITY=` and
`TWO_MARKET_SECURITY=` point a spec at a mutant policy.

**Two choices hold the policy up, both written into each spec's header:**

1. **Nobody writes a row directly, admins included.** Every write is a cloud function (TWO-003, TWO-005): that is
   the only place that can check *who* is writing (a member can't post as someone else, a seller can't move another
   seller's order part) and write the history row beside the change. `create`/`update`/`delete` are `nobody` on
   every collection and `signup` is `nobody`; joining is a function that makes the sign-in and the member row together.
2. **Who sees what is roles and paths.** The gram: `role:member` is an approved member, `role:admin` an admin; a
   waiting member holds no role and reaches only their own Member row (a path from their sign-in). The marketplace:
   `role:admin`, and a seller's staff hold `role:staff` (for uploading photos) but reach their seller's parts,
   lines, orders, payments and enquiries only by a path from their login through `Person.seller`; a buyer reaches
   their orders by a path through `Order.person`.

**What the policy can't say, and the row ACL does instead.** A hidden post or comment, and a devotional before its
day, are rows only admins may read: there is no path from a member to "every post that isn't hidden", and no rule
that reads the clock. The hide function and the daily release write the row's ACL (`{"role:admin": {"read": true}}`
until released or brought back). The specs seed rows with that ACL and prove the policy honours it; **the functions
that write it are TWO-005's to build and test** (that they set it, clear it, and that a blocked member's posts get it).

**What it says per field.** Gram: a member's email is theirs and the admins'; why a member was blocked and why a post
or comment was hidden are the admins' (and filtering on them is refused by name). Marketplace: a seller's payout
account and why a seller was stopped are the admin's alone, a seller's own staff included; the private link that
follows an order is the buyer's and the admin's, not the sellers' who otherwise see the order.

### 7.2 Gates

- Both specs green: gram 27/27, marketplace 22/22.
- **32 mutants, 32 red.** Each loosens one rule (a collection opened to `authenticated` or `public`, a path swapped
  for a role, a field mask removed, a write opened, `signup: public`) and at least one 🔴 test catches it. One went
  red for the wrong reason at first (removing the only field rule left `fields: {}`, which fails validation before
  anything runs); a filter-probe test was added and both `hiddenReason` mutants now fail on behaviour.
- **The census:** `--check` went red with ten unclassified history collections, as §6.2 predicted. Classified in
  `kinds.hand.json` (`template:gram|*.(collection)@who-changed`, the same for the marketplace, worded as P119's),
  regenerated: 15 kinds, 108 rows over 11 sources, the private counts carried over; `--check` exit 0.
- **DEF-038** (`packages/noodl-mcp/tests/def038SettledTemplates.test.ts`), run this time: 32/33, both P121 folders
  skipped (no `nodegx.project.json`). The red is `templates/nightbook`, untracked since 2026-09-28 (P78's loose pile),
  not this phase's.

### 7.3 Findings

- **Filed P121-TWO001-MEMBERSPHOTO (high, owner NONE; TWO-005 can't ship photo posts without it).** Built s12
  (TWO-005 §7.1): `X-NodeGX-File-Readers`, and the gram policy spec now runs this table again, all as it should be. Measured: a
  private upload is readable by its uploader only (another approved member: 403, and 403 on `/sign`); a non-private
  one by anyone with the URL. W1 ("nothing a member posts is public") has no shape for photos. The policy's `files`
  block says `upload: [admin, member]`, `read: public` at the route, because `<img>` carries no session and the
  per-file ACL is where reading is decided.
- **Who prayed, counted.** W4's default (only the person who asked sees who prayed) means every other member's
  query of `Prayed` returns nothing, so they can't count it either. The count belongs on the post, written by the
  "I prayed" function. Not a bug: TWO-005 builds it. If Richard overturns W4, `Prayed` becomes `[admin, member]`.
- **Off sale is a filter, not a secret.** A product taken off sale and a stopped seller stay readable (the shop's
  queries leave them out by `endedAt`); nothing about them is private, and old orders still name them. Only the
  stopped reason and the payout account are masked.
