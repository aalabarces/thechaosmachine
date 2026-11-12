// FSM de los enemigos (policía y pandillas), la del GDD:
//   RONDAR  la policía caza al malón; las pandillas patrullan su zona.
//   ATACAR  a un hostil que vieron (con línea de vista: las casas tapan) o que les pegó.
//   HUIR    con menos del 10 % de vida corren lejos del peligro y, si se alejan, se escapan.
// Lo común (cooldown, separación, animación) lo hace Enemy.tick; lo de cada rol, su clase.

import { ENEMY } from '../config/balance.js';
import { Brain } from '../components/Brain.js';
import { Health } from '../components/Health.js';

const { FSM, FSMState } = WEED;

function shouldFlee(i) {
  return Health.hp[i] < Health.maxHp[i] * ENEMY.fleeHpFraction;
}

class RoamState extends FSMState {
  static onUpdate(owner, i, dt) {
    const t = owner.lookForEnemy();
    if (t >= 0) {
      Brain.target[i] = t;
      this.fsm.changeState(i, this.fsm.states.ATTACK);
    }
    owner.roam(dt * owner.msPerTick);
  }
}

class AttackState extends FSMState {
  static onUpdate(owner, i, dt) {
    if (shouldFlee(i)) {
      this.fsm.changeState(i, this.fsm.states.FLEE);
      owner.fleeFromThreat();
      return;
    }
    let t = Brain.target[i];
    if (!owner.isValidTarget(t) || !owner.isInLeash(t)) {
      t = owner.lookForEnemy();
      Brain.target[i] = t;
      if (t < 0) {
        this.fsm.changeState(i, this.fsm.states.ROAM);
        owner.roam(dt * owner.msPerTick);
        return;
      }
    }
    owner.fight(t);
  }

  static onExit(owner, i) {
    Brain.target[i] = -1;
  }
}

class FleeState extends FSMState {
  static onUpdate(owner, i) {
    if (owner.hasEscaped()) {
      owner.despawn();
      return;
    }
    owner.fleeFromThreat();
  }
}

export class EnemyFSM extends FSM {
  static states = { ROAM: RoamState, ATTACK: AttackState, FLEE: FleeState };
  static initial = RoamState;
}
