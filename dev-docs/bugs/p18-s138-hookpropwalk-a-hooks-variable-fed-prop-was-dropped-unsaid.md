---
id: P18-S138-HOOKPROPWALK
title: A logic component's (hook's) input fed by a Variable or an Object's key was dropped without a word, because the walk that earns a render read's hook never visited a hook call (bot-garden's shop rows got no tab)
status: fixed
severity: medium
area: export / the emitter's render-read walk (`src/emit/component.ts`, `preOrder(plan)` beside `plan.hookCalls`)
found: P18 session 138, 2026-10-22, when a relayed row's state row bound to a hook's prop was never declared (TS2304 ×75 in `tplbuild`)
fixed: P18 session 138, 2026-10-22; EXP-011 §108
commit: 10dc1c990
evidence: dev-docs/tasks/phase-18-code-export-v2/s138-lifted-list/README.md, hookstore.out
regression: packages/nodegx-export/tests/a-logic-component-is-a-hook.test.ts
---

The emitter earns a render read's hook (`useValue` for a Variable, the store-key hook, a state row) by walking the
bindings of the drawn tree (`preOrder(plan)`). A logic component's placement is called, not drawn (EXP-021, s136), so its
bindings were never walked. A prop bound to a Variable or an Object's key printed only if a drawn element also read the
same Variable, and otherwise was left out of the call with nothing said. The plan bound it, and the report said nothing.

The templates' plans bind 215 hook props to a Variable or an Object's key. On HEAD, for example: bot-garden's
`useShopRows({ model, words, lang })` without `tab`, so every shop tab listed the same rows; `usePickThing()` without
`world`; `useChallenge` without `askedFor` and `outcome`. s136's spec pinned `usePickThing();` as "a placement that
passes nothing".

Fixed: the walk visits `plan.hookCalls` too. Found with P18-S138-RESERVEDLOCAL, which this exposed.
