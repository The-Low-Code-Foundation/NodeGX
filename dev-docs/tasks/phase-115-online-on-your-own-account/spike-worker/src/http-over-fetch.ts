/**
 * HST-004 spike: Node's `http.request` / `https.request`, as much of it as the backend's HTTP step uses, over `fetch`.
 *
 * Why a shim and not an edit: workerd's own `node:http` refuses the step's `lookup` option (the address guard that
 * keeps a workflow on a VM from calling 127.0.0.1/admin), so the step cannot run on a Worker as written. The fix that
 * belongs in the product is a transport the step is given (Node http on a VM, fetch on a Worker); `steps/http.ts` was
 * being edited by a live BWF-012 session when this was written, so the spike swaps the module at bundle time instead
 * (wrangler [alias]) and the step's own code runs unchanged.
 *
 * The guard on a Worker: `lookup` is ignored here. A deployed Worker cannot open a connection to a private address
 * (Cloudflare's network refuses it), and the step's `checkLiteralHost` still refuses a literal private IP unless the
 * local-only ALLOW_PRIVATE_HTTP is set. Redirects are `manual`, so the step follows them itself, as on Node.
 */
import { EventEmitter } from 'node:events';
import { Buffer } from 'node:buffer';

type Opts = { method?: string; headers?: Record<string, string>; signal?: AbortSignal; lookup?: unknown };

class Res extends EventEmitter {
  constructor(
    readonly statusCode: number,
    readonly headers: Record<string, string>
  ) {
    super();
  }
  resume(): void {}
}

class Req extends EventEmitter {
  private chunks: Buffer[] = [];
  private aborted = false;
  constructor(
    private readonly url: URL,
    private readonly opts: Opts,
    private readonly cb: (res: Res) => void
  ) {
    super();
  }
  write(c: Buffer | string): void {
    this.chunks.push(typeof c === 'string' ? Buffer.from(c) : c);
  }
  destroy(err?: Error): void {
    this.aborted = true;
    if (err) this.emit('error', err);
  }
  end(): void {
    const headers = { ...(this.opts.headers || {}) };
    delete headers['content-length'];
    const body = this.chunks.length ? Buffer.concat(this.chunks) : undefined;
    fetch(this.url, { method: this.opts.method || 'GET', headers, body, redirect: 'manual', signal: this.opts.signal })
      .then(async (r) => {
        const h: Record<string, string> = {};
        r.headers.forEach((v, k) => (h[k] = v));
        const res = new Res(r.status, h);
        this.cb(res);
        if (r.body) {
          const reader = r.body.getReader();
          for (;;) {
            const { done, value } = await reader.read();
            if (done || this.aborted) break;
            res.emit('data', Buffer.from(value));
          }
        }
        if (!this.aborted) res.emit('end');
      })
      .catch((e) => this.emit('error', e));
  }
}

export function request(url: URL | string, opts: Opts, cb: (res: Res) => void): Req {
  return new Req(typeof url === 'string' ? new URL(url) : url, opts || {}, cb);
}

export default { request };
