/**
 * BETA-S11-ENTITYCAP — a feed with more than a thousand escaped characters is still a feed.
 *
 * fast-xml-parser 4.5.7 counts every `&amp;`, `&lt;` and `&#169;` it expands and throws
 * "Entity expansion limit exceeded: 1001 > 1000" past a thousand. That limit was written against
 * entity DECLARATIONS (billion laughs), but in 4.x it also counts the five predefined entities and
 * numeric references, which every RSS `<description>` is full of. So a blog feed of about 150
 * posts read as `xml/parse-failed`. Declarations never reach the parser (`scanForHostileConstructs`
 * refuses them first, graded in fed-001-feed), so nothing here relaxes that guard.
 */
import { parseFeed } from '../src/feed';
import { parseXML } from '../src/xml';

/** An RSS 2.0 feed of `n` posts, each title and description escaped the way a real blog's are. */
function blogFeed(n: number): string {
  const items = Array.from(
    { length: n },
    (_, i) =>
      `<item><title>Fish &amp; chips ${i}</title><link>https://example.com/${i}</link>` +
      `<guid>https://example.com/${i}</guid>` +
      `<description>&lt;p&gt;Fish &amp;amp; chips &#169; &quot;${i}&quot;&lt;/p&gt;</description></item>`
  ).join('');
  return `<?xml version="1.0"?><rss version="2.0"><channel><title>A blog</title><link>https://example.com</link>${items}</channel></rss>`;
}

describe('BETA-S11-ENTITYCAP — escaped characters are not an attack', () => {
  // 300 posts × 8 expansions = 2,400: over 4.5.7's 1,000, a size real blogs reach.
  const text = blogFeed(300);

  it('Parse XML reads the document', () => {
    const result = parseXML(text);
    expect(result.error).toBeUndefined();
    const channel = (result.value as any).rss.channel;
    expect(channel.item).toHaveLength(300);
    expect(channel.item[299].title).toBe('Fish & chips 299');
    expect(channel.item[0].description).toBe('<p>Fish &amp; chips © "0"</p>');
  });

  it('Parse Feed returns every post', () => {
    const result = parseFeed(text);
    expect(result.error).toBeUndefined();
    expect(result.items).toHaveLength(300);
    expect(result.items![0].title).toBe('Fish & chips 0');
  });
});
