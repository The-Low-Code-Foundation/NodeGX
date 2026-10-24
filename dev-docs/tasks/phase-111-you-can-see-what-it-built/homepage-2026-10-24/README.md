# The canon homepage draft (2026-10-24)

Richard, 2026-10-24, after the "Built to be changed" explainer: *"homepage and not even the Why section, rewrite the whole
sucker, this is way clearer and that text with the slider thing is fucking genius, if you can show that inside a fake
Claude Chat we're sucking diesel"*, then *"Can we make a couple more slider / input toys like your text one? Maybe with a
3D model ??"*. He also cleared naming and linking Communauté Coiffure (communaute-coiffure.com) as a case study.

Published for his review: homepage draft https://claude.ai/artifact/F9FgWFC4roxYfVLmsqfLdB (the explainer it grew from:
https://claude.ai/artifact/7NTjp1suvFzZE4ewfL9ii5). **Not in nodegx-web, not deployed.** On 2026-10-24 nodegx-web held another
session's uncommitted edits (demos, changelog, built index pages); its `site/_page.html` was clean and matched the live site.

## Parts, and how to assemble `site/_page.html`

- `new.css`: appended inside the homepage `<style>` before `</style>` (it becomes part of `site.css` via `ops/build.py`)
- `new-top.html`: replaces the old homepage from `<!-- nav -->` through the end of the `#agents` section (the hero, then
  origin, rule with the Button and 3D toys, where, agents = "what we measured", ways)
- `new.js`: appended at the end of the page (three.js r128 from cdnjs; vendor it if the site gets a CSP)
- the rest of the old page from `<!-- The backend map: a demo -->` onward is kept as it was

Assembly used: lines 1–573 of HEAD's `site/_page.html` + `new.css` + `</style>` + `new-top.html` + lines 703–end + `new.js`.
The artifact copy also rewrote relative links to `https://nodegx.io/…` and inlined `demos/backend-map.webp`.

## Where every claim comes from

The comment at the top of `new-top.html`. Copy passed the content-authoring offline checks (written, closer, contract,
opener). The class is `cf`, not `field`: `.field` belongs to the waitlist form and has `flex: 1 1 220px`.
