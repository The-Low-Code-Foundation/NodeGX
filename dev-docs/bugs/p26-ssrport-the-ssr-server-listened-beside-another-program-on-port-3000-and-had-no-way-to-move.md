---
id: P26-SSRPORT
title: The SSR server listened beside another program on port 3000, and had no way to pick another port except PORT
status: fixed
commit: 3c41dc02d
severity: medium
area: deploy / SSR server, Deploy to folder
found: Richard's ask 2026-10-22 ("3000 isn't working for me right now")
evidence: packages/noodl-viewer-react/static/deploy/serve.js header; control measured 2026-10-22
---

What a person saw: `npm start` in an SSR deploy said "Server is listening on port 3000", and opening
`localhost:3000` could show a different program.

Where: `static/ssr/index.js` called `app.listen(process.env.PORT || 3000)`. That listens on every
interface (`::`), and on macOS it **succeeds** beside another program that holds `127.0.0.1:3000`.
The browser, opening `localhost`, reaches the other program. Measured: a plain `listen(39130)`
beside a `127.0.0.1:39130` holder answered `{ address: '::', port: 39130 }`, with no error.

There was also no `--port` flag, and no fallback when 3000 was taken. A client-side deploy had no
server at all, and no instructions.

Fix: `static/deploy/serve.js` `listenOnFreePort`. A port counts as free only when 127.0.0.1 and ::1
can both be bound AND the real listen succeeds. `--port`/`PORT` takes exactly that port or stops
with a message naming it. With no port given, it takes the first free port from 3000. The SSR server
requires it from `./public/serve.js`.
