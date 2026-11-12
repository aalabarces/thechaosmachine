// FSM del recluta, con las prioridades del GDD:
//   1. ATACAR si hay un hostil en rango de violencia (cerca de su puesto en la formación),
//   2. si no, LOOTEAR el drop libre más cercano,
//   3. si no, SEGUIR al malón (ir a su puesto).
// Lo común a todos los estados (puesto, cooldown, separación, animación) lo hace Recruit.tick.

import { RECRUIT } from '../config/balance.js';
import { Brain } from '../components/Brain.js';
import { DropData } from '../components/DropData.js';
import { Drop } from '../entities/Drop.js';

const { FSM, FSMState } = WEED;

class FollowState extends FSMState {
  static onUpdate(owner, i) {
    const t = owner.findHostile(owner.sightRange(), owner.slotX, owner.slotY, RECRUIT.leashRadius);
    if (t >= 0) {
      Brain.target[i] = t;
      this.fsm.changeState(i, this.fsm.states.ATTACK);
    } else if (owner.claimLoot()) {
      this.fsm.changeState(i, this.fsm.states.LOOT);
    }
    owner.followSquad();
  }
}

class AttackState extends FSMState {
  static onUpdate(owner, i) {
    let t = Brain.target[i];
    if (!owner.isValidTarget(t) || !owner.isInLeash(t)) {
      t = owner.findHostile(owner.sightRange(), owner.slotX, owner.slotY, RECRUIT.leashRadius);
      Brain.target[i] = t;
      if (t < 0) {
        this.fsm.changeState(i, this.fsm.states.FOLLOW);
        owner.followSquad();
        return;
      }
    }
    owner.fight(t);
  }

  static onExit(owner, i) {
    Brain.target[i] = -1;
  }
}

class LootState extends FSMState {
  static onEnter(owner, i) {
    Brain.progressMs[i] = 0;
  }

  static onUpdate(owner, i, dt, timeMs) {
    const d = Brain.target[i];
    if (!Drop.isAvailable(d) || DropData.claimedBy[d] !== i || !owner.isInLeash(d)) {
      this.fsm.changeState(i, this.fsm.states.FOLLOW);
      owner.followSquad();
      return;
    }
    // Trabado sin poder llegar (algo sólido en el medio): lo deja y no lo vuelve a buscar.
    if (timeMs > RECRUIT.lootGiveUpMs) {
      Brain.ignoreDrop[i] = d;
      this.fsm.changeState(i, this.fsm.states.FOLLOW);
      owner.followSquad();
      return;
    }
    // Pelear tiene prioridad sobre juntar: suelta el drop para que lo junte otro.
    const t = owner.findHostile(owner.sightRange(), owner.slotX, owner.slotY, RECRUIT.leashRadius);
    if (t >= 0) {
      DropData.claimedBy[d] = -1;
      Brain.target[i] = t;
      this.fsm.changeState(i, this.fsm.states.ATTACK);
      owner.fight(t);
      return;
    }
    if (owner.pickUp(d, dt * owner.msPerTick)) this.fsm.changeState(i, this.fsm.states.FOLLOW);
  }

  static onExit(owner, i) {
    const d = Brain.target[i];
    if (Drop.isAvailable(d) && DropData.claimedBy[d] === i) DropData.claimedBy[d] = -1;
  }
}

export class RecruitFSM extends FSM {
  static states = { FOLLOW: FollowState, ATTACK: AttackState, LOOT: LootState };
  static initial = FollowState;
}
