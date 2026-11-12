// Atributos de cada persona. Se copian de su sección de balance al spawnear, con variación
// individual; más adelante las mejoras del mercado los multiplican.

const { Component } = WEED;

export class PersonStats extends Component {
  static ARRAY_SCHEMA = {
    maxSpeed: Float32Array, // px/s
    damage: Float32Array, // por golpe
    attackRange: Float32Array, // px entre centros para pegar
    attackCooldownMs: Float32Array,
    violenceRange: Float32Array, // px: a esta distancia ve a un hostil y va a buscarlo
    lootSpeed: Float32Array, // multiplicador del tiempo de looteo (2 = el doble de rápido)
    sheet: Uint8Array, // índice en la lista de hojas LPC de su clase (para el cadáver)
  };
}
