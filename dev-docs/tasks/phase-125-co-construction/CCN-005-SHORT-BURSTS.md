# CCN-005 — Short bursts

**State:** first cut built 2026-10-23 (s11, from Richard's puppy run), `create_component` budgeted s12 (2026-10-24);
not yet seen in Claude Desktop. **After:** CCN-003.

One component per turn, each one rendered, so the person can stop between any two. The budget is in the server:
a plan with more than N operations staged without an `apply` is refused ("apply what you have; the person is
watching"); `create_component` on a page before its sections exist is refused (the existing leaves-first rule, kept);
`render_report` after each apply is the result's own note (it already says NOT DONE). Measured: OWN-026's lab seeds
with Studio on, the per-turn write count, and whether DeepSeek keeps to it.

## s11 (2026-10-23): what the puppy run showed, and the first cut

Richard asked Claude Desktop (Sonnet 5.5) for the puppy adoption landing page with Studio in the conversation. The
project's file times (`NodeGX test projects/Puppy Adoption Landing`): created 17:51:44, styles 17:52:25, then nothing
until 17:55:03, when Home and five sections landed in the same second (PuppyCard and StepItem 17 and 19 s later). The
model had done what the server's instructions say for anything bigger than a two-node fix: one plan, leaves first,
the page last, one `apply_plan`. Studio had nothing to redraw for three minutes, and the person nothing to stop
(P125-PUPPY-ONEAPPLY).

Two things stacked, and the first cut answers both:

1. **One apply.** `create_plan` refuses a plan of more than `STUDIO_BURST` (3) component operations while Studio is
   running for the project (`studioFor(projectDir)`). Docs do not count. Without a Studio the plan is accepted as
   before: a build nobody watches is unchanged, OWN-026's lab included.
2. **The page last.** Even an apply per section shows nothing until a page places it. The refusal and `open_studio`'s
   result say the order that fills the screen: the page first with its Page node and nothing on it, then one plan per
   section that creates it (and its leaf) and updates the page to place it, with a line after each saying what
   appeared. Three is the largest burst the puppy page needed (StepItem, HowItWorks, the Home update).

The resident instructions were not changed (3 tokens free on the surface); the rule rides a refusal and a result,
both outside the budget. Gate: `packages/noodl-mcp/tests/p125PuppyBursts.test.ts` (a stand-in Studio found through
`NODEGX_STUDIO`; the no-Studio control beside the refusal).

## s12 (2026-10-24): `create_component` budgeted; the dist Richard runs

A plan refusal pushes a model towards single `create_component` calls, and leaves-first through that door is the same
three empty minutes. While Studio runs for the project, `create_component` of a component that is not a page and not
cloud is refused when it would leave `STUDIO_BURST` (3) components **this server created** that nothing places (no
node of any other component has its type; the candidate's own instances count). Leaf, leaf, then the section that
places them passes (one unplaced: the section); a third leaf before anything is placed is refused, naming all three,
with "Place what you have first". Components made before this server started, or since deleted, do not count.
`STUDIO_BURST` moved to `src/studio/burst.ts` (planTools re-exports it; `author.ts` could not import planTools without
a cycle). Gate `tests/p125PuppyBursts.test.ts` 10/10 (3 new, the no-Studio control included); the mutant (cap off)
turns both new Studio cases red. `stage_plan_operation` is not a way round the plan cap: it fills only operations
`create_plan` declared.

The `noodl-mcp` dist Richard's Desktop loads was rebuilt 2026-10-23 23:35 from a clean worktree at 7c2c10e0b (the s11
cap and words, not this `create_component` cap); Desktop restarted 23:45 and advertises 116 tools.

**Still open:** the per-turn write count measured in Desktop (Richard's re-run); whether DeepSeek keeps to it; CCN-003
(staged operations drawn in Studio) is the other half of "nothing lands unseen".
