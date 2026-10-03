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

## Which language a page starts in

With no **ChangeLanguage** sent, the first of these that names a language wins: a `?lng=fr` in the address, the
language the person last chose on this device (kept in the browser's local storage under `i18nextLng` every time the
language changes), then the browser's own language. A language with no bundle falls back to English.

Every time the language changes the page's `<html lang>` follows it, so screen readers and the browser's translate
offer know which language the page is in.
