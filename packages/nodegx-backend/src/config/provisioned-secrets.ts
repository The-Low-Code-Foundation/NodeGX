/**
 * Secrets provisioned from the environment, and the stance that refuses to invent one (PRD-005).
 *
 * ## The failure this exists to prevent
 *
 * n8n's most-reported production failure is not architectural: `N8N_ENCRYPTION_KEY` is generated on
 * first run and written to a settings file, so a container that starts on an empty volume, or a
 * deploy rebuilt from config, comes up **healthy with a fresh key** and locks its operator out of
 * everything encrypted under the old one. The error, when it finally arrives, is correct and still
 * costs hours, because it does not say which file to reconcile against which variable.
 *
 * NodeGX has the same shape: `--token` provisions the admin credential and one is minted when it
 * is absent (`security/state.ts`), and the signed-URL HMAC secret is minted on first use
 * (`storage/FileSubsystem.ts`). That is the right behaviour for a local development backend and
 * the wrong one for a deploy, and the cheap moment to separate the two is before a deploy hits it.
 *
 * ## What this module is
 *
 *  - **One reader** for the `<VAR>` / `<VAR>_FILE` convention. `deploy/entrypoint.sh` already
 *    speaks it for the Compose deploy and translates to `--token`; reading it here as well gives
 *    a systemd or Kubernetes deploy the same door without the shell in front. `_FILE` wins, the
 *    trailing newline is stripped (an `echo secret > file` adds one, and a token with a newline
 *    fails authentication in a way that looks like a wrong token), and an unreadable file is a
 *    refusal rather than an empty value.
 *  - **One sentence shape** for the refusal, {@link describeMissingSecret}: the secret, where it
 *    looked, and the one command that fixes it. That sentence is the entire value of PRD-005.
 *  - **One vocabulary** for provenance, {@link SecretSource}, so `/admin/status` can say per
 *    secret whether it was provisioned or generated — and never the value.
 *
 * ## What it deliberately is not
 *
 * A value read from the environment is **not written to `secrets.json`**. The point of supplying
 * a secret from the environment is that it never lands in a file that lands in a volume snapshot;
 * persisting it would undo that. `--token` keeps its existing persisting behaviour untouched.
 *
 * @module nodegx-backend/config/provisioned-secrets
 */

import * as fs from 'fs';

/** Where a secret the backend holds came from. Reported, never the value. */
export type SecretSource =
  /** Passed on the command line (`--token`, `--readonly-token`); persisted to secrets.json. */
  | 'cli'
  /** Read from `<VAR>` in the environment; held in memory, never persisted. */
  | 'env'
  /** Read from the file `<VAR>_FILE` names (Docker/Compose secrets); held in memory, never persisted. */
  | 'env-file'
  /** Already in `<dataDir>/secrets.json` from an earlier start; its original provenance is unrecorded. */
  | 'file'
  /** Minted by this backend because nobody supplied one. */
  | 'generated'
  /** Not held at all (an optional tier that was never provisioned). */
  | 'absent';

export interface SecretProvenance {
  source: SecretSource;
  /** True when the value lives in `<dataDir>/secrets.json` (whoever put it there). */
  persisted: boolean;
}

export interface ProvisionedSecret {
  value: string;
  source: 'env' | 'env-file';
  /** The variable (or the file that variable named) the value was read from. Safe to print. */
  from: string;
}

/** Thrown at startup when the production stance is on and a required secret is missing. */
export class SecretsStartupError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'SecretsStartupError';
    this.code = code;
  }
}

/** The variable that turns the stance on without a flag — for a container that cannot edit its command. */
export const REQUIRE_SECRETS_ENV = 'NODEGX_REQUIRE_SECRETS';

/** Environment names for the secrets the backend would otherwise mint. One place, so the docs and the refusal agree. */
export const ADMIN_TOKEN_ENV = 'NODEGX_ADMIN_TOKEN';
export const READONLY_TOKEN_ENV = 'NODEGX_READONLY_TOKEN';
export const FILES_SIGNING_SECRET_ENV = 'NODEGX_FILES_SIGNING_SECRET';

/** `NODEGX_REQUIRE_SECRETS=1|true|yes` — anything else, including unset, is the default stance. */
export function requireSecretsFromEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env[REQUIRE_SECRETS_ENV];
  if (!raw) return false;
  return ['1', 'true', 'yes'].includes(raw.trim().toLowerCase());
}

/**
 * Read one secret from `<envName>_FILE` (wins) or `<envName>`. `null` when neither is set.
 *
 * ⚠️ A `_FILE` that is set but cannot be read is a refusal, not `null`: the operator said where
 * the secret is, and a backend that silently mints one instead is the exact failure this module
 * exists to close.
 */
export function readProvisionedSecret(envName: string, env: NodeJS.ProcessEnv = process.env): ProvisionedSecret | null {
  const fileVar = `${envName}_FILE`;
  const filePath = env[fileVar];
  if (filePath) {
    let text: string;
    try {
      text = fs.readFileSync(filePath, 'utf-8');
    } catch (e) {
      throw new SecretsStartupError(
        'SECRET_FILE_UNREADABLE',
        `Refusing to start: ${fileVar} points at ${filePath}, which cannot be read ` +
          `(${e instanceof Error ? e.message : String(e)}). Fix the path or the mount, or unset ${fileVar}.`
      );
    }
    const value = text.replace(/[\r\n]+$/, '');
    if (!value) {
      throw new SecretsStartupError(
        'SECRET_FILE_EMPTY',
        `Refusing to start: ${fileVar} points at ${filePath}, which is empty. Put the secret in it, or unset ${fileVar}.`
      );
    }
    return { value, source: 'env-file', from: `${fileVar}=${filePath}` };
  }
  const direct = env[envName];
  if (direct && direct.length > 0) return { value: direct, source: 'env', from: envName };
  return null;
}

export interface MissingSecretDescription {
  /** What the operator calls it — `adminToken`, `files.signingSecret`. */
  name: string;
  /** One sentence on what it is for, so the refusal is not a bare key name. */
  purpose: string;
  envName: string;
  /** The CLI flag that also supplies it, or null when there is none. */
  cliFlag: string | null;
  /** `<dataDir>/secrets.json`. */
  secretsPath: string;
  /** The JSON path inside secrets.json, e.g. `"adminToken"` or `"files" → "signingSecret"`. */
  fileKey: string;
}

/**
 * The refusal, in the shape PRD-005 §3.3 asks for: the secret, every place it was looked for, and
 * the one command that fixes it. Written for the operator reading a crashed container's log at
 * 4am, which is why the fix comes with a working command and not a link.
 */
export function describeMissingSecret(d: MissingSecretDescription): string {
  const lookedIn = [
    `  - ${d.envName}_FILE   (a file holding the value — Docker/Compose secrets)`,
    `  - ${d.envName}        (the value itself)`,
    ...(d.cliFlag ? [`  - ${d.cliFlag}`] : []),
    `  - ${d.secretsPath}  (${d.fileKey})`
  ];
  return (
    `Refusing to start: the ${d.name} secret is not provisioned, and this backend was told not to invent one ` +
    `(--require-secrets / ${REQUIRE_SECRETS_ENV}=1).\n\n` +
    `  ${d.name}: ${d.purpose}\n\n` +
    `Looked in, in order:\n${lookedIn.join('\n')}\n\n` +
    `Fix — supply it from your secret manager, for example:\n\n` +
    `  ${d.envName}=$(openssl rand -base64 32 | tr -d '/+=' ) nodegx-backend serve ...\n\n` +
    `or mount it as a file and set ${d.envName}_FILE=/run/secrets/<name>. ` +
    `Or drop --require-secrets to let this backend mint one — right for a laptop, wrong for a deploy, ` +
    `because the next empty volume mints a different one and locks you out of this data.`
  );
}
