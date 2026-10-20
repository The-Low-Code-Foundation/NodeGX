---
id: P112-OWN021-NOSHARP
title: The backend the editor runs can't make thumbnails, so every marketplace photo shows broken on a released build
status: fixed
commit: (this session, OWN-024 s1)
severity: blocker
area: editor / packaged local backend (`nodegx-backend/cli.js`, `sharp`) · template / templates/marketplace
found: P112 OWN-021 S8, 2026-10-20, on the released 0.4.2 (arm64 DMG)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-021-THE-0.4.2-CUT.md §12; OWN-024-THE-0.4.3-CUT.md §2
regression: packages/nodegx-backend/tests/nosharp-packaged-layout.test.ts "the editor's extraResources put sharp beside cli.js, and ?thumb=md is a 256 px image"
---

On NodeGX 0.4.2, a seller adds a product with a photo. The photo uploads (shrunk on the phone to 1600 × 1200, 117 KB
from a 4000 × 3000, 955 KB camera file), but every place the marketplace shows it draws a broken image: the seller's
product form and list, the shop's cards, the product page, the basket, the seller chips and logos.

**Why.** The marketplace asks for the backend's thumbnails (`?thumb=sm|md|lg`, `thumb()` in
`packages/noodl-mcp/tests/two003Pages.ts:208`; 10 components). The backend the packaged editor runs is the single bundle
`Contents/Resources/nodegx-backend/cli.js` (`packages/noodl-editor/package.json:120`), and `sharp` is not in the app, so
every transform answers:

```
501 {"error":"Image transforms are unavailable on this backend.","reason":"sharp is not installed or failed to load its
native binding (Cannot find module 'sharp' … Resources/nodegx-backend/cli.js). … Install a platform-matching sharp
prebuild to enable ?thumb=."}
```

The bare file answers 200. That is BAK-006's designed posture (sharp optional, a loud 501), so the backend is behaving as
specified; what was never true is that a backend the editor runs has sharp. Every earlier P121 drive ran the backend
from source or jest, where `node_modules/sharp` exists, so none of them could see it. The community app is not affected:
it shows photos through `Noodl.Files.sign` and asks for no transform.

**Ruling (Richard, 2026-10-20): fix it product-side in 0.4.3 — ship sharp inside the editor's backend — and hold the
marketplace zip until then.** Not a template change.

**Fix (0.4.3).** Put a platform-matching `sharp` (and its `@img/sharp-<platform>` prebuild with libvips) beside
`nodegx-backend/cli.js` in each packaged build (`extraResources` per platform, outside the asar, since it is native),
and make the bundle resolve it from there. Four targets: mac arm64, mac x64, win x64, linux x64. Gate: a CI step on the
packaged artefact (not source) that starts `cli.js` and asks a fixture image for `?thumb=md`, expecting 200 and an image
256 px wide; plus a re-drive of this S8 path on the 0.4.3 build. Watch: the mac notarisation of the new native `.node`
and `.dylib` files, and memory *a-lockfile-made-on-a-mac-drops-other-platforms-prebuilts*.

**Fixed (2026-10-20, OWN-024 s1), not released.** Measured first: the bundle leaves `require('sharp')` to plain Node
resolution (transform.ts builds the name at runtime so esbuild never inlines it), so a `node_modules` beside `cli.js`
is all it needs, and the lockfile already lists every platform's `@img/*` prebuild.

- `packages/nodegx-backend/scripts/stage-sharp.js`: `npm run build` (so `build:sidecars`) stages `sharp`, its
  dependencies at their own nested paths, and only the build machine's `@img/sharp-<platform>-<arch>` +
  `@img/sharp-libvips-<platform>-<arch>` into `dist/sharp-runtime` (16 MB on darwin-arm64, 11 packages). A missing
  target prebuild throws, naming it.
- `packages/noodl-editor/package.json` `extraResources`: `../nodegx-backend/dist/sharp-runtime` →
  `nodegx-backend/node_modules`.
- The gate on the artefact: `build/after-pack.js` (every leg, nightly included) runs `build/check-packaged-backend.js`,
  which asserts the target's prebuild is in the packed app (an app packed for another arch fails here) and runs
  `packages/nodegx-backend/scripts/thumb-smoke.js`: the packed `cli.js` started by the packed app's binary with
  `ELECTRON_RUN_AS_NODE=1`, a 640 × 480 PNG uploaded, `?thumb=md` → 200 and a 256 px PNG. On macOS the app isn't
  signed at afterPack, so there it runs under the build's Node; `build/after-sign.js` runs it again under the signed
  app's binary before notarising, the first place the hardened runtime could refuse the new `.node`/`.dylib`.
- Red → green: the spec above failed on today's `extraResources` with 0.4.2's exact 501 (`Cannot find module 'sharp'
  … nodegx-backend/cli.js`) beside its known-firing control (cli.js alone → 501), and passes with the entry.
- A dummy app packed by this repo's electron-builder 26.15.3 with the same two entries: the `.node` and the `.dylib`
  land under `Resources/nodegx-backend/node_modules`; the afterPack smoke passes in it, and so does the smoke under
  the packed (unsigned) Electron binary. An ad-hoc hardened-runtime signature can't stand in for the Developer ID one:
  dyld refuses Electron Framework itself ("different Team IDs") before sharp is reached. **The signed-Mac half is
  measured only by the release (or a signed dispatch).**

Still owed: the four CI legs green on the new hooks (a nightly dispatch on the branch shows three platforms unsigned),
and the S8 photo path re-driven on the 0.4.3 build. Sibling, not fixed here: P112-OWN024-DEPLOYNOSHARP.
