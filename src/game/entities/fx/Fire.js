// Fuego que queda después de una explosión: arde un rato y quema a quien esté adentro
// (mensaje 'blast' chico cada FIRE.tickMs, anotado a quien provocó la explosión).

import { FIRE, ACTION_LIGHT } from '../../config/balance.js';
import { RunModifiers } from '../../systems/runModifiers.js';
import { setLightRadius } from '../../systems/lightHours.js';
import { Health } from '../../components/Health.js';
import { Faction } from '../../components/Faction.js';
import { FACTION } from '../../config/factions.js';
import { playSfx } from '../../systems/sfx.js';

const { GameObject, SpriteRenderer, LightEmitter, Transform, Query, Tween, PARTICLE_EASE, rng } = WEED;

/** Alto del cuadro de la animación 'fire' (assets/img/fx/fire). */
const FRAME_HEIGHT = 150;

export class Fire extends GameObject {
  static components = [SpriteRenderer, LightEmitter];

  // Campos por hilo (el fuego hace todo en su tick, en un solo worker).
  _culprit = -1;
  _ageMs = 0;
  _nextBurnMs = 0;

  onSpawned({ x = 0, y = 0, culprit = -1 } = {}) {
    this.x = x;
    this.y = y;
    this._culprit = culprit;
    this._ageMs = 0;
    this._nextBurnMs = 0;
    this.setSpritesheet('fire');
    this.setAnimation('fire', true);
    this.setAnimationSpeed(0.35);
    this.spriteRenderer.anchorX = 0.5;
    this.spriteRenderer.anchorY = 0.92;
    const s = FIRE.height / FRAME_HEIGHT;
    this.setScale(s, s);
    this.setAlpha(1);
    Tween.to(this.index, { alpha: 0 }, 800, PARTICLE_EASE.QUAD_IN, { delay: FIRE.lifeMs - 800, onComplete: 'fireOut' });
    // Luz naranja que titila (solo con iluminación).
    const fl = ACTION_LIGHT.fire;
    const L = this.lightEmitter;
    L.lightColor = fl.color;
    L.hasGlowSprite = fl.glow;
    L.sourceHeight = fl.elevation;
    const on = RunModifiers.lightingOn[0] === 1;
    setLightRadius(this.index, on ? fl.radius : 0);
    L.active = on ? 1 : 0;
    playSfx('fire', x, y);
  }

  tick(dtRatio) {
    const ms = dtRatio * 16.67;
    if (LightEmitter.active[this.index] === 1) {
      // Titila; en el último segundo se va apagando con el dibujo.
      const fl = ACTION_LIGHT.fire;
      const left = Math.min(1, (FIRE.lifeMs - this._ageMs) / 800);
      setLightRadius(this.index, fl.radius * Math.max(0, left) * (1 - fl.flicker + fl.flicker * 2 * rng()));
    }
    this._ageMs += ms;
    if (this._ageMs < this._nextBurnMs) return;
    this._nextBurnMs = this._ageMs + FIRE.tickMs;
    this._burn();
  }

  /** Quema a las personas que estén adentro del fuego. */
  _burn() {
    const r2 = FIRE.radius * FIRE.radius;
    const targets = Query.queryActiveEntities([Health]);
    for (let k = 0; k < targets.length; k++) {
      const t = targets[k];
      if (Health.hp[t] <= 0) continue;
      const f = Faction.id[t];
      if (f === FACTION.NONE || f === FACTION.PROP) continue; // solo personas
      const dx = Transform.x[t] - this.x;
      const dy = Transform.y[t] - this.y;
      if (dx * dx + dy * dy < r2) this.sendTo(t, 'blast', FIRE.damage, this.x, this.y, this._culprit + 1);
    }
  }

  onMessage(name) {
    if (name === 'fireOut') this.despawn();
  }
}
