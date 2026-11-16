// La ciudad generada para el próximo capítulo. La arma main.js (página) antes de cargar la run y
// la lee la escena: sus assets (tilemap y flowfield de veredas, como URLs blob:) y sus objetos
// (casas, árboles, veredas, calles). Los workers no la necesitan: les llega lo que la escena spawnea.

import { generateCity } from './mapGenerator.js';
import { buildTilemap } from './mapTiles.js';
import { buildSidewalkFlowfield } from './sidewalkFlow.js';

/** @type {{ seed: number, objects: object, tilemapUrl: string, flowfieldUrl: string } | null} */
let current = null;

/**
 * Genera la ciudad de `seed` y la deja lista para la próxima carga de la escena.
 * Libera las URLs de la anterior.
 */
export function prepareCity(seed, widthPx, heightPx) {
  clearCity();
  const city = generateCity(seed, widthPx, heightPx);
  const tilemap = buildTilemap(city);
  const flow = buildSidewalkFlowfield(city);
  const json = (obj) => URL.createObjectURL(new Blob([JSON.stringify(obj)], { type: 'application/json' }));
  current = {
    seed,
    // Mismo formato que el JSON de objetos del mapa horneado (cityMap.js lo consume igual).
    objects: { houses: city.houses, trees: city.trees, sidewalks: city.sidewalks, roads: city.roads, lamps: city.lamps },
    tilemapUrl: json(tilemap),
    flowfieldUrl: json(flow),
  };
  return current;
}

/** La ciudad preparada, o null (se usa el mapa horneado de littleCity). */
export function getPreparedCity() {
  return current;
}

export function clearCity() {
  if (!current) return;
  URL.revokeObjectURL(current.tilemapUrl);
  URL.revokeObjectURL(current.flowfieldUrl);
  current = null;
}
