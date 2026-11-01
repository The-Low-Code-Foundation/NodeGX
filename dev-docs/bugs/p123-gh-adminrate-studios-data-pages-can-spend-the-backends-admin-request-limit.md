---
id: P123-GH-ADMINRATE
title: Studio's Data pages can spend the backend's admin request limit, and then Deploy to live (or Privacy) shows "Rate limit exceeded"
status: open
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
