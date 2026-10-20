# TWO-002 — Two pictures

**Opened 2026-10-14.** **Depends on TWO-001.** **Status: ✅ (2026-10-14): gate 3 passed for both on round 1; Richard sent them on unchanged, the builder said yes with no notes.** Kind: design (gate 3).
**Model:** Opus for the mockups; Fable if the first round gets a no and the direction needs rethinking.

## 1. The person sentence

> **The builder clicks through a picture of each app on his phone and on a tablet, says "yes, that's it" or what to change,
> and nothing gets built until he has.**

## 2. What exists

- LOOK.md: what each picture must hold.
- P118's toy and P119's `look/learner-thread.html`: how a gate-3 picture was made and approved before.
- Brand: none yet for the shop; the community app's colours and logo from TWO-000 if the ministry has them.

## 3. What to do

1. One clickable HTML mockup per app (the screens in LOOK.md), at 390 px and 1024×640, with plausible content
   (products made in Africa with makers and countries; a devotional, posts and a prayer request).
2. Show Richard first; his words into LOOK.md.
3. Then the builder, by a private link (the copy skill for the message). His reaction into LOOK.md in our words; verbatim in `~/vscode_projects/nodegx-private/builder-briefs/` (R1).
4. Iterate until a yes from each. Count the rounds.

## 4. Acceptance criteria

1. Both mockups exist in this folder (`look/`), with their published links.
2. LOOK.md carries Richard's and the builder's words for each, a yes for each.
3. The number of rounds to each yes is written down.

## 5. Not this task

A NodeGX build. Final copy.

## 6. Session 1 (2026-10-14, Opus 5.5)

Round 1 of each picture: `look/marketplace.html` and `look/gram.html`, one self-contained page each, a phone (390 px)
and tablet (1024×640) switch, a picker for every screen and taps between them inside the device. Published privately;
the links are in LOOK.md.

- **The shop** (adire indigo and saffron, plain readable type for small phones): home with sellers in four countries
  and prices in the buyer's currency, a product, a car to enquire about, a basket across Ghana and Nigeria that says
  it pays twice (R8), checkout with no account (W2) and the ways to pay per country, the order followed by its link
  (MK-2026-00042, a part per seller with its own steps), a seller's orders and products and the add form, the
  admin's sellers, ways-to-pay grid and rates.
- **The gram** (white, ink, plum, a morning gold for the devotional): the feed with the day's devotional pinned, a
  post, a prayer request with a working "I prayed", an event and a testimony; the devotional opened; posting (with the
  rule about children's photos at the point of posting, W1); prayer; search; a profile; the Bible at Psalm 23 (KJV)
  with a note on verse 4; notes, one saved offline; the admins' queue (13+ confirmed, the child-photo report first);
  the waiting page; a shared devotional opened with no account. Tablet: a rail, the feed, and the day and prayers
  beside it.
- Photos are coloured blocks with a label saying what the photo would be. All names and content are invented; the
  devotional's words are a placeholder until TWO-006's archive.
- One look before publishing (headless Chrome at 1100 px): the shop's phone home overflowed sideways (grid children
  sized to their content); fixed with `min-width: 0` before publishing. The tablet size was not looked at.
- The picture draws two things not built yet: photos shrunk on the phone before upload (P121-TWO008-UPLOADSHRINK)
  and members-only photos (P121-TWO001-MEMBERSPHOTO).

Rounds so far: 1 for each. Next: Richard's words into LOOK.md, a round 2 if he asks, then the builder by a private
link (the copy skill for the message; his reaction in our words, verbatim kept privately, R1).

**Gate 3, 2026-10-14:** Richard sent both round 1 pictures to the builder unchanged; the builder's answer, relayed
by Richard: he loves the look of both, no notes. AC1–AC3 met: both in `look/` with links, LOOK.md carries both
yeses, 1 round each. What the yes covers is what the pictures show, including two things not built yet
(photos shrunk before upload, members-only photos): TWO-003 and TWO-005 owe them, or say plainly where the build
differs (TWO-009 gate 4 checks the build against these pictures).
