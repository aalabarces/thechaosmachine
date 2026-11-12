// Drop: algo tirado en el piso que un recluta puede juntar. Una sola clase con `kind`
// (cada clase es un pool aparte): plata, un arma (amount = WEAPON.*) o un chaleco.

import { DROP } from '../config/balance.js';
import { WEAPONS, ARMOR } from '../config/weapons.js';
import { DropData } from '../components/DropData.js';

const { GameObject, SpriteRenderer, Transform, Tween, PARTICLE_EASE, rng } = WEED;

export const DROP_KIND = {
  MONEY: 1,
  WEAPON: 2,
  ARMOR: 3,
};

/** Proporción alto/ancho de cada textura de drop (de los PNG). */
const ASPECT = {
  drop_money: 164 / 142,
  drop_pistol: 101 / 163,
  drop_shotgun: 59 / 294,
  drop_smg: 127 / 378,
  drop_bat: 10 / 48,
  drop_armor: 30 / 28,
};

function lookOf(kind, amount) {
  if (kind === DROP_KIND.WEAPON) {
    const w = WEAPONS[amount];
    return { texture: w.icon, width: w.iconWidth };
  }
  if (kind === DROP_KIND.ARMOR) return { texture: ARMOR.icon, width: ARMOR.iconWidth };
  return { texture: 'drop_money', width: DROP.moneyWidth };
}

export class Drop extends GameObject {
  static components = [SpriteRenderer, DropData];

  onSpawned({ x = 0, y = 0, kind = DROP_KIND.MONEY, amount = 0 } = {}) {
    this.x = x + (rng() - 0.5) * 2 * DROP.scatter;
    this.y = y + (rng() - 0.5) * 2 * DROP.scatter;
    const i = this.index;
    DropData.kind[i] = kind;
    DropData.amount[i] = amount;
    DropData.claimedBy[i] = -1;

    const look = lookOf(kind, amount);
    this.setSprite(look.texture);
    this.spriteRenderer.anchorX = 0.5;
    this.spriteRenderer.anchorY = 0.8;
    this.setDisplaySize(look.width, look.width * (ASPECT[look.texture] ?? 1));
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
}

/** Textura y ancho en la mano de un arma (decoración del que la lleva). */
export function weaponLook(weapon) {
  const w = WEAPONS[weapon];
  return w && w.icon ? { texture: w.icon, width: w.iconWidth * 0.8, aspect: ASPECT[w.icon] ?? 1 } : null;
}
