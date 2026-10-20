---
id: P112-OWN023-FILEURLHOST
title: "A NodeGX app stores every uploaded file's address as an absolute `http://127.0.0.1:8584/files/…` URL (14 of 14 songs' audio and covers in arm B), so the saved data points at the person's own machine and breaks when the app moves to a host"
status: open
phase: P112
task: OWN-023
severity: medium
area: kit — the backend's upload answer / the Upload File node's url output as the thing an app stores; the kit's guidance (store the file name, build the URL)
found: P112 OWN-023 s1, 2026-10-20 — hat X and the NodeGX arm's F4 agent ("everything points at 127.0.0.1"); verified by the lab
evidence: arm B as built, `sqlite3 local.db "select count(*), sum(audio like '%127.0.0.1%'), sum(cover like '%127.0.0.1%') from Track"` → 14|14|14. NOT measured: whether the kit's deploy rewrites these on the way to a host; whether the agent or the kit chose to store the absolute URL (to read in B's transcript before fixing).
kit: backend
---

Carried in OWN-023 arm B's row (C3); not fixed during the study.
