/**
 * Array Map (catalog type `Map Collection`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/data/mapcollectionnode.ts` on 2026-10-01 (NSP-012).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: the node REBUILDS its output at the frame end — a NEW anonymous
 * array per run (`Collection.create`, :368) of NEW anonymous records, one per source row (:341 —
 * two guid draws per row and one per run; `Items` is replaced, NSP-012 AC6). A run is scheduled,
 * once per frame (:280-282), by `Items` arriving (:112-115), the `Script` arriving (:129-132), the
 * bound array's own `change` (:83-85) — none of these behind a checkbox — and the `Refresh` pulse,
 * the one invocation, a token per press (:144-146, :246-253). The script is COMPILED when it
 * arrives, `new Function('map', 'object', code)` (:208-218), and the declared default compiles at
 * creation (:102); a script that will not compile keeps its diagnosis for the run. The run
 * (:284-375): with no array ever bound it is SILENT unless a press asked, and then fails every
 * press with `array-map/no-items` (:292-305); a script that did not compile fails with
 * `array-map/script-failed` and the compiler's message (:327-335); otherwise the script runs
 * once per row with `map(…)` and the row (:339-353 — a string entry copies a property, a function
 * entry computes one), and a script that THROWS fails with `array-map/map-failed` and the thrown
 * message (:354-362) — an `Items` that is `null` throws here too, inside the `try`. Then `Items`
 * and `Count` are sent, `Changed` pulses (every run), and every press reports `done` (:371-374).
 * Failures write `Error`, raise once per distinct message until a run succeeds, owe every press
 * its outcome, and pulse `Failure` as a plain signal for a value-path run (:255-279).
 */

import type { ChangeEvent } from '../spec';
import { defineNode } from '../spec';
import type { RecordRef } from '../registry';
import { errorOutput } from './data-base';

/** :18-23 */
export const DEFAULT_MAP_CODE =
  'map({\n' +
  '\t// Here you add mappings between the input object and the mapped output object.\n' +
  "\t//myOutputProp: 'inputProp',\n" +
  "\t//anotherProperty: function(object) { return object.get('someProperty') + ' ' + object.get('otherProp') }\n" +
  '})\n';

type MapDeclarator = (mappings: Record<string, unknown>) => void;

/** :208-218 compileMapScript — the diagnosis, or nothing when the code compiles. */
function compile(code: unknown): { fn?: (map: MapDeclarator, object: unknown) => void; error?: string } {
  try {
    return { fn: new Function('map', 'object', code as string) as (map: MapDeclarator, object: unknown) => void };
  } catch (e) {
    return { error: (e as Error).message || String(e) };
  }
}

export type MapState = {
  source: unknown;
  mappedId: string | undefined;
  mapCode: unknown;
  compiled: boolean;
  compileError: string | undefined;
  lastError: string | undefined;
  lastReported: string | undefined;
  tokens: number;
  scheduled: boolean;
};

type Outcomes = Array<{ port: 'refresh'; outcome: 'done' | 'failure'; error?: string }>;

export const MapCollection = defineNode({
  type: 'Map Collection',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/mapcollectionnode.ts',
  needs: ['registry', 'random'],

  // :35-74, :82-105 — the default script is compiled at creation (:102)
  state: { source: undefined, mappedId: undefined, mapCode: DEFAULT_MAP_CODE, compiled: true, compileError: undefined, lastError: undefined, lastReported: undefined, tokens: 0, scheduled: false } as MapState,
  outcomes: ['done', 'failure'], // :183-186

  inputs: {
    // :107-116
    items: {
      type: 'array',
      coerce: 'array-literal',
      displayName: 'Items',
      group: 'General',
      description: 'Array to map; the node re-runs whenever this array reports a change',
      examples: [[{ name: 'Ada', n: 1 }, { name: 'Lin', n: 2 }]]
    },
    // :117-133 — panel only
    mapScript: {
      type: 'string',
      default: DEFAULT_MAP_CODE,
      coerce: 'none',
      editOnly: true,
      displayName: 'Script',
      group: 'Values',
      description: 'Script run once per record, declaring the output properties through map({ … }); each entry is either a source property name or a function of the record',
      examples: [
        DEFAULT_MAP_CODE,
        "map({ name: 'name' })",
        "map({ upper: function (o) { return String(o.get('name')).toUpperCase(); }, twice: function (o) { return o.n * 2; } })",
        "map({ title: 'name', raw: function (o) { return o.name; } })",
        "throw new Error('boom')",
        'map(',
        ''
      ]
    },
    // :139-147
    refresh: {
      type: 'signal',
      outcome: true,
      displayName: 'Refresh',
      group: 'General',
      description: 'Re-runs the mapping now, for a source array that changed without notifying'
    }
  },

  outputs: {
    // :150-158
    items: {
      type: 'array',
      displayName: 'Items',
      group: 'General',
      description: 'A new array of records built by the script; the source array is never modified',
      from: (s, w) => (s.mappedId !== undefined ? w.registry.collection(s.mappedId) : undefined)
    },
    // :159-167
    count: { type: 'number', displayName: 'Count', group: 'General', description: 'How many records the last successful mapping produced', from: (s, w) => (s.mappedId !== undefined ? w.registry.collection(s.mappedId).size() : 0) },
    // :174-181
    modified: {
      type: 'signal',
      displayName: 'Changed',
      group: 'Events',
      description: 'Fires once the mapping has run and Items is up to date, whether an author asked for the run or an input changed; wire Done instead for the outcome of a Refresh you triggered'
    },
    // :187-195
    error: errorOutput('Why the last mapping failed, in one sentence; empty until something fails', (s: { lastError: unknown }) => s.lastError)
  }
}).on(
  {
    // :112-115 → setCollection :219-223 (sends Items and Count, which have not moved) + bindCollection :230-234
    items: (s, v, _i, w) => {
      if (w.registry.isCollection(s.source)) w.unwatch({ collection: s.source.getId() });
      if (w.registry.isCollection(v)) w.watch({ collection: v.getId() });
      return { set: { source: v, scheduled: true }, send: ['items', 'count'] };
    },
    // :129-132
    mapScript: (_s, v) => {
      const c = compile(v);
      return { set: { mapCode: v, compiled: c.fn !== undefined, compileError: c.error, scheduled: true }, send: [] };
    },
    // :144-146 → requestMap :246-253
    refresh: (s) => ({ set: { tokens: s.tokens + 1, scheduled: true }, outcome: 'deferred', send: [] })
  },
  {
    // :284-375 — the run. Three paths leave nothing on the wire — no run due, a run with no array
    // and no press (:292-305), a failure already announced (:266-267) — and return ONE shape (the
    // flag cleared), so a suite that cannot tell them apart is not asked to; and a mutant that
    // leaves the flag set re-runs a silent run silently — declared equivalent (nodes/index.ts).
    afterInputs: (s, _i, w) => {
      const idle = { set: { scheduled: false } as Partial<MapState>, send: [] as Array<'error'> };
      if (!s.scheduled) return idle;
      const n = s.tokens;
      const fail = (code: string, message: string) => {
        // :255-279 reportFailure
        const repeat = s.lastReported === message;
        if (n > 0) {
          const outcomes: Outcomes = Array.from({ length: n }, () => ({ port: 'refresh', outcome: 'failure', error: code }));
          return { set: { scheduled: false, tokens: 0, lastError: message, lastReported: message } as Partial<MapState>, send: ['error' as const], outcomes };
        }
        if (repeat) return { ...idle, send: ['error' as const] }; // :266-267 — Error re-sent, nothing raised, nothing pulsed
        return { set: { scheduled: false, lastError: message, lastReported: message } as Partial<MapState>, send: ['error' as const], emit: ['failure' as const] }; // :278
      };
      if (s.source === undefined) {
        if (n > 0) return fail('array-map/no-items', 'Nothing to map — no array is connected to the Items input'); // :297-302
        return idle;
      }
      if (!s.compiled) return fail('array-map/script-failed', 'The map script could not be compiled: ' + (s.compileError || 'the Script input is empty')); // :327-334
      const mapFunc = compile(s.mapCode).fn!;
      let mapped: RecordRef[];
      try {
        mapped = (s.source as { map: (f: (model: unknown) => RecordRef) => RecordRef[] }).map((model) => {
          const m = w.registry.create(); // :341 — a fresh anonymous record
          mapFunc(function (mappings) {
            for (const key in mappings) {
              const mapping = mappings[key];
              if (typeof mapping === 'function') m.set(key, (mapping as (o: unknown) => unknown)(model)); // :345-346
              else if (typeof mapping === 'string') m.set(key, (model as RecordRef).get(mapping)); // :347-348
            }
          }, model);
          return m;
        });
      } catch (e) {
        return fail('array-map/map-failed', 'The map script failed: ' + ((e as Error).message || String(e))); // :355-360
      }
      const collection = w.registry.collectionCreate(mapped); // :368
      const outcomes: Outcomes = Array.from({ length: n }, () => ({ port: 'refresh', outcome: 'done' }));
      return { set: { scheduled: false, tokens: 0, lastReported: undefined, mappedId: collection.getId() }, send: ['items', 'count'], emit: ['modified'], outcomes }; // :366-374
    },
    world: {
      // :83-85 — the bound array changed; no checkbox on this node
      change: (s, _i, e: ChangeEvent, w) => (e.kind === 'collection' && w.registry.isCollection(s.source) && e.id === s.source.getId() ? { set: { scheduled: true }, send: [] } : { send: [] })
    }
  }
);
