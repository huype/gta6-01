// Solmar Heat — boot and the one loop. The game object holds the city, the cars, the
// people, the police, the missions and the player; step() advances it one fixed 1/60 s
// tick from any input source (the keyboard, or the autopilot behind ?shot=). The loop
// moves between five screens: title, play, paused, game over and story complete.
//
// ?seed=N fixes the city. ?shot=start|drive|chase|mission (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady.

import { SAVE_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createCity } from './world.js';
import { createCars, driveCar, stepTraffic } from './cars.js';
import { createPedestrians, knockPed, stepPedestrians } from './pedestrians.js';
import { createPolice } from './police.js';
import { createMissions } from './missions.js';
import { createPlayer } from './player.js';
import { createAudio } from './audio.js';
import { ACTION_CONFIRM, ACTION_ENTER_CAR, ACTION_MUTE, ACTION_PAUSE, ACTION_PUNCH, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const PLAYER_START = { x: 1600, y: 1470 };

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();

function createGame(gameSeed) {
  const random = createRandom(gameSeed);
  const game = {
    city: null, cars: null, peds: null, police: null, missions: null, player: null,
    cash: 0,
    time: 0,
    elapsed: 0,
    lastPoliceBump: -10,
    onCrime: null,
    onWantedChange: null,
    onSteal: null,
    onPickup: null,
    onStepDone: null,
    onMissionStart: null,
    onStoryDone: null,
    onDeath: null,
  };
  game.city = createCity(random);
  game.cars = createCars(random, game.city, 9, 14);
  game.peds = createPedestrians(random, game.city, 26);
  game.police = createPolice(random);
  game.missions = createMissions();
  game.player = createPlayer(game.city, PLAYER_START.x, PLAYER_START.y);

  game.hurtPlayer = (amount) => {
    const dead = game.player.hurt(amount);
    if (dead && game.onDeath) game.onDeath();
    return dead;
  };
  game.knockPed = (ped) => knockPed(ped);

  game.start = () => {
    game.missions.reset();
    game.missions.startMission(game);
  };

  game.reset = () => {
    const fresh = createGame(gameSeed);
    game.city = fresh.city;
    game.cars = fresh.cars;
    game.peds = fresh.peds;
    game.police = fresh.police;
    game.missions = fresh.missions;
    game.player = fresh.player;
    game.cash = 0;
    game.time = 0;
    game.elapsed = 0;
    game.lastPoliceBump = -10;
  };

  game.step = (dt, input, extraActions = 0) => {
    const { city, cars, peds, police, missions, player } = game;
    game.time += dt;
    game.elapsed += dt;
    const actions = input.takeActions() | extraActions;
    if (actions & ACTION_ENTER_CAR) {
      if (player.inCar) player.exitCar(game);
      else {
        const car = player.tryEnterCar(game);
        if (car && game.onSteal) game.onSteal();
      }
    }
    if (actions & ACTION_PUNCH) {
      if (player.punch(game)) audio.punch();
    }

    if (player.inCar && player.car) {
      const car = player.car;
      const before = car.speed;
      driveCar(car, city, dt, input.drive(), input.steer(), input.run());
      player.x = car.x;
      player.y = car.y;
      player.angle = car.angle;
      // Ram pedestrians while speeding.
      if (Math.abs(car.speed) > 120) {
        for (const ped of peds) {
          if (ped.down > 0) continue;
          if (Math.hypot(ped.x - car.x, ped.y - car.y) < 42) {
            knockPed(ped);
            police.addStars(1, game);
            car.speed *= 0.85;
            audio.crash();
          }
        }
      }
      // Bump traffic and patrol cars.
      for (const other of [...cars.traffic, ...police.cars]) {
        const d = Math.hypot(other.x - car.x, other.y - car.y);
        if (d < 58 && d > 0.01) {
          const push = (58 - d) / 2;
          const nx = (other.x - car.x) / d;
          const ny = (other.y - car.y) / d;
          other.x += nx * push;
          other.y += ny * push;
          car.x -= nx * push * 0.4;
          car.y -= ny * push * 0.4;
          const impact = Math.abs(car.speed - other.speed);
          if (impact > 140) {
            car.speed *= 0.7;
            other.speed *= 0.6;
            // Ramming a patrol car hard is a crime; a soft bump just keeps the heat on.
            if (other.police) {
              police.state.heat = 0;
              if (impact > 300 && game.time - game.lastPoliceBump > 4) {
                game.lastPoliceBump = game.time;
                police.addStars(1, game);
              }
            }
            audio.crash();
          }
        }
      }
      if (Math.abs(before - car.speed) > 320) audio.crash();
    } else {
      player.stepOnFoot(dt, input, game);
    }

    const others = [...cars.traffic, ...police.cars];
    if (player.inCar && player.car) others.push(player.car);
    for (const car of cars.traffic) stepTraffic(car, city, random, dt, others);
    stepPedestrians(peds, city, player, dt);
    police.step(dt, game);
    const missionEvent = missions.step(dt, game);
    if (missionEvent === 'step') audio.pickup();
    else if (missionEvent === 'mission') audio.mission();
    player.heal(dt);
    audio.engine(player.inCar && player.car ? Math.abs(player.car.speed) / 560 : 0);
    audio.siren(police.state.stars, game.time);
    return missionEvent;
  };

  return game;
}

const game = createGame(seed);
const renderer = createRenderer(canvas);
// Debug hook for automated playtests (read-only state inspection).
window.__solmar = game;

function readSave() {
  try {
    return JSON.parse(window.localStorage.getItem(SAVE_KEY) ?? '{}');
  } catch {
    return {};
  }
}
function writeSave(save) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Storage can be off: the save then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, game);
  let painted = 0;
  function paint() {
    renderer.draw(game, scene.screen, game.time);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let save = readSave();
  let accumulator = 0;
  let last = performance.now();

  game.onDeath = () => {
    if (screen === SCREEN_PLAY) endGame('dead');
  };
  game.onSteal = () => audio.click();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    game.reset();
    game.onDeath = () => {
      if (screen === SCREEN_PLAY) endGame('dead');
    };
    game.onSteal = () => audio.click();
    game.start();
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing Solmar Heat. First job: take a parked car to Mara\'s garage.');
  }

  function endGame(reason) {
    if (game.police.state.busted) reason = 'busted';
    game.missions.clearBanner();
    screen = SCREEN_OVER;
    audio.fail();
    if (game.cash > (save.bestCash ?? 0)) {
      save.bestCash = game.cash;
      writeSave(save);
    }
    announce(`Game over — ${reason === 'busted' ? 'busted by the Solmar police' : 'Dario is down'}. Cash $${game.cash}.`);
  }

  function handleActions(actions) {
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) {
      audio.unlock();
      audio.click();
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    accumulator += dt;
    // One take of the queue per frame: screen-level actions are handled here, and the
    // gameplay one-shots (enter car, punch) are handed to the first step of the frame.
    const actions = input.takeActions();
    handleActions(actions);
    if (screen === SCREEN_PLAY) {
      let pending = actions & (ACTION_ENTER_CAR | ACTION_PUNCH);
      while (accumulator >= STEP) {
        game.step(STEP, input, pending);
        pending = 0;
        accumulator -= STEP;
        if (game.police.state.busted) {
          endGame('busted');
          break;
        }
        if (game.player.health <= 0) {
          endGame('dead');
          break;
        }
        if (game.missions.done && screen === SCREEN_PLAY) {
          game.missions.clearBanner();
          screen = SCREEN_WIN;
          audio.mission();
          announce('Story complete. Solmar is yours.');
          break;
        }
      }
    } else if (screen === SCREEN_TITLE) {
      game.time += dt;
      accumulator = 0;
    } else {
      accumulator = 0;
    }
    renderer.draw(game, screen, game.time);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Solmar Heat. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
