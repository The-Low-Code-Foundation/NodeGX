/**
 * P107-C10 (P109 ISL-026, ruled 2026-10-05 "Refuse it with a Failure") — the rule Array Filter, Array Map and Filter
 * Records share for Items (noodl-runtime `data/itemsinput.ts`): a list (an array, a registry array) is bound; nothing
 * (`undefined`, `null`, `''`, `0`, `false`) is no array; anything else — a number, `true`, a plain object, a record — is
 * not a list, and the run fails with this message.
 */
export function notAList(value: unknown, isCollection: (v: unknown) => boolean): string | undefined {
  if (!value || Array.isArray(value) || isCollection(value)) return undefined;
  return 'Items is not a list — it received ' + (typeof value === 'object' ? 'an object' : 'a ' + typeof value);
}
