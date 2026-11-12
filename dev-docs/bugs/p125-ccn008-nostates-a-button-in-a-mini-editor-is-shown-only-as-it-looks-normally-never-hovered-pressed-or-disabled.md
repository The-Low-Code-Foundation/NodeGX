---
id: P125-CCN008-NOSTATES
title: a button in a mini editor is shown only in its normal look: its hover, pressed and disabled looks cannot be seen or chosen, so a leftover hover colour survives the person's choice
status: fixed
severity: medium
area: mcp / mini editor (spec + panel)
found: P125 CCN-008 AC6, Richard's Muddy Paws run in Claude Desktop (Sonnet 5.5), 2026-10-25 08:12–08:21
evidence: Richard's words, P125 CCN-008 AC6, Richard's Muddy Paws run in Claude Desktop (Sonnet 5.5), 2026-10-25 08:12–08:21; the runtime's precedence read in `noodl-viewer-react/src/react-component-node.ts` `getParametersForStates`
kit: mcp
commit: 6ce8f171b
regression: packages/noodl-mcp/tests/ccn008MiniEditor.test.ts "P125-CCN008-NOSTATES"
---

Richard: *"I would have expected to see the hover and clicked / disabled variants in the mini editor, if the user is
to really decide about the button styles. For example imagine the hovered colour is red from previous edits, the user
changes button colour to blue in the mini editor, but the hover colour will possibly still stay red if Claude doesn't
pick up on it"*.

Measured precedence: the style's state value, then the node's own NORMAL value over it, then the node's own state
value over both. So a red hover on the node itself (or on the style, when the node sets no fill itself) survives a new
fill.

**Fix:** a control's stage has a "Show it" row (Normal, Hover, Pressed, Disabled, and Focused when anything gives it a
focused look) drawn with the runtime's own `setVisualStates`; a setting can be a state's (`state: "hover"`), with "as
normal"; a normal setting a state overrides says so under it; and the agent is warned when a state hides the person's
choice and the editor has no setting for it.
