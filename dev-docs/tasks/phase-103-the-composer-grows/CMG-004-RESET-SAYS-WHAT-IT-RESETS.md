# CMG-004 — Reset says what it resets

**Opened 2026-09-24** from Richard's drive of P102 (README §2, finding 7).
**Status: ✅ built 2026-09-24 (s1)** — 14 specs green on the 142-row fixture, 19/19 drive arms green on a copy
of his project. §6 has what was built, what each AC measured, and the one thing the drive found that the
task file did not know (the 8). 🔴 The one finding that **lost work**. Recommended for before 0.3.0 (RC-8).

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

## 6. Built (s1, 2026-09-24)

**The count.** `models/StyleTokensModel/TokenChanges.ts` — `tokenChanges(tokens)` → `{ changed, added,
pinned }`. *Changed* is a default-named token whose value differs from the shipped default; *added* is
a token with no default at all; *pinned* is a stored row equal to its default, counted for the record
and never as a change. Nothing in the panel reads `isCustom` for a number any more.

**The writer of the 96, found.** `noodl-mcp/src/tools/styleTools.ts` `upsertTokens` (`:68-84`) marks
every token it is handed `isCustom: true`, whether or not the value differs — so a preset applied
through `set_style_preset`, or a whole vocabulary handed to `set_project_tokens`, pins its map.
**Kept as it is:** a pinned value does not move when a shipped default changes, which is what a
preset wants, and CMP-009's writer is not this task's to reshape. The count simply stops trusting it.

**🔴 The 8 the task file could not explain — explained.** He saw 150, the file held 142. Opening a
pre-0.3 project runs the upgrade (`textStylesToTokens.ts`), which turns its two text styles into
**8 typography tokens with no shipped default** (`--font-…`, `--text-…` of the styles' own names).
The drive on a fresh copy reads `added=8` the moment the project is open. And the old *Reset all*
called `resetAllToDefaults`, which **deletes** every token without a default — so his 8 upgrade
tokens were not "reset", they were removed, and every Text that had been wearing a text style lost
its type. That is the *"wtf did they get replaced with?"*. Now: added tokens are never touched by any
reset, and the confirm says so (*"The 8 tokens you added are kept"*).

**The list** (`components/ChangesSection/`): the strip at the top of the panel, above every section
(inside *Other tokens* it read as *reset the other tokens*). *46 tokens changed from the defaults* is
a button; open, it lists them grouped by section — name on one line, *yours → default* on the next
(one line truncated both to `…` at 328px) — drawn: two swatches for a colour, a lit card for a
shadow, a strip for a gradient, a rounded box for a radius, text for the rest. Each row has *Put
back*, each group *Put back these N…*, the strip *Put all back…*. Every section header in the panel
carries *Reset N* when N > 0 (`SectionReset` on `StylesSection`). The row's ↺ names the default in
its title and is drawn when the value differs, not when the flag is set.

**The model.** `StyleTokensModel.resetTokens(names, { undo })`: skips added tokens and tokens already
at their default, sets the rest, **one undo step** for the lot. `resetAllToDefaults` is no longer
called by the panel (kept for its spec).

**The confirm** (`resetConfirm.ts` → `PopupLayer.showConfirmModal`): anything that resets more than
one token. *"Put 46 tokens back to their defaults? --primary goes from ■ #c2410c to ■ #2563eb, and
--primary-hover goes from ■ #9a3412 to ■ #1d4ed8, and 44 more. The 8 tokens you added are kept. You
can undo this until you close the project."* Colours first (`mostVisibleChanges`), every name and
value HTML-escaped. One token never asks: the row it sits on is the thing it changes.

**§4 measured** (`scripts/devtools/drive-cmg004-reset.js` on *CMG Drive Tokens* ← *CMP-007 Richard
Drive.before-0.3*; specs `tests-unit/cmg-004/token-changes.test.ts` on the same file's 142 rows):

| AC | reading |
|---|---|
| 1 | strip `data-token-changes="46"`, text *46 tokens changed from the defaults*; spec: 142 stored, 96 pinned, 46 changed, 0 added (the file has no upgrade tokens; the open editor has 8) |
| 2 | 46 `[data-token-change]` rows in six groups (colours 9 · type 16 · spacing 7 · borders 6 · effects 7 · motion 1); `--primary` row reads `#c2410c → #2563eb`, swatches `rgb(194, 65, 12)` then `rgb(37, 99, 235)`. Shot `shots/cmg004-ac2-the-list.png` |
| 3 | *Put back* on `--primary`: model `#2563eb`, 45 still differ, `UndoQueue` location 0→1, the preview's `:root --primary` `#c2410c → #2563eb`; one `undo()` → orange, 46, preview orange |
| 4 | Effects header reads *Reset 7*; after confirm the 7 (`--shadow-sm…-2xl`, `-inner`, `--gradient-scrim`) are at default, the 9 colour changes untouched, 39 remain; one undo → 46 |
| 5 | both multi-token resets open `.confirm-modal` with the sentence above; **Cancel: `getMetaData('designTokens')` identical and the project file's bytes identical** (baseline read after the previous autosave settled) |
| 6 | with `--space-huge` added: the confirm says *The 9 tokens you added are kept*; after *Put all back* 0 changed, `--space-huge` and the 8 upgrade tokens still there, strip *Every token is at its default, plus 9 you added.*; undo → 46 with all 9 kept |
| 7 | *Put back* on `--primary`, 3 s: the file on disk stores 149 rows and no `--primary` (a default is not stored); route to Projects, reopen the copy: `--primary` `#2563eb`, 45 changed. Saved, not only applied |

**Left as candidates (README §5):** stop *writing* pinned defaults from the MCP; "restore my 46"
for the drive copy that lost them (§5 above still stands — a file copy of `metadata.designTokens`,
only if he asks).
