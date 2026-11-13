// Cajero automático frente a una casa: duro de romper, mucha plata y a veces una ametralladora.
// Roto queda ahí, oscurecido. Dibujo: assets/img/props/atm.png (placeholder generado).

import { Prop } from './Prop.js';
import { PROPS } from '../../config/balance.js';
import { emitSparks } from '../../systems/effects.js';

const { ShapeType } = WEED;

export class Atm extends Prop {
  static stats = PROPS.atm;
  static lootTable = 'atm';
  static debrisTint = 0x7c858f;
  static hitSfx = 'metalHit';

  onSpawned(spawnConfig = {}) {
    super.onSpawned(spawnConfig);
    const s = PROPS.atm;
    this.setSprite('atm');
    this.spriteRenderer.anchorX = 0.5;
    this.spriteRenderer.anchorY = 0.95;
    this.setDisplaySize(s.width, s.height);
    this.collider.shapeType = ShapeType.Box;
    this.collider.width = s.width;
    this.collider.height = 10;
    this.collider.offsetX = 0;
    this.collider.offsetY = -4;
    this.collider.visualRange = 40;
  }

  onHitEffect() {
    emitSparks(this.x, this.y);
  }

  onBroken() {
    emitSparks(this.x, this.y);
    this.setTint(PROPS.wreckTint);
  }
}
