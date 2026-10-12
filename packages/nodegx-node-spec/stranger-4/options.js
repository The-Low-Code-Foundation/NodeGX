'use strict';
/**
 * What the Items input offers as <option>s — read from dropdown.ts's prose ("Items", v4) and its `optionsOf` /
 * `readStoredItems` / `optionText` helpers, re-written here by hand.
 *
 *   - text is the OLD STORED form: JSON text of a list; anything that does not parse to a list offers nothing;
 *   - any other value that is not a list offers nothing;
 *   - in a list, a null / undefined item is skipped; an item that is not an object is an option with no Label and no Value;
 *   - an option's value is its Value as text, or (Value absent, null or a boolean) its Label's text with whitespace
 *     stripped and collapsed (HTML's `option.value` fallback);
 *   - Disabled true or 'true' disables it.
 */

function text(v) {
  try {
    return String(v);
  } catch (e) {
    return '';
  }
}

function labelText(label) {
  const raw = label === undefined || label === null || typeof label === 'boolean' ? '' : text(label);
  return raw.replace(/[ \t\n\f\r]+/g, ' ').trim();
}

function readStored(stored) {
  if (stored.trim() === '') return [];
  let parsed;
  try {
    parsed = JSON.parse(stored);
  } catch (e) {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const rows = [];
  for (const item of parsed) {
    if (item === null || item === undefined) continue;
    if (typeof item === 'object') {
      const label = item.Label !== undefined ? item.Label : item.label;
      const value = item.Value !== undefined ? item.Value : item.value;
      if (label === undefined && value === undefined) continue;
      const shown = text(label !== undefined ? label : value);
      rows.push({ Label: shown, Value: value !== undefined ? text(value) : shown });
    } else {
      const shown = text(item);
      rows.push({ Label: shown, Value: shown });
    }
  }
  return rows;
}

/** [{ value, label, disabled }] — `label` is only what the option shows (not graded). */
function optionsOf(items) {
  if (typeof items === 'string') return optionsOf(readStored(items));
  if (!items || !Array.isArray(items)) return [];
  const out = [];
  for (const item of items) {
    if (item === null || item === undefined) continue;
    // Not the stranger's line: Dropdown v8 (P107 R21, P107-S88-OPTIONSCAST) — a word in the list is an option labelled and
    // valued by it; the stranger followed v4's text ("an item that is not an object is an option with no Label and no Value")
    if (typeof item !== 'object') {
      out.push({ value: text(item), label: text(item), disabled: false });
      continue;
    }
    const o = item;
    const value = o.Value === undefined || o.Value === null || typeof o.Value === 'boolean' ? labelText(o.Label) : text(o.Value);
    const shown = o.Label === undefined || o.Label === null ? value : text(o.Label);
    out.push({ value, label: shown, disabled: o.Disabled === true || o.Disabled === 'true' });
  }
  return out;
}

module.exports = { optionsOf, text };
