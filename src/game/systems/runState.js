// Estado de la run actual, compartido entre la página (HUD) y los workers (gameplay).
// Los campos mailbox son atómicos: cualquier thread suma con RunState.money.add(n).

const { SharedResource } = WEED;

export class RunState extends SharedResource {}

export const RUN_STATE_SCHEMA = {
  /** Plata juntada en esta run. */
  money: { type: Int32Array, mailbox: true },
};
