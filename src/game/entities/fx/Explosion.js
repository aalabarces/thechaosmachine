// La animación de una explosión: se reproduce una vez y desaparece. Solo visual (el daño lo
// hace systems/explosions.js).

const { GameObject, SpriteRenderer, Tween, PARTICLE_EASE } = WEED;

/** Lado del cuadro de la animación explosion2 (assets/img/fx/explosions). */
const FRAME_SIZE = 128;
/** Por si la animación no termina (las animaciones avanzan solo en pantalla). */
const SAFETY_MS = 1500;

export class Explosion extends GameObject {
  static components = [SpriteRenderer];

  onSpawned({ x = 0, y = 0, size = 128 } = {}) {
    this.x = x;
    this.y = y;
    this.setSpritesheet('explosions');
    this.setAnimation('explosion2', false);
    this.setAnimationSpeed(0.45);
    this.spriteRenderer.anchorX = 0.5;
    this.spriteRenderer.anchorY = 0.7;
    const s = size / FRAME_SIZE;
    this.setScale(s, s);
    this.setAlpha(1);
    Tween.to(this.index, { alpha: 0 }, 200, PARTICLE_EASE.LERP, { delay: SAFETY_MS, onComplete: 'fxDone' });
  }

  onAnimationEnd() {
    this.despawn();
  }

  onMessage(name) {
    if (name === 'fxDone') this.despawn();
  }
}
