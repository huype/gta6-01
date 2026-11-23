// Keyboard and mouse input. Keys are tracked by code so layouts do not matter;
// actions (confirm, pause, enter car, punch, mute) fire once per press.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER_CAR = 4;
export const ACTION_PUNCH = 8;
export const ACTION_MUTE = 16;

const CONFIRM_KEYS = new Set(['Enter', 'Space']);
const PAUSE_KEYS = new Set(['KeyP', 'Escape']);
const ENTER_CAR_KEYS = new Set(['KeyE']);
const PUNCH_KEYS = new Set(['KeyF']);
const MUTE_KEYS = new Set(['KeyM']);

export function createInput(canvas) {
  const down = new Set();
  let queued = 0;

  function keyToAction(code) {
    if (CONFIRM_KEYS.has(code)) return ACTION_CONFIRM;
    if (PAUSE_KEYS.has(code)) return ACTION_PAUSE;
    if (ENTER_CAR_KEYS.has(code)) return ACTION_ENTER_CAR;
    if (PUNCH_KEYS.has(code)) return ACTION_PUNCH;
    if (MUTE_KEYS.has(code)) return ACTION_MUTE;
    return 0;
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    down.add(event.code);
    queued |= keyToAction(event.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    down.delete(event.code);
  });
  window.addEventListener('blur', () => down.clear());
  canvas.addEventListener('pointerdown', () => {
    queued |= ACTION_CONFIRM;
  });

  function axis(neg, pos) {
    return (down.has(pos) ? 1 : 0) - (down.has(neg) ? 1 : 0);
  }

  return {
    /** -1/0/1 drive axis: W/S or Up/Down. */
    drive() {
      return axis('KeyS', 'KeyW') || axis('ArrowDown', 'ArrowUp');
    },
    /** -1/0/1 steering axis: A/D or Left/Right. */
    steer() {
      return axis('KeyA', 'KeyD') || axis('ArrowLeft', 'ArrowRight');
    },
    /** True while Shift (run / handbrake) is held. */
    run() {
      return down.has('ShiftLeft') || down.has('ShiftRight');
    },
    /** Bitmask of actions pressed since the last call; clears the queue. */
    takeActions() {
      const actions = queued;
      queued = 0;
      return actions;
    },
  };
}
