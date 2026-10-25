---
id: P112-OWN023-FILEURLHOST
title: "A NodeGX app stores every uploaded file's address as an absolute `http://127.0.0.1:8584/files/…` URL (14 of 14 songs' audio and covers in arm B), so the saved data points at the person's own machine and breaks when the app moves to a host"
status: fixed
phase: P112
task: OWN-023
severity: medium
area: kit — the backend's upload answer / the Upload File node's url output as the thing an app stores; the kit's guidance (store the file name, build the URL)
found: P112 OWN-023 s1, 2026-10-20 — hat X and the NodeGX arm's F4 agent ("everything points at 127.0.0.1"); verified by the lab
evidence: arm B as built, `sqlite3 local.db "select count(*), sum(audio like '%127.0.0.1%'), sum(cover like '%127.0.0.1%') from Track"` → 14|14|14. NOT measured: whether the kit's deploy rewrites these on the way to a host; whether the agent or the kit chose to store the absolute URL (to read in B's transcript before fixing).
kit: core
regression: packages/nodegx-backend/tests/p112-own023-file-url-host.test.ts "an old row with 127.0.0.1 baked in reads back at the VM address — get and find"
---

Carried in OWN-023 arm B's row (C3); not fixed during the study.

**Measured 2026-10-25 (the Beta sweep):** the upload answers `url: <baseUrl>/files/<name>` (`nodegx-backend/src/server/files.ts`
:223, base = the listen URL), and a File field is stored as JSON with that url (`QueryBuilder` File branch) and read
back verbatim. Nothing rewrites it on read or at deploy, so a proper File field breaks on a VM too, not only a text
column holding the url.

**Ruled by Richard, 2026-10-25:** the backend fills the address in. A File field keeps the file's name; every read
answers the url from wherever the backend is running now (old rows included, since the name is in them). A url pasted
into a plain text field is not rescued: the kit says to keep a file in a File field. Not built yet.

**Fixed (2026-10-25, the Beta sweep):** every request now runs with the address it reached the backend on
(`requestOrigin`: the `Host` header, and `https` when a proxy says so — what the deployed app's `/config` already
used), carried by `AsyncLocalStorage` (`src/storage/fileAddress.ts`). The facade's one serializer (`toWire`) answers a
File field's url from its name at that address, so get, find, search and the MCP tools all do. The upload answer and
a signed url use it too, in place of the listen address (`http://0.0.0.0:8577` on a VM). A realtime frame uses the
LISTENER's address, not the writer's. Left alone: a File whose stored url is not this backend's `/files/<name>`
(another host, a CDN), and a url in a text field (ruled). The kit now says so: an Upload File anti-pattern, and Cloud
File's `url` port. The Docker front door (`deploy/nginx.conf`) sent `Host $host`, which drops a port, and replaced an
outer TLS proxy's `https` with `http`. It now sends `$http_host` and passes `X-Forwarded-Proto` on, measured against
`nginx:1.29-alpine` with a header echo (old conf: `127.0.0.1`/`http`; new: `127.0.0.1:18081`/`https`).
SELF-HOSTING.md says what an outside proxy must pass. Graded: `tests/p112-own023-file-url-host.test.ts` 6/6 (4 red
before; mutants red: no request address, the writer's address on a live update, every File rewritten);
`deploy-assets.test.ts` gains the header check (red on HEAD's nginx.conf). Not done: a File nested inside an Object
or Array column keeps its stored url; not driven on a real VM.
