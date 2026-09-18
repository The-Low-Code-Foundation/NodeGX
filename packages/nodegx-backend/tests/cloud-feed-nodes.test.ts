/**
 * A cloud function can fetch a feed and hand back its items (FED-001).
 *
 * Driven end to end through `POST /functions/:name` against the real service, because phase 96
 * README §7 rule 4 says the test is the drive, and because TALK-007's finding stands: "registered"
 * is not "works". The parser itself is graded in `noodl-runtime/test/fed-001-feed.test.ts`; what
 * is graded HERE is the thing the person actually builds — `HTTP Request → Parse Feed → Response`,
 * against a server that serves the five fixtures with the content-types the real sources use.
 *
 * ⚠️ Two facts that will cost the next person time if they are not stated here:
 *
 *  - **`Response Type: text` is not optional for a feed.** Left on `auto`, the HTTP node hands over
 *    text for `application/rss+xml` anyway — so a green test on `auto` proves nothing about the
 *    port. The `auto`-versus-`text` pair below is driven against a server that lies about its
 *    content-type (`application/json` on an XML body), which is the case `auto` cannot survive and
 *    `text` exists for. Reddit really does serve `text/html` sometimes.
 *  - **With a node type unregistered, these specs do not fail — they HANG** for the full timeout.
 *    An unknown node type means nothing reaches a Response node and `POST /functions/:name` has no
 *    timeout of its own (CWF-018). A 40-second red out here is what "not registered" looks like.
 */
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';

import { httpClient } from './helpers/http';

jest.setTimeout(40000);

/**
 * The fixtures live in the package that owns the parser. Reading across is the direction that
 * matches the dependency (`nodegx-backend` → `@noodl/runtime`); a second copy here would drift
 * from the first the week after somebody fixes one of them.
 */
const FIXTURES = path.join(__dirname, '..', '..', 'noodl-runtime', 'test', 'fixtures', 'feeds');

/** What each real source actually sends, which is the half of this that `auto` gets wrong. */
const SERVED: Record<string, { file: string; contentType: string }> = {
  '/rss': { file: 'rss2-blog.xml', contentType: 'application/rss+xml; charset=utf-8' },
  '/atom': { file: 'atom-blog.xml', contentType: 'application/atom+xml; charset=utf-8' },
  '/youtube': { file: 'youtube-channel.xml', contentType: 'text/xml; charset=UTF-8' },
  '/reddit': { file: 'reddit-subreddit.xml', contentType: 'text/html; charset=utf-8' },
  '/podcast': { file: 'podcast.xml', contentType: 'application/xml' },
  // The liar: an XML body announced as JSON. `auto` believes the header; `text` does not care.
  '/mislabelled': { file: 'rss2-blog.xml', contentType: 'application/json' }
};

/** HTTP Request → Parse Feed → Response. The graph a person would actually draw. */
function feedFunction(upstream: string, name: string, responseType: 'auto' | 'text') {
  return {
    name: `/#__cloud__/${name}`,
    nodes: [
      {
        id: 'req',
        type: 'noodl.cloud.request',
        x: 0,
        y: 0,
        parameters: { allowNoAuth: true, params: 'path' },
        ports: [],
        children: []
      },
      {
        id: 'http',
        type: 'net.noodl.HTTP',
        x: 0,
        y: 100,
        // `url` is set from the request below, so only the constants are parameters here.
        parameters: { method: 'GET', responseType },
        ports: [],
        children: []
      },
      { id: 'parse', type: 'net.noodl.ParseFeed', x: 0, y: 200, parameters: {}, ports: [], children: [] },
      {
        id: 'res',
        type: 'noodl.cloud.response',
        x: 0,
        y: 300,
        parameters: { params: 'items,count,feedTitle,kind,source' },
        ports: [],
        children: []
      },
      {
        // The failure path is wired. A function whose only wired path is the happy one HANGS when
        // the input is bad (CWF-018) — which is what a 40s red here would actually mean.
        id: 'resErr',
        type: 'noodl.cloud.response',
        x: 0,
        y: 400,
        parameters: { params: 'error,errorCode' },
        ports: [],
        children: []
      }
    ],
    connections: [
      { sourceId: 'req', sourcePort: 'pm-path', targetId: 'http', targetPort: 'url' },
      { sourceId: 'req', sourcePort: 'receive', targetId: 'http', targetPort: 'fetch' },
      { sourceId: 'http', sourcePort: 'response', targetId: 'parse', targetPort: 'text' },
      { sourceId: 'parse', sourcePort: 'items', targetId: 'res', targetPort: 'pm-items' },
      { sourceId: 'parse', sourcePort: 'count', targetId: 'res', targetPort: 'pm-count' },
      { sourceId: 'parse', sourcePort: 'feedTitle', targetId: 'res', targetPort: 'pm-feedTitle' },
      { sourceId: 'parse', sourcePort: 'kind', targetId: 'res', targetPort: 'pm-kind' },
      { sourceId: 'parse', sourcePort: 'source', targetId: 'res', targetPort: 'pm-source' },
      { sourceId: 'parse', sourcePort: 'changed', targetId: 'res', targetPort: 'send' },
      { sourceId: 'parse', sourcePort: 'error', targetId: 'resErr', targetPort: 'pm-error' },
      { sourceId: 'parse', sourcePort: 'errorCode', targetId: 'resErr', targetPort: 'pm-errorCode' },
      { sourceId: 'parse', sourcePort: 'failure', targetId: 'resErr', targetPort: 'send' },
      // ⚠️ The HTTP node's OWN failure path, and it is not decoration. The first run of this suite
      // left it out: the Auto case below fails at the FETCH, not at the parse, so nothing reached
      // a Response node and the function hung for thirty seconds and answered 504. A real feed
      // graph that wires only the parser's Failure has exactly the same hole.
      { sourceId: 'http', sourcePort: 'error', targetId: 'resErr', targetPort: 'pm-error' },
      { sourceId: 'http', sourcePort: 'failure', targetId: 'resErr', targetPort: 'send' }
    ],
    roots: []
  };
}

/** HTTP Request → Parse XML → Response, for the generic half of FED-001. */
function xmlFunction() {
  return {
    name: '/#__cloud__/xmlDirect',
    nodes: [
      {
        id: 'req',
        type: 'noodl.cloud.request',
        x: 0,
        y: 0,
        parameters: { allowNoAuth: true, params: 'xml' },
        ports: [],
        children: []
      },
      {
        id: 'parse',
        type: 'net.noodl.ParseXML',
        x: 0,
        y: 100,
        parameters: { alwaysArray: 'tool' },
        ports: [],
        children: []
      },
      {
        id: 'res',
        type: 'noodl.cloud.response',
        x: 0,
        y: 200,
        parameters: { params: 'result' },
        ports: [],
        children: []
      },
      {
        id: 'resErr',
        type: 'noodl.cloud.response',
        x: 0,
        y: 300,
        parameters: { params: 'error,errorCode' },
        ports: [],
        children: []
      }
    ],
    connections: [
      { sourceId: 'req', sourcePort: 'pm-xml', targetId: 'parse', targetPort: 'text' },
      { sourceId: 'parse', sourcePort: 'result', targetId: 'res', targetPort: 'pm-result' },
      { sourceId: 'parse', sourcePort: 'changed', targetId: 'res', targetPort: 'send' },
      { sourceId: 'parse', sourcePort: 'error', targetId: 'resErr', targetPort: 'pm-error' },
      { sourceId: 'parse', sourcePort: 'errorCode', targetId: 'resErr', targetPort: 'pm-errorCode' },
      { sourceId: 'parse', sourcePort: 'failure', targetId: 'resErr', targetPort: 'send' }
    ],
    roots: []
  };
}

interface FeedAnswer {
  items?: { id: string; title: string; link: string; published: string | null; image: string }[];
  count?: number;
  feedTitle?: string;
  kind?: string;
  source?: string;
  error?: string;
  errorCode?: string;
}

describe('the feed nodes in a cloud function (FED-001)', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  let upstream: http.Server;
  let upstreamUrl: string;

  const client = httpClient(() => base);

  const callFeed = (fn: string, route: string) =>
    client.request<{ result: FeedAnswer }>('POST', `/functions/${fn}`, {
      body: { path: `${upstreamUrl}${route}` }
    });

  beforeAll(async () => {
    upstream = http.createServer((req, res) => {
      const served = SERVED[String(req.url)];
      if (!served) {
        res.statusCode = 404;
        res.end('no such fixture');
        return;
      }
      res.setHeader('content-type', served.contentType);
      res.end(fs.readFileSync(path.join(FIXTURES, served.file), 'utf8'));
    });
    await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', resolve));
    upstreamUrl = `http://127.0.0.1:${(upstream.address() as { port: number }).port}`;

    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-cloud-feed-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });
    fs.writeFileSync(
      path.join(dataDir, 'workflows', 'feed.workflow.json'),
      JSON.stringify({
        components: [
          feedFunction(upstreamUrl, 'readFeed', 'text'),
          feedFunction(upstreamUrl, 'readFeedAuto', 'auto'),
          xmlFunction()
        ],
        settings: {},
        metadata: {}
      })
    );
    service = new BackendService({ dataDir, port: 0, backendId: 'cloud_feed', backendName: 'Cloud Feed' });
    base = (await service.start()).listen.url;
  });

  afterAll(async () => {
    await service.stop();
    await new Promise<void>((resolve) => upstream.close(() => resolve()));
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  describe('AC1 — five sources, one item shape, fetched over HTTP', () => {
    const cases = [
      { route: '/rss', kind: 'rss', source: 'generic', title: 'The Slow Web', count: 3, image: false },
      { route: '/atom', kind: 'atom', source: 'generic', title: 'Field Notes', count: 2, image: false },
      { route: '/youtube', kind: 'atom', source: 'youtube', title: 'Workshop Diaries', count: 2, image: true },
      { route: '/reddit', kind: 'atom', source: 'reddit', title: 'Workshop', count: 2, image: false },
      { route: '/podcast', kind: 'rss', source: 'podcast', title: 'Two Hours On A Bench', count: 2, image: true }
    ];

    for (const c of cases) {
      it(`reads ${c.route} — ${c.kind}, ${c.source}`, async () => {
        const res = await callFeed('readFeed', c.route);

        expect(res.status).toBe(200);
        expect(res.json.result.error).toBeUndefined();
        expect(res.json.result.kind).toBe(c.kind);
        expect(res.json.result.source).toBe(c.source);
        expect(res.json.result.feedTitle).toBe(c.title);
        expect(res.json.result.count).toBe(c.count);

        const items = res.json.result.items || [];
        expect(items).toHaveLength(c.count);
        for (const item of items) {
          expect(item.id).toBeTruthy();
          expect(item.title).toBeTruthy();
          expect(item.link).toBeTruthy();
          expect(item.published).toMatch(/^\d{4}-\d{2}-\d{2}T/);
          if (c.image) expect(item.image).toMatch(/^https?:\/\//);
        }
      });
    }

    it('serialises items through the response as plain JSON a caller can use', async () => {
      const res = await callFeed('readFeed', '/podcast');
      const first = (res.json.result.items || [])[0] as unknown as Record<string, unknown>;

      // The Collection the node emits has to survive `JSON.stringify` on the way out, or the
      // caller gets `{}` and nobody finds out until the app is built.
      expect(first.title).toBe('Episode 62 — The last typewriter mechanic');
      expect(first.enclosure).toEqual({
        url: 'https://twohours.example/audio/062.mp3',
        type: 'audio/mpeg',
        length: '91234567'
      });
      expect(first.tags).toEqual(['repair', 'typewriters', 'obsolescence']);
    });
  });

  describe('§3.2 — Response Type, and the case that proves it does something', () => {
    it('reads a feed the server mislabelled as JSON, when Response Type is Text', async () => {
      const res = await callFeed('readFeed', '/mislabelled');

      expect(res.status).toBe(200);
      expect(res.json.result.count).toBe(3);
      expect(res.json.result.feedTitle).toBe('The Slow Web');
    });

    it('and does NOT, on Auto — which is what the port is for', async () => {
      // The control for the test above. Without this pair, a green `text` test proves only that
      // the default already worked: `auto` hands over text for every honest feed content-type.
      const res = await callFeed('readFeedAuto', '/mislabelled');

      expect(res.status).toBe(200);
      // The feed was NOT read. On Auto the HTTP node believes the content-type, tries to read an
      // XML body as JSON, and fails at the fetch — so the failure arrives from the HTTP node and
      // the parser never runs at all.
      expect(res.json.result.count).toBeUndefined();
      expect(res.json.result.error).toBeTruthy();
    });

    it('still reads an honestly-labelled feed on Auto, so no existing graph changed', async () => {
      const res = await callFeed('readFeedAuto', '/rss');

      expect(res.json.result.count).toBe(3);
      expect(res.json.result.kind).toBe('rss');
    });
  });

  describe('AC3 — a hostile document fails loudly rather than taking the process with it', () => {
    it('refuses an entity bomb, and the backend answers the next request', async () => {
      const bomb = fs.readFileSync(
        path.join(__dirname, '..', '..', 'noodl-runtime', 'test', 'fixtures', 'xml', 'entity-bomb.xml'),
        'utf8'
      );

      const res = await client.request<{ result: FeedAnswer }>('POST', '/functions/xmlDirect', {
        body: { xml: bomb }
      });

      expect(res.status).toBe(200);
      expect(res.json.result.errorCode).toBe('xml/entity-declaration');

      // "Leaves the process alive" is only a measurement if something is asked afterwards.
      const after = await callFeed('readFeed', '/rss');
      expect(after.json.result.count).toBe(3);
    });
  });

  describe('AC4 — Parse XML on its own, in a function', () => {
    it('returns attributes, text and a named array', async () => {
      const xml = fs.readFileSync(
        path.join(__dirname, '..', '..', 'noodl-runtime', 'test', 'fixtures', 'xml', 'attributes-and-mixed.xml'),
        'utf8'
      );

      const res = await client.request<{ result: { result?: Record<string, any> } }>('POST', '/functions/xmlDirect', {
        body: { xml }
      });

      expect(res.status).toBe(200);
      const root = res.json.result.result?.catalogue;
      expect(root['@revision']).toBe('7');
      expect(root.name['#text']).toBe('Bench tools');
      expect(Array.isArray(root.tool)).toBe(true);
      expect(root.tool[1].note).toBe('Sole is <flat> to 0.02mm');
    });
  });

  describe('AC6 — both nodes are in the catalogue, for both runtimes', () => {
    it('lists Parse XML and Parse Feed with availableIn browser and cloud', () => {
      const catalog = JSON.parse(
        fs.readFileSync(path.join(__dirname, '..', '..', 'noodl-types', 'src', 'node-catalog.json'), 'utf8')
      ) as { nodes: { typeName: string; availableIn: string[]; category?: string; inNodePicker?: boolean }[] };

      for (const typeName of ['net.noodl.ParseXML', 'net.noodl.ParseFeed']) {
        const entry = catalog.nodes.find((n) => n.typeName === typeName);
        expect(entry).toBeDefined();
        expect((entry?.availableIn || []).slice().sort()).toEqual(['browser', 'cloud']);
        expect(entry?.category).toBe('Data');
        // A type absent from the picker index is registered and unreachable — the whole reason
        // `Parse CSV`'s own suite asserts this.
        expect(entry?.inNodePicker).toBe(true);
      }
    });
  });
});
