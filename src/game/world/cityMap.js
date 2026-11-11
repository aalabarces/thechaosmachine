// El mapa de la ciudad. Fase 1: el mapa fijo de littleCity (tilemap + casas + árboles).
// Más adelante mapGenerator.js arma uno al azar con la misma salida.

import { asset } from '../assets.js';
import { House } from '../entities/props/House.js';
import { Tree } from '../entities/props/Tree.js';

const { NavGrid } = WEED;

/** Pools de las entidades del mapa (van a static entities de la escena). */
export const CITY_ENTITIES = [
  [House, 80],
  [Tree, 1300],
];

/** Baja el JSON de objetos del mapa: casas, árboles, celdas de vereda y de calle. */
export async function loadCityData() {
  const res = await fetch(asset('map/little_city_objects.json'));
  return res.json();
}

/** Spawnea la escenografía estática y marca sus celdas como no caminables. */
export function spawnCity(data) {
  const houses = data.houses || [];
  for (let i = 0; i < houses.length; i++) House.spawn({ x: houses[i].x, y: houses[i].y });

  const trees = data.trees || [];
  for (let i = 0; i < trees.length; i++) Tree.spawn({ x: trees[i].x, y: trees[i].y, radius: trees[i].radius });

  NavGrid.updateNavGrid([...House.getAllActive(), ...Tree.getAllActive()]);
}

/** La celda de vereda más cercana a (x, y): un lugar seguro donde aparecer. */
export function nearestSidewalk(data, x, y) {
  const cells = data.sidewalks || [];
  let best = null;
  let bestD2 = Infinity;
  for (let i = 0; i < cells.length; i++) {
    const dx = cells[i].x - x;
    const dy = cells[i].y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = cells[i];
    }
  }
  return best ?? { x, y };
}
