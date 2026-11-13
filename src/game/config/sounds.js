// Sonidos: los archivos (assets/audio) y el catálogo de efectos que usa el juego. Solo datos.
//
// El juego nunca reproduce un archivo directo: pide un efecto del catálogo (SFX) por nombre con
// systems/sfx.js. Varios efectos del GDD no tienen archivo propio todavía y salen de variar los que
// hay (tono, volumen, mezcla de dos). Para reemplazar uno por un archivo de verdad: sumar el archivo
// a SOUND_FILES y apuntar su entrada de SFX a ese nombre.

export const SOUND_FILES = {
  punch: 'golpe.mp3',
  pain1: 'dolor1.mp3',
  pain2: 'dolor2.mp3',
  pain3: 'dolor3.mp3',
  pain4: 'dolor4.mp3',
  pistol: 'pistola_disparo.mp3',
  smg: 'ametralladora_disparo.mp3',
  metal1: 'bala_golpea_metal.mp3',
  metal2: 'bala_golpea_metal_2.mp3',
  boomShort: 'explosion_corta.mp3',
  boomLong: 'explosion_larga.mp3',
  fire: 'explosion_de_fuego.mp3',
};

const PAIN = ['pain1', 'pain2', 'pain3', 'pain4'];
const METAL = ['metal1', 'metal2'];

/**
 * @typedef {object} SfxDef
 * @property {string[]} sounds  uno al azar de estos (claves de SOUND_FILES)
 * @property {number} volume
 * @property {[number, number]} rate  velocidad de reproducción al azar entre estos (tono)
 * @property {{ sound: string, volume: number, rate: [number, number] }} [layer]  otro sonido a la vez, para darle cuerpo
 */

/** @type {Record<string, SfxDef>} */
export const SFX = {
  // Golpes
  punch: { sounds: ['punch'], volume: 0.55, rate: [0.85, 1.15] },
  /** Palo: el golpe más grave, con un "toc" metálico apagado. Variación: no hay archivo propio. */
  batHit: { sounds: ['punch'], volume: 0.8, rate: [0.6, 0.72], layer: { sound: 'metal2', volume: 0.12, rate: [0.45, 0.55] } },

  // Disparos
  pistol: { sounds: ['pistol'], volume: 0.45, rate: [0.95, 1.05] },
  /** Escopeta: pistola grave + un poco de explosión corta acelerada. Variación. */
  shotgun: { sounds: ['pistol'], volume: 0.65, rate: [0.62, 0.7], layer: { sound: 'boomShort', volume: 0.18, rate: [1.35, 1.55] } },
  smg: { sounds: ['smg'], volume: 0.3, rate: [0.95, 1.05] },

  // Cosas
  metalHit: { sounds: METAL, volume: 0.5, rate: [0.9, 1.1] },
  /** Vidrios rotos: el impacto metálico mucho más agudo y bajo. Variación. */
  glass: { sounds: METAL, volume: 0.35, rate: [1.9, 2.4] },
  glassBreak: { sounds: METAL, volume: 0.6, rate: [1.6, 2.0], layer: { sound: 'metal1', volume: 0.35, rate: [2.3, 2.6] } },

  // Voces
  pain: { sounds: PAIN, volume: 0.7, rate: [0.9, 1.1] },
  /** Gritos de pánico: las quejas de dolor más agudas. Variación. */
  panic: { sounds: PAIN, volume: 0.45, rate: [1.35, 1.6] },
  /** Gruñidos de violencia: las quejas de dolor graves y cortas. Variación. */
  grunt: { sounds: PAIN, volume: 0.4, rate: [0.6, 0.7] },

  // Explosiones y fuego
  boomCar: { sounds: ['boomLong'], volume: 1, rate: [0.9, 1.1] },
  boomMine: { sounds: ['boomShort'], volume: 1, rate: [0.9, 1.1] },
  fire: { sounds: ['fire'], volume: 0.5, rate: [0.95, 1.05] },
};

/** Probabilidades de las voces (para no saturar con 60 reclutas peleando). */
export const VOICE = {
  /** Un recluta o enemigo que pega gruñe a veces. */
  gruntChance: 0.12,
  /** Un civil que empieza a huir grita a veces. */
  panicChance: 0.3,
};
