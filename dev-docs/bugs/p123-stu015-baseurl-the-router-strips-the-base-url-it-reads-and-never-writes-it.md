---
id: P123-STU015-BASEURL
title: The Router strips Noodl.Env.BaseUrl off the path it reads but never adds it to the path it writes, so under a base URL every path navigation lands on the start page
status: fixed
commit: 2bb610716
regression: packages/noodl-viewer-react/tests/p123-stu015-baseurl.test.ts "the Page Router writes its page under the base and reads it back"
severity: medium
area: noodl-viewer-react — `src/nodes/navigation/router.tsx` (`_getLocationPath` reads with `getBaseUrlLength`; `_getCompleteUrlToPage` / `_updateUrlWithTopPage` and `Noodl.Navigation.navigateToPath` write without it)
found: NodeGX Studio s3 (STU-015), 2026-10-19
evidence: in `@nodegx/preview`'s frame (`Noodl.Env.BaseUrl` = "/runtime/", navigationPathType "path"), `Noodl.Navigation.navigateToPath('/__studio-reusable')` pushed "/__studio-reusable"; the Router's `_getLocationPath()` returned "-reusable" (9 characters cut), `matchPageFromUrl()` matched no page, it fell back to the start page, and that page's own redirect pushed "/sign-in" (pushState trace, nodegx-studio docs/SCOPE.md STU-015)
---

The Router reads the browser path through `_getLocationPath`, which cuts `getBaseUrlLength(Noodl.Env.BaseUrl)`
characters off the front. What it writes after a navigation (`_getCompleteUrlToPage`, from
`getNavigationAbsoluteURL`) has no base URL in it, and neither does `Noodl.Navigation.navigateToPath`. So the read
and the write disagree whenever BaseUrl is more than "/":

- **Measured, in `@nodegx/preview`** (the app runs at `/runtime/`, BaseUrl "/runtime/"): "/sign-in" reads as "" and
  "/__studio-reusable" as "-reusable". Any navigation by path goes to the start page instead. NodeGX Studio's page
  picker had used `navigateToPath`, so picking any page but the start page landed on the start page; on the todo
  template the start page's redirect hid this ("Todo redirects a visitor to Sign in"). Studio now navigates by
  component through the Router node (`router.navigate({ target })`), which does not read the URL.
- **Read, not measured — a deploy in a sub-folder** (BaseUrl "https://host/my-folder"): after a navigation the
  address bar loses "/my-folder"; a reload or a shared link then asks the server for a path outside the app.

Likely also behind Studio's STU-013 note that on the imported real app "`?page=`, deep links and Router startPage all
land on index".

Fix direction: one helper that both reads and writes through the base URL (strip on read, prefix on write), used by
the Router, Navigate To Path and `Noodl.Navigation.navigateToPath`; a test that navigates under BaseUrl "/runtime/" and
reads back the page shown and the address.

**Fixed 2026-10-26 (the Beta sweep s11, 2bb610716), the fix direction above.** `nodes/navigation/base-path.ts`: on
read the base comes off exactly (never a count of characters), on write an absolute path goes under it, path mode
only. The Page Router, the Page Stack (which ignored the base when reading), Navigate To Path and
`Noodl.Navigation.navigateToPath` all use it; a BaseUrl that is a full URL counts by its pathname, a relative one
("./") is no base. Graded on the routers' real methods over a jsdom `location`: red 4/8 on HEAD's files (exactly the
base cases; root deploy and hash mode green both ways), 8/8 now. Neighbours: the viewer's 15 navigation suites
186/186, the runtime's conformance for Router, Page Stack and both navigates 11/11. 🔴 A trap met: the runtime's
node-spec target compiles viewer files with ITS tsconfig, where the bare `Noodl` global is not declared, so a new
viewer module naming it fails every spec's setup with empty failures; `envBaseUrl` reads `globalThis.Noodl`.
Studio's page picker already navigates by component; this makes an app's own path navigations work in its preview.

