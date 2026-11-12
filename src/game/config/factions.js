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
// El malón contra todos los enemigos, y todos los enemigos contra el malón.
for (const enemy of [FACTION.POLICE, FACTION.GANG_YELLOW, FACTION.GANG_GREEN]) {
  hostile(FACTION.PLAYER, enemy);
  hostile(enemy, FACTION.PLAYER);
}
// Policía y pandillas se pelean entre ellas: llevar a la policía a una zona de pandilla las enfrenta.
hostile(FACTION.POLICE, FACTION.GANG_YELLOW);
hostile(FACTION.POLICE, FACTION.GANG_GREEN);
hostile(FACTION.GANG_YELLOW, FACTION.POLICE);
hostile(FACTION.GANG_GREEN, FACTION.POLICE);
hostile(FACTION.GANG_YELLOW, FACTION.GANG_GREEN);
hostile(FACTION.GANG_GREEN, FACTION.GANG_YELLOW);

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
// Los reclutas prefieren a quien les dispara antes que a un civil que pasa.
TARGET_DISTANCE_WEIGHT[FACTION.CIVILIAN] = 1.5;

/** ¿Es un bando enemigo (policía o pandilla)? */
export function isEnemyFaction(f) {
  return f === FACTION.POLICE || f === FACTION.GANG_YELLOW || f === FACTION.GANG_GREEN;
}
