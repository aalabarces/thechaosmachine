// El mapa de la ciudad: el fijo de littleCity (tilemap + casas + árboles) más los props
// rompibles que se reparten al azar (tachos en las veredas, autos junto al cordón, cajeros
// frente a las casas). Más adelante mapGenerator.js arma uno al azar con la misma salida.

import { asset } from '../assets.js';
import { PROPS, NAV } from '../config/balance.js';
import { House } from '../entities/props/House.js';
import { Tree } from '../entities/props/Tree.js';
import { TrashCan } from '../entities/props/TrashCan.js';
import { ParkedCar } from '../entities/props/ParkedCar.js';
import { Atm } from '../entities/props/Atm.js';

const { NavGrid, rng } = WEED;

/** Lado de las celdas del JSON de objetos (veredas y calles), px. */
const MAP_CELL = 48;

/** Pools de las entidades del mapa (van a static entities de la escena). */
export const CITY_ENTITIES = [
  [House, 80],
  [Tree, 1300],
  [TrashCan, PROPS.trashCan.count + 20],
  [ParkedCar, PROPS.parkedCar.count + 10],
  [Atm, PROPS.atm.count + 5],
];

/** Baja el JSON de objetos del mapa: casas, árboles, celdas de vereda y de calle. */
export async function loadCityData() {
  const res = await fetch(asset('map/little_city_objects.json'));
  return res.json();
}

/** Spawnea la escenografía y los props, y marca como no caminable lo que no se mueve. */
export function spawnCity(data) {
  const houses = data.houses || [];
  for (let i = 0; i < houses.length; i++) House.spawn({ x: houses[i].x, y: houses[i].y });

  const trees = data.trees || [];
  for (let i = 0; i < trees.length; i++) Tree.spawn({ x: trees[i].x, y: trees[i].y, radius: trees[i].radius });

  spawnTrashCans(data);
  spawnParkedCars(data);
  spawnAtms(houses);

  // Los tachos no: son chicos y se rompen enseguida.
  NavGrid.updateNavGrid([
    ...House.getAllActive(),
    ...Tree.getAllActive(),
    ...ParkedCar.getAllActive(),
    ...Atm.getAllActive(),
  ]);
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
function spawnTrashCans(data) {
  const road = new Set();
  for (const r of data.roads || []) for (const c of r.cells || []) road.add(cellKey(c.x, c.y));
  const sidewalks = (data.sidewalks || []).filter((c) => !road.has(cellKey(c.x, c.y)));
  const spots = pickSpread(shuffled(sidewalks), PROPS.trashCan.count, 180);
  for (const s of spots) TrashCan.spawn({ x: s.x + (rng() - 0.5) * 16, y: s.y + (rng() - 0.5) * 16 });
}

/**
 * Autos en las celdas del borde de cada calle (el carril del cordón), mirando a lo largo de la
 * calle: si la celda de arriba o la de abajo ya no es calle, la calle corre horizontal; si es la
 * de un costado, vertical. Las esquinas (las dos cosas) se saltean.
 */
function spawnParkedCars(data) {
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
  const spots = pickSpread(shuffled(curb), PROPS.parkedCar.count, PROPS.parkedCar.spacing);
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
function spawnAtms(houses) {
  const spots = shuffled(houses).slice(0, PROPS.atm.count);
  for (const h of spots) Atm.spawn({ x: h.x + (rng() - 0.5) * 120, y: h.y + 24 });
}
