/**
 * P109 ISL-028 — P107-D21, ruled 2026-10-05 "Encode, and skip null", on `Noodl.Navigation.navigateToPath`.
 *
 * The scripting API builds its query the way the Navigate To Path node does, and had the node's defect: `key=value`
 * appended raw, so a value with `&` became two parameters, a `#` moved the start of the hash (the Router read the wrong
 * page), and a null arrived as the text 'null'. The node's half is graded by the spec
 * (`scenarios/PageStackNavigateToPath.json`, v2); this is the API's, so the two keep one rule.
 */

/* eslint-env jest */

const settings: Record<string, unknown> = {};
jest.mock('@noodl/runtime', () => ({ instance: { getProjectSettings: () => settings } }));

import navigation from '../src/api/navigation';

const pushed: string[] = [];

beforeAll(() => {
  const g = globalThis as unknown as Record<string, unknown>;
  g.window = { history: { pushState: (_s: unknown, _t: string, url: string) => pushed.push(url) } };
  g.PopStateEvent = class {
    constructor(public type: string) {}
  };
  g.dispatchEvent = () => true;
});

beforeEach(() => {
  pushed.length = 0;
  delete settings.navigationPathType;
});

describe('ISL-028 D21 — Noodl.Navigation.navigateToPath encodes its query and leaves out a null', () => {
  it('the hash type: a # and an & in a value, and a space in a name, are encoded — the hash still starts the page', () => {
    navigation.navigateToPath('/list', { query: { q: 'a#b', sort: 'a&b', 'x y': '50% off' } });
    expect(pushed).toEqual(['?q=a%23b&sort=a%26b&x%20y=50%25%20off#/list']);
  });

  it('the path type: a null value is left out, like an undefined one', () => {
    settings.navigationPathType = 'path';
    navigation.navigateToPath('/list', { query: { page: null, gone: undefined, n: 2 } });
    expect(pushed).toEqual(['/list?n=2']);
  });

  it('what it builds, the Router reads back as sent (decodeURIComponent, + as a space)', () => {
    navigation.navigateToPath('/list', { query: { q: 'a#b & c=d', 'x y': '100%' } });
    const search = pushed[0].slice(1, pushed[0].indexOf('#'));
    const read: Record<string, string> = {};
    const decode = (s: string) => decodeURIComponent(s.replace(/\+/g, ' '));
    // the Router's own loop (router.tsx `_getSearchParams`)
    const re = /([^&=]+)=?([^&]*)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(search))) read[decode(m[1])] = decode(m[2]);
    expect(read).toEqual({ q: 'a#b & c=d', 'x y': '100%' });
  });
});
