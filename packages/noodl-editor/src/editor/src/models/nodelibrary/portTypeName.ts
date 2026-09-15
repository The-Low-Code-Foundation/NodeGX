/**
 * The name of a port type, whether it was declared as a string or as an object.
 *
 * `NodeLibrary.nameForPortType` delegates here. It lives in its own import-free module (CHR-007) so
 * the property panel's widget dispatch can ask it without loading the node library, which reaches
 * the project model at import time — and so a plain-Node spec can grade that dispatch for real.
 *
 * SIG-001 widened the parameter to match what the body has always done: the `if (!type) return;`
 * guard handles `null`/`undefined`, and a port declaration's `type` is an object whose `name` is
 * optional.
 */
export function nameForPortType(type: string | { name?: string } | null | undefined): string | undefined {
  if (!type) return;
  return typeof type === 'string' ? type : type.name;
}
