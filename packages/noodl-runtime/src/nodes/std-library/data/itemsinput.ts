'use strict';

/**
 * P107-C10 (P109 ISL-026, ruled 2026-10-05 "Refuse it with a Failure") — the one rule Array Filter, Array Map and Filter
 * Records share for what arrives on Items. A list (an array, a Collection, which is an array) is bound; nothing at all
 * (`undefined`, `null`, `''`, `0`, `false`) is no array, as it always was; anything else — a number, `true`, a plain object,
 * a record — is not a list, and the next run fails with this message and produces no items. Bound as it came, it threw in
 * the setter (`collection.on is not a function`), or a record was filtered as a list of one.
 */
export function notAList(value: unknown): string | undefined {
  if (!value || Array.isArray(value)) return undefined;
  return 'Items is not a list — it received ' + (typeof value === 'object' ? 'an object' : 'a ' + typeof value);
}
