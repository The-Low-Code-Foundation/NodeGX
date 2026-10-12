/**
 * XML in one place — read from `packages/noodl-runtime/src/xml.ts` on 2026-10-01 (NSP-013), for
 * Parse XML and Parse Feed. From :55 on, the runtime's file verbatim (its comments kept, because
 * they ARE the rules); the line numbers in the specs cite the runtime's file.
 *
 * THE RULES (the module comment, :1-53): the grammar is a LIBRARY's — `fast-xml-parser`, pinned
 * to 4.5.7 by the runtime's FED-001 ruling — under the options at :165-181: attributes kept under
 * a prefix (default `@`), namespace prefixes kept, text trimmed unless told otherwise, NOTHING
 * type-inferred (every value a string), the five predefined entities, HTML entities and numeric
 * references decoded, a tag with attributes AND text giving `{ '@a': …, '#text': … }`, the tags
 * named in Always Array an array however many times they appear. Before the library sees a byte:
 * an empty or non-string text is `xml/empty` (:146), a text longer than Max Bytes CHARACTERS is
 * `xml/too-large` (:150), and a `<!ENTITY` or a `<!DOCTYPE … [` in the first 64 K characters is
 * refused (:107-134). Nothing here throws: a library throw is `xml/parse-failed` with the
 * library's own message (:189-191).
 *
 * ⚠️ A target in another language owes the SAME object shape for the same text under these
 * options — the shape is fast-xml-parser 4.5.7's, and the scenarios pin it (attributes,
 * `#text`, CDATA, namespaces, entities, Always Array). That is the honest size of this spec:
 * the node's own behaviour is the guards, the codes and the frame; the tree is the library's.
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

/** What the generator draws for an XML text: the shapes the scenarios pin, the refusals, and text that is not XML. */
export const XML_EXAMPLES: readonly unknown[] = Object.freeze([
  '<a>1</a>',
  '<root><item>x</item></root>',
  '<root><item>x</item><item>y</item></root>',
  '<a href="u" rel="alternate">text</a>',
  '<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015"><yt:videoId>0123</yt:videoId></feed>',
  '<p><![CDATA[<b>bold</b> & raw]]></p>',
  '<t>Fish &amp; chips &#169; &copy;</t>',
  '<t>  spaced  </t>',
  '<?xml version="1.0"?><!DOCTYPE rss><rss><channel><title>T</title></channel></rss>',
  '<!DOCTYPE x [<!ENTITY a "b">]><x>&a;</x>',
  '<!DOCTYPE x [ ]><x/>',
  '<a><b></a>',
  'not xml at all',
  '   ',
  ''
]);
