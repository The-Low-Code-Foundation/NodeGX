---
id: P123-STU-USERLINK
title: A Link field in Studio could not point at a User (the people who sign in)
status: fixed
commit: nodegx-studio dfa84e7
severity: high
area: nodegx-studio `editor/studio.html` the field drawer (Link target list, `F.draftProblem` collections)
found: STU-090, building Swapshop in Studio (opennoodl-33), 2026-10-29
evidence: "Points at one row of" listed only the app's own types; with `_User` offered, Add field said "There is no collection called _User."
---

A listing's seller, a message's author, an order's buyer: the commonest Link in a Bubble app could not be made. The
target list now offers "User (people who sign in)" (`_User`, the name the importer already maps Bubble's User to), and
the drawer's check counts it among the types. Swapshop's Listing.seller and Offer.buyer were made and drawn on the
data model.
