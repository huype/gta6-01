// Missions: Dario Venn's first week in Solmar. A short story in six jobs for Mara Solis,
// who runs the garage on Marina Row. Each mission is a list of steps; a step is a place to
// reach, a thing to pick up, a car to take, or heat to lose. Completing a mission pays cash
// and opens the next one; finishing all six ends the story and leaves free roam.

import { MISSION_REWARDS } from './config.js';

const GARAGE = { x: 1000, y: 900 };
const WAREHOUSE = { x: 2200, y: 400 };
const KIOSK = { x: 1600, y: 2200 };
const HIDEOUT = { x: 2800, y: 1900 };
const PLAZA = { x: 400, y: 400 };

function gotoStep(text, target, radius = 80) {
  return { kind: 'goto', text, target, radius };
}
function pickupStep(text, target, label) {
  return { kind: 'pickup', text, target, radius: 56, label };
}
function collectStep(text, targets) {
  return { kind: 'collect', text, targets, radius: 56, got: 0 };
}

const MISSION_DEFS = [
  {
    title: 'First Wheels',
    briefing: 'Mara Solis needs a driver with a car. Any car. Borrow one from the street and bring it to her garage.',
    steps: [
      { kind: 'enterCar', text: 'Take a parked car (walk up to one and press E)' },
      gotoStep('Drive to Mara\'s garage on Marina Row', GARAGE),
    ],
  },
  {
    title: 'Sunset Parcel',
    briefing: 'A parcel is waiting at the dockside warehouse. Pick it up and run it down to Lena\'s kiosk on the beach before the sun drops.',
    steps: [
      pickupStep('Pick up the parcel at the warehouse', WAREHOUSE, 'parcel'),
      gotoStep('Deliver the parcel to Lena\'s beach kiosk', KIOSK),
    ],
  },
  {
    title: 'Tail Spin',
    briefing: 'That parcel was hotter than Mara said. The Solmar police are on you — shake them and get to the old hideout under the east bridge.',
    startWanted: 2,
    steps: [
      gotoStep('Reach the hideout on the east side', HIDEOUT, 90),
      { kind: 'escape', text: 'Lose the heat — stay clear of patrol cars until the stars fade' },
    ],
  },
  {
    title: 'Harbor Run',
    briefing: 'Three crates of "spare parts" are scattered around the harbor district. Grab them all and stack them at the pier.',
    steps: [
      collectStep('Collect the harbor crates (3)', [
        { x: 400, y: 1400 }, { x: 2200, y: 1400 }, { x: 2800, y: 900 },
      ]),
      gotoStep('Deliver the crates to the pier', { x: 400, y: 1900 }),
    ],
  },
  {
    title: 'The Collector',
    briefing: 'Mara\'s clients pay in cash, left in dead drops around the city. Sweep up all three drops and bring the money home.',
    steps: [
      collectStep('Collect the cash drops (3)', [
        { x: 1000, y: 1400 }, { x: 2200, y: 900 }, { x: 1600, y: 400 },
      ]),
      gotoStep('Return the cash to Mara\'s garage', GARAGE),
    ],
  },
  {
    title: 'Heat Wave',
    briefing: 'One last job. The whole Solmar force is out tonight, and the buyer waits at the north plaza. Get there, get paid, get gone.',
    startWanted: 3,
    steps: [
      gotoStep('Drive to the north plaza meeting point', PLAZA, 90),
    ],
  },
];

export function createMissions() {
  let index = 0;
  let stepIndex = 0;
  let banner = null; // { text, sub, timer }
  let done = false;
  let started = false;
  let nextDelay = 0; // seconds until the next mission starts, after its banner

  function current() {
    return MISSION_DEFS[index] ?? null;
  }
  function currentStep() {
    if (nextDelay > 0) return null;
    const m = current();
    return m ? m.steps[stepIndex] : null;
  }
  function activeTarget() {
    const step = currentStep();
    if (!step) return null;
    if (step.kind === 'collect') {
      const next = step.targets.find((t) => !t.taken);
      return next ?? null;
    }
    return step.target ?? null;
  }

  function startMission(game) {
    const m = current();
    if (!m) return;
    stepIndex = 0;
    started = true;
    if (m.startWanted && game.police) {
      game.police.state.stars = Math.max(game.police.state.stars, m.startWanted);
      game.police.state.heat = 0;
    }
    banner = { text: m.title, sub: m.briefing, timer: 4.5 };
    if (game.onMissionStart) game.onMissionStart(m);
  }

  /** Advance one fixed step; returns an event name for the main loop to sound. */
  function step(dt, game) {
    if (banner) banner.timer -= dt;
    if (nextDelay > 0) {
      nextDelay -= dt;
      if (nextDelay <= 0) startMission(game);
      return null;
    }
    const m = current();
    if (!m || done) return null;
    const step = currentStep();
    if (!step) return null;
    const player = game.player;
    const px = player.x;
    const py = player.y;
    let advanced = false;

    if (step.kind === 'enterCar') {
      if (player.inCar) advanced = true;
    } else if (step.kind === 'goto') {
      if (Math.hypot(px - step.target.x, py - step.target.y) < step.radius) advanced = true;
    } else if (step.kind === 'pickup') {
      if (Math.hypot(px - step.target.x, py - step.target.y) < step.radius) advanced = true;
    } else if (step.kind === 'collect') {
      for (const t of step.targets) {
        if (!t.taken && Math.hypot(px - t.x, py - t.y) < step.radius) {
          t.taken = true;
          step.got += 1;
          if (game.onPickup) game.onPickup(t);
        }
      }
      if (step.got >= step.targets.length) advanced = true;
    } else if (step.kind === 'escape') {
      if (game.police && game.police.state.stars === 0) advanced = true;
    }

    if (advanced) {
      stepIndex += 1;
      if (game.onStepDone) game.onStepDone(step);
      if (stepIndex >= m.steps.length) {
        const reward = MISSION_REWARDS[index] ?? 200;
        game.cash += reward;
        banner = { text: 'MISSION COMPLETE', sub: `${m.title}  •  +$${reward}`, timer: 3.5 };
        index += 1;
        if (index >= MISSION_DEFS.length) {
          done = true;
          banner = { text: 'STORY COMPLETE', sub: `Solmar is yours now, Dario. Free roam — keep the heat low.`, timer: 5 };
          if (game.onStoryDone) game.onStoryDone();
        } else {
          // Reset the next mission's collect targets; it starts once the banner fades.
          const next = MISSION_DEFS[index];
          for (const s of next.steps) {
            if (s.kind === 'collect') {
              s.got = 0;
              for (const t of s.targets) t.taken = false;
            }
          }
          stepIndex = 0;
          nextDelay = 3.2;
        }
        return 'mission';
      }
      return 'step';
    }
    return null;
  }

  /** Jump to a later mission (used by the ?shot=mission staging scene). */
  function skipTo(i, game) {
    index = Math.max(0, Math.min(MISSION_DEFS.length - 1, i));
    stepIndex = 0;
    nextDelay = 0;
    const m = MISSION_DEFS[index];
    for (const s of m.steps) {
      if (s.kind === 'collect') {
        s.got = 0;
        for (const t of s.targets) t.taken = false;
      }
    }
    startMission(game);
  }

  /** Hide the mission banner (used when the game ends under it). */
  function clearBanner() {
    banner = null;
  }

  function reset() {
    index = 0;
    stepIndex = 0;
    banner = null;
    done = false;
    started = false;
    nextDelay = 0;
    for (const m of MISSION_DEFS) {
      for (const s of m.steps) {
        if (s.kind === 'collect') {
          s.got = 0;
          for (const t of s.targets) t.taken = false;
        }
      }
    }
  }

  return {
    defs: MISSION_DEFS,
    get index() { return index; },
    get done() { return done; },
    get started() { return started; },
    get banner() { return banner; },
    current, currentStep, activeTarget, startMission, skipTo, step, reset, clearBanner,
  };
}
