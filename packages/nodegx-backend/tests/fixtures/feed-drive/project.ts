/**
 * FED-006 — the feed reader, as a project.
 *
 * This module is the *project* half of the drive: the schema a person pushes, the access rules
 * they write, the two cloud functions they draw, and the schedule that fires one of them. The
 * drive itself (`tests/feed-drive.test.ts`) provisions a backend from exactly these declarations
 * and touches nothing else, so everything asserted out there is a property of what is in here.
 *
 * ## Four things that are decisions, not details
 *
 * 1. 🔴 **Every graph wires `Failure` beside the path it expects** (phase 96 register R1). A cloud
 *    function whose only wired path is the happy one does not fail when something goes wrong — it
 *    HANGS until the function's own timeout, and a 20-second red tells you nothing about which
 *    port fired. Every Response and every `Component Outputs` failure wire below exists for that
 *    reason.
 *
 * 2. 🔴 **`Run Tasks` hands a task template the item's own properties, by name** — so the item
 *    objects the inner loop runs over are MAPPED first, in `mapItems`, into exactly the port names
 *    `helpers/tagAndStore` declares. Two reasons, both measured rather than assumed:
 *    `runtasks.ts` sets `id` from the *model's* id before it copies `model.data`, and a feed
 *    item's `sourceId` is not in the feed at all — it is which Source row we fetched.
 *
 * 3. 🔴 **`Item.id` is DECLARED as a column, never left to be auto-created** (register R3). `id`
 *    is reserved at the adapter layer: it is never created implicitly and a `PUT` that changes one
 *    answers 200 and writes nothing. A declared column is fine — FED-002 pinned both halves — and
 *    declaring it is what the unique index needs anyway.
 *
 * 4. **The poll says `overlapPolicy` and `Conditional` out loud.** Both now have defaults that
 *    would give the same behaviour silently (FED-004). The point of this drive is that a person
 *    can SEE the decisions in the record, so the trigger carries the word and the HTTP node
 *    carries the port.
 */

/** The value the fake provider must receive and nothing else may. Distinctive on purpose. */
export const MODEL_KEY = 'sk-ant-fed006-DO-NOT-LEAK-4b81c2';
export const MODEL_KEY_SECRET = 'MODEL_KEY';
export const MODEL_BASE_URL_SECRET = 'MODEL_BASE_URL';

/** How long one `pollSources` run may take. Comfortably over the fixtures; well under AC1. */
export const POLL_TIMEOUT_MS = 20_000;

export const TRIGGER_ID = 'trg_fed006_poll';

export interface Column {
  name: string;
  type: string;
}

export interface IndexDecl {
  fields: string[];
  unique?: boolean;
  order?: 'asc' | 'desc';
}

export interface TableDecl {
  table: string;
  columns: Column[];
  indexes: IndexDecl[];
}

/**
 * §3.2's schema. `Item.id` is the feed's own identity for the entry — the guid, the Atom id, the
 * link, or a hash of title and date — which `Parse Feed` guarantees is never empty, and which is
 * what makes "each item lands once" a property of the database rather than of the graph.
 */
export const SCHEMA: TableDecl[] = [
  {
    table: 'Source',
    columns: [
      { name: 'url', type: 'String' },
      { name: 'kind', type: 'String' },
      { name: 'title', type: 'String' }
    ],
    indexes: []
  },
  {
    table: 'Item',
    columns: [
      { name: 'id', type: 'String' },
      { name: 'sourceId', type: 'String' },
      { name: 'title', type: 'String' },
      { name: 'link', type: 'String' },
      { name: 'published', type: 'Date' },
      { name: 'image', type: 'String' },
      { name: 'summary', type: 'String' },
      { name: 'topics', type: 'String' }
    ],
    indexes: [{ fields: ['id'], unique: true }, { fields: ['published'], order: 'desc' }, { fields: ['sourceId'] }]
  },
  {
    table: 'Follow',
    columns: [
      { name: 'userId', type: 'String' },
      { name: 'sourceId', type: 'String' }
    ],
    indexes: [{ fields: ['userId'] }]
  },
  {
    table: 'Keep',
    columns: [
      { name: 'userId', type: 'String' },
      { name: 'itemId', type: 'String' },
      { name: 'value', type: 'String' }
    ],
    indexes: [{ fields: ['userId'] }]
  }
];

/**
 * §3.2's access rules.
 *
 * `Item` and `Source` are readable by anyone signed in and writable by nobody: the only thing that
 * writes them is `pollSources`, which runs as the system. `Follow` and `Keep` are creator-owned,
 * so one person's list is not another's — which is the half of §8 that "readable by a session
 * user" is actually about.
 *
 * `devOpen` is off. With it on, `aclFor` returns `undefined` for every collection on a loopback
 * bind and none of the rules below would be measuring anything.
 */
export const SECURITY = {
  version: 1,
  devOpen: false,
  defaults: {
    permissions: {
      find: 'authenticated',
      get: 'authenticated',
      create: 'authenticated',
      update: 'authenticated',
      delete: 'nobody'
    },
    creatorOwns: true
  },
  collections: {
    Source: {
      permissions: { find: 'authenticated', get: 'authenticated', create: 'nobody', update: 'nobody', delete: 'nobody' },
      creatorOwns: false
    },
    Item: {
      permissions: { find: 'authenticated', get: 'authenticated', create: 'nobody', update: 'nobody', delete: 'nobody' },
      creatorOwns: false
    },
    Follow: {
      permissions: { find: 'authenticated', get: 'authenticated', create: 'authenticated', update: 'nobody', delete: 'nobody' },
      creatorOwns: true
    },
    Keep: {
      permissions: { find: 'authenticated', get: 'authenticated', create: 'authenticated', update: 'authenticated', delete: 'nobody' },
      creatorOwns: true
    }
  },
  functions: {
    // The schedule is the only caller. `runAs: system` is what lets it write `Item`, which every
    // principal below it is refused.
    pollSources: { call: 'nobody', runAs: 'system', timeoutMs: POLL_TIMEOUT_MS },
    // Runs as the system so it can read across `Follow` rows it does not own — and then filters by
    // the caller's own id, which the Request node supplies and the caller cannot forge.
    myList: { call: 'authenticated', runAs: 'system', timeoutMs: 10_000 }
  },
  files: { upload: 'nobody', read: 'authenticated', delete: 'nobody' },
  signup: 'public'
};

interface GraphNode {
  id: string;
  type: string;
  x: number;
  y: number;
  parameters: Record<string, unknown>;
  ports: unknown[];
  children: unknown[];
}

interface Connection {
  sourceId: string;
  sourcePort: string;
  targetId: string;
  targetPort: string;
}

interface Component {
  name: string;
  ports?: unknown[];
  nodes: GraphNode[];
  connections: Connection[];
  roots: unknown[];
}

/**
 * 🔴 **Ticking every "run on value change" box OFF, for every input a signal already sequences.**
 *
 * NDA-017's default is that a new value on ANY input re-runs the node, and wiring `Run` is purely
 * ADDITIVE — it does not make the other inputs passive. In a graph like this one, where a value
 * and the signal that should consume it arrive one after the other, the default means the node
 * runs FIRST on the value, with everything else still unset, and the signal then runs it a second
 * time. Measured: `mapItems` ran the moment `sourceRowId` arrived, produced an empty list from an
 * `items` input that had not been set yet, and handed `Run Tasks` nothing to do — a poll that
 * fetched the feed, reported success in 48 ms and wrote no rows.
 *
 * So every input below that is sequenced by a signal is declared passive. The rule is: if a node
 * has a control signal wired, say which of its inputs may ALSO run it.
 */
const PASSIVE = (inputs: string[]): Record<string, boolean> =>
  Object.fromEntries(inputs.map((name) => [`runOnChange-${name}`, false]));

/**
 * 🔴 The three lines every mapping script below starts with, and the reason they are not
 * `Inputs.x.map(...)`.
 *
 * `Query Records` and `Parse Feed` both publish a **Collection of records**, not an array of plain
 * objects — deliberately, so that the array family downstream sees things with `.get()`. A
 * Collection is an array behind a Proxy, so `Array.isArray` says yes and `row.url` says
 * `undefined`: the fields are on the record, not on the wrapper. `rowsOf` takes either shape and
 * hands back plain objects.
 *
 * 🔴 **And `__id` is not decoration.** `Model.create` uses `data.id` as the record's IDENTITY and
 * then skips the key — `for (var key in modelData) { if (key === 'id') continue; ... }`. So a
 * `Parse Feed` item's `id`, which is the whole basis of "each item lands once", is on
 * `record.getId()` and **nowhere in `record.data`**. A script that reads `item.id` off one of
 * these gets `undefined`, and the write then fails with "Upsert On names id, but this record has
 * no value for it" — which is where this was found. `runtasks.ts` has the same knowledge written
 * out by hand, one line above the loop that copies the rest of the fields.
 */
const ROW_HELPERS = [
  'function rowsOf(value) {',
  '  const list = value ? Array.prototype.slice.call(value) : [];',
  '  return list.map(function (row) {',
  '    const data = row && row.data ? row.data : row || {};',
  '    const id = row && typeof row.getId === "function" ? row.getId() : data.objectId;',
  '    return Object.assign({}, data, { __id: id });',
  '  });',
  '}'
].join('\n');

const node = (id: string, type: string, x: number, y: number, parameters: Record<string, unknown> = {}): GraphNode => ({
  id,
  type,
  x,
  y,
  parameters,
  ports: [],
  children: []
});

/**
 * The JSON schema the tagger's answer must match.
 *
 * Inlined into the script that emits it rather than declared as a node parameter, because
 * `Output Schema` is `allowConnectionsOnly` — an object is not something anyone types into an
 * inspector field, so a graph that wants one has to produce it.
 */
const TOPIC_SCHEMA = {
  type: 'object',
  properties: { topics: { type: 'array', items: { type: 'string' } } },
  required: ['topics'],
  additionalProperties: false
};

/**
 * `helpers/tagAndStore` — one feed item: ask the model for its topics, then write the row.
 *
 * The per-item unit of work for `Run Tasks` is a cloud HELPER component, not a cloud function
 * (the component picker refuses those on purpose). Its interface is the component-level `ports`
 * array below — NOT the Component Inputs node's own ports, which is the mistake that costs an
 * afternoon: with the ports on the node, `Run Tasks` reports `run-tasks/no-completion-output` and
 * the whole function then hangs, because nothing is wired to the failure it reports.
 */
function tagAndStoreComponent(): Component {
  return {
    name: '/#__cloud__/helpers/tagAndStore',
    ports: [
      { name: 'Do', plug: 'input', type: { name: 'signal' } },
      { name: 'itemId', plug: 'input', type: { name: '*' } },
      { name: 'sourceId', plug: 'input', type: { name: '*' } },
      { name: 'title', plug: 'input', type: { name: '*' } },
      { name: 'link', plug: 'input', type: { name: '*' } },
      { name: 'published', plug: 'input', type: { name: '*' } },
      { name: 'image', plug: 'input', type: { name: '*' } },
      { name: 'summary', plug: 'input', type: { name: '*' } },
      { name: 'Success', plug: 'output', type: { name: 'signal' } },
      { name: 'Failed', plug: 'output', type: { name: 'signal' } }
    ],
    nodes: [
      node('ci', 'Component Inputs', 0, 0),
      // What to ask, and the shape the answer must come back in.
      node('ask', 'JavaScriptFunction', 0, 100, {
        ...PASSIVE(['in-title', 'in-summary']),
        functionScript: [
          'Outputs.schema = ' + JSON.stringify(TOPIC_SCHEMA) + ';',
          "Outputs.prompt = 'Title: ' + (Inputs.title || '') + '\\n\\nSummary: ' + (Inputs.summary || '');"
        ].join('\n')
      }),
      // Where the provider lives, read from the project's own secrets — never a literal in a
      // graph, so that pointing this at a gateway is an operator's edit and not an author's.
      node('baseUrl', 'noodl.cloud.secret', 260, 100, { name: MODEL_BASE_URL_SECRET }),
      node('model', 'noodl.cloud.modelrequest', 0, 220, {
        provider: 'anthropic',
        model: 'claude-opus-5',
        apiKeySecret: MODEL_KEY_SECRET,
        effort: 'low',
        maxTokens: 256,
        timeoutMs: 8000
      }),
      // The answer, flattened to the one string the row stores. A person reading the dashboard
      // reads "ai-coding, self-hosting", not a JSON object.
      node('topics', 'JavaScriptFunction', 0, 340, {
        ...PASSIVE(['in-json']),
        functionScript: [
          'const answer = Inputs.json || {};',
          'const list = Array.isArray(answer.topics) ? answer.topics : [];',
          "Outputs.topics = list.join(', ');"
        ].join('\n')
      }),
      node('store', 'NewDbModelProperties', 0, 460, { collectionName: 'Item', upsertOn: 'id' }),
      node('co', 'Component Outputs', 0, 580)
    ],
    connections: [
      { sourceId: 'ci', sourcePort: 'Do', targetId: 'ask', targetPort: 'run' },
      { sourceId: 'ci', sourcePort: 'title', targetId: 'ask', targetPort: 'in-title' },
      { sourceId: 'ci', sourcePort: 'summary', targetId: 'ask', targetPort: 'in-summary' },

      // Values first, signal last: `Base Url`, `Input` and `Output Schema` are all set by the
      // time `Send` fires, because each hop here is a signal that only leaves once the hop
      // before it has finished.
      { sourceId: 'ask', sourcePort: 'out-schema', targetId: 'model', targetPort: 'outputSchema' },
      { sourceId: 'ask', sourcePort: 'out-prompt', targetId: 'model', targetPort: 'input' },
      { sourceId: 'ask', sourcePort: 'success', targetId: 'baseUrl', targetPort: 'fetch' },
      { sourceId: 'baseUrl', sourcePort: 'value', targetId: 'model', targetPort: 'baseUrl' },
      { sourceId: 'baseUrl', sourcePort: 'done', targetId: 'model', targetPort: 'send' },

      { sourceId: 'model', sourcePort: 'json', targetId: 'topics', targetPort: 'in-json' },
      { sourceId: 'model', sourcePort: 'done', targetId: 'topics', targetPort: 'run' },
      { sourceId: 'topics', sourcePort: 'out-topics', targetId: 'store', targetPort: 'prop-topics' },

      { sourceId: 'ci', sourcePort: 'itemId', targetId: 'store', targetPort: 'prop-id' },
      { sourceId: 'ci', sourcePort: 'sourceId', targetId: 'store', targetPort: 'prop-sourceId' },
      { sourceId: 'ci', sourcePort: 'title', targetId: 'store', targetPort: 'prop-title' },
      { sourceId: 'ci', sourcePort: 'link', targetId: 'store', targetPort: 'prop-link' },
      { sourceId: 'ci', sourcePort: 'published', targetId: 'store', targetPort: 'prop-published' },
      { sourceId: 'ci', sourcePort: 'image', targetId: 'store', targetPort: 'prop-image' },
      { sourceId: 'ci', sourcePort: 'summary', targetId: 'store', targetPort: 'prop-summary' },
      { sourceId: 'topics', sourcePort: 'success', targetId: 'store', targetPort: 'store' },

      { sourceId: 'store', sourcePort: 'done', targetId: 'co', targetPort: 'Success' },

      // R1, four times over. Each of these is a real way one item can fail — a missing secret, a
      // refusal, a script that threw, a write the index refused — and every one of them has to
      // reach a completion port, or `Run Tasks` waits for an item that will never answer.
      { sourceId: 'baseUrl', sourcePort: 'failure', targetId: 'co', targetPort: 'Failed' },
      { sourceId: 'ask', sourcePort: 'failure', targetId: 'co', targetPort: 'Failed' },
      { sourceId: 'model', sourcePort: 'failure', targetId: 'co', targetPort: 'Failed' },
      { sourceId: 'topics', sourcePort: 'failure', targetId: 'co', targetPort: 'Failed' },
      { sourceId: 'store', sourcePort: 'failure', targetId: 'co', targetPort: 'Failed' }
    ],
    roots: []
  };
}

/**
 * `helpers/pollOne` — one Source row: fetch it, parse it, and run every item through
 * `helpers/tagAndStore`.
 *
 * `Conditional` is on, so the second poll of a host that issues an `ETag` is a 304 and this
 * component's `Not Modified` path finishes the task without touching the model or the database
 * once. That is the whole economic argument for the port, and it is measured from out here by the
 * fixture's own request log rather than by anything this graph says about itself.
 */
function pollOneComponent(): Component {
  return {
    name: '/#__cloud__/helpers/pollOne',
    ports: [
      { name: 'Do', plug: 'input', type: { name: 'signal' } },
      { name: 'sourceRowId', plug: 'input', type: { name: '*' } },
      { name: 'url', plug: 'input', type: { name: '*' } },
      { name: 'Success', plug: 'output', type: { name: 'signal' } },
      { name: 'Failed', plug: 'output', type: { name: 'signal' } }
    ],
    nodes: [
      node('ci', 'Component Inputs', 0, 0),
      node('http', 'net.noodl.HTTP', 0, 100, {
        method: 'GET',
        // Both said out loud. `Response Type: text` is not optional for a feed: on `auto` the
        // node believes a `content-type` header, and real sources lie about theirs.
        responseType: 'text',
        conditional: true
      }),
      node('parse', 'net.noodl.ParseFeed', 0, 220),
      // Every item, carrying the Source row it came from and under the port names the task
      // template declares. See the module comment: `Run Tasks` maps by name, and `sourceId` is
      // not in the feed.
      node('mapItems', 'JavaScriptFunction', 0, 340, {
        ...PASSIVE(['in-items', 'in-sourceRowId']),
        functionScript: [
          ROW_HELPERS,
          'Outputs.rows = rowsOf(Inputs.items).map(function (item) {',
          '  return {',
          '    itemId: item.__id,',
          '    sourceId: Inputs.sourceRowId,',
          '    title: item.title,',
          '    link: item.link,',
          '    published: item.published,',
          '    image: item.image,',
          '    summary: item.summary',
          '  };',
          '});'
        ].join('\n')
      }),
      node('each', 'RunTasks', 0, 460, {
        taskTemplate: '/#__cloud__/helpers/tagAndStore',
        maxRunningTasks: 4,
        // One item the model refuses must not cost the other four. `Run Tasks` still reports the
        // failures on its own `Failure` port, which is wired.
        stopOnFailure: false,
        taskStartInput: 'Do',
        taskSuccessOutput: 'Success',
        taskFailureOutput: 'Failed'
      }),
      node('co', 'Component Outputs', 0, 580)
    ],
    connections: [
      { sourceId: 'ci', sourcePort: 'url', targetId: 'http', targetPort: 'url' },
      { sourceId: 'ci', sourcePort: 'Do', targetId: 'http', targetPort: 'fetch' },
      { sourceId: 'ci', sourcePort: 'sourceRowId', targetId: 'mapItems', targetPort: 'in-sourceRowId' },

      { sourceId: 'http', sourcePort: 'response', targetId: 'parse', targetPort: 'text' },
      // A 304 is this component finishing, not failing: nothing changed, so there is nothing to
      // parse, nothing to tag and nothing to write.
      { sourceId: 'http', sourcePort: 'notModified', targetId: 'co', targetPort: 'Success' },

      { sourceId: 'parse', sourcePort: 'items', targetId: 'mapItems', targetPort: 'in-items' },
      { sourceId: 'parse', sourcePort: 'changed', targetId: 'mapItems', targetPort: 'run' },
      { sourceId: 'mapItems', sourcePort: 'out-rows', targetId: 'each', targetPort: 'items' },
      { sourceId: 'mapItems', sourcePort: 'success', targetId: 'each', targetPort: 'run' },
      { sourceId: 'each', sourcePort: 'done', targetId: 'co', targetPort: 'Success' },
      // A feed with no items at all: `Run Tasks` says `Unchanged`, and that is still a finished
      // poll. Without this wire the task never completes and the whole run burns its timeout.
      { sourceId: 'each', sourcePort: 'unchanged', targetId: 'co', targetPort: 'Success' },

      // R1 again: the fetch, the parse, the mapping and the loop can each fail on their own.
      { sourceId: 'http', sourcePort: 'failure', targetId: 'co', targetPort: 'Failed' },
      { sourceId: 'parse', sourcePort: 'failure', targetId: 'co', targetPort: 'Failed' },
      { sourceId: 'mapItems', sourcePort: 'failure', targetId: 'co', targetPort: 'Failed' },
      { sourceId: 'each', sourcePort: 'failure', targetId: 'co', targetPort: 'Failed' }
    ],
    roots: []
  };
}

/**
 * `pollSources` — the scheduled function. Every Source row, polled.
 *
 * It takes no parameters: a schedule has nothing to pass it, and a function that needs an argument
 * is a function a trigger cannot fire.
 */
function pollSourcesFunction(): Component {
  return {
    name: '/#__cloud__/pollSources',
    nodes: [
      node('req', 'noodl.cloud.request', 0, 0, { allowNoAuth: true }),
      node('sources', 'DbCollection2', 0, 100, {
        collectionName: 'Source',
        ...PASSIVE(['collectionName', 'querySettings'])
      }),
      // The Source rows, under the port names `helpers/pollOne` declares. `objectId` becomes
      // `sourceRowId`, which is what every `Item.sourceId` ends up holding.
      node('mapSources', 'JavaScriptFunction', 0, 220, {
        ...PASSIVE(['in-items']),
        functionScript: [
          ROW_HELPERS,
          'Outputs.rows = rowsOf(Inputs.items).map(function (row) {',
          '  return { sourceRowId: row.__id, url: row.url };',
          '});'
        ].join('\n')
      }),
      node('each', 'RunTasks', 0, 340, {
        taskTemplate: '/#__cloud__/helpers/pollOne',
        maxRunningTasks: 4,
        stopOnFailure: false,
        taskStartInput: 'Do',
        taskSuccessOutput: 'Success',
        taskFailureOutput: 'Failed'
      }),
      node('res', 'noodl.cloud.response', 0, 460, { params: 'outcome', 'pm-outcome': 'polled' }),
      node('resErr', 'noodl.cloud.response', 300, 460, { params: 'outcome', 'pm-outcome': 'failed' })
    ],
    connections: [
      { sourceId: 'req', sourcePort: 'receive', targetId: 'sources', targetPort: 'storageFetch' },
      { sourceId: 'sources', sourcePort: 'items', targetId: 'mapSources', targetPort: 'in-items' },
      { sourceId: 'sources', sourcePort: 'fetched', targetId: 'mapSources', targetPort: 'run' },
      { sourceId: 'mapSources', sourcePort: 'out-rows', targetId: 'each', targetPort: 'items' },
      { sourceId: 'mapSources', sourcePort: 'success', targetId: 'each', targetPort: 'run' },
      { sourceId: 'each', sourcePort: 'done', targetId: 'res', targetPort: 'send' },
      { sourceId: 'each', sourcePort: 'unchanged', targetId: 'res', targetPort: 'send' },

      // R1. A backend with no Source rows, a query the rules refuse, a loop that fell over: each
      // answers instead of hanging, and the execution record says which.
      { sourceId: 'sources', sourcePort: 'failure', targetId: 'resErr', targetPort: 'send' },
      { sourceId: 'mapSources', sourcePort: 'failure', targetId: 'resErr', targetPort: 'send' },
      { sourceId: 'each', sourcePort: 'failure', targetId: 'resErr', targetPort: 'send' }
    ],
    roots: []
  };
}

/**
 * `myList` — the caller's own feed.
 *
 * Runs as the system, and the only thing that makes it the CALLER's list is `userId` off the
 * Request node. That value is the authenticated principal's id, put there by the dispatcher;
 * a caller cannot pass their own.
 */
function myListFunction(): Component {
  return {
    name: '/#__cloud__/myList',
    nodes: [
      node('req', 'noodl.cloud.request', 0, 0, { allowNoAuth: false }),
      node('follows', 'DbCollection2', 0, 100, {
        collectionName: 'Follow',
        ...PASSIVE(['collectionName', 'querySettings'])
      }),
      // The second query is written in `Query Records`' own filter language, not assembled as a
      // `where` object somewhere else: `$sourceIds` mints the input port the script below wires,
      // and `containedIn` is the vocabulary's word for it.
      node('items', 'DbCollection2', 0, 340, {
        collectionName: 'Item',
        storageFilterType: 'json',
        storageJSONFilter: "where({ sourceId: { containedIn: $sourceIds } })\nsort(['-published'])\n",
        storageEnableLimit: true,
        storageLimit: 50,
        ...PASSIVE(['collectionName', 'querySettings'])
      }),
      // Two steps in one script and deliberately so: the filter for the second query IS the
      // answer to the first, and a graph that round-trips it through a third node would only be
      // hiding the dependency.
      node('mine', 'JavaScriptFunction', 0, 220, {
        ...PASSIVE(['in-follows', 'in-userId']),
        functionScript: [
          ROW_HELPERS,
          'const me = Inputs.userId;',
          'const mine = rowsOf(Inputs.follows).filter(function (r) { return r.userId === me; });',
          'const ids = mine.map(function (r) { return r.sourceId; });',
          'Outputs.sourceIds = ids;',
          'Outputs.sourceCount = ids.length;'
        ].join('\n')
      }),
      node('shape', 'JavaScriptFunction', 0, 460, {
        ...PASSIVE(['in-items']),
        functionScript: [
          ROW_HELPERS,
          'const rows = rowsOf(Inputs.items);',
          // A stored Date comes back in Parse\'s shape (`{__type:"Date", iso}`), and a caller
          // that has to know that is a caller reading the storage format rather than the app\'s.
          'function when(value) { return value && value.iso ? value.iso : value; }',
          'Outputs.rows = rows.map(function (r) {',
          '  return { id: r.id, title: r.title, link: r.link, published: when(r.published), topics: r.topics, sourceId: r.sourceId };',
          '});',
          'Outputs.count = rows.length;'
        ].join('\n')
      }),
      node('res', 'noodl.cloud.response', 0, 580, { params: 'items,count,sourceCount' }),
      node('resErr', 'noodl.cloud.response', 300, 580, { params: 'error' })
    ],
    connections: [
      { sourceId: 'req', sourcePort: 'receive', targetId: 'follows', targetPort: 'storageFetch' },
      { sourceId: 'req', sourcePort: 'userId', targetId: 'mine', targetPort: 'in-userId' },
      { sourceId: 'follows', sourcePort: 'items', targetId: 'mine', targetPort: 'in-follows' },
      { sourceId: 'follows', sourcePort: 'fetched', targetId: 'mine', targetPort: 'run' },

      { sourceId: 'mine', sourcePort: 'out-sourceIds', targetId: 'items', targetPort: 'storageFilterValue-sourceIds' },
      { sourceId: 'mine', sourcePort: 'out-sourceCount', targetId: 'res', targetPort: 'pm-sourceCount' },
      { sourceId: 'mine', sourcePort: 'success', targetId: 'items', targetPort: 'storageFetch' },

      { sourceId: 'items', sourcePort: 'items', targetId: 'shape', targetPort: 'in-items' },
      { sourceId: 'items', sourcePort: 'fetched', targetId: 'shape', targetPort: 'run' },
      { sourceId: 'shape', sourcePort: 'out-rows', targetId: 'res', targetPort: 'pm-items' },
      { sourceId: 'shape', sourcePort: 'out-count', targetId: 'res', targetPort: 'pm-count' },
      { sourceId: 'shape', sourcePort: 'success', targetId: 'res', targetPort: 'send' },

      // R1.
      { sourceId: 'follows', sourcePort: 'failure', targetId: 'resErr', targetPort: 'send' },
      { sourceId: 'mine', sourcePort: 'failure', targetId: 'resErr', targetPort: 'send' },
      { sourceId: 'items', sourcePort: 'failure', targetId: 'resErr', targetPort: 'send' },
      { sourceId: 'shape', sourcePort: 'failure', targetId: 'resErr', targetPort: 'send' }
    ],
    roots: []
  };
}

/** The whole project's graph half, in the shape a deployed bundle carries it. */
export function workflowBundle() {
  return {
    components: [tagAndStoreComponent(), pollOneComponent(), pollSourcesFunction(), myListFunction()],
    settings: {},
    metadata: {}
  };
}

/**
 * The schedule.
 *
 * `overlapPolicy: 'skip'` is authored rather than inherited (FED-004 made it the default): the
 * record an operator reads should say what was decided, and a poll that is still running when the
 * next minute arrives is the ordinary case for a feed reader, not an exception.
 */
export function triggersFile(missedFirePolicy: 'skip' | 'run-once-on-start' = 'run-once-on-start') {
  return {
    version: 1,
    maxChangeDepth: 1,
    triggers: [
      {
        id: TRIGGER_ID,
        type: 'schedule',
        name: 'Poll the feeds',
        enabled: true,
        target: { kind: 'function', name: 'pollSources' },
        schedule: { cron: '* * * * *', missedFirePolicy, overlapPolicy: 'skip' },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        status: { lastFiredAt: '2026-01-01T00:00:00.000Z', nextFireAt: null, lastResult: null, fireCount: 0 }
      }
    ]
  };
}
