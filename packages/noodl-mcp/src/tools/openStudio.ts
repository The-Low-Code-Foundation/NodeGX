/**
 * P125 CCN-001 — `open_studio`: the app on the person's screen, beside the conversation, while it is built.
 *
 * ## Why this exists
 *
 * Richard, 2026-10-23: *"sitting and waiting for 45 minutes for a prototype of your app to come out, only to
 * realise the whole thing needs visually changing … is one of my biggest pet peeves."* The point of NodeGX was
 * co-construction: a person and an agent on the same app at the same time. The graph is the one artefact both
 * can write to — an agent through this server, a person through a visual editor — because the project is files
 * with a drift rule, not code that a visual edit would have to be round-tripped into. This tool is where that
 * stops being a sentence: it puts NodeGX Studio, redrawing on every write, where the person already is.
 *
 * ## Two ways on screen, one tool
 *
 * 1. **Inside the conversation** (MCP Apps, SEP-1865). The tool carries `_meta.ui.resourceUri`, and the resource
 *    `ui://nodegx/studio.html` is Studio's `/panel`: studio.html rewritten to run at the host's sandbox origin,
 *    with the bridge (`hosted.js`) that completes the host handshake, routes the page's requests back to Studio
 *    on loopback, and carries the person's controls — HOLD, Release, Full screen, Open in a window. Claude
 *    Desktop renders it when the person clicks Allow. The resource's CSP names Studio's origin, so the page may
 *    fetch and load scripts from it; it names no `frameDomains` (Claude restricts them) — the panel IS Studio,
 *    not a frame around it.
 * 2. **Beside the conversation.** The result carries Studio's URL. A host without MCP Apps (Claude Code, Cline,
 *    Vibe) tells the person to open it, or the agent opens it with `open_in_editor`'s sibling, the browser. Same
 *    Studio, same files, same hold.
 *
 * ## What it is careful about
 *
 * - **Registered in both modes.** A read-only server is exactly the one a person is *watching* with; Studio's own
 *   writes are the person's, not the agent's, and go through Studio's server, not this one.
 * - **The port is the kernel's**, so the CSP cannot be written at registration. The resource is registered with
 *   a holding page and updated (`RegisteredResource.update`) once Studio reports its port; the read callback also
 *   puts the same `_meta` on the content it returns, which is where a host that reads before it lists finds it.
 * - **It starts one Studio per project and never two.** `ensureStudio` keeps the map; a second call is a no-op
 *   that returns the same URL, which is what makes it safe to call every time the agent wants the person looking.
 *
 * @module tools/openStudio
 */

import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { z } from 'zod';

import type { McpServer, RegisteredResource } from '@modelcontextprotocol/sdk/server/mcp.js';

import { clientRendersApps, consumeOpenStudioProxied } from '../clientApps';
import { ToolError } from '../errors';
import { EDITOR_DOWNLOAD } from '../surfaces';
import { HOLD_FILE, mayRelease, oldHoldWords, readHold, RELEASE_AFTER_REFUSAL_MS } from '../hold';
import type { ProjectBinding } from '../project/ProjectBinding';
import * as fs from 'fs';
import * as path from 'path';

import { panelHtml } from '../studio/panelHtml';
import { ensureStudio, findStudio, type StudioInstance, studioFor } from '../studio/studioProcess';
import type { StudioProxy } from '../studio/studioProxy';
import { STUDIO_BURST } from './planTools';
import { guarded, jsonResult } from './util';

export const STUDIO_RESOURCE_URI = 'ui://nodegx/studio.html';
const MIME = 'text/html;profile=mcp-app';
const FONTS = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

/** The resource's `_meta` for a Studio at `origin` — the CSP the panel needs, and nothing it does not. */
export function studioResourceMeta(origin: string | null): Record<string, unknown> {
  return {
    ui: {
      prefersBorder: false,
      csp: origin
        ? { connectDomains: [origin], resourceDomains: [origin, ...FONTS], baseUriDomains: [origin] }
        : { connectDomains: [], resourceDomains: FONTS, baseUriDomains: [] }
    }
  };
}

// A client that does not render MCP Apps — Claude Code, Cline, Vibe, a script somebody wrote around this server —
// gets Studio opened in the browser instead, beside whatever it is (`clientRendersApps`, `../clientApps.ts`).
// Measured 2026-10-23: a Claude Desktop Cowork session connected this server, listed its tools, and then drove a
// second copy from a shell script; nothing it did could have drawn a panel, and the person saw no editor. The URL
// in a result is not "on screen"; a browser window is.

/** The person's browser, on the platform's own opener. `NODEGX_STUDIO_NO_OPEN` keeps a test from opening windows. */
export function openInBrowser(url: string): boolean {
  if (process.env.NODEGX_STUDIO_NO_OPEN) return false;
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  try {
    spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref();
    return true;
  } catch {
    return false;
  }
}

function holdingPage(words: string): string {
  return (
    '<!doctype html><meta charset="utf-8"><body style="margin:0;padding:24px;font:14px/1.5 system-ui,sans-serif;' +
    'background:#0b0e12;color:#c4cedb"><p style="max-width:520px">' +
    words.replace(/[<&]/g, (c) => (c === '<' ? '&lt;' : '&amp;')) +
    '</p>'
  );
}

/**
 * Registers the tool (through the recorder, like every tool) and the resource (on the server itself: the recorder
 * forwards `registerTool` only, and a resource is not a tool to hide or reveal).
 */
/**
 * s7 — the panel from the Studio INSTALL, for a host that reads the resource before any Studio runs. Studio's page
 * is static (it loads the project over `/api/project` at run time), so the install's `editor/studio.html` rewritten
 * to the proxy's origin is the panel, whenever it is read. `null` when Studio is not installed.
 */
function panelFromInstall(origin: string): string | null {
  const found = findStudio();
  if (found.dir === null) return null;
  try {
    return panelHtml(fs.readFileSync(path.join(found.dir, 'editor', 'studio.html'), 'utf8'), origin);
  } catch {
    return null;
  }
}

export function registerOpenStudioTools(rec: McpServer, server: McpServer, binding: ProjectBinding, proxy?: StudioProxy): void {
  let current: StudioInstance | null = null;

  const resource: RegisteredResource = server.registerResource(
    'NodeGX Studio',
    STUDIO_RESOURCE_URI,
    {
      title: 'NodeGX Studio',
      description: 'The app being built, on screen and editable, beside the conversation. Rendered by open_studio.',
      mimeType: MIME,
      _meta: studioResourceMeta(proxy?.origin ?? null)
    },
    async (uri) => {
      // With the proxy (the CLI's server): the install's page at the proxy's origin, valid before Studio exists.
      if (proxy) {
        const text =
          panelFromInstall(proxy.origin) ??
          holdingPage(
            'NodeGX Studio is not installed on this machine (set NODEGX_STUDIO to its folder). ' +
              'The agent can still build; ask it for the app\'s URL once it has rendered something.'
          );
        return { contents: [{ uri: uri.href, mimeType: MIME, text, _meta: studioResourceMeta(proxy.origin) }] };
      }
      const dir = binding.projectDir;
      const live = dir !== undefined ? studioFor(dir) : null;
      const origin = live?.origin ?? current?.origin ?? null;
      let text: string;
      if (origin === null) {
        text = holdingPage(
          dir === undefined
            ? 'No project is open yet. Ask the agent to create or open one; Studio appears here once it has.'
            : 'Studio is not running for this project. Ask the agent to call open_studio.'
        );
      } else {
        try {
          const res = await fetch(`${origin}/panel`);
          if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
          text = await res.text();
        } catch (err) {
          text = holdingPage(`Studio at ${origin} did not answer (${(err as Error).message}). Ask the agent to call open_studio again.`);
        }
      }
      return { contents: [{ uri: uri.href, mimeType: MIME, text, _meta: studioResourceMeta(origin) }] };
    }
  );

  rec.registerTool(
    'open_studio',
    {
      title: 'Put the app on the person’s screen, beside this conversation',
      description:
        'Start NodeGX Studio for the open project and show it to the person: the running app, editable, redrawing ' +
        'on every component you write. In a host that renders MCP Apps (Claude Desktop) it appears inside the ' +
        'conversation; elsewhere the result carries the URL to open beside it. Call it as soon as a project is open ' +
        'and before you build a page, so the person watches the app come together instead of waiting for it. ' +
        'The panel lives in the message whose call drew it and the person reads the newest message, so call it ' +
        'ONCE per turn, as the turn\'s FIRST call, in every turn in which you change the app: never again later in ' +
        'the same turn and never to finish it, because each call draws another Studio in the conversation. ' +
        'Studio has a HOLD button: while it is pressed, every write you make is refused with code `held` — stop and ' +
        'ask them what they saw. A later call starts no second Studio: the same one answers, at the same URL. ' +
        // P128 S1 (CCN-009) — the other surfaces, one clause (a deferred tool: 0 resident tokens).
        'One decision is a mini editor (show_mini_editor); a part Studio does not edit (a States node, a script) ' +
        `is in the NodeGX editor (open_in_editor; ${EDITOR_DOWNLOAD}): say so, get_project_info section "surfaces".`,
      inputSchema: {},
      _meta: { ui: { resourceUri: STUDIO_RESOURCE_URI }, 'ui/resourceUri': STUDIO_RESOURCE_URI }
    },
    guarded(async () => {
      // BST-001 — the one no-project refusal lives in ProjectBinding.require(); nothing here words its own.
      const dir = binding.require().projectDir;
      const found = findStudio();
      if (found.dir === null) throw new ToolError('not-found', found.reason);
      let instance: StudioInstance;
      try {
        instance = await ensureStudio(dir);
      } catch (err) {
        throw new ToolError('io-error', `Studio could not start: ${(err as Error).message}`);
      }
      if (proxy) proxy.setTarget(instance.origin);
      if (!proxy && (!current || current.origin !== instance.origin)) {
        current = instance;
        resource.update({
          metadata: {
            title: 'NodeGX Studio',
            description: `The app in ${dir}, on screen and editable, beside the conversation.`,
            mimeType: MIME,
            _meta: studioResourceMeta(instance.origin)
          }
        });
      }
      const hold = readHold(dir);
      // CCN-006 — through the proxy when there is one: the page then carries the companion, which offers the
      // desktop app when this server goes away (studio/companion.ts), and survives a restart on the same port.
      const url = `${proxy ? proxy.origin : instance.origin}/`;
      // A proxied call (through call_tool) draws no panel even in a host that renders them: the browser, then.
      const viaProxy = consumeOpenStudioProxied();
      const rendersApps = clientRendersApps(server) && !viaProxy;
      const openedBrowser = rendersApps ? false : openInBrowser(url);
      return jsonResult({
        ok: true,
        url,
        panel: STUDIO_RESOURCE_URI,
        // P125-PUPPY2-THREEPANELS — which panel this call drew, read by Studio's bridge from this result: the newest
        // call's panel is the live one and every older panel in the conversation goes quiet (editor/hosted/hosted.js).
        panelId: `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`,
        issuedAt: Date.now(),
        onScreen: rendersApps ? 'in the conversation' : openedBrowser ? 'in the browser, beside the conversation' : 'not yet',
        projectDir: dir,
        hold: hold.held ? hold : undefined,
        note:
          (rendersApps
            ? 'Studio is inside this conversation. '
            : openedBrowser
              ? `Studio opened in the person's browser at ${url}. `
              : `Tell the person to open ${url} in a browser: Studio is there. `) +
          // P125 CCN-002 — a hold older than a day is said, with how old it is (`hold.ageHours` in the answer).
          (hold.held ? oldHoldWords(hold) : '') +
          // P125-PUPPY2 — open_studio is the first call of a turn that changes the app, so this is where the agent
          // reads that the person's new message can be the release.
          (hold.held
            ? 'The person has HOLD on. If their newest message asks you to change the app, that is their release: ' +
              'call release_hold with their words, then what_changed_since, then build. If it does not ask for a ' +
              'change (a question, a complaint), answer it and leave the hold on. '
            : '') +
          (viaProxy
            ? 'You reached open_studio through call_tool, so the host drew no panel; next time call open_studio by ' +
              'its own name and Studio appears inside the conversation. '
            : '') +
          // P125-PUPPY-ONEAPPLY — the order that fills the screen part by part. Leaves first and the page last (the
          // order for a build nobody watches) shows nothing until the end: a section appears only once a page places it.
          'The person sees each write as it lands, so build in the order that fills their screen: first the page ' +
          'with its Page node and nothing on it, then one section at a time, each created AND placed on the page in ' +
          'the same apply (a plan holds at most ' + STUDIO_BURST + ' components while Studio is open), with a line ' +
          'saying what appeared. A write refused with code `held` means they pressed HOLD — stop and ask. ' +
          'This panel stays where it is for the rest of this turn: do not call open_studio again until the next ' +
          'turn that changes the app, and then call it first. ' +
          // P125 CCN-008 — a result field (free on the surface gate): the door to the smaller panel, where it is used.
          'When the person should decide one part before you go on (a button\'s look, a section, a 3D model), end the ' +
          'turn with show_mini_editor: that part alone, live, with the settings you choose and Approve / Not that.'
      });
    })
  );

  // P125-PUPPY2 (Richard, 2026-10-24): the person's next message asking for a change lifts their hold. Exempt from
  // the hold (`HOLD_EXEMPT`); guarded by `mayRelease`, which refuses in the turn the hold stopped. Lifted through
  // Studio when it runs, so its HOLD button flips and says the agent lifted it, and with which words.
  rec.registerTool(
    'release_hold',
    {
      title: 'Lift the person’s HOLD because their newest message asks for a change',
      description:
        'Lift the HOLD the person pressed in Studio, only because their newest message asks you to change the app. ' +
        'Pass their words. Refused within 30 seconds of a call the hold refused: never in the turn it stopped you.',
      inputSchema: {
        words: z.string().min(1).describe('The person’s newest message, or the part of it asking for the change, verbatim.')
      }
    },
    guarded(async (args: { words: string }) => {
      const dir = binding.require().projectDir;
      const may = mayRelease(dir);
      if (!may.released && may.reason === 'not-held') {
        return jsonResult({ ok: true, released: false, note: 'There is no hold on this project: build.' });
      }
      if (!may.released) {
        throw new ToolError(
          'held',
          `Not lifted: the hold refused one of your calls ${may.secondsAgo} seconds ago, so this is the turn it ` +
            `stopped (the guard is ${RELEASE_AFTER_REFUSAL_MS / 1000} seconds). Stop, tell the person what you were ` +
            'doing, and ask what they saw. Their next message can be the release.'
        );
      }
      const words = args.words.trim().slice(0, 300);
      const studio = studioFor(dir);
      let viaStudio = false;
      if (studio) {
        try {
          const r = await fetch(`${studio.origin}/api/hold`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ held: false, by: 'agent', words })
          });
          viaStudio = r.ok;
        } catch {
          /* Studio gone: the file below */
        }
      }
      const file = path.join(dir, HOLD_FILE);
      if (fs.existsSync(file)) fs.rmSync(file);
      return jsonResult({
        ok: true,
        released: true,
        heldSince: may.hold.at,
        note:
          (viaStudio
            ? `Lifted. Studio shows the person that you lifted it, with their words: "${words}". `
            : 'Lifted (Studio is not running, so the person sees it only in what you say). ') +
          'Say in your answer that you lifted their hold because they asked for this change. Call ' +
          'what_changed_since before you write: they may have edited the app in Studio while it was held.'
      });
    })
  );
}
