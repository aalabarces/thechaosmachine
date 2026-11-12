// El mapa de la ciudad: el fijo de littleCity (tilemap + casas + árboles) más los props
// rompibles que se reparten al azar (tachos en las veredas, autos junto al cordón, cajeros
// frente a las casas). Más adelante mapGenerator.js arma uno al azar con la misma salida.

import { asset } from '../assets.js';
import { PROPS, NAV, MINES, SPAWN_SAFETY } from '../config/balance.js';
import { House } from '../entities/props/House.js';
import { Tree } from '../entities/props/Tree.js';
import { TrashCan } from '../entities/props/TrashCan.js';
import { ParkedCar } from '../entities/props/ParkedCar.js';
import { Atm } from '../entities/props/Atm.js';
import { Mine } from '../entities/props/Mine.js';

const { NavGrid, rng } = WEED;

/** Lado de las celdas del JSON de objetos (veredas y calles), px. */
const MAP_CELL = 48;

/** Hasta cuántas veces la cantidad base de props puede pedir la mejora "Más para romper". */
const MAX_PROPS_MULTIPLIER = 3;

/** Pools de las entidades del mapa (van a static entities de la escena). */
export const CITY_ENTITIES = [
  [House, 300],
  [Tree, 1300],
  [TrashCan, PROPS.trashCan.count * MAX_PROPS_MULTIPLIER],
  [ParkedCar, PROPS.parkedCar.count * MAX_PROPS_MULTIPLIER],
  [Atm, PROPS.atm.count * MAX_PROPS_MULTIPLIER],
  [Mine, MINES.count + 5],
];

/** Baja el JSON de objetos del mapa: casas, árboles, celdas de vereda y de calle. */
export async function loadCityData() {
  const res = await fetch(asset('map/little_city_objects.json'));
  return res.json();
}

/**
 * Spawnea la escenografía y los props, y marca como no caminable lo que no se mueve.
 * @param {number} [propsMultiplier] mejora "Más para romper" del mercado (1 = la cantidad base)
 * @param {{x: number, y: number}} [start] punto de partida del malón: sin autos cerca (explotan)
 */
export function spawnCity(data, propsMultiplier = 1, start = null) {
  const mul = Math.min(MAX_PROPS_MULTIPLIER, Math.max(0, propsMultiplier));
  const houses = data.houses || [];
  for (let i = 0; i < houses.length; i++) House.spawn({ x: houses[i].x, y: houses[i].y });

  const trees = data.trees || [];
  for (let i = 0; i < trees.length; i++) Tree.spawn({ x: trees[i].x, y: trees[i].y, radius: trees[i].radius });

  spawnTrashCans(data, Math.round(PROPS.trashCan.count * mul));
  spawnParkedCars(data, Math.round(PROPS.parkedCar.count * mul), start);
  spawnAtms(houses, Math.round(PROPS.atm.count * mul));

  // Los tachos no: son chicos y se rompen enseguida.
  NavGrid.updateNavGrid([
    ...House.getAllActive(),
    ...Tree.getAllActive(),
    ...ParkedCar.getAllActive(),
    ...Atm.getAllActive(),
  ]);
}

/**
 * Minas escondidas en celdas de vereda/calle al azar, lejos del punto de partida y separadas.
 * Son de la run (no del mapa fijo): se ponen en cada partida nueva.
 */
export function spawnMines(data, startX, startY, count) {
  const far2 = MINES.minDistanceFromStart * MINES.minDistanceFromStart;
  const cells = shuffled(data.sidewalks || []).filter((c) => {
    const dx = c.x - startX;
    const dy = c.y - startY;
    return dx * dx + dy * dy > far2;
  });
  for (const s of pickSpread(cells, count, MINES.minSpacing)) Mine.spawn({ x: s.x + (rng() - 0.5) * 20, y: s.y + (rng() - 0.5) * 20 });
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

// ------------------------------------------------------------------ props

function cellKey(x, y) {
  return `${Math.round(x)},${Math.round(y)}`;
}

function shuffled(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

/** Elige hasta `count` puntos de `candidates` separados al menos `minDist` entre sí. */
function pickSpread(candidates, count, minDist) {
  const picked = [];
  const min2 = minDist * minDist;
  for (let k = 0; k < candidates.length && picked.length < count; k++) {
    const c = candidates[k];
    let ok = true;
    for (let p = 0; p < picked.length; p++) {
      const dx = picked[p].x - c.x;
      const dy = picked[p].y - c.y;
      if (dx * dx + dy * dy < min2) {
        ok = false;
        break;
      }
    }
    if (ok) picked.push(c);
  }
  return picked;
}

/** Tachos en veredas de verdad: en el JSON las celdas de calle también figuran como vereda. */
function spawnTrashCans(data, count) {
  const road = new Set();
  for (const r of data.roads || []) for (const c of r.cells || []) road.add(cellKey(c.x, c.y));
  const sidewalks = (data.sidewalks || []).filter((c) => !road.has(cellKey(c.x, c.y)));
  const spots = pickSpread(shuffled(sidewalks), count, 180);
  for (const s of spots) TrashCan.spawn({ x: s.x + (rng() - 0.5) * 16, y: s.y + (rng() - 0.5) * 16 });
}

/**
 * Autos en las celdas del borde de cada calle (el carril del cordón), mirando a lo largo de la
 * calle: si la celda de arriba o la de abajo ya no es calle, la calle corre horizontal; si es la
 * de un costado, vertical. Las esquinas (las dos cosas) se saltean.
 */
function spawnParkedCars(data, count, start) {
  const road = new Set();
  const cells = [];
  for (const r of data.roads || []) {
    for (const c of r.cells || []) {
      const k = cellKey(c.x, c.y);
      if (road.has(k)) continue;
      road.add(k);
      cells.push(c);
    }
  }
  const curb = [];
  for (const c of cells) {
    const edgeV = !road.has(cellKey(c.x, c.y - MAP_CELL)) || !road.has(cellKey(c.x, c.y + MAP_CELL));
    const edgeH = !road.has(cellKey(c.x - MAP_CELL, c.y)) || !road.has(cellKey(c.x + MAP_CELL, c.y));
    if (edgeV === edgeH) continue;
    curb.push(edgeV ? snapCar(c.x, c.y, true) : snapCar(c.x, c.y, false));
  }
  // Ninguno cerca del punto de partida: los reclutas los rompen solos y la explosión los mata.
  const safe2 = SPAWN_SAFETY.carStartRadius * SPAWN_SAFETY.carStartRadius;
  const away = start ? curb.filter((c) => (c.x - start.x) ** 2 + (c.y - start.y) ** 2 >= safe2) : curb;
  const spots = pickSpread(shuffled(away), count, PROPS.parkedCar.spacing);
  for (const s of spots) ParkedCar.spawn(s);
}

/**
 * Ubica el auto justo sobre celdas del NavGrid. El engine bloquea toda celda que toque la caja
 * del collider: un auto sobre el borde entre celdas tapaba 2×2 (96×96 px) y, uno al lado del
 * otro, armaban una pared a lo largo del cordón. Así tapa 2×1 (horizontal) o 1×2 (vertical).
 */
function snapCar(x, y, horizontal) {
  const cs = NAV.cellSize;
  const kx = Math.floor(x / cs);
  const ky = Math.floor(y / cs);
  if (horizontal) return { x: (kx + 1) * cs, y: ky * cs + cs / 2, angle: rng() < 0.5 ? '0' : '180' };
  return { x: kx * cs + cs / 2, y: (ky + 1) * cs, angle: rng() < 0.5 ? '90' : '270' };
}

/** Cajeros pegados al frente (abajo) de casas al azar. */
function spawnAtms(houses, count) {
  // Más cajeros que casas: algunas casas tienen dos.
  const spots = [];
  while (spots.length < count && houses.length > 0) spots.push(...shuffled(houses).slice(0, count - spots.length));
  // Pegado a la base de la casa, en las celdas que la casa ya bloquea: no ocupa la vereda.
  for (const h of spots) Atm.spawn({ x: h.x + (rng() - 0.5) * 120, y: h.y + 14 });
}
