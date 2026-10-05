/* eslint-env jest */
/**
 * P109 ISL-008 AC7 (the server half): a server-rendered page carries the defaults sheet, as the first element of
 * `<head>`, so its first paint has every node's defaults and an author's class still comes after them.
 */
const { injectDefaultStyles } = require('../static/ssr/inject-default-styles');

const PAGE = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>.win{position:fixed}</style></head><body></body></html>';

describe('injectDefaultStyles (ISL-008)', () => {
  it('writes the rules as the FIRST element of <head>, before the template’s own styles', () => {
    const out = injectDefaultStyles(PAGE, ['.ndl-d-a{display:flex}', '.ndl-d-b{position:relative}']);
    const head = out.slice(out.indexOf('<head>') + '<head>'.length);
    expect(head.startsWith('<style id="noodl-default-styles">.ndl-d-a{display:flex}.ndl-d-b{position:relative}</style>')).toBe(true);
    expect(out.indexOf('noodl-default-styles')).toBeLessThan(out.indexOf('.win{position:fixed}'));
  });

  it('finds a <head> that carries attributes', () => {
    const out = injectDefaultStyles('<html><head lang="en"><title>x</title></head></html>', ['.ndl-d-a{display:flex}']);
    expect(out).toBe('<html><head lang="en"><style id="noodl-default-styles">.ndl-d-a{display:flex}</style><title>x</title></head></html>');
  });

  it('leaves a page with no rules exactly as it was', () => {
    expect(injectDefaultStyles(PAGE, [])).toBe(PAGE);
    expect(injectDefaultStyles(PAGE, undefined)).toBe(PAGE);
  });

  it('cannot be closed early by a value', () => {
    const out = injectDefaultStyles(PAGE, ['.ndl-d-a{font-family:"</style><script>x</script>"}']);
    expect(out).not.toContain('</style><script>');
  });
});
