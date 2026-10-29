# OWN-027 arm T, run r2: Gemma 4 E2B, tuning 1

**2026-10-28, 13:49–13:52 CET.** Harness: `harness.mjs --run r2 --tuning tuning1.json`. Project:
`~/vscode_projects/NodeGX test projects/own-027-T-r2/`. Ledger: `ledger.json`. Screenshots: `shots/`.

Tuning 1: the enum options are written into each question, roles say what a node is for, and a copy question
for a node with same-type siblings says "item k of n" (see `../../../tuning1.json`).

## Measures

| Measure | r1 | **r2** |
|---|---|---|
| Wall clock | 2.4 min | **2.9 min** |
| Model calls | 73 | **99** |
| Questions answered by a rule | 27 | **22** |
| Retries | 4 | **3** |
| Script defaults | 3 trees repaired | **1 tree repaired** |
| Harness tree rejections | 7 | **4** |
| Validator errors / warnings | 0 / 1 | **0 / 0** |
| Tokens in / out | 16,982 / 3,079 | **23,374 / 3,162** |
| Largest prompt | 543 | **555** (budget 600; 0 over) |
| Unparseable answers | 0 | **0** |
| Sections / nodes | 6 / 39 | **7 / 42** |
| render_report | 4 warnings | **3 warnings**: `elements-overflowing` (desktop 1, phone 5: Columns 438 px in a 390 viewport), `alignment-drift` (testimonials); info `single-column-grid` |
| Console errors | 0 | **0** |

## What changed

The photo is right: the card chose `animal-dog.webp` once the options were in the words. The "how it works" texts no
longer repeat each other, and the copy is on-topic in every section. The FAQ is real questions and answers.

## What is still wrong (stage, question, answer)

| Stage | Where | Answer | Caught by a gate? |
|---|---|---|---|
| 2 | all 7 trees | no `shell` Group in any section | **No.** Filed as `P112-OWN027-NOSHELLGATE`. Text starts at x = 0, and every Image is a 1280 px strip |
| 3 | `s0n1`, `s2n1`, `s3n1`, `s6n1`, `s6n2` `.look` | `displayHeadline` ×5 | **No.** Filed as `P112-OWN027-MANYHEADLINES` |
| 2 | 6 of 7 trees | an Image in a section that has no business holding one (feature cards, how it works, testimonials, CTA) | No. A taste miss: R12 makes every Image the same dog |
| 3 | `s3n2.look` | `columnsTwoUp` in a full-bleed band | Yes, as a symptom: `elements-overflowing` |

## The credible checklist

| Item | Read |
|---|---|
| The headline says what the page is for | ⚠️ "Meet Your New Best Friend Today!", which is about a dog but says nothing of adoption |
| One palette, one type pairing | ✅ |
| A sensible section order | ✅ hero → features → how it works → gallery → testimonials → FAQ → CTA |
| A call to action exists | ✅ but it's six buttons, with no one action standing out |
| Nothing overflows at phone width | ❌ 5 elements clipped |
| No console errors | ✅ |
| Would I put my name on it? | ❌ |

Tuning 2 (`../../../tuning2.json`) answers the two uncaught structure misses.
