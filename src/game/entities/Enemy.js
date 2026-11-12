// Enemy: base de la policía y las pandillas ("Enemigo" del GDD). Pelea con lo que tenga en la
// mano igual que un recluta (Person.fight), solo ataca a lo que ve (las casas sirven de
// cobertura) o a quien le pegó, y huye con poca vida. Cada rol define cómo ronda (roam) y
// desde dónde mide su correa (anchor / leashRadius).

import { Person } from './Person.js';
import { ENEMY, DIRECTOR } from '../config/balance.js';
import { isHostile } from '../config/factions.js';
import { Faction } from '../components/Faction.js';
import { Health } from '../components/Health.js';
import { PersonStats } from '../components/PersonStats.js';
import { Brain } from '../components/Brain.js';
import { EnemyFSM } from '../ai/enemyFSM.js';
import { SquadState } from '../systems/squadState.js';
import { RunState } from '../systems/runState.js';
import { Loot } from '../components/Loot.js';
import { rollMoney } from '../systems/loot.js';

const { Transform, rng } = WEED;

export class Enemy extends Person {
  static components = [...Person.components, EnemyFSM];
  /** Cuánto se aleja de su ancla para pelear (px). */
  static leashRadius = Infinity;

  /** ms que representa un tick (para timers). */
  msPerTick = 16.67;

  /**
   * @param {{ x: number, y: number, weapon?: number, sheet?: string, homeX?: number, homeY?: number, zone?: number }} spawnConfig
   */
  onSpawned(spawnConfig = {}) {
    super.onSpawned(spawnConfig);
    const i = this.index;
    const s = this.constructor.stats;
    PersonStats.maxSpeed[i] = s.maxSpeed * (0.94 + rng() * 0.12);
    PersonStats.violenceRange[i] = s.violenceRange;
    PersonStats.lootSpeed[i] = 1;
    // Un malón más fuerte trae enemigos más duros que dejan más plata (GDD).
    Loot.money[i] = Math.round(rollMoney(this.constructor.lootTable) * (1 + SquadState.strength[0] * DIRECTOR.enemyMoneyPerStrength));
    Brain.homeX[i] = spawnConfig.homeX ?? this.x;
    Brain.homeY[i] = spawnConfig.homeY ?? this.y;
    Brain.goalX[i] = this.x;
    Brain.goalY[i] = this.y;
    Brain.zone[i] = spawnConfig.zone ?? -1;
    // El pool reusa entidades: arrancar siempre rondando.
    EnemyFSM.state[i] = EnemyFSM.states.ROAM.stateIndex;
    EnemyFSM.time[i] = 0;
    EnemyFSM.nextState[i] = -1;
  }

  tick(dtRatio) {
    const ms = dtRatio * this.msPerTick;
    this.coolDown(ms);
    this.enemyFSM.tick(dtRatio, this);
    if (Transform.active[this.index] !== 1) return; // se escapó (huyendo) en este tick
    this.applySeparation(ENEMY.separationRadius, ENEMY.separationForce);
    this.updateAnimation(ms, EnemyFSM.state[this.index] === EnemyFSM.states.FLEE.stateIndex);
  }

  // ---------------------------------------------------------------- lo que define cada rol

  /** Qué hace cuando no pelea. */
  roam(ms) {
    this.brake(this.constructor.stats.responsiveness);
  }

  /** Punto desde el que se mide la correa. */
  anchorX() {
    return this.x;
  }

  anchorY() {
    return this.y;
  }

  // ---------------------------------------------------------------- pelear

  /** El hostil más cercano que ve (sin una casa en el medio), dentro de su correa. -1 si no hay. */
  lookForEnemy() {
    const t = this.findHostile(this.sightRange(), this.anchorX(), this.anchorY(), this.constructor.leashRadius);
    return t >= 0 && this.canSee(t) ? t : -1;
  }

  isInLeash(t) {
    const leash = this.constructor.leashRadius;
    if (leash === Infinity) return true;
    const dx = Transform.x[t] - this.anchorX();
    const dy = Transform.y[t] - this.anchorY();
    return dx * dx + dy * dy <= leash * leash;
  }

  /** Si le pegan mientras ronda, va por el que le pegó aunque no lo haya visto. */
  onHurt(fromX, fromY, from) {
    const i = this.index;
    Brain.threatX[i] = fromX;
    Brain.threatY[i] = fromY;
    if (rng() < 0.4) this.playPain(0.5);
    if (EnemyFSM.state[i] !== EnemyFSM.states.ROAM.stateIndex) return;
    if (from >= 0 && this.isValidTarget(from)) {
      Brain.target[i] = from;
      this.enemyFSM.changeState(EnemyFSM.states.ATTACK);
    }
  }

  // ---------------------------------------------------------------- huir

  /** Corre lejos del hostil más cercano que tenga a la vista (o de donde le pegaron). */
  fleeFromThreat() {
    const i = this.index;
    this._nearestHostileThreat();
    let dx = this.x - Brain.threatX[i];
    let dy = this.y - Brain.threatY[i];
    let d = Math.sqrt(dx * dx + dy * dy);
    if (d < 0.001) {
      dx = rng() - 0.5;
      dy = rng() - 0.5;
      d = Math.sqrt(dx * dx + dy * dy) || 1;
    }
    const s = ENEMY.fleeSpeed / d;
    this.steerVelocity(dx * s, dy * s, this.constructor.stats.responsiveness);
    this.escapeBlockedCell(ENEMY.fleeSpeed, this.constructor.stats.responsiveness);
  }

  _nearestHostileThreat() {
    const i = this.index;
    const myFaction = Faction.id[i];
    let bestD2 = Infinity;
    for (let n = 0; n < this.neighborCount; n++) {
      const ni = this.getNeighbor(n);
      if (!Transform.active[ni] || Health.hp[ni] <= 0 || !isHostile(Faction.id[ni], myFaction)) continue;
      const dx = Transform.x[ni] - this.x;
      const dy = Transform.y[ni] - this.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        Brain.threatX[i] = Transform.x[ni];
        Brain.threatY[i] = Transform.y[ni];
      }
    }
  }

  /** Lejos del malón y sin hostiles a la vista: se escapó. */
  hasEscaped() {
    if (SquadState.alive[0] > 0) {
      const dx = this.x - SquadState.centroid[0];
      const dy = this.y - SquadState.centroid[1];
      if (dx * dx + dy * dy < ENEMY.escapeDistance * ENEMY.escapeDistance) return false;
    }
    const myFaction = Faction.id[this.index];
    for (let n = 0; n < this.neighborCount; n++) {
      const ni = this.getNeighbor(n);
      if (Transform.active[ni] && Health.hp[ni] > 0 && isHostile(Faction.id[ni], myFaction)) return false;
    }
    return true;
  }

  // ---------------------------------------------------------------- morir

  onDeath() {
    if (this.killedByPlayer()) RunState.enemiesKilled.add(1);
  }
}

/** Distancia al cuadrado entre una entidad y el centro del malón (para el director). */
export function distanceToSquad2(i) {
  const dx = Transform.x[i] - SquadState.centroid[0];
  const dy = Transform.y[i] - SquadState.centroid[1];
  return dx * dx + dy * dy;
}

