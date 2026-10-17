---
title: "Parse Feed"
---
Reads an RSS, Atom or RDF feed and gives every item one shape — blog, YouTube channel, subreddit or podcast alike.

Parse Feed takes a feed document and hands back Items, always an array, whatever format the feed used and however many items it carried. Each item has Id, Title, Link, Published, Updated, Author, Summary, Content, Image, Enclosure, Tags and Raw. The point of the node is that the mapping is the hard part: the body is description, or content:encoded, or &lt;content>, or buried inside &lt;media:group> on YouTube; the date is RFC 822 on RSS and ISO 8601 on Atom and dc:date on RDF, and Published is converted to ISO 8601 or left null rather than guessed; Atom's &lt;link> is a family of links whose first entry is usually the feed's own XML address, so a naive reader shows that to a person instead of the article; and RDF puts &lt;item> beside &lt;channel> rather than inside it, so a naive reader gets a title and zero items. Id is never empty — it is the guid, or the Atom id, or the link, or a hash of title and date — because that is what lets a collection store each item exactly once however often you poll. Content is NOT sanitised: it is whatever HTML the feed shipped, tracking pixels and all, and sanitising belongs to whatever renders it. Kind tells you which format this was (rss, atom, rdf) and Source is a hint at where it came from (youtube, reddit, podcast, generic) for a graph that wants to branch. Anything the shape does not cover — yt:videoId, itunes:duration — is on Raw.

## When to use it

Any time you are reading a feed: a blog, a news site, a YouTube channel's /feeds/videos.xml, a subreddit's .rss, a podcast, an OPML import's worth of all of them. Put an HTTP Request node in front with Response Type set to Text. For XML that is not a feed, use Parse XML.

## At a glance

| | |
|---|---|
| Category | Data |
| Type name | `net.noodl.ParseFeed` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 5 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `maxBytes` | Number | `5242880` | Refuse a document longer than this many characters (not bytes), before parsing it. Raise it for a source that really does publish its whole archive in one file |
| `text` | String | — | The feed document — RSS 2.0, Atom 1.0 or RDF/RSS 1.0. Wire an HTTP Request node's Response here with its Response Type set to Text: feeds are served as application/rss+xml, text/xml and, from some sources, text/html, and Text is what guarantees the body arrives untouched |

### What each input does

**Feed** (`text`)

- always: parsed at the end of the frame (once, however many inputs moved) — Items in a fresh array, Count, the six Feed outputs and Changed, or Error, Error Code and Failure with everything else untouched; nothing (undefined or null) is not parsed

**Max Characters** (`maxBytes`)

- always: the Feed is parsed again at the end of the frame, once any has arrived — a text longer than this (counted in characters) is refused as xml/too-large before parsing; not a finite number above 0 reads as the default, 5 MB

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `count` | Number | — | How many items Items holds after the last successful parse |
| `feedDescription` | String | — | The feed's description, or an Atom feed's subtitle |
| `feedLink` | String | — | The site the feed belongs to — its alternate link, never its own XML address |
| `feedTitle` | String | — | The title of the feed itself, not of any item |
| `feedUpdated` | String | — | When the feed last changed, as an ISO 8601 string; empty when it did not say |
| `items` | Array | — | The feed's items, always an array whether the feed carried one or a hundred. Each has Id, Title, Link, Published, Updated, Author, Summary, Content, Image, Enclosure, Tags and Raw. Id is never empty — it is the guid, or the Atom id, or the link, or a hash of title and date — which is what lets a collection store each item once. Each item is the app's shared record of its Id: two items with one Id are one record, with the later item's fields, and an Object node or another Parse Feed using that Id holds the same one. Unchanged while the feed cannot be parsed |
| `kind` | String | — | Which format this was: rss, atom or rdf |
| `source` | String | — | A hint at where the feed came from, for a graph that wants to branch: youtube, reddit, podcast or generic. A hint, not a promise — generic is what an unrecognised source gets and it is not a failure |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `changed` | Signal | — | Fires once Items and the Feed outputs hold the freshly parsed feed |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the feed could not be read; empty until a parse fails |
| `errorCode` | String | — | A stable code for the failure, for a graph that branches rather than reads: feed/unrecognised when the document is XML but not a feed, otherwise the Parse XML codes (xml/too-large, xml/entity-declaration, xml/doctype-subset, xml/parse-failed, xml/empty) |
| `failure` | Signal | — | Fires when the feed could not be read, leaving Items and Count as they were |

## Patterns

- HTTP Request (Response Type: Text) → Parse Feed `text` → For Each over `items`: the whole 'poll a source' shape, with no Function node.
- Store items keyed on Id. It is stable across polls by design, so the same item does not arrive twice however often the schedule fires.
- Wire BOTH failure paths — the HTTP node's and this node's. A graph that wires only the parser's Failure still hangs when the fetch itself fails, which is what a mislabelled content-type does (CWF-018).
- Branch on `source` when a YouTube video and a blog post should be shown differently, and read the rest off `raw`.

## Watch out for

- Rendering `content` without sanitising it. It is the publisher's HTML, unaltered, and this node says so rather than quietly changing it.
- Leaving Response Type on Auto. It works for honestly-labelled feeds and fails on the ones that are not, which includes sources that serve XML as text/html.
- Treating `published` as always present. It is null when the feed carried no usable date, on purpose — an invented date sorts wrongly forever and silently.
- Using `title` as the identity. Titles get edited after publication; Id does not.

## Examples

**Show the latest posts from a feed**

The whole of 'read a feed' with no Function node: HTTP Request fetches, Parse Feed normalises, a Repeater draws a row per item. Two things in this graph are not decoration and both cost an afternoon if you leave them out. First, HTTP Request's Response Type is set to Text rather than Auto. Auto decides what to do from the server's content-type header, and feeds are served as application/rss+xml, text/xml, application/xml and — from some real sources — text/html; worse, a server that mislabels an XML body as application/json makes Auto try to parse it as JSON and fail at the FETCH, before Parse Feed ever runs. Text says 'hand me the bytes' and is right for every feed. Second, BOTH failure paths are wired: the HTTP node's and the parser's. They are different failures — one is 'the server did not answer usably', the other is 'the answer was not a feed' — and a graph that wires only the second sits silently when the first happens. Everything after that is ordinary: items all have the same shape whether this feed was RSS, Atom or RDF, so the Repeater's Text nodes read Title and Published without knowing or caring which. Published is an ISO 8601 string, or null when the feed carried no usable date — it is left null rather than guessed, because an invented date sorts wrongly forever and silently. Note what is NOT wired: Content goes nowhere here. It is the publisher's HTML, unsanitised, and putting it straight into an HTML surface is how you inherit someone else's tracking pixels and script tags.

## Related nodes

[Parse XML](./net-noodl-parse-xml.md), [HTTP Request](./net-noodl-http.md), [Parse CSV](./net-noodl-parse-csv.md), [Repeater](../visual/for-each.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 5. The spec is the reference: the runtime, the React export and the conformance tests are all graded against it. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- the shared store of Objects and Arrays, looked up by id (`registry`)
- random numbers (`random`)
- the local time zone (`timezone`)

### Starting state

```json
{
  "textSupplied": false,
  "maxBytes": 5242880,
  "count": 0,
  "feedTitle": "",
  "feedLink": "",
  "feedDescription": "",
  "kind": "",
  "source": "",
  "scheduled": false
}
```

### Version history

- **Version 5**: Words only: "Max Bytes" is now "Max Characters", and the xml/too-large Error says "N K characters, over the M K limit. Raise Max Characters on the node…" where it said "N KB, over the M KB limit. Raise Max Bytes…". The check is the same: it always counted characters, not bytes. Existing projects are not migrated: ruled "Rename it Max Characters and keep the check" (R28): the port id stays `maxBytes`, so a saved project reads as before, and only the words of an Error changed. The reach measured on 2026-10-12 was 0 Parse XML or Parse Feed nodes in Richard's projects.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/parse-feed.ts"
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
 * - every item carries an `id`, so `set` makes each one a NAMED record (`Model.create` keys it by
 *   the id — the registry, not a guid): two items with one id in a feed are ONE record, held ONCE
 *   by Items with the later item's fields, and Count says what Items holds (v4, row D18 ruled "Match
 *   Count, describe sharing"; v3 said two). The same id in a later parse, or on an Object node
 *   anywhere in the app, is the same record — Items' description says so.
 * - `Feed Updated` falls back to `''` and is sent, as every other Feed output (v3, row D17 ruled "Send
 *   empty text"; v2 was `|| undefined`, never sent, so the PREVIOUS feed's date stayed on the wire).
 *
 * Dates (v2, row D16 ruled "UTC, and no date if unknown"): a date with no zone is read as UTC, so
 * the world's zone no longer moves it; a trailing zone name `Date.parse` does not know (CEST, BST)
 * gives no date. v1 read a zoneless date in the zone the process runs in and an unknown name as UTC.
 * The zone stays a need: the D16 scenarios play it in three zones to show it no longer matters.
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
  // v2 (P109 ISL-032, row D16): a zoneless date is UTC everywhere, an unknown zone name gives no date.
  // v3 (row D17): Feed Updated is empty text when a feed does not say. v4 (row D18): Count is what Items holds.
  // v5 (P107 s92, row C162 — R28): the cap is named Max Characters, and its Error says so
  version: 5,
  changes: [
    {
      version: 5,
      says: 'Words only: "Max Bytes" is now "Max Characters", and the xml/too-large Error says "N K characters, over the M K limit. Raise Max Characters on the node…" where it said "N KB, over the M KB limit. Raise Max Bytes…". The check is the same: it always counted characters, not bytes',
      row: 'P107-C162 (R28)',
      migration: {
        none: 'Ruled "Rename it Max Characters and keep the check" (R28): the port id stays `maxBytes`, so a saved project reads as before, and only the words of an Error changed. The reach measured on 2026-10-12 was 0 Parse XML or Parse Feed nodes in Richard\'s projects'
      }
    }
  ],
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
      displayName: 'Max Characters',
      group: 'General',
      description:
        'Refuse a document longer than this many characters (not bytes), before parsing it. Raise it for a source that really ' +
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
        'and date — which is what lets a collection store each item once. Each item is the app\'s shared ' +
        'record of its Id: two items with one Id are one record, with the later item\'s fields, and an ' +
        'Object node or another Parse Feed using that Id holds the same one. Unchanged while the feed ' +
        'cannot be parsed'
    },
    // :123-131
    count: { type: 'number', from: (s) => s.count, displayName: 'Count', group: 'Values', description: 'How many items Items holds after the last successful parse' },
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
    text: (_s, v) => ({ says: 'always: parsed at the end of the frame (once, however many inputs moved) — Items in a fresh array, Count, the six Feed outputs and Changed, or Error, Error Code and Failure with everything else untouched; nothing (undefined or null) is not parsed', set: { text: v, textSupplied: v !== undefined && v !== null, scheduled: true }, send: [] }), // :88-90
    maxBytes: (_s, v) => {
      const n = Number(v); // :102
      return { says: 'always: the Feed is parsed again at the end of the frame, once any has arrived — a text longer than this (counted in characters) is refused as xml/too-large before parsing; not a finite number above 0 reads as the default, 5 MB', set: { maxBytes: isFinite(n) && n > 0 ? n : DEFAULT_MAX_BYTES, scheduled: true }, send: [] }; // :103-104
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
          count: collection.size(), // :263 — what Items holds (v4, D18)
          feedTitle: (feed && feed.title) || '', // :266-271
          feedLink: (feed && feed.link) || '',
          feedDescription: (feed && feed.description) || '',
          feedUpdated: (feed && feed.updated) || '', // v3 (D17)
          kind: (feed && feed.kind) || '',
          source: (feed && feed.source) || ''
        },
        send: ['error', 'errorCode', 'items', 'count', 'feedTitle', 'feedLink', 'feedDescription', 'feedUpdated', 'kind', 'source'], // :273-284
        emit: ['changed'] // :286
      };
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
