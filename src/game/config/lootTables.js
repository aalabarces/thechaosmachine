// Qué suelta cada cosa al morir o romperse. Solo datos.
// money: [mín, máx] plata. items: probabilidades independientes de cada drop.

import { WEAPON } from './weapons.js';

export const ITEM = {
  WEAPON: 'weapon',
  ARMOR: 'armor',
};

export const LOOT_TABLES = {
  civilian: {
    money: [5, 40],
    items: [
      { kind: ITEM.WEAPON, weapon: WEAPON.BAT, chance: 0.03 },
      { kind: ITEM.WEAPON, weapon: WEAPON.PISTOL, chance: 0.015 },
    ],
  },
  trashCan: {
    money: [0, 8],
    items: [
      { kind: ITEM.WEAPON, weapon: WEAPON.BAT, chance: 0.25 },
      { kind: ITEM.WEAPON, weapon: WEAPON.PISTOL, chance: 0.04 },
    ],
  },
  parkedCar: {
    money: [10, 60],
    items: [
      { kind: ITEM.WEAPON, weapon: WEAPON.PISTOL, chance: 0.22 },
      { kind: ITEM.WEAPON, weapon: WEAPON.SHOTGUN, chance: 0.08 },
      { kind: ITEM.ARMOR, chance: 0.15 },
    ],
  },
  police: {
    money: [10, 35],
    items: [{ kind: ITEM.ARMOR, chance: 0.2 }],
  },
  gang: {
    money: [20, 70],
    items: [{ kind: ITEM.WEAPON, weapon: WEAPON.BAT, chance: 0.15 }],
  },
  atm: {
    money: [120, 300],
    items: [{ kind: ITEM.WEAPON, weapon: WEAPON.SMG, chance: 0.12 }],
  },
};
