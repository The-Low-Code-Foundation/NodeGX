'use strict';

/**
 * A feed is a thing you can parse (FED-001 slice 2).
 *
 * ## What this module is for
 *
 * Four formats, one shape. RSS 2.0, Atom 1.0 and RDF/RSS 1.0 disagree about the name of every
 * field a reader needs — the body is `description`, or `content:encoded`, or `<content>`; the date
 * is `pubDate` in RFC 822, or `<updated>` in ISO 8601, or `dc:date`; the identity is `<guid>`, or
 * `<id>`, or nothing at all — and on top of that YouTube, Reddit and every podcast host add their
 * own vocabulary. {@link parseFeed} reads all of them and emits the item shape in FED-001 §3.1:
 *
 * ```
 * { id, title, link, published, updated, author, summary, content, image, enclosure, tags, raw }
 * ```
 *
 * ## `id` is load-bearing, and it is why this module cannot return null for it
 *
 * FED-002's unique index keys on it: `id` is what makes an item land in the collection once,
 * however many people follow the source and however many times the schedule fires. A feed that
 * omits `<guid>` and `<id>` — and plenty do — would otherwise produce a fresh row every poll. So
 * the ladder is guid → Atom id → link → **a hash of title + published**, and the last rung is
 * reached often enough that it is tested rather than assumed.
 *
 * The hash is FNV-1a: 32 bits, a dozen lines, no dependency. It is not a security primitive and
 * does not need to be — a collision means two items in one feed with the same title and the same
 * timestamp, which is one item.
 *
 * ## Nothing here is sanitised
 *
 * `content` is whatever HTML the feed shipped. Reddit's is HTML-escaped twice over; a podcast's
 * carries tracking pixels. Sanitising is the renderer's job and doing it here would be doing it in
 * the wrong place and in the dark — the node's description says so in as many words, because a
 * person wiring `content` into an HTML surface needs to read it there, not here.
 *
 * @module noodl-runtime/feed
 */

import { parseXML, TEXT_KEY, XMLParseError } from './xml';

/** The formats this module reads. `unknown` never escapes — it becomes a parse error. */
export type FeedKind = 'rss' | 'atom' | 'rdf';

/**
 * A hint, not a contract. A graph that wants to branch on "is this a video" should not have to
 * sniff namespaces itself, but it must not be the only thing standing between it and a wrong
 * answer either — `generic` is what an unrecognised source gets, and it is not a failure.
 */
export type FeedSource = 'youtube' | 'reddit' | 'podcast' | 'generic';

export interface FeedEnclosure {
  url: string;
  type?: string;
  /** Bytes, as the feed stated them. A string, because feeds lie and `"0"` is common. */
  length?: string;
}

export interface FeedItem {
  /** Never null. See the module comment: FED-002's unique index keys on it. */
  id: string;
  title: string;
  link: string;
  /** ISO 8601, or null when the feed carried no usable date. */
  published: string | null;
  updated: string | null;
  author: string;
  /** The short form: `description`, Atom `summary`. */
  summary: string;
  /** The long form: `content:encoded`, Atom `content`. Falls back to `summary`. Unsanitised. */
  content: string;
  image: string;
  enclosure: FeedEnclosure | null;
  tags: string[];
  /** The item exactly as `Parse XML` saw it — for `yt:videoId`, `itunes:duration`, whatever else. */
  raw: Record<string, unknown>;
}

export interface FeedMeta {
  title: string;
  link: string;
  description: string;
  updated: string | null;
  kind: FeedKind;
  source: FeedSource;
}

export interface FeedParseResult {
  feed?: FeedMeta;
  items?: FeedItem[];
  error?: XMLParseError | { code: 'feed/unrecognised'; message: string };
}

/**
 * Tags that must be arrays whatever their cardinality — see `XMLParseOptions.alwaysArray`.
 *
 * ⚠️ `item` and `entry` are in this list for the shape of `raw`, NOT for the shape of `items`.
 * A control on 2026-09-18 removed them and AC2 stayed green: it is {@link many} that guarantees
 * a one-item feed yields an array, because it wraps a lone object. Deleting `many`'s wrap is the
 * change that breaks AC2; deleting these two entries is not. Both are kept, and now both are
 * described by what they actually do.
 */
const FEED_ARRAY_TAGS = [
  'item',
  'entry',
  'link',
  'category',
  'enclosure',
  'media:content',
  'media:thumbnail',
  'content'
];

// ---------------------------------------------------------------------------------------------
// Reading a parsed XML tree without asserting its shape at every step
// ---------------------------------------------------------------------------------------------

type Node = Record<string, unknown>;

function isObject(v: unknown): v is Node {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/** First value for `key`, unwrapping the array that `alwaysArray` may have produced. */
function one(node: unknown, key: string): unknown {
  if (!isObject(node)) return undefined;
  const v = node[key];
  return Array.isArray(v) ? v[0] : v;
}

/** Always an array, whether the parser produced one, a single value, or nothing. */
function many(node: unknown, key: string): unknown[] {
  if (!isObject(node)) return [];
  const v = node[key];
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

/** First value present on the node, by key order. Keeps the fallback ladders to one line. */
function pick(node: unknown, ...keys: string[]): unknown {
  for (const key of keys) {
    const v = one(node, key);
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

/**
 * The text of a value, whatever shape it arrived in.
 *
 * ⚠️ The case that catches everybody: a tag with attributes AND text parses to
 * `{ '@type': 'html', '#text': 'the words' }`, not to `'the words'`. A reader that does
 * `String(node.title)` gets `[object Object]` on every Atom feed that types its title.
 */
function text(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return text(value[0]);
  if (isObject(value)) {
    const inner = value[TEXT_KEY];
    if (inner !== undefined) return text(inner);
    // An Atom `<content type="xhtml">` holds parsed child elements rather than text. Reassembling
    // XHTML is not this module's job; saying so is better than returning `[object Object]`.
    return '';
  }
  return '';
}

function attr(node: unknown, name: string): string {
  if (!isObject(node)) return '';
  return text(node['@' + name]);
}

/** First non-empty string from the candidates. Keeps the fallback ladders readable. */
function firstOf(...values: string[]): string {
  for (const v of values) if (v) return v;
  return '';
}

// ---------------------------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------------------------

/**
 * RSS carries RFC 822 (`Mon, 15 Sep 2026 08:00:00 +0000`), Atom carries ISO 8601, and `dc:date`
 * carries either. `Date.parse` handles both, and a feed whose date it cannot read gets `null`
 * rather than a guess — `published` reaches a sort and an invented date sorts wrongly forever.
 */
export function toISODate(value: unknown): string | null {
  const raw = text(value).trim();
  if (!raw) return null;

  const ms = Date.parse(raw);
  if (!isNaN(ms)) return new Date(ms).toISOString();

  // RFC 822 with a two-digit year, or a named zone `Date.parse` declines (`… 2026 08:00:00 EST`).
  // One retry, stripping a trailing alphabetic zone and letting the rest stand as UTC.
  const stripped = raw.replace(/\s+\([^)]*\)\s*$/, '').replace(/\s+[A-Z]{2,5}$/, ' UTC');
  const retry = Date.parse(stripped);
  return isNaN(retry) ? null : new Date(retry).toISOString();
}

// ---------------------------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------------------------

/** FNV-1a, 32-bit, as 8 lowercase hex characters. See the module comment for why this is enough. */
export function hashId(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    // The FNV prime, as shifts, because `h * 16777619` loses precision past 2^53.
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ('0000000' + h.toString(16)).slice(-8);
}

// ---------------------------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------------------------

/**
 * Atom's `<link>` is a family, not a field: `rel="alternate"` is the thing a person opens,
 * `rel="self"` is the feed's own address, `rel="enclosure"` is the media, `rel="replies"` is
 * Reddit's comment count. A reader that takes the first one shows the feed's own URL for every
 * item on some sources — so the preference is explicit.
 */
function atomLink(node: unknown): string {
  const links = many(node, 'link');
  const byRel = (rel: string) =>
    links.find((l) => (attr(l, 'rel') || 'alternate').toLowerCase() === rel && attr(l, 'href'));

  const alternate = byRel('alternate');
  if (alternate) return attr(alternate, 'href');

  const firstWithHref = links.find((l) => attr(l, 'href'));
  if (firstWithHref) return attr(firstWithHref, 'href');

  // RSS-shaped `<link>text</link>` inside an otherwise Atom document, and RDF.
  return text(one(node, 'link'));
}

// ---------------------------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------------------------

/** FED-001 §3.1's order: media:thumbnail, media:content[image], itunes:image, image enclosure. */
function itemImage(item: Node): string {
  const group = one(item, 'media:group');
  const search: unknown[] = [item];
  if (group) search.push(group);

  for (const scope of search) {
    for (const thumb of many(scope, 'media:thumbnail')) {
      const url = attr(thumb, 'url');
      if (url) return url;
    }
    for (const media of many(scope, 'media:content')) {
      const medium = attr(media, 'medium').toLowerCase();
      const type = attr(media, 'type').toLowerCase();
      if (medium === 'image' || type.indexOf('image/') === 0) {
        const url = attr(media, 'url');
        if (url) return url;
      }
    }
  }

  const itunes = one(item, 'itunes:image');
  const itunesHref = attr(itunes, 'href') || text(itunes);
  if (itunesHref) return itunesHref;

  for (const enc of many(item, 'enclosure')) {
    if (attr(enc, 'type').toLowerCase().indexOf('image/') === 0) {
      const url = attr(enc, 'url');
      if (url) return url;
    }
  }

  return '';
}

function itemEnclosure(item: Node): FeedEnclosure | null {
  for (const enc of many(item, 'enclosure')) {
    const url = attr(enc, 'url');
    if (!url) continue;
    const out: FeedEnclosure = { url };
    const type = attr(enc, 'type');
    const length = attr(enc, 'length');
    if (type) out.type = type;
    if (length) out.length = length;
    return out;
  }

  // Atom says the same thing with `<link rel="enclosure">`.
  for (const link of many(item, 'link')) {
    if (attr(link, 'rel').toLowerCase() === 'enclosure' && attr(link, 'href')) {
      const out: FeedEnclosure = { url: attr(link, 'href') };
      const type = attr(link, 'type');
      const length = attr(link, 'length');
      if (type) out.type = type;
      if (length) out.length = length;
      return out;
    }
  }

  return null;
}

/** RSS `<category>text</category>`, Atom `<category term="…">`, and `<media:keywords>`. */
function itemTags(item: Node): string[] {
  const out: string[] = [];
  const push = (v: string) => {
    const t = v.trim();
    if (t && out.indexOf(t) === -1) out.push(t);
  };

  for (const cat of many(item, 'category')) push(attr(cat, 'term') || attr(cat, 'label') || text(cat));
  for (const kw of many(item, 'media:keywords')) {
    for (const part of text(kw).split(',')) push(part);
  }
  for (const kw of many(item, 'itunes:keywords')) {
    for (const part of text(kw).split(',')) push(part);
  }

  return out;
}

function itemAuthor(item: Node): string {
  // Atom: `<author><name>…</name></author>`. RSS: `<author>mail@example.com (Name)</author>` or
  // the far more common `<dc:creator>`. YouTube puts the channel in Atom's shape.
  const atom = one(item, 'author');
  const name = text(one(atom, 'name'));
  if (name) return name;

  return firstOf(text(one(item, 'dc:creator')), text(one(item, 'itunes:author')), text(atom));
}

// ---------------------------------------------------------------------------------------------
// The shape
// ---------------------------------------------------------------------------------------------

function normaliseItem(raw: Node, kind: FeedKind): FeedItem {
  const title = text(one(raw, 'title'));
  const link = kind === 'rss' ? firstOf(text(one(raw, 'link')), atomLink(raw)) : atomLink(raw);

  const published = toISODate(pick(raw, 'pubDate', 'published', 'dc:date', 'date'));
  const updated = toISODate(pick(raw, 'updated', 'lastBuildDate', 'dc:modified'));

  const summary = firstOf(text(one(raw, 'description')), text(one(raw, 'summary')), text(one(raw, 'itunes:summary')));
  const content = firstOf(
    text(one(raw, 'content:encoded')),
    text(one(raw, 'content')),
    // YouTube's body lives inside `<media:group>`.
    text(one(one(raw, 'media:group'), 'media:description')),
    summary
  );

  // The identity ladder. The last rung is reached by real feeds, so it is a rung and not a throw.
  const id = firstOf(
    text(one(raw, 'guid')),
    text(one(raw, 'id')),
    attr(one(raw, 'guid'), 'isPermaLink') && link ? link : '',
    link,
    hashId(title + ' ' + (published || ''))
  );

  return {
    id,
    title,
    link,
    published,
    updated,
    author: itemAuthor(raw),
    summary,
    content,
    image: itemImage(raw),
    enclosure: itemEnclosure(raw),
    tags: itemTags(raw),
    raw
  };
}

/** Namespaces and hosts are both weak signals; together they are good enough for a hint. */
function detectSource(document: string, channel: Node, items: FeedItem[]): FeedSource {
  if (/xmlns:yt=|<yt:channelId>|youtube\.com\/(channel|watch)/i.test(document)) return 'youtube';
  if (/reddit\.com\/r\//i.test(document)) return 'reddit';
  if (/xmlns:itunes=/i.test(document) || one(channel, 'itunes:author')) return 'podcast';
  if (items.some((i) => i.enclosure && /^audio\//i.test(i.enclosure.type || ''))) return 'podcast';
  return 'generic';
}

/**
 * Parse a feed document into {@link FeedMeta} and {@link FeedItem}s.
 *
 * Never throws — same contract as {@link parseXML} and for the same reason.
 */
export function parseFeed(document: string | undefined | null, maxBytes?: number): FeedParseResult {
  const parsed = parseXML(document, { alwaysArray: FEED_ARRAY_TAGS, maxBytes });
  if (parsed.error) return { error: parsed.error };

  const root = parsed.value as Node;

  // `rdf:RDF` first: an RDF feed also carries a `channel`, so testing for `rss` first would call
  // every RSS 1.0 document an RSS 2.0 one and then look for `<item>` in the wrong place.
  let kind: FeedKind | undefined;
  let channel: Node = {};
  let rawItems: unknown[] = [];

  const rdf = pick(root, 'rdf:RDF', 'RDF');
  const rss = one(root, 'rss');
  const atom = one(root, 'feed');

  if (isObject(rdf)) {
    kind = 'rdf';
    channel = (one(rdf, 'channel') as Node) || {};
    // ⚠️ RDF puts `<item>` as a SIBLING of `<channel>`, not inside it. Reading it from the channel
    // is the classic RSS 1.0 bug and yields a feed with a title and zero items.
    rawItems = many(rdf, 'item');
  } else if (isObject(rss)) {
    kind = 'rss';
    channel = (one(rss, 'channel') as Node) || {};
    rawItems = many(channel, 'item');
  } else if (isObject(atom)) {
    kind = 'atom';
    channel = atom;
    rawItems = many(atom, 'entry');
  }

  if (!kind) {
    return {
      error: {
        code: 'feed/unrecognised',
        message:
          'This XML parsed, but its root is not <rss>, <feed> or <rdf:RDF>, so it is not a feed. ' +
          'Wire it into Parse XML instead and read the shape you actually received'
      }
    };
  }

  const items = rawItems.filter(isObject).map((raw) => normaliseItem(raw as Node, kind as FeedKind));

  const feed: FeedMeta = {
    title: text(one(channel, 'title')),
    link: kind === 'rss' || kind === 'rdf' ? firstOf(text(one(channel, 'link')), atomLink(channel)) : atomLink(channel),
    description: firstOf(text(one(channel, 'description')), text(one(channel, 'subtitle'))),
    updated: toISODate(pick(channel, 'lastBuildDate', 'updated', 'pubDate')),
    kind,
    source: detectSource(typeof document === 'string' ? document.slice(0, 64 * 1024) : '', channel, items)
  };

  return { feed, items };
}
