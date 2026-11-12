// Generador de ciudad con semilla. Módulo puro (no usa el engine): corre en la página antes de
// cargar la run, y lo que produce lo consume la escena como si fuera un mapa horneado.
//
// Cómo es la ciudad (pensada para que el malón se mueva sin trabarse):
//   - Grilla completa de calles de ROAD_W celdas (96 px, dos carriles): todas las esquinas conectan.
//   - Cada manzana tiene una vereda de 1 celda alrededor, siempre libre.
//   - Adentro: una o dos filas de casas apoyadas sobre la vereda de abajo (la de arriba, si entra),
//     con al menos 2 celdas libres entre casa y casa; el resto es patio.
//   - Árboles centrados en celdas y nunca en celdas vecinas: siempre queda paso entre ellos
//     (el NavGrid bloquea toda celda que toque la caja de un obstáculo).
//   - Algunas manzanas son plazas (adoquín) o parques (pasto claro, más árboles).
//   - Hacia los bordes del mapa, suburbios: manzanas más grandes, casas más espaciadas, más verde.
//
// Coordenadas: celdas de CELL px. Todo punto que sale (veredas, calles) es el CENTRO de su celda.

export const CELL = 48;

/** Tipo de terreno de cada celda. */
export const TERRAIN = {
  YARD: 0, // patio de pasto (adentro de una manzana)
  SIDEWALK: 1,
  ROAD: 2,
  PLAZA: 3, // manzana de adoquín
  PARK: 4, // manzana de pasto claro
  EDGE: 5, // fuera de la grilla de calles (borde del mapa)
};

const ROAD_W = 2;
const SIDEWALK_W = 1;
const MARGIN = 1;

/** Casa: el sprite (293×262) se apoya en su base; el collider ocupa de base−105 a base+5, 200 de ancho. */
const HOUSE = { colliderW: 200, colliderUp: 105, colliderDown: 5, spriteW: 293, spriteH: 262, minGap: 2 * CELL };
/** Margen entre el dibujo de una casa y las veredas de los costados / de arriba (px). */
const HOUSE_MARGIN = 6;

/** Manzanas: celdas de patio (sin contar la vereda) según qué tan lejos del centro están. */
const BLOCK = {
  centerW: [13, 19],
  centerH: [8, 11],
  suburbW: [18, 26],
  suburbH: [11, 14],
  /** Distancia al centro (0 = centro, 1 = borde) desde la que empiezan los suburbios. */
  suburbFrom: 0.62,
  plazaChance: 0.08,
  parkChance: 0.12,
  suburbParkChance: 0.2,
};

/** Probabilidad de árbol en cada punto libre de la grilla de árboles (cada 2 celdas). */
const TREES = { yard: 0.16, suburb: 0.32, park: 0.42, plaza: 0.08, edge: 0.3, radiusMin: 16, radiusMax: 21, clearance: 30 };

/** Manchas de pasto amarillo en los patios (solo decoración). */
const PATCHES = { perBlock: 0.6, minSize: 2, maxSize: 4 };

/** PRNG chico y determinístico (mulberry32). */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {number} seed
 * @param {number} widthPx
 * @param {number} heightPx
 */
export function generateCity(seed, widthPx, heightPx) {
  const rng = makeRng(seed);
  const rint = (min, max) => min + Math.floor(rng() * (max - min + 1));
  const W = Math.floor(widthPx / CELL);
  const H = Math.floor(heightPx / CELL);
  const terrain = new Uint8Array(W * H).fill(TERRAIN.EDGE);
  const patch = new Uint8Array(W * H);
  const set = (x, y, t) => {
    if (x >= 0 && y >= 0 && x < W && y < H) terrain[y * W + x] = t;
  };

  // ---------------------------------------------------------------- calles
  // Posiciones de las calles: alternan calle y manzana; el ancho de cada manzana depende de qué
  // tan cerca del centro cae.
  const cutsX = cuts(W, rint, (pos) => suburbness(pos / W), BLOCK.centerW, BLOCK.suburbW);
  const cutsY = cuts(H, rint, (pos) => suburbness(pos / H), BLOCK.centerH, BLOCK.suburbH);

  for (const x0 of cutsX) for (let x = x0; x < x0 + ROAD_W; x++) for (let y = cutsY[0]; y < cutsY[cutsY.length - 1] + ROAD_W; y++) set(x, y, TERRAIN.ROAD);
  for (const y0 of cutsY) for (let y = y0; y < y0 + ROAD_W; y++) for (let x = cutsX[0]; x < cutsX[cutsX.length - 1] + ROAD_W; x++) set(x, y, TERRAIN.ROAD);

  // ---------------------------------------------------------------- manzanas
  const houses = [];
  const trees = [];
  /** Rectángulos del dibujo de las casas (px), para alejar los árboles. */
  const houseRects = [];
  const blocks = [];
  for (let bx = 0; bx < cutsX.length - 1; bx++) {
    for (let by = 0; by < cutsY.length - 1; by++) {
      // Celdas entre calles: vereda alrededor + patio adentro.
      const x0 = cutsX[bx] + ROAD_W;
      const x1 = cutsX[bx + 1] - 1;
      const y0 = cutsY[by] + ROAD_W;
      const y1 = cutsY[by + 1] - 1;
      const ix0 = x0 + SIDEWALK_W;
      const ix1 = x1 - SIDEWALK_W;
      const iy0 = y0 + SIDEWALK_W;
      const iy1 = y1 - SIDEWALK_W;
      const cx = (x0 + x1 + 1) / 2 / W;
      const cy = (y0 + y1 + 1) / 2 / H;
      const sub = Math.max(suburbness(cx), suburbness(cy)) > 0;

      let kind = TERRAIN.YARD;
      const r = rng();
      if (!sub && r < BLOCK.plazaChance) kind = TERRAIN.PLAZA;
      else if (r < BLOCK.plazaChance + (sub ? BLOCK.suburbParkChance : BLOCK.parkChance)) kind = TERRAIN.PARK;

      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, TERRAIN.SIDEWALK);
      for (let y = iy0; y <= iy1; y++) for (let x = ix0; x <= ix1; x++) set(x, y, kind);
      blocks.push({ x0, y0, x1, y1, ix0, iy0, ix1, iy1, kind, sub });

      if (kind === TERRAIN.YARD) placeHouses(ix0, iy0, ix1, iy1, sub, rng, houses, houseRects);
    }
  }

  // ---------------------------------------------------------------- árboles
  // Grilla de puntos cada 2 celdas, centrados en su celda: entre dos árboles siempre queda una
  // celda libre, y un árbol (radio ≤ 22) bloquea una sola celda del NavGrid.
  for (let y = 1; y < H - 1; y += 2) {
    for (let x = 1; x < W - 1; x += 2) {
      const t = terrain[y * W + x];
      if (t === TERRAIN.SIDEWALK || t === TERRAIN.ROAD) continue;
      const chance = treeChance(t, x / W, y / H);
      if (rng() >= chance) continue;
      const px = x * CELL + CELL / 2;
      const py = y * CELL + CELL / 2;
      // Lejos de las casas y sin tocar veredas (las celdas vecinas también tienen que ser patio).
      if (houseRects.some((h) => px > h.x0 - TREES.clearance && px < h.x1 + TREES.clearance && py > h.y0 - TREES.clearance && py < h.y1 + TREES.clearance)) continue;
      if (!allAround(terrain, W, H, x, y, t)) continue;
      trees.push({ x: px, y: py, radius: TREES.radiusMin + rng() * (TREES.radiusMax - TREES.radiusMin) });
    }
  }

  // ---------------------------------------------------------------- manchas de pasto amarillo
  for (const b of blocks) {
    if (b.kind !== TERRAIN.YARD || rng() >= PATCHES.perBlock) continue;
    const w = rint(PATCHES.minSize, PATCHES.maxSize);
    const h = rint(PATCHES.minSize, PATCHES.maxSize);
    if (b.ix1 - b.ix0 + 1 < w || b.iy1 - b.iy0 + 1 < h) continue;
    const px0 = rint(b.ix0, b.ix1 - w + 1);
    const py0 = rint(b.iy0, b.iy1 - h + 1);
    for (let y = py0; y < py0 + h; y++) for (let x = px0; x < px0 + w; x++) patch[y * W + x] = 1;
  }

  // ---------------------------------------------------------------- listas para el juego
  const sidewalks = [];
  const roadCells = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const t = terrain[y * W + x];
      const p = { x: x * CELL + CELL / 2, y: y * CELL + CELL / 2 };
      if (t === TERRAIN.SIDEWALK) sidewalks.push(p);
      else if (t === TERRAIN.ROAD) roadCells.push(p);
    }
  }

  return {
    seed,
    widthCells: W,
    heightCells: H,
    terrain,
    patch,
    blocks,
    houses,
    trees,
    sidewalks,
    roads: [{ id: 1, width: ROAD_W, cells: roadCells }],
  };
}

/** 0 en el centro del mapa, sube a 1 hacia el borde a partir de BLOCK.suburbFrom. */
function suburbness(t) {
  const d = Math.abs(t - 0.5) * 2;
  return d < BLOCK.suburbFrom ? 0 : (d - BLOCK.suburbFrom) / (1 - BLOCK.suburbFrom);
}

/**
 * Posiciones (celda de inicio) de cada calle a lo largo de un eje de `n` celdas. Las manzanas
 * salen al azar dentro de su rango; al final, lo que sobra se reparte en una o dos manzanas
 * para que ninguna quede gigante.
 */
function cuts(n, rint, sub, centerRange, suburbRange) {
  const out = [MARGIN];
  const last = n - MARGIN - ROAD_W; // la última calle
  let pos = MARGIN + ROAD_W;
  for (;;) {
    const range = sub(pos) > 0 ? suburbRange : centerRange;
    const remaining = last - pos - 2 * SIDEWALK_W; // patio si la manzana llegara hasta la última calle
    if (remaining <= range[1]) {
      out.push(last);
      return out;
    }
    let interior;
    if (remaining < range[1] + ROAD_W + 2 * SIDEWALK_W + range[0]) {
      // No entran dos manzanas "normales": se parte lo que queda en dos mitades.
      interior = Math.floor((remaining - ROAD_W - 2 * SIDEWALK_W) / 2);
    } else {
      interior = rint(range[0], range[1]);
    }
    const next = pos + 2 * SIDEWALK_W + interior;
    out.push(next);
    pos = next + ROAD_W;
  }
}

/**
 * Casas de una manzana: una fila apoyada sobre la vereda de abajo y, si la manzana es alta,
 * otra sobre la de arriba. Entre casa y casa queda al menos HOUSE.minGap libre.
 */
function placeHouses(ix0, iy0, ix1, iy1, sub, rng, houses, houseRects) {
  const left = ix0 * CELL;
  const right = (ix1 + 1) * CELL;
  const top = iy0 * CELL;
  const bottom = (iy1 + 1) * CELL;
  const height = bottom - top;
  if (height < HOUSE.spriteH + 20 + HOUSE_MARGIN) return; // no entra ni una fila: queda de patio

  const gap = HOUSE.minGap + (sub ? 2 * CELL : 0);
  const rows = [bottom - 20];
  // Segunda fila: su base, a la altura del sprite desde arriba; tiene que dejar `minGap` con la otra.
  const topBase = top + HOUSE.spriteH + HOUSE_MARGIN;
  if (bottom - 20 - HOUSE.colliderUp - (topBase + HOUSE.colliderDown) >= HOUSE.minGap) rows.push(topBase);

  for (const base of rows) {
    // El dibujo (más ancho que el collider) no pisa las veredas de los costados.
    const side = (HOUSE.spriteW - HOUSE.colliderW) / 2 + HOUSE_MARGIN;
    const usable = right - left - 2 * side;
    const n = Math.floor((usable + gap) / (HOUSE.colliderW + gap));
    if (n <= 0) continue;
    const step = n > 1 ? (usable - HOUSE.colliderW) / (n - 1) : 0;
    for (let k = 0; k < n; k++) {
      // En los suburbios algunas casas faltan: más patio, más aire.
      if (sub && rng() < 0.3) continue;
      const cx = n > 1 ? left + side + HOUSE.colliderW / 2 + k * step : (left + right) / 2;
      houses.push({ x: cx, y: base });
      // Para alejar los árboles se usa todo el dibujo, no solo el collider: un árbol "adentro" de
      // una casa se ve mal aunque no la toque.
      houseRects.push({ x0: cx - HOUSE.spriteW / 2, x1: cx + HOUSE.spriteW / 2, y0: base - HOUSE.spriteH, y1: base + HOUSE.colliderDown });
    }
  }
}

function treeChance(t, fx, fy) {
  if (t === TERRAIN.PARK) return TREES.park;
  if (t === TERRAIN.PLAZA) return TREES.plaza;
  if (t === TERRAIN.EDGE) return TREES.edge;
  const sub = Math.max(suburbness(fx), suburbness(fy)) > 0;
  return sub ? TREES.suburb : TREES.yard;
}

/** ¿Las 8 celdas vecinas son del mismo terreno? (un árbol no se apoya contra la vereda) */
function allAround(terrain, W, H, x, y, t) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      if (terrain[ny * W + nx] !== t) return false;
    }
  }
  return true;
}
