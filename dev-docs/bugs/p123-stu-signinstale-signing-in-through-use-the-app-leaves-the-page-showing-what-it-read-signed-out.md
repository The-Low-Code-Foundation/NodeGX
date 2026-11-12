---
id: P123-STU-SIGNINSTALE
title: "Signing in through Use the app leaves the page in Design showing what it read signed out: Home says \"No plants yet\" for an account with six, until Studio is reloaded"
status: open
severity: medium
area: nodegx-studio editor/studio.html — Design canvas with Use the app on (the shown page is pinned by the page picker)
found: P112 OWN-026 §7, 2026-11-02 — Watering Can (built by Mistral Large 4.0 in Vibe 3.0.4) opened in Studio 0872094, a copy with its own backend
evidence: own-026 MISTRAL-PLAN §7; scratchpad shots signedin-home.png (blank, before the reload) and design-home-signedin-reloaded.png (six cards, after)
---

**Steps:** Design → Home (the app sends a signed-out visitor to Sign in, so the canvas shows Sign in; Home's `Query
Records` on Did Mount is refused: "Permission denied … on plants"). Turn on *Use the app*, sign in as
demo@example.com through the app's own form.

**What happens:** the session is stored (`Parse/<backend>/currentUser`), and the canvas then shows Home's text "No
plants yet — add your first one." The account owns six plants. Studio's own Preview (`/app`) in the same browser
lists all six, thirsty first, and so does Design after a reload.

**Why, as far as measured:** in the app a sign-in navigates to Home, so Home mounts and its query runs with the
session. In Design the page is pinned by the picker, so nothing remounts: the query's answer from before the sign-in
(refused) stays on screen and reads as "this person has no plants".

**Expected:** a sign-in (or sign-out) through Use the app redraws the shown page, as a reload does, so its queries
read as the person now signed in.
