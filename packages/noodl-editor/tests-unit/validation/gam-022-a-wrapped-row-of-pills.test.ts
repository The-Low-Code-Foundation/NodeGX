/**
 * GAM-022 — a wrapped row of pills is not told to become columns.
 *
 * P78 D50: `uncollapsible-multi-column`'s Arm B fired on every wrapped row with a gutter and a
 * `For Each`, and told TPL-006's tag sidebar and Rocket School's choice row to become a Columns
 * autoFit at 260-320px. Their items are content-sized pills; following the advice gives every pill
 * a 300px column.
 *
 * 🔴 The register read it as "Arm A has the exclusion Arm B is missing". Arm A's exclusion reads
 * the CONTAINER, and both D50 containers are full-width. What is content-sized is the ITEM, so the
 * item is what is judged here: the `For Each` template's visual root, resolved through the views.
 *
 * The firing shapes are the three calibration grids, read off disk on 2026-09-15 (GAM-022 §8):
 * `Puppy test 3`'s PuppyCard (Group, contentHeight, 340px), the reference build's ProductCard
 * (Group, width 32%), and sonnet's Product Card (Group, width 31%, beside a RouterNavigate root).
 */

import { loadDefaultCatalog } from '../../src/editor/src/validation/catalog';
import { DiagnosticCode } from '../../src/editor/src/validation/diagnostics';
import { checkResponsiveArrangement } from '../../src/editor/src/validation/responsiveArrangement';

const catalog = loadDefaultCatalog();

// Cast rather than typed: the options gained `views` and `connectedInputs` in this task, and the
// spec has to compile against HEAD's signature to record its red there.
type Options = Parameters<typeof checkResponsiveArrangement>[1];

interface ViewNode {
  id: string;
  type: string;
  parameters?: Record<string, unknown>;
  children?: string[];
}

/** `Story/Sidebar#sbList` as it is on disk: full width, content height, wrapped, with a gutter. */
const PILL_ROW = {
  flexDirection: 'row',
  flexWrap: 'wrap',
  sizeMode: 'contentHeight',
  width: { value: 100, unit: '%' },
  columnGap: 'var(--space-2)'
};

function grid(
  template: string,
  extra: { views?: Array<{ name: string; nodes: ViewNode[] }>; connectedInputs?: Set<string> } = {},
  container: Record<string, unknown> = PILL_ROW
) {
  return checkResponsiveArrangement(
    [
      { id: 'sbList', type: 'Group', label: 'The things', children: ['rep'], parameters: container },
      { id: 'rep', type: 'For Each', children: [], parameters: { template } }
    ],
    { component: '/Story/Sidebar', catalog, ...extra } as Options
  );
}

const inputs = (id: string): ViewNode => ({ id, type: 'Component Inputs', parameters: {} });
const text = (id: string): ViewNode => ({ id, type: 'Text', parameters: { text: 'x' } });

/** One item component, whose only visual root is `root`. */
function itemView(name: string, root: ViewNode, ...rest: ViewNode[]) {
  return [{ name, nodes: [root, ...rest] }];
}

describe('GAM-022 — Arm B judges the item a wrapped row draws, not the row', () => {
  it('fixture precondition: the pill row is exactly the D50 container, which Arm A would NOT exclude', () => {
    // The wrong fix (porting Arm A's container exclusion) reads this, and this is not content-width.
    expect(['contentWidth', 'contentSize']).not.toContain(PILL_ROW.sizeMode);
    expect(PILL_ROW.width).toEqual({ value: 100, unit: '%' });
  });

  describe('silent: the items are as wide as their contents', () => {
    it('AC1/AC2 — TPL-006 Story/Carried: a contentSize Group pill', () => {
      const views = itemView(
        '/Story/Carried',
        { id: 'caPill', type: 'Group', children: ['caText'], parameters: { sizeMode: 'contentSize', flexDirection: 'row' } },
        text('caText')
      );
      expect(grid('/Story/Carried', { views })).toEqual([]);
    });

    it('Rocket School Game/Choice: a contentSize Group among logic roots', () => {
      const views = [
        {
          name: '/Game/Choice',
          nodes: [
            inputs('chIn'),
            { id: 'chPill', type: 'Group', children: ['chText'], parameters: { sizeMode: 'contentSize' } },
            text('chText'),
            { id: 'chCond', type: 'Condition', parameters: {} },
            { id: 'chStates', type: 'States', parameters: {} },
            { id: 'chOut', type: 'Component Outputs', parameters: {} }
          ]
        }
      ];
      expect(grid('/Game/Choice', { views })).toEqual([]);
    });

    it('a contentWidth Group item', () => {
      const views = itemView('/Pill', { id: 'p', type: 'Group', parameters: { sizeMode: 'contentWidth' } });
      expect(grid('/Pill', { views })).toEqual([]);
    });

    it('a Button item with sizeMode unset, read through the catalog default (contentSize)', () => {
      const views = itemView('/Option button', { id: 'b', type: 'net.noodl.controls.button', parameters: { label: 'Go' } });
      expect(grid('/Option button', { views })).toEqual([]);
    });
  });

  describe('firing: the items were given a width', () => {
    it('AC2 — the same pill row whose item is explicit at 300px', () => {
      const views = itemView('/Card', {
        id: 'c',
        type: 'Group',
        parameters: { sizeMode: 'explicit', width: { value: 300, unit: 'px' } }
      });
      const found = grid('/Card', { views });
      expect(found.map((d) => d.code)).toEqual([DiagnosticCode.UncollapsibleMultiColumn]);
      expect(found[0].location.nodeId).toBe('sbList');
      expect(found[0].location.port).toBe('flexWrap');
    });

    it('calibration 1 — Puppy test 3 /Components/PuppyCard: contentHeight at 340px', () => {
      const views = itemView(
        '/Components/PuppyCard',
        { id: 'pc', type: 'Group', parameters: { sizeMode: 'contentHeight', width: { value: 340, unit: 'px' } } },
        inputs('pcIn')
      );
      expect(grid('/Components/PuppyCard', { views }).map((d) => d.code)).toEqual([DiagnosticCode.UncollapsibleMultiColumn]);
    });

    it('calibration 2 — ecommerce-example /Components/ProductCard: sizeMode unset (explicit), 32%', () => {
      const views = itemView(
        '/Components/ProductCard',
        { id: 'prc', type: 'Group', parameters: { width: { value: 32, unit: '%' } } },
        inputs('prcIn')
      );
      expect(grid('/Components/ProductCard', { views }).map((d) => d.code)).toEqual([
        DiagnosticCode.UncollapsibleMultiColumn
      ]);
    });

    it('calibration 3 — phase55-replay-sonnet /Cards/Product Card: 31%, beside a RouterNavigate root', () => {
      const views = [
        {
          name: '/Cards/Product Card',
          nodes: [
            inputs('spIn'),
            { id: 'sp', type: 'Group', parameters: { width: { value: 31, unit: '%' } } },
            { id: 'spNav', type: 'RouterNavigate', parameters: {} }
          ]
        }
      ];
      expect(grid('/Cards/Product Card', { views }).map((d) => d.code)).toEqual([DiagnosticCode.UncollapsibleMultiColumn]);
    });

    it('AC4 — a content-sized CONTAINER of sized items still fires (Arm A\'s exclusion was not ported)', () => {
      // Rocket School /Pages/Profiles#pfList: contentSize row, 150px profile cards.
      const views = itemView('/Game/Profile card', {
        id: 'pf',
        type: 'Group',
        parameters: { sizeMode: 'contentHeight', width: { value: 150, unit: 'px' } }
      });
      const container = { flexDirection: 'row', flexWrap: 'wrap', sizeMode: 'contentSize', columnGap: 'var(--space-4)' };
      expect(grid('/Game/Profile card', { views }, container).map((d) => d.code)).toEqual([
        DiagnosticCode.UncollapsibleMultiColumn
      ]);
    });

    it('a caller that supplies no views is judged as before: the check cannot read the item, so it fires', () => {
      expect(grid('/Story/Carried').map((d) => d.code)).toEqual([DiagnosticCode.UncollapsibleMultiColumn]);
    });
  });

  describe('unknowable item roots abstain (none of the three calibration grids is one)', () => {
    const sized = { sizeMode: 'explicit', width: { value: 300, unit: 'px' } };

    it('a template no view names', () => {
      expect(grid('/Nowhere', { views: itemView('/Card', { id: 'c', type: 'Group', parameters: sized }) })).toEqual([]);
    });

    it('a template fed by a wire', () => {
      const views = itemView('/Card', { id: 'c', type: 'Group', parameters: sized });
      expect(grid('/Card', { views, connectedInputs: new Set(['rep::template']) })).toEqual([]);
    });

    it('an item whose visual root is a component instance', () => {
      expect(grid('/Card', { views: itemView('/Card', { id: 'c', type: '/Inner', parameters: {} }) })).toEqual([]);
    });

    it('an item rooted at a Component Children placeholder', () => {
      const views = [
        {
          name: '/Tag',
          nodes: [
            { id: 'pco', type: 'net.noodl.ParentComponentObject', parameters: {} },
            { id: 'g', type: 'Group', parameters: sized }
          ]
        }
      ];
      expect(grid('/Tag', { views })).toEqual([]);
    });

    it('an item with two visual roots', () => {
      const views = [
        {
          name: '/Card',
          nodes: [
            { id: 'a', type: 'Group', parameters: sized },
            { id: 'b', type: 'Group', parameters: sized }
          ]
        }
      ];
      expect(grid('/Card', { views })).toEqual([]);
    });
  });
});
