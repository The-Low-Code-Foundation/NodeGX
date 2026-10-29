// OWN-032 s6 — the warm look's two faces, copied into a bench's noodl_modules: Fredoka (bot-garden-fonts, the rounded
// title face of Olive's Island) and Caveat (the nightbook kit's handwriting face), both bundled for offline use. Shared
// by warm.mjs (10c's hand-made pictures) and arm.mjs (a warm run). A module's stylesheet only declares @font-face, so a
// bench that has them renders every other look exactly as before.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

export function addWarmFonts(bench) {
  const mods = path.join(bench, 'noodl_modules');
  fs.cpSync(path.join(REPO, 'library/modules/bot-garden-fonts/project/noodl_modules/bot-garden-fonts'), path.join(mods, 'bot-garden-fonts'), { recursive: true });
  const caveat = path.join(mods, 'warm-caveat');
  fs.mkdirSync(caveat, { recursive: true });
  const NB = path.join(REPO, 'library/modules/nightbook-kit/fonts');
  for (const f of fs.readdirSync(NB).filter((f) => f.startsWith('caveat') || f === 'LICENSE-caveat.txt')) fs.copyFileSync(path.join(NB, f), path.join(caveat, f));
  const css = fs.readFileSync(path.join(NB, 'styles.css'), 'utf8').split(/(?=@font-face)/).filter((b) => b.includes("'Caveat'")).join('');
  fs.writeFileSync(path.join(caveat, 'styles.css'), css);
  fs.writeFileSync(path.join(caveat, 'manifest.json'), JSON.stringify({ name: 'Caveat (from the nightbook kit)', browser: { stylesheets: ['noodl_modules/warm-caveat/styles.css'] } }, null, 2));
}

// the brand has no colour when the theme's --primary is a grey of its palette (pottery: var(--gray-900)); a wash of it
// is grey, not warm (10c), so the warm look brings the Soft preset's own pastel instead
export function brandColourless(bench) {
  try {
    const m = fs.readFileSync(path.join(bench, 'nodegx.project.json'), 'utf8').match(/"name":\s*"--primary",\s*"value":\s*"([^"]+)"/);
    return /--(gray|grey|slate|zinc|neutral|stone|black|white)\b/.test(m?.[1] || '');
  } catch { return false; }
}
