# HLT-001 — The synchronous unmount

**132 events in 42 minutes — the largest single source of noise in the editor, and the only one
whose fix is already in the codebase.**

## 1. The person sentence

> **A maintainer who opens the dev log after an hour of use does not find it buried under a React
> lifecycle warning that fires every time a popup closes.**

## 2. What it is

React writes:

> *"Attempted to synchronously unmount a root while React was already rendering. React cannot finish
> unmounting the root until the current render completes."*

**132 times**, via `bugtracker.ts`, during ordinary clicking. It is `root.unmount()` being called
from inside a React render or commit — typically a view tearing itself down in an effect or an event
handler that React is still inside.

## 3. ✅ BUILT — 2026-09-20. See `verdicts/HLT-001/2026-09-20/VERDICT.md`

**0 events on a driven session, beside a control of 1,538 on the identical drive with the seam
mutated back.** `scripts/devtools/drive-hlt001-unmount.js` is the instrument; it grades both
directions (`--expect 0` and `--expect firing`).

🔴 **§4 below was re-measured before anything was built, and it was wrong in three ways** — 78 call
sites, not 19; **eleven** already deferred, not one; and `ReactView` has exactly one subclass, so it
is not "the base most views inherit" ([[measure-the-artefact-before-believing-the-task-file]]). It is
left standing below, uncorrected, because what it got wrong is the point: eleven undocumented copies
of the same `setTimeout` is the same disease as §2 of the phase README.

🔴 **The fix cured the error and caused two others**, and a drive that counted only *this* error
called that a clean pass. `removeChild` NotFoundError (8/run) and double-`createRoot` (2/run) are
both at 0 now; the drive counts all three. The verdict's §3 is the reusable part.

## 4. 🔴 The measurement that shapes the fix — ⚠️ SUPERSEDED, see §3

`packages/noodl-editor/src` has **19** `root.unmount()` / `unmountComponentAtNode` call sites.
**Exactly one defers:**

```ts
// editor/src/views/popuplayer.ts:1220
onClose: () => setTimeout(() => root.unmount(), 0)
```

That `setTimeout(…, 0)` is the standard escape from this exact warning, and someone already wrote
it — **once**, locally, without a comment saying why, so nothing carried it to the other eighteen.

The other sites, in the order they matter:

| site | why it matters |
|---|---|
| `shared/ReactView.ts:43` | 🔴 **the base class most views inherit.** One fix here probably moves the count furthest — measure before assuming it moves it to zero |
| `views/commentlayer.ts:161,165,318,322` | four sites in one file |
| `views/lessonlayer2.ts:280,795`, `views/createnewnodepanel.ts:63` | |
| `views/nodegrapheditor/ConnectionPopups.ts:108,171,295`, `NodeContextMenu.ts:224` | |
| `views/ShowContextMenuInPopup.tsx:58`, `reactcomponents/propertyeditors.jsx:208`, `views/TextStylePicker/TextStylePicker.jsx:55`, `editor/src/whats-new.ts:76` | |

⚠️ **`ProjectScanner.ts:108-111` is not a call site** — it is a migration *rule* that matches the
string `unmountComponentAtNode` in user code. Do not edit it, and do not count it.

## 5. Scope

**In:** one deferred-unmount seam that every site goes through, and the call sites converted to it.

**Out:** rewriting any view's lifecycle; converting class views to function components; React 19
migration. This task makes an existing teardown safe, it does not redesign teardown.

## 6. Acceptance criteria

1. **(the number)** A driven session that exercises the surfaces §3's sites belong to — popups,
   context menus, the comment layer, the property editor, the node-graph connection popups — logs
   **0** *"synchronously unmount"* events. The log is committed to `verdicts/HLT-001/<date>/`.
2. **One seam, not eighteen copies.** All sites reach `root.unmount()` through a single helper. A
   spec asserts the helper defers, and a **mutant that removes the deferral is red on it**.
   🔴 Eighteen separate `setTimeout`s is eighteen copies of a decision and the next new view makes
   nineteen ([[a-second-copy-of-a-palette-drifts-silently]]).
3. The helper carries a comment naming *why* — the warning text and this task — so the next author
   does not helpfully "simplify" it back.
4. ⚠️ **A control that the fix is not merely hiding the warning.** The unmount must still happen:
   a spec proves the root's DOM is gone after the deferral, not just that React stopped complaining.
   A `try/catch` or a suppressed console would pass AC1 and fail the product
   ([[verify-the-consequence-not-just-the-mechanism]]).
5. `test:ci` at the floor; `typecheck:editor` 0.
6. **(added while building, and it is the one that nearly got away)** The drive counts the two
   errors a *deferred* teardown can cause — `Failed to execute 'removeChild'` and *"already been
   passed to createRoot()"* — and both read **0**. A drive that counts only AC1's message cannot
   tell a cure from a trade, and for two iterations it did not
   ([[a-recommendation-carries-a-measurement-of-some-property-not-the-right-one]]).

## 7. Landmines

- 🔴 **`shared/ReactView.ts` is shared.** Check which packages consume it before changing its
  signature; a base class is the one place a local fix becomes everyone's problem.
- 🔴 **`setTimeout(…, 0)` is not free in a teardown path.** If the view is disposed because the
  *project closed*, a deferred unmount runs against a world that has moved. Whatever the helper
  does, it must tolerate the root already being gone — and a spec should prove that, because it is
  exactly the shape of HLT-002's defect.
- **Count events, not lines.** See the phase README §3.
