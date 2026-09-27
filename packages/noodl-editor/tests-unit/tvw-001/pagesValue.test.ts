/**
 * TVW-001 AC3 — a Router's Pages edit must leave the value it started from untouched, because that
 * value is what undo puts back (`PagesType.tsx` passes it as `oldValue`). Each case deep-freezes
 * the input: an in-place `push`/`splice`/assignment throws in strict mode instead of passing.
 */

import {
  RouterPagesValue,
  withRouteAdded,
  withRouteRemoved,
  withStartPage
} from '../../src/editor/src/views/panels/propertyeditor/Pages/pagesValue';

function frozen(): RouterPagesValue {
  const routes = Object.freeze(['/Home', '/Legal']) as unknown as string[];
  return Object.freeze({ routes, startPage: '/Home' });
}

describe('TVW-001 AC3 Router pages edits never mutate the value undo holds', () => {
  it('adds a route to a new value', () => {
    const before = frozen();
    const after = withRouteAdded(before, '/About');
    expect(after.routes).toEqual(['/Home', '/Legal', '/About']);
    expect(before.routes).toEqual(['/Home', '/Legal']);
    expect(after.routes).not.toBe(before.routes);
  });

  it('adds the first route to a Router that has none', () => {
    expect(withRouteAdded(undefined, '/Home')).toEqual({ routes: ['/Home'] });
  });

  it('removes a route, and the start page with it, into a new value', () => {
    const before = frozen();
    const after = withRouteRemoved(before, '/Home');
    expect(after).toEqual({ routes: ['/Legal'], startPage: undefined });
    expect(before).toEqual({ routes: ['/Home', '/Legal'], startPage: '/Home' });
  });

  it('says nothing changed when the route is not listed', () => {
    expect(withRouteRemoved(frozen(), '/Gone')).toBeNull();
  });

  it('sets the start page on a new value', () => {
    const before = frozen();
    expect(withStartPage(before, '/Legal')).toEqual({ routes: ['/Home', '/Legal'], startPage: '/Legal' });
    expect(before.startPage).toBe('/Home');
  });
});
