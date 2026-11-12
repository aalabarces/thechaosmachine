// Cartel de neón "BAR" frente a una safe house. Solo visual: titila para que se lo note.
// La compra de reclutas la maneja systems/safeHouses.js (página). Dibujo: assets/img/props/bar_sign.png.

import { SAFE_HOUSE } from '../../config/balance.js';

const { GameObject, SpriteRenderer, Tween, PARTICLE_EASE } = WEED;

const TEXTURE_ASPECT = 26 / 54;

export class SafeHouseSign extends GameObject {
  static components = [SpriteRenderer];

  onSpawned({ x = 0, y = 0 } = {}) {
    this.x = x;
    this.y = y;
    this.setSprite('bar_sign');
    this.spriteRenderer.anchorX = 0.5;
    this.spriteRenderer.anchorY = 1;
    this.setDisplaySize(SAFE_HOUSE.signWidth, SAFE_HOUSE.signWidth * TEXTURE_ASPECT);
    this.setAlpha(1);
    Tween.to(this.index, { alpha: 0.55 }, 700, PARTICLE_EASE.QUAD_INOUT, { repeat: -1, yoyo: true });
  }
}
