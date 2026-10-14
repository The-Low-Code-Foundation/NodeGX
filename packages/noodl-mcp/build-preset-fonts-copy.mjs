#!/usr/bin/env node
/**
 * P112-OWN019-PRESETFONTS — the typefaces a style preset names, shipped with `@nodegx/mcp`.
 *
 *   node build-preset-fonts-copy.mjs            copy the editor's preset fonts into dist/preset-fonts (npm's prepack)
 *   node build-preset-fonts-copy.mjs --remove   delete them again (npm's postpack)
 *
 * `set_style_preset` copies a preset's font files into the project from `resolvePresetFontRoot` (src/presetFontFiles.ts):
 * `preset-fonts/` beside the server first, then a checkout's `packages/noodl-editor/src/assets/preset-fonts`. An npm
 * install has neither, so from npm every preset that names a typeface set `--font-sans` to a face that never loaded
 * and answered `fonts.failed` — the app painted in the system font (Sonnet's Launch yardstick, OWN-019 s4). The three
 * faces are 276 KB, OFL, and already shipped by the editor app the same way (`extraResources` → `noodl-mcp/preset-fonts`).
 */
import { cpSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'dist', 'preset-fonts');
const SOURCE = path.resolve(HERE, '..', 'noodl-editor', 'src', 'assets', 'preset-fonts');

rmSync(OUT, { recursive: true, force: true });
if (process.argv.includes('--remove')) process.exit(0);
cpSync(SOURCE, OUT, { recursive: true });
console.log(`build-preset-fonts-copy: dist/preset-fonts from ${path.relative(HERE, SOURCE)}`);
