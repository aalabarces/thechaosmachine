// Person: base de todo ser humano del juego (reclutas, civiles, enemigos).
// Sabe moverse hacia un punto con "arrive" (frena al llegar), animarse en 4 direcciones,
// buscar hostiles, pegar, recibir golpes, morir (cadáver + sangre) y soltar su plata.
// La "Looteable" del GDD: Loot guarda lo que suelta.

import { PERSON_ANIM, COMBAT } from '../config/balance.js';
import { FACTION, isHostile } from '../config/factions.js';
import { PAIN_SOUNDS } from '../config/sounds.js';
import { Health } from '../components/Health.js';
import { Faction } from '../components/Faction.js';
import { Loot } from '../components/Loot.js';
import { PersonStats } from '../components/PersonStats.js';
import { Brain } from '../components/Brain.js';
import { Corpse } from './Corpse.js';
import { Drop, DROP_KIND } from './Drop.js';
import { emitBlood } from '../systems/effects.js';

const { GameObject, RigidBody, Collider, SpriteRenderer, Transform, ShapeType, SoundManager, rng } = WEED;

const DIR_NAMES = ['up', 'left', 'down', 'right'];
const DIR_UP = 0;
const DIR_LEFT = 1;
const DIR_DOWN = 2;
const DIR_RIGHT = 3;

const SLASH = ['slash_up', 'slash_left', 'slash_down', 'slash_right'];

function facingFromVelocity(vx, vy) {
  const ax = vx < 0 ? -vx : vx;
  const ay = vy < 0 ? -vy : vy;
  if (ay >= ax) return vy >= 0 ? DIR_DOWN : DIR_UP;
  return vx >= 0 ? DIR_RIGHT : DIR_LEFT;
}

export class Person extends GameObject {
  static components = [RigidBody, Collider, SpriteRenderer, Health, Faction, Loot, PersonStats, Brain];

  /** Hojas LPC posibles para esta clase (las subclases la definen). */
  static spritesheets = [];
  /** Parámetros de balance; las subclases los pisan con su sección. */
  static stats = { colliderRadius: 10, linearDamping: 2, scaleMin: 0.75, scaleSpan: 0.15, hp: 10 };
  static faction = FACTION.NONE;

  /** Dirección a la que mira (DIR_*) y animación actual: 'idle' | 'walk' | 'run' | 'action'. */
  _facing = DIR_DOWN;
  _anim = 'idle';

  onSpawned({ x = 0, y = 0, sheet } = {}) {
    this.x = x;
    this.y = y;
    const i = this.index;
    const C = this.constructor;
    const s = C.stats;

    const sheets = C.spritesheets;
    let sheetIndex = sheet != null ? sheets.indexOf(sheet) : -1;
    if (sheetIndex < 0) sheetIndex = (rng() * sheets.length) | 0;
    this.setSpritesheet(sheets[sheetIndex]);
    this.setAnimation('idle_down');
    this.spriteRenderer.anchorX = 0.5;
    this.spriteRenderer.anchorY = 0.98; // los pies en (x, y): así ordena bien el y-sort
    this.spriteRenderer.animationSpeed = PERSON_ANIM.idleAnimSpeed;

    const scale = s.scaleMin + rng() * s.scaleSpan;
    this.setScale(scale, scale);

    this.collider.shapeType = ShapeType.Circle;
    this.collider.radius = s.colliderRadius * scale;
    this.rigidBody.linearDamping = s.linearDamping;
    this.setFixedRotation(1);

    Health.hp[i] = s.hp;
    Health.maxHp[i] = s.hp;
    Faction.id[i] = C.faction;
    Loot.money[i] = 0;
    PersonStats.sheet[i] = sheetIndex;
    Brain.target[i] = -1;
    Brain.cooldownMs[i] = 0;
    Brain.actionMs[i] = 0;
    Brain.progressMs[i] = 0;
    Brain.threatX[i] = x;
    Brain.threatY[i] = y;
    Brain.calmMs[i] = 0;

    this._facing = DIR_DOWN;
    this._anim = 'idle';
  }

  // ---------------------------------------------------------------- movimiento

  /**
   * Empuja hacia (tx, ty) buscando una velocidad deseada que se achica cerca del destino.
   * @returns {number} distancia² al destino
   */
  steerTo(tx, ty, maxSpeed, arriveRadius, stopRadius, responsiveness) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d2 = dx * dx + dy * dy;
    let desiredX = 0;
    let desiredY = 0;
    if (d2 > stopRadius * stopRadius) {
      const d = Math.sqrt(d2);
      const speed = d < arriveRadius ? (maxSpeed * d) / arriveRadius : maxSpeed;
      desiredX = (dx / d) * speed;
      desiredY = (dy / d) * speed;
    }
    this.steerVelocity(desiredX, desiredY, responsiveness);
    return d2;
  }

  /** Acelera para acercar la velocidad actual a (desiredX, desiredY) px/s. */
  steerVelocity(desiredX, desiredY, responsiveness) {
    const i = this.index;
    this.addAcceleration((desiredX - RigidBody.vx[i]) * responsiveness, (desiredY - RigidBody.vy[i]) * responsiveness);
  }

  /**
   * Empuja lejos de los vecinos de la misma clase que estén a menos de `radius`.
   * Necesita collider.visualRange > radius para que el spatial hash los reporte como vecinos.
   */
  applySeparation(radius, force) {
    const myX = this.x;
    const myY = this.y;
    const myType = this.entityType;
    const r2 = radius * radius;
    let ax = 0;
    let ay = 0;
    for (let n = 0; n < this.neighborCount; n++) {
      const ni = this.getNeighbor(n);
      if (!Transform.active[ni] || Transform.entityType[ni] !== myType) continue;
      const dx = myX - Transform.x[ni];
      const dy = myY - Transform.y[ni];
      const d2 = dx * dx + dy * dy;
      if (d2 >= r2) continue;
      if (d2 < 0.01) {
        // Encimados: un empujón al azar para destrabarlos.
        ax += rng() - 0.5;
        ay += rng() - 0.5;
        continue;
      }
      const d = Math.sqrt(d2);
      const push = 1 - d / radius;
      ax += (dx / d) * push;
      ay += (dy / d) * push;
    }
    if (ax !== 0 || ay !== 0) this.addAcceleration(ax * force, ay * force);
  }

  /** Frena hasta quedarse quieto. */
  brake(responsiveness) {
    const i = this.index;
    this.addAcceleration(-RigidBody.vx[i] * responsiveness, -RigidBody.vy[i] * responsiveness);
  }

  /** Recorta la velocidad a `maxSpeed`. */
  capSpeed(maxSpeed) {
    const i = this.index;
    const vx = RigidBody.vx[i];
    const vy = RigidBody.vy[i];
    const v2 = vx * vx + vy * vy;
    if (v2 > maxSpeed * maxSpeed) {
      const k = maxSpeed / Math.sqrt(v2);
      this.setVelocity(vx * k, vy * k);
    }
  }

  // ---------------------------------------------------------------- animación

  /**
   * Elige walk/run/idle y dirección según la velocidad actual. Llamarlo al final del tick.
   * Mientras dura un golpe no pisa la animación.
   * @param {number} dtMs tiempo de este tick
   * @param {boolean} [running] usa run_* en vez de walk_*
   */
  updateAnimation(dtMs, running = false) {
    const i = this.index;
    if (Brain.actionMs[i] > 0) {
      Brain.actionMs[i] -= dtMs;
      return;
    }
    const vx = RigidBody.vx[i];
    const vy = RigidBody.vy[i];
    const speed = Math.sqrt(vx * vx + vy * vy);
    const moving = running ? 'run' : 'walk';

    if (speed > PERSON_ANIM.walkSpeedThreshold) {
      const dir = facingFromVelocity(vx, vy);
      if (dir !== this._facing || this._anim !== moving) {
        this._facing = dir;
        this._anim = moving;
        this.setAnimation(`${moving}_${DIR_NAMES[dir]}`);
      }
      this.setAnimationSpeed(speed * PERSON_ANIM.walkAnimPerSpeed);
    } else {
      // Casi quieto: lo frenamos del todo para que no "patine" de a poquito.
      if (speed > 0 && speed < PERSON_ANIM.walkSpeedThreshold * 0.5) this.setVelocity(0, 0);
      if (this._anim !== 'idle') {
        this._anim = 'idle';
        this.setAnimation(`idle_${DIR_NAMES[this._facing]}`);
        this.setAnimationSpeed(PERSON_ANIM.idleAnimSpeed);
      }
    }
  }

  /** Mira hacia (x, y) sin moverse (para pegarle a alguien). */
  faceTowards(x, y) {
    this._facing = facingFromVelocity(x - this.x, y - this.y);
  }

  // ---------------------------------------------------------------- combate

  /**
   * El hostil vivo más cercano entre los vecinos, a menos de `range` de mí y a menos de
   * `leashRadius` de (anchorX, anchorY). -1 si no hay.
   */
  findHostile(range, anchorX, anchorY, leashRadius) {
    const myFaction = Faction.id[this.index];
    const myX = this.x;
    const myY = this.y;
    const leash2 = leashRadius * leashRadius;
    let best = -1;
    let bestD2 = range * range;
    for (let n = 0; n < this.neighborCount; n++) {
      const ni = this.getNeighbor(n);
      if (!Transform.active[ni] || Health.hp[ni] <= 0 || !isHostile(myFaction, Faction.id[ni])) continue;
      const ox = Transform.x[ni];
      const oy = Transform.y[ni];
      const dx = ox - myX;
      const dy = oy - myY;
      const d2 = dx * dx + dy * dy;
      if (d2 >= bestD2) continue;
      const lx = ox - anchorX;
      const ly = oy - anchorY;
      if (lx * lx + ly * ly > leash2) continue;
      best = ni;
      bestD2 = d2;
    }
    return best;
  }

  /** ¿Sigue siendo un blanco válido? (vivo, activo y hostil) */
  isValidTarget(t) {
    return t >= 0 && Transform.active[t] === 1 && Health.hp[t] > 0 && isHostile(Faction.id[this.index], Faction.id[t]);
  }

  /** Un golpe cuerpo a cuerpo si se puede (cooldown listo). @returns {boolean} si pegó */
  tryPunch(target) {
    const i = this.index;
    if (Brain.cooldownMs[i] > 0) return false;
    const tx = Transform.x[target];
    const ty = Transform.y[target];
    this.faceTowards(tx, ty);
    this._anim = 'action';
    this.setAnimation(SLASH[this._facing], false);
    this.setAnimationSpeed(COMBAT.punchAnimSpeed);
    Brain.actionMs[i] = COMBAT.punchAnimMs;
    Brain.cooldownMs[i] = PersonStats.attackCooldownMs[i];
    this.sendTo(target, 'hit', PersonStats.damage[i], this.x, this.y);
    SoundManager.play('punch', 0.55, 0.85, 1.15, 0, 0, this.x, this.y);
    return true;
  }

  /** Baja los cooldowns: llamarlo una vez por tick. */
  coolDown(dtMs) {
    const i = this.index;
    if (Brain.cooldownMs[i] > 0) Brain.cooldownMs[i] -= dtMs;
  }

  onMessage(name, from, a, b, c) {
    if (name === 'hit') this.takeHit(a, b, c, from);
  }

  /** Recibe `damage` desde (fromX, fromY). */
  takeHit(damage, fromX, fromY, from) {
    const i = this.index;
    if (Health.hp[i] <= 0) return;
    Health.hp[i] -= damage;

    let dx = this.x - fromX;
    let dy = this.y - fromY;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > 0.001) {
      dx /= d;
      dy /= d;
    } else {
      dx = 0;
      dy = 1;
    }
    this.addVelocity(dx * COMBAT.knockback, dy * COMBAT.knockback);
    emitBlood(this.x, this.y, COMBAT.bloodPerHit, dx, dy);

    if (Health.hp[i] <= 0) this.die(dx, dy);
    else this.onHurt(fromX, fromY, from);
  }

  /** Lo llaman las subclases para reaccionar a un golpe que no lo mató. */
  onHurt(fromX, fromY, from) {}

  /** Lo llaman las subclases justo antes de que desaparezca. */
  onDeath() {}

  playPain(volume = 0.7) {
    SoundManager.play(PAIN_SOUNDS[(rng() * PAIN_SOUNDS.length) | 0], volume, 0.9, 1.1, 0, 0, this.x, this.y);
  }

  /** Muere: sangre, grito, cadáver, suelta la plata y vuelve al pool. */
  die(dirX, dirY) {
    const i = this.index;
    const x = this.x;
    const y = this.y;
    emitBlood(x, y, COMBAT.bloodOnDeath, dirX, dirY);
    this.playPain(0.9);

    Corpse.spawn({
      x,
      y,
      sheet: this.constructor.spritesheets[PersonStats.sheet[i]],
      scale: this.scaleX,
    });
    const money = Loot.money[i];
    if (money > 0) Drop.spawn({ x, y, kind: DROP_KIND.MONEY, amount: money });

    this.onDeath();
    this.despawn();
  }
}
