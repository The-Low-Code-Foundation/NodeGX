---
id: P123-GH-ADMINRATE
title: Studio's Data pages can spend the backend's admin request limit, and then Deploy to live (or Privacy) shows "Rate limit exceeded"
status: fixed
commit: "nodegx-studio 60414ee (ships in @nodegx/studio 0.2.0)"
severity: low
area: "nodegx-studio / Data (Privacy, App data, Deploy to live) over the backend's admin limit (300 a minute, burst 100)"
found: s35 (Richard's second Greenhouse round), nodegx-studio `editor/data-check.mjs`, 2026-10-31
evidence: "MEASURED in the data gate: with a groups section (Privacy drawn twice, App data's people opened twice) placed before the live sections, Deploy to live's drawer said \"Rate limit exceeded for admin requests (300/min, burst 100). Retry in 1s.\" and offered no Go; without the section 84/84; moved last, the section itself met the limit until it waited a minute. NOT MEASURED: how many admin requests one Privacy page costs a person, or whether a person reaches the limit by clicking."
phase: P123
---

The backend allows 300 admin requests a minute. Studio asks as the backend's admin for everything in Data, and a
Privacy page alone asks for the map, the rules, the groups, each group's people and "who can reach it now" as each kind
of person. In the data gate a few of those, with the live sections after them, used up the minute, and Deploy to live's
drawer showed the limit's sentence with no way on. Studio says the backend's words and stops; it neither waits and
asks again nor tells a person to.

First measure the reach: count one Privacy page's admin requests (the server's audit, or a proxy count in
`serve.mjs`), then a person's minute of clicking. Fixes, by size: Studio waits the "Retry in Ns" and asks once more;
Privacy asks less (one /admin/permissions read shared by the grid and the list); the proxy marks Studio's requests
so the backend counts them as the owner's tool.

**Fixed 2026-11-11 (nodegx-studio `60414ee`, Studio 0.2.0, the Beta cut).** The first fix by size: Studio waits the
backend's `Retry-After` and asks again. `editor/serve.mjs` wraps `fetch` once (`lib/patient-fetch.mjs`), so every
admin call Studio makes, in `serve.mjs` and in `lib/`, waits out a 429 from a backend on this computer when the wait
is 10 s or less, up to three more tries; a longer wait, another host or a body that cannot be sent twice comes back
as before, with the backend's words. `check:patientfetch` 9/9 against a real server answering as the backend does.
Measured on the way: with `@nodegx/mcp` 0.2.10 (whose backend grades every P132 section) `automations-drive` went
red at a different step on each of three runs, the limit's sentence in one (104/105, 109/110, 103/105); with the fix
210/210 twice, and `check:data` 91/91 in the full suite. Still not measured: a person's own minute of clicking.
