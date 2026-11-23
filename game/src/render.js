// Drawing only: the city, the cars, the people and the screens, through a camera that
// follows the player. Warm sun-soaked palette, soft shadows under everything that stands
// on the street. Nothing here changes the game state.

import { BEACH, CAR, FONT, PALETTE, PARK, PLAYER, ROADS, VIEW, WORLD } from './config.js';
import { drawHud, drawMinimap } from './hud.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const fonts = new Map();
function fontFor(size, bold) {
  const key = `${size}:${bold ? 1 : 0}`;
  if (!fonts.has(key)) fonts.set(key, `${bold ? '700 ' : ''}${size}px ${FONT}`);
  return fonts.get(key);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const camera = { x: 0, y: 0 };
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    scale = Math.min(canvas.width / VIEW.width, canvas.height / VIEW.height);
    offsetX = (canvas.width - VIEW.width * scale) / 2;
    offsetY = (canvas.height - VIEW.height * scale) / 2;
  }
  resize();
  window.addEventListener('resize', resize);

  function updateCamera(player) {
    camera.x = Math.max(0, Math.min(WORLD.width - VIEW.width, player.x - VIEW.width / 2));
    camera.y = Math.max(0, Math.min(WORLD.height - VIEW.height, player.y - VIEW.height / 2));
  }

  function text(value, x, y, size, color, align = 'left', bold = false) {
    ctx.font = fontFor(size, bold);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(value, x, y);
  }

  function drawGround(game) {
    const { city } = game;
    // Grass base.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    // Mow stripes for the big lawns.
    ctx.fillStyle = PALETTE.grassDark;
    for (let y = 0; y < WORLD.height; y += 160) {
      ctx.fillRect(0, y, WORLD.width, 80);
    }
    // Beach and sea.
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(0, BEACH.sandY, WORLD.width, BEACH.seaY - BEACH.sandY);
    ctx.fillStyle = PALETTE.sea;
    ctx.fillRect(0, BEACH.seaY, WORLD.width, WORLD.height - BEACH.seaY);
    ctx.fillStyle = PALETTE.seaDeep;
    for (let x = 60; x < WORLD.width; x += 260) {
      ctx.fillRect(x, BEACH.seaY + 30, 140, 6);
      ctx.fillRect(x + 90, BEACH.seaY + 70, 110, 6);
    }
    // Park lawn and paths.
    ctx.fillStyle = '#5da244';
    ctx.fillRect(PARK.x, PARK.y, PARK.width, PARK.height);
    ctx.fillStyle = PALETTE.parkPath;
    ctx.fillRect(PARK.x + PARK.width / 2 - 14, PARK.y, 28, PARK.height);
    ctx.fillRect(PARK.x, PARK.y + PARK.height / 2 - 14, PARK.width, 28);
    // Roads and sidewalks.
    for (const r of city.roads) {
      ctx.fillStyle = PALETTE.sidewalk;
      ctx.fillRect(r.x - 8, r.y - 8, r.w + 16, r.h + 16);
      ctx.fillStyle = PALETTE.road;
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
    // Centre dashes.
    ctx.fillStyle = PALETTE.roadLine;
    for (const x of ROADS.vertical) {
      for (let y = 20; y < BEACH.sandY; y += 64) {
        if (ROADS.horizontal.some((hy) => Math.abs(y - hy) < 70)) continue;
        ctx.fillRect(x - 3, y, 6, 30);
      }
    }
    for (const y of ROADS.horizontal) {
      for (let x = 20; x < WORLD.width; x += 64) {
        if (ROADS.vertical.some((vx) => Math.abs(x - vx) < 70)) continue;
        ctx.fillRect(x, y - 3, 30, 6);
      }
    }
    // Crosswalks at the big intersections.
    ctx.fillStyle = 'rgba(247,243,232,0.85)';
    for (const x of ROADS.vertical) {
      for (const y of ROADS.horizontal) {
        for (let i = -2; i <= 2; i += 1) {
          ctx.fillRect(x - 46 + i * 20, y - ROADS.width / 2 + 8, 10, 18);
          ctx.fillRect(x - 46 + i * 20, y + ROADS.width / 2 - 26, 10, 18);
        }
      }
    }
  }

  function drawBuildings(game) {
    for (const b of game.city.buildings) {
      // Soft shadow, then the block, then a lighter roof with a rim.
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(b.x + 7, b.y + 9, b.w, b.h);
      ctx.fillStyle = PALETTE.buildingWall;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, 10);
      if (b.awning) {
        ctx.fillStyle = 'rgba(32,36,46,0.55)';
        ctx.fillRect(b.x + b.w * 0.2, b.y + b.h - 12, b.w * 0.6, 8);
      }
      // Rooftop detail: a vent or a water tank.
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(b.x + b.w * 0.62, b.y + b.h * 0.3, 12, 12);
    }
    for (const t of game.city.trees) {
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.ellipse(t.x + 4, t.y + 5, t.r, t.r * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.tree;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.treeDark;
      ctx.beginPath();
      ctx.arc(t.x - t.r * 0.3, t.y - t.r * 0.3, t.r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCarShape(car) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(-CAR.length / 2 + 4, -CAR.width / 2 + 5, CAR.length, CAR.width);
    ctx.fillStyle = car.color;
    ctx.beginPath();
    ctx.roundRect(-CAR.length / 2, -CAR.width / 2, CAR.length, CAR.width, 9);
    ctx.fill();
    ctx.fillStyle = 'rgba(20,24,34,0.85)';
    ctx.beginPath();
    ctx.roundRect(-8, -CAR.width / 2 + 5, 18, CAR.width - 10, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.roundRect(-4, -CAR.width / 2 + 8, 10, CAR.width - 16, 3);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(CAR.length / 2 - 4, -CAR.width / 2 + 4, 3, 6);
    ctx.fillRect(CAR.length / 2 - 4, CAR.width / 2 - 10, 3, 6);
    ctx.fillStyle = '#ff5a4d';
    ctx.fillRect(-CAR.length / 2 + 1, -CAR.width / 2 + 4, 3, 6);
    ctx.fillRect(-CAR.length / 2 + 1, CAR.width / 2 - 10, 3, 6);
    if (car.police) {
      ctx.fillStyle = '#f7f3e8';
      ctx.fillRect(-CAR.length / 2 + 8, -CAR.width / 2 + 2, CAR.length - 16, 7);
      text('POLICE', 0, 4, 9, '#20242e', 'center', true);
      const phase = Math.floor(car.lights * 6) % 2;
      ctx.fillStyle = phase === 0 ? '#ff3b30' : '#2f7bff';
      ctx.beginPath();
      ctx.arc(-2, -CAR.width / 2 + 2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = phase === 0 ? '#2f7bff' : '#ff3b30';
      ctx.beginPath();
      ctx.arc(6, -CAR.width / 2 + 2, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPed(ped) {
    ctx.save();
    ctx.translate(ped.x, ped.y);
    if (ped.down > 0) {
      ctx.rotate(Math.PI / 2);
      ctx.globalAlpha = 0.85;
    } else {
      ctx.rotate(ped.angle);
    }
    const bob = ped.down > 0 ? 0 : Math.sin(ped.walkPhase) * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(2, 3, 12, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ped.color;
    ctx.beginPath();
    ctx.roundRect(-9, -8 + bob * 0.3, 18, 16, 6);
    ctx.fill();
    ctx.fillStyle = ped.skin;
    ctx.beginPath();
    ctx.arc(11, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#20242e';
    ctx.beginPath();
    ctx.arc(11, -3, 7, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPlayer(game) {
    const p = game.player;
    if (p.inCar) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    const blink = p.hurtFlash > 0 && Math.floor(p.hurtFlash * 14) % 2 === 0;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(2, 4, 14, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(p.angle);
    const bob = Math.sin(p.runPhase) * 2.5;
    ctx.fillStyle = blink ? '#ffffff' : PALETTE.player;
    ctx.beginPath();
    ctx.roundRect(-11, -10 + bob * 0.2, 20, 20, 7);
    ctx.fill();
    ctx.fillStyle = '#f2c79b';
    ctx.beginPath();
    ctx.arc(13, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#20242e';
    ctx.beginPath();
    ctx.arc(13, -3, 8, Math.PI, Math.PI * 2);
    ctx.fill();
    // Punch swing.
    if (p.punchAnim > 0) {
      ctx.strokeStyle = '#ffe9a8';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(22, 0, 14, -0.9, 0.9);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawMarker(game, time) {
    const target = game.missions.activeTarget();
    if (!target) return;
    const pulse = 1 + Math.sin(time * 4) * 0.12;
    const r = 34 * pulse;
    ctx.save();
    ctx.translate(target.x, target.y);
    ctx.strokeStyle = PALETTE.marker;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.marker;
    ctx.beginPath();
    ctx.moveTo(0, -r - 26);
    ctx.lineTo(12, -r - 6);
    ctx.lineTo(-12, -r - 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Edge arrow: point at the target when it is off screen.
    const px = game.player.x;
    const py = game.player.y;
    const dx = target.x - px;
    const dy = target.y - py;
    const dist = Math.hypot(dx, dy);
    if (dist > 560) {
      const ax = px + (dx / dist) * 300;
      const ay = py + (dy / dist) * 300;
      const ang = Math.atan2(dy, dx);
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(ang);
      ctx.fillStyle = PALETTE.marker;
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-10, -12);
      ctx.lineTo(-10, 12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawPickups(game) {
    const step = game.missions.currentStep();
    if (!step) return;
    if (step.kind === 'pickup') {
      drawPickupBox(step.target.x, step.target.y, '#ffd23e');
    } else if (step.kind === 'collect') {
      for (const t of step.targets) {
        if (!t.taken) drawPickupBox(t.x, t.y, '#58d68d');
      }
    }
  }

  function drawPickupBox(x, y, color) {
    const bob = Math.sin(performance.now() / 300) * 3;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 14 - bob, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-11, -11, 22, 22, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(32,36,46,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(32,36,46,0.7)';
    ctx.fillRect(-11, -2, 22, 4);
    ctx.restore();
  }

  function drawWorld(game, time) {
    updateCamera(game.player);
    ctx.setTransform(scale, 0, 0, scale, offsetX - camera.x * scale, offsetY - camera.y * scale);
    drawGround(game);
    drawBuildings(game);
    drawPickups(game);
    drawMarker(game, time);
    for (const car of game.cars.parked) drawCarShape(car);
    for (const car of game.cars.traffic) drawCarShape(car);
    for (const car of game.police.cars) drawCarShape(car);
    if (game.player.inCar && game.player.car) drawCarShape(game.player.car);
    for (const ped of game.peds) drawPed(ped);
    drawPlayer(game);
    // Sun glare: a warm wash over the top of the frame.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const glare = ctx.createLinearGradient(0, 0, 0, 220);
    glare.addColorStop(0, 'rgba(255, 214, 130, 0.14)');
    glare.addColorStop(1, 'rgba(255, 214, 130, 0)');
    ctx.fillStyle = glare;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawPanel(title, lines, prompt, accent) {
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    ctx.fillStyle = 'rgba(16, 20, 30, 0.55)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    const w = 640;
    const h = 150 + lines.length * 34 + 70;
    const x = (VIEW.width - w) / 2;
    const y = (VIEW.height - h) / 2;
    ctx.fillStyle = PALETTE.panel;
    ctx.strokeStyle = PALETTE.panelBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14);
    ctx.fill();
    ctx.stroke();
    text(title, VIEW.width / 2, y + 64, 46, accent ?? PALETTE.hudAccent, 'center', true);
    for (let i = 0; i < lines.length; i += 1) {
      text(lines[i], VIEW.width / 2, y + 118 + i * 34, 20, PALETTE.textLight, 'center');
    }
    text(prompt, VIEW.width / 2, y + h - 30, 22, PALETTE.hudAccent, 'center', true);
  }

  /** Paint one frame for the given screen. */
  function draw(game, screen, time) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#1b1e28';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (screen === SCREEN_TITLE) {
      // A live city backdrop behind the title: the camera drifts over Solmar.
      const drift = { x: 1600 + Math.sin(time * 0.05) * 500, y: 1200 + Math.cos(time * 0.04) * 300, angle: 0 };
      drawWorld({ ...game, player: drift }, time);
      drawPanel(
        'SOLMAR HEAT',
        [
          'A sun-soaked open-world crime story.',
          'Steal cars. Outrun the law. Get paid.',
          '',
          'WASD / arrows — move & drive    E — enter / exit car',
          'Shift — run / handbrake    F — punch    P — pause    M — mute',
        ],
        'Press Enter or click to start',
      );
      text('Solmar City — population 82,000, all of them watching', VIEW.width / 2, VIEW.height - 40, 16, 'rgba(247,243,232,0.8)', 'center');
      return;
    }
    drawWorld(game, time);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    drawHud(ctx, game, fontFor);
    drawMinimap(ctx, game);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['Take a breath. Solmar waits.', ''], 'Press P or Enter to resume');
    } else if (screen === SCREEN_OVER) {
      drawPanel(
        'Busted',
        [
          `The Solmar police finally caught up with Dario.`,
          `Cash kept: $${game.cash}   •   Missions done: ${game.missions.index} of 6`,
          '',
        ],
        'Press Enter to try again',
        PALETTE.danger,
      );
    } else if (screen === SCREEN_WIN) {
      drawPanel(
        'Story Complete',
        [
          'Every job done. The heat is yours to keep.',
          `Final cash: $${game.cash}`,
          '',
        ],
        'Press Enter to keep playing',
        PALETTE.health,
      );
    }
  }

  return { draw, updateCamera };
}
