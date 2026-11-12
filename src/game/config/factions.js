// Bandos y quién odia a quién. Solo datos: este archivo no usa el engine.
// La matriz es asimétrica: HOSTILE[a][b] = "a ataca a b si lo tiene en rango de violencia".
// Un bando huye de quien lo considera hostil (los civiles no atacan, pero escapan del malón).

export const FACTION = {
  NONE: 0, // escenografía, drops, cadáveres, autos ya destrozados
  PLAYER: 1, // nuestro malón
  CIVILIAN: 2,
  POLICE: 3, // fase 5
  GANG_YELLOW: 4, // fase 5
  GANG_GREEN: 5, // fase 5
  PROP: 6, // cosas rompibles con algo adentro: tachos, autos, cajeros
};

const COUNT = 7;
const HOSTILE = new Uint8Array(COUNT * COUNT);

function hostile(a, b) {
  HOSTILE[a * COUNT + b] = 1;
}

hostile(FACTION.PLAYER, FACTION.CIVILIAN);
hostile(FACTION.PLAYER, FACTION.PROP);
// Fase 5: policía y pandillas contra el malón y entre ellas.

/** ¿`attacker` le pega a `victim` si lo ve? */
export function isHostile(attacker, victim) {
  return HOSTILE[attacker * COUNT + victim] === 1;
}

/**
 * Cuánto "pesa" la distancia a un blanco de este bando al elegir a quién atacar:
 * más alto = menos prioridad. Los props solo se rompen si no hay personas cerca.
 */
export const TARGET_DISTANCE_WEIGHT = new Float32Array(COUNT).fill(1);
TARGET_DISTANCE_WEIGHT[FACTION.PROP] = 4;
