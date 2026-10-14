#!/usr/bin/env node
/**
 * P112-OWN018-NOSTARTERASSETS — the starter set a new project gets, shipped with `@nodegx/mcp`.
 *
 *   node build-starter-assets-copy.mjs [outDir]   copy it into dist/starter-assets (npm's prepack)
 *   node build-starter-assets-copy.mjs --remove   delete it again (npm's postpack)
 *
 * `create_project` copies `STARTER_ASSETS` (the editor's list) into the project from `resolveStarterAssetRoot`
 * (src/starterAssetFiles.ts), which reads this folder by each asset's project-relative path. So the layout here is
 * the project's: `noodl_modules/inter/…`, `noodl_modules/lucide-icons/…`, `noodl_modules/starter-imagery/…`. The
 * editor keeps Inter's licence outside `starter-project/`, so it is copied to where the project gets it.
 * tests/own018StarterAssets.test.ts checks every listed asset is here.
 */
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EDITOR_ASSETS = path.resolve(HERE, '..', 'noodl-editor', 'src', 'assets');
const arg = process.argv[2];
const OUT = arg && arg !== '--remove' ? path.resolve(arg) : path.join(HERE, 'dist', 'starter-assets');

rmSync(OUT, { recursive: true, force: true });
if (process.argv.includes('--remove')) process.exit(0);
cpSync(path.join(EDITOR_ASSETS, 'starter-project', 'noodl_modules'), path.join(OUT, 'noodl_modules'), { recursive: true });
mkdirSync(path.join(OUT, 'noodl_modules', 'inter'), { recursive: true });
cpSync(path.join(EDITOR_ASSETS, 'Inter', 'LICENSE.txt'), path.join(OUT, 'noodl_modules', 'inter', 'LICENSE.txt'));
console.log(`build-starter-assets-copy: ${path.relative(HERE, OUT)} from ${path.relative(HERE, EDITOR_ASSETS)}`);
