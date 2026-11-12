// Prop: una cosa rompible con algo adentro ("Looteable" del GDD). Sólida (cuerpo estático),
// con vida; al romperse suelta su tabla de loot (config/lootTables.js) y se convierte en
// chatarra (sigue sirviendo de cobertura) o desaparece, según la subclase.
// El malón los ataca solos si no hay personas cerca (FACTION.PROP).

import { PROPS } from '../../config/balance.js';
import { FACTION } from '../../config/factions.js';
import { Health } from '../../components/Health.js';
import { Faction } from '../../components/Faction.js';
import { Loot } from '../../components/Loot.js';
import { dropLoot, rollMoney } from '../../systems/loot.js';
import { emitDebris } from '../../systems/effects.js';

const { GameObject, RigidBody, Collider, SpriteRenderer, SoundManager, ShapeType, rng } = WEED;

/** El botín cae a esta distancia del borde del prop (px), afuera de su collider. */
const LOOT_MARGIN = 18;

export class Prop extends GameObject {
  static components = [RigidBody, Collider, SpriteRenderer, Health, Faction, Loot];

  /** Sección de PROPS en balance.js y tabla de loot; las subclases los definen. */
  static stats = { hp: 10 };
  static lootTable = null;
  /** Color de los pedazos que saltan. */
  static debrisTint = 0x888888;
  /** Sonidos al recibir un golpe (se elige uno al azar). */
  static hitSounds = ['punch'];

  onSpawned({ x = 0, y = 0 } = {}) {
    this.x = x;
    this.y = y;
    const i = this.index;
    this.rigidBody.static = 1;
    this.setTint(0xffffff);
    Health.hp[i] = this.constructor.stats.hp;
    Health.maxHp[i] = this.constructor.stats.hp;
    Faction.id[i] = FACTION.PROP;
    Loot.money[i] = rollMoney(this.constructor.lootTable);
  }

  onMessage(name, from, a, b, c) {
    if (name === 'hit') this.takeHit(a, b, c);
  }

  takeHit(damage) {
    const i = this.index;
    if (Health.hp[i] <= 0) return;
    Health.hp[i] -= damage;
    const C = this.constructor;
    emitDebris(this.x, this.y, PROPS.debrisPerHit, C.debrisTint);
    this.onHitEffect();
    SoundManager.play(C.hitSounds[(rng() * C.hitSounds.length) | 0], 0.5, 0.9, 1.1, 0, 0, this.x, this.y);
    if (Health.hp[i] <= 0) this.breakApart();
  }

  /** Efecto extra al recibir un golpe (vidrios del auto, chispas del cajero…). */
  onHitEffect() {}

  breakApart() {
    const i = this.index;
    emitDebris(this.x, this.y, PROPS.debrisOnBreak, this.constructor.debrisTint);
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
