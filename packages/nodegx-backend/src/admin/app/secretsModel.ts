/**
 * The Secrets page's pure rules (BMG-011 §3.3), ported from the editor's
 * `secretsPanelModel.ts` (BMG-012 deletes that copy). The name pattern is
 * the server's `FUNCTION_SECRET_NAME_PATTERN`; the env-name folding is the
 * server's `functionSecretEnvName`. Values are never read back — the page
 * says so once, and nothing here can hold one.
 */
export const SECRET_NAME_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/;
export const SECRET_ENV_PREFIX = 'NODEGX_SECRET_';

export function envNameForSecret(name: string): string {
  return SECRET_ENV_PREFIX + name.replace(/[^A-Za-z0-9]+/g, '_').toUpperCase();
}

/** A sentence when the name is not one a Secret node can ask for; null when it is (or is still empty). */
export function secretNameProblem(name: string): string | null {
  if (name.length === 0) return null;
  if (!SECRET_NAME_PATTERN.test(name)) {
    return 'Use letters, digits, "_", "." or "-", 1-128 characters — the same names a Secret node can ask for.';
  }
  return null;
}

export interface SecretListing {
  name: string;
  envName: string;
  alsoInEnvironment: boolean;
}

export interface DeleteOutcome {
  name: string;
  existed: boolean;
  stillResolvesFromEnvironment: boolean;
  envName: string;
}

/** What the page says after a delete: the environment can keep a secret alive after the store forgets it. */
export function describeDeleteOutcome(outcome: DeleteOutcome): { severity: 'bad' | 'ok'; message: string } {
  if (outcome.stillResolvesFromEnvironment) {
    return {
      severity: 'bad',
      message:
        '"' + outcome.name + '" was removed from this backend’s store, but ' + outcome.envName + ' is still set in the ' +
        'environment this backend is running in — so functions asking for "' + outcome.name + '" keep resolving it. ' +
        'Unset that variable and restart the backend to finish removing it.'
    };
  }
  if (outcome.existed) {
    return { severity: 'ok', message: '"' + outcome.name + '" was removed. A Secret node asking for it now fires its failure output.' };
  }
  return { severity: 'ok', message: '"' + outcome.name + '" was not stored here, so nothing changed.' };
}

/** The `NODEGX_SECRET_*` variables no stored secret shadows — resolvable, but not from this page. */
export function environmentOnlyVariables(secrets: SecretListing[], environment: string[]): string[] {
  const shadowed = new Set(secrets.map((s) => s.envName));
  return environment.filter((name) => !shadowed.has(name));
}

export function canSaveSecret(args: { name: string; value: string; busy: boolean }): boolean {
  if (args.busy) return false;
  if (args.name.length === 0 || args.value.length === 0) return false;
  return secretNameProblem(args.name) === null;
}
