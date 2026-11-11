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
};
