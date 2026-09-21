---
title: "i18next"
---

This is used to register bundles and to set and get the current language.

## Inputs

**Language**
This is a string input that is used to specify the current language. It should be a language code that matches a langugage in the bundle.

**ChangeLanguage**
This signal is used in combination with **Language** to set a new current language. The **Language** string should be a language code, and is matched to a language bundle. For example `en` for English.

## Outputs

**LanguageChanged**
This is triggered when the current language is changed, as a result of a signal received on **ChangeLanguage**. This is useful if your application needs to take action when the language is changed.

**CurrentLanguage**
Contains the language code of the currently set language.
