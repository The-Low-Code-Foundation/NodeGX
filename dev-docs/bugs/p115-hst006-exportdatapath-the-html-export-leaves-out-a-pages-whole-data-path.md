---
id: P115-HST006-EXPORTDATAPATH
title: "export (HTML target): a page that reads a record by the id in its link, saves an answer and signs a person in is printed with none of that — 15 nodes left out, the page draws and does nothing"
status: open
severity: medium
area: "export plan (`packages/nodegx-export/src/analyze/plan.ts`): Page Inputs → Record `modelId`; Record `fetched`/`failure` → Switch; Create Record `done`/`failure` → Switch; User `authenticated` → Mounted; Log In / Log Out; an unfiltered Query Records fetched from User `loggedIn`; Date To String in a row"
found: P115 HST-006 session 7, 2026-11-05, exporting Fixture C (fixtures/c-campus, written through the MCP) for Cloudflare
evidence: dev-docs/tasks/phase-115-online-on-your-own-account/spike-backend/evidence/c-campus-html-EXPORT-PREFLIGHT.md
---

Fixture B's page went to Cloudflare as the plain-HTML export. Fixture C's cannot: the export's own preflight lists 15
nodes "left out by the plan" (the same the React export leaves out) and one more read but not printed. Together they
are the whole data path: the link's id, the reader it names, both saves and their outcomes, who is signed in, signing
in and out, and the "When" of each answer. The exported page draws its card and nothing more.

Not silent: the preflight names every node with a reason. But the reasons are about the wiring shape
("its Failure output is consumed and its Fetch is unwired", "trigger h-reader.fetched is not a rendered element event
or a receiver", "logic node (net.noodl.user.User)"), and this is the ordinary shape of a full-stack page, as the
MCP's own examples teach it (`cloud-edit-record`, `user-login-flow`, `cloud-query-own-rows`).

What P115 did instead: the interpreter site (`nodegx deploy`), which runs every node; with the production viewer it is
2.93 MB (HST-006 §8). So this does not block the Cloudflare route; it decides which artefact a full-stack app ships.
Owner: the HTML/React export lane (P134 / P18), when it reaches records and users.
