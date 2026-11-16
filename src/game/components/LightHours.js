// Luz que se prende y se apaga según la hora (de la demo buenosAiresScene, town.js).
// on/off: a qué hora se prende (18..19) y se apaga (6..7), propia de cada luz; base: su radio
// prendida; lit: 0/1 (2 = todavía no se miró); glows: cuántas de sus primeras decoraciones son sus
// brillos, con alpha alphaA (pares) y alphaB (impares) cuando está prendida.

const { Component } = WEED;

export class LightHours extends Component {
  static ARRAY_SCHEMA = {
    on: Float32Array,
    off: Float32Array,
    base: Float32Array,
    lit: Uint8Array,
    glows: Uint8Array,
    alphaA: Float32Array,
    alphaB: Float32Array,
  };
}
