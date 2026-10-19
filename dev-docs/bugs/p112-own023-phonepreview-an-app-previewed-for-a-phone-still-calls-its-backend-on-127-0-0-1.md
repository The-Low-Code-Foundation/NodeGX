---
id: P112-OWN023-PHONEPREVIEW
title: "A NodeGX app previewed for a phone on the same Wi-Fi (`noodl-preview --host 0.0.0.0`) is served to the phone, but its page calls its backend at 127.0.0.1:8584 — the phone's own loopback — so on a phone it would get no data; and nothing in the app's folder says how to open it on a phone at all"
status: open
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
