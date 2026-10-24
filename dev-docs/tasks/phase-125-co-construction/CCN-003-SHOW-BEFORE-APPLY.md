# CCN-003 — Show before apply

**State:** open. **After:** CCN-001 AC5.

The plan flow (`create_plan` / `stage_plan_operation` / `apply_plan`) already keeps everything off disk until the one
apply. Today nobody sees the staged operations but the model. Here they render in Studio as the plan grows: a card
per staged component, drawn by the in-page preview from the staged files, with **Accept** and **Not that**. `apply_plan`
waits for the person's accept when Studio is on screen (a plan with no Studio applies as today). The person's "not
that" reaches the model through `ui/update-model-context` with the card named. Measured on the rocket times-tables app.

**Vehicle (2026-10-25):** a staged section can be shown in a mini editor ([CCN-008](CCN-008-A-MINI-EDITOR-IN-THE-MESSAGE.md)) with Approve / Not that; what is left here is rendering the STAGED files (before `apply_plan`) rather than the files on disk.
