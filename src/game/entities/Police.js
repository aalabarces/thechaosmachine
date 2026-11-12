// Policía: aparece fuera de cámara cuando hay heat (SpawnDirector) y caza al malón.
// Se pelea también con las pandillas. Hoja: police_01 (con pose de disparo).

import { Enemy } from './Enemy.js';
import { POLICE, HEAT } from '../config/balance.js';
import { FACTION } from '../config/factions.js';
import { SHEETS } from '../config/sprites.js';
import { PersonStats } from '../components/PersonStats.js';
import { SquadState } from '../systems/squadState.js';
import { RunState } from '../systems/runState.js';

export class Police extends Enemy {
  static spritesheets = SHEETS.police;
  static stats = POLICE;
  static faction = FACTION.POLICE;
  static lootTable = 'police';
  static baseVisualRange = POLICE.violenceRange;
  static shootAnimation = true;

  /**
   * Va hacia donde está el malón. El centro se redondea a una grilla gruesa: todos los policías
   * van a la misma celda y comparten un flowfield.
   */
  roam() {
    if (SquadState.alive[0] === 0) {
      this.brake(POLICE.responsiveness);
      return;
    }
    const g = POLICE.huntGrid;
    const gx = (Math.floor(SquadState.centroid[0] / g) + 0.5) * g;
    const gy = (Math.floor(SquadState.centroid[1] / g) + 0.5) * g;
    this.navigateTo(gx, gy, PersonStats.maxSpeed[this.index], POLICE.responsiveness);
  }

  onDeath() {
    super.onDeath();
    if (this.killedByPlayer()) RunState.heat.add(HEAT.policeKill);
  }
}
