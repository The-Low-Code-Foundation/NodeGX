/**
 * TVW-001 / P93 AC7 — the URL a page row is allowed to *show*, which is only ever one somebody set.
 *
 * ───────────────────────────────────────────────────────────────────────────────
 * 🔴 THIS EXISTS BECAUSE A PAGE THAT HAD NO URL WAS GIVEN ONE MADE OUT OF ITS TITLE.
 *
 * `RouterAdapter.getPageInfoForComponents` used to read
 * `page.parameters['urlPath'] || title.replace(/\s+/g, '-').toLowerCase()`. On a real project that
 * turns a page whose `urlPath` was never set into a route like
 * `/halden-&-rowe-—-design-and-fabrication-studio,-sheffield` — the slugified SEO title, 57
 * characters of it. P93's AC7 drive measured that string squeezing the page row's own **name** down
 * to `H…` (19px allotted against the 33px it needed) at the components panel's minimum width, while
 * the invented route took 88px and was itself truncated into nonsense. Richard ruled on 2026-09-18:
 * **stop showing a URL nobody typed.**
 *
 * ⚠️ **Display only, and that is the whole point of the boundary.** The same fallback is written out
 * twice more, and both were left exactly as they are:
 *   - `utils/exporter/router.ts` — what a **deployed** app serves;
 *   - `utils/compilation/context/pages-helper.ts` `getPageUrl` — what the **dev preview** serves,
 *     and what the topbar's route pill lists.
 * Removing the invention there would change real URLs, and worse: `compilation/context/pages.ts`
 * drops a page whose path is empty, so every existing page without an explicit `urlPath` would stop
 * being routed at all. Verified during the same drive that the invented URL is genuinely served —
 * navigating the running app to it renders the whole page (4892 characters of body text) where a
 * nonsense path renders nothing.
 *
 * So the editor and the app now answer two different questions, on purpose: this one answers *"what
 * did you set?"*, and the route pill answers *"where is the app?"*. A blank here is not a gap, it is
 * the honest answer.
 *
 * ⚠️ **A pure function in its own module, on purpose** — the same reason `pagesAfterComponentRemoved`
 * next door is one. `RouterAdapter` reaches `ProjectModel`, `ComponentModel` and `NodeGraphModel`,
 * so nothing in it is reachable from the jest runner, and the rule that was wrong is one `||`.
 * Putting it where a spec can call it is the difference between a guard and a comment saying there
 * ought to be one — see `an-unpinned-user-visible-string-sits-a-ruling-behind`.
 *
 * @module noodl-editor/models/NodeTypeAdapters/authoredPageUrl
 */

/**
 * The page's own URL as the editor should display it.
 *
 * @param urlPath the `urlPath` parameter from the page's `Page` node, exactly as stored — it is
 *   routinely `undefined` (never set) or `''` (set and then cleared), and both mean "not authored".
 * @param pathParams the names declared by the component's `PageInputs` nodes, which become
 *   `{name}` segments on the end of an authored path.
 * @returns the authored path with any missing `{param}` segments appended, or `''` when nothing was
 *   authored. **Never a value derived from the page's title or its component name.**
 */
export function authoredPageUrl(urlPath: unknown, pathParams: readonly string[] = []): string {
  if (typeof urlPath !== 'string') return '';

  let path = urlPath;
  if (!path) return '';

  // With no authored path there is nothing to append to, which is why this sits behind the guard
  // above: `'' + '/{id}'` would be a new invention wearing a different shape, and `/{id}` is not a
  // route anybody set either.
  for (const param of pathParams) {
    if (path.indexOf('{' + param + '}') === -1) path = path + '/{' + param + '}';
  }

  return path;
}
