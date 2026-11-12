// Recruit: un chabón de nuestra banda ("SoldadoPropio" del GDD).
// Fase 2: el malón. Todos van al destino común (SquadState); cada uno ocupa un puesto en una
// espiral alrededor de ese punto. Lejos, siguen el flowfield del destino (rodean manzanas);
// cerca, van derecho a su puesto. Se separan entre sí para no apilarse.
//
// Cada recluta decide solo: que otros hayan llegado no cambia nada para el que viene atrás.

import { Person } from './Person.js';
import { RECRUIT, SQUAD, NAV } from '../config/balance.js';
import { SHEETS } from '../config/sprites.js';
import { SquadState } from '../systems/squadState.js';
import { nearestWalkable } from '../world/navUtils.js';

const { NavGrid } = WEED;

const GOLDEN_ANGLE = 2.399963229728653; // espiral de girasol: puestos repartidos parejo
const _nav = { x: 0, y: 0 };
const _free = { x: 0, y: 0 };

export class Recruit extends Person {
  static components = [...Person.components];
  static serializable = true; // hot reload y saves lo conservan
  static spritesheets = SHEETS.recruit;
  static stats = RECRUIT;

  onSpawned(spawnConfig = {}) {
    super.onSpawned(spawnConfig);
    this.collider.visualRange = SQUAD.visualRange;
    // Puesto en la formación: se recalcula cuando cambia la orden o la cantidad de reclutas.
    this._orderSeen = -1;
    this._countSeen = -1;
    this._slotX = this.x;
    this._slotY = this.y;
    // Destino efectivo: el de la orden, corrido a una celda libre si cayó sobre un obstáculo.
    this._goalX = this.x;
    this._goalY = this.y;
  }

  tick() {
    if (!SquadState.hasTarget[0]) {
      this.brake(RECRUIT.responsiveness);
      this.applySeparation(SQUAD.separationRadius, SQUAD.separationForce);
      this.updateAnimation();
      return;
    }

    this._refreshSlot();
    const gx = this._goalX;
    const gy = this._goalY;
    if (this._isNear(gx, gy) || this._isNear(this._slotX, this._slotY)) {
      this._goToSlot();
    } else if (!this._followFlowfield(gx, gy)) {
      // Sin dirección del flowfield. Si es porque está parado en una celda bloqueada (pegado a
      // un árbol o a una casa: el engine bloquea toda celda que toque la caja del obstáculo),
      // primero sale a la celda libre más cercana; ir derecho al puesto lo dejaría trabado ahí.
      // Si no, el flowfield todavía se está calculando: va derecho mientras tanto.
      if (!NavGrid.isPositionWalkable(this.x, this.y) && nearestWalkable(this.x, this.y, NAV.escapeRings, _free)) {
        this.steerTo(_free.x, _free.y, RECRUIT.maxSpeed, 1, 0, RECRUIT.responsiveness);
      } else {
        this._goToSlot();
      }
    }
    this.applySeparation(SQUAD.separationRadius, SQUAD.separationForce);
    this.updateAnimation();
  }

  _goToSlot() {
    this.steerTo(this._slotX, this._slotY, RECRUIT.maxSpeed, RECRUIT.arriveRadius, RECRUIT.stopRadius, RECRUIT.responsiveness);
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
    const s = RECRUIT.maxSpeed / Math.sqrt(len2);
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
    this._slotX = ok ? sx : tx;
    this._slotY = ok ? sy : ty;
  }
}
