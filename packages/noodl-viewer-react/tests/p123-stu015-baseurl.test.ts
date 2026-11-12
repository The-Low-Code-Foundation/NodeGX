/**
 * P123-STU015-BASEURL — under a base URL, what a router writes is what it reads back.
 *
 * The Page Router cut `Noodl.Env.BaseUrl`'s length off the address it read, and nothing that writes an address in path
 * mode put the base on. In `@nodegx/preview`'s frame (BaseUrl "/runtime/") `navigateToPath('/sign-in')` pushed
 * "/sign-in", which the Router read as "", so every navigation by path landed on the start page. The Page Stack ignored
 * the base when reading, so the two routers disagreed about one address.
 *
 * Graded on the real methods (bound to a probe, as `corpus/nda-012-page-router-path-and-reset.test.ts` does) and on a real
 * jsdom `location` and `history`: the address each writer leaves is read back by each reader.
 */
/* eslint-disable @typescript-eslint/no-var-requires */
import type { TSFixme } from '../typings/global';

import NoodlRuntime from '@noodl/runtime';

const { JSDOM } = require('jsdom');

type AnyFn = (...args: unknown[]) => unknown;
const g = globalThis as unknown as Record<string, unknown>;
const saved = { instance: (NoodlRuntime as unknown as { instance?: unknown }).instance };
let pathType = 'path';

function serveAt(url: string, baseUrl: string | undefined) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url });
  g.window = dom.window;
  g.location = dom.window.location;
  g.history = dom.window.history;
  g.PopStateEvent = dom.window.PopStateEvent;
  g.dispatchEvent = () => true;
  g.Noodl = { Env: baseUrl === undefined ? {} : { BaseUrl: baseUrl }, SEO: { setTitle() {} } };
}

beforeAll(() => {
  (NoodlRuntime as unknown as { instance: unknown }).instance = { getProjectSettings: () => ({ navigationPathType: pathType }) };
});
afterAll(() => {
  (NoodlRuntime as unknown as { instance?: unknown }).instance = saved.instance;
});

/** A Page Router showing the page with `path`, its real URL methods bound. */
function router(path: string) {
  const RouterModule = require('../src/nodes/navigation/router').default;
  const instance: Record<string, TSFixme> = { _internal: { currentPage: { path, component: '/Page', title: 'Page' }, currentParams: {} }, parent: undefined };
  const methods = (RouterModule as { node: { methods: Record<string, AnyFn> } }).node.methods;
  for (const key of Object.keys(methods)) instance[key] = methods[key].bind(instance);
  return instance;
}

/** A Page Stack whose top page is `path`, its real URL methods bound. */
function pageStack(path: string) {
  const StackModule = require('../src/nodes/navigation/navigation-stack').default;
  const instance: Record<string, TSFixme> = { _internal: { useRoutes: true }, parent: undefined };
  const methods = (StackModule as { node: { methods: Record<string, AnyFn> } }).node.methods;
  for (const key of Object.keys(methods)) instance[key] = methods[key].bind(instance);
  instance.getRelativeURL = () => ({ path, query: [] });
  return instance;
}

const navigation = () => require('../src/api/navigation').default as { navigateToPath(path: string): void };

describe('P123-STU015-BASEURL — under BaseUrl "/runtime/" (the preview frame)', () => {
  beforeEach(() => {
    pathType = 'path';
    serveAt('http://127.0.0.1:8574/runtime/', '/runtime/');
  });

  it('the Page Router writes its page under the base and reads it back', () => {
    const r = router('sign-in');
    r._updateUrlWithTopPage();
    expect(location.pathname).toBe('/runtime/sign-in');
    expect(r._getLocationPath()).toBe('sign-in');
  });

  it('Noodl.Navigation.navigateToPath goes under the base, and both routers read the page (it read "-reusable")', () => {
    navigation().navigateToPath('/__studio-reusable');
    expect(location.pathname).toBe('/runtime/__studio-reusable');
    expect(router('x')._getLocationPath()).toBe('__studio-reusable');
    expect(pageStack('x')._getLocationPath()).toBe('__studio-reusable');
  });

  it('the Page Stack writes under the base and reads what the Page Router reads', () => {
    const s = pageStack('sign-in');
    s._updateUrlWithTopPage('push');
    expect(location.pathname).toBe('/runtime/sign-in');
    expect(s._getLocationPath()).toBe('sign-in');
    expect(router('x')._getLocationPath()).toBe('sign-in');
  });

  it('the base itself, with or without its last "/", is the start of the app', () => {
    expect(router('x')._getLocationPath()).toBe('');
    serveAt('http://127.0.0.1:8574/runtime', '/runtime/');
    expect(router('x')._getLocationPath()).toBe('');
  });
});

describe('P123-STU015-BASEURL — what a root deploy did, it still does', () => {
  beforeEach(() => {
    pathType = 'path';
  });

  it.each([['/'], [undefined]])('BaseUrl %p: the Router writes "/sign-in" and reads "sign-in"', (base) => {
    serveAt('https://app.example/', base);
    const r = router('sign-in');
    r._updateUrlWithTopPage();
    expect(location.pathname).toBe('/sign-in');
    expect(r._getLocationPath()).toBe('sign-in');
    navigation().navigateToPath('/home');
    expect(location.pathname).toBe('/home');
    expect(pageStack('x')._getLocationPath()).toBe('home');
  });

  it('a BaseUrl that is a full URL counts by its pathname (a deploy in a folder)', () => {
    serveAt('https://host.example/my-folder/', 'https://host.example/my-folder');
    const r = router('sign-in');
    r._updateUrlWithTopPage();
    expect(location.pathname).toBe('/my-folder/sign-in');
    expect(r._getLocationPath()).toBe('sign-in');
  });

  it('hash mode never carries the base', () => {
    pathType = 'hash';
    serveAt('http://127.0.0.1:8574/runtime/', '/runtime/');
    const r = router('sign-in');
    r._updateUrlWithTopPage();
    expect(location.pathname).toBe('/runtime/');
    expect(location.hash).toBe('#/sign-in');
    expect(r._getLocationPath()).toBe('sign-in');
  });
});
