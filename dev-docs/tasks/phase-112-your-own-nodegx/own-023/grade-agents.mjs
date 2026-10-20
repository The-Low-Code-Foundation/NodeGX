// OWN-023 §5 / C5: one blind grader per app, the three apps at once (different apps, so they can't see each other's
// data), each a fresh Opus 5.5 outside the repo (stranger.mjs) with NO built-in tool — no files, no shell, no web —
// and two headless browsers as its only tools (@playwright/mcp, person A and person B: two isolated profiles,
// 390×844). It is given grader.md, checklist-graded.md, the URL, and two sample files to upload in its own folder.
// Its report is its final message (saved as report.md); its screenshots land in shots/<person>/.
//   node grade-agents.mjs <graders-dir> <round 1|2>     (run `serve-apps.mjs serve --fresh` before each round)
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const [dirArg, round] = process.argv.slice(2);
if (!dirArg || !round) throw new Error('usage: node grade-agents.mjs <graders-dir> <round>');
const URLS = { K: 'http://localhost:5101/', M: 'http://localhost:5102/', R: 'http://localhost:5103/' };
const brief = fs.readFileSync(path.join(HERE, 'hats', 'grader.md'), 'utf8').trim();
const checklist = fs.readFileSync(path.join(HERE, 'checklist-graded.md'), 'utf8').trim();

const runs = Object.entries(URLS).map(([L, url]) => {
  const base = path.join(path.resolve(dirArg), `${L}-${round}`);
  if (fs.existsSync(base)) throw new Error(`${base} exists`);
  const work = path.join(base, 'work');
  const samples = path.join(work, 'samples');
  fs.mkdirSync(samples, { recursive: true });
  // The same two files for every grader: a 20 s tone as an MP3 and a square cover picture.
  execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=20', '-ac', '2', '-b:a', '128k', path.join(samples, 'my-song.mp3')]);
  execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'color=c=0x7744aa:s=600x600:d=1', '-frames:v', '1', path.join(samples, 'cover.png')]);
  const mcp = { mcpServers: Object.fromEntries(['personA', 'personB'].map((p) => [p, {
    type: 'stdio', command: 'npx',
    args: ['-y', '@playwright/mcp@0.0.83', '--headless', '--isolated', '--browser', 'chrome', '--viewport-size', '390x844', '--output-dir', path.join(work, 'shots', p)],
    env: { HOME: path.join(base, 'home'), npm_config_cache: path.join(path.dirname(path.resolve(dirArg)), 'pwmcp-cache') }
  }])) };
  fs.mkdirSync(path.join(base, 'home'), { recursive: true });
  fs.writeFileSync(path.join(base, 'mcp.json'), JSON.stringify(mcp, null, 2) + '\n');
  const prompt = `${brief}

The URL: ${url}

Your browser tools: person A is one browser profile (the personA tools); person B is a second, separate browser profile (the personB tools), for the lines that need two people or a second device. Both are 390 px wide.
Two files you can upload from the phone: ${path.join(samples, 'my-song.mp3')} (a song) and ${path.join(samples, 'cover.png')} (a picture).
Write your report as your final message: one row per checklist line (G1–G19, then O1–O22), each with pass, fail or not reached, one sentence of what you saw, and a screenshot name.

${checklist}
`;
  fs.writeFileSync(path.join(base, 'prompt.txt'), prompt);
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [path.join(HERE, 'stranger.mjs'), work, path.join(base, 'prompt.txt'), '--tools', '', '--mcp', path.join(base, 'mcp.json'), '--cap', '25'], { stdio: 'inherit' });
    p.on('exit', () => {
      let last = '';
      for (const line of fs.readFileSync(path.join(base, 'agent.jsonl'), 'utf8').split('\n')) { try { const m = JSON.parse(line); if (m.type === 'result') last = m.result || ''; } catch {} }
      fs.writeFileSync(path.join(base, 'report.md'), last + '\n');
      console.log(`${L}-${round} done`);
      resolve();
    });
  });
});
await Promise.all(runs);
