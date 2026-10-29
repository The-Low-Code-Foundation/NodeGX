---
id: P123-STU-NEWTYPECLOSED
title: A new data type's first page data list is refused by the backend (403), and Studio said only "refused by the backend"
status: fixed
commit: nodegx-studio dfa84e7
severity: high
area: nodegx-studio `editor/studio.html` page data panel (runText) and "Start a backend" (no nodegx.security.json)
found: STU-090, building Swapshop in Studio (opennoodl-33), 2026-10-29
evidence: page data "every Listing" on a blank app: "refused by the backend (403)", console "Permission denied for this operation on Listing"; Privacy then refused any change until "Keep the rules in the app's folder"
---

A type made in Studio starts closed (nobody may read its rows), which is the safe default, but a Bubble user's first
list stayed empty with nothing pointing at the rule. Two steps stood between them and a list: finding Privacy, and
pressing "Keep the rules in the app's folder" before Privacy would change anything. Fixed: a refused (401/403) query
says why under its Last run with *Who can read <Type>…* straight to Privacy, and the first backend Studio starts for an
app writes its rules into `nodegx.security.json` at once.
