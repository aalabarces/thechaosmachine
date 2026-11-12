// Cadáver: la persona que murió ya volvió a su pool; esto es solo el dibujo de la caída,
// que queda un rato en el piso y se desvanece.

import { CORPSE } from '../config/balance.js';

const { GameObject, SpriteRenderer, Tween, PARTICLE_EASE } = WEED;

export class Corpse extends GameObject {
  static components = [SpriteRenderer];

  onSpawned({ x = 0, y = 0, sheet, scale = 1 } = {}) {
    this.x = x;
    this.y = y;
    this.setSpritesheet(sheet);
    this.setAnimation('hurt', false); // la animación "hurt" del LPC es caer al piso
    this.setAnimationSpeed(CORPSE.fallAnimSpeed);
    this.spriteRenderer.anchorX = 0.5;
    this.spriteRenderer.anchorY = 0.98;
    this.setScale(scale, scale);
    this.setAlpha(1);
    Tween.to(this.index, { alpha: 0 }, CORPSE.fadeMs, PARTICLE_EASE.QUAD_IN, {
      delay: CORPSE.lifeMs,
      onComplete: 'corpseGone',
    });
  }

  onMessage(name) {
    if (name === 'corpseGone') this.despawn();
  }
}
