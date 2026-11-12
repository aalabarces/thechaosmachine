// Lo que lleva encima una persona: arma (config/weapons.js) y chaleco.
// Las armas se pierden cuando muere quien las tenía (las suelta al piso).

const { Component } = WEED;

export class WeaponHolder extends Component {
  static ARRAY_SCHEMA = {
    weapon: Uint8Array, // WEAPON.*
    armor: Float32Array, // puntos de chaleco que le quedan
    decoIndex: Int32Array, // decoración con el arma en la mano, -1 = ninguna
  };
}
