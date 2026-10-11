/**
 * "What can this port connect to" — FH-020 slice 4.
 *
 * ## Why this is its own module, and pure
 *
 * The rule is not one function. `NodeLibrary.canCastPortTypes` answers *may A
 * reach B* for one pair, and the connection popup then layers a second rule on
 * top of it (`ConnectionBar.tsx:144-152`): a **signal output** may only reach a
 * signal input, whatever the cast table says. The cast table really does allow
 * `signal -> boolean` and `signal -> number`, so a tab that read the table alone
 * would tell an author that `Done` can drive a Number input. It cannot.
 *
 * Both halves are `@nodegx/project-contract/typecasts`' (P107 NSP-021, s88):
 * `canCastPortType` is the table, `canConnectPortTypes` the table plus the
 * signal rule — the one body the canvas, this tab and the validator share.
 * Nothing in this file imports the editor: it takes the typecast table as an
 * argument, which is what makes it testable in the plain-Node `tests-unit`
 * runner (see `tests-unit/property-editor/portTypes.test.ts`).
 */
import { ANY_PORT_TYPE, canCastPortType, canConnectPortTypes, type Typecast } from '@nodegx/project-contract/typecasts';

export { ANY_PORT_TYPE, canCastPortType };

/** One row of `NodeLibraryData.typecasts` (`@nodegx/project-contract/typecasts`). */
export type TypecastRule = Typecast;

/** Every port type the cast table mentions, in either column, except `*`. */
export function portTypeUniverse(typecasts: readonly TypecastRule[]): string[] {
  const names = new Set<string>();
  for (const rule of typecasts || []) {
    if (rule.from && rule.from !== ANY_PORT_TYPE) names.add(rule.from);
    for (const to of rule.to || []) {
      if (to && to !== ANY_PORT_TYPE) names.add(to);
    }
  }
  return Array.from(names);
}

/**
 * The port types that can legally sit on the other end of a wire from a port of
 * `typeName`.
 *
 * `undefined` means *unbounded* — a `*` port takes anything, and the tab says
 * "Any" rather than listing the whole table (FH-020 slice 4: "If that set is
 * unbounded (`*`), say `Any` and stop.").
 *
 * `direction` is the direction of the port being described: an **input** is
 * asked what may flow into it, an **output** what it may flow into.
 *
 * The port's own type sorts first — it is the answer an author is looking for
 * — and the rest alphabetically, so the line is stable between renders.
 */
export function connectablePortTypes(
  typecasts: readonly TypecastRule[],
  typeName: string | undefined,
  direction: 'input' | 'output'
): string[] | undefined {
  if (!typeName) return undefined;
  if (typeName === ANY_PORT_TYPE) return undefined;

  const universe = portTypeUniverse(typecasts);

  // A port can carry a type the cast table never names (`domelement` before it
  // was listed, every custom module type). It still connects to itself.
  if (universe.indexOf(typeName) === -1) universe.push(typeName);

  const reaches = universe.filter((other) => {
    const [from, to] = direction === 'input' ? [other, typeName] : [typeName, other];
    return canConnectPortTypes(typecasts, from, to);
  });

  reaches.sort((a, b) => {
    if (a === typeName) return -1;
    if (b === typeName) return 1;
    return a.localeCompare(b);
  });

  return reaches;
}
