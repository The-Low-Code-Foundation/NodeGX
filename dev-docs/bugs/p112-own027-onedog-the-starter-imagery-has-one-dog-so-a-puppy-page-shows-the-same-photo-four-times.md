---
id: P112-OWN027-ONEDOG
title: The starter imagery has one dog, so a puppy page shows the same photo four times
status: fixed
severity: low
area: mcp / starter imagery (imagery.ts, noodl_modules/starter-imagery)
found: P112 OWN-027 arm C, 2026-10-28
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-027/runs/C/RESULT.md; runs/C/shots/pages-home-desktop.png
kit: mcp
phase: P112 OWN-028
commit: a475b0683
regression: packages/noodl-mcp/tests/styleTools.test.ts "says one photo per page, offers the icons a page uses, and pages through every icon name"
---

A person asks for "a puppy adoption landing page". The finished page's hero and all three "Meet the puppies"
cards show **the same photograph**. A stranger reads that as a template nobody finished. It is the one miss on an
otherwise credible arm C page.

Cause: `create_project` installs 44 starter photos (`get_style_vocabulary` → `imagery`). The `animals` subject has 4
files, one each of cat, horse, sheep and dog (`animal-dog.webp`). There is no puppy and no second dog, and the
server's own rule is "do not invent an image src". So any builder, Opus included, has exactly one honest picture
for a pet-adoption page, and a card grid repeats it.

Reproduce: `create_project` on any fresh directory, then `get_style_vocabulary` → `imagery.subjects`, then build
any page with more than one animal card (OWN-027 arm C did it by hand in 3 minutes).

Ruling wanted (Richard): either (a) widen the `animals` subject to 3–4 dogs/puppies, which costs a few hundred KB
of webp plus their licence rows, or (b) accept it: a landing page with one hero photo and iconography on the cards
is a fine pattern, and the vocabulary could say so ("one photo per subject — don't repeat it across a card row").
(b) is a sentence in the imagery description. (a) is the fix a person would notice.

Scoped into P112 OWN-028 (ruling R1/R2 asked first): `dev-docs/tasks/phase-112-your-own-nodegx/OWN-028-THE-GATES-A-SMALL-MODEL-FOUND.md`.

Ruled R1 (2026-10-28): "Keep one dog, add a sentence." Fixed (OWN-028 AC5): `IMAGERY_RULE` (`imagery.ts`) in both forms of `get_style_vocabulary`: each file is one photo, used once per page; never repeat a file across a row of cards, give the cards icons instead.
