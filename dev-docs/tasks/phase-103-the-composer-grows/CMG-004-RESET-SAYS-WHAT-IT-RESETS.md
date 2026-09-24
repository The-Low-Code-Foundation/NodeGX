# CMG-004 — Reset says what it resets

**Opened 2026-09-24** from Richard's drive of P102 (README §2, finding 7).
**Status: 📋 ready.** 🔴 The one finding that **lost work**. Recommended for before 0.3.0 (RC-8).

## 1. The person sentence

> **Someone who sees "N tokens changed" can see which ones and what each would go back to, can put
> back one token or one group, and is never one click away from losing their whole brand without
> being told first.**

## 2. What happened, measured

*"Other tokens said '150 tokens overriding defaults' and I could click 'reset all' which I did and
they all just disappeared. I didn't even know what the 150 tokens were, and now they're gone and
wtf did they get replaced with? What do I do now??"*

**The code.** [`TokensSection.tsx:93-117`](../../../packages/noodl-editor/src/editor/src/views/panels/StylesPanel/components/TokensSection/TokensSection.tsx#L93-L117):
*"{n} tokens overriding defaults, across all groups"* and a **Reset all** button. The count is
`designTokens.filter(t => t.isCustom)` (`:74`). The button calls
[`resetAllToDefaults({ undo: true })`](../../../packages/noodl-editor/src/editor/src/models/StyleTokensModel/StyleTokensModel.ts#L248-L268),
which rebuilds from defaults and clears the store. That removes **every** override and every
custom token in **every** group, colours included. It sits inside *Other tokens*, so it looks
like it resets the other tokens. No confirm. One undo step, which dies when the editor closes.

**His project.** *Landing page test V2*, compared against `DEFAULT_TOKENS` (193) in
`nodegx-project-contract/tokens.ts`:

| | count |
|---|---|
| overrides stored in `metadata.designTokens.customTokens` | **142** |
| … whose value **equals the default** | **96** |
| … that actually differ | **46** |
| … that are not a default name at all | 0 |

The 46 were his brand: `--primary` `#c2410c` (orange) and its hover and ring, slate-tinted
shadows (`rgb(15 23 42 / …)` for `rgb(0 0 0 / …)`), `rem` type sizes, the display clamps, the
`--space-*` aliases as literal px, radii one step smaller, a gentler `--ease-bounce`, and system
font tails. After Reset they went back to defaults: **the orange brand turned blue**
(`#2563eb`). The drive copy was saved afterwards with no `designTokens` at all. (He saw 150, not
142. The other eight are probably tokens made during the drive; the saved file can't tell us.)

**Why 96 of 142 equal the default.** Something wrote the whole set out, not only the changes: a
template, a Look, or an older editor. Find the writer. The count and the reset both treat
*"stored"* as *"changed"*, and 2 out of 3 stored rows are not changes.

## 3. What to build

1. **Count what differs, not what is stored.** *"46 tokens changed from the defaults"*. A stored
   value equal to its default is not a change and is not counted. Decide whether to also stop
   **writing** them (find the writer first; a template may rely on pinning a value so a future
   default change does not move it. If so, say so here and keep them, but still don't count
   them).
2. **Show them.** The count is a link that lists the changed tokens: name, *yours* → *default*,
   drawn (a swatch, a shadow card, a size), grouped by section. This is the answer to *"I didn't
   even know what the 150 tokens were."*
3. **Reset per token and per group.** Each changed row gets *Reset to default* (showing the
   default it goes to). Each section header gets *Reset this section (N)*. The whole-project reset,
   if it stays, moves out of any one section to the top of the list in (2), because it is about
   all of them.
4. 🔴 **Confirm anything that resets more than one token**, in words, before acting: *"Put 46
   tokens back to their defaults? Your primary colour goes from ■ orange to ■ blue, and 45 more.
   You can undo this until you close the project."* Name the most visible one or two (colours
   first), and the count.
5. **Custom tokens are not "reset".** A token you **added** (CMG-002) has no default. Reset-all as
   written deletes them. Either leave added tokens alone and say so, or list them separately as
   *"and delete 3 tokens you added"*. Never fold them silently into *reset*.

## 4. Acceptance criteria

1. On a copy of *Landing page test V2* (from `CMP-007 Richard Drive.before-0.3`, which still holds
   the 142): the count reads **46**, not 142. Spec on the counting function against that file's
   token list as a fixture.
2. The list in (2) shows 46 rows, and `--primary` shows orange → blue.
3. Resetting `--primary` alone changes one token, one undo step, and the canvas goes blue while
   the other 45 stay.
4. *Reset this section* on Effects changes the 6 shadows and 1 gradient that differ (`--shadow-sm` … `-2xl`, `-inner`, `--gradient-scrim`), and nothing
   in Colours.
5. The confirm appears for every multi-token reset, and Cancel writes nothing (compare the file's
   bytes before and after).
6. A token added with CMG-002 survives *reset all* or is named in the confirm.
7. 🔴 The saved project after a reset still opens with the right colours after an editor restart:
   the reset is **saved**, not only applied.

## 5. For Richard, now

His drive copy lost the 46. They are still in *Landing page test V2* (untouched since 11 Sep) and
in `CMP-007 Richard Drive.before-0.3`. Restoring the drive copy from either is a file copy of
`metadata.designTokens` in `nodegx.project.json`; do it only if he asks.
