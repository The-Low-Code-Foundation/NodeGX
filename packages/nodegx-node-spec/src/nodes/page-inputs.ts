/**
 * Page Inputs (`PageInputs`) — read from `packages/noodl-viewer-react/src/nodes/navigation/page-inputs.ts`
 * on 2026-10-01 (NSP-015 s19).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: the node has no behaviour of its own. The Router that built its page
 * hands it the page's params (`_setPageParams`, world.ts ROUTE `page`) — at the build, and again when a
 * reset lands on the same page with other params — and each hand-off is MERGED into what it holds
 * (:55-60): every key handed is stored and its `pm-<key>` output, if the node has one, sends the value;
 * a key not handed keeps its old value (the Router's own TODO, router.tsx :520: "the old value will still
 * exist"). Nothing is cleared, nothing is coerced. Before any hand-off every output is `undefined` and
 * sends nothing.
 * The ports: one `pm-<name>` output per distinct non-empty name in Path Parameters and Query Parameters,
 * each split on `,` and NOT trimmed (setup :103-121) — derived from the params, so an editor can draw
 * them without a running viewer. Both lists are edit-only and do nothing else when written (:38-50).
 *
 * READ, worth a sentence: the Component Stack never calls `_setPageParams` — it hands a page its params as
 * the page component's own inputs (navigation-stack.tsx :974-977), so a Page Inputs inside a Component
 * Stack's page sends nothing (the docblocks at :54 and :82 say "the Router / Component Stack").
 */

import { defineNode, type OutputDecl } from '../spec';

type Rec = Readonly<Record<string, unknown>>;

type State = {
  /** :30 `_internal.params` — every value handed, by name */
  params: Rec;
  /** the `pm-` outputs this node has — what `hasOutput` answers (:58) */
  ports: readonly string[];
};

/** setup :103-114 — the distinct non-empty names in both stringlists, in order, untrimmed. */
function paramNames(params: Rec): string[] {
  const names = new Set<string>();
  for (const key of ['pathParams', 'queryParams']) {
    const value = params[key];
    if (typeof value !== 'string') continue;
    for (const name of value.split(',')) if (name !== '') names.add(name);
  }
  return Array.from(names);
}

export const PageInputs = defineNode({
  type: 'PageInputs',
  version: 1,
  source: 'packages/noodl-viewer-react/src/nodes/navigation/page-inputs.ts',
  needs: ['router'],
  worldPool: {
    routers: [
      {},
      { page: [{ params: { id: 1 } }] },
      { page: [{ params: { id: 1, tab: 'a' } }, { at: 1, params: { id: 2 } }] },
      { page: [{ params: { id: 'x', extra: true } }, { at: 10, params: { id: 'x', tab: null } }] },
      { page: [{ at: 2, params: { tab: 'b', name: { first: 'A' } } }] }
    ],
    advances: [0, 1, 2, 10]
  },

  // :27-31 initialize
  state: { params: {}, ports: [] } as State,
  init: (_world, params) => ({ ports: paramNames(params).map((n) => 'pm-' + n) }),

  inputs: {
    // :33-41 — stored, read by nothing at run time
    pathParams: { type: 'stringlist', coerce: 'none', displayName: 'Path Parameters', group: 'Path Parameters', description: 'Names of the braced segments in this page’s route, one output port each', examples: ['id', 'id,tab', ''] },
    // :42-50
    queryParams: { type: 'stringlist', coerce: 'none', displayName: 'Query Parameters', group: 'Query Parameters', description: 'Names of query-string parameters to read from the URL, one output port each', examples: ['tab', 'tab,name', ''] }
  },

  outputs: {}
}).on(
  {},
  {
    derived: {
      inputs: () => ({}),
      // setup :115-121 — `pm-<name>`, type `*`, group Parameters; :69-72 the getter reads the stored value
      outputs: (params) => {
        const out: Record<string, OutputDecl<State>> = {};
        for (const name of paramNames(params)) {
          out['pm-' + name] = { type: '*', displayName: name, group: 'Parameters', description: 'The page parameter ' + name + ', as the Router handed it', from: (s) => s.params[name] };
        }
        return out;
      },
      on: () => ({ sendDerived: [] })
    },
    world: {
      // :55-60 `_setPageParams` — merge; flag `pm-<key>` for every key handed that has an output
      page: (s, _inputs, params) => {
        const keys = Object.keys(params);
        return { set: { params: { ...s.params, ...params } }, sendDerived: keys.map((k) => 'pm-' + k).filter((p) => s.ports.includes(p)) };
      }
    }
  }
);
