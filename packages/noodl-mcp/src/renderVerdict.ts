/**
 * VIB-007 M1 — the completion verdict: **has anybody looked at this page, and
 * was it clean when they did?**
 *
 * ## Why this exists
 *
 * Doctrine §11 already says *"you have not finished until you have looked at
 * it"*, `render_report` exists, `apply_plan` even renders on its own — and
 * nothing in the server has ever been able to answer "is this done?". The
 * render's numbers were **appended to a response whose top-level shape said
 * success**, which is the same failure one level up as the render report that
 * said *"Rendered clean: 83 texts, 10 images"* over content nobody could reach.
 *
 * VIB-007 §3 M1 is the mechanism, and the phase's own control is why it is not
 * another paragraph: register **V17** is a session that shipped the trap V1
 * describes *after reading V1*. A rule that is prose loses to a rule that is a
 * state the door reports.
 *
 * ## 🔴 What "refuses" means here, and what it deliberately does NOT mean
 *
 * This refuses to **certify**, never to **write**. Refusing the write was the
 * first design and it is wrong on M1's own argument: M1 exists because *"a model
 * is mediocre at one-shot taste and good at iterating against a signal"*, and a
 * door that will not save a page until it renders clean destroys exactly the
 * loop it was built to create — you cannot fix what you were not allowed to
 * write. So writes stay open, looking becomes unavoidable, and **done** becomes
 * a thing only a clean render can produce.
 *
 * ## The blocking family is measured, not chosen
 *
 * `nodegx-render-measure` already grades its own findings, and the five it calls
 * `error` are exactly the five that mean the page is not finished: a blank
 * render, a repeater that built no rows, a text still showing a node-type
 * default, a broken image, and content nobody can reach. Everything at `warning`
 * (flat type scale, minimum layout width, empty decorated box, console error) is
 * reported and does not block. Restating that list here would be a second copy
 * to drift; the predicate is the severity.
 *
 * 🔴 **An unmeasured page is not a clean page.** `render-report.js` already
 * refuses to let a summary out-claim its coverage; the verdict follows it. A
 * routed page the harness could not address is a page nobody looked at, and
 * "done" over it would be the AWP-004 defect wearing this module's face.
 *
 * 🔴 **Except a page whose address takes a parameter (P112-OWN026-ROUTEPARAMNOTDONE).** `tables/{childId}` needs
 * a value the harness has no way to choose, so nothing an agent changes in that page can ever make it measured:
 * "NOT DONE … Fix them" over it asked for a change to a working design, and Large 4 read the same line from three
 * renders. It is still named on every verdict — never dropped, never called clean — with the one tool that can
 * reach it: drive_page, tapping through from the page that opens it, or a `navigate` step with a real value.
 *
 * ## State: in memory, and strict when it knows nothing
 *
 * The ledger is per server session and writes **nothing into the project** —
 * opening a project already writes three files and this is not owed a fourth.
 * The consequence is deliberate: a fresh session over a finished project reports
 * `done: false, reason: 'no render yet'`, which is the honest epistemic state
 * (the server genuinely has not looked) and costs eight seconds to clear.
 *
 * Staleness is decided by a **content signature**, not by remembering which
 * tools were called: the editor and a human with a text editor both write to the
 * same files, and a ledger that trusted its own bookkeeping would certify a page
 * that changed underneath it.
 *
 * @module noodl-mcp/renderVerdict
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { callHint, clientProfile } from './clientProfile';
import type { RenderFindingPayload, RenderReportPayload } from './render';

/**
 * VIB-007 M3 — the poverty family, read from the measurement package rather
 * than restated. `isPovertyFinding` is the only thing that decides which codes
 * mean *"whole, and a default template"*, and a second copy of that list here
 * would be right today and wrong the first time a fourth one ships.
 *
 * ⚠️ Required rather than imported for the reason the rest of this package
 * reaches `render-report.js` that way: the harness resolves through the
 * workspace and has no build step.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { isPovertyFinding } = require('@nodegx/render-measure') as {
  isPovertyFinding: (f: { code?: string } | null | undefined) => boolean;
};

/** One routed page the render could not measure, and why. */
export interface UnmeasuredPage {
  component: string;
  reason: string;
  /** The page's address, on a page left out only because it takes a route parameter. */
  urlPath?: string;
}

/**
 * The answer to "is this done?" — and, when it is not, everything needed to make
 * it done without another call.
 */
export interface RenderVerdict {
  done: boolean;
  /** Error-severity render findings. Empty on a done verdict, by construction. */
  blocking: RenderFindingPayload[];
  /** Routed pages nobody looked at. Empty on a done verdict, by construction. */
  unmeasuredPages: UnmeasuredPage[];
  /**
   * P112-OWN026-ROUTEPARAMNOTDONE — routed pages the render could not open because their address takes a
   * parameter. They do not block (no change to the page can make them renderable), and they are named on a done
   * verdict too, because a render that never opened them has not looked at them.
   */
  parameterPages: UnmeasuredPage[];
  /**
   * VIB-007 M3 — findings that say the page is **whole and worth nothing to
   * look at**: one ground end to end, no imagery or iconography, no display
   * type. README §2's WordPress-starter tells, measured.
   *
   * 🔴 **Present on a `done: true` verdict, and that is the whole point.** These
   * do not block — they are `warning`, and README §2 exempts app-chrome pages
   * from the marketing tells they encode, so refusing to certify a settings page
   * would be this instrument being confidently wrong. But a verdict that said
   * *"Rendered, and the render is clean"* about a page measuring as a default
   * template would be the AWP-004 defect wearing this module's face for the
   * second time: a summary out-claiming what was actually established. All nine
   * VIB-001 baseline pages render clean.
   */
  poverty: RenderFindingPayload[];
  /** One sentence, written to be read by a model that has nothing else. */
  reason: string;
}

/** What the ledger knows about the project as it stands on disk right now. */
export interface RenderState extends RenderVerdict {
  /** Was any render at all taken of the project in its current state? */
  looked: boolean;
}

/**
 * A render report as the pages half of it actually arrives.
 *
 * ⚠️ `RenderReportPayload` does not declare `pages` — the field is produced by
 * `render-report.js` (UNI-010 §8.2) and passes through the JSON untyped. Read
 * defensively rather than asserted: a report without it is an older harness, and
 * the right answer to "which pages were skipped" from one is *none reported*,
 * not a crash.
 */
interface PagesBearingReport {
  pages?: Array<{ component?: string; measured?: boolean; unreachable?: string; urlPath?: string }>;
}

export function blockingFindings(report: RenderReportPayload): RenderFindingPayload[] {
  return (report.findings ?? []).filter((f) => f.severity === 'error');
}

export function povertyFindings(report: RenderReportPayload): RenderFindingPayload[] {
  return (report.findings ?? []).filter((f) => isPovertyFinding(f));
}

/** render-report.js's own test for an address it has no value for (`routedPages`). */
const takesParameter = (urlPath: unknown): urlPath is string => typeof urlPath === 'string' && /[{}]/.test(urlPath);

function skippedPages(report: RenderReportPayload): NonNullable<PagesBearingReport['pages']> {
  const pages = (report as RenderReportPayload & PagesBearingReport).pages;
  if (!Array.isArray(pages)) return [];
  return pages.filter((p) => p && p.measured === false);
}

/** Routed pages the render could not measure for a reason a change to the project can fix. */
export function unmeasuredPages(report: RenderReportPayload): UnmeasuredPage[] {
  return skippedPages(report)
    .filter((p) => !takesParameter(p.urlPath))
    .map((p) => ({ component: p.component ?? '(unnamed page)', reason: p.unreachable ?? 'not measured' }));
}

/** P112-OWN026-ROUTEPARAMNOTDONE — routed pages left out only because their address takes a parameter. */
export function parameterPages(report: RenderReportPayload): UnmeasuredPage[] {
  return skippedPages(report)
    .filter((p) => takesParameter(p.urlPath))
    .map((p) => ({
      component: p.component ?? '(unnamed page)',
      reason: p.unreachable ?? 'its address takes a route parameter',
      urlPath: p.urlPath
    }));
}

/**
 * What a verdict says about the pages it could not open, so the sentence an agent reads names them and the tool
 * that reaches them instead of asking for a fix (P112-OWN026-ROUTEPARAMNOTDONE).
 */
function parameterNote(pages: UnmeasuredPage[]): string {
  if (pages.length === 0) return '';
  const one = pages.length === 1;
  const example = pages[0].urlPath ?? '';
  const filled = example.replace(/\{([^}]*)\}/g, (_m, name: string) => `<a real ${name || 'value'}>`);
  return (
    ` ${pages.length} ${one ? 'page takes' : 'pages take'} a route parameter, so this render could not open ` +
    `${one ? 'it' : 'them'}: ${pages.map((p) => `${p.component} ("${p.urlPath}")`).join(', ')}. ` +
    `Nothing is wrong with ${one ? 'it' : 'them'} for that, and ${one ? 'it does' : 'they do'} not block; ` +
    `prove ${one ? 'it' : 'them'} with drive_page — tap through from the page that opens ${one ? 'it' : 'them'}, or a ` +
    `{navigate: "/${filled}"} step.`
  );
}

/** Grade one render report. Pure — the ledger decides what to do with it. */
export function verdictFor(report: RenderReportPayload): RenderVerdict {
  const blocking = blockingFindings(report);
  const unmeasured = unmeasuredPages(report);
  const parameterised = parameterPages(report);
  const unopened = parameterNote(parameterised);
  const poverty = povertyFindings(report);
  if (blocking.length === 0 && unmeasured.length === 0) {
    // 🔴 Done and clean are two claims, and M3 is the case where they part
    // company: nothing is broken, and the page reads as a WordPress starter.
    // Saying only the first is what every gate in the product did to all nine
    // baseline pages.
    //
    // 🔴 P112-S13-CLEANWARNINGS: the other warnings are the same case. A page measuring
    // `minimum-layout-width` (it cannot lay out at phone width) came back "the render is
    // clean" over a summary of "0 errors, 2 warnings". They still do not block; they are
    // named, so the one sentence an agent reads does not out-claim the report.
    const codes = [...new Set(poverty.map((f) => f.code))];
    const warned = [
      ...new Set((report.findings ?? []).filter((f) => f.severity === 'warning' && !isPovertyFinding(f)).map((f) => f.code))
    ];
    const alsoWarns = warned.length ? `It also warns: ${warned.join(', ')}. ` : '';
    return {
      done: true,
      blocking,
      unmeasuredPages: unmeasured,
      parameterPages: parameterised,
      poverty,
      reason:
        (poverty.length
        ? `Rendered, and nothing is broken — but it measures as a default template: ${codes.join(', ')}. ` +
          alsoWarns +
          (clientProfile().imagesCostly
            ? 'Nothing here blocks; check it with drive_page before calling it finished.'
            : 'Nothing here blocks; look at the screenshot before calling it finished.')
        : warned.length
          ? `Rendered, and nothing is broken — but it warns: ${warned.join(', ')}. ` +
            'Nothing here blocks; read the warnings before calling it finished.'
          : 'Rendered, and the render is clean.') + unopened
    };
  }
  const parts: string[] = [];
  if (blocking.length > 0) {
    parts.push(
      `${blocking.length} blocking render ${blocking.length === 1 ? 'finding' : 'findings'}: ` +
        blocking.map((f) => `${f.code} (${f.viewport})`).join(', ')
    );
  }
  if (unmeasured.length > 0) {
    parts.push(
      `${unmeasured.length} routed ${unmeasured.length === 1 ? 'page' : 'pages'} nobody looked at: ` +
        unmeasured.map((p) => `${p.component} (${p.reason})`).join('; ')
    );
  }
  return {
    done: false,
    blocking,
    unmeasuredPages: unmeasured,
    parameterPages: parameterised,
    poverty,
    reason: `NOT DONE — ${parts.join('; ')}. Fix them and render again.${unopened}`
  };
}

/** The per-component files whose bytes decide what a render would show. */
const SIGNATURE_FILES = ['component.json', 'nodes.json'];

/**
 * The project-level files in the signature.
 *
 * `nodegx.routes.json` and `components/_registry.json` decide *which* pages
 * render at all; `nodegx.styles.json` decides what every one of them looks like
 * — a preset change repaints the whole app without touching a component, and a
 * verdict blind to it would certify the render of a different-coloured project.
 */
/** Where a project keeps the files a render loads but never parses as a graph. */
const ASSET_SIGNATURE_DIRS = ['assets', 'noodl_modules'];

const PROJECT_SIGNATURE_FILES = [
  'nodegx.project.json',
  'nodegx.routes.json',
  'nodegx.styles.json',
  path.join('components', '_registry.json')
];

/**
 * A hash of everything a render reads.
 *
 * Contents, not mtimes: a copy, a checkout and a formatter all move an mtime
 * without changing a pixel, and the opposite mistake — an edit inside the
 * mtime's resolution — is the one that would certify a page that changed.
 *
 * `routes` and the project file are in it because they decide *which* pages
 * render at all: a page removed from the router is a page the last verdict
 * covered and the next one must not.
 */
export function projectSignature(projectDir: string): string {
  const hash = crypto.createHash('sha1');
  for (const rel of PROJECT_SIGNATURE_FILES) {
    const p = path.join(projectDir, rel);
    if (fs.existsSync(p)) hash.update(rel + '\0' + fs.readFileSync(p));
  }
  const componentsDir = path.join(projectDir, 'components');
  const walk = (dir: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (SIGNATURE_FILES.includes(entry.name)) {
        hash.update(path.relative(projectDir, full) + '\0');
        hash.update(fs.readFileSync(full));
      }
    }
  };
  walk(componentsDir);

  /**
   * The pictures, by metadata rather than by content.
   *
   * 🔴 An asset is part of what a render shows — a `broken-image` finding is
   * fixed by putting the file *there*, not by editing a graph — so a signature
   * blind to `assets/` would keep certifying a page whose photographs had been
   * deleted. It is read as (path, size, mtime) because the starter library alone
   * is 3.32 MB and `validate_project` is called often enough that hashing it
   * would be felt.
   *
   * ⚠️ **The bound, stated rather than papered over**: a replacement of exactly
   * the same size *and* mtime is invisible to this. That is a `touch -r` away
   * and nothing does it by accident; a `cp` moves the mtime.
   */
  for (const dirName of ASSET_SIGNATURE_DIRS) {
    const root = path.join(projectDir, dirName);
    const walkMeta = (dir: string): void => {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walkMeta(full);
        else {
          const st = fs.statSync(full);
          hash.update(`${path.relative(projectDir, full)}\0${st.size}\0${st.mtimeMs}\n`);
        }
      }
    };
    walkMeta(root);
  }

  return hash.digest('hex');
}

/**
 * What a caller is told when the project has changed since the last look — or
 * when there has never been one.
 */
function neverLooked(): string {
  // OWN-019 census #42.
  return (
    'NOT DONE — nothing has rendered this project in its current state, so nobody has looked at it. ' +
    (clientProfile().imagesCostly
      ? `Call ${callHint('render_report')}, then prove it with ${callHint('drive_page')} read steps (a picture ` +
        'that loads is not the right picture, and opening one costs this session its cache).'
      : 'Call render_report (and look at the screenshots: a picture that loads is not a picture of the right thing).')
  );
}

/**
 * The session's memory of what a render said, and of the project it said it
 * about.
 *
 * One instance per server, created in `createServer` and passed to the tools
 * that write and the tools that judge — the same shape as the plan registry, and
 * for the same reason: a module-level singleton would let two servers in one
 * process (which is every test file) certify each other's projects.
 */
export class RenderLedger {
  private last?: { signature: string; verdict: RenderVerdict };

  /** Record what a render found, against the project as it was when it ran. */
  record(projectDir: string, report: RenderReportPayload): RenderVerdict {
    const verdict = verdictFor(report);
    this.last = { signature: projectSignature(projectDir), verdict };
    return verdict;
  }

  /**
   * 🔴 Forget the last look, because the project moved under it.
   *
   * Called by the write door. It is belt-and-braces beside the signature — a
   * write this server made is a change this server can see coming — and it earns
   * its place on the one case the signature cannot: a write that lands inside
   * the same second as a render whose report has not come back yet.
   */
  invalidate(): void {
    this.last = undefined;
  }

  /** The state of the project on disk right now, as far as anybody has looked. */
  state(projectDir: string): RenderState {
    if (!this.last) {
      // `poverty: []` here means "nobody measured", not "no poverty" — which is
      // exactly what `looked: false` beside it says. A reader that treats an
      // empty list as a clean bill has read past the field that qualifies it.
      return {
        looked: false,
        done: false,
        blocking: [],
        unmeasuredPages: [],
        parameterPages: [],
        poverty: [],
        reason: neverLooked()
      };
    }
    if (this.last.signature !== projectSignature(projectDir)) {
      return {
        looked: false,
        done: false,
        blocking: [],
        unmeasuredPages: [],
        parameterPages: [],
        poverty: [],
        reason:
          'NOT DONE — the project has changed since the last render, so the last clean reading is about a ' +
          'page that no longer exists. Call render_report again.'
      };
    }
    return { looked: true, ...this.last.verdict };
  }
}
