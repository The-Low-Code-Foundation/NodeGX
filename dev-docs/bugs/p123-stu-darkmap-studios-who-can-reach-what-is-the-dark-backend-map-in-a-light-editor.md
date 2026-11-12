---
id: P123-STU-DARKMAP
title: Studio's "Who can reach what" is the dark backend map inside a light editor
status: fixed
commit: nodegx-studio 500cad0; backend-map 0.1.5 (NodeGX, P124 editor/)
severity: low
launch: beta
area: "@nodegx/backend-map `public/style.css`, `public/app.js` (≈70 colours written into the canvas drawing; `server.mjs` sends `look.colors.dark` only); nodegx-studio `editor/studio.html` renderMap (the iframe src)"
found: Richard, 2026-10-30 ("the 'who can access this data' is still the funky map with the dark background, not the light mode one we switched to")
evidence: backend-map 0.1.4 `public/style.css` :root (`--ground: #141318`, white text), `server.mjs:134` `look.colors.dark`; Studio dfa84e7 made Workflow light and put the light Data model first, and left Data → Map → "Who can reach what" on the package's dark page
---

Richard, 2026-10-29: the workflow explorer and the map were dark in a light editor. dfa84e7 (STU-090) re-themed the
workflow and made Data → Map open on a light data-model view, but "Who can reach what" (and every "Who can access
this?" / "Who can read X…" that lands on it) is still `@nodegx/backend-map` in an iframe, and that page has one look:
dark ground, white text, colours written into the canvas code. The package never had a light look to ask for.

Fixed (2026-10-30), in two places:
- `@nodegx/backend-map` 0.1.5 (source: P124 `editor/`): one palette per look in `public/app.js` (the light one on
  Studio's tokens, `#eef0f3` ground, `#171b22` ink), `public/style.css` on tokens with a `:root[data-look='light']`
  block, the legend in `index.html` on the same tokens. `?look=light`, or `<html data-look="light">` for a page written
  into a src-less frame, picks it; with neither it is dark as before (the standalone map and nodegx.io's recording).
  Dark measured unchanged: 1,521 of 1,680,000 pixels differ from 0.1.4's on the same recording, 110–297 in each 100 px band
  of the canvas, which the header lets through (its random stars and moving dots), 1 in the strip below. Its suite (`test/run-all.mjs`) passes.
- nodegx-studio: renderMap's frame asks `?look=light`; inside a conversation `hosted.js` drawMap says it on the
  written page's `<html>`; the window the card opens asks it too. check:data 82/82 and check:hosted 37/37 each assert
  the frame's look and ground (`["light","rgb(238, 240, 243)"]`); against 0.1.4 check:data's assertion FAILS
  (`[null,"rgb(20, 19, 24)"]`, 80/82).

Studio reads the light look only once 0.1.5 is published (Richard's npm OTP) and Studio's pin moves to it; until then
this checkout runs the gates on 0.1.5's `public/` laid over its installed 0.1.4.
