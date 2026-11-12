// Números de balance. Las entidades leen de acá: nada de constantes sueltas en el gameplay.
// Solo datos: este archivo no usa el engine.

export const WORLD = {
  width: 9984,
  height: 4992,
};

export const RECRUIT = {
  maxSpeed: 230, // px/s
  /** Qué tan rápido corrige la velocidad hacia la deseada (1/s). Más alto = más "pegado" al click. */
  responsiveness: 9,
  /** Empieza a frenar a esta distancia del destino (px). */
  arriveRadius: 70,
  /** Llegó: deja de empujar a esta distancia (px). */
  stopRadius: 8,
  linearDamping: 0.5,
  colliderRadius: 11,
  scaleMin: 0.78,
  scaleSpan: 0.12,
};

export const SQUAD = {
  /** Tope de reclutas vivos a la vez (tamaño del pool). */
  maxRecruits: 640,
  /** Distancia entre puestos de la formación (espiral alrededor del destino), px. */
  formationSpacing: 24,
  /** Más cerca que esto del destino o del puesto, el recluta va en línea recta; más lejos, sigue el pathfinding. */
  directRadius: 140,
  /** Cada recluta empuja a los compañeros que tiene más cerca que esto (px). */
  separationRadius: 26,
  /** Aceleración máxima de ese empuje (px/s²). */
  separationForce: 700,
  /** Alcance con el que cada recluta ve a sus vecinos (spatial hash), px. */
  visualRange: 80,
};

export const NAV = {
  /** Lado de la celda del NavGrid (px). El engine bloquea toda celda que toque la caja de un obstáculo. */
  cellSize: 48,
  /** Un recluta parado en una celda bloqueada (pegado a un árbol) busca la libre más cercana hasta estos anillos de celdas. */
  escapeRings: 3,
  /** Si el destino cae en una celda bloqueada (click sobre un árbol), se corre a la libre más cercana hasta estos anillos. */
  goalRings: 5,
};

export const INPUT = {
  /** Manteniendo apretado, el destino sigue al dedo/mouse cuando se movió al menos esto (px de mundo)... */
  dragMinStep: 40,
  /** ...y pasó al menos este tiempo desde la última actualización (ms). Cada destino nuevo pide un flowfield. */
  dragIntervalMs: 120,
  /** Tiempo apretado antes de que empiece el arrastre (ms): un click corto es solo un click. */
  dragDelayMs: 150,
};

export const PERSON_ANIM = {
  /** Por debajo de esta velocidad se lo considera quieto (px/s). */
  walkSpeedThreshold: 12,
  /** Velocidad de animación de caminar por px/s de velocidad. */
  walkAnimPerSpeed: 0.0032,
  idleAnimSpeed: 0.05,
};

export const CAMERA = {
  startZoom: 1,
  minZoom: 0.35,
  maxZoom: 2.5,
  followSmoothing: 0.12,
  wheelSensitivity: 0.0015,
  /** El zoom recorre ~63 % de lo que le falta en este tiempo (ms). Más alto = más suave y más lento. */
  zoomSmoothingMs: 90,
};
