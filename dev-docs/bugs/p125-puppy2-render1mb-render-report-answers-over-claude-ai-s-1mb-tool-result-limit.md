---
id: P125-PUPPY2-RENDER1MB
title: In Claude Desktop, render_report's answer is refused as "Tool result is too large. Maximum size is 1MB" — three full-page screenshots go inline as base64 with no size budget
status: fixed
severity: medium
area: mcp / render_report (`packages/noodl-mcp/src/tools/renderTools.ts`, inline screenshots; `render.ts` `--inline-screenshots --scale 0.4`)
found: P125, Richard's Muddy Paws run in Claude Desktop (Sonnet 5.5), 2026-10-24
evidence: "claude.ai-web.log: '400 POST …/tool_result invalid_request_error' at 12:10:45, 12:10:52, 12:10:59, each 5 s after a nodegx:render_report call (12:10:40, 12:10:47, 12:10:54); the earlier render_report calls (12:10:17, 12:10:31) have none. Richard saw 'Tool result is too large. Maximum size is 1MB'. Sizes NOT measured: render-report.js run by hand (node and ELECTRON_RUN_AS_NODE) printed nothing."
regression: packages/noodl-mcp/tests/p125Render1mb.test.ts "6/6, real Chrome; its control: the same page with no budget is a PNG over its share"
---

Claude.ai refuses a tool result over 1 MB. By default `render_report` returns the JSON report plus one **full-page**
screenshot per viewport (`desktop,768x1024,phone`, three since R39) as base64 images, at scale 0.4. Nothing checks
their total. A long landing page (Muddy Paws: nav, hero, values, six puppy cards, steps, call-to-action, footer)
crosses the limit at some point in the run. The agent retried three times and then went on without its own evidence. Its
closing answer reads "I looked at the top of the page. For the lower sections I relied on measurements".

`--screenshots-to-files` (files under `.previews/render`) exists, but a Desktop chat cannot look at a file. The answer
has to fit.

**Fix direction:** a byte budget for the inline images (for example ~700 KB, with the JSON counted). Encode as JPEG
when over it, then lower the scale or cut a full page into its first screens until it fits, and say what was cut in
the text before the image ("phone: the first 3 screens of 9"). A gate: a page tall enough to cross 1 MB at today's
settings, whose answer stays under the budget.

## Fixed (2026-10-24)

The harness takes a budget (`measure-from-disk.js --image-budget`, `renderReport({ imageBudget })`: base64 characters
for all the subject pictures, shared between the viewports), and `render_report` passes `INLINE_IMAGE_BUDGET` (600,000)
whenever its pictures go inline. A picture over its share is retaken as a JPEG (quality 70); still over, a full page is
cut to its first whole screens until it fits, then quality 40. The picture carries `fit`, and the line before it in the
answer says what it covers: "full page, as a JPEG to fit this answer", or "only the first 3 screens of 9, cut to fit
this answer — the rest is measured in the report but not pictured; out_dir writes every page whole".

Measured by hand on copies, three viewports at scale 0.4 (the answer's JSON plus its images):

| project | before | after |
|---|---|---|
| Muddy Paws (the run that was refused) | 1,514,102 | 266,044 (three JPEGs, every page whole) |
| Puppy Rerun S12 | 1,048,018 | 225,498 (the same) |

Reaches Claude Desktop with the next `noodl-mcp` dist and the next `@nodegx/mcp` (the `.mcpb` pins 0.2.6 from npm).
