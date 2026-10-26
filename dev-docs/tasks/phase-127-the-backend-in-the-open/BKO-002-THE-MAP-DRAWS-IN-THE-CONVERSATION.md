# BKO-002 — The map, and Privacy, draw inside the conversation

**Phase:** [127](README.md). **Repos:** nodegx-studio (`editor/hosted/hosted.js`, `editor/studio.html`,
`editor/serve.mjs`), the map (`dev-docs/tasks/phase-124-the-mystery-of-the-backend/editor/`, published as
`@nodegx/backend-map`), `noodl-mcp` (`studio/studioProxy.ts`) only if the proxy is the right place for a header.

## Why it does not draw today

Studio runs in the conversation at the host's sandbox origin. Its requests go to the MCP server's loopback proxy
(`hosted.js:27-42` rewrites `fetch`, `EventSource` and XHR). The panel's CSP declares `connectDomains`,
`resourceDomains` and `baseUriDomains` for that origin, and no `frameDomains`, because Claude holds those back pending
a security review (`openStudio.ts:63-71`).

1. `#mapframe` navigates to `/backend-map/`, a different origin with no `frameDomains`, so it stays blank. Session 13
   hid it and drew a card instead (`hosted.js:269-290`).
2. Even framed, `@nodegx/backend-map`'s handler sends **no CORS headers** (`server.mjs:241,273,291`), and the proxy
   passes headers through (`studioProxy.ts:126`). So `/backend-map/api/*` and `words.js` are refused from the panel.
   That is why **Privacy in the conversation is probably broken too** (`studio.html:4624-4631` fetches `api/map` and
   imports `words.js`). **Measure this first**, in the fake host the phase already has (CCN-006 s13). File it as a bug
   row if it holds.

## The way in (what the app preview already does)

`mountPreview` fills a **src-less** iframe with `document.write`. That frame is same-origin with the panel and
inherits its CSP, so `frame-src` never applies. Its loads go to `ORIGIN/runtime/`, which answers with CORS. Do the same
for the map:

- fetch `ORIGIN/backend-map/index.html`, write it into a src-less frame with `<base href=ORIGIN/backend-map/>`
  (`baseUriDomains` already allows it);
- pass the hash (`#t:<type>`) by `postMessage` or a global set before the write, because `location.hash` of an
  about:blank frame is not the map's;
- the map's relative `api('api/map')` calls resolve against `<base>`;
- add `Access-Control-Allow-Origin` to the map's answers. Do it in the package (`handler`) so every host gets it,
  with Studio's `serve.mjs` as the fallback if a publish is not possible this session.

Keep the card as the fallback for a host that refuses `document.write` frames, and say why on it.

## Acceptance

1. Fake host from a foreign origin: Data → Map draws the map (not the card); `#t:<type>` opens on that table; a run
   pulses. Privacy shows each type's sentences and the map's verdicts.
2. The same two, in Claude Desktop, in a new conversation on Muddy Paws or the todo copy. Read
   `claude.ai-web.log` for CSP refusals.
3. Studio on its own (not in a conversation) is unchanged: `check:data`, `check:app` green.
4. `@nodegx/backend-map` published with the header and Studio's pin bumped. This needs Richard's OTP: ask, do not
   work around.

## Session log

### s2 (2026-10-26): measured, fixed, and built in the fake host

**The measurement first** (Studio `editor/hosted-check.mjs`, new, `npm run check:hosted`). It copies the todo
template and starts its backend with Studio's own "Start a backend". A host of its own on another port serves Studio's
`/panel` with the CSP the MCP Apps host builds from `studioResourceMeta` (connect / resource / base-uri = Studio,
`frame-src 'none'`). It is driven in headless Chrome. Before any change: **Privacy FAIL**, "Failed to fetch
dynamically imported module: …/backend-map/words.js". Filed and fixed as **P127-BKO002-HOSTEDPRIVACY**. The map showed
the card.

**Built (nodegx-studio `f50fb31`):**
- `serve.mjs` sets Studio's CORS headers before it hands `/backend-map/*` to the map's handler. **AC4 is replaced**,
  not deferred: the header stays out of `@nodegx/backend-map` itself. Run on its own (`npx @nodegx/backend-map`) the
  map holds the backend's admin credential on a loopback port, and `Access-Control-Allow-Origin: *` there would let
  any page in the person's browser read it and change rules. Studio already answers `*` on loopback for the panel
  (STU-070), so the exposure is only where it already was. No publish, no OTP. Richard can overrule.
- `hosted.js` takes over `#mapframe`'s `src` setter. It writes Studio's `/backend-map/` into a **src-less** frame
  with `<base href=Studio/backend-map/>`, so the frame is the panel's own origin and `frame-src` never applies (the
  preview's way). `#t:<type>` is set by `history.replaceState` against the frame's own URL. **A bare hash resolves
  against `<base>`, Studio's origin, and is refused**, measured: the first run read `href` with no hash. Each new
  focus is a fresh frame, so the old map's 4-second poll goes with it. The window card is the fallback, with the
  reason. `studio.html` is untouched (a peer had an open edit in it).

Graded: `check:hosted` **9/9**: Privacy lists the types and says Task's rule in the map's words; Map shows the frame,
not the card; the map draws ("Todo list backend is running · 2 tables"); "See it on the map" opens it on Task with its
story up; the runs feed answers. Mutants: no CORS = 3 red (Privacy and both map lines); no src-less frame = 2 red.
Studio on its own unchanged: `check:data` 80/80, `check:app` 54/54. Screens: Studio `docs/look/bko-002-*.png`.

**Against the acceptance list:** AC1 ✅ in the fake host. "A run pulses" is graded as the runs feed answering
inside the frame; no run was made, because the todo app has no cloud function. **AC2 open**: Claude Desktop, a new
conversation. It needs the Studio that Desktop's `noodl-mcp` starts to carry `f50fb31`; ask Richard, then read
`claude.ai-web.log` for CSP refusals. One thing the fake host cannot show is whether Claude's CSP allows the inline
`replaceState` script in a written frame. The panel's own inline scripts run there, so it should. AC3 ✅. AC4
replaced (above).

**Found for BKO-003** (written there): the map draws the training app's `LearnerProfile` table for the todo app, and
a table in the project and not yet on the backend has no node, so `#t:` on it opens nothing. The gate puts a Task row on
the backend first for that reason.
