'use strict';

/**
 * XML, in one place (FED-001 slice 1).
 *
 * ## Why a library and not a hand-rolled scanner
 *
 * `csv.ts` next door is 253 hand-written lines with no dependency, and that was the right call for
 * CSV: the grammar is four rules and a quoting convention. XML is not that. Richard ruled on the
 * choice directly (phase 96 README §4, R1) after being shown the CSV precedent and the reason to
 * refuse it: entity expansion, CDATA, namespace prefixes, and the extension vocabularies that RSS
 * in the wild actually uses (`content:encoded`, `media:group`, `itunes:*`, `yt:videoId`) are
 * exactly the cases a hand-rolled parser gets subtly wrong, and one of them — entity expansion —
 * is a denial-of-service hole rather than a wrong answer.
 *
 * So: `fast-xml-parser`, **pinned to 4.5.7**, which is not the latest and that is deliberate. The
 * measurement, taken 2026-09-18 from the registry rather than from memory:
 *
 * | | deps | unpacked |
 * |---|---|---|
 * | 4.5.7 | 1 (`strnum`, MIT, 19 KB, no deps of its own) | 230 KB |
 * | 5.11.1 | **6**, incl. `@nodable/entities`, `is-unsafe`, `xml-naming` | **1.3 MB** |
 *
 * The parser path this module actually imports is 69 KB of source, 16 KB gzipped before webpack
 * minifies it — comfortably inside FED-001 AC5's 50 KB gzipped budget for the browser bundle.
 * ⚠️ The task file said "no dependencies, ~40 KB". That was never true at any version; it is
 * corrected in FED-001 §3.1 and repeated here because the next person to bump this will read one
 * of the two.
 *
 * ## The two ways an XML document attacks the process, and what stops each
 *
 * 1. **Entity expansion** (`billion laughs`): ten nested entity definitions, each referencing the
 *    previous one ten times, expand to 10^10 characters and the process dies with no stack. The
 *    guard is {@link scanForHostileConstructs} and it is a **pre-parse text scan**, not a parser
 *    option, for one reason: a parser option is a promise about a code path, and a scan that never
 *    hands the document to the parser at all is a fact. No feed, anywhere, declares an entity.
 * 2. **Size**: a 6 MB document read into a string, then into a DOM-shaped object, is tens of MB of
 *    heap per concurrent request. {@link parseXML} refuses over `maxBytes` before parsing.
 *
 * External entities and DTD subsets are never resolved: `processEntities` covers only the five
 * predefined XML entities plus numeric character references, and a document carrying `<!ENTITY` or
 * `<!DOCTYPE … [` is refused above before the parser sees it.
 *
 * ## Every value is a string
 *
 * The same rule `csv.ts` documents, for the same reason and one more. A `<guid>` of `0123` is an
 * identifier, not the number 123; an `<itunes:duration>` of `1:30` is not a date; a `<title>` of
 * `2024` is a title. Type inference on feed data invents answers, so `parseTagValue` and
 * `parseAttributeValue` are both off and downstream gets strings. A graph that wants a number uses
 * the nodes that make numbers.
 *
 * @module noodl-runtime/xml
 */

import { XMLParser } from 'fast-xml-parser';

/** Codes are stable: they reach the `Error` output, the runtime error and the tests. */
export type XMLErrorCode =
  | 'xml/too-large'
  | 'xml/entity-declaration'
  | 'xml/doctype-subset'
  | 'xml/parse-failed'
  | 'xml/empty';

export interface XMLParseError {
  /** One sentence, ready for an `Error` output. Never contains the document. */
  message: string;
  code: XMLErrorCode;
}

export interface XMLParseResult {
  /** The document as a plain object. Absent when `error` is set. */
  value?: Record<string, unknown>;
  error?: XMLParseError;
}

export interface XMLParseOptions {
  /** Prefix for attribute keys. Default `@`, so `<a href="x">` is `{ '@href': 'x' }`. */
  attributePrefix?: string;
  /**
   * Tag names that are ALWAYS an array, however many times they appear. Without this a feed with
   * one `<item>` and a feed with ten have different shapes and every graph downstream needs a
   * branch — the single most common way a feed reader breaks on its second source.
   */
  alwaysArray?: string[];
  /** Trim leading and trailing whitespace from text nodes. Default true. */
  trimValues?: boolean;
  /** Refuse a document larger than this many characters. Default 5 MB. */
  maxBytes?: number;
}

/** FED-001 §3.1. Five million characters, not bytes — the string is what costs the heap. */
export const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

/** The key `fast-xml-parser` gives a tag's own text when it also carries attributes. */
export const TEXT_KEY = '#text';

/**
 * A pre-parse scan for the constructs that make parsing itself unsafe.
 *
 * Deliberately crude and deliberately first. It reads the head of the document only — an entity
 * declaration is only legal in the prolog, so a match after the root element opens is not a
 * declaration and not our business.
 *
 * @returns the error to fail with, or `undefined` when the document is safe to parse.
 */
export function scanForHostileConstructs(text: string): XMLParseError | undefined {
  // The prolog cannot be longer than this in any real document; capping the scan keeps a 5 MB
  // body from costing a 5 MB regex pass before we have decided to spend anything on it.
  const head = text.slice(0, 64 * 1024);

  if (/<!ENTITY/i.test(head)) {
    return {
      code: 'xml/entity-declaration',
      message:
        'This XML declares its own entities (<!ENTITY). They are refused, not expanded, because a ' +
        'few lines of nested declarations expand to gigabytes and take the process with them. No ' +
        'feed format needs them'
    };
  }

  // A DOCTYPE with an internal subset is where entity declarations live; one without is inert
  // (`<!DOCTYPE rss>`) and some real feeds carry one, so only the subset form is refused.
  if (/<!DOCTYPE[^>[]*\[/i.test(head)) {
    return {
      code: 'xml/doctype-subset',
      message:
        'This XML carries an inline DOCTYPE subset (<!DOCTYPE … [ … ]). It is refused rather than ' +
        'read, because that is the only place a document can define entities that expand'
    };
  }

  return undefined;
}

/**
 * Parse an XML document into a plain object.
 *
 * Never throws: every failure arrives as `error`, because the one caller that matters is a node
 * whose whole contract is a `Failure` output (NDA-004's Failure Contract), and a throw from inside
 * a cloud function is a 500 with no line in it.
 */
export function parseXML(text: string | undefined | null, options: XMLParseOptions = {}): XMLParseResult {
  const maxBytes = options.maxBytes && options.maxBytes > 0 ? options.maxBytes : DEFAULT_MAX_BYTES;

  if (typeof text !== 'string' || text.trim() === '') {
    return { error: { code: 'xml/empty', message: 'There was no XML to parse — the text was empty' } };
  }

  if (text.length > maxBytes) {
    return {
      error: {
        code: 'xml/too-large',
        message:
          `This XML is ${Math.round(text.length / 1024)} KB, over the ${Math.round(maxBytes / 1024)} KB ` +
          'limit. Raise Max Bytes on the node if the source really is this big'
      }
    };
  }

  const hostile = scanForHostileConstructs(text);
  if (hostile) return { error: hostile };

  const alwaysArray = options.alwaysArray || [];
  const parser = new XMLParser({
    attributeNamePrefix: options.attributePrefix === undefined ? '@' : options.attributePrefix,
    ignoreAttributes: false,
    // Namespace prefixes are KEPT. `content:encoded` and `yt:videoId` are the whole reason a feed
    // reader can tell a YouTube video from a blog post, and stripping prefixes silently collides
    // `media:title` with `title`.
    removeNSPrefix: false,
    trimValues: options.trimValues === undefined ? true : !!options.trimValues,
    parseTagValue: false,
    parseAttributeValue: false,
    // The five predefined entities and numeric references only — declarations were refused above.
    processEntities: true,
    htmlEntities: true,
    textNodeName: TEXT_KEY,
    // A string here is a tag name from `alwaysArray`; the callback shape is how v4 asks.
    isArray: (name: string) => alwaysArray.indexOf(name) !== -1
  });

  try {
    const value = parser.parse(text) as Record<string, unknown>;
    if (!value || typeof value !== 'object') {
      return { error: { code: 'xml/parse-failed', message: 'This text is not XML' } };
    }
    return { value };
  } catch (e) {
    const message = e && (e as Error).message ? (e as Error).message : String(e);
    return { error: { code: 'xml/parse-failed', message } };
  }
}
