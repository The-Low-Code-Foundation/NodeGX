---
id: BETA-S9-BUTTONSHADOW
title: A Button dropped from the picker never wears the shadow its look names, while an agent's Button, taught by the style vocabulary, does — the two doors build different Buttons
status: fixed
commit: c60cb1d53
severity: low
area: editor / element configs (`ElementConfigs/configs/ButtonConfig.ts` variants `primary`, `secondary`, `destructive` `boxShadow: 'var(--shadow-sm)'`); `StyleTokensModel/StyleVocabulary.ts` (turns `boxShadow` into `boxShadowEnabled: 'true'`)
kit: editor-suite
regression: packages/noodl-editor/tests/models/PickerLookValidates.test.ts "the picker drops a Button with its own shadow port on, a real true"
found: the Beta sweep s9, 2026-10-25, fixing P112-S7-TEXTDEFAULTS (diffing the vocabulary before and after the config change)
evidence: the validator on a picked Button reads `warning unknown-parameter boxShadow: net.noodl.controls.button has no input port "boxShadow"`; `buildStyleVocabulary()` hands an agent `boxShadowEnabled: "true"` for the same three variants
---

`ButtonConfig`'s `primary`, `secondary` and `destructive` looks carry `boxShadow: 'var(--shadow-sm)'`. The Button has no
`boxShadow` port, so a Button a person drops from the node picker stamps a value the runtime never reads (and the
validator warns about it). The style vocabulary, which is what an agent reads through `get_style_vocabulary`, maps the
same key to `boxShadowEnabled: 'true'`, so an agent's Button gets the runtime's subtle shadow. Same look, two Buttons.

**Needs a ruling:** (a) a dropped Button wears the shadow too (`boxShadowEnabled: 'true'` in the config: new Buttons in
Studio gain a shadow), or (b) neither wears it (drop `boxShadow`: agents' Buttons lose theirs). Left as it is until then;
`PickerLookValidates.test.ts` allows this one warning by name and asserts it still fires.

**Plain words:** *"A button you drag in has no shadow, but the same button built by Claude has one. Should both have it, or neither?"*

**Ruled by Richard, 2026-10-26: both have it** ((a): `boxShadowEnabled: 'true'` in the three variants, so a dropped
Button wears the shadow an agent's already does). `PickerLookValidates.test.ts` then drops its allowance for the warning.

**Fixed (c60cb1d53).** The three filled looks set `boxShadowEnabled: true` (a real boolean: config values may now be
booleans), so the picker's drop, the shipped Looks and the vocabulary copy one port. Found on the way: the vocabulary
taught it as the string `'true'`, which the validator's boolean check calls an error, so an agent following it wrote an
error. The `--shadow-sm` token instead was built and measured: three looks took the vocabulary prompt to 4,403 of 4,400,
and in the defaults its two token ports are dead on the flat looks. Graded: `PickerLookValidates` 53/53 (red 13 on
HEAD's source), editor neighbours 13 suites 230/230, both editor tsc configs clean, mcp style suites 7/7 89/89 with the
prompt at 4,361. Studio and agents reach it with the next editor build and `@nodegx/mcp`.
