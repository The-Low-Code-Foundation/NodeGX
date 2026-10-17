---
id: P18-S121-STATENAME
title: An exported field's state can take the name of a Variable the same page imports, and the page does not typecheck
status: open
severity: low
area: export / controlled state naming (§4c)
found: P18 session 121, 2026-10-17, a §B row of tests/the-ticked-input-runs-it-again.test.ts (a text input labelled "Item" on a page that reads the Variable "item")
evidence: dev-docs/tasks/phase-18-code-export-v2/EXP-011-PICKER-COVERAGE.md §88; HEAD's export of that page: `import { … item … } from '../stores/variables'` and `const [item, setItem] = useState<string>('')`, so `item.set('b')` is TS2339
---

The field's local state is named after its label, and the name is not checked against the names the file imports.
A field labelled "Item" on a page that also reads or writes the Variable `item` declares `const [item, setItem]`,
which shadows the store; every `item.set(…)` in that page then fails to typecheck. **Reach, measured:** 0 in the
shipped templates and the corpus (no emitted `useState` name shadows an import). Latent.
