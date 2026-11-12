// Memoria de corto plazo de la IA: a quién apunta, cuánto le falta para volver a pegar, de qué huye.
// Va en un componente (no en campos sueltos) porque cambia cada tick y lo leen otros hilos.

const { Component } = WEED;

export class Brain extends Component {
  static ARRAY_SCHEMA = {
    target: Int32Array, // índice de la entidad objetivo (persona o drop), -1 = ninguna
    cooldownMs: Float32Array, // hasta poder pegar de nuevo
    actionMs: Float32Array, // animación de golpe en curso: no se pisa con caminar
    progressMs: Float32Array, // looteo acumulado
    threatX: Float32Array, // de dónde viene el peligro (civiles que huyen)
    threatY: Float32Array,
    calmMs: Float32Array, // tiempo sin ver peligro
    homeX: Float32Array, // un punto conocido de vereda: vuelve ahí si se perdió del flowfield
    homeY: Float32Array,
  };
}
