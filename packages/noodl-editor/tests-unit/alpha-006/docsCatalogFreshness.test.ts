/**
 * ALPHA-006 — the docs generator is not allowed to grade a stale input.
 *
 * `scripts/generate-node-docs.js` renders one page per node from
 * `node-catalog-enriched.json`, which is itself produced by `catalog:merge` from
 * `node-catalog.json` plus the authored enrichment. Until 2026-08-27 the script read only the
 * enriched file, so a sweep that ran `catalog:generate` and **not** `catalog:merge` left it
 * describing the previous registries — and `docs:nodes:check` compared pages generated from that
 * stale artifact against pages generated from the same stale artifact and reported *clean*.
 *
 * ⚠️ **That was measured before the guard was written**, by mutating one `docs` field in
 * `node-catalog.json`: `docs:nodes:check` printed *"clean. 194 generated files match 175 catalog
 * nodes"*. `catalog:merge:check` did catch it, so the sweep as a whole was not blind — but a docs
 * gate that cannot see its own input is stale only works while somebody remembers to run a
 * different gate beside it, which is the habit this replaces.
 *
 * 🔴 **The row that matters most here is `accepts a catalog that differs only by enrichment`.**
 * Every other row in this file is satisfied by a guard that throws unconditionally; that one is
 * the negative control, and without it "all the staleness rows are red" would prove nothing about
 * whether the guard can ever say yes.
 *
 * These run in plain Node against synthetic catalogs on disk — the real artifacts are not touched,
 * so this cannot go red because somebody legitimately regenerated the catalog.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { assertEnrichedCatalogIsFresh, StaleCatalogError, renderRulesSection } =
  require('../../../../scripts/generate-node-docs.js') as {
    assertEnrichedCatalogIsFresh: (enriched: unknown, structuralPath?: string) => void;
    StaleCatalogError: new (message: string) => Error;
    renderRulesSection: (node: unknown) => string;
  };

type CatalogNode = { typeName: string; displayName: string; docs?: string; enrichment?: unknown };

function structuralNode(typeName: string, overrides: Partial<CatalogNode> = {}): CatalogNode {
  return { typeName, displayName: typeName, docs: `https://example.invalid/${typeName}`, ...overrides };
}

describe('ALPHA-006 — docs generation refuses a stale enriched catalog', () => {
  let dir: string;
  let structuralPath: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-freshness-'));
    structuralPath = path.join(dir, 'node-catalog.json');
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  /** Writes the structural half and returns the enriched half that `catalog:merge` would produce. */
  function writeStructural(nodes: CatalogNode[]) {
    fs.writeFileSync(structuralPath, JSON.stringify({ catalogFormatVersion: '1.1.0', nodes }, null, 2));
  }

  test('accepts an enriched catalog that matches the structural one exactly', () => {
    const nodes = [structuralNode('Set Variable'), structuralNode('Text Input')];
    writeStructural(nodes);

    expect(() => assertEnrichedCatalogIsFresh({ nodes }, structuralPath)).not.toThrow();
  });

  /**
   * 🔴 The negative control. `merge.js` builds each entry as `{ ...n, enrichment }`, so the
   * enrichment key is exactly what the comparison must ignore — a guard that did not strip it
   * would reject every correctly-merged catalog in the repository, and every other row here would
   * still be green.
   */
  test('accepts a catalog that differs only by enrichment, which is what a merge adds', () => {
    const nodes = [structuralNode('Set Variable'), structuralNode('Text Input')];
    writeStructural(nodes);

    const enriched = {
      nodes: nodes.map((n) => ({ ...n, enrichment: { summary: 'authored prose', examples: ['x'] } }))
    };

    expect(() => assertEnrichedCatalogIsFresh(enriched, structuralPath)).not.toThrow();
  });

  test('rejects a node whose structural fields moved — the defect that reported clean', () => {
    const nodes = [structuralNode('Set Variable'), structuralNode('Text Input')];
    writeStructural(nodes);

    // The catalog was regenerated with a changed `docs` field; the merge was not re-run.
    const enriched = { nodes: nodes.map((n) => (n.typeName === 'Set Variable' ? { ...n, docs: 'stale' } : n)) };

    expect(() => assertEnrichedCatalogIsFresh(enriched, structuralPath)).toThrow(StaleCatalogError);
    expect(() => assertEnrichedCatalogIsFresh(enriched, structuralPath)).toThrow(/1 node\(s\) differing \(Set Variable\)/);
  });

  test('rejects a node the registries gained that the enriched catalog has never seen', () => {
    writeStructural([structuralNode('Set Variable'), structuralNode('Brand New Node')]);

    const enriched = { nodes: [structuralNode('Set Variable')] };

    expect(() => assertEnrichedCatalogIsFresh(enriched, structuralPath)).toThrow(
      /1 node\(s\) absent from it \(Brand New Node\)/
    );
  });

  test('rejects a node the registries lost that the enriched catalog still lists', () => {
    writeStructural([structuralNode('Set Variable')]);

    const enriched = { nodes: [structuralNode('Set Variable'), structuralNode('Deleted Node')] };

    expect(() => assertEnrichedCatalogIsFresh(enriched, structuralPath)).toThrow(
      /1 node\(s\) it still lists \(Deleted Node\)/
    );
  });

  /**
   * ⚠️ A guard that stands down when it cannot run reinstates the green-on-an-unasked-question it
   * exists to prevent, so both unreadable-input cases are failures rather than skips.
   */
  test('a missing structural catalog is an error, not a skip', () => {
    expect(() => assertEnrichedCatalogIsFresh({ nodes: [] }, path.join(dir, 'nope.json'))).toThrow(
      /is missing, so the enriched catalog's freshness cannot be checked/
    );
  });

  test('an unparseable structural catalog is an error, not a skip', () => {
    fs.writeFileSync(structuralPath, '{ not json');

    expect(() => assertEnrichedCatalogIsFresh({ nodes: [] }, structuralPath)).toThrow(
      /could not be parsed, so the enriched catalog's freshness cannot be checked/
    );
  });

  /** Key order is a serialisation detail, not staleness — the comparison is canonical. */
  test('does not mistake a reordered key for a changed node', () => {
    writeStructural([{ typeName: 'Set Variable', displayName: 'Set Variable', docs: 'https://example.invalid/x' }]);

    const enriched = { nodes: [{ docs: 'https://example.invalid/x', displayName: 'Set Variable', typeName: 'Set Variable' }] };

    expect(() => assertEnrichedCatalogIsFresh(enriched, structuralPath)).not.toThrow();
  });
});

/**
 * NSP-018 §6.4 — the generated page says what each input does, in the spec's own words.
 *
 * `catalog:generate` writes `rules: { [inputPortName]: string[] }` on every specced node (one
 * line per reducer branch, `<case> → <what the wire carries>`), and the page renders them under
 * the input port tables. The two rows here are the rendered shape and the absent shape; the third
 * reads the committed Counter page, because `docs:nodes:check` can only say the tree matches the
 * generator, not that the generator put the rules anywhere.
 */
describe("NSP-018 — the page renders each specced input's rules under the port table", () => {
  const COUNTER_PAGE = path.resolve(__dirname, '../../../../docs-site/docs/nodes/math/counter.md');

  test('renders one headed bullet list per input that has lines, in catalog order', () => {
    const node = {
      typeName: 'Counter',
      inputs: [
        { name: 'increase', displayName: 'Increase Count' },
        { name: 'reset', displayName: 'Reset To Start' }
      ],
      rules: {
        increase: [
          'at Max Value with Limits Enabled → Unchanged; Count Changed stays silent',
          'otherwise up by one → Done'
        ],
        reset: ['already at Start Value → Unchanged'],
        // A port the table does not list falls back to its code name; an empty list is skipped.
        orphan: ['a <case> → nothing'],
        silent: []
      }
    };

    expect(renderRulesSection(node)).toBe(
      [
        '### What each input does',
        '',
        '**Increase Count** (`increase`)',
        '',
        '- at Max Value with Limits Enabled → Unchanged; Count Changed stays silent',
        '- otherwise up by one → Done',
        '',
        '**Reset To Start** (`reset`)',
        '',
        '- already at Start Value → Unchanged',
        '',
        '**orphan** (`orphan`)',
        '',
        '- a &lt;case> → nothing',
        ''
      ].join('\n')
    );
  });

  test('a node without rules gets no section — absent, not empty', () => {
    expect(renderRulesSection({ typeName: 'Text', inputs: [{ name: 'text' }] })).toBe('');
    expect(renderRulesSection({ typeName: 'Text', inputs: [], rules: {} })).toBe('');
    expect(renderRulesSection({ typeName: 'Text', inputs: [], rules: { text: [] } })).toBe('');
  });

  test('the committed Counter page carries its rules between the input tables and the outputs', () => {
    const page = fs.readFileSync(COUNTER_PAGE, 'utf8');
    const inputs = page.indexOf('## Inputs');
    const rules = page.indexOf('### What each input does');
    const outputs = page.indexOf('## Outputs');
    expect(inputs).toBeGreaterThan(-1);
    expect(rules).toBeGreaterThan(inputs);
    expect(outputs).toBeGreaterThan(rules);
    expect(page).toContain(
      '**Increase Count** (`increase`)\n\n- at Max Value with Limits Enabled → Unchanged; Count Changed stays silent'
    );
  });
});
