# P103 — next session

**Written 2026-09-24 (end of s1).**

## Where it stands

All ten build tasks are built, driven and committed on `cline-dev`, one commit each, in this
order: CMG-005 (`c9a028e49`), CMG-004 (`3eaada0b7`), CMG-001 (`917a9994d`), CMG-003
(`17f3ee813`), CMG-007 (`81139f689`), CMG-006 (`ab563776b`), CMG-002 (`e2194769a`), CMG-008
(`c5165a629`), CMG-009 (`b65ec2ed2`), CMG-010 (the commit after it). Every task file has a §6
*Built* section with what each AC measured; every drive is `scripts/devtools/drive-cmg0NN-*.js`;
every spec is `tests-unit/cmg-0NN/`. Shots are in `shots/`. README §3 rows are marked ✅ s1.

Left: **CMG-011 — Richard drives the touch points** (his). Nothing in this phase is a session's build
job any more.

**s2 (2026-09-24):** ✅ **RC-8 ruled — *"Wait for my drive."*** 0.3.0 waits on CMG-011 AC1 (recorded on
P100's status line); a NOT WORTHY row is fixed before the tag, so his findings ARE build jobs.
The drive copy is `CMG-011 Richard Drive` (fresh `cp -R` of *Landing page test V2*, 142 overrides,
orange `--primary`), first in the launcher list; s2 launched the editor for him on it.

## Do this

1. If Richard has driven (CMG-011): read what he found, file each finding as a task the way README
   §2 did, and build in the order the findings suggest. Re-measure every file:line pointer before
   relying on it.
2. If he has not: the phase waits. Do not re-drive it for him; the drives already pass
   (CMG-009 24/24, CMG-010 18/18, the rest in their §6). Take the next phase from MEMORY.md.
3. Drive on COPIES only: `CMG Drive Looks J` and `K` (← `CMP-001 Composer Drive`) are fresh from
   the last two drives and can be reused for a re-drive; `CMG Drive Tokens` (← `CMP-007 Richard
   Drive.before-0.3`) was reset by the CMG-004 drive — copy it again if you need the 46 real
   changes. 🔴 Never swap a copy's files while the editor holds it open: the watcher adopts them.
4. Commit through a temporary index with compare-and-swap (the memory recipe): the real index on
   this checkout is stale (hundreds of staged deletions that are not this phase's).

## What Richard should know before his drive (CMG-011)

- **A token in a field is a chip** (CMG-009). Name where it fits, else the resolved value; the
  full name and value in the tooltip; ✕ detaches (one undo step). On a padding side at 328px it
  reads `16px`, not `space-4` — §3.2's rule; whether that is enough is his read.
- **✎ and ⇱ on every chip** (CMG-010): ✎ opens the composer (four types) or a small row editor
  (the other nine) beside the field, saying *Changes --x everywhere (N places)*; ⇱ is *Show in
  Styles*. On a padding side they sit in the chip's hover overlay with ✕.
- **Used by** on every token row in Styles, Colours included: nodes go to the node, a Look is a
  rule, a token built from this one reveals its row. The composer header counts too.
- **Every field says when it leaves its Look** (CMG-008), including alignment, padding, corners,
  borders and the popout groups; *Put back* per field and *Put back all*.
- The padding glyph is the token button: `{·}` shows on hover.

## Traps met this session

- `resolveTokenText` is asked on every render; an unguarded `require('@noodl-models/projectmodel')`
  reddened 26 `rel-014` arms (`bugtracker.ts:246`). Anything the property-editor rows touch on
  the plain-Node path must `require` singletons at press time and guard reads.
- A chip that measures its own content-sized box always finds "no room": `display: flex`, never
  `inline-flex`, in a block parent.
- A drive must *open* a wearer list (`data-usage-open`), not toggle it: the Styles panel stays
  mounted between runs.
- Re-selecting the node the panel already shows is a no-op; a drive selects through another node.
- `StyleRow`'s menu reads `document` at render: mock `ContextMenu` in a spec.
- `Page.og:image:width` / `height` (string meta ports) offer the spacing scale by name
  (README §5 candidate).
