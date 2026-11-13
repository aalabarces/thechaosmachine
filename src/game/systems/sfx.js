// Reproducir un efecto del catálogo (config/sounds.js) en un punto del mundo. Corre en cualquier
// hilo. Con (x, y) el sonido es espacial: más bajo lejos de la cámara y nada si está muy afuera.

import { SFX } from '../config/sounds.js';

const { SoundManager, rng } = WEED;

/**
 * @param {string} name entrada de SFX
 * @param {number} [x] mundo (NaN = no espacial)
 * @param {number} [y]
 * @param {number} [volumeScale]
 */
export function playSfx(name, x = NaN, y = NaN, volumeScale = 1) {
  const e = SFX[name];
  if (!e) return;
  const sound = e.sounds.length === 1 ? e.sounds[0] : e.sounds[(rng() * e.sounds.length) | 0];
  SoundManager.play(sound, e.volume * volumeScale, e.rate[0], e.rate[1], 0, 0, x, y);
  const l = e.layer;
  if (l) SoundManager.play(l.sound, l.volume * volumeScale, l.rate[0], l.rate[1], 0, 0, x, y);
}
