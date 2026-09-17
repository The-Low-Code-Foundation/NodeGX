/**
 * CHR-004 — the look gate, run against a live editor.
 *
 * Collection happens in the renderer (`lib/collect.js`, serialised into one `Runtime.evaluate`);
 * judgement happens here in Node (`lib/audit.js` over the records, `lib/scale.js` over the two
 * stylesheets that define the ramps). Splitting it that way is what keeps the half that decides
 * anything gradeable without a browser — `tests-unit/chr-004/` grades both halves, 37 specs, and
 * ten mutants of them are red.
 *
 * What it replaces: eight `*-control-borders` specs that open a stylesheet as text and assert
 * which token a fill uses. They stop a regression and they also stop a redesign. This asks the
 * question NAT-001 actually ruled on — what is the ratio a person sees — and it does not know or
 * care which token delivered it.
 *
 *   NOODL_REMOTE_DEBUG_PORT=9333 node scripts/look-gate/run.js --surface=property-panel
 *   NOODL_REMOTE_DEBUG_PORT=9333 node scripts/look-gate/run.js --surface=launcher --theme=both
 *   … --json=<path>   write the full findings + population
 *
 * Exit status is the gate: 0 when there are no findings, 1 when there are, 2 when it could not
 * measure at all. 🔴 Gate on the exit status, never on the last line of the log.
 *
 * ## 🔴 What build are you measuring?
 *
 * This attaches to whatever is listening on the CDP port, and **a reading is about the build that
 * is running, not about the tree you have checked out.** The packaged `/Applications/NodeGX.app`
 * is a fine subject — it needs no compile and it cannot disturb a peer's dev stack — but it is a
 * RELEASE: the 0.2.4 the launcher findings in CHR-004 §6.3 came from predates CHR-003's radius cut
 * and CHR-005's launcher entirely, so those findings are the gate working, not a defect list for
 * HEAD. Verifying a source change means a dev build, always. Say which one a reading came from.
 */
const fs = require('fs');
const path = require('path');

const { appTarget, connect, evaluate } = require(path.join(__dirname, '../devtools/cdp.js'));
const { scalesFromDisk } = require('./lib/scale');
const { auditElements, summarise } = require('./lib/audit');

const args = process.argv.slice(2);
const opt = (name, fallback) =>
  (args.find((a) => a.startsWith(`--${name}=`)) || `=${fallback}`).split('=').slice(1).join('=');

/** The surfaces this phase rules on. A selector, not a component — the gate reads what is drawn. */
const SURFACES = {
  'property-panel': { root: '.sidebar-property-editor', target: 'editor' },
  launcher: { root: 'body', target: 'editor' },
  'node-picker': { root: '.nodepicker', target: 'editor' }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The collector, as one expression.
 *
 * 🔴 Built by concatenation, never by wrapping the file in a template literal: `collect.js`
 * contains backticks, and a backtick inside a template literal ends the string — which in this
 * repo has already produced a "drive" that silently evaluated garbage.
 */
function collectorExpression(rootSelector, options) {
  const source = fs
    .readFileSync(path.join(__dirname, 'lib/collect.js'), 'utf8')
    .split('\n')
    .filter((line) => !line.startsWith('module.exports'))
    .join('\n');

  return [
    '(() => {',
    source,
    '  const canvas = document.createElement("canvas");',
    '  const ctx = canvas.getContext("2d");',
    '  const collector = createCollector({',
    '    document: document,',
    '    getComputedStyle: (el) => window.getComputedStyle(el),',
    '    measureText: (text, font) => { ctx.font = font; return ctx.measureText(text).width; },',
    '    elementFromPoint: (x, y) => document.elementFromPoint(x, y)',
    '  });',
    `  return JSON.stringify({ records: collector.collect(${JSON.stringify(rootSelector)}, ${JSON.stringify(options || {})}),`,
    '    theme: document.documentElement.getAttribute("data-theme"),',
    '    viewport: [window.innerWidth, window.innerHeight] });',
    '})()'
  ].join('\n');
}

/**
 * Put the document in `theme` and wait for the cascade.
 *
 * 🔴 A write is invisible in the SAME eval — the tokens the new theme brings are not resolved
 * until the next task. Two evals with a frame between them, always.
 */
/**
 * The reverted arm, as a facility rather than a one-off script.
 *
 * Every acceptance claim this gate makes is of the form "it stays green when X moves and reddens
 * when Y does", and a gate nobody has watched go red is a gate nobody has tested. `--arm=<file>`
 * puts a stylesheet over the live surface so the arm can be taken against a running build with no
 * compile at all; the style is removed again on the way out.
 *
 * 🔴 It is NOT a way to make a red green. The thresholds are constants in `audit.js` for that
 * reason: an arm can move what the product paints, never what the ruling says.
 */
async function arm(client, css) {
  await evaluate(
    client,
    `(() => {
      let el = document.getElementById('chr-004-arm');
      if (!el) { el = document.createElement('style'); el.id = 'chr-004-arm'; document.head.appendChild(el); }
      el.textContent = ${JSON.stringify(css)};
      return el.textContent.length;
    })()`
  );
  await sleep(120);
}

async function disarm(client) {
  await evaluate(client, `(() => { const el = document.getElementById('chr-004-arm'); if (el) el.remove(); return true; })()`);
  await sleep(120);
}

async function setTheme(client, theme) {
  await evaluate(client, `document.documentElement.setAttribute('data-theme', ${JSON.stringify(theme)})`);
  await sleep(120);
  const applied = await evaluate(client, `document.documentElement.getAttribute('data-theme')`);
  if (applied !== theme) throw new Error(`Theme did not apply: asked for ${theme}, document says ${applied}`);
}

function report(surfaceName, reading, result) {
  const summary = summarise(result);
  const { population } = result;

  console.log(`\n── ${surfaceName} · ${reading.theme || 'default'} · ${reading.viewport.join('×')} ──`);
  console.log(summary.line);
  console.log(
    `   scales: font ${population.scales.fontSizes.join('/')}  radius ${population.scales.radii.join('/')}`
  );
  const refusals = Object.entries(population.skipped);
  if (refusals.length) {
    console.log(`   refused: ${refusals.map(([reason, n]) => `${reason}×${n}`).join('  ')}`);
  }
  console.log(
    `   graded: ${Object.entries(population.graded)
      .map(([rule, n]) => `${rule}×${n}`)
      .join('  ') || '(nothing)'}`
  );

  for (const finding of result.findings) {
    const extra = [finding.value, finding.threshold ? `< ${finding.threshold}` : null, finding.detail]
      .filter(Boolean)
      .join(' — ');
    console.log(`   ✗ ${finding.rule}: ${finding.element}${extra ? `  [${extra}]` : ''}`);
  }
  return summary;
}

async function main() {
  const surfaceName = opt('surface', 'property-panel');
  const surface = SURFACES[surfaceName] || { root: opt('root', surfaceName), target: opt('target', 'editor') };
  const themes = opt('theme', 'current') === 'both' ? ['dark', 'light'] : [opt('theme', 'current')];
  const jsonPath = opt('json', '');

  const scales = scalesFromDisk();
  const target = await appTarget(surface.target);
  const client = await connect(target);

  const armPath = opt('arm', '');
  const readings = [];
  try {
    if (armPath) {
      await arm(client, fs.readFileSync(armPath, 'utf8'));
      console.log(`armed with ${armPath}`);
    }
    for (const theme of themes) {
      if (theme !== 'current') await setTheme(client, theme);
      const raw = await evaluate(client, collectorExpression(surface.root, { includeUnreachable: false }));
      const reading = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const result = auditElements(reading.records, {
        scales,
        meta: { surface: surfaceName, root: surface.root, theme: reading.theme, viewport: reading.viewport }
      });
      readings.push({ reading, result, summary: report(surfaceName, reading, result) });
    }
  } finally {
    if (armPath) await disarm(client);
    if (client && client.close) client.close();
  }

  const findings = readings.reduce((sum, r) => sum + r.result.findings.length, 0);
  const graded = readings.reduce((sum, r) => sum + r.summary.graded, 0);

  if (jsonPath) {
    fs.writeFileSync(
      jsonPath,
      JSON.stringify(
        readings.map((r) => ({ meta: r.result.population.meta, population: r.result.population, findings: r.result.findings })),
        null,
        1
      )
    );
    console.log(`\nwrote ${jsonPath}`);
  }

  // 🔴 A gate that graded nothing is not a gate that passed. Every session of this phase that
  // reported a clean number from an instrument which had measured an empty set lost the session.
  if (!graded) {
    console.error('\nFAILED: the gate made no readings at all — check the surface selector.');
    process.exit(2);
  }

  console.log(`\n${findings ? 'RED' : 'GREEN'}: ${findings} finding(s), ${graded} reading(s) graded`);
  process.exit(findings ? 1 : 0);
}

main().catch((error) => {
  console.error(`\nFAILED: ${error && error.message ? error.message : error}`);
  process.exit(2);
});
