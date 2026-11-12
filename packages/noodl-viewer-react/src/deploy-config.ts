/**
 * DEP-001 — a deployed app reads its backend address from `nodegx-config.json` beside it, so one
 * build can be re-pointed without the editor.
 *
 * The export still bakes `metadata.cloudservices` into the bundle, and that baked value is what the
 * app uses whenever the file is missing or unreadable. The file is an override, never a
 * replacement: an app deployed by an older editor, or to a host that does not serve the file,
 * boots exactly as before.
 *
 * Every consumer of the address (record nodes, users, cloud functions, config, BYOB nodes) reads
 * it lazily from graph metadata, so merging the override into `projectData.metadata` before the
 * runtime loads reaches all of them. Nothing in the runtime changes.
 *
 * 🔴 **Allow-list, not a general merge.** A config file that could override any metadata key
 * could rewrite the app. Only `cloudservices` and `backendServices` are read; every other key is
 * ignored, with a warning.
 *
 * Callers: the deploy `index.html` (`loadDeployConfig` + `applyDeployConfig` before
 * `renderDeployed`), and the SSR server (`applyDeployConfig` on the config it also serves to the
 * browser, so the server render and the hydration use one address).
 */

export const DEPLOY_CONFIG_FILE = 'nodegx-config.json';

export const OVERRIDABLE_KEYS = ['cloudservices', 'backendServices'];

export type DeployConfig = Record<string, unknown>;

type FetchLike = (url: string, init?: { cache?: string }) => Promise<{
  ok: boolean;
  status: number;
  text(): Promise<string>;
}>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The parsed file, or `null` with a warning when it is not a JSON object. A web server that
 * answers `index.html` for every path is the common way to get here, and it must degrade to the
 * baked address, never a blank page.
 */
export function parseDeployConfig(text: string, warn: (message: string) => void = console.warn): DeployConfig | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    const start = String(text).trim().slice(0, 40);
    warn(
      `NodeGX: ${DEPLOY_CONFIG_FILE} is not JSON (it starts "${start}"), so the app uses the backend address it was ` +
        'deployed with.'
    );
    return null;
  }
  if (!isPlainObject(parsed)) {
    warn(`NodeGX: ${DEPLOY_CONFIG_FILE} is not a JSON object, so the app uses the backend address it was deployed with.`);
    return null;
  }
  return parsed;
}

/**
 * Fetches the config beside the page. Never rejects: 404 is the normal "no override" answer and
 * is silent; anything else that goes wrong is a warning and `null`.
 */
export function loadDeployConfig(
  url: string,
  fetchImpl: FetchLike | undefined = typeof fetch === 'function' ? (fetch as unknown as FetchLike) : undefined,
  warn: (message: string) => void = console.warn
): Promise<DeployConfig | null> {
  if (!fetchImpl) return Promise.resolve(null);

  return fetchImpl(url, { cache: 'no-store' })
    .then((response) => {
      if (response.status === 404) return null;
      if (!response.ok) {
        warn(`NodeGX: ${url} answered ${response.status}, so the app uses the backend address it was deployed with.`);
        return null;
      }
      return response.text().then((text) => parseDeployConfig(text, warn));
    })
    .catch((error) => {
      warn(`NodeGX: could not read ${url} (${error && error.message}), so the app uses the backend address it was deployed with.`);
      return null;
    });
}

/**
 * Merges the allowed keys of `config` over `projectData.metadata`, one level deep: a file holding
 * only `{ "cloudservices": { "appId": "…" } }` keeps the baked endpoint. Returns the keys applied.
 */
export function applyDeployConfig(
  projectData: { metadata?: Record<string, unknown> } | null | undefined,
  config: DeployConfig | null | undefined,
  warn: (message: string) => void = console.warn
): string[] {
  if (!projectData || !isPlainObject(config)) return [];

  const applied: string[] = [];
  const ignored: string[] = [];
  const metadata = (projectData.metadata = isPlainObject(projectData.metadata) ? projectData.metadata : {});

  Object.keys(config).forEach((key) => {
    const value = config[key];
    if (OVERRIDABLE_KEYS.indexOf(key) === -1) {
      ignored.push(key);
      return;
    }
    if (!isPlainObject(value)) {
      warn(`NodeGX: "${key}" in ${DEPLOY_CONFIG_FILE} is not an object, so it is ignored.`);
      return;
    }
    if (key === 'cloudservices' && value.endpoint !== undefined && typeof value.endpoint !== 'string') {
      warn(`NodeGX: "cloudservices.endpoint" in ${DEPLOY_CONFIG_FILE} is not a string, so it is ignored.`);
      return;
    }
    const baked = isPlainObject(metadata[key]) ? (metadata[key] as Record<string, unknown>) : {};
    metadata[key] = Object.assign({}, baked, value);
    applied.push(key);
  });

  if (ignored.length) {
    warn(
      `NodeGX: ${DEPLOY_CONFIG_FILE} can only set ${OVERRIDABLE_KEYS.join(' and ')}; ignored ${ignored
        .map((key) => `"${key}"`)
        .join(', ')}.`
    );
  }
  return applied;
}
