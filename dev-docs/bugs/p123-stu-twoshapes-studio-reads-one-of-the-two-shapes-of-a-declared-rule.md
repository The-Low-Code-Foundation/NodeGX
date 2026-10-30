---
id: P123-STU-TWOSHAPES
title: Studio reads a declared rule for values in one of the two shapes a project file holds, so a rule the editor cached reads as no rule (a hypothesis, read not measured)
status: open
severity: low
area: nodegx-studio `editor/studio.html` allTypes (`declared….checks?.map((rule) => ({ rule, declared: true }))`, :5341) and the field edits that filter `r.field` (:5609, :5637, :5655)
found: fixing P123-MCP-RULESERASED, 2026-10-30
evidence: read only. Studio writes `dbCollections[].checks` as the rule itself (`{ field, oneOf }`); the NodeGX editor's schema cache (`decideSchemaCache`) and provision_backend's write-back store the backend's entry (`{ name, rule, description, built, declared }`). Studio wraps every entry as `{ rule: entry, declared: true }`, so a backend-shaped entry's field is `rule.rule.field`
---

Reached only when the backend is not running (with it up, Studio reads the live table's rules, which are right), on a
project whose rules were last written by the NodeGX editor or by `provision_backend`. Expected: Data types shows the
Choice as Text, and editing that field in the drawer keeps a stale entry beside the new one. Not driven. To measure:
copy a project, write a backend-shaped `checks` entry into `dbCollections`, open it in Studio with no backend, and read
the field's kind in Data types. The fix would be one normaliser (`c.rule ?? c`, dropping `declared: false`) where Studio
reads declared rules. NodeGX's own `declaredCollections` already reads both (P123-MCP-RULESERASED).
