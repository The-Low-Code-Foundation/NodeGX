// Writes the grown-ups' checker (tools/check.src.js) into the app twice: as the script file the browser uses
// (app/scripts/settings/check.js) and as the body pasted into the cloud function (tools/check.cloud.js), with the
// ids the game knows filled in from gala-rules/src/data.js.  Run: node tools/sync-check.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const D = await import(pathToFileURL(join(root, 'gala-rules/src/data.js')));
const EXTRA_ICONS = ['💃', '🕺', '🩰', '🎀', '👑', '🌸', '🌼', '🌙', '⭐', '🌟', '✨', '💫', '🦋', '🐝', '🐞', '🦄', '🐬', '🐧', '🦊', '🐼', '🐸', '🌈', '☀️', '❄️', '🔥', '🍀', '🎈', '🎉', '🎵', '🎶', '🥁', '🎻', '🎺', '🪄', '🧚', '🧜', '🦢', '🕊️', '🌊', '🌀', '🔄', '⬆️', '⬇️', '➡️', '⬅️', '👏', '🙌', '🤸', '🧘', '🦵', '👣', '💎', '🪩', '🧢', '👗', '👘', '🥻', '🩱', '👒', '🎩'];
const icons = new Set(EXTRA_ICONS);
for (const t of [D.MOVES, D.OUTFITS, D.PIECES, D.SNACKS, D.UPGRADES]) for (const r of Object.values(t)) if (r.icon) icons.add(r.icon);
const KNOWN = {
  moves: Object.keys(D.MOVES), outfits: Object.keys(D.OUTFITS), hairs: Object.keys(D.HAIRS), shoes: Object.keys(D.SHOES), accs: Object.keys(D.ACCS),
  pieces: Object.keys(D.PIECES), snacks: Object.keys(D.SNACKS), upgrades: Object.keys(D.UPGRADES), numbers: Object.keys(D.NUMBERS),
  icons: [...icons], styles: Object.keys(D.STYLES), themes: [...new Set(Object.values(D.NUMBERS).map((n) => n.theme))],
};
const src = readFileSync(join(root, 'tools/check.src.js'), 'utf8').replace('__KNOWN__', JSON.stringify(KNOWN));
const head = '// GENERATED from tools/check.src.js by tools/sync-check.mjs — edit that file and run it again.\n';
mkdirSync(join(root, 'app/scripts/settings'), { recursive: true });
writeFileSync(join(root, 'app/scripts/settings/check.js'), head + src + '\nObject.assign(exports, { TABLES, KNOWN, cleanName, rude, checkChange, toRows });\n');
writeFileSync(join(root, 'tools/check.cloud.js'), head + src);
console.log(`checker written: ${KNOWN.icons.length} icons, ${KNOWN.themes.length} themes`);
