---
id: P112-OWN023-PHONEPREVIEW
title: "A NodeGX app previewed for a phone on the same Wi-Fi (`noodl-preview --host 0.0.0.0`) is served to the phone, but its page calls its backend at 127.0.0.1:8584 — the phone's own loopback — so on a phone it would get no data; and nothing in the app's folder says how to open it on a phone at all"
status: fixed
commit: a57e899fa
regression: packages/noodl-preview/tests/p112-own023-phonepreview.test.ts "tells the page its backend is on the address the page came from, under /__nodegx/backend"
phase: P112
task: OWN-023
severity: medium
area: kit — `@nodegx/preview` 0.2.2 (`--host` binds the page and mints a token, the backend stays on 127.0.0.1 and its address is written into the served `index.js`); the app folder's docs (no phone line)
found: P112 OWN-023 s1, 2026-10-19 (serving arm B's app for Richard to play beside two code-built apps that open on his phone over Wi-Fi)
evidence: arm B's openwave copy served with `npx -y --package=@nodegx/preview@0.2.2 noodl-preview <app> --port 5102 --no-watch --host 0.0.0.0` → `http://192.168.1.158:5102/?t=…` answers; `curl` of `/index.js?t=…` contains `127.0.0.1:8584` once; the preview log: "started the app's backend … on http://127.0.0.1:8584". Without `--host`, `curl http://192.168.1.158:5102/` = no answer while the two code-built apps on 5101/5103 answer 200 on the same address. `grep -i "phone|wi-fi|host"` over the app's README/docs: nothing. Not measured on a real phone (the claim is about the address the page is given). own-023/serve-apps.mjs
kit: preview
---

The two apps Claude Code built without NodeGX both open on the person's phone over Wi-Fi as they are (an Express
server listening on every interface; `next dev`, which prints its Network address, and its README says how). The
NodeGX app's preview listens on 127.0.0.1 only. `--host 0.0.0.0` exists and works for the page (with a token), but the
app's backend stays on loopback and the page is handed `127.0.0.1:8584`, which on a phone is the phone.

What a person meets: "try it on your phone" — the thing a music app is for — needs a deploy for the NodeGX app and
nothing for the other two. OWN-023 carries it in arm B's row (C3). Not fixed during the study.

**Fixed 2026-10-26 (the Beta sweep s12, a57e899fa).** No ruling needed: the fix opens nothing on the network that the
shared page did not already open.

- **The preview carries the backend** (`noodl-preview/src/server.ts`, `BACKEND_PREFIX` = `/__nodegx/backend`): shared
  (`--host`) and with a backend on this machine named in the project, it answers the page's `nodegx-config.json`
  (DEP-001's own re-pointing, which the viewer already reads) with `{ cloudservices: { endpoint: <the address the page
  came from>/__nodegx/backend } }`, and streams that path on to the backend on 127.0.0.1 (the realtime channel is an
  event stream). Behind the preview's own gate: a phone needs the token link, and the backend sees no preview token.
  The backend stays on loopback. Not shared: `{}` and no proxy, as before.
- **The backend answers through it** (`nodegx-backend` `requestOrigin` honours `X-Forwarded-Prefix`, a plain path only;
  `fileAddress.ts` knows its own file url under such a path): a photo uploaded from the phone answers a url through
  the preview, and the same row read on the laptop later answers the laptop's address.
- **The folder says how** (create-nodegx `CLAUDE.md`/`AGENTS.md` note, the vibe profile, the three READMEs, the
  `--host` help): "add `--host 0.0.0.0` and open the address it prints on the phone".

Graded: preview `p112-own023-phonepreview` 8/8 (a stand-in backend that records what reaches it; three mutants red on
their rows, rebuilt each time: config never re-pointed, token header passed on, proxy when not shared); backend
`p112-own023-file-url-host` 9/9 (two new rows; three mutants red: prefix ignored, own path strict, `..` allowed — the
last found by the row); create-nodegx 34/34. **Drive** (real `nodegx-backend serve`, the built preview, every request
from this Mac's Wi-Fi address 192.168.1.158 so the gate is real): 13/13 — backend refused on the Wi-Fi directly; page
401 without the link, 200 + cookie with it; config names `http://192.168.1.158:<p>/__nodegx/backend`; through it,
401 without the cookie, a Song written and read back, a photo uploaded whose url opens (200 image/png), the realtime
stream open and sending. Not on a real phone, and not the browser runtime: it joins `endpoint + path`
(`ParseWireAdapter.ts`), so the prefix survives — read, not driven.
