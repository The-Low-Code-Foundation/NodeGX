/**
 * BRG-006 — what the drive adds to FED-006's app, and why each addition is here.
 *
 * ## The corpus decision, which is the one that matters
 *
 * BRG-006 §3 says *"reuse an existing project rather than building one, so the drive measures the
 * product and not a fixture."* The base app is therefore **FED-006's feed reader, imported
 * unmodified** from `tests/fixtures/feed-drive/project.ts` — a real backend application authored
 * by a different phase, months of bridge concerns before this one, by people who had never heard
 * of `migrate`. Nothing in this file edits it. Everything below is **composed onto** it, and the
 * drive writes the composition to disk exactly once, before the migration, and hashes it.
 *
 * That split is the whole point. A corpus shaped by the migrator's own author grades the author.
 * Five of §3's nine capabilities are FED-006's and were never negotiable:
 *
 * | §3 capability | where it comes from |
 * |---|---|
 * | a cloud function that reads and writes as system | FED-006 `pollSources` (`runAs: 'system'`) |
 * | a schedule trigger | FED-006 `trg_fed006_poll`, `* * * * *`, `overlapPolicy: skip` |
 * | login, a session user, `creatorOwns` rows | FED-006 `Follow` / `Keep` |
 * | a scoped API key | FED-006's key bound to Alice |
 * | a unique index and upsert-on-unique | FED-006 `Item.id` unique + `upsertOn: 'id'` |
 *
 * The four it does not carry are below, and each is here because it names a **specific** way a
 * migration can be green and wrong — not to make a list longer:
 *
 * 1. **A relation.** BRG-D3 was `POSTGRES_TYPE_MAP.Relation = null`: a relation column skipped by
 *    `if (pgType)`, gone from the export with no warning. The drive does NOT declare a relation of
 *    its own — it uses the one **every NodeGX backend already has**, `_Role.users` and its
 *    `_Join_users__Role` junction, because that is the relation a real app's permissions hang off
 *    (`security/state.ts:525` reads it through `getRelationOwners`). A relation invented for the
 *    drive would have been a relation shaped like the fix.
 * 2. **A `Boolean` column.** BRG-D8 — a `Boolean` reads `0` on SQLite and `false` on PostgreSQL,
 *    same app, same record, over HTTP. It is declared, filed and deliberately unrepaired, so the
 *    drive is where it is measured **in a running application** rather than at a facade. `Mark.pinned`
 *    below is the column, and the workflow's own answer reads it back, so the blast radius is a
 *    person's data and not a test's.
 * 3. **An uploaded file.** Storage is already S3-capable and should be entirely unaffected by the
 *    database moving. "Should be" is the reason it is in the drive: an unmeasured independence is
 *    a claim, and file METADATA does live in the database (`storage/MetadataStore.ts`).
 * 4. **A workflow with a `for-each` and a `wait`.** §3's reason is occupancy: a `wait` holds a
 *    real concurrency slot across a step boundary, and the run's state has to survive it. It also
 *    reaches the half of the backend `migrate` does **not** touch — workflow execution history
 *    lives in `<dataDir>/executions.sqlite`, a second file, which is a property the drive should
 *    state out loud rather than let a reader assume.
 *
 * Realtime needs nothing declared here: `/realtime` and `/realtime/subscriptions` are runtime
 * surfaces, and the subscription rides `ChangeBus`'s commit boundary whatever the engine is.
 *
 * @module nodegx-backend/tests/fixtures/bridge-drive/additions
 */
import { ROW_HELPERS, type Column, type TableDecl } from '../feed-drive/project';

/**
 * `Mark` — the drive's own collection, and the only new table.
 *
 * 🔴 `pinned` is a `Boolean` **on purpose**: BRG-D8 is filed, declared and unrepaired, and the
 * drive is the place it is measured over HTTP in a running app. `note` beside it is a `String`
 * written from the same node in the same write, so a case that sees `pinned` differ and `note`
 * agree knows the difference is the declared type and not the write.
 */
export const MARK_TABLE: TableDecl = {
  table: 'Mark',
  columns: [
    { name: 'itemId', type: 'String' },
    { name: 'byUserId', type: 'String' },
    { name: 'pinned', type: 'Boolean' },
    { name: 'note', type: 'String' }
  ],
  indexes: [{ fields: ['itemId'] }]
};

/**
 * `Ping` — the collection the realtime subscription watches.
 *
 * It is DECLARED rather than left to be auto-created, for one reason that is about the drive and
 * not about realtime: a collection created implicitly while the app is running on PostgreSQL is a
 * table that exists on one engine and not the other, which would make AC7's return to SQLite a
 * comparison between two different databases. Everything the drive touches is in the schema it
 * pushed before the control was taken.
 *
 * Rows accumulate here — one excluded, one delivered, per engine — so nothing in the cross-engine
 * comparison counts `Ping`. What is compared is which FRAMES arrived.
 */
export const PING_TABLE: TableDecl = {
  table: 'Ping',
  columns: [
    { name: 'title', type: 'String' },
    { name: 'priority', type: 'Number' }
  ],
  indexes: []
};

/** The filter the drive subscribes with, and the two priorities either side of it. */
export const PING_THRESHOLD = 5;

/** The role whose membership is the relation under test. Named as a person would name one. */
export const ROLE_NAME = 'curators';

/** What `markOne` writes into `Mark.note`, asserted on both engines. */
export const MARK_NOTE = 'pinned by the workflow';

/** The workflow definition's id, and the id the drive runs and reads records for. */
export const WORKFLOW_ID = 'wf_brg006_pin';

/**
 * How long the workflow's `wait` step holds its concurrency slot.
 *
 * Long enough that the run is demonstrably still in flight when the step boundary is crossed
 * (the drive asserts the elapsed time is at least this), short enough that the drive is not
 * mostly a sleep. §3's claim is about occupancy, not duration.
 */
export const WAIT_MS = 400;

/**
 * A one-pixel PNG. Real bytes, not a text blob labelled `.png`: `storage/sniff.ts` reads the magic
 * number and a file whose declared type its content disagrees with is refused before it is stored,
 * which would make "the upload survived" an assertion about a rejection.
 */
export const UPLOAD_NAME = 'brg006-pixel.png';
export const UPLOAD_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

/** FED-006's security config, as it is on disk. Composed, never mutated. */
type SecurityConfig = Record<string, unknown> & {
  collections: Record<string, unknown>;
  functions: Record<string, unknown>;
  files: Record<string, unknown>;
};

/**
 * FED-006's rules, plus the three the additions need — **composed, not edited**.
 *
 * `Mark` is written by the workflow's function running as the system and by nobody else, which is
 * the same posture FED-006 gives `Item`: the only writer is a graph the person cannot call. It is
 * NOT creator-owned, because the creator is the system and a creator-owned row written by the
 * system is a row nobody can read.
 *
 * `files.upload` moves from `nobody` to `authenticated`: FED-006's app never uploads anything, and
 * a drive that asserted "the upload crossed" against an upload the rules refuse would be asserting
 * an absence beside nothing ([[assert-an-absence-with-a-known-firing-signal-beside-it]]).
 */
export function securityWith(base: SecurityConfig): SecurityConfig {
  return {
    ...base,
    collections: {
      ...base.collections,
      Mark: {
        permissions: { find: 'authenticated', get: 'authenticated', create: 'nobody', update: 'nobody', delete: 'nobody' },
        creatorOwns: false
      },
      Ping: {
        permissions: {
          find: 'authenticated',
          get: 'authenticated',
          create: 'authenticated',
          update: 'nobody',
          delete: 'nobody'
        },
        creatorOwns: false
      }
    },
    functions: {
      ...base.functions,
      markOne: { call: 'nobody', runAs: 'system', timeoutMs: 10_000 },
      countMarks: { call: 'nobody', runAs: 'system', timeoutMs: 10_000 }
    },
    files: { ...base.files, upload: 'authenticated' }
  };
}

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

/** FED-006's convention, repeated here for the same reason it exists there (NDA-017). */
const PASSIVE = (inputs: string[]): Record<string, boolean> =>
  Object.fromEntries(inputs.map((name) => [`runOnChange-${name}`, false]));

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
 * `markOne` — one item, pinned. The per-item unit of the workflow's `for-each`.
 *
 * 🔴 **It takes `item`, one object, not `itemId` and `byUserId` as two parameters.** `for-each`
 * hands the per-item function `{...ctx.input, [itemKey]: item, [indexKey]: index}`
 * (`steps/logic.ts:176`) — the element itself under one key, never spread — so a function
 * declaring the element's own fields as parameters receives nothing under either name and writes
 * a row of nulls. This is the workflow-engine twin of the trap FED-006's `mapItems` exists for on
 * the `Run Tasks` node, and it is the same shape: the loop names the item, the callee names its
 * ports, and something has to map between them.
 *
 * 🔴 `pinned` is produced by a script rather than typed into the node as a static parameter. Both
 * would work; the script is here because it makes the value a `true` that travelled through the
 * graph, which is what BRG-D8 is about — the declared type being applied (or not) on the way back
 * out, to a value a graph actually computed.
 *
 * Every failure path is wired (phase 96 register R1): a cloud function whose only wired path is
 * the happy one does not fail when the write is refused, it HANGS until its own timeout.
 */
function markOneFunction(): Component {
  return {
    name: '/#__cloud__/markOne',
    nodes: [
      node('req', 'noodl.cloud.request', 0, 0, { allowNoAuth: true, params: 'item' }),
      node('flag', 'JavaScriptFunction', 0, 120, {
        ...PASSIVE(['in-item']),
        functionScript: [
          'const it = Inputs.item || {};',
          'Outputs.itemId = it.itemId;',
          'Outputs.byUserId = it.byUserId;',
          'Outputs.pinned = true;',
          `Outputs.note = ${JSON.stringify(MARK_NOTE)};`
        ].join('\n')
      }),
      node('store', 'NewDbModelProperties', 0, 260, { collectionName: 'Mark' }),
      node('res', 'noodl.cloud.response', 0, 400, { params: 'outcome', 'pm-outcome': 'marked' }),
      node('resErr', 'noodl.cloud.response', 300, 400, { params: 'outcome', 'pm-outcome': 'failed' })
    ],
    connections: [
      { sourceId: 'req', sourcePort: 'item', targetId: 'flag', targetPort: 'in-item' },
      { sourceId: 'req', sourcePort: 'receive', targetId: 'flag', targetPort: 'run' },

      { sourceId: 'flag', sourcePort: 'out-itemId', targetId: 'store', targetPort: 'prop-itemId' },
      { sourceId: 'flag', sourcePort: 'out-byUserId', targetId: 'store', targetPort: 'prop-byUserId' },
      { sourceId: 'flag', sourcePort: 'out-pinned', targetId: 'store', targetPort: 'prop-pinned' },
      { sourceId: 'flag', sourcePort: 'out-note', targetId: 'store', targetPort: 'prop-note' },
      { sourceId: 'flag', sourcePort: 'success', targetId: 'store', targetPort: 'store' },

      { sourceId: 'store', sourcePort: 'done', targetId: 'res', targetPort: 'send' },

      // R1.
      { sourceId: 'flag', sourcePort: 'failure', targetId: 'resErr', targetPort: 'send' },
      { sourceId: 'store', sourcePort: 'failure', targetId: 'resErr', targetPort: 'send' }
    ],
    roots: []
  };
}

/**
 * `countMarks` — the workflow's last step, and the one that reads the Boolean back.
 *
 * 🔴 `firstPinned` is published RAW — whatever the adapter hands back, unnormalised. That is the
 * field BRG-D8 shows up in, and publishing it from a workflow's own answer is the difference
 * between "two adapters disagree" and "a person's app returns a different value after the move".
 * `marked` and `firstNote` beside it are the control: they must be identical on both engines.
 */
function countMarksFunction(): Component {
  return {
    name: '/#__cloud__/countMarks',
    nodes: [
      node('req', 'noodl.cloud.request', 0, 0, { allowNoAuth: true }),
      node('marks', 'DbCollection2', 0, 120, {
        collectionName: 'Mark',
        storageFilterType: 'json',
        storageJSONFilter: "sort(['itemId'])\n",
        ...PASSIVE(['collectionName', 'querySettings'])
      }),
      node('tally', 'JavaScriptFunction', 0, 260, {
        ...PASSIVE(['in-rows']),
        functionScript: [
          ROW_HELPERS,
          'const rows = rowsOf(Inputs.rows);',
          'Outputs.marked = rows.length;',
          // Raw on purpose — see the docstring. No `!!`, no `=== true`.
          'Outputs.firstPinned = rows.length ? rows[0].pinned : null;',
          'Outputs.firstNote = rows.length ? rows[0].note : null;'
        ].join('\n')
      }),
      node('res', 'noodl.cloud.response', 0, 400, { params: 'marked,firstPinned,firstNote' }),
      node('resErr', 'noodl.cloud.response', 300, 400, { params: 'error' })
    ],
    connections: [
      { sourceId: 'req', sourcePort: 'receive', targetId: 'marks', targetPort: 'storageFetch' },
      { sourceId: 'marks', sourcePort: 'items', targetId: 'tally', targetPort: 'in-rows' },
      { sourceId: 'marks', sourcePort: 'fetched', targetId: 'tally', targetPort: 'run' },

      { sourceId: 'tally', sourcePort: 'out-marked', targetId: 'res', targetPort: 'pm-marked' },
      { sourceId: 'tally', sourcePort: 'out-firstPinned', targetId: 'res', targetPort: 'pm-firstPinned' },
      { sourceId: 'tally', sourcePort: 'out-firstNote', targetId: 'res', targetPort: 'pm-firstNote' },
      { sourceId: 'tally', sourcePort: 'success', targetId: 'res', targetPort: 'send' },

      // R1.
      { sourceId: 'marks', sourcePort: 'failure', targetId: 'resErr', targetPort: 'send' },
      { sourceId: 'tally', sourcePort: 'failure', targetId: 'resErr', targetPort: 'send' }
    ],
    roots: []
  };
}

/** The two components the drive adds to FED-006's bundle. Concatenated, never substituted. */
export function extraComponents(): Component[] {
  return [markOneFunction(), countMarksFunction()];
}

/**
 * The workflow: pin a list of items, wait, then count them.
 *
 * `items` comes off the run PAYLOAD rather than a first step that queries them, so the drive
 * controls exactly which items the loop sees and the assertion about the count is about the loop
 * rather than about a query. The `wait` sits BETWEEN the loop and the tally — a step boundary with
 * a real occupancy on either side of it — which is §3's reason for asking for one.
 *
 * `concurrency: 1` on the definition and on the `for-each`: the results are compared in order
 * across two engines, and an out-of-order list would be a difference that is not damage.
 */
export function workflowDefinition(): Record<string, unknown> {
  return {
    version: 1,
    id: WORKFLOW_ID,
    name: 'Pin recent items',
    entry: 'each',
    concurrency: 1,
    steps: [
      {
        id: 'each',
        kind: 'for-each',
        ref: 'markOne',
        params: { items: { $path: 'items' }, itemKey: 'item', concurrency: 1 },
        next: ['settle']
      },
      { id: 'settle', kind: 'wait', params: { duration: WAIT_MS, unit: 'milliseconds' }, next: ['tally'] },
      { id: 'tally', kind: 'call-function', ref: 'countMarks' }
    ],
    createdAt: '2026-09-20T00:00:00.000Z',
    updatedAt: '2026-09-20T00:00:00.000Z'
  };
}

/** Re-exported so the drive's schema loop is one list, in the order it is pushed. */
export type { Column, TableDecl };
