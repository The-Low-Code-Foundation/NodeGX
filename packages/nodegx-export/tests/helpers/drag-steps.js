/**
 * P134 session 13. A person's pointer on a Drag, the same in the React arm (`export-react-arm.js`) and the HTML arm
 * (`export-html-arm.ts`), so the two exports are dragged by one hand.
 *
 * - `sizeDragLayout(window, { wrapper: [w, h], parent: [w, h] })`: jsdom lays nothing out, so every element is 0 by 0 and
 *   `bounds: 'parent'` would pin the drag at 0. This gives the dragged element (the one whose inline style holds a
 *   `transform`: the wrapper both exports draw) and the element holding it the sizes React's §B fake gives them in
 *   `drag.test.ts` (the card 80 by 80, the board 320 by 200). Everything else stays 0, and no padding, border or offset is
 *   given, so `getBoundPosition` reads the board's inner box as the whole board.
 * - `dragStep(window, verb, x, y)`: `down` is a primary-button `mousedown` on the dragged element's first child (it
 *   bubbles to the wrapper, as a press on the card does); `move` and `up` go to the document, where react-draggable
 *   listens during a drag.
 * - `readDrag(window)`: `transform=<the dragged element's transform>`, the cell both arms add to a reading with a layout.
 * - A step label is `mouse:<down|move|up>:<x>:<y>` (client coordinates) or `wait:<ms>`; `DRAG_STEP` reads one.
 */

const DRAG_STEP = /^mouse:(down|move|up):(-?\d+(?:\.\d+)?):(-?\d+(?:\.\d+)?)$/;
const WAIT_STEP = /^wait:(\d+)$/;

function dragged(el) {
  return el && el.style && el.style.transform !== '' && el.style.transform !== undefined;
}

function sizeDragLayout(w, layout) {
  const size = (el, i) => (dragged(el) ? layout.wrapper[i] : dragged(el.firstElementChild) ? layout.parent[i] : 0);
  Object.defineProperty(w.HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() {
      return size(this, 0);
    }
  });
  Object.defineProperty(w.HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return size(this, 1);
    }
  });
}

function dragStep(w, verb, x, y) {
  const doc = w.document;
  const init = { clientX: Number(x), clientY: Number(y), button: 0, bubbles: true, cancelable: true };
  if (verb === 'down') {
    const wrapper = [...doc.querySelectorAll('div')].find(dragged);
    if (!wrapper) throw new Error('no dragged element on the page');
    (wrapper.firstElementChild || wrapper).dispatchEvent(new w.MouseEvent('mousedown', init));
    return;
  }
  doc.dispatchEvent(new w.MouseEvent(verb === 'move' ? 'mousemove' : 'mouseup', init));
}

function readDrag(w) {
  const wrapper = [...w.document.querySelectorAll('div')].find(dragged);
  return `transform=${wrapper ? wrapper.style.transform : 'none'}`;
}

module.exports = { DRAG_STEP, WAIT_STEP, sizeDragLayout, dragStep, readDrag };
