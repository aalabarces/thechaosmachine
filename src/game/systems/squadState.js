// Órdenes del malón, compartidas entre la página y los workers.
// Único escritor: RunScene.update (página): el destino al recibir un click/touch, y el centro
// del malón cada frame. Lectores: cada Recruit (destino) y la policía (a quién cazar).

const { SharedResource } = WEED;

export class SquadState extends SharedResource {}

export const SQUAD_STATE_SCHEMA = {
  /** Destino del malón en coordenadas de mundo: [x, y]. */
  target: { type: Float32Array, length: 2 },
  /** 1 cuando hay un destino dado. */
  hasTarget: { type: Uint8Array, length: 1 },
  /** Sube con cada destino nuevo: los reclutas recalculan su puesto en la formación cuando cambia. */
  orderId: { type: Uint32Array, length: 1 },
  /** Centro de los reclutas vivos [x, y]: la policía lo caza. */
  centroid: { type: Float32Array, length: 2 },
  /** Reclutas vivos y "fuerza" del malón (cantidad + calidad de armas), para escalar la dificultad. */
  alive: { type: Int32Array, length: 1 },
  strength: { type: Float32Array, length: 1 },
};

export function setSquadTarget(x, y) {
  SquadState.target[0] = x;
  SquadState.target[1] = y;
  SquadState.hasTarget[0] = 1;
  SquadState.orderId[0]++;
}

/** Centroide de los reclutas vivos en `out` ({x, y}). Devuelve cuántos hay. */
export function squadCentroid(RecruitClass, Transform, out) {
  const all = RecruitClass.getAllActive();
  const n = all.length;
  let sx = 0;
  let sy = 0;
  for (let k = 0; k < n; k++) {
    sx += Transform.x[all[k]];
    sy += Transform.y[all[k]];
  }
  if (n > 0) {
    out.x = sx / n;
    out.y = sy / n;
  }
  return n;
}
