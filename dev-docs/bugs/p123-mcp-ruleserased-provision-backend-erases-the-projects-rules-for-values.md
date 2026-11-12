---
id: P123-MCP-RULESERASED
title: provision_backend left a declared table's rules for its values off the backend, then wrote `checks: []` over the project's declaration
status: fixed
commit: eea8566e3
severity: high
kit: mcp
regression: packages/noodl-mcp/tests/p127ProvisionTables.test.ts "a declared table's rules for its values are set on the backend and stay in the project", "a table the agent names keeps the rules the project declares, in the shape the editor caches them"
area: noodl-mcp `src/tools/provisionTools.ts` declaredCollections (name + columns only) and keepTablesInProject (the backend's tables written whole into `metadata.dbCollections`); `src/backend/provision.ts` ProvisionCollection (no checks)
found: following P123-STU-CHOICENOTENFORCED (Swapshop, STU-090) into NodeGX, 2026-10-30
evidence: a project declaring Listing.category `oneOf` [Furniture, Books], provisioned over MCP: the backend's Listing had no rule, and the project file afterwards read `{"name":"Listing","columns":[…],"createdAt":null,"indexes":[],"checks":[]}`, the declaration gone
---

The twin of Studio's P123-STU-CHOICENOTENFORCED, and worse. `declaredCollections` seeded each declared table from its
name and columns, so the backend took any value. Then P127-BKO006's write-back (`keepTablesInProject`) stored the
backend's tables whole in `metadata.dbCollections`, and because the backend had no rules, the project's own rule was
replaced by `checks: []`. One `provision_backend` call deleted a Choice from the person's files. A table the agent
also names in `collections` lost its declared rules the same way: the agent's entry replaced the declaration.

Fixed: `ProvisionCollection.checks` (the rules as `setChecks` takes them) is set once the tables exist, apart from
`createTable`, so a row that already breaks a rule refuses the rule (a warning) and not the table; the backend's own
rules on other fields are kept. `declaredCollections` reads both shapes the file holds: Studio's plain rule
(`{ field, oneOf }`) and the backend's entry that the editor's schema cache and the write-back keep
(`{ name, rule, declared }`), leaving out the undeclared ones (drift the backend found). An agent-named table keeps the
project's rules for it. The tool's input schema is unchanged: an agent still cannot pass rules of its own.
Measured: both tests red before (`Received: undefined`), green after; with the named-table merge taken out, the second
goes red again. `tsc --noEmit` is clean on the changed files (the 2 errors left are in `tests/p128OptionSet.test.ts`,
from before this change).

Open, and not this bug: Studio reads only one of the two shapes (P123-STU-TWOSHAPES).
