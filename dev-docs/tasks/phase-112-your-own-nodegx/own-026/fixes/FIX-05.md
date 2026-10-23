# FIX-05 — a row that names an owner must not be the caller's word (draft; after the test-2 chain)

**Written 2026-10-23 ~15:20 CEST by the lab session (`opennoodl-8c`). Not started; no hold.** Richard ruled the test-2
NodeGX chain stays on FIX-03, and FIX-04 (thinning) runs in parallel. This waits for his word.

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
