// Población de civiles: la reparte por las veredas al empezar la run y repone a los muertos,
// de a uno y lejos de la cámara, para que la ciudad nunca se vacíe. Corre en la página.

import { CIVILIAN } from '../config/balance.js';
import { Civilian } from '../entities/Civilian.js';

const { Camera, rng } = WEED;

export class CivilianSpawner {
  /** @param {{x: number, y: number}[]} sidewalks celdas de vereda del mapa */
  constructor(sidewalks) {
    this.sidewalks = sidewalks;
    this.nextAt = 0;
  }

  /** Reparte la población inicial, lejos de (avoidX, avoidY). */
  populate(avoidX, avoidY) {
    const n = Math.min(CIVILIAN.population, CIVILIAN.poolSize);
    for (let k = 0; k < n; k++) this.spawnOne(avoidX, avoidY, CIVILIAN.spawnMinDistance * 0.5);
  }

  /** Repone de a uno cada respawnIntervalMs mientras falten. */
  update(now, focusX, focusY) {
    if (now < this.nextAt) return;
    this.nextAt = now + CIVILIAN.respawnIntervalMs;
    if (Civilian.activeCount >= CIVILIAN.population) return;
    // Fuera de la pantalla: más lejos que la diagonal visible.
    const zoom = Camera.zoom || 1;
    const offscreen = (Math.sqrt(innerWidth * innerWidth + innerHeight * innerHeight) / zoom) * 0.6;
    this.spawnOne(focusX, focusY, Math.max(CIVILIAN.spawnMinDistance, offscreen));
  }

  spawnOne(avoidX, avoidY, minDistance) {
    const cells = this.sidewalks;
    if (cells.length === 0) return;
    const min2 = minDistance * minDistance;
    for (let tries = 0; tries < 12; tries++) {
      const c = cells[(rng() * cells.length) | 0];
      const dx = c.x - avoidX;
      const dy = c.y - avoidY;
      if (dx * dx + dy * dy < min2) continue;
      Civilian.spawn({ x: c.x + (rng() - 0.5) * 24, y: c.y + (rng() - 0.5) * 24 });
      return;
    }
  }
}
