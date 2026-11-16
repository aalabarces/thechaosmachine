// Explosiones: daño en un radio (baja con la distancia) a todo lo que tenga vida —personas y
// props, así un auto que explota puede hacer explotar al de al lado—, más la animación, humo,
// mancha de quemado en el piso, pedazos, sonido, sacudida de cámara y, si corresponde, fuego.
// Corre en los workers (la llama quien explota: un auto, una mina).

import { EXPLOSION, ACTION_LIGHT } from '../config/balance.js';
import { RunModifiers } from './runModifiers.js';
import { lightIntensityFor } from './lightHours.js';
import { Health } from '../components/Health.js';
import { emitDebris } from './effects.js';
import { playSfx } from './sfx.js';
import { Explosion } from '../entities/fx/Explosion.js';
import { Fire } from '../entities/fx/Fire.js';

const { Query, Transform, ParticleEmitter, Decal, Flash } = WEED;

/**
 * @param {import('../entities/Person.js').Person | object} source la entidad que explota (manda los mensajes)
 * @param {number} x
 * @param {number} y
 * @param {{ damage: number, radius: number, shake: number, sfx: string, fire: boolean }} kind EXPLOSION.car / .mine
 * @param {number} culprit quién la provocó (-1 = nadie): las muertes y el heat se le anotan a él
 */
export function explode(source, x, y, kind, culprit = -1) {
  const r2 = kind.radius * kind.radius;
  const me = source.index;
  const targets = Query.queryActiveEntities([Health]);
  for (let k = 0; k < targets.length; k++) {
    const t = targets[k];
    if (t === me || Health.hp[t] <= 0 || Health.maxHp[t] <= 0) continue;
    const dx = Transform.x[t] - x;
    const dy = Transform.y[t] - y;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r2) continue;
    const falloff = 1 - Math.sqrt(d2) / kind.radius;
    source.sendTo(t, 'blast', kind.damage * (0.35 + 0.65 * falloff), x, y, culprit + 1);
  }

  Explosion.spawn({ x, y, size: kind.radius * EXPLOSION.spritePerRadius });
  if (RunModifiers.lightingOn[0] === 1) {
    const f = ACTION_LIGHT.explosion;
    Flash.spawn({ x, y, z: 20, lifespan: f.lifespan, color: f.color, intensity: lightIntensityFor(f.radius), hasGlowSprite: f.glow });
  }
  if (kind.fire) Fire.spawn({ x, y, culprit });
  emitSmoke(x, y);
  emitDebris(x, y, 10, 0x3a3a3a, -10);
  Decal.stamp({ x, y, texture: 'scorch', scale: kind.radius / 140, alpha: 0.85 });
  playSfx(kind.sfx, x, y);
  // La sacudida la hace la página (la cámara tiene un solo escritor): le avisa por emit.
  source.emit('boom', { x, y, shake: kind.shake });
}

function emitSmoke(x, y) {
  ParticleEmitter.emitFlat({
    x,
    y: y - 20,
    texture: 'smoke',
    count: 6,
    angleXY: { min: 230, max: 310 },
    speed: { min: 0.3, max: 1.1 },
    scale: { from: { min: 0.6, max: 1 }, to: { min: 1.6, max: 2.4 } },
    alpha: { from: 0.55, to: 0 },
    tint: 0x444444,
    rotation: { min: 0, max: 360 },
    lifespan: { min: 1200, max: 2200 },
  });
}
