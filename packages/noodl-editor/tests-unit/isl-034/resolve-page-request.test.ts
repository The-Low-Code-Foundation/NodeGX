/**
 * P109 ISL-034 / P109-S15 — `render_report` and `drive_page` find a page by the path the authoring tools took, or by
 * its title.
 *
 * An agent created `create_component({ path: "Pages/Garden", type: "page" })`, then asked `render_report({ page:
 * "Garden" })` and was refused: only "/" and "/Pages/Garden" resolved (ISL-017 AC5, 2026-10-04). One turn lost per
 * agent that met it. `resolvePageRequest` is the one resolver both tools use.
 */
import * as path from 'path';

const REPO = path.join(__dirname, '..', '..', '..', '..');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { resolvePageRequest } = require(path.join(REPO, 'scripts', 'devtools', 'render-report.js'));

type Entry = { component: string; title?: string; urlPath?: string; isStart: boolean; reachable: boolean };
const page = (component: string, title: string, urlPath: string, isStart = false): Entry => ({ component, title, urlPath, isStart, reachable: true });
const GARDEN = { pages: [page('/Pages/Garden', 'Garden', 'garden', true), page('/Pages/Shed', 'The Shed', 'shed')] };

const resolved = (routes: { pages: Entry[] }, asked: string) => {
  const r = resolvePageRequest(routes, asked);
  return r.ok ? r.page.component : `refused: ${r.message}`;
};

describe('P109-S15 — a page asked for by the path create_component took, or by its title', () => {
  it('still resolves what it always did: "/", the component name, the urlPath', () => {
    expect(resolved(GARDEN, '/')).toBe('/Pages/Garden');
    expect(resolved(GARDEN, '/Pages/Garden')).toBe('/Pages/Garden');
    expect(resolved(GARDEN, 'shed')).toBe('/Pages/Shed');
  });

  it('resolves the authoring path without its leading slash', () => {
    expect(resolved(GARDEN, 'Pages/Garden')).toBe('/Pages/Garden');
    expect(resolved(GARDEN, 'Pages/Shed')).toBe('/Pages/Shed');
  });

  it("resolves a page's title when one page has it", () => {
    expect(resolved(GARDEN, 'Garden')).toBe('/Pages/Garden');
    expect(resolved(GARDEN, 'The Shed')).toBe('/Pages/Shed');
  });

  it('names both pages when two share the title, and picks neither', () => {
    const twins = { pages: [page('/Pages/Home', 'Home', 'home', true), page('/Admin/Home', 'Home', 'admin')] };
    expect(resolved(twins, 'Home')).toBe('refused: Cannot render the page "Home": 2 pages have that title (/Pages/Home, /Admin/Home). Ask for one by its path.');
  });

  it('still refuses a name no page has, listing the registered ones', () => {
    expect(resolved(GARDEN, 'Greenhouse')).toMatch(/^refused: Cannot render the page "Greenhouse": no page registered at that path\. Registered pages: \//);
  });
});
