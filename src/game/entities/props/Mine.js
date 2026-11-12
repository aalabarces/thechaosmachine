// Mina explosiva escondida en la ciudad: la pisa cualquiera (malón, civiles, policía,
// pandillas) y explota. Sirve para llevar a los perseguidores encima. Dibujo:
// assets/img/props/mine.png (placeholder generado).

import { MINES, EXPLOSION } from '../../config/balance.js';
import { Health } from '../../components/Health.js';
import { Faction } from '../../components/Faction.js';
import { FACTION } from '../../config/factions.js';
import { explode } from '../../systems/explosions.js';

const { GameObject, SpriteRenderer, Transform, Query } = WEED;

const TEXTURE_ASPECT = 14 / 20;

export class Mine extends GameObject {
  static components = [SpriteRenderer];
  /** Revisa cada 3 frames: a 230 px/s un recluta avanza ~12 px, menos que el radio de disparo. */
  static tickInterval = 3;

  onSpawned({ x = 0, y = 0 } = {}) {
    this.x = x;
    this.y = y;
    this.setSprite('mine');
    this.spriteRenderer.anchorX = 0.5;
    this.spriteRenderer.anchorY = 0.5;
    this.setDisplaySize(MINES.width, MINES.width * TEXTURE_ASPECT);
    this.setAlpha(1);
  }

  tick() {
    const r2 = MINES.triggerRadius * MINES.triggerRadius;
    const people = Query.queryActiveEntities([Health]);
    for (let k = 0; k < people.length; k++) {
      const t = people[k];
      if (Health.hp[t] <= 0) continue;
      const f = Faction.id[t];
      if (f === FACTION.NONE || f === FACTION.PROP) continue;
      const dx = Transform.x[t] - this.x;
      const dy = Transform.y[t] - this.y;
      if (dx * dx + dy * dy < r2) {
        explode(this, this.x, this.y, EXPLOSION.mine, -1);
        this.despawn();
        return;
      }
    }
  }
}
