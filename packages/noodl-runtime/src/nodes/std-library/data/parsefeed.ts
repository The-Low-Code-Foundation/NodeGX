'use strict';

/**
 * Parse Feed (FED-001) — RSS, Atom or RDF in, one list of items out.
 *
 * ## Why this is a node and not "use Parse XML and map it yourself"
 *
 * Because the mapping is the hard part and everyone gets it wrong the same six ways. The body is
 * `description`, or `content:encoded`, or `<content>`, or inside `<media:group>`. The date is
 * RFC 822, or ISO 8601, or `dc:date`. Atom's `<link>` is a family and the first one is usually the
 * feed's own address, so the naive reader shows a person the XML URL. RDF puts `<item>` beside
 * `<channel>` rather than inside it, so the naive reader gets a title and zero items. Each of
 * those is a fixture in `test/fixtures/feeds/` and a test in `test/fed-001-feed.test.ts`.
 *
 * ## Items are not sanitised, and this node says so where a person will read it
 *
 * `Content` is whatever HTML the feed shipped, tracking pixels and all. Sanitising belongs to
 * whatever renders it, and doing it here would be doing it invisibly. The port description says
 * this, because that is where someone wiring Content into an HTML surface is looking.
 *
 * ## Shared runtime, both surfaces
 *
 * Next to `Parse CSV` and `Parse XML`, for the reason R1 gives. A browser app reading a public
 * feed wants this exactly as much as a cloud function polling a thousand sources does.
 */

import Collection = require('../../../collection');
import type { CollectionLike, InspectInfo, NodeDefinitionOptions, NodeInstance, NodeModule } from '@noodl/types';

import { parseFeed } from '../../../feed';
import { DEFAULT_MAX_BYTES } from '../../../xml';

/** The editor's warning key as well as the runtime error code. */
const PARSE_ERROR_CODE = 'parse-feed/parse-failed';

interface ParseFeedNodeInstance extends NodeInstance {
  _internal: {
    text?: string;
    /** Whether anything has ever arrived on `Feed`. The abstain — see `_parse`. */
    textSupplied?: boolean;
    maxBytes: number;
    /** Replaced only on a successful parse. */
    items?: CollectionLike;
    count: number;
    feedTitle: string;
    feedLink: string;
    feedDescription: string;
    feedUpdated?: string;
    kind: string;
    source: string;
    lastError?: string;
    lastErrorCode?: string;
    scheduled?: boolean;
  };
  _schedule(): void;
  _parse(): void;
}

const ParseFeedNode: NodeDefinitionOptions = {
  name: 'net.noodl.ParseFeed',
  displayNodeName: 'Parse Feed',
  docs: 'https://docs.noodl.net/nodes/data/array/parse-feed',
  category: 'Data',
  color: 'data',
  initialize: function (this: ParseFeedNodeInstance) {
    this._internal.maxBytes = DEFAULT_MAX_BYTES;
    this._internal.count = 0;
    this._internal.feedTitle = '';
    this._internal.feedLink = '';
    this._internal.feedDescription = '';
    this._internal.kind = '';
    this._internal.source = '';
  },
  getInspectInfo(this: ParseFeedNodeInstance): InspectInfo | void {
    if (this._internal.lastError) return this._internal.lastError;
    if (this._internal.items) return [{ type: 'value', value: this._internal.items }];
  },
  inputs: {
    text: {
      type: { name: 'string', codeeditor: 'text' },
      displayName: 'Feed',
      group: 'General',
      description:
        'The feed document — RSS 2.0, Atom 1.0 or RDF/RSS 1.0. Wire an HTTP Request node\'s ' +
        'Response here with its Response Type set to Text: feeds are served as application/rss+xml, ' +
        'text/xml and, from some sources, text/html, and Text is what guarantees the body arrives untouched',
      set: function (this: ParseFeedNodeInstance, value: string) {
        this._internal.textSupplied = value !== undefined && value !== null;
        this._internal.text = value;
        this._schedule();
      }
    },
    maxBytes: {
      type: 'number',
      displayName: 'Max Bytes',
      group: 'General',
      default: DEFAULT_MAX_BYTES,
      description:
        'Refuse a document larger than this, before parsing it. Raise it for a source that really ' +
        'does publish its whole archive in one file',
      set: function (this: ParseFeedNodeInstance, value: number) {
        const n = Number(value);
        this._internal.maxBytes = isFinite(n) && n > 0 ? n : DEFAULT_MAX_BYTES;
        this._schedule();
      }
    }
  },
  outputs: {
    items: {
      type: 'array',
      displayName: 'Items',
      group: 'Values',
      description:
        'The feed\'s items, always an array whether the feed carried one or a hundred. Each has ' +
        'Id, Title, Link, Published, Updated, Author, Summary, Content, Image, Enclosure, Tags and ' +
        'Raw. Id is never empty — it is the guid, or the Atom id, or the link, or a hash of title ' +
        'and date — which is what lets a collection store each item once. Unchanged while the feed ' +
        'cannot be parsed',
      getter: function (this: ParseFeedNodeInstance) {
        return this._internal.items;
      }
    },
    count: {
      type: 'number',
      displayName: 'Count',
      group: 'Values',
      description: 'How many items the last successful parse produced',
      getter: function (this: ParseFeedNodeInstance) {
        return this._internal.count;
      }
    },
    feedTitle: {
      type: 'string',
      displayName: 'Feed Title',
      group: 'Feed',
      description: 'The title of the feed itself, not of any item',
      getter: function (this: ParseFeedNodeInstance) {
        return this._internal.feedTitle;
      }
    },
    feedLink: {
      type: 'string',
      displayName: 'Feed Link',
      group: 'Feed',
      description: 'The site the feed belongs to — its alternate link, never its own XML address',
      getter: function (this: ParseFeedNodeInstance) {
        return this._internal.feedLink;
      }
    },
    feedDescription: {
      type: 'string',
      displayName: 'Feed Description',
      group: 'Feed',
      description: 'The feed\'s description, or an Atom feed\'s subtitle',
      getter: function (this: ParseFeedNodeInstance) {
        return this._internal.feedDescription;
      }
    },
    feedUpdated: {
      type: 'string',
      displayName: 'Feed Updated',
      group: 'Feed',
      description: 'When the feed last changed, as an ISO 8601 string; empty when it did not say',
      getter: function (this: ParseFeedNodeInstance) {
        return this._internal.feedUpdated;
      }
    },
    kind: {
      type: 'string',
      displayName: 'Kind',
      group: 'Feed',
      description: 'Which format this was: rss, atom or rdf',
      getter: function (this: ParseFeedNodeInstance) {
        return this._internal.kind;
      }
    },
    source: {
      type: 'string',
      displayName: 'Source',
      group: 'Feed',
      description:
        'A hint at where the feed came from, for a graph that wants to branch: youtube, reddit, ' +
        'podcast or generic. A hint, not a promise — generic is what an unrecognised source gets ' +
        'and it is not a failure',
      getter: function (this: ParseFeedNodeInstance) {
        return this._internal.source;
      }
    },
    changed: {
      type: 'signal',
      displayName: 'Changed',
      group: 'Events',
      description: 'Fires once Items and the Feed outputs hold the freshly parsed feed'
    },
    failure: {
      type: 'signal',
      displayName: 'Failure',
      group: 'Events',
      description: 'Fires when the feed could not be read, leaving Items and Count as they were'
    },
    error: {
      type: 'string',
      displayName: 'Error',
      group: 'Error',
      description: 'Why the feed could not be read; empty until a parse fails',
      getter: function (this: ParseFeedNodeInstance) {
        return this._internal.lastError;
      }
    },
    errorCode: {
      type: 'string',
      displayName: 'Error Code',
      group: 'Error',
      description:
        'A stable code for the failure, for a graph that branches rather than reads: ' +
        'feed/unrecognised when the document is XML but not a feed, otherwise the Parse XML codes ' +
        '(xml/too-large, xml/entity-declaration, xml/doctype-subset, xml/parse-failed, xml/empty)',
      getter: function (this: ParseFeedNodeInstance) {
        return this._internal.lastErrorCode;
      }
    }
  },
  methods: {
    _schedule: function (this: ParseFeedNodeInstance) {
      if (this._internal.scheduled) return;
      this._internal.scheduled = true;
      this.scheduleAfterInputsHaveUpdated(() => {
        this._internal.scheduled = false;
        this._parse();
      });
    },
    _parse: function (this: ParseFeedNodeInstance) {
      // Failure Contract §2 — an unset input is not an error.
      if (!this._internal.textSupplied) return;

      const result = parseFeed(this._internal.text, this._internal.maxBytes);

      if (result.error) {
        this._internal.lastError = result.error.message;
        this._internal.lastErrorCode = result.error.code;
        this.flagOutputDirty('error');
        this.flagOutputDirty('errorCode');
        this.raiseRuntimeError(PARSE_ERROR_CODE, result.error.message, { code: result.error.code });
        this.sendSignalOnOutput('failure');
        return;
      }

      this._internal.lastError = undefined;
      this._internal.lastErrorCode = undefined;
      this.flagOutputDirty('error');
      this.flagOutputDirty('errorCode');

      const items = result.items || [];
      // A Collection rather than a plain array, so the array family downstream — Repeater, For
      // Each, Filter Collection — sees records with `.get()`, which is what `Parse CSV` and
      // `Static Array` already hand them.
      const collection = Collection.get();
      // `FeedItem` is a declared interface, so it has no index signature and `CollectionLike` asks
      // for one. The cast asserts what is already true — every item is a plain object of plain
      // values — rather than widening the type the rest of the module is checked against.
      collection.set(items as unknown as Record<string, unknown>[]);
      this._internal.items = collection;
      this._internal.count = items.length;

      const feed = result.feed;
      this._internal.feedTitle = (feed && feed.title) || '';
      this._internal.feedLink = (feed && feed.link) || '';
      this._internal.feedDescription = (feed && feed.description) || '';
      this._internal.feedUpdated = (feed && feed.updated) || undefined;
      this._internal.kind = (feed && feed.kind) || '';
      this._internal.source = (feed && feed.source) || '';

      for (const port of [
        'items',
        'count',
        'feedTitle',
        'feedLink',
        'feedDescription',
        'feedUpdated',
        'kind',
        'source'
      ]) {
        this.flagOutputDirty(port);
      }

      this.sendSignalOnOutput('changed');
    }
  }
};

const ParseFeedNodeModule: NodeModule = { node: ParseFeedNode };

export = ParseFeedNodeModule;
