---
title: "Font Awesome Solid"
---

This module contains all the Font Awesome brand icons. Add it to your project and you will have access to it in all core nodes that support icons. Most notably the [Icon](/nodes/basic-elements/icon) node.

You can find a list of all the icons here: https://fontawesome.com/search?o=r&m=free&s=solid&f=solid%2Cclassic

Using this via code, works like this:

```js
Outputs.iconObject = {
  class: "fa-solid",
  code: Inputs.iconCode,
  codeAsClass: true
}
```
