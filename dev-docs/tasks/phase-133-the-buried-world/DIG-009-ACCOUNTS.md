# DIG-009 — One account, the game's own address

**Phase:** [133](README.md). **Depends on:** DIG-001. **Round:** 10. **Scope:** [SCOPE §9](SCOPE.md). **Rulings:**
R3, *"Yeah its own address would be cool"*; R6, *"Just open it up for anyone, no big deal"*.

## What

- **The address:** the game served from the nexus box at its own address (e.g. `dig.digitalbricks.io`, name to confirm;
  the DNS record as todo's was made, TPL-008 s5), that address on the backend's allow-list.
- **Sign-in** with the todo app's account (email and password; reset by email; both exist in the backend).
- **The game's rows** on the same backend, each owned by its person: the save, what was found (the record), answers,
  trophies, where districts landed.
- **Offline first:** the phone keeps everything and sends it when it can (iPhone Safari wipes a page's storage after
  about seven days unused).
- **Owed before strangers:** delete my account and everything in it, and export everything, on **both** apps; a short
  privacy page; open sign-up with email verification and sign-up limits; the backend's backups on.
- **GDPR:** the person's explicit yes the first time they say how heavy a task feels (DIG-011's field), and the
  privacy page says what it is for.

## Acceptance

- **AC1.** A drive signs up at the game's address, plays, closes the tab, signs in on a second browser and finds the
  same cave and record.
- **AC2.** Offline: play with the network off, come back online, the server holds the play.
- **AC3.** Delete my account removes every row of that person in both apps (counted before and after); export gives
  them all.
- **AC4.** Sign-up limits refuse a burst; email verification is sent.
- **AC5.** Richard's own account and list are untouched by every step (his row counts the same before and after).
