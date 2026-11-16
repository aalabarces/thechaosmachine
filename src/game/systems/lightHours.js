// Luces que se prenden de noche (portado de buenosAiresScene/town.js: hoursAt, lightBorn, lightTick).
// De día están apagadas (sin intensidad: no cuestan nada) porque la iluminación satura en 1 y, sumadas
// al sol, lavarían las sombras. Cada luz se prende a su propio minuto entre las 18 y las 19 y se
// apaga entre las 6 y las 7, según dónde está: igual en todos los hilos. Corre en los workers.
//
// API de luces del engine que usa Chaos (@weed.js/engine 0.14.0 de npm): el alcance de una luz sale
// de su intensidad, alcance = √lightIntensity × 10 px. Las demos del repo usan una API más nueva con
// `radius`; acá se traduce con lightIntensityFor(radio).

import { LightHours } from '../components/LightHours.js';
import { RunModifiers } from './runModifiers.js';

const { LightEmitter, Sun } = WEED;

/** Cada cuántos frames una luz fija mira la hora (con un día de 10 minutos, un frame es ~0,7 s de juego). */
export const LIGHT_TICK = 30;

/** px de alcance por cada unidad de √lightIntensity (engine 0.14.0, util/lightRadius.js). */
const RADIUS_PER_SQRT_INTENSITY = 10;

/** La intensidad que da `radius` px de alcance. */
export function lightIntensityFor(radius) {
  const s = radius / RADIUS_PER_SQRT_INTENSITY;
  return s * s;
}

/** Fija el alcance de la luz de la entidad `i` (intensidad y su raíz, que el engine guarda aparte). */
export function setLightRadius(i, radius) {
  const s = radius > 0 ? radius / RADIUS_PER_SQRT_INTENSITY : 0;
  LightEmitter.lightIntensity[i] = s * s;
  LightEmitter.sqrtLightIntensity[i] = s;
}

const _hours = [0, 0];

/** El minuto de una luz, según dónde está. */
function hoursAt(x, y, out) {
  const a = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  const b = Math.sin(x * 39.346 + y * 11.135) * 24634.6345;
  out[0] = 18 + (a - Math.floor(a));
  out[1] = 6 + (b - Math.floor(b));
  return out;
}

/**
 * Llamarlo después de armar el LightEmitter (color, brillo, alturas): desde acá la luz sigue la hora.
 * @param {object} go la entidad
 * @param {number} radius su alcance prendida (px)
 * @param {number} glows cuántas de sus primeras decoraciones son sus brillos
 */
export function lightBorn(go, radius, glows, alphaA, alphaB) {
  const i = go.index;
  const L = LightHours;
  hoursAt(go.x, go.y, _hours);
  L.on[i] = _hours[0];
  L.off[i] = _hours[1];
  L.base[i] = radius;
  L.lit[i] = 2;
  L.glows[i] = glows;
  L.alphaA[i] = alphaA;
  L.alphaB[i] = alphaB;
  lightTick(go);
}

/** Prende o apaga la luz según la hora. Sin iluminación (calidad 'off'), siempre apagada. */
export function lightTick(go) {
  const i = go.index;
  const L = LightHours;
  if (!(L.base[i] > 0)) return;
  let lit = 0;
  if (RunModifiers.lightingOn[0] === 1) {
    const h = Sun.hour;
    lit = h >= L.on[i] || h < L.off[i] ? 1 : 0;
  }
  if (lit === L.lit[i]) return;
  L.lit[i] = lit;
  LightEmitter.active[i] = lit;
  setLightRadius(i, lit ? L.base[i] : 0);
  const n = Math.min(L.glows[i], go.getAttachedDecorationCount());
  for (let q = 0; q < n; q++) {
    const d = go.getAttachedDecoration(q);
    if (d) d.alpha = lit ? (q & 1 ? L.alphaB[i] : L.alphaA[i]) : 0;
  }
}

/** Apaga la luz para siempre (un auto destrozado). */
export function lightKill(go) {
  const i = go.index;
  LightHours.base[i] = 0;
  LightHours.lit[i] = 0;
  LightEmitter.active[i] = 0;
  setLightRadius(i, 0);
  const n = Math.min(LightHours.glows[i], go.getAttachedDecorationCount());
  for (let q = 0; q < n; q++) {
    const d = go.getAttachedDecoration(q);
    if (d) d.alpha = 0;
  }
}
