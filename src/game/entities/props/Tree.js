// Árbol: escenografía no interactiva (portada de littleCity).

import { TREE_COUNT } from '../../config/sprites.js';
import { pad2 } from '../../assets.js';
import { SHADOWS } from '../../config/balance.js';

const { GameObject, Collider, SpriteRenderer, RigidBody, ShadowCaster, ShapeType, rng } = WEED;

export class Tree extends GameObject {
  static components = [Collider, SpriteRenderer, RigidBody, ShadowCaster];

  onSpawned({ x = 0, y = 0, radius = 18 } = {}) {
    this.x = x;
    this.y = y;
    this.rigidBody.static = 1;
    this.setSprite(`tree_${pad2(1 + ((rng() * TREE_COUNT) | 0))}`);

    this.spriteRenderer.anchorX = 0.45;
    this.spriteRenderer.anchorY = 0.95;
    const scale = Math.max(0.6, radius / 18);
    this.setScale(rng() > 0.5 ? scale : -scale, scale);

    this.collider.shapeType = ShapeType.Circle;
    this.collider.radius = radius;
    this.collider.visualRange = radius * 10;
    this.shadowCaster.heightMultiplier = SHADOWS.tree;
  }
}
