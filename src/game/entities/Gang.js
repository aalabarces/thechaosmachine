// Pandillero: vive en una zona del mapa (SpawnDirector la elige al empezar la run) y la patrulla.
// Ataca al malón y a la policía si entran, y a la pandilla del otro color; no los persigue más
// allá de GANG.leashRadius. Color por bando: amarillo o verde.

import { Enemy } from './Enemy.js';
import { GANG } from '../config/balance.js';
import { FACTION } from '../config/factions.js';
import { SHEETS } from '../config/sprites.js';
import { Faction } from '../components/Faction.js';
import { PersonStats } from '../components/PersonStats.js';
import { Brain } from '../components/Brain.js';

const { NavGrid, rng } = WEED;

const WANDER_TRIES = 5;

export class Gang extends Enemy {
  static spritesheets = [...SHEETS.gangYellow, ...SHEETS.gangGreen];
  static stats = GANG;
  static faction = FACTION.GANG_YELLOW; // se pisa al spawnear según el color
  static lootTable = 'gang';
  static baseVisualRange = GANG.violenceRange;
  static leashRadius = GANG.leashRadius;

  /**
   * @param {{ gangFaction?: number }} spawnConfig además de los de Enemy. No se llama `faction`: el engine
   * copia al objeto las claves del spawn que ya existen en él, y `faction` es el accesor del componente.
   */
  onSpawned(spawnConfig = {}) {
    const green = spawnConfig.gangFaction === FACTION.GANG_GREEN;
    const sheets = green ? SHEETS.gangGreen : SHEETS.gangYellow;
    super.onSpawned({ ...spawnConfig, sheet: sheets[(rng() * sheets.length) | 0] });
    const i = this.index;
    Faction.id[i] = green ? FACTION.GANG_GREEN : FACTION.GANG_YELLOW;
    Brain.progressMs[i] = GANG.wanderEveryMs * rng(); // no todos eligen punto a la vez
  }

  anchorX() {
    return Brain.homeX[this.index];
  }

  anchorY() {
    return Brain.homeY[this.index];
  }

  /** Patrulla: cada tanto elige otro punto caminable de su zona y va caminando tranquilo. */
  roam(ms) {
    const i = this.index;
    Brain.progressMs[i] += ms;
    const arrived = this.isNear(Brain.goalX[i], Brain.goalY[i], 24);
    if (Brain.progressMs[i] > GANG.wanderEveryMs || (arrived && Brain.progressMs[i] > GANG.wanderEveryMs * 0.5)) {
      Brain.progressMs[i] = 0;
      this._pickWanderGoal();
    }
    if (arrived) {
      this.brake(GANG.responsiveness);
      return;
    }
    const speed = PersonStats.maxSpeed[i] * GANG.wanderSpeedFraction;
    this.navigateTo(Brain.goalX[i], Brain.goalY[i], speed, GANG.responsiveness);
  }

  _pickWanderGoal() {
    const i = this.index;
    const hx = Brain.homeX[i];
    const hy = Brain.homeY[i];
    for (let t = 0; t < WANDER_TRIES; t++) {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * GANG.wanderRadius;
      const x = hx + Math.cos(a) * r;
      const y = hy + Math.sin(a) * r;
      if (NavGrid.isPositionWalkable(x, y)) {
        Brain.goalX[i] = x;
        Brain.goalY[i] = y;
        return;
      }
    }
    Brain.goalX[i] = hx;
    Brain.goalY[i] = hy;
  }
}
