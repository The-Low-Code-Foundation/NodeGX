# CMP-006 — the round-trip census, readout

**Measured 2026-09-24** against the codecs in `packages/nodegx-project-contract/token-codecs/`.
Corpora (1)–(3) are the spec `packages/noodl-editor/tests-unit/cmp-006/round-trip-census.test.ts`
(runs in `test:main`, prints the tables below). Corpus (4) is
`scripts/devtools/cmp006-project-census.ts`, run over this machine:

```
npx ts-node -P scripts/tsconfig.json scripts/devtools/cmp006-project-census.ts
```

**Rewrite is 0 in every corpus.** Every value either opens visually (with or without a kept
literal) or opens as text; nothing is rewritten.

## (1) The defaults — 28 values

| type | seen | visual | visual, kept literal | text | rewrite |
|---|---|---|---|---|---|
| shadow | 7 | 7 | 0 | 0 | 0 |
| gradient | 5 | 5 | 0 | 0 | 0 |
| animation-easing | 5 | 5 | 0 | 0 | 0 |
| animation-duration | 8 | 8 | 0 | 0 | 0 |
| typography-family | 3 | 3 | 0 | 0 | 0 |

## (2) The shipped Looks and the composer's own presets — text = 0 (AC3)

The five Looks (`models/StylePresets/presets/*.ts`; Modern is the defaults and overrides nothing):

| type | seen | visual | visual, kept literal | text | rewrite |
|---|---|---|---|---|---|
| shadow | 17 | 13 | **4** | 0 | 0 |
| typography-family | 4 | 4 | 0 | 0 | 0 |

The 4 kept literals are Playful's purple shadows, `rgb(139 92 246 / 0.15)` and friends: visual
with a *Custom* chip (RC-6a), written back byte-identical. No Look overrides a gradient, easing or
duration.

The composer's own presets (8 shadows, 7 gradients, 6 easings, 5 durations, 3 font stacks):
**29 seen, 29 visual, 0 kept literal, 0 text, 0 rewrite.**

The MCP writes tokens only through `set_style_preset` (the Looks above) and `set_project_tokens`
(whatever the agent spells; CMP-009's validator judges that). No composition or recipe writes a
token *value*; they reference tokens by name.

## (3) The shipped templates — text = 0 (AC3)

`landing-pages.content.json` carries a `designTokens` block of colours and radii and **no** token
of a composer type (its `--shadow-*` names are `var()` references on nodes, not overrides).
`site-builder.content.json` carries no token block. Site Builder's three theme presets
(`siteTheme.ts`) write `--font-serif` and `--font-sans`:

| type | seen | visual | visual, kept literal | text | rewrite |
|---|---|---|---|---|---|
| typography-family | 6 | 6 | 0 | 0 | 0 |

## (4) Every NodeGX-format project on this machine

`find ~ -name nodegx.project.json`, excluding `node_modules`, `.git` and `worktrees`:
**330 projects found, 58 carry a custom token of a composer type.** (P100 UPG-001 counted 217
on 2026-09-23 with a narrower root; this run walks the whole home directory.)

| type | seen | visual | visual, kept literal | text | rewrite |
|---|---|---|---|---|---|
| shadow | 172 | 126 | 36 | **10** | 0 |
| gradient | 20 | 16 | 4 | 0 | 0 |
| animation-easing | 20 | 20 | 0 | 0 | 0 |
| animation-duration | 32 | 32 | 0 | 0 | 0 |
| typography-family | 87 | 87 | 0 | 0 | 0 |

**Legacy format** (`project.json`): 2,437 files found, **0** carry a `designTokens` block with a
composer-type token. Tokens arrived with the NodeGX format; the legacy set has nothing for the
codecs to read.

### The text values (AC4: seen 3+ times → taught, or the reason written here)

One value, ten projects:

| value | type | projects | reason |
|---|---|---|---|
| `#29201933` | shadow | 10 | **Not a shadow.** A bare colour with no lengths is not a `box-shadow` value; the browser drops the declaration. All ten are drive fixtures under *NodeGX test projects* (`cn019-drive`, `cn027-drive`, `cn029-drive`, `fix003-drive`, `fix007-c4-drive`, `fix016-*-drive`, `leg003-drive`, `phase55-s8-kimi-k3-rerun`, `STY-005 Panel Drive`), written by an earlier session's drive. Text mode with *Replace with a preset* is the right outcome, and `validate_project` names it (`token-not-composable`). Not taught: there is no shape to teach. |

The 36 kept literals on real projects are hand-written colours inside otherwise readable layers
(`rgba(0,0,0,.1)`, hex, and Playful's purple): every slider on those layers is live and the colour
is written back byte-identical.

## The mutants (AC2)

Both mutants the spec runs redden it: an `encode` that writes `0px` for `0` puts the defaults in
the rewrite column; a colour reader that tidies `rgba(0,0,0,.1)` to `rgba(0, 0, 0, 0.1)` puts a
hand-written shadow there.

## One codec module (AC5)

`validation/tokenComposable.ts` (the `validate_project` check), the Styles panel's row and the
census all import `@nodegx/project-contract/token-codecs`; the spec asserts identity of the
functions, not the path.
