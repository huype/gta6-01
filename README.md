# Solmar Heat

![make.fun](https://make.fun/badge/gta6-01.svg)
![rank](https://make.fun/badge/gta6-01/huype/gta6-01/rank.svg)
![reward](https://make.fun/badge/gta6-01/huype/gta6-01/reward.svg)

An open-world crime game for the [make.fun](https://make.fun) **Make GTA 6** competition
(`gta6-01`). Everything is original: the city, the characters, the story, the art and the
sound — no Rockstar / GTA names, characters or places anywhere in it.

## The game

Welcome to **Solmar**, a sun-soaked coastal city where the beach is always in sight and
the police are always one bad decision away. You are **Dario Venn**, a driver fresh off
the bus with empty pockets and a fast mouth. **Mara Solis**, who runs the garage on
Marina Row, has six jobs for you — if you can stay out of jail long enough to finish
them.

- **Open world**: drive and walk a full city — road grid, sidewalks, a central park, and
  a beach with the sea along the south edge. Warm daylight, long shadows, traffic and
  pedestrians living their own lives.
- **Cars**: walk up to any parked car and take it (the law notices), drive with
  acceleration, braking and steering, or steal one straight out of traffic. Traffic
  follows the roads and turns at intersections.
- **Missions**: a six-job story — steal a car for Mara, run a parcel to the beach,
  shake a police tail, haul harbor crates, sweep up cash drops, and one last hot meeting
  at the north plaza. Objectives, a pulsing target marker, an edge arrow and a minimap
  blip always show you where to go. Missions pay cash.
- **Wanted level**: stealing cars, hitting pedestrians and ramming patrol cars raise
  your stars (up to five). Patrol cars chase, ram and try to bust you if they pin you
  down while you are slow. Lay low and the heat cools off.
- **Combat**: punch on foot, or just use the car. Health regenerates when the heat is
  off; get busted or beaten down and it is game over.
- **Progression**: cash from missions, a best-cash save, and free roam after the story
  ends.
- **HUD and minimap**: cash, wanted stars, health, the current objective, speed, a
  bust meter, and a live minimap with the player, the mission target and police blips.
- **Sound**: fully synthesized WebAudio — engine hum that follows your speed, a
  two-tone police siren, pickup blips and mission jingles. No audio files, no network.
- **Menus**: title screen over a live city, pause, mission banners, game over and a
  story-complete screen.

## Controls

| Key | Action |
| --- | --- |
| W / A / S / D or arrow keys | Move on foot / drive (W accelerate, S brake/reverse, A/D steer) |
| Shift | Run on foot / handbrake in a car |
| E | Enter / exit a car |
| F | Punch |
| P or Esc | Pause / resume |
| M | Mute / unmute |
| Enter or click | Start / restart |

## How to play

1. Serve `game/` with any static server (`node serve.ts`, then open
   http://localhost:8080) or open `game/index.html` from a static host. The game runs
   entirely offline — no network requests, no build step.
2. Press Enter. Mara's first job is to take a parked car to her garage. Walk up to a
   parked car, press E, and drive to the yellow marker.
3. Follow the objectives. Watch your stars: one star is a patrol car, five is the
   whole Solmar force. If the **BUSTED?** meter fills while you are slow and a patrol
   car is on you, you are caught.
4. Finish all six jobs to complete the story, then keep driving — Solmar is yours.

## Shots

The screenshots in `screenshots/` are real renders of the game, staged deterministically
with `?shot=start|drive|chase|mission&seed=1` (see `shots.json`).

## Files

- `game/index.html` — the page; `game/src/` — the game's own source, one job per file:
  `config.js` (tuning and palette), `random.js` (seeded RNG), `world.js` (the city),
  `cars.js` (car physics and traffic), `player.js` (on foot and combat), `pedestrians.js`,
  `police.js` (wanted level and patrol cars), `missions.js` (the six-job story),
  `hud.js` (HUD and minimap), `audio.js` (synthesized sound), `render.js` (camera and
  drawing), `input.js`, `shots.js` (screenshot staging) and `main.js` (boot and loop).
- `main.ts` — copies `game/` and `screenshots/` to the output and writes
  `dossier.json` with the vendored make.fun library.
- `screenshots/` — 4 JPEG screenshots of the game.
- `LICENSE` — MIT.
