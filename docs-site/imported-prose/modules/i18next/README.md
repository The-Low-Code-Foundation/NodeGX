---
title: "i18next Module"
---

Module for using [i18next](https://www.i18next.com) in Noodl.
The module has three nodes, _i18next_, _Language Bundle_ and _Translation_.

- i18next node is used to keep track of current language and to change the language
- Language Bundle holds the resources (i.e. localized texts) for a specific language
- Translation retrieves the correct translation for a specific string (identified by a key) from the currently selected language. If the current language changes, all strings are updated accordingly.

An example with the most common cases can be found [here](/library/examples/localization).
