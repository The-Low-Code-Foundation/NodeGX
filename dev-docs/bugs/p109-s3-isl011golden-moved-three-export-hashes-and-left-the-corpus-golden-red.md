---
id: P109-S3-ISL011GOLDEN
title: ISL-011's export change moved three emitted files and did not move the corpus golden, so HLS-001's identity gate was red from 4638de4b1
status: fixed
commit: (P109 s3, the ISL-002 commit)
severity: low
area: nodegx-export / tests/goldens/hls001-corpus.sha256.json
found: P109 s3, 2026-10-02 (ISL-002 changed the emitted States library and ran tests/hls001-corpus-identity.test.ts)
evidence: packages/nodegx-export/tests/hls001-corpus-identity.test.ts ("no project emits a different byte")
---

P109 s2 (`4638de4b1`, ISL-011) made `emit/kits.ts` apply a kit node's `defaultCss` (five lines in `KitNode`). That moves
`src/kits/runtime.tsx` in the three corpus projects that carry a kit (`charts`, `kit-signals`, `kits`). Session 2 ran
the kit spec and the export spec for its change but not the corpus identity gate, so the golden kept the old hash.

**Attributed by a control, not by argument:** the freshly emitted `runtime.tsx` with those five lines removed hashes to
the golden's old value (`71546b9d…`) exactly, the same in all three projects.

**Fix:** the three hashes patched by hand, beside ISL-002's own `glow-desk/src/lib/states.ts`. A regenerate would have
folded in a peer's in-flight work (every `README.md`, `utility-desk/src/lib/crypto.ts`, two new fixtures), which stays red
in the same run and is that peer's to regenerate. The patch is recorded in the spec's history comment.

**The lesson for this phase:** an export change owes `tests/hls001-corpus-identity.test.ts`, which the per-feature spec
does not run.

**Second half, found the same session:** `4638de4b1` also added `tests/fixtures/isl011-kit-grid` to the corpus without
adding it to the golden or moving the count literal, so "the corpus is the one the golden was taken over" (51 for 50) and
"no project emits a file the golden does not know about" were red at HEAD too. Fixed additively: its hashes computed in a
fresh worktree at HEAD (the primary's peer ledger edit moves every README there), the literal 50 → 51. In that worktree
the spec reads **4 / 4**; the other 50 projects' hashes all equal the golden. The primary still reads red on a peer's
in-flight work (`pattern-desk`, untracked; every README; `utility-desk`'s `crypto.ts`), theirs to regenerate.
