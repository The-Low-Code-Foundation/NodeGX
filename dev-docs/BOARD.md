# The board

**Set:** 2026-10-14 by Richard, at HEAD `1817f4d7e`, after reading where phase 107 stood. **Applies to:** every session
from now on. A session picks a lane from §2 and nowhere else. Where a phase README disagrees with this page about
*whether* its work is current, this page wins; the README stays right about *what* the work is.

> "Make sure that the next version of NodeGX we're working on focusses on the ability to create nodegx apps with npm,
> make your own editor, full stack apps with our own backend, local development that can be pushed to a VM using a
> coding software, Mistral testing and integration for cheaper development possibilities, code export (any last
> coverage we need to properly lay claim to code export and maybe lining it up with node specs more). I want NodeGX
> to become a framework for safe and reliable LLM driven development." — Richard, 2026-10-14

## 1. Why this page exists

Measured on 2026-10-14: 22 phases opened since 22 September (P100–P121), one closed; about 1,100 commits in sixteen
days across up to four phases a day; five phases scoped and never started; eleven phases from before P100 still read as
live in memory, most untouched since September; 195 uncommitted files in three piles; the direction document itself
untracked. The code was sound (`test:ci` 3015 / 0, spec ledger 142 / 147). The plan had no spine. This page is the
spine. [DIRECTION.md](DIRECTION.md) says what NodeGX is; this page says what gets built next and what waits.

## 2. The version: 0.5.0, the framework

0.4.0 ships first (P112 OWN-013, gates G8–G10: the editor that opens what the npm kit makes). 0.5.0 is the seven lanes
below. Each lane names the phase and tasks that already exist for it; no lane needs a new phase. **Now** is the task a
session picks up today; **then** is what follows it. A lane's task files are the source of truth for its acceptance
criteria; this table only orders them.

| # | lane | phase / tasks | now | then |
|---|---|---|---|---|
| 1 | **Apps with npm.** One install, the agent builds, the preview and `render_report` run from npm. | P112 [OWN-011](tasks/phase-112-your-own-nodegx/OWN-011-ONE-INSTALL.md), [OWN-013](tasks/phase-112-your-own-nodegx/OWN-013-THE-0.4.0-CUT.md), [OWN-014](tasks/phase-112-your-own-nodegx/OWN-014-THE-AGENT-SEES-ITS-APP.md), [OWN-007](tasks/phase-112-your-own-nodegx/OWN-007-THE-BRIEF.md) | **The language app built by a stranger from the registry** (WAVTWICE's proof, before the tutorial is recorded), then OWN-014 AC4 with it. Shipped 2026-10-14: editor 0.4.1 and npm 0.2.1, nodegx.io on 0.4.1; OWN-011 AC2 ✅ on the release | Richard's in-place 0.3.0 → 0.4.0 update click (OWN-013 G8, his half) and G10's drives; OWN-014 AC4 with OWN-015's app. Shipped 2026-10-14: editor 0.4.0, npm 0.2.0 (`create-nodegx` carries OWN-007's skill), OWN-014 AC3; G8's agent half and AC2's re-drive found two editor bugs, fixed for the next release (OWN-013 §13) |
| 2 | **Your own editor.** A person's agent builds the editor they want from the kit, and a suite says when it is right. | P112 [OWN-008](tasks/phase-112-your-own-nodegx/OWN-008-THREE-STRANGERS.md), [OWN-017](tasks/phase-112-your-own-nodegx/OWN-017-THE-LINGO-APP-IN-OUR-OWN-EDITOR.md), [OWN-012](tasks/phase-112-your-own-nodegx/OWN-012-THE-SCREEN-FROM-THE-DESCRIPTIONS.md), [OWN-009](tasks/phase-112-your-own-nodegx/OWN-009-RICHARDS-OWN.md) | OWN-008 three strangers (P118, P119 and P121's apps are these strangers — run them here, not as phases) | OWN-017; OWN-009 is Richard's |
| 3 | **Full stack, our own backend.** The backend provisioned from npm, a cloud function keeps the key, the person says what their world is first, and the admin panel is one more editor they can build. | P112 [OWN-015](tasks/phase-112-your-own-nodegx/OWN-015-THE-BACKEND-FROM-NPM.md); P116 ONT (the world first); P104 BMG (the backend manager, editor side) | OWN-015 (AC1 ✅ s15; the rest) | P116 ONT-004 onward; P104's unbuilt BMG rows become kit pieces (an admin panel from the kit, DIRECTION §3 "do it yourself"), not editor pages |
| 4 | **Local, then a VM, from the coding tool.** Build on your machine; deploy to a folder, then to a VM you own, with the backend and the secret beside it, from Claude Code or Vibe. | P112 [OWN-016](tasks/phase-112-your-own-nodegx/OWN-016-SHIP-IT.md) (takes P115 HST-005 forward) | OWN-016: the VM route proved on nexus-1 (s13); the deploy as a tool the agent calls, graded | a second VM provider; the runbook a stranger follows |
| 5 | **Cheaper models.** Mistral, GLM and local models build the same apps; the cost per app is a measured table with verified prices. | P112 [OWN-018](tasks/phase-112-your-own-nodegx/OWN-018-A-STRANGER-ON-MISTRAL.md), [OWN-019](tasks/phase-112-your-own-nodegx/OWN-019-THE-VIBE-KIT.md); P120 [LOC-002](tasks/phase-120-building-locally/LOC-002-GLM-ON-THE-SAME-PLAN.md); P109 ISL-010 (a running app asks a local model) | OWN-019 the series ×3 (running 2026-10-14) | LOC-002; the price table (Z.ai's prices are unverified in `round-kit`); the rest of P120 parked |
| 6 | **Code export, and lined up with the specs.** The last seven picker nodes export; the exported app does what the running one does, graded on P107's graph scenarios, and that line goes on P18's ledger. | P18 [EXP-011](tasks/phase-18-code-export-v2/EXP-011-PICKER-COVERAGE.md) (123 / 130; left: Action Dispatcher, Action Handler, Optimistic Update, State History, State Snapshot, Undo / Redo, Sign In With); P109 [ISL-043](tasks/phase-109-the-defects-the-island-found/ISL-043-THE-EXPORTED-APP-DOES-WHAT-THE-RUNNING-ONE-DOES.md), [ISL-035](tasks/phase-109-the-defects-the-island-found/ISL-035-AN-EXPORTED-APP-LOADS-WHAT-THE-DEPLOYED-ONE-LOADS.md); P107 NSP-005's export half | ISL-043's eight rows, AC1 first (re-measure each at HEAD; SNAP and D82 lead), then ISL-035 ([NEXT-SESSION-PROMPT](tasks/phase-18-code-export-v2/NEXT-SESSION-PROMPT.md)). Done 2026-10-14: s101's pile committed; GRAPHNOSPEC `b01053e2b`; s104 NAVENCODE `e767962a1`, DATEHARNESS `42d0f5530` (a real export defect behind the stub: a timestamp blanked), CATALOGNAME `3b02233b0`, NOEXPORTCI `1300fdbd2` (CI's `test:packages` bailed at project-contract and never ran the export: `--no-bail`); **export jest 115 / 115, exit 0** | EXP-011's seven; "N graph scenarios conform on the export" as P18's second ledger line |
| 7 | **Safe and reliable, as numbers.** The honesty number on by default; the app's own behaviour recorded once and replayed after every change; a security report a person can read; the words on nodegx.io bound to the gates; and a control: the same app vibe-coded in plain React, defects and cost counted beside the NodeGX build. | P111 [SEE-001](tasks/phase-111-you-can-see-what-it-built/SEE-001-THE-HONESTY-NUMBER.md), [SEE-011](tasks/phase-111-you-can-see-what-it-built/SEE-011-YOUR-APP-HAS-TESTS.md), [SEE-012](tasks/phase-111-you-can-see-what-it-built/SEE-012-THE-SECURITY-REPORT.md), [SEE-009](tasks/phase-111-you-can-see-what-it-built/SEE-009-THE-WORDS-ON-THE-TIN.md), [SEE-010](tasks/phase-111-you-can-see-what-it-built/SEE-010-RICHARDS-VERDICT.md) | SEE-001 | SEE-011, SEE-012, SEE-010 (the control), SEE-009 last, once the gates exist |

Lane 7 is the one Richard's list did not name. Without it, "safe and reliable" is a sentence on a website. With it, it
is three numbers and a report that anyone can run. The other ten SEE tasks wait.

**Finishing, not a lane:** P109 is 41 of 52. ISL-043, ISL-035 and ISL-010 belong to lanes 6 and 5 above. The rest
(ISL-008, 022, 024, 025, 037, 046) close in one session or go to `dev-docs/bugs/` as rows. No new ISL tasks.

## 3. Waits on Richard

No session opens on these. They close the day he drives them and rules. One evening each, in any order.

| phase | what he does |
|---|---|
| [P95](tasks/phase-95-the-second-play-test/README.md) | the replay — all six closes wait on it |
| [P101](tasks/phase-101-the-inspector/README.md) | rule the inspector worthy as built, or say what is missing |
| [P103](tasks/phase-103-the-composer-grows/README.md) | CMG-011, drive the touch points |
| [P108](tasks/phase-108-the-island-works/README.md) | the children's sitting, the tablet, the French read, the prices |
| [P113](tasks/phase-113-the-third-play-test/README.md) | the kids' session |
| [P105](tasks/phase-105-the-coding-garden/README.md) / [P106](tasks/phase-106-the-island-grows/README.md) | the Windows build in a child's hands |
| [P119](tasks/phase-119-learn-with-simple-rick/README.md) | SRK-000's three owed measurements |
| [P97](tasks/phase-97-the-way-out-is-the-reason-to-stay/README.md) | AC8, his read; the phase closes on it |
| P112 [OWN-009](tasks/phase-112-your-own-nodegx/OWN-009-RICHARDS-OWN.md) | asks his own Claude Code for the editor he wants |

## 4. Parked

Not read, not re-scoped, not opened, until a lane in §2 closes and Richard names what takes its slot. A parked phase's
README may be stale and that is allowed; it is re-measured on the day it is unparked, never before.

| phase | why parked | unparks when |
|---|---|---|
| [P110](tasks/phase-110-the-app-in-your-pocket/README.md) the app in your pocket (Swift) | needs the kit shipped and the script story (PKT-002/003) first; its dependency table is already stale (it says 75 / 147 conform; it is 142) | lane 1 and lane 3 close |
| [P114](tasks/phase-114-the-groovebox/README.md) the groovebox | a kit stranger, not a lane | as an OWN-008 stranger |
| [P115](tasks/phase-115-online-on-your-own-account/README.md) online on your own account | HST-005 is in lane 4 (OWN-016); the rest is research | lane 4 closes |
| [P116](tasks/phase-116-the-person-says-what-their-world-is/README.md) beyond ONT-003 | lane 3 takes ONT-004 onward; the rest waits | — |
| [P120](tasks/phase-120-building-locally/README.md) beyond LOC-002 | lane 5 takes LOC-002; the Surface bench, the helper and the pilot wait for a builder who has the kit | lane 1 ships |
| [P118](tasks/phase-118-the-castle-holds/README.md), [P121](tasks/phase-121-made-in-africa-and-pengram/README.md) | apps built with the kit and no editor — they are lane 2's strangers, run under OWN-008 | — |
| [P117](tasks/phase-117-tchac-boum/README.md) | shelved by Richard 2026-10-11 | he asks |
| [P104](tasks/phase-104-the-backend-manager/README.md) beyond what lane 3 takes | the editor-side manager is built far enough; what is left becomes kit pieces | — |

## 5. Closed by this page (the sweep of 2026-10-14)

Each phase keeps its README as the record of what it did. Memory stops carrying them as live.

| phase | verdict |
|---|---|
| [P107](tasks/phase-107-the-node-says-what-it-does/README.md) | **CLOSED** on R38 + R40 landing — [CLOSING.md](tasks/phase-107-the-node-says-what-it-does/CLOSING.md). The ratchet in CI is the phase from now on; a spec is touched when a node changes. Leftovers: the export half → lane 6; Router's labels → P112 OWN-006; "which runtimes" → P110 when it unparks |
| [P76](tasks/phase-76-the-site-builder/README.md) | already CLOSED 2026-08-29; dropped from memory |
| [P78](tasks/phase-78-the-templates/README.md) | the templates are the strangers' corpus and the defect bed, kept; **no new template opens as a phase**. Its uncommitted TPL-009 / TPL-011 pile is its owner's to commit |
| [P81](tasks/phase-81-the-look-is-the-product/README.md) | **CLOSED.** Its open V-rows are read as ledger rows; whoever picks one files it in `dev-docs/bugs/` first |
| [P84](tasks/phase-84-the-defects-the-field-report-found/README.md) | **CLOSED as a phase** at 3 of 17. The fourteen unbuilt items stay listed in its README as a bug list; a session that takes one logs it in `dev-docs/bugs/` and works it from there |
| [P85](tasks/phase-85-the-component-is-the-backbone/README.md) | **CLOSED.** The component story is carried by P107's specs and P112's editor suite |
| [P92](tasks/phase-92-dreamweaver-called/README.md) | **CLOSED** one task short; it reopens only if Richard asks for that task |
| [P93](tasks/phase-93-three-views-of-one-app/README.md) | **FOLDED INTO** P111 SEE-007 (the entrance moves) |
| [P99](tasks/phase-99-the-ones-nobody-owned/README.md) | closes at the end of the HLT item in hand; new findings go to the ledger, not to HLT rows |
| P18 | not closed: lane 6 |
| P95, P97 | §3 |

## 6. Rules

1. **A session picks a lane.** It reads that lane's task file and the phase README, not every phase on disk.
2. **A new idea is one page in [`dev-docs/parked/`](parked/)**: the quote, the idea in a paragraph, what it would need.
   It becomes a phase with task files and rulings only when it takes a slot in §2 and Richard says so. Twenty-two
   phases in three weeks is the pace that made this page necessary.
3. **A phase closes with a `CLOSING.md`**: the numbers it is judged on, what it gave, what it did not, where every
   leftover went. Not a status line that says 🟡 forever.
4. **One heavy job on the box** (memory: *do not pile CPU work on a shared box*), and the working tree is not a shelf:
   a session commits its own files with pathspecs before it ends, or hands the pile to a named owner in its handoff.
5. **This page is re-derived from the task files**, never the other way round. When a lane's "now" is done, the
   session that did it moves "then" up and writes the next "then" from the task file.
