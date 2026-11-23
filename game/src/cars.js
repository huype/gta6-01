// Cars: the player's ride, parked cars waiting to be taken, and traffic that drives the
// road grid. A car is a position, an angle and a speed; steering only bites while moving,
// and off-road driving drags. Traffic picks a lane, drives it, and turns at intersections.

import { BEACH, CAR, ROADS, WORLD } from './config.js';

export const CAR_COLORS = ['#d94f3d', '#3d7dd9', '#e8c53a', '#7fb069', '#c9c9c9', '#8a5fc0', '#e07b39', '#2f2f38'];

function makeCar(random, x, y, angle, color) {
  return {
    x, y, angle, speed: 0, color: color ?? random.pick(CAR_COLORS),
    parked: false, police: false, lights: 0,
    // Traffic state.
    lane: 0, vertical: true, dir: 1, turnAt: 0, stuck: 0,
  };
}

/** Step one car with player-style controls: throttle -1..1, steer -1..1, handbrake. */
export function driveCar(car, city, dt, throttle, steer, handbrake) {
  const onRoad = city.onRoad(car.x, car.y);
  const drag = onRoad ? 1 : CAR.offRoadDrag;
  if (throttle > 0) car.speed += CAR.accel * throttle * drag * dt;
  else if (throttle < 0) {
    if (car.speed > 12) car.speed -= CAR.brake * dt;
    else car.speed += CAR.reverseAccel * throttle * dt;
  } else {
    car.speed -= Math.sign(car.speed) * 240 * dt;
    if (Math.abs(car.speed) < 8) car.speed = 0;
  }
  if (handbrake) car.speed -= Math.sign(car.speed) * 900 * dt;
  car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, car.speed));
  if (Math.abs(car.speed) > 4) {
    car.angle += steer * CAR.turnRate * dt * Math.sign(car.speed) * (1 - Math.min(0.45, Math.abs(car.speed) / 1600));
  }
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  car.x = Math.max(26, Math.min(WORLD.width - 26, nx));
  car.y = Math.max(26, Math.min(WORLD.height - 26, ny));
  const pos = { x: car.x, y: car.y };
  const hit = city.collideCircle(pos, 26);
  const pushedX = pos.x - car.x;
  const pushedY = pos.y - car.y;
  car.x = pos.x;
  car.y = pos.y;
  if (hit) {
    // A real impact (heading into the wall) snaps the car to the nearest road direction
    // so it slides along the wall; a brush while turning along the wall does neither.
    const pushLen = Math.hypot(pushedX, pushedY) || 1;
    const intoWall = (Math.cos(car.angle) * pushedX + Math.sin(car.angle) * pushedY) / pushLen;
    if (intoWall < -0.3) {
      if (Math.abs(pushedX) > 1 && Math.abs(pushedX) >= Math.abs(pushedY)) {
        car.angle = Math.sin(car.angle) >= 0 ? Math.PI / 2 : -Math.PI / 2;
      } else if (Math.abs(pushedY) > 1) {
        car.angle = Math.cos(car.angle) >= 0 ? 0 : Math.PI;
      }
      car.speed *= 0.5;
    }
  }
  if (city.inSea(car.x, car.y)) {
    // The sea is a wall: push back out onto the sand.
    car.y = BEACH.seaY - 30;
    car.speed *= 0.4;
  }
  return hit;
}

function pickLane(random, city, car) {
  const p = city.roadPoint();
  car.x = p.x;
  car.y = p.y;
  const near = city.nearestRoad(p.x, p.y);
  car.vertical = near.vertical;
  car.lane = near.line;
  car.dir = random.chance(0.5) ? 1 : -1;
  car.angle = car.vertical ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (car.dir > 0 ? 0 : Math.PI);
  car.speed = 0;
  car.turnAt = 0;
}

/** Traffic cars drive their lane and turn at the next intersection they meet. */
export function stepTraffic(car, city, random, dt, others) {
  const target = car.vertical ? car.lane : car.y;
  const cruise = 150 + ((car.x + car.y) % 40);
  // Stay in lane: gently steer toward the lane centre line.
  const laneError = car.vertical ? car.x - car.lane : car.y - car.lane;
  const desired = car.vertical
    ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2) - Math.max(-0.5, Math.min(0.5, laneError * 0.012 * car.dir))
    : (car.dir > 0 ? 0 : Math.PI) + Math.max(-0.5, Math.min(0.5, laneError * 0.012 * car.dir));
  let diff = desired - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.angle += Math.max(-2.2 * dt, Math.min(2.2 * dt, diff));

  // Slow for the car ahead on the same lane.
  let ahead = Infinity;
  for (const other of others) {
    if (other === car || other.parked) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const forward = car.vertical ? dy * car.dir : dx * car.dir;
    const side = car.vertical ? Math.abs(dx) : Math.abs(dy);
    if (forward > 0 && forward < 130 && side < 40) ahead = Math.min(ahead, forward);
  }
  const want = ahead < 110 ? 0 : cruise;
  car.speed += Math.max(-500 * dt, Math.min(240 * dt, want - car.speed));

  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  const pos = { x: car.x, y: car.y };
  city.collideCircle(pos, 24);
  car.x = pos.x;
  car.y = pos.y;
  if (city.inSea(car.x, car.y)) car.y = BEACH.seaY - 30;

  // At an intersection, sometimes turn onto the crossing road.
  const along = car.vertical ? car.y : car.x;
  const lines = car.vertical ? ROADS.horizontal : ROADS.vertical;
  for (const line of lines) {
    if (Math.abs(along - line) < 26 && car.turnAt !== line && random.chance(0.35)) {
      car.turnAt = line;
      const wasVertical = car.vertical;
      car.vertical = !wasVertical;
      car.lane = line;
      car.dir = random.chance(0.5) ? 1 : -1;
      car.angle = car.vertical ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (car.dir > 0 ? 0 : Math.PI);
      break;
    }
    if (Math.abs(along - line) > 60) car.turnAt = 0;
  }
  // Wrap around the far edge so traffic never runs out.
  if (car.y > BEACH.sandY - 40 && car.vertical && car.dir > 0) pickLane(random, city, car);
  if (car.x > WORLD.width - 40 && !car.vertical && car.dir > 0) pickLane(random, city, car);
  if (car.y < 40 && car.vertical && car.dir < 0) pickLane(random, city, car);
  if (car.x < 40 && !car.vertical && car.dir < 0) pickLane(random, city, car);
}

export function createCars(random, city, parkedCount, trafficCount) {
  const parked = [];
  const traffic = [];
  let guard = 0;
  while (parked.length < parkedCount && guard < 400) {
    guard += 1;
    const p = city.sidewalkPoint();
    // Parked cars sit on the road edge, parallel to the nearest road.
    const near = city.nearestRoad(p.x, p.y);
    const x = near.vertical ? near.line + (p.x > near.line ? 1 : -1) * (ROADS.width / 2 - 22) : p.x;
    const y = near.vertical ? p.y : near.line + (p.y > near.line ? 1 : -1) * (ROADS.width / 2 - 22);
    if (city.hitsBuilding(x, y, 40) || city.inPark(x, y)) continue;
    if (parked.some((c) => Math.hypot(c.x - x, c.y - y) < 120)) continue;
    const angle = near.vertical ? (random.chance(0.5) ? Math.PI / 2 : -Math.PI / 2) : (random.chance(0.5) ? 0 : Math.PI);
    const car = makeCar(random, x, y, angle);
    car.parked = true;
    parked.push(car);
  }
  for (let i = 0; i < trafficCount; i += 1) {
    const car = makeCar(random, 0, 0, 0);
    pickLane(random, city, car);
    car.speed = 150;
    traffic.push(car);
  }
  return { parked, traffic, makeCar };
}
