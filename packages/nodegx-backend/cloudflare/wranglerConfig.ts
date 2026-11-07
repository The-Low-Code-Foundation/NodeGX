/**
 * P115 HST-014 — the `wrangler.toml` of an app's Worker, written by the deploy command (never by hand).
 *
 * Layout of a deployment folder (`~/.nodegx/cloudflare/<name>/` unless `--out`):
 *   wrangler.toml
 *   dist/worker.mjs          the host and the whole backend, bundled by the deploy (no wrangler bundling: it cannot
 *                            give CommonJS `require('./ui/index.html')` text, nor swap `node:sqlite`)
 *   dist/printed-code.mjs    the cloud functions' code nodes, printed (HST-013), its own module
 *   dist/app.mjs             the app's id, name and rules for a first start
 *   site/                    the interpreter site, served by the same Worker
 *
 * Pure, so jest grades it.
 */

export interface WranglerConfigInput {
  /** The Worker's name: its address is `https://<name>.<account>.workers.dev`. */
  name: string;
  /** The R2 bucket for uploaded files, or null for none (uploads then live in the isolate's memory and are lost). */
  bucket: string | null;
  /**
   * HST-007: a domain the app also answers at (`campus.example.com` or `example.com`), as a Worker Custom Domain:
   * Cloudflare makes the DNS record and the certificate. Its zone must be on the same Cloudflare account and the
   * hostname must have no CNAME already. The workers.dev address keeps answering.
   */
  domain?: string | null;
  compatibilityDate?: string;
}

/** A hostname a Custom Domain can be: lowercase labels of letters, digits and dashes, at least one dot, no wildcard. */
export function domainProblem(domain: string): string | null {
  const label = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?';
  if (domain.length > 253 || !new RegExp(`^(?:${label}\\.)+[a-z]{2,63}$`).test(domain)) {
    return `"${domain}" cannot be a domain for the app: write the bare name, lowercase, like campus.example.com (no https://, no path, no *).`;
  }
  return null;
}

/** Cloudflare's rule for a Worker name: lowercase letters, digits and dashes, 1–63, no dash at either end. */
export function workerNameProblem(name: string): string | null {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(name)) {
    return `"${name}" cannot be a Worker's name: use lowercase letters, digits and dashes (not at either end), at most 63.`;
  }
  return null;
}

/** A name a project's name gives, when none is chosen: `Campus Sign-up` → `campus-sign-up`. */
export function workerNameFrom(projectName: string): string {
  const slug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63)
    .replace(/-+$/g, '');
  return slug || 'nodegx-app';
}

const q = (s: string) => JSON.stringify(s);

export function wranglerConfig(input: WranglerConfigInput): string {
  const lines = [
    `# Written by the NodeGX deploy (P115 HST-014). Changed by the next deploy: edit the project, not this file.`,
    `name = ${q(input.name)}`,
    `main = "dist/worker.mjs"`,
    `compatibility_date = ${q(input.compatibilityDate ?? '2026-10-01')}`,
    `compatibility_flags = ["nodejs_compat"]`,
    `no_bundle = true`,
    `find_additional_modules = true`,
    `base_dir = "dist"`,
    `rules = [{ type = "ESModule", globs = ["printed-code.mjs", "app.mjs"] }]`,
    ``,
    `# The whole backend, in one SQLite-backed Durable Object: records, users, rules, settings.`,
    `[[durable_objects.bindings]]`,
    `name = "BACKEND"`,
    `class_name = "NodegxBackend"`,
    ``,
    `[[migrations]]`,
    `tag = "v1"`,
    `new_sqlite_classes = ["NodegxBackend"]`,
    ``,
    `# The app's pages. The Worker runs first so the backend's own paths never meet a file.`,
    `[assets]`,
    `directory = "./site"`,
    `binding = "ASSETS"`,
    `run_worker_first = true`,
    ``
  ];
  if (input.bucket) {
    lines.push(
      `# Uploaded files, through a binding: no access keys anywhere.`,
      `[[r2_buckets]]`,
      `binding = "FILES"`,
      `bucket_name = ${q(input.bucket)}`,
      ``
    );
  }
  if (input.domain) {
    lines.push(
      `# The app's own domain (a Custom Domain: Cloudflare makes its DNS record and certificate). workers.dev still answers.`,
      `[[routes]]`,
      `pattern = ${q(input.domain)}`,
      `custom_domain = true`,
      ``
    );
  }
  lines.push(`[observability]`, `enabled = true`, ``);
  return lines.join('\n');
}
