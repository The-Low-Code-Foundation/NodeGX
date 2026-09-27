# HLT-023 — the page drive, 2026-09-23 (from the DBT stream, its TASK-L171)

**Met.** The Digital Bricks Training template's four data pages now read their data from a backend
(`course`, `lesson`, `learnerProgramme`, `roster`), and every page drive in L171 ran against a
backend whose `ops.json` is the one it wrote on first start — `rateLimit.policies.data` 1200/min,
burst 400, unchanged. No limit was raised at any point.

- Every page load across the session — baselines, audits at two widths, both themes of the gate,
  the click-through, the sign-in drives — answered its function calls 200 (or 403 where a learner
  asked a staff function, which is the security file working). **No `data` 429 anywhere**, on
  SQLite or on PostgreSQL. The only 429s in the session were the magic-link send limit, a different
  policy, doing its job.
- In the last two backend logs alone (the rest were rotated by restarts): `course` 10, `lesson` 18,
  `learnerProgramme` 20, `roster` 13 calls answered 200.

**Not measured here:** a load test. HLT-023's own AC5 (100 alternating loads with the operator's
reads in the middle) is the function-layer proof; this is the pages reaching it the way a person does.
