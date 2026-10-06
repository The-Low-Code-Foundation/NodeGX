/**
 * P107-C65 (P109 ISL-026, ruled 2026-10-05 "Turn them into text"): a control's Label or Placeholder wired an object or
 * an array is drawn as its text (`[object Object]`), which points the person at the mistake. React throws on an object
 * child ("Objects are not valid as a React child") and that takes the whole page down, not one control. Everything
 * else — text, a number, a boolean, nothing — renders as it always did.
 */
export function labelText<T>(value: T): T | string {
  return value !== null && typeof value === 'object' ? String(value) : value;
}
