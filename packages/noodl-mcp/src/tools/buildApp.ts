/**
 * P112 OWN-031 — `build_app`: the whole app in ONE call, the server asking a local model the small questions.
 *
 * Why the server asks and not the chat (Richard, 2026-10-29, after the Goose measurements in
 * `dev-docs/tasks/phase-112-your-own-nodegx/own-030/goose/FINDINGS.md`): Gemma 4 E4B in Goose understands the MCP
 * instructions and plans well, and then loses itself drawing the graph (a three-operation `create_plan` on one page,
 * an invented `play_tool`), with every turn carrying 15–25k tokens at 3–13 tokens/s. OWN-027/029 showed the same
 * model makes good decisions when it is asked one small question with the options in the words, and a script builds.
 * So here the chat makes one call, and this server asks Ollama (the model the person already runs) directly: a
 * handful of short prompts, seconds each, with no history to drown in. This reverses OWN-031's ruling 2 for hosts
 * that run Ollama (the task file says so); Goose advertises no `sampling`, so there is no other way to borrow the
 * chat's model.
 *
 * Offered only when `NODEGX_LOCAL_MODEL` names an Ollama model (`localModel()`); elsewhere it is registered (the
 * manifest wants every tool registered) in the deferred `project` group and refuses, saying what to set.
 *
 * Two kinds so far: a counter (a number, buttons that change it), and a page (a landing page, a menu, a portfolio, a
 * sign-up page), which is OWN-029's question tree ported into `../guided/page.ts`. The kinds a person asks for that it
 * cannot build yet are refused in words, so the chat can fall back to the ordinary tools.
 *
 * @module noodl-mcp/tools/buildApp
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { z } from 'zod';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { normalizeObjectSchema, safeParseAsync } from '@modelcontextprotocol/sdk/server/zod-compat.js';

import { ToolError } from '../errors';
import { ollamaDoor } from '../guided/door';
import { deleteRound, planRound, preparePage, startCard, treeOf, writeRound, type Planned, type Skipped, type ToolOut, type Written } from '../guided/page';
import { reviewLoop } from '../guided/review';
import type { ToolDisclosure } from './disclosure';
import { STUDIO_RESOURCE_URI } from './openStudio';
import { guarded, jsonResult } from './util';

/** The Ollama model this server may ask, or null. */
export function localModel(): { model: string; host: string } | null {
  const model = process.env.NODEGX_LOCAL_MODEL?.trim();
  if (!model) return null;
  return { model, host: (process.env.NODEGX_OLLAMA_HOST || 'http://127.0.0.1:11434').replace(/\/$/, '') };
}

/** How many repair rounds a page gets after round 0: `NODEGX_BUILD_ROUNDS`, else 2 (the lab ran 4; each costs minutes). */
export function buildRounds(): number {
  const n = Number(process.env.NODEGX_BUILD_ROUNDS);
  return Number.isInteger(n) && n >= 0 && n <= 6 ? n : 2;
}

/** Where a project goes when the call names no folder: `NODEGX_PROJECTS_DIR`, else `~/NodeGX projects`. */
export function projectsHome(): string {
  return process.env.NODEGX_PROJECTS_DIR?.trim() || path.join(os.homedir(), 'NodeGX projects');
}

/** A free folder under `home` named after `title`. */
export function freeFolder(home: string, title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'app';
  for (let i = 1; ; i++) {
    const dir = path.join(home, i === 1 ? slug : `${slug}-${i}`);
    if (!fs.existsSync(dir) || fs.readdirSync(dir).length === 0) return dir;
  }
}

const SYSTEM = 'You answer one question about building a small app. Reply with JSON only, matching the schema. Be brief.';

/** One question to the local model: JSON out, the options already in the words (the schema is invisible to it). */
async function ask<T>(lm: { model: string; host: string }, user: string, schema: object, numPredict = 300): Promise<T> {
  const res = await fetch(`${lm.host}/api/chat`, {
    method: 'POST',
    body: JSON.stringify({
      model: lm.model,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: user }
      ],
      stream: false,
      think: false,
      format: schema,
      options: { temperature: 0.3, num_predict: numPredict },
      keep_alive: '30m'
    })
  });
  if (!res.ok) throw new ToolError('io-error', `The local model (${lm.model}) answered ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json()) as { message?: { content?: string } };
  try {
    return JSON.parse(body.message?.content ?? '') as T;
  } catch {
    throw new ToolError('io-error', `The local model (${lm.model}) did not answer in JSON: ${(body.message?.content ?? '').slice(0, 200)}`);
  }
}

const HUES: Record<string, string> = { blue: 'blue', green: 'green', warm: 'amber', purple: 'purple', neutral: 'gray' };

export interface CounterAnswers {
  title: string;
  unit: string;
  plusLabel: string;
  start: number;
  minus: boolean;
  reset: boolean;
  preset: string;
  hue: string;
}

interface Look {
  id: string;
  parameters: Record<string, unknown>;
}

/** The counter page's nodes and wires, from the answers and the vocabulary's looks. Pure, so the suite can read it. */
export function counterGraph(a: CounterAnswers, pageNodeId: string, looks: Look[]): { nodes: object[]; connections: string[]; visual_roots: string[] } {
  const look = (id: string, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
    ...structuredClone(looks.find((l) => l.id === id)?.parameters ?? {}),
    ...extra
  });
  const nodes: object[] = [
    { id: pageNodeId, type: 'Page', label: 'Home', parameters: { title: a.title, urlPath: 'home' } },
    {
      id: 'counter-band',
      type: 'Group',
      label: 'the counter, in the middle of the page',
      parent: pageNodeId,
      parameters: look('band', {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        rowGap: 'var(--space-6)',
        paddingTop: 'var(--space-24)',
        paddingBottom: 'var(--space-24)',
        width: { value: 100, unit: '%' },
        sizeMode: 'contentHeight'
      })
    },
    // the band's one child (the validator's band-without-shell): the content's width on a desktop
    {
      id: 'counter-shell',
      type: 'Group',
      label: 'the counter, at a readable width',
      parent: 'counter-band',
      parameters: look('shell', { flexDirection: 'column', alignItems: 'center', rowGap: 'var(--space-6)', sizeMode: 'contentHeight' })
    },
    { id: 'title', type: 'Text', label: 'the title', parent: 'counter-shell', parameters: look('sectionHeading', { text: a.title, as: 'h1', textAlignX: 'center' }) },
    { id: 'count', type: 'Text', label: 'the count', parent: 'counter-shell', parameters: look('displayHeadline', { text: String(a.start), textAlignX: 'center' }) },
    ...(a.unit ? [{ id: 'unit', type: 'Text', label: 'what is counted', parent: 'counter-shell', parameters: look('lead', { text: a.unit, textAlignX: 'center' }) }] : []),
    { id: 'buttons', type: 'Group', label: 'the buttons', parent: 'counter-shell', parameters: look('actionRow', { justifyContent: 'center' }) },
    ...(a.minus ? [{ id: 'minus', type: 'net.noodl.controls.button', label: 'take one away', parent: 'buttons', parameters: look('outlineButton', { label: '−' }) }] : []),
    { id: 'plus', type: 'net.noodl.controls.button', label: 'add one', parent: 'buttons', parameters: look('primaryButton', { label: a.plusLabel }) },
    ...(a.reset ? [{ id: 'reset', type: 'net.noodl.controls.button', label: 'start again', parent: 'buttons', parameters: look('outlineButton', { label: 'Reset' }) }] : []),
    { id: 'tally', type: 'Counter', label: 'the count itself', parameters: { startValue: a.start } }
  ];
  const connections = [
    'plus.onClick -> tally.increase',
    ...(a.minus ? ['minus.onClick -> tally.decrease'] : []),
    ...(a.reset ? ['reset.onClick -> tally.reset'] : []),
    'tally.currentCount -> count.text'
  ];
  return { nodes, connections, visual_roots: [pageNodeId] };
}

export function registerBuildAppTools(server: McpServer, disclosure: ToolDisclosure): void {
  server.registerTool(
    'build_app',
    {
      title: 'Build a small app in one call, and show it',
      description:
        'EXPERIMENTAL, for a small local model: builds the whole app from the person\'s words in ONE call and shows ' +
        'it in Studio. Pass their request as they said it. Use this INSTEAD of create_project, create_plan and the ' +
        'other building tools. Today it builds a counter (a number with buttons that change it) or a one-page site ' +
        '(a landing page, a menu, a portfolio, a sign-up page; this takes a few minutes); for anything else it says ' +
        'so and you can use the ordinary tools.',
      inputSchema: {
        request: z.string().min(1).describe('What the person asked for, in their words.'),
        directory: z.string().optional().describe('A folder for the project, only if the person named one.')
      },
      _meta: { ui: { resourceUri: STUDIO_RESOURCE_URI }, 'ui/resourceUri': STUDIO_RESOURCE_URI }
    },
    // `extra` goes on to the tools it drives (the way call_tool hands it over); guarded() passes only the arguments.
    (args: { request: string; directory?: string }, extra: unknown) => guarded(async (args: { request: string; directory?: string }) => {
      const lm = localModel();
      if (!lm) {
        throw new ToolError(
          'not-found',
          'build_app needs a local model: start this server with NODEGX_LOCAL_MODEL set to an Ollama model name ' +
            '(and NODEGX_OLLAMA_HOST if Ollama is not on 127.0.0.1:11434). Build with the ordinary tools instead.'
        );
      }
      // A tool this server has, run in-process with its own validation: what the model would have called, built here.
      const invoke = async (name: string, a: Record<string, unknown>): Promise<ToolOut> => {
        const h = disclosure.handleFor(name);
        if (!h) throw new ToolError('not-found', `build_app needs ${name}, which this server does not have.`);
        const schema = h.inputSchema ? normalizeObjectSchema(h.inputSchema) ?? h.inputSchema : undefined;
        let parsed: unknown = a;
        if (schema) {
          const r = await safeParseAsync(schema as Parameters<typeof safeParseAsync>[0], a);
          if (!r.success) throw new ToolError('invalid-argument', `build_app built arguments ${name} refused: ${String((r as { error: unknown }).error).slice(0, 300)}`);
          parsed = (r as { data: unknown }).data;
        }
        const out = (await (h.handler as unknown as (p: unknown, e: unknown) => Promise<{ isError?: boolean; content?: { text?: string }[] }>)(parsed, extra));
        const text = out.content?.[0]?.text ?? '';
        let json: any = null;
        try {
          json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
        } catch {
          /* not JSON: the text is the answer */
        }
        return { isError: !!out.isError, text, json };
      };
      const call = async (name: string, a: Record<string, unknown>): Promise<Record<string, unknown>> => {
        const r = await invoke(name, a);
        if (r.isError) throw new ToolError('io-error', `${name} refused what build_app built: ${r.text.slice(0, 2500)}`);
        return r.json ?? { text: r.text };
      };
      // A line of progress for a client that asked for it: a page takes minutes, and a host may give up on a silent
      // tool call (the SDK's client resets its timeout on progress when told to).
      const ex = extra as { _meta?: { progressToken?: string | number }; sendNotification?: (n: unknown) => Promise<void> };
      let step = 0;
      const progress = (message: string) => {
        const token = ex?._meta?.progressToken;
        if (token === undefined || !ex.sendNotification) return;
        void ex.sendNotification({ method: 'notifications/progress', params: { progressToken: token, progress: ++step, message } }).catch(() => undefined);
      };
      const req = `Request: "${args.request.trim()}"`;
      const t0 = Date.now();

      // The page: OWN-029's question tree (../guided/page.ts) and its review loop (../guided/review.ts), every
      // question to the same local model. Round 0 builds; each repair round rebuilds only what its fixes invalidated,
      // beside the last round, which is deleted once the new one is written; the kept round ends up under Sections/.
      const buildPageApp = async () => {
        const door = ollamaDoor({ model: lm.model, host: lm.host });
        const skipped: Skipped = [];
        const exclude = new Map<string, Set<string>>();
        const request = args.request.trim();
        progress('reading the request');
        const card = await startCard({ door, request, skipped, progress });
        const title = card.name.slice(0, 60);
        const directory = args.directory?.trim() ? path.resolve(args.directory.trim()) : freeFolder(projectsHome(), title);
        if (fs.existsSync(directory) && fs.readdirSync(directory).length > 0) {
          throw new ToolError('invalid-argument', `${directory} is not empty. Pass another directory, or leave it out and build_app picks a free folder.`);
        }
        await call('create_project', {
          directory,
          name: title,
          request: args.request,
          summary: args.request,
          audience: card.audience || 'visitors',
          pages: [{ name: 'Home', purpose: args.request }],
          backend: { kind: 'none', description: 'None: a page with no stored data.' },
          agreed: false
        });
        const deps = { door, request, skipped, progress, exclude, projectDir: directory };
        const prep = await preparePage(deps, card, invoke);
        let previous: string[] = [];
        let last: { planned: Planned; written: Written } | null = null;
        const writeAs = async (folder: string) => {
          const planned = await planRound(deps, card, prep, folder);
          const written = await writeRound(deps, card, planned, invoke);
          if (!written.applied) throw new ToolError('io-error', `build_app could not write the page: ${written.applyHead}`);
          await deleteRound(invoke, previous);
          previous = written.paths;
          last = { planned, written };
          return { card, built: planned.built, staging: written.staging, findings: written.findings };
        };
        const loop = await reviewLoop({ door, request, card, exclude, rounds: buildRounds(), progress, build: (round) => writeAs(round === 0 ? 'Sections' : `Sections v${round + 1}`) });
        // The project holds the last round built. When that is not the kept one, or it sits in a "Sections vN" folder,
        // build the kept one again under Sections/: every answer is cached, so this asks the model nothing.
        if (loop.lastBuilt !== loop.best.round || previous.some((p) => !p.startsWith('Sections/'))) {
          door.setRound(loop.lastBuilt + 1);
          progress('putting the best round on the page');
          await writeAs('Sections');
        }
        const final = last!;
        // delete_component removes a component's files, not its folder: the empty "Sections vN" folders go too
        try {
          const comps = path.join(directory, 'components');
          for (const f of fs.readdirSync(comps)) if (/^Sections v\d+$/.test(f) && fs.readdirSync(path.join(comps, f)).length === 0) fs.rmdirSync(path.join(comps, f));
        } catch {
          /* a leftover empty folder is untidy, not wrong */
        }
        progress('opening Studio');
        // a host that draws no Studio still gets the project: the panel is a view of it, not part of the build
        const opened = await invoke('open_studio', {});
        const studio = opened.isError ? { studio: `not shown: ${opened.text.slice(0, 200)}` } : opened.json ?? {};
        const ms = door.calls.reduce((n, c) => n + (c.ms || 0), 0) + door.judgements.reduce((n, j) => n + (j.ms || 0), 0);
        // the lab's ledger, beside the project, so a run in a real chat can be read (and replayed) afterwards
        try {
          fs.mkdirSync(path.join(directory, '.previews'), { recursive: true });
          fs.writeFileSync(
            path.join(directory, '.previews', 'build-app.json'),
            JSON.stringify({ request: args.request, model: lm.model, rounds: loop.log, keptRound: loop.best.round, calls: door.calls, judgements: door.judgements, skipped, staging: final.written.staging, tree: treeOf(card, final.planned.built) }, null, 1)
          );
        } catch {
          /* a ledger that cannot be written is not a failed build */
        }
        const left = loop.best.crit.issues.filter((x) => !x.quality).sort((a, b) => b.weight - a.weight);
        return jsonResult({
          ok: true,
          built: true,
          ...studio,
          projectDir: directory,
          decided: { kind: card.kind, tone: card.tone, name: card.name, preset: card.preset, colour: card.hue, photos: card.photos, sections: final.planned.built.map((b) => `${b.sec.kind}: ${b.bits.join(', ')}`) },
          review: {
            rounds: loop.log.map((r) => `round ${r.round}: ${r.issues.filter((x) => !x.id.startsWith('Q|')).length} issues, ${r.perLine} per line, organised ${r.shape}${r.round === 0 ? '' : r.kept ? ', kept' : ', undone'}`),
            kept: loop.best.round,
            issuesLeft: left.slice(0, 6).map((x) => x.say)
          },
          questions: door.calls.length + door.judgements.length,
          seconds: Math.round((Date.now() - t0) / 1000),
          modelSeconds: Math.round(ms / 1000),
          ...(final.written.staging.length ? { sectionsLeftOut: final.written.staging.map((x) => `${x.target}: ${x.text.slice(0, 200)}`) } : {}),
          note:
            `Built "${title}" in ${directory}, looked at it and repaired it, and put it on screen in Studio. Tell the ` +
            'person in one or two sentences what is on the page. This server is now bound to that project: to change ' +
            'it, use the ordinary tools (get_component, update_component).'
        });
      };

      // 1. What kind of app.
      const kind = await ask<{ kind: string }>(
        lm,
        `${req}\nWhich kind of app is this?\n- counter: a number on screen and buttons that change it (a tally, a score, a click counter)\n- page: a web page or a one-page site for a business, an event, a person, a club or a cause (a landing page, a menu, a portfolio, a sign-up page)\n- other: anything else`,
        { type: 'object', required: ['kind'], properties: { kind: { type: 'string', enum: ['counter', 'page', 'other'] } } },
        60
      );
      if (kind.kind === 'page') return buildPageApp();
      if (kind.kind !== 'counter') {
        return jsonResult({
          ok: false,
          built: false,
          note: 'build_app builds counters and one-page sites today, and this request is something else. Build it with the ordinary tools (create_project, then create_plan), or ask the person whether one of those is what they meant.'
        });
      }

      // 2. The words.
      const words = await ask<{ title: string; unit: string; button: string }>(
        lm,
        `${req}\nWrite the words of this counter app:\n- title: the heading above the number, at most 40 characters\n- unit: a few words under the number saying what is counted, or "" if nothing\n- button: the label of the button that adds one, a symbol like "+" or at most 3 words`,
        { type: 'object', required: ['title', 'unit', 'button'], properties: { title: { type: 'string' }, unit: { type: 'string' }, button: { type: 'string' } } }
      );
      // 3. The behaviour.
      const behaviour = await ask<{ start: number; minus: string; reset: string }>(
        lm,
        `${req}\nDecide:\n- start: the number it starts at (0 unless the request says otherwise)\n- minus: "yes" if it needs a button that takes one away, else "no"\n- reset: "yes" if it needs a button that starts again from the start number, else "no"`,
        { type: 'object', required: ['start', 'minus', 'reset'], properties: { start: { type: 'integer' }, minus: { type: 'string', enum: ['yes', 'no'] }, reset: { type: 'string', enum: ['yes', 'no'] } } }
      );

      // The project: in the folder the person named, or a free one under the projects home.
      const title = (words.title || 'Counter').trim().slice(0, 60);
      const directory = args.directory?.trim() ? path.resolve(args.directory.trim()) : freeFolder(projectsHome(), title);
      if (fs.existsSync(directory) && fs.readdirSync(directory).length > 0) {
        throw new ToolError('invalid-argument', `${directory} is not empty. Pass another directory, or leave it out and build_app picks a free folder.`);
      }
      await call('create_project', {
        directory,
        name: title,
        request: args.request,
        summary: args.request,
        audience: 'the person who asked',
        pages: [{ name: 'Home', purpose: args.request }],
        backend: { kind: 'none', description: 'None: the count lives in the page.' },
        agreed: false
      });

      // 4. The look, from the vocabulary this project now has.
      const vocab = (await call('get_style_vocabulary', {})) as { presets?: { id: string; description?: string }[]; compositions?: Look[] };
      const presets = vocab.presets ?? [];
      const short = (s = '') => s.split(/:\s|—|\.\s/)[0].trim().slice(0, 80);
      const style = presets.length
        ? await ask<{ preset: string; hue: string }>(
            lm,
            `${req}\nPick the style preset and the main colour (${Object.keys(HUES).join(', ')}).\nPresets:\n${presets.map((p) => `- ${p.id}: ${short(p.description)}`).join('\n')}`,
            { type: 'object', required: ['preset', 'hue'], properties: { preset: { type: 'string', enum: presets.map((p) => p.id) }, hue: { type: 'string', enum: Object.keys(HUES) } } },
            80
          )
        : { preset: '', hue: 'blue' };
      if (style.preset) await call('set_style_preset', { preset_id: style.preset });
      const h = HUES[style.hue] || 'blue';
      await call('set_project_tokens', {
        tokens: [
          { name: '--primary', value: `var(--${h}-${h === 'gray' ? 900 : 600})` },
          { name: '--primary-hover', value: `var(--${h}-${h === 'gray' ? 800 : 700})` },
          { name: '--ring', value: `var(--${h}-500)` }
        ]
      });

      const answers: CounterAnswers = {
        title,
        unit: (words.unit || '').trim().slice(0, 60),
        plusLabel: (words.button || '+').trim().slice(0, 24) || '+',
        start: Number.isFinite(behaviour.start) ? Math.trunc(behaviour.start) : 0,
        minus: behaviour.minus === 'yes',
        reset: behaviour.reset === 'yes',
        preset: style.preset,
        hue: style.hue
      };

      // 5. Build: one plan, one page, applied.
      const home = (await call('get_component', { path: 'Pages/Home' })) as { nodes?: { id: string; type: string }[] };
      const pageNode = home.nodes?.find((n) => n.type === 'Page');
      if (!pageNode) throw new ToolError('io-error', 'The new project has no Page node on Pages/Home.');
      const plan = (await call('create_plan', {
        request: args.request,
        scroll: 'page',
        operations: [{ kind: 'update', target: 'Pages/Home', intent: 'The counter: a title, the number, the buttons.' }]
      })) as { planId: string; operations: { id: string }[] };
      const staged = await call('stage_plan_operation', {
        plan_id: plan.planId,
        operation_id: plan.operations[0].id,
        ...counterGraph(answers, pageNode.id, vocab.compositions ?? [])
      });
      await call('apply_plan', { plan_id: plan.planId });

      // 6. On screen: Studio, drawn for THIS call (the tool carries the panel's resourceUri).
      // a host that draws no Studio still gets the project: the panel is a view of it, not part of the build
        const opened = await invoke('open_studio', {});
        const studio = opened.isError ? { studio: `not shown: ${opened.text.slice(0, 200)}` } : opened.json ?? {};
      return jsonResult({
        ok: true,
        built: true,
        ...studio,
        projectDir: directory,
        decided: answers,
        seconds: Math.round((Date.now() - t0) / 1000),
        warnings: (staged as { validation?: { diagnostics?: unknown[] } }).validation?.diagnostics ?? [],
        note:
          `Built "${title}" in ${directory} and put it on screen in Studio. Tell the person in one or two sentences ` +
          'what you made and that they can press the button. This server is now bound to that project: to change ' +
          'it, use the ordinary tools (get_component, update_component).'
      });
    })(args)
  );
}
