// Keyboard + mouse and touch, turned into one set of intents the game reads each frame.
//
// The phone (landscape) shows as little as it can:
//   always: a small hotbar (top centre), Jump (bottom right), the menu button (top right)
//   only when it applies: Fire (+ Aim for the rifle) with a weapon in hand, Use when you look at something usable
//   gestures, no buttons: the left half is a floating move stick (push it to the rim to run); the right half looks;
//   hold still on the right half to dig; a quick tap there places a torch (or rubble, with rubble in hand)
//   in the menu: craft, the trophy case, sound, help
export const touchDevice = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

export function makeInput(canvas, ui) {
  const I = {
    move: { x: 0, z: 0 }, look: { x: 0, y: 0 }, jump: false, sprint: false,
    primary: false, primaryDown: false, primaryUp: false, place: false, aim: false, use: false,
    slot: null, wheel: 0, craft: false, trophies: false, menu: false, autoJump: touchDevice,
    locked: false, touch: touchDevice
  };
  const keys = new Set();

  // ── keyboard + mouse ──
  addEventListener('keydown', (e) => {
    if (ui.typing()) return;
    keys.add(e.code);
    if (e.code === 'KeyE') I.use = true;
    if (e.code === 'KeyF') I.place = 'torch';
    if (e.code === 'KeyC') I.craft = true;
    if (e.code === 'KeyT' || e.code === 'Tab') {
      I.trophies = true;
      e.preventDefault();
    }
    if (/^Digit[1-4]$/.test(e.code)) I.slot = Number(e.code.slice(5)) - 1;
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  canvas.addEventListener('mousedown', (e) => {
    if (touchDevice) return;
    if (!I.locked) {
      canvas.requestPointerLock?.();
      return;
    }
    if (e.button === 0) {
      I.primary = true;
      I.primaryDown = true;
      I.downAt = performance.now();
    }
    if (e.button === 2) {
      I.place = 'held';
      I.aim = true;
    }
  });
  addEventListener('mouseup', (e) => {
    if (e.button === 0 && I.primary) {
      I.primary = false;
      I.primaryUp = true;
      I.upAt = performance.now();
    }
    if (e.button === 2) I.aim = false;
  });
  addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('mousemove', (e) => {
    if (!I.locked) return;
    I.look.x += e.movementX * 0.0022;
    I.look.y += e.movementY * 0.0022;
  });
  addEventListener('wheel', (e) => {
    if (I.locked) I.wheel += Math.sign(e.deltaY);
  });
  document.addEventListener('pointerlockchange', () => {
    I.locked = document.pointerLockElement === canvas;
    if (!I.locked) {
      I.primary = false;
      I.aim = false;
      keys.clear();
    }
    ui.lockChanged(I.locked);
  });

  // ── touch ──
  const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
  const looker = { id: null, x: 0, y: 0, sx: 0, sy: 0, t: 0, moved: false, digging: false };
  const R = 56;
  const TAP = 320; // ms: shorter is a tap (place a torch), longer held still is a dig
  if (touchDevice) {
    const zone = ui.touchZone;
    zone.addEventListener('touchstart', (e) => {
      ui.unlockAudio();
      for (const t of e.changedTouches) {
        if (t.clientX < innerWidth * 0.42 && stick.id === null) {
          Object.assign(stick, { id: t.identifier, ox: t.clientX, oy: t.clientY, x: 0, y: 0 });
          ui.stick(true, t.clientX, t.clientY, 0, 0);
        } else if (looker.id === null) {
          // Two clocks: the handler's (has the thumb become a hold yet?) and the events' own (was it a tap?), because
          // a slow frame can hold the release handler back past the tap limit.
          Object.assign(looker, { id: t.identifier, x: t.clientX, y: t.clientY, sx: t.clientX, sy: t.clientY, t: performance.now(), ts: e.timeStamp, moved: false, digging: false });
        }
      }
      e.preventDefault();
    }, { passive: false });
    zone.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === stick.id) {
          let dx = t.clientX - stick.ox, dy = t.clientY - stick.oy;
          const d = Math.hypot(dx, dy);
          if (d > R) {
            // Drag the stick's origin along, so the thumb never runs off it.
            stick.ox += (dx / d) * (d - R);
            stick.oy += (dy / d) * (d - R);
            dx = t.clientX - stick.ox;
            dy = t.clientY - stick.oy;
          }
          stick.x = dx / R;
          stick.y = dy / R;
          ui.stick(true, stick.ox, stick.oy, dx, dy);
        } else if (t.identifier === looker.id) {
          const dx = t.clientX - looker.x, dy = t.clientY - looker.y;
          I.look.x += dx * 0.0055;
          I.look.y += dy * 0.0055;
          looker.x = t.clientX;
          looker.y = t.clientY;
          if (Math.hypot(t.clientX - looker.sx, t.clientY - looker.sy) > 12) looker.moved = true;
        }
      }
      e.preventDefault();
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === stick.id) {
          stick.id = null;
          stick.x = stick.y = 0;
          ui.stick(false);
        } else if (t.identifier === looker.id) {
          I.lastTouch = { held: Math.round(e.timeStamp - looker.ts), handler: Math.round(performance.now() - looker.t), moved: looker.moved, digging: looker.digging };
          if (!looker.moved && !looker.digging && e.timeStamp - looker.ts < TAP) I.place = 'tap';
          if (looker.digging) {
            I.primary = false;
            I.primaryUp = true;
          }
          looker.id = null;
          looker.digging = false;
        }
      }
      e.preventDefault();
    };
    zone.addEventListener('touchend', end, { passive: false });
    zone.addEventListener('touchcancel', end, { passive: false });

    // The few buttons. Each is held, not clicked, so a thumb can keep it down.
    const hold = (el, on, off) => {
      el.addEventListener('touchstart', (e) => {
        ui.unlockAudio();
        on();
        e.preventDefault();
        e.stopPropagation();
      }, { passive: false });
      el.addEventListener('touchend', (e) => {
        off?.();
        e.preventDefault();
        e.stopPropagation();
      }, { passive: false });
    };
    hold(ui.buttons.jump, () => (I.jump = true), () => (I.jump = false));
    hold(ui.buttons.fire, () => {
      I.primary = true;
      I.primaryDown = true;
      I.downAt = performance.now();
    }, () => {
      I.primary = false;
      I.primaryUp = true;
      I.upAt = performance.now();
    });
    hold(ui.buttons.aim, () => (I.aimToggle = !I.aimToggle));
    hold(ui.buttons.use, () => (I.use = true));
  }

  I.frame = (weaponInHand) => {
    // Called once a frame before the game reads the intents.
    if (touchDevice) {
      I.move.x = stick.x;
      I.move.z = -stick.y;
      const mag = Math.hypot(stick.x, stick.y);
      I.sprint = mag > 0.95;
      if (mag > 1) {
        I.move.x /= mag;
        I.move.z /= mag;
      }
      // Hold still on the view to dig (not with a weapon: that has its Fire button).
      if (looker.id !== null && !looker.moved && !looker.digging && !weaponInHand && performance.now() - looker.t > TAP) {
        looker.digging = true;
        I.primary = true;
        I.primaryDown = true;
      }
      I.aim = !!I.aimToggle && weaponInHand === 'rifle';
    } else {
      I.move.x = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
      I.move.z = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
      I.jump = keys.has('Space');
      I.sprint = keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('ControlLeft');
    }
  };
  I.consume = () => {
    I.look.x = I.look.y = 0;
    I.primaryDown = I.primaryUp = false;
    I.place = false;
    I.use = false;
    I.slot = null;
    I.wheel = 0;
    I.craft = I.trophies = I.menu = false;
  };
  I.release = () => {
    I.primary = false;
    I.aim = false;
    I.aimToggle = false;
    looker.id = null;
    stick.id = null;
    stick.x = stick.y = 0;
    ui.stick(false);
  };
  return I;
}
