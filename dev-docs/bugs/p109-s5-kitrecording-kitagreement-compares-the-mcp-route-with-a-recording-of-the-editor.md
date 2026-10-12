---
id: P109-S5-KITRECORDING
title: `kitAgreement` is red: its editor side is a recording that predates the two shared ports every visual node gained
status: fixed
commit: 0951dbbe3
severity: medium
area: `noodl-mcp/tests/kitAgreement.test.ts` against `noodl-editor/tests-unit/cn-003/fixtures/kit-app.editor-nodelibrary.json` (recorded 2026-08-17)
found: P109 s5, 2026-10-02 — ISL-009 (`6a9d00cee`)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ (ISL-009 §8 s5, ISL-005 §8 s5, ISL-005-CENSUS-2026-10-02.md)
---

Three rows red since ISL-009: the MCP extractor (built from source) gives the kit app's `demo.kit.Badge` and
`demo.kit.Meter` the new shared `scrollIntoView`/`scrollIntoViewAlign` inputs; the editor side is a recording of the
running editor's `NodeLibrary` from August and does not. Not a product divergence: the recording is stale. Hand-editing a
recording would forge it.

**Proposed:** re-record it the way its `_recording.how` says (`npm run dev:debug`, open a copy of
`packages/noodl-mcp/tests/fixtures/kit-app`, read `NodeLibrary.instance.library`), then re-run `kitAgreement`,
`cn-006b`, `cn-008`, `cn-014` and `sb-017`, which read the same file. Every new shared port will need this again — worth a
script.

## ✅ Fixed 2026-10-03 (P109 s6) — re-recorded from the running editor

Dev editor on a throwaway profile (`NOODL_USER_DATA_DIR`, recents holding only a copy of `kit-app`), opened by its
launcher card, `window.NodeLibraryData.nodetypes` read and reduced as `_recording.reduction` says. Against the
August recording, by name: five built-ins added since, none removed; each kit entry gained exactly `dataAttributes`,
`scrollIntoView`, `scrollIntoViewAlign` and the `namedports/derived` rule; every other port differs only in
`index`. `kitAgreement` 9/9. The re-record moved three population pins that read the same file (CN-006b 177 → the
recording's own `counts.total`; CN-014 84 → 88 shared names, each named) and exposed a product miss: the kit
handout's `KIT_BASE_INPUT_PORTS` had never learned s5's two scroll ports or the list (CN-008 red), now fixed.
