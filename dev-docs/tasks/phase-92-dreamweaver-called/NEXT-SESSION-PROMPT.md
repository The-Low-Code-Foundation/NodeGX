# Phase 92 — next session

**Written 2026-09-15 at the end of s1 (CHR-001).** HEAD `e740727f8`, branch `cline-dev`.

## The board, from the task files

| id | state |
|---|---|
| CHR-001 the before picture | 🟡 **captured, uncommitted**: `verdicts/CHR-001/2026-09-15/`, §6 of the task file |
| CHR-002 … CHR-011 | ⬜ none built |
| Rulings R1–R8 | **proposed, not ruled** (README §4) |

## First job

1. **Ask Richard two things, together, in one message:**
   - **Commit CHR-001?** The PNGs are gitignored by `.gitignore:265` and need `git add -f`
     (14 files, 7.4 MB). The rest of the phase directory is untracked from scoping too.
   - **R1, the type scale** (11 / 12 / 13 / 15 / 20 + 26), because CHR-002 is blocked on it. Put the
     §6.2 finding in front of him: the audit's "10 sizes" on Templates counts off-screen elements.
     Visible 8, text-bearing 6. CHR-002 has to say which count it ratchets.
   - Also put CHR-001 §6.4 **C3** in front of him: the Community tiles show internal KPIs to a guest,
     and no CHR task owns that.
2. **Then build**, in this order, whichever is unblocked:
   - **CHR-002** if R1 is ruled.
   - **CHR-003** (radius / shadow / box-sizing / dead fonts): no ruling named. Re-read its rows at HEAD
     first.
   - **CHR-007** (Ports → row descriptors): no ruling, depends only on CHR-001, behaviour-identical,
     pinned by the existing panel specs.

🔴 Do not re-take the before picture. Do not farm §6.4's defects: each has an owner in the CHR table.

## How to re-measure (for any ratchet and for CHR-011)

`verdicts/CHR-001/2026-09-15/capture.js` + `measure.js` are the instrument. Run them unchanged:
fresh `cp -R` fixtures, a seeded `--user-data-dir`, private ports 8674/9333, `ELECTRON_RUN_AS_NODE`
unset. The full recipe is in CHR-001 §6. 🔴 A task that changes chrome needs **its own build**:
the packaged 0.2.4 stood for HEAD only because nothing chrome-side had moved since the tag.

## Traps (details in CHR-001 §6.5)

- A click inside the open node picker **inserts a node and autosaves**. Check the fixture's node count
  after every drive.
- Hovering the Design-mode preview leaves its tooltip up.
- The viewport on this display is 1368×781, not 900.
