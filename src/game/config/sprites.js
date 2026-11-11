// Qué hojas de personaje (LPC) usa cada rol. Todas comparten el mismo JSON de animaciones.
// Colores: rojo = nuestra banda; amarillo/verde = pandillas; male/female = civiles.

import { pad2 } from '../assets.js';

function sheetNames(prefix, count) {
  const out = [];
  for (let i = 1; i <= count; i++) out.push(`${prefix}_${pad2(i)}`);
  return out;
}

export const SHEETS = {
  recruit: sheetNames('rojito', 3),
  gangYellow: sheetNames('amarillo', 3),
  gangGreen: sheetNames('verde', 3),
  civilian: [...sheetNames('male', 30), ...sheetNames('female', 30)],
};

/** Animaciones del LPC que el juego no va a usar: no se cargan. */
export const EXCLUDED_LPC_ANIMATIONS = [
  'spellcast_up',
  'spellcast_left',
  'spellcast_down',
  'spellcast_right',
  'climb',
  'jump_up',
  'jump_left',
  'jump_down',
  'jump_right',
  'sit_up',
  'sit_left',
  'sit_down',
  'sit_right',
  'emote_up',
  'emote_left',
  'emote_down',
  'emote_right',
];

export const HOUSE_COUNT = 63;
export const TREE_COUNT = 18;
