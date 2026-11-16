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
  /** Probabilidad de gritar al recibir un golpe o un balazo. */
  painSoundChance: 0.5,
  /**
   * Orden de moverse: el recluta no pelea ni lootea hasta llegar a esta distancia de su puesto,
   * o hasta que pase marchTimeoutMs (por si se traba en el camino).
   */
  marchArriveRadius: 60,
  marchTimeoutMs: 8000,
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
  /** Empujón extra de una explosión fuerte (px/s), además del de un golpe. */
  blastPush: 260,
  /** Un disparo asusta a los civiles a esta distancia del que dispara (px; limitado por su visualRange). */
  gunshotPanicRadius: 300,
};

/** Enemigos: lo común a policía y pandillas. */
export const ENEMY = {
  /** Con menos de esta fracción de vida, huye (GDD). */
  fleeHpFraction: 0.1,
  fleeSpeed: 240,
  /** Huyendo, si no hay nadie del malón a esta distancia, se escapa (desaparece). */
  escapeDistance: 900,
  separationRadius: 26,
  separationForce: 600,
};

export const POLICE = {
  hp: 60,
  maxSpeed: 205,
  responsiveness: 7,
  violenceRange: 170,
  shootRangeFraction: 0.8,
  colliderRadius: 11,
  linearDamping: 0.5,
  scaleMin: 0.8,
  scaleSpan: 0.1,
  /**
   * Cazan el centro del malón redondeado a esta grilla (px): así todos comparten el mismo
   * flowfield y no se pide uno nuevo cada vez que el malón cruza una celda de 48.
   */
  huntGrid: 192,
  poolSize: 60,
};

export const GANG = {
  hp: 45,
  maxSpeed: 195,
  responsiveness: 7,
  violenceRange: 150,
  shootRangeFraction: 0.8,
  colliderRadius: 11,
  linearDamping: 0.5,
  scaleMin: 0.8,
  scaleSpan: 0.12,
  /** Zonas de pandilla por mapa, su radio y cuánto se alejan de ella para pelear (px). */
  zones: 4,
  zoneRadius: 600,
  leashRadius: 850,
  /** Las zonas aparecen lejos del punto de partida y lejos entre sí (px). */
  zoneMinDistanceFromStart: 1500,
  zoneMinSpacing: 1700,
  /** Patrullando: cada cuánto eligen otro punto de la zona (ms) y a qué distancia como máximo (px). */
  wanderEveryMs: 6000,
  wanderRadius: 350,
  wanderSpeedFraction: 0.45,
  /** Miembros por zona: base + por cada punto de fuerza del malón, con tope. */
  membersBase: 6,
  membersPerStrength: 0.12,
  membersMax: 14,
  /** Armas al aparecer: probabilidad de cada una (el resto, piñas). */
  weaponChances: { bat: 0.35, pistol: 0.3, shotgun: 0.05 },
  poolSize: 80,
};

/**
 * Heat policial (GDD: matar civiles y romper cosas trae a la policía).
 * Puntos por acción; se descuentan solos con el tiempo; las estrellas son umbrales de puntos.
 */
export const HEAT = {
  civilianKill: 4,
  propBreak: 1,
  policeKill: 8,
  decayPerSecond: 0.6,
  max: 220,
  /** Puntos para 1, 2, 3, 4 y 5 estrellas. */
  stars: [8, 30, 65, 110, 170],
};

/**
 * Al empezar, nada peligroso dentro del rango de acción del malón, alrededor del punto de partida (px):
 *   startRadius     ni pandilleros ni minas (y la correa de las zonas de pandilla no llega).
 *   carStartRadius  sin autos estacionados (los reclutas los rompen solos y explotan).
 * Durante la run la regla es otra: nada aparece en pantalla (offscreenMargin).
 */
export const SPAWN_SAFETY = {
  startRadius: 1100,
  carStartRadius: 900,
  /** Durante la run, policías y pandilleros aparecen al menos esto afuera del borde de la pantalla (px de mundo). */
  offscreenMargin: 120,
};

/** El que decide cuántos enemigos hay y dónde aparecen (systems/spawnDirector.js, en la página). */
export const DIRECTOR = {
  /** Policías que buscan al malón: por estrella + por punto de fuerza del malón. */
  policePerStar: 3,
  policePerStrength: 0.15,
  /** Cada cuánto aparece un patrullero (ms), dividido por las estrellas. */
  policeIntervalMs: 5000,
  /** De a cuántos aparecen. */
  policeGroup: 2,
  /** Armas de la policía por estrellas: desde cuántas estrellas y con qué probabilidad. */
  policeShotgunFromStars: 3,
  policeShotgunChance: 0.3,
  policeSmgFromStars: 4,
  policeSmgChance: 0.3,
  /** Aparecen fuera de la pantalla, entre estas distancias del centro del malón (px). */
  spawnMinDistance: 900,
  spawnMaxDistance: 1500,
  /** Sin heat, la policía que quedó lejos de esto se retira (px). */
  policeDespawnDistance: 1800,
  /** Pandillas: cada cuánto se repone un miembro en una zona que está fuera de cámara (ms). */
  gangRefillMs: 2500,
  /** La fuerza del malón: 1 por recluta + esto por cada punto de rank de su arma. */
  strengthPerWeaponRank: 0.5,
  /** Plata extra de los enemigos por punto de fuerza del malón (0.03 = +3 % por punto). */
  enemyMoneyPerStrength: 0.03,
  /** Sin reclutas durante esto, se termina la run (ms). */
  runEndDelayMs: 1500,
  /** Si al empezar no aparece ningún recluta en este tiempo, también se termina (ms). */
  runStartGraceMs: 4000,
};

/**
 * Explosiones (systems/explosions.js): daño en un radio, que baja con la distancia, y un empujón.
 * Las personas y los props que quedan adentro reciben el mensaje 'blast'.
 */
export const EXPLOSION = {
  /** Auto destrozado: explota y deja fuego. */
  car: { damage: 90, radius: 150, push: 420, shake: 14, sfx: 'boomCar', fire: true },
  /** Mina pisada. */
  mine: { damage: 120, radius: 110, push: 480, shake: 10, sfx: 'boomMine', fire: false },
  /** Tamaño en pantalla de la animación por cada px de radio. */
  spritePerRadius: 1.4,
  /** Sacudida de cámara: a esta distancia del centro de la pantalla ya no se siente (px). */
  shakeFalloff: 1400,
  shakeMs: 260,
};

/** Fuego que queda después de una explosión: quema a quien esté adentro. */
export const FIRE = {
  lifeMs: 7000,
  radius: 55,
  /** Daño cada tickMs a cada persona adentro. */
  damage: 7,
  tickMs: 450,
  /** Tamaño en pantalla (px de alto). */
  height: 70,
};

/** Minas escondidas en la ciudad: explotan cuando alguien (de cualquier bando) las pisa. */
export const MINES = {
  count: 30,
  /** Las pisa quien pase a menos de esto (px). */
  triggerRadius: 16,
  /** No aparecen cerca del punto de partida (px). */
  minDistanceFromStart: 1100, // ver SPAWN_SAFETY.startRadius
  minSpacing: 250,
  /** Tamaño en pantalla (px de ancho). */
  width: 18,
};

/**
 * Safe houses (bares): con reclutas cerca aparece un menú para comprar reclutas nuevos con la
 * plata de esta run, cada vez más caros (GDD).
 */
export const SAFE_HOUSE = {
  count: 3,
  /** Una a esta distancia del punto de partida como máximo, para que se descubra rápido (px). */
  nearStartDistance: 1200,
  minSpacing: 2200,
  /** Algún recluta tiene que estar a menos de esto de la puerta (px). */
  useRadius: 260,
  /** Precio del primer recluta y cuánto se multiplica con cada compra (por run). */
  basePrice: 80,
  priceGrowth: 1.35,
  /** El cartel se dibuja frente a la casa, a esta altura sobre la vereda (px). */
  signOffsetY: 40,
  signWidth: 60,
};

/**
 * Iluminación (de la demo buenosAiresScene) y ciclo día/noche (de sunStreetScene). Con la calidad
 * gráfica 'off' no hay nada de esto: la escena se ve como de día siempre.
 */
export const LIGHT = {
  /** Luz mínima de noche, sin sol ni faroles (0..1). */
  baseAmbient: 0.05,
  maxLights: 512,
  /** Pool de destellos cortos (fogonazos, explosiones). */
  maxFlashes: 32,
  maxShadowCastingLights: 8,
  /** Luz azulada de la noche (la "luna"): cuánto suma y de qué color. */
  nightIntensity: 0.22,
  nightColor: 0x5473f2,
  /** Color del sol por hora (tabla de sunStreetScene). */
  sunColors: [
    { hour: 0, color: 0x1a1a2e },
    { hour: 5, color: 0x2d4a6e },
    { hour: 6.5, color: 0xff8855 },
    { hour: 8, color: 0xffeedd },
    { hour: 12, color: 0xffffff },
    { hour: 16, color: 0xffeedd },
    { hour: 18, color: 0xff9a55 },
    { hour: 19.5, color: 0xff5522 },
    { hour: 21, color: 0x2d4a6e },
    { hour: 24, color: 0x1a1a2e },
  ],
};

/**
 * Sombras (solo con calidad gráfica alta). Las casas y los autos tienen una caja de sombra que
 * proyecta el sol (VolumeShadowCaster, alto en px); los árboles, las personas y los faroles, la
 * sombra de su dibujo (ShadowCaster, multiplicador de largo).
 */
export const SHADOWS = {
  houseHeight: 150,
  carHeight: 22,
  tree: 1,
  person: 1.2,
  lamp: 0.8,
};

/**
 * Luz de la acción (solo con iluminación): destellos cortos del pool Flash y la luz del fuego.
 * radius en px, lifespan en ms.
 */
export const ACTION_LIGHT = {
  // glow: halo (hasGlowSprite del engine, 0,5 es el normal).
  muzzle: { radius: 420, lifespan: 60, color: 0xffcc66, glow: 0.6 },
  explosion: { radius: 1100, lifespan: 420, color: 0xffaa44, glow: 1 },
  fire: { radius: 320, color: 0xff7a2a, glow: 0.7, elevation: 30, flicker: 0.18 },
};

/** El día del capítulo. */
export const DAY = {
  /** Cuánto dura un día entero (24 h) en minutos reales. */
  minutes: 10,
  /** Cada capítulo empieza a una hora al azar en este rango: de tarde, para que la noche llegue jugando. */
  startHourMin: 14,
  startHourMax: 19,
};

/** Faroles de la calle (de la demo buenosAiresScene): se prenden entre las 18 y las 19 y se apagan entre las 6 y las 7. */
export const LAMPS = {
  color: 0xffdcaa,
  radius: 650,
  /** Halo de la luz (hasGlowSprite del engine: 0,5 es el normal). */
  glow: 0.6,
  /** Escala del dibujo (assets/img/props/lamp.png, 98×317). */
  scale: 0.45,
  /** Uno en cada esquina de manzana y, en los lados largos, cada tantas celdas. */
  everyCells: 12,
  max: 420,
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
  /**
   * Click derecho: radio (px de mundo) para elegir lo que está bajo el puntero. Las personas y los
   * props se miden desde el centro de su dibujo (más arriba de los pies).
   */
  pickRadius: 26,
  pickRadiusCar: 46,
  /** Manteniendo apretado, el destino sigue al dedo/mouse cuando se movió al menos esto (px de mundo)... */
  dragMinStep: 40,
  /** ...y pasó al menos este tiempo desde la última actualización (ms). Cada destino nuevo pide un flowfield. */
  dragIntervalMs: 120,
  /** Tiempo apretado antes de que empiece el arrastre (ms): un click corto es solo un click. */
  dragDelayMs: 150,
  /**
   * Toque largo (celular, también sirve con el mouse): mantener quieto el dedo sobre algo durante
   * longPressMs lo marca como foco, igual que el click derecho. Si el dedo se mueve más de
   * longPressSlop px de pantalla, es un arrastre y no cuenta.
   */
  longPressMs: 450,
  longPressSlop: 14,
  /** Vibración al marcar el foco con toque largo (ms; 0 = sin vibrar). */
  longPressVibrateMs: 30,
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
