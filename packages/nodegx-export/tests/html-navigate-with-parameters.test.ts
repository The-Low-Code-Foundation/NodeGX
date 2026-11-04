/**
 * P134 session 11 — a page that takes parameters, in plain files. Before this session the HTML router matched a page's
 * path letter for letter, so `/member/{memberId}` was never shown and every Navigate that filled it was left out whole
 * (about 45 across marketplace, members-area, landing-pages and digital-bricks-training).
 *
 * The Navigate Desk (`helpers/navigate-desk.ts`), driven in jsdom, against a prediction written from the runtime's own
 * rule (`router.tsx` `getRelativeURL`: each braced segment filled with `encodeURIComponent` of its value, every value the
 * path does not name left over as the query; `page-inputs.ts`: a page reads a parameter from the query first, then the
 * path) before the export ran. The url is the React export's (`component.ts` `case 'navigate'`), after `#`.
 *
 * One reading differs from the runtime's, and it is React's: a value that is not there yet. The runtime leaves the
 * literal `{memberId}` in the path and adds `?memberId=undefined`; both exports fill an empty segment, which matches no
 * page, so the app opens its start page rather than a member called "undefined" (D5).
 */

import { loadCatalog } from '../src/catalog';
import { parseProject } from '../src/parse/parseProject';
import { emitHtmlApp } from '../src/emit/html/emitHtml';
import { openHtmlExport, type HtmlPage } from './helpers/html-in-jsdom';
import { writeNavigateDesk } from './helpers/navigate-desk';

const catalog = loadCatalog();
const exported = emitHtmlApp(parseProject(writeNavigateDesk(), catalog), catalog);

const ps = (page: HtmlPage): string[] => [...page.document.querySelectorAll('p')].map((p: any) => p.textContent);
const press = async (page: HtmlPage, words: string) => {
  const b = ([...page.document.querySelectorAll('button')] as any[]).find((x) => x.textContent === words);
  if (!b) throw new Error(`no button "${words}" on ${page.document.title}`);
  b.click();
  await page.settle();
};
const at = (page: HtmlPage) => [page.document.title, page.window.location.hash, ...ps(page)];

describe('P134 session 11 — Navigate with page parameters, in plain files', () => {
  it('D0. no Navigate on the desk is left out', () => {
    expect(exported.preflight.htmlLosses).toEqual([]);
    expect(exported.files['pages/Home.js']).toContain("navigate(`/member/${encodeURIComponent(variables.who.get() ?? '')}?tab=notes`);");
    expect(exported.files['pages/Home.js']).toContain("navigate('/member/42');");
  });

  it('D1. a typed-in parameter: the page, its path, and the value read on it; then Home, and Back', async () => {
    const page = await openHtmlExport(exported.files);
    try {
      expect(at(page)).toEqual(['Home', '', 'the home page']);
      await press(page, 'Member 42');
      expect(at(page)).toEqual(['Member', '#/member/42', '42', '']);
      await press(page, 'Home');
      expect(at(page)).toEqual(['Home', '#/home', 'the home page']);
      page.window.history.back();
      await page.settle();
      expect(at(page)).toEqual(['Member', '#/member/42', '42', '']);
    } finally {
      page.close();
    }
  });

  it('D2. a wired parameter with a space and a slash, and one the path does not name: encoded in, read out', async () => {
    const page = await openHtmlExport(exported.files);
    try {
      await press(page, 'Member Ann');
      expect(at(page)).toEqual(['Member', '#/member/Ann%20B%2FC?tab=notes', 'Ann B/C', 'notes']);
    } finally {
      page.close();
    }
  });

  it('D3. an address typed by hand: the query wins over the path, as the running app reads it', async () => {
    const page = await openHtmlExport(exported.files, '#/member/7?memberId=9&tab=money');
    try {
      expect(at(page)).toEqual(['Member', '#/member/7?memberId=9&tab=money', '9', 'money']);
    } finally {
      page.close();
    }
  });

  it('D4. a parameter not there yet: an empty segment, no page about "undefined", so the start page', async () => {
    const page = await openHtmlExport(exported.files);
    try {
      await press(page, 'Member nobody');
      expect(at(page)).toEqual(['Home', '#/member/', 'the home page']);
    } finally {
      page.close();
    }
  });

  it('D5. Open In New Tab: the same address, in a new tab, and this page stays', async () => {
    const opened: unknown[][] = [];
    const page = await openHtmlExport(exported.files, '', {}, { prepare: (w) => (w.open = (...args: unknown[]) => opened.push(args)) });
    try {
      await press(page, 'Member in a tab');
      expect(opened).toEqual([['#/member/42', '_blank']]);
      expect(at(page)).toEqual(['Home', '', 'the home page']);
    } finally {
      page.close();
    }
  });

  it('D6. Navigate To Path, its value wired (HiveClip\'s project card): the page, and the value read on it', async () => {
    const page = await openHtmlExport(exported.files);
    try {
      await press(page, 'Path to 7');
      expect(at(page)).toEqual(['Member', '#/member/7', '7', '']);
    } finally {
      page.close();
    }
  });
});
