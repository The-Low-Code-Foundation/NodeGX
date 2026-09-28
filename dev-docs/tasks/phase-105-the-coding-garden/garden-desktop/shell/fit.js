/**
 * The page is designed 1368 CSS px wide: the tablet's 2736-px screen at Windows' default 200 %, which is what the
 * mockups were drawn at. The girls' tablet runs at 300 % (read from Richard's photo of 0.0.2, 2026-09-26: the window's
 * shape and the tools' share of it fit 912 × ~537 DIPs, not 1368 × ~840), so the tools ran below the window.
 *
 * So the shell zooms the page to fit its window's WIDTH: never above 1 (a big screen shows it at its real size), never
 * below 0.5 (past that, a 44 px target is too small to press). At 300 % that is 0.67 — physically the 200 % the mockups
 * assumed.
 *
 * The window's title is the game's name in either language (P105 ruling 7, "Olive's Island" / "L'île d'Olive"). A page
 * sets its own `<title>` and Electron copies it onto the window; the template's `htmlTitle` is not the shell's to
 * choose (it said "Bot Garden" when the game was renamed), so the shell lets through only a title that IS one of the
 * two names, and shows its own name for anything else.
 */
'use strict';

const DESIGN_WIDTH = 1368;

/** @param {number} contentWidth the window's content width in DIPs */
function zoomFor(contentWidth) {
  if (!(contentWidth > 0)) return 1;
  const z = Math.min(1, Math.max(0.5, contentWidth / DESIGN_WIDTH));
  return Math.floor(z * 1000) / 1000;
}

/** Open maximised when the screen's work area cannot hold the window the shell asks for. */
function shouldMaximise(workArea, wanted) {
  return workArea.width < wanted.width || workArea.height < wanted.height;
}

/**
 * The window title for a page title: the page's own when it is one of the game's names, else the English name.
 * @param {string} pageTitle @param {{ name: string, nameFr?: string }} names
 */
function windowTitle(pageTitle, names) {
  const t = String(pageTitle || '').trim();
  return t === names.name || (names.nameFr && t === names.nameFr) ? t : names.name;
}

module.exports = { DESIGN_WIDTH, zoomFor, shouldMaximise, windowTitle };
