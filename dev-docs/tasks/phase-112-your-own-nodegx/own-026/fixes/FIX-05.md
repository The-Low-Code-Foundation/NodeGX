# FIX-05 — a row that names an owner must not be the caller's word

**Written 2026-10-23 ~15:20 CEST by the lab session (`opennoodl-8c`). Richard ruled at ~17:20: run it now, in parallel,
like FIX-04.** The test-2 NodeGX chain stays on FIX-03 to the end.

## 🔴 As for FIX-04: do NOT write `KIT`, do NOT touch `HOLD-nodegx`

Pack the kit on **FIX-03's commit (`cb7e0d6e4`) plus FIX-05 only** (not FIX-04, and not the P125 commits since), so
the lab measures this fix alone, into `/Users/Shared/nodegx-lab/kits/FIX-05-<short commit>/`. Then send the lab
(`opennoodl-8c`) one short message. The lab re-runs change 5 from the main chain's `t2-nodegx-c04` on it, twice, in
`own026-fix05/`. It wins if C5.3 and T7 pass and nothing else is lost.
## What happened (LEARNINGS #8)

t2-nodegx-c05 (a teacher invited by email) built a `teacherinvite` row created from the page, with a client-supplied
`familyId`, and a cloud function that returns every child whose `familyId` an invite for the caller's address
names. Replaying another family's invite with one's own address gives that family's children: to a teacher (C5.3)
and to any parent (T7, a regression). Its comment says the rows are server truth: *"No value arrives from the
caller, so there is nothing to forge."* The plain-code arm took the family from the session.
Evidence: `/Users/Shared/nodegx-lab/own026/t2-nodegx-c05/` (the function: `components/__cloud__/Cloud Functions/Teacher
Children/nodes.json`; rules: `home/.noodl/backends/*/security.json`; rows: `data/local.db`, `teacherinvite` with its ACL)
and the grade `own026-grades/t2-nodegx-c05/grade.json` (C5.3, T7: forged-T1.png, forged-famB.png).

## Candidates (measure first; generic, never this app's words)

- **A. The short way is the safe way:** a field that names an owner or a group (`familyId`, `ownerId`, …) can be set
  from the caller on create, by the server (a "the caller's" value in Create Record, or a rule that stamps it), so the
  page never sends it. Then the guidance and examples show that first for "invite someone to see my things".
- **B. Say it where it's decided:** a cloud function that filters rows by a field a client can write, with no check
  against the row's creator, answers with an `info` at the write (FIX-03 C's shape), naming A.
- **C. Check the rule model's reach:** whether "a row may name only the caller's own family" is expressible today
  (path rules, ONT-004/014). If so, an example; if not, the gap.

## Not now

- T6, F6: graded both ways (LEARNINGS #5, #7).
