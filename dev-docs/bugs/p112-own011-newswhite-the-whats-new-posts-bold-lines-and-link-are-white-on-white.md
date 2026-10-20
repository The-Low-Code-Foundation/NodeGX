---
id: P112-OWN011-NEWSWHITE
title: "The what's-new window draws a post's bold lines and its link white on white, under a header that names the running version, not the post's"
status: fixed
phase: P112
task: OWN-011
severity: medium
area: editor / what's new (`views/NewsModal/NewsModal.module.scss` × core-ui `HtmlRenderer.module.scss`; header in `NewsModal.tsx`)
found: P112 OWN-011 AC2 re-drive, 2026-10-14 (the released 0.4.0, first project open)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-011-ONE-INSTALL.md §10
commit: 2925e3e74
---

**Measured** on the released 0.4.0 (arm64 zip from the release, sha512 = the feed's), fresh profile, dark theme, on the
first project open:

- The 0.4.0 post's four bold lead sentences (*Your project is updated to a newer format…*, *Apps made with
  `npm create nodegx` open in the editor.*, *Functions can share code…*, *A node can explain itself.*) and the link
  *Everything in 0.4.0* are invisible. Each `<strong>` computes `color: rgb(255, 255, 255)` on the panel's
  `rgb(255, 255, 255)`. *How this node works* (`<em>`) is a pale grey.
- The 0.3.0 post had the same markup (`<strong>` leads), so this predates 0.4.0.
- On a 0.3.0 install the same post opens under the header **"New updates in 0.3.0"**: the header printed
  `platform.getVersion()`, so anyone a release behind reads the next release's notes as their own, with the leads
  missing.

**Cause:** `HtmlRenderer` paints `strong`, `em` and `a` in `--theme-color-fg-highlight` (white in the dark theme) at
the same specificity as NewsModal's `.Root strong`. NewsModal paints its panel `--theme-color-secondary-bright` and
recolours only `h2, h3, p, li` to the paired `--theme-color-on-secondary`.

**Fix (`2925e3e74`):** `.Root .Inner strong, em, a` → `--theme-color-on-secondary` (the panel's paired token, right in
both themes), and the header is now *What's new in NodeGX*; the post names its own version. Driven before committing,
on the released 0.4.0 with that rule injected: every `strong` and the link read `rgb(35, 33, 41)`, and the screenshot
shows the whole post.

**Who still has it:** every installed 0.3.0 and 0.4.0, until the next editor release. The live feed post can be made
readable for them now without an editor change. Its `<strong>` leads would need to become plain `<p>` text (`b` falls
to HtmlRenderer's `*` rule, light grey). That is an edit to the published feed, so it is Richard's call.
