// Person: base de todo ser humano del juego (reclutas, civiles, enemigos).
// Sabe moverse hacia un punto con "arrive" (frena al llegar), animarse en 4 direcciones,
// buscar hostiles, pegar o disparar con el arma que lleve, recibir daño (el chaleco absorbe
// parte), morir (cadáver + sangre) y soltar lo que llevaba: plata, el arma y su tabla de loot.

import { PERSON_ANIM, COMBAT, NAV, SQUAD } from '../config/balance.js';
import { FACTION, isHostile, TARGET_DISTANCE_WEIGHT } from '../config/factions.js';
import { WEAPONS, WEAPON, ARMOR } from '../config/weapons.js';
import { VOICE } from '../config/sounds.js';
import { playSfx } from '../systems/sfx.js';
import { Health } from '../components/Health.js';
import { Faction } from '../components/Faction.js';
import { Loot } from '../components/Loot.js';
import { PersonStats } from '../components/PersonStats.js';
import { Brain } from '../components/Brain.js';
import { WeaponHolder } from '../components/WeaponHolder.js';
import { Corpse } from './Corpse.js';
import { Drop, DROP_KIND, weaponLook } from './Drop.js';
import { emitBlood, emitTracer, emitMuzzle, emitSparks } from '../systems/effects.js';
import { dropLoot } from '../systems/loot.js';
import { nearestWalkable } from '../world/navUtils.js';

const { GameObject, RigidBody, Collider, SpriteRenderer, Transform, ShapeType, Ray, Decoration, NavGrid, rng } = WEED;

const DIR_NAMES = ['up', 'left', 'down', 'right'];
const DIR_UP = 0;
const DIR_LEFT = 1;
const DIR_DOWN = 2;
const DIR_RIGHT = 3;

const SLASH = ['slash_up', 'slash_left', 'slash_down', 'slash_right'];
const SHOOT = ['shoot_up', 'shoot_left', 'shoot_down', 'shoot_right'];
const SHOOT_ANIM_SPEED = 0.25;
const SHOOT_ANIM_MS = 200;
const IDLE = ['idle_up', 'idle_left', 'idle_down', 'idle_right'];

/** Dónde se dibuja el arma en la mano según hacia dónde mira: [x, y, espejado, delante]. */
const HAND = [
  [5, -20, 1, -1], // arriba: detrás del cuerpo
  [-6, -18, -1, 1],
  [-5, -18, 1, 1],
  [6, -18, 1, 1],
];

const SHOT_MAX_HITS = 8;
const _hits = [];
const _shot = { x: 0, y: 0 };
const _nav = { x: 0, y: 0 };
const _free = { x: 0, y: 0 };

/** Punto del blanco más cercano a quien lo mide (lo deja Person.gapTo). */
export const closestPoint = { x: 0, y: 0 };

function facingFromVelocity(vx, vy) {
  const ax = vx < 0 ? -vx : vx;
  const ay = vy < 0 ? -vy : vy;
  if (ay >= ax) return vy >= 0 ? DIR_DOWN : DIR_UP;
  return vx >= 0 ? DIR_RIGHT : DIR_LEFT;
}

export class Person extends GameObject {
  static components = [RigidBody, Collider, SpriteRenderer, Health, Faction, Loot, PersonStats, Brain, WeaponHolder];

  /** Hojas LPC posibles para esta clase (las subclases la definen). */
  static spritesheets = [];
  /** Parámetros de balance; las subclases los pisan con su sección. */
  static stats = { colliderRadius: 10, linearDamping: 2, scaleMin: 0.75, scaleSpan: 0.15, hp: 10 };
  static faction = FACTION.NONE;
  /** Tabla de config/lootTables.js que tira al morir (además de su plata y su arma). */
  static lootTable = null;
  /** visualRange mínimo de la clase; con un arma de fuego se agranda a su alcance. */
  static baseVisualRange = 100;
  /** ¿Su hoja tiene una pose de disparo con arma (shoot_*)? La de la policía sí. */
  static shootAnimation = false;

  /** Dirección a la que mira (DIR_*) y animación actual: 'idle' | 'walk' | 'run' | 'action'. */
  _facing = DIR_DOWN;
  _anim = 'idle';
  /** Cuenta de disparos (para no asustar civiles con cada bala de la ametralladora). */
  _shots = 0;

  onSpawned({ x = 0, y = 0, sheet, weapon = WEAPON.FISTS, armor = 0 } = {}) {
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
    this.collider.visualRange = C.baseVisualRange;
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
    Brain.lastAttacker[i] = -1;
    WeaponHolder.armor[i] = Math.min(ARMOR.max, armor);
    WeaponHolder.decoIndex[i] = -1;

    this._facing = DIR_DOWN;
    this._anim = 'idle';
    this._shots = 0;
    this.equipWeapon(weapon);
  }

  onDespawned() {
    this._removeWeaponDeco();
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

  /**
   * Va hacia (gx, gy) rodeando obstáculos: de cerca derecho; de lejos por el flowfield del destino
   * (compartido por todos los que van a la misma celda). Si está parado en una celda bloqueada
   * (pegado a un árbol, una casa o un auto: el engine bloquea toda celda que toque su caja), primero
   * sale a la celda libre más cercana; ir derecho lo dejaría trabado ahí. Mientras el flowfield se
   * calcula, va derecho.
   * @returns {boolean} true si ya está cerca (a menos de SQUAD.directRadius)
   */
  navigateTo(gx, gy, speed, responsiveness, arriveRadius = 60, stopRadius = 10) {
    if (this.isNear(gx, gy, SQUAD.directRadius)) {
      this.steerTo(gx, gy, speed, arriveRadius, stopRadius, responsiveness);
      return true;
    }
    if (!this.followFlowfield(gx, gy, speed, responsiveness) && !this.escapeBlockedCell(speed, responsiveness)) {
      this.steerTo(gx, gy, speed, arriveRadius, stopRadius, responsiveness);
    }
    return false;
  }

  isNear(x, y, radius) {
    const dx = x - this.x;
    const dy = y - this.y;
    return dx * dx + dy * dy < radius * radius;
  }

  /** Sigue el flowfield hacia la celda de (tx, ty). @returns {boolean} false si no está listo o no da dirección */
  followFlowfield(tx, ty, speed, responsiveness) {
    NavGrid.requestVector(this.x, this.y, tx, ty, _nav);
    const len2 = _nav.x * _nav.x + _nav.y * _nav.y;
    if (len2 < 0.01) return false;
    const s = speed / Math.sqrt(len2);
    this.steerVelocity(_nav.x * s, _nav.y * s, responsiveness);
    return true;
  }

  /** Si está en una celda bloqueada, va a la libre más cercana. @returns {boolean} si lo hizo */
  escapeBlockedCell(speed, responsiveness) {
    if (NavGrid.isPositionWalkable(this.x, this.y)) return false;
    if (!nearestWalkable(this.x, this.y, NAV.escapeRings, _free)) return false;
    this.steerTo(_free.x, _free.y, speed, 1, 0, responsiveness);
    return true;
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
        this._setFacing(dir);
        this._anim = moving;
        this.setAnimation(`${moving}_${DIR_NAMES[dir]}`);
      }
      this.setAnimationSpeed(speed * PERSON_ANIM.walkAnimPerSpeed);
    } else {
      // Casi quieto: lo frenamos del todo para que no "patine" de a poquito.
      if (speed > 0 && speed < PERSON_ANIM.walkSpeedThreshold * 0.5) this.setVelocity(0, 0);
      if (this._anim !== 'idle') {
        this._anim = 'idle';
        this.setAnimation(IDLE[this._facing]);
        this.setAnimationSpeed(PERSON_ANIM.idleAnimSpeed);
      }
    }
  }

  /** Mira hacia (x, y) sin moverse (para pegarle o dispararle a alguien). */
  faceTowards(x, y) {
    const dir = facingFromVelocity(x - this.x, y - this.y);
    if (dir === this._facing) return;
    this._setFacing(dir);
    if (this._anim === 'idle') this.setAnimation(IDLE[dir]);
  }

  _setFacing(dir) {
    if (dir === this._facing) return;
    this._facing = dir;
    this._refreshWeaponDeco();
  }

  // ---------------------------------------------------------------- armas

  /** Equipa `weapon` (WEAPON.*): copia sus números a PersonStats y le pone el arma en la mano. */
  equipWeapon(weapon) {
    const i = this.index;
    const w = WEAPONS[weapon] ?? WEAPONS[WEAPON.FISTS];
    WeaponHolder.weapon[i] = WEAPONS[weapon] ? weapon : WEAPON.FISTS;
    PersonStats.damage[i] = w.damage * this.damageMultiplier();
    PersonStats.attackRange[i] = w.range;
    PersonStats.attackCooldownMs[i] = w.cooldownMs * this.cooldownMultiplier();
    // Para ver blancos a la distancia de tiro, los vecinos tienen que llegar hasta ahí.
    const base = this.constructor.baseVisualRange;
    this.collider.visualRange = w.ranged && w.range > base ? w.range : base;
    this._refreshWeaponDeco();
  }

  /** Mejoras de daño y de velocidad de ataque (los reclutas las toman del perfil). */
  damageMultiplier() {
    return 1;
  }

  cooldownMultiplier() {
    return 1;
  }

  /** Rango de "violencia" efectivo: con un arma de fuego, ve hasta donde dispara. */
  sightRange() {
    const i = this.index;
    const w = WEAPONS[WeaponHolder.weapon[i]];
    const v = PersonStats.violenceRange[i];
    return w.ranged && w.range > v ? w.range : v;
  }

  /** Suma chaleco hasta el tope. */
  addArmor(points) {
    const i = this.index;
    WeaponHolder.armor[i] = Math.min(ARMOR.max, WeaponHolder.armor[i] + points);
  }

  _removeWeaponDeco() {
    const i = this.index;
    const d = WeaponHolder.decoIndex[i];
    if (d >= 0) Decoration.despawn(d);
    WeaponHolder.decoIndex[i] = -1;
  }

  _refreshWeaponDeco() {
    this._removeWeaponDeco();
    const look = weaponLook(WeaponHolder.weapon[this.index]);
    if (!look) return;
    const hand = HAND[this._facing];
    const sx = (look.width / this._textureWidth(look.texture)) * hand[2];
    const sy = look.width / this._textureWidth(look.texture);
    WeaponHolder.decoIndex[this.index] = this.addDecoration(look.texture, hand[0], hand[1], sx, sy, hand[3], {
      anchorX: 0.3,
      anchorY: 0.5,
    });
  }

  /** Ancho en px de las texturas de armas (para escalar la decoración al tamaño pedido). */
  _textureWidth(texture) {
    return TEXTURE_WIDTH[texture] ?? 32;
  }

  // ---------------------------------------------------------------- combate

  /**
   * El hostil vivo "más cercano" entre los vecinos, a menos de `range` de mí y a menos de
   * `leashRadius` de (anchorX, anchorY). La distancia se pesa por bando (las personas antes que
   * los props). -1 si no hay.
   */
  findHostile(range, anchorX, anchorY, leashRadius) {
    const myFaction = Faction.id[this.index];
    const myX = this.x;
    const myY = this.y;
    const leash2 = leashRadius * leashRadius;
    const range2 = range * range;
    let best = -1;
    let bestScore = Infinity;
    for (let n = 0; n < this.neighborCount; n++) {
      const ni = this.getNeighbor(n);
      const f = Faction.id[ni];
      if (!Transform.active[ni] || Health.hp[ni] <= 0 || !isHostile(myFaction, f)) continue;
      const ox = Transform.x[ni];
      const oy = Transform.y[ni];
      const dx = ox - myX;
      const dy = oy - myY;
      const d2 = dx * dx + dy * dy;
      if (d2 >= range2) continue;
      const score = d2 * TARGET_DISTANCE_WEIGHT[f];
      if (score >= bestScore) continue;
      const lx = ox - anchorX;
      const ly = oy - anchorY;
      if (lx * lx + ly * ly > leash2) continue;
      best = ni;
      bestScore = score;
    }
    return best;
  }

  /** ¿Sigue siendo un blanco válido? (vivo, activo y hostil) */
  isValidTarget(t) {
    return t >= 0 && Transform.active[t] === 1 && Health.hp[t] > 0 && isHostile(Faction.id[this.index], Faction.id[t]);
  }

  /**
   * Distancia libre entre mi borde y el borde de `t` (0 o menos = se tocan). Sirve para pegarle
   * igual a una persona que a un auto largo: medir de centro a centro dejaba a los que estaban
   * contra el costado del auto "lejos" de su centro, empujando sin pegar nunca.
   * Deja en closestPoint el punto de `t` más cercano, para ir hacia ahí.
   */
  gapTo(t) {
    const myX = this.x;
    const myY = this.y;
    const myR = Collider.radius[this.index];
    let px;
    let py;
    let r = 0;
    if (Collider.shapeType[t] === ShapeType.Box) {
      const cx = Transform.x[t] + Collider.offsetX[t];
      const cy = Transform.y[t] + Collider.offsetY[t];
      const hw = Collider.width[t] * 0.5;
      const hh = Collider.height[t] * 0.5;
      px = myX < cx - hw ? cx - hw : myX > cx + hw ? cx + hw : myX;
      py = myY < cy - hh ? cy - hh : myY > cy + hh ? cy + hh : myY;
    } else {
      px = Transform.x[t];
      py = Transform.y[t];
      r = Collider.radius[t];
    }
    closestPoint.x = px;
    closestPoint.y = py;
    const dx = px - myX;
    const dy = py - myY;
    return Math.sqrt(dx * dx + dy * dy) - r - myR;
  }

  /**
   * ¿Ve a `t`? Falso si una casa, un árbol o chatarra (algo sólido sin vida) tapa la línea.
   * Las personas en el medio no tapan.
   */
  canSee(t) {
    const dx = Transform.x[t] - this.x;
    const dy = Transform.y[t] - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return true;
    const first = this._firstHit(this.x, this.y, dx / dist, dy / dist, dist);
    return first < 0 || first === t || Health.maxHp[first] > 0;
  }

  /**
   * Pelea con `t`: con piñas o palo se le acerca y le pega; con un arma de fuego se planta a
   * distancia de tiro y dispara, y si algo sólido tapa el tiro se sigue acercando.
   * Usa stats.responsiveness y stats.shootRangeFraction de la clase.
   */
  fight(t) {
    const i = this.index;
    const s = this.constructor.stats;
    const range = PersonStats.attackRange[i];
    const tx = Transform.x[t];
    const ty = Transform.y[t];
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d2 = dx * dx + dy * dy;
    if (this.hasGun()) {
      const shootRange = range * s.shootRangeFraction;
      if (d2 <= shootRange * shootRange && this.tryShoot(t) !== -1) {
        this.brake(s.responsiveness);
        return;
      }
      this.navigateTo(tx, ty, PersonStats.maxSpeed[i], s.responsiveness, 40, 20);
      return;
    }
    // Cuerpo a cuerpo: se mide de borde a borde y se va al punto más cercano del blanco,
    // así varios rodean un auto en vez de amontonarse contra su centro.
    if (this.gapTo(t) > range) {
      if (d2 > SQUAD.directRadius * SQUAD.directRadius) this.navigateTo(tx, ty, PersonStats.maxSpeed[i], s.responsiveness);
      else this.steerTo(closestPoint.x, closestPoint.y, PersonStats.maxSpeed[i], 30, 0, s.responsiveness);
    } else {
      this.brake(s.responsiveness);
      this.tryMelee(t);
    }
  }

  /** ¿Lo último que le pegó fue del malón? (para contar muertes y heat) */
  killedByPlayer() {
    const a = Brain.lastAttacker[this.index];
    return a >= 0 && Faction.id[a] === FACTION.PLAYER;
  }

  /** ¿El arma que lleva es de fuego? */
  hasGun() {
    return WEAPONS[WeaponHolder.weapon[this.index]].ranged;
  }

  /** Baja los cooldowns: llamarlo una vez por tick. */
  coolDown(dtMs) {
    const i = this.index;
    if (Brain.cooldownMs[i] > 0) Brain.cooldownMs[i] -= dtMs;
  }

  /** Un golpe cuerpo a cuerpo (piñas o palo) si el cooldown está listo. @returns {boolean} si pegó */
  tryMelee(target) {
    const i = this.index;
    if (Brain.cooldownMs[i] > 0) return false;
    this.faceTowards(Transform.x[target], Transform.y[target]);
    this._anim = 'action';
    this.setAnimation(SLASH[this._facing], false);
    this.setAnimationSpeed(COMBAT.punchAnimSpeed);
    Brain.actionMs[i] = COMBAT.punchAnimMs;
    Brain.cooldownMs[i] = PersonStats.attackCooldownMs[i];
    this.sendTo(target, 'hit', PersonStats.damage[i], this.x, this.y);
    playSfx(WEAPONS[WeaponHolder.weapon[i]].sfx ?? 'punch', this.x, this.y);
    if (rng() < VOICE.gruntChance) playSfx('grunt', this.x, this.y);
    return true;
  }

  /**
   * Dispara al blanco si el cooldown está listo y no hay una pared/árbol en el medio.
   * @returns {number} 1 disparó, 0 esperando el cooldown, -1 tapado (hay que acercarse o rodear)
   */
  tryShoot(target) {
    const i = this.index;
    const sx = this.x;
    const sy = this.y;
    const tx = Transform.x[target];
    const ty = Transform.y[target];
    let dx = tx - sx;
    let dy = ty - sy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.001) return 0;
    dx /= dist;
    dy /= dist;

    // ¿Algo sólido entre medio? Entonces no gasta el tiro.
    const first = this._firstHit(sx, sy, dx, dy, dist);
    if (first >= 0 && first !== target && Health.maxHp[first] <= 0) return -1;
    this.faceTowards(tx, ty);
    if (Brain.cooldownMs[i] > 0) return 0;

    const w = WEAPONS[WeaponHolder.weapon[i]];
    Brain.cooldownMs[i] = PersonStats.attackCooldownMs[i];
    const baseAngle = Math.atan2(dy, dx);
    for (let p = 0; p < w.pellets; p++) {
      const a = baseAngle + (rng() * 2 - 1) * w.spread;
      const ux = Math.cos(a);
      const uy = Math.sin(a);
      const hit = this._firstHit(sx, sy, ux, uy, w.range);
      if (hit >= 0) {
        if (Health.maxHp[hit] > 0) this.sendTo(hit, 'hit', PersonStats.damage[i], sx, sy);
        else emitSparks(_shot.x, _shot.y);
      }
      emitTracer(sx, sy, _shot.x, _shot.y);
    }
    emitMuzzle(sx, sy, dx, dy);
    if (this.constructor.shootAnimation) {
      this._anim = 'action';
      this.setAnimation(SHOOT[this._facing], false);
      this.setAnimationSpeed(SHOOT_ANIM_SPEED);
      Brain.actionMs[i] = SHOOT_ANIM_MS;
    }
    playSfx(w.sfx, sx, sy);
    if ((this._shots++ & 3) === 0) this._alarmCivilians();
    return 1;
  }

  /**
   * Lo primero que corta un disparo desde (sx, sy) en la dirección unitaria (ux, uy): ni yo ni mis
   * compañeros de bando (los atraviesa). Deja el punto de impacto (o el final del alcance) en _shot.
   * @returns {number} índice de la entidad, -1 si no pega en nada
   */
  _firstHit(sx, sy, ux, uy, range) {
    const me = this.index;
    const myFaction = Faction.id[me];
    const ex = sx + ux * range;
    const ey = sy + uy * range;
    const hits = Ray.castAll(sx, sy, ex, ey, range, SHOT_MAX_HITS, 0xffffffff, _hits);
    const n = hits.length;
    for (let k = 0; k < n; k++) {
      const h = hits[k];
      const e = h.entityIndex;
      if (e === me || e < 0 || Transform.active[e] !== 1) continue;
      if (myFaction !== FACTION.NONE && Faction.id[e] === myFaction) continue;
      _shot.x = h.hitX;
      _shot.y = h.hitY;
      return e;
    }
    _shot.x = ex;
    _shot.y = ey;
    return -1;
  }

  /** Un tiro asusta a los civiles cercanos: huyen del que disparó. */
  _alarmCivilians() {
    const r2 = COMBAT.gunshotPanicRadius * COMBAT.gunshotPanicRadius;
    for (let n = 0; n < this.neighborCount; n++) {
      const ni = this.getNeighbor(n);
      if (!Transform.active[ni] || Faction.id[ni] !== FACTION.CIVILIAN || Health.hp[ni] <= 0) continue;
      const dx = Transform.x[ni] - this.x;
      const dy = Transform.y[ni] - this.y;
      if (dx * dx + dy * dy < r2) this.sendTo(ni, 'panic', this.x, this.y);
    }
  }

  /**
   * 'hit'   golpe o balazo: (daño, desdeX, desdeY), lo pegó `from`.
   * 'blast' explosión o fuego: (daño, desdeX, desdeY, culpable + 1). El culpable es quien la
   *         provocó (el que rompió el auto), así las muertes y el heat se le anotan a él.
   */
  onMessage(name, from, a, b, c, d) {
    if (name === 'hit') this.takeHit(a, b, c, from);
    else if (name === 'blast') this.takeBlast(a, b, c, d > 0 ? d - 1 : -1);
  }

  /** Daño de una explosión: como un golpe, más un empujón fuerte hacia afuera. */
  takeBlast(damage, fromX, fromY, culprit) {
    const i = this.index;
    if (Health.hp[i] <= 0) return;
    this.takeHit(damage, fromX, fromY, culprit);
    if (Transform.active[i] !== 1 || Health.hp[i] <= 0) return;
    let dx = this.x - fromX;
    let dy = this.y - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const push = Math.min(1, damage / 60) * COMBAT.blastPush;
    this.addVelocity((dx / dist) * push, (dy / dist) * push);
  }

  /** Recibe `damage` desde (fromX, fromY). El chaleco absorbe una parte mientras le quede. */
  takeHit(damage, fromX, fromY, from) {
    const i = this.index;
    if (Health.hp[i] <= 0) return;
    if (from >= 0) Brain.lastAttacker[i] = from;
    const armor = WeaponHolder.armor[i];
    if (armor > 0) {
      const absorbed = Math.min(armor, damage * ARMOR.absorb);
      WeaponHolder.armor[i] = armor - absorbed;
      damage -= absorbed;
    }
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
    playSfx('pain', this.x, this.y, volume / 0.7);
  }

  /** Muere: sangre, grito, cadáver, suelta lo que llevaba y vuelve al pool. */
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
    // Las armas se pierden al morir: quedan en el piso para el que las agarre.
    const weapon = WeaponHolder.weapon[i];
    if (weapon !== WEAPON.FISTS) Drop.spawn({ x, y, kind: DROP_KIND.WEAPON, amount: weapon });
    dropLoot(this.constructor.lootTable, x, y, Loot.money[i]);

    this.onDeath();
    this.despawn();
  }
}

/** Ancho real de los PNG de armas (assets/img/drops). */
const TEXTURE_WIDTH = {
  drop_bat: 48,
  drop_pistol: 163,
  drop_shotgun: 294,
  drop_smg: 378,
};
