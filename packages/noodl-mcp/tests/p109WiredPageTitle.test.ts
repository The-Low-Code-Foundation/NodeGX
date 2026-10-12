/**
 * P109-S45-WIREDTITLE — a Page's Title set by a wire reaches the browser tab.
 *
 * The Router set the tab once, from the router index's entry, which the exporter builds from the
 * Page node's *parameters*. A wired Title landed in the Page node (`_internal.title`) and nothing
 * read it: the editor's `typed-word-not-translated` warning tells a person to wire a Translation
 * into the Title, and doing so silenced the warning and changed no tab.
 *
 * Three pages, one browser, each read through `document.title`:
 * - **Typed** — the control: a typed Title and no wire. It must keep working exactly as before.
 * - **Wired** — a typed Title *and* a String wired over it. The wire wins.
 * - **Live** — a typed Title and a Variable wired over it, the Variable empty at first. The tab
 *   shows the typed title (the fallback), then follows the Variable when it changes while the page
 *   shows, and stops following it once the page is left — the page is kept when left, so it still
 *   hears the change while hidden.
 *
 * ⚠️ Needs the built viewer bundle and a Chrome, like DEF-003's drive beside it.
 */
import * as fs from 'fs';
import * as path from 'path';

import type { CreateComponentResponse } from '../src/tools/responses';

import { call, connect, copyFixture, TestSession } from './helpers';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { withRenderedPage } = require(path.resolve(__dirname, '..', '..', '..', 'scripts', 'devtools', 'render-report.js'));

jest.setTimeout(600000);

interface RenderedPage {
  navigate(urlPath: string): Promise<void>;
  evaluate(expression: string): Promise<string>;
}

const SETTLE_MS = 2500;
const settle = () => new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
const READ = `JSON.stringify({ title: document.title, text: document.body ? document.body.innerText : '' })`;
const setVariable = (value: string) => `(function () { Noodl.Variables.liveTitle = ${JSON.stringify(value)}; return 'ok'; })()`;
/**
 * In the app, not a page load: `page.navigate` is a CDP navigation, which reloads everything, so no page is ever kept
 * and nothing is "left". The first version of this drive left the Live page that way, and its last arm passed with the
 * Router's guard removed.
 */
const goInApp = (urlPath: string) => `(function () { Noodl.Navigation.navigateToPath(${JSON.stringify(urlPath)}); return 'ok'; })()`;

interface Visit {
  title: string;
  text: string;
}

describe('P109-S45-WIREDTITLE — a wired Page title reaches the browser tab', () => {
  let dir: string;
  let session: TestSession;
  let seen: Record<string, Visit>;

  beforeAll(async () => {
    dir = copyFixture();
    session = await connect(dir);

    const typed = await call<CreateComponentResponse>(session, 'create_component', {
      path: 'Pages/Typed',
      nodes: [
        { id: 'tp', type: 'Page', parameters: { title: 'Typed Title', urlPath: 'typed' } },
        { id: 'tt', type: 'Text', parent: 'tp', parameters: { text: 'typed page body' } }
      ]
    });
    expect(typed.isError).toBe(false);

    const wired = await call<CreateComponentResponse>(session, 'create_component', {
      path: 'Pages/Wired',
      nodes: [
        { id: 'wp', type: 'Page', parameters: { title: 'Typed Under The Wire', urlPath: 'wired' } },
        { id: 'wt', type: 'Text', parent: 'wp', parameters: { text: 'wired page body' } },
        { id: 'ws', type: 'String', parameters: { value: 'Wired Title' } }
      ],
      connections: [{ fromId: 'ws', fromProperty: 'savedValue', toId: 'wp', toProperty: 'title' }]
    });
    expect(wired.isError).toBe(false);

    const live = await call<CreateComponentResponse>(session, 'create_component', {
      path: 'Pages/Live',
      nodes: [
        // Kept when left (ISL-004): its Variable still hears a change while it is hidden, so the last arm grades the
        // Router's "only while showing" guard. A page that is deleted on leaving would pass that arm with no guard at all.
        { id: 'lp', type: 'Page', parameters: { title: 'Live Fallback', urlPath: 'live', keepWhenLeaving: true } },
        { id: 'lt', type: 'Text', parent: 'lp', parameters: { text: 'live page body' } },
        { id: 'lv', type: 'Variable2', parameters: { name: 'liveTitle' } }
      ],
      connections: [{ fromId: 'lv', fromProperty: 'value', toId: 'lp', toProperty: 'title' }]
    });
    expect(live.isError).toBe(false);

    seen = await withRenderedPage({ projectDir: dir }, async (page: RenderedPage) => {
      const out: Record<string, Visit> = {};
      const read = async (key: string) => {
        await settle();
        out[key] = JSON.parse(await page.evaluate(READ));
      };
      await page.navigate('/typed');
      await read('typed');
      await page.navigate('/wired');
      await read('wired');
      await page.navigate('/live');
      await read('liveFirst');
      await page.evaluate(setVariable('Live Changed'));
      await read('liveChanged');
      await page.evaluate(goInApp('/typed'));
      await read('typedAgain');
      await page.evaluate(setVariable('Changed After Leaving'));
      await read('afterLeaving');
      await page.evaluate(goInApp('/live'));
      await read('liveAgain');
      return out;
    });
  });

  afterAll(async () => {
    await session.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('every visit rendered its own page (the settle signal)', () => {
    expect(seen.typed.text).toContain('typed page body');
    expect(seen.wired.text).toContain('wired page body');
    expect(seen.liveFirst.text).toContain('live page body');
    expect(seen.typedAgain.text).toContain('typed page body');
    expect(seen.liveAgain.text).toContain('live page body');
  });

  it('a typed title still names the tab (the control)', () => {
    expect(seen.typed.title).toBe('Typed Title');
  });

  it('a wired title names the tab, over the typed one', () => {
    expect(seen.wired.title).toBe('Wired Title');
  });

  it('an empty wire falls back to the typed title', () => {
    expect(seen.liveFirst.title).toBe('Live Fallback');
  });

  it('the tab follows the wire when it changes while the page shows', () => {
    expect(seen.liveChanged.title).toBe('Live Changed');
  });

  it('a page that has been left no longer names the tab', () => {
    expect(seen.typedAgain.title).toBe('Typed Title');
    expect(seen.afterLeaving.title).toBe('Typed Title');
  });

  it('a kept page that comes back names the tab with the title it heard while hidden', () => {
    expect(seen.liveAgain.title).toBe('Changed After Leaving');
  });
});
