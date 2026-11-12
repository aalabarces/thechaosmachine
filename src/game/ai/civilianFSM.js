// FSM del civil: PASEAR por las veredas → HUIR cuando ve a alguien hostil o lo golpean.
// Vuelve a pasear después de un rato sin ver peligro.

import { CIVILIAN } from '../config/balance.js';
import { Brain } from '../components/Brain.js';

const { FSM, FSMState } = WEED;

class WalkState extends FSMState {
  static onUpdate(owner, i, dt) {
    if (owner.lookForThreat()) {
      this.fsm.changeState(i, this.fsm.states.FLEE);
      return;
    }
    owner.stroll();
    owner.updateAnimation(dt * owner.msPerTick, false);
  }
}

class FleeState extends FSMState {
  static onEnter(owner, i) {
    Brain.calmMs[i] = 0;
  }

  static onUpdate(owner, i, dt) {
    const ms = dt * owner.msPerTick;
    if (owner.lookForThreat()) Brain.calmMs[i] = 0;
    else Brain.calmMs[i] += ms;
    if (Brain.calmMs[i] > CIVILIAN.calmDownMs) {
      this.fsm.changeState(i, this.fsm.states.WALK);
      return;
    }
    owner.fleeFromThreat();
    owner.updateAnimation(ms, true);
  }
}

export class CivilianFSM extends FSM {
  static states = { WALK: WalkState, FLEE: FleeState };
  static initial = WalkState;
}
