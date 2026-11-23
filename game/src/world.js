// The city of Solmar: a fixed grid of roads, blocks of buildings, a central park and a
// beach with the sea along the south edge. Everything is generated from the seed, so the
// same seed always builds the same city. This file owns the map and the collision queries;
// it knows nothing about drawing or input.

import { BEACH, PALETTE, PARK, ROADS, WORLD } from './config.js';

function roadRects() {
  const rects = [];
  for (const x of ROADS.vertical) rects.push({ x: x - ROADS.width / 2, y: 0, w: ROADS.width, h: BEACH.sandY });
  for (const y of ROADS.horizontal) rects.push({ x: 0, y: y - ROADS.width / 2, w: WORLD.width, h: ROADS.width });
  return rects;
}

function onRoad(x, y) {
  const half = ROADS.width / 2;
  for (const rx of ROADS.vertical) if (Math.abs(x - rx) < half && y < BEACH.sandY) return true;
  for (const ry of ROADS.horizontal) if (Math.abs(y - ry) < half) return true;
  return false;
}

function inPark(x, y) {
  return x > PARK.x && x < PARK.x + PARK.width && y > PARK.y && y < PARK.y + PARK.height;
}

function inSea(x, y) {
  return y >= BEACH.seaY;
}

function inSand(x, y) {
  return y >= BEACH.sandY && y < BEACH.seaY;
}

function overlapsRect(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function createCity(random) {
  const buildings = [];
  const trees = [];
  const roads = roadRects();

  // Buildings fill each block between roads, leaving a sidewalk margin around them.
  const xs = [0, ...ROADS.vertical, WORLD.width];
  const ys = [0, ...ROADS.horizontal, BEACH.sandY];
  for (let bx = 0; bx < xs.length - 1; bx += 1) {
    for (let by = 0; by < ys.length - 1; by += 1) {
      const blockX = xs[bx] + ROADS.width / 2 + 26;
      const blockY = ys[by] + ROADS.width / 2 + 26;
      const blockW = xs[bx + 1] - ROADS.width / 2 - 26 - blockX;
      const blockH = ys[by + 1] - ROADS.width / 2 - 26 - blockY;
      if (blockW < 90 || blockH < 90) continue;
      // The park block stays green.
      if (overlapsRect({ x: blockX, y: blockY, w: blockW, h: blockH }, PARK)) continue;
      const cols = Math.max(1, Math.floor(blockW / 190));
      const rows = Math.max(1, Math.floor(blockH / 170));
      const cellW = blockW / cols;
      const cellH = blockH / rows;
      for (let cx = 0; cx < cols; cx += 1) {
        for (let cy = 0; cy < rows; cy += 1) {
          if (random.chance(0.12)) continue; // an empty lot, for variety
          const w = cellW * random.range(0.62, 0.85);
          const h = cellH * random.range(0.62, 0.85);
          const x = blockX + cx * cellW + (cellW - w) / 2;
          const y = blockY + cy * cellH + (cellH - h) / 2;
          buildings.push({
            x, y, w, h,
            roof: random.pick(PALETTE.buildingRoof),
            floors: random.int(1, 4),
            awning: random.chance(0.4),
          });
        }
      }
    }
  }

  // Trees line the park and dot the sidewalks.
  for (let i = 0; i < 46; i += 1) {
    trees.push({
      x: PARK.x + random.range(30, PARK.width - 30),
      y: PARK.y + random.range(30, PARK.height - 30),
      r: random.range(13, 20),
    });
  }
  for (let i = 0; i < 30; i += 1) {
    const vertical = random.chance(0.5);
    const x = vertical
      ? random.pick(ROADS.vertical) + (random.chance(0.5) ? -1 : 1) * (ROADS.width / 2 + 22)
      : random.range(80, WORLD.width - 80);
    const y = vertical
      ? random.range(80, BEACH.sandY - 80)
      : random.pick(ROADS.horizontal) + (random.chance(0.5) ? -1 : 1) * (ROADS.width / 2 + 22);
    if (inPark(x, y) || hitsBuilding(x, y, 20)) continue;
    trees.push({ x, y, r: random.range(11, 16) });
  }

  function hitsBuilding(x, y, radius) {
    for (const b of buildings) {
      if (x + radius > b.x && x - radius < b.x + b.w && y + radius > b.y && y - radius < b.y + b.h) return b;
    }
    return null;
  }

  /** Push a circle out of buildings and the world edge; returns the building hit, if any. */
  function collideCircle(pos, radius) {
    let hit = null;
    const b = hitsBuilding(pos.x, pos.y, radius);
    if (b) {
      hit = b;
      const left = pos.x + radius - b.x;
      const right = b.x + b.w - (pos.x - radius);
      const top = pos.y + radius - b.y;
      const bottom = b.y + b.h - (pos.y - radius);
      const min = Math.min(left, right, top, bottom);
      if (min === left) pos.x = b.x - radius;
      else if (min === right) pos.x = b.x + b.w + radius;
      else if (min === top) pos.y = b.y - radius;
      else pos.y = b.y + b.h + radius;
    }
    pos.x = Math.max(radius + 8, Math.min(WORLD.width - radius - 8, pos.x));
    pos.y = Math.max(radius + 8, Math.min(WORLD.height - radius - 8, pos.y));
    return hit;
  }

  /** A random point on a sidewalk beside a road (used for pedestrian and parked-car spots). */
  function sidewalkPoint() {
    if (random.chance(0.5)) {
      const x = random.pick(ROADS.vertical) + (random.chance(0.5) ? -1 : 1) * (ROADS.width / 2 + 24);
      return { x, y: random.range(100, BEACH.sandY - 100) };
    }
    const y = random.pick(ROADS.horizontal) + (random.chance(0.5) ? -1 : 1) * (ROADS.width / 2 + 24);
    return { x: random.range(100, WORLD.width - 100), y };
  }

  /** A random point on a road lane. */
  function roadPoint() {
    if (random.chance(0.5)) {
      return { x: random.pick(ROADS.vertical) + (random.chance(0.5) ? -1 : 1) * ROADS.lane, y: random.range(100, BEACH.sandY - 100) };
    }
    return { x: random.range(100, WORLD.width - 100), y: random.pick(ROADS.horizontal) + (random.chance(0.5) ? -1 : 1) * ROADS.lane };
  }

  /** The nearest road centre line to a point, and whether it is vertical. */
  function nearestRoad(x, y) {
    let best = { vertical: true, line: ROADS.vertical[0], dist: Infinity };
    for (const rx of ROADS.vertical) {
      const d = Math.abs(x - rx);
      if (d < best.dist) best = { vertical: true, line: rx, dist: d };
    }
    for (const ry of ROADS.horizontal) {
      const d = Math.abs(y - ry);
      if (d < best.dist) best = { vertical: false, line: ry, dist: d };
    }
    return best;
  }

  return {
    buildings, trees, roads,
    onRoad, inPark, inSea, inSand,
    hitsBuilding, collideCircle,
    sidewalkPoint, roadPoint, nearestRoad,
  };
}
