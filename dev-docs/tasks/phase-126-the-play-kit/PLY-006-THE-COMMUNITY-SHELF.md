# PLY-006 — The community shelf

**Phase:** [126](README.md). **Depends on:** PLY-003, PLY-004, R3, R4.

## What

*"Perhaps users of the npm package can opt in to having their best models shared with whatever open source library we
create, so the community also contribute to it (with moderator review I suppose)."* — Richard

- **Opt-in, per entry, never automatic.** `npx @nodegx/play share <path>` packages one generator or file with its
  render card and opens a pull request on the shelf repo (or prints the steps when the person has no GitHub account).
  Nothing leaves the person's machine without that command.
- **What a submission carries:** the licence grant (CC0, or CC-BY with the name to credit), provenance (made by hand, or
  made with a named AI tool whose terms allow it to be shared under that licence), the card made by `tools/card.mjs`,
  triangle count and size.
- **Moderator review is PR review.** The checklist: the licence grant is present and the provenance is plausible; no
  brand, character or IP lookalike; the card looks good beside the shelf's entries under the same light; within the
  size budget; runs alone in the empty page (PLY-003 AC2). R4 names who moderates.
- **Credit.** The shelf's catalog lists contributors; a CC-BY entry carries its line into every project that adds it
  (PLY-004 AC2).

## Acceptance

- **AC1.** A submission made from a fresh project reaches the shelf repo as a PR with every field filled.
- **AC2.** A submission with no licence grant is refused by `share` before anything is sent, and says so in plain words.
- **AC3.** The moderation checklist is written in the shelf repo's CONTRIBUTING file, and one real submission (ours, made
  as a stranger) has been through it end to end.
