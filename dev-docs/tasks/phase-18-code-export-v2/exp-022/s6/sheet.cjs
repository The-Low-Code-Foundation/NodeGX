// EXP-022 S6 (S4's harness, copied): the evidence image Richard reads — sign in, signed in and after the close, the running app | the React
// export | the Swift app, each at 390 points wide (shots/<arm>-<step>.png → side-by-side.png). Uses the repo's sharp.
const path = require('path');
const sharp = require('/Users/richardosborne/vscode_projects/OpenNoodl/node_modules/sharp');

const X = __dirname;
const ARMS = [['runtime', 'the running app (Chrome)'], ['react', 'the React export (Chrome)'], ['swift', 'the Swift app (iPhone 17 simulator)']];
const ROWS = [['D3', 'after adding "Pick up the dry cleaning"'], ['D4dialog', 'the release notes\' ✓ pressed: the note dialog'], ['D4', 'after a note and "Close task"']];
const W = 390, H = 844, PAD = 16, HEAD = 40;

async function main() {
  const width = PAD + ARMS.length * (W + PAD);
  const height = HEAD + ROWS.length * (H + HEAD) + PAD;
  const layers = [];
  const text = [];
  ARMS.forEach(([, label], c) => text.push(`<text x="${PAD + c * (W + PAD)}" y="26" font-size="18" font-family="Helvetica" font-weight="bold">${label}</text>`));
  for (const [r, [step, caption]] of ROWS.entries()) {
    const y = HEAD + r * (H + HEAD);
    text.push(`<text x="${PAD}" y="${y + 24}" font-size="16" font-family="Helvetica" fill="#555">${step}: ${caption}</text>`);
    for (const [c, [arm]] of ARMS.entries()) {
      const img = sharp(path.join(X, 'shots', `${arm}-${step}.png`)).resize({ width: W });
      const buf = await img.png().toBuffer();
      const meta = await sharp(buf).metadata();
      const cropped = await sharp(buf).extract({ left: 0, top: 0, width: W, height: Math.min(H, meta.height) }).png().toBuffer();
      layers.push({ input: cropped, left: PAD + c * (W + PAD), top: y + HEAD - 4 });
    }
  }
  layers.push({ input: Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${text.join('')}</svg>`), left: 0, top: 0 });
  await sharp({ create: { width, height, channels: 3, background: '#ffffff' } }).composite(layers).png({ compressionLevel: 9 }).toFile(path.join(X, 'side-by-side.png'));
  console.log('side-by-side.png', width, height);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
