// Usage (from packages/nodegx-export): census.ts <exportSrc> <templatesDir> — every Component Outputs value port fed by
// more than one wire, by what feeds it; whether a feeding placement also sends one of that node's signal ports (a pulse
// from the same run); the report's refusals of it, and the parent wires dropped because the port does not lift.
import * as fs from 'fs';
import * as path from 'path';
const [E, T] = process.argv.slice(2);
const { loadCatalog } = require(`${E}/catalog`);
const { emitApp } = require(`${E}/emit/emitApp`);
const { parseProject } = require(`${E}/parse/parseProject`);
const catalog = loadCatalog();
const totals = { ports: 0, feeds: 0, allInstances: 0, refusedLines: 0, parentDrops: 0, single: 0, singleWithPulse: 0 };
const rows: string[] = [];
for (const t of fs.readdirSync(T).sort()) {
  if (!fs.existsSync(path.join(T, t, 'nodegx.project.json'))) continue;
  const ir = parseProject(path.join(T, t), catalog);
  const comps = new Map<string, any>(ir.components.map((c: any) => [`/${c.path}`, c]));
  for (const c of ir.components) {
    const byId = new Map<string, any>(c.nodes.map((n: any) => [n.id, n]));
    for (const out of c.nodes.filter((n: any) => n.type === 'Component Outputs')) {
      const signalPorts = new Set(out.declaredPorts.filter((p: any) => p.kind === 'signal').map((p: any) => p.name));
      const byPort = new Map<string, any[]>();
      for (const w of c.connections) if (w.toId === out.id && !signalPorts.has(w.toProperty)) byPort.set(w.toProperty, [...(byPort.get(w.toProperty) ?? []), w]);
      for (const [port, wires] of byPort) {
        const kinds = wires.map((w: any) => {
          const n = byId.get(w.fromId);
          return comps.has(n?.type) ? `instance ${n.type}.${w.fromProperty}` : `${n?.type}.${w.fromProperty}`;
        });
        // A pulse from the same placement into this Component Outputs (the Header's `done` → `write`).
        const pulsed = wires.filter((w: any) => c.connections.some((s: any) => s.fromId === w.fromId && s.toId === out.id && signalPorts.has(s.toProperty)));
        if (wires.length === 1) {
          if (comps.has(byId.get(wires[0].fromId)?.type)) { totals.single++; if (pulsed.length) { totals.singleWithPulse++; rows.push(`  single+pulse ${t} /${c.path} "${port}" ← ${kinds[0]}`); } }
          continue;
        }
        totals.ports++; totals.feeds += wires.length;
        const all = kinds.every((k: string) => k.startsWith('instance '));
        if (all) totals.allInstances++;
        rows.push(`${t} /${c.path} "${port}" ×${wires.length} ${all ? 'ALL-INSTANCES' : ''} pulsed-by ${pulsed.length}: ${kinds.join(' | ')}`);
      }
    }
  }
  const report: string = emitApp(ir, catalog).files['EXPORT-REPORT.md'];
  totals.refusedLines += (report.match(/- two wires feed value output/g) ?? []).length;
  // A parent wire dropped because a placed component's output does not lift for this reason is "not lifted by …".
  totals.parentDrops += (report.match(/^- wire .* dropped: instance output .* is not lifted by /gm) ?? []).length;
}
console.log(rows.join('\n'));
console.log(JSON.stringify(totals));
