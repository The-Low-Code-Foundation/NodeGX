/**
 * TVW-002 — resolving the preview's route to the page it is showing.
 *
 * Getting this wrong is worse than having no strip: the sentence would name the wrong page with
 * total confidence. The hash prefix is the likeliest way to get it wrong, because it is the
 * runtime's *default* (`navigationPathType === undefined` means hash) and every route the editor
 * holds in a fresh project carries it.
 */

import { pageForRoute, routePath } from '../../src/editor/src/views/VisualCanvas/screenRoute';

const pages = [
  { path: '/home', componentName: '/Pages/Home' },
  { path: '/pricing', componentName: '/Pages/Pricing' },
  { path: '/product/{id}', componentName: '/Pages/Product' },
  { path: '/product/new', componentName: '/Pages/New product' }
];

describe('TVW-002 — what page the preview is showing', () => {
  describe('routePath', () => {
    it('unwraps the hash, which is the runtime default', () => {
      expect(routePath('/#/pricing')).toBe('/pricing');
      expect(routePath('#/pricing')).toBe('/pricing');
      expect(routePath('/pricing')).toBe('/pricing');
    });

    it('drops the query and keeps the path', () => {
      expect(routePath('/#/pricing?plan=pro')).toBe('/pricing');
      expect(routePath('/pricing?plan=pro')).toBe('/pricing');
    });

    it('a bare hash is the root, not the empty string', () => {
      // `''` would normalise to the root anyway, but a function that returns the empty string for
      // a real route is the FLD-007 defect's exact shape — a comparison against nothing.
      expect(routePath('/#')).toBe('/');
      expect(routePath('/#/')).toBe('/');
    });

    it('a missing route is empty rather than a throw', () => {
      expect(routePath(undefined)).toBe('');
      expect(routePath(null as unknown as string)).toBe('');
    });
  });

  describe('pageForRoute', () => {
    it('resolves a page in both path shapes', () => {
      expect(pageForRoute('/#/pricing', pages)).toBe('/Pages/Pricing');
      expect(pageForRoute('/pricing', pages)).toBe('/Pages/Pricing');
    });

    it('the root is the Router start page, which is in no route table', () => {
      expect(pageForRoute('/', pages, '/Pages/Home')).toBe('/Pages/Home');
      expect(pageForRoute('/#/', pages, '/Pages/Home')).toBe('/Pages/Home');
      // With no start page known there is nothing honest to say.
      expect(pageForRoute('/', pages)).toBeUndefined();
    });

    it('a trailing slash is the same page', () => {
      expect(pageForRoute('/#/pricing/', pages)).toBe('/Pages/Pricing');
    });

    it('resolves a dynamic page by its pattern', () => {
      expect(pageForRoute('/#/product/42', pages)).toBe('/Pages/Product');
    });

    it('🔴 a static page beats a dynamic one that would swallow it', () => {
      // `/product/new` matches `/product/{id}` too. Resolving to the wrong page here would put a
      // confident sentence on screen naming a page the person is not on.
      expect(pageForRoute('/#/product/new', pages)).toBe('/Pages/New product');
    });

    it('a pattern stands for exactly one segment', () => {
      expect(pageForRoute('/#/product/42/reviews', pages)).toBeUndefined();
      expect(pageForRoute('/#/product', pages)).toBeUndefined();
    });

    it('an unknown route resolves to nothing, and the strip then says "this screen"', () => {
      expect(pageForRoute('/#/nowhere', pages, '/Pages/Home')).toBeUndefined();
    });
  });
});
