/**
 * P132 BWF-006 — where a workflow's *Call an API* step may connect.
 *
 * A backend on a person's VM that will fetch any URL a workflow names is the classic hole: `http://127.0.0.1:8577/admin`
 * is this backend's own admin surface, `http://169.254.169.254/` is the cloud's metadata service (and its
 * credentials), and `10.x` / `192.168.x` is whatever else lives on that network. So by default the step refuses
 * loopback, link-local, private, carrier-grade NAT, multicast and reserved ranges, IPv4 and IPv6, and a backend setting
 * (`allowPrivateHttp`, `--allow-private-http`, `NODEGX_ALLOW_PRIVATE_HTTP=1`) allows them for local development.
 *
 * ⚠️ THE CHECK IS MADE WHEN THE CONNECTION IS, NOT WHEN THE URL IS READ
 * -------------------------------------------------------------------
 * Checking a hostname's address and then handing the URL to `fetch` leaves a gap: `fetch` looks the name up again,
 * and a name whose DNS answers a public address the first time and `127.0.0.1` the second (rebinding) walks through.
 * So the request goes through Node's `http` with a `lookup` of our own: the address it connects to is the address
 * that was checked. A literal IP never reaches `lookup` (Node skips it), so it is checked before the request.
 * A redirect is a new connection and goes through the same door.
 *
 * P26's DEPLOYLOOPBACK work is about a deployed APP pointing at a builder's `127.0.0.1` backend, not about what a
 * backend may call: there was no outbound guard to reuse.
 *
 * @module nodegx-backend/workflow/steps/outbound
 */

import * as dns from 'dns';
import * as net from 'net';

/** The ranges a step may not reach unless the backend allows private addresses. */
const BLOCKED = (() => {
  const b = new net.BlockList();
  const v4: Array<[string, number]> = [
    ['0.0.0.0', 8], // "this network"
    ['10.0.0.0', 8], // private
    ['100.64.0.0', 10], // carrier-grade NAT
    ['127.0.0.0', 8], // loopback
    ['169.254.0.0', 16], // link-local, the cloud metadata address
    ['172.16.0.0', 12], // private
    ['192.0.0.0', 24], // IETF protocol assignments
    ['192.168.0.0', 16], // private
    ['198.18.0.0', 15], // benchmarking
    ['224.0.0.0', 4], // multicast
    ['240.0.0.0', 4] // reserved, and 255.255.255.255
  ];
  for (const [a, p] of v4) b.addSubnet(a, p, 'ipv4');
  const v6: Array<[string, number]> = [
    ['::', 128], // unspecified
    ['::1', 128], // loopback
    ['fc00::', 7], // unique local
    ['fe80::', 10], // link-local
    ['ff00::', 8] // multicast
  ];
  for (const [a, p] of v6) b.addSubnet(a, p, 'ipv6');
  return b;
})();

/** `::ffff:127.0.0.1` and `::ffff:7f00:1` are 127.0.0.1 wearing IPv6: read the IPv4 inside. */
function embeddedIPv4(ip: string): string | undefined {
  const m = /^::ffff:(?:0:)?(.+)$/i.exec(ip);
  if (!m) return undefined;
  if (net.isIPv4(m[1])) return m[1];
  const hex = /^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(m[1]);
  if (!hex) return undefined;
  const hi = parseInt(hex[1], 16);
  const lo = parseInt(hex[2], 16);
  return [hi >> 8, hi & 255, lo >> 8, lo & 255].join('.');
}

/** True when `ip` is in a range a step may not reach by default. Not an IP at all: false. */
export function isPrivateAddress(ip: string): boolean {
  const bare = ip.replace(/^\[|\]$/g, '').replace(/%.*$/, '');
  if (net.isIPv4(bare)) return BLOCKED.check(bare, 'ipv4');
  if (!net.isIPv6(bare)) return false;
  const inner = embeddedIPv4(bare);
  if (inner) return BLOCKED.check(inner, 'ipv4');
  return BLOCKED.check(bare, 'ipv6');
}

/** The refusal, in words a person can act on. */
export class PrivateAddressError extends Error {
  readonly code = 'PRIVATE_ADDRESS';
  constructor(host: string, address: string) {
    super(
      `${host} is ${address === host ? 'a' : `at ${address}, a`} private or local address, which a workflow may not ` +
        'call: it could reach this backend itself, the server it runs on or its network. To call a service on your ' +
        'own machine while developing, start the backend with --allow-private-http (or NODEGX_ALLOW_PRIVATE_HTTP=1).'
    );
    this.name = 'PrivateAddressError';
  }
}

/** Refuse a literal-IP host now; a name is checked by {@link guardedLookup} when it is resolved. */
export function checkLiteralHost(hostname: string, allowPrivate: boolean): void {
  if (allowPrivate) return;
  const bare = hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(bare) && isPrivateAddress(bare)) throw new PrivateAddressError(hostname, bare);
}

type LookupCallback = (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void;

/**
 * A `lookup` for `http.request` that refuses a name resolving to a private address. Node calls it with `all: true`
 * when it may try several addresses; every one must pass, since it may connect to any of them.
 */
export function guardedLookup(allowPrivate: boolean) {
  return (hostname: string, options: dns.LookupOptions, callback: LookupCallback): void => {
    dns.lookup(hostname, { ...options }, ((err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => {
      if (err) return callback(err, '' as string);
      if (!allowPrivate) {
        const list = Array.isArray(address) ? address : [{ address, family: family || 4 }];
        const bad = list.find((a) => isPrivateAddress(a.address));
        if (bad) return callback(new PrivateAddressError(hostname, bad.address) as unknown as NodeJS.ErrnoException, '' as string);
      }
      callback(null, address, family);
    }) as never);
  };
}
