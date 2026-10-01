/**
 * Parse Feed (`net.noodl.ParseFeed`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/data/parsefeed.ts` and `packages/noodl-runtime/src/feed.ts`
 * on 2026-10-01 (NSP-013).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: the node parses at the FRAME END, once per frame however many
 * of its two inputs moved (:224-231), and abstains until something has arrived on `Feed` (:234 —
 * anything but `undefined` and `null`). The text goes to feed.ts `parseFeed` (feed.ts in this
 * package, the runtime's file verbatim). A failure sets `Error` and `Error Code`, raises
 * `parse-feed/parse-failed` on the runtime error channel (an effect beside the trace) and pulses
 * `Failure`, leaving every other output as it was (:238-245). A success clears both (sent — a
 * wire keeps the last reason), puts the items into a FRESH anonymous array (:257-262 —
 * `Collection.get()`, one guid draw, then `set`) and flags all eight value outputs, then
 * `Changed` (:248-286).
 *
 * ⚠️ Two things the sentence does not say, both the runtime's (R3 (a)):
 * - every item carries an `id`, so `set` makes each one a NAMED record (`Model.create` keys it by
 *   the id — the registry, not a guid): two items with one id in a feed are ONE
 *   record, held ONCE by Items with the later item's fields while Count says two; the same id in a
 *   later parse, or on an Object node anywhere in the app, is the same record (NSP-013 §6 row D18);
 * - `Feed Updated` is `|| undefined` (:269) — and an undefined is never sent, so a feed that does
 *   not say when it changed leaves the PREVIOUS feed's date on the wire where the description
 *   promises empty (row D17); every other Feed output falls back to `''` and is sent.
 *
 * Dates are the world's ZONE (`needs: 'timezone'`): feed.ts reads a date with `Date.parse`, and a
 * date with no offset is read in the zone the process runs in (row D16, with the named zones
 * `Date.parse` declines and feed.ts then reads as UTC).
 */

import { defineNode } from '../spec';
import { FEED_EXAMPLES, parseFeed } from './feed';
import { DEFAULT_MAX_BYTES } from './xml';
import { errorOutput } from './data-base';

/** :34 — the runtime error code a failed parse raises (an effect; the runtime target keeps it on the handle). */
export const PARSE_ERROR_CODE = 'parse-feed/parse-failed';

type State = {
  text: unknown;
  textSupplied: boolean;
  maxBytes: number;
  /** The anonymous array of the last successful parse, by id. */
  collectionId: string | undefined;
  count: number;
  feedTitle: string;
  feedLink: string;
  feedDescription: string;
  feedUpdated: string | undefined;
  kind: string;
  source: string;
  lastError: string | undefined;
  lastErrorCode: string | undefined;
  scheduled: boolean;
}

export const ParseFeed = defineNode({
  type: 'net.noodl.ParseFeed',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/parsefeed.ts; packages/noodl-runtime/src/feed.ts; packages/noodl-runtime/src/xml.ts',
  needs: ['registry', 'random', 'timezone'],

  // :65-73 initialize
  state: { text: undefined, textSupplied: false, maxBytes: DEFAULT_MAX_BYTES, collectionId: undefined, count: 0, feedTitle: '', feedLink: '', feedDescription: '', feedUpdated: undefined, kind: '', source: '', lastError: undefined, lastErrorCode: undefined, scheduled: false } as State,

  inputs: {
    // :79-92 — raw; supplied = not undefined / null
    text: {
      type: 'string',
      coerce: 'none',
      examples: FEED_EXAMPLES,
      displayName: 'Feed',
      group: 'General',
      description:
        'The feed document — RSS 2.0, Atom 1.0 or RDF/RSS 1.0. Wire an HTTP Request node\'s ' +
        'Response here with its Response Type set to Text: feeds are served as application/rss+xml, ' +
        'text/xml and, from some sources, text/html, and Text is what guarantees the body arrives untouched'
    },
    // :93-106 — `Number(value)`, finite and > 0, else the default (:102-103)
    maxBytes: {
      type: 'number',
      default: DEFAULT_MAX_BYTES,
      coerce: 'none',
      examples: [40, 1000, 0, -1, 'x'],
      displayName: 'Max Bytes',
      group: 'General',
      description:
        'Refuse a document larger than this, before parsing it. Raise it for a source that really ' +
        'does publish its whole archive in one file'
    }
  },

  outputs: {
    // :109-122
    items: {
      type: 'array',
      from: (s, w) => (s.collectionId !== undefined ? w.registry.collection(s.collectionId) : undefined),
      displayName: 'Items',
      group: 'Values',
      description:
        'The feed\'s items, always an array whether the feed carried one or a hundred. Each has ' +
        'Id, Title, Link, Published, Updated, Author, Summary, Content, Image, Enclosure, Tags and ' +
        'Raw. Id is never empty — it is the guid, or the Atom id, or the link, or a hash of title ' +
        'and date — which is what lets a collection store each item once. Unchanged while the feed ' +
        'cannot be parsed'
    },
    // :123-131
    count: { type: 'number', from: (s) => s.count, displayName: 'Count', group: 'Values', description: 'How many items the last successful parse produced' },
    // :132-188
    feedTitle: { type: 'string', from: (s) => s.feedTitle, displayName: 'Feed Title', group: 'Feed', description: 'The title of the feed itself, not of any item' },
    feedLink: { type: 'string', from: (s) => s.feedLink, displayName: 'Feed Link', group: 'Feed', description: 'The site the feed belongs to — its alternate link, never its own XML address' },
    feedDescription: { type: 'string', from: (s) => s.feedDescription, displayName: 'Feed Description', group: 'Feed', description: 'The feed\'s description, or an Atom feed\'s subtitle' },
    feedUpdated: { type: 'string', from: (s) => s.feedUpdated, displayName: 'Feed Updated', group: 'Feed', description: 'When the feed last changed, as an ISO 8601 string; empty when it did not say' },
    kind: { type: 'string', from: (s) => s.kind, displayName: 'Kind', group: 'Feed', description: 'Which format this was: rss, atom or rdf' },
    source: {
      type: 'string',
      from: (s) => s.source,
      displayName: 'Source',
      group: 'Feed',
      description:
        'A hint at where the feed came from, for a graph that wants to branch: youtube, reddit, ' +
        'podcast or generic. A hint, not a promise — generic is what an unrecognised source gets ' +
        'and it is not a failure'
    },
    // :189-194
    changed: { type: 'signal', displayName: 'Changed', group: 'Events', description: 'Fires once Items and the Feed outputs hold the freshly parsed feed' },
    // :195-200 — a plain signal, no invocation behind it
    failure: { type: 'signal', displayName: 'Failure', group: 'Events', description: 'Fires when the feed could not be read, leaving Items and Count as they were' },
    // :201-209
    error: errorOutput('Why the feed could not be read; empty until a parse fails', (s: { lastError: unknown }) => s.lastError),
    // :210-221
    errorCode: {
      type: 'string',
      from: (s) => s.lastErrorCode,
      displayName: 'Error Code',
      group: 'Error',
      description:
        'A stable code for the failure, for a graph that branches rather than reads: ' +
        'feed/unrecognised when the document is XML but not a feed, otherwise the Parse XML codes ' +
        '(xml/too-large, xml/entity-declaration, xml/doctype-subset, xml/parse-failed, xml/empty)'
    }
  }
}).on(
  {
    text: (_s, v) => ({ set: { text: v, textSupplied: v !== undefined && v !== null, scheduled: true }, send: [] }), // :88-90
    maxBytes: (_s, v) => {
      const n = Number(v); // :102
      return { set: { maxBytes: isFinite(n) && n > 0 ? n : DEFAULT_MAX_BYTES, scheduled: true }, send: [] }; // :103-104
    }
  },
  {
    // :224-231 `_schedule` → :232-287 `_parse`
    afterInputs: (s, _i, w) => {
      const idle = { set: { scheduled: false }, send: [] as Array<'error'> };
      if (!s.scheduled || !s.textSupplied) return idle; // :234

      const result = parseFeed(s.text as string, s.maxBytes); // :236
      if (result.error) {
        // :238-245 — the reason and the code, the runtime error raised (an effect), Failure; everything else untouched
        return { set: { scheduled: false, lastError: result.error.message, lastErrorCode: result.error.code }, send: ['error', 'errorCode'], emit: ['failure'] };
      }

      const items = result.items || []; // :253
      const collection = w.registry.collection(); // :257 — anonymous, a fresh array every parse
      collection.set(items as unknown as Record<string, unknown>[]); // :261 — each item NAMED by its id
      const feed = result.feed;
      return {
        set: {
          scheduled: false,
          lastError: undefined, // :248-251
          lastErrorCode: undefined,
          collectionId: collection.getId(), // :262
          count: items.length, // :263
          feedTitle: (feed && feed.title) || '', // :266-271
          feedLink: (feed && feed.link) || '',
          feedDescription: (feed && feed.description) || '',
          feedUpdated: (feed && feed.updated) || undefined,
          kind: (feed && feed.kind) || '',
          source: (feed && feed.source) || ''
        },
        send: ['error', 'errorCode', 'items', 'count', 'feedTitle', 'feedLink', 'feedDescription', 'feedUpdated', 'kind', 'source'], // :273-284
        emit: ['changed'] // :286
      };
    }
  }
);
