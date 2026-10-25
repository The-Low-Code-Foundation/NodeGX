---
id: P121-TWO004-TOASTOVERSAVE
title: A toast lands on a drawer's footer, over its main button, for 4.5 s (12 s for an error)
status: fixed
commit: (this session, the Beta sweep s6)
severity: low
area: backend / admin app (`packages/nodegx-backend/src/admin/app/ui/toast.tsx`, the toast host at the bottom right)
found: P121 TWO-004 s11, 2026-10-15
regression: packages/nodegx-backend/tests/admin-app/toast-over-save.test.tsx "with a drawer open, the stack sits above its footer"
evidence: dev-docs/tasks/phase-121-a-marketplace-and-a-community/TWO-004-PAYSTACK.md §10
---

Toasts stack at the bottom right of the window. Every drawer puts its footer there, with its main button
(Create, Save) at the right end. After "Trigger created.", opening the trigger again put the toast over "Run now"
and "Save": `elementFromPoint` at Save's centre hit the toast (screenshot `shots/two004-hook-tablet-5-opened-again.png`).
The drive waited about 2 s for it to go. A toast lasts 4.5 s, and an error toast 12 s, which is the one a person
reads while they fix the form and press Save again.

Fix, proposed: place toasts at the top right, or lift the stack above an open drawer's footer.

**Fixed (the Beta sweep s6, 2026-10-25), the second proposal.** `toast.tsx` `toastLift()`: when the stack draws, it
reads the top of every open `.drawer-foot` and `.modal .foot` and sets the stack's `bottom` 8 px above the highest; with
none open the stylesheet's 14 px stands. Measured at draw time because a footer's height is its content's. Not
covered: a drawer opened while a toast is already showing keeps the toast where it was until the stack next changes.

**Graded.** `toast-over-save.test.tsx` 3/3 (drawer footer, modal footer, nothing open): red 2/3 at HEAD, the control
green. jsdom lays nothing out, so the footer's rectangle is stubbed: not driven in a browser.
