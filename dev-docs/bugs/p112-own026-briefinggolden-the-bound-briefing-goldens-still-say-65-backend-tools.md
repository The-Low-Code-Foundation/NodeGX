---
id: P112-OWN026-BRIEFINGGOLDEN
title: The bound-briefing goldens say the backend group has 65 tools; FIX-01's set_backend_enforcement made it 66, so instructions.test and sbr013Doctrine.test are red
status: fixed
commit: 328f1dd1d
severity: low
area: test — `packages/noodl-mcp/tests/fixtures/boundInstructions.{deferred,readOnly}.txt`
found: P112 OWN-026 FIX-02, 2026-10-22
evidence: "Its 65 tools are not advertised yet" expected, "Its 66 tools" served
---

A stale golden, not a product defect: the count is computed from the group. Updated to 66.
