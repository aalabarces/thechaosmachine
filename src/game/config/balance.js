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
  /** Combate y looteo. Daño, alcance y cooldown dependen del arma (config/weapons.js). */
  hp: 100,
  /** Ve a un hostil a esta distancia y va a pegarle (px). Con un arma de fuego, ve hasta su alcance. */
  violenceRange: 130,
  /** Con un arma de fuego se planta a esta fracción de su alcance para disparar. */
  shootRangeFraction: 0.85,
  /**
   * Solo pelea o lootea cosas a menos de esto de su puesto en la formación (px). Mientras el
   * malón va hacia un destino lejano, el puesto está allá: no se frenan a pelear en el camino.
   */
  leashRadius: 260,
  /** Tiempo parado sobre un drop para juntarlo, con lootSpeed 1 (ms). */
  lootTimeMs: 350,
  lootSpeed: 1,
  /** Junta un drop a esta distancia (px). */
  pickupRadius: 16,
  /** Si en este tiempo no llegó a juntar el drop que fue a buscar (trabado), lo abandona (ms). */
  lootGiveUpMs: 3500,
  /** Variación individual de la velocidad máxima (± fracción). */
  speedJitter: 0.06,
};

export const CIVILIAN = {
  /** Cuántos hay en la ciudad a la vez (el spawner repone a los muertos fuera de cámara). */
  population: 600,
  poolSize: 700,
  /** Cada cuánto el spawner repone uno (ms). */
  respawnIntervalMs: 400,
  /** No aparecen a menos de esto de un recluta (px). */
  spawnMinDistance: 700,
  colliderRadius: 10,
  linearDamping: 2.2,
  scaleMin: 0.7,
  scaleSpan: 0.2,
  hp: 30,
  /** La plata que llevan encima y lo que pueden soltar: config/lootTables.js (civilian). */
  /** Paseando: empuje sobre el flowfield de veredas (px/s²) y tope de velocidad. */
  walkAccel: 220,
  walkMaxSpeed: 110,
  /** Variación individual del paseo (± fracción). */
  walkJitter: 0.25,
  /** Huyendo: velocidad deseada (menor que la del recluta, así se los alcanza). */
  fleeSpeed: 195,
  fleeResponsiveness: 6,
  /** Ve a un hostil a esta distancia y sale corriendo (px). */
  fearRadius: 170,
  /** Al recibir un golpe, avisa a los civiles a esta distancia: también huyen (px). */
  panicRadius: 220,
  /** Sin ver peligro durante esto, vuelve a pasear (ms). */
  calmDownMs: 3500,
  /** Alcance con el que ve a sus vecinos (spatial hash). */
  visualRange: 180,
  separationRadius: 28,
  separationForce: 400,
  /** Probabilidad de gritar al recibir un golpe. */
  painSoundChance: 0.6,
};

export const COMBAT = {
  /** Empujón al recibir un golpe (px/s). */
  knockback: 120,
  /** Velocidad de la animación de golpe (cuadros por 1/60 s) y cuánto la protege de caminar (ms). */
  punchAnimSpeed: 0.3,
  punchAnimMs: 330,
  bloodPerHit: 4,
  bloodOnDeath: 14,
  /** Los disparos salen a esta altura sobre los pies (px), para el fogonazo y la estela. */
  muzzleHeight: 16,
  /** Cuánto dura la estela de un disparo en pantalla (ms). */
  tracerMs: 70,
  /** Un disparo asusta a los civiles a esta distancia del que dispara (px; limitado por su visualRange). */
  gunshotPanicRadius: 300,
};

/** Cosas rompibles. hp = cuánto aguantan; lootTable en config/lootTables.js. */
export const PROPS = {
  trashCan: { hp: 25, width: 40, colliderRadius: 14, count: 160 },
  /** spacing: distancia mínima entre autos (px), para que quede paso entre ellos. */
  parkedCar: { hp: 140, count: 70, spacing: 230 },
  atm: { hp: 220, width: 22, height: 34, count: 25 },
  /** Los autos ya destrozados quedan como chatarra (cobertura) y se oscurecen. */
  wreckTint: 0x777777,
  /** Partículas al recibir un golpe y al romperse. */
  debrisPerHit: 3,
  debrisOnBreak: 14,
};

export const DROP = {
  /** Se desvanece si nadie lo junta en este tiempo (ms). */
  lifeMs: 45000,
  fadeMs: 1500,
  /** Tamaño en pantalla del billete (px). */
  moneyWidth: 18,
  /** Al caer se corre un poco al azar (px). */
  scatter: 10,
};

export const CORPSE = {
  lifeMs: 12000,
  fadeMs: 2000,
  /** Velocidad de la animación de caída. */
  fallAnimSpeed: 0.16,
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
  /** Alcance con el que cada recluta ve a sus vecinos (spatial hash), px. Cubre RECRUIT.violenceRange. */
  visualRange: 140,
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
