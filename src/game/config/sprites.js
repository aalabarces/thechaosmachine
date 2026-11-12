// Qué hojas de personaje (LPC) usa cada rol y qué animaciones carga cada uno.
// Todas las hojas comparten el mismo JSON de animaciones.
// Colores: rojo = nuestra banda; amarillo/verde = pandillas; male/female = civiles.
//
// Presupuesto: el engine empaqueta TODAS las texturas en un solo atlas de 4096×4096 (~16,8 Mpx).
// Casas y árboles ocupan ~4 Mpx; cada cuadro de personaje, ~2000 px. Una hoja de civil con sus
// 82 cuadros (caminar, correr, quieto, caer) son ~0,16 Mpx. Si el atlas no entra ("Could not fit
// ... into atlas"), bajar CIVILIAN_VARIANTS o sacar animaciones de algún rol.

import { pad2 } from '../assets.js';

function sheetNames(prefix, count) {
  const out = [];
  for (let i = 1; i <= count; i++) out.push(`${prefix}_${pad2(i)}`);
  return out;
}

/** Cuántas caras distintas de civiles se cargan, por género (hay 30 de cada uno en assets). */
export const CIVILIAN_VARIANTS = 15;

export const SHEETS = {
  recruit: sheetNames('rojito', 3),
  police: ['police_01'], // demos/img/poli.png: tiene pose de disparo con arma
  gangYellow: sheetNames('amarillo', 3),
  gangGreen: sheetNames('verde', 3),
  civilian: [...sheetNames('male', CIVILIAN_VARIANTS), ...sheetNames('female', CIVILIAN_VARIANTS)],
};

/** Todas las animaciones del JSON LPC (assets/img/people/lpc_character.json). */
const LPC_ANIMATIONS = [];
for (const base of ['spellcast', 'thrust', 'walk', 'slash', 'shoot', 'idle', 'jump', 'sit', 'emote', 'run', 'combat', '1h_slash', '1h_halfslash']) {
  for (const dir of ['up', 'left', 'down', 'right']) LPC_ANIMATIONS.push(`${base}_${dir}`);
}
LPC_ANIMATIONS.push('hurt', 'climb');

/** Lo que usa cada rol, por prefijo ('walk' = walk_up/left/down/right). 'hurt' es la caída al morir. */
export const ROLE_ANIMATIONS = {
  recruit: ['idle', 'walk', 'run', 'slash', 'hurt'],
  civilian: ['idle', 'walk', 'run', 'hurt'],
  police: ['idle', 'walk', 'run', 'slash', 'shoot', 'hurt'],
  gang: ['idle', 'walk', 'run', 'slash', 'hurt'],
};

/** Lista de animaciones a NO cargar para un rol (formato `excludeAnimations` del engine). */
export function excludedAnimations(keep) {
  return LPC_ANIMATIONS.filter((name) => !keep.some((p) => name === p || name.startsWith(`${p}_`)));
}

export const HOUSE_COUNT = 63;
export const TREE_COUNT = 18;
