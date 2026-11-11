// Person: base de todo ser humano del juego (reclutas, civiles, enemigos).
// Sabe moverse hacia un punto con "arrive" (frena al llegar) y animarse en 4 direcciones.
// Más adelante suma vida, daño, muerte y drops (la "Looteable" del GDD).

import { PERSON_ANIM } from '../config/balance.js';

const { GameObject, RigidBody, Collider, SpriteRenderer, ShapeType, rng } = WEED;

const DIR_NAMES = ['up', 'left', 'down', 'right'];
const DIR_UP = 0;
const DIR_LEFT = 1;
const DIR_DOWN = 2;
const DIR_RIGHT = 3;

function facingFromVelocity(vx, vy) {
  const ax = vx < 0 ? -vx : vx;
  const ay = vy < 0 ? -vy : vy;
  if (ay >= ax) return vy >= 0 ? DIR_DOWN : DIR_UP;
  return vx >= 0 ? DIR_RIGHT : DIR_LEFT;
}

export class Person extends GameObject {
  static components = [RigidBody, Collider, SpriteRenderer];

  /** Hojas LPC posibles para esta clase (las subclases la definen). */
  static spritesheets = [];
  /** Parámetros físicos/visuales; las subclases los pisan con su sección de balance. */
  static stats = { colliderRadius: 10, linearDamping: 2, scaleMin: 0.75, scaleSpan: 0.15 };

  onSpawned({ x = 0, y = 0, sheet } = {}) {
    this.x = x;
    this.y = y;

    const sheets = this.constructor.spritesheets;
    this.setSpritesheet(sheet ?? sheets[(rng() * sheets.length) | 0]);
    this.setAnimation('idle_down');
    this.spriteRenderer.anchorX = 0.5;
    this.spriteRenderer.anchorY = 0.98; // los pies en (x, y): así ordena bien el y-sort
    this.spriteRenderer.animationSpeed = PERSON_ANIM.idleAnimSpeed;

    const s = this.constructor.stats;
    const scale = s.scaleMin + rng() * s.scaleSpan;
    this.setScale(scale, scale);

    this.collider.shapeType = ShapeType.Circle;
    this.collider.radius = s.colliderRadius * scale;
    this.rigidBody.linearDamping = s.linearDamping;
    this.setFixedRotation(1);

    this._facing = DIR_DOWN;
    this._anim = 'idle';
  }

  /**
   * Empuja hacia (tx, ty) buscando una velocidad deseada que se achica cerca del destino.
   * @returns {number} distancia² al destino
   */
  steerTo(tx, ty, maxSpeed, arriveRadius, stopRadius, responsiveness) {
    const i = this.index;
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
    this.addAcceleration((desiredX - RigidBody.vx[i]) * responsiveness, (desiredY - RigidBody.vy[i]) * responsiveness);
    return d2;
  }

  /** Frena hasta quedarse quieto. */
  brake(responsiveness) {
    const i = this.index;
    this.addAcceleration(-RigidBody.vx[i] * responsiveness, -RigidBody.vy[i] * responsiveness);
  }

  /** Elige walk/idle y dirección según la velocidad actual. Llamarlo al final del tick. */
  updateAnimation() {
    const i = this.index;
    const vx = RigidBody.vx[i];
    const vy = RigidBody.vy[i];
    const speed = Math.sqrt(vx * vx + vy * vy);

    if (speed > PERSON_ANIM.walkSpeedThreshold) {
      const dir = facingFromVelocity(vx, vy);
      if (dir !== this._facing || this._anim !== 'walk') {
        this._facing = dir;
        this._anim = 'walk';
        this.setAnimation(`walk_${DIR_NAMES[dir]}`);
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
}
