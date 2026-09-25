/**
 * BMG-012 — the editor's hand-off can name the page to land on.
 *
 * The editor's two remaining doors (the property panel's *Add a field*, the
 * workflow canvas's *Add / Edit this trigger*) open the manager signed in AND
 * on the right page: `#token=<t>&route=%2Fschema%2FPet%2Fnew-field`. This
 * grades the reader (`readHandoff`) against the router (`parseHash`), so the
 * route the editor sends is one the page understands, and pins what is refused.
 */
import './dom';

import { readHandoff } from '../../src/admin/app/api';
import { parseHash } from '../../src/admin/app/router';

describe('BMG-012 — reading the editor hand-off', () => {
  it('a bare token is the home, signed in (BMG-000 unchanged)', () => {
    expect(readHandoff('#token=abc%3D')).toEqual({ token: 'abc=', route: null });
  });

  it('carries the Add-a-field door to the Schema page with the picker open', () => {
    const h = readHandoff('#token=t0k&route=' + encodeURIComponent('/schema/Pet/new-field'));
    expect(h).toEqual({ token: 't0k', route: '/schema/Pet/new-field' });
    expect(parseHash('#' + h!.route)).toEqual({ view: 'schema', params: ['Pet', 'new-field'], query: {} });
  });

  it('carries the canvas doors to the Triggers page — new, or one trigger', () => {
    expect(parseHash('#' + readHandoff('#token=t&route=%2Ftriggers%2Fnew')!.route)).toEqual({
      view: 'triggers',
      params: ['new'],
      query: {}
    });
    expect(parseHash('#' + readHandoff('#token=t&route=%2Ftriggers%2Ftrg_1')!.route)).toEqual({
      view: 'triggers',
      params: ['trg_1'],
      query: {}
    });
  });

  it('keeps a collection name with a space or a slash intact through the encoding', () => {
    const h = readHandoff('#token=t&route=' + encodeURIComponent('/schema/' + encodeURIComponent('Log Entries') + '/new-field'));
    expect(parseHash('#' + h!.route).params).toEqual(['Log Entries', 'new-field']);
  });

  it('refuses a route that is not a plain path, and still signs in', () => {
    for (const bad of ['//evil.example/x', 'https://evil.example', 'schema/Pet', '/schema#x', '']) {
      const h = readHandoff('#token=t&route=' + encodeURIComponent(bad));
      expect(h).not.toBeNull();
      expect(h!.token).toBe('t');
      expect(h!.route).toBeNull();
    }
  });

  it('is not a hand-off when the fragment is a page', () => {
    expect(readHandoff('#/collections/Pet')).toBeNull();
    expect(readHandoff('')).toBeNull();
  });
});
