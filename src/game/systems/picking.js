// Qué hay bajo el puntero (click derecho): un drop para lootear, o algo golpeable (personas que
// no son del malón y props sanos). Corre en la página. Mide desde el centro del dibujo, no
// desde los pies, para que tocar el cuerpo de alguien lo elija.

import { INPUT } from '../config/balance.js';
import { FOCUS } from './squadState.js';
import { Health } from '../components/Health.js';
import { Drop } from '../entities/Drop.js';
import { Civilian } from '../entities/Civilian.js';
import { Police } from '../entities/Police.js';
import { Gang } from '../entities/Gang.js';
import { TrashCan } from '../entities/props/TrashCan.js';
import { ParkedCar } from '../entities/props/ParkedCar.js';
import { Atm } from '../entities/props/Atm.js';

const { Transform } = WEED;

/**
 * Qué se puede elegir: clase, qué orden da, cuánto más arriba de los pies está el centro de su
 * dibujo (px) y el radio para tocarlo.
 */
const PICKABLE = [
  { cls: Drop, kind: FOCUS.LOOT, lift: 4, radius: INPUT.pickRadius },
  { cls: Civilian, kind: FOCUS.ATTACK, lift: 22, radius: INPUT.pickRadius },
  { cls: Police, kind: FOCUS.ATTACK, lift: 22, radius: INPUT.pickRadius },
  { cls: Gang, kind: FOCUS.ATTACK, lift: 22, radius: INPUT.pickRadius },
  { cls: TrashCan, kind: FOCUS.ATTACK, lift: 16, radius: INPUT.pickRadius },
  { cls: Atm, kind: FOCUS.ATTACK, lift: 17, radius: INPUT.pickRadius },
  { cls: ParkedCar, kind: FOCUS.ATTACK, lift: 0, radius: INPUT.pickRadiusCar },
];

/**
 * Lo más cercano al punto (wx, wy) dentro de su radio.
 * @returns {{ index: number, kind: number } | null}
 */
export function pickAt(wx, wy) {
  let best = -1;
  let bestKind = FOCUS.NONE;
  let bestScore = 1; // distancia / radio: tiene que ser < 1
  for (const p of PICKABLE) {
    const all = p.cls.getAllActive();
    for (let k = 0; k < all.length; k++) {
      const e = all[k];
      // Lo que se golpea tiene que estar sano (un auto ya destrozado no cuenta).
      if (p.kind === FOCUS.ATTACK && (Health.hp[e] <= 0 || Health.maxHp[e] <= 0)) continue;
      const dx = wx - Transform.x[e];
      const dy = wy - (Transform.y[e] - p.lift);
      const score = Math.sqrt(dx * dx + dy * dy) / p.radius;
      if (score >= bestScore) continue;
      best = e;
      bestKind = p.kind;
      bestScore = score;
    }
  }
  return best >= 0 ? { index: best, kind: bestKind } : null;
}

/** ¿El foco actual sigue valiendo? (misma entidad, viva / sana / en el piso) */
export function isFocusValid(index, kind, entityType) {
  if (index < 0 || Transform.active[index] !== 1 || Transform.entityType[index] !== entityType) return false;
  if (kind === FOCUS.LOOT) return Drop.isAvailable(index);
  return Health.hp[index] > 0 && Health.maxHp[index] > 0;
}
