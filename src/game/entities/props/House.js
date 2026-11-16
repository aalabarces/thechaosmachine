// Casa: escenografía sólida (portada de littleCity). Bloquea el paso y sirve de cobertura.

import { HOUSE_COUNT } from '../../config/sprites.js';
import { pad2 } from '../../assets.js';
import { SHADOWS } from '../../config/balance.js';

const { GameObject, Collider, SpriteRenderer, RigidBody, VolumeShadowCaster, ShapeType, rng } = WEED;

export class House extends GameObject {
  static components = [Collider, SpriteRenderer, RigidBody, VolumeShadowCaster];

  onSpawned({ x = 0, y = 0 } = {}) {
    this.x = x;
    this.y = y;
    this.rigidBody.static = 1;
    this.setSprite(`house_${pad2(1 + ((rng() * HOUSE_COUNT) | 0))}`);

    // Huella del JSON de objetos ~293×262; el collider va hacia la base de la casa.
    this.collider.shapeType = ShapeType.Box;
    this.collider.width = 200;
    this.collider.height = 110;
    this.collider.offsetX = 0;
    this.collider.offsetY = -50;
    this.collider.visualRange = 300;
    this.setScale(1, 1);
    // Sombra del sol: una caja sobre la huella del collider (solo se ve con calidad alta).
    this.volumeShadowCaster.setBox(200, 110, SHADOWS.houseHeight, { offsetY: -50 });
  }
}
