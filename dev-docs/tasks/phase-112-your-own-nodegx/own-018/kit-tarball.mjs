// OWN-019 s6: a kit folder's tarballs, found by package name. A kit folder (tgzNN) holds one packed tarball per package
// — `create-nodegx-<v>.tgz`, `nodegx-mcp-<v>.tgz`, `nodegx-preview-<v>.tgz` — and the lab must not care which version:
// 0.2.0 → 0.2.1 (c2eab03bf) broke 25 hardcoded names in 10 scripts. None, or two of one package, is a refusal.
import fs from 'node:fs';
import path from 'node:path';

export function kitTarball(dir, pkg) {
  const re = new RegExp(`^${pkg}-(\\d+\\.\\d+\\.\\d+(?:-[\\w.]+)?)\\.tgz$`);
  const found = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => re.test(f)) : [];
  if (found.length !== 1) throw new Error(`${dir}: ${found.length ? `${found.length} ${pkg} tarballs (${found.join(', ')})` : `no ${pkg}-<version>.tgz`}`);
  return path.join(dir, found[0]);
}

export const kitVersion = (dir, pkg = 'nodegx-mcp') => path.basename(kitTarball(dir, pkg)).slice(pkg.length + 1, -'.tgz'.length);
export const hasTarball = (dir, pkg) => { try { return !!kitTarball(dir, pkg); } catch { return false; } };
