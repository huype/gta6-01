// The player: Dario Venn, on foot or behind the wheel. On foot he walks and runs, faces
// his movement, and can punch; in a car the car is his body. Health drains from police
// rams and punches and slowly comes back when the heat is off.

import { CAR, PLAYER, WORLD } from './config.js';

export function createPlayer(city, x, y) {
  const player = {
    x, y,
    angle: -Math.PI / 2,
    speed: 0, // current on-foot speed, for the bust check
    health: PLAYER.health,
    inCar: false,
    car: null,
    punchTimer: 0,
    punchAnim: 0,
    hurtFlash: 0,
    runPhase: 0,
  };

  function stepOnFoot(dt, input, game) {
    const mx = input.steer();
    const my = -input.drive();
    const moving = mx !== 0 || my !== 0;
    const target = input.run() ? PLAYER.runSpeed : PLAYER.walkSpeed;
    player.speed = moving ? target : 0;
    if (moving) {
      const len = Math.hypot(mx, my);
      const nx = mx / len;
      const ny = my / len;
      player.angle = Math.atan2(ny, nx);
      player.x += nx * target * dt;
      player.y += ny * target * dt;
      player.runPhase += dt * (input.run() ? 13 : 9);
    }
    const pos = { x: player.x, y: player.y };
    city.collideCircle(pos, PLAYER.radius);
    player.x = pos.x;
    player.y = pos.y;
    if (player.x > 0 && player.y >= 2300 - 4) player.y = 2300 - 4; // the sea stops a swimmer
    player.x = Math.max(PLAYER.radius, Math.min(WORLD.width - PLAYER.radius, player.x));
    player.y = Math.max(PLAYER.radius, Math.min(WORLD.height - PLAYER.radius, player.y));
    if (player.punchTimer > 0) player.punchTimer -= dt;
    if (player.punchAnim > 0) player.punchAnim -= dt;
    if (player.hurtFlash > 0) player.hurtFlash -= dt;
  }

  /** Try to get into the nearest car within reach; returns the car or null. */
  function tryEnterCar(game) {
    let best = null;
    let bestDist = 70;
    const all = [...game.cars.parked, ...game.cars.traffic, ...game.police.cars];
    for (const car of all) {
      if (car.police) continue;
      const d = Math.hypot(car.x - player.x, car.y - player.y);
      if (d < bestDist) {
        bestDist = d;
        best = car;
      }
    }
    if (!best) return null;
    player.inCar = true;
    player.car = best;
    best.parked = false;
    best.speed = 0;
    // Remember where the car came from, so exiting it puts it back on the street.
    best.fromParked = game.cars.parked.includes(best);
    best.fromTraffic = game.cars.traffic.includes(best);
    if (best.fromParked) game.cars.parked.splice(game.cars.parked.indexOf(best), 1);
    if (best.fromTraffic) game.cars.traffic.splice(game.cars.traffic.indexOf(best), 1);
    // Taking a car that is not yours is a crime, unless it was already yours.
    if (!best.owned) {
      best.owned = true;
      game.police.addStars(1, game);
    }
    player.x = best.x;
    player.y = best.y;
    return best;
  }

  function exitCar(game) {
    if (!player.inCar || !player.car) return;
    const car = player.car;
    const side = car.angle + Math.PI / 2;
    player.x = car.x + Math.cos(side) * 44;
    player.y = car.y + Math.sin(side) * 44;
    const pos = { x: player.x, y: player.y };
    city.collideCircle(pos, PLAYER.radius);
    player.x = pos.x;
    player.y = pos.y;
    player.inCar = false;
    player.car = null;
    car.speed = 0;
    // The car goes back on the street where it came from, so it can be taken again.
    if (car.fromTraffic) game.cars.traffic.push(car);
    else game.cars.parked.push(car);
    car.fromParked = false;
    car.fromTraffic = false;
  }

  /** Punch in the facing direction: knocks peds down, hurts police on foot, breaks nothing else. */
  function punch(game) {
    if (player.punchTimer > 0 || player.inCar) return false;
    player.punchTimer = PLAYER.punchCooldown;
    player.punchAnim = 0.22;
    const reach = PLAYER.punchRange + 14;
    const hx = player.x + Math.cos(player.angle) * reach;
    const hy = player.y + Math.sin(player.angle) * reach;
    let hitSomething = false;
    for (const ped of game.peds) {
      if (ped.down > 0) continue;
      if (Math.hypot(ped.x - hx, ped.y - hy) < 30) {
        game.knockPed(ped);
        game.police.addStars(1, game);
        hitSomething = true;
      }
    }
    return hitSomething;
  }

  function hurt(amount) {
    player.health = Math.max(0, player.health - amount);
    player.hurtFlash = 0.25;
    return player.health <= 0;
  }

  function heal(dt) {
    if (player.health > 0 && player.health < PLAYER.health) {
      player.health = Math.min(PLAYER.health, player.health + 1.6 * dt);
    }
  }

  player.stepOnFoot = stepOnFoot;
  player.tryEnterCar = tryEnterCar;
  player.exitCar = exitCar;
  player.punch = punch;
  player.hurt = hurt;
  player.heal = heal;
  return player;
}
