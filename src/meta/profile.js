// Progresión guardada en el dispositivo (localStorage): plata, mejoras compradas, armas
// encontradas y desbloqueadas, número de capítulo. No se guarda nada de una run en curso (GDD).

import { UNLOCKS } from './marketCatalog.js';

/** WEAPON.* → clave de desbloqueo ('pistol', ...). */
const WEAPON_KEY_BY_ID = {};
for (const u of UNLOCKS) if (u.weapon >= 0) WEAPON_KEY_BY_ID[u.weapon] = u.key;

const STORAGE_KEY = 'chaos-machine-profile-v1';
const VERSION = 1;

/**
 * @typedef {object} Profile
 * @property {number} version
 * @property {number} money
 * @property {number} chapter            el próximo capítulo a jugar
 * @property {Record<string, number>} upgrades   id → nivel
 * @property {Record<string, boolean>} found      clave de desbloqueo → lo encontró en alguna run
 * @property {Record<string, boolean>} unlocked   clave de desbloqueo → lo compró en el mercado
 * @property {{ runs: number, bestMoney: number, totalMoney: number }} stats
 */

/** @returns {Profile} */
export function newProfile() {
  return {
    version: VERSION,
    money: 0,
    chapter: 1,
    upgrades: {},
    found: {},
    unlocked: {},
    stats: { runs: 0, bestMoney: 0, totalMoney: 0 },
  };
}

/** @returns {Profile | null} */
export function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || p.version !== VERSION) return null;
    // Campos que pudieran faltar en un guardado viejo.
    return { ...newProfile(), ...p, stats: { ...newProfile().stats, ...p.stats } };
  } catch {
    return null;
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Sin almacenamiento (modo privado): se juega igual, sin guardar.
  }
}

export function hasProfile() {
  return loadProfile() !== null;
}

export function deleteProfile() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nada que borrar
  }
}

/**
 * Anota el resultado de un capítulo: suma la plata (juntada + bonus), avanza el capítulo y
 * marca lo encontrado (habilita su desbloqueo en el mercado).
 * @returns {string[]} claves encontradas por primera vez en esta run
 */
export function applyRunResult(profile, summary, earned) {
  profile.money += earned;
  profile.chapter += 1;
  profile.stats.runs += 1;
  profile.stats.totalMoney += earned;
  profile.stats.bestMoney = Math.max(profile.stats.bestMoney, earned);

  const newlyFound = [];
  const mark = (key) => {
    if (!key || profile.found[key]) return;
    profile.found[key] = true;
    newlyFound.push(key);
  };
  for (const w of summary.weaponsFound) mark(WEAPON_KEY_BY_ID[w]);
  if (summary.armorFound) mark('armor');
  saveProfile(profile);
  return newlyFound;
}

