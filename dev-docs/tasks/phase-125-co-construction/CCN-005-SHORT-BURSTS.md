# CCN-005 — Short bursts

**State:** open. **After:** CCN-003.

One component per turn, each one rendered, so the person can stop between any two. The budget is in the server:
a plan with more than N operations staged without an `apply` is refused ("apply what you have; the person is
watching"); `create_component` on a page before its sections exist is refused (the existing leaves-first rule, kept);
`render_report` after each apply is the result's own note (it already says NOT DONE). Measured: OWN-026's lab seeds
with Studio on, the per-turn write count, and whether DeepSeek keeps to it.
