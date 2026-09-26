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
 * BMG-017: given `secretAccessKey`, the fake also CHECKS the SigV4 signature
 * over the request it received — the host header it was sent, the path, the
 * query, the signed headers and the payload hash — and answers 403
 * `SignatureDoesNotMatch` as S3 does. The verifier is written from AWS's
 * description of the canonical request, not from `src/storage/sigv4.ts`, so
 * the driver's signer is graded rather than agreeing with itself. And with
 * `virtualHostedOnly`, the bucket is read from the Host header
 * (`<bucket>.<endpoint>`, the AWS style a person gets with *Path-style
 * addressing* off) and a path-style request is refused.
 *
 * Plain CommonJS with no dependencies so that the same file serves the jest
 * spec (`require`d in-process) and a drive (`node tests/helpers/s3-fake.js
 * --port 9400 --bucket puppy --key AKIA… --secret …` as its own process).
 *
 * @module nodegx-backend/tests/helpers/s3-fake
 */
'use strict';

const crypto = require('crypto');
const http = require('http');

/** RFC 3986 unreserved stay; everything else is %XX (upper case) — AWS's `UriEncode`. */
function awsEncode(s) {
  return Array.from(Buffer.from(String(s), 'utf8'))
    .map((b) => {
      const c = String.fromCharCode(b);
      return /[A-Za-z0-9\-_.~]/.test(c) ? c : '%' + b.toString(16).toUpperCase().padStart(2, '0');
    })
    .join('');
}

/**
 * The signature S3 would compute for the request as it ARRIVED. Returns null
 * when it matches, or the reason it does not (for the 403's message).
 */
function signatureProblem(req, url, body, secret) {
  const auth = String(req.headers.authorization || '');
  const m = auth.match(/^AWS4-HMAC-SHA256 Credential=([^,]+), ?SignedHeaders=([^,]+), ?Signature=([0-9a-f]+)$/);
  if (!m) return 'the Authorization header is not AWS4-HMAC-SHA256';
  const [keyId, date, region, service, terminal] = m[1].split('/');
  if (!keyId || terminal !== 'aws4_request') return 'the credential scope is malformed';
  const signed = m[2].split(';');
  if (!signed.includes('host')) return 'the host header is not signed';
  const amzDate = String(req.headers['x-amz-date'] || '');
  const payloadHash = String(req.headers['x-amz-content-sha256'] || '');
  if (payloadHash !== 'UNSIGNED-PAYLOAD' && payloadHash !== crypto.createHash('sha256').update(body).digest('hex')) {
    return 'x-amz-content-sha256 is not the hash of the body received';
  }
  const canonicalUri =
    url.pathname
      .split('/')
      .map((seg) => awsEncode(decodeURIComponent(seg)))
      .join('/') || '/';
  const canonicalQuery = Array.from(url.searchParams.entries())
    .map(([k, v]) => [awsEncode(k), awsEncode(v)])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0))
    .map(([k, v]) => k + '=' + v)
    .join('&');
  const canonicalHeaders = signed.map((h) => h + ':' + String(req.headers[h] === undefined ? '' : req.headers[h]).trim().replace(/\s+/g, ' ') + '\n').join('');
  const creq = [req.method, canonicalUri, canonicalQuery, canonicalHeaders, signed.join(';'), payloadHash].join('\n');
  const scope = [date, region, service, 'aws4_request'].join('/');
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, crypto.createHash('sha256').update(creq).digest('hex')].join('\n');
  const h = (key, data) => crypto.createHmac('sha256', key).update(data, 'utf8').digest();
  const signingKey = h(h(h(h('AWS4' + secret, date), region), service), 'aws4_request');
  const expected = crypto.createHmac('sha256', signingKey).update(toSign, 'utf8').digest('hex');
  return expected === m[3] ? null : 'the signature does not match the request received (host ' + req.headers.host + ')';
}

function xmlEscape(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function errorXml(code, message, resource) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Error><Code>${xmlEscape(code)}</Code><Message>${xmlEscape(message)}</Message><Resource>${xmlEscape(resource)}</Resource><RequestId>fake</RequestId></Error>`;
}

/**
 * @param {{ bucket: string, accessKeyId: string, secretAccessKey?: string, virtualHostedOnly?: boolean, pageSize?: number, log?: (line: string) => void }} options
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
      if (options.secretAccessKey) {
        const problem = signatureProblem(req, url, body, options.secretAccessKey);
        if (problem) return refuse(403, 'SignatureDoesNotMatch', 'The request signature we calculated does not match the signature you provided: ' + problem + '.');
      }

      // Virtual-hosted: the bucket is the Host header's first label. Path-style: the path's first segment.
      const hostHeader = String(req.headers.host || '');
      const virtual = hostHeader.startsWith(bucket + '.');
      if (options.virtualHostedOnly && !virtual) {
        return refuse(400, 'InvalidRequest', `This fake answers virtual-hosted requests only (Host: ${bucket}.<endpoint>); it was sent Host: ${hostHeader}.`);
      }
      const segments = url.pathname.split('/').filter(Boolean);
      const askedBucket = virtual ? bucket : segments[0] || '';
      if (askedBucket !== bucket) return refuse(404, 'NoSuchBucket', `The specified bucket does not exist: ${askedBucket || '(none)'}`);
      const key = segments
        .slice(virtual ? 0 : 1)
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
    secretAccessKey: arg('secret', undefined),
    virtualHostedOnly: argv.includes('--virtual-hosted'),
    pageSize: Number(arg('page-size', '2')),
    log: (line) => process.stdout.write('[s3-fake] ' + line + '\n')
  });
  fake.listen(Number(arg('port', '9400'))).then((url) => process.stdout.write('[s3-fake] listening ' + url + '\n'));
}
