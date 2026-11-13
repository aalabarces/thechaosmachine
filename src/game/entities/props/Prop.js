// Prop: una cosa rompible con algo adentro ("Looteable" del GDD). Sólida (cuerpo estático),
// con vida; al romperse suelta su tabla de loot (config/lootTables.js) y se convierte en
// chatarra (sigue sirviendo de cobertura) o desaparece, según la subclase.
// El malón los ataca solos si no hay personas cerca (FACTION.PROP).

import { PROPS, HEAT } from '../../config/balance.js';
import { FACTION } from '../../config/factions.js';
import { RunState } from '../../systems/runState.js';
import { Health } from '../../components/Health.js';
import { Faction } from '../../components/Faction.js';
import { Loot } from '../../components/Loot.js';
import { dropLoot, rollMoney } from '../../systems/loot.js';
import { emitDebris } from '../../systems/effects.js';
import { playSfx } from '../../systems/sfx.js';

const { GameObject, RigidBody, Collider, SpriteRenderer, ShapeType, rng } = WEED;

/** El botín cae a esta distancia del borde del prop (px), afuera de su collider. */
const LOOT_MARGIN = 18;

export class Prop extends GameObject {
  static components = [RigidBody, Collider, SpriteRenderer, Health, Faction, Loot];

  /** Sección de PROPS en balance.js y tabla de loot; las subclases los definen. */
  static stats = { hp: 10 };
  static lootTable = null;
  /** Color de los pedazos que saltan. */
  static debrisTint = 0x888888;
  /** Efecto (config/sounds.js) al recibir un golpe y al romperse. */
  static hitSfx = 'metalHit';
  static breakSfx = 'metalHit';

  onSpawned({ x = 0, y = 0 } = {}) {
    this.x = x;
    this.y = y;
    const i = this.index;
    this.rigidBody.static = 1;
    this.setTint(0xffffff);
    Health.hp[i] = this.constructor.stats.hp;
    this.lastAttacker = -1;
    Health.maxHp[i] = this.constructor.stats.hp;
    Faction.id[i] = FACTION.PROP;
    Loot.money[i] = rollMoney(this.constructor.lootTable);
  }

  /** Quién le pegó por última vez (campo por hilo: solo lo lee breakApart, en el mismo worker). */
  lastAttacker = -1;

  onMessage(name, from, a, b, c, d) {
    if (name === 'hit') this.takeHit(a, from);
    else if (name === 'blast') this.takeHit(a, d > 0 ? d - 1 : -1);
  }

  /** @param {number} from quién pegó (para saber si fue el malón y sumar heat) */
  takeHit(damage, from = -1) {
    const i = this.index;
    if (Health.hp[i] <= 0) return;
    if (from >= 0) this.lastAttacker = from;
    Health.hp[i] -= damage;
    const C = this.constructor;
    emitDebris(this.x, this.y, PROPS.debrisPerHit, C.debrisTint);
    this.onHitEffect();
    playSfx(C.hitSfx, this.x, this.y);
    if (Health.hp[i] <= 0) {
      if (from >= 0 && Faction.id[from] === FACTION.PLAYER) RunState.heat.add(HEAT.propBreak);
      this.breakApart();
    }
  }

  /** Efecto extra al recibir un golpe (vidrios del auto, chispas del cajero…). */
  onHitEffect() {}

  breakApart() {
    const i = this.index;
    emitDebris(this.x, this.y, PROPS.debrisOnBreak, this.constructor.debrisTint);
    playSfx(this.constructor.breakSfx, this.x, this.y, 1.3);
    dropLoot(this.constructor.lootTable, this.x, this.y, Loot.money[i], this._lootRing());
    Loot.money[i] = 0;
    // Ya no es un blanco: queda como cobertura (maxHp 0 = indestructible para los disparos).
    Faction.id[i] = FACTION.NONE;
    Health.maxHp[i] = 0;
    this.onBroken();
  }

  /** Radio de un círculo que deja afuera todo el collider, más un margen. */
  _lootRing() {
    const i = this.index;
    if (Collider.shapeType[i] === ShapeType.Box) {
      const hw = Collider.width[i] * 0.5 + Math.abs(Collider.offsetX[i]);
      const hh = Collider.height[i] * 0.5 + Math.abs(Collider.offsetY[i]);
      return Math.sqrt(hw * hw + hh * hh) + LOOT_MARGIN;
    }
    return Collider.radius[i] + LOOT_MARGIN;
  }

  /** Qué queda después de romperse. Por defecto: nada. */
  onBroken() {
    this.despawn();
  }
}
