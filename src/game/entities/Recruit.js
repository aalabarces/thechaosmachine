// Recruit: un chabón de nuestra banda ("SoldadoPropio" del GDD).
// El malón: todos van al destino común (SquadState); cada uno ocupa un puesto en una espiral
// alrededor de ese punto. Lejos, siguen el flowfield del destino (rodean manzanas); cerca, van
// derecho a su puesto. Se separan entre sí para no apilarse.
// La FSM (ai/recruitFSM.js) decide si pelea, lootea o sigue al malón. Pelea con lo que tenga
// en la mano (piñas, palo o arma de fuego) y junta plata, armas mejores y chalecos.
//
// Cada recluta decide solo: que otros hayan llegado no cambia nada para el que viene atrás.

import { Person } from './Person.js';
import { RECRUIT, SQUAD, NAV } from '../config/balance.js';
import { isEnemyFaction } from '../config/factions.js';
import { Faction } from '../components/Faction.js';
import { FACTION } from '../config/factions.js';
import { WEAPONS, ARMOR } from '../config/weapons.js';
import { SHEETS } from '../config/sprites.js';
import { SquadState } from '../systems/squadState.js';
import { nearestWalkable } from '../world/navUtils.js';
import { PersonStats } from '../components/PersonStats.js';
import { Brain } from '../components/Brain.js';
import { DropData } from '../components/DropData.js';
import { WeaponHolder } from '../components/WeaponHolder.js';
import { RecruitFSM } from '../ai/recruitFSM.js';
import { Drop, DROP_KIND } from './Drop.js';
import { RunState } from '../systems/runState.js';

const { NavGrid, Transform, rng } = WEED;

const GOLDEN_ANGLE = 2.399963229728653; // espiral de girasol: puestos repartidos parejo
const _free = { x: 0, y: 0 };

export class Recruit extends Person {
  static components = [...Person.components, RecruitFSM];
  static serializable = true; // hot reload y saves lo conservan
  static spritesheets = SHEETS.recruit;
  static stats = RECRUIT;
  static faction = FACTION.PLAYER;
  static baseVisualRange = SQUAD.visualRange;

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
    // Daño, alcance y cooldown salen del arma (Person.equipWeapon).
    PersonStats.maxSpeed[i] = RECRUIT.maxSpeed * (1 + (rng() * 2 - 1) * RECRUIT.speedJitter);
    PersonStats.violenceRange[i] = RECRUIT.violenceRange;
    Brain.ignoreDrop[i] = -1;
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
    const speed = PersonStats.maxSpeed[this.index];
    if (!SquadState.hasTarget[0]) {
      this.brake(RECRUIT.responsiveness);
      return;
    }
    const near = SQUAD.directRadius;
    if (this.isNear(this._goalX, this._goalY, near) || this.isNear(this.slotX, this.slotY, near)) {
      this._goToSlot();
    } else if (!this.followFlowfield(this._goalX, this._goalY, speed, RECRUIT.responsiveness)) {
      // Sin dirección: o está en una celda bloqueada (sale primero) o el flowfield se está calculando.
      if (!this.escapeBlockedCell(speed, RECRUIT.responsiveness)) this._goToSlot();
    }
  }

  _goToSlot() {
    this.steerTo(this.slotX, this.slotY, PersonStats.maxSpeed[this.index], RECRUIT.arriveRadius, RECRUIT.stopRadius, RECRUIT.responsiveness);
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

  // ---------------------------------------------------------------- recibir daño

  /** Grita a veces; si le dispara un enemigo, va por él (aunque no lo tenga en su rango de vista). */
  onHurt(fromX, fromY, from) {
    const i = this.index;
    if (rng() < RECRUIT.painSoundChance) this.playPain(0.5);
    if (from < 0 || !isEnemyFaction(Faction.id[from]) || !this.isValidTarget(from)) return;
    if (RecruitFSM.state[i] === RecruitFSM.states.ATTACK.stateIndex || !this.isInLeash(from)) return;
    Brain.target[i] = from;
    this.recruitFSM.changeState(RecruitFSM.states.ATTACK);
  }

  onDeath() {
    RunState.recruitsLost.add(1);
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
      if (d === Brain.ignoreDrop[i] || !this._wants(d) || this._isClaimedByOther(d)) continue;
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

  /** Plata siempre; un arma solo si es mejor que la que tiene; un chaleco si no tiene el máximo. */
  _wants(d) {
    const kind = DropData.kind[d];
    if (kind === DROP_KIND.MONEY) return true;
    const i = this.index;
    if (kind === DROP_KIND.WEAPON) {
      const w = WEAPONS[DropData.amount[d]];
      return w !== undefined && w.rank > WEAPONS[WeaponHolder.weapon[i]].rank;
    }
    if (kind === DROP_KIND.ARMOR) return WeaponHolder.armor[i] < ARMOR.max;
    return false;
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
    this._collect(d);
    return true;
  }

  /** Se queda con lo que había en el drop. */
  _collect(d) {
    const i = this.index;
    const kind = DropData.kind[d];
    const amount = DropData.amount[d];
    const x = Transform.x[d];
    const y = Transform.y[d];
    Drop.despawn(d);
    if (kind === DROP_KIND.MONEY) {
      RunState.money.add(amount);
    } else if (kind === DROP_KIND.WEAPON) {
      // Equipa la mejor y deja la vieja en el piso para otro compañero.
      const old = WeaponHolder.weapon[i];
      if (WEAPONS[old].rank > 0) Drop.spawn({ x, y, kind: DROP_KIND.WEAPON, amount: old });
      this.equipWeapon(amount);
      if (RunState.weaponsFound[amount] === 0) {
        RunState.weaponsFound[amount] = 1;
        this.emit('weaponFound', { weapon: amount, name: WEAPONS[amount].name });
      }
    } else if (kind === DROP_KIND.ARMOR) {
      this.addArmor(amount);
      const before = RunState.armorsFound.load();
      RunState.armorsFound.add(1);
      if (before === 0) this.emit('armorFound', {});
    }
  }
}
