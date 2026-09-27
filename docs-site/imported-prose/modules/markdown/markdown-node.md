---
title: "Markdown"
---

This node enables you to use Markdown in Noodl.

## Inputs

**CSS Class**
The class name that'll be set on a wrapper `<div>` around the resulting HTML output. This is important for styling the Markdown with CSS.

**Source**
The markdown source.

**Allow HTML**
If this is enabled any HTML in the *Source* will be rendered as HTML. Be mindful of security risks if the markdown source originates in some type of end user input.

**Open links in tab**
* `true` Links in the markdown open in a new tab
* `false` Links in the markdown open in the same window

**Mounted**
This property is used to completely remove the node from the DOM. If this property is set to false the node is removed from the DOM.
