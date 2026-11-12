// Flowfield de veredas de una ciudad generada (lo siguen los civiles al pasear). Módulo puro.
//   - Sobre la vereda: da la vuelta a la manzana (manzanas alternadas en sentido horario y
//     antihorario, así por cada calle se cruzan peatones en los dos sentidos).
//   - Cerca de la vereda (hasta ATTRACT celdas: calle, patio, plaza): apunta hacia la vereda
//     más cercana, para que el que se desvió (huyendo, empujado) vuelva.
//   - Más lejos: sin dirección (el civil vuelve derecho a su vereda conocida).
// Sale en el formato JSON de flowfield que lee el engine (NavGrid.requestVectorFromStaticFlowfield).

import { CELL, TERRAIN } from './mapGenerator.js';

const ATTRACT = 8;
const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/** @param {ReturnType<import('./mapGenerator.js').generateCity>} city */
export function buildSidewalkFlowfield(city) {
  const W = city.widthCells;
  const H = city.heightCells;
  const vx = new Float32Array(W * H);
  const vy = new Float32Array(W * H);
  const has = new Uint8Array(W * H);

  // Vuelta a la manzana por su anillo de vereda.
  city.blocks.forEach((b, k) => {
    const cw = k % 2 === 0 ? 1 : -1;
    const put = (x, y, dx, dy) => {
      const i = y * W + x;
      vx[i] = dx * cw;
      vy[i] = dy * cw;
      has[i] = 1;
    };
    // Horario (y hacia abajo): arriba →, derecha ↓, abajo ←, izquierda ↑. Las esquinas doblan.
    for (let x = b.x0; x < b.x1; x++) put(x, b.y0, 1, 0);
    for (let y = b.y0; y < b.y1; y++) put(b.x1, y, 0, 1);
    for (let x = b.x1; x > b.x0; x--) put(x, b.y1, -1, 0);
    for (let y = b.y1; y > b.y0; y--) put(b.x0, y, 0, -1);
  });

  // Atracción hacia la vereda: BFS desde todas las celdas de vereda.
  const dist = new Int16Array(W * H).fill(-1);
  const queue = [];
  for (let i = 0; i < W * H; i++) {
    if (city.terrain[i] === TERRAIN.SIDEWALK) {
      dist[i] = 0;
      queue.push(i);
    }
  }
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q];
    if (dist[i] >= ATTRACT) continue;
    const x = i % W;
    const y = (i / W) | 0;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const n = ny * W + nx;
      if (dist[n] !== -1) continue;
      dist[n] = dist[i] + 1;
      // Apunta hacia la celda desde la que llegó (un paso más cerca de la vereda).
      const len = Math.sqrt(dx * dx + dy * dy);
      vx[n] = -dx / len;
      vy[n] = -dy / len;
      has[n] = 1;
      queue.push(n);
    }
  }

  const data = [];
  for (let y = 0; y < H; y++) {
    const row = [];
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      row.push(has[i] ? [Math.round(vx[i] * 1000) / 1000, Math.round(vy[i] * 1000) / 1000] : null);
    }
    data.push(row);
  }
  return {
    metadata: { widthCells: W, heightCells: H, widthPx: W * CELL, heightPx: H * CELL, cellSizePx: CELL, attractionWidth: ATTRACT },
    data,
  };
}
