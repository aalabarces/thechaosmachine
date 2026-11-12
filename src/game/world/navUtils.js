// Ayudas sobre el NavGrid del engine. Corren en los workers (Recruit.tick), así que usan el global WEED.

import { NAV } from '../config/balance.js';

const { NavGrid } = WEED;

const _center = { x: 0, y: 0 };

/**
 * Centro de la celda caminable más cercana a (x, y), buscando en anillos de celdas.
 * Si (x, y) ya es caminable, devuelve (x, y) tal cual.
 * @param {{x: number, y: number}} out
 * @returns {boolean} false si no hay ninguna caminable en `rings` anillos (out queda en x, y)
 */
export function nearestWalkable(x, y, rings, out) {
  out.x = x;
  out.y = y;
  if (NavGrid.isPositionWalkable(x, y)) return true;
  const cs = NAV.cellSize;
  for (let r = 1; r <= rings; r++) {
    let best = Infinity;
    for (let oy = -r; oy <= r; oy++) {
      for (let ox = -r; ox <= r; ox++) {
        // Solo el perímetro del anillo r.
        if (ox !== -r && ox !== r && oy !== -r && oy !== r) continue;
        const cell = NavGrid.getCellAt(x + ox * cs, y + oy * cs);
        if (!NavGrid.isCellWalkable(cell)) continue;
        NavGrid.getCellCenter(cell, _center);
        const dx = _center.x - x;
        const dy = _center.y - y;
        const d2 = dx * dx + dy * dy;
        if (d2 < best) {
          best = d2;
          out.x = _center.x;
          out.y = _center.y;
        }
      }
    }
    if (best !== Infinity) return true;
  }
  return false;
}
