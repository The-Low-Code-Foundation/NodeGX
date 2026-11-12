---
id: BETA-VERIFYONGET
title: "Opening the verify-email link verifies the address: work and school mail scanners open every link on arrival, so the token is used up before the person clicks, and their own click says the link is invalid"
status: open
severity: medium
area: "packages/nodegx-backend/src/server/email-routes.ts `verifyEmail` (GET /apps/:appId/verify_email)"
found: Beta sprint, 2026-11-07, the kit-learnings review (a lesson from another project, checked against NodeGX's own mails)
evidence: "READ 2026-11-07: `verifyEmail` (email-routes.ts:324–348) runs on the GET itself: `this.tokens.consume(token, 'verify', …)` then `rawSave('_User', userId, { emailVerified: true })` and a 200 'Successfully verified'. A second GET with the same token answers 400 'This verification link is invalid, expired, or already used.' Not driven against a real mail scanner."
---

A one-time link that does its work when it is opened is used up by whatever opens it first. Corporate and school mail
(Microsoft Defender Safe Links, Mimecast, Proofpoint and the like) fetch every link in an arriving message to scan it.
So for a person on such an inbox:

1. The scanner's GET verifies the address on their behalf (the account says verified; nobody pressed anything).
2. The person clicks the link a minute later and is told it is *invalid, expired, or already used*, which reads as
   "verification failed" — they ask for another mail, and the same thing happens again.

NodeGX's password-reset and magic-link mails already avoid this (the link opens a page or form; a press does the
work). Verify-email is the one that acts on open.

**Proposed.** GET renders a page with one button ("Confirm my email"); the button POSTs `username` + `token` and only
the POST consumes the token and sets `emailVerified`. Keep the GET answering 200 for a valid unused token without
consuming it, so a scanner's fetch changes nothing. A regression: GET twice then POST once → verified; GET alone →
not verified, token still usable.

**The lesson for the kit** (parked by the learnings review, for the skill on sign-in and email): *a link in an email
should do nothing until the person presses a button on the page it opens.*
