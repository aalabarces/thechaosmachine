// Civilian: peatón que pasea por las veredas (flowfield horneado de littleCity) y huye del malón.
// Portado de CityPerson (demo littleCity), con la FSM del GDD: pasear → huir → pasear.

import { Person } from './Person.js';
import { CIVILIAN, HEAT } from '../config/balance.js';
import { FACTION, isHostile } from '../config/factions.js';
import { SHEETS } from '../config/sprites.js';
import { Faction } from '../components/Faction.js';
import { Health } from '../components/Health.js';
import { Loot } from '../components/Loot.js';
import { PersonStats } from '../components/PersonStats.js';
import { Brain } from '../components/Brain.js';
import { CivilianFSM } from '../ai/civilianFSM.js';
import { RunState } from '../systems/runState.js';
import { VOICE } from '../config/sounds.js';
import { playSfx } from '../systems/sfx.js';
import { rollMoney } from '../systems/loot.js';

const { NavGrid, Transform, rng } = WEED;

const SIDEWALKS = 'sidewalks';
const TICK_INTERVAL = 2;
const _nav = { x: 0, y: 0 };

export class Civilian extends Person {
  static components = [...Person.components, CivilianFSM];
  static tickInterval = TICK_INTERVAL; // la mitad de los frames: son muchos y no necesitan más
  static serializable = true; // el hot reload los conserva
  static spritesheets = SHEETS.civilian;
  static stats = CIVILIAN;
  static faction = FACTION.CIVILIAN;
  static lootTable = 'civilian';
  static baseVisualRange = CIVILIAN.visualRange;

  /** ms que representa un tick (para timers). */
  msPerTick = 16.67 * TICK_INTERVAL;

  onSpawned(spawnConfig = {}) {
    super.onSpawned(spawnConfig);
    const i = this.index;
    PersonStats.maxSpeed[i] = CIVILIAN.walkMaxSpeed * (1 + (rng() * 2 - 1) * CIVILIAN.walkJitter);
    Loot.money[i] = rollMoney('civilian');
    Brain.homeX[i] = this.x;
    Brain.homeY[i] = this.y;
    // El pool reusa entidades: arrancar siempre paseando.
    CivilianFSM.state[i] = CivilianFSM.states.WALK.stateIndex;
    CivilianFSM.time[i] = 0;
    CivilianFSM.nextState[i] = -1;
  }

  tick(dtRatio) {
    this.civilianFSM.tick(dtRatio, this);
  }

  /** Pasea siguiendo el flowfield de veredas, con separación entre peatones. */
  stroll() {
    const i = this.index;
    const ratio = PersonStats.maxSpeed[i] / CIVILIAN.walkMaxSpeed;
    NavGrid.requestVectorFromStaticFlowfield(SIDEWALKS, this.x, this.y, _nav);
    if (_nav.x === 0 && _nav.y === 0) {
      // Fuera del alcance del flowfield (huyó lejos): vuelve derecho a su vereda conocida.
      this.steerTo(Brain.homeX[i], Brain.homeY[i], PersonStats.maxSpeed[i], 40, 20, 3);
    } else {
      const a = CIVILIAN.walkAccel * ratio;
      this.addAcceleration(_nav.x * a + rng() * 0.1 - 0.05, _nav.y * a + rng() * 0.1 - 0.05);
    }
    this.applySeparation(CIVILIAN.separationRadius, CIVILIAN.separationForce);
    this.capSpeed(PersonStats.maxSpeed[i]);
  }

  /**
   * ¿Hay alguien que me quiera pegar a menos de fearRadius? Si hay, anota de dónde viene el
   * más cercano (Brain.threat).
   */
  lookForThreat() {
    const i = this.index;
    const myFaction = Faction.id[i];
    const myX = this.x;
    const myY = this.y;
    let bestD2 = CIVILIAN.fearRadius * CIVILIAN.fearRadius;
    let found = false;
    for (let n = 0; n < this.neighborCount; n++) {
      const ni = this.getNeighbor(n);
      if (!Transform.active[ni] || Health.hp[ni] <= 0 || !isHostile(Faction.id[ni], myFaction)) continue;
      const dx = Transform.x[ni] - myX;
      const dy = Transform.y[ni] - myY;
      const d2 = dx * dx + dy * dy;
      if (d2 >= bestD2) continue;
      bestD2 = d2;
      Brain.threatX[i] = Transform.x[ni];
      Brain.threatY[i] = Transform.y[ni];
      found = true;
    }
    return found;
  }

  /** Corre en dirección contraria al peligro. */
  fleeFromThreat() {
    const i = this.index;
    let dx = this.x - Brain.threatX[i];
    let dy = this.y - Brain.threatY[i];
    let d = Math.sqrt(dx * dx + dy * dy);
    if (d < 0.001) {
      dx = rng() - 0.5;
      dy = rng() - 0.5;
      d = Math.sqrt(dx * dx + dy * dy) || 1;
    }
    const s = CIVILIAN.fleeSpeed / d;
    this.steerVelocity(dx * s, dy * s, CIVILIAN.fleeResponsiveness);
    this.applySeparation(CIVILIAN.separationRadius, CIVILIAN.separationForce);
  }

  /** Huye de (x, y) desde el próximo tick. */
  panicFrom(x, y) {
    const i = this.index;
    Brain.threatX[i] = x;
    Brain.threatY[i] = y;
    Brain.calmMs[i] = 0;
    if (CivilianFSM.state[i] === CivilianFSM.states.FLEE.stateIndex) return;
    this.civilianFSM.changeState(CivilianFSM.states.FLEE);
    // Grito de pánico al empezar a huir (no todos: con una multitud sería un solo ruido).
    if (rng() < VOICE.panicChance) playSfx('panic', this.x, this.y);
  }

  onMessage(name, from, a, b, c, d) {
    if (name === 'panic') this.panicFrom(a, b);
    else super.onMessage(name, from, a, b, c, d);
  }

  onHurt(fromX, fromY) {
    if (rng() < CIVILIAN.painSoundChance) this.playPain(0.6);
    this.panicFrom(fromX, fromY);
    this.spreadPanic(fromX, fromY);
  }

  /** Los civiles cercanos se asustan y también huyen del agresor. */
  spreadPanic(fromX, fromY) {
    const myType = this.entityType;
    const r2 = CIVILIAN.panicRadius * CIVILIAN.panicRadius;
    for (let n = 0; n < this.neighborCount; n++) {
      const ni = this.getNeighbor(n);
      if (!Transform.active[ni] || Transform.entityType[ni] !== myType) continue;
      const dx = Transform.x[ni] - this.x;
      const dy = Transform.y[ni] - this.y;
      if (dx * dx + dy * dy < r2) this.sendTo(ni, 'panic', fromX, fromY);
    }
  }

  onDeath() {
    // Solo cuentan (y traen a la policía) los que mató el malón, no los del fuego cruzado.
    if (this.killedByPlayer()) {
      RunState.civiliansKilled.add(1);
      RunState.heat.add(HEAT.civilianKill);
    }
    this.spreadPanic(this.x, this.y);
  }
}
