/**
 * `render_report` — the feedback loop as a tool (LAS-005, audit F5).
 *
 * Read-only and registered unconditionally, like the other read tools: looking
 * at a project changes nothing about it, and a read-only server is exactly where
 * "is this page actually right?" gets asked.
 *
 * It returns two things, and the second is the point. The JSON report is what a
 * text-only agent can act on — 29 elements rendering the word "Text", five of
 * five images failed, a four-item grid stacked in one column at 1280px. The
 * screenshots are what a multimodal one can *look* at, which is the only fix a
 * wrong-subject image will ever have: the audit's strong model curl-verified
 * sixteen image URLs and still shipped a photograph of a motorcycle for a bud
 * vase, because HTTP 200 is not looking.
 *
 * @module noodl-mcp/tools/renderTools
 */

import * as path from 'path';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';


import { clientProfile } from '../clientProfile';
import type { ProjectBinding } from '../project/ProjectBinding';
import type { ProjectStore } from '../project/ProjectStore';
import { runDrivePage, runRenderReport, type RenderReportPayload } from '../render';
import type { RenderLedger } from '../renderVerdict';
import { guarded, type ToolResult } from './util';

/**
 * A screenshot scale above this stops being a picture an agent can hold and
 * starts being a transport problem — a full page at 1280px wide and 4000px tall
 * is ~500KB of PNG at 0.5.
 */
const MAX_SCALE = 1;
const MIN_SCALE = 0.1;

export function registerRenderTools(
  server: McpServer,
  binding: ProjectBinding,
  ledger: RenderLedger,
  options: { screenshotsToFiles?: boolean } = {}
): void {
  server.registerTool(
    'render_report',
    {
      title: 'Render report',
      description:
        'Render this project headless, measure the result and return the numbers AND the screenshots. ' +
        'Use it after applying a plan and before saying the work is done — a graph is a claim, a render is ' +
        // AWP-006 §1's third lever: the per-viewport enumeration and the
        // prerequisite prose were ~450 characters resent every turn to say what
        // the response and the error message already say at the moment they
        // matter. The two sentences that change behaviour — call it, and look at
        // the pictures — are kept in full.
        // FLD-011 — two edits, both forced by measurement rather than taste.
        //
        // "Takes ~8s" was calibrated against the fixed settle timers and this task removed them:
        // a one-page project now measures at ~2.1s and an eleven-page one at ~10.3s. A cost
        // sentence that is wrong by 4x is worse than none, because it is what an agent budgets by.
        //
        // And the enumeration is shortened to its categories, which is AWP-006's own principle
        // applied to the clause it left standing: the response names every rule it ran, in full, at
        // the moment that matters. 🔴 It is shortened rather than dropped because `out_dir` below
        // had to be paid for — the resident surface had **7 tokens of headroom** at HEAD against
        // toolDisclosure's 8280 budget, and a new parameter costs more than that. See the register.
        'evidence. Measures layout, text, images and empty boxes per viewport; ~2s a page. ' +
        // OWN-019 census #19 — the same warning, with the evidence a Mistral model can afford.
        (clientProfile().imagesCostly
          ? 'PROVE WHAT IT SHOWS: a picture that loads is not the right picture — drive_page read steps (text, a ' +
            'computed style) check it without an image; open a screenshot file once, at the end.'
          : 'LOOK AT THE SCREENSHOTS: a picture that loads is not a picture of the right thing, and no number can ' +
            'tell you it is the wrong one.'),
      inputSchema: {
        viewports: z
          .string()
          .optional()
          .describe('Comma-separated: "desktop,768x1024,phone" (the default) or explicit sizes like "1440x900,390x844"'),
        screenshot: z
          .enum(['full', 'viewport', 'none'])
          .optional()
          .describe('full (default) captures the whole page — the fold is where defects hide; none skips images'),
        scale: z
          .number()
          .optional()
          .describe('Screenshot scale, 0.1–1 (default 0.4). Raise it to read small text in the image.'),
        backend_port: z
          .number()
          .optional()
          .describe('Port of this project’s running backend, so data-driven sections render their rows'),
        page: z
          .string()
          .optional()
          .describe('Measure only this page, by urlPath ("quiz"). Default: every page the router registers'),
        out_dir: z
          .string()
          .optional()
          // Deliberately terse, and the doctrine is NOT repeated here: this string is resent on
          // every turn, while the response's manifest says "READ the ones you need" only to the
          // caller who actually asked for files. Paying for the instruction in the schema would
          // charge every conversation for a feature most of them never use.
          .describe('Write screenshots here and return their paths instead of the images.')
      }
    },
    guarded(
      async (args: {
        viewports?: string;
        screenshot?: 'full' | 'viewport' | 'none';
        scale?: number;
        backend_port?: number;
        page?: string;
        out_dir?: string;
      }): Promise<ToolResult> => {
        const scale = args.scale === undefined ? undefined : Math.min(MAX_SCALE, Math.max(MIN_SCALE, args.scale));
        const projectDir = binding.require().projectDir;
        // Resolved here, once, against this server's cwd — and the SAME resolved string is both
        // what the CLI is handed and what the caller is told, so the path in the response is the
        // path on disk rather than a relative fragment the caller would have to guess the base of.
        // P112 OWN-018 s2 — with the server's --screenshots-to-files, no `out_dir` means the project's own
        // .previews/render rather than images in the response (see ServerOptions.screenshotsToFiles).
        const outDir =
          args.out_dir !== undefined
            ? path.resolve(args.out_dir)
            : options.screenshotsToFiles && args.screenshot !== 'none'
              ? path.join(projectDir, '.previews', 'render')
              : undefined;
        const { report, screenshots } = await runRenderReport(projectDir, {
          // P112-OWN019 R39 (Richard, 2026-10-14): three sizes by default (768 portrait, not the named 1024 `tablet`: the middle
          // width is the one a layout breaks at, and 1024 is already the desktop line the layout tells measure at) — a laptop row with a hole in it, or a
          // section that drifts off its axis, is a width problem the phone shot cannot show. The shared measure's
          // DEFAULT_VIEWPORTS stays two (the editor's captures); this is the agent's tool deciding for itself.
          viewports: args.viewports ?? 'desktop,768x1024,phone',
          screenshot: args.screenshot,
          scale,
          backendPort: args.backend_port,
          page: args.page,
          outDir
        });

        // VIB-007 M1 — the look is recorded, so that afterwards something in
        // this server can answer "is it done?". ⚠️ **Only a whole-project render
        // certifies**: a `page`-scoped run is a reading about one page, and
        // `render-report.js` already says so in its own summary rather than
        // letting it out-claim its coverage. Recording it as the project's
        // verdict would launder that reading into the app.
        const verdict = args.page === undefined ? ledger.record(projectDir, report) : undefined;

        return {
          content: [
            // 🔴 Before the JSON, not inside it. The verdict is the sentence the
            // caller must not be able to skim past — a report whose top-level
            // shape reads as success is how "Rendered clean" survived over a
            // page nobody could reach.
            ...(verdict ? [{ type: 'text' as const, text: verdictHeadline(verdict) }] : []),
            { type: 'text', text: JSON.stringify(report) },
            // FLD-011 AC1 — with `out_dir` the harness wrote files and returned no base64, so
            // `screenshots` is empty and the loop below produces nothing. The manifest replaces it,
            // because a caller told only "written to a folder" has to list a directory to find out
            // which file is which page, and the report's own rows already know.
            ...(outDir ? [{ type: 'text' as const, text: screenshotManifest(report, outDir, options.screenshotsToFiles === true) }] : []),
            // Each image is announced before it arrives, because an agent
            // reading a bare image has no way to know which viewport it is.
            ...screenshots.flatMap((shot) => [
              { type: 'text' as const, text: `Screenshot — ${shot.name} (${report.viewports[shot.name]?.requested.width}px wide, full page)` },
              { type: 'image' as const, data: shot.base64, mimeType: shot.mimeType }
            ]),
            // P109 ISL-021 AC6 (s14) — the agent built a form, read this answer four times, then went looking
            // for a browser to script: `drive_page` is deferred, so nothing it could see named it. This answer
            // is where it looks after building, and response text costs no resident tokens.
            { type: 'text' as const, text: firstFrameNote() }
          ]
        };
      }
    )
  );

  /**
   * P109 ISL-021 — "One call, a step list" (ruled 2026-10-04). `render_report` sees the first frame; this
   * presses, types, waits and reads, so an agent can prove a button does something without writing a
   * browser script. Deferred in `explore` (0 resident tokens) and read-only on the project: it renders
   * from disk and writes nothing but the screenshots it is asked for.
   */
  server.registerTool(
    'drive_page',
    {
      title: 'Drive a rendered page',
      description:
        'Render this project from disk in a headless browser, run a list of steps on it, and report one row per ' +
        'step — so you can prove a button, a form or a game WORKS, not just that it draws. Each call is a fresh ' +
        'browser: nothing carries over from the last call. Steps (each an object with one verb): {tap: T}, ' +
        '{type: "text", into?: T, replace?: true} (appends to what the field holds unless replace), {key: "Enter"}, ' +
        '{wait_for: {text|testid|selector|url|expression}, timeout_ms?}, {read: {text: T}|{look: T}|{variable: name}|' +
        '{storage: key}|{url: true}|{stub: path}|{expression}, expect?: value|{contains}} — {look: T} is what a person ' +
        'sees once it settles: {visible, backgroundName: "green", colorName, …}, and its expect names only what ' +
        'matters ({backgroundName: "green"}) — or, as lists so far, ' +
        '{console_errors: true}|{network_errors: true}|{other_origins: true} (expect [] = none yet), {navigate: "/route"}, ' +
        '{viewport: "phone"|"390x844"}, {screenshot: name}, {seed_storage: {key: value}} or {seed_storage: "key", ' +
        'edit: "js changing v"} (applied again on the next load, before the app can overwrite it), ' +
        '{clear_storage: true}, {stub_route: "/api/x", json?, body?, status?} (answers that path itself; put it ' +
        'first to meet a fetch made at boot), {reduced_motion: true|false}, {reload: true} (reload THIS page, as a person ' +
        'does), {watch: {look: T}, for_ms?, expect?: {never: {backgroundName: "green"}}} (every state T showed DURING ' +
        'a change — a look waits for it to settle and misses a moment\'s flash). A target T is {text: "exact label"} or {text_contains} (a field\'s ' +
        'placeholder counts), {testid} (a data-testid set in the node\'s Data Attributes list — NOT its node id) ' +
        'or {selector}; a bare string is exact text. A tap is a real pointer press at the element\'s centre and is ' +
        'REFUSED when something else covers it, naming what a finger would hit; it answers once any scroll it started has ' +
        'stopped (≤2 s). The first failing step stops the run.',
      inputSchema: {
        steps: z
          .array(z.record(z.unknown()))
          .min(1)
          .max(60)
          .describe('The steps, in order. Each is an object with exactly one verb key.'),
        page: z.string().optional().describe('Start on this page (its route, e.g. "island"); default the start page.'),
        viewport: z.string().optional().describe('"desktop" (default), "phone" or WIDTHxHEIGHT.'),
        out_dir: z.string().optional().describe('Where screenshot steps write their PNGs.'),
        backend_port: z.number().int().optional().describe('Proxy /__backend to a running backend on this port.')
      }
    },
    guarded(
      async (args: {
        steps: Array<Record<string, unknown>>;
        page?: string;
        viewport?: string;
        out_dir?: string;
        backend_port?: number;
      }): Promise<ToolResult> => {
        const projectDir = binding.require().projectDir;
        const result = await runDrivePage(projectDir, args.steps, {
          page: args.page,
          viewport: args.viewport,
          outDir:
            args.out_dir !== undefined
              ? path.resolve(args.out_dir)
              : options.screenshotsToFiles
                ? path.join(projectDir, '.previews', 'drive')
                : undefined,
          backendPort: args.backend_port
        });
        const failed = result.steps.find((r) => !r.ok);
        // The verdict before the JSON, as render_report's is: a caller must not be able to skim past it.
        const headline =
          result.verdict === 'passed'
            ? `PASSED — ${result.of} of ${result.of} steps.`
            : `FAILED at step ${failed?.n ?? result.ran} (${failed?.do ?? '?'}): ${failed?.error ?? 'stopped'}. ` +
              `${result.ran - 1} of ${result.of} steps passed before it; the rest did not run.`;
        const caveats = [
          result.page.visibilityState !== 'visible' ? `the page was ${result.page.visibilityState} (timers throttle)` : '',
          !result.page.webgl2 ? 'no WebGL2 in this browser (a 3D kit falls back to 2D here)' : '',
          result.consoleErrors.length ? `${result.consoleErrors.length} console error(s)` : '',
          result.networkErrors?.length ? `${result.networkErrors.length} failed request(s)` : ''
        ].filter(Boolean);
        // P112-OWN018-IMAGECACHE (s2, run 8): the agent opened a drive_page screenshot to debug, and every request after
        // it went uncached. Said only where the server was started for such a model, and only when a step wrote one.
        const wroteScreenshot = args.steps.some((step) => step && typeof step === 'object' && 'screenshot' in step);
        const imageNote =
          options.screenshotsToFiles && wroteScreenshot
            ? ' Screenshots are files, not in this answer. Each image you open stays in your conversation and, with ' +
              'some models, leaves every later request uncached until the session is compacted — a read step (the ' +
              'text, a computed style) answers most questions without one.'
            : '';
        return {
          content: [
            { type: 'text', text: headline + (caveats.length ? ` Note: ${caveats.join('; ')}.` : '') + imageNote },
            { type: 'text', text: JSON.stringify(result) }
          ]
        };
      }
    )
  );
}

/**
 * The images that were written, as the one text block that replaces them.
 *
 * Read off the report's OWN rows (`pages[].viewports[].screenshot`, written by `measure-from-disk
 * --out-dir`) rather than by listing the directory: a directory listing would also report files a
 * previous run left there, and a manifest that names a stale image as this run's picture of page
 * four is worse than no manifest. A page whose row carries no path is listed as such, because a
 * missing image and an image nobody mentioned look identical to a caller counting pictures.
 */
function screenshotManifest(report: RenderReportPayload, outDir: string, filesByDefault = false): string {
  const lines: string[] = [];
  let written = 0;
  for (const page of report.pages ?? []) {
    for (const [viewport, row] of Object.entries(page.viewports ?? {})) {
      if (row.screenshot) {
        written += 1;
        lines.push(`  ${page.component ?? '(unnamed page)'} — ${viewport}: ${row.screenshot}`);
      } else {
        lines.push(`  ${page.component ?? '(unnamed page)'} — ${viewport}: (no image)`);
      }
    }
  }
  if (!lines.length) return `No screenshots were written to ${outDir} — this run photographed nothing.`;
  return (
    `${written} screenshot${written === 1 ? '' : 's'} written to ${outDir}, one per measured page per viewport. ` +
    // OWN-019 census #39 — on the Vibe profile the advice leads with what to do instead of opening images.
    (clientProfile().imagesCostly
      ? 'They are NOT in this response. ' + 'Each image you open makes every later request of this session full ' +
        'price, so check what a person sees with drive_page read steps (the text, a computed style) and open ' +
        'one image only at the end, on the page still in doubt.'
      : 'They are NOT in this response — READ the ones you need. A path you never open is not a picture you ' +
        'looked at, and no number in the report above can tell you the page shows the wrong thing.') +
    // P112-OWN018-IMAGECACHE: said only where the server was started for such a model.
    (filesByDefault && !clientProfile().imagesCostly
      ? ' Each image you open stays in your conversation, and with some models every later request then goes ' +
        'uncached until the session is compacted, so open the ones you need, not all of them.'
      : '') +
    '\n' +
    lines.join('\n')
  );
}

/** What `render_report` cannot prove, and the tool that can — appended to every report. */
export function firstFrameNote(): string {
  // OWN-019 census #38 — the note that leads an agent from the first frame to behaviour testing; on a client whose
  // list never changes, revealing does nothing it can see, so it names the call.
  const door = clientProfile().staticToolList
    ? 'call call_tool({ name: "drive_page", arguments: { steps: [...] } }) — call_tool({ name: "drive_page", describe: true }) shows the steps it takes'
    : 'call find_tools({ query: "press" }) to reveal drive_page and send it a list of steps';
  return (
    'This report is the FIRST FRAME only: nothing was pressed, typed or waited for. To prove a button, form or ' +
    'game WORKS (tap, type, wait, read a Variable or what was saved), ' + door + ' — no browser script needed.'
  );
}

/** The verdict as the one line a caller reads first. */
function verdictHeadline(verdict: { done: boolean; reason: string }): string {
  return verdict.done ? `DONE — ${verdict.reason}` : verdict.reason;
}
