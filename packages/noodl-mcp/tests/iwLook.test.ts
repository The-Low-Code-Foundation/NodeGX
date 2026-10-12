/**
 * P108 IW-003 look (session 4, lane L) — the seven look items session 3 left open (IW-003 §7 "Open after the merge"),
 * graded where a spec can grade them: the page scripts a child's screen is drawn from, and the kits' own stylesheets.
 * What only a browser can see (the program whole in the view at three sizes, the pad clear of the world on a phone)
 * is `scripts/devtools/drive-iw-look.js`'s; the kits' vacant bench is graded beside lane S's bench rows (cg001GardenKit,
 * ig007Garden3d, their ends).
 *
 * - item 2  the envelopes' read says "read the envelope" (Palette, the pad's key, its card); Mamie's note keeps "read the note".
 * - item 3  the drawer's "go to nearest" starts on what THIS job seeks first (Palette's `seek`, through Kit palette).
 * - item 5  a job of one target counts what fills it ("2 of 4 done" on the eggs, never "0 of 1").
 * - item 6  both kits' full meter: white numbers at ≥ 4.5:1 on its green (text); the island's bar ≥ 3:1 on its white ring (a mark).
 * - item 7  one Sami on the island (Draw world: a built bench seats him unless he stands asking).
 *
 * @module noodl-mcp/tests/iwLook.test
 */
import * as fs from 'fs';
import * as path from 'path';

import { GardenRequest, REQUESTS } from './cg002Content';
import { CHOOSE_HINT_SCRIPT, PALETTE_SCRIPT, runScript } from './cg002Scripts';
import { ALL_WORDS_JSON, BLOCK_CARD_SCRIPT, DRAW_WORLD_SCRIPT, KIT_PALETTE_SCRIPT, PAD_KEYS_SCRIPT } from './cg003Scripts';

const WORDS: Array<{ key: string; en: string; fr: string }> = JSON.parse(ALL_WORDS_JSON);
const word = (key: string, lang: 'en' | 'fr', name = 'Pip') => String((WORDS.find((r) => r.key === key) || ({} as any))[lang] || '').split('{b}').join(name);
const REQ = (id: string) => REQUESTS.find((r) => r.id === id) as GardenRequest;
const LANGS = ['en', 'fr'] as const;

/** The palette a Workshop request opens with (Start world's allowed, rungs, needs; the request itself). */
const paletteOf = (id: string, lang: 'en' | 'fr', withRequest = true) => {
  const r = REQ(id);
  return runScript(PALETTE_SCRIPT, { band: r.band, allowed: r.palette, rungs: r.rungs || [], needs: '', lang, words: WORDS, request: withRequest ? JSON.parse(JSON.stringify(r)) : null }).palette as any[];
};
/** The kind of a program's first go to nearest (depth first). */
const firstSeek = (list: any[] | undefined): string => {
  for (const b of list || []) {
    if (b.t === 'go_nearest' && b.slots && b.slots.kind) return b.slots.kind;
    const inner = firstSeek(b.body);
    if (inner) return inner;
  }
  return '';
};

// ── item 3: go to nearest starts on what the job seeks ─────────────────────────────────────────────────────────────
describe('P108 IW-003 look (lane L) item 3 — the drawer’s “go to nearest” starts on what this job seeks first', () => {
  const SEEKERS = REQUESTS.filter((r) => (r.palette || []).includes('go_nearest')).map((r) => r.id);

  it('🔴 every request whose drawer has go to nearest: its entry carries the kind of the reference program’s first go to nearest (rock on the stones and the bench, egg on the eggs)', () => {
    const got = SEEKERS.map((id) => [id, (paletteOf(id, 'en').find((e) => e.id === 'go_nearest') || {}).seek]);
    expect(got).toEqual(SEEKERS.map((id) => [id, firstSeek(REQ(id).referenceProgram as any[])]));
    // Known-firing: the three session-3 seekers, and two of them are not eggs (the drawer said "egg" on both).
    expect(Object.fromEntries(got)).toMatchObject({ 'path-stones': 'rock', 'eggs-count': 'egg', 'sami-bench': 'rock' });
  });

  it('with no request (free play, the Skills page) nothing is set: the kit keeps its own default', () => {
    expect((paletteOf('sami-bench', 'en', false).find((e) => e.id === 'go_nearest') || {}).seek).toBeUndefined();
  });

  it('Kit palette hands the kind on to the Blocks node (its drawer block starts on it)', () => {
    const pal = paletteOf('sami-bench', 'fr');
    const kit = runScript(KIT_PALETTE_SCRIPT, { palette: pal, lang: 'fr', band: 2, words: WORDS, botName: 'Cobble' }).palette as any[];
    expect(kit.find((e) => e.id === 'go_nearest')).toMatchObject({ id: 'go_nearest', seek: 'rock' });
    expect(kit.filter((e) => e.seek !== undefined).map((e) => e.id)).toEqual(['go_nearest']);
  });
});

// ── item 2: the envelopes' read reads the envelope ─────────────────────────────────────────────────────────────────
describe('P108 IW-003 look (lane L) item 2 — on the envelopes, Olive’s read says “read the envelope”', () => {
  for (const lang of LANGS) {
    it(`🔴 ${lang}: the drawer’s block and the pad’s key read the envelope on the envelopes, the note on Mamie’s note`, () => {
      const env = paletteOf('envelopes', lang).find((e) => e.id === 'olive:read');
      const note = paletteOf('mamie-note', lang).find((e) => e.id === 'olive:read');
      expect(word('iwlReadEnvelope', lang)).not.toBe('');
      expect([env && env.label, env && env.caption]).toEqual([word('iwlReadEnvelope', lang), word('iwlReadEnvelope', lang)]);
      expect(note && note.label).toBe(word('rungRead', lang));
      const keys = (id: string) => runScript(PAD_KEYS_SCRIPT, { palette: paletteOf(id, lang), words: WORDS, lang, world: { things: [] } }).keys as any[];
      expect((keys('envelopes').find((k) => k.op === 'olive:read') || {}).label).toBe(word('iwlReadEnvelope', lang));
      expect((keys('mamie-note').find((k) => k.op === 'olive:read') || {}).label).toBe(word('rungRead', lang));
    });

    it(`🔴 ${lang}: the read block’s card on the envelopes is the envelope’s — its title, its line, go to in its example; Mamie’s note keeps hers`, () => {
      const card = (id: string) => runScript(BLOCK_CARD_SCRIPT, { cardOpen: 'olive:read', lang, band: 2, words: WORDS, botName: 'Pocket', request: JSON.parse(JSON.stringify(REQ(id))) });
      const env = card('envelopes');
      expect([env.show, env.title, env.line]).toEqual([true, word('iwlReadEnvelope', lang), word('iwlCdReadEnvelope', lang, 'Pocket')]);
      expect(env.example.map((b: any) => b.t)).toEqual(['pick', 'olive:read', 'go_to', 'put']);
      // Its example's read block says it too (the card draws the example with its own palette); the note's keeps the note.
      expect((env.palette.find((e: any) => e.id === 'olive:read') || {}).label).toEqual({ en: word('iwlReadEnvelope', 'en'), fr: word('iwlReadEnvelope', 'fr') });
      expect((card('mamie-note').palette.find((e: any) => e.id === 'olive:read') || {}).label).toEqual({ en: word('rungRead', 'en'), fr: word('rungRead', 'fr') });
      expect(env.cardId).toBe('olive:read');
      const note = card('mamie-note');
      expect([note.title, note.line]).toEqual([word('rungRead', lang), word('cdOliveRead', lang, 'Pocket')]);
      expect(note.example.map((b: any) => b.t)).toEqual(['olive:read', 'if']);
    });
  }
});

// ── item 5: a job of one target counts what fills it ───────────────────────────────────────────────────────────────
describe('P108 IW-003 look (lane L) item 5 — “N of M done” counts what fills a one-target job', () => {
  const ran = { tick: 7, done: true };
  const hintOn = (world: any) => runScript(CHOOSE_HINT_SCRIPT, { world, program: [{ id: 1, t: 'fwd' }], run: ran, goalMet: false });
  const job1 = (thing: any) => ({ map: ['GGGG', 'GGGG'], things: [thing], robots: [{ id: 'pip', x: 0, y: 1, d: 0 }], job: { targets: [thing.id], home: { x: 0, y: 1 } } });

  it('🔴 the eggs’ basket 2 of its 4 → “2 of 4 done” (was “0 of 1”); the bench 4 of 8 stones; a tulip 1 of 3 drinks', () => {
    expect([hintOn(job1({ kind: 'basket', id: 'basket', x: 3, y: 0, count: 2, capacity: 4, item: 'egg' })).key, hintOn(job1({ kind: 'basket', id: 'basket', x: 3, y: 0, count: 2, capacity: 4, item: 'egg' })).vars]).toEqual(['iw3Job', { w: 2, t: 4 }]);
    expect(hintOn(job1({ kind: 'site', id: 'bench', x: 3, y: 0, have: 4, need: 8, build: 'bench' })).vars).toEqual({ w: 4, t: 8 });
    expect(hintOn(job1({ kind: 'tulip', id: 't', x: 3, y: 0, have: 1, need: 3 })).vars).toEqual({ w: 1, t: 3 });
  });

  it('a one-target job whose target holds one (Sami’s door, one letter) and a job of many targets say what they said', () => {
    expect(hintOn(job1({ kind: 'door', id: 'door', x: 3, y: 0, count: 0, capacity: 1, item: 'letter', owner: 'Sami' })).vars).toEqual({ w: 0, t: 1 });
    const two = { map: ['GGGG', 'GGGG'], things: [{ kind: 'tulip', id: 'a', x: 1, y: 0, have: 3, need: 3 }, { kind: 'tulip', id: 'b', x: 3, y: 0, have: 1, need: 3 }], robots: [{ id: 'pip', x: 0, y: 1, d: 0 }], job: { targets: ['a', 'b'], home: { x: 0, y: 1 } } };
    expect(hintOn(two).vars).toEqual({ w: 1, t: 2 });
    // A full one-target job is lane B's trick line, as before (every target full, no win).
    expect(hintOn(job1({ kind: 'basket', id: 'basket', x: 3, y: 0, count: 4, capacity: 4, item: 'egg' })).key).toBe('iw3bTrick');
  });
});

// ── item 7: one Sami on the island ─────────────────────────────────────────────────────────────────────────────────
describe('P108 IW-003 look (lane L) item 7 — one Sami on the island (Draw world)', () => {
  const bench = (have: number) => ({ kind: 'site', id: 'bench', x: 4, y: 2, have, need: 8, item: 'stone', build: 'bench' });
  const sami = (sayKey: string) => ({ kind: 'islander', who: 'sami', x: 2, y: 6, sayKey });
  const drawn = (things: any[]) => runScript(DRAW_WORLD_SCRIPT, { world: { map: ['GGGGGG', 'GGGGGG', 'GGGGGG', 'GGGGGG', 'GGGGGG', 'GGGGGG', 'GGGGGG'], things, robots: [] }, words: WORDS, lang: 'en' }).things as any[];
  const samis = (things: any[]) => ({ standing: things.filter((t) => t.kind === 'islander' && t.who === 'sami').length, sitting: things.filter((t) => t.kind === 'site' && t.build === 'bench' && t.have >= t.need && !t.vacant).length });

  it('🔴 his bench built and nothing to ask: he sits on it and does not stand as well', () => {
    expect(samis(drawn([bench(8), sami('')]))).toEqual({ standing: 0, sitting: 1 });
  });
  it('🔴 his bench built and a request to ask (his bubble): he stands by that plot, the bench is drawn vacant', () => {
    const t = drawn([bench(8), sami('rqLetterTitle')]);
    expect(samis(t)).toEqual({ standing: 1, sitting: 0 });
    expect(t.find((x) => x.kind === 'site').vacant).toBe(true);
    expect(t.find((x) => x.kind === 'islander').say).toBe(word('rqLetterTitle', 'en'));
  });
  it('the bench not built yet (or worn): he stands, as before, and no bench is marked', () => {
    const t = drawn([bench(7), sami('')]);
    expect(samis(t)).toEqual({ standing: 1, sitting: 0 });
    expect(t.find((x) => x.kind === 'site').vacant).toBeUndefined();
    // Known-firing beside it: Mamie Rose and a bench are none of this rule's business.
    const m = drawn([bench(8), { kind: 'islander', who: 'mamie', x: 1, y: 6, sayKey: '' }]);
    expect(m.filter((x) => x.kind === 'islander').length).toBe(1);
    expect(m.find((x) => x.kind === 'site').vacant).toBeUndefined();
  });
});

// ── item 6: the kits' full meter ───────────────────────────────────────────────────────────────────────────────────
describe('P108 IW-003 look (lane L) item 6 — both kits’ full meter reads at WCAG contrast on its own ground', () => {
  const KIT2D = path.join(__dirname, '..', '..', '..', 'library', 'modules', 'garden-kit', 'project', 'noodl_modules', 'garden-kit', 'index.js');
  const KIT3D = path.join(__dirname, '..', '..', '..', 'library', 'modules', 'garden-3d-kit', 'project', 'noodl_modules', 'garden-3d-kit', 'index.js');
  const lum = (hex: string) => {
    const n = hex.replace('#', '');
    const c = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const contrast = (a: string, b: string) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  /** The built kit, run far enough to read its stylesheet: the CSS strings as the browser gets them (constants joined in). */
  const cssOf = (file: string) => {
    const src = fs.readFileSync(file, 'utf8');
    const full = /METER_FULL = '(#[0-9A-Fa-f]{6})'/.exec(src);
    return { src, full: full ? full[1] : null };
  };

  for (const [name, file, pre] of [['garden-kit', KIT2D, 'gd'], ['garden-3d-kit', KIT3D, 'gd3']] as const) {
    it(`🔴 ${name}: the full chip’s white numbers on its green ≥ 4.5:1 (text), and the island’s full bar ≥ 3:1 on its white ring (a mark)`, () => {
      const { src, full } = cssOf(file);
      expect(full).not.toBeNull();
      // The rules use it (no literal green left behind in either rule).
      expect(src).toContain(`'.${pre}-meter.${pre}-full{background:' + METER_FULL + ';color:#fff}`);
      expect(src).toContain("{--c:' + METER_FULL + ';--f:100%}");
      expect(src).not.toMatch(new RegExp(`\\.${pre}-meter\\.${pre}-full\\{background:#`));
      const ratio = contrast(full!, '#FFFFFF');
      expect(+ratio.toFixed(2)).toBeGreaterThanOrEqual(4.5);
      // Known-firing beside it: the mockup's green the kits wore measures 3.05:1 on the same rule — red.
      expect(+contrast('#3FA66B', '#FFFFFF').toFixed(2)).toBe(3.05);
    });
  }
  it('the page’s own leaf (the override lane M laid over both kits) is the same green', () => {
    const look = fs.readFileSync(path.join(__dirname, 'cg007Look.ts'), 'utf8');
    expect(look).toContain("{ token: '--leaf', mockup: '#3FA66B', value: '#058149' }");
    expect(cssOf(KIT2D).full).toBe('#058149');
    expect(cssOf(KIT3D).full).toBe('#058149');
  });
});
