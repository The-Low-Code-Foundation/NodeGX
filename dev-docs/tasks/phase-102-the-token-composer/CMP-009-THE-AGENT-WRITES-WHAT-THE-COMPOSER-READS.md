# CMP-009 — The agent writes what the composer reads

**Opened 2026-09-24.** **Status: ✅ BUILT s1 (2026-09-24): `validation/tokenComposable.ts` → `token-not-composable` (warning, reason + suggested spelling), wired into `validate_project` (MCP spec `tests/cmp009TokenComposable.test.ts`: the em shadow named, fresh + four Looks silent); COMPOSABLE SPELLINGS line in `get_style_vocabulary` with a pointer on `set_project_tokens`. Budgets measured: prompt **4,324 / 4,400**, surface **8,255 / 8,280** — 76 and 25 to spare. Codec identity asserted (AC4). AC3's MCP-then-editor drive is CMP-007's.** Depends on CMP-002…005 (the codecs). Ruling:
RC-6 (README §4).

## 1. The person sentence

> **Someone has Claude build their app through the MCP, then opens Styles and every shadow,
> gradient, easing, duration and font it chose opens in the composer, editable by sliding — and
> when one does not, `validate_project` already said so and why.**

Richard's worry 3 on 2026-09-24: *"I'm assuming styles built by the MCP are going to be
compatible with this system."* The answer is *yes by design, no by the first spec*: the MCP
writes plain CSS strings with no validation ([`styleTools.ts:177`](../../../packages/noodl-mcp/src/tools/styleTools.ts#L177)),
the composer reads plain CSS strings, and nothing today says they agree on a spelling.

## 2. What to build

1. **One sentence of grammar** on `set_project_tokens`' description, per type, in the shape the
   composer opens visually. Written for a model that will copy it: e.g. *shadows as
   `<x> <y> <blur> [spread] rgb(0 0 0 / <a>)` or `var(--colour)`, one or more layers; gradients
   as `linear-gradient(<deg>deg | to <side>, <colour> [<pos>%], …)`; easing as `linear` or
   `cubic-bezier(a, b, c, d)`; durations in `ms`; font families as a lead font then a fallback
   tail*. 🔴 The resident tool surface has a **token budget** with almost no headroom
   ([[mcp-tool-surface-has-an-8200-token-budget-gate]]); measure `toolDisclosure` before and after,
   and if the sentence does not fit, put it behind `get_style_vocabulary` (which agents read
   first anyway) and leave a five-word pointer on the write tool.
2. **A `validate_project` check**, `token-not-composable`, warning-level: for every custom token
   of the five composer types, run the type's codec; report `text` outcomes with the token name,
   the value and the reason the codec gave, and a suggested spelling when one is one edit away.
   The check imports the **same codec module** the editor and CMP-006 use (CMP-001 §2 puts it
   where `noodl-mcp` can import it without the editor). 🔴 `noodl-mcp` runs from `dist/`
   ([[a-stale-mcp-dist-hides-a-merged-vocabulary-field]]); rebuild before measuring.
3. **The doctrine and the recipes.** Wherever the editor's own AI loop or a recipe teaches a token
   spelling (`prompts/design.ts`, the compositions), it teaches the composable one. Grep, count,
   fix at the source.

Not here: rewriting the Playful Look (RC-6a keeps its purple; a strength on a project colour is
P103), and any change to what `set_project_tokens` *accepts*. An agent may still write anything;
the composer keeps or refuses it honestly, and the validator names it.

## 3. Acceptance criteria

1. `set_project_tokens` (or the vocabulary, per §2.1) carries the grammar, and `toolDisclosure`
   stays under the budget, both numbers printed.
2. `validate_project` on a project with `--shadow-md: 0 0.5em 1em #000` reports
   `token-not-composable` naming the token, the value, *"lengths must be px"*, and nothing else
   new; on a fresh project, on each of the four Looks, and on every shipped template it reports
   **none** (CMP-006's corpus 2 and 3 at text = 0, read through the validator this time).
3. A drive through the MCP: `create_project`, `set_style_preset('playful')`,
   `set_project_tokens` with a gradient written the way §2.1 says, then open the project in the
   editor: every token of the five types opens visually (shot of each row's words).
4. The codec module has exactly **one** import path from `noodl-mcp`, the census and the editor
   (a spec that resolves the three and compares).
