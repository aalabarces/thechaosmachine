// Recruit: un chabón de nuestra banda ("SoldadoPropio" del GDD).
// Fase 1: va hacia el destino del malón (SquadState). Después: atacar, lootear, armas.

import { Person } from './Person.js';
import { RECRUIT } from '../config/balance.js';
import { SHEETS } from '../config/sprites.js';
import { SquadState } from '../systems/squadState.js';

export class Recruit extends Person {
  static components = [...Person.components];
  static serializable = true; // hot reload y saves lo conservan
  static spritesheets = SHEETS.recruit;
  static stats = RECRUIT;

  tick() {
    if (SquadState.hasTarget[0]) {
      this.steerTo(
        SquadState.target[0],
        SquadState.target[1],
        RECRUIT.maxSpeed,
        RECRUIT.arriveRadius,
        RECRUIT.stopRadius,
        RECRUIT.responsiveness,
      );
    } else {
      this.brake(RECRUIT.responsiveness);
    }
    this.updateAnimation();
  }
}
