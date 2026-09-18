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
 * `agree` is the common case and draws nothing: the strip costs the stage no height whenever there
 * is nothing to explain, which is the same reasoning FIX-019's divergence chip was built on.
 */
export type StripShape = 'agree' | 'other-screen' | 'unplaced' | 'logic';

/** A way out of the confusion, drawn as a button. Never more than two. */
export type StripDoor =
  /** Navigate the preview to a page that shows this component. The user asked; the canvas did not. */
  | { kind: 'goto'; page: string; label: string }
  /** Mount this component on the Workbench. `PreviewScopeControl`'s `choose({mode:'bench'})`. */
  | { kind: 'bench'; label: string };

export interface StripModel {
  shape: StripShape;
  /** The claim, drawn bold. Empty for `agree`. */
  lead: string;
  /** The rest of the sentence, drawn plain. */
  rest: string;
  doors: StripDoor[];
}

export interface StripInput {
  /** The canvas's component, as a person reads it (`benchTargetLabel`). Empty = no canvas. */
  canvasLabel: string;
  /** What the preview is showing, as a person reads it. Empty when the route resolves to no page. */
  screenLabel: string;
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

  if (!canvasLabel || onScreen) return agree();

  if (isLogic) {
    const running = input.runningPages ?? [];
    // A logic component that runs on this screen is not a divergence — `onScreen` is false for it
    // by construction (it renders nowhere), so `runningPages` is what decides.
    if (input.screenPage && running.some((page) => page.page === input.screenPage)) return agree();

    return {
      shape: 'logic',
      lead: `${canvasLabel} is logic — it draws nothing.`,
      rest: running.length > 0 ? `It runs on ${pageList(running)}.` : `Nothing in the app runs it yet.`,
      doors: [benchDoor()]
    };
  }

  if (showingPages.length === 0) {
    return {
      shape: 'unplaced',
      lead: `${canvasLabel} isn't on any page yet`,
      rest: `— ${NOTHING_PLACES_IT}.`,
      doors: [benchDoor()]
    };
  }

  const first = showingPages[0];
  return {
    shape: 'other-screen',
    lead: screenLabel ? `${canvasLabel} isn't on ${screenLabel}.` : `${canvasLabel} isn't on this screen.`,
    rest: `It's on ${pageList(showingPages)}.`,
    // One `Go to`, for the first page listed — the sentence names the rest. Three doors on a 28px
    // strip is a menu, and BEN-004's drive already measured this strip clipping at 640px.
    doors: [{ kind: 'goto', page: first.page, label: `Go to ${first.label}` }, benchDoor()]
  };
}

function agree(): StripModel {
  return { shape: 'agree', lead: '', rest: '', doors: [] };
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
