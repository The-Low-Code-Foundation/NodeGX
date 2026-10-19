# SEE-001 — The honesty number: how much of this app is made of parts whose behaviour is known

**Opened 2026-10-01.** **Depends on SEE-000.** NSP-017 moves the line later; it does not block the number.
**Status: 📋 not started.**

## 1. The person sentence

> **Every NodeGX app shows one number: how much of what it does is made of nodes whose behaviour is specced and graded,
> and how much is script nobody has checked. The person can see which parts are which, by name, and the number is the
> same in the editor, over MCP and in a render report.**

## 2. Why this is the product

P107 §8 named this number for a future import: "how much of the imported app's logic landed in nodes whose behaviour is
known, against how much landed in Function nodes. An import that fills a canvas with Function nodes holding the old code
is a migration nobody can read; that number is how you would tell." The same sentence is true of an app an agent
authored directly, and SEE-000 §2 shows the training template is exactly that canvas. **A vibe coder cannot read code and
cannot read a 1,037-node graph either. They can read one number and a list of the parts it excludes.** That is what makes
NodeGX a companion rather than another builder: the other tools cannot compute this because they have no specs for their
primitives.

## 3. The definition (to be pinned in `packages/nodegx-node-spec/src/honesty.ts`)

- **Known**: a node instance whose type has a P107 spec and whose runtime conforms on the ledger (NSP-009's ratchet),
  including T4 graph nodes and T5 visual nodes once their specs land.
- **Script**: a Function, Script, Expression or Visual Function node (T6), and any node whose type comes from a
  `noodl_modules` kit with no spec (README §10, second risk).
- **Unspecced**: a picker node with no spec yet. Reported separately; neither known nor script. It shrinks as P107
  proceeds, and the number must not improve because of it without saying so.
- **Weight**: by node instance first (simple, explainable). SEE-000 §5's largest-Functions list shows whether a
  line-weighted variant is needed; if it is, report both and say which one the headline uses (ask Richard: R-SEE-001-a).
- **The number**: known ÷ (known + script), as a percentage, with the three counts beside it. Per component and for the
  project.

## 4. What to build

1. `honesty.ts`: the definition over a project's component JSON plus the spec ledger. Pure, so the MCP and the editor
   share it.
2. **MCP**: the number and the breakdown in `get_project_info`, in `get_component`, in every `create_component` /
   `update_component` result ("this component: 61%, script: `Compute pace`, `Format dossier`"), and a section in
   `render_report`. Inside the surface budget (memory: *5 budgets, 8 free*; read them).
3. **Editor**: the project number in the components panel header; each component's number on its row; the script nodes
   marked on the canvas with the same mark the number's breakdown uses.
4. **The ratchet**: `honesty-ledger.json` with each template's number; a template whose number falls fails CI; a rise
   fails until the ledger is raised in the same commit. The picker-coverage ratchet's shape, reused.
5. **The sentence**: one paragraph in the docs and in the MCP briefing saying what the number is and is not. It is not a
   quality score; a Function the person wrote on purpose is still script.

## 5. Acceptance criteria

1. For the two measured templates the number equals SEE-000's hand computation under the same rule.
2. Planting a Function in a template component lowers its number and the project's, in all three surfaces, by the same
   amount.
3. A kit node with no spec counts as script; a kit node with a spec counts as known (a planted spec flips it).
4. The ratchet reddens on a fall and on an unrecorded rise.
5. The MCP surface budgets stay green with the number in every result.
6. Richard reads the number on the training template in the editor and says whether the list of script parts tells him
   anything he did not know. His words recorded here.

## 6. Watch for

- Memory: *a budget measured on a fixture is a budget on the fixture.* Measure the surface cost on the training template,
  not on a toy.
- The number is the one thing in this phase a competitor can quote back. Define it once, in one file, and let every
  surface import it (memory: *a second copy of a palette drifts silently*).
