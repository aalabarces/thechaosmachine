// Órdenes del malón, compartidas entre la página y los workers.
// Único escritor: RunScene.update (página), al recibir un click/touch.
// Lectores: cada Recruit en su tick.

const { SharedResource } = WEED;

export class SquadState extends SharedResource {}

export const SQUAD_STATE_SCHEMA = {
  /** Destino del malón en coordenadas de mundo: [x, y]. */
  target: { type: Float32Array, length: 2 },
  /** 1 cuando hay un destino dado. */
  hasTarget: { type: Uint8Array, length: 1 },
};

export function setSquadTarget(x, y) {
  SquadState.target[0] = x;
  SquadState.target[1] = y;
  SquadState.hasTarget[0] = 1;
}
