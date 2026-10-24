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

## Round 3 (same day): three paths

Richard: drop "Where the list shows up" and "On the first day"; "Four ways to start … is the 'ok I saw the toys, I'm
convinced, how the fuck do I start' part" → three paths by profile (trying ideas in Claude/Cline/Vibe; business apps with an
editor choice + backend; coming from Bubble). Flow: ethos → **Pick your way in** (#paths) → **Not convinced yet?** (#explore)
→ **Dive deep** (#deep + the npm section) → download (kept in place: release commits edit it) → community → mailing list.
The #more and #backend-map sections are gone (their links live in #explore/#deep).

New pages, `pages/play.html`, `pages/build.html`, `pages/from-bubble.html`, in the site's `_page.html` shape (title, style
with `@import url("/site.css")`, `<!-- nav -->`). To publish: copy each to `nodegx-web/site/<play|build|from-bubble>/_page.html`
and add SUBPAGES entries (and NAV tuples if wanted) in `ops/build.py`. `assemble.py` (run in a folder holding `orig.html` =
HEAD's `site/_page.html`) writes `_page.html` plus the artifact copies. Classes `cf` and `path-steps`: the site already owns
`.field` (waitlist) and `.steps` (start page).

🔴 **Blocker for paths 2 and 3: NodeGX Studio has no public download** (no GitHub release, `@nodegx/studio` 404, the notarised
DMG is a CI artifact behind a GitHub login; Mac arm64 only). The pages say "no download yet" and give the from-source steps.
Also: nodegx-studio origin/main is 3 commits behind local (the 0.2.6 pins); `docs/runtime/YOUR-OWN-SERVER.md` is not on NodeGX
`main` (404), so the build page describes the server steps itself.

## Deployed 2026-10-24 (Richard: "Push it all to the homepage please")

Live on nodegx.io: the homepage plus /play/, /build/ and /from-bubble/. Studio and Claude Desktop show Coming soon buttons that
go to the mailing list. Deployed by targeted rsync (index.html, site.css, play/, build/, from-bubble/), with no `--delete` and
no `deploy.sh`: nodegx-web's working tree holds another session's uncommitted edits and untracked live folders (gala, templates,
map, orbit, backend-map), and `deploy.sh --delete` from a clean copy would remove those folders from the server. Built in a
`git archive HEAD` scratch copy. First checked that HEAD's build matches the live site byte for byte, and after the push that
every other page still does. nodegx-web commits: df7c854 (pages) and the follow-up fix.
🔴 **The first push carried the whole old page below the new one.** `idx('====================== Download')` matched a CSS
comment (line 358). The artifact drafts v3/v4 had it too. The markers are now the HTML comments only, with an order assert. Count
sections (`id="more"`, `<!-- nav -->`, the old hero) on every assembly.
