// Keys and the mouse, in one place. Held keys are a set; taps are kept until a frame reads them (a quick
// tap counts on a slow frame). The mouse is a stick while the pointer is locked: clicking the view takes it.

const HELD = new Set(['KeyE', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyR', 'KeyF', 'KeyQ', 'ShiftLeft', 'ShiftRight', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
const ACTIONS = new Set(['KeyE', 'KeyJ', 'Tab', 'KeyT', 'KeyV', 'KeyM', 'Digit1', 'Digit2', 'Digit3', 'Digit4']);

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.taps = new Set();
    this.dx = 0;
    this.dy = 0;
    this.locked = false;
    this.wantLock = false;
    this.trigger = false;
    this.clicked = false;
    this.onAction = null;
    this.onPress = null;
    this.dragging = false;
    this.lockAllowed = true;
    const typing = () => ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
    window.addEventListener('keydown', (e) => {
      if (typing() || e.metaKey || e.ctrlKey || e.altKey) return;
      if (HELD.has(e.code)) {
        e.preventDefault();
        this.keys.add(e.code);
        this.taps.add(e.code);
      }
      if (ACTIONS.has(e.code) && !e.repeat) {
        e.preventDefault();
        this.onAction?.(e.code);
      }
      if (e.code === 'Tab') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.trigger = false;
    });
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      canvas.focus({ preventScroll: true });
      // A free cursor on a mark selects it (onPress says so by returning true): no shot, no stick.
      const r = canvas.getBoundingClientRect();
      if (!this.locked && this.onPress?.(e.clientX - r.left, e.clientY - r.top) === true) return;
      if (e.button === 0) {
        this.trigger = true;
        this.clicked = true;
        this.dragging = !this.locked;
      }
      this.lock();
    });
    window.addEventListener('pointerup', (e) => {
      if (e.button === 0) this.trigger = this.dragging = false;
    });
    canvas.addEventListener('pointermove', (e) => {
      // Locked, the mouse is a stick; free, a held button drags (the captain's chair orbits that way).
      if (!this.locked && !this.dragging) return;
      this.dx += e.movementX;
      this.dy += e.movementY;
    });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.wheel = (this.wheel ?? 0) + Math.sign(e.deltaY);
    }, { passive: false });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      if (!this.locked) this.wantLock = false;
    });
    canvas.tabIndex = 0;
  }

  lock() {
    if (this.locked || !this.lockAllowed || !this.canvas.requestPointerLock) return;
    try {
      const p = this.canvas.requestPointerLock({ unadjustedMovement: true });
      this.wantLock = true;
      p?.catch?.(() => (this.wantLock = false));
    } catch {
      this.wantLock = false;
    }
  }

  unlock() {
    if (this.locked) document.exitPointerLock();
  }

  /** The mouse's movement since the last call, then zero. */
  mouse() {
    const m = { dx: this.dx, dy: this.dy };
    this.dx = this.dy = 0;
    return m;
  }

  /** Keys held or tapped since the last frame. */
  frame() {
    const k = new Set([...this.keys, ...this.taps]);
    this.taps.clear();
    const clicked = this.clicked;
    this.clicked = false;
    const wheel = this.wheel ?? 0;
    this.wheel = 0;
    return { keys: k, clicked, wheel, trigger: this.trigger, ...this.mouse() };
  }
}
