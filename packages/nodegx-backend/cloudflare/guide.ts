/**
 * COMMUNITY-CFSECRETS — what the Cloudflare deploy tells a person who runs it with no agent beside them: a link to
 * the guide at each step, and the cloud functions' secrets the deployed backend does not have.
 *
 * The guide is `docs-site/docs/deploy/cloudflare.md`, served by the docs site at the address below. Every anchor here
 * is a `{#id}` heading on that page, pinned by `tests/community-cfsecrets-deploy-guide.test.ts`, so a renamed heading
 * fails a test instead of sending a person to the top of the page.
 *
 * Pure: no `fetch`, no file. The deploy reads the backend and the bundle and hands this module what it read.
 */

/** The docs site's page for this command (`docs-site/docusaurus.config.js` url + baseUrl + `/docs` + the file's path). */
export const GUIDE_URL = 'https://the-low-code-foundation.github.io/NodeGX/docs/deploy/cloudflare';

/** One section of the guide per thing the deploy can be doing when it stops. */
export const GUIDE_SECTIONS = {
  signIn: 'sign-in',
  functions: 'cloud-functions',
  site: 'the-site',
  worker: 'the-worker',
  private: 'nothing-private',
  upload: 'upload',
  project: 'the-project-onto-the-backend',
  secrets: 'secrets',
  dashboard: 'the-dashboard'
} as const;

export type GuideSection = keyof typeof GUIDE_SECTIONS;

export function guideLink(section?: GuideSection): string {
  return section ? `${GUIDE_URL}#${GUIDE_SECTIONS[section]}` : GUIDE_URL;
}

/** The node type a cloud function reads a secret with (`noodl-viewer-cloud/src/nodes/cloud/secret.ts`). */
export const SECRET_NODE_TYPE = 'noodl.cloud.secret';

type BundleNode = { type?: string; parameters?: Record<string, unknown>; children?: BundleNode[] };

/**
 * The secret names the functions read: every Secret node whose Name is typed in. A Name wired from another node is
 * only known when the function runs, so it is not here; the guide says so.
 */
export function secretNamesRead(components: Array<{ nodes?: BundleNode[] }>): string[] {
  const names = new Set<string>();
  const visit = (n: BundleNode) => {
    const name = n.parameters?.name;
    if (n.type === SECRET_NODE_TYPE && typeof name === 'string' && name.trim()) names.add(name.trim());
    (n.children || []).forEach(visit);
  };
  components.forEach((c) => (c.nodes || []).forEach(visit));
  return [...names].sort();
}

/** What `GET /admin/secrets` answers that this reads (`src/server/admin-secrets.ts`): names only, never a value. */
export interface SecretsListing {
  secrets?: Array<{ name: string }>;
  /** The `NODEGX_SECRET_*` variables the backend's process has. */
  environment?: string[];
  envPrefix?: string;
}

/**
 * The lines the deploy prints about secrets, after the functions are up. `listing` is null when the backend could
 * not be asked: then the names are printed with where to check, never "all set".
 */
export function secretsReport(o: {
  read: string[];
  listing: SecretsListing | null;
  inEnvFile: string[];
  dashboard: string;
  credentialFile: string;
}): string[] {
  if (!o.read.length) return [];
  const setHere = new Set((o.listing?.secrets ?? []).map((s) => s.name));
  const prefix = o.listing?.envPrefix ?? 'NODEGX_SECRET_';
  for (const v of o.listing?.environment ?? []) if (v.startsWith(prefix)) setHere.add(v.slice(prefix.length));
  const page = `${o.dashboard}#/secrets`;
  const signIn = `Sign in there with the adminToken in ${o.credentialFile}.`;
  if (!o.listing) {
    return [
      `Secrets the functions read: ${o.read.join(', ')}. This backend could not be asked which are set.`,
      `Check them on its Secrets page, ${page}. ${signIn}`,
      `Help: ${guideLink('secrets')}`
    ];
  }
  const missing = o.read.filter((n) => !setHere.has(n));
  const set = o.read.filter((n) => setHere.has(n));
  if (!missing.length) return [`Secrets the functions read: ${set.join(', ')}. All are set on this backend.`];
  const env = new Set(o.inEnvFile);
  const lines = [
    `Secrets the functions read: ${o.read.length}. Set on this backend: ${set.length ? set.join(', ') : 'none'}.`,
    `NOT set on this backend: ${missing.join(', ')}. A function that reads one fails until it is set.`
  ];
  const fromEnv = missing.filter((n) => env.has(n));
  if (fromEnv.length) {
    lines.push(`Your app's .env has ${fromEnv.join(', ')}. That file stays on this computer, so copy each value across.`);
  }
  lines.push(
    `A secret does not travel with a deploy. Set each one on the backend's own Secrets page, ${page}, not in Cloudflare's dashboard.`,
    `${signIn} A redeploy keeps what you set.`,
    `Help: ${guideLink('secrets')}`
  );
  return lines;
}
