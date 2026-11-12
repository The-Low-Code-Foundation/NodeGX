// The copy of the game on nodegx.io/threadspace/.
//   npm run site         builds it into nodegx-web's site/threadspace (the folder a push sends)
//   npm run site:check   builds it to a temporary folder and compares every file with the live one; exits 1 when the
//                        live copy is stale, and prints the commands that push it
// The site folder sits beside this checkout (~/vscode_projects/nodegx-web); NODEGX_WEB=<path> points elsewhere.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const web = process.env.NODEGX_WEB ?? path.resolve(here, '../../../../nodegx-web');
const siteDir = path.join(web, 'site/threadspace');
const LIVE = 'https://nodegx.io/threadspace/';
const build = (out) => execFileSync(process.execPath, [path.join(here, 'tools/build-static.mjs'), out], { stdio: 'inherit' });

const push = [
  `rsync -az ${siteDir}/ nexus:/srv/nodegx/site/threadspace/`,
  `ssh nexus 'chown -R caddy:caddy /srv/nodegx/site/threadspace'`
];

const mode = process.argv[2];
if (mode === 'build') {
  if (!fs.existsSync(path.join(web, 'site'))) throw new Error(`no nodegx-web site at ${web} (set NODEGX_WEB)`);
  build(siteDir);
  console.log(`\nTo put it live:\n  ${push.join('\n  ')}`);
} else if (mode === 'check') {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'threadspace-site-'));
  build(tmp);
  const files = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      e.isDirectory() ? walk(p) : files.push(path.relative(tmp, p).split(path.sep).join('/'));
    }
  })(tmp);
  const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
  const stale = [];
  for (const f of files) {
    const r = await fetch(LIVE + f, { cache: 'no-store' });
    const live = r.ok ? sha(Buffer.from(await r.arrayBuffer())) : `HTTP ${r.status}`;
    if (live !== sha(fs.readFileSync(path.join(tmp, f)))) stale.push(`${f} (${r.ok ? 'differs' : live})`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  if (!stale.length) {
    console.log(`${LIVE} matches a fresh build: ${files.length} files`);
  } else {
    console.log(`${LIVE} is stale, ${stale.length} of ${files.length} files:\n  ${stale.join('\n  ')}`);
    console.log(`\nRebuild and push:\n  npm run site\n  ${push.join('\n  ')}`);
    process.exit(1);
  }
} else {
  console.error('usage: node tools/site.mjs build | check');
  process.exit(2);
}
