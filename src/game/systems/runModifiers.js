// Mejoras del perfil que valen para esta run (multiplicadores y desbloqueos), compartidas con
// los workers. Único escritor: RunScene.create (página), una vez, con lo que manda main.js.
// Lectores: los reclutas (stats, plata, looteo) y el loot al azar (qué armas pueden aparecer).

const { SharedResource } = WEED;

export class RunModifiers extends SharedResource {}

const ONE = { type: Float32Array, length: 1 };

export const RUN_MODIFIERS_SCHEMA = {
  damage: ONE,
  speed: ONE,
  hp: ONE,
  lootMoney: ONE,
  lootSpeed: ONE,
  cooldown: ONE,
  sight: ONE,
  /** 1 en la posición de cada WEAPON.* desbloqueada: solo esas aparecen en el loot al azar. */
  weaponUnlocked: { type: Uint8Array, length: 8 },
  armorUnlocked: { type: Uint8Array, length: 1 },
  /**
   * 1 si la escena tiene iluminación (calidad gráfica alta o baja). No es una mejora del perfil, pero
   * viaja por acá porque los workers la necesitan (los fogonazos solo se piden si hay luces).
   */
  lightingOn: { type: Uint8Array, length: 1 },
};

/**
 * Escribe los modificadores de la run. Sin datos (dev sin perfil) todo vale 1 y no hay desbloqueos.
 * @param {{ damage?: number, speed?: number, hp?: number, lootMoney?: number, lootSpeed?: number,
 *           cooldown?: number, sight?: number, weaponUnlocked?: number[], armorUnlocked?: boolean }} [m]
 */
export function writeRunModifiers(m = {}, lightingOn = false) {
  RunModifiers.lightingOn[0] = lightingOn ? 1 : 0;
  RunModifiers.damage[0] = m.damage ?? 1;
  RunModifiers.speed[0] = m.speed ?? 1;
  RunModifiers.hp[0] = m.hp ?? 1;
  RunModifiers.lootMoney[0] = m.lootMoney ?? 1;
  RunModifiers.lootSpeed[0] = m.lootSpeed ?? 1;
  RunModifiers.cooldown[0] = m.cooldown ?? 1;
  RunModifiers.sight[0] = m.sight ?? 1;
  RunModifiers.weaponUnlocked.fill(0);
  for (const w of m.weaponUnlocked ?? []) RunModifiers.weaponUnlocked[w] = 1;
  RunModifiers.armorUnlocked[0] = m.armorUnlocked ? 1 : 0;
}
