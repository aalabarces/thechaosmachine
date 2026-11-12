// Bandos y quién odia a quién. Solo datos: este archivo no usa el engine.
// La matriz es asimétrica: HOSTILE[a][b] = "a ataca a b si lo tiene en rango de violencia".
// Un bando huye de quien lo considera hostil (los civiles no atacan, pero escapan del malón).

export const FACTION = {
  NONE: 0, // escenografía, drops, cadáveres
  PLAYER: 1, // nuestro malón
  CIVILIAN: 2,
  POLICE: 3, // fase 5
  GANG_YELLOW: 4, // fase 5
  GANG_GREEN: 5, // fase 5
};

const COUNT = 6;
const HOSTILE = new Uint8Array(COUNT * COUNT);

function hostile(a, b) {
  HOSTILE[a * COUNT + b] = 1;
}

hostile(FACTION.PLAYER, FACTION.CIVILIAN);
// Fase 5: policía y pandillas contra el malón y entre ellas.

/** ¿`attacker` le pega a `victim` si lo ve? */
export function isHostile(attacker, victim) {
  return HOSTILE[attacker * COUNT + victim] === 1;
}
