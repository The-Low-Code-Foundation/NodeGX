> ✅ **Done to the PR by OWN-024 s1 (2026-10-20).** The next session starts from
> [own-024/NEXT-SESSION-PROMPT](../own-024/NEXT-SESSION-PROMPT.md).

# The 0.4.3 cut: ship `sharp` in the editor's backend, cut 0.4.3, then make the two zips Richard sends

**Written 2026-10-20 by Opus 5.5 (session opennoodl-8a), at HEAD `1bc0b8a65` on `cline-dev`.** Richard, the same day:
"Let's wait for both zips, and write the next session prompt to push us to [0.4.3]". So **both zips wait for 0.4.3**,
the community app's too, although it works on 0.4.2.

Read first: [OWN-021](../OWN-021-THE-0.4.2-CUT.md) §12 (what S8 drove on 0.4.2 and found), the bug
[P112-OWN021-NOSHARP](../../../bugs/p112-own021-nosharp-the-backend-the-editor-runs-cannot-make-thumbnails-so-every-shop-photo-is-broken.md),
the board's §2a (the 0.4.3 row), and [OWN-013](../OWN-013-THE-0.4.0-CUT.md) §3–§4 (the release runbook every cut has
used; OWN-021 §7–§11 is its latest run).

🔴 **R1: none of the builder's words, names or addresses go into this repo.** The email Richard sends goes in
`~/vscode_projects/nodegx-private/builder-briefs/`.

## 1. Where it stands (measured 2026-10-20)

- **0.4.2 is published** (`v0.4.2` = `250a36804`). On it, P121's two templates open, start their backend and walk
  their main path (OWN-021 §12). One blocker: **every marketplace photo shows broken**. The shop asks for
  `?thumb=sm|md|lg`, and the backend the packaged editor runs (`Contents/Resources/nodegx-backend/cli.js`, one bundle)
  has no `sharp`, so it answers 501. Uploads are fine. Richard's ruling: **fix it product-side in 0.4.3; don't drop the
  thumbnails.**
- **No zip exists to send.** The drive's two zips (from `v0.4.2`, in that session's scratchpad) predate both setup
  pages. Make new ones from the 0.4.3 tag only.
- **npm is half out at 0.2.3**, measured on the registry: `@nodegx/node-spec` and `@nodegx/project-contract` 0.2.0 are
  up (07:49 and 07:52 UTC); `@nodegx/mcp`, `@nodegx/preview`, `create-nodegx`, `create-nodegx-vibe` are still 0.2.2.
  That is Richard's 2FA run of `scripts/own/publish-npm.sh` (OWN-021 §10). P123-S2-VARIANTLOST (`1bc0b8a65`) is
  another fix waiting on it.
- **The npm 0.2.4 candidate belongs to the OWN-020 lane** (a peer committed `f8250d803`, `1d4109a66`, `3026899d4` in
  the last hour of this session). The board's 0.4.3 row carries both halves: the editor release, and npm 0.2.4 with
  the Cline kit. **This prompt owns the editor half.** Before touching anything under `packages/noodl-mcp`,
  `packages/create-nodegx` or `scripts/own/publish-npm.sh`, ask that lane (memory: a-peer-may-be-doing-your-exact-task;
  peer messages short and rare).

## 2. What to do, in order

0. **The box.** `ListAgents`, `ps` for a running suite or Electron drive, `uptime`. One heavy job at a time. A
   packaging build is heavy: say so to the peers you'd slow down.
1. **Scope the cut in a task file**, `OWN-024-THE-0.4.3-CUT.md`, OWN-021's shape: the person sentence (a builder opens
   the marketplace zip on 0.4.3 and sees every photo; a stranger starts from npm), the steps table, the ACs. Read every
   item in the board's 0.4.3 row and **measure** its state (a commit, a test, the registry) rather than copying the row.
   Mark which items are this session's (the editor) and which are OWN-020's (npm 0.2.4). Add it to the board's 0.4.3
   row.
2. **NOSHARP**, the release blocker. Measure before building:
   - how `packages/nodegx-backend` builds `dist/cli.js` (esbuild? its `external` list) and how the transform code
     `require`s `sharp` (the 501 path);
   - where electron-builder can put a native module per platform: `packages/noodl-editor/package.json` `build`,
     `extraResources` (~line 120 copies `../nodegx-backend/dist/cli.js` to `nodegx-backend/cli.js`), outside the asar;
   - sharp 0.33 loads `@img/sharp-<platform>-<arch>` and `@img/sharp-libvips-<platform>-<arch>`. Four targets: mac
     arm64, mac x64, win x64, linux x64. CI builds each on its own runner; memory
     *a-lockfile-made-on-a-mac-drops-other-platforms-prebuilts* applies.

   **Spec first, red today:** run the backend as it is laid out in a packaged build (`cli.js` with the extraResources
   tree beside it, not the repo's `node_modules`) and ask a fixture photo for `?thumb=md`: 200, an image 256 px wide.
   Then a CI step on the **built artefact** of each platform doing the same. Watch the Mac notarisation of the new
   `.node` and `.dylib` files (OWN-013 §12's staple notes).
3. **PUSHTOALL** (high, product): push on save only to the project's own backend (`activeBackendId`, in
   `views/panels/BackendServicesPanel/backendVisibility.ts`), not every running one
   (`services/CloudFunctionDeployer.ts`, `pushToAllRunning`). Spec: two projects, two running backends, a save in one
   pushes nothing to the other; a mutant restoring the loop fails it.
4. **The template fixes that cost little**, through the generators (`npm run template:marketplace` /
   `template:gram`; stop any dev stack first, a regen OOMs its webpack; never hand-edit `components/`), each with its
   spec: GRAMWORDMARK (the community app's bar reads the community's name, as the marketplace's R13 does),
   WELCOMEDEVOTIONAL (drop the devotional from the welcome line), SAMEEMAIL (once the token matches, say the email
   already has an account), ADDKEEPS (clear the fields after an add). Then change both `docs/SETTING-UP.md` lines that
   describe the old behaviour (the bar's word; the same-email warning stays, it's still true of the admin app). Rerun
   `npm run ontology-census` and check only the templates moved.
5. **Cut 0.4.3** by the runbook (OWN-013 §3–§4, as OWN-021 ran it): the cut point and `git merge-tree` against
   `origin/main`; CHANGELOG `## 0.4.3`, the release body and the what's-new post, through the content-authoring skill
   (memory: copy-passes-the-content-authoring-skill; R1 for every word); the PR to `main` and its six required checks;
   the editor test floor by name. **Pushing, the PR, the merge, the tag and Publish are outward-facing: ask Richard's go
   for each** (in s4 he gave "You have my permission to PR without review", for 0.4.2 only).
6. **When 0.4.3 is published: the zips.** Install it beside Richard's app as OWN-021 §12 did (the DMG into the
   scratchpad, `--user-data-dir`, `--use-mock-keychain`, `-ApplePersistenceIgnoreState YES`, `ELECTRON_RUN_AS_NODE`
   unset, CDP not on 9222, never Connect, never `/Applications`). Make both zips from the **0.4.3 tag**:
   `git archive --format=zip --prefix=marketplace/ v0.4.3:templates/marketplace` and
   `--prefix=community-app/ v0.4.3:templates/gram`. R1-grep both against the private brief. Re-drive:
   - the marketplace's photo path, at 390 × 844 and 820 × 1180: a seller's photo on the product form, the shop's
     card, the product page, the basket, the seller's logo. Each image `naturalWidth > 0` and a `?thumb=` answering 200;
   - the community app's setup to its first post (its path didn't change, but the template fixes did);
   - **look at every shot.**

   Then put the zips in `~/vscode_projects/nodegx-private/builder-briefs/` and tell Richard where.
7. **Write it down:** OWN-024 (readings), OWN-021 (S8's zips done), the board, this file for the session after.

## 3. Waits on Richard, not on an agent

- His 2FA run of `scripts/own/publish-npm.sh /Users/richardosborne/vscode_projects/OpenNoodl-worktrees/npm-0.2.3-tarballs`
  (the four 0.2.3 packages still missing), unless OWN-020's 0.2.4 replaces it; settle which with that lane and him.
- The go for each outward step of the cut (push, PR, merge, tag, Publish).
- Sending the zips and the email's words. OWN-021 §12 lists what the builder must set up himself: NodeGX 0.4.3, a mail
  service for the community app (any SMTP provider the Email page lists), a Paystack business and secret key per
  country for cards, and that putting either app on the internet isn't covered yet (TWO-011).

## 4. Traps paid for in s5 (OWN-021 §12)

- The backend card's *Manage data & settings* opens **Richard's own browser** (`shell.openExternal`). Open
  `<endpoint>/_admin#token=…` in your own headless Chrome. Reading a backend's `adminToken` from
  `~/.noodl/backends/<id>/secrets.json` needs Richard's go (the classifier refused it until then): ask at the start.
- The **Find a backend** finder has a *Start backend* button on every backend and Escape doesn't close it. Close it by
  its `aria-label="Close"` button; never press "Start backend" by text while it's open.
- A headless Chrome tab that isn't in front draws an empty body: `Page.bringToFront` first.
- Run one app's backend at a time (PUSHTOALL, until it's fixed).
- Delete every backend you make (`ipcRenderer.invoke('backend:delete', id)`) and diff `ls ~/.noodl/backends` before
  and after: 29 folders at the end of s5.
