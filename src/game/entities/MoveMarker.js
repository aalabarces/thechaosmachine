// Marca en el piso donde el jugador hizo click/touch: aparece, se agranda y se desvanece.

const { GameObject, SpriteRenderer, Tween, PARTICLE_EASE } = WEED;

const SIZE = 28;
const LIFE_MS = 450;

export class MoveMarker extends GameObject {
  static components = [SpriteRenderer];

  /** @param {{ x: number, y: number, markerTint?: number }} spawnConfig rojo: moverse; naranja: atacar; verde: lootear */
  onSpawned({ x = 0, y = 0, markerTint = 0xff3030 } = {}) {
    this.x = x;
    this.y = y;
    this.setSprite('_whiteCircle');
    this.setDisplaySize(SIZE, SIZE * 0.5); // achatado: parece apoyado en el piso
    this.setTint(markerTint);
    this.setAlpha(0.85);
    Tween.to(this.index, { alpha: 0, scaleX: this.scaleX * 1.8, scaleY: this.scaleY * 1.8 }, LIFE_MS, PARTICLE_EASE.QUAD_OUT, {
      onComplete: 'markerDone',
    });
  }

  onMessage(name) {
    if (name === 'markerDone') this.despawn();
  }
}
