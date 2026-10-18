---
id: P121-TWO004-TOASTOVERSAVE
title: A toast lands on a drawer's footer, over its main button, for 4.5 s (12 s for an error)
status: open
severity: low
area: backend / admin app (`packages/nodegx-backend/src/admin/app/ui/toast.tsx`, the toast host at the bottom right)
found: P121 TWO-004 s11, 2026-10-15
evidence: dev-docs/tasks/phase-121-a-marketplace-and-a-community/TWO-004-PAYSTACK.md §10
---

Toasts stack at the bottom right of the window. Every drawer puts its footer there, with its main button
(Create, Save) at the right end. After "Trigger created.", opening the trigger again put the toast over "Run now"
and "Save": `elementFromPoint` at Save's centre hit the toast (screenshot `shots/two004-hook-tablet-5-opened-again.png`).
The drive waited about 2 s for it to go. A toast lasts 4.5 s, and an error toast 12 s, which is the one a person
reads while they fix the form and press Save again.

Fix, proposed: place toasts at the top right, or lift the stack above an open drawer's footer.
