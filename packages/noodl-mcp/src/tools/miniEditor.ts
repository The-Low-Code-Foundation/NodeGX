/**
 * P125 CCN-008 — `show_mini_editor` and `get_mini_editor`: the part of the app the person must decide about, live,
 * with only the settings the agent chose for them.
 *
 * ## Why this exists
 *
 * Richard, 2026-10-24: *"Show the full editor when needed, but be able to show mini custom editors when a button needs
 * styling or a hero section needs approval"* — and *"especially important for designing three.js games, so Claude can
 * show the user model by model what it's building and have the user make creative decisions before moving on."*
 * `open_studio` is the whole editor; most decisions are one part. The agent names the part and some of its settings,
 * and the panel builds the controls from the settings list the part already declares (`miniEditor/spec.ts`): the
 * agent's "custom editor" is the choice of what to show, never HTML of its own.
 *
 * ## The rulings it keeps (CCN-008)
 *
 * - **R1, one live panel.** The panel takes Studio's live-panel slot (`/api/panel`, the newest call wins), so a mini
 *   editor in a new message quiets the Studio in an older one, and an `open_studio` after it quiets the mini editor.
 * - **R2, never lost.** Every call writes `.nodegx/mini-editors/<id>.json` (`miniEditor/records.ts`); `reopen` draws
 *   it again, with what the person already changed; `get_mini_editor` lists and reads them.
 * - **R4, 3D.** A three-kit part is staged in its Scene with everything else hidden and the game paused.
 *
 * ## What it is careful about
 *
 * - **Both resources are valid before anything runs** (Desktop prefetches, CCN-001 s7): the page is the same for every
 *   call and asks the proxy for the editor named in the tool result.
 * - **The person's changes are the person's** (`miniEditor/http.ts`): written outside the agent's store, so
 *   `what_changed_since` reports them.
 * - **Not held.** A hold stops the agent's work; showing the person a question and reading their answer is how the
 *   agent asks "what did you see?", and neither writes the app (`HOLD_EXEMPT`).
 *
 * @module tools/miniEditor
 */

import { randomUUID } from 'crypto';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { clientRendersApps, consumeUiToolProxied } from '../clientApps';
import { ToolError } from '../errors';
import { miniEditorRoutes } from '../miniEditor/http';
import { miniEditorPage } from '../miniEditor/panelSource';
import { listRecords, newMiniEditorId, readRecord, summarise, updateRecord, writeRecord, type MiniEditorRecord } from '../miniEditor/records';
import { currentValues, resolveMiniEditor, type MiniEditorInput } from '../miniEditor/spec';
import type { ProjectBinding } from '../project/ProjectBinding';
import { ProjectStore } from '../project/ProjectStore';
import { ensureStudio, findStudio } from '../studio/studioProcess';
import type { StudioProxy } from '../studio/studioProxy';
import { openInBrowser, studioResourceMeta } from './openStudio';
import { guarded, jsonResult } from './util';

export const MINI_EDITOR_RESOURCE_URI = 'ui://nodegx/mini-editor.html';
const MIME = 'text/html;profile=mcp-app';

const setting = z.object({
  port: z.string().min(1).describe('The setting (port name) to show, e.g. "backgroundColor", "fontSize", "colour".'),
  node: z.string().optional().describe('The node that has it, by id or label. Default: the node shown.'),
  component: z.string().optional().describe('The component that node is in. Default: show.component.'),
  label: z.string().max(40).optional().describe('What the person reads, e.g. "Button colour".'),
  choices: z.array(z.unknown()).max(24).optional().describe('Only these values (e.g. three colour tokens).'),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional()
});

function holdingPage(words: string): string {
  return (
    '<!doctype html><meta charset="utf-8"><body style="margin:0;padding:16px;font:14px/1.5 system-ui,sans-serif">' +
    `<p>${words.replace(/[<&]/g, (c) => (c === '<' ? '&lt;' : '&amp;'))}</p>`
  );
}

function controlsForAgent(record: MiniEditorRecord): Array<Record<string, unknown>> {
  return record.controls.map((c) => ({ label: c.label, node: c.node, port: c.port, control: c.control, value: c.value }));
}

export function registerMiniEditorTools(rec: McpServer, server: McpServer, binding: ProjectBinding, proxy?: StudioProxy): void {
  if (proxy) proxy.setOwnRoutes(miniEditorRoutes(() => binding.projectDir, () => proxy.origin).handle);

  server.registerResource(
    'NodeGX mini editor',
    MINI_EDITOR_RESOURCE_URI,
    {
      title: 'NodeGX mini editor',
      description: 'One part of the app, live, with the settings the agent chose for the person. Rendered by show_mini_editor.',
      mimeType: MIME,
      _meta: studioResourceMeta(proxy?.origin ?? null)
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: MIME,
          text: proxy
            ? miniEditorPage(proxy.origin, '', false)
            : holdingPage('The mini editor needs the NodeGX server started from its command line (it serves the panel).'),
          _meta: studioResourceMeta(proxy?.origin ?? null)
        }
      ]
    })
  );

  rec.registerTool(
    'show_mini_editor',
    {
      title: 'Show the person options for one part of the app, live: the real part, not a mock-up',
      description:
        'Show the person one part of the app (a button, a hero, a card, a 3D model) live, with only the settings you ' +
        'choose for them, a question, and Approve / Not that (kind "approve") or Done ("tweak"). Use it whenever the ' +
        'person asks for options or should decide something before you build on it: the look of a sample button, a ' +
        'section, each 3D model in turn. Never draw the options as HTML, a widget or an artifact instead: that is a ' +
        'picture, not their app, and what they pick there changes nothing. The controls come from the part\'s own settings; you choose which, with labels, choices and ranges. ' +
        'variants: up to 3 named sets of values the person switches between and picks from. It replaces Studio in the ' +
        'conversation (one live panel): a turn that ends with one needs no open_studio. Call it as the LAST call of your turn, say in a sentence what to look at, and ' +
        'stop: their answer arrives as their next message ("Approved: …"), and get_mini_editor reads it any time. ' +
        'reopen: an earlier editor\'s id, to show it again (they asked for it back, or answered something else first).',
      inputSchema: {
        title: z.string().max(60).optional().describe('What it is, e.g. "The hero". Required unless reopen.'),
        ask: z.string().max(300).optional().describe('The question, e.g. "Is this the hero you want?". Required unless reopen.'),
        kind: z.enum(['approve', 'tweak']).optional(),
        show: z
          .object({
            component: z.string().describe('The component, e.g. "/Pages/Home" or "/Components/Hero".'),
            node: z.string().optional().describe('The node to show, by id or label. Default: the component itself, as placed.')
          })
          .optional(),
        settings: z.array(setting).max(12).optional(),
        variants: z
          .array(
            z.object({
              name: z.string().max(30),
              values: z.record(z.unknown()).describe('"<node>.<port>" (or "<port>") → value, for settings listed above.')
            })
          )
          .max(3)
          .optional(),
        reopen: z.string().optional().describe('An earlier mini editor\'s id: show it again, with its state.')
      },
      _meta: { ui: { resourceUri: MINI_EDITOR_RESOURCE_URI }, 'ui/resourceUri': MINI_EDITOR_RESOURCE_URI }
    },
    guarded(async (args: Partial<MiniEditorInput> & { reopen?: string }) => {
      const dir = binding.require().projectDir;
      const store = new ProjectStore(dir);
      let record: MiniEditorRecord;
      if (args.reopen !== undefined) {
        const found = readRecord(dir, args.reopen);
        if (!found) {
          const have = listRecords(dir).slice(0, 10).map((r) => `${r.id} "${r.title}"`);
          throw new ToolError('not-found', `No mini editor ${args.reopen} in this project.${have.length ? ` Stored: ${have.join(', ')}.` : ' None is stored.'}`);
        }
        // A part may have moved since: resolve the arguments again, and keep the stored controls if they no longer resolve.
        let refreshed = found;
        try {
          const again = resolveMiniEditor(store, found.input);
          refreshed = updateRecord(dir, found.id, (r) => {
            r.stage = again.stage;
            r.controls = again.controls;
            r.variants = again.variants;
          }) ?? found;
        } catch {
          /* drawn as stored; the panel says what it cannot find */
        }
        record = refreshed;
      } else {
        if (!args.title || !args.ask || !args.show || !args.settings || args.settings.length === 0) {
          throw new ToolError(
            'invalid-argument',
            'A new mini editor needs title, ask, show {component, node?} and at least one of settings [{port, node?, label?}] — or reopen with an earlier id.'
          );
        }
        const input: MiniEditorInput = {
          title: args.title,
          ask: args.ask,
          kind: args.kind ?? 'approve',
          show: args.show,
          settings: args.settings,
          ...(args.variants ? { variants: args.variants } : {})
        };
        const resolved = resolveMiniEditor(store, input);
        const now = new Date().toISOString();
        record = {
          id: newMiniEditorId(),
          version: 1,
          createdAt: now,
          updatedAt: now,
          title: input.title,
          ask: input.ask,
          kind: input.kind ?? 'approve',
          input,
          stage: resolved.stage,
          controls: resolved.controls,
          variants: resolved.variants,
          status: 'open',
          changes: {},
          shown: []
        };
        writeRecord(dir, record);
      }

      // The stage needs Studio's preview bundle and runtime, through the proxy. The controls work without it.
      let studio: string | null = null;
      if (findStudio().dir !== null) {
        try {
          const instance = await ensureStudio(dir);
          proxy?.setTarget(instance.origin);
          studio = instance.origin;
        } catch {
          studio = null;
        }
      }

      const url = proxy ? `${proxy.origin}/__nodegx/mini/view.html?id=${record.id}` : null;
      const viaProxy = consumeUiToolProxied('show_mini_editor');
      const rendersApps = clientRendersApps(server) && !viaProxy;
      const openedBrowser = !rendersApps && url ? openInBrowser(url) : false;
      return jsonResult({
        ok: true,
        miniEditorId: record.id,
        // The panel takes the live slot with these (R1): the newest call's panel is the live one.
        panelId: `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`,
        issuedAt: Date.now(),
        title: record.title,
        status: record.status,
        reopened: args.reopen !== undefined,
        onScreen: rendersApps ? 'in the conversation' : openedBrowser ? 'in the browser' : url ? 'not yet' : 'nowhere (no proxy)',
        url,
        stage: record.stage.nodeName,
        settings: controlsForAgent({ ...record, controls: currentValues(store, record.controls) }),
        ...(record.variants.length ? { variants: record.variants.map((v) => v.name) } : {}),
        ...(studio === null ? { preview: 'NodeGX Studio is not available, so the panel shows the settings without the live part.' } : {}),
        note:
          (rendersApps
            ? 'The mini editor is in the conversation, and the Studio panel in an older message has gone quiet. '
            : openedBrowser
              ? `The mini editor opened in the person's browser at ${url}. `
              : url
                ? `Tell the person to open ${url}. `
                : '') +
          (viaProxy ? 'You reached it through call_tool, so no panel was drawn: call show_mini_editor by name next time. ' : '') +
          'Say in one sentence what to look at and what to decide, then END YOUR TURN: the person decides in the ' +
          'panel and their answer arrives as their next message. If their next message is about something else, ' +
          `answer it and offer this editor again (reopen "${record.id}"). Read their answer with get_mini_editor.`
      });
    })
  );

  rec.registerTool(
    'get_mini_editor',
    {
      title: 'What did the person decide in a mini editor?',
      description:
        'Read a mini editor: its status (open, approved, not-that, done), the settings the person changed and their ' +
        'note. With no id: every mini editor in this project, newest first, to find one to show again (reopen).',
      inputSchema: { id: z.string().optional() }
    },
    guarded(async (args: { id?: string }) => {
      const dir = binding.require().projectDir;
      if (args.id === undefined) {
        const all = listRecords(dir);
        return jsonResult({
          miniEditors: all.slice(0, 30).map(summarise),
          ...(all.length > 30 ? { omitted: all.length - 30 } : {}),
          note:
            all.length === 0
              ? 'No mini editor has been shown in this project.'
              : 'To show one again: show_mini_editor({ reopen: "<id>" }). An open one has not been answered yet.'
        });
      }
      const record = readRecord(dir, args.id);
      if (!record) throw new ToolError('not-found', `No mini editor ${args.id} in this project. get_mini_editor() lists them.`);
      const controls = currentValues(new ProjectStore(dir), record.controls);
      return jsonResult({
        ...summarise(record),
        ask: record.ask,
        settings: controls.map((c) => ({ label: c.label, node: c.node, port: c.port, value: c.value })),
        note:
          record.status === 'open'
            ? `Not answered yet. Offer it again with show_mini_editor({ reopen: "${record.id}" }) when the person is ready.`
            : record.status === 'not-that'
              ? 'They said not that: build what their note says (or ask), then show it again.'
              : 'Build on their decision. Their changes are already in the project files: re-read the component before you change it.'
      });
    })
  );
}
