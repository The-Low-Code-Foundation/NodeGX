// Prints what the game is made of: every knob group with its values, every model and its parts, every place, every
// shelf. The same page as `__play.what()` in the game's console. Read this before reading the code.
//   node tools/what.mjs [--root <the game's folder>]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer, openPage } from './chrome.mjs';

const args = process.argv.slice(2);
const root = args.includes('--root') ? path.resolve(args[args.indexOf('--root') + 1]) : path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = await startServer(root);
const page = await openPage(server.url);
let code = 0;
if (await page.waitFor('window.__play && __play.ready', 90000)) console.log(await page.evaluate('__play.what()'));
else {
  console.log('The game never said it was ready: it must call expose({ scene, camera, renderer }) once its first place is built.');
  code = 1;
}
for (const e of page.errors) console.log(`page error: ${e}`), (code = 1);
page.close();
server.stop();
process.exit(code);
