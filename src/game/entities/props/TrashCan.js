// Tacho de basura en la vereda: poca plata, a veces un palo. Se rompe y desaparece.

import { Prop } from './Prop.js';
import { PROPS } from '../../config/balance.js';

const { ShapeType } = WEED;

const TEXTURE_ASPECT = 80 / 71; // assets/img/props/trash.png

export class TrashCan extends Prop {
  static stats = PROPS.trashCan;
  static lootTable = 'trashCan';
  static debrisTint = 0x6f7d62;
  static hitSounds = ['metal1', 'metal2'];

  onSpawned(spawnConfig = {}) {
    super.onSpawned(spawnConfig);
    const s = PROPS.trashCan;
    this.setSprite('trash');
    this.spriteRenderer.anchorX = 0.5;
    this.spriteRenderer.anchorY = 0.92;
    this.setDisplaySize(s.width, s.width * TEXTURE_ASPECT);
    this.collider.shapeType = ShapeType.Circle;
    this.collider.radius = s.colliderRadius;
    this.collider.visualRange = 40;
  }
}
