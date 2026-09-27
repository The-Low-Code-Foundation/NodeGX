/**
 * TVW-002 — the sentence the preview says about what it is *not* showing.
 *
 * Proposal §2 row 11 is the phase's foundational confusion: the canvas and the preview show two
 * different things and the editor never puts a sentence between them. Someone clicks `Hero`, the
 * preview does not change, and there is nothing on screen that says why. This module is that
 * sentence, and it is pure so the sentence itself is graded rather than only the wiring that shows
 * it — `an-unpinned-user-visible-string-sits-a-ruling-behind` is a P93 lesson with a cost already
 * attached to it.
 *
 * **The rule this strip exists to make survivable:** the app preview never changes route or mode
 * because the canvas moved. Not here, not anywhere. A strip is what you ship *instead* of moving
 * the preview, so every word here is load-bearing for a rule the phase has committed to.
 *
 * ───────────────────────────────────────────────────────────────────────────────
 * 🔴 THE WORDING IN THE TASK FILE WAS WRITTEN BEFORE A RULING THAT RETIRED IT.
 *
 * TVW-002's spec table wrote shape 1 as *"… see it on its own on the Workbench — with sample
 * values, not the app's data"*. Richard ruled on 2026-09-18 (TVW-001 AC7) that *sample* was doing
 * two jobs at once on the Workbench — the caption said "Sample values." while the bench summary
 * ~44px below said "No sample data", about different things — and the caption's half was **cut**.
 * Shipping the retired phrasing here would have re-opened the defect AC7 closed, one surface
 * further out.
 *
 * So the strip **does not describe the Workbench at all**. It names it and points at it; the
 * Workbench's own caption (`benchWords.ts`) says what it is when you arrive. That is the fix
 * stated as a rule: *say the data thing once, where the data is*. See
 * `a-pinned-string-is-blind-to-its-neighbour`.
 *
 * ⚠️ **Two other departures from the spec table, both downstream of the same AC7 ruling.**
 *
 * 1. The spec's "canvas on a different page" door reads `Go to /work` — a **path**, while shape 1's
 *    own door in the same table reads `Go to Home`, a **name**. One door cannot be two things, and
 *    AC7 settled which way that resolves: `authoredPageUrl` stops the editor showing a URL nobody
 *    typed, so a page whose `urlPath` was never set has no path to put in a door. Every door here
 *    names the page.
 * 2. The door label is one string for all three shapes ({@link OPEN_ON_WORKBENCH}, the components
 *    panel's own menu row) rather than the spec's "Watch it run on the Workbench" for logic. What
 *    the bench does with a logic component belongs in the sentence, which says it; a second verb on
 *    the button is how one surface ends up with two names again.
 *
 * Pure: no React, no editor singletons. Graded in `tests-unit/tvw-002/previewStripWords.test.ts`.
 *
 * @module noodl-editor/views/VisualCanvas/previewStripWords
 */

import { OPEN_ON_WORKBENCH } from './benchWords';

/**
 * Which of the four situations the two surfaces are in.
 *
 * `agree` is the common case. It used to draw nothing at all — see {@link StripTone} for why that
 * stopped being true on 2026-09-18, and why it is the row's *tone* rather than its existence that
 * the four shapes now decide.
 */
export type StripShape = 'agree' | 'other-screen' | 'unplaced' | 'logic';

/**
 * How loud the row is — and, therefore, whether it is there at all.
 *
 * 🔴 **RULED 2026-09-18 (Richard): the row is ALWAYS drawn.** The first build hid it whenever the
 * two surfaces agreed, on the reasoning that a strip with nothing to say should cost the stage no
 * height. The placement ruling earlier the same day retired that reasoning without anyone noticing,
 * and the re-drive is what made it visible: Richard moved the row to the seam *"as a kind of visual
 * separator before your eye confuses what's on the node canvas with the preview"*, and
 * `tvw002-agree-no-strip-light.png` then showed the app's hero image abutting the canvas's dotted
 * grid with nothing between them. **His reason applied to both cases; the row applied to one.**
 *
 * A row that appears only on divergence is a notice. A row that is always there is a seam, and a
 * seam can carry a notice. So:
 *
 * - `quiet` — the two surfaces agree. Surface colour, no wash, no doors, no dismiss. It marks the
 *   boundary and, when it can, says the reassuring thing in one short sentence.
 * - `notice` — they disagree. The amber wash, the sentence, and the doors out.
 *
 * ⚠️ This is why a dismissed strip does not remove the row: dismissing says *"yes, I know"* about a
 * **sentence**, and the seam was never the thing being dismissed. `usePreviewStrip`'s `IDLE` is a
 * `quiet` row with no words for exactly that reason.
 */
export type StripTone = 'quiet' | 'notice';

/** A way out of the confusion, drawn as a button. Never more than two. */
export type StripDoor =
  /** Navigate the preview to a page that shows this component. The user asked; the canvas did not. */
  | { kind: 'goto'; page: string; label: string }
  /** Mount this component on the Workbench. `PreviewScopeControl`'s `choose({mode:'bench'})`. */
  | { kind: 'bench'; label: string };

export interface StripModel {
  shape: StripShape;
  /** How loud the row is. `agree` is always `quiet`; every other shape is always `notice`. */
  tone: StripTone;
  /** The claim, drawn bold. May be empty on a `quiet` row that has nothing to reassure about. */
  lead: string;
  /** The rest of the sentence, drawn plain. */
  rest: string;
  doors: StripDoor[];
}

export interface StripInput {
  /** The canvas's component, as a person reads it (`benchTargetLabel`). Empty = no canvas. */
  canvasLabel: string;
  /**
   * The canvas's component by legacy name, for the one comparison a label cannot carry.
   *
   * ⚠️ Same reason as {@link StripInput.screenPage}: two components in two folders can read the
   * same. Asking "is the canvas sitting on the page the preview is showing?" off the labels would
   * answer yes for `/Admin/Settings` while the preview showed `/Settings`, and the quiet row would
   * then claim the person is looking at a page they are not.
   */
  canvasComponent?: string;
  /** What the preview is showing, as a person reads it. Empty when the route resolves to no page. */
  screenLabel: string;
  /** The screen draws this component once per item of a list — `PageReach.repeated`. */
  repeated?: boolean;
  /**
   * The screen's page component, by legacy name.
   *
   * ⚠️ Carried beside the label rather than compared through it: two pages in two folders can
   * share a label (`/Admin/Settings` and `/Settings` both read `Settings`), and a comparison on
   * the label would silently call them the same page.
   */
  screenPage?: string;
  /** The canvas's component is attached to the rendered tree of the screen being shown. */
  onScreen: boolean;
  /** It draws nothing — `sectionFor(...) === 'logic'`. Decides shape 3 before anything else. */
  isLogic: boolean;
  /** Pages whose screen shows it, in Router order. `{ page, label }` so the door can navigate. */
  showingPages: readonly { page: string; label: string }[];
  /** Pages whose screen runs it, in Router order. Shape 3 only — logic renders nowhere. */
  runningPages?: readonly { page: string; label: string }[];
  /**
   * Components that place an instance of it, when no screen shows it — shape 2's second variant.
   *
   * 🔴 **Measured, not imagined.** The spec wrote shape 2 as one sentence, *"nothing in the app
   * places it"*. Run against the 130 projects on this machine (2026-09-18), that sentence is
   * **false for 1094 components** across the 57 projects with two or more routed pages: they are
   * placed — sometimes five or six times — inside something no page reaches. 231 of those are
   * inside a popup, which is opened rather than placed; the rest are inside components that are
   * themselves unreachable (a corpus favourite: a folder called `deprecated cards`).
   *
   * A strip whose whole job is to stop the editor saying confident wrong things could not ship the
   * one-sentence version. See {@link previewStrip}.
   */
  placedIn?: readonly { label: string }[];
}

/** Beyond this many page names the sentence stops listing and starts counting. */
export const MAX_NAMED_PAGES = 3;

const NOTHING_PLACES_IT = 'nothing in the app places it';

/**
 * The strip, or `agree`.
 *
 * ⚠️ The order of the guards is the meaning. `agree` is checked before `isLogic`, because a logic
 * component that runs on the screen you are looking at needs no explanation — it is doing its job
 * there. Checking `isLogic` first would put a permanent strip on screen for every logic component
 * in the project, which is the "assertive, not a passive read-out" rule the divergence chip was
 * built to obey.
 */
export function previewStrip(input: StripInput): StripModel {
  const { canvasLabel, screenLabel, onScreen, isLogic, showingPages } = input;

  // No canvas to diverge from — the detached window, or a surface that has not resolved yet. The
  // row is still drawn, because the seam is still there; it simply has nothing to say.
  if (!canvasLabel) return seam();
  if (onScreen) return agreeing(input);

  if (isLogic) {
    const running = input.runningPages ?? [];
    // A logic component that runs on this screen is not a divergence — `onScreen` is false for it
    // by construction (it renders nowhere), so `runningPages` is what decides.
    if (input.screenPage && running.some((page) => page.page === input.screenPage)) {
      return quiet(`${canvasLabel} is logic — it draws nothing.`, 'It runs on this screen.');
    }

    return {
      shape: 'logic',
      tone: 'notice',
      lead: `${canvasLabel} is logic — it draws nothing.`,
      rest: running.length > 0 ? `It runs on ${pageList(running)}.` : `Nothing in the app runs it yet.`,
      doors: [benchDoor()]
    };
  }

  if (showingPages.length === 0) {
    const placedIn = input.placedIn ?? [];
    return {
      shape: 'unplaced',
      tone: 'notice',
      lead: `${canvasLabel} isn't on any page yet`,
      // The two truths are different truths, and only one of them is "nobody uses this".
      rest: placedIn.length > 0 ? `— it's only inside ${pageList(placedIn)}, which no page shows.` : `— ${NOTHING_PLACES_IT}.`,
      doors: [benchDoor()]
    };
  }

  const first = showingPages[0];
  return {
    shape: 'other-screen',
    tone: 'notice',
    lead: screenLabel ? `${canvasLabel} isn't on ${screenLabel}.` : `${canvasLabel} isn't on this screen.`,
    rest: `It's on ${pageList(showingPages)}.`,
    // One `Go to`, for the first page listed — the sentence names the rest. Three doors on a 28px
    // strip is a menu, and BEN-004's drive already measured this strip clipping at 640px.
    doors: [{ kind: 'goto', page: first.page, label: `Go to ${first.label}` }, benchDoor()]
  };
}

/**
 * The quiet row: the two surfaces agree, so the row is a seam that happens to be able to speak.
 *
 * Three sentences, because "they agree" is three different facts and only one of them is
 * "the thing you clicked is somewhere on the page below":
 *
 * 1. the canvas is sitting on the **page component itself** — there is no *it* to point at, because
 *    the thing on the canvas is the thing in the preview;
 * 2. the canvas's component is **placed on** the screen being shown;
 * 3. (from {@link previewStrip}) it is **logic that runs on** this screen — it draws nothing, so
 *    "you're looking at it" would be a lie, and the row says what is actually true instead.
 *
 * ⚠️ None of them says *"you're looking at it"*. A component can be on the page and scrolled past,
 * inside a closed accordion, or behind a popup. The claim the row is entitled to make is about the
 * **screen the preview is showing**, which is exactly what it was unable to say before.
 */
function agreeing(input: StripInput): StripModel {
  const { canvasLabel, screenLabel, screenPage, canvasComponent, repeated } = input;

  if (canvasComponent && screenPage && canvasComponent === screenPage) {
    return quiet(`${canvasLabel} is the screen the preview is showing.`, '');
  }

  if (!screenLabel) return quiet(`${canvasLabel} is on this screen.`, '');

  // 🔴 Richard, 2026-09-18: a component a repeater draws says so. How many are on the screen
  // depends on the data the list was given — zero, one or forty — and the plain sentence claims a
  // single thing. 498 components on this machine are placed only as a repeater's template.
  if (repeated) return quiet(`${canvasLabel} is on ${screenLabel} — once per item.`, 'The preview is showing that screen.');

  return quiet(`${canvasLabel} is on ${screenLabel}.`, 'The preview is showing that screen.');
}

/** A quiet row with words. Never has doors: there is nothing to get out of. */
function quiet(lead: string, rest: string): StripModel {
  return { shape: 'agree', tone: 'quiet', lead, rest, doors: [] };
}

/**
 * The seam with nothing to say — the boundary drawn, and not one word on it.
 *
 * Used for "there is no canvas" here, and by `usePreviewStrip` for a **dismissed** strip and for
 * bench mode. In all three the row exists because the two surfaces still meet; what varies is
 * whether this module has anything it is entitled to put on it.
 */
export function seam(): StripModel {
  return { shape: 'agree', tone: 'quiet', lead: '', rest: '', doors: [] };
}

function benchDoor(): StripDoor {
  return { kind: 'bench', label: OPEN_ON_WORKBENCH };
}

/**
 * `Home`, `Home and Pricing`, `Home, Pricing and Work`, then `Home, Pricing, Work and 2 more`.
 *
 * The spec asked for `+N`; spelled out here because this is a sentence rather than a meta chip —
 * `+2` reads as a count of something in the panel's right-hand column, and the panel is where that
 * shape already means `×N`.
 */
export function pageList(pages: readonly { label: string }[]): string {
  const labels = pages.map((page) => page.label);
  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0];

  if (labels.length <= MAX_NAMED_PAGES) {
    return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
  }

  const named = labels.slice(0, MAX_NAMED_PAGES).join(', ');
  return `${named} and ${labels.length - MAX_NAMED_PAGES} more`;
}
