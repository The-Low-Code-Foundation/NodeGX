---
id: P109-S45-WIREDTITLE
title: A Page's Title set by a wire never reaches the browser tab — the Router always uses the typed one
status: fixed
commit: edda6427b
phase: P109
task: ISL-037
severity: medium
area: runtime / Page + Router (`noodl-viewer-react/src/nodes/navigation/page.ts` `title` :106-116; `router.tsx` `Noodl.SEO.setTitle(this._internal.currentPage.title)` :645, :992)
found: P109 s45, 2026-10-11 (scoping P109-S11-DBTPAGETITLES: the fix the warning asks for)
evidence: packages/noodl-mcp/tests/p109WiredPageTitle.test.ts (a browser drive through render_report, 7 arms)
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

## Fixed s46 (2026-10-11, `edda6427b`)

**Driven first.** Three pages in one browser: a typed Title (control), a typed Title with a String wired over it, and a
typed Title with a Variable wired over it. HEAD's bundle: the wired page's tab read `Typed Under The Wire`, and setting
the Variable while the page showed left `Live Fallback`. The typed page and the empty-wire fallback were right.

**The fix.** The Page node calls back (`_internal.onTitleChanged`) on every Title it is given, and the Router
(`_nameTabFromPage`, both the Reset and the Navigate paths) names the tab from the page's current Title while it is
still the page showing; an empty or absent Title falls back to the typed one from the Pages list. Current Page Title
still reads the Pages list, as its description says, and P107's Router spec models only that output, so no spec
version moved (the tab is not in the spec).

**Graded.** The drive grew to 7 arms: the Live page is kept when left (ISL-004), the drive leaves it in the app
(`Noodl.Navigation.navigateToPath`, not a reload: the first version left by a CDP navigation, which rebuilds
everything, so its "left page" arm passed with the guard deleted), sets the Variable while it is hidden, and comes
back. HEAD's bundle: 3 red (wired, live change, kept page coming back). Fixed: 7/7. Mutant A (no "still showing"
guard): red in exactly the left-page arm. Mutant B (no callback): red in the wired and live arms, so a wired value
always lands after the Router has mounted the page. Built in a `make-worktree.sh` worktree with its own viewer folder
(a peer had the runtime open), so the shared bundle was never rebuilt. Viewer jest 1845/1845 (six router suites first
failed on stand-in Page nodes with no `_internal`; the Router now ignores a Page without one, as `_keepsWhenLeaving`
beside it does), viewer typecheck clean, runtime conformance `NSP_ONLY=Router,RouterNavigate` green.

The training template's eleven `Noodl.SEO.setTitle` relays were replaced by wires in `e215a0452`
(P109-S11-DBTPAGETITLES). The site builder carries the same relay: P109-S46-SITETITLERELAY.
