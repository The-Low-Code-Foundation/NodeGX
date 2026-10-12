/**
 * P107 R20 (s87, "Error, as the agent does") — the editor's Problems panel refuses a wire to a port the node cannot have,
 * on a type whose ports appear at run time, as the agent server does since R19.
 *
 * Graded through the panel's own service (`ProjectValidationService.revalidateNow`, which validates
 * `ProjectModel.instance.toJSON()`): the live model is a legacy project — nodes as nested trees — and the service hands
 * the validator `drawnPortLookup` over `portProjectFromLegacy` of it. The project is CMG Drive Looks' shape, cut down:
 * a product card whose Add to Basket button's `onClick` is wired to its Component Outputs' `addToBasket`, a shop that
 * repeats the card with a For Each, and a wire from the For Each's `addToBasket` — a port For Each never registers
 * (foreach.tsx :1081-1096: only `itemOutput-` and `itemOutputSignal-` names), so the press never reached the page.
 *
 *   cd packages/noodl-editor && npx jest tests-unit/nsp-020/problems-panel-wire-check
 */
const live: { json: unknown } = { json: undefined };

jest.mock('@noodl-models/projectmodel', () => ({ ProjectModel: { instance: { toJSON: () => live.json } } }));

// eslint-disable-next-line import/first
import { ProjectValidationService } from '../../src/editor/src/views/panels/ProblemsPanel/ProjectValidationService';
// eslint-disable-next-line import/first
import { DiagnosticCode } from '../../src/editor/src/validation/diagnostics';

const shop = (fromProperty: string) => ({
  metadata: {},
  components: [
    {
      name: '/Components/ProductCard',
      graph: {
        roots: [
          { id: 'card', type: 'Group', parameters: {}, children: [{ id: 'add_button', type: 'net.noodl.controls.button', parameters: { label: 'Add to Basket' } }] },
          { id: 'outputs', type: 'Component Outputs', parameters: {}, ports: [{ name: 'addToBasket', plug: 'input', type: 'signal', index: 0 }] }
        ],
        connections: [{ fromId: 'add_button', fromProperty: 'onClick', toId: 'outputs', toProperty: 'addToBasket' }]
      }
    },
    {
      name: '/Pages/Shop',
      graph: {
        roots: [
          { id: 'page', type: 'Group', parameters: {}, children: [{ id: 'list', type: 'For Each', parameters: { template: '/Components/ProductCard' } }] },
          { id: 'count', type: 'Counter', parameters: {} }
        ],
        connections: [{ fromId: 'list', fromProperty, toId: 'count', toProperty: 'increase' }]
      }
    }
  ]
});

function report(fromProperty: string) {
  live.json = shop(fromProperty);
  const service = ProjectValidationService.instance;
  service.revalidateNow();
  return service.report?.diagnostics ?? [];
}

describe('P107 R20 — the Problems panel checks a wire with the spec, as the agent server does', () => {
  it('refuses For Each `addToBasket` as an error and names `itemOutputSignal-addToBasket`', () => {
    const errors = report('addToBasket').filter((d) => d.code === DiagnosticCode.NonexistentPort && d.severity === 'error');
    expect(errors.map((d) => [d.location.component, d.location.nodeId, d.location.plug, d.location.port])).toEqual([['/Pages/Shop', 'list', 'output', 'addToBasket']]);
    expect(errors[0].suggestion).toBe('itemOutputSignal-addToBasket');
  });

  it('passes the wire to the port the card gives it — known-firing beside the refusal, through the same service', () => {
    const onList = report('itemOutputSignal-addToBasket').filter((d) => d.location.nodeId === 'list' && d.severity === 'error');
    expect(onList).toEqual([]);
  });

  it('a port the catalog names passes as before', () => {
    expect(report('itemsRendered').filter((d) => d.code === DiagnosticCode.NonexistentPort)).toEqual([]);
  });
});
