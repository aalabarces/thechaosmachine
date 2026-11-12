// Lo que se compra entre capítulos. Solo datos y cuentas (página).
//
// Mercado (permanente, se guarda en el perfil):
//   - mejoras apilables: cada nivel suma lo mismo y cuesta más que el anterior (GDD);
//   - desbloqueos: se habilitan cuando el malón encontró esa arma (o un chaleco) en una run.
//     Comprado el desbloqueo, el arma aparece en el loot al azar y se puede llevar desde la preparación.
// Preparación (solo para el próximo capítulo, "a riesgo de salir perdiendo"):
//   - reclutas extra, armas desbloqueadas y chalecos.

import { WEAPON } from '../game/config/weapons.js';

/**
 * @typedef {object} Upgrade
 * @property {string} id
 * @property {string} name
 * @property {string} desc
 * @property {number} basePrice
 * @property {number} growth  cada nivel cuesta esto veces el anterior
 */

/** @type {Upgrade[]} */
export const UPGRADES = [
  { id: 'recruits', name: 'Chaboncitos', desc: '+1 recluta al empezar cada capítulo', basePrice: 60, growth: 1.6 },
  { id: 'damage', name: 'Ataque', desc: '+10 % de daño', basePrice: 80, growth: 1.5 },
  { id: 'speed', name: 'Velocidad', desc: '+10 % de velocidad', basePrice: 70, growth: 1.5 },
  { id: 'hp', name: 'Vida', desc: '+10 % de vida', basePrice: 80, growth: 1.5 },
  { id: 'lootMoney', name: 'Ganancia', desc: '+10 % de plata por cada cosa que juntan', basePrice: 100, growth: 1.55 },
  { id: 'props', name: 'Más para romper', desc: '+10 % de tachos, autos y cajeros en el mapa', basePrice: 90, growth: 1.5 },
  { id: 'lootSpeed', name: 'Manos rápidas', desc: '+10 % de velocidad de looteo', basePrice: 50, growth: 1.45 },
  { id: 'cooldown', name: 'Gatillo fácil', desc: '-10 % de espera entre golpes y disparos', basePrice: 110, growth: 1.55 },
  { id: 'sight', name: 'Ojo atento', desc: '+10 % de rango de visión', basePrice: 60, growth: 1.45 },
];

/** Cuánto suma cada nivel de las mejoras porcentuales. */
export const UPGRADE_STEP = 0.1;

/**
 * Desbloqueos. `key` es como se guardan en el perfil (found / unlocked) y en el loadout.
 * `weapon` es el WEAPON.* (el chaleco no tiene).
 */
export const UNLOCKS = [
  { key: 'bat', name: 'Palo', weapon: WEAPON.BAT, price: 60 },
  { key: 'pistol', name: 'Pistola', weapon: WEAPON.PISTOL, price: 180 },
  { key: 'shotgun', name: 'Escopeta', weapon: WEAPON.SHOTGUN, price: 350 },
  { key: 'smg', name: 'Ametralladora', weapon: WEAPON.SMG, price: 600 },
  { key: 'armor', name: 'Chaleco', weapon: -1, price: 220 },
];

/** Precios de la preparación (por capítulo). */
export const PREP = {
  /** Reclutas extra: el primero cuesta esto y cada uno más cuesta `recruitGrowth` veces el anterior. */
  recruitBase: 25,
  recruitGrowth: 1.3,
  maxExtraRecruits: 40,
  /** Precio por unidad para llevar. */
  unitPrice: { bat: 15, pistol: 45, shotgun: 90, smg: 150, armor: 35 },
};

/**
 * Los ricachones fantasma pagan el caos (GDD): además de la plata juntada, un bonus por
 * civiles muertos, enemigos muertos y por la mayor cantidad de estrellas de heat alcanzada.
 */
export const RICH_GHOSTS = {
  perCivilian: 2,
  perEnemy: 6,
  perStar: 30,
};

export function upgradePrice(upgrade, level) {
  return Math.round(upgrade.basePrice * Math.pow(upgrade.growth, level));
}

/** Precio del recluta extra número `n` (0 = el primero) en la preparación. */
export function prepRecruitPrice(n) {
  return Math.round(PREP.recruitBase * Math.pow(PREP.recruitGrowth, n));
}

/** Lo que cuestan `count` reclutas extra en total. */
export function prepRecruitsCost(count) {
  let total = 0;
  for (let n = 0; n < count; n++) total += prepRecruitPrice(n);
  return total;
}

/** Lo que pagan los ricachones por una run. */
export function richGhostsBonus(summary) {
  const civilians = summary.civiliansKilled * RICH_GHOSTS.perCivilian;
  const enemies = summary.enemiesKilled * RICH_GHOSTS.perEnemy;
  const stars = summary.maxStars * RICH_GHOSTS.perStar;
  return { civilians, enemies, stars, total: civilians + enemies + stars };
}

/**
 * Multiplicadores que la run aplica (ver game/systems/runModifiers.js), a partir de los niveles comprados.
 * @param {{ upgrades: Record<string, number>, unlocked: Record<string, boolean> }} profile
 */
export function modifiersFromProfile(profile) {
  const lvl = (id) => profile.upgrades[id] || 0;
  const plus = (id) => 1 + UPGRADE_STEP * lvl(id);
  const weaponUnlocked = [];
  for (const u of UNLOCKS) if (u.weapon >= 0 && profile.unlocked[u.key]) weaponUnlocked.push(u.weapon);
  return {
    damage: plus('damage'),
    speed: plus('speed'),
    hp: plus('hp'),
    lootMoney: plus('lootMoney'),
    props: plus('props'),
    lootSpeed: plus('lootSpeed'),
    cooldown: Math.pow(1 - UPGRADE_STEP, lvl('cooldown')),
    sight: plus('sight'),
    weaponUnlocked,
    armorUnlocked: !!profile.unlocked.armor,
  };
}

/** Reclutas con los que arranca cada capítulo sin gastar en la preparación. */
export function baseRecruits(profile) {
  return 1 + (profile.upgrades.recruits || 0);
}
