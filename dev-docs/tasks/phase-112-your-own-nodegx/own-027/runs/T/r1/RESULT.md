# OWN-027 arm T, run r1: Gemma 4 E2B, untuned

**2026-10-28, 13:45–13:48 CET.** Builder: `gemma4:e2b-it-qat` through `harness.mjs` (stdio MCP client against
`bin/noodl-mcp.js`). Project: `~/vscode_projects/NodeGX test projects/own-027-T-r1/`. Ledger: `ledger.json`.
Screenshots: `shots/`. Opus did not touch the page.

## Measures (from the ledger)

| Measure | Value |
|---|---|
| Wall clock | 2.4 min |
| Model calls | 73 (stage 0: 5, stage 1: 1, stage 2: 10, stage 3: 57) |
| Questions not asked (a rule answered them) | 27 |
| Retries | 4 (tree re-asks) |
| Script defaults | 3: three section trees repaired by dropping items (children under a Text/Image, depth 4–5, a 7th child) |
| Harness tree rejections | 7 |
| Validator errors / warnings | 0 / 1 (`columns-child-keeps-own-width`: a contentSize Button in a Columns) |
| Tokens in / out | 16,982 / 3,079; largest prompt 543 (budget 600, 0 over) |
| Unparseable answers | 0 |
| Page | 6 sections, 39 nodes |
| render_report | 0 errors, 4 warnings: `elements-overflowing` (desktop: Columns containers 1,292–1,328 px in a 1,280 viewport; phone: 19 elements), `empty-decorated-box` ×3 |

## What it looks like

It isn't credible. A man's face is the hero photo, a gallery of six copies of the same face, a full-bleed band and the
closing art. The "how it works" texts each say all three steps. The text runs edge to edge with no container, and two
display-size headlines compete. The blue palette and the CTA bands are right, because the card and the rules carried
them.

## Where it failed, by stage

| Stage | Question | Answer | Why |
|---|---|---|---|
| 0 | `card.photo` | `avatar-1.webp` | **Harness defect.** The 44 file names were in the Ollama `format` schema only, which constrains the output but is never shown to the model. Gemma chose from a list it never read. Every Image on the page inherits this one answer (R12). |
| 2 | every tree | roles = type names ("Group", "Text") | The prompt asked for "a one-line role" without saying what a role is. Every later question then had no context. |
| 2 | 3 of 6 trees | children under Text/Image, depth 5, 7 children | Each was caught by the harness check, re-asked once, then repaired by the script. |
| 2 | every tree | no `shell` inside any band | The vocabulary's prose says "a band always holds exactly one shell". **No gate catches a band without a shell**, so the text runs edge to edge, and a Columns in a full-bleed band overflows by its gutter. Structure miss, uncaught. |
| 3 | `s1n3.look`, `s5n1.look` | `displayHeadline` twice | The vocabulary says "exactly ONE per page". **Not gated.** Taste miss, uncaught. |
| 3 | `s3n1/3/5.text` | each writes "Step 1… Step 2… Step 3…" | Each copy call sees only the card (§3 rule 3), so three siblings each answered the whole section. |

## The credible checklist

| Item | Read |
|---|---|
| The headline says what the page is for | ✅ "Adopt a puppy today and find your perfect furry companion" |
| One palette, one type pairing | ✅ blue, Inter |
| A sensible section order | ✅ hero → features → gallery → how it works → testimonials → CTA |
| A call to action exists | ✅ "Adopt Your Puppy Now", "Adopt Now" |
| Nothing overflows at phone width | ❌ render_report: 19 elements wider than 390 px, clipped |
| No console errors | ✅ |
| Would I put my name on it? | ❌ |

Tuning 1 (`../../../tuning1.json`) takes the three prompt-side failures from this table; r2 is the re-run.
