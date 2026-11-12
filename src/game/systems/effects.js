// Efectos visuales compartidos (partículas). Corren en cualquier hilo.

import { COMBAT } from '../config/balance.js';

const { ParticleEmitter, rng } = WEED;

const RAD_TO_DEG = 180 / Math.PI;
const MUZZLES = ['muzzle1', 'muzzle2', 'muzzle3'];
/** Lado de las texturas generadas '_white' / '_whiteCircle' del engine (px). */
const WHITE_SIZE = 8;

/**
 * Sangre que salta desde la altura del torso, sobre todo en la dirección del golpe (dirX, dirY),
 * cae y queda como mancha en el piso (decal).
 */
export function emitBlood(x, y, count, dirX = 0, dirY = 0) {
  const angle = Math.atan2(dirY, dirX) * RAD_TO_DEG;
  const spread = dirX === 0 && dirY === 0 ? 180 : 70;
  ParticleEmitter.emit({
    x,
    y,
    z: -18,
    texture: 'blood',
    count,
    angleXY: { min: angle - spread, max: angle + spread },
    speed: { min: 0.6, max: 2.6 },
    vz: { min: -2.5, max: -0.5 },
    gravity: 0.35,
    scale: { min: 0.25, max: 0.6 },
    stayOnTheFloor: true,
  });
}

/**
 * Estela de un disparo instantáneo: una línea fina de (x0, y0) a (x1, y1) que se apaga enseguida.
 * Las coordenadas son de los pies; se dibuja a la altura del arma.
 */
export function emitTracer(x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;
  const h = COMBAT.muzzleHeight;
  ParticleEmitter.emitFlat({
    x: (x0 + x1) * 0.5,
    y: (y0 + y1) * 0.5 - h,
    texture: '_white',
    count: 1,
    vx: 0,
    vy: 0,
    rotation: Math.atan2(dy, dx) * RAD_TO_DEG,
    scaleX: len / WHITE_SIZE,
    scaleY: 1.5 / WHITE_SIZE,
    tint: 0xffe6a0,
    alpha: { from: 0.85, to: 0 },
    lifespan: COMBAT.tracerMs,
  });
}

/** Fogonazo en la boca del arma, apuntando en (dirX, dirY). */
export function emitMuzzle(x, y, dirX, dirY) {
  ParticleEmitter.emitFlat({
    x: x + dirX * 10,
    y: y + dirY * 10 - COMBAT.muzzleHeight,
    texture: MUZZLES[(rng() * MUZZLES.length) | 0],
    count: 1,
    vx: 0,
    vy: 0,
    rotation: Math.atan2(dirY, dirX) * RAD_TO_DEG,
    scale: { min: 0.5, max: 0.75 },
    alpha: { from: 1, to: 0 },
    lifespan: 60,
  });
}

/** Chispas donde una bala pega en algo sólido. */
export function emitSparks(x, y) {
  ParticleEmitter.emitFlat({
    x,
    y: y - COMBAT.muzzleHeight,
    texture: '_whiteCircle',
    count: 4,
    angleXY: { min: 0, max: 360 },
    speed: { min: 1, max: 3.5 },
    scale: { min: 0.15, max: 0.3 },
    tint: 0xffd070,
    alpha: { from: 1, to: 0 },
    lifespan: { min: 120, max: 220 },
  });
}

/**
 * Pedazos que saltan de algo que se rompe: `tint` el color del material.
 * Caen y quedan en el piso un rato (no como decal: se desvanecen).
 */
export function emitDebris(x, y, count, tint, z = -14) {
  ParticleEmitter.emit({
    x,
    y,
    z,
    texture: '_white',
    count,
    angleXY: { min: 0, max: 360 },
    speed: { min: 0.8, max: 3 },
    vz: { min: -4, max: -1.5 },
    gravity: 0.4,
    scale: { min: 0.25, max: 0.55 },
    rotation: { min: 0, max: 360 },
    tint,
    fadeOnTheFloor: true,
  });
}

/** Vidrios: puntitos celestes que brillan y caen. */
export function emitGlass(x, y, count) {
  ParticleEmitter.emit({
    x,
    y,
    z: -20,
    texture: '_white',
    count,
    angleXY: { min: 0, max: 360 },
    speed: { min: 1, max: 3.5 },
    vz: { min: -3, max: -1 },
    gravity: 0.35,
    scale: { min: 0.15, max: 0.3 },
    rotation: { min: 0, max: 360 },
    tint: 0xbfe8ff,
    alpha: 0.85,
    fadeOnTheFloor: true,
  });
}
