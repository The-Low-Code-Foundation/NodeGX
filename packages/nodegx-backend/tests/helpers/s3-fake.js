/**
 * A small S3-compatible endpoint for specs and drives (BMG-015).
 *
 * Path-style only (`/<bucket>/<key>`), which is what `S3Driver` sends by
 * default and what MinIO and friends require. It answers what the driver
 * asks: PUT / GET / HEAD / DELETE an object, HEAD the bucket, and
 * ListObjectsV2 with `prefix` and `continuation-token` (page size 2 by
 * default, so the pagination arm of `listObjects` is exercised by any list of
 * three). Authentication is checked the way a real endpoint would refuse a
 * wrong key: the `Authorization` header's `Credential=<id>/…` must name the
 * configured access key id, or the answer is 403 `InvalidAccessKeyId` in S3's
 * XML — the sentence a person reads on the Storage page. An unknown bucket is
 * 404 `NoSuchBucket`.
 *
 * Plain CommonJS with no dependencies so that the same file serves the jest
 * spec (`require`d in-process) and a drive (`node tests/helpers/s3-fake.js
 * --port 9400 --bucket puppy --key AKIA… --secret …` as its own process).
 *
 * @module nodegx-backend/tests/helpers/s3-fake
 */
'use strict';

const http = require('http');

function xmlEscape(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function errorXml(code, message, resource) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Error><Code>${xmlEscape(code)}</Code><Message>${xmlEscape(message)}</Message><Resource>${xmlEscape(resource)}</Resource><RequestId>fake</RequestId></Error>`;
}

/**
 * @param {{ bucket: string, accessKeyId: string, pageSize?: number, log?: (line: string) => void }} options
 */
function createS3Fake(options) {
  const bucket = options.bucket;
  const accessKeyId = options.accessKeyId;
  const pageSize = options.pageSize || 2;
  const log = options.log || (() => undefined);
  /** @type {Map<string, { body: Buffer, lastModified: string }>} */
  const objects = new Map();
  /** every request the fake saw, oldest first: `METHOD path` */
  const seen = [];
  /** when > 0, the next that many object GETs answer 500 InternalError (a restore's download failing). */
  let failGets = 0;

  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      const method = req.method || 'GET';
      seen.push(`${method} ${url.pathname}${url.search}`);
      log(`${method} ${url.pathname}${url.search} (${body.length} bytes)`);
      const send = (status, headers, payload) => {
        res.writeHead(status, headers);
        res.end(payload);
      };
      const refuse = (status, code, message) =>
        send(status, { 'content-type': 'application/xml' }, errorXml(code, message, url.pathname));

      // Authentication: the SigV4 credential must name the configured key id.
      const auth = String(req.headers.authorization || '');
      const m = auth.match(/Credential=([^/]+)\//);
      if (!m) return refuse(403, 'AccessDenied', 'Access Denied: this request carries no credential.');
      if (m[1] !== accessKeyId) return refuse(403, 'InvalidAccessKeyId', 'The Access Key Id you provided does not exist in our records.');

      const segments = url.pathname.split('/').filter(Boolean);
      const askedBucket = segments[0] || '';
      if (askedBucket !== bucket) return refuse(404, 'NoSuchBucket', `The specified bucket does not exist: ${askedBucket || '(none)'}`);
      const key = segments
        .slice(1)
        .map((s) => decodeURIComponent(s))
        .join('/');

      // Bucket-level: HEAD (does it exist) and ListObjectsV2.
      if (!key) {
        if (method === 'HEAD') return send(200, {}, '');
        if (method === 'GET' && url.searchParams.get('list-type') === '2') {
          const prefix = url.searchParams.get('prefix') || '';
          const token = url.searchParams.get('continuation-token') || '';
          const all = Array.from(objects.keys())
            .filter((k) => k.startsWith(prefix))
            .sort();
          const start = token ? all.indexOf(token) + 1 : 0;
          const page = all.slice(start, start + pageSize);
          const truncated = start + pageSize < all.length;
          const items = page
            .map((k) => {
              const o = objects.get(k);
              return `<Contents><Key>${xmlEscape(k)}</Key><LastModified>${o.lastModified}</LastModified><Size>${o.body.length}</Size></Contents>`;
            })
            .join('');
          const next = truncated ? `<NextContinuationToken>${xmlEscape(page[page.length - 1])}</NextContinuationToken>` : '';
          const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<ListBucketResult><Name>${xmlEscape(bucket)}</Name><Prefix>${xmlEscape(prefix)}</Prefix><KeyCount>${page.length}</KeyCount><MaxKeys>${pageSize}</MaxKeys><IsTruncated>${truncated}</IsTruncated>${next}${items}</ListBucketResult>`;
          return send(200, { 'content-type': 'application/xml' }, xml);
        }
        return refuse(405, 'MethodNotAllowed', `The fake does not answer ${method} on a bucket.`);
      }

      // Object-level.
      if (method === 'PUT') {
        objects.set(key, { body, lastModified: new Date().toISOString() });
        return send(200, { etag: '"fake"' }, '');
      }
      const existing = objects.get(key);
      if (method === 'HEAD') {
        if (!existing) return send(404, {}, '');
        return send(200, { 'content-length': String(existing.body.length), 'content-type': 'application/octet-stream' }, '');
      }
      if (method === 'GET') {
        if (failGets > 0) {
          failGets--;
          return refuse(500, 'InternalError', 'We encountered an internal error. Please try again.');
        }
        if (!existing) return refuse(404, 'NoSuchKey', 'The specified key does not exist.');
        return send(200, { 'content-length': String(existing.body.length), 'content-type': 'application/octet-stream' }, existing.body);
      }
      if (method === 'DELETE') {
        objects.delete(key);
        return send(204, {}, '');
      }
      return refuse(405, 'MethodNotAllowed', `The fake does not answer ${method} on an object.`);
    });
  });

  return {
    server,
    objects,
    seen,
    /** Listen on a port (0 = any) and answer the endpoint URL. */
    listen(port = 0, host = '127.0.0.1') {
      return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => {
          const addr = server.address();
          resolve(`http://${host}:${typeof addr === 'object' && addr ? addr.port : port}`);
        });
      });
    },
    close() {
      return new Promise((resolve) => server.close(() => resolve(undefined)));
    },
    /** Make the next `n` object GETs fail with S3's InternalError. */
    failNextGets(n = 1) {
      failGets = n;
    },
    /** Keys under a prefix, sorted. */
    keys(prefix = '') {
      return Array.from(objects.keys())
        .filter((k) => k.startsWith(prefix))
        .sort();
    }
  };
}

module.exports = { createS3Fake };

// As a process: `node tests/helpers/s3-fake.js --port 9400 --bucket puppy --key AKIAFAKE --secret x`
if (require.main === module) {
  const argv = process.argv.slice(2);
  const arg = (name, fallback) => {
    const i = argv.indexOf('--' + name);
    return i === -1 ? fallback : argv[i + 1];
  };
  const fake = createS3Fake({
    bucket: arg('bucket', 'nodegx-test'),
    accessKeyId: arg('key', 'AKIAFAKE'),
    pageSize: Number(arg('page-size', '2')),
    log: (line) => process.stdout.write('[s3-fake] ' + line + '\n')
  });
  fake.listen(Number(arg('port', '9400'))).then((url) => process.stdout.write('[s3-fake] listening ' + url + '\n'));
}
