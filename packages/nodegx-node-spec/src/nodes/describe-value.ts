/**
 * `describeValue` — packages/noodl-runtime/src/diagnostics.ts :96-130: how the runtime names a value in a warning it shows the
 * editor ("a string ("abc")", "a number (3)", "an object"). The sentences that quote it (an icon port handed what it cannot
 * draw, NSP-019 R35) are graded word for word, so this is the runtime's rule copied, not paraphrased.
 */

/** :96 */
const MAX_EXCERPT = 40;

/** :104-130 */
export function describeValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'nothing';
  if (Array.isArray(value)) return value.length === 1 ? 'an array of 1 item' : `an array of ${value.length} items`;
  const type = typeof value;
  if (type === 'string') {
    const text = value as string;
    const excerpt = text.length > MAX_EXCERPT ? text.slice(0, MAX_EXCERPT) + '…' : text;
    return `a string ("${excerpt}")`;
  }
  if (type === 'number') return (value as number) !== (value as number) ? 'NaN' : `a number (${value})`;
  if (type === 'boolean') return `a boolean (${value})`;
  if (type === 'function') return 'a function';
  if (type === 'object') return 'an object';
  return `a ${type}`;
}
