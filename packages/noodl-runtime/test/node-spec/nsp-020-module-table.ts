/**
 * NSP-020 lane L4 — the module table for oracle (a) (task §3.1 decision 5, §6.1 "L4 the module table").
 *
 * One row per (runtime module, node type) whose `setup(context, graphModel)` hook announces ports through
 * `sendDynamicPorts`, plus the four `numberedInputs` registrations (`setupNumberedInputDynamicPorts`). Every module the
 * census in `nsp-020-ports-parity.test.ts` finds on disk is in exactly one of: `TABLE` (graded, or owed by a named lane),
 * `EXCLUDED` (a setup that is not this oracle's — a reason each), `LIBRARIES` (a file that builds ports for others and
 * registers no node). A module in none of them is red: that is the failure this lane exists to prevent.
 *
 * A row's `cases` run beside two the test builds for every row: the catalog's defaults (`{}` — the hooks read
 * `node.parameters` as stored, and an editor stores nothing it was not told) and the catalog's `parameterEncoding` probe
 * (each pattern's `example` read back into the parameter its variable names). `known` pins a disagreement the table
 * has measured and cannot fix here — a bug row (`P107-S80-…`, in `dev-docs/bugs/`) or a format gap (`GAP: …`, reported
 * to NSP-020) — by its exact line; a pinned line that no case produces any more is red too, so a fix is noticed.
 *
 * `owedBy` rows are driven and their disagreements PRINTED and counted, never failed: L1 owns the project- and
 * schema-dependent specs (moving them onto `context`), L3 the four whose `derived.outputs` is padded with every
 * fixture's outputs. `reads` says what the hook reads beyond the node's params, for the lane that switches the row on.
 */
import type { PortContext } from '../../../nodegx-node-spec/src';

export interface Case {
  name: string;
  params: Record<string, unknown>;
  context?: PortContext;
  /** Project metadata `PortContext` has no field for — a case that needs it measures a gap, and is pinned as one. */
  meta?: Record<string, unknown>;
}

export interface TableRow {
  /** The runtime type name (`node.name`) — also the spec's key. */
  type: string;
  /** The module, from `packages/`, without extension. */
  module: string;
  hook: 'setup' | 'numbered';
  cases: Case[];
  /** Disagreements measured and pinned: the exact diff line (or `/regex/` when its names follow the params) → its bug row id or `GAP: …`. */
  known?: Record<string, string>;
  owedBy?: 'L1' | 'L3';
  /** What the hook reads beyond the node's own params (a `PortContext` field, or what has none). */
  reads?: string;
}

const R = 'noodl-runtime/src/nodes/std-library/';
const V = 'noodl-viewer-react/src/nodes/';
const D = 'noodl-viewer-react/src/nodes-deprecated/';

const TWO_BACKENDS = {
  backendServices: {
    backends: [
      { id: 'b1', name: 'First', type: 'parse', endpoint: 'https://one.example/parse', appId: 'a' },
      { id: 'b2', name: 'Second', type: 'parse', endpoint: 'https://two.example/parse', appId: 'b' }
    ],
    activeBackendId: 'b1'
  }
};
const BACKEND_PICKER = 'P107-S80-BACKENDPICKER';
const STATES_LOAD_GATE = 'P107-S82-STATESLOADGATE';
/** NSP-020 s82 — a schema with one class of two columns, as the Record family's proof case reads it. */
const LESSONS: PortContext = { schema: { classes: { Lesson: { fields: { title: { type: 'string' }, n: { type: 'number' } } } } } };

export const TABLE: TableRow[] = [
  // ---- numbered-inputs (nodedefinition.ts collectPorts :623-660: params AND wires, the highest index plus one spare) ----
  {
    type: 'And',
    module: R + 'and',
    hook: 'numbered',
    cases: [
      { name: 'input 1 set', params: { 'input 1': true } },
      { name: 'a gap: input 4 set, input 3 empty', params: { 'input 4': false } },
      { name: 'a WIRE on input 3 and no param', params: {}, context: { wired: ['input 3'] } },
      { name: 'a param and a higher wire', params: { 'input 0': true }, context: { wired: ['input 2'] } },
      { name: 'a wire on a non-numbered port counts nothing', params: {}, context: { wired: ['result'] } }
    ]
  },
  {
    type: 'Or',
    module: R + 'or',
    hook: 'numbered',
    cases: [
      { name: 'input 2 set', params: { 'input 2': true } },
      { name: 'a WIRE on input 3 and no param', params: {}, context: { wired: ['input 3'] } },
      { name: 'a param and a higher wire', params: { 'input 1': false }, context: { wired: ['input 5'] } }
    ]
  },
  {
    type: 'String Mapper',
    module: R + 'stringmapper',
    hook: 'numbered',
    cases: [
      { name: 'both families set', params: { 'input 1': 'a', 'output 2': 'b' } },
      { name: 'a WIRE on input 2', params: {}, context: { wired: ['input 2'] } },
      {
        name: 'a WIRE on output 1 (a Mapping input) and inputString',
        params: { 'input 0': 'x' },
        context: { wired: ['output 1', 'inputString'] }
      }
    ]
  },
  {
    type: 'Color Blend',
    module: V + 'std-library/colorblend',
    hook: 'numbered',
    cases: [
      { name: 'color 2 set', params: { 'color 2': '#ff0000' } },
      { name: 'a WIRE on color 1 and no param', params: {}, context: { wired: ['color 1'] } }
    ]
  },

  // ---- setup hooks over the node's own params ----
  {
    type: 'String Format',
    module: R + 'stringformat',
    hook: 'setup',
    cases: [
      { name: 'two placeholders', params: { format: 'Hi {name}, {n} new' } },
      { name: 'a repeated placeholder', params: { format: '{a} and {a}' } },
      { name: 'the empty placeholder and a hyphen', params: { format: '{} {first-name} {a_1}' } },
      { name: 'no placeholders', params: { format: 'plain' } }
    ]
  },
  {
    type: 'Expression',
    module: R + 'expression',
    hook: 'setup',
    cases: [
      { name: 'two variables', params: { expression: 'a + b * 2' } },
      { name: 'a Math call and a string', params: { expression: 'Math.max(x, 3) + "y"' } },
      { name: 'a member read', params: { expression: 'item.price * qty' } }
    ]
  },
  {
    type: 'Set Variable',
    module: R + 'data/setvariablenode',
    hook: 'setup',
    // the catalog's `setWith` enums (node-catalog.json): the value port's type follows it, and `emptyString` has none
    cases: ['string', 'boolean', 'number', 'emptyString', 'date', 'object', 'array', '*'].map((setWith) => ({
      name: 'setWith ' + setWith,
      params: { setWith }
    }))
  },
  {
    type: 'Model2',
    module: R + 'data/modelnode2',
    hook: 'setup',
    cases: [
      { name: 'two properties', params: { properties: 'title,count' } },
      { name: 'one property with a space', params: { properties: 'first name' } }
    ]
  },
  {
    type: 'NewModel',
    module: R + 'data/newmodelnode',
    hook: 'setup',
    cases: [
      { name: 'two properties, one typed', params: { properties: 'title,count', 'type-count': 'number' } },
      { name: 'one property', params: { properties: 'x' } }
    ]
  },
  {
    type: 'SetModelProperties',
    module: R + 'data/setmodelpropertiesnode',
    hook: 'setup',
    cases: [
      { name: 'two properties, one typed', params: { properties: 'title,count', 'type-title': 'string' } },
      { name: 'one property', params: { properties: 'x' } }
    ]
  },
  {
    type: 'Filter Collection',
    module: R + 'data/filtercollectionnode',
    hook: 'setup',
    cases: [
      { name: 'a limit', params: { filterEnableLimit: true } },
      {
        name: 'two filters (a regex, a number list) and a sort',
        params: {
          filterFilter: 'a,b',
          'filterFilterOp-a': 'regex',
          'filterFilterType-b': 'number',
          'filterFilterOp-b': 'in',
          filterSort: 'x'
        }
      },
      { name: 'a boolean filter', params: { filterFilter: 'done', 'filterFilterType-done': 'boolean' } }
    ]
  },
  {
    type: 'net.noodl.HTTP',
    module: R + 'data/httpnode',
    hook: 'setup',
    cases: [
      // http-outcome-ports.test.ts :98 — a path parameter
      { name: 'a path parameter', params: { url: 'https://example.com/users/{userId}' } },
      { name: 'headers and query parameters', params: { headers: 'Accept,X-Key', queryParams: 'q,page' } },
      {
        name: 'a POST with typed body fields',
        params: { method: 'POST', bodyFields: 'name,age', 'body-type-age': 'number' }
      },
      { name: 'a raw PUT body', params: { method: 'PUT', bodyType: 'raw' } },
      { name: 'bearer auth', params: { authType: 'bearer' } },
      { name: 'basic auth', params: { authType: 'basic' } },
      { name: 'an API key', params: { authType: 'apiKey' } },
      { name: 'a response mapping', params: { responseMapping: 'id,name' } }
    ],
    known: {
      // httpnode.ts :1457-1465 announces `url` with no default; the registration (:313-322) and the catalog say ''
      'input url: default runtime unset, spec ""': 'P107-S80-HTTPANNOUNCE',
      // httpnode.ts :1583-1590 announces `error` under Events; the registration (:418-425) and the catalog say Error
      'output error: group runtime "Events", spec "Error"': 'P107-S80-HTTPANNOUNCE',
      // http.ts :47-50 names these NOT IN THIS SPEC: Conditional (a backend-host world seam), and Output Fields with
      // its `mapping-path-<n>` inputs and `out-<n>` outputs (derived OUTPUTS were not a shape when it was written)
      'input conditional: announced; the spec does not draw it': 'GAP: http.ts :47-50 — Conditional is not in the spec',
      'input responseMapping: announced; the spec does not draw it':
        'GAP: http.ts :47-50 — Output Fields is not in the spec',
      '/^input mapping-path-[^:]+: announced; the spec does not draw it$/':
        'GAP: http.ts :47-50 — Output Fields is not in the spec',
      '/^output out-[^:]+: announced; the spec does not draw it$/':
        'GAP: http.ts :47-50 — Output Fields is not in the spec'
    }
  },
  {
    type: 'NavigationClosePopup',
    module: V + 'navigation/closepopup',
    hook: 'setup',
    cases: [
      { name: 'results and close actions', params: { results: 'name,ok', closeActions: 'Save,Cancel' } },
      // nda-012-navigation-category.test.ts :253
      { name: 'one close action', params: { closeActions: 'cancel' } }
    ]
  },
  {
    type: 'PageStackNavigateBack',
    module: V + 'navigation/navigate-back',
    hook: 'setup',
    cases: [{ name: 'results and back actions', params: { results: 'x,y', backActions: 'Save,Cancel' } }]
  },
  {
    type: 'PageStackNavigateToPath',
    module: V + 'navigation/navigate-to-path',
    hook: 'setup',
    cases: [
      { name: 'path placeholders, one repeated', params: { path: '/item/{id}/{tab}/{id}' } },
      { name: 'the empty placeholder', params: { path: '/x/{}' } },
      { name: 'query names', params: { queryNames: 'page,sort' } },
      { name: 'both', params: { path: '/a/{id}', queryNames: 'q' } }
    ]
  },
  {
    type: 'PageInputs',
    module: V + 'navigation/page-inputs',
    hook: 'setup',
    // nda-012-navigation-category.test.ts :116-152
    cases: [
      { name: 'one path parameter', params: { pathParams: 'productId' } },
      { name: 'one query parameter', params: { queryParams: 'tab' } },
      { name: 'a name in both lists', params: { pathParams: 'id,tab', queryParams: 'tab' } },
      { name: 'a trailing comma', params: { pathParams: 'id,' } }
    ]
  },
  {
    type: 'Page Stack',
    module: V + 'navigation/navigation-stack',
    hook: 'setup',
    cases: [
      {
        name: 'two pages',
        params: {
          pages: [
            { id: 'p1', label: 'Home' },
            { id: 'p2', label: 'Detail Page' }
          ]
        }
      },
      {
        name: 'two pages with routes',
        params: {
          pages: [
            { id: 'p1', label: 'Home' },
            { id: 'p2', label: 'Detail Page' }
          ],
          useRoutes: true
        }
      },
      {
        name: 'data attributes (the editor rule, not the hook)',
        params: { pages: [{ id: 'p1', label: 'Home' }], dataAttributes: ['data-testid'] }
      }
    ],
    known: {
      // navigation-stack.tsx :1371-1395 — the editor draws a default the runtime never receives as a value; a spec
      // `default` is the value at mount (interpreter.ts :450-455), so the drawn one has no place to go
      '/^input startPage: default runtime "[^"]+", spec unset$/': 'GAP: an editor-only default on a derived port',
      '/^input pagePath-[^:]+: default runtime "[^"]+", spec unset$/': 'GAP: an editor-only default on a derived port'
    }
  },
  {
    type: 'Sign File URL',
    module: R + 'data/signfileurl',
    hook: 'setup',
    cases: [{ name: 'a project with two backends', params: {}, meta: TWO_BACKENDS }],
    known: { 'input backendId: announced; the spec does not draw it': BACKEND_PICKER }
  },
  {
    type: 'Upload File',
    module: V + 'std-library/uploadfile',
    hook: 'setup',
    cases: [{ name: 'a project with two backends', params: {}, meta: TWO_BACKENDS }],
    known: { 'input backendId: announced; the spec does not draw it': BACKEND_PICKER }
  },

  // ---- runtime-narrowed: an announcement that REPLACES a declared port (NodeGraphNode.ts getPorts replaceOrAppendPorts) ----
  {
    type: 'net.noodl.controls.options',
    module: V + 'controls/options',
    hook: 'setup',
    // p82-dropdown-looks-like-a-dropdown.test.tsx :191-266
    cases: [
      {
        name: 'the options the author typed',
        params: {
          items: [
            { Label: 'Small', Value: 'Small' },
            { Label: 'Large', Value: 'Large' }
          ]
        }
      },
      { name: 'a label and a different value', params: { items: [{ Label: 'Large', Value: 'l' }] } },
      {
        name: 'the legacy stored form, a string holding the JSON',
        params: { items: '[{"Label":"Small","Value":"s"}]' }
      },
      {
        name: 'a value matching no option',
        params: { items: [{ Label: 'Small', Value: 'Small' }], value: 'from-the-database' }
      },
      { name: 'a value in the list', params: { items: [{ Label: 'Small', Value: 'Small' }], value: 'Small' } },
      { name: 'items that cannot be read', params: { items: 'not a list at all' } },
      { name: 'an empty list', params: { items: [] } },
      {
        name: 'Value set to the declared default, not in the list',
        params: { items: [{ Label: 'Small', Value: 's' }], value: 'Option 1' }
      }
    ],
    // s82 closed §6.4 gap 3: `narrow` reads the params RAW (ports.ts), so a Value SET to 'Option 1' outside the list is offered back
    // exactly as options.ts :428-432 offers it — the pin that measured the gap is gone, and the case above grades it
  },
  {
    type: 'net.noodl.controls.textinput',
    module: V + 'controls/text-input',
    hook: 'setup',
    // fb-026-text-input-number.test.tsx :117-153
    cases: ['text', 'textArea', 'email', 'number', 'password', 'url'].map((type) => ({
      name: 'type ' + type,
      params: { type }
    })),
    known: {
      // text-input.ts :616-637 narrows the Value OUTPUT too; the format's `narrow` is on a declared VALUE INPUT only (spec.ts :391-397)
      'output onTextChanged: type runtime "string", spec "*"': 'GAP: no narrow on an output',
      'output onTextChanged: type runtime "number", spec "*"': 'GAP: no narrow on an output'
    }
  },

  // ---- owed by L1: the project- and schema-dependent specs (another session moves them onto `context`) ----
  {
    type: 'DbCollection2',
    module: R + 'data/dbcollectionnode2',
    hook: 'setup',
    cases: [],
    owedBy: 'L1',
    reads:
      'schema (the Class picker `collectionName` from `dbCollections`/`systemCollections`, the class fields for the filter/sort/`qp-*`), the backend list (`backendServices`, `cloudservices` — no PortContext field)'
  },
  {
    type: 'AddDbModelRelation',
    module: R + 'data/dbmodelnode-addrelation',
    hook: 'setup',
    cases: [],
    owedBy: 'L1',
    reads: 'schema (the Class picker; the relation fields of the class), the backend list'
  },
  {
    type: 'RemoveDbModelRelation',
    module: R + 'data/dbmodelnode-removerelation',
    hook: 'setup',
    cases: [],
    owedBy: 'L1',
    reads: 'schema (the Class picker; the relation fields of the class), the backend list'
  },
  // NSP-020 s82 — the first L1 row switched on, the proof of the format decision (§6.6): the Class picker from the schema (the
  // system classes first), the Backend picker with two backends (`context.backends`), `prop-`/`changed-` per column, `prop-`
  // alone per wired name (record-ports.ts recordWiredFieldPorts), nothing for the wires at play
  {
    type: 'DbModel2',
    module: R + 'data/dbmodelnode2',
    hook: 'setup',
    cases: [
      { name: 'a Class with two columns', params: { collectionName: 'Lesson' }, context: LESSONS },
      { name: 'a Class the schema does not have', params: { collectionName: 'Nope' }, context: LESSONS },
      { name: 'a wire out of prop-zz and a prop-title parameter, beside the schema', params: { collectionName: 'Lesson', 'prop-title': 'x' }, context: { ...LESSONS, wiredOutputs: ['prop-zz', 'changed-zz'] } },
      { name: 'a wire into prop-n, no schema', params: {}, context: { wired: ['prop-n'] } },
      { name: 'a project with two backends', params: { collectionName: 'Lesson' }, context: { ...LESSONS, backends: [{ id: 'b1', name: 'First' }, { id: 'b2', name: 'Second' }] } },
      { name: 'a project with one backend draws no picker', params: {}, context: { backends: [{ id: 'b1', name: 'First' }] } }
    ],
    reads: 'schema (the Class picker; the class fields → `prop-*`/`changed-*` outputs), backends (the picker), wired + wiredOutputs (`prop-*` from the wires)'
  },
  {
    type: 'DeleteDbModelProperties',
    module: R + 'data/deletedbmodelpropertiesnode',
    hook: 'setup',
    cases: [],
    owedBy: 'L1',
    reads: 'schema (the Class picker), the backend list'
  },
  {
    type: 'NewDbModelProperties',
    module: R + 'data/newdbmodelpropertiesnode',
    hook: 'setup',
    cases: [],
    owedBy: 'L1',
    reads:
      'schema (the Class picker; the class fields → `prop-*`), wired (`prop-*` from the wires into it, record-ports.ts / SBR-008), the backend list'
  },
  {
    type: 'SetDbModelProperties',
    module: R + 'data/setdbmodelpropertiesnode',
    hook: 'setup',
    cases: [],
    owedBy: 'L1',
    reads: 'schema (the Class picker; the class fields → `prop-*`), wired (`prop-*` from the wires), the backend list'
  },
  {
    type: 'FilterDBModels',
    module: R + 'data/filterdbmodelsnode',
    hook: 'setup',
    cases: [],
    owedBy: 'L1',
    reads: 'schema (the Class picker; the class fields for the filter), the backend list'
  },
  {
    type: 'SubscribeToChanges',
    module: R + 'data/subscribetochanges',
    hook: 'setup',
    cases: [],
    owedBy: 'L1',
    reads: 'schema (the Class picker `collectionName`; `qp-*`), the backend list'
  },
  {
    type: 'net.noodl.user.User',
    module: R + 'user/user',
    hook: 'setup',
    cases: [],
    owedBy: 'L1',
    reads: 'schema (the `_User` class fields → `prop-*`/`changed-*`, user-ports.ts), `systemCollections`'
  },
  {
    type: 'net.noodl.user.SetUserProperties',
    module: R + 'user/setuserproperties',
    hook: 'setup',
    cases: [],
    owedBy: 'L1',
    reads: 'schema (the `_User` class fields → `prop-*`)'
  },
  {
    type: 'net.noodl.user.SignUp',
    module: V + 'std-library/user/signup',
    hook: 'setup',
    cases: [],
    owedBy: 'L1',
    reads: 'schema (the `_User` class fields, `systemCollections`)'
  },
  {
    type: 'PageStackNavigate',
    module: V + 'navigation/navigate',
    hook: 'setup',
    cases: [],
    owedBy: 'L1',
    reads:
      'stacks (`getNodesWithType("Page Stack")` and their pages, navigate.ts :340-380), components (the target page\'s Component Inputs → `pm-*`, `graphModel.components[target]` :365, :430)'
  },
  {
    type: 'NavigationShowPopup',
    module: V + 'navigation/showpopup',
    hook: 'setup',
    cases: [],
    owedBy: 'L1',
    reads:
      "components (the popup's Component Inputs → `popupParam-*`, `graphModel.components[target]` :351, :425) and the Close Popup nodes inside it (their Results / Close Actions → `closeResult-*`/`closeAction-*`)"
  },
  {
    type: 'For Each',
    module: V + 'std-library/data/foreach',
    hook: 'setup',
    cases: [],
    owedBy: 'L1',
    reads: "components (the template's Component Outputs, `graphModel.components[template]`, foreach.tsx :1168-1172)"
  },

  // ---- owed by L3: `derived.outputs` padded with every fixture's outputs (task §3.1 (d), decision 4) ----
  // NSP-020 s82 — the first L3 row switched on (§6.6): value outputs and the state ports from the params alone; at play the state
  // ports exist only when wired (`onWire`), which the editor's draw does not show and this oracle does not ask
  {
    type: 'States',
    module: V + 'std-library/states',
    hook: 'setup',
    cases: [
      { name: 'two states, one value', params: { states: 'A,B', values: 'x' } },
      { name: 'three states, three values of three types, a Default transition on B', params: { states: 'A,B,C', values: 'x,label,on', 'type-label': 'string', 'type-on': 'boolean', 'transitiondef-B': { curve: [0, 0, 1, 1], dur: 100, delay: 0 } } },
      { name: 'transitions off', params: { states: 'A,B', values: 'x', useTransitions: false } },
      { name: 'a Start State', params: { states: 'A,B', values: 'x,y', startState: 'B', 'type-y': 'color' } },
      { name: 'values without states', params: { values: 'x' } }
    ],
    // P107-S82-STATESLOADGATE: at load (`nodeAdded`) the hook announces nothing until States is set (states.ts :1248-1250), while any
    // later parameter edit announces the value outputs and Type pickers regardless (:1252-1260) — the drawn list depends on the edit
    // order. The spec draws the edit path (what the `values` setter registers at play); this oracle measures the load path.
    known: {
      'input type-x: the spec draws it; the runtime does not announce it': STATES_LOAD_GATE,
      'output x: the spec draws it; the runtime does not announce it': STATES_LOAD_GATE
    },
    reads: 'params only'
  },
  {
    type: 'JavaScriptFunction',
    module: R + 'simplejavascript',
    hook: 'setup',
    cases: [
      {
        name: 'one input, one output',
        params: { scriptInputs: [{ label: 'a', type: 'number' }], scriptOutputs: [{ label: 'sum', type: 'number' }] }
      }
    ],
    owedBy: 'L3',
    reads: 'params only (and the script text, function-ports.ts)'
  },
  {
    type: 'Javascript2',
    module: V + 'std-library/javascript',
    hook: 'setup',
    cases: [
      {
        name: 'one input, one output',
        params: { scriptInputs: [{ label: 'a', type: 'number' }], scriptOutputs: [{ label: 'sum', type: 'number' }] }
      }
    ],
    owedBy: 'L3',
    reads: 'params only (and the script text)'
  },
  {
    type: 'Logic Builder',
    module: R + 'logic-builder',
    hook: 'setup',
    cases: [],
    owedBy: 'L3',
    reads: 'params only (the blocks, logic-builder-io.ts)'
  }
];

/**
 * Modules with a `setup` hook (or a numbered registration) that oracle (a) does not grade, by `module#type` — each a reason.
 */
export const EXCLUDED: Record<string, string> = {
  // no spec in @nodegx/node-spec — NSP-022's
  [R + 'componentutils/componentobject#net.noodl.ComponentObject']: 'no spec (NSP-022)',
  [R + 'componentutils/setcomponentobjectproperties#net.noodl.SetComponentObjectProperties']: 'no spec (NSP-022)',
  [R + 'data/restnode#REST2']: 'no spec (NSP-022)',
  [R + 'runtasks#RunTasks']: 'no spec (NSP-022)',
  [V + 'navigation/page#Page']: 'no spec (NSP-022)',
  [V + 'std-library/componentutils/parentcomponentobject#net.noodl.ParentComponentObject']: 'no spec (NSP-022)',
  [V + 'std-library/componentutils/setparentcomponentobjectproperties#net.noodl.SetParentComponentObjectProperties']:
    'no spec (NSP-022)',
  [V + 'std-library/data/cloudfunction#Cloud Function']:
    "no spec (NSP-022); the spec is CloudFunction2's, whose setup is empty",
  [V + 'std-library/eventreceiver#Event Receiver']:
    'no spec (NSP-022) — L1 lists it; its hook reads the Senders on its channel (`siblings`)',
  [V + 'std-library/eventsender#Event Sender']: 'no spec (NSP-022)',
  // deprecated, not in the picker, no spec
  [D + 'controls/button#Button']: 'deprecated, no spec',
  [D + 'controls/options#Options']: 'deprecated, no spec',
  [D + 'controls/text-input#Text Input']: 'deprecated, no spec',
  [D + 'std-library/componentstate#Component State']: 'deprecated, no spec',
  [D + 'std-library/parentcomponentstate#Parent Component State']: 'deprecated, no spec',
  [D + 'std-library/data/dbcollectionnode#DbCollection']: 'deprecated, no spec',
  [D + 'std-library/data/dbmodelnode#DbModel']: 'deprecated, no spec',
  [D + 'std-library/data/modelnode#Model']: 'deprecated, no spec',
  [D + 'std-library/numberblend#Number Blend (numbered)']: 'deprecated, no spec',
  [D + 'std-library/stringselector#String Selector (numbered)']: 'deprecated, no spec',
  [D + 'std-library/signaltoindex#Signal To Index (numbered)']: 'deprecated, no spec',
  [D + 'std-library/scriptdownloader#Script Downloader (numbered)']: 'deprecated, no spec',
  // a setup that announces nothing
  [R + 'data/mapcollectionnode#Map Collection']:
    'setup announces nothing (mapcollectionnode.ts :393-397 returns after the editor check)',
  [V + 'std-library/data/cloudfunction2#CloudFunction2']:
    'setup is empty — "Handled in editor adapter" (cloudfunction2.ts :365-367); oracle (c)',
  [V + 'std-library/user/requestpasswordreset#net.noodl.user.RequestPasswordReset']: 'setup is empty (:126)',
  [V + 'std-library/user/resetpassword#net.noodl.user.ResetPassword']: 'setup is empty (:148)',
  [V + 'std-library/user/sendemailverification#net.noodl.user.SendEmailVerification']: 'setup is empty (:126)',
  [V + 'std-library/user/verifyemail#net.noodl.user.VerifyEmail']: 'setup is empty (:137)',
  [D + 'std-library/scriptdownloader#Script Downloader']:
    'deprecated, no spec; its setup announces nothing (scriptdownloader.ts :179-184)',
  [V + 'std-library/data/foreachactions#For Each Actions']:
    'setup is empty — "Handled in editor adapter" (foreachactions.ts :158-160; DEBT-006 removed the ports it once published)'
};

/** Files the census's text match finds that register no node with a hook — they build ports for the modules above. */
export const LIBRARIES: Record<string, string> = {
  [R + 'componentutils/base']:
    'the Component Object mixin — installs the setup the two (Set) Component Object modules export',
  [R + 'data/modelcrudbase']: 'the Object-family mixin — installs the setup New Object / Set Object Properties export',
  [R + 'data/dbmodelcrudbase']: 'the Record-family mixin — installs the setup the record-write modules export',
  [R + 'data/record-ports']: "the Record family's port builders (Class / backend pickers, `prop-*`)",
  [R + 'data/schema-ports']: 'the schema-driven port builders and `sendSchemaPorts`',
  [R + 'data/collection-failure']: 'matched by its import of a CRUD base; registers no node',
  [R + 'functionDiagnostics']: "the Function's editor warnings",
  [R + 'runtasks-template-contract']: "Run Tasks' template contract (its ports are RunTasks', excluded: no spec)",
  [V + 'navigation/router']:
    'matched by an import; exports no setup hook (the Router is an editor-adapter node — P107-S79-ADAPTERLABEL)'
};
