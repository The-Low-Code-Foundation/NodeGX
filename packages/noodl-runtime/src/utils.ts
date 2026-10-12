/**
 * The viewer installs this global before any node runs. It is declared locally rather
 * than in a global .d.ts because the runtime is framework-neutral: this is the only place
 * in the package that reaches for it, and only for the deploy-time base URL.
 */
declare const Noodl: { baseUrl?: string } | undefined;

//this just assumes the base url is '/' always
export function getAbsoluteUrl(_url: unknown): string {
  //convert to string in case the _url is a Cloud File (which is an object with a custom toString())
  const url = String(_url);

  //only add a the base url if this is a local URL (e.g. not a https url or  base64 string)
  if (!url || url[0] === '/' || url.includes('://') || url.startsWith('data:')) {
    return url;
  }

  return (Noodl.baseUrl || '/') + url;
}

/**
 * What a thrown value says, in JavaScript's own words, whatever was thrown — an Error's message, else the value as text.
 *
 * P109 ISL-051 (P107-C147, C148): `throw null` and `throw undefined` are legal, and every catch in the Function and the Script
 * read `.message`, `.stack` or `Object.getPrototypeOf(e)` off them — which threw inside the catch, so the node reported
 * nothing and (the Script) never ran that code again. A value with no `toString` at all reads as its type.
 */
export function thrownMessage(error: unknown): string {
  if (error && (error as Error).message) return String((error as Error).message);
  try {
    return String(error);
  } catch {
    return typeof error;
  }
}

/**
 * Log an error thrown by the JavaScript nodes' run code. Safe for any thrown value (P107-C147).
 *
 * ⚠️ Its signature is unchanged on purpose: the viewer's Script imports it through `@noodl/runtime/src/utils`, which type-checks
 * against the runtime's generated `dist-types` — a new parameter or export there is a type error in every checkout whose
 * declarations were built before it, until they are rebuilt.
 */
export function logJavaScriptNodeError(error: unknown): void {
  const prefix = 'Error in JS node run code.';
  if (error === null || (typeof error !== 'object' && typeof error !== 'function')) {
    console.log(prefix, thrownMessage(error));
    return;
  }
  const proto = Object.getPrototypeOf(error);
  const kind = proto && proto.constructor && proto.constructor.name ? proto.constructor.name : 'Error';
  console.log(prefix, kind + ': ' + thrownMessage(error), (error as Error).stack);
}

// Named exports, not `export =`. The rule for this package: a module whose export
// *is* a value (a class, a function) must use `export =`, because consumers
// `require()` it and would otherwise get a namespace object. This module's export
// already is a namespace, so both forms emit the same CommonJS — and only this form
// can be imported from the viewers, which compile as ESM. Every consumer
// destructures (`const { getAbsoluteUrl } = require('./utils')`), which is unchanged.
