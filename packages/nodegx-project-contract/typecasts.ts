/**
 * Which port types may be wired together (P107 NSP-021 §3.2, s88).
 *
 * The table every editor reads to answer "may this output feed that input". Until s88 it was hand-typed in the
 * runtime (`nodelibraryexport.ts`), copied into the node catalog, and its rule was coded three more times: the
 * canvas (`nodelibrary.ts` `canCastPortTypes` plus `ConnectionBar.tsx`'s signal rule), the Ports tab
 * (`portTypes.ts`), and the validator the Problems panel and the agent server share (`CatalogIndex.isTypeCompatible`,
 * which let a signal through on either end). The runtime now imports the table from here, and the rule has one body.
 *
 * ⚠️ **The table gates the editor; it converts almost nothing.** `PORT-TYPE-CONTRACT.md`: the only conversions the
 * runtime performs on a wire are `object`/`array` → `string` and `string` → `object`/`array`. A row here says a person
 * may draw the wire, not that the value changes shape on the way (`connectionCoercion.ts` warns where it silently
 * does not). Casts are additive: nothing that connects today should stop connecting.
 *
 * Rulings: R21 (2026-10-11) — a list may be wired into a Dropdown's Items (`array → optionslist`; it had been refused
 * since Items became an `optionslist`, P107-S88-OPTIONSCAST). R22 (2026-10-11) — the agent's checker follows the
 * canvas's rule, {@link canConnectPortTypes}; measured over Richard's 201 projects, 0 wires answered differently.
 *
 * @module project-contract/typecasts
 */

/** One row: a port of type `from` may feed a port of any type in `to`. */
export interface Typecast {
  from: string;
  to: string[];
}

/** The wildcard port type: casts to and from everything. */
export const ANY_PORT_TYPE = '*';

/** Every port type's row. A type with no row reaches only itself and `*`. */
export const TYPECASTS: readonly Readonly<Typecast>[] = [
  {
    from: 'string',
    to: ['number', 'boolean', 'image', 'color', 'enum', 'textStyle', 'dimension', 'array', 'object']
  },
  {
    from: 'boolean',
    to: ['number', 'string', 'signal']
  },
  {
    from: 'number',
    to: ['boolean', 'string', 'dimension']
  },
  {
    from: 'date',
    to: ['string']
  },
  {
    from: 'signal',
    to: ['boolean', 'number']
  },
  {
    from: 'image',
    to: []
  },
  {
    from: 'cloudfile',
    to: ['string', 'image']
  },
  {
    // The resolved color string (context.styles.resolveColor already
    // produces it), so a Color variable can feed anything that takes text.
    from: 'color',
    to: ['string']
  },
  {
    // P88 GAM-023 ruling (Richard, 2026-09-17): an enum is a string. An enum value is
    // already the option's string, so a dropdown's value wired into a text port (or a
    // component output typed string) arrives as it is. Only `string`: an enum into
    // `number` still has nothing to convert it.
    from: 'enum',
    to: ['string']
  },
  {
    // PORT-TYPE-CONTRACT.md: declaring `object` must not strand the port.
    // The string form is JSON — the conversion lives in
    // Node.setInputValue, which mirrors the existing string -> object
    // parse on the way out.
    from: 'object',
    to: ['string']
  },
  {
    from: 'domelement',
    to: []
  },
  {
    from: 'reference',
    to: []
  },
  {
    from: 'font',
    to: []
  },
  {
    from: 'textStyle',
    to: ['string']
  },
  {
    // Collection is deprecated but supported via typecasts
    from: 'collection',
    to: ['array']
  },
  {
    // R21 (2026-10-11): `optionslist` — a Dropdown's Items has been an `optionslist` since 2026-09-05, and a list
    // wired into it is what it holds (the Dropdown reads it as its options).
    from: 'array',
    to: ['collection', 'string', 'optionslist']
  }
];

/**
 * May a value of type `from` be cast to a port of type `to`, by the table alone? Both names are bare (`'string'`,
 * not `{ name: 'string' }`); a missing name never casts.
 *
 * This is the question the editor asks when it types a component port from the ports wired to it
 * (`NodeLibrary.findCompatiblePortType`), so `signal → boolean` answers yes here. Whether a PERSON may draw the wire
 * is {@link canConnectPortTypes}.
 */
export function canCastPortType(typecasts: readonly Readonly<Typecast>[], from: string, to: string): boolean {
  if (!from || !to) return false;
  if (from === ANY_PORT_TYPE || to === ANY_PORT_TYPE) return true;
  if (from === to) return true;

  const cast = typecasts.find((c) => c.from === from);
  if (!cast || !Array.isArray(cast.to)) return false;

  return cast.to.indexOf(to) !== -1;
}

/**
 * May an output of type `from` be wired into an input of type `to`? The table, and one rule over it: a signal output
 * reaches only a signal input (or `*`) — the table lets a signal be READ as a boolean or a number, but a person cannot
 * wire `Done` into a Number input. What the canvas offers, the Ports tab lists, and (R22) the validator checks.
 */
export function canConnectPortTypes(typecasts: readonly Readonly<Typecast>[], from: string, to: string): boolean {
  if (from === 'signal' && to !== 'signal' && to !== ANY_PORT_TYPE) return false;
  return canCastPortType(typecasts, from, to);
}
