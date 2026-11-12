// Datos de un drop tirado en el piso.

const { Component } = WEED;

export class DropData extends Component {
  static ARRAY_SCHEMA = {
    kind: Uint8Array, // DROP_KIND
    amount: Int32Array, // plata (o munición, más adelante)
    claimedBy: Int32Array, // recluta que va a buscarlo, -1 = libre
  };
}
