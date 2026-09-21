# HLT-013 — the content origin is unpublished

**Built 2026-09-21 (session 9).** ✅ **On a driven session, 70 "Read docs" presses open 70 pages that
answer 200 and 8 buttons are gone; control on the identical drive against HEAD's card: 78 presses,
78 × 404.**

🔴 **The row's title is wrong, and correcting it was the first hour.** The content origin is not
unpublished. It is alive, its `/static` suffix is right, and five of its six payloads serve. What
was dead was **every documentation link in the library** — and the docs site those links needed
had quietly stopped building.

---

## 1. The number

| arm | cards | "Read docs" drawn | press → opens | answers |
|---|---|---|---|---|
| **fixed** | 78 (46 prefabs + 32 modules) | **70** | 70 × `…/NodeGX/docs/library/<type>/<slug>/` | **70 × 200** |
| **control** (HEAD `ModuleCard.tsx`) | 78 | **78** | 78 × `…/nodegx-content/static/library/<type>/<slug>/` | **78 × 404** |

`scripts/devtools/drive-hlt013-read-docs.js`. Records: [`drive-fixed.json`](./drive-fixed.json),
[`drive-control.json`](./drive-control.json), [`drive-fixed-rerun-with-stacks.json`](./drive-fixed-rerun-with-stacks.json).

How it was driven: a throwaway profile (`NOODL_USER_DATA_DIR`), a scratch copy of `todo-list`
opened through the launcher's real **Open project…** button (the folder dialog stubbed to return
it), the node picker opened from the topbar's real **Add node to graph** button, both library tabs
walked, and every "Read docs" pressed with a trusted CDP click. `PrimaryButton` puts no `href` in
the DOM — it calls `platform.openExternal` — so the drive **records** that call instead of opening
78 browser tabs, then requests each recorded URL.

**Reach, per arm:** the scratch project is what opened; 78 cards on both arms; per press, the
element under the pointer is the button, and the press recorded exactly one URL. The arm is
checked on the bundle, not assumed — the running `ModuleCard` module does or does not call
`hasLibraryDocsPage`.

⚠️ **The fixed arm read the pages from a local `docusaurus serve` of `docs-site/build`**, because
the docs site deploys on a merge to `main` and on `cline-dev` the pages are built, not served. The
URL each press produced is recorded unrewritten, on the deployed origin's shape; only the request
was pointed at the local build. **After the deploy, the same arm runs without `--docs-root` and
grades the live site** — and `deploy-docs.yml` now does exactly that on its own (§4).

---

## 2. What §2 got wrong — the sixth task file in this phase to be corrected by measurement

🔴 **"The entire origin answers 404."** It does not. The five probes in §2 were: the org root, the
project root, `/static/`, `/static/library.json`, `/static/whats-new/feed.json`. Every one of those
404s on a **healthy** origin:

- the org root answers **"Site not found"** — there is no org-level Pages site, which is normal and
  says nothing about project sites. The other four answer **"Page not found"**, a *different* page:
  the project site is up and serving its own 404;
- a legacy Pages build has no `index.html` at `/` or `/static/` — LIB-008 wrote this down on
  2026-09-11 in `verify-origin.ts`: *"measured 2026-09-11: 404 on a perfectly healthy origin. Using
  a root as a liveness signal would have declared the content origin dead every run"*;
- **nothing in the editor fetches `library.json`.** The library reads `library/{modules,prefabs}/index.json`;
- only `whats-new/feed.json` is a real consumer path, and it has never existed (ALPHA-006 said so).

`npm run docs:verify-origin` exited **0** on 2026-09-21 before any of this work. The gate already
knew; the task was opened from a probe list that could not tell a dead site from a live one.
Worked example of [[elimination-over-an-unchecked-candidate-list]].

✅ **§2's warning was right**: *"do not change the suffix on the strength of a 404."* The suffix was
correct and is unchanged.

⚠️ **The six consumers, as they actually are** (AC2):

| consumer | reads | state |
|---|---|---|
| `modulelibrarymodel.ts` | `/library/modules/index.json`, `/library/prefabs/index.json` | ✅ 200, and every icon + zip they name (78 + 78) |
| `lessontemplatesmodel.js` | `/lessons/index.json` | ✅ 200, and every thumb, badge, zip (8 + 8 + 8) |
| `whats-new.ts` | `/whats-new/feed.json` | ⚠️ **knowingly unserved** — never existed; resolves to `null` without throwing (AC4, untouched) |
| `NewsModal.tsx` | images inside a feed post | ⚠️ unreachable while there is no feed |
| `tutorialsmodel.js` | `/tutorials/index.json` | 🔴 **served, read by nobody** — zero importers; live tutorials come from the community API. **Deleted** (Richard's ruling) |
| project templates | — | 🔴 **no longer read from this origin at all** — the embedded and community providers replaced it. `getContentEndpoint.ts`'s docblock still lists it |
| **`ModuleCard.tsx` "Read docs"** | `entry.docs` joined to the **content** origin | 🔴 **78 × 404 — the defect** |

282 index-named assets were probed. 204 answered. **All 78 failures were the same link.**

---

## 3. What was actually wrong, and the fix

**The card joined a docs path onto the wrong origin.** `docs: "/library/modules/chartjs/"` +
`getContentEndpoint()` = `…/nodegx-content/static/library/modules/chartjs/`. ALPHA-006 B5 named
this card as one of four links owed a repoint; LIB-008 moved the other three. This is the only one
of the four that never called `getDocsEndpoint`, so the sweep that found them could not find it.

**And repointing alone would have fixed nothing**: the docs site had no library section. The prose
existed — just not where anything served it:

| where the prose was | entries | words |
|---|---|---|
| this repo, `library/<type>/<slug>/README.md` — authored, never published | **38** | 22,466 |
| the content repo only, as unrendered Docusaurus source | **32** | ~20k |
| nowhere | **8** | — |

ALPHA-006 §5 had ruled the content-repo prose out of the monorepo on size (*"brings the 413 MB
back through the side door"*). Measured: the 413 MB is **screenshots (378 MB) and zips (147 MB)**;
all the markdown in that repo is 1.8 MB and the library prose 0.6 MB. **Richard ruled it in on that
number, screenshots stripped** — they show the pre-refresh editor.

- `scripts/docs/import-library-prose.ts` (`docs:library:import`) — fetches the 32 entries' prose at
  a pinned commit (`cf873c1e`), strips images, badges, video, the copy-the-graph buttons and the
  old site's private syntax (`@include`, `##head##`, `ndl-*` wrappers), turns port chips into the
  node reference's inline-code style. → `docs-site/imported-prose/`, 89 files.
- `scripts/generate-library-docs.js` (`docs:library`, `docs:library:check`) — assembles
  `docs-site/docs/library/` from both sources (authored wins), deleted and rewritten whole like
  `docs:nodes`. **Resolves every link against the assembled site**: 45 kept (11 node links
  re-addressed because the category moved, ALPHA-006 §3's `Button` example), **37 unlinked** —
  their targets were renamed or never written, and the words stay. Writes
  `models/libraryDocsPages.ts`, the 72 entries with a page.
- `ModuleCard.tsx` — "Read docs" opens `getDocsEndpoint() + docs`, and is drawn only when
  `hasLibraryDocsPage(docs)`. **The editor ships the list rather than trusting the index**:
  `scripts/library/build.js:193` writes a `docs` path for every entry whether a page exists or not,
  and the index is published, so shipped editors read those rows regardless of any fix to it.

### 🔴 The docs site had stopped building, and nothing was going to say so

The control (`docs-site-build-HEAD-control.txt`, library tree removed) **fails at HEAD**: Parse
XML's description says `(so <a href="x"/> is …)`, CommonMark passes the raw anchor through, and
`onBrokenLinks: 'throw'` refuses a link to `x`. That text landed 2026-09-18; the last docs deploy
was 2026-09-11. **The next merge to `main` would have failed `deploy-docs.yml`**, and no PR job
builds the site.

It was not one line. **15 of 199 generated node pages** rendered a `<tag>` in a sentence as markup —
Parse XML's own description could not show the reader the `<item>` it is about.
`generate-node-docs.js` now escapes `<` outside code in every prose field it emits (seven sites; a
spec found the two I missed first). With the library tree present, the build then passes with
**zero** broken links — the 133 new pages added none.

---

## 4. The gates

| gate | what it grades | where it runs |
|---|---|---|
| `docs:library:check` | committed library pages + manifest = generator output | **PR** — new `docs-site` job |
| `docs:nodes:check` | committed node pages fresh | **PR** — new `docs-site` job (was run by nothing) |
| docs-site build | every link resolves (`onBrokenLinks: 'throw'`) | **PR** — new `docs-site` job |
| `tests-unit/hlt-013` (11) | button rule; manifest ↔ pages; strips stay stripped; no raw tag in any node page, with a calibration against the broken line | `test:main` |
| `docs:verify-origin` | docs + content origins; **tutorials probe removed** (nothing reads it) | PR (unchanged job) |
| `docs:verify-origin --library-docs` | every button the editor draws, **derived** from the live index + `hasLibraryDocsPage`, asked of the deployed site | **after deploy** — new `verify` job in `deploy-docs.yml`, retried while Pages settles |

🔴 **The last one is why the flag exists.** Graded on the PR that adds a page, it is red by
construction — the page is not served until after the merge. Pre-deploy today it reads exactly
that: `library-docs: PATH MOVED — 70 known pages are not where the editor looks`
(`verify-origin-library-docs-predeploy.txt`). Default run: exit 0 (`verify-origin-default.txt`).

**Gate runs:** `test:main` **534/534 suites, 8,505/8,505 specs**, exit 0 (includes a peer's
uncommitted `hlt-007` suite, +1/+5). `typecheck:editor` 0 errors. `docs:library:check` clean,
`docs:nodes:check` clean. `test:ci` **at the floor, 8 by name** — 2 NDA-017, 3 SUB-011, 3 SUB-006 — 3,036 specs, seed 67871, exit 1 as the floor always is (read by name, not by exit code).

---

## 5. Instrument faults, each of which printed a verdict first

1. **The arm check graded the last line of a 25 KB string.** The drive's `ev()` keeps the final line
   of the CLI's output; the first version returned `ModuleCard`'s module source and tested it in
   Node, so a fixed build read `cardIsFixed: false`. Now tested in the renderer, returning a boolean.
2. **A probe list that the gate had already warned about.** §2 above — the task file's own
   instrument.

## 6. 🔴 Owned, not fixed: the first press after a reload sometimes opens twice

On **2 of 4** full drives, the session's **first** "Read docs" press recorded **two**
`openExternal` calls with the same URL; every other press — 286 of the 288 across the four drives — recorded one. It happened
on **both** the fixed build and HEAD's card, so it predates this change. It did **not** reproduce
in 4 targeted single presses (including the exact first-press-after-tab-switch condition), nor on
the run with call stacks armed — where both calls, had there been two, would come through
`PrimaryButton.onClick` → React's `processDispatchQueue`. `cdp.js` dispatches exactly one
press/release. Cause unknown. For a person it would mean two browser tabs on their first click.

Recorded here with its numbers rather than as an aside, because this phase exists to stop exactly
that. It is not HLT-013's AC and it is **not claimed fixed**.

## 7. Left

- **Richard, nothing blocks on you** — both rulings are in (import it, strip it; delete the
  tutorials model).
- `getContentEndpoint.ts`'s docblock still says six payloads including project templates and
  tutorials. Two of those have no consumer now.
- The 8 unwritten entries: Confetti, Example Node Kit, Lucide Icons, MQTT Module, Charts, QR Code,
  Image Cropper, Panning and Zooming Control. A README in `library/<type>/<slug>/` + `npm run
  docs:library` brings each button back.
- 37 unlinked references inside imported prose, mostly to node pages renamed since the old site
  (`receive-event` → `event-receiver`, `icon` → `net-noodl-visual-icon`). Bridging them needs an
  old-slug → type map that does not exist; guessing would send readers to the wrong node.
