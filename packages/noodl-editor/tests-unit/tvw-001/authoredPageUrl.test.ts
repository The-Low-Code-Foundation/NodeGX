/**
 * TVW-001 / P93 AC7 — the editor shows a page's URL only when somebody set one.
 *
 * ⚠️ **These are the first assertions ever to cover this rule**, and the absence is the explanation:
 * `getPageInfoForComponents` reaches `ProjectModel`, so nothing in it could be graded, and the one
 * `||` that invented a URL out of the page title sat there unguarded until a screenshot found it.
 * Same shape as the caption in `benchWords.test.ts` — see
 * `an-unpinned-user-visible-string-sits-a-ruling-behind`.
 */

import { authoredPageUrl } from '../../src/editor/src/models/NodeTypeAdapters/authoredPageUrl';

describe('TVW-001 / AC7 — a page URL the editor is allowed to show', () => {
  it('gives back a path that was actually authored', () => {
    expect(authoredPageUrl('catalog')).toBe('catalog');
    expect(authoredPageUrl('/settings')).toBe('/settings');
  });

  it('NEVER invents one when the page has no URL set', () => {
    // 🔴 The defect this rule exists to stop. The old fallback was
    // `urlPath || title.replace(/\s+/g,'-').toLowerCase()`, which on the P93 corpus produced
    // `halden-&-rowe-—-design-and-fabrication-studio,-sheffield` — 57 characters of slugified SEO
    // title for a page whose `urlPath` nobody had ever filled in. In a 240px panel row that pushed
    // the page's own NAME down to `H…`: 19px of label against an 88px route that was itself
    // truncated into nonsense. Richard ruled it out on 2026-09-18.
    expect(authoredPageUrl(undefined)).toBe('');
    expect(authoredPageUrl('')).toBe('');
    expect(authoredPageUrl(null)).toBe('');
  });

  it('is not fooled by a non-string parameter', () => {
    // `parameters` is untyped storage read straight off disk, so this is reachable from a
    // hand-edited or machine-written project file rather than only from the UI.
    expect(authoredPageUrl(42)).toBe('');
    expect(authoredPageUrl({ toString: () => 'sneaky' })).toBe('');
  });

  it('appends declared path parameters to an authored path', () => {
    expect(authoredPageUrl('product', ['id'])).toBe('product/{id}');
    expect(authoredPageUrl('product', ['id', 'tab'])).toBe('product/{id}/{tab}');
  });

  it('leaves a path alone when it already names the parameter', () => {
    expect(authoredPageUrl('product/{id}', ['id'])).toBe('product/{id}');
    expect(authoredPageUrl('product/{id}', ['id', 'tab'])).toBe('product/{id}/{tab}');
  });

  it('does NOT build a path out of parameters alone', () => {
    // The invention wearing a different shape: with no authored path, appending would yield
    // `/{id}`, which is not a route anybody set either — and, unlike the title slug, it is one a
    // reader could easily mistake for something they configured.
    expect(authoredPageUrl('', ['id'])).toBe('');
    expect(authoredPageUrl(undefined, ['id', 'tab'])).toBe('');
  });

  it('says nothing about where the app actually serves the page', () => {
    // ⚠️ The boundary, asserted so it cannot be quietly widened. `utils/exporter/router.ts` and
    // `utils/compilation/context/pages-helper.ts` keep their own copies of the old fallback on
    // purpose: the app still serves an un-authored page at the slugified title, and removing that
    // would un-route every such page (`compilation/context/pages.ts` drops a page with an empty
    // path). This function is display, and only display. If someone ever makes the export use it,
    // that is a routing change and needs its own ruling — not a refactor.
    expect(authoredPageUrl('')).toBe('');
  });
});
