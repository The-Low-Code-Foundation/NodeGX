/**
 * FED-001 — a feed is a thing you can parse.
 *
 * This suite grades the two modules (`src/xml.ts`, `src/feed.ts`) against the fixtures. The node
 * pair is graded where it actually has to work — inside a cloud function, over HTTP, in
 * `nodegx-backend/tests/cloud-feed-nodes.test.ts` — because phase 96 README §7 rule 4 says the
 * test is the drive and TALK-007's finding says "registered" is not "works".
 *
 * ⚠️ The fixtures live HERE, in the package that owns the parser, and the backend suite reads
 * across to them. The AC text said `tests/fixtures/` without naming a package; this direction is
 * the one that matches the dependency (`nodegx-backend` → `@noodl/runtime`, never the reverse),
 * and one copy cannot drift from the other.
 */
import * as fs from 'fs';
import * as path from 'path';

import { parseFeed, toISODate, hashId, FeedItem } from '../src/feed';
import { parseXML, DEFAULT_MAX_BYTES } from '../src/xml';

const FEEDS = path.join(__dirname, 'fixtures', 'feeds');
const XML = path.join(__dirname, 'fixtures', 'xml');

const read = (dir: string, name: string) => fs.readFileSync(path.join(dir, name), 'utf8');

/** AC1's five. The names are the ACs' names, so a red test says which source broke. */
const FIVE = [
  { name: 'an RSS 2.0 blog', file: 'rss2-blog.xml', kind: 'rss', source: 'generic', image: false },
  { name: 'an Atom blog', file: 'atom-blog.xml', kind: 'atom', source: 'generic', image: false },
  { name: 'a YouTube channel', file: 'youtube-channel.xml', kind: 'atom', source: 'youtube', image: true },
  { name: 'a subreddit .rss', file: 'reddit-subreddit.xml', kind: 'atom', source: 'reddit', image: false },
  { name: 'a podcast', file: 'podcast.xml', kind: 'rss', source: 'podcast', image: true }
] as const;

describe('FED-001 AC1 — five real feed shapes, one item shape', () => {
  for (const fixture of FIVE) {
    describe(fixture.name, () => {
      const result = parseFeed(read(FEEDS, fixture.file));

      it('parses, and knows which format it read', () => {
        expect(result.error).toBeUndefined();
        expect(result.feed?.kind).toBe(fixture.kind);
        expect(result.feed?.source).toBe(fixture.source);
        expect(result.feed?.title).toBeTruthy();
        expect(result.feed?.link).toBeTruthy();
      });

      it('gives every item an id, a title, a link and a published date', () => {
        const items = result.items as FeedItem[];
        expect(items.length).toBeGreaterThan(0);

        for (const item of items) {
          // `id` is the one that must never be empty: FED-002's unique index keys on it, and an
          // empty key means every poll inserts the item again.
          expect(item.id).toBeTruthy();
          expect(item.title).toBeTruthy();
          expect(item.link).toBeTruthy();
          expect(item.published).toBeTruthy();
          // ISO 8601, not whatever the feed wrote.
          expect(item.published).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        }
      });

      if (fixture.image) {
        it('finds the image the source hides in its own vocabulary', () => {
          for (const item of result.items as FeedItem[]) {
            expect(item.image).toMatch(/^https?:\/\//);
          }
        });
      }
    });
  }
});

describe('FED-001 AC1 — the fields each format hides somewhere different', () => {
  it('reads an RSS body from content:encoded, not just description', () => {
    const { items } = parseFeed(read(FEEDS, 'rss2-blog.xml'));
    const first = (items as FeedItem[])[0];

    expect(first.summary).toBe('A reader should tell you what is new and then get out of the way.');
    // CDATA, with its entity decoded, and NOT sanitised — the node's description promises that.
    expect(first.content).toContain('<em>new</em>');
    expect(first.content).toContain('&');
    expect(first.author).toBe('A. Writer');
    expect(first.tags).toEqual(['feeds', 'design']);
  });

  it('converts RFC 822 dates, including a named zone and a numeric offset', () => {
    const { items } = parseFeed(read(FEEDS, 'rss2-blog.xml'));
    const [first, second, third] = items as FeedItem[];

    expect(first.published).toBe('2026-09-14T08:30:00.000Z');
    expect(second.published).toBe('2026-09-11T17:05:00.000Z'); // GMT
    expect(third.published).toBe('2026-09-09T10:00:00.000Z'); // 06:00 -0400
  });

  it('takes Atom\'s rel="alternate" link, never its rel="self"', () => {
    const { feed, items } = parseFeed(read(FEEDS, 'atom-blog.xml'));

    // The feed itself lists self FIRST. A reader that takes links[0] shows the XML URL to a person.
    expect(feed?.link).toBe('https://fieldnotes.example/');
    expect((items as FeedItem[])[0].link).toBe('https://fieldnotes.example/44');
  });

  it('reads an Atom title that carries an attribute, rather than [object Object]', () => {
    const { items } = parseFeed(read(FEEDS, 'atom-blog.xml'));
    expect((items as FeedItem[])[0].title).toBe('Reading a feed is not reading XML');
  });

  it('keeps the namespaced fields YouTube branches on, in raw', () => {
    const { items } = parseFeed(read(FEEDS, 'youtube-channel.xml'));
    const first = (items as FeedItem[])[0];

    expect(first.raw['yt:videoId']).toBe('fixtureVid001');
    expect(first.link).toBe('https://www.youtube.com/watch?v=fixtureVid001');
    expect(first.image).toBe('https://i.ytimg.com/vi/fixtureVid001/hqdefault.jpg');
    // The body is inside media:group, where no generic reader would look for it.
    expect(first.content).toContain('derusting');
  });

  it('keeps a podcast\'s audio enclosure and its itunes duration', () => {
    const { items } = parseFeed(read(FEEDS, 'podcast.xml'));
    const first = (items as FeedItem[])[0];

    expect(first.enclosure).toEqual({
      url: 'https://twohours.example/audio/062.mp3',
      type: 'audio/mpeg',
      length: '91234567'
    });
    expect(first.raw['itunes:duration']).toBe('01:52:10');
    expect(first.image).toBe('https://twohours.example/art/062.jpg');
    expect(first.tags).toEqual(['repair', 'typewriters', 'obsolescence']);
  });

  it('reads Reddit\'s escaped HTML body without unescaping it twice', () => {
    const { items } = parseFeed(read(FEEDS, 'reddit-subreddit.xml'));
    const first = (items as FeedItem[])[0];

    expect(first.author).toBe('/u/fixture_user_one');
    expect(first.content).toContain('<div class="md">');
    // The inner `&amp;` was escaped twice by Reddit; exactly one layer comes off here.
    expect(first.content).toContain('fence &amp; it cuts true');
  });

  it('finds RDF items beside the channel, not inside it', () => {
    const { feed, items } = parseFeed(read(FEEDS, 'rdf-rss1.xml'));

    expect(feed?.kind).toBe('rdf');
    // The bug this fixture exists for: a title, and zero items.
    expect((items as FeedItem[]).length).toBe(2);
    expect((items as FeedItem[])[0].published).toBe('2026-09-14T10:00:00.000Z');
    expect((items as FeedItem[])[0].author).toBe('C. Archivist');
  });
});

describe('FED-001 AC2 — one item and ten items are both an array', () => {
  it('returns an array for a feed with exactly one item', () => {
    const { items } = parseFeed(read(FEEDS, 'single-item.xml'));

    expect(Array.isArray(items)).toBe(true);
    expect(items).toHaveLength(1);
    expect((items as FeedItem[])[0].id).toBe('once-1');
  });

  it('returns an array for a feed with ten', () => {
    const template = read(FEEDS, 'single-item.xml');
    const block = (n: number) =>
      `<item><title>Post ${n}</title><link>https://once.example/${n}</link>` +
      `<guid>once-${n}</guid><pubDate>Mon, 07 Sep 2026 12:00:00 +0000</pubDate>` +
      `<description>Number ${n}.</description></item>`;
    const ten = template.replace(
      '</channel>',
      Array.from({ length: 9 }, (_, i) => block(i + 2)).join('') + '</channel>'
    );

    const { items } = parseFeed(ten);
    expect(Array.isArray(items)).toBe(true);
    expect(items).toHaveLength(10);
  });
});

describe('FED-001 — an item with no guid still gets an id', () => {
  it('falls back to the link, then to a hash of title and date', () => {
    const { items } = parseFeed(read(FEEDS, 'no-identity.xml'));
    const [withLink, withNeither] = items as FeedItem[];

    expect(withLink.id).toBe('https://handrolled.example/one');

    expect(withNeither.id).toBe(hashId('A post with neither ' + withNeither.published));
    expect(withNeither.id).toMatch(/^[0-9a-f]{8}$/);
  });

  it('gives the same item the same id on every poll — which is the whole point', () => {
    const document = read(FEEDS, 'no-identity.xml');
    const first = parseFeed(document).items as FeedItem[];
    const second = parseFeed(document).items as FeedItem[];

    expect(second.map((i) => i.id)).toEqual(first.map((i) => i.id));
  });
});

describe('FED-001 AC3 — hostile documents fail loudly and leave the process alive', () => {
  it('refuses a billion-laughs expansion in well under two seconds', () => {
    const started = Date.now();
    const result = parseFeed(read(XML, 'entity-bomb.xml'));
    const elapsed = Date.now() - started;

    expect(result.error?.code).toBe('xml/entity-declaration');
    expect(result.items).toBeUndefined();
    expect(elapsed).toBeLessThan(2000);
  });

  it('refuses a document over the size limit before parsing it', () => {
    // Generated, not committed — see the fixtures README.
    const oversize = '<rss version="2.0"><channel>' + '<x>y</x>'.repeat(800000) + '</channel></rss>';
    expect(oversize.length).toBeGreaterThan(DEFAULT_MAX_BYTES);

    const started = Date.now();
    const result = parseFeed(oversize);
    const elapsed = Date.now() - started;

    expect(result.error?.code).toBe('xml/too-large');
    expect(result.error?.message).toContain('KB');
    expect(elapsed).toBeLessThan(2000);
  });

  it('honours a raised limit, so the guard is a setting and not a ceiling', () => {
    const big = '<rss version="2.0"><channel><title>Big</title><link>https://b.example/</link>' +
      '<description>d</description></channel></rss>';
    expect(parseFeed(big, 10).error?.code).toBe('xml/too-large');
    expect(parseFeed(big, 10 * 1024 * 1024).error).toBeUndefined();
  });

  it('refuses a DOCTYPE with an inline subset, where declarations live', () => {
    const doc = '<?xml version="1.0"?><!DOCTYPE rss [ <!ELEMENT rss ANY> ]><rss/>';
    expect(parseXML(doc).error?.code).toBe('xml/doctype-subset');
  });

  it('allows a plain DOCTYPE, which some real feeds carry and which expands nothing', () => {
    const doc = '<?xml version="1.0"?><!DOCTYPE rss><rss version="2.0"><channel>' +
      '<title>T</title><link>https://t.example/</link><description>d</description></channel></rss>';
    expect(parseXML(doc).error).toBeUndefined();
  });

  it('says so, rather than throwing, when the text is not XML at all', () => {
    expect(parseFeed('{"items":[]}').error).toBeDefined();
    expect(parseFeed('').error?.code).toBe('xml/empty');
  });

  it('says the root is not a feed, and points at Parse XML', () => {
    const result = parseFeed('<?xml version="1.0"?><catalogue><tool/></catalogue>');
    expect(result.error?.code).toBe('feed/unrecognised');
    expect(result.error?.message).toContain('Parse XML');
  });
});

describe('FED-001 AC4 — Parse XML on attributes and mixed content', () => {
  const { value, error } = parseXML(read(XML, 'attributes-and-mixed.xml'));
  const root = (value as any)?.catalogue;

  it('parses', () => {
    expect(error).toBeUndefined();
    expect(root).toBeDefined();
  });

  it('prefixes attributes with @, and keeps a tag\'s own text under #text', () => {
    expect(root['@revision']).toBe('7');
    expect(root.name['@lang']).toBe('en');
    expect(root.name['#text']).toBe('Bench tools');
  });

  it('gives a repeated element an array', () => {
    expect(Array.isArray(root.tool)).toBe(true);
    expect(root.tool).toHaveLength(2);
    expect(root.tool[0]['@id']).toBe('t1');
    expect(root.tool[1]['@kind']).toBe('plane');
  });

  it('decodes an escaped entity and reads a CDATA section as text', () => {
    expect(root.tool[0].note).toBe('Cast iron & heavy');
    expect(root.tool[1].note).toBe('Sole is <flat> to 0.02mm');
  });

  it('keeps namespace prefixes, because content:encoded and yt:videoId depend on them', () => {
    expect(root['ext:origin']['#text']).toBe('Sheffield');
    expect(root['ext:origin']['@country']).toBe('GB');
  });

  it('leaves every value a string, the rule csv.ts already set', () => {
    // `7` and `0.02` are text, not numbers: a guid of `0123` must not become 123.
    expect(typeof root['@revision']).toBe('string');
    expect(typeof root.tool[0]['@id']).toBe('string');
  });

  it('makes a named tag an array however many times it appears', () => {
    const once = parseXML('<r><a>1</a></r>', { alwaysArray: ['a'] });
    const twice = parseXML('<r><a>1</a><a>2</a></r>', { alwaysArray: ['a'] });

    expect((once.value as any).r.a).toEqual(['1']);
    expect((twice.value as any).r.a).toEqual(['1', '2']);
  });

  it('takes a different attribute prefix when asked', () => {
    const { value: v } = parseXML('<r k="1"/>', { attributePrefix: '_' });
    expect((v as any).r._k).toBe('1');
  });
});

describe('FED-001 — the date converter, on its own', () => {
  it('reads RFC 822, ISO 8601 and a bare date', () => {
    expect(toISODate('Mon, 14 Sep 2026 08:30:00 +0000')).toBe('2026-09-14T08:30:00.000Z');
    expect(toISODate('2026-09-16T11:20:00Z')).toBe('2026-09-16T11:20:00.000Z');
    expect(toISODate('2026-09-16')).toBe('2026-09-16T00:00:00.000Z');
  });

  it('returns null rather than inventing a date it cannot read', () => {
    // An invented date sorts wrongly forever, and silently.
    expect(toISODate('last Tuesday-ish')).toBeNull();
    expect(toISODate('')).toBeNull();
    expect(toISODate(undefined)).toBeNull();
  });
});
