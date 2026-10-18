#!/usr/bin/env node
/**
 * OWN-022 — Le Chonk plays. Mistral Large 4 plays a NodeGX game in a real browser, from screenshots alone.
 *
 * The loop: screenshot → Large 4 (the picture, the goal, what it did so far) → one or more actions (click, type, key,
 * scroll, wait) → Chrome does them through CDP → the next screenshot. The model is never shown the DOM or the page's
 * text: what it knows about the game, it read off the picture.
 *
 * 🔴 The referee is the harness, not the model. A game names the page text that means it was won or lost
 * (`GAMES[…].won` / `.lost`); the harness reads `document.body.innerText` after every step, and the model's own
 * "I won" (the `finish` tool) ends the run but never decides the verdict.
 *
 * Usage:
 *   node own-022/play.mjs [--game monster] [--origin https://nodegx.io] [--path /templates/rocket-school/]
 *        [--viewport 1024x768] [--max-steps 150] [--effort none|high] [--out <dir>] [--visible]
 * Writes <out>/steps.jsonl (every call: latency, tokens, what it said and did), <out>/shots/NNN.jpg and
 * <out>/result.json. Exits 0 on a win, 1 on a loss or a stop, 2 on a usage error.
 * The key is MISTRAL_API_KEY from the environment, else the repo's .env.
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../../..');
const { withDeployedSite } = require(path.join(REPO, 'scripts/devtools/drive-deployed.js'));

const argv = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = argv.indexOf(name);
  return i === -1 ? dflt : argv[i + 1];
};
const flag = (name) => argv.includes(name);

/** What a game is to the harness: where it lives, what the model is told, and the text that ends it. */
const GAMES = {
  monster: {
    origin: 'https://nodegx.io',
    path: '/templates/rocket-school/',
    goal:
      'This is Rocket School, a maths game for children. Your goal: WIN a game of Monster Gate. ' +
      'If it asks who is playing, make a new player (any name, any age or class) and continue. ' +
      'From the home screen, open the Monster Gate game (👾), keep the way to play "Beat it to the gate" and the pace "Practice", and start. ' +
      'Each question: work out the answer and give it (tap the right option, or type the number on the keypad and press its Check/✓ button), then press Next. ' +
      'Right answers hit the monster; send three monsters home to win. Wrong answers let it creep closer.',
    won: /The gate held!|All three sent home!|La porte a tenu/,
    lost: /The monster got in!|Le monstre est entré/
  }
};

const GAME = GAMES[opt('--game', 'monster')];
if (!GAME) {
  console.error(`unknown --game; known: ${Object.keys(GAMES).join(', ')}`);
  process.exit(2);
}
const ORIGIN = opt('--origin', GAME.origin);
const START = opt('--path', GAME.path);
const [VW, VH] = opt('--viewport', '1024x768').split('x').map(Number);
const MAX_STEPS = Number(opt('--max-steps', 150));
const EFFORT = opt('--effort', null);
const MODEL = opt('--model', 'mistral-large-4'); // 🔴 pinned: `mistral-large-latest` answers as a different model (OWN-018 §3)
const OUT = path.resolve(opt('--out', path.join(process.env.TMPDIR || '/tmp', `own022-${Date.now()}`)));
const KEEP_SHOTS = Number(opt('--keep-shots', 2)); // how many recent screenshots stay in the conversation
// Launch-sale prices per million tokens, until ~2026-10-20; list is $1.36 / $0.14 / $4.18 (VIBE-AND-LARGE4.md).
const PRICE = { input: Number(opt('--price-in', 0.68)), cached: Number(opt('--price-cached', 0.07)), output: Number(opt('--price-out', 2.09)) };

const KEY =
  process.env.MISTRAL_API_KEY ||
  (fs.readFileSync(path.join(REPO, '.env'), 'utf8').split('\n').find((l) => l.startsWith('MISTRAL_API_KEY=')) || '')
    .slice('MISTRAL_API_KEY='.length)
    .trim()
    .replace(/^["']|["']$/g, '');
if (!KEY) {
  console.error('no MISTRAL_API_KEY in the environment or the repo .env');
  process.exit(2);
}

fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });
const LOG = fs.createWriteStream(path.join(OUT, 'steps.jsonl'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ── What the model may do ────────────────────────────────────────────────────

const fn = (name, description, properties = {}, required = []) => ({
  type: 'function',
  function: { name, description, parameters: { type: 'object', properties, required } }
});
const TOOLS = [
  // 🔴 0–1000 on both axes, not pixels: asked for the centre of a button on a 1024×768 shot, Large 4 answered (500, 315)
  // three times out of three in 0–1000 (= 512, 242: on the button) and y=310–340 in pixels (below it). Measured 2026-10-18.
  fn('click', 'Tap/click at a point on the screenshot. x and y are NORMALISED 0–1000 on both axes: (0,0) top-left, (1000,1000) bottom-right.', {
    x: { type: 'number' }, y: { type: 'number' }, what: { type: 'string', description: 'what you are pressing' }
  }, ['x', 'y']),
  fn('type', 'Type text into whatever has the keyboard focus (click a text box first).', { text: { type: 'string' } }, ['text']),
  fn('key', 'Press one key: Enter, Backspace, Tab, Escape, or a single character.', { key: { type: 'string' } }, ['key']),
  fn('scroll', 'Scroll the page. Positive dy scrolls down.', { dy: { type: 'number' } }, ['dy']),
  fn('wait', 'Wait, then look again (for an animation or a page loading).', { seconds: { type: 'number' } }, ['seconds']),
  fn('finish', 'Stop playing: the game is over (won or lost) or you cannot go on.', { reason: { type: 'string' } }, ['reason'])
];

const SYSTEM =
  'You are playing a game in a web browser. You see the screen only as a screenshot; ' +
  'you act only through the tools. Click positions are normalised 0–1000 on both axes ((0,0) top-left, (1000,1000) bottom-right). Click the CENTRE of a button. ' +
  'After your actions you get a new screenshot. Look at it carefully before acting again: check that your last action did what you meant. ' +
  'Before each set of actions, say in one short sentence what you see and what you are doing. ' +
  'You may send several actions at once when you are sure of the screen (for example tap three keypad digits then Check), ' +
  'but stop and look again whenever the screen will change.\n\nGOAL: ' + GAME.goal;

// ── Talking to Mistral ───────────────────────────────────────────────────────

async function chat(messages) {
  const body = { model: MODEL, messages, tools: TOOLS, tool_choice: 'any', parallel_tool_calls: true, temperature: 0.3 };
  if (EFFORT) body.reasoning_effort = EFFORT;
  const first = Date.now();
  for (let attempt = 1; ; attempt++) {
    const t0 = Date.now();
    let r, j;
    try {
      // 🔴 without a timeout one request hung 300 s (Node's fetch default) in smoke3; the model's answers take 1–6 s
      r = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(90_000)
      });
      j = await r.json().catch(() => ({}));
    } catch (e) {
      if (attempt >= 4) throw e;
      await wait(2000 * attempt);
      continue;
    }
    if (r.ok) return { ...j, ms: Date.now() - t0, totalMs: Date.now() - first, attempts: attempt };
    if ((r.status === 429 || r.status >= 500) && attempt < 4) {
      await wait(3000 * attempt);
      continue;
    }
    throw new Error(`Mistral ${r.status}: ${JSON.stringify(j).slice(0, 600)}`);
  }
}

/** Old screenshots go; their place says so, so the turn order Mistral checks stays intact. */
function pruneImages(messages) {
  let seen = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== 'user' || !Array.isArray(m.content)) continue;
    if (!m.content.some((c) => c.type === 'image_url')) continue;
    seen += 1;
    if (seen > KEEP_SHOTS) m.content = m.content.filter((c) => c.type !== 'image_url').concat({ type: 'text', text: '(older screenshot removed)' });
  }
}

// ── Doing it in Chrome ───────────────────────────────────────────────────────

async function act(page, call) {
  const { client } = page;
  const name = call.function.name;
  let a = {};
  try {
    a = typeof call.function.arguments === 'string' ? JSON.parse(call.function.arguments || '{}') : call.function.arguments || {};
  } catch {
    return { ok: false, note: 'arguments were not JSON' };
  }
  const mouse = async (type, x, y) =>
    client.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
  switch (name) {
    case 'click': {
      // Large 4 sometimes sends the pair as `{"x": [470, 660]}` (5 of 46 actions in smoke3); one dropped digit cost it a question
      let shape = 'xy';
      if (Array.isArray(a.x) && a.x.length === 2) [a.x, a.y, shape] = [a.x[0], a.x[1], 'pair-in-x'];
      if (!Number.isFinite(Number(a.x)) || !Number.isFinite(Number(a.y)) || a.y === undefined) return { ok: false, note: 'click needs both x and y, as numbers' };
      const x = Math.max(0, Math.min(VW - 1, (Number(a.x) / 1000) * VW)), y = Math.max(0, Math.min(VH - 1, (Number(a.y) / 1000) * VH));
      await mouse('mouseMoved', x, y);
      await mouse('mousePressed', x, y);
      await wait(60);
      await mouse('mouseReleased', x, y);
      // what is under the press, for the log only — the model is not told
      const hit = await page.evaluate(`(() => { const e = document.elementFromPoint(${x}, ${y}); if (!e) return null;
        const b = e.closest('button,[role=button],.pressable,[class*=pressable],input') || e; return (b.innerText || b.placeholder || b.tagName).trim().slice(0, 40); })()`);
      await wait(400);
      return { ok: true, note: `clicked (${a.x}, ${a.y})`, px: [Math.round(x), Math.round(y)], hit, ...(shape === 'xy' ? {} : { shape }) };
    }
    case 'type':
      await client.send('Input.insertText', { text: String(a.text ?? '') });
      await wait(200);
      return { ok: true, note: `typed "${a.text}"` };
    case 'key': {
      const k = String(a.key || '');
      const named = { Enter: [13, '\r'], Backspace: [8, ''], Tab: [9, ''], Escape: [27, ''] }[k];
      const [code, text] = named || [k.toUpperCase().charCodeAt(0), k];
      const keyName = named ? k : k;
      await client.send('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', key: keyName, windowsVirtualKeyCode: code, text });
      await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: keyName, windowsVirtualKeyCode: code });
      await wait(250);
      return { ok: true, note: `pressed ${k}` };
    }
    case 'scroll': {
      // CDP's mouseWheel answered "Invalid parameters" here; scroll what a wheel would: the nearest scroller under the centre
      const dy = Number(a.dy) || 300;
      const moved = await page.evaluate(`(() => { let e = document.elementFromPoint(${VW / 2}, ${VH / 2});
        while (e && e !== document.body) { const s = getComputedStyle(e); if (/(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight) break; e = e.parentElement; }
        const t = e && e !== document.body ? e : document.scrollingElement; const before = t.scrollTop; t.scrollBy({ top: ${dy}, behavior: 'instant' }); return t.scrollTop - before; })()`);
      await wait(400);
      return { ok: true, note: moved ? `scrolled ${moved}px` : 'scrolled: nothing moved (already at the end, or nothing to scroll)' };
    }
    case 'wait': {
      const s = Math.max(0.2, Math.min(10, Number(a.seconds) || 1));
      await wait(s * 1000);
      return { ok: true, note: `waited ${s}s` };
    }
    case 'finish':
      return { ok: true, note: 'finished', finish: String(a.reason || '') };
    default:
      return { ok: false, note: `no tool called ${name}` };
  }
}

const shoot = async (page, n) => {
  const { data } = await page.client.send('Page.captureScreenshot', { format: 'jpeg', quality: 70 });
  fs.writeFileSync(path.join(OUT, 'shots', `${String(n).padStart(3, '0')}.jpg`), Buffer.from(data, 'base64'));
  return data;
};

// ── The game ────────────────────────────────────────────────────────────────

const totals = { calls: 0, prompt: 0, cached: 0, completion: 0, reasoning: 0, modelMs: 0, actions: 0 };
const cost = () => ((totals.prompt - totals.cached) * PRICE.input + totals.cached * PRICE.cached + totals.completion * PRICE.output) / 1e6;

const result = await withDeployedSite({ origin: ORIGIN, visible: flag('--visible') }, async (page) => {
  await page.setViewport({ width: VW, height: VH, mobile: false });
  await page.navigate(START);
  await wait(2500);
  const started = Date.now();
  const messages = [{ role: 'system', content: SYSTEM }];
  let verdict = null, finishReason = null, step = 0;

  messages.push({ role: 'user', content: [
    { type: 'text', text: 'Here is the screen. Begin.' },
    { type: 'image_url', image_url: `data:image/jpeg;base64,${await shoot(page, 0)}` }
  ] });

  while (step < MAX_STEPS && !verdict && finishReason === null) {
    step += 1;
    pruneImages(messages);
    const res = await chat(messages);
    const msg = res.choices[0].message;
    const u = res.usage || {};
    totals.calls += 1;
    totals.prompt += u.prompt_tokens || 0;
    totals.cached += u.prompt_tokens_details?.cached_tokens || u.num_cached_tokens || 0;
    totals.completion += u.completion_tokens || 0;
    totals.reasoning += u.completion_tokens_details?.reasoning_tokens || 0;
    totals.modelMs += res.totalMs;

    const said = typeof msg.content === 'string' ? msg.content : Array.isArray(msg.content) ? msg.content.filter((c) => c.type === 'text').map((c) => c.text).join(' ') : '';
    const calls = msg.tool_calls || [];
    messages.push({ role: 'assistant', content: said || '', tool_calls: calls });

    const done = [];
    for (const call of calls) {
      const r = await act(page, call).catch((e) => ({ ok: false, note: `that action failed: ${e.message}` }));
      totals.actions += 1;
      done.push({ tool: call.function.name, args: call.function.arguments, ...r });
      messages.push({ role: 'tool', tool_call_id: call.id, name: call.function.name, content: r.note });
      if (r.finish !== undefined) finishReason = r.finish;
    }

    await wait(600);
    const text = await page.evaluate('document.body.innerText');
    if (GAME.won.test(text)) verdict = 'won';
    else if (GAME.lost.test(text)) verdict = 'lost';

    const line = { step, ms: res.ms, totalMs: res.totalMs, attempts: res.attempts, usage: u, said: said.slice(0, 500), actions: done, verdict, at: Date.now() - started };
    LOG.write(JSON.stringify(line) + '\n');
    console.log(`#${step} ${(res.ms / 1000).toFixed(1)}s ${said.replace(/\s+/g, ' ').slice(0, 140)}` +
      `\n     → ${done.map((d) => `${d.note}${d.hit ? ` [${d.hit}]` : ''}`).join('; ') || '(no action)'}`);

    const shot = await shoot(page, step);
    messages.push({ role: 'user', content: [
      { type: 'text', text: calls.length ? 'Done. Here is the screen now.' : 'You did not call a tool. Here is the screen; act with a tool.' },
      { type: 'image_url', image_url: `data:image/jpeg;base64,${shot}` }
    ] });
  }
  // one last look after the end card settles: the referee reads the page, never the model
  if (!verdict) {
    const text = await page.evaluate('document.body.innerText');
    verdict = GAME.won.test(text) ? 'won' : GAME.lost.test(text) ? 'lost' : 'unfinished';
  }
  return { verdict, finishReason, steps: step, wallSeconds: Math.round((Date.now() - started) / 1000), consoleErrors: page.consoleErrors.length };
});

const summary = { game: opt('--game', 'monster'), model: MODEL, effort: EFFORT, viewport: `${VW}x${VH}`, ...result, ...totals, costUsd: Number(cost().toFixed(4)), out: OUT };
fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(summary, null, 2));
LOG.end();
console.log('\n' + JSON.stringify(summary, null, 2));
process.exit(result.verdict === 'won' ? 0 : 1);
