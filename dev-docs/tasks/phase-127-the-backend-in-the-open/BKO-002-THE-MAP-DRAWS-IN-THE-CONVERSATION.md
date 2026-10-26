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
