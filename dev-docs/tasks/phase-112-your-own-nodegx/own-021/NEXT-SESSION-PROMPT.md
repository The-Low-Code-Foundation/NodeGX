# OWN-021 → 0.4.3: ship `sharp` in the editor's backend, then make the two zips Richard sends

**Written 2026-10-20 by Opus 5.5 (session opennoodl-8a, s5), on `cline-dev`.** Read [OWN-021](../OWN-021-THE-0.4.2-CUT.md)
§12 first (what S8 drove on the released 0.4.2 and what it found), then the bug
[P112-OWN021-NOSHARP](../../../bugs/p112-own021-nosharp-the-backend-the-editor-runs-cannot-make-thumbnails-so-every-shop-photo-is-broken.md),
then the board's §2a.

🔴 **R1 still holds: none of the builder's words, names or addresses go into this repo.** The email Richard sends goes in
`~/vscode_projects/nodegx-private/builder-briefs/`.

## 1. Where it stands (measured 2026-10-20 on the released 0.4.2)

- **S8 ✅ and AC4 ✅.** Both templates open on their home page, start their backend from Backend Services (R12's line
  in the log) and walk their main path. The community app is complete: emailed sign-in links (through a local SMTP
  catcher under the Email page's **Other**), members-only photos (bare URL 403), a heart arriving live on a second
  phone in under a second.
- 🔴 **The marketplace's photos are all broken on 0.4.2 (NOSHARP, blocker).** The shop asks for `?thumb=sm|md|lg`, and
  the backend the packaged editor runs (`Contents/Resources/nodegx-backend/cli.js`) has no `sharp`, so it answers 501.
  Uploads are fine (shrunk to 1600 × 1200). **Richard's ruling: fix it product-side in 0.4.3, and hold the zips
  until then.** Not a template change; don't drop the thumbnails.
- **No zip exists to send.** The drive's zips were made from `v0.4.2` and thrown away with the scratchpad. The docs
  changed after the tag (both `SETTING-UP.md` files), so the zips must come from a later commit anyway.
- **Setup pages written**: `templates/marketplace/docs/SETTING-UP.md` (new) and `templates/gram/docs/SETTING-UP.md`
  (a "Before you start", the Email page's fields, the preview's address, the bar's word). The marketplace's says
  "Photos need NodeGX 0.4.3 or later": **true only once NOSHARP is fixed and re-driven.**
- Six more bugs filed (§12): PUSHTOALL (high, product), SAMEEMAIL, GRAMWORDMARK (medium, template),
  WELCOMEDEVOTIONAL, EMAILNOTE, ADDKEEPS (low).

## 2. What to do, in order

0. **The box.** `ListAgents`, `ps` for a suite or Electron drive, `uptime`. One heavy job at a time.
1. **NOSHARP, product-side.** Measure before building: how `nodegx-backend/cli.js` is bundled (esbuild? its
   `external` list), how it `require`s sharp (`packages/nodegx-backend/src` file transforms, the 501 path), and where
   electron-builder can put a native module per platform (`packages/noodl-editor/package.json` `build.extraResources`,
   line ~120, beside `nodegx-backend/cli.js`; outside the asar). sharp 0.33 loads `@img/sharp-<platform>-<arch>` and
   `@img/sharp-libvips-<platform>-<arch>`: four targets (mac arm64, mac x64, win x64, linux x64). Memory
   *a-lockfile-made-on-a-mac-drops-other-platforms-prebuilts* applies. Write the spec first: a test that runs the
   **packaged** `cli.js` (or the bundle with the extraResources layout) and asks a fixture photo for `?thumb=md`,
   expecting 200 and 256 px wide; red today. Then the CI step on the built artefact. Mac notarisation must accept the
   new `.node` / `.dylib` files.
2. **PUSHTOALL** (high, product, same release): push on save only to the project's own backend (`activeBackendId`),
   with a two-project spec and its mutant. Its bug file has the detail.
3. **The template fixes that cost little**, through the generators (`npm run template:marketplace` / `template:gram`;
   stop any dev stack first, a regen OOMs its webpack; never hand-edit `components/`): GRAMWORDMARK (the bar reads the
   community's name, like the marketplace's R13), WELCOMEDEVOTIONAL (drop the devotional from the welcome line),
   SAMEEMAIL's message (say the email already has an account once the token matched), ADDKEEPS. Each with its spec.
   Then fix the setup pages' lines that describe the old behaviour (the bar's word, the same-email warning).
4. **When 0.4.3 is released:** install it beside Richard's app as s5 did (OWN-021 §12's set-up), make the two zips
   from the release tag (`git archive --format=zip --prefix=marketplace/ <tag>:templates/marketplace`, the same for
   `templates/gram` as `community-app/`), R1-grep them, and re-drive at least the marketplace's photo path (a seller's
   product photo seen on the shop's card, on the product page, in the basket) at phone and tablet sizes. Look at the
   shots. Then keep the zips in `~/vscode_projects/nodegx-private/builder-briefs/` and tell Richard where.
5. **Write it down**: OWN-021 §13, the board's 0.4.3 row, this file.

## 3. Waits on Richard, not on an agent

- Sending the zips and what the email says (private folder, R1). §12 lists what the builder must set up himself: a
  mail provider for the community app, a Paystack business and key per country for cards, and that hosting isn't
  covered yet.
- Paystack test keys (TWO-004 step 4), if he wants card payment shown working first.
- The npm 0.2.3 publish (`scripts/own/publish-npm.sh …`, his 2FA), still owed from OWN-021 §10–§11.

## 4. This session, for the record

- Driven on the published `NodeGX-0.4.2-mac-arm64.dmg`, in the scratchpad, never `/Applications`. Both backends this
  drive made were deleted; `~/.noodl/backends` held the same 29 folders before and after.
- The admin app opens through `shell.openExternal` (Richard's browser). Reading a backend's `adminToken` from its
  `secrets.json` was refused by the auto-mode classifier until Richard allowed it for the drive's own two backends.
  Plan for that ask, or for the account route: the admin app's first run creates an admin account by email and
  password, which later sessions can sign in with.
- Traps paid for: a headless Chrome tab that isn't in front draws nothing (bring it to front first); `elementFromPoint`
  hit-testing still needs real buttons ahead of wrapper `div`s with the same text; the editor's "All backends" finder
  has a Start button on every one of the 29 backends, so never press "Start backend" by text while it's open (a press
  landed there this session and started nothing, checked by the spawn log and folder mtimes).
- Where the handoff was wrong: it expected a mail provider might be needed to drive the community app. Any SMTP host
  works, including a local catcher. It didn't foresee that the released backend lacks `sharp`.
