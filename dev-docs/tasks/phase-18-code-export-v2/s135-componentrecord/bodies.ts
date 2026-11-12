import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
const E = '/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-export/src';
const roots = ['/Users/richardosborne/vscode_projects/NodeGX test projects', '/Users/richardosborne/vscode_projects/Noodl projects', '/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-export/tests/fixtures', '/Users/richardosborne/vscode_projects/OpenNoodl/templates'];
const projects: string[] = [];
const walk = (d: string, depth: number) => { if (depth > 3) return; let ents: fs.Dirent[] = []; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } if (ents.some((e) => e.name === 'nodegx.project.json')) { projects.push(d); return; } for (const e of ents) if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) walk(path.join(d, e.name), depth + 1); };
for (const r of roots) walk(r, 0);
const cat = require(`${E}/catalog`), parse = require(`${E}/parse/parseProject`), planM = require(`${E}/analyze/plan`), js = require(`${E}/analyze/jsfun`);
const catalog = cat.loadCatalog(); const index = new cat.CatalogIndex(catalog);
const by: Record<string, any> = {};
for (const p of projects.sort()) {
  let ir: any, pp: any; try { ir = parse.parseProject(p, catalog); pp = planM.planProject(ir, index); } catch { continue; }
  for (const c of ir.components) {
    const plan = pp.byLegacyPath.get(`/${c.path}`);
    for (const n of c.nodes) {
      if (n.type !== 'JavaScriptFunction') continue;
      const pv = n.parameters.find((x: any) => x.name === 'functionScript')?.value; const body = pv?.source ?? pv?.value;
      if (typeof body !== 'string' || !/\bNoodl\b/.test(js.strippedForScan(body))) continue;
      const disp = plan?.dispositions?.[n.id];
      if (disp?.kind !== 'deferred') continue;
      const h = crypto.createHash('sha1').update(body).digest('hex').slice(0, 8);
      const e = (by[h] ??= { h, reason: disp.reason, body, where: [] as string[] });
      e.where.push(`${path.basename(p)} :: ${c.path} :: ${n.authoredLabel ?? ''}`);
    }
  }
}
const rows = Object.values(by).sort((a: any, b: any) => b.where.length - a.where.length);
fs.writeFileSync(process.argv[2], JSON.stringify(rows, null, 1));
for (const r of rows as any[]) console.log(String(r.where.length).padStart(3), r.h, r.where[0], '|', String(r.reason).slice(0, 110));
