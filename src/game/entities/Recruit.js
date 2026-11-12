// Recruit: un chabón de nuestra banda ("SoldadoPropio" del GDD).
// El malón: todos van al destino común (SquadState); cada uno ocupa un puesto en una espiral
// alrededor de ese punto. Lejos, siguen el flowfield del destino (rodean manzanas); cerca, van
// derecho a su puesto. Se separan entre sí para no apilarse.
// La FSM (ai/recruitFSM.js) decide si pelea, lootea o sigue al malón.
//
// Cada recluta decide solo: que otros hayan llegado no cambia nada para el que viene atrás.

import { Person } from './Person.js';
import { RECRUIT, SQUAD, NAV } from '../config/balance.js';
import { FACTION } from '../config/factions.js';
import { SHEETS } from '../config/sprites.js';
import { SquadState } from '../systems/squadState.js';
import { nearestWalkable } from '../world/navUtils.js';
import { PersonStats } from '../components/PersonStats.js';
import { Brain } from '../components/Brain.js';
import { DropData } from '../components/DropData.js';
import { RecruitFSM } from '../ai/recruitFSM.js';
import { Drop } from './Drop.js';

const { NavGrid, Transform, rng } = WEED;

const GOLDEN_ANGLE = 2.399963229728653; // espiral de girasol: puestos repartidos parejo
const _nav = { x: 0, y: 0 };
const _free = { x: 0, y: 0 };

export class Recruit extends Person {
  static components = [...Person.components, RecruitFSM];
  static serializable = true; // hot reload y saves lo conservan
  static spritesheets = SHEETS.recruit;
  static stats = RECRUIT;
  static faction = FACTION.PLAYER;

  /** ms que representa un tick (para timers). */
  msPerTick = 16.67;
  // Campos por hilo (se recalculan solos). Declarados acá para que el objeto no cambie de forma.
  slotX = NaN;
  slotY = NaN;
  _goalX = NaN;
  _goalY = NaN;
  _orderSeen = -1;
  _countSeen = -1;

  onSpawned(spawnConfig = {}) {
    super.onSpawned(spawnConfig);
    const i = this.index;
    this.collider.visualRange = SQUAD.visualRange;

    PersonStats.maxSpeed[i] = RECRUIT.maxSpeed * (1 + (rng() * 2 - 1) * RECRUIT.speedJitter);
    PersonStats.damage[i] = RECRUIT.damage;
    PersonStats.attackRange[i] = RECRUIT.attackRange;
    PersonStats.attackCooldownMs[i] = RECRUIT.attackCooldownMs;
    PersonStats.violenceRange[i] = RECRUIT.violenceRange;
    PersonStats.lootSpeed[i] = RECRUIT.lootSpeed;

    // El pool reusa entidades: arrancar siempre siguiendo al malón.
    RecruitFSM.state[i] = RecruitFSM.states.FOLLOW.stateIndex;
    RecruitFSM.time[i] = 0;
    RecruitFSM.nextState[i] = -1;

    // Puesto en la formación: se recalcula cuando cambia la orden o la cantidad de reclutas.
    this._orderSeen = -1;
    this._countSeen = -1;
    this.slotX = this.x;
    this.slotY = this.y;
    // Destino efectivo: el de la orden, corrido a una celda libre si cayó sobre un obstáculo.
    this._goalX = this.x;
    this._goalY = this.y;
  }

  tick(dtRatio) {
    const ms = dtRatio * this.msPerTick;
    this.coolDown(ms);
    this._refreshSlot();
    this.recruitFSM.tick(dtRatio, this);
    this.applySeparation(SQUAD.separationRadius, SQUAD.separationForce);
    this.updateAnimation(ms);
  }

  // ---------------------------------------------------------------- seguir al malón

  /** Va a su puesto: flowfield de lejos, derecho de cerca, quieto si no hay orden. */
  followSquad() {
    if (!SquadState.hasTarget[0]) {
      this.brake(RECRUIT.responsiveness);
      return;
    }
    const gx = this._goalX;
    const gy = this._goalY;
    if (this._isNear(gx, gy) || this._isNear(this.slotX, this.slotY)) {
      this._goToSlot();
    } else if (!this._followFlowfield(gx, gy)) {
      // Sin dirección del flowfield. Si es porque está parado en una celda bloqueada (pegado a
      // un árbol o a una casa: el engine bloquea toda celda que toque la caja del obstáculo),
      // primero sale a la celda libre más cercana; ir derecho al puesto lo dejaría trabado ahí.
      // Si no, el flowfield todavía se está calculando: va derecho mientras tanto.
      if (!NavGrid.isPositionWalkable(this.x, this.y) && nearestWalkable(this.x, this.y, NAV.escapeRings, _free)) {
        this.steerTo(_free.x, _free.y, PersonStats.maxSpeed[this.index], 1, 0, RECRUIT.responsiveness);
      } else {
        this._goToSlot();
      }
    }
  }

  _goToSlot() {
    this.steerTo(this.slotX, this.slotY, PersonStats.maxSpeed[this.index], RECRUIT.arriveRadius, RECRUIT.stopRadius, RECRUIT.responsiveness);
  }

  _isNear(x, y) {
    const dx = x - this.x;
    const dy = y - this.y;
    return dx * dx + dy * dy < SQUAD.directRadius * SQUAD.directRadius;
  }

  /**
   * Un flowfield por celda destino, compartido por todo el malón (se calcula en el worker de navegación).
   * @returns {boolean} false si todavía no está listo o no da dirección.
   */
  _followFlowfield(tx, ty) {
    NavGrid.requestVector(this.x, this.y, tx, ty, _nav);
    const len2 = _nav.x * _nav.x + _nav.y * _nav.y;
    if (len2 < 0.01) return false;
    const s = PersonStats.maxSpeed[this.index] / Math.sqrt(len2);
    this.steerVelocity(_nav.x * s, _nav.y * s, RECRUIT.responsiveness);
    return true;
  }

  /** Puesto = destino + offset en espiral según el orden del recluta entre los vivos. */
  _refreshSlot() {
    const order = SquadState.orderId[0];
    const count = Recruit.activeCount;
    if (order === this._orderSeen && count === this._countSeen) return;
    this._orderSeen = order;
    this._countSeen = count;

    // Todos calculan el mismo destino efectivo: así comparten un solo flowfield.
    nearestWalkable(SquadState.target[0], SquadState.target[1], NAV.goalRings, _free);
    const tx = (this._goalX = _free.x);
    const ty = (this._goalY = _free.y);

    const all = Recruit.getAllActive();
    const me = this.index;
    let rank = 0;
    for (let k = 0; k < all.length; k++) if (all[k] < me) rank++;

    const r = SQUAD.formationSpacing * Math.sqrt(rank);
    const a = rank * GOLDEN_ANGLE;
    const sx = tx + Math.cos(a) * r;
    const sy = ty + Math.sin(a) * r;
    // Si el puesto cae sobre un obstáculo, va al centro y la separación lo acomoda.
    const ok = rank === 0 || NavGrid.isPositionWalkable(sx, sy);
    this.slotX = ok ? sx : tx;
    this.slotY = ok ? sy : ty;
  }

  // ---------------------------------------------------------------- pelear

  /** ¿La entidad `t` está a menos de leashRadius de mi puesto? */
  isInLeash(t) {
    const dx = Transform.x[t] - this.slotX;
    const dy = Transform.y[t] - this.slotY;
    return dx * dx + dy * dy <= RECRUIT.leashRadius * RECRUIT.leashRadius;
  }

  /** Se acerca a `t` y le pega cuando lo tiene a mano. */
  fight(t) {
    const i = this.index;
    const range = PersonStats.attackRange[i];
    const tx = Transform.x[t];
    const ty = Transform.y[t];
    const dx = tx - this.x;
    const dy = ty - this.y;
    if (dx * dx + dy * dy > range * range) {
      this.steerTo(tx, ty, PersonStats.maxSpeed[i], range, range * 0.6, RECRUIT.responsiveness);
    } else {
      this.brake(RECRUIT.responsiveness);
      this.tryPunch(t);
    }
  }

  // ---------------------------------------------------------------- lootear

  /**
   * Reserva el drop libre más cercano (en rango de violencia y cerca de su puesto) para que no
   * vaya todo el malón al mismo billete. @returns {boolean} si reservó uno (queda en Brain.target)
   */
  claimLoot() {
    const i = this.index;
    if (Drop.activeCount === 0) return false;
    const drops = Drop.getAllActive();
    const myX = this.x;
    const myY = this.y;
    const leash2 = RECRUIT.leashRadius * RECRUIT.leashRadius;
    let best = -1;
    let bestD2 = PersonStats.violenceRange[i] * PersonStats.violenceRange[i];
    for (let k = 0; k < drops.length; k++) {
      const d = drops[k];
      if (this._isClaimedByOther(d)) continue;
      const ox = Transform.x[d];
      const oy = Transform.y[d];
      const dx = ox - myX;
      const dy = oy - myY;
      const d2 = dx * dx + dy * dy;
      if (d2 >= bestD2) continue;
      const lx = ox - this.slotX;
      const ly = oy - this.slotY;
      if (lx * lx + ly * ly > leash2) continue;
      best = d;
      bestD2 = d2;
    }
    if (best < 0) return false;
    DropData.claimedBy[best] = i;
    Brain.target[i] = best;
    return true;
  }

  _isClaimedByOther(d) {
    const c = DropData.claimedBy[d];
    if (c < 0 || c === this.index) return false;
    // Una reserva vale mientras su dueño siga vivo y yendo a buscarlo.
    return Transform.active[c] === 1 && Brain.target[c] === d;
  }

  /**
   * Va hasta el drop y, parado encima, lo junta de a poco (velocidad de looteo).
   * @returns {boolean} true cuando lo juntó
   */
  pickUp(d, ms) {
    const i = this.index;
    const dx = Transform.x[d] - this.x;
    const dy = Transform.y[d] - this.y;
    if (dx * dx + dy * dy > RECRUIT.pickupRadius * RECRUIT.pickupRadius) {
      this.steerTo(Transform.x[d], Transform.y[d], PersonStats.maxSpeed[i], 40, RECRUIT.pickupRadius * 0.5, RECRUIT.responsiveness);
      return false;
    }
    this.brake(RECRUIT.responsiveness);
    Brain.progressMs[i] += ms * PersonStats.lootSpeed[i];
    if (Brain.progressMs[i] < RECRUIT.lootTimeMs) return false;
    Drop.collect(d);
    return true;
  }
}
