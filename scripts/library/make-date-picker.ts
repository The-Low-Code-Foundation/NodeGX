/**
 * Write `library/prefabs/date-picker/project/project.json` from the one source the todo
 * template also builds from (`packages/noodl-mcp/tests/datePicker.ts`).
 *
 *     npm run library:date-picker          # write it
 *     npm run library:date-picker -- --check   # exit 1 if the file on disk is not what this writes
 *
 * The shelf ships legacy monolithic exports (`components[].graph.roots` with nested `children`),
 * so the flat template graph is nested here. Ids are derived from the node's name, not random, so
 * a regeneration with no source change is byte-identical and `--check` can gate drift.
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import {
  DATE_PICKER_INPUTS,
  DATE_PICKER_OUTPUTS,
  datePickerGraph,
  type FlatNode
} from '../../packages/noodl-mcp/tests/datePicker';

const OUT = path.join(__dirname, '..', '..', 'library', 'prefabs', 'date-picker', 'project', 'project.json');
const COMPONENT = '/Date Picker';

/** A stable, uuid-shaped id — the shape the editor's own exports carry. */
function uuid(seed: string): string {
  const h = crypto.createHash('sha1').update(`date-picker:${seed}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

/** Where each node sits on the canvas: visual tree down the left, logic to its right. */
const POSITION: Record<string, [number, number]> = {
  In: [-420, -60],
  Root: [0, 0],
  Mounts: [360, -60],
  Script: [360, 120],
  Out: [760, 120]
};

export function buildDatePickerPrefab(): unknown {
  const { nodes, connections } = datePickerGraph('dp');
  const ids = new Map(nodes.map((n) => [n.id, uuid(n.id)]));
  const types = new Map([...DATE_PICKER_INPUTS, ...DATE_PICKER_OUTPUTS].map((p) => [p.name, p.type]));

  const legacy = (n: FlatNode): Record<string, unknown> => {
    const out: Record<string, unknown> = { id: ids.get(n.id), type: n.type, label: n.label };
    const pos = POSITION[n.id.replace(/^dp/, '')];
    if (!n.parent) {
      out.x = pos ? pos[0] : 0;
      out.y = pos ? pos[1] : 0;
    }
    out.parameters = n.parameters ?? {};
    if (n.ports && n.type === 'JavaScriptFunction') {
      out.dynamicports = n.ports.map((port, index) => ({ ...port, index: index + 1 }));
    } else if (n.ports) {
      // Grouped the way the rest of the shelf's placement blocks are, so the property panel reads the same.
      const group = (name: string) =>
        /^Margin /.test(name) ? 'Margin' : ['Width', 'Align X', 'Align Y', 'Position'].includes(name) ? 'Layout' : 'General';
      out.ports = n.ports.map((p, index) => ({
        name: p.name,
        plug: p.plug,
        type: { name: types.get(p.name) === 'signal' ? 'signal' : '*' },
        index: index + 1,
        ...(n.type === 'Component Inputs' ? { group: group(p.name) } : {})
      }));
    }
    if (!out.dynamicports) out.dynamicports = [];
    out.children = nodes.filter((c) => c.parent === n.id).map(legacy);
    return out;
  };

  return {
    name: 'Export',
    components: [
      {
        name: COMPONENT,
        id: uuid('component'),
        graph: {
          connections: connections.map((c) => ({
            fromId: ids.get(c.fromId),
            fromProperty: c.fromProperty,
            toId: ids.get(c.toId),
            toProperty: c.toProperty
          })),
          roots: nodes.filter((n) => !n.parent).map(legacy)
        }
      }
    ],
    settings: {},
    version: '4',
    metadata: { styles: { text: {}, colors: {} } },
    variants: []
  };
}

if (require.main === module) {
  const text = JSON.stringify(buildDatePickerPrefab(), null, 2) + '\n';
  if (process.argv.includes('--check')) {
    const onDisk = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (onDisk !== text) {
      console.error(`${path.relative(process.cwd(), OUT)} is not what make-date-picker writes. Run: npm run library:date-picker`);
      process.exit(1);
    }
    console.log('date-picker prefab matches its source');
  } else {
    fs.writeFileSync(OUT, text);
    console.log(`wrote ${path.relative(process.cwd(), OUT)}`);
  }
}
