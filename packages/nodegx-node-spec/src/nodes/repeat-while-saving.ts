/**
 * P112-OWN026-FIX03GOLDEN — the `changes` entry Button and Text Input owe for Repeat While Saving (OWN-026 FIX-03,
 * cb7e0d6e4). The input arrived at the specs' existing versions, so `golden.js --check` read a behaviour change with no
 * version. The guard itself is the runtime's (`pressguard.ts`): this spec declares the input it reads.
 */
export function repeatWhileSavingChange(version: number, press: 'click' | 'Enter') {
  return {
    version,
    says:
      `Repeat While Saving, a new input, off by default: while a ${press} has started a save, the next ${press} is ignored ` +
      'until the backend has answered, and for at least half a second, so a double press saves once. Before, every ' +
      `${press} fired`,
    row: 'P112 OWN-026 FIX-03',
    commit: 'cb7e0d6e4',
    migration: { parameter: 'repeatWhileSaving' }
  };
}
