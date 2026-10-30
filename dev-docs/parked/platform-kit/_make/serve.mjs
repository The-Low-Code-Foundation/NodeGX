// The kit's own server while it is being made (not shipped): tools/serve.mjs, plus Life Sim's clips and retargeting
// for the bake, and POST /__out/<file> so the bake page can write what it made into assets/people/.
//   node _make/serve.mjs [--port 8801]
import fs from 'node:fs';
import path from 'node:path';
import { serve, KIT as ROOT, body, answer } from '../tools/serve.mjs';

const lifesim = path.join(ROOT, '../lifesim/public');
const args = process.argv.slice(2);
const out = path.join(ROOT, 'assets/people');
serve({
  name: 'platform-kit (making)',
  port: Number(args[args.indexOf('--port') + 1]) || 8801,
  mounts: [
    ['/_make/assets/', path.join(lifesim, 'assets')],
    ['/lifesim/', path.join(lifesim, 'src')]
  ],
  posts: [
    [
      /^\/__out\/([a-z0-9_.-]+(?:\/[a-z0-9_.-]+)?)$/i,
      async (m, req, res) => {
        try {
          const file = path.join(out, m[1]);
          if (!file.startsWith(out) || m[1].includes('..')) throw new Error('outside assets/people');
          const buf = await body(req, 200_000_000);
          fs.mkdirSync(path.dirname(file), { recursive: true });
          fs.writeFileSync(file, buf);
          console.log(`${(buf.length / 1048576).toFixed(2).padStart(7)} MB  assets/people/${m[1]}`);
          answer(res, 200, { ok: true, bytes: buf.length });
        } catch (e) {
          answer(res, 400, { ok: false, error: String(e.message ?? e) });
        }
      }
    ]
  ]
});
