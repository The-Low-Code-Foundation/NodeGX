/**
 * TVW-002 — the strip's sentence, pinned.
 *
 * P93 has already paid for an unpinned user-visible string once: the Workbench caption sat a
 * ruling behind for its whole life because nothing asserted it
 * (`an-unpinned-user-visible-string-sits-a-ruling-behind`). These are the strings a person reads
 * when the canvas and the preview disagree, so they are asserted as text and not only as shape.
 *
 * The first arm is the one that matters most: the retired *"sample values"* wording must not come
 * back. It is asserted as an **absence beside a known-firing signal** — the same fixture that
 * proves the strip renders its sentence is the one that proves the phrase is not in it.
 */

import { WORKBENCH, OPEN_ON_WORKBENCH } from '../../src/editor/src/views/VisualCanvas/benchWords';
import {
  MAX_NAMED_PAGES,
  pageList,
  previewStrip,
  seam,
  StripInput
} from '../../src/editor/src/views/VisualCanvas/previewStripWords';

const page = (label: string) => ({ page: `/Pages/${label}`, label });

function input(over: Partial<StripInput> = {}): StripInput {
  return {
    canvasLabel: 'Hero',
    screenLabel: 'Pricing',
    screenPage: '/Pages/Pricing',
    onScreen: false,
    isLogic: false,
    showingPages: [page('Home')],
    ...over
  };
}

describe('TVW-002 — the preview says what it is not showing', () => {
  describe('shape 1 — the component is on another screen', () => {
    it('names what it is not on, what it is on, and the two ways out', () => {
      const strip = previewStrip(input());

      expect(strip.shape).toBe('other-screen');
      expect(strip.lead).toBe("Hero isn't on Pricing.");
      expect(strip.rest).toBe("It's on Home.");
      expect(strip.doors).toEqual([
        { kind: 'goto', page: '/Pages/Home', label: 'Go to Home' },
        { kind: 'bench', label: OPEN_ON_WORKBENCH }
      ]);
    });

    it('🔴 does not describe the Workbench, and never says "sample"', () => {
      // AC7's ruling, one surface out. The sentence and the door together are the known-firing
      // signal: this fixture demonstrably produces words, so the absence below is an absence in
      // text that exists rather than in text that was never built.
      const strip = previewStrip(input());
      const everything = [strip.lead, strip.rest, ...strip.doors.map((d) => d.label)].join(' ');

      expect(everything.length).toBeGreaterThan(0);
      expect(everything).toContain(WORKBENCH);
      expect(everything.toLowerCase()).not.toContain('sample');
      expect(everything.toLowerCase()).not.toContain("app's data");
    });

    it('lists up to three pages by name, then counts the rest', () => {
      const four = [page('Home'), page('Pricing'), page('Work'), page('About')];

      expect(previewStrip(input({ showingPages: four })).rest).toBe("It's on Home, Pricing, Work and 1 more.");
      expect(previewStrip(input({ showingPages: four.slice(0, 2) })).rest).toBe("It's on Home and Pricing.");
      expect(previewStrip(input({ showingPages: four.slice(0, 3) })).rest).toBe("It's on Home, Pricing and Work.");
    });

    it('the door goes to the first page named, not to the last one walked', () => {
      const strip = previewStrip(input({ showingPages: [page('Work'), page('Home')] }));

      expect(strip.doors[0]).toEqual({ kind: 'goto', page: '/Pages/Work', label: 'Go to Work' });
    });

    it('🔴 the door names the page, never a URL', () => {
      // AC7 stopped the editor showing a URL nobody typed (`authoredPageUrl`). A door reading
      // `Go to /work` would put the invention back on a second surface — and for a page with no
      // authored `urlPath` there is no path to put there at all.
      const strip = previewStrip(input({ showingPages: [page('Work')] }));

      expect(strip.doors[0].label).toBe('Go to Work');
      expect(strip.doors[0].label).not.toContain('/');
    });

    it('says "this screen" when the route resolves to no page it can name', () => {
      // TVW-002 §5: a Component Stack proxy path resolves to a stack's current component, which is
      // not a page. Offering the doors without a name beats naming the wrong thing.
      const strip = previewStrip(input({ screenLabel: '', screenPage: undefined }));

      expect(strip.lead).toBe("Hero isn't on this screen.");
      expect(strip.doors).toHaveLength(2);
    });
  });

  describe('shape 2 — no screen shows it', () => {
    it('says nothing places it, and offers the Workbench alone', () => {
      const strip = previewStrip(input({ canvasLabel: 'Price Tag', showingPages: [], placedIn: [] }));

      expect(strip.shape).toBe('unplaced');
      expect(strip.lead).toBe("Price Tag isn't on any page yet");
      expect(strip.rest).toBe('— nothing in the app places it.');
      // No `Go to`: there is nowhere to go. A door to nothing is worse than no door.
      expect(strip.doors).toEqual([{ kind: 'bench', label: OPEN_ON_WORKBENCH }]);
    });

    it('🔴 a component that IS placed, where no page reaches it, is told the truth instead', () => {
      // The spec had one sentence here. Measured against the 130 projects on this machine, that
      // sentence is false for 1094 components: placed — often several times — inside something no
      // page reaches. 231 of them are inside a popup, the rest inside components as dead as they
      // are. "Nothing places it" would send someone looking for a use that exists.
      const strip = previewStrip(
        input({ canvasLabel: 'Bookmark', showingPages: [], placedIn: [{ label: 'Cards big popup' }] })
      );

      expect(strip.shape).toBe('unplaced');
      expect(strip.rest).toBe("— it's only inside Cards big popup, which no page shows.");
    });

    it('names up to three hosts and counts the rest, like the page list', () => {
      const hosts = [{ label: 'A' }, { label: 'B' }, { label: 'C' }, { label: 'D' }];
      const strip = previewStrip(input({ canvasLabel: 'Bookmark', showingPages: [], placedIn: hosts }));

      expect(strip.rest).toBe("— it's only inside A, B, C and 1 more, which no page shows.");
    });
  });

  describe('shape 3 — logic', () => {
    it('says it draws nothing and where it runs', () => {
      const strip = previewStrip(
        input({
          canvasLabel: 'Format price',
          isLogic: true,
          showingPages: [],
          runningPages: [page('Home'), page('Checkout')]
        })
      );

      expect(strip.shape).toBe('logic');
      expect(strip.lead).toBe('Format price is logic — it draws nothing.');
      expect(strip.rest).toBe('It runs on Home and Checkout.');
      expect(strip.doors).toEqual([{ kind: 'bench', label: OPEN_ON_WORKBENCH }]);
    });

    it('logic nothing runs says that, rather than listing an empty list', () => {
      const strip = previewStrip(input({ canvasLabel: 'Format price', isLogic: true, showingPages: [], runningPages: [] }));

      expect(strip.rest).toBe('Nothing in the app runs it yet.');
    });

    it('🔴 logic that runs on the screen being shown draws no strip at all', () => {
      // The guard order is the meaning. Logic renders nowhere, so `onScreen` is false for every
      // logic component — reading shape 3 off `isLogic` alone would put a permanent strip under the
      // preview for every logic component in the project, including the ones doing their job on the
      // page in front of the user.
      const strip = previewStrip(
        input({
          canvasLabel: 'Format price',
          isLogic: true,
          screenPage: '/Pages/Pricing',
          showingPages: [],
          runningPages: [page('Pricing')]
        })
      );

      expect(strip.shape).toBe('agree');
    });
  });

  /**
   * 🔴 RULED 2026-09-18 (Richard): **the row is always drawn.**
   *
   * These arms exist because the opposite was shipped first and was *correct against its own spec*
   * — §2 says "when they agree: no strip". What retired that was a different ruling the same day:
   * once the row moved to the seam it was a separator, and the agree shot showed the app's hero
   * image abutting the canvas grid with nothing between them. His stated reason applied to both
   * cases; the row applied to one.
   *
   * So `agree` is now about TONE. The assertions below are on the words, because the whole point of
   * a quiet row is that it says something, and a string nobody pins sits a ruling behind.
   */
  describe('when they agree — the quiet row', () => {
    it('is still drawn, without doors and without an amber wash', () => {
      const strip = previewStrip(input({ onScreen: true }));

      expect(strip.shape).toBe('agree');
      expect(strip.tone).toBe('quiet');
      expect(strip.doors).toEqual([]);
    });

    it('names the component and the screen the preview is showing', () => {
      const strip = previewStrip(input({ onScreen: true }));

      expect(strip.lead).toBe('Hero is on Pricing.');
      expect(strip.rest).toBe('The preview is showing that screen.');
    });

    it('🔴 never claims the person can SEE it', () => {
      // A component can be on the page and scrolled past, inside a closed accordion, or behind a
      // popup. The row is entitled to a claim about the SCREEN, not about the retina. "You're
      // looking at it" was the phrasing this arm exists to keep out.
      const strip = previewStrip(input({ onScreen: true }));
      const everything = `${strip.lead} ${strip.rest}`.toLowerCase();

      expect(everything.length).toBeGreaterThan(20);
      expect(everything).not.toContain('looking at it');
      expect(everything).not.toContain('you can see');
    });

    it('🔴 says something DIFFERENT when the canvas is sitting on the page itself', () => {
      // There is no *it* to point at: the thing on the canvas IS the thing in the preview. "Home is
      // on Home" is the sentence this arm exists to prevent.
      const strip = previewStrip(
        input({ canvasLabel: 'Pricing', canvasComponent: '/Pages/Pricing', onScreen: true })
      );

      expect(strip.lead).toBe('Pricing is the screen the preview is showing.');
      expect(strip.rest).toBe('');
    });

    it('🔴 compares the PAGE, not the label, to decide that', () => {
      // Two components in two folders can read the same. `/Admin/Settings` on the canvas while the
      // preview shows `/Settings` is two different pages, and a label comparison calls them one.
      const strip = previewStrip(
        input({
          canvasLabel: 'Settings',
          canvasComponent: '/Admin/Settings',
          screenLabel: 'Settings',
          screenPage: '/Settings',
          onScreen: true
        })
      );

      expect(strip.lead).toBe('Settings is on Settings.');
      expect(strip.rest).toBe('The preview is showing that screen.');
    });

    it('logic that runs on this screen says so, rather than saying nothing', () => {
      const strip = previewStrip(
        input({
          canvasLabel: 'Format price',
          isLogic: true,
          screenPage: '/Pages/Pricing',
          showingPages: [],
          runningPages: [page('Pricing')]
        })
      );

      expect(strip.shape).toBe('agree');
      expect(strip.tone).toBe('quiet');
      // Not "you're looking at it": it draws nothing, so there is nothing to look at.
      expect(strip.lead).toBe('Format price is logic — it draws nothing.');
      expect(strip.rest).toBe('It runs on this screen.');
    });

    it('is a wordless seam when there is no canvas at all', () => {
      // The detached preview window has no node graph — `activeCanvasComponentName()` is
      // `undefined` there, and "nothing to diverge from" is not a divergence. The boundary is still
      // a boundary, so the row is there and empty.
      const strip = previewStrip(input({ canvasLabel: '' }));

      expect(strip.shape).toBe('agree');
      expect(strip.tone).toBe('quiet');
      expect(strip.lead).toBe('');
      expect(strip.rest).toBe('');
      expect(strip).toEqual(seam());
    });
  });

  describe('tone', () => {
    it('🔴 every shape that is not `agree` is a notice, and every `agree` is quiet', () => {
      // The pairing is what the view keys its wash, its doors and its dismiss button off. A shape
      // that arrived as a notice with no doors, or as quiet with a wash, would be a row that looks
      // like it can be acted on and cannot.
      const shapes: StripInput[] = [
        input(),
        input({ showingPages: [], placedIn: [] }),
        input({ isLogic: true, showingPages: [], runningPages: [] }),
        input({ onScreen: true }),
        input({ canvasLabel: '' })
      ];

      for (const one of shapes) {
        const strip = previewStrip(one);
        expect(strip.tone).toBe(strip.shape === 'agree' ? 'quiet' : 'notice');
        // Only a notice is ever escapable. A quiet row with a door is a door out of nothing.
        expect(strip.doors.length > 0).toBe(strip.shape !== 'agree');
      }
    });
  });

  describe('pageList', () => {
    it('is empty for no pages, and never says "and" for one', () => {
      expect(pageList([])).toBe('');
      expect(pageList([page('Home')])).toBe('Home');
    });

    it('counts rather than lists past the cap', () => {
      const many = Array.from({ length: MAX_NAMED_PAGES + 4 }, (_, i) => page(`P${i}`));

      expect(pageList(many)).toContain(`and ${many.length - MAX_NAMED_PAGES} more`);
    });
  });
});

describe("TVW-002 — a component a repeater draws (Richard, 2026-09-18)", () => {
  const base = {
    canvasLabel: 'Checkbox Item',
    canvasComponent: '/Checkbox Item',
    screenLabel: 'Home',
    screenPage: '/Home',
    onScreen: true,
    isLogic: false,
    showingPages: [{ page: '/Home', label: 'Home' }],
    runningPages: [{ page: '/Home', label: 'Home' }],
    placedIn: []
  };

  it('says so, because how many are there depends on data the editor has not run', () => {
    const strip = previewStrip({ ...base, repeated: true });
    expect(strip.shape).toBe('agree');
    expect(strip.lead).toBe('Checkbox Item is on Home — once per item.');
    expect(strip.rest).toBe('The preview is showing that screen.');
  });

  it('leaves the plain sentence alone for a component placed once', () => {
    expect(previewStrip({ ...base, repeated: false }).lead).toBe('Checkbox Item is on Home.');
    expect(previewStrip(base).lead).toBe('Checkbox Item is on Home.');
  });
});
