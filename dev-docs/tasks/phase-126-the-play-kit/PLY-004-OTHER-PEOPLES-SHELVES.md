# PLY-004 — Other people's shelves, confirmed to look good

**Phase:** [126](README.md). **Depends on:** PLY-003's card tool.

## What

*"Maybe also pulling in other open source libraries of 3D models we confirm actually look good."* — Richard

Candidate sources, **each licence to be read from the source on the day, not trusted from this list**: Kenney (the
Gala's s1 confirmed the furniture kit is CC0), Quaternius, Poly Haven (models, textures, sky HDRIs), ambientCG
(textures), Poly Pizza (mixed CC0 and CC-BY, so attribution is per model), KhronosGroup glTF-Sample-Assets (per-asset
licences; mostly test models).

For each pack: record its licence and the URL it was read from, pick the models that cover the common needs (people,
furniture, buildings, nature, vehicles, space, props), render each through `tools/card.mjs` beside one of our
generators under the same light, and keep only what holds up next to it. A pack's file entry is `entry.json` with kind
`file`, its source URL, licence, attribution line (when CC-BY), triangle count and file size, plus the card.
Whether the shelf mirrors the files or `add` fetches them from the source is R3.

## Acceptance

- **AC1.** A table in this file: pack, licence as read (with the date and URL), models taken, models refused and why.
- **AC2.** Every CC-BY entry writes its attribution line into the project's credits on `add`.
- **AC3.** Richard looks at the cards side by side with ours and rules what stays.
- **AC4.** `add` of a file entry gives a working glTF load in the PLY-002 starter (`GLTFLoader` vendored with three.js),
  seen in the drive's screenshot, not only in a log line.
