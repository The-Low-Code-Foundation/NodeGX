# OWN-027 arm T, v2: the section as decisions (v2b-e2b, with v2b-e4b and v2b-lfm3)

**2026-10-28, 14:40–14:52 CET.** `harness.mjs --v2 --tuning tuning3.json`, model by `OWN027_MODEL`. These are v2's
second runs: the first three (`v2-*`) wrote nothing because of two harness defects (rule V9 + the page-skip fix;
`../v2-e2b/ledger.json`).

**v2, Richard's ruling (2026-10-28):** "for the hero section, what bits are needed", chosen from a list, then
"as many sub-calls as it takes to make each part, and then put them together". The model never draws a tree. It
picks bits (headline, sub-line, photo, list of items …), answers one decision per follow-up (centred or left; photo
beside, above or below; how many items; which bits per item; grid or one column; the look of the first item), and
writes each text. The script makes one node per bit from the node specs and assembles them (V1–V9 in
`questions.md`).

| | v2b-e2b (E2B) | v2b-e4b (E4B) | v2b-lfm3 (LFM3 1.7B) |
|---|---|---|---|
| Wall clock | **2.8 min** | 6.1 min | 2.1 min |
| Model calls / answered by a rule | 97 / 125 | 122 / 168 | 91 / 116 |
| Script defaults (repairs) | **0** | 0 | 0 |
| Validator errors / warnings | **0 / 0** | 0 / 1 | 0 / 6 (`text-cannot-wrap`) |
| Largest prompt (budget 600) | **369** | 369 | 372 |
| Unparseable answers | 0 | 0 | 0 |
| Nodes / sections | 99 / 7 | 128 / 7 | 92 / 7 |
| render_report | clean (1 observation) | 2 warnings | 2 warnings |
| Phone overflow | no | no | no |

**What v2 changed:** every miss that came from "draw the section" is gone. There are no repairs, no children under
a Text, no empty cards and no edge-to-edge text. The prompts are a third smaller than v1's largest. E2B builds a page
with a split hero, a three-up feature grid, numbered step cards, a gallery band, a testimonial, a closing CTA band
and a footer.

**What is still wrong:**
- **E2B:** the hero headline wraps to five lines in its half column (V11 now). The same dog appears five times
  (`P112-OWN027-ONEDOG`). A step-section button reads "Step 1: Apply online. Step 2". Two step titles say the same
  thing. The footer is crowded (three "Contact" columns).
- **E4B:** the gallery's `imageGround` band holds a headline, a sub-line, four cards and a photo. Its fixed 520 px
  height spills upward over the hero (`P112-OWN027-IMAGEGROUNDSPILL`; V10 now).
- **LFM3:** the same spill. The copy takes the brief literally ("Adopt our Blue Puppy Pals!", "a lively blue pup",
  "Adopt my playful, modern puppy today!"), it chose a serif body, and it puts six bits in every section.

**Credible:**
- **E2B:** ⚠️ close. It reads as a designed page, and the misses are a repeated photo and copy slips, not structure.
- **E4B:** ❌ until the spill is fixed.
- **LFM3:** ❌ (its copy).
