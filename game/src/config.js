// Solmar Heat — every tuning number and colour in one place.
// The city is one fixed 3200x2400 world; the renderer shows a 1280x720 window of it
// through a camera that follows the player, so no rule depends on the screen size.

export const STEP = 1 / 60;

export const VIEW = { width: 1280, height: 720 };

export const WORLD = { width: 3200, height: 2400 };

/** Road centre lines (vertical x, horizontal y) and the road width. */
export const ROADS = {
  vertical: [400, 1000, 1600, 2200, 2800],
  horizontal: [400, 900, 1400, 1900],
  width: 120,
  lane: 30,
};

/** South edge: sand starts here, the sea starts a little further south. */
export const BEACH = { sandY: 2140, seaY: 2300 };

/** The park block, between the roads around the city centre. */
export const PARK = { x: 1180, y: 1010, width: 640, height: 280 };

export const PLAYER = {
  radius: 14,
  walkSpeed: 210,
  runSpeed: 330,
  health: 100,
  punchRange: 34,
  punchArc: 1.1,
  punchCooldown: 0.35,
  punchDamage: 34,
};

export const CAR = {
  length: 64,
  width: 32,
  accel: 420,
  brake: 700,
  reverseAccel: 260,
  maxSpeed: 560,
  maxReverse: 160,
  turnRate: 2.6,
  offRoadDrag: 0.55,
  ramDamage: 40,
};

export const TRAFFIC_COUNT = 14;
export const PARKED_COUNT = 9;
export const PED_COUNT = 26;

export const WANTED = {
  stealCar: 1,
  hitPed: 1,
  hitPolice: 2,
  maxStars: 5,
  decayDelay: 9,
  decayInterval: 6,
  bustSeconds: 2.2,
};

/** Police cars per wanted star, capped. */
export const POLICE_PER_STAR = 1;
export const POLICE_MAX = 5;

export const MISSION_REWARDS = [150, 250, 300, 400, 450, 800];

export const PALETTE = {
  sky: '#ffe9b8',
  grass: '#8fbf62',
  grassDark: '#7cab54',
  sand: '#ecd096',
  sea: '#37a6c8',
  seaDeep: '#2b8fb0',
  road: '#55565e',
  roadLine: '#f5d76e',
  sidewalk: '#c9b896',
  sidewalk2: '#bfae8e',
  curb: '#9a8a6d',
  parkPath: '#d9c9a3',
  tree: '#3f7d3a',
  treeDark: '#356b31',
  buildingRoof: ['#e07856', '#e8a04c', '#7fb3d5', '#c86b8a', '#8fae6b', '#d5c06a', '#9b7ec2', '#e8e0d0'],
  buildingWall: '#6b5d4f',
  player: '#ff5a3c',
  playerDark: '#c93a22',
  pedShirt: ['#4fc3f7', '#f2c94c', '#e5538a', '#7ee081', '#c9a0ff', '#ff9f43'],
  policeCar: '#2f6fd0',
  policeLight: ['#ff3b30', '#2f7bff'],
  marker: '#ffd23e',
  text: '#20242e',
  textLight: '#f7f3e8',
  panel: 'rgba(20, 24, 34, 0.78)',
  panelBorder: 'rgba(255, 255, 255, 0.25)',
  hudAccent: '#ffd23e',
  danger: '#ff4d3d',
  health: '#58d68d',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const SAVE_KEY = 'solmar-heat.save.v1';
