---
id: P112-OWN026-EXPORTADDTO
title: The React export would write an Update Record's Add To amount as the field's new value
status: fixed
commit: PENDING
regression: packages/nodegx-export/tests/silent-parameters-closed.test.ts ("Set Record Properties with Add To")
severity: medium
area: export (`packages/nodegx-export/src/analyze/plan.ts`)
found: P112 OWN-026 FIX-03 A, 2026-10-23, by reading the plan's Update Record refusals beside Only If Unchanged
evidence: plan.ts refused `onlyIfUnchanged` by name and knew nothing of `addTo`, added in the same commit
---

Refused by name, as Only If Unchanged is: "its Add To names properties — the runtime adds those values on the
backend, and the exported update would write them as the new values". Translating it (an increment in the api
module) is the P18 lane's call.
