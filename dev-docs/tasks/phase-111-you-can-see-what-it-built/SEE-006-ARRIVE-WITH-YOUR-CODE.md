# SEE-006 — Arrive with your code: a React screen becomes a NodeGX component, with its number

**Opened 2026-10-01.** **Depends on SEE-001, SEE-005, NSP-018's `idioms`.** R4 asked.
**Status: 📋 not started.**

## 1. The person sentence

> **Someone with a React app their agent wrote points NodeGX at one screen of it and gets back the same screen as a
> NodeGX component, laid out, with an honesty number that says truthfully how much of it landed in known nodes and how
> much is still their code, in a Function, unchanged.**

## 2. Why

This is the fourth door and the one that turns NodeGX from a builder into a companion: **you do not have to start here
to benefit from here.** P107 §8 named it ("take your vibe-coded app and migrate it into a node canvas") and left three
doors open for it: traces that name a whole app, network as plain HTTP, and `idioms` on each spec. The honesty number is
its truth test: an import that fills a canvas with Function nodes holding the old code is a migration nobody can read,
and the number says so.

## 3. What to build, in two steps (R4: fixture first)

1. **Step one, the package path.** A React component written against `@nodegx/nodes-react` (SEE-005) is parsed (its
   imports name the nodes; its JSX names the visual tree; its hook wiring names the connections) into a component in
   SEE-002's text form, then compiled. Anything that is not a package call becomes a Function with the code verbatim.
   Fixture: the stranger's task row from SEE-005 AC4.
2. **Step two, the idioms path.** Hand-written React with no package: each `idioms` entry in the specs is a pattern;
   matches become nodes; the rest becomes Functions. Fixture: one screen of the code training app
   (`vscode_projects/digital-bricks-training`), chosen by Richard as the slice he rebuilt (R7), mapped **by hand first**
   so the automated path has a reference, in NSP-004's shape.
3. **The number is the result.** Both paths return the component's honesty number and the list of what stayed code.
4. **The MCP tool** `import_react_component`, read-only until R4 makes it a door; it writes to a scratch component and
   returns the text form, so the agent and the person can read what arrived before anything lands.

## 4. Acceptance criteria

1. Step one: the fixture arrives at 100% for the nodes it used, the component renders the same screen in the editor
   (`render_report` geometry within tolerance), and its drives pass.
2. Step two: the training screen arrives with the honesty number the hand mapping predicted, within one node; the parts
   that stayed code are named and are the parts the hand mapping said would.
3. Nothing arrives silently: a construct the import could not place is a diagnostic naming the line, in the same shape
   as `get_import_report`'s rows.
4. Richard reads the arrived training screen in the editor and says whether he can tell what it does. His words here.

## 5. Watch for

- Memory: *a reading that fits is not one that excludes.* An idiom that matches a `useState` is not necessarily a
  Counter. Each `idioms` match must be confirmed by the behaviour (the spec's scenarios run on the arrived node against
  the original's traces, SEE-003's diff), not by the shape alone.
- The legacy import already has a report format and a policy ("the importing user's AI assistant fixes it"). Reuse the
  report, not the policy: here the number is the answer, not a to-do list.
