// Efectos visuales compartidos (partículas). Corren en cualquier hilo.

const { ParticleEmitter } = WEED;

/**
 * Sangre que salta desde la altura del torso, sobre todo en la dirección del golpe (dirX, dirY),
 * cae y queda como mancha en el piso (decal).
 */
export function emitBlood(x, y, count, dirX = 0, dirY = 0) {
  const angle = (Math.atan2(dirY, dirX) * 180) / Math.PI;
  const spread = dirX === 0 && dirY === 0 ? 180 : 70;
  ParticleEmitter.emit({
    x,
    y,
    z: -18,
    texture: 'blood',
    count,
    angleXY: { min: angle - spread, max: angle + spread },
    speed: { min: 0.6, max: 2.6 },
    vz: { min: -2.5, max: -0.5 },
    gravity: 0.35,
    scale: { min: 0.25, max: 0.6 },
    stayOnTheFloor: true,
  });
}
