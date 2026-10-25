/**
 * P112-OWN023-NORANGE — a file answers a byte range, so a song can be sought and Safari plays it.
 *
 * Measured (OWN-023): `curl -r 0-99` on a song the backend stored answered `200` and the whole 481,175 bytes, with no
 * `Accept-Ranges` and no `Content-Range`. An audio player seeks by asking for a range, and Safari/iOS will not play
 * media from a server that does not answer one. Now `/files/<name>` answers one range of `bytes=` with `206` and the
 * slice (open-ended and suffix forms too), a range past the end with `416`, and says `Accept-Ranges: bytes` on the
 * whole file. What a single range cannot answer (several ranges, a malformed one, an `If-Range` that no longer
 * matches) gets the whole file, as RFC 9110 allows.
 *
 * The bucket driver asks its endpoint for the same slice (`Range`, signed with the rest), graded against a stand-in
 * endpoint that records what it was asked.
 */
import * as fs from 'fs';
import * as http from 'http';
import type { AddressInfo } from 'net';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { S3Driver } from '../src/storage/S3Driver';

jest.setTimeout(30000);

// A thousand bytes that are not all the same, so a wrong slice cannot read as the right one.
const SONG = Buffer.from(Array.from({ length: 1000 }, (_, i) => (i * 7 + 3) % 256));

describe('P112-OWN023-NORANGE — /files/<name> answers a byte range', () => {
  let dataDir: string;
  let service: BackendService;
  let url: string;
  let etag: string;

  const get = async (headers: Record<string, string> = {}) => {
    const res = await fetch(url, { headers });
    return { status: res.status, headers: res.headers, body: Buffer.from(await res.arrayBuffer()) };
  };

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-norange-'));
    service = new BackendService({ dataDir, port: 0, backendId: 'norange', backendName: 'No range' });
    const base = (await service.start()).listen.url;
    const up = await fetch(`${base}/files/Coastline_at_3AM.mp3`, { method: 'POST', body: SONG, headers: { 'content-type': 'audio/mpeg' } });
    expect(up.status).toBe(201);
    url = ((await up.json()) as { url: string }).url;
    etag = (await get()).headers.get('etag') as string;
    expect(etag).toBeTruthy();
  });

  afterAll(async () => {
    await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('the whole file says it answers ranges', async () => {
    const whole = await get();
    expect(whole.status).toBe(200);
    expect(whole.headers.get('accept-ranges')).toBe('bytes');
    expect(whole.body.equals(SONG)).toBe(true);
  });

  it('bytes 0–99 of a song: 206, the first hundred bytes, and where they sit in the whole', async () => {
    const part = await get({ range: 'bytes=0-99' });
    expect(part.status).toBe(206);
    expect(part.headers.get('content-range')).toBe('bytes 0-99/1000');
    expect(part.headers.get('content-length')).toBe('100');
    expect(part.headers.get('etag')).toBe(etag);
    expect(part.body.equals(SONG.subarray(0, 100))).toBe(true);
  });

  it('a seek into the middle, an open end, the last few bytes, and an end past the file', async () => {
    const cases: Array<[string, number, number]> = [
      ['bytes=500-599', 500, 599],
      ['bytes=900-', 900, 999],
      ['bytes=-50', 950, 999],
      ['bytes=990-5000', 990, 999]
    ];
    for (const [range, start, end] of cases) {
      const part = await get({ range });
      expect([range, part.status, part.headers.get('content-range')]).toEqual([range, 206, `bytes ${start}-${end}/1000`]);
      expect(part.body.equals(SONG.subarray(start, end + 1))).toBe(true);
    }
  });

  it('a range that starts past the end is 416, saying how long the file is', async () => {
    const past = await get({ range: 'bytes=1000-' });
    expect(past.status).toBe(416);
    expect(past.headers.get('content-range')).toBe('bytes */1000');
  });

  it('what one range cannot answer gets the whole file: several ranges, a malformed one, a stale If-Range', async () => {
    for (const headers of [{ range: 'bytes=0-1,5-6' }, { range: 'bytes=abc' }, { range: 'pages=1-2' }, { range: 'bytes=0-99', 'if-range': '"old"' }]) {
      const whole = await get(headers);
      expect([JSON.stringify(headers), whole.status]).toEqual([JSON.stringify(headers), 200]);
      expect(whole.body.equals(SONG)).toBe(true);
    }
    const fresh = await get({ range: 'bytes=0-99', 'if-range': etag });
    expect(fresh.status).toBe(206);
  });
});

describe('P112-OWN023-NORANGE — the bucket driver asks its endpoint for the slice', () => {
  it('sends Range, signed with the other headers, and streams what comes back', async () => {
    const seen: http.IncomingHttpHeaders[] = [];
    const endpoint = http.createServer((req, res) => {
      seen.push(req.headers);
      const m = /^bytes=(\d+)-(\d+)$/.exec(String(req.headers.range || ''));
      if (!m) {
        res.writeHead(200, { 'content-length': SONG.length });
        res.end(SONG);
        return;
      }
      const slice = SONG.subarray(Number(m[1]), Number(m[2]) + 1);
      res.writeHead(206, { 'content-length': slice.length, 'content-range': `bytes ${m[1]}-${m[2]}/${SONG.length}` });
      res.end(slice);
    });
    await new Promise<void>((r) => endpoint.listen(0, '127.0.0.1', r));
    try {
      const port = (endpoint.address() as AddressInfo).port;
      const driver = new S3Driver({ endpoint: `http://127.0.0.1:${port}`, region: 'us-east-1', bucket: 'b', accessKeyId: 'k', secretAccessKey: 's' });
      const collect = async (s: NodeJS.ReadableStream) => {
        const chunks: Buffer[] = [];
        for await (const c of s as AsyncIterable<Buffer>) chunks.push(c);
        return Buffer.concat(chunks);
      };
      expect((await collect(driver.createReadStream('song.mp3', { start: 500, end: 599 }))).equals(SONG.subarray(500, 600))).toBe(true);
      expect(seen[0].range).toBe('bytes=500-599');
      expect(String(seen[0].authorization)).toMatch(/SignedHeaders=[^,]*\brange\b/);
      expect((await collect(driver.createReadStream('song.mp3'))).equals(SONG)).toBe(true);
      expect(seen[1].range).toBeUndefined();
    } finally {
      endpoint.close();
    }
  });
});
