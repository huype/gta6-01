// Pedestrians: Solmar locals strolling the sidewalks and the beach promenade. Each one
// picks a nearby sidewalk point, walks to it, pauses, and picks another. A hit knocks one
// down for a while; a downed pedestrian gets up and runs away from the player.

import { PALETTE, PED_COUNT } from './config.js';

function makePed(random, city, x, y) {
  const p = x === undefined ? city.sidewalkPoint() : { x, y };
  return {
    x: p.x, y: p.y,
    tx: p.x, ty: p.y,
    angle: random.range(0, Math.PI * 2),
    speed: random.range(55, 95),
    color: random.pick(PALETTE.pedShirt),
    skin: random.pick(['#f2c79b', '#d9a066', '#8a5a3b', '#f7d7b0']),
    down: 0, pause: random.range(0, 2), flee: 0,
    walkPhase: random.range(0, Math.PI * 2),
  };
}

export function createPedestrians(random, city, count = PED_COUNT) {
  const peds = [];
  let guard = 0;
  while (peds.length < count && guard < 600) {
    guard += 1;
    const p = city.sidewalkPoint();
    if (city.hitsBuilding(p.x, p.y, 18) || city.inPark(p.x, p.y)) continue;
    peds.push(makePed(random, city, p.x, p.y));
  }
  return peds;
}

export function stepPedestrians(peds, city, player, dt) {
  for (const ped of peds) {
    if (ped.down > 0) {
      ped.down -= dt;
      continue;
    }
    ped.walkPhase += dt * 9;
    if (ped.flee > 0) {
      ped.flee -= dt;
      const dx = ped.x - player.x;
      const dy = ped.y - player.y;
      const d = Math.hypot(dx, dy) || 1;
      ped.angle = Math.atan2(dy / d, dx / d);
      ped.x += Math.cos(ped.angle) * 190 * dt;
      ped.y += Math.sin(ped.angle) * 190 * dt;
      const pos = { x: ped.x, y: ped.y };
      city.collideCircle(pos, 12);
      ped.x = pos.x;
      ped.y = pos.y;
      continue;
    }
    const dx = ped.tx - ped.x;
    const dy = ped.ty - ped.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 14) {
      ped.pause -= dt;
      if (ped.pause <= 0) {
        const next = city.sidewalkPoint();
        ped.tx = next.x;
        ped.ty = next.y;
        ped.pause = Math.random() * 2 + 0.5;
      }
      continue;
    }
    ped.angle = Math.atan2(dy, dx);
    ped.x += Math.cos(ped.angle) * ped.speed * dt;
    ped.y += Math.sin(ped.angle) * ped.speed * dt;
    const pos = { x: ped.x, y: ped.y };
    city.collideCircle(pos, 12);
    ped.x = pos.x;
    ped.y = pos.y;
  }
}

/** Knock a pedestrian down; returns true when it was standing. */
export function knockPed(ped) {
  if (ped.down > 0) return false;
  ped.down = 2.2;
  ped.flee = 6;
  return true;
}
