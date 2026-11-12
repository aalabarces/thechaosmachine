// Vida de cualquier cosa que se pueda romper o matar (personas; en la fase 4 también props).

const { Component } = WEED;

export class Health extends Component {
  static ARRAY_SCHEMA = {
    hp: Float32Array,
    maxHp: Float32Array,
  };
}
