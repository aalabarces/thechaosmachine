// Armas: una fila por arma. Solo datos: este archivo no usa el engine.
// `rank` decide cuál es "mejor": un recluta solo junta un arma de rango mayor a la que tiene
// (y suelta la vieja para que la junte otro).
//
// Las armas de fuego son instantáneas (un rayo por perdigón): atraviesan a los compañeros del
// mismo bando y se frenan en la primera cosa sólida (casa, árbol, auto) o persona de otro bando.

export const WEAPON = {
  FISTS: 0,
  BAT: 1,
  PISTOL: 2,
  SHOTGUN: 3,
  SMG: 4,
};

/**
 * @typedef {object} WeaponDef
 * @property {string} name        nombre para la UI
 * @property {number} rank        mayor = mejor
 * @property {boolean} ranged
 * @property {number} damage      por golpe o por perdigón
 * @property {number} range       px. Melee: alcance desde el borde de uno hasta el borde del blanco
 *                                (así se le pega igual a una persona que al costado de un auto).
 *                                De fuego: distancia de tiro desde el centro.
 * @property {number} cooldownMs
 * @property {number} [pellets]   perdigones por disparo
 * @property {number} [spread]    desvío máximo de cada perdigón (radianes)
 * @property {string} sfx         efecto de config/sounds.js (SFX) al pegar o disparar
 * @property {string} [icon]      textura del drop y de lo que lleva en la mano
 * @property {number} [iconWidth] ancho en px del drop
 */

/** @type {WeaponDef[]} indexado por WEAPON.* */
export const WEAPONS = [];

WEAPONS[WEAPON.FISTS] = {
  name: 'Piñas',
  rank: 0,
  ranged: false,
  damage: 12,
  range: 8,
  cooldownMs: 650,
  sfx: 'punch',
};

WEAPONS[WEAPON.BAT] = {
  name: 'Palo',
  rank: 1,
  ranged: false,
  damage: 26,
  range: 14,
  cooldownMs: 800,
  sfx: 'batHit',
  icon: 'drop_bat', // assets/img/drops/bat.png: placeholder generado
  iconWidth: 20,
};

WEAPONS[WEAPON.PISTOL] = {
  name: 'Pistola',
  rank: 2,
  ranged: true,
  damage: 20,
  range: 260,
  cooldownMs: 550,
  pellets: 1,
  spread: 0.06,
  sfx: 'pistol',
  icon: 'drop_pistol',
  iconWidth: 18,
};

WEAPONS[WEAPON.SHOTGUN] = {
  name: 'Escopeta',
  rank: 3,
  ranged: true,
  damage: 13,
  range: 180,
  cooldownMs: 1100,
  pellets: 6,
  spread: 0.28,
  sfx: 'shotgun',
  icon: 'drop_shotgun',
  iconWidth: 28,
};

WEAPONS[WEAPON.SMG] = {
  name: 'Ametralladora',
  rank: 4,
  ranged: true,
  damage: 11,
  range: 240,
  cooldownMs: 110,
  pellets: 1,
  spread: 0.13,
  sfx: 'smg',
  icon: 'drop_smg',
  iconWidth: 30,
};

/** Chaleco: absorbe daño antes que la vida. */
export const ARMOR = {
  /** Puntos que da cada chaleco y tope por persona. */
  amount: 60,
  max: 60,
  /** Fracción del daño que absorbe mientras le quedan puntos. */
  absorb: 0.7,
  icon: 'drop_armor', // assets/img/drops/armor.png: placeholder generado
  iconWidth: 16,
};
