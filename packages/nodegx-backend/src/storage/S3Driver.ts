/**
 * S3Driver — StorageDriver over an S3-compatible endpoint, signed with the
 * zero-dependency SigV4 implementation in ./sigv4.ts.
 *
 * Requests go over plain `node:http`/`node:https` — no AWS SDK (see sigv4.ts's
 * module doc for why). Path-style addressing (`<endpoint>/<bucket>/<key>`) is
 * the default because the primary target is a self-hosted S3-compatible
 * service (MinIO, and friends) that require it; set `forcePathStyle: false`
 * for AWS S3 buckets that need virtual-hosted-style (`<bucket>.<endpoint>`).
 *
 * Same hash-bucketed key layout as `LocalDriver` (`hh/hh/hash-random`) — one
 * mental model for both drivers, and BAK-006-NOTES documents both under one
 * "storage layout" heading for BAK-007.
 *
 * Not implemented (out of scope, v1): multipart upload (no >5GB/resumable
 * uploads — the spec excludes resumable uploads entirely), bucket creation/
 * lifecycle management (operator's job), request retries/backoff (a failed
 * request surfaces as a thrown error, loud per doctrine, not silently retried
 * into a different failure mode).
 *
 * BMG-015: the bucket also holds backup archives, so the driver grew what a
 * backup needs and an upload never did — a put at an EXPLICIT key streamed
 * from a file on disk (`putFile`: the archive is hashed in one pass and sent
 * in a second, never held in memory), a listing under a prefix with sizes
 * (`listObjects`), a download to a file (`downloadTo`), and `probe()`, the
 * Storage page's *Test connection*: HEAD the bucket, then PUT and DELETE a
 * probe key, answering the endpoint's own `<Code>`/`<Message>` when it
 * refuses (`s3Sentence`), so a wrong key reads as *InvalidAccessKeyId: …*
 * rather than a bare status.
 *
 * @module nodegx-backend/storage/S3Driver
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import { PassThrough } from 'stream';
import { pipeline } from 'stream/promises';
import { URL } from 'url';

import type { StorageDriver, StorageStat } from './types';
import { signAws4, sha256hex } from './sigv4';

export interface S3DriverConfig {
  /** e.g. "https://s3.us-east-1.amazonaws.com" or "http://127.0.0.1:9000" (MinIO). */
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Default true (MinIO and most self-hosted S3-compatible services require it). */
  forcePathStyle?: boolean;
}

function amzDateNow(): string {
  return new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
}

interface HttpResult {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
}

/** A request body: bytes in memory, or a file streamed from disk with its hash already known. */
type BodySource = Buffer | { path: string; size: number; sha256: string };

/** One object as ListObjectsV2 reports it. */
export interface S3ObjectInfo {
  key: string;
  size: number;
  lastModified: string | null;
}

/** What `probe()` answers: the connection works, or the endpoint's own sentence. */
export interface S3ProbeResult {
  ok: boolean;
  /** The endpoint's `<Code>: <Message>`, a network error, or a plain sentence for a missing bucket. */
  error?: string;
}

/** The endpoint's error as one sentence: `<Code>: <Message>` from S3's XML body, else the status. */
export function s3Sentence(res: { status: number; body: Buffer }, fallback: string): string {
  const xml = res.body.toString('utf-8');
  const code = xml.match(/<Code>([^<]*)<\/Code>/);
  const message = xml.match(/<Message>([^<]*)<\/Message>/);
  if (code || message) {
    return `${code ? decodeXmlEntities(code[1]) : 'Error'}${message ? ': ' + decodeXmlEntities(message[1]) : ''} (HTTP ${res.status})`;
  }
  return `${fallback} (HTTP ${res.status})`;
}

/** Hex sha256 of a file, streamed — never the file in memory. */
async function sha256File(filePath: string): Promise<string> {
  const hash = crypto.createHash('sha256');
  await pipeline(fs.createReadStream(filePath), hash);
  return hash.digest('hex');
}

export class S3Driver implements StorageDriver {
  readonly kind = 's3' as const;
  private readonly config: S3DriverConfig;
  private readonly endpointUrl: URL;
  private readonly forcePathStyle: boolean;

  constructor(config: S3DriverConfig) {
    this.config = config;
    this.endpointUrl = new URL(config.endpoint);
    this.forcePathStyle = config.forcePathStyle !== false;
  }

  /** The bucket this driver writes into (for a page's *stored in bucket X* and a backup's `s3://` name). */
  get bucket(): string {
    return this.config.bucket;
  }

  /** `s3://<bucket>/<key>` — how a backup archive in the bucket is named to a person. */
  urlFor(key: string): string {
    return `s3://${this.config.bucket}/${key}`;
  }

  /** Both halves of the credential are present (a driver built without them can only be refused). */
  hasCredentials(): boolean {
    return !!(this.config.accessKeyId && this.config.secretAccessKey);
  }

  /** host header + request path for a given object key ("" for the bucket root, used by list). */
  private target(key: string): { host: string; path: string } {
    const encKey = key
      .split('/')
      .map((seg) => encodeURIComponent(seg))
      .join('/');
    if (this.forcePathStyle) {
      return { host: this.endpointUrl.host, path: `/${this.config.bucket}${encKey ? '/' + encKey : ''}` };
    }
    return { host: `${this.config.bucket}.${this.endpointUrl.host}`, path: encKey ? `/${encKey}` : '/' };
  }

  private async request(
    method: string,
    key: string,
    opts: { body?: BodySource; query?: Array<[string, string]> } = {}
  ): Promise<HttpResult> {
    const { host, path } = this.target(key);
    const body: BodySource = opts.body || Buffer.alloc(0);
    const length = Buffer.isBuffer(body) ? body.length : body.size;
    const payloadHash = Buffer.isBuffer(body) ? sha256hex(body) : body.sha256;
    const amzDate = amzDateNow();
    const headers: Record<string, string> = {
      host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash
    };
    if (length > 0) headers['content-length'] = String(length);

    const { authorization } = signAws4(
      { method, path, query: opts.query, headers, payloadHash },
      {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
        region: this.config.region,
        service: 's3'
      },
      amzDate
    );

    const queryString = opts.query && opts.query.length ? '?' + opts.query.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&') : '';

    return this.rawRequest({
      method,
      path: path + queryString,
      headers: { ...headers, authorization },
      body: length > 0 ? body : undefined
    });
  }

  private rawRequest(opts: { method: string; path: string; headers: Record<string, string>; body?: BodySource }): Promise<HttpResult> {
    const isHttps = this.endpointUrl.protocol === 'https:';
    const transport = isHttps ? https : http;
    return new Promise((resolve, reject) => {
      const req = transport.request(
        {
          protocol: this.endpointUrl.protocol,
          hostname: this.endpointUrl.hostname,
          port: this.endpointUrl.port || (isHttps ? 443 : 80),
          method: opts.method,
          path: opts.path,
          headers: opts.headers
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c: Buffer) => chunks.push(c));
          res.on('end', () => resolve({ status: res.statusCode || 0, headers: res.headers, body: Buffer.concat(chunks) }));
          res.on('error', reject);
        }
      );
      req.on('error', reject);
      if (!opts.body) {
        req.end();
      } else if (Buffer.isBuffer(opts.body)) {
        req.write(opts.body);
        req.end();
      } else {
        // A file streamed in from disk (a backup archive): the socket sees it chunk by chunk.
        const source = fs.createReadStream(opts.body.path);
        source.on('error', (e) => {
          req.destroy(e);
          reject(e);
        });
        source.pipe(req);
      }
    });
  }

  /** Stream variant of rawRequest used by createReadStream: pipes the response body as it arrives. */
  private streamGet(key: string): NodeJS.ReadableStream {
    const out = new PassThrough();
    (async () => {
      try {
        const { host, path } = this.target(key);
        const amzDate = amzDateNow();
        const payloadHash = sha256hex(Buffer.alloc(0));
        const headers: Record<string, string> = { host, 'x-amz-date': amzDate, 'x-amz-content-sha256': payloadHash };
        const { authorization } = signAws4(
          { method: 'GET', path, headers, payloadHash },
          {
            accessKeyId: this.config.accessKeyId,
            secretAccessKey: this.config.secretAccessKey,
            region: this.config.region,
            service: 's3'
          },
          amzDate
        );
        const isHttps = this.endpointUrl.protocol === 'https:';
        const transport = isHttps ? https : http;
        const req = transport.request(
          {
            protocol: this.endpointUrl.protocol,
            hostname: this.endpointUrl.hostname,
            port: this.endpointUrl.port || (isHttps ? 443 : 80),
            method: 'GET',
            path,
            headers: { ...headers, authorization }
          },
          (res) => {
            if ((res.statusCode || 0) >= 400) {
              // Read the refusal's XML so the error names the endpoint's own code.
              const chunks: Buffer[] = [];
              res.on('data', (c: Buffer) => chunks.push(c));
              res.on('end', () => out.destroy(new Error(`S3 GET ${key} failed: ${s3Sentence({ status: res.statusCode || 0, body: Buffer.concat(chunks) }, 'the endpoint refused the read')}`)));
              res.on('error', (e) => out.destroy(e));
              return;
            }
            res.pipe(out);
          }
        );
        req.on('error', (e) => out.destroy(e));
        req.end();
      } catch (e) {
        out.destroy(e instanceof Error ? e : new Error(String(e)));
      }
    })();
    return out;
  }

  async put(hash: string, data: Buffer): Promise<string> {
    const bucket1 = hash.slice(0, 2) || '00';
    const bucket2 = hash.slice(2, 4) || '00';
    const key = `${bucket1}/${bucket2}/${hash}-${crypto.randomBytes(4).toString('hex')}`;
    await this.putObject(key, data);
    return key;
  }

  /** BMG-015: write `data` at exactly `key` (a backup archive's name, a probe). Loud on refusal. */
  async putObject(key: string, data: Buffer): Promise<void> {
    const res = await this.request('PUT', key, { body: data });
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`S3 PUT ${key} failed: ${s3Sentence(res, 'the endpoint refused the write')}`);
    }
  }

  /**
   * BMG-015: write the file at `filePath` under `key`, streamed — hashed in one
   * pass for the signature, sent in a second. A 2 GB archive never sits in
   * this process's memory (the VM the task is trying to save).
   */
  async putFile(key: string, filePath: string): Promise<void> {
    const size = fs.statSync(filePath).size;
    const sha256 = await sha256File(filePath);
    const res = await this.request('PUT', key, { body: { path: filePath, size, sha256 } });
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`S3 PUT ${key} failed: ${s3Sentence(res, 'the endpoint refused the write')}`);
    }
  }

  /** BMG-015: stream the object at `key` into `filePath` (a restore downloads before the database is paused). */
  async downloadTo(key: string, filePath: string): Promise<void> {
    await pipeline(this.createReadStream(key), fs.createWriteStream(filePath));
  }

  /**
   * BMG-015: *Test connection*. HEAD the bucket, then PUT and DELETE a probe
   * key — an upload needs both, and a bucket that lists but refuses writes
   * would otherwise be found by the first upload. Never throws: a network
   * error is the sentence too.
   */
  async probe(): Promise<S3ProbeResult> {
    try {
      const head = await this.request('HEAD', '');
      if (head.status === 404) return { ok: false, error: `There is no bucket called "${this.config.bucket}" at ${this.config.endpoint}.` };
      if (head.status === 301 || head.status === 307) {
        return { ok: false, error: `The endpoint redirected (HTTP ${head.status}): the bucket "${this.config.bucket}" lives in another region or wants the other addressing style.` };
      }
      // Any other refusal of the HEAD (a 403 for a wrong key, say) carries NO
      // body — HEAD never does — so the sentence comes from the PUT below.
      const probeKey = `nodegx-probe-${crypto.randomBytes(6).toString('hex')}`;
      const put = await this.request('PUT', probeKey, { body: Buffer.from('nodegx connection test\n') });
      if (put.status < 200 || put.status >= 300) return { ok: false, error: s3Sentence(put, 'the bucket refused a write') };
      const del = await this.request('DELETE', probeKey);
      if (del.status >= 400 && del.status !== 404) return { ok: false, error: s3Sentence(del, 'the bucket refused a delete') };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: `Could not reach ${this.config.endpoint}: ${e instanceof Error ? e.message : String(e)}` };
    }
  }

  async get(key: string): Promise<Buffer> {
    const res = await this.request('GET', key);
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`S3 GET ${key} failed with status ${res.status}`);
    }
    return res.body;
  }

  createReadStream(key: string): NodeJS.ReadableStream {
    return this.streamGet(key);
  }

  async delete(key: string): Promise<void> {
    const res = await this.request('DELETE', key);
    // S3 DELETE is idempotent: 204/200/404 are all "gone" outcomes.
    if (res.status >= 400 && res.status !== 404) {
      throw new Error(`S3 DELETE ${key} failed with status ${res.status}`);
    }
  }

  async stat(key: string): Promise<StorageStat> {
    const res = await this.request('HEAD', key);
    if (res.status === 404) return { exists: false, size: 0 };
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`S3 HEAD ${key} failed with status ${res.status}`);
    }
    const len = res.headers['content-length'];
    return { exists: true, size: len ? Number(len) : 0 };
  }

  async *listKeys(): AsyncIterable<string> {
    for await (const o of this.listObjects()) yield o.key;
  }

  /** BMG-015: ListObjectsV2 under `prefix` (every page), with each object's size and date. */
  async *listObjects(prefix = ''): AsyncIterable<S3ObjectInfo> {
    let continuationToken: string | undefined;
    do {
      const query: Array<[string, string]> = [['list-type', '2']];
      if (prefix) query.push(['prefix', prefix]);
      if (continuationToken) query.push(['continuation-token', continuationToken]);
      const res = await this.request('GET', '', { query });
      if (res.status < 200 || res.status >= 300) {
        throw new Error(`S3 ListObjectsV2 failed: ${s3Sentence(res, 'the bucket refused the listing')}`);
      }
      const xml = res.body.toString('utf-8');
      for (const m of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
        const item = m[1];
        const key = item.match(/<Key>([^<]*)<\/Key>/);
        if (!key) continue;
        const size = item.match(/<Size>(\d+)<\/Size>/);
        const modified = item.match(/<LastModified>([^<]*)<\/LastModified>/);
        yield { key: decodeXmlEntities(key[1]), size: size ? Number(size[1]) : 0, lastModified: modified ? decodeXmlEntities(modified[1]) : null };
      }
      const truncatedMatch = xml.match(/<IsTruncated>(true|false)<\/IsTruncated>/);
      const tokenMatch = xml.match(/<NextContinuationToken>([^<]*)<\/NextContinuationToken>/);
      continuationToken = truncatedMatch && truncatedMatch[1] === 'true' && tokenMatch ? decodeXmlEntities(tokenMatch[1]) : undefined;
    } while (continuationToken);
  }
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}
