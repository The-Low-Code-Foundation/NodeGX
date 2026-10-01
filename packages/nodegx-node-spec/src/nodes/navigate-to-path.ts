/**
 * Navigate To Path (`PageStackNavigateToPath`) — read from
 * `packages/noodl-viewer-react/src/nodes/navigation/navigate-to-path.ts` on 2026-10-01 (NSP-015 s17).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: `Navigate` defers its answer to the frame's end (:96-98, :120-141)
 * — every press in a frame is answered, all with the ONE outcome of ONE navigation, made against the
 * frame's final inputs. That navigation, the first of these that holds:
 *   - no Path (`undefined`) is Failure `navigate-to-path/no-path`, Error "No path to navigate to",
 *     with or without a window (:150-160);
 *   - otherwise the URL is built (:162-192): every `{name}` in Path (letters, digits, `_`; one
 *     replacement per occurrence) is replaced, first occurrence first, by `String(<p-name>)` — `''`
 *     for a parameter never set — with JavaScript's `String.prototype.replace`, so a `$&`, `$$`,
 *     `` $` `` or `$'` in a VALUE is expanded as a replacement pattern (as String Format's D3); the
 *     project's `navigationPathType` (world.ts PROJECT) puts the result after a `#` when it is
 *     unset or `'hash'`, and in the path for anything else; the Query names, split on `,` and
 *     neither trimmed nor de-duplicated, add `name=value` for each whose value is not `undefined`,
 *     joined by `&` after a `?`, unencoded. The URL is `path` + `?query` + `#hash`, each only when
 *     present;
 *   - no window — a server render — is Unchanged, and nothing is opened or pushed (:199-202);
 *   - Open In New Tab (truthy, :88-90) hands the URL to `window.open(url, '_blank')` — no features
 *     (:205); a `null` handle (world.ts LOCATION: the popup blocker refused) is Failure
 *     `navigate-to-path/blocked`, Error "The browser blocked opening a new tab" (:206-215);
 *   - otherwise the URL is pushed (`history.pushState({}, '', url)`, :218) and the node dispatches
 *     `popstate` on the window itself (:219) — a push fires none — and is Done (:222).
 * The `p-<name>` and `q-<name>` ports are registered on first write (:230-245) and the editor draws
 * one per unique placeholder in Path and one per Query name (:270-310); each stores its value raw.
 * Error keeps its last message — nothing clears it — and is sent each time it is set.
 *
 * TWO ROWS (NSP-015 §6.2), where the runtime THROWS inside the frame-end callback — the scheduler
 * logs it (nodecontext.ts :466-472) and every press of that frame goes unanswered, for good:
 *   C24 — a Path that is not text (`null`, a number; :162 `.match`) throws before any branch. The
 *         spec reads it as no Path (Failure `navigate-to-path/no-path`); proposed, not the runtime.
 *   C25 — a push the browser refuses (a path on another origin — `https://…` or `//…` with the
 *         `path` type; world.ts LOCATION) throws at :218, after the call. The spec records the push
 *         and answers Failure `navigate-to-path/refused`, Error "The browser refused to navigate to
 *         this path"; proposed, not the runtime.
 */

import { defineNode, type ValueInputDecl, type WorldView } from '../spec';

const NO_PATH = 'No path to navigate to';
const BLOCKED = 'The browser blocked opening a new tab';
const REFUSED = 'The browser refused to navigate to this path';

type State = {
  path: unknown;
  queryNames: unknown;
  openInNewTab: boolean;
  /** :224-226 `_internal.params` — the `p-` values by placeholder name */
  params: Readonly<Record<string, unknown>>;
  /** :227-229 `_internal.query` — the `q-` values by query name */
  query: Readonly<Record<string, unknown>>;
  /** `_internal.lastError` */
  error: string | undefined;
  /** :129-140 `hasScheduledNavigate` */
  scheduled: boolean;
  /** :122-125 `pendingNavigateOutcomes.length` — the presses this frame's navigation answers */
  presses: number;
};

/** :162-168 — every `{name}` in order, a repeated one each time it appears. */
function placeholders(path: string): string[] {
  return (path.match(/\{[A-Za-z0-9_]*\}/g) ?? []).map((m) => m.replace('{', '').replace('}', ''));
}

/** :162-192 — the URL a navigation hands the browser. */
export function compileUrl(path: string, params: Readonly<Record<string, unknown>>, queryNames: unknown, query: Readonly<Record<string, unknown>>, world: WorldView): string {
  let formatted = path;
  for (const name of placeholders(path)) {
    const v = params[name];
    // a STRING pattern replaces the first occurrence; the replacement's `$` patterns are expanded (:172)
    formatted = formatted.replace('{' + name + '}', v !== undefined ? String(v) : '');
  }
  const type = world.projectSettings().navigationPathType; // :176
  const hash = type === undefined || type === 'hash';
  const parts: string[] = [];
  if (queryNames !== undefined) {
    for (const q of (queryNames as string).split(',')) {
      if (query[q] !== undefined) parts.push(q + '=' + query[q]); // :184 — `+`, unencoded
    }
  }
  return (hash ? '' : formatted) + (parts.length >= 1 ? '?' + parts.join('&') : '') + (hash ? '#' + formatted : '');
}

// :235-245 — `registerInput(name, { set })`: no type, no conversion; the editor draws `type: '*'` (:284, :298)
const parameterPort = (): ValueInputDecl => ({ type: '*', coerce: 'none', group: 'Parameter', examples: ['42', 7, '', null, 'a b', '$&'] });
const queryPort = (): ValueInputDecl => ({ type: '*', coerce: 'none', group: 'Query', examples: ['x', 2, '', null, 'a&b'] });

export const NavigateToPath = defineNode({
  type: 'PageStackNavigateToPath',
  version: 1,
  source: 'packages/noodl-viewer-react/src/nodes/navigation/navigate-to-path.ts',
  needs: ['location', 'project'],
  worldPool: {
    projectSettings: [{}, { navigationPathType: 'hash' }, { navigationPathType: 'path' }]
  },

  // :55-60 initialize
  state: { path: undefined, queryNames: undefined, openInNewTab: false, params: {}, query: {}, error: undefined, scheduled: false, presses: 0 } as State,
  // :104-115 outcomeOutputs({ done, unchanged, failure })
  outcomes: ['done', 'unchanged', 'failure'],

  inputs: {
    // :62-70 — stored raw
    path: {
      type: 'string',
      coerce: 'none',
      displayName: 'Path',
      group: 'General',
      description: 'Path to navigate to; wrap a segment in braces, as in /product/{id}, to get an input port for it',
      examples: ['/product/{id}', '/home', '/a/{x}/{x}', 'https://other.example/x', '//other.example', '', null, 5]
    },
    // :71-80 — stored raw; a parameter (allowEditOnly), so text
    queryNames: {
      type: 'stringlist',
      coerce: 'none',
      editOnly: true,
      displayName: 'Query',
      group: 'Query',
      description: 'Names of query-string parameters to append, one input port each; a parameter left unset is omitted from the URL',
      examples: ['page', 'page,sort', 'a, b', '']
    },
    // :81-91 — `!!value`; the default is seeded at creation
    openInNewTab: {
      type: 'boolean',
      default: false,
      coerce: 'none',
      displayName: 'Open in new tab',
      group: 'General',
      description: 'Opens the path in a new browser tab instead of navigating this one',
      examples: [true, false, undefined, 'yes', 0]
    },
    // :92-100
    navigate: { type: 'signal', outcome: true, displayName: 'Navigate', group: 'Actions', description: 'Navigates to Path, filling in any brace placeholders from their input ports' }
  },

  outputs: {
    // :116-125
    error: { type: 'string', from: (s) => s.error, displayName: 'Error', group: 'Error', description: 'Why the navigation did not happen, set just before Failure fires' }
  }
}).on(
  {
    path: (_s, v) => ({ set: { path: v }, send: [] }),
    queryNames: (_s, v) => ({ set: { queryNames: v }, send: [] }),
    openInNewTab: (_s, v) => ({ set: { openInNewTab: !!v }, send: [] }),
    // :96-98, :120-141 — every press is answered at the frame's end
    navigate: (s) => ({ set: { scheduled: true, presses: s.presses + 1 }, send: [], outcome: 'deferred' })
  },
  {
    // :143-223 — ONE navigation for the frame's presses, each answered with its outcome
    afterInputs: (s, _inputs, world) => {
      if (!s.scheduled) return { send: [] };
      const reset = { scheduled: false, presses: 0 };
      const answer = (outcome: 'done' | 'unchanged' | 'failure', error?: string) =>
        Array.from({ length: s.presses }, () => (error === undefined ? { port: 'navigate', outcome } : { port: 'navigate', outcome, error }));
      // :150-160 — and C24: a Path that is not text throws at :162 in the runtime; read as no Path here
      if (typeof s.path !== 'string') {
        return { set: { ...reset, error: NO_PATH }, send: ['error'], outcomes: answer('failure', 'navigate-to-path/no-path') };
      }
      const url = compileUrl(s.path, s.params, s.queryNames, s.query, world);
      if (!world.viewport()) return { set: reset, send: [], outcomes: answer('unchanged') }; // :199-202
      if (s.openInNewTab) {
        const open = { url, target: '_blank' }; // :205 — no features
        if (!world.opens('_blank', undefined)) {
          return { set: { ...reset, error: BLOCKED }, send: ['error'], open, outcomes: answer('failure', 'navigate-to-path/blocked') }; // :206-215
        }
        return { set: reset, send: [], open, outcomes: answer('done') }; // :222
      }
      // C25: a push the browser refuses throws at :218 in the runtime — recorded, then refused here
      if (!world.pushes(url)) {
        return { set: { ...reset, error: REFUSED }, send: ['error'], push: { url }, outcomes: answer('failure', 'navigate-to-path/refused') };
      }
      return { set: reset, send: [], push: { url }, dispatch: 'popstate', outcomes: answer('done') }; // :218-222
    },
    derived: {
      // :270-310 `_updatePorts` — one `p-` per unique placeholder in Path, one `q-` per Query name
      inputs: (params) => {
        const ports: Record<string, ValueInputDecl> = {};
        if (typeof params.path === 'string') for (const name of placeholders(params.path)) ports['p-' + name] = parameterPort();
        if (typeof params.queryNames === 'string') for (const q of params.queryNames.split(',')) ports['q-' + q] = queryPort();
        return ports;
      },
      // :224-229 — stored raw under the name after the prefix
      on: (s, port, value) =>
        port.startsWith('p-') ? { set: { params: { ...s.params, [port.slice(2)]: value } }, send: [] } : { set: { query: { ...s.query, [port.slice(2)]: value } }, send: [] },
      // :230-245 — any `p-` or `q-` name is registered on first write; nothing else
      discover: (port) => (port.startsWith('p-') ? parameterPort() : port.startsWith('q-') ? queryPort() : undefined),
      candidates: ['p-id', 'p-x', 'q-page', 'q-sort', 'q- b']
    }
  }
);
