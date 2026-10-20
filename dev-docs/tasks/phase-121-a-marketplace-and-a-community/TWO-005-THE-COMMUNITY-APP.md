# TWO-005 — The community app, built

**Opened 2026-10-14.** **Depends on TWO-002's yes; P119 SRK-001 for code sign-in.** **Status: 🟡 slices 1–5 and 4b (testimonies and events) built and driven (s11–s16, 2026-10-15); AC2, AC3 and AC4 met.** Kind: build.
**Model:** Opus.

## 1. The person sentence

> **A member of the ministry opens the community app on their phone, reads this morning's devotional at the top of the feed,
> hearts a photo from yesterday's food outreach, posts a prayer request, and sees eleven people prayed for it by the
> evening.**

## 2. What exists

- TWO-001's world and policy; TWO-002's approved picture.
- TPL-001's members' area: approval, roles, moderators.
- File storage with thumbnails; `Upload File`, `Open File Picker`; realtime (`RealtimeHub`) for counts that move.
- P119 SRK-001 (six-digit code) and SRK-005 (PWA), in progress there.

## 3. What to do

Slices:

1. **Join and approve:** sign up, an admin approves (the builder first; he can make volunteers admins), sign in (the code if SRK-001 has landed, otherwise the magic
   link, said so in the README).
2. **Post and feed:** a photo (or several) with a caption; the feed newest first; thumbnails; a heart; comments.
3. **Profiles:** photo, bio, the grid.
4. **Prayer requests:** the post kind with "🙏 I prayed".
5. **Moderation:** report, hide, block; the moderator's queue; the community rules page.
6. **Installable:** SRK-005's manifest and service worker, if landed.

Every workaround met goes into P78's defect register the same day.

## 4. Acceptance criteria

1. Each slice driven at 390 px and 1024×640, 0 console errors, screenshots here.
2. Two members in two browsers: one posts, the other sees it and hearts it; the count moves on both without a reload.
3. The policy refuses an unapproved member reading the feed and a member hiding another's post (tested by trying).
4. A reported post hidden by a moderator disappears for members and stays for moderators.
5. Both repo gates green; product findings filed or "none met".

## 5. Not this task

Following, stories, direct messages, video, open sign-up. The devotionals (TWO-006). The Bible and notes (TWO-010).

## 6. Session 11 (2026-10-15, Opus 5.5): slice 1, joining and being let in

Checked first: **P119 SRK-001** has its backend half (`POST /auth/email-code`) and no client half (owed in SRK-005,
not started), so slice 1 signs in **by an emailed link**, the plan of record (README §5). **P121-TWO001-MEMBERSPHOTO**
still has no owner; it blocks slice 2's photos, not slice 1.

### 6.1 What it is

`npm run template:gram` builds `templates/gram/` through the MCP door, the marketplace's way (`two005Template.ts`, from
`two003Template.ts`). It owns `components/` and `nodegx.project.json`; `docs/`, `backend/schema.json` and
`nodegx.security.json` are hand-written and survive. Sources in `packages/noodl-mcp/tests/`: `two005Cloud.ts` (the
functions), `two005Pages.ts` (the pages; the marketplace's node builders reused), `two005Look.ts` (the picture's
plum, gold, Literata and Mulish). The policy's `functions` block is filled (it was `{}`).

| | what |
|---|---|
| `setUpCommunity` | public, 5/min. The first admin, once, against the secret `GRAM_SETUP_TOKEN`: names the community, makes the admin's sign-in **with a password** (so the builder can sign in before the backend sends email), `role:admin`, their Member (approved, admin), both histories |
| `askToJoin` | public, 5/min. A name (80 at most), an email, **`over13: true`** and nothing else. A sign-in with **no password** and a waiting Member. An email asked before answers exactly as a new one (Create User's "unchanged"), so the door tells a stranger nothing |
| `letIn` | admins. Approved, `role:member` (what the policy reads by), history; then **emailed "You’re in"** with `<the app>/sign-in` (the app's address comes from the admin's page). No email service: still let in, answer `emailed: 'no'` and the queue says "tell them yourself". Pressed twice: nothing more written |
| `turnAway` | admins. The picture's **No**. The world has no "refused" state and deletes nothing, so a waiting person is **blocked** with "Not let in." (`blockedReason` + `endedAt`) and their sign-in switched off (Update User `disabled`). Not for someone already in (that's slice 5's blocking) |
| `makeAdmin` | admins. An approved, unblocked member becomes an admin (`role:admin` and the row) |
| `whoAmI` | signed in. The caller's Member: name, waiting or approved, member or admin |

Pages: **Welcome** (the start: the community's name, Ask to join, Sign in; "isn’t set up yet" with Set up; sends someone
signed in on; a refused link says why, through a Sign In With node), **Ask to join** (thanks in place), **Sign in**
(Email me a link; an admin's password below), **Waiting**, **Rules** (the community's, read-only until slice 5),
**Set up**, **Feed** (slice 2's place: "You’re in" for now), **Waiting for you** (the admins' queue: initials, "Confirmed
13 or older · asked …", Let in, No) and **Admins** (Make admin). A bar with the wordmark offers Sign out only to someone
signed in (the marketplace's stranger-sees-Sign-out note, not repeated). Builder's setup page:
`templates/gram/docs/SETTING-UP.md`.

### 6.2 What it settled (none asked of Richard; gate 4 can overturn them)

- **"No" is a block with the reason "Not let in."**, never a delete (the world's rules 1 and 2).
- **"13 or older" is a tick a person must give, not a stored field**: every member gave it. Only `true` counts.
- **Members have no password; the first admin has one.** See §6.5: this is the ruling to ask.
- **The admin lands on the queue**, a member on the feed, someone waiting on Waiting.
- **Being let in sends a message** (the picture's waiting screen promises one).

### 6.3 Readings (2026-10-15, working tree on `9cc3331ad`)

- `nodegx-backend/tests/two-005-join.test.ts` **8/8**: the setup door; asking to join and its refusals; a waiting
  member signed in by the link reads only their own Member and no post, and can let nobody in; let in (approved,
  member, emailed with the sign-in page; twice writes once); no email service; No (blocked, history, the link refused
  when pressed: "This account is disabled.", the old session stops); make admin; **the policy keeps sign-up closed
  even with the Sign-in page's open sign-up on** (a control with a known user goes red).
- `TWO005_MUTANTS=1 npx jest tests/two-005-join-mutants.test.ts` **22 of 22 red** (19 script, 3 policy). The first run
  found one green, "an email asked twice makes two": Create User already refuses the duplicate, so the gate's own check
  was dead and is gone.
- `noodl-mcp/tests/two005Template.test.ts` **9/9**: byte-identical to a fresh build, the policy's functions = the
  template's, all 29 scripts compile, the routing and the queue against fixtures. The marketplace's MCP specs and the
  budget gate **154/154** (the script harness gained `Noodl.Users.Current`); TWO-001's two policy specs **49/49**.
- `two-005-join-drive.test.ts` **1/1** (52 s): the whole story at 390 px and each screen at 1024×640, the links
  pressed on the backend's own page, rows read beside the screen; 0 px overflow on 9 screens; console errors only the
  two the drive provokes. 20 screenshots `shots/two005-*.png`, looked at: one fix ("You can let them back later"
  promised slice 5).
- The door: **0 warnings** on the template (it raised 18 at first: inactive border parameters and `#ffffff`; fixed).
  DEF-038 **38/39**, the gram green, the red `templates/nightbook` as always. Census: `gram` 8,428 code lines now read,
  nothing else moved, no new candidate; `--check` fresh. Backend test project `tsc --noEmit` **0**.

### 6.4 Findings

- Filed **P121-TWO005-SIGNUPSWITCH** (low): the Sign-in page's open sign-up switch reads on while the policy refuses.
- Met, good: the door refused a Switch output that doesn't exist and a Function input the script never reads.
- Ours: `why()` wrapped my own "Sign in to see this page." in "This page couldn’t be read:" (caught by the fixture
  spec); a JS default parameter swallowed the spec's "nobody signed in".

### 6.5 For Richard (a ruling, with the built thing beside it)

**How do members sign in?** Built: by a link emailed to them, and the first admin with a password. The README planned
the link until P119's six-digit code has its client half. What it costs: nobody but the admin can sign in until the
backend sends email, and a link opens the phone's browser, not an installed app. The other way is TPL-001's: everyone
picks a password when they ask to join, with the link as "forgot my password".

### 6.6 Next

Slice 2 (post and feed) needs **P121-TWO001-MEMBERSPHOTO** first: a photo only members may see has no shape in the file
store. Measure it again, then build it (it blocks an AC of this task), then the feed.

## 7. Session 12 (2026-10-15, Opus 5.5): members-only photos, then slice 2, posting and the feed

### 7.1 P121-TWO001-MEMBERSPHOTO, built

Re-measured first: the file code was as filed. Built as the bug proposed (detail in the bug file):

- **`X-NodeGX-File-Readers: role:member, role:admin`** on an upload makes the file private and gives each role a
  read-only ACL entry beside the owner's. `/sign` admits whoever the ACL admits, so a member signs another member's
  photo. Only `role:<name>`, at most 8, refused in words; the uploader must hold one of the roles (the master key any).
  In the CORS allow-list. The file row also keeps them as **`readers`** (a new `_Files` column, added to an older
  backend's table at start), because every record read drops a row's ACL and `sharePost` must ask "is this photo
  the members'?".
- **Upload File has a Readers input**; `UploadFileOptions.readers`; the Parse wire sends the header. Node spec, both
  catalogues, the node docs, the CHR-007 snapshot and the `files.private` capability note carry it.
- **`Noodl.Files.sign(file)`** for page scripts: Sign File URL takes only a CloudFile, and a post's photos are a list
  read as plain objects. Typed in `global.d.ts.keep`.

### 7.2 What slice 2 is

Functions (`packages/noodl-mcp/tests/two005Feed.ts`, members and admins, rate-limited):

| | what |
|---|---|
| `sharePost` | a caption (2,200 at most, refused not cut), up to 4 photos, or both. 🔴 **Each photo must be the poster's, private, shared with `role:member` AND `role:admin`, and an image** (read from its `_Files` row; the link must be its own `/files/<name>`). So no hand-made call puts a public photo in the feed (W1) |
| `heartPost` | `{postId, on}`: says what it should be (a double tap changes nothing); answers `{hearted, count}`, the count **by person**, so a race's second row counts once; off removes every row of yours |
| `commentOn` | a comment, 1,000 at most |

All three refuse a member whose row is blocked, and a post that is hidden or whose member is blocked ("isn't in the
feed any more"). Pages (`two005FeedPages.ts`): **Feed** (newest 30; cards; "＋ New post"; admins also "Waiting for
you"), **New post** (photos uploaded with Readers, shrunk to 1600 px, four tiles with Remove; caption; the rule about
children's photos; "Share with the members"), **a post** (`/post/{postId}`: the card, its comments oldest first, write
one). The feed and a post's page listen to Heart, Comment and Post (Subscribe To Changes) and read again; a heart or
comment made on this phone sets `feedChanged`. Photo links are kept on the page until a minute before they run out,
so a re-read asks for none again and the address stays the same.

### 7.3 What it settled (none asked of Richard; gate 4 can overturn them)

- **Four photos at most in a post; a caption of 2,200 characters, a comment of 1,000**, refused when longer.
- **A post is words, photos, or both**; never neither.
- **Who hearted is named** ("3 hearts · Bob, you and 1 other"): the world says members see who hearted.
- **The feed shows the newest 30.** No paging yet.
- **A heart says on or off**, not "toggle".
- **On a tablet a feed photo is as tall as the screen leaves, cropped**, so the heart and caption are on the first
  screen (found looking at the shots).

### 7.4 Readings (2026-10-15)

- Backend: `files-http` + `files-table-upgrade` + `bmg-002-signed-files` + `bmg-011-files-backups-ops` + `bmg-015` ×2 +
  TWO-001 ×2 + `two-005-join` + **`two-005-feed` 14/14** + `sbr007-auth-preflight` + `realtime-http` +
  `d45-realtime-proxy-timing` + `ops-rate-limit`: **173/173**. Backend tests `tsc` 0.
- Mutants: hand, on the file change, **6 of 6 red**; `TWO005_MUTANTS=1 npx jest tests/two-005-feed-mutants.test.ts`
  **23 of 23 red** (the first run left 2 green: `!file.private` was dead behind `readers`, removed; the burst never
  raced, so a race's second heart is now planted). One join mutant rerun through the extracted helper: red.
- Runtime: `realtime-transports` (92) + `cloudstore-files` + `parse-wire-adapter` + `session-store` + ERG-001
  streams: **155/155**; conformance (`NSP_ONLY="SubscribeToChanges,Upload File"`) green, and red with Readers dropped
  from the node's call. Viewer: `uploadfile` 14/14, `files-api-sign` 5/5. `tsc` 0: backend, contract, runtime,
  viewer, node spec. Node spec: catalog-parity, spec-ledger, golden, ports, batch-records **547/547**; CHR-007 8/8.
- MCP: `two005Feed.test.ts` **37/37** (15 checks, 22 mutants red); with the marketplace's page specs, both template
  specs and the budget gate **238/239**: the red DEF-038's `templates/nightbook`, as always. The door raised **no
  warning** (4 at first, my button's border; fixed).
- Drives, one at a time: **`two-005-feed-drive` 1/1** (23 s; two browsers: Ann on a phone, Bob on a tablet; the photo
  stored private at 1600×1200, its address 403 to a stranger; Bob's heart and comment reached Ann with no reload; 0 px
  overflow on 7 screens; console: only the empty post the drive provoked). **`two-005-join-drive` 1/1** (its feed
  line now waits for the real feed). 12 shots `shots/two005-feed-*.png`, looked at: one fixed (the tablet photo).
- Census: only `gram` moved (8,428 → 12,679 code lines); one new candidate, `commentOn.words@count`, ruled **no** in
  `kinds.hand.json`; `--check` fresh.
- Not run: the editor's typecheck (the contract gained an optional field); the full conformance suite.

### 7.5 Findings

- **Built P121-TWO001-MEMBERSPHOTO** (`scheduled` until committed).
- **Filed and fixed P121-TWO005-LIVEANON** (high): on the built-in backend a signed-in member's live updates were
  asked for as a stranger's (the token getter never read the stored session), and once that was fixed the
  subscription POST sent the session as `Authorization: Bearer`, which the backend refuses. No signed-in member could
  ever subscribe to a collection that isn't public. Found by AC2's drive.
- **Filed P121-TWO001-EXPORTREADERS** (high, P18's): the code export drops Readers, so an exported app uploads a
  members-only photo public. Measured: identical output with and without it.
- Met, good: `Noodl.Records` refuses a filter with two keys and says to use `{ and: [...] }`; the template gate caught
  a `const` used before its declaration; the census caught a character count as a possible row count.
- Ours: my sign stub in the page spec read `.name` where an upload hands a CloudFile; the "Comment" link showed twice
  on a card with no comments (found on the drive's screen text).

### 7.6 Next

Slice 3, profiles (photo, bio, the grid): the profile photo is a Member's `photo` (a file) and needs the same Readers.
Then slice 4 (prayer requests: the post kind and "🙏 I prayed", with W4's count on the post) and slice 5 (moderation).

## 8. Session 13 (2026-10-15, Opus 5.5): slice 3, profiles

### 8.1 What it is

One function (`packages/noodl-mcp/tests/two005Profile.ts`), members and admins, 10 a minute:

| | what |
|---|---|
| `editProfile` | `{ name, bio, photo }` for the caller's own Member only: there is no way to name another. Name 80 at most and never empty, bio 150 at most, both refused not cut. `photo` left out keeps the one there is, `null` takes it off, `{ name, url }` is a new one. 🔴 **The photo is held to W1 exactly as a post's is**: `photoProblem`, now in the feed's prelude and shared by `sharePost`, checks the caller uploaded it, it is shared with `role:member` AND `role:admin`, it is an image and its link is its own. Only what changed is written, with a `MemberHistory` row (rule 6) |

Pages (`two005ProfilePages.ts`): **a profile** (`/member/{memberId}`: the photo or initials, 80 across; the post
count beside it; name, bio; Edit profile on your own; the grid, three across on a phone and five on a tablet, newest
first, only what the feed shows; a photo post shows its first photo, a post of words its first 60 characters; each
tile opens its post), **Edit profile** (`/profile/edit`: Change photo, uploaded with Readers and shrunk to 800 px;
Remove photo; name; bio; Save). The feed gained **Your profile**; a name on a card or a comment opens that member's
profile; cards and comments show the member's photo where they have one (`faceNodes`, the feed's `linked`, so a
photo is signed once per page).

🔴 **Each tile is a Button** (P121-TWO003-GROUPKEYBOARD): a photo's tile is a transparent Button laid over the photo,
its label the photo's description in transparent ink, so Tab reaches it and a screen reader names it (`.gm-tile-hit`).

### 8.2 What it settled (none asked of Richard; gate 4 can overturn them)

- **A member may change their own name**, with its history kept (the admins see who changed what). A name can't be
  emptied.
- **A bio is 150 characters at most**, refused when longer.
- **A profile counts posts only.** The picture's prayer requests and testimonies counts come with slice 4, when a
  post can be one.
- **No bottom bar yet.** The picture has five tabs (Feed, Search, Post, Prayer, Profile); two don't exist. The feed's
  **Your profile** button stands in until slice 4 brings Prayer.
- **A blocked or waiting member's profile reads "This member isn't in the community." for everyone**, admins too.
  Slice 5's moderation gives admins their own view.
- **A profile photo is sent at 800 px** (drawn 80 across at most).

### 8.3 Readings (2026-10-15, working tree on `116dc7445`)

- Backend: **`two-005-profile` 8/8** (first run); with `two-005-join`, `two-005-feed` and TWO-001's gram policy
  **60/60**. Backend test project `tsc` 0.
- Mutants: `TWO005_MUTANTS=1 npx jest tests/two-005-feed-mutants.test.ts tests/two-005-profile-mutants.test.ts`
  **42 of 42 red** (feed 23, four re-pointed at the shared check; profile 19). The profile file's first run had one
  that crashed every call instead of loosening one rule (an unbalanced brace); rewritten as valid code: red.
- MCP: **`two005Profile.test.ts` 34/34** (12 checks, 21 page mutants red). Its first run left one mutant green (the
  edit page reading every member still opened on Ann, the first fixture row); the check now opens it as Bob too.
  With `two005Feed`, `two005Template`, the budget gate and DEF-038: **136/137**, the red DEF-038's
  `templates/nightbook` as always. `noodl-mcp` `tsc --noEmit` 0. The door raised **no warning** (one at first: a
  Button has no Text Align X).
- Drives, one at a time: **`two-005-profile-drive` 1/1** (26 s; two browsers: Ann on a phone, Bob on a tablet; Ann's
  photo stored private at 800×600 with both readers, its address 403 to a stranger, drawn 80×80 in the circle and
  28×28 beside her comment; Bob, another member, sees it; the grid 3 across on the phone and a fifth of the row on the
  tablet; each tile a `BUTTON` with tab index 0, the photo's opened by its label; a long bio held on the page with its
  length; 0 console errors; 0 px overflow on 9 screens). **`two-005-feed-drive` and `two-005-join-drive` 1/1** again
  (the cards changed). 11 shots `shots/two005-profile-*.png` and the feed's retaken, looked at: two fixed (below).
- Census: one new candidate, `sharePost.photos@count` (the shared check moved the photo count beside the create),
  ruled **no** in `kinds.hand.json`; `--check` fresh. This session's census delta wasn't isolated from s8–s12's
  uncommitted ones (no snapshot before the run).
- The builder's page: `templates/gram/docs/SETTING-UP.md` §7 Profiles, through the content-authoring skill's offline
  checks (one false flag: the section number).
- Not run: the editor's typecheck; the full conformance suite (no product code changed this session).

### 8.4 What looking at the shots found

- **The post count floated in the middle of the row**, 300 px from the photo on a tablet: the count's column took
  the row's width (s7's lesson again: `flex: none` needs `width: auto`, `.gm-count`). The drive now asserts the gap.
- **The drive's test photo was the same brown as Ann's initials circle**, so a shot couldn't tell a photo from a plain
  circle. The drive measured it drawn either way; the photo is teal now.

### 8.5 Findings

- **Filed P121-TWO005-NEVERRUNS** (medium, `kit: mcp`): a Function whose Run is unwired and whose every wired input
  is set not to run on change can never run, and the door wrote it with no warning. Met by my own slip: the template
  helper's "quiet inputs" list (meant for a gather run by a button) given to the photo script, which has no Run. The
  photo uploaded and never showed.
- **P121-TWO003-GROUPKEYBOARD met again**, where the name-in-a-Button workaround doesn't fit (a photo has no name):
  evidence added to the bug file.
- s12's two bug files (MEMBERSPHOTO, LIVEANON) failed `node scripts/bugs.js check` (`scheduled` with no `phase:`, a
  `regression:` naming two paths); fixed.
- Met, good: the door refused a Button parameter it doesn't read.

### 8.6 Next

Slice 4, prayer requests: the post kind, "🙏 I prayed" (the world's relation, taken back by removing it), the count
on the post, the profile's prayer requests count, and the bottom bar once Prayer exists. Then slice 5 (moderation).

## 9. Session 14 (2026-10-15, Opus 5.5): slice 4, prayer requests and the sections

### 9.1 The world first: a prayer request carries its count

W4 (only the person who asked sees who prayed) means another member's read of `Prayed` holds their own row and nothing
else, so they can't count it (TWO-001 §7.3 said so). **`Post` gained `prayedCount`** (a number): `nouns.json`,
`WORLD.md`, `backend/schema.json` rewritten by `TWO_SCHEMA_WRITE=1` (TWO-001's byte gate green). The policy's rules
didn't change: nobody writes a Post or a Prayed row directly; a function does. Not asked of Richard; gate 4 can
overturn it.

### 9.2 What was built

| | where | what |
|---|---|---|
| `sharePost` | `two005Feed.ts` | takes a **`kind`**: `post` (the default) or `prayer` (`SHARED_KINDS`). A prayer request is **words only**: a photo is refused, so are no words ("Say what you’d like the members to pray for."). It starts at `prayedCount: 0`. A testimony and an event are refused until they're built ("Share a post or a prayer request.") |
| `prayFor` | `two005Prayer.ts` (new) | members and admins, 60 a minute. `{postId, on}`: says what it should be, as a heart does. Only a prayer request in the feed (not hidden, its member not blocked). Counts **by person** after the write and writes `prayedCount` **only when it moved**, so a press that changes nothing sends no phone a change. Answers `{prayed, count}`. Two presses finishing at the same instant can leave the count one out until the next press (each counts after its own write; the later write wins). The next press puts it right (specced) |
| the card | `two005FeedPages.ts` (`/Feed/PostCard`, `cardsOf`) | a prayer request is the picture's bordered card (`.gm-prayer`, its class wired from the read), the **Prayer request** pill, its words, **🙏 I prayed · 4**, filled plum once you have (**🙏 You prayed · 4**), no hearts, Comment. Under it, for everyone but the person who asked: "Only Ann sees who prayed." For the person who asked: "Prayed: Bob Owusu, Cara Boateng and 2 others. Only you see who.", everyone named on the request's own page. An admin reads every row and is still shown no names on someone else's request |
| Prayer | `two005PrayerPages.ts` (new), `/Pages/Prayer` at `prayer` | the prayer requests, newest 30, the feed's card; **＋ Ask for prayer** opens New post at `/new-post?kind=prayer`; listens to Post and Comment (the count moves with the Post row) |
| New post | `two005FeedPages.ts` | two chips, **Post** and **Prayer request** (the picture's kinds row, less Testimony and Event). A prayer request hides the photos and the children's-photo rule, asks "What would you like the members to pray for?", says who sees what, and lands on Prayer; Back goes where it came from |
| a profile | `two005ProfilePages.ts` | counts **posts** and **prayer requests** apart (the picture's counts, one group beside the photo); the grid is the posts |
| the sections | `two005PrayerPages.ts` (`/UI/Nav`), `gramShell`'s new `nav` | **Feed, Post, Prayer, Profile**: along the bottom of a phone, each mark over its word; down a 200 px rail on a tablet. Shown only to a member who's been let in (each loader's `inside`), the page's own lit plum. On the feed, Prayer, a profile and a post; not on New post or Edit profile (the picture's are back-arrow screens). The feed's **Your profile** button is gone: Profile replaces it |

### 9.3 What it settled (none asked of Richard; gate 4 can overturn them)

- **A prayer request is words only.** The picture's requests have no photo.
- **The person who asked may press I prayed on their own**, and an admin may press it. Both count.
- **Who prayed is named only to the person who asked**, on the card (two names and how many more) and on its own page
  (everyone). The admins can read the rows in the admin app; the app doesn't show them.
- **A profile's grid is the posts**; prayer requests are a count beside them.
- **No Search, no Testimony, no Event, no "Answered"** yet: the picture has all four. Search waits for a search; the
  two kinds are refused by `sharePost` until built; "Answered" isn't in the world.
- **No tablet side panel** (the picture's "Prayer requests" list beside the feed) and no wordmark on the rail.

### 9.4 Readings (2026-10-15, working tree on `24adf7fd4`)

- Backend: **`two-005-prayer` 7/7** (first run); with `two-005-join`, `two-005-feed`, `two-005-profile` and TWO-001's
  gram policy **67/67**. Backend test project (`tsconfig.tests.json`) `tsc` 0.
- Mutants: `TWO005_MUTANTS=1 npx jest tests/two-005-prayer-mutants.test.ts` **19 of 19 red** (11 `prayFor`, 4
  `sharePost`, 4 policy). Feed, profile and join mutants again: **64 of 64 red** (`sharePost` and the shared prelude
  changed under them).
- MCP: **`two005Prayer.test.ts` 43/43** (14 checks, 29 page mutants red). Its first run left one mutant green (a
  person counted twice): the fixture had no race's second row; one is planted now. With `two005Feed`, `two005Profile`,
  `two005Template`, the budget gate and DEF-038: **179/180**, the red DEF-038's `templates/nightbook` as always.
  `noodl-mcp` `tsc` 0. The door raised **no warning** (below).
- Drive: **`two-005-prayer-drive` 1/1** (26 s; two browsers: Ann on a phone, Bob on a tablet; Ann asks from Prayer, an
  empty request held on the page; Bob's feed has it, he presses I prayed, it fills; **Ann's screen reads "I prayed · 1"
  and "Prayed: Bob Owusu." with no reload**; her profile counts 0 posts and 1 prayer request; Bob takes it back and the
  row and the count go; the chips switch; the sections measured at the bottom of the phone and down the tablet's side,
  the page's own lit; scrolled to the bottom, the last words aren't under the bar; rows read beside the screen; 0
  console errors; 0 px overflow on 9 screens). **`two-005-profile-drive`, `two-005-feed-drive`, `two-005-join-drive`
  1/1** again (the profile drive opens Profile from the sections now). 9 shots `shots/two005-prayer-*.png` and the
  others' retaken, looked at: three fixed (below).
- Census: only `gram` moved (15,808 → 18,283 code lines), no new candidate, `--check` fresh.
- The builder's page: `templates/gram/docs/SETTING-UP.md` §8 Prayer requests, §9 The sections, through the
  content-authoring skill's offline checks (one fix, "It is"; the rest false flags from headings and line wraps).
- The viewer bundle (Oct 15 18:27) is newer than `noodl-viewer-react/src` and `noodl-runtime/src`.
- Not run: the editor's typecheck; the full conformance suite (no product code changed).

### 9.5 What looking at the shots found, and the door

- **The tablet rail centred its words**; the picture's start at the rail's edge. A Button lays its label out in the
  middle; `display: block` puts it at the left. The drive now asserts where the words start.
- **The bar's marks (⌂ ＋ ◯) drew at the word's size**, tiny beside the 🙏 emoji. The picture draws them at 1.3rem.
  The label's first line is the mark, so `::first-line` sizes it (filed **P121-TWO005-TABMARK**: a Button's icon
  can't go above its label). The drive asserts each mark stands taller than its word. A control with the two rules
  taken out went red on that check (15 px against 15 px); the rail's check sits after it in the drive, so the control
  didn't reach it.
- **A prayer request still said "What’s happening?"**, the post's placeholder. It reads "Who or what, in your own
  words." now, and the drive asserts it.
- The door refused a background on a Text ("Text has no box of its own"; the pill's colour went into its class) and
  a wire from a Function's `feed` (it is `out-feed`). Both good refusals. It warned `uncollapsible-multi-column` on the
  profile's photo-and-two-counts row (three groups of three nodes); the picture has the counts as one group, so they
  are one group now and the warning is gone. Not measured whether three groups would have drawn badly.

### 9.6 Findings

- **Filed P121-TWO005-TABMARK** (low, `kit: core`): a Button's icon goes left or right only.
- Ours: the fixture with no race's second row (the page spec's first run); the wrong placeholder (the shots).
- Met, good: the door's two refusals above; `bugs.js check` named a kit it doesn't know.

### 9.7 Next

Slice 5, moderation: report (the world's reasons, `child-photo` first in the queue), hide (a member their own, an
admin any, with why), block, the admins' queue, the community rules page, and an admin's view of a blocked member's
profile. AC3's "a member hiding another's post" and AC4 belong to it.

## 10. Session 15 (2026-10-15, Opus 5.5): slice 5, moderation

### 10.1 The world, unchanged; the row ACL, written at last

The world already had everything this slice needed: `Report` and `CommentReport` (reasons `child-photo`, `unkind`,
`spam`, `other`, and a note), `hiddenReason` on posts and comments, `blockedReason` on members, `CommunityHistory`.
Nothing in `docs/world/`, `backend/schema.json` or the policy's collections changed. The policy gained four call
rules.

🔴 **"Members stop seeing it" is the row's ACL**, as TWO-001 §7.1 said it must be: the policy lets every member read
every post, and has no rule for "every post that isn't hidden". `hide` writes `{"role:admin": {"read": true}}` on the
row; `block` writes it on every post and comment of the member's. Bringing one back writes `{"*": {"read": true}}`:
the policy still keeps out everyone who isn't in (the spec asserts a stranger, someone waiting and someone turned away
are refused). 🔴 **A row's ACL can't be cleared**: the first version wrote `acl: null`, the backend answered 200 and
kept the old ACL (filed **P121-TWO005-ACLNULL**).

### 10.2 What was built

| | where | what |
|---|---|---|
| `report` | `two005Moderate.ts` (new) | members and admins, 10 a minute. A post (`postId`) or a comment (`commentId`), one of the world's reasons (a comment's lack the child's), a note of 500 at most, needed for "something else". Your own is refused ("Take it down instead"); so is one out of the feed. Once per person: a second report answers as the first did and keeps nothing more |
| `hide` | `two005Moderate.ts` | members and admins, 20 a minute. `hidden: true`: a member their own (the reason recorded is "Taken down by the member who wrote it."), an admin anyone's, saying why (500 at most). Hidden already: nothing changes. `hidden: false`: admins only; refused while its member is blocked |
| `block` | `two005Moderate.ts` | admins. With why (500 at most); not yourself, not an admin. Member `blockedReason` + `endedAt`, its history, the sign-in off (Update User `disabled`, as `turnAway`), the admins-only ACL on all they wrote. Let back: the same undone, all but what was hidden for its own reason; someone turned away goes back to waiting |
| `writeRules` | `two005Moderate.ts` | admins. 5,000 characters at most; the community's history; the same rules again write nothing |
| Report | `two005ModeratePages.ts` (new), `/Pages/Report` at `report?post=` / `?comment=` | what is reported and whose, a Dropdown starting "Choose why", the note, "Only the admins see your report…". Your own: no form, "Take it down from its page instead" |
| the queue | moved to `two005ModeratePages.ts` | slice 1's new members, then **Reported** (one row per post or comment, counted by person, the child's reason first and naming it whenever anyone gave it, then the newest; pills as the picture's), the picture's **Hiding** note, **Hidden from members**, **Blocked**, and **Community rules** beside Admins and The feed. Listens to `Report` and `CommentReport` |
| Look | `two005ModeratePages.ts`, `/Pages/Admin/Look` at `admin/look?post=` / `?comment=` | admins. The post as the feed draws it (photos and all), or the comment and what it is under; a pill saying whether members see it and why not; every report with who and why; the reason field starting as the reason most gave (the child's if anyone did); Hide from members, or Bring it back; their profile |
| a post's page | `two005FeedPages.ts` | **Report this post** (someone else's), **Take this post down** (your own, asked first: "Take it down? … only an admin can bring it back"), **Reports and hiding** (an admin). Each comment: Report, Take down, Reports and hiding. 🔴 An admin opens a hidden post, told "Hidden from members: …" |
| a profile | `two005ProfilePages.ts` | an admin sees a blocked (or turned-away) member's profile: why, their posts but the ones hidden for themselves, **Let them back**. On a member who is in and not an admin: the reason and **Block** |
| the rules | moved to `two005ModeratePages.ts` | everyone reads them, each rule on its line (`.gm-lines`); an admin gets the editor and Save |

### 10.3 What it settled (none asked of Richard; gate 4 can overturn them)

- **Only an admin brings back** a post or comment, a member's own taken down included. The world's "comes back" says
  who may end it, not who may undo it.
- **A member takes their own down without a reason**; an admin hiding someone else's must give one. The member isn't
  told the reason (the policy's field rule).
- **Reported once per person**, the first report standing (a report "cannot" be undone).
- **An admin can't be blocked** (make them a member first: there is no way yet, so it waits for a person to ask).
- **A comment is taken down at once; a post asks first.** A post carries photos and hearts; a comment is a line.
- **Reporting is on a post's page and under each comment**, not on the feed's card (the card stays the picture's).
- **The queue reads the newest thousand** posts, comments and reports. A community that outgrows that needs a filter
  on `endedAt` the store doesn't offer by name yet.
- **Comments under a hidden post stay readable** to a member who asks the backend for them by name (the post is gone,
  its comments' rows aren't): hiding a post doesn't touch its comments. Written down, not built.
- **No moderator role**: the world has none, so the admins moderate (AC4's "moderator" is an admin here).

### 10.4 Readings (2026-10-15, working tree on `1f588e529`)

- Backend: **`two-005-moderate` 8/8**; its first run had 4 red, two of them the spec's (a `null` body is refused by
  the Request before the script; a cascade), two the measurement in §10.1 (`acl: null` kept the ACL). With
  `two-005-join`, `-feed`, `-profile`, `-prayer` and TWO-001's gram policy **75/75**. Backend tests `tsc` 0.
- Mutants: `TWO005_MUTANTS=1 npx jest tests/two-005-moderate-mutants.test.ts` **36 of 36 red** on the first run (8
  `report`, 8 `hide`, 9 `block`, 4 `writeRules`, 7 policy). Slices 1–4's functions didn't change; their mutant files
  weren't rerun.
- MCP: **`two005Moderate.test.ts` 70/70** (26 checks, 44 page mutants red). Its first run left 3 mutants green: one a
  hole in the fixture (a tie between the child's reason and the commonest, so both orders agreed: a third report
  planted), two equivalent ("every member opens a hidden post": a member is never handed the row; "you can block
  yourself": only an admin sees Block and an admin can't be blocked, so the page's clause went). Slice 3's two
  profile mutants re-pointed at the new condition. With `two005Feed`, `-Profile`, `-Prayer`, `-Template`, the budget
  gate and DEF-038: **249/250**, the red DEF-038's `templates/nightbook` as always. `noodl-mcp` `tsc` 0.
- The door raised **no warning** regenerating (infos: `oversized-page` 2 → 10, the new and grown pages).
- Drive: **`two-005-moderate-drive` 1/1** (44 s; Ann on a phone signed in by her link, Ama on a tablet by her
  password; every write read back from the store; **AC4: Bob's hidden post gone from Ann's feed and from her own
  session's read of the store, and on Ama's queue, Look and post page with "Hidden from members: Spam."**; blocked Bob
  refused at `/login`, let back signed in; the rules saved with their history and read by Ann with no editor; 0
  console errors; 0 px overflow on 11 screens). `two-005-join-drive`, `-feed-drive`, `-profile-drive`,
  `-prayer-drive` **1/1** each again (their screens changed). 14 shots `shots/two005-moderate-*.png` and the others'
  retaken.
- Census: one verdict added (`writeRules.rules@count`, no), `--check` fresh. Not isolated which sources moved (the
  files carry uncommitted rows from earlier sessions).
- The builder's page: `templates/gram/docs/SETTING-UP.md` §10 Reports, hiding and blocking, §11 The community rules,
  through the content-authoring skill's offline checks (`written` flagged six sentences, all rewritten; then clean).
- The viewer bundle (Oct 15 18:27) is newer than `noodl-viewer-react/src` and `noodl-runtime/src`.
- Not run: the editor's typecheck; the full conformance suite (no product code changed).

### 10.5 What the drive and the shots found

- 🔴 **The Report page sent a report nobody chose** (the drive's second run): the Dropdown's Value said "Option 1"
  while its box said "Choose why". Filed **P121-TWO005-DROPDOWNSTALE**; the page sets Value to nothing. Before that,
  its first run found a "Choose why" option of mine beside the Dropdown's own placeholder: it has one (`placeholder`),
  so the page uses it.
- From the shots, four the drive passed: the queue's empty new-members list drew its border as a line, and "No keeps
  them out" stood with nobody to say No to (both shown only with someone waiting now, and asserted); the blocked
  notice was a whole sentence inside a round pill (the pill says why, a line under it says what it means); the comment
  box on Look borrowed the list class, which draws a line between its rows (its own box now, and the drive asserts no
  line inside it); the rules editor showed two lines of three (`textarea.gm-tall`: a Text Input puts its class on the
  textarea itself; the drive's check read 20 px clipped before, 0 after).

### 10.6 Findings

- **Filed P121-TWO005-DROPDOWNSTALE** (medium, `kit: core`): a Dropdown with wired Items reports its default item's
  value until someone picks.
- **Filed P121-TWO005-ACLNULL** (low, `kit: core`): `ACL: null` on a write answers 200 and keeps the ACL.
- Met, good: the Request refused a `null` body in words before the script; the census caught a length as a possible
  count. Ours: the fixture tie, the duplicate placeholder, the four from the shots.

### 10.7 Next

AC3's second half and AC4 are met: TWO-005 slices 1–5 are built and driven. Left in the task: testimonies and events
(the picture has both; `SHARED_KINDS`), slice 6 (installable, waits on P119 SRK-005), and §6.5's ruling. Gate 4
(TWO-009) judges §10.3.

## 11. Session 16 (2026-10-15, Opus 5.5): slice 4b, testimonies and events

### 11.1 The world, unchanged

The world already had both kinds: `Post.kind` is one of `post`, `prayer`, `testimony`, `event`, and `eventOn` (a date)
is required when the kind is `event`. The database doesn't keep that rule (`backend/schema.json` says so), so
`sharePost` does. Nothing in `docs/world/`, `backend/schema.json` or the policy changed; no new function.

### 11.2 What was built

| | where | what |
|---|---|---|
| `sharePost` | `two005Feed.ts` | `SHARED_KINDS` is the world's four. **A testimony** needs words ("Tell the members what happened.") and may carry photos. **An event** needs words ("Say what the event is.") and `eventOn`, an ISO date-time string: anything else ("tomorrow", "2026", a number, a Date object) is "Say when the event is: its day and its time."; a passed one "That time has passed. Choose when the event is."; one more than 366 days ahead "An event within the next year, at most." Kept as a Date, normalised to UTC. Only an event keeps a day: one sent with a post or a testimony is dropped. The words each kind needs are one table, `WORDS_NEEDED`, which the page holds too |
| the card | `two005FeedPages.ts` (`cardsOf`, `/Feed/PostCard`) | every kind but a post wears its pill (`KIND_NAMES`, wired into the slice-4 pill). A testimony leads with its words (`wordsFirst`, the prayer request's slot) and keeps its hearts; **so does any card with no photo, of every kind** (§11.5). An event's head line says **"Event · Saturday 18 October, 9:00"** where a post says when it was shared, in the reader's own time, the year only when it isn't this one, **"was"** once passed; an event with no day says so. A testimony's says "Testimony · 2 h ago" |
| New post | `two005FeedPages.ts` | the picture's four chips (they wrap on a phone); each kind's heading, field, hint and button from one table (`NEW_POST_SAYS`); photos for every kind but a prayer request. **An event** adds **Day** (the library's Date picker, `datePicker.ts`, placed as `/UI/DatePicker`: the phone's own picker on a phone, a calendar on a tablet; from today to 365 days on) and **Starts at** (a Dropdown, every half hour 6:00–22:00, `EVENT_TIMES`). The page joins them into one instant in the phone's own zone and holds a missing day, a missing time or a passed time in words before anything is sent. Both land on the feed |
| a profile | `two005ProfilePages.ts` | three counts, **posts · prayer requests · testimonies**, as the picture has them; one `/Profile/Count` per count in a For Each (the door refused three hand-copied boxes, `repeated-sibling-subtree`). Testimonies stay out of the grid, as prayer requests do; events are in it |

### 11.3 What it settled (none asked of Richard; gate 4 can overturn them)

- **A testimony is words first and may carry photos.** The picture's has none; a baptism's photo is a likely one.
- **An event's time is an instant, shown in each reader's own time.** Ann sets 9:00 in Lagos; Bob in Accra reads
  8:00. The community's `timeZone` (in the world, for the devotional's release) isn't used for events.
- **An event is from now to a year on**, at a half hour from 6:00 to 22:00. A mistyped year is refused, not kept.
- **A passed event stays in the feed**, saying "was". No list of what's coming, no reminder, no "going".
- **Testimonies are counted apart and kept out of a profile's grid**, as prayer requests are; an event counts as a post.
- **No "Answered" on a prayer request** yet, though the picture draws one (a testimony can say it).

### 11.4 Readings (2026-10-15, working tree on `3f4c5f959`)

- MCP: **`two005Kinds.test.ts` 46/46** (13 checks, 33 page mutants red). Its first run had 4 red, all the spec's: a
  fixture's age order, a mutant aimed at the wrong JSON text, a "no latest day" mutant that changed nothing, and a "day
  read as UTC" mutant left green because no fixture time crossed midnight in UTC. The spec now pins `TZ` to
  Africa/Lagos (UTC+1) and carries an event at 00:30 (it asserts that UTC's day differs). Slice 4's seven mutants whose
  text had moved were re-pointed; slice 2 and 4 each had one expectation turned by §11.5. With `two005Prayer`, `-Feed`,
  `-Profile`, `-Moderate`, `-Template`, the budget gate and DEF-038: **295/296**, the red DEF-038's
  `templates/nightbook` as always. `noodl-mcp` `tsc` 0.
- The door refused twice, both rightly (§11.6); regenerated, it raised **no warning** (infos: `oversized-page` 10,
  `unknown-type-check-skipped` 42, `dynamic-port-skipped` 263, `gate-starts-shown` 18; the last three not compared with
  s15's).
- Backend: **`two-005-kinds` 6/6** (first run); with join, feed, profile, prayer, moderate and TWO-001's gram policy
  **81/81**. Slice 4's spec refused `testimony` and `event` as unknown kinds: now `story`, `PRAYER`, `7`. Backend
  tests `tsc` 0.
- Mutants: `TWO005_MUTANTS=1 npx jest tests/two-005-kinds-mutants.test.ts tests/two-005-prayer-mutants.test.ts
  tests/two-005-feed-mutants.test.ts` **54 of 54 red** (12 kinds, 19 prayer, 23 feed: every file that grades
  `sharePost`). Profile and moderate mutants not rerun (their functions didn't change).
- Drive: **`two-005-kinds-drive` 1/1** (33 s; Ann on a phone in Lagos time, Bob on a tablet in Accra's, by
  `Emulation.setTimezoneOverride`; New post's four chips on screen at 390 px; a testimony held empty, then shared, its
  words above its heart; an event held for words, day and time in turn, the day set as a phone's picker sets it, the
  day field's min and max today and a year on; stored `…T08:00:00.000Z`; **Bob reads it at 8:00, Ann at 9:00**; Bob's
  heart reaches Ann's screen with no reload; Bob's event, its day from the calendar popup at 19:30, stored
  `…T19:30:00.000Z`, **on Ann's feed at 20:30 with no reload**; Ann's counts "1 post 0 prayer requests 1 testimony";
  0 console errors; 0 px overflow on 10 screens). `two-005-join`, `-feed`, `-profile`, `-prayer`, `-moderate` drives
  **1/1** each again (the card's order changed under them; their console lines are the refusals each provokes). 10
  shots `shots/two005-kinds-*.png` and the others' retaken.
- Census: only `gram` moved (25,235 → 26,907 code lines read); one verdict removed (§11.6), no new candidate,
  `--check` fresh.
- The builder's page: `templates/gram/docs/SETTING-UP.md` §12 Testimonies and events (§8's profile line too), through
  the content-authoring skill's offline checks (two sentences rewritten, then clean).
- The viewer bundle (Oct 15 18:27) is newer than `noodl-viewer-react/src` and `noodl-runtime/src`.
- Not run: the editor's typecheck; the full conformance suite (no product code changed).

### 11.5 What looking at the shots found

- 🔴 **A card with no photo put "♡ Heart · Comment · No hearts yet" above its words**: slice 2's order (photo, heart,
  caption), which on an event with no photo hid what the event is under a count of nothing. Every card with no photo
  now leads with its words, of every kind; a post with photos keeps the picture's order. The drive asserts it on the
  event; the specs on a post, an event and a testimony with and without photos.
- Looked at, kept: the Day field's focus ring is gold (the gram's `--ring`, on purpose); an event's profile tile shows
  its words only, no day (written down, not built).

### 11.6 Findings

- **Filed P121-TWO005-NOTIME** (low, `kit: core`): no node picks a time of day (Text Input's `type` has no `time`,
  the library's Date picker no time), so an event's start is a 33-item Dropdown.
- Met, good: the door refused `Outputs[k + 'Ink']` (it reads a Function's ports from its code, and named the fix), and
  three hand-copied count boxes (`repeated-sibling-subtree`: one `/Profile/Count` in a For Each now). The library's
  Date picker dropped into a third template unchanged, and a drive picked from its calendar.
- Met, the census: its count candidate is "a `.length > N` near a create", so the event block pushed
  `sharePost.photos@count` out of range and its hand verdict named nothing (`--check` red). The verdict is removed; the
  rule it judged (4 photos at most) is unchanged.
- Ours: the four spec reds in §11.4; a profile script that read its own `Outputs` back (caught before it ran: the
  handoff's rule); a backtick inside a shell command's double quotes, which stopped it before it ran.

### 11.7 Next

Left in the task: slice 6 (installable, waits on P119 SRK-005), §6.5's ruling, and the picture's Search and
"Answered" (not in the world). Then TWO-006 (needs the builder's HTML files) or TWO-010 (needs SRK-005). Gate 4
(TWO-009) judges §11.3.
