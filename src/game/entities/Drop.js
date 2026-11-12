// Drop: algo tirado en el piso que un recluta puede juntar. Una sola clase con `kind`
// (cada clase es un pool aparte): fase 3 plata; fase 4 palo, pistola, escopeta, ametralladora, armadura.

import { DROP } from '../config/balance.js';
import { DropData } from '../components/DropData.js';
import { RunState } from '../systems/runState.js';

const { GameObject, SpriteRenderer, Transform, Tween, PARTICLE_EASE, rng } = WEED;

export const DROP_KIND = {
  MONEY: 1,
};

/** Textura y tamaño de cada tipo (ancho en px; el alto sale de la proporción de la imagen). */
const LOOK = {
  [DROP_KIND.MONEY]: { texture: 'drop_money', width: DROP.moneyWidth, aspect: 164 / 142 },
};

export class Drop extends GameObject {
  static components = [SpriteRenderer, DropData];

  onSpawned({ x = 0, y = 0, kind = DROP_KIND.MONEY, amount = 0 } = {}) {
    this.x = x + (rng() - 0.5) * 2 * DROP.scatter;
    this.y = y + (rng() - 0.5) * 2 * DROP.scatter;
    const i = this.index;
    DropData.kind[i] = kind;
    DropData.amount[i] = amount;
    DropData.claimedBy[i] = -1;

    const look = LOOK[kind] ?? LOOK[DROP_KIND.MONEY];
    this.setSprite(look.texture);
    this.spriteRenderer.anchorX = 0.5;
    this.spriteRenderer.anchorY = 0.8;
    this.setDisplaySize(look.width, look.width * look.aspect);
    this.setAlpha(1);
    Tween.to(this.index, { alpha: 0 }, DROP.fadeMs, PARTICLE_EASE.QUAD_IN, {
      delay: DROP.lifeMs,
      onComplete: 'dropExpired',
    });
  }

  onMessage(name) {
    if (name === 'dropExpired') this.despawn();
  }

  /** ¿Sigue en el piso el drop `d`? */
  static isAvailable(d) {
    return d >= 0 && Transform.active[d] === 1 && GameObject.is(d, Drop);
  }

  /** Lo junta un recluta: suma lo que vale y desaparece. */
  static collect(d) {
    if (DropData.kind[d] === DROP_KIND.MONEY) RunState.money.add(DropData.amount[d]);
    Drop.despawn(d);
  }
}
