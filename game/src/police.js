// The wanted level and the Solmar police. Crimes raise stars; stars bring patrol cars
// that hunt the player down the roads. Hide long enough and the heat cools off. If a
// patrol car pins the player (slow, on foot or in a car) the bust meter fills and the
// player is caught.

import { CAR, POLICE_MAX, POLICE_PER_STAR, WANTED } from './config.js';

export function createPolice(random) {
  const cars = [];
  const state = {
    stars: 0,
    heat: 0, // seconds since the last crime
    bust: 0, // 0..1, fills while a patrol car pins the player
    busted: false,
    sirenPhase: 0,
  };

  function addStars(n, game) {
    if (state.stars >= WANTED.maxStars) return;
    state.stars = Math.min(WANTED.maxStars, state.stars + n);
    state.heat = 0;
    if (game && game.onCrime) game.onCrime(state.stars);
  }

  function spawnCar(game, x, y) {
    const car = game.cars.makeCar(random, x, y, 0, '#2f6fd0');
    car.police = true;
    car.speed = 200;
    cars.push(car);
    return car;
  }

  function step(dt, game) {
    const player = game.player;
    const city = game.city;
    state.sirenPhase += dt * 6;
    state.heat += dt;

    // Cool off: no crime for a while and no patrol car close by.
    const nearest = cars.length
      ? Math.min(...cars.map((c) => Math.hypot(c.x - player.x, c.y - player.y)))
      : Infinity;
    if (state.stars > 0 && state.heat > WANTED.decayDelay && nearest > 520) {
      state.heat = 0;
      state.stars -= 1;
      if (game.onWantedChange) game.onWantedChange(state.stars);
    }

    // Keep the patrol at the wanted level's strength.
    const wanted = Math.min(POLICE_MAX, state.stars * POLICE_PER_STAR);
    while (cars.length < wanted) {
      const edge = random.int(0, 3);
      const x = edge === 0 ? 200 : edge === 1 ? 3000 : random.range(300, 2900);
      const y = edge === 2 ? 200 : edge === 3 ? 2000 : random.range(300, 1900);
      spawnCar(game, x, y);
    }
    while (cars.length > wanted) cars.pop();

    // Each patrol car chases: steer toward the player, faster than traffic, and ram.
    // Each car aims at its own point around the player, so the patrol surrounds instead
    // of piling onto one spot.
    let rammed = false;
    let ramX = 0;
    let ramY = 0;
    for (let index = 0; index < cars.length; index += 1) {
      const car = cars[index];
      car.lights += dt;
      const spread = index * 2.399; // golden angle: each car its own approach
      const aimX = player.x + Math.cos(spread) * 110;
      const aimY = player.y + Math.sin(spread) * 110;
      const dx = aimX - car.x;
      const dy = aimY - car.y;
      const dist = Math.hypot(dx, dy) || 1;
      const desired = Math.atan2(dy, dx);
      let diff = desired - car.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const turn = Math.max(-3.4 * dt, Math.min(3.4 * dt, diff * 2.4));
      car.angle += turn;
      const playerDist = Math.hypot(player.x - car.x, player.y - car.y);
      const beforeX = car.x;
      const beforeY = car.y;
      let targetSpeed = playerDist > 700 ? CAR.maxSpeed * 0.94 : CAR.maxSpeed * 0.82;
      if (car.reverse > 0) {
        // Backing out of a corner it got wedged in.
        car.reverse -= dt;
        targetSpeed = -220;
      }
      car.speed += Math.max(-620 * dt, Math.min(480 * dt, targetSpeed - car.speed));
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      const pos = { x: car.x, y: car.y };
      city.collideCircle(pos, 26);
      car.x = pos.x;
      car.y = pos.y;
      // Barely moving while trying to go fast means wedged on a building: back out.
      const moved = Math.hypot(car.x - beforeX, car.y - beforeY);
      if (moved < 6 && Math.abs(targetSpeed) > 100 && car.reverse <= 0) {
        car.stuck = (car.stuck ?? 0) + dt;
        if (car.stuck > 0.8) {
          car.reverse = 0.9;
          car.stuck = 0;
        }
      } else if (car.reverse <= 0) {
        car.stuck = 0;
      }
      // Ram: the patrol car bounces off; the shove and the damage land once a step,
      // however many cars are touching the player, so a pile-up cannot pin the car.
      if (playerDist < 46) {
        const pdx = player.x - car.x;
        const pdy = player.y - car.y;
        const overlap = 46 - playerDist;
        car.x -= (pdx / playerDist) * overlap;
        car.y -= (pdy / playerDist) * overlap;
        car.speed *= 0.55;
        rammed = true;
        ramX += pdx / playerDist;
        ramY += pdy / playerDist;
      }
      // Bust: the player is slow and a patrol car is right on them.
      const playerSpeed = player.inCar && player.car ? Math.abs(player.car.speed) : player.speed;
      if (playerDist < 70 && playerSpeed < 60) {
        state.bust += dt / WANTED.bustSeconds;
        if (state.bust >= 1) state.busted = true;
      } else {
        state.bust = Math.max(0, state.bust - dt * 0.6);
      }
    }
    if (rammed) {
      const len = Math.hypot(ramX, ramY) || 1;
      if (player.inCar && player.car) {
        player.car.x += (ramX / len) * 4;
        player.car.y += (ramY / len) * 4;
        const carPos = { x: player.car.x, y: player.car.y };
        city.collideCircle(carPos, 26);
        player.car.x = carPos.x;
        player.car.y = carPos.y;
        player.x = player.car.x;
        player.y = player.car.y;
        // No speed drain: a ram shoves the car, it does not glue it to the road.
      } else {
        player.x += (ramX / len) * 4;
        player.y += (ramY / len) * 4;
        const playerPos = { x: player.x, y: player.y };
        city.collideCircle(playerPos, 14);
        player.x = playerPos.x;
        player.y = playerPos.y;
      }
      if (game.hurtPlayer) game.hurtPlayer(26 * dt, 'ram');
    }
    // Patrol cars keep their distance from each other instead of piling up.
    for (let i = 0; i < cars.length; i += 1) {
      for (let j = i + 1; j < cars.length; j += 1) {
        const a = cars[i];
        const b = cars[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d < 60 && d > 0.01) {
          const push = (60 - d) / 2;
          a.x -= (dx / d) * push;
          a.y -= (dy / d) * push;
          b.x += (dx / d) * push;
          b.y += (dy / d) * push;
        }
      }
    }
    return state;
  }

  function reset() {
    cars.length = 0;
    state.stars = 0;
    state.heat = 0;
    state.bust = 0;
    state.busted = false;
  }

  return { state, cars, addStars, step, reset };
}
