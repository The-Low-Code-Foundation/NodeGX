---
id: P109-S45-WIREDTITLE
title: A Page's Title set by a wire never reaches the browser tab — the Router always uses the typed one
status: open
phase: P109
task: ISL-037
severity: medium
area: runtime / Page + Router (`noodl-viewer-react/src/nodes/navigation/page.ts` `title` :106-116; `router.tsx` `Noodl.SEO.setTitle(this._internal.currentPage.title)` :645, :992)
found: P109 s45, 2026-10-11 (scoping P109-S11-DBTPAGETITLES: the fix the warning asks for)
evidence: read, not driven — page.ts `title.set` writes `this._internal.title`; router.tsx sets the tab from `currentPage.title`, the router index's entry built from the node's parameters at export (`_getPageInfo`)
---

A person wires a Translation (or any value) into a Page's **Title**, as the editor's `typed-word-not-translated`
warning tells them to. The browser tab keeps the typed title. The Page node stores the wired value
(`_internal.title`), but nothing reads it: the Router sets the tab with `Noodl.SEO.setTitle(currentPage.title)`, and
`currentPage` is the router index's entry, built from the node's *parameters* when the project is exported.

The port's own description promises otherwise: "The page's title, used as the document title while this page is
showing".

**Why it matters now:** P109-S11-DBTPAGETITLES asks for exactly this wire on the training app's eleven pages. Built as
proposed, it would silence the warning and change no tab. The same trap meets any app that names a page from data (a
product's name, a person's).

**Not driven yet.** First step: a two-page project with a Page whose Title is wired from a String; navigate to it and
read `document.title` (control: a typed Title on the other page).

**Proposed:** when a page mounts, and whenever its Title input changes while it is showing, the Router sets the tab from
the Page node's current title (`getTitle()`), falling back to the index's typed one. Then build DBTPAGETITLES on it.
