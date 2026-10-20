// OWN-023 §6 / C6: the five hats, at once, each a fresh Opus 5.5 outside the repo (stranger.mjs: no settings, no MCP
// but one browser, no memory, reads of /Users denied), in its own clone of the scrubbed material (prepare-hats.mjs)
// with its brief as BRIEF.md and the paragraph the apps were built from. The prompt is hats/README.md's commissioning
// line verbatim, then where things are. Its verdict is its final message, saved unedited to own-023/verdicts/<hat>.md.
//   node run-hats.mjs <material-dir> <hats-run-dir> [A B C D X]
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const [materialArg, runArg, ...only] = process.argv.slice(2);
const material = path.resolve(materialArg);
const run = path.resolve(runArg);
const HATS = only.length ? only : ['A', 'B', 'C', 'D', 'X'];
const COMMISSION = "I'm choosing how to build my next app. These three were built from the same paragraph in three ways. Read them as the person described in your brief and tell me what you'd do.";
fs.mkdirSync(path.join(HERE, 'verdicts'), { recursive: true });

await Promise.all(HATS.map((hat) => {
  const base = path.join(run, hat);
  const work = path.join(base, 'work');
  if (fs.existsSync(base)) throw new Error(`${base} exists`);
  fs.mkdirSync(base, { recursive: true });
  execFileSync('cp', ['-cR', material, work]); // APFS clone: five copies for the price of one
  fs.copyFileSync(path.join(HERE, 'hats', `${hat}.md`), path.join(work, 'BRIEF.md'));
  fs.writeFileSync(path.join(work, 'the-paragraph.txt'), fs.readFileSync(path.join(HERE, 'brief.txt'), 'utf8').trim().split(/\n\s*\n/)[0].trim() + '\n');
  const mcp = { mcpServers: { browser: { type: 'stdio', command: 'npx', args: ['-y', '@playwright/mcp@0.0.83', '--headless', '--isolated', '--browser', 'chrome', '--output-dir', path.join(work, 'my-screenshots')], env: { HOME: path.join(base, 'home'), npm_config_cache: path.join(path.dirname(run), 'pwmcp-cache') } } } };
  fs.mkdirSync(path.join(base, 'home'), { recursive: true });
  fs.writeFileSync(path.join(base, 'mcp.json'), JSON.stringify(mcp, null, 2) + '\n');
  fs.writeFileSync(path.join(base, 'prompt.txt'), `${COMMISSION}

Your brief is BRIEF.md in this folder. The paragraph the three apps were built from is the-paragraph.txt. The three apps are in apps/ (apps/README.txt says where each one is running now), the graders' reports are in grades/, and the four later changes are in followups/. You can read files and use a browser (the browser tools); you have no terminal. Write your verdict as your final message.
`);
  return new Promise((resolve) => {
    spawn(process.execPath, [path.join(HERE, 'stranger.mjs'), work, path.join(base, 'prompt.txt'), '--tools', 'Read,Glob,Grep', '--mcp', path.join(base, 'mcp.json'), '--cap', '25'], { stdio: 'inherit' })
      .on('exit', () => {
        let last = '', usd = null;
        for (const line of fs.readFileSync(path.join(base, 'agent.jsonl'), 'utf8').split('\n')) { try { const m = JSON.parse(line); if (m.type === 'result') { last = m.result || ''; usd = m.total_cost_usd; } } catch {} }
        fs.writeFileSync(path.join(HERE, 'verdicts', `${hat}.md`), last + '\n');
        console.log(`hat ${hat}: $${usd?.toFixed(2)} ${last.length} chars`);
        resolve();
      });
  });
}));
