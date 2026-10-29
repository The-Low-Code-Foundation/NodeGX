/**
 * P125-GOOSE-NOEVAL — a host whose MCP Apps sandbox forbids eval (Goose Desktop) gets Studio framed from its own
 * origin, and the resource names that origin in `frameDomains`. Claude Desktop keeps the rewritten page and no
 * `frameDomains` (it restricts them).
 *
 * The panel itself was graded in Goose Desktop 1.57.0 over CDP (`dev-docs/tasks/phase-112-your-own-nodegx/own-030/goose/`).
 *
 * @module noodl-mcp/tests/p125GooseNoEval
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { clientForbidsEval } from '../src/clientApps';
import { framedPanelHtml, studioResourceMeta } from '../src/tools/openStudio';

const ORIGIN = 'http://127.0.0.1:61409';
const asClient = (name: string): McpServer => ({ server: { getClientVersion: () => ({ name, version: '1' }) } }) as unknown as McpServer;

describe('P125-GOOSE-NOEVAL', () => {
  const saved = process.env.NODEGX_PANEL_FRAME;
  afterEach(() => {
    if (saved === undefined) delete process.env.NODEGX_PANEL_FRAME;
    else process.env.NODEGX_PANEL_FRAME = saved;
  });

  it('Goose Desktop forbids eval; Claude Desktop and the Goose CLI do not', () => {
    delete process.env.NODEGX_PANEL_FRAME;
    expect(clientForbidsEval(asClient('goose-app'))).toBe(true);
    expect(clientForbidsEval(asClient('claude-ai'))).toBe(false);
    expect(clientForbidsEval(asClient('goose-cli'))).toBe(false);
  });

  it('NODEGX_PANEL_FRAME=1 forces the framed panel for any host', () => {
    process.env.NODEGX_PANEL_FRAME = '1';
    expect(clientForbidsEval(asClient('claude-ai'))).toBe(true);
  });

  it('the framed resource names Studio in frameDomains; the rewritten one does not', () => {
    const framed = studioResourceMeta(ORIGIN, true) as { ui: { csp: Record<string, string[]> } };
    const plain = studioResourceMeta(ORIGIN) as { ui: { csp: Record<string, string[]> } };
    expect(framed.ui.csp.frameDomains).toEqual([ORIGIN]);
    expect(framed.ui.csp.resourceDomains).toContain(ORIGIN);
    expect(plain.ui.csp.frameDomains).toBeUndefined();
  });

  it('the framed panel frames Studio\'s compact panel page from its origin and relays the host\'s messages both ways', () => {
    const html = framedPanelHtml(ORIGIN);
    expect(html).toContain(`src="${ORIGIN}/panel"`);
    expect(html).toContain('parent.postMessage(e.data');
    expect(html).toContain('inner.contentWindow?.postMessage(e.data');
    // nothing in the wrapper itself needs eval
    expect(html).not.toMatch(/new Function|eval\(/);
  });
});

describe('P125-GOOSE-LONGLIST', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { pickProjects, LIST_PROJECTS_CAP } = require('../src/tools/listProjects') as typeof import('../src/tools/listProjects');
  const rows = Array.from({ length: 71 }, (_, i) => ({
    name: i === 40 ? 'Puppy test 3' : `bakery ${i}`,
    directory: `/p/${i === 40 ? 'Puppy test 3' : `own-029-K1-bakery-r${i}`}`,
    format: 'v2' as const
  }));

  it('returns the newest rows up to the cap, and says how many more there are', () => {
    const { rows: shown, more } = pickProjects(rows);
    expect(shown).toHaveLength(LIST_PROJECTS_CAP);
    expect(more).toBe(71 - LIST_PROJECTS_CAP);
  });

  it('a query finds an older project by name, case-insensitively, past the cap', () => {
    const { rows: shown, more } = pickProjects(rows, 'puppy');
    expect(shown.map((r) => r.name)).toEqual(['Puppy test 3']);
    expect(more).toBe(0);
  });
});
