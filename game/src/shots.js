// The screenshot scenes behind ?shot=start|drive|chase|mission. Each one plays the real
// rules forward from a fresh game for a fixed number of steps, steered by an autopilot
// that walks to the nearest parked car, gets in, and then drives the road grid toward the
// mission target: it pursues the next intersection as a waypoint, turns there, and only
// then heads for the target, so the frame is what a short game really looks like and the
// same seed always gives the same frame.

import { ROADS, STEP } from './config.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const ACTION_ENTER_CAR = 4;

/** Nearest road line to a value, from a list of lines. */
function nearestLine(lines, value) {
  let best = lines[0];
  for (const line of lines) {
    if (Math.abs(line - value) < Math.abs(best - value)) best = line;
  }
  return best;
}

/** A scripted input source the autopilot drives instead of the keyboard. */
function scriptedInput(game) {
  let enterPressed = false;
  let targetCar = null;
  // Grid navigation state for driving: which road the car is following.
  let nav = null;
  let cached = null;
  let cachedTime = -1;
  // Stuck escape: reverse out when the car has been crawling for a while.
  let slowTime = 0;
  let reversing = 0;

  function nearestParked() {
    if (targetCar) return targetCar;
    let best = null;
    let bestDist = Infinity;
    for (const car of game.cars.parked) {
      const d = Math.hypot(car.x - game.player.x, car.y - game.player.y);
      if (d < bestDist) {
        bestDist = d;
        best = car;
      }
    }
    targetCar = best;
    return best;
  }

  /** The throttle/steer plan for this step, cached so drive() and steer() agree. */
  function plan() {
    if (cachedTime === game.time) return cached;
    cachedTime = game.time;
    const p = game.player;
    if (!p.inCar) {
      const car = nearestParked();
      cached = car
        ? { throttle: 0, steer: 0, onFoot: true, want: Math.atan2(car.y - p.y, car.x - p.x) }
        : { throttle: 0, steer: 0, onFoot: true, want: p.angle };
      return cached;
    }
    const car = p.car;
    const target = game.missions.activeTarget() || { x: 1600, y: 1400 };
    if (!nav) {
      const near = game.city.nearestRoad(car.x, car.y);
      nav = { vertical: near.vertical, lane: near.line };
    }

    // Waypoint: the target if it sits on this road, else the intersection with the
    // road nearest the target. Reaching the intersection turns the car onto it.
    // If the car was shoved off its road, the waypoint is a point on the road ahead,
    // so it drives back onto the tarmac instead of cutting across the blocks.
    let waypoint;
    if (nav.vertical) {
      if (Math.abs(car.x - nav.lane) > 50) {
        waypoint = { x: nav.lane, y: car.y + (target.y > car.y ? 150 : -150) };
      } else if (Math.abs(target.x - nav.lane) < 70) {
        waypoint = target;
      } else {
        const hy = nearestLine(ROADS.horizontal, target.y);
        waypoint = { x: nav.lane, y: hy };
        if (Math.hypot(car.x - waypoint.x, car.y - waypoint.y) < 45) {
          nav = { vertical: false, lane: hy };
          waypoint = target;
        }
      }
    } else if (Math.abs(car.y - nav.lane) > 50) {
      waypoint = { x: car.x + (target.x > car.x ? 150 : -150), y: nav.lane };
    } else if (Math.abs(target.y - nav.lane) < 70) {
      waypoint = target;
    } else {
      const vx = nearestLine(ROADS.vertical, target.x);
      waypoint = { x: vx, y: nav.lane };
      if (Math.hypot(car.x - waypoint.x, car.y - waypoint.y) < 45) {
        nav = { vertical: true, lane: vx };
        waypoint = target;
      }
    }

    const desired = Math.atan2(waypoint.y - car.y, waypoint.x - car.x);
    let diff = desired - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, diff * 2.2));
    let throttle = Math.abs(diff) > 1.1 ? 0.3 : Math.abs(diff) > 0.6 ? 0.55 : 1;

    // Stuck escape: crawling for over a second means a corner has the car.
    if (Math.abs(car.speed) < 40 && throttle > 0) slowTime += STEP;
    else slowTime = 0;
    if (slowTime > 1) {
      reversing = 1;
      slowTime = 0;
    }
    if (reversing > 0) {
      reversing -= STEP;
      throttle = -0.8;
    }
    cached = { throttle, steer, onFoot: false, want: desired };
    return cached;
  }

  return {
    drive() {
      const p = game.player;
      const pl = plan();
      if (pl.onFoot) return -Math.sin(pl.want);
      return pl.throttle;
    },
    steer() {
      const p = game.player;
      const pl = plan();
      if (pl.onFoot) return Math.cos(pl.want);
      return pl.steer;
    },
    run() {
      return false;
    },
    takeActions() {
      // Press E once when close to the parked car.
      const p = game.player;
      if (!p.inCar && !enterPressed) {
        const car = nearestParked();
        if (car && Math.hypot(car.x - p.x, car.y - p.y) < 60) {
          enterPressed = true;
          return ACTION_ENTER_CAR;
        }
      }
      return 0;
    },
  };
}

/** Run the game forward for `seconds` with the autopilot at the wheel. */
function autopilot(game, seconds) {
  const input = scriptedInput(game);
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    game.step(STEP, input);
    if (game.player.health <= 0 || game.police.state.busted) break;
  }
}

export function stageShot(name, game) {
  game.reset();
  if (name === 'start' || !name) {
    return { screen: SCREEN_TITLE };
  }
  if (name === 'drive' || name === 'play') {
    game.start();
    autopilot(game, 9);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'chase' || name === 'end') {
    game.start();
    autopilot(game, 22);
    game.police.state.stars = 3;
    game.police.state.heat = 0;
    // Bring the patrol in behind the player, closing in but not yet on top of the car,
    // so the frame catches the chase mid-flight instead of a pile-up.
    autopilot(game, 1);
    for (const car of game.police.cars) {
      car.x = game.player.x - 460;
      car.y = game.player.y - 260;
      car.angle = Math.atan2(game.player.y - car.y, game.player.x - car.x);
      car.speed = 460;
    }
    autopilot(game, 2.5);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'mission') {
    game.start();
    game.missions.skipTo(1, game);
    // Stage the player beside the parked car nearest the warehouse, so the shot shows
    // the mission itself: the pickup, the marker and the HUD.
    const target = game.missions.activeTarget();
    let best = null;
    let bestDist = Infinity;
    for (const car of game.cars.parked) {
      const d = Math.hypot(car.x - target.x, car.y - target.y);
      if (d < bestDist) {
        bestDist = d;
        best = car;
      }
    }
    if (best) {
      game.player.x = best.x + 30;
      game.player.y = best.y;
    }
    autopilot(game, 19);
    return { screen: SCREEN_PLAY };
  }
  return { screen: SCREEN_TITLE };
}
