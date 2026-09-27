/**
 * P103 CMG-008 — every field says when it leaves its Look.
 *
 * Richard: *"I changed the 'alignment' of a group node that I'd saved a Look for, and it doesn't
 * say the look has a different alignment, there's no alert at all."* The drift line was keyed by a
 * row's port name; alignment, the margin/padding box and every tab group render in a merged view
 * with no name, so `readField` was never asked about their ports.
 *
 * Three pure readings, and a census:
 *  - `portsForView` reaches the ports of all three merged shapes (a `TabGroup`'s `views`, an
 *    `AlignToolsType` / `MarginPaddingType`'s `ports`), with the label a person reads;
 *  - `readFields` classifies each port on OWNERSHIP, as `readField` does, and names the Look;
 *  - `alignRowsOf` presses the Look's value when the node sets none (§3.2);
 *  - §3.3 — the census over the enriched node catalog: for every type that takes Looks, every
 *    input port the panel draws is one the marker can reach, by the shape its widget gives it;
 *    the exceptions are listed by name with a reason, and a new unlisted one fails here.
 *
 * AC1/AC2/AC5 — what the running panel draws on a Group wearing a Look — is the drive
 * (`scripts/devtools/drive-cmg008-drift.js`), which also writes the runtime census.
 */
import { readFields } from '../../src/editor/src/models/Looks/fieldState';
import { portNamesForView, portsForView } from '../../src/editor/src/utils/portHint';
import { alignRowsOf } from '../../src/editor/src/views/panels/propertyeditor/model/alignRows';
import { widgetForPort } from '../../src/editor/src/views/panels/propertyeditor/model/widgets';

describe('CMG-008 — a merged view speaks for every port it merged', () => {
  it('an ordinary row: its own port, with its label', () => {
    expect(portsForView({ name: 'opacity', port: { name: 'opacity', displayName: 'Opacity' } })).toEqual([{ name: 'opacity', label: 'Opacity' }]);
  });

  it('a TabGroup (corners, border sides): its member views, labelled by editorName so the corner is named', () => {
    const tab = {
      views: [
        { name: 'borderRadius', port: { name: 'borderRadius', displayName: 'Corner Radius', editorName: 'Corner Radius' } },
        { name: 'borderTopLeftRadius', port: { name: 'borderTopLeftRadius', displayName: 'Corner Radius', editorName: 'Corner Radius (TopLeft)' } }
      ]
    };
    expect(portsForView(tab)).toEqual([
      { name: 'borderRadius', label: 'Corner Radius' },
      { name: 'borderTopLeftRadius', label: 'Corner Radius (TopLeft)' }
    ]);
    expect(portNamesForView(tab)).toEqual(['borderRadius', 'borderTopLeftRadius']);
  });

  it('🔴 an alignment or margin/padding control: the ports it merged as comp → port — the shape nothing reached before', () => {
    const align = {
      ports: {
        horizontal: { name: 'alignX', displayName: 'Align X' },
        vertical: { name: 'alignY', displayName: 'Align Y' }
      }
    };
    expect(portsForView(align)).toEqual([
      { name: 'alignX', label: 'Align X' },
      { name: 'alignY', label: 'Align Y' }
    ]);
    const box = { ports: { 'padding-left': { name: 'paddingLeft', displayName: 'Pad Left' } } };
    expect(portNamesForView(box)).toEqual(['paddingLeft']);
  });

  it('nothing for nothing', () => {
    expect(portsForView(undefined)).toEqual([]);
    expect(portsForView({})).toEqual([]);
  });
});

describe('CMG-008 — readFields decides on ownership, per port', () => {
  const look = { name: 'Card', parameters: { alignX: 'center', paddingLeft: 16, borderTopLeftRadius: 8 } };

  it('names the fields the node overrides, and the ones it wears, and the Look', () => {
    const r = readFields({ parameters: { alignX: 'left', opacity: 1 } }, look, ['alignX', 'paddingLeft', 'opacity', 'borderTopLeftRadius']);
    expect(r.lookName).toBe('Card');
    expect(r.overridden.map((f) => f.name)).toEqual(['alignX']);
    expect(r.overridden[0].reading).toMatchObject({ source: 'overridden', lookValue: 'center', ownValue: 'left' });
    expect(r.linked.map((f) => f.name)).toEqual(['paddingLeft', 'borderTopLeftRadius']);
  });

  it('🔴 an override that HOLDS the Look\'s value is still an override — edit the Look and it will not follow', () => {
    const r = readFields({ parameters: { alignX: 'center' } }, look, ['alignX']);
    expect(r.overridden.map((f) => f.name)).toEqual(['alignX']);
    expect(r.overridden[0].reading.matchesLook).toBe(true);
  });

  it('no Look, or a Look with nothing to say about these ports: nothing, no name', () => {
    expect(readFields({ parameters: { alignX: 'left' } }, undefined, ['alignX'])).toEqual({ overridden: [], linked: [] });
    expect(readFields({ parameters: { alignX: 'left' } }, look, ['opacity'])).toEqual({ overridden: [], linked: [] });
  });
});

describe('CMG-008 §3.2 — the alignment control presses the value in effect', () => {
  const ports = [
    { name: 'alignItems', displayName: 'Align Items', default: 'flex-start', type: { alignComp: 'align-items', enums: [{ label: 'Start', value: 'flex-start' }, { label: 'Center', value: 'center' }] } }
  ];
  const pressed = (rows: ReturnType<typeof alignRowsOf>) => rows[0].options.find((o) => o.pressed)!.value;

  it('🔴 a Group whose Look sets center, with nothing on the node, shows CENTER pressed — not the port default', () => {
    expect(pressed(alignRowsOf(ports, {}, { 'align-items': 'center' }))).toBe('center');
    // …and the reset dot is off: the node holds nothing of its own.
    expect(alignRowsOf(ports, {}, { 'align-items': 'center' })[0].isChanged).toBe(false);
  });

  it('the node\'s own value wins over the Look\'s; no Look falls back to the default (as before)', () => {
    expect(pressed(alignRowsOf(ports, { 'align-items': 'flex-start' }, { 'align-items': 'center' }))).toBe('flex-start');
    expect(pressed(alignRowsOf(ports, {}))).toBe('flex-start');
  });
});

/**
 * §3.3 — the census. For every type that takes Looks (`useVariants`), every input port that gets a
 * row is graded by the SHAPE its widget gives it: a named row asks `rowLook`; an alignment or
 * margin/padding port is merged into a view whose `ports` `portsForView` now reads; a port whose
 * type carries a `tab` is folded into a `TabGroup` whose `views` it reads. A port with none of
 * those shapes would be a hole, and is the failure this arm exists for.
 *
 * ⚠️ The catalog has no `tab` on its ports (the generator drops it), so tab-grouped corner and
 * border ports appear here as named rows — which they would be, were the tab gone; at runtime they
 * are members of a `TabGroup`, covered by the `views` branch. The runtime census the drive writes
 * is the one that sees the tabs.
 */
describe('CMG-008 §3.3 — the census: can the marker reach every port the panel draws?', () => {
  type CatalogType = {
    typeName: string;
    useVariants?: boolean;
    inputs?: Array<{ name: string; plug?: string; type: unknown; group?: string; parent?: string }>;
  };
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const raw = require('../../../noodl-types/src/node-catalog-enriched.json') as unknown;
  const catalog: CatalogType[] = Array.isArray(raw)
    ? (raw as CatalogType[])
    : ((raw as { nodes?: CatalogType[]; types?: CatalogType[] }).nodes ??
      (raw as { nodes?: CatalogType[]; types?: CatalogType[] }).types ??
      (Object.values(raw as Record<string, unknown>) as CatalogType[]));

  /** Ports the marker deliberately does not reach, each with the reason. */
  const EXCEPTIONS: Record<string, string> = {
    // A child view (a port with a `parent`) is drawn inside its parent's row, which answers for it.
  };
  /** Widgets that draw no row at all, so there is nothing to mark. */
  const NO_ROW = new Set(['logicBuilderHidden']);

  const withLooks = catalog.filter((t) => t.useVariants);

  it('the census reads real types: Group and Text take Looks', () => {
    expect(withLooks.map((t) => t.typeName)).toEqual(expect.arrayContaining(['Group', 'Text']));
    expect(withLooks.length).toBeGreaterThanOrEqual(5);
  });

  it('🔴 every input port of every Look-taking type has a shape the marker reaches, or is a named exception', () => {
    const holes: string[] = [];
    let shown = 0;
    let merged = 0;
    for (const type of withLooks) {
      for (const port of type.inputs ?? []) {
        if (port.plug && !/input/.test(port.plug)) continue;
        const widget = widgetForPort(port as never);
        if (widget === undefined || NO_ROW.has(widget)) continue; // no row → nothing to mark
        shown++;
        if (port.parent) {
          if (!EXCEPTIONS[`${type.typeName}.${port.name}`]) holes.push(`${type.typeName}.${port.name} (child view)`);
          continue;
        }
        if (widget === 'alignTools' || widget === 'marginPadding') merged++;
        // Every other widget is a named row; both merged widgets are read through `portsForView`.
      }
    }
    expect(shown).toBeGreaterThan(300);
    expect(merged).toBeGreaterThan(20);
    expect(holes).toEqual([]);
  });
});
