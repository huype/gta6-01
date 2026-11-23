// The HUD and the minimap, drawn on top of the world each frame: cash, wanted stars,
// health, the current mission step with a distance readout, speed, the bust meter, and
// the mission banners. The minimap is a small live map of Solmar in the corner.

import { BEACH, PALETTE, VIEW, WORLD } from './config.js';

const MAP_W = 196;
const MAP_H = 147;

function star(cx, cy, r, ctx, filled) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? PALETTE.hudAccent : 'rgba(255,255,255,0.22)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function drawHud(ctx, game, fonts) {
  const { player, police, missions } = game;
  ctx.textBaseline = 'alphabetic';

  // Top-left: cash and mission.
  ctx.fillStyle = PALETTE.panel;
  ctx.strokeStyle = PALETTE.panelBorder;
  ctx.lineWidth = 1;
  roundRect(ctx, 14, 14, 340, 66, 10);
  ctx.fill();
  ctx.stroke();
  ctx.font = fonts(26, true);
  ctx.fillStyle = PALETTE.hudAccent;
  ctx.textAlign = 'left';
  ctx.fillText(`$${game.cash}`, 28, 46);
  ctx.font = fonts(15, false);
  ctx.fillStyle = PALETTE.textLight;
  const step = missions.currentStep();
  const mission = missions.current();
  if (mission && step) {
    ctx.fillText(`${mission.title}  •  ${step.text}`, 28, 68);
  } else if (missions.done) {
    ctx.fillText('Story complete — free roam', 28, 68);
  } else if (mission) {
    ctx.fillText(mission.title, 28, 68);
  }

  // Top-right: wanted stars.
  const stars = police.state.stars;
  ctx.fillStyle = PALETTE.panel;
  roundRect(ctx, VIEW.width - 14 - 190, 14, 190, 52, 10);
  ctx.fill();
  ctx.stroke();
  for (let i = 0; i < 5; i += 1) {
    star(VIEW.width - 176 + i * 36, 40, 13, ctx, i < stars);
  }

  // Health bar under the stars.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(VIEW.width - 204, 74, 190, 12);
  ctx.fillStyle = player.health > 30 ? PALETTE.health : PALETTE.danger;
  ctx.fillRect(VIEW.width - 204, 74, 190 * Math.max(0, player.health / 100), 12);
  ctx.strokeStyle = PALETTE.panelBorder;
  ctx.strokeRect(VIEW.width - 204, 74, 190, 12);

  // Bust meter, when a patrol car is pinning the player.
  if (police.state.bust > 0.05) {
    ctx.font = fonts(18, true);
    ctx.fillStyle = PALETTE.danger;
    ctx.textAlign = 'center';
    ctx.fillText('BUSTED?', VIEW.width / 2, 108);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(VIEW.width / 2 - 110, 116, 220, 12);
    ctx.fillStyle = PALETTE.danger;
    ctx.fillRect(VIEW.width / 2 - 110, 116, 220 * police.state.bust, 12);
  }

  // Bottom-left: speed, only in a car.
  if (player.inCar && player.car) {
    ctx.font = fonts(30, true);
    ctx.fillStyle = PALETTE.textLight;
    ctx.textAlign = 'left';
    ctx.fillText(`${Math.round(Math.abs(player.car.speed) * 0.18)} mph`, 22, VIEW.height - 22);
  }

  // Bottom-centre: contextual hint.
  ctx.font = fonts(15, false);
  ctx.fillStyle = 'rgba(247,243,232,0.85)';
  ctx.textAlign = 'center';
  ctx.fillText(
    player.inCar ? 'W/S drive  •  A/D steer  •  E get out  •  Shift handbrake' : 'WASD move  •  Shift run  •  E enter car  •  F punch',
    VIEW.width / 2,
    VIEW.height - 14,
  );

  // Mission banner in the middle of the screen.
  const banner = missions.banner;
  if (banner && banner.timer > 0) {
    const alpha = Math.min(1, banner.timer);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, VIEW.width / 2 - 330, 150, 660, 96, 12);
    ctx.fill();
    ctx.strokeStyle = PALETTE.hudAccent;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = fonts(34, true);
    ctx.fillStyle = PALETTE.hudAccent;
    ctx.textAlign = 'center';
    ctx.fillText(banner.text, VIEW.width / 2, 192);
    ctx.font = fonts(16, false);
    ctx.fillStyle = PALETTE.textLight;
    wrapText(ctx, banner.sub, VIEW.width / 2, 220, 620, 20);
    ctx.restore();
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  for (let i = 0; i < lines.length; i += 1) {
    ctx.fillText(lines[i], cx, y + i * lineHeight);
  }
}

export function drawMinimap(ctx, game) {
  const { city, player, police, missions } = game;
  const mx = VIEW.width - MAP_W - 14;
  const my = VIEW.height - MAP_H - 14;
  const sx = MAP_W / WORLD.width;
  const sy = MAP_H / WORLD.height;

  ctx.save();
  ctx.fillStyle = 'rgba(16, 20, 30, 0.82)';
  ctx.strokeStyle = PALETTE.panelBorder;
  ctx.lineWidth = 1;
  roundRect(ctx, mx - 6, my - 6, MAP_W + 12, MAP_H + 12, 10);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(mx, my, MAP_W, MAP_H);
  ctx.clip();

  // Land, beach and sea.
  ctx.fillStyle = '#6f9e4e';
  ctx.fillRect(mx, my, MAP_W, MAP_H);
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(mx, my + BEACH.sandY * sy, MAP_W, (BEACH.seaY - BEACH.sandY) * sy);
  ctx.fillStyle = PALETTE.sea;
  ctx.fillRect(mx, my + BEACH.seaY * sy, MAP_W, MAP_H - BEACH.seaY * sy);
  // Park.
  ctx.fillStyle = '#4c8a3f';
  ctx.fillRect(mx + 1180 * sx, my + 1010 * sy, 640 * sx, 280 * sy);
  // Roads.
  ctx.fillStyle = '#8b8d96';
  for (const r of city.roads) ctx.fillRect(mx + r.x * sx, my + r.y * sy, Math.max(2, r.w * sx), Math.max(2, r.h * sy));

  // Mission target.
  const target = missions.activeTarget();
  if (target) {
    const pulse = 3 + Math.sin(performance.now() / 240) * 1.5;
    ctx.fillStyle = PALETTE.marker;
    ctx.beginPath();
    ctx.arc(mx + target.x * sx, my + target.y * sy, pulse + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#20242e';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // Police blips.
  ctx.fillStyle = '#5aa0ff';
  for (const car of police.cars) {
    ctx.beginPath();
    ctx.arc(mx + car.x * sx, my + car.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Player arrow.
  ctx.save();
  ctx.translate(mx + player.x * sx, my + player.y * sy);
  ctx.rotate(player.angle);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, -4.5);
  ctx.lineTo(-5, 4.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#20242e';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}
