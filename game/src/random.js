// A small seeded random generator (mulberry32) plus helpers, so the city, traffic and
// pedestrians are identical for a given seed — screenshots stay reproducible.

export function createRandom(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    /** Float in [min, max). */
    range(min, max) {
      return min + next() * (max - min);
    },
    /** Integer in [min, max] inclusive. */
    int(min, max) {
      return Math.floor(min + next() * (max - min + 1));
    },
    /** One element of an array. */
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    /** True with the given probability. */
    chance(p) {
      return next() < p;
    },
  };
}
