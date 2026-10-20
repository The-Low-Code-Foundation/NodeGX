---
id: P112-OWN023-NORANGE
title: "The NodeGX backend's file server ignores HTTP Range: a request for bytes 0–99 of a song gets `200` and the whole file, no `206`, no `Accept-Ranges` — seeking in an audio player relies on it and Safari/iOS media playback requires it"
status: open
phase: P112
task: OWN-023
severity: medium
area: kit — `@nodegx/backend` `/files/<name>` (no Range handling anywhere in `packages/nodegx-backend/src`)
found: P112 OWN-023 s1, 2026-10-20 — hat X ("M's file server ignores Range requests, which is what seeking needs"), the NodeGX arm's F4 agent ("seeking in a song is broken"); verified by the lab
evidence: `curl -r 0-99 -D - http://127.0.0.1:8584/files/d00da46b00a97dfe_Coastline_at_3AM.mp3` → `HTTP/1.1 200 OK`, `Content-Length: 481175`, no Content-Range/Accept-Ranges. `grep -rn "Accept-Ranges\|Content-Range" packages/nodegx-backend/src` → nothing. NOT measured: playback on a real iPhone.
kit: backend
---

A music app was the brief; the code-built arms serve their songs from Express static / Next, which answer Range.
Carried in OWN-023 arm B's row (C3); not fixed during the study.
