# BWF-009 — The test

**Phase:** [132](README.md). **After:** every other BWF task. One session plus Richard's sitting.

## The test

On a fresh copy of Greenhouse (its backend isolated, README rule 5), with no code box opened and no JSON typed:

1. **By Richard, in Studio:**
   - *When a watering is logged, set the plant's last-watered date* (a table change → *Change a record*).
   - *Every morning at 8, find the plants not watered for three days and email me the list* (a time → *Find records*
     with a formula → *Send an email* with the list in it), tested on sample data before it is switched on.
   - *When a form outside posts a new plant, make it* (a webhook → *Create a record*), posted to with curl.
2. **By an agent** (Claude Code through `@nodegx/mcp`, a fresh conversation), the same three briefs in words: the file
   read after. Pass = no cloud function made for any of them, and Studio draws each one with its steps editable.
3. **In the NodeGX editor:** the six workflows open in its Workflows panel; one change made there shows in Studio.

## Grade

- Richard says whether this is "something akin to Bubble's backend workflows" (his bar) and how far from n8n; his
  words recorded verbatim here.
- Each friction he meets is a `P132-*` row, `launch: beta` when it would stop the Beta walk.
- The numbers: code boxes opened (0), JSON typed (0), steps the agent wrote as functions (0), runs that failed and why.
