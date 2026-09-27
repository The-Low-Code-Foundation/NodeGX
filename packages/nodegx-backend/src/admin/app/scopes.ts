/**
 * What an API key may do, as checkboxes ⇄ as the server's scope strings
 * (BMG-007 §3.2).
 *
 * The server's vocabulary is five shapes and nothing else (`validateScopes`,
 * `security/model.ts`): `classes:read` · `classes:write` · `classes:*` ·
 * `functions:*` · `functions:<name>`. This module is the ONLY place in the app
 * that spells them; the page shows a person two groups of boxes and never a
 * scope string (AC7). Pure — the spec runs every combination through the real
 * `validateScopes`.
 */

export interface ScopeChoice {
  /** Data → Read records. */
  read: boolean;
  /** Data → Write records. */
  write: boolean;
  /** Functions → Call any function. Greys the named list. */
  anyFunction: boolean;
  /** Functions → the named ones, when `anyFunction` is off. */
  functions: string[];
}

export const NOTHING: ScopeChoice = { read: false, write: false, anyFunction: false, functions: [] };

/** The boxes → the scope array the server accepts. Empty when nothing is ticked. */
export function toScopes(choice: ScopeChoice): string[] {
  const out: string[] = [];
  if (choice.read && choice.write) out.push('classes:*');
  else if (choice.read) out.push('classes:read');
  else if (choice.write) out.push('classes:write');
  if (choice.anyFunction) out.push('functions:*');
  else choice.functions.forEach((name) => out.push('functions:' + name));
  return out;
}

/** A stored scope array → the boxes. Unknown strings are dropped, not shown as text. */
export function fromScopes(scopes: string[] | undefined | null): ScopeChoice {
  const choice: ScopeChoice = { read: false, write: false, anyFunction: false, functions: [] };
  (scopes || []).forEach((scope) => {
    if (scope === 'classes:*') choice.read = choice.write = true;
    else if (scope === 'classes:read') choice.read = true;
    else if (scope === 'classes:write') choice.write = true;
    else if (scope === 'functions:*') choice.anyFunction = true;
    else if (scope.indexOf('functions:') === 0 && scope.length > 'functions:'.length) {
      const name = scope.slice('functions:'.length);
      if (choice.functions.indexOf(name) === -1) choice.functions.push(name);
    }
  });
  return choice;
}

/** Nothing ticked: the server refuses an empty list, so the page does first. */
export function isEmptyChoice(choice: ScopeChoice): boolean {
  return !choice.read && !choice.write && !choice.anyFunction && choice.functions.length === 0;
}

/** The chips a list row wears: "read data", "write data", "any function", "3 functions". */
export function describeScopes(scopes: string[] | undefined | null): string[] {
  const c = fromScopes(scopes);
  const out: string[] = [];
  if (c.read) out.push('read data');
  if (c.write) out.push('write data');
  if (c.anyFunction) out.push('any function');
  else if (c.functions.length === 1) out.push('1 function');
  else if (c.functions.length > 1) out.push(c.functions.length + ' functions');
  return out;
}
