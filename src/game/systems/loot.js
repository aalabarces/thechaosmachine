// Tirar al piso lo que suelta algo al morir o romperse, según su tabla (config/lootTables.js).

import { LOOT_TABLES, ITEM } from '../config/lootTables.js';
import { ARMOR } from '../config/weapons.js';
import { Drop, DROP_KIND } from '../entities/Drop.js';
import { RunModifiers } from './runModifiers.js';

const { NavGrid, rng } = WEED;

/** Intentos para encontrar un punto caminable alrededor del prop. */
const RING_TRIES = 8;

/** Plata al azar dentro del rango de la tabla. */
export function rollMoney(tableName) {
  const t = LOOT_TABLES[tableName];
  if (!t) return 0;
  const [min, max] = t.money;
  return min + ((rng() * (max - min + 1)) | 0);
}

/**
 * Suelta la plata (`money`, ya decidida) y tira los ítems de la tabla.
 * Con `ring` > 0 cada cosa cae en un punto al azar a esa distancia de (x, y): un prop sólido
 * (auto, cajero) que suelta el botín en su centro lo dejaba adentro de la chatarra, donde nadie
 * podía llegar a juntarlo.
 * @param {string} tableName
 */
export function dropLoot(tableName, x, y, money, ring = 0) {
  if (money > 0) spawnAround(x, y, ring, DROP_KIND.MONEY, money);
  const t = LOOT_TABLES[tableName];
  if (!t) return;
  for (let k = 0; k < t.items.length; k++) {
    const item = t.items[k];
    if (rng() >= item.chance) continue;
    // Un arma (o el chaleco) solo aparece al azar si ya está desbloqueada en el mercado. Antes, la
    // primera hay que sacársela a un enemigo que la lleve (Person.die suelta el arma siempre).
    if (item.kind === ITEM.WEAPON) {
      if (RunModifiers.weaponUnlocked[item.weapon]) spawnAround(x, y, ring, DROP_KIND.WEAPON, item.weapon);
    } else if (item.kind === ITEM.ARMOR) {
      if (RunModifiers.armorUnlocked[0]) spawnAround(x, y, ring, DROP_KIND.ARMOR, ARMOR.amount);
    }
  }
}

function spawnAround(x, y, ring, kind, amount) {
  if (ring <= 0) {
    Drop.spawn({ x, y, kind, amount });
    return;
  }
  // Un punto caminable del anillo (un cajero está pegado a una casa: la mitad del anillo cae adentro).
  let px = x;
  let py = y + ring;
  for (let t = 0; t < RING_TRIES; t++) {
    const a = rng() * Math.PI * 2;
    px = x + Math.cos(a) * ring;
    py = y + Math.sin(a) * ring;
    if (NavGrid.isPositionWalkable(px, py)) break;
  }
  Drop.spawn({ x: px, y: py, kind, amount });
}
