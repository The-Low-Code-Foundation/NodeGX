---
id: P112-OWN023-NORANGE
title: "The NodeGX backend's file server ignores HTTP Range: a request for bytes 0–99 of a song gets `200` and the whole file, no `206`, no `Accept-Ranges` — seeking in an audio player relies on it and Safari/iOS media playback requires it"
status: fixed
commit: (this session, the Beta sweep s6)
phase: P112
task: OWN-023
severity: medium
area: kit — `@nodegx/backend` `/files/<name>` (no Range handling anywhere in `packages/nodegx-backend/src`)
found: P112 OWN-023 s1, 2026-10-20 — hat X ("M's file server ignores Range requests, which is what seeking needs"), the NodeGX arm's F4 agent ("seeking in a song is broken"); verified by the lab
regression: packages/nodegx-backend/tests/p112-own023-no-range.test.ts "bytes 0–99 of a song: 206, the first hundred bytes, and where they sit in the whole"
evidence: `curl -r 0-99 -D - http://127.0.0.1:8584/files/d00da46b00a97dfe_Coastline_at_3AM.mp3` → `HTTP/1.1 200 OK`, `Content-Length: 481175`, no Content-Range/Accept-Ranges. `grep -rn "Accept-Ranges\|Content-Range" packages/nodegx-backend/src` → nothing. NOT measured: playback on a real iPhone.
kit: backend
---

A music app was the brief; the code-built arms serve their songs from Express static / Next, which answer Range.
Carried in OWN-023 arm B's row (C3); not fixed during the study.

**Fixed (the Beta sweep s6, 2026-10-25).** `files.ts` `serve` answers one `bytes=` range (`a-b`, `a-`, `-n`, the end
clamped) with `206`, `Content-Range` and the slice; past the end is `416` `bytes */<size>`; `Accept-Ranges: bytes` on
the whole file. Several ranges, a malformed one, another unit or a stale `If-Range` get the whole file (RFC 9110 allows
it). `StorageDriver.createReadStream(key, range?)`: the local driver reads the offsets, the bucket driver sends a signed
`Range`. Thumbnails stay whole. `docs/runtime/BACKEND-FILES.md` §Seeking.

**Graded.** `tests/p112-own023-no-range.test.ts` 6/6 on a real backend (red 6/6 at HEAD: `bytes=0-99` answered `200`,
as measured) and the bucket driver against a stand-in endpoint (it saw `range: bytes=500-599`, in `SignedHeaders`). Four
mutants red (If-Range ignored, end one past the file, local driver ignoring the range, no `Range` to the bucket). File
and storage suites 8 suites 76 passed (7 skipped: the MinIO half needs its env). NOT measured: playback on a real iPhone;
MinIO itself.
