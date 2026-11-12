// Arma el tilemap (formato Tiled JSON) de una ciudad generada, con el tileset assets/map/tiles.png.
// Módulo puro (página, antes de cargar la run).
//
// El tileset trae 12 terrenos en formato autotile tipo RPG Maker (A2): cada uno es un bloque de
// 4×6 tiles de 24 px y cada celda de 48 px del mapa se arma con 4 cuartos de 24 px que dependen
// de sus vecinos (borde, esquina, esquina interior o centro). Terrenos que usamos:
//   pasto verde (base de todo), pasto lima (parques), pasto amarillo (manchas en los patios),
//   adoquín (veredas y plazas; también debajo de las calles, para que el borde del asfalto
//   se funda con la vereda) y asfalto (calles).

import { CELL, TERRAIN } from './mapGenerator.js';

const TILE = 24;
const TILESET_COLUMNS = 24;

/** Bloque [columna, fila] de cada terreno dentro del tileset (en bloques de 4×6 tiles). */
const TERRAIN_BLOCK = {
  green: [3, 1],
  lime: [5, 1],
  yellow: [3, 0],
  cobble: [2, 0],
  asphalt: [4, 1],
};

function gid(block, qx, qy) {
  const col = block[0] * 4 + qx;
  const row = block[1] * 6 + qy;
  return row * TILESET_COLUMNS + col + 1;
}

/**
 * Llena una capa con un terreno autotile sobre las celdas donde `inSet(x, y)` es true.
 * Fuera del mapa cuenta como "del mismo terreno": no se dibujan bordes contra el borde del mundo.
 */
function autotileLayer(data, W, H, block, inSet) {
  const TW = W * 2;
  const has = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? true : inSet(x, y));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!inSet(x, y)) continue;
      const u = has(x, y - 1);
      const d = has(x, y + 1);
      const l = has(x - 1, y);
      const r = has(x + 1, y);
      const tl = u && l ? (has(x - 1, y - 1) ? [1, 3] : [2, 0]) : u ? [0, 3] : l ? [1, 2] : [0, 2];
      const tr = u && r ? (has(x + 1, y - 1) ? [2, 3] : [3, 0]) : u ? [3, 3] : r ? [2, 2] : [3, 2];
      const bl = d && l ? (has(x - 1, y + 1) ? [1, 4] : [2, 1]) : d ? [0, 4] : l ? [1, 5] : [0, 5];
      const br = d && r ? (has(x + 1, y + 1) ? [2, 4] : [3, 1]) : d ? [3, 4] : r ? [2, 5] : [3, 5];
      const tx = x * 2;
      const ty = y * 2;
      data[ty * TW + tx] = gid(block, tl[0], tl[1]);
      data[ty * TW + tx + 1] = gid(block, tr[0], tr[1]);
      data[(ty + 1) * TW + tx] = gid(block, bl[0], bl[1]);
      data[(ty + 1) * TW + tx + 1] = gid(block, br[0], br[1]);
    }
  }
}

/** Relleno sin bordes (el centro del autotile, alternando sus 4 cuartos). */
function fillLayer(data, W, H, block) {
  const TW = W * 2;
  for (let ty = 0; ty < H * 2; ty++) {
    for (let tx = 0; tx < TW; tx++) data[ty * TW + tx] = gid(block, 1 + (tx & 1), 3 + (ty & 1));
  }
}

/**
 * @param {ReturnType<import('./mapGenerator.js').generateCity>} city
 * @returns {object} JSON de Tiled
 */
export function buildTilemap(city) {
  const W = city.widthCells;
  const H = city.heightCells;
  const T = city.terrain;
  const at = (x, y) => T[y * W + x];
  const n = W * 2 * H * 2;
  const layers = [];
  const add = (name, fill) => {
    const data = new Array(n).fill(0);
    fill(data);
    layers.push({ id: layers.length + 1, name, type: 'tilelayer', x: 0, y: 0, width: W * 2, height: H * 2, opacity: 1, visible: true, data });
  };

  add('grass', (d) => fillLayer(d, W, H, TERRAIN_BLOCK.green));
  add('parks', (d) => autotileLayer(d, W, H, TERRAIN_BLOCK.lime, (x, y) => at(x, y) === TERRAIN.PARK));
  add('patches', (d) => autotileLayer(d, W, H, TERRAIN_BLOCK.yellow, (x, y) => city.patch[y * W + x] === 1));
  add('sidewalks', (d) =>
    autotileLayer(d, W, H, TERRAIN_BLOCK.cobble, (x, y) => {
      const t = at(x, y);
      return t === TERRAIN.SIDEWALK || t === TERRAIN.ROAD || t === TERRAIN.PLAZA;
    }),
  );
  add('roads', (d) => autotileLayer(d, W, H, TERRAIN_BLOCK.asphalt, (x, y) => at(x, y) === TERRAIN.ROAD));

  return {
    type: 'map',
    version: '1.10',
    tiledversion: '1.10.2',
    orientation: 'orthogonal',
    renderorder: 'right-down',
    infinite: false,
    compressionlevel: -1,
    width: W * 2,
    height: H * 2,
    tilewidth: TILE,
    tileheight: TILE,
    nextlayerid: layers.length + 1,
    nextobjectid: 1,
    tilesets: [
      {
        firstgid: 1,
        name: 'city',
        image: 'tiles.png',
        imagewidth: 576,
        imageheight: 288,
        columns: TILESET_COLUMNS,
        tilecount: 288,
        tilewidth: TILE,
        tileheight: TILE,
        margin: 0,
        spacing: 0,
      },
    ],
    layers,
  };
}

export { CELL };
