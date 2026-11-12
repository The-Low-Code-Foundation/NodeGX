# EXP-022 S7 — predicted before building (2026-10-22, Opus 5.5)

Written after measuring (`measure.ts`, `react-of.ts`), before any line of the printer changed.

## What was measured

- **The Swift printer's 13 are two families.** 9 are the stores (t01 ×1, t02 ×4, t03 ×2, t04 ×2). 4 are On App Error
  (t07), which the ruling does not cover and which stays outside.
- **On the 9, the Swift printer misses three things and nothing else:**
  1. the store modules (`src/stores/<name>.ts`, `@nodegx/core`'s `store()`);
  2. `globalstore-set` (a Set's write) and `store-key-get` (a Subscribe's read, pushed as a lifted output);
  3. the plan's `streams`: `stream-action` (a verb), `stream-out` (a value read), and each node's listeners and config.
     6 hooks over two React modules: `lib/history.ts` (State History, Undo / Redo, State Snapshot, Optimistic Update)
     and `lib/actions.ts` (Action Dispatcher, Action Handler).
- **Under the hooks, the two modules are framework-free.** `createStateHistoryNode(source, store, rerender)` and its
  five siblings are plain JavaScript. Each React hook is about 20 lines: create the node once, apply the options that
  changed through its setters (`applyInputs`), set its listeners every render, one setup effect (`setupTracking`,
  `setupRegistration`), dispose on unmount.
- **S3's loader takes `lib/history.ts` and `lib/errors.ts` as they are.** `lib/actions.ts` has one TypeScript parameter
  property, which strip mode refuses. Node's transform mode takes it.
- **`@nodegx/core` is not a dependency of the exporter, and its `dist/` is not in git.** So the core travels as S2's
  runner does: a generated constant, transpiled from `packages/nodegx-core/src`, with a test that transpiles it again
  and fails when they differ.

## The route (S3's, for the client)

The React export's own `src/stores/*.ts`, `src/lib/history.ts`, `src/lib/actions.ts` and `src/lib/errors.ts` go into the
`JSContext` as modules, with their types taken out, beside `@nodegx/core`. On the Swift side:

- `JSStore`: a Global Store as an `ObservableObject` over the JavaScript store. `get(key)` reads it, `set(key, value)`
  writes it, and every write notifies the views that read it.
- `StreamNode`: one per streaming node per placement, in `@StateObject`. It is made with the node's factory, the options
  are applied as they change, and the listeners are set every render (React's hook, line for line). Its setup runs in an
  effect before the component's pushes, and it is disposed on disappear. A verb is `node.act("undo")`. A value is
  `node.read("canUndo")`.

## Predicted

| row | now | predicted after |
|---|---|---|
| V1 split | 5 playable · 21 plan · 13 Swift printer · 46 harness | **14 playable · 21 plan · 4 Swift printer · 46 harness** |
| V3 the Swift printer's own | t01 1, t02 4, t03 2, t04 2, t07 4 | **t07 4 only** (On App Error, not ruled) |
| B1 the Swift line | 2 of 85 conform (5 played) | **11 of 85 conform: 14 played (11 conform, 3 differ as declared, 0 fail); 25 outside on the exporter (21 plan, 4 Swift), 46 harness**, the same 11 as React's line |
| B2 Swift's trace = React's | on 5 | **on 14**, event for event |
| todo-list | Swift preflight 96 losses | **unchanged, byte for byte**: todo-list has no Global Store and no streaming node, so no new module is carried |

**Where I expect it could differ from React** (each a place to look first if a row reads red):

1. Effect order: React runs a hook's setup effect (`setupTracking`) before the component's push effects. If Swift runs
   it after, the first settle's `historySize` / `canUndo` could differ.
2. A store write notifies in JavaScript at once, but SwiftUI draws again a turn later. A push reads the store when it
   draws, and React does the same after its commit, so I predict no difference.
3. The dispatcher's queue runs on promises and `setTimeout`. JavaScriptCore drains promise jobs when a call returns,
   and `setTimeout` is the host's `__later`. A wait shorter than the settle's 80 ms lands inside one settle, as React's
   `act` lands it.

**Cost predicted:** the Swift printer +250 to +400 lines (`view.ts` printing, `scripts.ts`'s `JSStore` / `StreamNode`, the
core constant apart). No change to `plan.ts`, the React printer or any React module.
