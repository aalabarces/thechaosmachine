// Estado de la run actual, compartido entre la página (HUD) y los workers (gameplay).
// Los campos mailbox son atómicos: cualquier thread suma con RunState.money.add(n).

const { SharedResource } = WEED;

export class RunState extends SharedResource {}

export const RUN_STATE_SCHEMA = {
  /** Plata juntada en esta run. */
  money: { type: Int32Array, mailbox: true },
  /** Civiles muertos en esta run (resultados del capítulo, heat policial en la fase 5). */
  civiliansKilled: { type: Int32Array, mailbox: true },
  /**
   * 1 en la posición de cada arma (WEAPON.*) que el malón juntó en esta run. Alimenta los
   * desbloqueos del mercado (fase 6). Todos los que escriben, escriben 1: no hay carrera.
   */
  weaponsFound: { type: Uint8Array, length: 8 },
  /** Chalecos juntados en esta run (desbloqueo del chaleco en el mercado). */
  armorsFound: { type: Int32Array, mailbox: true },
};
